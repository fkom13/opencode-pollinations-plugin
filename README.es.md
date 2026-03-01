# 🌸 Plugin Pollinations AI para OpenCode (v6.1.0)

<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="200">
  <br>
  <b>El Puente entre OpenCode y el Ecosistema Pollinations.ai.</b>
  <br>
  Acceda a un universo continuo de modelos de IA básicos gratuitos, o aproveche potentes modelos empresariales premium con nuestros generosos Niveles Gratuitos Diarios (Free Tiers) directamente desde su editor.
</div>

<div align="center">

![Version](https://img.shields.io/badge/version-v6.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-Stable-success.svg)

</div>

## 📖 Filosofía: IA Abierta para Creadores

> **"Sin puertas cerradas, sin aros corporativos — solo buenas herramientas y buenas personas."**

Pollinations.ai es una plataforma de código abierto creada por y para la comunidad. Ofrecemos una API unificada y directa para la generación de imágenes, texto, audio y vídeo.
- **Transparente**: Nuestro código, hoja de ruta y discusiones son públicos.
- **Economía Justa**: Una moneda única (**Pollen**) para todos los medios y modelos. Precios predecibles y transparentes.

---

## ✨ ¿Qué hay de nuevo en la V6? 
---

## 🧰 Las Herramientas (Tools) y Comandos V6

Más allá de la discusión textual, conectar su clave da a los Agentes de OpenCode acceso a nuestras Herramientas de Medios de IA impulsadas por los modelos de Pollinations:

### 💎 Herramientas Generativas Integradas (después de ingresar su clave API)
- `polli_gen_image` : Modelos de imágenes de vanguardia (`Flux`, `Midjourney`, `Gemini`).
- `polli_gen_video` : Potentes capacidades de Text-to-Video e Image-to-Video (`Wan`, `Veo`, `LTX`, `Reveal`).
- `polli_gen_audio` & `polli_gen_music` : Síntesis de voz mágica (ElevenLabs) y Música Generativa.
- `polli_stt` : Transcripción de voz de alto vuelo (Whisper V3).
- `polli_web_search` : Búsqueda Web Conectada para contexto documentado.

### 🧰 Herramientas Bonus para Creadores
- `remove_background` : Eliminación de fondo de imagen ultrarrápida integrada (Siempre Gratis).
- `gen_qrcode`, `extract_frames`, `extract_audio` : Utilidades (Siempre Gratis).

### 💻 Lista Completa de Comandos del Terminal
Use el alias **`/poll`** o **`/pollinations`**.
- `/poll help` : Muestra la tabla de ayuda interactiva.
- `/poll connect` : Herramienta de configuración Bring Your Own Key (Interactiva).
- `/poll usage full` : Panel de control en tiempo real (Stats), Freetiers activos y Monedero (Wallet Balance).
- `/poll config` : Ajuste finamente los Cost Guards, Logs, Idioma y Pantalla.
- `/poll models` : Verifique el estado de los Modelos disponibles.
- `/poll pricing` : Ver precios unificados en tiempo real (Estimación de Costo Promedio).
- `/poll fallback` : Defina el modelo de Chat del Safety Net definitivo.
- `/poll mode` : Cambie de modo sin pasar por la API.
- `/poll infos` : Descubra las reglas de la comunidad y el sistema de niveles.

### 🛡️ El "Cost Guard" & el "Safety Net"
Hemos introducido protecciones fundamentales para garantizar que su flujo de trabajo nunca se interrumpa y que su monedero (Wallet o free tiers) esté bajo su control.
- **Safety Net**: Si utiliza modelos premium y su cuota diaria de Pollen se agota en medio de una sesión de chat, el plugin cambia silenciosa y automáticamente a un modelo gratuito. *No más errores de bloqueo (429).*
- **Cost Guard para Herramientas**: Los Agentes de OpenCode pueden ser entusiastas. Si un Agente intenta gastar demasiados Pollens para generar un video o música pesada, el plugin intercepta la solicitud. Hemos implementado un flujo asíncrono que solicita su confirmación manual antes de ejecutar generaciones costosas. Usted mantiene el control.

### 🌍 Soporte Multilingüe Nativo (i18n)
Pollinations para OpenCode ahora habla su idioma nativamente.
- La Interfaz Múltiple, las Notificaciones (Toasts), los Retornos de Herramientas y los Comandos están traducidos completamente al **Inglés (Por Defecto)**, **Francés**, **Español**, **Alemán** e **Italiano**.
- Escriba `/poll config lang <fr|es|de|it>` en el terminal para cambiar instantáneamente.

---

## 🐝 Entendiendo los Pollens & los "Niveles Gratuitos (Free Tiers)"

En el pasado, Pollinations dependía principalmente del tráfico de red financiado por publicidad. Hoy en día, ejecutar modelos masivos (como Claude 4.5, Flux Pro, Wan Video) cuesta dinero. Pollinations introduce así el **Enter Universe** que requiere una clave API y desbloquea modelos de vanguardia.

**¡Pero espera, no necesitas una tarjeta de crédito!**

El **Pollen** es nuestro sistema de crédito unificado ($1 ≈ 1 Pollen). Al conectar una simple Clave API Gratuita, desbloquea recargas diarias de Pollen según su Nivel (Tier) de Desarrollador:

| Nivel (Tier) | Recarga Diaria | Condición |
| :--- | :--- | :--- |
| 🦠 **Microbe** | **0.1 Pollen/día** | ¡Solo Regístrate! |
| 🍄 **Spore** | **1 Pollen/día** | Verificación automática |
| 🌱 **Seed** | **3 Pollen/día** | Desarrollador de GitHub Activo (8+ puntos) |
| 🌸 **Flower** | **10 Pollen/día** | **Publicar una Aplicación** (¡Como este Plugin!) |

> 🎁 **¡Obtén tu Clave Personal Gratuita (BYOK) en [Pollinations.ai](https://pollinations.ai) para potenciar OpenCode!**

*(Nota: Seguimos manteniendo el fallback "Free Universe" para el chat básico (`openai-fast`) que no requiere clave, pero su capacidad es muy limitada y está pensado principalmente como un Safety Net).*

Los pollens pagados le permiten acceder a modelos aún más potentes y premium.

Los créditos pollen de los free tiers diarios se consumen antes de tocar la billetera (pollen comprado), excepto para los modelos pagados.

---

## 🚀 Instalación y Onboarding

### 🐧 1. Configuración Multiplataforma (Instalación NPM)
Este plugin es **totalmente cross-platform** (Windows, macOS, Linux) y detecta sus puertos dinámicamente.

1. Instalación global:
   ```bash
   npm install -g opencode-pollinations-plugin
   ```
2. Auto-Configuración:
   ```bash
   npx opencode-pollinations-plugin
   ```
   *(O inyéctelo manualmente en `~/.config/opencode/opencode.json`)*

### 🔑 2. Onboarding Interactivo
Una vez en OpenCode, simplemente escriba el siguiente comando en el Terminal del Agente:
```bash
/poll connect
```
Un asistente conversacional interactivo le guiará para inyectar su Clave Pollinations y configurar su espacio. *Reinicie OpenCode para actualizar la lista de modelos en la interfaz de usuario.*



---

## 🔗 Enlaces

- **Crea tu Clave API Pollen**: [pollinations.ai](https://pollinations.ai)
- **Discord de la Comunidad**: [¡Únete a nosotros!](https://discord.gg/pollinations-ai-885844321461485618)
- **Ecosistema OpenCode**: [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 Licencia

Licencia MIT. Creado por [fkom13](https://github.com/fkom13) & La Comunidad Pollinations.
