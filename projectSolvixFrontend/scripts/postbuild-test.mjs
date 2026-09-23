import fs from 'node:fs';
import path from 'node:path';

const browserDir = path.resolve('dist/projectSolarFishFrontend/browser');
const indexFile = path.join(browserDir, 'index.html');

if (!fs.existsSync(indexFile)) {
  throw new Error('No se encontró dist/projectSolarFishFrontend/browser/index.html tras el build de TEST.');
}

const jsFiles = ['main.js', 'polyfills.js', 'styles.css'];
for (const file of jsFiles) {
  const candidate = path.join(browserDir, file);
  if (!fs.existsSync(candidate)) {
    throw new Error(`Falta el artefacto requerido de la build TEST: ${file}`);
  }
}

const chunks = fs.readdirSync(browserDir).filter((name) => /^chunk-.*\.js$/.test(name));
if (chunks.length === 0) {
  throw new Error('La build TEST no generó chunks Angular.');
}

const content = fs.readFileSync(indexFile, 'utf8');
const hasMain = /<script[^>]+src="main\.js"/i.test(content);
const hasPolyfills = /<script[^>]+src="polyfills\.js"/i.test(content);
const hasStyles = /<link[^>]+href="styles\.css"/i.test(content);

if (!hasMain || !hasPolyfills || !hasStyles) {
  throw new Error('El index.html generado por Angular no referencia los assets requeridos del build de TEST.');
}

const html = fs.readFileSync(indexFile, 'utf8');
const cacheBlock = `
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
`;

if (!/meta http-equiv="Cache-Control"/i.test(html)) {
  const updated = html.replace('</head>', `${cacheBlock}</head>`);
  fs.writeFileSync(indexFile, updated);
}

const htaccess = `# Cache policy for TEST frontend
# HTML must always be revalidated
<IfModule mod_headers.c>\n  <FilesMatch "^index\\.html$">\n    Header set Cache-Control "no-cache, no-store, must-revalidate"\n    Header set Pragma "no-cache"\n    Header set Expires "0"\n  </FilesMatch>\n\n  <FilesMatch "\\.(js|css)$">\n    Header set Cache-Control "public, max-age=31536000, immutable"\n  </FilesMatch>\n\n  <FilesMatch "\\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$">\n    Header set Cache-Control "public, max-age=31536000, immutable"\n  </FilesMatch>\n</IfModule>\n`;
fs.writeFileSync(path.join(browserDir, '.htaccess'), htaccess, 'utf8');
