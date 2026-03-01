# 🌸 Plugin Pollinations AI per OpenCode (v6.1.0)

<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="200">
  <br>
  <b>Il Ponte tra OpenCode e l'Ecosistema Pollinations.ai.</b>
  <br>
  Accedi a un universo continuo di modelli di IA di base gratuiti o sfrutta modelli aziendali premium con i nostri generosi Piani Gratuiti Giornalieri (Free Tiers) direttamente dal tuo editor.
</div>

<div align="center">

![Version](https://img.shields.io/badge/version-v6.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-Stable-success.svg)

</div>

## 📖 Filosofia: IA Aperta per i Creatori

> **"Senza porte chiuse, niente ostacoli aziendali — solo ottimi strumenti e brave persone."**

Pollinations.ai è una piattaforma open-source creata dalla e per la community. Offriamo un'API unificata e diretta per la generazione di immagini, testo, audio e video.
- **Trasparente**: Il nostro codice, la roadmap e le nostre discussioni sono pubblici.
- **Economia Giusta**: Una moneta unica (**Pollen**) per tutti i media e i modelli. Prezzi prevedibili e trasparenti.

---

## ✨ Quali novità nella V6? 
---

## 🧰 Strumenti (Tools) e Comandi V6

Oltre alla discussione testuale, la connessione della tua chiave dà agli Agenti di OpenCode accesso ai nostri Strumenti Multimediali IA potenziati dai modelli Pollinations:

### 💎 Strumenti Generativi Integrati (dopo aver inserito la tua chiave API)
- `polli_gen_image` : Modelli di immagini all'avanguardia (`Flux`, `Midjourney`, `Gemini`).
- `polli_gen_video` : Potenti capacità Text-to-Video e Image-to-Video (`Wan`, `Veo`, `LTX`, `Reveal`).
- `polli_gen_audio` & `polli_gen_music` : Magica sintesi vocale (ElevenLabs) e Musica Generativa.
- `polli_stt` : Trascrizione vocale di altissimo livello (Whisper V3).
- `polli_web_search` : Ricerca Web Connessa per contesto documentato.

### 🧰 Strumenti Bonus per Creatori
- `remove_background` : Rimozione ultra-veloce integrata dello sfondo delle immagini (Sempre Gratuita).
- `gen_qrcode(diagram and palettes)`, `extract_frames`, `extract_audio`, `file_to_url`: Utilità (Sempre Gratuite).

### 💻 Elenco Completo dei Comandi del Terminale
Usa l'alias **`/poll`** oppure **`/pollinations`**.
- `/poll help` : Mostra la tabella di aiuto interattiva.
- `/poll connect` : Strumento di configurazione Bring Your Own Key (Interattivo).
- `/poll usage full` : Dashboard in tempo reale (Statistiche), Freetiers attivi e Portafoglio (Wallet Balance).
- `/poll config` : Regola finemente i Cost Guards, Registri, Lingua e Visualizzazione.
- `/poll models` : Controlla lo stato dei Modelli disponibili.
- `/poll pricing` : Visualizza i prezzi unificati in tempo reale (Stima Costo Medio).
- `/poll fallback` : Definisci il modello di Chat del Safety Net definitivo.
- `/poll mode` : Cambia modalità senza passare per l'API.
- `/poll infos` : Scopri le regole della community e il sistema di livelli.

### 🛡️ Il "Cost Guard" & il "Safety Net"
Abbiamo introdotto protezioni fondamentali per garantire che il tuo flusso di lavoro non si interrompa mai e che il tuo portafoglio (Wallet o free tiers) sia sotto il tuo controllo.
- **Rete di Sicurezza (Safety Net)**: Se usi modelli premium e la tua quota giornaliera di Pollen si esaurisce nel bel mezzo di una sessione di chat, il plugin passa silenziosamente e automaticamente a un modello gratuito. *Nessun errore di blocco (429).*
- **Cost Guard per gli Strumenti**: Gli Agenti di OpenCode possono essere eccessivamente zelanti. Se un Agente cerca di spendere troppi Pollen per generare un video pesante o una musica, il plugin intercetta la richiesta. Abbiamo implementato un flusso asincrono che ti chiede una conferma manuale prima di eseguire generazioni costose. Mantieni il controllo.

### 🌍 Supporto Multilingue Nativo (i18n)
Pollinations per OpenCode ora parla la tua lingua in modo nativo.
- L'Interfaccia Motore, le Notifiche (Toasts), i Ritorni degli Strumenti e i Comandi sono completamente tradotti in **Inglese (Predefinito)**, **Francese**, **Spagnolo**, **Tedesco**, e **Italiano**.
- Digita `/poll config lang <fr|es|de|it>` nel terminale per cambiare istantaneamente.

---

## 🐝 Comprendere i Pollen & i "Piani Gratuiti (Free Tiers)"

In passato, Pollinations si affidava principalmente al traffico di rete finanziato dalla pubblicità. Oggi, gestire modelli enormi (come Claude 4.5, Flux Pro, Wan Video) costa denaro. Pollinations introduce quindi l'**Enter Universe** che richiede una chiave API e sblocca modelli all'avanguardia.

**Ma aspetta, non hai bisogno di una carta di credito!**

Il **Pollen** è il nostro sistema di credito unificato ($1 ≈ 1 Pollen). Connettendo una semplice Chiave API Gratuita, sblocchi ricariche quotidiane di Pollen in base al tuo Livello (Tier) di Sviluppatore:

| Livello (Tier) | Ricarica Quotidiana | Condizione |
| :--- | :--- | :--- |
| 🦠 **Microbe** | **0.1 Pollen/giorno** | Registrati e basta! |
| 🍄 **Spore** | **1 Pollen/giorno** | Verifica automatica |
| 🌱 **Seed** | **3 Pollen/giorno** | Sviluppatore GitHub Attivo (8+ punti) |
| 🌸 **Flower** | **10 Pollen/giorno** | **Pubblica un'App** (Come questo Plugin!) |

> 🎁 **Ottieni la tua Chiave Personale Gratuita (BYOK) su [Pollinations.ai](https://enter.pollinations.ai/authorize?redirect_url=https://github.com/fkom13/opencode-pollinations-plugin) per potenziare OpenCode!**

*(Nota: Manteniamo sempre il fallback "Free Universe" per la chat di base (`openai-fast`) che non richiede chiavi, ma la sua capacità è molto limitata e pensata principalmente come una rete di sicurezza).*

I pollen a pagamento ti permettono di accedere a modelli ancora più potenti e premium.

I crediti pollen dei free tiers giornalieri vengono consumati prima di toccare il portafoglio (pollen acquistati) ad eccezione dei modelli a pagamento.

---

## 🚀 Guida Introduttiva e Onboarding

### 🐧 1. Configurazione Multiplaforma (Installazione NPM)
Questo plugin è **completamente cross-platform** (Windows, macOS, Linux) e rileva dinamicamente le sue porte.

1. Installazione globale:
   ```bash
   npm install -g opencode-pollinations-plugin
   ```
2. Auto-Configurazione:
   ```bash
   npx opencode-pollinations-plugin
   ```
   *(Oppure iniettalo manualmente in `~/.config/opencode/opencode.json`)*

### 🔑 2. Onboarding Interattivo
Una volta in OpenCode, digita semplicemente il seguente comando nel Terminale dell'Agente:
```bash
/poll connect
```
Un assistente conversazionale interattivo ti guiderà per iniettare la tua Chiave Pollinations e configurare il tuo spazio. *Riavvia OpenCode per aggiornare l'elenco dei modelli nell'interfaccia UI.*



---

## 🔗 Link

- **Crea la tua Chiave API Pollen**: [pollinations.ai](https://pollinations.ai)
- **Community Discord**: [Unisciti a noi!](https://discord.gg/pollinations-ai-885844321461485618)
- **Ecosistema OpenCode**: [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 Licenza

Licenza MIT. Creato da [fkom13](https://github.com/fkom13) & La Community Pollinations.
