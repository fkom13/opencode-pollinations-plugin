# 🌸 Pollinations AI Plugin für OpenCode (v6.3.0)

## ✨ Neu in v6.3.0

- 🎯 **Quests & Gamification** : `polli_quests` + `/poll quests` — sieh deine Quests und das **einlösbare kostenlose Pollen**. Die Nutzung des Plugins schließt Quests rückwirkend ab!
- 🆓 **Kostenlose Bild- & Videogenerierung (ohne Schlüssel!)** : `gen_edit_image_free` (erstellen + bearbeiten, ~20/Tag) und `gen_video_free` (Text→Video + Bild/Audio, ~5/Tag), für jedes Modell.
- 🔐 **1-Klick-Login** : `/poll login` + `polli_login` (Device Flow wie `gh auth login`), Browser öffnet automatisch. `/poll connect sk_...` bleibt für permanente Schlüssel verfügbar.
- 🇨🇳 **Chinesisch hinzugefügt** : Oberfläche in 6 Sprachen (en, fr, es, de, it, zh).


<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="180">
  <h3>Die ultimative Brücke zwischen OpenCode und dem Pollinations.ai Ökosystem</h3>
  <p><em>Greifen Sie auf ein kontinuierliches Universum kostenloser Basis-KI-Modelle zu oder nutzen Sie Premium-Enterprise-Modelle mit unseren großzügigen <b>Stündlichen Freikontingenten (Hourly Free Tiers)</b> direkt über Ihr lokales Terminal.</em></p>
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

## ✨ Was ist neu in V6.2.7?

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

- 🛟 **Safety Net (Sicherheitsnetz)**: Wenn Sie Premium-Modelle verwenden und Ihre stündliche Pollen-Quote mitten in der Chat-Sitzung leer ist, wechselt das Plugin lautlos auf ein kostenloses Fallback-Modell. *Keine blockierenden Limits (429) mehr.*
- 🚦 **Cost Guard für Tools**: OpenCode-Agenten können sehr eifrig sein. Möchte ein Agent zu viele Pollen (z. B. für lange Videos) ausgeben, schaltet sich das Plugin dazwischen. Ein asynchroner Vorgang fragt erst nach Ihrer manuellen Bestätigung. Sie behalten die Kontrolle.

---

## 🐝 Pollen & "Free Tiers" verstehen

Früher stützte sich Pollinations vor allem auf werbefinanzierten Traffic. Große Modelle (wie Claude 3.5 Sonnet, Flux Pro) kosten jedoch Geld. Das **Enter-Universum** verlangt daher nach einem API-Schlüssel für Top-Modelle.

**Aber keine Sorge, Sie brauchen keine Kreditkarte!**

Das **Pollen 🌻** ist unser zentrales Kreditsystem (1$ ≈ 1 Pollen). Verbinden Sie einen einfachen, kostenfreien API-Schlüssel, und Sie schalten **stündliche** Pollen-Aufladungen je nach Entwicklerstufe frei:

| Tier (Stufe) | Stündliche Aufladung ⏱️ | Schätzung Tag* | Voraussetzung |
| :--- | :--- | :--- | :--- |
| 🦠 **Microbe** | **0.01 Pollen / Std.** | ~0.24 / Tag | Einfach registrieren! |
| 🍄 **Spore** | **0.01 Pollen / Std.** | ~0.24 / Tag | Automatische Verifikation |
| 🌱 **Seed** | **0.15 Pollen / Std.** | ~3.6 / Tag | Aktiver GitHub-Entwickler (8+ Punkte) |
| 🌸 **Flower** | **0.40 Pollen / Std.** | ~9.6 / Tag | **Eine App veröffentlichen** (Wie dieses Plugin!) |
| 🍯 **Nectar** | **0.80 Pollen / Std.** | ~19.2 / Tag | Demnächst 🔮 |

_*Tägliche Schätzungen sind nur Näherungswerte (~24h × Stundenrate). Das Reset findet automatisch zur vollen Stunde (XX:00) statt._

> 🎁 **Erhalten Sie Ihren kostenlosen persönlichen Schlüssel (BYOK) auf [Pollinations.ai](https://enter.pollinations.ai/authorize?redirect_url=https://github.com/fkom13/opencode-pollinations-plugin), um OpenCode zu boosten!**

**Wie es funktioniert:**
1. Zuerst wird Ihre kostenlose Quote verbraucht (z.B. 0.40 🌻/Std. für Flower).
2. Ist die Quote ausgeschöpft, wechselt das Sicherheitsnetz sanft zu den Gratis-Modellen.
3. Nur wenn der Account über bezahltes Guthaben (Wallet) verfügt, werden Premium-Modelle weiter bedient.
4. Pünktlich zur Anbruch der nächsten Stunde wird die freie Quote komplett resettet! 💥

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
