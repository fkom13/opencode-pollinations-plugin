const fs = require('fs');
const path = require('path');
const srcDir = path.join(__dirname, 'src', 'locales');

const overrides = {
    es: {
        "commands": {
            "infos": {
                "title": "## 🍯💚 PLUGIN POLLINATIONS OPENCODE 💚🍯\n\n¡Bienvenido **{name}** al plugin Pollinations OpenCode!\n\nEste plugin te permite generar código, imágenes, analizar videos e interactuar con los mejores modelos de IA sin problemas desde tu entorno de desarrollo. Accede a LLMs avanzados a través del chat, reestructuración o terminal.",
                "features_title": "**¡Lo que este plugin trae para ti!:**",
                "features_free": "**🛠️ Herramientas gratuitas integradas (Siempre Disponibles):**\n- `gen_qrcode` / `gen_diagram` / `gen_palette` : Visuales y utilidades.\n- `remove_background` : Eliminación de fondo nativa.\n- `extract_frames` / `extract_audio` : Extracción rápida de medios.\n- `file_to_url` : Alojamiento instantáneo de archivos locales.",
                "features_pro": "**💎 Herramientas Pollinations (Premium - Automatizado con Clave):**\n- `polli_gen_image` : Gen de imágenes (Flux, Gemini) + Image-to-Image.\n- `polli_gen_video` : Text-to-video / Image-to-video (Veo, Wan...).\n- `polli_gen_audio`/`polli_stt` : Whisper STT, ElevenLabs TTS.\n- `polli_gen_music` : Motor de música generativa.\n- `polli_web_search` : Búsqueda web contectada.",
                "features_config": "- **Configuración granular**, gestión de modos y tokens, protección de costos...",
                "tiers_title": "> **Tus niveles:** {emoji} {tier}",
                "about": "## 🌍 ¿Qué es pollinations.ai?\npollinations.ai es una plataforma de IA de código abierto creada por y para la comunidad. Ofrecemos una API unificada para Imagen, Texto, Audio y Video. Todo es abierto: nuestro código, roadmap, conversaciones. ¡Únete a nosotros!\n\nSin cajas negras. Sin bloqueos. Solo una API amigable y un Discord lleno de gente dispuesta a ayudar.",
                "levels_title": "## 📈 Mejora tu Nivel",
                "levels_list": "Para desarrolladores que crean con pollinations.ai. Sube de nivel para ganar más Pollen.\n\n- 🦠 **Microbe** (0.1 pollen/día) : Regístrate\n- 🍄 **Spore** (1 pollen/día) : Verificación automática\n- 🌱 **Seed** (3 pollen/día) : 8+ puntos dev\n- 🌸 **Flower** (10 pollen/día) : Publicar una app\n- 🍯 **Nectar** (20 pollen/día) : Próximamente 🔮",
                "beta_note": "✨ *¡Estamos en beta! Aprendiendo qué funciona mejor para nuestra comunidad.*",
                "pollen_title": "## 💎 ¿Qué es el Pollen?",
                "pollen_get": "Ejecutar modelos de IA cuesta dinero. El Pollen es nuestra forma de mantener los servidores funcionando sin anuncios ni vendiendo datos. Un crédito simple para todos los modelos — predecible y transparente.\n\n**$1 ≈ 1 Pollen**. Se gasta en llamadas API.",
                "pollen_spend": "## 🛒 ¿Cómo conseguir Pollen?\nPuedes agregar Pollen participando en la comunidad o comprándolo directamente en el panel principal."
            },
            "config": {
                "fallback_enter_role": "Modelo principal de Agente (free/* o enter/*)",
                "managed_auto": "Gestionado automáticamente"
            }
        }
    },
    de: {
        "commands": {
            "infos": {
                "title": "## 🍯💚 POLLINATIONS OPENCODE PLUGIN 💚🍯\n\nWillkommen **{name}** beim Pollinations OpenCode Plugin!\n\nDieses Plugin ermöglicht es, Code und Bilder zu generieren, Videos zu analysieren und nahtlos mit den besten KI-Modellen zu interagieren. Greifen Sie über Chat, Refactoring oder Terminal auf erstklassige LLMs zu.",
                "features_title": "**Was dieses Plugin Ihnen bietet! :**",
                "features_free": "**🛠️ Integrierte kostenlose Tools (Immer verfügbar):**\n- `gen_qrcode` / `gen_diagram` / `gen_palette` : Visuelle & Dev-Utilities.\n- `remove_background` : Natives Entfernen von Hintergründen.\n- `extract_frames` / `extract_audio` : Schnelle Medienextraktion.\n- `file_to_url` : Sofortiges Online-Hosting lokaler Dateien.",
                "features_pro": "**💎 Pollinations Tools (Premium - Automatisiert mit Key):**\n- `polli_gen_image` : Bildgen (Flux, Gemini) + Image-to-Image.\n- `polli_gen_video` : Text-to-Video / Image-to-Video (Veo, Wan...).\n- `polli_gen_audio`/`polli_stt` : Whisper STT, ElevenLabs TTS.\n- `polli_gen_music` : Generative Musik-Engine.\n- `polli_web_search` : Verbundene Websuche.",
                "features_config": "- **Granulare Konfiguration**, Modus- und Token-Management, Kostenschutz...",
                "tiers_title": "> **Ihre Stufen:** {emoji} {tier}",
                "about": "## 🌍 Was ist pollinations.ai?\npollinations.ai ist eine Open-Source-KI-Plattform. Wir bieten eine einheitliche API für Bild, Text, Audio und Video. Alles ist offen: Code, Roadmap, Konversationen. Machen Sie mit!\n\nKeine Blackboxes. Keine Anbieterbindung. Nur eine freundliche API und ein Discord voller hilfsbereiter Menschen.",
                "levels_title": "## 📈 Erhöhen Sie Ihr Level",
                "levels_list": "Für Entwickler, die mit pollinations.ai erstellen. Steigen Sie auf, um täglich mehr Pollen zu verdienen.\n\n- 🦠 **Microbe** (0.1 Pollen/Tag) : Registrieren\n- 🍄 **Spore** (1 Pollen/Tag) : Automatische Verifizierung\n- 🌱 **Seed** (3 Pollen/Tag) : 8+ Dev Points\n- 🌸 **Flower** (10 Pollen/Tag) : Eine App veröffentlichen\n- 🍯 **Nectar** (20 Pollen/Tag) : Demnächst 🔮",
                "beta_note": "✨ *Wir sind in der Beta! Wir lernen, was am besten funktioniert.*",
                "pollen_title": "## 💎 Was ist Pollen?",
                "pollen_get": "Das Ausführen von KI-Modellen kostet Geld. Pollen ist unser Weg, Server am Laufen zu halten, ohne Werbung. Ein einfaches, einheitliches Guthaben für alle Modelle.\n\n**$1 ≈ 1 Pollen**. Sie geben es für API-Aufrufe aus.",
                "pollen_spend": "## 🛒 Wie bekommt man Pollen?\nSie können Pollen durch Teilnahme an der Community sammeln oder direkt im Dashboard kaufen."
            },
            "config": {
                "fallback_enter_role": "Haupt-Agentenmodell",
                "managed_auto": "Automatisch verwaltet"
            }
        }
    },
    it: {
        "commands": {
            "infos": {
                "title": "## 🍯💚 PLUGIN POLLINATIONS OPENCODE 💚🍯\n\nBenvenuto **{name}** nel plugin OpenCode di Pollinations!\n\nQuesto plugin ti consente di generare codice, immagini, analizzare video e interagire senza problemi con i migliori modelli di IA. Accedi agli LLM più avanzati tramite chat, refactoring o terminale.",
                "features_title": "**Cosa ti offre questo plugin! :**",
                "features_free": "**🛠️ Strumenti gratuiti integrati (Sempre disponibili):**\n- `gen_qrcode` / `gen_diagram` / `gen_palette` : Utility visive.\n- `remove_background` : Rimozione dello sfondo nativa.\n- `extract_frames` / `extract_audio` : Estrazione rapida dei media.\n- `file_to_url` : Hosting online istantaneo di file locali.",
                "features_pro": "**💎 Strumenti Pollinations (Premium - Automatizzato con Chiave):**\n- `polli_gen_image` : Gen immagine (Flux, Gemini) + Image-to-Image.\n- `polli_gen_video` : Text-to-Video / Image-to-Video (Veo, Wan...).\n- `polli_gen_audio`/`polli_stt` : Whisper STT, ElevenLabs TTS.\n- `polli_gen_music` : Motore di musica generativa.\n- `polli_web_search` : Ricerca web connessa.",
                "features_config": "- **Configurazione granulare**, gestione di modalità/token, protezioni costi...",
                "tiers_title": "> **I tuoi livelli:** {emoji} {tier}",
                "about": "## 🌍 Cos'è pollinations.ai?\npollinations.ai è una piattaforma IA open-source costruita per la community. Offriamo un'API per Immagini, Testo, Audio e Video. Tutto è aperto: codice, roadmap, conversazioni. Unisciti a noi!\n\nNessuna scatola nera. Nessun lock-in. Solo un'API amichevole.",
                "levels_title": "## 📈 Aumenta il tuo livello",
                "levels_list": "Per gli sviluppatori che creano con pollinations. Sali di livello per guadagnare più Pollen.\n\n- 🦠 **Microbe** (0.1 pollen/giorno) : Registrati\n- 🍄 **Spore** (1 pollen/giorno) : Verifica automatica\n- 🌱 **Seed** (3 pollen/giorno) : 8+ punti dev\n- 🌸 **Flower** (10 pollen/giorno) : Pubblica un'app\n- 🍯 **Nectar** (20 pollen/giorno) : Prossimamente 🔮",
                "beta_note": "✨ *Siamo in beta! Scopriamo cosa funziona meglio.*",
                "pollen_title": "## 💎 Cos'è il Pollen?",
                "pollen_get": "L'esecuzione di modelli costa denaro. Il Pollen è il nostro modo per mantenere attivi i server senza pubblicità o vendere dati. Un credito semplice e unificato per tutti i modelli.\n\n**$1 ≈ 1 Pollen**. Lo spendi per le chiamate API.",
                "pollen_spend": "## 🛒 Come ottenere Pollen?\nPuoi aggiungere Pollen partecipando alla community o acquistandolo direttamente dalla dashboard."
            },
            "config": {
                "fallback_enter_role": "Modello Agente principale",
                "managed_auto": "Gestito automaticamente"
            }
        }
    }
};

for (const lang of Object.keys(overrides)) {
    const file = path.join(srcDir, `${lang}.json`);
    if (fs.existsSync(file)) {
        let data = JSON.parse(fs.readFileSync(file, 'utf8'));

        // Merge infos safely
        if (!data.commands) data.commands = {};
        if (!data.commands.infos) data.commands.infos = {};
        Object.assign(data.commands.infos, overrides[lang].commands.infos);
        Object.assign(data.commands.config, overrides[lang].commands.config);

        fs.writeFileSync(file, JSON.stringify(data, null, 4));
        console.log(`Updated fully infos translations for ${lang}.json`);
    } else {
        console.warn(`File ${file} does not exist.`);
    }
}
