// Ajout des 3 nouveaux outils dans les locales (onboarding + /poll infos + trads)
const fs = require('fs');
const path = require('path');
const dir = '/home/fkomp/Bureau/oracle/opencode-pollinations-plugin/src/locales';

const TOOLS_FREE = [
  '- `object_remover` : Suppression d\u2019objets par prompt (gratuit, direct).',
  '- `image_upscaler` : Agrandissement 2x/4x (gratuit, direct).',
  '- `image_enhancer` : Am\u00e9lioration IA d\u2019image (gratuit, direct).',
].join('\n');

const TOOLS_INTRO = [
  '- `object_remover`',
  '- `image_upscaler`',
  '- `image_enhancer`',
].join('\n');

const LOCALE_KEYS = {
  object_remover: {
    file_not_found: '\u2757 File not found: {path}',
    no_result: '\u2757 No result received.',
    error: '\u2757 Error: {error}',
  },
  image_upscaler: {
    file_not_found: '\u2757 File not found: {path}',
    no_result: '\u2757 No result received.',
    error: '\u2757 Error: {error}',
  },
  image_enhancer: {
    file_not_found: '\u2757 File not found: {path}',
    no_result: '\u2757 No result received.',
    error: '\u2757 Error: {error}',
  },
};

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.json')) continue;
  const fp = path.join(dir, f);
  let content = fs.readFileSync(fp, 'utf-8');
  const data = JSON.parse(content);

  // 1. Ajouter les 3 outils dans features_free (apres gen_video_free)
  if (data.commands?.infos?.features_free) {
    data.commands.infos.features_free = data.commands.infos.features_free.replace(
      /(- `gen_video_free`[^\n]*)/,
      '$1\n' + TOOLS_FREE
    );
  }

  // 2. Ajouter les 3 outils dans tools_intro (connect_response)
  if (data.connect_response?.tools_intro) {
    data.connect_response.tools_intro = data.connect_response.tools_intro.replace(
      /(- `gen_video_free`[^\n]*)/,
      '$1\n' + TOOLS_INTRO
    );
  }

  // 3. Ajouter les key locales pour les nouveaux outils (fallback anglais)
  if (!data.tools) data.tools = {};
  for (const [tool, keys] of Object.entries(LOCALE_KEYS)) {
    if (!data.tools[tool]) data.tools[tool] = {};
    for (const [k, v] of Object.entries(keys)) {
      if (!data.tools[tool][k]) data.tools[tool][k] = v;
    }
  }

  // 4. Update remove_background description
  if (data.tools?.remove_background?.desc) {
    data.tools.remove_background.desc = data.tools.remove_background.desc.replace(
      /(free|gratuit|free).*$/,
      'free + rmbg (bgeraser.com by default)'
    );
  }

  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log('\u2705 ' + f);
}
