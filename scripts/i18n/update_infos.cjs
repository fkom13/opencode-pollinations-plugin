// Inject infos updates into all 6 locales
// Usage: node scripts/i18n/update_infos.cjs

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', '..', 'src', 'locales');
const LANG_FILES = ['en.json', 'fr.json', 'es.json', 'de.json', 'it.json', 'zh.json'];

const updates = {
    en: {
        "infos.tiers_title": "> **Your Quest Pollen refill:** {emoji} {tier}",
        "infos.get_started": "## 🔑 Getting Started\n\n**1.** Create a free account at enter.pollinations.ai\n**2.** Connect in 1 click: `/poll login`\n**3.** Or use a manual key: `/poll connect sk_...`\n\nType `/poll help` for all commands.",
        "infos.levels_title": "## 📈 Hourly Quest Pollen Refill",
        "infos.levels_list": "Your hourly refill depends on your contribution level. Quest Pollen accumulates and never expires (as long as your account stays active).\n\n{tier_table}\n\n> ⚠️ Refill is **hourly** (reset at :00). Daily total is an estimate (~24h × hourly rate).",
        "infos.pollen_spend": "## 🛒 How to get Pollen?\n1. 🎯 **Quests** — Complete tasks on the dashboard (`/poll quests`).\n2. 💳 **Buy** — By credit card at enter.pollinations.ai.\n3. 🌻 **Dev earnings** — Enable developer earnings on your App Key.",
        "infos.features_free": "**🛠️ Integrated Free Tools (Always Available):**\n- `gen_qrcode` / `gen_diagram` / `gen_palette` : Visuals and dev utilities.\n- `remove_background` : Native background removal.\n- `extract_frames` / `extract_audio` : Fast media extraction.\n- `file_to_url` : Instant online hosting of local files.\n- `gen_edit_image_free` : Free image gen & edit (~20/day).\n- `gen_video_free` : Free video gen (~5/day).",
    },
    fr: {
        "infos.tiers_title": "> **Votre refill Quest Pollen :** {emoji} {tier}",
        "infos.get_started": "## 🔑 Pour commencer\n\n**1.** Créez un compte gratuit sur enter.pollinations.ai\n**2.** Connectez-vous en 1 clic : `/poll login`\n**3.** Ou utilisez une clé manuelle : `/poll connect sk_...`\n\nTapez `/poll help` pour voir toutes les commandes.",
        "infos.levels_title": "## 📈 Refill Quest Pollen Horaire",
        "infos.levels_list": "Votre refill horaire dépend de votre niveau de contribution. Le Pollen de quête s'accumule et ne s'efface pas (tant que votre compte reste actif).\n\n{tier_table}\n\n> ⚠️ Le refill est **horaire** (reset à :00). Le total journalier est une estimation (~24h × taux horaire).",
        "infos.pollen_spend": "## 🛒 Comment obtenir du Pollen ?\n1. 🎯 **Quêtes** — Complétez des tâches sur le dashboard (`/poll quests`).\n2. 💳 **Acheter** — Par carte bancaire sur enter.pollinations.ai.\n3. 🌻 **Dev earnings** — Activez les revenus développeur sur votre App Key.",
        "infos.features_free": "**🛠️ Outils Gratuits Intégrés (Toujours disponibles) :**\n- `gen_qrcode` / `gen_diagram` / `gen_palette` : Outils visuels et dev.\n- `remove_background` : Détourage d'image natif.\n- `extract_frames` / `extract_audio` : Extraction rapide de contenu média.\n- `file_to_url` : Hébergement instantané de vos fichiers locaux en ligne.\n- `gen_edit_image_free` : Génération & édition d'images gratuite (~20/jour).\n- `gen_video_free` : Génération vidéo gratuite (~5/jour).",
    },
    es: {
        "infos.tiers_title": "> **Tu refill Quest Pollen:** {emoji} {tier}",
        "infos.get_started": "## 🔑 Para empezar\n\n**1.** Crea una cuenta gratis en enter.pollinations.ai\n**2.** Conéctate en 1 clic: `/poll login`\n**3.** O usa una clave manual: `/poll connect sk_...`\n\nEscribe `/poll help` para ver todos los comandos.",
        "infos.levels_title": "## 📈 Refill Quest Pollen por Hora",
        "infos.levels_list": "Tu refill por hora depende de tu nivel de contribución. El Quest Pollen se acumula y no expira (mientras tu cuenta esté activa).\n\n{tier_table}\n\n> ⚠️ El refill es **por hora** (reset a :00). El total diario es una estimación (~24h × tasa horaria).",
        "infos.pollen_spend": "## 🛒 ¿Cómo obtener Pollen?\n1. 🎯 **Quests** — Completa tareas en el dashboard (`/poll quests`).\n2. 💳 **Comprar** — Con tarjeta en enter.pollinations.ai.\n3. 🌻 **Dev earnings** — Activa ganancias de desarrollador en tu App Key.",
        "infos.features_free": "**🛠️ Herramientas Gratuitas (Siempre Disponibles):**\n- `gen_qrcode` / `gen_diagram` / `gen_palette` : Visuales y utilidades.\n- `remove_background` : Eliminación de fondo nativa.\n- `extract_frames` / `extract_audio` : Extracción rápida de medios.\n- `file_to_url` : Alojamiento online instantáneo.\n- `gen_edit_image_free` : Gen y edición de imágenes gratis (~20/día).\n- `gen_video_free` : Gen de video gratis (~5/día).",
    },
    de: {
        "infos.tiers_title": "> **Dein Quest Pollen Refill:** {emoji} {tier}",
        "infos.get_started": "## 🔑 Los geht's\n\n**1.** Erstelle ein kostenloses Konto auf enter.pollinations.ai\n**2.** Verbinde dich mit 1 Klick: `/poll login`\n**3.** Oder verwende einen manuellen Key: `/poll connect sk_...`\n\nGib `/poll help` ein für alle Befehle.",
        "infos.levels_title": "## 📈 Stündlicher Quest Pollen Refill",
        "infos.levels_list": "Dein stündlicher Refill hängt von deinem Beitragslevel ab. Quest Pollen sammelt sich an und verfällt nie (solange dein Konto aktiv bleibt).\n\n{tier_table}\n\n> ⚠️ Der Refill erfolgt **stündlich** (Reset um :00). Die Tagessumme ist eine Schätzung (~24h × Stundensatz).",
        "infos.pollen_spend": "## 🛒 Wie bekomme ich Pollen?\n1. 🎯 **Quests** — Erledige Aufgaben im Dashboard (`/poll quests`).\n2. 💳 **Kaufen** — Per Kreditkarte auf enter.pollinations.ai.\n3. 🌻 **Dev Earnings** — Aktiviere Entwickler-Einnahmen auf deinem App Key.",
        "infos.features_free": "**🛠️ Kostenlose Tools (Immer verfügbar):**\n- `gen_qrcode` / `gen_diagram` / `gen_palette` : Visuals und Dev-Tools.\n- `remove_background` : Hintergrundentfernung.\n- `extract_frames` / `extract_audio` : Medien-Extraktion.\n- `file_to_url` : Online-Hosting.\n- `gen_edit_image_free` : Kostenlose Bild-Generierung & Bearbeitung (~20/Tag).\n- `gen_video_free` : Kostenlose Video-Generierung (~5/Tag).",
    },
    it: {
        "infos.tiers_title": "> **Il tuo refill Quest Pollen:** {emoji} {tier}",
        "infos.get_started": "## 🔑 Per iniziare\n\n**1.** Crea un account gratuito su enter.pollinations.ai\n**2.** Connettiti in 1 clic: `/poll login`\n**3.** Oppure usa una chiave manuale: `/poll connect sk_...`\n\nDigita `/poll help` per tutti i comandi.",
        "infos.levels_title": "## 📈 Refill Quest Pollen Orario",
        "infos.levels_list": "Il tuo refill orario dipende dal tuo livello di contributo. Il Quest Pollen si accumula e non scade (finché il tuo account resta attivo).\n\n{tier_table}\n\n> ⚠️ Il refill è **orario** (reset alle :00). Il totale giornaliero è una stima (~24h × tariffa oraria).",
        "infos.pollen_spend": "## 🛒 Come ottenere Pollen?\n1. 🎯 **Quests** — Completa attività sulla dashboard (`/poll quests`).\n2. 💳 **Acquista** — Con carta su enter.pollinations.ai.\n3. 🌻 **Dev earnings** — Attiva i guadagni sviluppatore sulla tua App Key.",
        "infos.features_free": "**🛠️ Strumenti Gratuiti (Sempre Disponibili):**\n- `gen_qrcode` / `gen_diagram` / `gen_palette` : Visual e dev.\n- `remove_background` : Rimozione sfondo nativa.\n- `extract_frames` / `extract_audio` : Estrazione media rapida.\n- `file_to_url` : Hosting online istantaneo.\n- `gen_edit_image_free` : Gen e modifica immagini gratis (~20/giorno).\n- `gen_video_free` : Gen video gratis (~5/giorno).",
    },
    zh: {
        "infos.tiers_title": "> **你的 Quest Pollen 补充:** {emoji} {tier}",
        "infos.get_started": "## 🔑 开始使用\n\n**1.** 在 enter.pollinations.ai 创建免费账户\n**2.** 一键连接: `/poll login`\n**3.** 或使用手动密钥: `/poll connect sk_...`\n\n输入 `/poll help` 查看所有命令。",
        "infos.levels_title": "## 📈 每小时 Quest Pollen 补充",
        "infos.levels_list": "你的每小时补充取决于你的贡献等级。Quest Pollen 会累积且永不过期（只要你的账户保持活跃）。\n\n{tier_table}\n\n> ⚠️ 补充是 **每小时** 的（在 :00 重置）。每日总量是估算值（~24h × 每小时速率）。",
        "infos.pollen_spend": "## 🛒 如何获取 Pollen？\n1. 🎯 **任务** — 在 dashboard 完成任务 (`/poll quests`)。\n2. 💳 **购买** — 在 enter.pollinations.ai 用信用卡购买。\n3. 🌻 **开发者收益** — 在你的 App Key 上启用开发者收益。",
        "infos.features_free": "**🛠️ 免费工具 (始终可用):**\n- `gen_qrcode` / `gen_diagram` / `gen_palette` : 视觉和开发工具。\n- `remove_background` : 原生背景移除。\n- `extract_frames` / `extract_audio` : 快速媒体提取。\n- `file_to_url` : 即时在线托管。\n- `gen_edit_image_free` : 免费图像生成和编辑 (~20/天)。\n- `gen_video_free` : 免费视频生成 (~5/天)。",
    }
};

for (const lang of LANG_FILES) {
    const langKey = lang.replace('.json', '');
    const filePath = path.join(localesDir, lang);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const langUpdates = updates[langKey];
    if (!langUpdates) continue;

    for (const [key, value] of Object.entries(langUpdates)) {
        const parts = key.split('.');
        let obj = data;
        for (let i = 0; i < parts.length - 1; i++) {
            obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = value;
    }

    // Also update connect_response.resources link
    if (data.connect_response?.resources) {
        data.connect_response.resources = data.connect_response.resources
            .replace('https://pollinations.ai/topup', 'https://enter.pollinations.ai')
            .replace('Top-Up Balance', 'Dashboard')
            .replace('Recharger le Wallet', 'Dashboard')
            .replace('Recargar saldo', 'Dashboard')
            .replace('Recharge Balance', 'Dashboard')
            .replace('Top-Up Wallet', 'Dashboard')
            .replace('充值钱包', 'Dashboard')
            .replace('充值余额', 'Dashboard');
    }

    // Remove beta_note if it exists
    if (data.commands?.infos?.beta_note) {
        delete data.commands.infos.beta_note;
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    console.log(`✅ ${lang} — infos updated`);
}