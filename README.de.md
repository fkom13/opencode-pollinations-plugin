# 🌸 Pollinations AI Plugin für OpenCode (v6.5.5)

<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="180">
  <h3>Die ultimative Brücke zwischen OpenCode und dem Pollinations.ai Ökosystem</h3>
  <p><em>Greifen Sie auf ein kontinuierliches Universum kostenloser Basis-KI-Modelle zu oder nutzen Sie Premium-Enterprise-Modelle mit unserem <b>Quest- & Paid-Pollen</b>-System direkt über Ihr lokales Terminal.</em></p>
</div>

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/opencode-pollinations-plugin?color=blue&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![Downloads](https://img.shields.io/npm/dt/opencode-pollinations-plugin?color=success&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Philosophie: Offene KI für Entwickler

> **"Keine verschlossenen Türen, keine Unternehmenshürden — einfach gute Werkzeuge und gute Menschen."**

**Pollinations.ai** ist eine Open-Source-Plattform von der Community für die Community. Wir bieten eine einheitliche, direkte API zur Generierung von Bildern, Text, Audio, Video und 3D.

- 🌍 **Transparent**: Unser Code, unsere Roadmap und unsere Diskussionen sind öffentlich.
- ⚖️ **Faire Wirtschaft**: Eine einzige Währung (**Pollen 🌻**) für alle Medien und Modelle. Vorhersehbare und transparente Preise, keine Anbieterbindung (Vendor Lock-in).

---

## ✨ Neu in v6.5.5

- ✂️ **Robustes schlüsselloses RMBG**: `remove_background` nutzt jetzt **bgeraser reverse → ClearBackdrop-Fallback**. BackgroundCut, Schlüsselspeicher/-rotation und `rmbg_keys` wurden aus dem aktiven Plugin entfernt.
- 🎞️ **Kostenloser P‑Video-Vertrag korrigiert**: verifizierte 1–10 s Ausgabe, 720p/1080p, 24/48 fps, sieben Seitenverhältnisse, Seed/Draft/Prompt-Upsampling/Audio sowie optionales Startbild/Audio; Kontingent wird live pro IP gelesen.
- 🖼️ **Kostenlose Bildgenerierung/-bearbeitung erweitert**: 1–3 Bilder, vollständige Seitenverhältnisse, Custom-Größe 256–1440, Seed, Prompt-Upsampling und Edit-Turbo mit Live-Kontingent pro IP.
- 🧬 **Echte Medienbytes haben Vorrang**: Reverse-Bildtools speichern JPEG/PNG/WebP nach Magic Bytes und korrigieren JPEG-Ausgaben, die zuvor als `.png` benannt wurden.
- 🌍 **Sechs-Sprachen-Konvergenz**: Runtime, Onboarding, sechs README-Dateien und das gepflegte technische Handbuch entsprechen dem aktuellen Verhalten.

- 🧊 **3D-Generierung (`polli_gen_3d`)**: Erzeugung hochwertiger 3D-Assets (`trellis-2`, `hyper3d-rodin`) im Standardformat `.glb` mit Cost-Guard-Schutz und Cache-Recovery.
- 🛡️ **Schutz vor Doppelabrechnung**: Chat-Wiederholungen sind strikt auf den HTTP-Code 429 beschränkt; Timeouts und Netzwerkunterbrechungen führen niemals zu doppelten Abbuchungen.
- 🧠 **Saubere Reasoning-Normalisierung**: Automatisches Bereinigen von DeepSeek-, Kimi- und Qwen-Gedankenströmen — kein internes Denktext-Leck im Chat.
- 💰 **Transparente Quest- & Paid-Semantik**: Moderne Abrechnungsmodi (`quest`, `quest_only`, `paid`, `manual`) mit absoluten Pollen-Schwellenwerten.
- 📦 **Artifact Core (Magic Bytes)**: Echte Binärprüfung (JPEG, PNG, GLB, MP4, MP3, WebM) garantiert die korrekte Dateiendung auf der Festplatte.
- ⏱️ **Konfigurierbare Timeout-Hierarchie**: Detaillierte Kontrolle der Wartezeiten pro Aufruf, pro Modell und pro Fähigkeit via `/poll config timeouts.*`.
- 🎯 **Quests & 1-Klick-Login**: Automatische Quest-Erfassung (`/poll quests`) und sofortiges Browser-Login (`/poll login`).
- 🆓 **6 kostenlose Creator-Tools (ohne Schlüssel)**: `gen_edit_image_free`, `gen_video_free`, `object_remover`, `image_upscaler`, `image_enhancer`, `remove_background`.

---

## 🧰 Werkzeuge & Befehle

Mit der Einbindung Ihres API-Schlüssels erhalten OpenCode-Agenten Zugriff auf multimediale Tools, die von Pollinations-Modellen angetrieben werden:

### 💎 Integrierte generative Werkzeuge (ENTER ONLY - API-Schlüssel erforderlich)
- 🎨 `polli_gen_image` : Hochmoderne Bildmodelle (`Flux`, `Sana`, `Midjourney`, etc.).
- 🎬 `polli_gen_video` : Starke Text-zu-Video- und Bild-zu-Video-Modelle (`Wan`, `Veo`, `LTX`, `Reveal`).
- 🧊 `polli_gen_3d` : Erzeugung von 3D-Modellen (`trellis-2`, `hyper3d-rodin`) mit GLB-Ausgabe.
- 🔊 `polli_gen_audio` & `polli_gen_music` : Magische Sprachsynthese (ElevenLabs, OpenAI TTS) und generative Musik.
- 🎙️ `polli_stt` : Hochwertige Sprachumwandlung in Text (Whisper V3).
- 🌐 `polli_web_search` : Vernetzte Websuche & Spezialkontexte (`gemini-search`, `perplexity...`).

### 🧰 Kostenlose Bonus-Werkzeuge für Entwickler (Immer verfügbar — kein Schlüssel nötig)
- 🆓 `gen_edit_image_free` : Kostenlose Bildgenerierung und **Bearbeitung von 1–3 Bildern**, Live-Kontingent pro IP, vollständige Seitenverhältnisse, Custom-Größe 256–1440, Seed, Prompt-Upsampling und Edit-Turbo. Kein Schlüssel.
- 🆓 `gen_video_free` : Kostenloses P‑Video, **verifizierte 1–10 s**, 720p/1080p, 24/48 fps, 7 Seitenverhältnisse, Seed/Draft/Prompt-Upsampling/Audio sowie optionales Startbild oder Audio. Live-Kontingent pro IP, kein Schlüssel.
- 🧹 `object_remover` : Kostenlose Objektentfernung per Prompt; das Ergebnis wird per Magic Bytes geprüft und mit der echten Dateiendung gespeichert.
- 📐 `image_upscaler` : Kostenloses 2x/4x-Upscaling; JPEG/PNG/WebP wird aus den echten Bytes erkannt, niemals aus dem Dateinamen angenommen.
- ✨ `image_enhancer` : Kostenlose 1K/2K/4K-Verbesserung (Entrauschen, Schärfen, Restaurieren) mit Erkennung des echten Ausgabeformats.
- ✂️ `remove_background` : Schlüssellose Hintergrundentfernung mit robuster Kette **bgeraser reverse → ClearBackdrop-Fallback**. Kein Bezahlprovider, keine Schlüsselrotation; echtes Format/Dateiendung automatisch erkannt.
- 🛠️ `gen_qrcode`, `gen_diagram`, `gen_palette`, `extract_frames`, `extract_audio`, `file_to_url` : Entwickler-Tools.

### 💻 Komplette Liste der Terminalbefehle
Verwenden Sie jederzeit den Alias **`/poll`** oder **`/pollinations`** in Ihrem Konversations-Terminal:
- `/poll help` : Zeigt die interaktive Hilfetabelle an.
- `/poll login` : **1-Klick-Browser-Login** (Device Flow) — erstellt und verbindet einen Schlüssel automatisch.
- `/poll connect <Schlüssel>` : Manuelle "Bring Your Own Key"-Konfiguration (`sk_...`).
- `/poll quests` : Quests und verfügbares kostenloses Pollen einsehen. 🎯
- `/poll usage full` : Echtzeit-Dashboard (Statistiken), Quests und Wallet-Guthaben.
- `/poll config` : Feinabstimmung von Cost Guards, Timeouts, Logs, Sprache und Anzeige.
- `/poll models` : Status der verfügbaren Modelle prüfen.
- `/poll pricing` : Anzeige einheitlicher Preise in Echtzeit (Durchschnittskosten-Schätzung).
- `/poll mode <mode>` : Wechseln zwischen Abrechnungsmodi (`quest`, `quest_only`, `paid`, `manual`).
- `/poll fallback` : Definieren des "Safety Net"-Chatmodells.
- `/poll infos` : Übersicht über Funktionen und Nutzungsanleitung.

---

## 🛡️ "Cost Guard" & das "Safety Net" (Sicherheitsnetz)

Wir haben grundlegende Schutzmechanismen entwickelt, um zu garantieren, dass Ihr Workflow niemals unterbrochen wird und Ihr Budget in Ihrer Kontrolle bleibt:

- 🛟 **Safety Net (Sicherheitsnetz)** : Wenn Sie Premium-Modelle verwenden und Ihr Quest-/Paid-Guthaben mitten in der Chat-Sitzung leer ist, wechselt das Plugin lautlos auf ein kostenloses Fallback-Modell. *Keine blockierenden Limits (429) mehr.*
- 🚦 **Cost Guard für Tools** : OpenCode-Agenten können sehr eifrig sein. Möchte ein Agent zu viel Pollen für eine schwere Video- oder 3D-Generierung ausgeben, fängt das Plugin die Anfrage ab und fragt nach Ihrer manuellen Bestätigung (`polli_gen_confirm`).

---

## 🐝 Quest Pollen & Paid Pollen verstehen

Das Pollinations-Pollen ist in zwei Konten getrennt:

- **🎁 Quest Pollen** — kostenlos verdient durch das Abschließen von **Quests**. Vom Server auf regulären Modellen zuerst verbraucht.
- **💎 Paid Pollen** — gekauft (Kreditkarte). Wird verwendet, wenn Quest nicht ausreicht, oder für `paid_only`-Modelle.

> ⚠️ Das Plugin kann die Aufteilung serverseitig nicht auslesen; es schätzt Quest/Paid lokal und liest die echte Aufteilung (`meter_source`) aus `/account/usage`.

### Abrechnungsmodi (v6.5)

| Modus | Verhalten |
| :--- | :--- |
| `quest` (QUEST_PREFERRED, **Standard**) | Quest zuerst, Paid-Fallback erlaubt (Server-Standard). Fällt auf das Free Universe zurück, wenn beide erschöpft aussehen. |
| `quest_only` (QUEST_ELIGIBLE_ONLY) | Blockiert `paid_only`-Modelle lokal; sendet nur Quest-berechtigte Aufrufe. **Best-effort** — eine Paid-Belastung kann im Wettlauf dennoch auftreten. |
| `paid` (PAID_ALLOWED) | Paid erlaubt, `paid_only` laut Cost Guard erlaubt. Fällt auf Free zurück, wenn das Wallet niedrig ist. |
| `manual` | Keine automatische Richtlinie — volle manuelle Kontrolle. |

Ändern mit `/poll mode <mode>` oder `/poll config mode <mode>`.

> 🎯 **Verdienen Sie kostenloses Pollen durch das Abschließen von Quests!** Allein die Nutzung dieses Plugins erfüllt mehrere Quests rückwirkend. Führen Sie `/poll quests` aus, um zu sehen, was Sie beanspruchen können.

> 🎁 **Erhalten Sie Ihren kostenlosen persönlichen Schlüssel (BYOK) auf [enter.pollinations.ai](https://enter.pollinations.ai), um OpenCode zu boosten!**

**Wie es funktioniert:**
1. Ihr Quest Pollen wird auf allen regulären Modellen zuerst verbraucht.
2. 💎 Nur-Paid-Modelle verwenden immer gekauftes Pollen.
3. Wenn beide Guthaben erschöpft sind, wechselt das Sicherheitsnetz sanft zu kostenlosen Fallback-Varianten.

---

## 🌍 Native Mehrsprachigkeit (i18n)

Pollinations für OpenCode spricht Ihre Sprache nativ:
- Engine-Schnittstelle, Benachrichtigungen (Toasts), Ergebnisse und Commands sind komplett auf **Englisch**, **Französisch**, **Spanisch**, **Deutsch**, **Italienisch** und **Chinesisch** verfügbar.
- Geben Sie `/poll config lang <en|fr|es|de|it|zh>` in Ihr Terminal ein, um blitzschnell zu wechseln.

---

## 🚀 Installation & Onboarding

### 🐧 1. Plattformübergreifende Einrichtung (NPM-Installation)
Dieses Plugin ist **komplett plattformunabhängig** (Windows, macOS, Linux ; Node **≥ 18**) und startet einen lokalen Proxy auf einem dynamischen Port.

1. Globale oder lokale Installation:
   ```bash
   npm install -g opencode-pollinations-plugin
   ```
2. Auto-Konfiguration:
   ```bash
   npx opencode-pollinations-plugin
   # oder: npx opencode-pollinations-plugin --check
   ```
   *(Trägt `opencode-pollinations-plugin` automatisch in `~/.config/opencode/opencode.json` ein)*

### 🔐 2. Pollinations-Konto verbinden — empfohlen

Der normale Weg besteht aus **einem Befehl**:

```bash
/poll login
```

Der Browser öffnet sich automatisch. Mit GitHub anmelden und **Authorize** klicken; das Plugin verbindet sich selbst. **Kein API-Schlüssel muss erstellt, kopiert oder eingefügt werden.** Empfohlen für Konto, Quests, Wallet, Premium-Modelle und Paid-Tools.

> 🤖 **Agenten:** Wenn der Benutzer Pollinations verbinden/anmelden möchte, automatisch `polli_login` aufrufen. Nicht nach einem API-Key fragen, außer der Benutzer verlangt ausdrücklich manuelles BYOK.

**Manuelles BYOK — optional, nur mit bereits vorhandenem Secret-Key:**
```bash
/poll connect sk_ihr_schluessel_hier
```

---

## 🔗 Links

- **Dashboard & API-Schlüssel**: [enter.pollinations.ai](https://enter.pollinations.ai)
- **Discord-Community**: [Mach mit!](https://discord.gg/pollinations-ai-885844321461485618)
- **OpenCode-Ökosystem**: [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 Lizenz

MIT License. Entwickelt von [fkom13](https://github.com/fkom13) & The Pollinations Community.
