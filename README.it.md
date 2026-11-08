# 🌸 Pollinations AI Plugin per OpenCode (v7.0.0)

<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="180">
  <h3>Il Ponte definitivo tra OpenCode e l'ecosistema Pollinations.ai</h3>
  <p><em>Accedi a un universo continuo di modelli AI di base gratuiti, o sfrutta modelli premium enterprise utilizzando il nostro sistema <b>Quest & Paid Pollen</b> direttamente dal tuo terminale locale.</em></p>
</div>

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/opencode-pollinations-plugin?color=blue&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![Downloads](https://img.shields.io/npm/dt/opencode-pollinations-plugin?color=success&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Filosofia: AI Aperta per i Creatori

> **"Nessuna porta chiusa, nessun ostacolo corporativo — solo buoni strumenti e brave persone."**

**Pollinations.ai** è una piattaforma open-source creata dalla e per la community. Offriamo un'API unificata e diretta per la generazione di immagini, testi, audio, video e 3D.

- 🌍 **Trasparente**: Il nostro codice, la roadmap e le discussioni sono pubblici.
- ⚖️ **Economia Equa**: Un'unica valuta (**Pollen 🌻**) per tutti i media e i modelli. Prezzi prevedibili e trasparenti, senza vincoli (vendor lock-in).

---

## 🚀 Novità v7.0.0

- 🔁 **Dual-stack OpenCode v1 + v2**: un solo pacchetto del plugin ufficiale Pollinations supporta entrambe le generazioni OpenCode, mantenendo `plugin` in v1 e `plugins` in v2 con un core condiviso.
- 🤖 **Agenti Community ancora selezionabili**: i modelli `agent:true` restano nel selettore OpenCode per compatibilità e si possono chiamare anche con `polli_agent` o `/poll agents [ricerca]`. ⚠️ La chat diretta può consumare Pollen variabile; il budget Agent vale solo per `polli_agent`.
- 💰 **Budget Agent dedicato**: `/poll config agent_budget <pollen>` imposta una protezione logica separata per esecuzione (default **0,60 🌻**). I Prompt Agents ospitati sono stimati in modo conservativo sui limiti di 8 step modello / 16 chiamate tool; runtime sconosciuti richiedono conferma. Non è un hard cap lato server.
- 🌐 **Community models controllati**: i modelli community affidabili compaiono dinamicamente in chat solo con tool calling; `/poll config community on|off` controlla l’esposizione.
- 🛡️ **Cost Guard generalizzato**: conferme basate sul registry, STT protetto, categoria corretta per i costi testo e ticket pending isolati via XDG.
- 🔐 **Auth v2 e Free puliti**: login v2 isolato dalle credenziali v1, `/poll` nativo in v2 e route `free/*` senza interrogazioni account/quota prima dell’universo gratuito.

---

## ✨ Novità v6.5.5

- ✂️ **RMBG resiliente senza chiave**: `remove_background` usa ora **BGNinja (10/giorno/IP, 2 simultanei) → fallback legacy BGEraser → ClearBackdrop con chiave gratuita opzionale**. BackgroundCut, archivio/rotazione chiavi e `rmbg_keys` sono stati rimossi dal plugin attivo.
- 🖼️ **Generazione/modifica immagini gratis ampliata**: modifica di 1–3 immagini, rapporti completi, dimensioni custom 256–1440, seed, prompt upsampling e turbo modifica con quota per IP live.
- 🧬 **Prevalgono i byte reali del media**: gli strumenti reverse salvano JPEG/PNG/WebP in base ai magic bytes, correggendo le risposte JPEG prima nominate `.png`.
- 🌍 **Convergenza in sei lingue**: runtime, onboarding, sei README e manuale tecnico mantenuto sono allineati al comportamento attuale.

- 🧊 **Generazione 3D (`polli_gen_3d`)**: Generazione di modelli 3D (`trellis-2`, `hyper3d-rodin`) nei formati reali GLB/PLY con protezione Cost Guard e recupero da cache.
- 🛡️ **Zero Doppia Fatturazione**: Retry chat rigorosamente limitati al codice HTTP 429; timeout e interruzioni di rete non inviano mai richieste di pagamento duplicate.
- 🧠 **Normalizzazione del Reasoning**: Pulizia automatica dei flussi SSE per DeepSeek, Kimi e Qwen — nessuna perdita di testo di pensiero nella chat.
- 💰 **Semantica Quest & Paid Trasparente**: Nuove modalità di fatturazione (`quest`, `quest_only`, `paid`, `manual`) con soglie di allerta in Pollen assoluto.
- 📦 **Artifact Core (Magic Bytes)**: Verifica fisica binaria (JPEG, PNG, GLB, PLY, MP4, MP3, WebM) che garantisce estensioni di file corrette su disco.
- ⏱️ **Gerarchia di Timeout Configurabile**: Controllo dettagliato dei timeout per chiamata, per modello e per capacità con `/poll config timeouts.*`.
- 🎯 **Quest & Login in 1 Clic**: Tracciamento retroattivo delle quest (`/poll quests`) e login automatico nel browser (`/poll login`).

---

## 🧰 Strumenti & Comandi

Oltre alle discussioni testuali, connettere la tua chiave API fornisce agli Agenti OpenCode l'accesso superpotenziato agli Strumenti Media guidati dai modelli di Pollinations:

### 💎 Strumenti Generativi Integrati (ENTER ONLY - richiede API key)
- 🎨 `polli_gen_image` : Modelli di generazione immagini all'avanguardia (`Flux`, `Sana`, `Midjourney`, ecc.).
- 🎬 `polli_gen_video` : Potenti modelli Testo-a-Video e Immagine-a-Video (`Wan`, `Veo`, `LTX`, `Reveal`).
- 🧊 `polli_gen_3d` : Generazione di risorse 3D ad alta fedeltà (`trellis-2`, `hyper3d-rodin`) con output GLB o PLY secondo il fornitore.
- 🔊 `polli_gen_audio` & `polli_gen_music` : Sintesi vocale magica (ElevenLabs, OpenAI TTS) e Musica Generativa.
- 🎙️ `polli_stt` : Trascrizione vocale di altissimo livello (Whisper V3).
- 🌐 `polli_web_search` : Ricerca Web connessa & ricerca specializzata sui dati (`gemini-search`, `perplexity...`).
- 🤖 `polli_agent` : Delega esplicita ai Managed Agents Pollinations con budget Agent dedicato per esecuzione e stima conservativa del Cost Guard.

### 🧰 Strumenti di Creazione Gratuiti (Sempre disponibili — senza chiave API)
- 🆓 `gen_edit_image_free` : Generazione gratis e **modifica di 1–3 immagini**, quota per IP letta in tempo reale, rapporti completi, dimensioni custom 256–1440, seed, prompt upsampling e turbo modifica. Senza chiave.
- 🧹 `object_remover` : Rimozione gratuita di oggetti tramite prompt; il risultato viene validato dai magic bytes e salvato con la vera estensione.
- 📐 `image_upscaler` : Upscale gratis 2x/4x; l’output JPEG/PNG/WebP viene rilevato dai byte reali, mai dedotto dal nome del file.
- ✨ `image_enhancer` : Miglioramento gratis 1K/2K/4K (denoise, nitidezza, restauro), con rilevamento del formato reale.
- ✂️ `remove_background` : Rimozione sfondo senza chiave con catena resiliente **BGNinja (10/giorno/IP, 2 simultanei) → fallback legacy BGEraser → ClearBackdrop con chiave gratuita opzionale**. Nessun provider a pagamento né rotazione chiavi; formato/estensione reali rilevati automaticamente.
- 🛠️ `gen_qrcode`, `gen_diagram`, `gen_palette`, `extract_frames`, `extract_audio`, `file_to_url`: Utility per sviluppatori integrate.

### 💻 Elenco Completo dei Comandi del Terminale
Usa l'alias **`/poll`** o **`/pollinations`** nel tuo terminale della conversazione:
- `/poll help` : Mostra la tabella di aiuto interattiva.
- `/poll login` : **Login browser in 1 clic** (device flow) — crea e connette una chiave automaticamente.
- `/poll connect <chiave>` : Configurazione manuale "Bring Your Own Key" (`sk_...`).
- `/poll quests` : Visualizza le tue quest e il Pollen gratuito da riscattare. 🎯
- `/poll usage full` : Dashboard in tempo reale (Statistiche), Quest attive e Saldo del Portafoglio.
- `/poll status` : Stato del conto e saldi (alias di /poll usage).
- `/poll config` : Regolazioni fini (Cost Guard, timeout, log, lingua, interfaccia).
- `/poll models` : Controlla quali modelli sono al momento online.
- `/poll pricing` : Controlla la tabella dei prezzi live (Stime medie).
- `/poll mode <mode>` : Cambia modalità di fatturazione (`quest`, `quest_only`, `paid`, `manual`).
- `/poll fallback` : Usa i modelli base di salvataggio del "Safety Net".
- `/poll infos` : Informazioni del sistema e guida all'uso.

---

## 🛡️ Il "Cost Guard" & la "Rete di Sicurezza" (Safety Net)

Abbiamo introdotto protezioni fondamentali per garantire che il tuo flusso di lavoro non si fermi mai e il tuo budget rimanga sotto stretto controllo:

- 🛟 **Rete di Sicurezza (Safety Net)** : Se usi modelli premium e il tuo saldo Quest/Paid termina nel mezzo della sessione, il plugin passa automaticamente e in silenzio a un modello gratuito. *Mai più errori 429.*
- 🚦 **Cost Guard sui Tool** : Gli agenti a volte possono essere insistenti. Se l'Agente tenta di spendere troppo Pollen per una pesante generazione video o 3D, il plugin intercetta la richiesta chiedendo la tua conferma manuale (`polli_gen_confirm`).

---

## 🐝 Capire il Quest Pollen & il Pollen a Pagamento

Il pollen di Pollinations è diviso in due colonne:

- **🎁 Pollen Quest** — guadagnato gratis completando le **Quest**. Consumato per primo dal server sui modelli regolari.
- **💎 Pollen a Pagamento** — acquistato (carta). Usato quando il Quest è insufficiente, o per i modelli `paid_only`.

> ⚠️ Il plugin non può leggere la suddivisione lato server; stima Quest/Pagamento localmente e legge la suddivisione reale (`meter_source`) da `/account/usage`.

### Modalità di fatturazione (v6.5):

| Modalità | Comportamento |
| :--- | :--- |
| `quest` (QUEST_PREFERRED, **predefinita**) | Prima Quest, fallback a Pagamento consentito. Cade sull'universo gratuito quando entrambi sembrano esauriti. |
| `quest_only` (QUEST_ELIGIBLE_ONLY) | Blocca i modelli `paid_only` localmente; invia solo chiamate eleggibili Quest. **Best-effort** — può verificarsi un addebito Pagamento. |
| `paid` (PAID_ALLOWED) | Pagamento consentito, `paid_only` secondo il Cost Guard. Cade sul gratuito quando il wallet è basso. |
| `manual` | Nessuna politica automatica — controllo totale. |

Cambia con `/poll mode <mode>` o `/poll config mode <mode>`.

> 🎯 **Guadagna pollen gratis completando le Quest!** Usare questo plugin ne completa diverse retroattivamente. Esegui `/poll quests`.

> 🎁 **Ottieni la tua Chiave Personale Gratuita (BYOK) su [enter.pollinations.ai](https://enter.pollinations.ai) per potenziare OpenCode!**

**Come Funziona:**
1. Il tuo Pollen Quest viene consumato per primo sui modelli regolari.
2. I modelli `paid_only` 💎 usano sempre Pollen acquistato.
3. Quando entrambi i saldi si esauriscono, subentrano dolcemente i modelli gratuiti di salvataggio.

---

## 🌍 Supporto Multilingua (i18n)

Pollinations per OpenCode parla la tua lingua nativamente:
- Interfaccia, Notifiche (Toast), Risposte dei tool e Comandi sono disponibili in **Inglese**, **Francese**, **Spagnolo**, **Tedesco**, **Italiano** e **Cinese**.
- Scrivi nel terminale `/poll config lang <en|fr|es|de|it|zh>` per cambiare lingua istantaneamente.

---

## 🧪 Sviluppo locale: OpenCode V1 + V2

Esiste **un solo repository sorgente canonico** per entrambe le generazioni. Si esegue una sola build con `npm run build`. Per i test locali espliciti, OpenCode V1 carica `dist/index.js`; nella sandbox PC2 con OpenCode 2.0.19, V2 carica `dev/opencode-v2-local/`, un piccolo adattatore che esporta il `dist/v2.js` corrente. Il pacchetto pubblicato resta **un unico pacchetto ibrido**: V1 usa `server()`, V2 usa `setup()`.

Procedura completa: [`docs/LOCAL_TESTING.md`](docs/LOCAL_TESTING.md).

## 🚀 Guida all'Installazione Base

### 🐧 1. Configurazione Multi-OS (NPM)
Questo plugin è **completamente multipiattaforma** (Windows, macOS, Linux ; Node **≥ 18**) e avvia un proxy locale su una porta dinamica.

1. Installazione globale o locale:
   ```bash
   npm install -g opencode-pollinations-plugin
   ```
2. Auto-Configurazione:
   ```bash
   npx opencode-pollinations-plugin
   # oppure: npx opencode-pollinations-plugin --check
   ```
   *(Inserisce automaticamente `opencode-pollinations-plugin` nel tuo file `~/.config/opencode/opencode.json`)*

### 🔐 2. Collega il tuo account Pollinations — consigliato

Il percorso normale richiede **un solo comando**:

```bash
/poll login
```

Il browser si apre automaticamente. Accedi con GitHub e clicca **Authorize**; il plugin si collega da solo. **Nessuna chiave API da creare, copiare o incollare.** È il percorso consigliato per account, Quest, wallet, modelli premium e strumenti a pagamento.

> 🤖 **Agenti:** se l’utente chiede di collegare/accedere a Pollinations, chiama automaticamente `polli_login`. Non chiedere di creare/incollare una chiave salvo richiesta esplicita di BYOK manuale.

**BYOK manuale — opzionale, solo se possiedi già una chiave Secret:**
```bash
/poll connect sk_la_tua_chiave_qui
```

> **Stessa connessione in v1/v2:** `/poll login` usa Pollinations Connect. La chiave pubblica `pk_` identifica l’app; dopo il consenso l’utente riceve una `sk_` privata con permessi, budget e scadenza. Prima possono comparire soltanto modelli guida/gratuiti; poi v2 aggiorna il catalogo senza riavvio. I permessi amministrativi `Keys` non servono. Preferisci il browser per non salvare la chiave nella cronologia; `/poll connect sk_...` è per terminali locali attendibili.

---

## 🔗 Link Importanti

- **Dashboard e Chiavi API**: [enter.pollinations.ai](https://enter.pollinations.ai)
- **Community Discord**: [Unisciti a noi!](https://discord.gg/pollinations-ai-885844321461485618)
- **Ecosistema OpenCode**: [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 Licenza

Licenza MIT. Sviluppato da [fkom13](https://github.com/fkom13) e la Community Pollinations.
