// Inject commands.help.config.* keys into all 6 locales
// Usage: node scripts/i18n/inject_help_config.cjs

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', '..', 'src', 'locales');
const LANG_FILES = ['en.json', 'fr.json', 'es.json', 'de.json', 'it.json', 'zh.json'];

const HELP_CONFIG_EN = {
    "configuration_intro": "**Configuration**\n- **`/poll config [key] [value]`**:",
    "config": {
        "lang": "Plugin language",
        "status_gui": "Status toasts verbosity",
        "logs_gui": "Log verbosity",
        "threshold_tier": "Free tier alert threshold (%)",
        "threshold_wallet": "Wallet alert threshold (%)",
        "status_bar": "Show status bar icon",
        "cost_estimator": "Show cost estimates",
        "enablePaidTools": "Wallet protection (block paid tools)",
        "costThreshold": "Cost alert threshold",
        "costConfirmationRequired": "Ask confirmation before spending",
        "refillOverride": "Manual Quest Pollen refill",
        "questStashInFreeMode": "Count quest stash as free in alwaysfree"
    }
};

const HELP_CONFIG_FR = {
    "configuration_intro": "**Configuration**\n- **`/poll config [clé] [valeur]`**:",
    "config": {
        "lang": "Langue du plugin",
        "status_gui": "Verbosité des toasts",
        "logs_gui": "Verbosité des logs",
        "threshold_tier": "Seuil d'alerte tier gratuit (%)",
        "threshold_wallet": "Seuil d'alerte wallet (%)",
        "status_bar": "Afficher l'icône dans la barre",
        "cost_estimator": "Afficher les coûts estimés",
        "enablePaidTools": "Protection wallet (bloque outils payants)",
        "costThreshold": "Seuil d'alerte coût",
        "costConfirmationRequired": "Demander confirmation avant dépense",
        "refillOverride": "Refill Quest Pollen manuel",
        "questStashInFreeMode": "Compter le stash Quest comme free dans alwaysfree"
    }
};

const HELP_CONFIG_ES = {
    "configuration_intro": "**Configuración**\n- **`/poll config [clave] [valor]`**:",
    "config": {
        "lang": "Idioma del plugin",
        "status_gui": "Verbosidad de notificaciones",
        "logs_gui": "Verbosidad de logs",
        "threshold_tier": "Umbral de alerta tier gratis (%)",
        "threshold_wallet": "Umbral de alerta wallet (%)",
        "status_bar": "Mostrar icono en barra",
        "cost_estimator": "Mostrar costes estimados",
        "enablePaidTools": "Protección wallet (bloquea herramientas de pago)",
        "costThreshold": "Umbral de alerta de coste",
        "costConfirmationRequired": "Pedir confirmación antes de gastar",
        "refillOverride": "Refill manual de Quest Pollen",
        "questStashInFreeMode": "Contar stash Quest como free en alwaysfree"
    }
};

const HELP_CONFIG_DE = {
    "configuration_intro": "**Konfiguration**\n- **`/poll config [schlüssel] [wert]`**:",
    "config": {
        "lang": "Plugin-Sprache",
        "status_gui": "Toast-Ausführlichkeit",
        "logs_gui": "Log-Ausführlichkeit",
        "threshold_tier": "Free-Tier-Warnschwelle (%)",
        "threshold_wallet": "Wallet-Warnschwelle (%)",
        "status_bar": "Statusleisten-Symbol anzeigen",
        "cost_estimator": "Kostenschätzungen anzeigen",
        "enablePaidTools": "Wallet-Schutz (kostenpflichtige Tools blockieren)",
        "costThreshold": "Kosten-Warnschwelle",
        "costConfirmationRequired": "Bestätigung vor Ausgaben anfordern",
        "refillOverride": "Manueller Quest Pollen Refill",
        "questStashInFreeMode": "Quest-Stash als Free in alwaysfree zählen"
    }
};

const HELP_CONFIG_IT = {
    "configuration_intro": "**Configurazione**\n- **`/poll config [chiave] [valore]`**:",
    "config": {
        "lang": "Lingua del plugin",
        "status_gui": "Verbosità notifiche",
        "logs_gui": "Verbosità log",
        "threshold_tier": "Soglia di avviso tier gratuito (%)",
        "threshold_wallet": "Soglia di avviso wallet (%)",
        "status_bar": "Mostra icona nella barra",
        "cost_estimator": "Mostra stime dei costi",
        "enablePaidTools": "Protezione wallet (blocca strumenti a pagamento)",
        "costThreshold": "Soglia di avviso costo",
        "costConfirmationRequired": "Chiedi conferma prima di spendere",
        "refillOverride": "Refill manuale Quest Pollen",
        "questStashInFreeMode": "Conta stash Quest come free in alwaysfree"
    }
};

const HELP_CONFIG_ZH = {
    "configuration_intro": "**配置**\n- **`/poll config [键] [值]`**:",
    "config": {
        "lang": "插件语言",
        "status_gui": "状态通知详细程度",
        "logs_gui": "日志详细程度",
        "threshold_tier": "免费层级警告阈值 (%)",
        "threshold_wallet": "钱包警告阈值 (%)",
        "status_bar": "显示状态栏图标",
        "cost_estimator": "显示费用估算",
        "enablePaidTools": "钱包保护（阻止付费工具）",
        "costThreshold": "费用警告阈值",
        "costConfirmationRequired": "消费前请求确认",
        "refillOverride": "手动 Quest Pollen 补充",
        "questStashInFreeMode": "在 alwaysfree 中计算 Quest 储备"
    }
};

const TRANSLATIONS = {
    en: HELP_CONFIG_EN,
    fr: HELP_CONFIG_FR,
    es: HELP_CONFIG_ES,
    de: HELP_CONFIG_DE,
    it: HELP_CONFIG_IT,
    zh: HELP_CONFIG_ZH
};

for (const lang of LANG_FILES) {
    const langKey = lang.replace('.json', '');
    const filePath = path.join(localesDir, lang);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const trans = TRANSLATIONS[langKey] || HELP_CONFIG_EN;
    data.commands.help = { ...data.commands.help, ...trans };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    console.log(`✅ ${lang} — help.config.* keys injected`);
}