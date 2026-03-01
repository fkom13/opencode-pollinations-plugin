#!/usr/bin/env npx tsx
/**
 * pollinations_pricing.ts — Pollinations Live Pricing Table
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
// Always fixed notation, never scientific

function fmt(val: unknown, unit: string): string {
  if (val === undefined || val === null) return "—";
  const n = Number(val);
  if (isNaN(n) || n === 0) return "—";

  // Per-million display (for /M columns)
  if (unit === "M") {
    const perM = n * 1_000_000;
    if (perM >= 100)  return `${perM.toFixed(0)}/M`;
    if (perM >= 10)   return `${perM.toFixed(2)}/M`;
    if (perM >= 1)    return `${perM.toFixed(4)}/M`;
    if (perM >= 0.01) return `${perM.toFixed(4)}/M`;
    return `${perM.toFixed(6)}/M`;
  }

  // Per-unit display (img, sec, char, item)
  if (n >= 100)    return `${n.toFixed(0)}/${unit}`;
  if (n >= 1)      return `${n.toFixed(4)}/${unit}`;
  if (n >= 0.01)   return `${n.toFixed(4)}/${unit}`;
  if (n >= 0.0001) return `${n.toFixed(6)}/${unit}`;
  // Very small numbers — use enough decimals to show 2 significant digits
  const digits = Math.ceil(-Math.log10(n)) + 2;
  return `${n.toFixed(Math.min(digits, 10))}/${unit}`;
}

// Pick first non-null value from a list of keys in an object
function pick(obj: Record<string,unknown>, ...keys: string[]): unknown {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}

// ─── Text model types ─────────────────────────────────────────────────────────

interface TM {
  name: string; description: string;
  pricing?: Record<string, unknown>;
  input_modalities?: string[]; output_modalities?: string[];
  tools?: boolean; reasoning?: boolean; paid_only?: boolean;
  voices?: string[]; context_window?: number; is_specialized?: boolean;
}

function caps(m: TM): string {
  const b: string[] = [];
  if (m.reasoning)                             b.push("🧠");
  if (m.tools)                                 b.push("🔧");
  if (m.input_modalities?.includes("image"))   b.push("👁️");
  if (m.input_modalities?.includes("audio"))   b.push("🎤");
  if (m.output_modalities?.includes("audio"))  b.push("🔊");
  if (m.paid_only)                             b.push("💎");
  if ((m.context_window ?? 0) >= 100_000)      b.push(`📏${((m.context_window??0)/1000).toFixed(0)}k`);
  return b.join(" ");
}

function searchLevel(m: TM): string {
  if (m.reasoning) return "deep_search 🔬";
  if ((m.description ?? "").toLowerCase().includes("google search")) return "rapid_search ⚡";
  return "medium_search 🔍";
}

// ─── Media model types ────────────────────────────────────────────────────────

interface MM { name: string; description?: string; paid_only?: boolean; voices?: string[]; pricing?: Record<string,unknown>; [k: string]: unknown }

function isVideo(m: MM): boolean {
  return ["veo","seedance","grok-video","ltx","wan"].some(v => m.name.toLowerCase().includes(v));
}
function isSTT(m: MM): boolean {
  const d = (m.description ?? "").toLowerCase();
  return d.includes("speech to text") || d.includes("transcri") || ["whisper","scribe","stt"].some(v => m.name.toLowerCase().includes(v));
}
function isMusic(m: MM): boolean {
  return m.name.toLowerCase().includes("music") || m.name.toLowerCase().includes("elevenmusic");
}

// ─── Image & Video ────────────────────────────────────────────────────────────

function renderMedia(models: MM[]): string {
  const imgs = models.filter(m => !isVideo(m));
  const vids = models.filter(m =>  isVideo(m));
  const rows = (list: MM[], unit: string) =>
    list.map((m, i) => {
      const p = m.pricing ?? {};
      const inp = fmt(pick(p, "input","promptTextTokens","cost","pricePerImage","inputCost","pricePer"), unit);
      const out = fmt(pick(p, "output","completionTextTokens","outputCost"), unit);
      return `| ${i+1} | \`${m.name}\` | ${m.description ?? ""} | ${inp} | ${out} | ${m.paid_only ? "💎" : ""} |`;
    }).join("\n");

  return [
    "## 🖼️ Image — `gen_image`\n",
    "| # | Model | Description | Input | Output | Paid |",
    "|---|---|---|---|---|---|",
    rows(imgs, "img"),
    "",
    "## 🎬 Video — `gen_video`\n",
    "| # | Model | Description | Input | Output | Paid |",
    "|---|---|---|---|---|---|",
    rows(vids, "sec"),
  ].join("\n");
}

// ─── Audio ────────────────────────────────────────────────────────────────────

function renderAudio(models: MM[]): string {
  const tts   = models.filter(m => !isSTT(m) && !isMusic(m));
  const stt   = models.filter(m =>  isSTT(m));
  const music = models.filter(m =>  isMusic(m));

  const lines: string[] = ["## 🔊 Audio\n"];

  if (tts.length) {
    lines.push("### TTS — `gen_audio`\n");
    lines.push("| # | Model | Description | Input | Output | Voices |");
    lines.push("|---|---|---|---|---|---|");
    tts.forEach((m, i) => {
      const p = m.pricing ?? {};
      const inp = fmt(pick(p,"input","pricePerChar","costPerChar","promptTextTokens"), "char");
      const out = fmt(pick(p,"output","pricePerSec","costPerSec","completionTextTokens"), "sec");
      const v = m.voices ? m.voices.slice(0,6).join(", ")+(m.voices.length>6?"…":"") : "—";
      lines.push(`| ${i+1} | \`${m.name}\` | ${m.description??""} | ${inp} | ${out} | ${v} |`);
    });
    lines.push("");
  }

  if (stt.length) {
    lines.push("### STT — `transcribe_audio`\n");
    lines.push("| # | Model | Description | Input | Output |");
    lines.push("|---|---|---|---|---|");
    stt.forEach((m, i) => {
      const p = m.pricing ?? {};
      const inp = fmt(pick(p,"input","pricePerSec","costPerSec","promptTextTokens"), "sec");
      const out = fmt(pick(p,"output","completionTextTokens"), "char");
      lines.push(`| ${i+1} | \`${m.name}\` | ${m.description??""} | ${inp} | ${out} |`);
    });
    lines.push("");
  }

  if (music.length) {
    lines.push("### Music — `gen_music`\n");
    lines.push("| # | Model | Description | Input | Output |");
    lines.push("|---|---|---|---|---|");
    music.forEach((m, i) => {
      const p = m.pricing ?? {};
      const inp = fmt(pick(p,"input","pricePerSec","promptTextTokens"), "sec");
      const out = fmt(pick(p,"output","completionTextTokens"), "sec");
      lines.push(`| ${i+1} | \`${m.name}\` | ${m.description??""} | ${inp} | ${out} |`);
    });
  }

  return lines.join("\n");
}

// ─── Text ─────────────────────────────────────────────────────────────────────

function renderText(models: TM[]): string {
  const excl  = models.filter(m =>  m.is_specialized);
  const sts   = models.filter(m => !m.is_specialized && m.output_modalities?.includes("audio"));
  const srch  = models.filter(m => !m.is_specialized && !m.output_modalities?.includes("audio") && m.tools === false);
  const text  = models.filter(m => !m.is_specialized && !m.output_modalities?.includes("audio") && m.tools !== false);

  const lines: string[] = [];

  // Text
  lines.push("## 📝 Text\n");
  lines.push("| # | Model | Description | Input /M | Output /M | Cached /M | Caps |");
  lines.push("|---|---|---|---|---|---|---|");
  text.forEach((m,i) => {
    const p = m.pricing ?? {};
    lines.push(`| ${i+1} | \`${m.name}\` | ${m.description??""} | ${fmt(p.promptTextTokens,"M")} | ${fmt(p.completionTextTokens,"M")} | ${fmt(p.promptCachedTokens,"M")} | ${caps(m)} |`);
  });

  // STS
  if (sts.length) {
    lines.push("\n## 🎙️ Audio Chat — STS\n");
    lines.push("| # | Model | Description | In text /M | In audio /M | Out audio /M | Caps |");
    lines.push("|---|---|---|---|---|---|---|");
    sts.forEach((m,i) => {
      const p = m.pricing ?? {};
      lines.push(`| ${i+1} | \`${m.name}\` | ${m.description??""} | ${fmt(p.promptTextTokens,"M")} | ${fmt(p.promptAudioTokens,"M")} | ${fmt(p.completionAudioTokens,"M")} | ${caps(m)} |`);
    });
  }

  // Search
  if (srch.length) {
    lines.push("\n## 🔍 Web Search — `polli_web_search`\n");
    lines.push("| # | Model | Level | Description | Input /M | Output /M | Caps |");
    lines.push("|---|---|---|---|---|---|---|");
    srch.forEach((m,i) => {
      const p = m.pricing ?? {};
      lines.push(`| ${i+1} | \`${m.name}\` | ${searchLevel(m)} | ${m.description??""} | ${fmt(p.promptTextTokens,"M")} | ${fmt(p.completionTextTokens,"M")} | ${caps(m)} |`);
    });
  }

  // Specialized
  if (excl.length) {
    lines.push("\n## 🏷️ Specialized\n");
    lines.push("| # | Model | Description | Input /M | Output /M | Caps |");
    lines.push("|---|---|---|---|---|---|");
    excl.forEach((m,i) => {
      const p = m.pricing ?? {};
      lines.push(`| ${i+1} | \`${m.name}\` | ${m.description??""} | ${fmt(p.promptTextTokens,"M")} | ${fmt(p.completionTextTokens,"M")} | ${caps(m)} |`);
    });
  }

  return lines.join("\n");
}

// ─── DEBUG: dump raw pricing fields ──────────────────────────────────────────
function dumpPricing(label: string, models: MM[]) {
  if (!process.argv.includes("--debug")) return;
  console.error(`\n=== ${label} pricing fields ===`);
  models.forEach(m => console.error(`${m.name}:`, JSON.stringify(m.pricing ?? {})));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const [text, img, aud] = await Promise.all([
  get<TM[]>("https://gen.pollinations.ai/text/models"),
  get<MM[]>("https://gen.pollinations.ai/image/models"),
  get<MM[]>("https://gen.pollinations.ai/audio/models"),
]);

dumpPricing("IMAGE", img);
dumpPricing("AUDIO", aud);

console.log(`# 🌸 Pollinations — Live Model Pricing`);
console.log(`> **${new Date().toISOString()}** · ${img.length} image · ${aud.length} audio · ${text.length} text\n`);
console.log("---\n");
console.log(renderMedia(img));
console.log("\n---\n");
console.log(renderAudio(aud));
console.log("\n---\n");
console.log(renderText(text));
console.log("\n---");
console.log("\n**Caps:** 🧠 reasoning · 🔧 tools · 👁️ vision · 🎤 audio-in · 🔊 audio-out · 💎 paid · 📏 large ctx");
