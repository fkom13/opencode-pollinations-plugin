# V6.5 MIGRATION GUIDE — opencode-pollinations-plugin

**From:** v6.4.10 → **To:** v6.5.0
**Date:** 2026-08-14

v6.5 is a **coherence & reliability release**. It removes the dead
tier/hourly-refill model (deleted upstream on 2026-07-10) and replaces it
with honest **Quest / Paid** semantics, fixes reasoning leaks, secures
retries/timeouts, and adds a 3D tool.

---

## 1. Billing modes — renamed & re-semantized

| v6.4.10 | v6.5.0 | Meaning |
|---|---|---|
| `alwaysfree` | **`quest`** (QUEST_PREFERRED) | Default. Quest first, Paid fallback **allowed** (server default). |
| *(new)* | **`quest_only`** (QUEST_ELIGIBLE_ONLY) | Blocks `paid_only` locally; Quest-eligible calls only. **Best-effort.** |
| `pro` | **`paid`** (PAID_ALLOWED) | Paid allowed; wallet-protected fallback. |
| `manual` | `manual` | Unchanged. |

- Old names `alwaysfree` and `pro` are **still accepted** as aliases on
  `/poll mode` and are **migrated automatically** in your config
  (`alwaysfree` → `quest`, `pro` → `paid`) on first load.
- **"Never spend Paid" is not a promise we can make**: the server picks the
  billing bucket at debit time (Quest first, then Paid) and the client cannot
  lock it. `quest_only` is a client-side best-effort guard — a Paid (pack)
  debit can still occur in a race or on real-cost overage. This is now
  documented honestly in the UI and docs.

## 2. Removed config keys

| Key | Why |
|---|---|
| `refillOverride` | Hourly refill no longer exists upstream. Removed on load. |
| `questStashInFreeMode` | Tied to the old alwaysfree tier semantics. Removed on load. |
| `thresholds.tier` (percent) | Percentages were relative to a dead tier limit. Replaced by `thresholds.quest` (absolute pollen floor, default 0.05). |
| `tier.*` i18n / TIER_INFO table | Tier ladder (Spore/Seed/Flower/Nectar/Router) deleted upstream. |

## 3. New config keys

| Key | Default | Meaning |
|---|---|---|
| `thresholds.quest` | `0.05` 🌻 | Quest pollen floor for alerts + `quest_only` fallback. |
| `thresholds.wallet` | `0.5` 🌻 | Paid wallet floor for alerts + `paid` fallback (was a % before). |
| `timeouts.default` | `300` s | Global remote-operation timeout. |
| `timeouts.longRunning` | `900` s | Long-running generation timeout. |
| `timeouts.max` | `3600` s | Absolute ceiling. |
| `timeouts.capabilities.image/video/audio/threeD/realtime/embed` | `600/1800/600/1800/300/60` s | Per-capability timeouts. |
| `timeouts.model.<name>` | — | Per-model override (e.g. `timeouts.model.trellis-2 1200`). |

Commands: `/poll config timeouts.default 600`, `/poll config timeouts.video 1800`,
`/poll config timeouts.reset`.

Precedence: **per-call `timeout_seconds` > model override > capability > global**.
Clamp: min 10 s, max 3600 s.

## 4. Tool behavior changes

| Area | Change |
|---|---|
| **Video** | Canonical endpoint is now `/video/{prompt}` (SDK/CLI route). Old params unchanged. |
| **Retries (chat)** | After a client timeout / abort / ambiguous 5xx, the proxy **never re-submits automatically** (double-billing protection). Only 429 is retried, conservatively. |
| **Media timeouts** | On timeout the generation may still be running and **billed** upstream. Tools now say so and propose **cache recovery**: re-run with the SAME seed → artifact served from cache, not re-billed. |
| **`timeout_seconds`** | New per-call arg on `polli_gen_image`, `polli_gen_video`, `polli_gen_3d` (10–3600 s). |
| **3D** | New tool `polli_gen_3d` (trellis-2 default ~0.24 🌻 low, hyper3d-rodin ~0.10 🌻). GLB output, magic-bytes validated. |
| **Reasoning** | DeepSeek/Kimi `reasoning_content` and Qwen `reasoning`/`reasoning_details` are **stripped** before reaching OpenCode (no more reasoning text pollution). `usage.completion_tokens_details.reasoning_tokens` preserved. Kimi `tool_calls[].name:null` parasite removed (`function.name` is canonical). |
| **Artifact save** | Saved extension follows **real magic bytes** (a b64 edit response can be JPEG even if the caller assumed PNG). |
| **Model registry** | Now refreshes automatically after its TTL during long sessions (lazy refresh on every read path, coalesced, offline fallback kept). |

## 5. Quota display

`/poll usage` now shows **Quest ~X | Paid ~Y** instead of the tier ladder.
The authoritative split remains `meter_source` in `/account/usage`
(`tier` = Quest, `pack` = Paid).

## 6. BYOP / App Key — unchanged

App Key (`pk_`) → device flow → user `sk_` → generation billed to the user.
The plugin's device-flow client_id is the configured App Key. No owner-funded
generation with `pk_`. (Phase 2.1 live-validated; device-flow budget 0.5/1 day
vs documented 5/7 days is a known upstream divergence — not hardcoded.)

## 7. Breaking changes summary

- `thresholds.tier` removed (→ `thresholds.quest`).
- Tier tables / hourly-refill copy removed from all docs and 6 locales.
- `refillOverride`, `questStashInFreeMode` removed.
- Video tools now call `/video/{prompt}` (same upstream handler; no param change).
- Reasoning fields are no longer passed through to OpenCode.

No silent destructive migration: legacy values are aliased/mapped on load and
documented here.
