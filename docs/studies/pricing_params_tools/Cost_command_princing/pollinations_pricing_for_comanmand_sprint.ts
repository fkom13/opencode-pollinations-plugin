#!/usr/bin/env npx tsx
/**
 * pollinations_pricing.ts — Live pricing table matching enter.pollinations.ai/api/docs
 *
 * Usage: npx tsx pollinations_pricing.ts [--api-key YOUR_KEY] [--debug]
 *
 * ── FORMULA NOTES (reverse-engineered from the official dashboard) ─────────
 *
 *  TEXT models
 *    The dashboard "responses per pollen" cannot be derived purely from
 *    per-token prices because models with identical pricing (e.g. qwen-safety
 *    vs qwen-character) show wildly different estimates.  The API likely
 *    returns a precomputed `avgRequestCost` (or similar) field.  We try
 *    several candidate field names before falling back to a token formula.
 *    Fallback: cost = promptTextTokens * IN_TOK + completionTextTokens * OUT_TOK
 *
 *  IMAGE models — flat rate (no promptTextTokens/promptImageTokens)
 *    cost = completionImageTokens   →   1 token = 1 image   (exact)
 *
 *  IMAGE models — token-based (gptimage, nanobanana, …)
 *    The dashboard uses a per-model "standardOutputTokens" assumption so that
 *    e.g. gptimage (8.0/M out) → 75 img/pollen (≈1667 output tokens/image).
 *    We check for `flatCostPerImage` / `costPerImage` / `standardOutputTokens`
 *    in the API response before falling back to IMG_TOKENS_PER_STD.
 *
 *  VIDEO models — per-second billing (completionVideoSeconds)
 *    Dashboard assumes a default clip duration per model.  We keep a lookup
 *    table; unknown models default to VIDEO_DEFAULT_SEC.
 *    cost = completionVideoSeconds * duration + completionAudioSeconds * duration
 *
 *  VIDEO models — per-token billing (completionVideoTokens)
 *    Similar: cost = completionVideoTokens * VIDEO_DEFAULT_TOKENS
 *
 *  AUDIO STT   cost = promptAudioSeconds    * STT_CLIP_SEC   (default 30s)
 *  AUDIO TTS   cost = completionAudioTokens * TTS_CHARS      (default 200 chars)
 *  AUDIO MUSIC cost = completionAudioSeconds * MUSIC_SEC     (default 50s)
 */

// ─── CLI ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const API_KEY = args.includes("--api-key")
  ? args[args.indexOf("--api-key") + 1]
  : process.env.POLLINATIONS_API_KEY ?? "";
const DEBUG = args.includes("--debug");

const H: HeadersInit = API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {};

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: H });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return r.json();
}

// ─── Benchmark assumptions (tune here to match dashboard) ────────────────────

const BENCH = {
  /** Fallback input tokens when no avgRequestCost field exists */
  TEXT_IN_TOK: 200,
  /** Fallback output tokens when no avgRequestCost field exists */
  TEXT_OUT_TOK: 500,
  /** Output image tokens per standard 1024×1024 generation (token-based models) */
  IMG_TOKENS_PER_STD: 1667,
  /** Default video clip duration in seconds for per-second billing */
  VIDEO_DEFAULT_SEC: 6,
  /** Per-model video duration overrides (seconds) */
  VIDEO_DURATION: {
    veo: 6,
    "seedance-pro": 5,
    seedance: 5,
    "ltx-2": 6,
    wan: 5,
    "grok-video": 5,
  } as Record<string, number>,
  /** Default tokens for per-token video billing */
  VIDEO_DEFAULT_TOKENS: 50_000,
  /** Assumed audio clip length in seconds for STT estimate */
  STT_CLIP_SEC: 30,
  /** Assumed TTS request character count */
  TTS_CHARS: 200,
  /** Assumed music generation length in seconds */
  MUSIC_SEC: 50,
} as const;

// ─── Candidate field names for the precomputed "avg request cost" ─────────────
// The dashboard uses one of these to show "N responses per 1 pollen".
// We probe them in order; first non-null wins.
const AVG_COST_FIELDS = [
  "avgRequestCost",
  "exampleCost",
  "sampleCost",
  "costPerRequest",
  "estimatedCost",
  "standardCost",
  "defaultCost",
] as const;

// ─── Number formatting ────────────────────────────────────────────────────────

function n(v: unknown): number | null {
  const x = Number(v);
  return v === undefined || v === null || isNaN(x) || x === 0 ? null : x;
}

/** Pluck the first non-null value from a list of candidate fields */
function firstField(obj: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const k of keys) {
    const v = n(obj[k]);
    if (v !== null) {
      if (DEBUG) console.error(`[debug] found precomputed cost via field "${k}" = ${v}`);
      return v;
    }
  }
  return null;
}

/** per-million token price, displayed as "X.XX/M" */
function perM(v: unknown): string {
  const x = n(v);
  if (!x) return "—";
  const m = x * 1_000_000;
  if (m >= 100) return `${m.toFixed(1)}/M`;
  if (m >= 10)  return `${m.toFixed(2)}/M`;
  if (m >= 1)   return `${m.toFixed(3)}/M`;
  return `${m.toFixed(4)}/M`;
}

/** flat rate per unit, enough sig figs */
function flat(v: unknown, unit: string): string {
  const x = n(v);
  if (!x) return "—";
  const fmt =
    x >= 1      ? x.toFixed(3) :
    x >= 0.01   ? x.toFixed(4) :
    x >= 0.001  ? x.toFixed(5) :
    x >= 0.0001 ? x.toFixed(6) :
                  x.toFixed(7);
  return `${fmt}/${unit}`;
}

/** per 1,000 characters (TTS billing) */
function per1Kchars(v: unknown): string {
  const x = n(v);
  if (!x) return "—";
  return `${(x * 1000).toFixed(2)}/1K chars`;
}

/** "N units per 1 pollen" — the main "value" column */
function per1pollen(cost: number | null): string {
  if (!cost || cost <= 0) return "—";
  const x = 1 / cost;
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
  if (x >= 100_000)   return `${Math.round(x / 1000)}K`;
  if (x >= 10_000)    return `${(x / 1000).toFixed(1)}K`.replace(/\.0K$/, "K");
  if (x >= 1_000)     return `${Math.round(x / 100) * 100}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (x >= 100)       return `${Math.round(x)}`;
  if (x >= 10)        return `${Math.round(x * 10) / 10}`;
  return `${x.toFixed(1)}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TextModel {
  name: string;
  description?: string;
  pricing?: Record<string, unknown>;
  input_modalities?: string[];
  output_modalities?: string[];
  tools?: boolean;
  reasoning?: boolean;
  paid_only?: boolean;
  context_window?: number;
}

interface MediaModel {
  name: string;
  description?: string;
  paid_only?: boolean;
  pricing?: Record<string, unknown>;
  [k: string]: unknown;
}

// ─── Model classification helpers ─────────────────────────────────────────────

function isVideo(m: MediaModel): boolean {
  const pr = m.pricing ?? {};
  return (
    pr.completionVideoSeconds !== undefined ||
    pr.completionVideoTokens !== undefined
  );
}

function isSTT(m: MediaModel): boolean {
  const d = (m.description ?? "").toLowerCase();
  return (
    d.includes("speech to text") ||
    d.includes("transcri") ||
    m.name.toLowerCase().includes("whisper") ||
    m.name.toLowerCase().includes("scribe")
  );
}

function isMusic(m: MediaModel): boolean {
  return (
    m.name.toLowerCase().includes("music") ||
    m.name.toLowerCase().includes("elevenmusic")
  );
}

function isTokenBasedImage(m: MediaModel): boolean {
  const pr = m.pricing ?? {};
  return (
    pr.promptTextTokens !== undefined ||
    pr.promptImageTokens !== undefined
  );
}

// ─── Capability flags (text models) ──────────────────────────────────────────

function textFlags(m: TextModel): string {
  const f: string[] = [];
  if (m.paid_only) f.push("💎 PAID ONLY");
  if (m.input_modalities?.includes("image"))  f.push("👁️");
  if (m.input_modalities?.includes("audio"))  f.push("🎙️");
  if (m.output_modalities?.includes("audio")) f.push("🔊");
  if (m.reasoning) f.push("🧠");
  if ((m.context_window ?? 0) >= 100_000) f.push(`📏${((m.context_window ?? 0) / 1000).toFixed(0)}k`);
  return f.join(" ");
}

// ─── Cost estimators ──────────────────────────────────────────────────────────

/** TEXT — try precomputed field first, then token formula */
function textCost(m: TextModel): number | null {
  const pr = (m.pricing ?? {}) as Record<string, unknown>;

  // 1. precomputed cost from API
  const pre = firstField(pr, AVG_COST_FIELDS);
  if (pre) return pre;

  // 2. token formula fallback
  const inp = n(pr.promptTextTokens) ?? 0;
  const out = n(pr.completionTextTokens) ?? 0;
  const c = inp * BENCH.TEXT_IN_TOK + out * BENCH.TEXT_OUT_TOK;
  return c > 0 ? c : null;
}

/** IMAGE (flat) — completionImageTokens is cost per image */
function flatImageCost(m: MediaModel): number | null {
  const pr = m.pricing ?? {};
  // Also check for explicit flat cost fields
  const flat = firstField(pr as Record<string, unknown>, [
    "flatCostPerImage",
    "costPerImage",
    ...AVG_COST_FIELDS,
  ]);
  if (flat) return flat;
  return n(pr.completionImageTokens);
}

/** IMAGE (token-based) — gptimage, nanobanana, etc. */
function tokenImageCost(m: MediaModel): number | null {
  const pr = m.pricing ?? {};
  // 1. Explicit flat/average cost from API
  const pre = firstField(pr as Record<string, unknown>, [
    "flatCostPerImage",
    "costPerImage",
    "standardImageCost",
    ...AVG_COST_FIELDS,
  ]);
  if (pre) return pre;

  // 2. Check for standardOutputTokens field (per-model expected token count)
  const stdTok = n(pr.standardOutputTokens);
  const outPrice = n(pr.completionImageTokens);
  if (stdTok && outPrice) {
    if (DEBUG) console.error(`[debug] ${m.name}: using standardOutputTokens=${stdTok}`);
    return outPrice * stdTok;
  }

  // 3. Fallback: use configured estimate + include input costs
  if (outPrice) {
    const inText  = n(pr.promptTextTokens) ?? 0;
    const inImage = n(pr.promptImageTokens) ?? 0;
    // Assume a short reference prompt: 100 text + 100 image input tokens
    const inputCost = inText * 100 + inImage * 100;
    const outputCost = outPrice * BENCH.IMG_TOKENS_PER_STD;
    if (DEBUG) console.error(`[debug] ${m.name}: token-image estimate = inputCost(${inputCost}) + outputCost(${outputCost})`);
    return inputCost + outputCost;
  }
  return null;
}

/** VIDEO — per-second billing */
function videoSecCost(m: MediaModel): number | null {
  const pr = m.pricing ?? {};
  const secPrice   = n(pr.completionVideoSeconds);
  const audioPrice = n(pr.completionAudioSeconds) ?? 0;
  if (!secPrice) return null;
  const dur = BENCH.VIDEO_DURATION[m.name] ?? BENCH.VIDEO_DEFAULT_SEC;
  return (secPrice + audioPrice) * dur;
}

/** VIDEO — per-token billing */
function videoTokenCost(m: MediaModel): number | null {
  const pr = m.pricing ?? {};
  const tokPrice = n(pr.completionVideoTokens);
  if (!tokPrice) return null;
  return tokPrice * BENCH.VIDEO_DEFAULT_TOKENS;
}

// ─── Renderers ────────────────────────────────────────────────────────────────

function renderImage(models: MediaModel[]): string {
  const imgs = models.filter(m => !isVideo(m));
  const lines = [
    "## 🖼️ Image\n",
    "> 1 pollen ≈ images\n",
    "| Model | ID | Flags | 1 pollen ≈ | Pricing |",
    "|---|---|---|---|---|",
  ];

  for (const m of imgs) {
    const pr = m.pricing ?? {};
    const flags: string[] = [];
    if (m.paid_only) flags.push("💎 PAID ONLY");

    let pricingCol = "";
    let cost: number | null = null;

    if (isTokenBasedImage(m)) {
      // Token-based model: show all three token rate columns
      const parts: string[] = [];
      if (n(pr.promptTextTokens))       parts.push(`💬 ${perM(pr.promptTextTokens)}`);
      if (n(pr.promptImageTokens))       parts.push(`🖼️ ${perM(pr.promptImageTokens)}`);
      if (n(pr.completionImageTokens))   parts.push(`🖼️ ${perM(pr.completionImageTokens)}`);
      pricingCol = parts.join(" · ") || "—";
      flags.push("👁️");
      cost = tokenImageCost(m);
    } else {
      // Flat-rate model
      const c = flatImageCost(m);
      pricingCol = c ? `🖼️ ${flat(c, "img")}` : "—";
      cost = c;
    }

    lines.push(
      `| ${m.description ?? m.name} | \`${m.name}\` | ${flags.join(" ")} | ${per1pollen(cost)} | ${pricingCol} |`
    );
  }
  return lines.join("\n");
}

function renderVideo(models: MediaModel[]): string {
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
    const flags: string[] = [];
    if (m.paid_only) flags.push("💎 PAID ONLY");
    flags.push("👁️"); // video models support image input

    let cost: number | null = null;

    if (n(pr.completionVideoSeconds)) {
      // Per-second billing
      parts.push(`🎬 ${flat(pr.completionVideoSeconds, "sec")}`);
      if (n(pr.completionAudioSeconds)) parts.push(`🔊 ${flat(pr.completionAudioSeconds, "sec")}`);
      cost = videoSecCost(m);
      const dur = BENCH.VIDEO_DURATION[m.name] ?? BENCH.VIDEO_DEFAULT_SEC;
      if (DEBUG) console.error(`[debug] ${m.name}: video cost = ${cost} (assumed ${dur}s)`);
    } else if (n(pr.completionVideoTokens)) {
      // Per-token billing
      parts.push(`🎬 ${perM(pr.completionVideoTokens)}`);
      cost = videoTokenCost(m);
    }

    lines.push(
      `| ${m.description ?? m.name} | \`${m.name}\` | ${flags.join(" ")} | ${per1pollen(cost)} | ${parts.join(" · ") || "—"} |`
    );
  }
  return lines.join("\n");
}

function renderAudio(models: MediaModel[]): string {
  const stt   = models.filter(m =>  isSTT(m));
  const music = models.filter(m =>  isMusic(m) && !isSTT(m));
  const tts   = models.filter(m => !isSTT(m) && !isMusic(m));

  const lines = [
    "\n## 🔊 Audio\n",
    "> 1 pollen ≈ requests\n",
    "| Model | ID | Flags | 1 pollen ≈ | Pricing |",
    "|---|---|---|---|---|",
  ];

  // ── STT ──────────────────────────────────────────────────────────────────
  for (const m of stt) {
    const pr = m.pricing ?? {};
    const secPrice = n(pr.promptAudioSeconds);
    // Use precomputed cost if available
    const pre = firstField(pr as Record<string, unknown>, AVG_COST_FIELDS);
    const cost = pre ?? (secPrice ? secPrice * BENCH.STT_CLIP_SEC : null);
    const pricing = secPrice ? `🎬 ${flat(secPrice, "sec")}` : "—";
    lines.push(
      `| ${m.description ?? m.name} | \`${m.name}\` | 🎙️ | ${per1pollen(cost)} | ${pricing} |`
    );
  }

  // ── TTS ──────────────────────────────────────────────────────────────────
  for (const m of tts) {
    const pr = m.pricing ?? {};
    const charPrice = n(pr.completionAudioTokens);
    const pre = firstField(pr as Record<string, unknown>, AVG_COST_FIELDS);
    const cost = pre ?? (charPrice ? charPrice * BENCH.TTS_CHARS : null);
    const pricing = charPrice ? `🔊 ${per1Kchars(charPrice)}` : "—";
    lines.push(
      `| ${m.description ?? m.name} | \`${m.name}\` | 🔊 | ${per1pollen(cost)} | ${pricing} |`
    );
  }

  // ── Music ─────────────────────────────────────────────────────────────────
  for (const m of music) {
    const pr = m.pricing ?? {};
    const secPrice = n(pr.completionAudioSeconds);
    const pre = firstField(pr as Record<string, unknown>, AVG_COST_FIELDS);
    const cost = pre ?? (secPrice ? secPrice * BENCH.MUSIC_SEC : null);
    const pricing = secPrice ? `🎬 ${flat(secPrice, "sec")}` : "—";
    lines.push(
      `| ${m.description ?? m.name} | \`${m.name}\` | 🔊 | ${per1pollen(cost)} | ${pricing} |`
    );
  }

  return lines.join("\n");
}

function renderText(models: TextModel[]): string {
  // Sort: highest cost first (most premium at top)
  const sorted = [...models].sort((a, b) => {
    const ca = textCost(a) ?? 0;
    const cb = textCost(b) ?? 0;
    return cb - ca;
  });

  const lines = [
    "\n## 📝 Text\n",
    "> 1 pollen ≈ responses\n",
    "| Model | ID | Flags | 1 pollen ≈ | Pricing |",
    "|---|---|---|---|---|",
  ];

  for (const m of sorted) {
    const pr = (m.pricing ?? {}) as Record<string, unknown>;
    const parts: string[] = [];
    if (n(pr.promptTextTokens))       parts.push(`💬 ${perM(pr.promptTextTokens)}`);
    if (n(pr.promptCachedTokens))     parts.push(`💾 ${perM(pr.promptCachedTokens)}`);
    if (n(pr.promptAudioTokens))      parts.push(`🎙️ ${perM(pr.promptAudioTokens)}`);
    if (n(pr.completionTextTokens))   parts.push(`💬 ${perM(pr.completionTextTokens)}`);
    if (n(pr.completionAudioTokens) && m.output_modalities?.includes("audio"))
      parts.push(`🔊 ${perM(pr.completionAudioTokens)}`);

    const cost = textCost(m);
    const est = per1pollen(cost);

    lines.push(
      `| ${m.description ?? m.name} | \`${m.name}\` | ${textFlags(m)} | ${est} | ${parts.join(" · ")} |`
    );
  }
  return lines.join("\n");
}

// ─── Debug: dump raw model data ───────────────────────────────────────────────

function debugDump(label: string, models: unknown[]): void {
  if (!DEBUG) return;
  console.error(`\n[debug] ═══ ${label} (${models.length} models) ═══`);
  for (const m of models as MediaModel[]) {
    console.error(`  ${m.name}:`, JSON.stringify(m.pricing ?? {}, null, 2));
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const BASE = "https://gen.pollinations.ai";
const [text, img, aud] = await Promise.all([
  get<TextModel[]>(`${BASE}/text/models`),
  get<MediaModel[]>(`${BASE}/image/models`),
  get<MediaModel[]>(`${BASE}/audio/models`),
]);

debugDump("IMAGE", img);
debugDump("AUDIO", aud);
debugDump("TEXT",  text);

console.log(`# 🌸 Pollinations — Live Model Pricing`);
console.log(
  `> **${new Date().toISOString()}** · ${img.filter(m => !isVideo(m)).length} image · ` +
  `${img.filter(m => isVideo(m)).length} video · ${aud.length} audio · ${text.length} text\n`
);
console.log("---\n");
console.log(renderImage(img));
console.log(renderVideo(img));
console.log(renderAudio(aud));
console.log(renderText(text));
console.log("\n---");
console.log(`
**Model Capabilities:** 👁️ vision · 🧠 reasoning · 🎙️ audio in · 🔊 audio out · 💾 cached tokens

**Token Types:** 💬 text · 🖼️ image · 💾 cached · 🎬 video/audio seconds · 🔊 audio

**Pricing Metrics:**
- \`/img\` = flat rate per image
- \`/M\` = per million tokens
- \`/sec\` = per second of video or audio
- \`/1K chars\` = per 1,000 characters (TTS)

**Estimate Assumptions (tune in BENCH config):**
- Text: ${BENCH.TEXT_IN_TOK} input + ${BENCH.TEXT_OUT_TOK} output tokens per response
- Image (token-based): ${BENCH.IMG_TOKENS_PER_STD} output image tokens per standard 1024×1024 generation
- Video (per second): ${BENCH.VIDEO_DEFAULT_SEC}s default clip; model-specific overrides in BENCH.VIDEO_DURATION
- Audio STT: ${BENCH.STT_CLIP_SEC}s clip · TTS: ${BENCH.TTS_CHARS} chars · Music: ${BENCH.MUSIC_SEC}s

> ⚠️  Run with \`--debug\` to see raw API pricing fields and which cost formula was used per model.
> ⚠️  If the API exposes a precomputed \`avgRequestCost\` / \`exampleCost\` field, that takes priority
>     over all formulas above and will automatically match the dashboard exactly.
`);
