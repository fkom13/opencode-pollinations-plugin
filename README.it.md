# 🌸 Pollinations AI Plugin per OpenCode (v6.2.7)

<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="180">
  <h3>Il Ponte definitivo tra OpenCode e l'ecosistema Pollinations.ai</h3>
  <p><em>Accedi a un universo continuo di modelli AI di base gratuiti, o sfrutta modelli premium enterprise utilizzando i nostri generosi <b>Fondi Gratuiti Orari (Hourly Free Tiers)</b> direttamente dal tuo terminale locale.</em></p>
</div>

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/opencode-pollinations-plugin?color=blue&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![Downloads](https://img.shields.io/npm/dt/opencode-pollinations-plugin?color=success&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Filosofia: AI Aperta per i Creatori

> **"Nessuna porta chiusa, nessun ostacolo corporativo — solo buoni strumenti e brave persone."**

**Pollinations.ai** è una piattaforma open-source creata dalla e per la community. Offriamo un'API unificata e diretta per la generazione di immagini, testi, audio e video.

- 🌍 **Trasparente**: Il nostro codice, la roadmap e le discussioni sono pubblici.
- ⚖️ **Economia Equa**: Un'unica valuta (**Pollen 🌻**) per tutti i media e i modelli. Prezzi prevedibili e trasparenti, senza vincoli (vendor lock-in).

---

## ✨ Novità della V6.2.7

- ⏱️ **Quote Orarie**: Addio ai limiti giornalieri! I Tier Sviluppatore ora si ricaricano **ogni singola ora** in punto (`:00`), garantendoti sempre crediti freschi durante le tue sessioni di programmazione.
- ⚡ **Motore 100% Dinamico**: Fine delle liste di modelli hard-coded, delle configurazioni fisse e dei prezzi statici! Nella V6.2, l'agente AI di OpenCode recupera dinamicamente gli ultimi LLM, parametri, tag (`[💎 Paid]`, `[🌿 Free]`) e stime dei costi dalle API di Pollinations.
- 🛡️ **Sicurezza Robusta**: La protezione contro i path traversal e i rigorosi controlli degli URL sono completamente integrati.
- 🔍 **Ricerca Web Migliorata**: Il componente `polli_web_search` è perfettamente allineato alle attuali opzioni specializzate e web-enabled come Google Gemini Fast, Perplexity e assistenti personalizzati.

---

## 🧰 Strumenti & Comandi

Oltre alle discussioni testuali, connettere la tua chiave API fornisce agli Agenti OpenCode l'accesso superpotenziato agli Strumenti Media guidati dai modelli di Pollinations:

### 💎 Strumenti Generativi Integrati (ENTER ONLY - richiede API key)
- 🎨 `polli_gen_image` : Modelli di generazione immagini all'avanguardia (`Flux`, `Sana`, `Midjourney`, ecc.).
- 🎬 `polli_gen_video` : Potenti modelli Testo-a-Video e Immagine-a-Video (`Wan`, `Veo`, `LTX`, `Reveal`).
- 🔊 `polli_gen_audio` & `polli_gen_music` : Sintesi vocale magica (ElevenLabs, OpenAI TTS) e Musica Generativa.
- 🎙️ `polli_stt` : Trascrizione vocale di altissimo livello (Whisper V3).
- 🌐 `polli_web_search` : Ricerca Web connessa & ricerca specializzata sui dati (`gemini-search`, `perplexity...`).

### 🧰 Strumenti Extra Gratuiti (Sempre disponibili)
- ✂️ `remove_background` : Rimozione dello sfondo dalle immagini integrata e ultraveloce.
- 🛠️ `gen_qrcode`, `gen_diagram`, `extract_frames`, `extract_audio`, `file_to_url`: Utility per sviluppatori integrate.

### 💻 Elenco Completo dei Comandi del Terminale
Usa l'alias **`/poll`** o **`/pollinations`** nel tuo terminale della conversazione:
- `/poll help` : Mostra la tabella di aiuto interattiva.
- `/poll connect` : Strumento interattivo per configurare la tua API Key (BYOK).
- `/poll usage full` : Dashboard in tempo reale (Statistiche), Tier Gratuiti attivi e Saldo del Portafoglio (Wallet).
- `/poll config` : Regolazioni fini (Log, Limiti Costi, Lingua).
- `/poll models` : Controlla quali modelli sono al momento online.
- `/poll pricing` : Controlla la tabella dei prezzi live (Stime medie).
- `/poll fallback` : Usa i modelli base di salvataggio del "Safety Net".
- `/poll infos` : Scopri come salire di livello con il tuo account developer.

---

## 🛡️ Il "Cost Guard" & la "Rete di Sicurezza" (Safety Net)

Abbiamo introdotto protezioni fondamentali per garantire che il tuo flusso di lavoro non si fermi mai e il tuo budget rimanga sotto stretto controllo:

- 🛟 **Rete di Sicurezza**: Se usi modelli premium e la tua quota oraria di Pollen termina nel mezzo della sessione, il plugin passa automaticamente e in silenzio a un modello gratuito. *Mai più errori 429.*
- 🚦 **Cost Guard sui Tool**: Gli Agenti a volte esagerano. Se l'Agente tenta di generare qualcosa di troppo oneroso, il plugin intercetterà la richiesta, mettendola in pausa finché tu non darai la conferma esplicita per autorizzare la spesa.

---

## 🐝 Capire i Pollen & I "Free Tiers"

In passato, Pollinations si finanziava principalmente con il traffico generato dalla pubblicità. Oggi, modelli massicci (es. Claude 3.5 Sonnet, Wan Video) hanno un gran costo. Pertanto l'**Enter Universe** ha lo scopo di darti questo accesso tramite Key.

**Ma aspetta, NON hai bisogno di una carta di credito!**

Il **Pollen 🌻** è un sistema universale (1$ ≈ 1 Pollen). Immettendo una primissima Chiave Gratuita dal sito, sbloccherai le generose **Ricariche Orarie** calcolate tramite un sistema a Tiers (Livelli):

| Tier (Livello) | Ricarica Oraria ⏱️ | Stima Giorno* | Requisito richiesto |
| :--- | :--- | :--- | :--- |
| 🦠 **Microbe** | **0.01 Pollen / ora** | ~0.24 / giorno | Solo effettuando il login! |
| 🍄 **Spore** | **0.01 Pollen / ora** | ~0.24 / giorno | Essendo verificato dal sistema |
| 🌱 **Seed** | **0.15 Pollen / ora** | ~3.6 / giorno | Operazioni su Github valide (+8 pts) |
| 🌸 **Flower** | **0.40 Pollen / ora** | ~9.6 / giorno | **Aver prodotto una applicazione** (Come questo Plugin) |
| 🍯 **Nectar** | **0.80 Pollen / ora** | ~19.2 / giorno | Arriverà prossimamente 🔮 |

_*La stima giornaliera è puramente teorica (~24h × quota oraria). I Pollen si rinfrescano in modo corretto all'istante di ogni cambio ora (`:00`)._

> 🎁 **Aggiungi la tua API Key Base su [Pollinations.ai](https://enter.pollinations.ai/authorize?redirect_url=https://github.com/fkom13/opencode-pollinations-plugin) per avviare il potenziamento!**

**Come Funziona:**
1. Il saldo grauito del tuo Tier (es: 0.40 🌻/ora per un Flower) viene drenato per primo.
2. Quando arriva a zero, subentrano i modelli Free di salvataggio (Safety Net).
3. Il saldo in dollari reale si sfiora "A Meno Che" tu non voglia eseguire dei modelli costosi super premium a tutti i costi.
4. Ogni inizio dell'ora tutto riparte! 💥 Fai /poll usage per misurarlo e divertiti!

---

## 🌍 Supporto Multilingua (i18n)

Pollinations per OpenCode "parla" fin dall'inizio tantissime lingue:
- Le Notifiche (Toast) in basso, il prompt e vari settaggi capiscono: **Inglese**, **Francese**, **Spagnolo**, **Tedesco**, **Italiano** e **Cinese**
- Scrivi nel terminal: `/poll config lang <en|fr|es|de|it|zh>` e cambierà instantaneamente.

---

## 🚀 Guida all'Installazione Base

### 🐧 1. Terminale Cross-Platform Facile (NPM Locale)
Niente di più semplice su ecosistemi Windows, macOS, e GNU/Linux sfruttando la rilevazione OpenCode automatica.

1. Se preferisci, globale
   ```bash
   npm install -g opencode-pollinations-plugin
   ```
2. Oppure istanziale:
   ```bash
   npx opencode-pollinations-plugin
   ```
   *(Può essere richiamato nel manifest in `~/.config/opencode/opencode.json` con lo starter CLI)*

### 🔑 2. Onboarding Interattivo Rapido
Dentro al pannello OpenCode entra in chat terminale digitando:
```bash
/poll connect
```
Basta inserire la Key ottenuta su internet alla richiesta a schermo. *(Se devi ricaricare l'elenco tool base cliccabili un avvio veloce del pannello basterà).*

---

## 🔗 Link veloci

- **Crea una Key per l'Api Pollen**: [pollinations.ai](https://pollinations.ai)
- **Community Chat e Discord**: [Aggregati a noi ora!](https://discord.gg/pollinations-ai-885844321461485618)
- **L'infinita OpenCode community**: [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 Licenza d'Uso

Rilasciata a tutta la rete tramite un format libero MIT License creato da [fkom13](https://github.com/fkom13) & La fantastica Community Pollinations.
