const fs = require('fs');
const path = require('path');
const srcDir = path.join(__dirname, 'src', 'locales');

const overrides = {
    es: {
        "commands": {
            "config": {
                "title": "## ⚙️ Configuración de Pollinations (v{version})",
                "alias_note": "*Puedes usar `/pollinations` o su alias `/poll` para todos estos comandos.*",
                "intro": "Este es el estado actual de tu configuración local.",
                "table_headers": "| Parámetro | Valor Actual | Función | Comando |",
                "table_divider": "|-----------|--------------|---------|---------|",
                "api_key_role": "Tu clave API secreta (BYOK)",
                "mode_role": "Modo de acceso",
                "enablePaidTools_role": "Seguridad: Desactivar herramientas de pago",
                "costConfirmationRequired_role": "Pedir confirmación si excede umbral",
                "costThreshold_role": "Umbral de alerta de costo de herramientas",
                "cost_estimator_role": "Mostrar estimaciones de costo en Toasts",
                "fallback_main_role": "Modelo de chat de respaldo (universo gratis)",
                "fallback_agent_role": "Modelo de agente de respaldo (universo gratis)",
                "fallback_enter_role": "Modelo principal de Agente (free/* o enter/*)",
                "managed_auto": "Gestionado automáticamente",
                "status_gui_role": "Notificaciones de estado",
                "logs_gui_role": "Verbosidad de registros",
                "threshold_tier_role": "Límite diario gratuito de alerta",
                "threshold_wallet_role": "Alerta Billetera Premium baja",
                "status_bar_role": "Mostrar ícono en la barra",
                "lang_role": "Idioma del Plugin",
                "not_configured": "No configurado"
            },
            "usage": {
                "title": "## 📊 Estadísticas Pollinations (Modo: {mode})\n\n",
                "resources": "### 🌻 Recursos Base\n",
                "tier": "- **Nivel:** {emoji} {tier} (Límite: {limit} 🌻)\n",
                "quota": "- **Período:** {remaining} gastado / {limit} total\n",
                "usage_bar": "- **Uso:** {bar}\n",
                "wallet": "- **Billetera:** {balance} 🌻 restantes\n\n",
                "reset": "### 🕒 Tiempo de recarga\n- **Próximo reinicio:** {date} (en {duration})\n\n",
                "restricted_key": "⚠️ Clave API restringida. Detalles no disponibles.\n",
                "period_detail": "### 📈 Detalle del período (desde {time})\n",
                "total_reqs": "- **Solicitudes:** {reqs} ({inTok} in | {outTok} out)\n\n",
                "table_head1": "| Modelo | Solics | Costo | Tokens |\n",
                "table_head2": "|--------|--------|-------|--------|\n",
                "no_history": "*Sin actividad en el período actual.*\n",
                "full_requires_key": "⚠️ `/poll usage full` requiere una clave API conectada.\n",
                "hint_full": "💡 Usa `/poll usage full` para ver detalles (requiere clave)."
            },
            "generic": {
                "add_key_hint": "💡 Usa /poll connect <key> para agregar una clave API.",
                "unknown_command": "❌ Comando desconocido: {cmd}",
                "tui_error": "Error de comando: {error}",
                "tui_critical": "Error crítico: {error}",
                "tui_usage_msg": "Uso de Pollinations actualizado."
            }
        },
        "connect_response": {
            "title_key": "## 🍯💚 PLUGIN POLLINATIONS CONECTADO 💚🍯\n\n¡Bienvenido **{name}** al plugin de Pollinations Agent!\n**Modo actual**: `{mode}`",
            "tools_intro": "### 🚀 Herramientas Multimedia Integradas\n\nEste plugin te permite generar código, imágenes, analizar videos e interactuar con los mejores modelos de IA sin problemas. Accede a los LLM más avanzados a través del chat, reestructuración o terminal.\n\n**Lo que este plugin trae para ti:**\n\n**🛠️ Herramientas gratuitas (Siempre Disponibles):**\n- `gen_qrcode` / `gen_diagram` / `gen_palette`\n- `remove_background`\n- `extract_frames` / `extract_audio`\n- `file_to_url`\n\n**💎 Herramientas Pollinations (Premium):**\n- `polli_gen_image`\n- `polli_gen_video`\n- `polli_gen_audio`/`polli_stt`\n- `polli_gen_music`\n- `polli_web_search`",
            "terminal_cmds": "### 💻 Comandos de Terminal\nUsa `/poll help` para ver todos los comandos. Prueba `/poll models` para descubrir el catálogo o `/poll usage` para seguir tu consumo de pollen.",
            "resources": "### 📚 Recursos\n* **Sitio Web:** [pollinations.ai](https://pollinations.ai)\n* **Discord:** [Únete a la comunidad](https://discord.gg/8HqSRhJVmK)\n* **Recargar saldo:** [Comprar Pollen](https://pollinations.ai/topup)",
            "free_models_success": "Modelos gratuitos disponibles: {models}",
            "free_models_error": "⚠️ No se pudieron obtener los modelos gratuitos.",
            "onboarding": "## 🕊️ Bienvenido al Free Universe de Pollinations\n\nEstás operando en modo `manual` sin una clave API. Tienes acceso a herramientas gratuitas integradas y modelos de texto básicos.\n\n{freeText}\n\n### 💎 Actualiza al Universo Profesional (Enter)\nDesbloquea más de 200 modelos (O1, Claude 3.5, Midjourney, Video, Audio...).\n\n1. Consigue tu clave API en [Pollinations.ai](https://pollinations.ai)\n2. Conéctate con el terminal: `/poll connect <TU_CLAVE>`\n\n🔗 *¿Necesitas ayuda? Escribe `/poll help`*"
        }
    },
    de: {
        "commands": {
            "config": {
                "title": "## ⚙️ Pollinations Konfiguration (v{version})",
                "alias_note": "*Sie können `/pollinations` oder `/poll` für diese Befehle verwenden.*",
                "intro": "Hier ist der aktuelle Status Ihrer Konfiguration.",
                "table_headers": "| Parameter | Aktueller Wert | Funktion | Befehl |",
                "table_divider": "|-----------|----------------|----------|--------|",
                "api_key_role": "Dein geheimer API-Schlüssel (BYOK)",
                "mode_role": "Zugriffsmodus",
                "enablePaidTools_role": "Sicherheit: Kostenpflichtige Tools",
                "costConfirmationRequired_role": "Bestätigung bei Schwellenwert",
                "costThreshold_role": "Tool-Warnschwellenwert",
                "cost_estimator_role": "Kosten in Ausgaben anzeigen",
                "fallback_main_role": "Chat-Fallback-Modell",
                "fallback_agent_role": "Agent-Fallback-Modell",
                "fallback_enter_role": "Haupt-Agentenmodell",
                "managed_auto": "Automatisch verwaltet",
                "status_gui_role": "Statusbenachrichtigungen",
                "logs_gui_role": "Protokoll",
                "threshold_tier_role": "Tägliches Limit Warnung",
                "threshold_wallet_role": "Niedriges Premium-Wallet",
                "status_bar_role": "Symbol in der Leiste",
                "lang_role": "Plugin-Sprache",
                "not_configured": "Nicht konfiguriert"
            },
            "usage": {
                "title": "## 📊 Pollinations Stats (Modus: {mode})\n\n",
                "resources": "### 🌻 Ressourcen\n",
                "tier": "- **Stufe:** {emoji} {tier} (Limit: {limit} 🌻)\n",
                "quota": "- **Verbraucht:** {remaining} von {limit}\n",
                "usage_bar": "- **Nutzung:** {bar}\n",
                "wallet": "- **Brieftasche:** {balance} 🌻 übrig\n\n",
                "reset": "### 🕒 Zurücksetzen\n- **Nächster Reset:** {date} (in {duration})\n\n",
                "restricted_key": "⚠️ API-Schlüssel eingeschränkt. Keine Details verfügbar.\n",
                "period_detail": "### 📈 Zeitraum (seit {time})\n",
                "total_reqs": "- **Anfragen:** {reqs} ({inTok} in | {outTok} out)\n\n",
                "table_head1": "| Modell | Anfr. | Kosten | Tokens |\n",
                "table_head2": "|--------|-------|--------|--------|\n",
                "no_history": "*Keine Aktivität in diesem Zeitraum.*\n",
                "full_requires_key": "⚠️ `/poll usage full` erfordert einen API-Schlüssel.\n",
                "hint_full": "💡 Verwenden Sie `/poll usage full` für Details."
            },
            "generic": {
                "add_key_hint": "💡 Verwenden Sie /poll connect <key>, um einen API-Schlüssel hinzuzufügen.",
                "unknown_command": "❌ Unbekannter Befehl: {cmd}",
                "tui_error": "Befehlsfehler: {error}",
                "tui_critical": "Kritischer Fehler: {error}",
                "tui_usage_msg": "Pollinations-Nutzung aktualisiert."
            }
        },
        "connect_response": {
            "title_key": "## 🍯💚 POLLINATIONS PLUGIN VERBUNDEN 💚🍯\n\nWillkommen **{name}** beim Pollinations Agent Plugin!\n**Aktueller Modus**: `{mode}`",
            "tools_intro": "### 🚀 Multimedia Tools\n\nDieses Plugin ermöglicht es, Code und Bilder zu generieren, Videos zu analysieren und mit den besten KI-Modellen zu interagieren.\n\n**🛠️ Kostenlose Tools:**\n- `gen_qrcode` / `gen_diagram` / `gen_palette`\n- `remove_background`\n- `extract_frames` / `extract_audio`\n- `file_to_url`\n\n**💎 Premium Tools:**\n- `polli_gen_image`\n- `polli_gen_video`\n- `polli_gen_audio`/`polli_stt`\n- `polli_gen_music`\n- `polli_web_search`",
            "terminal_cmds": "### 💻 Terminal Befehle\nVerwenden Sie `/poll help` um alle Befehle anzuzeigen.",
            "resources": "### 📚 Links\n* **Website:** [pollinations.ai](https://pollinations.ai)\n* **Discord:** [Treten Sie der Community bei](https://discord.gg/8HqSRhJVmK)",
            "free_models_success": "Verfügbare Modelle: {models}",
            "free_models_error": "⚠️ Modelle konnten nicht abgerufen werden.",
            "onboarding": "## 🕊️ Willkommen im Free Universe\n\nSie arbeiten im `manual` Modus ohne API-Schlüssel.\n\n{freeText}\n\n### 💎 Upgrade auf Enter Universe\nSchalten Sie über 200 Modelle frei.\n\n1. Holen Sie sich Ihren API-Schlüssel auf [Pollinations.ai](https://pollinations.ai)\n2. Verbinden: `/poll connect <YOUR_KEY>`"
        }
    },
    it: {
        "commands": {
            "config": {
                "title": "## ⚙️ Configurazione Pollinations (v{version})",
                "alias_note": "*Puoi usare `/pollinations` o `/poll` per questi comandi.*",
                "intro": "Ecco lo stato attuale della tua configurazione.",
                "table_headers": "| Parametro | Valore Attuale | Ruolo | Comando |",
                "table_divider": "|-----------|----------------|-------|--------|",
                "api_key_role": "La tua chiave API (BYOK)",
                "mode_role": "Modalità di accesso",
                "enablePaidTools_role": "Sicurezza: Strumenti a pagamento",
                "costConfirmationRequired_role": "Conferma alla soglia superata",
                "costThreshold_role": "Soglia di allerta costi",
                "cost_estimator_role": "Mostra costi nelle stime",
                "fallback_main_role": "Modello di chat di fallback",
                "fallback_agent_role": "Modello di agente di fallback",
                "fallback_enter_role": "Modello Agente principale",
                "managed_auto": "Gestito automaticamente",
                "status_gui_role": "Notifiche di stato",
                "logs_gui_role": "Livello di log",
                "threshold_tier_role": "Allerta limite giornaliero",
                "threshold_wallet_role": "Allerta Premium Wallet",
                "status_bar_role": "Mostra icona nella barra",
                "lang_role": "Lingua del plugin",
                "not_configured": "Non configurato"
            },
            "usage": {
                "title": "## 📊 Statistiche Pollinations (Modalità: {mode})\n\n",
                "resources": "### 🌻 Risorse Base\n",
                "tier": "- **Livello:** {emoji} {tier} (Limite: {limit} 🌻)\n",
                "quota": "- **Utilizzo:** {remaining} consumati su {limit}\n",
                "usage_bar": "- **Utilizzo:** {bar}\n",
                "wallet": "- **Portafoglio:** {balance} 🌻 rimasti\n\n",
                "reset": "### 🕒 Ripristino\n- **Prossimo reset:** {date} (in {duration})\n\n",
                "restricted_key": "⚠️ Chiave limitata. Dettagli non disponibili.\n",
                "period_detail": "### 📈 Dettagli periodo (dal {time})\n",
                "total_reqs": "- **Richieste:** {reqs} ({inTok} in | {outTok} out)\n\n",
                "table_head1": "| Modello | Rich. | Costo | Token |\n",
                "table_head2": "|---------|-------|-------|-------|\n",
                "no_history": "*Nessuna attività in questo periodo.*\n",
                "full_requires_key": "⚠️ `/poll usage full` richiede una chiave API.\n",
                "hint_full": "💡 Usa `/poll usage full` per i dettagli."
            },
            "generic": {
                "add_key_hint": "💡 Usa /poll connect <key> per aggiungere una chiave API.",
                "unknown_command": "❌ Comando sconosciuto: {cmd}",
                "tui_error": "Errore: {error}",
                "tui_critical": "Errore critico: {error}",
                "tui_usage_msg": "Utilizzo di Pollinations aggiornato."
            }
        },
        "connect_response": {
            "title_key": "## 🍯💚 PLUGIN POLLINATIONS CONNESSO 💚🍯\n\nBenvenuto **{name}** al plugin Pollinations Agent!\n**Modalità attuale**: `{mode}`",
            "tools_intro": "### 🚀 Strumenti Multimediali\n\nQuesto plugin ti permette di generare codice, immagini, analizzare video.\n\n**🛠️ Strumenti Gratuiti:**\n- `gen_qrcode` / `gen_diagram` / `gen_palette`\n- `remove_background`\n- `extract_frames` / `extract_audio`\n- `file_to_url`\n\n**💎 Strumenti Premium:**\n- `polli_gen_image`\n- `polli_gen_video`\n- `polli_gen_audio`/`polli_stt`\n- `polli_gen_music`\n- `polli_web_search`",
            "terminal_cmds": "### 💻 Comandi del Terminale\nUsa `/poll help` per visualizzare tutti i comandi disponibili.",
            "resources": "### 📚 Link Útili\n* **Sito:** [pollinations.ai](https://pollinations.ai)\n* **Discord:** [Unisciti alla Community](https://discord.gg/8HqSRhJVmK)",
            "free_models_success": "Modelli disponibili: {models}",
            "free_models_error": "⚠️ Impossibile recuperare i modelli gratuiti.",
            "onboarding": "## 🕊️ Benvenuto in Free Universe\n\nStai usando la modalità `manual` senza chiave API.\n\n{freeText}\n\n### 💎 Passa al livello Pro\nSblocca oltre 200 modelli premium.\n\n1. Ottieni la tua API key su [Pollinations.ai](https://pollinations.ai)\n2. Connettila: `/poll connect <LA_TUA_CHIAVE>`"
        }
    }
};

for (const lang of Object.keys(overrides)) {
    const file = path.join(srcDir, `${lang}.json`);
    if (fs.existsSync(file)) {
        let data = JSON.parse(fs.readFileSync(file, 'utf8'));

        // Merge commands safely
        if (!data.commands) data.commands = {};
        Object.assign(data.commands.config, overrides[lang].commands.config);
        Object.assign(data.commands.usage, overrides[lang].commands.usage);
        Object.assign(data.commands.generic, overrides[lang].commands.generic);

        // Merge connect_response safely
        if (!data.connect_response) data.connect_response = {};
        Object.assign(data.connect_response, overrides[lang].connect_response);

        fs.writeFileSync(file, JSON.stringify(data, null, 4));
        console.log(`Updated fully ${lang}.json translations`);
    } else {
        console.warn(`File ${file} does not exist.`);
    }
}
