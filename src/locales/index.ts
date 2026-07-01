import en from './en.json' with { type: 'json' };
import fr from './fr.json' with { type: 'json' };
import es from './es.json' with { type: 'json' };
import de from './de.json' with { type: 'json' };
import it from './it.json' with { type: 'json' };
import zh from './zh.json' with { type: 'json' };
import { loadConfig } from '../server/config.js';

type TranslationDictionary = Record<string, any>;

const dictionaries: Record<string, TranslationDictionary> = {
    en,
    fr,
    es,
    de,
    it,
    zh
};

export function t(keyPath: string, params?: Record<string, string | number>): string {
    const config = loadConfig();
    const lang = config.lang || 'en';

    // Fallback to English if the dictionary is missing
    const dict = dictionaries[lang] || dictionaries['en'];
    let result = getNestedValue(dict, keyPath);

    // Fallback to English if the specific key is missing in the chosen language
    if (result === keyPath && lang !== 'en') {
        result = getNestedValue(dictionaries['en'], keyPath);
    }

    if (typeof result !== 'string') {
        return keyPath; // Return the path itself if no string is found
    }

    if (params) {
        for (const [key, value] of Object.entries(params)) {
            const regex = new RegExp(`{${key}}`, 'g');
            result = result.replace(regex, String(value));
        }
    }

    return result;
}

function getNestedValue(obj: TranslationDictionary, path: string): any {
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : path, obj);
}
