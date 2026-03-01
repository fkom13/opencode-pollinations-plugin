# 🌸 Pollinations AI Plugin für OpenCode (v6.1.0)

<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="200">
  <br>
  <b>Die Brücke zwischen OpenCode und dem Pollinations.ai Ökosystem.</b>
  <br>
  Greifen Sie direkt in Ihrem Editor auf ein kontinuierliches Universum kostenloser Basis-KI-Modelle zu oder nutzen Sie leistungsstarke Premium-Enterprise-Modelle mit unseren großzügigen täglichen Freikontingenten (Free Tiers).
</div>

<div align="center">

![Version](https://img.shields.io/badge/version-v6.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-Stable-success.svg)

</div>

## 📖 Philosophie: Offene KI für Kreative

> **"Keine geschlossenen Türen, keine bürokratischen Hürden — nur gute Werkzeuge und gute Leute."**

Pollinations.ai ist eine von der Community für die Community entwickelte Open-Source-Plattform. Wir bieten eine einheitliche und direkte API für Bild-, Text-, Audio- und Videogenerierung.
- **Transparent**: Unser Code, unsere Roadmap und unsere Diskussionen sind öffentlich.
- **Faire Wirtschaft**: Eine einzige Währung (**Pollen**) für alle Medien und Modelle. Vorhersehbare und transparente Preisgestaltung.

---

## ✨ Was ist neu in V6? 
---

## 🧰 Tools & Befehle V6

Über die Textdiskussion hinaus gibt die Verbindung Ihres Schlüssels den OpenCode-Agenten Zugriff auf unsere KI-Medien-Tools, die von Pollinations-Modellen angetrieben werden:

### 💎 Integrierte generative Tools (nach Eingabe Ihres API-Schlüssels)
- `polli_gen_image` : Hochmoderne Bildmodelle (`Flux`, `Midjourney`, `Gemini`).
- `polli_gen_video` : Starke Text-to-Video und Image-to-Video Fähigkeiten (`Wan`, `Veo`, `LTX`, `Reveal`).
- `polli_gen_audio` & `polli_gen_music` : Magische Sprachsynthese (ElevenLabs) und Generative Musik.
- `polli_stt` : Hochfliegende Sprachtranskription (Whisper V3).
- `polli_web_search` : Verbundene Web-Suche für quellenbasierten Kontext.

### 🧰 Creator Bonus Tools
- `remove_background` : Ultraschnelle, integrierte Bildhintergrundentfernung (Immer gratis).
- `gen_qrcode`, `extract_frames`, `extract_audio` : Dienstprogramme (Immer gratis).

### 💻 Komplette Liste der Terminal-Befehle
Verwenden Sie den Alias **`/poll`** oder **`/pollinations`**.
- `/poll help` : Zeigt die interaktive Hilfetabelle an.
- `/poll connect` : Bring Your Own Key Konfigurationstool (Interaktiv).
- `/poll usage full` : Echtzeit-Dashboard (Stats), aktive Freetiers und Brieftasche (Wallet Balance).
- `/poll config` : Cost Guards, Protokolle, Sprache und Anzeige fein abstimmen.
- `/poll models` : Überprüfen Sie den Status der verfügbaren Modelle.
- `/poll pricing` : Zeigen Sie einheitliche Echtzeitpreise an (Durchschnittliche Kostenschätzung).
- `/poll fallback` : Definieren Sie das ultimative Safety Net Chat-Modell.
- `/poll mode` : Modus wechseln, ohne über die API zu gehen.
- `/poll infos` : Entdecken Sie Gemeinschaftsregeln und das Leveling-System.

### 🛡️ Der "Cost Guard" & das "Safety Net"
Wir haben grundlegende Schutzvorrichtungen eingeführt, um sicherzustellen, dass Ihr Workflow niemals unterbricht und Ihre Brieftasche (Wallet oder Free Tiers) unter Ihrer Kontrolle ist.
- **Safety Net**: Wenn Sie Premium-Modelle verwenden und Ihre tägliche Pollen-Quote mitten in einer Chat-Sitzung abläuft, wechselt das Plugin stillschweigend und automatisch zu einem kostenlosen Modell. *Schluss mit blockierenden Fehlern (429).*
- **Cost Guard für Tools**: Die Agenten von OpenCode können eifrig sein. Wenn ein Agent versucht, zu viele Pollen auszugeben, um ein schweres Video oder Musik zu generieren, fängt das Plugin die Anfrage ab. Wir haben einen asynchronen Workflow implementiert, der vor der Ausführung teurer Generationen nach Ihrer manuellen Bestätigung fragt. Sie behalten die Kontrolle.

### 🌍 Native Mehrsprachigkeit (i18n)
Pollinations for OpenCode spricht Ihre Sprache nativ.
- Die Engine-Oberfläche, Benachrichtigungen (Toasts), Tool-Rückgaben und Befehle sind vollständig in **Englisch (Standard)**, **Französisch**, **Spanisch**, **Deutsch** und **Italienisch** übersetzt.
- Geben Sie `/poll config lang <fr|es|de|it>` in das Terminal ein, um sofort zu wechseln.

---

## 🐝 Pollen & "Free Tiers" verstehen

In der Vergangenheit vertraute Pollinations hauptsächlich auf werbefinanzierten Netzwerk-Traffic. Heute kostet der Betrieb riesiger Modelle (wie Claude 4.5, Flux Pro, Wan Video) Geld. Pollinations führt daher das **Enter Universe** ein, das einen API-Schlüssel erfordert und hochmoderne Modelle freischaltet.

**Aber warten Sie, Sie brauchen keine Kreditkarte!**

**Pollen** ist unser einheitliches Kreditsystem ($1 ≈ 1 Pollen). Durch den Anschluss eines einfachen kostenlosen API-Schlüssels schalten Sie tägliche Pollen-Neuladungen gemäß Ihrem Entwickler-Tier (Tier) frei:

| Tier | Tägliche Neuladung | Bedingung |
| :--- | :--- | :--- |
| 🦠 **Microbe** | **0.1 Pollen/Tag** | Einfach registrieren! |
| 🍄 **Spore** | **1 Pollen/Tag** | Automatische Verifizierung |
| 🌱 **Seed** | **3 Pollen/Tag** | Aktiver GitHub-Entwickler (8+ Punkte) |
| 🌸 **Flower** | **10 Pollen/Tag** | **Eigene App veröffentlichen** (Wie dieses Plugin!) |

> 🎁 **Holen Sie sich Ihren kostenlosen persönlichen Schlüssel (BYOK) auf [Pollinations.ai](https://pollinations.ai) um OpenCode zu stärken!**

*(Hinweis: Wir behalten weiterhin den "Free Universe" Fallback für den Basis-Chat (`openai-fast`) bei, der keinen Schlüssel erfordert, aber seine Kapazität ist sehr begrenzt und wird hauptsächlich als Sicherheitsnetz betrachtet).*

Bezahlte Pollen ermöglichen Ihnen den Zugriff auf noch leistungsstärkere und Premium-Modelle.

Tägliche kostenlose Tier-Pollen-Credits werden verbraucht, bevor die Brieftasche (gekaufte Pollen) berührt wird, außer für bezahlte Modelle.

---

## 🚀 Erste Schritte & Onboarding

### 🐧 1. Plattformübergreifende Konfiguration (NPM-Installation)
Dieses Plugin ist **vollständig plattformübergreifend** (Windows, macOS, Linux) und erkennt seine Ports dynamisch.

1. Globale Installation:
   ```bash
   npm install -g opencode-pollinations-plugin
   ```
2. Auto-Konfiguration:
   ```bash
   npx opencode-pollinations-plugin
   ```
   *(Oder injizieren Sie es manuell in `~/.config/opencode/opencode.json`)*

### 🔑 2. Interaktives Onboarding
Tippen Sie in OpenCode einfach den folgenden Befehl in das Agenten-Terminal ein:
```bash
/poll connect
```
Ein interaktiver Konversationsassistent wird Sie anleiten, Ihren Pollinations-Schlüssel einzufügen und Ihren Bereich zu konfigurieren. *Starten Sie OpenCode neu, um die Liste der Modelle in der UI-Oberfläche zu aktualisieren.*



---

## 🔗 Links

- **Erstellen Sie Ihren Pollen API-Schlüssel**: [pollinations.ai](https://pollinations.ai)
- **Discord Community**: [Treten Sie uns bei!](https://discord.gg/pollinations-ai-885844321461485618)
- **OpenCode Ökosystem**: [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 Lizenz

MIT License. Erstellt von [fkom13](https://github.com/fkom13) & Die Pollinations Community.
