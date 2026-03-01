#!/usr/bin/env npx tsx
/**
 * pollinations_pricing.ts
 * Live Pollinations model pricing table — matches enter.pollinations.ai/api/docs UI
 * Usage: npx tsx pollinations_pricing.ts [--api-key YOUR_KEY]
 */

const API_KEY = process.argv.includes("--api-key")
  ? process.argv[process.argv.indexOf("--api-key") + 1]
  : process.env.POLLINATIONS_API_KEY ?? "";

const HEADERS: Record<string, string> = API_KEY
  ? { Authorization: `Bearer ${API_KEY}` }
  : {};

// ─── Types ────────────────────────────────────────────────────────────────────

interface TextModel {
  name: string;
  description: string;
  aliases?: string[];
  pricing?: {
    promptTextTokens?: number;
    completionTextTokens?: number;
    promptAudioTokens?: number;
    completionAudioTokens?: number;
    promptCachedTokens?: number;
    input?: number;
    output?: number;
    [k: string]: unknown;
  };
  input_modalities?: string[];
  output_modalities?: string[];
  tools?: boolean;
  reasoning?: boolean;
  paid_only?: boolean;
  voices?: string[];
  context_window?: number;
  is_specialized?: boolean;
}

interface MediaModel {
  name: string;
  description?: string;
  paid_only?: boolean;
  voices?: string[];
  pricing?: Record<string, unknown>;
  [k: string]: unknown;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.json() as Promise<T>;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/** Format pollen price per million tokens */
function fmtM(val: number | undefined): string {
  if (!val) return "—";
  const perM = val * 1_000_000;
  if (perM >= 10)   return `${perM.toFixed(2)}/M`;
  if (perM >= 1)    return `${perM.toFixed(2)}/M`;
  if (perM >= 0.1)  return `${perM.toFixed(4)}/M`;
  return `${perM.toExponential(2)}/M`;
}

/** Format pollen price per image/operation */
function fmtUnit(val: number | undefined, unit: string): string {
  if (val === undefined || val === null) return "—";
  if (val === 0) return "free";
  if (val >= 1)    return `${val.toFixed(2)}/${unit}`;
  if (val >= 0.001) return `${val.toFixed(4)}/${unit}`;
  return `${val.toExponential(2)}/${unit}`;
}

/** Generic pollen value — pick best field available */
function getInputPrice(m: MediaModel, unit: string): string {
  const p = m.pricing ?? {};
  const v = (p["input"] ?? p["promptTextTokens"] ?? p["cost"] ?? p["price"]) as number | undefined;
  return fmtUnit(v, unit);
}
function getOutputPrice(m: MediaModel, unit: string): string {
  const p = m.pricing ?? {};
  const v = (p["output"] ?? p["completionTextTokens"]) as number | undefined;
  return fmtUnit(v, unit);
}

/** Capability badges for text models */
function badges(m: TextModel): string {
  const b: string[] = [];
  if (m.reasoning)                             b.push("🧠");
  if (m.tools)                                 b.push("🔧");
  if (m.input_modalities?.includes("image"))   b.push("👁️");
  if (m.input_modalities?.includes("audio"))   b.push("🎤");
  if (m.output_modalities?.includes("audio"))  b.push("🔊");
  if (m.paid_only)                             b.push("💎");
  if (m.context_window && m.context_window >= 100_000)
    b.push(`📏${(m.context_window / 1000).toFixed(0)}k`);
  return b.join(" ");
}

/** Determine search sub-type */
function searchLevel(m: TextModel): string {
  if (m.reasoning) return "deep_search 🔬";
  if ((m.description ?? "").toLowerCase().includes("google search")) return "rapid_search ⚡";
  return "medium_search 🔍";
}

// ─── STT detection ────────────────────────────────────────────────────────────

function isSTT(m: MediaModel): boolean {
  const desc = (m.description ?? "").toLowerCase();
  const name = m.name.toLowerCase();
  return (
    desc.includes("speech to text") ||
    desc.includes("transcri") ||
    desc.includes("speech-to-text") ||
    name.includes("whisper") ||
    name.includes("scribe") ||
    name.includes("stt")
  );
}

function isMusic(m: MediaModel): boolean {
  return (
    m.name.toLowerCase().includes("music") ||
    m.name.toLowerCase().includes("elevenmusic") ||
    "instrumental" in (m.pricing ?? {}) ||
    (m as Record<string,unknown>)["instrumental"] !== undefined
  );
}

function isVideo(m: MediaModel): boolean {
  const knownVideo = ["veo", "seedance", "grok-video", "ltx", "wan"];
  return (
    knownVideo.some(v => m.name.toLowerCase().includes(v)) ||
    "duration" in m ||
    (m as Record<string,unknown>)["type"] === "video"
  );
}

// ─── Renderers ────────────────────────────────────────────────────────────────

function renderImageSection(models: MediaModel[]): string {
  const lines: string[] = [];
  const imgs = models.filter(m => !isVideo(m));
  const vids = models.filter(m =>  isVideo(m));

  lines.push("## 🖼️ Image — `gen_image`");
  lines.push("");
  lines.push("| # | Model | Description | Input | Output | Paid |");
  lines.push("|---|---|---|---|---|---|");
  imgs.forEach((m, i) => {
    const inp = getInputPrice(m, "img");
    const out = getOutputPrice(m, "img");
    lines.push(`| ${i+1} | \`${m.name}\` | ${m.description ?? ""} | ${inp} | ${out} | ${m.paid_only ? "💎" : ""} |`);
  });

  lines.push("");
  lines.push("## 🎬 Video — `gen_video`");
  lines.push("");
  lines.push("| # | Model | Description | Input | Output | Paid |");
  lines.push("|---|---|---|---|---|---|");
  vids.forEach((m, i) => {
    const inp = getInputPrice(m, "sec");
    const out = getOutputPrice(m, "sec");
    lines.push(`| ${i+1} | \`${m.name}\` | ${m.description ?? ""} | ${inp} | ${out} | ${m.paid_only ? "💎" : ""} |`);
  });

  return lines.join("\n");
}

function renderAudioSection(models: MediaModel[]): string {
  const lines: string[] = [];
  const stt   = models.filter(m =>  isSTT(m));
  const music = models.filter(m => !isSTT(m) && isMusic(m));
  const tts   = models.filter(m => !isSTT(m) && !isMusic(m));

  lines.push("## 🔊 Audio");
  lines.push("");

  // TTS
  lines.push("### TTS — `gen_audio`");
  lines.push("");
  lines.push("| # | Model | Description | Input | Output | Voices |");
  lines.push("|---|---|---|---|---|---|");
  tts.forEach((m, i) => {
    const inp = getInputPrice(m, "char");
    const out = getOutputPrice(m, "sec");
    const voices = m.voices ? m.voices.slice(0, 6).join(", ") + (m.voices.length > 6 ? "…" : "") : "—";
    lines.push(`| ${i+1} | \`${m.name}\` | ${m.description ?? ""} | ${inp} | ${out} | ${voices} |`);
  });

  // STT
  if (stt.length) {
    lines.push("");
    lines.push("### STT — `transcribe_audio`");
    lines.push("");
    lines.push("| # | Model | Description | Input | Output |");
    lines.push("|---|---|---|---|---|");
    stt.forEach((m, i) => {
      const inp = getInputPrice(m, "sec");
      const out = getOutputPrice(m, "char");
      lines.push(`| ${i+1} | \`${m.name}\` | ${m.description ?? ""} | ${inp} | ${out} |`);
    });
  }

  // Music
  if (music.length) {
    lines.push("");
    lines.push("### Music — `gen_music`");
    lines.push("");
    lines.push("| # | Model | Description | Input | Output |");
    lines.push("|---|---|---|---|---|");
    music.forEach((m, i) => {
      const inp = getInputPrice(m, "sec");
      const out = getOutputPrice(m, "sec");
      lines.push(`| ${i+1} | \`${m.name}\` | ${m.description ?? ""} | ${inp} | ${out} |`);
    });
  }

  return lines.join("\n");
}

function renderTextSection(models: TextModel[]): string {
  const lines: string[] = [];

  const excluded  = models.filter(m =>  m.is_specialized);
  const audiochat = models.filter(m => !m.is_specialized && m.output_modalities?.includes("audio"));
  const search    = models.filter(m => !m.is_specialized && !m.output_modalities?.includes("audio") && m.tools === false);
  const text      = models.filter(m => !m.is_specialized && !m.output_modalities?.includes("audio") && m.tools !== false);

  // Text
  lines.push("## 📝 Text — `gen_text` *(no dedicated tool yet)*");
  lines.push("");
  lines.push("| # | Model | Description | In /M | Out /M | Cached /M | Caps |");
  lines.push("|---|---|---|---|---|---|---|");
  text.forEach((m, i) => {
    const cached = fmtM(m.pricing?.promptCachedTokens);
    lines.push(`| ${i+1} | \`${m.name}\` | ${m.description ?? ""} | ${fmtM(m.pricing?.promptTextTokens)} | ${fmtM(m.pricing?.completionTextTokens)} | ${cached} | ${badges(m)} |`);
  });

  // STS / Audio chat
  if (audiochat.length) {
    lines.push("");
    lines.push("## 🎙️ Audio Chat STS — `gen_audio`");
    lines.push("");
    lines.push("| # | Model | Description | In text /M | In audio /M | Out audio /M | Caps |");
    lines.push("|---|---|---|---|---|---|---|");
    audiochat.forEach((m, i) => {
      lines.push(`| ${i+1} | \`${m.name}\` | ${m.description ?? ""} | ${fmtM(m.pricing?.promptTextTokens)} | ${fmtM(m.pricing?.promptAudioTokens)} | ${fmtM(m.pricing?.completionAudioTokens)} | ${badges(m)} |`);
    });
  }

  // Web search
  if (search.length) {
    lines.push("");
    lines.push("## 🔍 Web Search — `polli_web_search`");
    lines.push("");
    lines.push("| # | Model | Level | Description | In /M | Out /M | Caps |");
    lines.push("|---|---|---|---|---|---|---|");
    search.forEach((m, i) => {
      lines.push(`| ${i+1} | \`${m.name}\` | ${searchLevel(m)} | ${m.description ?? ""} | ${fmtM(m.pricing?.promptTextTokens)} | ${fmtM(m.pricing?.completionTextTokens)} | ${badges(m)} |`);
    });
  }

  // Specialized
  if (excluded.length) {
    lines.push("");
    lines.push("## 🏷️ Specialized *(excluded from tools)*");
    lines.push("");
    lines.push("| # | Model | Description | In /M | Out /M | Caps |");
    lines.push("|---|---|---|---|---|---|");
    excluded.forEach((m, i) => {
      lines.push(`| ${i+1} | \`${m.name}\` | ${m.description ?? ""} | ${fmtM(m.pricing?.promptTextTokens)} | ${fmtM(m.pricing?.completionTextTokens)} | ${badges(m)} |`);
    });
  }

  return lines.join("\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const [textModels, imageModels, audioModels] = await Promise.all([
    fetchJSON<TextModel[]>("https://gen.pollinations.ai/text/models"),
    fetchJSON<MediaModel[]>("https://gen.pollinations.ai/image/models"),
    fetchJSON<MediaModel[]>("https://gen.pollinations.ai/audio/models"),
  ]);

  const ts = new Date().toISOString();
  console.log(`# 🌸 Pollinations — Live Model Pricing`);
  console.log(`> Fetched at **${ts}** | ${imageModels.length} image · ${audioModels.length} audio · ${textModels.length} text models`);
  console.log("");
  console.log("---");
  console.log("");
  console.log(renderImageSection(imageModels));
  console.log("");
  console.log("---");
  console.log("");
  console.log(renderAudioSection(audioModels));
  console.log("");
  console.log("---");
  console.log("");
  console.log(renderTextSection(textModels));
  console.log("");
  console.log("---");
  console.log("");
  console.log("**Caps:** 🧠 reasoning  🔧 tools  👁️ vision  🎤 audio-in  🔊 audio-out  💎 paid-only  📏 large context");
  console.log("");
  console.log(`> ⚠️ Prices in **pollen**. Pricing fields vary per model — \`—\` means not exposed by API yet.`);
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
