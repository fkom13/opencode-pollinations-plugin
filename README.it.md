# 🌸 Pollinations AI Plugin per OpenCode (v6.5.0)

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

## ✨ Novità v6.5.0

- 🧊 **Generazione 3D (`polli_gen_3d`)**: Generazione di modelli 3D (`trellis-2`, `hyper3d-rodin`) in formato standard `.glb` con protezione Cost Guard e recupero da cache.
- 🛡️ **Zero Doppia Fatturazione**: Retry chat rigorosamente limitati al codice HTTP 429; timeout e interruzioni di rete non inviano mai richieste di pagamento duplicate.
- 🧠 **Normalizzazione del Reasoning**: Pulizia automatica dei flussi SSE per DeepSeek, Kimi e Qwen — nessuna perdita di testo di pensiero nella chat.
- 💰 **Semantica Quest & Paid Trasparente**: Nuove modalità di fatturazione (`quest`, `quest_only`, `paid`, `manual`) con soglie di allerta in Pollen assoluto.
- 📦 **Artifact Core (Magic Bytes)**: Verifica fisica binaria (JPEG, PNG, GLB, MP4, MP3, WebM) che garantisce estensioni di file corrette su disco.
- ⏱️ **Gerarchia di Timeout Configurabile**: Controllo dettagliato dei timeout per chiamata, per modello e per capacità con `/poll config timeouts.*`.
- 🎯 **Quest & Login in 1 Clic**: Tracciamento retroattivo delle quest (`/poll quests`) e login automatico nel browser (`/poll login`).
- 🆓 **6 Strumenti Creatore Gratuiti (senza chiave)**: `gen_edit_image_free`, `gen_video_free`, `object_remover`, `image_upscaler`, `image_enhancer`, `remove_background`.

---

## 🧰 Strumenti & Comandi

Oltre alle discussioni testuali, connettere la tua chiave API fornisce agli Agenti OpenCode l'accesso superpotenziato agli Strumenti Media guidati dai modelli di Pollinations:

### 💎 Strumenti Generativi Integrati (ENTER ONLY - richiede API key)
- 🎨 `polli_gen_image` : Modelli di generazione immagini all'avanguardia (`Flux`, `Sana`, `Midjourney`, ecc.).
- 🎬 `polli_gen_video` : Potenti modelli Testo-a-Video e Immagine-a-Video (`Wan`, `Veo`, `LTX`, `Reveal`).
- 🧊 `polli_gen_3d` : Generazione di risorse 3D ad alta fedeltà (`trellis-2`, `hyper3d-rodin`) con output GLB.
- 🔊 `polli_gen_audio` & `polli_gen_music` : Sintesi vocale magica (ElevenLabs, OpenAI TTS) e Musica Generativa.
- 🎙️ `polli_stt` : Trascrizione vocale di altissimo livello (Whisper V3).
- 🌐 `polli_web_search` : Ricerca Web connessa & ricerca specializzata sui dati (`gemini-search`, `perplexity...`).

### 🧰 Strumenti di Creazione Gratuiti (Sempre disponibili — senza chiave API)
- 🆓 `gen_edit_image_free` : Genera e modifica immagini gratis (~20/giorno, qualsiasi modello, senza chiave).
- 🆓 `gen_video_free` : Testo-a-video gratis con immagine e audio opzionali (~5/giorno, senza chiave).
- 🧹 `object_remover` : Rimozione oggetti tramite prompt direttamente (30-120s, senza chiave).
- 📐 `image_upscaler` : Ingrandimento 2x/4x gratis (30-120s, senza chiave).
- ✨ `image_enhancer` : Miglioramento immagini IA — denoise, nitidezza, restauro (30-120s, senza chiave).
- ✂️ `remove_background` : Rimozione sfondo IA tramite rmbg (bgeraser.com) — gratis.
- 🛠️ `gen_qrcode`, `gen_diagram`, `gen_palette`, `extract_frames`, `extract_audio`, `file_to_url`: Utility per sviluppatori integrate.

### 💻 Elenco Completo dei Comandi del Terminale
Usa l'alias **`/poll`** o **`/pollinations`** nel tuo terminale della conversazione:
- `/poll help` : Mostra la tabella di aiuto interattiva.
- `/poll login` : **Login browser in 1 clic** (device flow) — crea e connette una chiave automaticamente.
- `/poll connect <chiave>` : Configurazione manuale "Bring Your Own Key" (`sk_...`).
- `/poll quests` : Visualizza le tue quest e il Pollen gratuito da riscattare. 🎯
- `/poll usage full` : Dashboard in tempo reale (Statistiche), Quest attive e Saldo del Portafoglio.
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

### 🔑 2. Onboarding Interattivo

Una volta in OpenCode, connetti il tuo account Pollinations tramite **una di queste opzioni**:

**Opzione A — Login in 1 clic (consigliata):**
```bash
/poll login
```
Il browser si aprirà automaticamente. Accedi con GitHub e clicca su **Authorize** — il plugin si collegherà da solo senza copia-incolla.

**Opzione B — Chiave manuale:**
```bash
/poll connect sk_la_tua_chiave_qui
```
Crea una chiave **Secret** su [enter.pollinations.ai](https://enter.pollinations.ai) e incollala. *(Riavvia OpenCode per aggiornare la lista dei modelli grafici).*

---

## 🔗 Link Importanti

- **Dashboard e Chiavi API**: [enter.pollinations.ai](https://enter.pollinations.ai)
- **Community Discord**: [Unisciti a noi!](https://discord.gg/pollinations-ai-885844321461485618)
- **Ecosistema OpenCode**: [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 Licenza

Licenza MIT. Sviluppato da [fkom13](https://github.com/fkom13) e la Community Pollinations.
