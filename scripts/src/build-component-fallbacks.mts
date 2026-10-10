import { readFileSync, writeFileSync } from 'node:fs';
const templates: Record<string, string> = Object.fromEntries<string>(['header', 'cta', 'footer'].map((name): [string, string] => {
 const path = `components/${name}.html`;
 return [path, readFileSync(path, 'utf8')];
}));
writeFileSync('js/component-fallbacks.js', '// components/*.html から生成。手編集しない。\nwindow.SiteComponentTemplates = Object.freeze(' + JSON.stringify(templates) + ');\n');
