import { Plugin, Provider, Model } from '@opencode/plugin';
import * as z4 from 'zod/v4';
import * as http from 'http';
import type { AddressInfo } from 'net';
import { createRequire } from 'module';
import { generatePollinationsConfig } from './server/generate-config.js';
import { loadConfig, migrateLegacyConfig } from './server/config.js';
import { handleCommand } from './server/commands.js';
import { handleChatCompletion } from './server/proxy.js';
import { createToolRegistry } from './tools/index.js';
import { ModelRegistry } from './server/models/index.js';
import { log } from './server/logger.js';

const require = createRequire(import.meta.url);

interface V2ProxyHandle { port: number; close: () => Promise<void>; }

async function startProxyV2(): Promise<V2ProxyHandle> {
  return await new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
      if (req.method === 'GET' && req.url === '/health') {
        const config = loadConfig();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', version: require('../package.json').version, mode: config.mode, opencode: 'v2' }));
        return;
      }
      if (req.method === 'POST' && (req.url === '/v1/chat/completions' || req.url === '/chat/completions')) {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', async () => {
          try { await handleChatCompletion(req, res, Buffer.concat(chunks).toString()); }
          catch (e) {
            log(`[V2 Proxy] Error: ${e}`);
            if (!res.headersSent) { res.writeHead(500); res.end(JSON.stringify({ error: String(e) })); }
          }
        });
        return;
      }
      res.writeHead(404); res.end('Not Found');
    });
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({
        port,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
    server.on('error', (e) => {
      log(`[V2 Proxy] Fatal Error: ${e}`);
      resolve({ port: 0, close: async () => {} });
    });
  });
}

function legacyArgsToJsonSchema(args: Record<string, any>): any {
  // V1 tools are authored with @opencode-ai/plugin/tool (Zod 4 schemas).
  // zod/v4 can convert those schemas directly to JSON Schema for OpenCode V2.
  const schema = z4.toJSONSchema(z4.object(args as any)) as any;
  delete schema.$schema;
  return schema;
}

function v2ToolResult(value: unknown, metadata?: Record<string, unknown>): any {
  if (value && typeof value === 'object' && 'content' in (value as any)) {
    return metadata ? { ...(value as any), metadata } : value;
  }
  const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return metadata ? { content, metadata } : { content };
}

function mapV2Model(raw: any, providerID: any): any {
  const id = Model.ID.make(raw.id);
  const base = Model.Info.default(providerID, id);
  const variants = Object.entries(raw.variants || {}).map(([variantID, settings]) => ({
    id: Model.VariantID.make(variantID),
    settings: settings as Record<string, unknown>,
  }));
  return {
    ...base,
    name: raw.name || raw.id,
    capabilities: {
      tools: raw.tool_call === true,
      input: raw.modalities?.input || ['text'],
      output: raw.modalities?.output || ['text'],
    },
    variants,
    limit: {
      context: raw.limit?.context || 128000,
      output: raw.limit?.output || 16384,
    },
    status: 'active' as const,
    enabled: true,
  };
}

export const PollinationsV2 = Plugin.define({
  id: 'pollinations',
  async setup(ctx) {
    migrateLegacyConfig();
    const version = require('../package.json').version;
    log(`[V2] Pollinations plugin initializing v${version} on OpenCode ${ctx.app.version}`);

    const proxy = await startProxyV2();
    if (!proxy.port) throw new Error('Pollinations local proxy failed to start');
    const localBaseUrl = `http://127.0.0.1:${proxy.port}/v1`;
    const providerID = Provider.ID.make('pollinations');
    let disposed = false;

    // Register immediately from disk cache/fallback. Never block V2 startup on network.
    let currentModels = (await generatePollinationsConfig(undefined, false, { network: false }))
      .map((m) => mapV2Model(m, providerID));

    await ctx.provider.transform((editor) => {
      const existing = editor.get('pollinations');
      if (existing) {
        editor.update('pollinations', (info) => {
          info.name = `Pollinations AI (v${version})`;
          info.activation = 'enabled';
          info.package = '@opencode/ai/providers/openai-compatible';
          info.settings = { ...(info.settings ?? {}), baseURL: localBaseUrl };
        });
        editor.models.set('pollinations', currentModels);
      } else {
        editor.add({
          info: {
            ...Provider.Info.empty(providerID),
            name: `Pollinations AI (v${version})`,
            activation: 'enabled',
            package: '@opencode/ai/providers/openai-compatible',
            settings: { baseURL: localBaseUrl },
          },
          models: currentModels,
        });
      }
    });

    // V2 keeps provider/model inventories as replayable transforms. Explicitly
    // replay them after registration; otherwise the transform may only take
    // effect on a later external provider.updated event.
    await ctx.model.transform((editor) => {
      for (const model of currentModels) {
        editor.update('pollinations', model.id, (draft) => {
          Object.assign(draft, model);
        });
      }
    });
    await ctx.provider.reload();
    await ctx.model.reload();

    const legacyTools = createToolRegistry();
    await ctx.tool.transform((editor) => {
      for (const [name, legacy] of Object.entries(legacyTools)) {
        editor.add({
          name,
          description: legacy.description || name,
          input: legacyArgsToJsonSchema(legacy.args || {}),
          async execute(input: any, toolContext: any) {
            let metadata: Record<string, unknown> | undefined;
            const compatContext = {
              ...toolContext,
              metadata(value: Record<string, unknown>) { metadata = value; },
            };
            const result = await legacy.execute(input, compatContext);
            if (metadata && typeof toolContext.progress === 'function') {
              await toolContext.progress(metadata);
            }
            return v2ToolResult(result, metadata);
          },
        } as any);
      }
    });

    await ctx.session.hook('context', (event) => {
      if (String(event.model.providerID) === 'pollinations') {
        log(`[V2] Session ${event.sessionID} using ${event.model.providerID}/${event.model.id}`);
      }
    });

    // Native V2 slash command: avoids depending on the external TUI plugin host.
    await ctx.command.transform((editor) => {
      editor.add({
        name: 'poll',
        description: 'Pollinations account, quests, models and configuration',
        async execute(input) {
          const raw = String(input.prompt?.text || '').trim();
          const args = raw.replace(/^\/?poll(?:inations)?\b/i, '').trim();
          const command = `/poll ${args || 'help'}`;
          const result = await handleCommand(command);
          const text = result.error ? `❌ ${result.error}` : (result.response || '🌸 Pollinations');
          await ctx.session.synthetic({
            sessionID: input.sessionID,
            text,
            description: 'Pollinations command',
            metadata: { plugin: 'pollinations', command },
            delivery: input.delivery,
            resume: false,
          });
        },
      });
    });
    await ctx.command.reload();

    try {
      const worker = await import('./server/models/worker.js');
      worker.ToolRegistryWorker.start();
    } catch (e) {
      log(`[V2] Tool registry worker start failed: ${e}`);
    }

    log(`[V2] Provider registered immediately with ${currentModels.length} cached/fallback models and ${Object.keys(legacyTools).length} tools.`);

    // Refresh catalog asynchronously; replay provider/model transforms once live data arrives.
    void (async () => {
      try {
        const config = loadConfig();
        await ModelRegistry.refresh(config.apiKey);
        const live = await generatePollinationsConfig();
        if (disposed) return;
        currentModels = live.map((m) => mapV2Model(m, providerID));
        await ctx.provider.reload();
        await ctx.model.reload();
        log(`[V2] Live catalog refreshed: ${currentModels.length} models.`);
      } catch (e) {
        log(`[V2] Live catalog refresh failed; keeping startup catalog: ${e}`);
      }
    })();

    return async () => {
      disposed = true;
      try {
        const worker = await import('./server/models/worker.js');
        worker.ToolRegistryWorker.stop();
      } catch { }
      await proxy.close();
      log('[V2] Pollinations plugin unloaded cleanly.');
    };
  },
});
