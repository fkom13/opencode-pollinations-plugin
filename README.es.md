# 🌸 Pollinations AI Plugin para OpenCode (v6.5.0)

<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="180">
  <h3>El puente definitivo entre OpenCode y el ecosistema Pollinations.ai</h3>
  <p><em>Accede a un universo continuo de modelos de IA básicos y gratuitos, o aprovecha modelos premium empresariales usando nuestro sistema <b>Quest & Paid Pollen</b> directamente en tu terminal.</em></p>
</div>

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/opencode-pollinations-plugin?color=blue&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![Downloads](https://img.shields.io/npm/dt/opencode-pollinations-plugin?color=success&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Filosofía: IA Abierta para Creadores

> **"Sin puertas cerradas, sin bloqueos corporativos — simplemente buenas herramientas y buena gente."**

**Pollinations.ai** es una plataforma de código abierto creada por y para la comunidad. Ofrecemos una API unificada y directa para generar imágenes, texto, audio, vídeo y 3D.

- 🌍 **Transparente**: Nuestro código, hoja de ruta (roadmap) y discusiones son de acceso público.
- ⚖️ **Economía Justa**: Una moneda única (**Pollen 🌻**) para todo tipo de archivos multimedia y modelos. Precios predecibles, transparentes y sin ataduras propietarias.

---

## ✨ Novedades v6.5.0

- 🧊 **Generación 3D (`polli_gen_3d`)**: Generación de modelos 3D (`trellis-2`, `hyper3d-rodin`) en formato estándar `.glb` con protección Cost Guard y recuperación desde caché.
- 🛡️ **Cero Doble Facturación**: Reintentos de chat estrictamente limitados al error 429; los timeouts y cortes de red nunca vuelven a enviar peticiones de pago.
- 🧠 **Normalización de Razonamiento**: Limpieza automática de flujos SSE en DeepSeek, Kimi y Qwen — sin filtraciones de pensamientos en el chat.
- 💰 **Semántica Quest & Paid Transparente**: Nuevos modos de facturación (`quest`, `quest_only`, `paid`, `manual`) con límites de alerta en Pollen absoluto.
- 📦 **Artifact Core (Magic Bytes)**: Verificación física binaria (JPEG, PNG, GLB, MP4, MP3, WebM) garantizando extensiones correctas en disco.
- ⏱️ **Jerarquía de Timeouts Configurable**: Control detallado de tiempos de espera por llamada, por modelo y por capacidad con `/poll config timeouts.*`.
- 🎯 **Quests y Login en 1 Clic**: Seguimiento retroactivo de misiones (`/poll quests`) e inicio de sesión automático en navegador (`/poll login`).
- 🆓 **6 Herramientas de Creador Gratuitas (sin clave)**: `gen_edit_image_free`, `gen_video_free`, `object_remover`, `image_upscaler`, `image_enhancer`, `remove_background`.

---

## 🧰 Herramientas y Comandos

Aparte de conversar, cuando conectas tu API Key, el Agente OpenCode adquiere superpoderes multimedia desarrollados por los modelos de Pollinations:

### 💎 Herramientas Generativas (ENTER ONLY - requiere API Key)
- 🎨 `polli_gen_image` : Modelos creativos líderes (`Flux`, `Sana`, `Midjourney`, etc.).
- 🎬 `polli_gen_video` : Modelos robustos de Texto-a-Vídeo e Imagen-a-Vídeo (`Wan`, `Veo`, `LTX`, `Reveal`).
- 🧊 `polli_gen_3d` : Generación de activos 3D de alta fidelidad (`trellis-2`, `hyper3d-rodin`) en GLB.
- 🔊 `polli_gen_audio` y `polli_gen_music` : Síntesis de voz mágica (ElevenLabs, OpenAI TTS) y Música de IA.
- 🎙️ `polli_stt` : Alta eficiencia en el paso de voz a texto (Whisper V3).
- 🌐 `polli_web_search` : Búsqueda web inteligente y conocimiento en tiempo real (`gemini-search`, `perplexity...`).

### 🧰 Herramientas de Creador Gratuitas (Siempre disponibles — sin clave API)
- 🆓 `gen_edit_image_free` : Generación y edición de imágenes gratis (~20/día, cualquier modelo, sin clave).
- 🆓 `gen_video_free` : Texto-a-vídeo gratis con imagen y audio de entrada opcionales (~5/día, sin clave).
- 🧹 `object_remover` : Eliminación de objetos por prompt directamente (30-120s, sin clave).
- 📐 `image_upscaler` : Aumento de resolución 2x/4x gratis (30-120s, sin clave).
- ✨ `image_enhancer` : Mejora de imagen por IA — reducción de ruido, nitidez, restauración (30-120s, sin clave).
- ✂️ `remove_background` : Eliminación de fondo mediante rmbg (bgeraser.com) — gratis.
- 🛠️ `gen_qrcode`, `gen_diagram`, `gen_palette`, `extract_frames`, `extract_audio`, `file_to_url`: Utilidades para desarrolladores.

### 💻 Lista Completa de Comandos en Terminal
Solo llama al bot usando los alias **`/poll`** o **`/pollinations`** en tu terminal:
- `/poll help` : Muestra todo el cuadro de ayuda interactivo.
- `/poll login` : **Inicio de sesión en 1 clic** en el navegador (device flow) — conecta una clave automáticamente.
- `/poll connect <clave>` : Configuración manual "Bring Your Own Key" (`sk_...`).
- `/poll quests` : Mira tus misiones y el Pollen gratis disponible para reclamar. 🎯
- `/poll usage full` : Panel de control en tiempo real, recargas de saldo y uso del Portafolio.
- `/poll config` : Refinamiento de idiomas, límites de costes (Cost Guards), timeouts y logs.
- `/poll models` : Ver los modelos actualmente disponibles y en línea.
- `/poll pricing` : Consultar la lista de precios unificados de Pollen al día.
- `/poll mode <mode>` : Cambiar entre modos de facturación (`quest`, `quest_only`, `paid`, `manual`).
- `/poll fallback` : Configurar tus redes de seguridad para las conversaciones del chat.
- `/poll infos` : Información del ecosistema y guía de uso.

---

## 🛡️ "Cost Guard" & El "Safety Net" (Red de Seguridad)

Nos preocupamos de tu cartera y de tu ritmo de trabajo, incluyendo barreras fundamentales que aseguran tu tranquilidad:

- 🛟 **Red de Seguridad (Safety Net)** : Al agotar tu saldo Quest/Paid o si ocurriese un corte, el ecosistema transita suave y silenciosamente hacia modelos gratuitos de seguridad. *Tu chat jamás se cortará con errores 429.*
- 🚦 **Cost Guard de Herramientas** : Los agentes pueden ser insistentes. Si un agente intenta gastar demasiado Pollen en una generación pesada de vídeo o 3D, el plugin interceptará la petición solicitando tu confirmación manual (`polli_gen_confirm`).

---

## 🐝 Entendiendo el Quest Pollen & el Pollen de Pago

El pollen de Pollinations se divide en dos columnas:

- **🎁 Pollen Quest** — se gana gratis completando **Misiones**. El servidor lo consume primero en los modelos regulares.
- **💎 Pollen de Pago** — comprado (tarjeta). Se usa cuando el Quest es insuficiente, o para modelos `paid_only`.

> ⚠️ El plugin no puede leer el desglose del servidor; estima Quest/Pago localmente y lee el desglose real (`meter_source`) desde `/account/usage`.

### Modos de facturación (v6.5):

| Modo | Comportamiento |
| :--- | :--- |
| `quest` (QUEST_PREFERRED, **por defecto**) | Quest primero, fallback a Pago permitido. Cae al universo gratuito cuando ambos parecen agotados. |
| `quest_only` (QUEST_ELIGIBLE_ONLY) | Bloquea modelos `paid_only` localmente; solo envía llamadas elegibles para Quest. **Best-effort** — puede ocurrir un débito de Pago. |
| `paid` (PAID_ALLOWED) | Pago permitido, `paid_only` según el Cost Guard. Cae al gratuito cuando el wallet está bajo. |
| `manual` | Sin política automática — control total. |

Cambia con `/poll mode <mode>` o `/poll config mode <mode>`.

> 🎯 **¡Gana pollen gratis completando Misiones!** Usar este plugin completa varias retroactivamente. Ejecuta `/poll quests`.

> 🎁 **Obtén tu Clave Gratuita Personal (BYOK) desde [enter.pollinations.ai](https://enter.pollinations.ai) ¡Y dale alas a tu OpenCode!**

**¿Cómo funciona?**
1. Tu Pollen Quest se consume primero en los modelos regulares.
2. Los modelos `paid_only` 💎 consumen siempre Pollen comprado.
3. Cuando ambos saldos se agotan, el plugin cambia suavemente a los modelos gratuitos de seguridad.

---

## 🌍 Soporte Nativo de Diversos Idiomas (i18n)

Pollinations se comunica fluidamente en varios idiomas usando bases directas:
- Interfaz del entorno, Notificaciones Flotantes (Toasts), Respuestas de herramientas y Comandos vienen localizados a **Inglés**, **Francés**, **Español**, **Alemán**, **Italiano**, y **Chino**.
- Ingresa el comando `/poll config lang <en|fr|es|de|it|zh>` para cambiar de idioma al instante.

---

## 🚀 Instalación y Emparejamiento

### 🐧 1. Soporte a Todas las Plataformas vía NPM CLI
Este plugin es **totalmente multiplataforma** (Windows, macOS, Linux ; Node **≥ 18**) e inicia un proxy local en un puerto dinámico.

1. Instalación global o local:
   ```bash
   npm install -g opencode-pollinations-plugin
   ```
2. Auto-Configuración:
   ```bash
   npx opencode-pollinations-plugin
   # o: npx opencode-pollinations-plugin --check
   ```
   *(Inyecta automáticamente `opencode-pollinations-plugin` en `~/.config/opencode/opencode.json`)*

### 🔑 2. Onboarding Interactivo

Una vez dentro de OpenCode, conecta tu cuenta de Pollinations con **una de estas opciones**:

**Opción A — Login en 1 clic (recomendado):**
```bash
/poll login
```
Tu navegador se abrirá automáticamente. Inicia sesión con GitHub y presiona **Authorize** — el plugin se conectará solo, sin necesidad de copiar y pegar.

**Opción B — Clave manual:**
```bash
/poll connect sk_tu_clave_aqui
```
Crea una clave **Secret** en [enter.pollinations.ai](https://enter.pollinations.ai) y pégala. *(Reinicia OpenCode para refrescar la lista de modelos de la interfaz).*

---

## 🔗 Enlaces Importantes

- **Dashboard y Claves API**: [enter.pollinations.ai](https://enter.pollinations.ai)
- **Comunidad Discord**: [¡Únete aquí!](https://discord.gg/pollinations-ai-885844321461485618)
- **Ecosistema OpenCode**: [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 Licencia

Licencia MIT. Desarrollado por [fkom13](https://github.com/fkom13) y la Comunidad Pollinations.
