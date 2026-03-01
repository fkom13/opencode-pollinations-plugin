const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'locales');

const overrides = {
    es: {
        loading: "⏳ Cargando modelos...",
        free_title: "## 🕊️ Modelos Free Universe (text.pollinations.ai)",
        free_desc: "Estos modelos no requieren una clave API y son de acceso gratuito.",
        free_headers1: "| Nombre del Modelo | Alias | Descripción | Visión | Herramientas |",
        free_headers2: "|-------------------|-------|-------------|--------|--------------|",
        free_error: "⚠️ Error al obtener los modelos gratuitos.",
        enter_title: "## 💎 Modelos Enter Universe (gen.pollinations.ai)",
        cats: { image: "Imágenes", video: "Videos", audio: "Audio", text: "Texto & Chat" },
        enter_headers1: "| Nombre | ID | Descripción | Flags | In | Costo Out |",
        enter_headers2: "|--------|----|-------------|-------|----|-----------|",
        enter_error: "⚠️ Error al obtener los modelos de pago."
    },
    de: {
        loading: "⏳ Lade Modelle...",
        free_title: "## 🕊️ Free Universe Modelle (text.pollinations.ai)",
        free_desc: "Diese Modelle benötigen keinen API-Schlüssel und sind frei zugänglich.",
        free_headers1: "| Modellname | Alias | Beschreibung | Vision | Tools |",
        free_headers2: "|------------|-------|--------------|--------|-------|",
        free_error: "⚠️ Fehler beim Abrufen der kostenlosen Modelle.",
        enter_title: "## 💎 Enter Universe Modelle (gen.pollinations.ai)",
        cats: { image: "Bilder", video: "Videos", audio: "Audio", text: "Text & Chat" },
        enter_headers1: "| Name | ID | Beschreibung | Flags | In | Out-Kosten |",
        enter_headers2: "|------|----|--------------|-------|----|------------|",
        enter_error: "⚠️ Fehler beim Abrufen der Premium-Modelle."
    },
    it: {
        loading: "⏳ Caricamento modelli...",
        free_title: "## 🕊️ Modelli Free Universe (text.pollinations.ai)",
        free_desc: "Questi modelli non richiedono una chiave API e sono ad accesso libero.",
        free_headers1: "| Nome Modello | Alias | Descrizione | Visione | Strumenti |",
        free_headers2: "|--------------|-------|-------------|---------|-----------|",
        free_error: "⚠️ Errore durante il recupero dei modelli gratuiti.",
        enter_title: "## 💎 Modelli Enter Universe (gen.pollinations.ai)",
        cats: { image: "Immagini", video: "Video", audio: "Audio", text: "Testo e Chat" },
        enter_headers1: "| Nome | ID | Descrizione | Flags | In | Costo Out |",
        enter_headers2: "|------|----|-------------|-------|----|-----------|",
        enter_error: "⚠️ Errore durante il recupero dei modelli premium."
    }
};

for (const lang of ['es', 'de', 'it']) {
    const file = path.join(srcDir, `${lang}.json`);
    if (fs.existsSync(file)) {
        let data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (data.commands && data.commands.models) {
            Object.assign(data.commands.models, overrides[lang]);
        }
        fs.writeFileSync(file, JSON.stringify(data, null, 4));
        console.log(`Translated ES/DE/IT models headers for ${lang}`);
    }
}
