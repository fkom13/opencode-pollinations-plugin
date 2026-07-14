// Add 3 new free tools to onboarding + /poll infos in all 6 locales
const fs = require('fs');
const path = require('path');
const localesDir = path.join(__dirname, '..', '..', 'src', 'locales');
const files = ['en.json', 'fr.json', 'es.json', 'de.json', 'it.json', 'zh.json'];

const TOOLS_LINE = '\n- `object_remover` (suppression d\'objets)\n- `image_upscaler` (agrandissement 2x/4x)\n- `image_enhancer` (amélioration IA)';

for (const f of files) {
  const fp = path.join(localesDir, f);
  let data = fs.readFileSync(fp, 'utf-8');
  // Add to features_free (after gen_video_free line)
  data = data.replace(/(`gen_video_free`[^`]+)/, '$1' + TOOLS_LINES);
  // Add to tools_intro in connect_response
  data = data.replace(/(- `gen_video_free`[^`]+)/, '$1\n- `object_remover`\n- `image_upscaler`\n- `image_enhancer`');
  fs.writeFileSync(fp, data, 'utf-8');
  console.log('✅', f);
}
