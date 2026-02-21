# 📚 Temporary Files Collection

*Generated from 1 file(s)*

---

### 📄 pollinations_pricing.ts
**Path:** `/home/fkomp/Bureau/oracle/opencode-pollinations-plugin/docs/studies/pricing_params_tools/Cost_command_princing/pollinations_pricing.ts`

```ts
#!/usr/bin/env npx tsx
/**
 * pollinations_pricing.ts — Live pricing table matching enter.pollinations.ai/api/docs
 * Usage: npx tsx pollinations_pricing.ts --api-key YOUR_KEY
 */

const API_KEY = process.argv.includes("--api-key")
  ? process.argv[process.argv.indexOf("--api-key") + 1]
  : process.env.POLLINATIONS_API_KEY ?? "";
const H: HeadersInit = API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {};

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: H });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return r.json();
}

// ─── Number formatting ────────────────────────────────────────────────────────

function n(v: unknown): number | null {
  const x = Number(v);
  return v === undefined || v === null || isNaN(x) || x === 0 ? null : x;
}

/** Flat rate: show as-is with enough sig figs */
function flat(v: unknown, unit: string): string {
  const x = n(v); if (!x) return "—";
  if (x >= 1)      return `${x.toFixed(3)}/${unit}`;
  if (x >= 0.01)   return `${x.toFixed(4)}/${unit}`;
  if (x >= 0.001)  return `${x.toFixed(5)}/${unit}`;
  if (x >= 0.0001) return `${x.toFixed(6)}/${unit}`;
  return `${x.toFixed(7)}/${unit}`;
}

/** Per-million tokens */
function perM(v: unknown): string {
  const x = n(v); if (!x) return "—";
  const m = x * 1_000_000;
  if (m >= 100) return `${m.toFixed(1)}/M`;
  if (m >= 10)  return `${m.toFixed(2)}/M`;
  if (m >= 1)   return `${m.toFixed(4)}/M`;
  return `${m.toFixed(4)}/M`;
}

/** Per 1K chars (audio tokens where 1 token ≈ 1 char) */
function per1Kchars(v: unknown): string {
  const x = n(v); if (!x) return "—";
  const k = x * 1000;
  return `${k.toFixed(2)}/1K chars`;
}

/** Estimate of "X units per 1 pollen" */
function per1pollen(cost: number | null): string {
  if (!cost || cost <= 0) return "—";
  const x = 1 / cost;
  if (x >= 10000)  return `${Math.round(x/1000)}K`;
  if (x >= 1000)   return `${Math.round(x/100)*100}`.replace(/(\d)(?=(\d{3})+$)/g, "$1,");
  if (x >= 100)    return `${Math.round(x)}`;
  if (x >= 10)     return `${Math.round(x)}`;
  return `${x.toFixed(1)}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TM {
  name: string; description: string;
  pricing?: Record<string, unknown>;
  input_modalities?: string[]; output_modalities?: string[];
  tools?: boolean; reasoning?: boolean; paid_only?: boolean;
  voices?: string[]; context_window?: number; is_specialized?: boolean;
}
interface MM {
  name: string; description?: string; paid_only?: boolean;
  voices?: string[]; pricing?: Record<string, unknown>;
  [k: string]: unknown;
}

// ─── Capability flags ─────────────────────────────────────────────────────────

function tmFlags(m: TM): string {
  const f: string[] = [];
  if (m.paid_only)                             f.push("💎 PAID ONLY");
  if (m.input_modalities?.includes("image"))   f.push("👁️");
  if (m.input_modalities?.includes("audio"))   f.push("🎙️");
  if (m.output_modalities?.includes("audio"))  f.push("🔊");
  if (m.reasoning)                             f.push("🧠");
  if (m.tools === false)                       f.push("🔍");
  if ((m.context_window ?? 0) >= 100_000)      f.push(`📏${((m.context_window??0)/1000).toFixed(0)}k`);
  return f.join(" ");
}

function searchLevel(m: TM): string {
  if (m.reasoning) return "deep_search 🔬";
  if ((m.description ?? "").toLowerCase().includes("google search")) return "rapid_search ⚡";
  return "medium_search 🔍";
}

// ─── Media helpers ────────────────────────────────────────────────────────────

function isVideo(m: MM): boolean {
  // Fully dynamic: video models have completionVideoSeconds or completionVideoTokens
  const pr = m.pricing ?? {};
  return pr.completionVideoSeconds !== undefined || pr.completionVideoTokens !== undefined;
}
function isSTT(m: MM): boolean {
  const d = (m.description ?? "").toLowerCase();
  return d.includes("speech to text") || d.includes("transcri")
    || m.name.includes("whisper") || m.name.includes("scribe");
}
function isMusic(m: MM): boolean {
  return m.name.includes("music") || m.name.includes("elevenmusic");
}

// ─── IMAGE ────────────────────────────────────────────────────────────────────

function renderImage(models: MM[]): string {
  const imgs = models.filter(m => !isVideo(m));
  const lines = [
    "## 🖼️ Image\n",
    "> 1 pollen ≈ images\n",
    "| Model | ID | Flags | 1 pollen ≈ | Pricing |",
    "|---|---|---|---|---|",
  ];
  for (const m of imgs) {
    const pr = m.pricing ?? {};
    const hasTokens = pr.promptTextTokens !== undefined;
    let pricing = "";
    let cost: number | null = null;

    if (hasTokens) {
      // Token-based: gptimage style
      pricing = [
        pr.promptTextTokens     ? `💬 ${perM(pr.promptTextTokens)}` : "",
        pr.promptImageTokens    ? `🖼️ ${perM(pr.promptImageTokens)}` : "",
        pr.completionImageTokens? `🖼️ ${perM(pr.completionImageTokens)}` : "",
      ].filter(Boolean).join(" · ");
      cost = n(pr.completionImageTokens);
    } else {
      // Flat per image
      const c = n(pr.completionImageTokens);
      pricing = c ? `🖼️ ${flat(c, "img")}` : "—";
      cost = c;
    }

    const flags: string[] = [];
    if (m.paid_only) flags.push("💎 PAID ONLY");
    // i2i capability (has image input)
    if ((m as Record<string,unknown>)["input_modalities"] || hasTokens) flags.push("👁️");

    lines.push(`| ${m.description ?? m.name} | \`${m.name}\` | ${flags.join(" ")} | ${per1pollen(cost)} | ${pricing} |`);
  }
  return lines.join("\n");
}

// ─── VIDEO ────────────────────────────────────────────────────────────────────

function renderVideo(models: MM[]): string {
  const vids = models.filter(m => isVideo(m));
  const lines = [
    "\n## 🎬 Video\n",
    "> 1 pollen ≈ videos\n",
    "| Model | ID | Flags | 1 pollen ≈ | Pricing |",
    "|---|---|---|---|---|",
  ];
  for (const m of vids) {
    const pr = m.pricing ?? {};
    const parts: string[] = [];
    let cost: number | null = null;

    if (n(pr.completionVideoSeconds)) {
      const c = n(pr.completionVideoSeconds)!;
      parts.push(`🎬 ${flat(c, "sec")}`);
      cost = c;
    } else if (n(pr.completionVideoTokens)) {
      parts.push(`🎬 ${perM(pr.completionVideoTokens)}`);
      cost = n(pr.completionVideoTokens);
    }
    if (n(pr.completionAudioSeconds)) parts.push(`🔊 ${flat(pr.completionAudioSeconds, "sec")}`);

    const flags: string[] = [];
    if (m.paid_only) flags.push("💎 PAID ONLY");
    flags.push("👁️"); // all video models support image input

    lines.push(`| ${m.description ?? m.name} | \`${m.name}\` | ${flags.join(" ")} | ${per1pollen(cost)} | ${parts.join(" · ") || "—"} |`);
  }
  return lines.join("\n");
}

// ─── AUDIO ────────────────────────────────────────────────────────────────────

function renderAudio(models: MM[]): string {
  const tts   = models.filter(m => !isSTT(m) && !isMusic(m));
  const stt   = models.filter(m =>  isSTT(m));
  const music = models.filter(m =>  isMusic(m));

  const lines = ["\n## 🔊 Audio\n", "> 1 pollen ≈ requests\n",
    "| Model | ID | Flags | 1 pollen ≈ | Pricing |",
    "|---|---|---|---|---|",
  ];

  for (const m of stt) {
    const pr = m.pricing ?? {};
    const c = n(pr.promptAudioSeconds);
    const pricing = c ? `🎬 ${flat(c, "sec")}` : "—";
    lines.push(`| ${m.description ?? m.name} | \`${m.name}\` | 🎙️ | ${per1pollen(c)} | ${pricing} |`);
  }

  for (const m of tts) {
    const pr = m.pricing ?? {};
    // completionAudioTokens in pollen/char → show as /1K chars
    const c = n(pr.completionAudioTokens);
    const pricing = c ? `🔊 ${per1Kchars(c)}` : "—";
    // estimate: avg TTS request ~200 chars
    const reqCost = c ? c * 200 : null;
    lines.push(`| ${m.description ?? m.name} | \`${m.name}\` | 🔊 | ${per1pollen(reqCost)} | ${pricing} |`);
  }

  for (const m of music) {
    const pr = m.pricing ?? {};
    const c = n(pr.completionAudioSeconds);
    const pricing = c ? `🎬 ${flat(c, "sec")}` : "—";
    lines.push(`| ${m.description ?? m.name} | \`${m.name}\` | 🔊 | ${per1pollen(c)} | ${pricing} |`);
  }

  return lines.join("\n");
}

// ─── TEXT ─────────────────────────────────────────────────────────────────────

function renderText(models: TM[]): string {
  // ALL models, sorted by avg cost desc (cheapest last) — nothing excluded
  const avgCost = (m: TM) => {
    const p = m.pricing ?? {};
    const i = n(p.promptTextTokens) ?? 0;
    const o = n(p.completionTextTokens) ?? 0;
    return (i + o) / 2;
  };
  const allText = [...models].sort((a,b) => avgCost(b) - avgCost(a));

  const lines = [
    "\n## 📝 Text\n",
    "> 1 pollen ≈ responses\n",
    "| Model | ID | Flags | 1 pollen ≈ | Pricing |",
    "|---|---|---|---|---|",
  ];

  for (const m of allText) {
    const pr = m.pricing ?? {};
    const parts: string[] = [];
    if (n(pr.promptTextTokens))      parts.push(`💬 ${perM(pr.promptTextTokens)}`);
    if (n(pr.promptCachedTokens))    parts.push(`💾 ${perM(pr.promptCachedTokens)}`);
    if (n(pr.promptAudioTokens))     parts.push(`🔊 ${perM(pr.promptAudioTokens)}`);
    if (n(pr.completionTextTokens))  parts.push(`💬 ${perM(pr.completionTextTokens)}`);
    if (n(pr.promptAudioTokens) && m.output_modalities?.includes("audio"))
      parts.push(`🔊 ${perM(pr.completionAudioTokens ?? 0)}`);

    // estimate: avg response ~500 output tokens + 200 input tokens
    const reqCost = (n(pr.promptTextTokens) ?? 0) * 200 + (n(pr.completionTextTokens) ?? 0) * 500;
    const est = reqCost > 0 ? per1pollen(reqCost) : "—";

    lines.push(`| ${m.description ?? m.name} | \`${m.name}\` | ${tmFlags(m)} | ${est} | ${parts.join(" · ")} |`);
  }

  return lines.join("\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const [text, img, aud] = await Promise.all([
  get<TM[]>("https://gen.pollinations.ai/text/models"),
  get<MM[]>("https://gen.pollinations.ai/image/models"),
  get<MM[]>("https://gen.pollinations.ai/audio/models"),
]);

console.log(`# 🌸 Pollinations — Live Model Pricing`);
console.log(`> **${new Date().toISOString()}** · ${img.length} image · ${aud.length} audio · ${text.length} text\n`);
console.log("---\n");
console.log(renderImage(img));
console.log(renderVideo(img));
console.log(renderAudio(aud));
console.log(renderText(text));
console.log("\n---");
console.log(`
**Model Capabilities:** 👁️ vision · 🧠 reasoning · 🎙️ audio in · 🔍 search · 🔊 audio out

**Token Types:** 💬 text · 🖼️ image · 💾 cached · 🎬 video · 🔊 audio

**Pricing Metrics:** /img = flat per image · /M = per million tokens · /sec = per second · /1K chars = per 1000 characters
`);

```

