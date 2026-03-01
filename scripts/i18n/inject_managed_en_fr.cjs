const fs = require('fs');
const path = require('path');
const srcDir = path.join(__dirname, 'src', 'locales');

for (const lang of ['en', 'fr']) {
    const file = path.join(srcDir, `${lang}.json`);
    if (fs.existsSync(file)) {
        let data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (data.commands && data.commands.config) {
            data.commands.config.managed_auto = lang === 'fr' ? 'Géré automatiquement' : 'Managed automatically';
            fs.writeFileSync(file, JSON.stringify(data, null, 4));
            console.log(`Added managed_auto for ${lang}.json`);
        }
    }
}
