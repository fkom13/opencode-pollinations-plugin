# 🌸 Pollinations AI Plugin para OpenCode (v6.4)

## ✨ Novedades v6.4.0

- 🎯 **Misiones y Gamificación** : `polli_quests` + `/poll quests` — mira tus misiones y el **Pollen gratis por reclamar**. ¡Usar el plugin completa misiones retroactivamente!
- 🆓 **Imagen y Vídeo gratis (¡sin clave!)** : `gen_edit_image_free` (generar + editar, ~20/día) y `gen_video_free` (texto→vídeo + imagen/audio, ~5/día), para cualquier modelo.
- `object_remover` : Elimina objetos por prompt (gratis).
- `image_upscaler` : Amplía imágenes 2x/4x (gratis).
- `image_enhancer` : Mejora IA de imagen (gratis).
- 🔐 **Inicio 1 clic** : `/poll login` + `polli_login` (device flow como `gh auth login`), el navegador se abre solo. `/poll connect sk_...` sigue disponible para clave permanente.
- 🇨🇳 **Chino añadido** : interfaz en 6 idiomas (en, fr, es, de, it, zh).


<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="180">
  <h3>El puente definitivo entre OpenCode y el ecosistema Pollinations.ai</h3>
  <p><em>Accede a un universo continuo de modelos de IA básicos y gratuitos, o aprovecha modelos premium empresariales usando nuestras generosas <b>Cuotas Gratuitas por Hora (Hourly Free Tiers)</b> directamente en tu terminal.</em></p>
</div>

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/opencode-pollinations-plugin?color=blue&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![Downloads](https://img.shields.io/npm/dt/opencode-pollinations-plugin?color=success&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Filosofía: IA Abierta para Creadores

> **"Sin puertas cerradas, sin bloqueos corporativos — simplemente buenas herramientas y buena gente."**

**Pollinations.ai** es una plataforma de código abierto creada por y para la comunidad. Ofrecemos una API unificada y directa para generar imágenes, texto, audio y vídeo.

- 🌍 **Transparente**: Nuestro código, hoja de ruta (roadmap) y discusiones son de acceso público.
- ⚖️ **Economía Justa**: Una moneda única (**Pollen 🌻**) para todo tipo de archivos multimedia y modelos. Precios predecibles, transparentes y sin ataduras propietarias.

---

## ✨ Novedades de la V6.4

- ⏱️ **Cuotas por Hora**: ¡Dile adiós a los límites diarios! Los Tiers de Desarrollador se recargan **cada hora** exacta (a la hora en punto `:00`), asegurando que siempre tengas créditos frescos para tus largas jornadas de código.
- ⚡ **Motor 100% Dinámico**: ¡Se acabaron las listas de modelos quemadas en el código y los precios estáticos! En V6.2, el agente obtiene dinámicamente los últimos LLMs, parámetros, etiquetas (`[💎 Paid]`, `[🌿 Free]`) y costes aproximados conectándose continuamente a la API de Pollinations.
- 🛡️ **Seguridad Robusta**: Completamente integradas las mitigaciones contra path traversal y una estricta validación de URLs.
- 🔍 **Búsqueda Web Mejorada**: El componente `polli_web_search` accede directamente a las opciones modernas de indexación como Gemini Fast, Perplexity y otros asistentes personalizados por red.

---

## 🧰 Herramientas y Comandos

Aparte de conversar, cuando conectas tu API Key, el Agente OpenCode adquiere superpoderes multimedia desarrollados por los modelos de Pollinations:

### 💎 Herramientas Generativas (ENTER ONLY - requiere API Key)
- 🎨 `polli_gen_image` : Modelos creativos líderes (`Flux`, `Sana`, `Midjourney`, etc.).
- 🎬 `polli_gen_video` : Modelos robustos de Texto-a-Vídeo e Imagen-a-Vídeo (`Wan`, `Veo`, `LTX`, `Reveal`).
- 🔊 `polli_gen_audio` y `polli_gen_music` : Síntesis de voz mágica (ElevenLabs, OpenAI TTS) y Música de IA.
- 🎙️ `polli_stt` : Alta eficiencia en el paso de voz a texto (Whisper V3).
- 🌐 `polli_web_search` : Búsqueda web inteligente y conocimiento en tiempo real (`gemini-search`, `perplexity...`).

### 🧰 Herramientas Integradas Gratuitas (Siempre disponibles)
- ✂️ `remove_background` : Eliminación rápida del fondo de cualquier imagen de forma offline nativa.
- 🛠️ Herramientas como `gen_qrcode`, `gen_diagram`, `extract_frames`, `extract_audio`, y `file_to_url` para mejorar el día a día.

### 💻 Lista Completa de Comandos en Terminal
Solo llama al bot usando los alias **`/poll`** o **`/pollinations`** en tu terminal:
- `/poll help` : Muestra todo el cuadro de ayuda interactivo.
- `/poll connect` : Interfaz de configuración "Bring Your Own Key" (Trae tu proipa Clave).
- `/poll usage full` : Panel de control en tiempo real, recargas de saldo y uso del Tiers Gratuitos.
- `/poll config` : Refinamiento de idiomas, alertas de costes (Cost Guards) y logs.
- `/poll models` : Ver los modelos ahora viables y en línea.
- `/poll pricing` : Mirar la lista de precios unificados de Pollen al día.
- `/poll fallback` : Configurar tus redes de seguridad para las conversaciones y el Agente.
- `/poll infos` : Información vital del ecosistema, sobre cómo funciona todo y formas de subir de nivel en los Roles.

---

## 🛡️ "Cost Guard" & El "Safety Net" (Red de Seguridad)

Nos preocupamos de tu cartera y de tu ritmo de trabajo, incluyendo barreras fundamentales que aseguran tu tranquilidad:

- 🛟 **Red de Seguridad**: Al agotar tu saldo diario/por hora o si un error bloqueante 429 sucediese, el ecosistema transita suave y calladamente hacia modelos Free de seguridad. Tu chat jamás se cortará sin un aviso.
- 🚦 **Cost Guard de Herramientas**: Ya que los modelos potentes de Audio o Video consumen bastante (y un agente podría sobrepasar ese límite por afición a resolver un problema a nivel visual), implementamos interceptores. Una parada asíncrona solicitará tu confirmación directa ante transacciones altas.

---

## 🐝 Entendiendo el Pollen & "Free Tiers"

Antes Pollinations se sustentaba de anuncios para todos. Hoy, correr grandes servidores y maravillas como Claude 3.5 Sonnet, cuestan dinero. El mundo llamado **Enter Universe** precisa entonces de tu propia APi Key.

**¡Pero espera que NO necesitas registrar una tarjeta bancaria!**

El **Pollen 🌻** dicta la ley unificada del crédito (1$ ≈ 1 Pollen). Sólo vinculando una clave Key sencilla gratuita abres el camino hacia el **beneficio del sistema de recarga automática por hora**:

| Tier | Recarga Hora ⏱️ | Aprox Diario* | Requisito a Cumplir |
| :--- | :--- | :--- | :--- |
| 🦠 **Microbe** | **0.01 Pollen / hora** | ~0.24 /día | ¡Sólo con crear el token! |
| 🍄 **Spore** | **0.01 Pollen / hora** | ~0.24 /día | Examen de perfil y verificación |
| 🌱 **Seed** | **0.15 Pollen / hora** | ~3.6 /día | Desarrollador activo en Github (+8 pts) |
| 🌸 **Flower** | **0.40 Pollen / hora** | ~9.6 /día | **Completar y Publicar una App** |
| 🍯 **Nectar** | **0.80 Pollen / hora** | ~19.2 /día | Pendiente a futuras actualizaciones 🔮 |

_*Los cálculos diarios solo son estimaciones teóricas (~24h × cuota/hora). El reinicio limpio sucede exacto en el minuto `:00` de las horas del reloj._

> 🎁 **Obtén tu Clave Gratuita Personal (BYOK) desde [Pollinations.ai](https://enter.pollinations.ai/authorize?redirect_url=https://github.com/fkom13/opencode-pollinations-plugin) ¡Y dale alas a tu OpenCode!**

**¿Cómo es el ciclo?**
1. Lo que consumas lo deduce el plugin de tu cuota de Tier gratuita (ej: los 0.40 🌻/h si eres Flower).
2. Si llegas al límite horario de gratis, bajará los procesos a modos pasivos y lentos del ecosistema Gratuito.
3. Lo introducido en saldo comprado solo afectará la orden si fallan las vías de red anteriores.
4. ¿Ha llegado la hora siguiente? 💥 Bam. Tus cuotas se resetean totalmente de nuevo.

---

## 🌍 Soporte Nativo de Diversos Idiomas (i18n)

Pollinations se comunica fluidamente en varios idiomas usando bases directas:
- Interfaz del entorno, Alarmas Flotantes (Toasts), Notificaciones y Comandos vienen localizados a **Inglés**, **Francés**, **Español**, **Alemán**, **Italiano**, y **Chino**.
- Ingresa el comando `/poll config lang <en|fr|es|de|it|zh>` para cambiar entre esquemas casi mágicamente.

---

## 🚀 Instalación y Emparejamiento

### 🐧 1. Soporte a Todas las Plataformas vía NPM CLI
Este núcleo ha sido forjado para acoplarse y detectar con vida propia sobre (Windows, macOS, Linux).

1. Usando el ambiente general o nativo:
   ```bash
   npm install -g opencode-pollinations-plugin
   ```
2. Auto-Configuración Dinámica de inyección:
   ```bash
   npx opencode-pollinations-plugin
   ```
   *(También tienes libertad de editar `~/.config/opencode/opencode.json` con cautela a mano)*

### 🔑 2. Proceso de Integración
Estando conectado dentro de tu visualización OpenCode, abre la terminal al Agente escribiendo:
```bash
/poll connect
```
Sigue el simpático sistema base para inyectar y comprobar tu clave Pollinations personal. *(Nota: Haz el amago de cerrar OpenCode y ejecutarlo de nuevo para purgar el visor de modelos al instante).*

---

## 🔗 Enlaces Importantes

- **Obtener tu Llave Master de la Red API**: [pollinations.ai](https://pollinations.ai)
- **Nuestra Gran y Activa Familia Discord**: [¡Súmate Todos Mismos Aquí!](https://discord.gg/pollinations-ai-885844321461485618)
- **Cosas Relacionadas Al Ecosistema Abierto**: [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 Licencia de Dominio Público

Licencia MIT otorgada. Hecho posible de principio a infinito por [fkom13](https://github.com/fkom13) & La Gran Comunidad Pollinations.
