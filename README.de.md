# 🌸 Pollinations AI Plugin für OpenCode (v6.4.9)

## ✨ Neu in v6.4.9

- 🎯 **Quests & Gamification**: `polli_quests` + `/poll quests`. Plugin-Nutzung erfüllt Quests **rückwirkend**.
- 🆓 **Kostenlose Tools (kein Schlüssel)** — für **jedes** OpenCode-Modell:
  - `gen_edit_image_free` — generieren **und** bearbeiten (~20/Tag)
  - `gen_video_free` — Text→Video (~5/Tag)
  - `object_remover` / `image_upscaler` / `image_enhancer` — kostenlose Bildverarbeitung
  - `remove_background` — kostenloses KI-Freistellen (rmbg / bgeraser)
- 🔐 **1-Klick-Login**: `/poll login` + `polli_login`. `/poll connect sk_...` bleibt verfügbar.
- 🧊 **Vollständiger Modellkatalog**: text, image, video, audio, **3D**, **embeddings**, realtime.
- 🧪 **CI + Packaging**: Node ≥ 18, CLI `npx opencode-pollinations-plugin`, Unit- + i18n-Tests.
- 🌍 **6 Sprachen**: en, fr, es, de, it, zh — Onboarding und Commands ausgerichtet.


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

**Pollinations.ai** ist eine Open-Source-Plattform von der Community für die Community. Wir bieten eine einheitliche, direkte API zur Generierung von Bildern, Text, Audio und Video.

- 🌍 **Transparent**: Unser Code, unsere Roadmap und unsere Diskussionen sind öffentlich.
- ⚖️ **Faire Wirtschaft**: Eine einzige Währung (**Pollen 🌻**) für alle Medien und Modelle. Vorhersehbare und transparente Preise, keine Anbieterbindung (Vendor Lock-in).

---

## ✨ Was ist neu in V6.4?

- ⏱️ **Stündliche Quoten**: Verabschieden Sie sich von täglichen Limits! Developer Tiers werden jetzt **jede Stunde** pünktlich um `:00` zurückgesetzt. So haben Sie bei langen Code-Sitzungen immer frische Credits.
- ⚡ **100% Dynamische Engine**: Keine hartcodierten Modelllisten, festen Standardkonfigurationen und Preise mehr! In V6.2 ruft der KI-Agent von OpenCode dynamisch die neuesten LLMs, Parameter, Tags (`[💎 Paid]`, `[🌿 Free]`) und Kostenabschätzungen über die Pollinations-APIs ab.
- 🛡️ **Robuste Sicherheit**: Schutz vor Path-Traversal-Angriffen und strenge URL-Überprüfungen sind vollständig integriert.
- 🔍 **Verbesserte Websuche**: Die `polli_web_search`-Komponente wird an hochentwickelte, für das Web aktivierte Modelle wie Google Gemini Fast, Perplexity und spezielle Assistenten abgebildet.

---

## 🧰 Werkzeuge & Befehle

Mit der Einbindung Ihres API-Schlüssels erhalten OpenCode-Agenten Zugriff auf multimediale Tools, die von Pollinations-Modellen angetrieben werden:

### 💎 Integrierte generative Werkzeuge (ENTER ONLY - API-Schlüssel erforderlich)
- 🎨 `polli_gen_image` : Hochmoderne Bildmodelle (`Flux`, `Sana`, `Midjourney`, etc.).
- 🎬 `polli_gen_video` : Starke Text-zu-Video- und Bild-zu-Video-Modelle (`Wan`, `Veo`, `LTX`, `Reveal`).
- 🔊 `polli_gen_audio` & `polli_gen_music` : Magische Sprachsynthese (ElevenLabs, OpenAI TTS) und generative Musik.
- 🎙️ `polli_stt` : Hochwertige Sprachumwandlung in Text (Whisper V3).
- 🌐 `polli_web_search` : Vernetzte Websuche & Spezialkontexte (`gemini-search`, `perplexity...`).

### 🧰 Kostenlose Bonus-Werkzeuge für Entwickler (Immer verfügbar)
- ✂️ `remove_background` : Integrierte, blitzschnelle Entfernung von Bildhintergründen.
- 🛠️ `gen_qrcode`, `gen_diagram`, `extract_frames`, `extract_audio`, `file_to_url` : Entwickler-Tools.

### 💻 Komplette Liste der Terminalbefehle
Verwenden Sie jederzeit den Alias **`/poll`** oder **`/pollinations`** in Ihrem Konversations-Terminal:
- `/poll help` : Zeigt die interaktive Hilfetabelle an.
- `/poll connect` : Interaktive "Bring Your Own Key"-Konfiguration.
- `/poll usage full` : Echtzeit-Dashboard (Statistiken), freie Kontingente und Wallet-Guthaben.
- `/poll config` : Feinabstimmung von Cost Guards, Logs, Sprache und Anzeige.
- `/poll models` : Status der verfügbaren Modelle prüfen.
- `/poll pricing` : Anzeige einheitlicher Preise in Echtzeit (Durchschnittskosten-Schätzung).
- `/poll fallback` : Definieren des "Safety Net"-Chatmodells.
- `/poll infos` : Lernen Sie Community-Regeln und das Stufen-System (Leveling) kennen.

---

## 🛡️ "Cost Guard" & das "Safety Net" (Sicherheitsnetz)

Wir haben grundlegende Schutzmechanismen entwickelt, um zu garantieren, dass Ihr Workflow niemals unterbrochen wird und Ihr Budget in Ihrer Kontrolle bleibt:

- 🛟 **Safety Net (Sicherheitsnetz)**: Wenn Sie Premium-Modelle verwenden und Ihr Quest-/Paid-Guthaben mitten in der Chat-Sitzung leer ist, wechselt das Plugin lautlos auf ein kostenloses Fallback-Modell. *Keine blockierenden Limits (429) mehr.*
- 🚦 **Cost Guard für Tools**: OpenCode-Agenten können sehr eifrig sein. Möchte ein Agent zu viele Pollen (z. B. für lange Videos) ausgeben, schaltet sich das Plugin dazwischen. Ein asynchroner Vorgang fragt erst nach Ihrer manuellen Bestätigung. Sie behalten die Kontrolle.

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

> 🎁 **Erhalten Sie Ihren kostenlosen persönlichen Schlüssel (BYOK) auf [Pollinations](https://enter.pollinations.ai), um OpenCode zu boosten!**

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
Dieses Plugin ist **komplett plattformunabhängig** (Windows, macOS, Linux) und erkennt OpenCode-Ports dynamisch.

1. Globale Installation:
   ```bash
   npm install -g opencode-pollinations-plugin
   ```
2. Auto-Konfiguration:
   ```bash
   npx opencode-pollinations-plugin
   ```
   *(Oder manuell in `~/.config/opencode/opencode.json` eintragen)*

### 🔑 2. Interaktives Onboarding
Nachdem OpenCode gestartet ist, tippen Sie im Agent-Terminal einfach ab:
```bash
/poll connect
```
Ein Assistent hilft Ihnen interaktiv bei der Erstellung des Schlüssels und der Workspace-Einrichtung. *(Starten Sie OpenCode neu, damit die neue Modellliste im UI erscheint).*

---

## 🔗 Links

- **Pollen-API-Schlüssel holen**: [pollinations.ai](https://pollinations.ai)
- **Discord-Community**: [Mach mit!](https://discord.gg/pollinations-ai-885844321461485618)
- **OpenCode-Ökosystem**: [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 Lizenz

MIT License. Entwickelt von [fkom13](https://github.com/fkom13) & The Pollinations Community.
