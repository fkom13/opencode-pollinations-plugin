#!/usr/bin/env npx tsx
/**
 * pollinations_pricing.ts — CLI Pricing Table for enter.pollinations.ai
 * * Usage: npx tsx pollinations_pricing.ts [--api-key YOUR_KEY] [--debug] [--mode normal|dynamic]
 * * - Mode 'normal' (défaut) : Affiche le miroir exact du dashboard marketing.
 * - Mode 'dynamic' : Calcule le vrai coût token par token (Cost Guard Estimator).
 */

const args = process.argv.slice(2);
const API_KEY = args.includes("--api-key") ? args[args.indexOf("--api-key") + 1] : process.env.POLLINATIONS_API_KEY ?? "";
const DEBUG = args.includes("--debug");
const modeIndex = args.indexOf("--mode");
const MODE = modeIndex !== -1 ? args[modeIndex + 1] : "normal";

const H: HeadersInit = API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {};

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: H });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return r.json();
}

// ─── COST GUARD ESTIMATOR (Pour le mode dynamic) ─────────────────────────────
const BENCH = {
  TEXT_IN_TOK: 300,
  TEXT_OUT_TOK: 800,
  IMG_TOKENS_PER_STD: 1667,
  VIDEO_DEFAULT_SEC: 6,
  STT_CLIP_SEC: 30,
  TTS_CHARS: 200,
  MUSIC_SEC: 50,
  VIDEO_DURATION: { veo: 6, "seedance-pro": 5, seedance: 5, "ltx-2": 6, wan: 5, "grok-video": 5 } as Record<string, number>,
  VIDEO_DEFAULT_TOKENS: 50_000,
};

// ─── TYPES & UTILITAIRES ─────────────────────────────────────────────────────
interface ApiModel {
  name: string;
  description?: string;
  paid_only?: boolean;
  pricing?: Record<string, unknown>;
  input_modalities?: string[];
  output_modalities?: string[];
  reasoning?: boolean;
  context_window?: number;
  [key: string]: any; // Permet de capturer realAvgCost ou autre à la racine
}

interface ModelStat {
  model: string;
  avg_cost_usd: number;
  request_count: number;
}
let globalModelStats: ModelStat[] = [];

function n(v: unknown): number | null {
  const x = Number(v);
  return v === undefined || v === null || isNaN(x) || x === 0 ? null : x;
}

function perM(v: unknown): string {
  const x = n(v);
  if (!x) return "—";
  const m = x * 1_000_000;
  return m >= 100 ? `${m.toFixed(1)}/M` : m >= 10 ? `${m.toFixed(2)}/M` : m >= 1 ? `${m.toFixed(3)}/M` : `${m.toFixed(4)}/M`;
}

function flat(v: unknown, unit: string): string {
  const x = n(v);
  if (!x) return "—";
  return x >= 1 ? `${x.toFixed(3)}/${unit}` : x >= 0.01 ? `${x.toFixed(4)}/${unit}` : `${x.toFixed(5)}/${unit}`;
}

function per1pollen(cost: number | null): string {
  if (!cost || cost <= 0) return "—";
  const x = 1 / cost;
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
  if (x >= 100_000) return `${Math.round(x / 1000)}K`;
  if (x >= 10_000) return `${(x / 1000).toFixed(1)}K`.replace(/\.0K$/, "K");
  if (x >= 1_000) return `${Math.round(x / 100) * 100}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (x >= 100) return `${Math.round(x)}`;
  if (x >= 10) return `${Math.round(x * 10) / 10}`;
  return `${x.toFixed(1)}`;
}

function getCost(m: ApiModel, type: "text" | "image" | "video" | "audio"): number | null {
  // 1. Priorité aux Stats Tinybird si on est en mode normal
  if (MODE === "normal") {
    // Tente de trouver la variable native à la racine (si l'API l'expose)
    const rootCost = n(m.realAvgCost) ?? n(m.baseCost) ?? n(m.pollenCost) ?? n(m.averageCost);
    if (rootCost) return rootCost;

    // Fallback dynamique sur les stats Tinybird
    const stat = globalModelStats.find(s => s.model === m.name);
    if (stat && stat.avg_cost_usd > 0) return stat.avg_cost_usd;
  }

  // 2. Calcul mathématique (Mode Dynamic ou si Modèle inconnu)
  const pr = m.pricing ?? {};

  if (type === "text") {
    return (n(pr.promptTextTokens) ?? 0) * BENCH.TEXT_IN_TOK + (n(pr.completionTextTokens) ?? 0) * BENCH.TEXT_OUT_TOK || null;
  }

  if (type === "image") {
    const outPrice = n(pr.completionImageTokens);
    if (!outPrice) return null;
    if (pr.promptTextTokens) {
      return (n(pr.promptTextTokens) ?? 0) * 100 + (n(pr.promptImageTokens) ?? 0) * 100 + (outPrice * BENCH.IMG_TOKENS_PER_STD);
    }
    return outPrice;
  }

  if (type === "video") {
    if (pr.completionVideoSeconds) {
      return ((n(pr.completionVideoSeconds) ?? 0) + (n(pr.completionAudioSeconds) ?? 0)) * (BENCH.VIDEO_DURATION[m.name] ?? BENCH.VIDEO_DEFAULT_SEC);
    }
    return n(pr.completionVideoTokens) ? (n(pr.completionVideoTokens) ?? 0) * BENCH.VIDEO_DEFAULT_TOKENS : null;
  }

  if (type === "audio") {
    if (n(pr.promptAudioSeconds)) return (n(pr.promptAudioSeconds) ?? 0) * BENCH.STT_CLIP_SEC;
    if (n(pr.completionAudioSeconds)) return (n(pr.completionAudioSeconds) ?? 0) * BENCH.MUSIC_SEC;
    if (n(pr.completionAudioTokens)) return (n(pr.completionAudioTokens) ?? 0) * BENCH.TTS_CHARS;
  }

  return null;
}

// ─── RENDU VISUEL ────────────────────────────────────────────────────────────
function parseNameDesc(m: ApiModel): { nom: string, desc: string } {
  if (m.title && m.description) {
    return { nom: m.title, desc: m.description };
  }
  const displayName = m.title || m.description || m.name;
  const parts = displayName.split(" - ");
  if (parts.length > 1) {
    return { nom: parts[0].trim(), desc: parts.slice(1).join(" - ").trim() };
  }
  return { nom: displayName, desc: "" };
}

function flags(m: ApiModel, overrides: string[] = []): string {
  const f: string[] = [];
  if (m.paid_only) f.push("💎");

  const allFlags = [...(m.input_modalities || []), ...(m.output_modalities || []), ...overrides, m.name];
  const str = allFlags.join(" ").toLowerCase();

  if (str.includes("image") || str.includes("👁️")) f.push("👁️");
  if (m.reasoning || str.includes("reasoning")) f.push("🧠");
  if (str.includes("audio") && !overrides.includes("🔊") || str.includes("whisper") || str.includes("scribe") || str.includes("🎙️")) f.push("🎙️");
  if (str.includes("search") || str.includes("sonar") || str.includes("gemini")) f.push("🔍");
  if (m.output_modalities?.includes("audio") || overrides.includes("🔊") || str.includes("tts") || str.includes("music")) f.push("🔊");
  if (str.includes("coder") || str.includes("code") || str.includes("gemini")) f.push("💻");

  if ((m.context_window ?? 0) >= 100_000) f.push(`📏${((m.context_window ?? 0) / 1000).toFixed(0)}k`);

  return f.filter((v, i, a) => a.indexOf(v) === i).join(" ");
}

function renderTable(title: string, models: ApiModel[], type: "text" | "image" | "video" | "audio", extraFlags: string[] = []) {
  if (models.length === 0) return "";

  // Tri par coût (du moins cher au plus cher), puis ordre alphabétique
  const sorted = [...models].sort((a, b) => {
    const costA = getCost(a, type) ?? 0;
    const costB = getCost(b, type) ?? 0;
    const diff = costA - costB;
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  const lines = [
    `\n## ${title}\n`,
    `| Nom | ID | Capabilities | 1 pollen ≈ | Pricing |`,
    `|---|---|---|---|---|`
  ];

  for (const m of sorted) {
    const pr = m.pricing ?? {};
    const parts = [];

    // Génération de la colonne Pricing en fonction du type
    if (type === "text") {
      if (n(pr.promptTextTokens)) parts.push(`💬 ${perM(pr.promptTextTokens)}`);
      if (n(pr.promptCachedTokens)) parts.push(`💾 ${perM(pr.promptCachedTokens)}`);
      if (n(pr.completionTextTokens)) parts.push(`💬 ${perM(pr.completionTextTokens)}`);
    } else if (type === "image") {
      if (pr.promptTextTokens) parts.push(`💬 ${perM(pr.promptTextTokens)}`);
      if (pr.completionImageTokens) parts.push(`🖼️ ${pr.promptTextTokens ? perM(pr.completionImageTokens) : flat(pr.completionImageTokens, "img")}`);
    } else if (type === "video") {
      if (pr.completionVideoSeconds) parts.push(`🎬 ${flat(pr.completionVideoSeconds, "sec")}`);
      if (pr.completionVideoTokens) parts.push(`🎬 ${perM(pr.completionVideoTokens)}`);
    } else if (type === "audio") {
      if (pr.promptAudioSeconds) parts.push(`🎬 ${flat(pr.promptAudioSeconds, "sec")}`);
      if (pr.completionAudioTokens) parts.push(`🔊 ${((n(pr.completionAudioTokens) ?? 0) * 1000).toFixed(2)}/1K chars`);
      if (pr.completionAudioSeconds) parts.push(`🎬 ${flat(pr.completionAudioSeconds, "sec")}`);
    }

    const { nom } = parseNameDesc(m);
    lines.push(`| ${nom} | \`${m.name}\` | ${flags(m, extraFlags)} | ${per1pollen(getCost(m, type))} | ${parts.join(" · ") || "—"} |`);
  }
  return lines.join("\n");
}

// ─── DEBUG ULTIME ────────────────────────────────────────────────────────────
function debugDump(label: string, models: ApiModel[]): void {
  if (!DEBUG) return;
  console.error(`\n[debug] ═══ ROOT OBJECT DUMP: ${label} (${models.length} models) ═══`);
  for (const m of models) {
    const clone = { ...m };
    delete clone.description; // Pour garder le terminal lisible
    console.error(JSON.stringify(clone, null, 2));
  }
}

// ─── EXECUTION MAIN ──────────────────────────────────────────────────────────
const BASE = "https://gen.pollinations.ai";
const STATS = "https://enter.pollinations.ai/api/model-stats";

const [text, imgRaw, audRaw, statsRaw] = await Promise.all([
  get<ApiModel[]>(`${BASE}/text/models`),
  get<ApiModel[]>(`${BASE}/image/models`),
  get<ApiModel[]>(`${BASE}/audio/models`),
  get<{ data: ModelStat[] }>(STATS).catch(() => ({ data: [] }))
]);

globalModelStats = statsRaw.data;

// Séparation des modèles images et vidéos qui sont mixés sur le même endpoint
const isVid = (m: ApiModel) => (m.pricing?.completionVideoSeconds || m.pricing?.completionVideoTokens) !== undefined;
const img = imgRaw.filter(m => !isVid(m));
const vid = imgRaw.filter(m => isVid(m));

// Séparation Audio
const isSTT = (m: ApiModel) => !!m.pricing?.promptAudioSeconds;
const isMusic = (m: ApiModel) => m.name.includes("music");
const stt = audRaw.filter(m => isSTT(m));
const tts = audRaw.filter(m => !isSTT(m) && !isMusic(m));
const music = audRaw.filter(m => isMusic(m));

debugDump("IMAGE API", img);
debugDump("VIDEO API", vid);
debugDump("AUDIO API", audRaw);
debugDump("TEXT API", text);

console.log(`# 🌸 Pollinations — Live Model Pricing (Mode: ${MODE.toUpperCase()})`);
console.log(`> **${new Date().toISOString()}** · ${img.length} image · ${vid.length} video · ${audRaw.length} audio · ${text.length} text`);

console.log(renderTable("🖼️ Image", img, "image"));
console.log(renderTable("🎬 Video", vid, "video", ["👁️"]));
console.log(renderTable("🎙️ Speech-to-Text", stt, "audio", ["🎙️"]));
console.log(renderTable("🔊 Text-to-Speech", tts, "audio", ["🔊"]));
console.log(renderTable("🎵 Music", music, "audio", ["🔊"]));
console.log(renderTable("📝 Text", text, "text"));

console.log(`\n> **Capabilities** : 👁️ vision · 🧠 reasoning · 🎙️ audio in · 🔍 search · 🔊 audio out · 💻 code exec`);
console.log(`> **Token Types** : 💬 text · 🖼️ image · 💾 cached · 🎬 video · 🔊 audio`);
console.log(`> **Pricing Metrics** : /img = flat rate per image · /M = per million tokens · /sec = per second of video · /1K chars = per 1000 characters`);
console.log(`> **Other** : 💎 PAID ONLY (Wallet direct) · 📏 Contexte API max`);

console.log(`\n### 💡 How Pollen is Spent
1. Daily tier grants are used first
2. Purchased pollen is used after daily is depleted
⚠️ **Exception**: 💎 Paid Only models require purchased pollen only`);
