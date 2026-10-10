import { readFileSync, writeFileSync } from 'node:fs';
const templates = Object.fromEntries(['header', 'cta', 'footer'].map((name) => {
    const path = `components/${name}.html`;
    return [path, readFileSync(path, 'utf8')];
}));
writeFileSync('js/component-fallbacks.js', '// components/*.html から生成。手編集しない。\nwindow.SiteComponentTemplates = Object.freeze(' + JSON.stringify(templates) + ');\n');
