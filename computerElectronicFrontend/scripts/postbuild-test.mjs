import fs from 'node:fs';
import path from 'node:path';

const browserDir = path.resolve('dist/projectSolarFishFrontend/browser');
const indexFile = path.join(browserDir, 'index.html');

if (!fs.existsSync(indexFile)) {
  throw new Error('No se encontró dist/projectSolarFishFrontend/browser/index.html tras el build de TEST.');
}

const files = fs.readdirSync(browserDir).filter((name) => fs.statSync(path.join(browserDir, name)).isFile());
const mainFile = files.find((name) => /^main.*\.js$/.test(name));
const polyfillsFile = files.find((name) => /^polyfills.*\.js$/.test(name));
const stylesFile = files.find((name) => /^styles.*\.css$/.test(name));

if (!mainFile) {
  throw new Error('Falta el bundle principal de la build TEST (main*.js).');
}
if (!polyfillsFile) {
  throw new Error('Falta el polyfills de la build TEST (polyfills*.js).');
}
if (!stylesFile) {
  throw new Error('Falta el CSS principal de la build TEST (styles*.css).');
}

const chunks = files.filter((name) => /^chunk-.*\.js$/.test(name));
if (chunks.length === 0) {
  throw new Error('La build TEST no generó chunks Angular.');
}

const content = fs.readFileSync(indexFile, 'utf8');
const hasMain = /<script[^>]+src="[^"]*main[^\"]*\.js"/i.test(content);
const hasPolyfills = /<script[^>]+src="[^"]*polyfills[^\"]*\.js"/i.test(content);
const hasStyles = /<link[^>]+href="[^"]*styles[^\"]*\.css"/i.test(content);

if (!hasMain || !hasPolyfills || !hasStyles) {
  throw new Error('El index.html generado por Angular no referencia los assets requeridos del build de TEST.');
}

if (!/<base\s+href="\/"\s*\/?>/i.test(content)) {
  throw new Error('index.html TEST debe usar <base href="/"> para rutas profundas (/consulta/ot/:token).');
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

/**
 * .htaccess TEST — conserva cache de assets + añade SPA fallback.
 * Sin el rewrite, Apache responde 404 al documento /consulta/ot/:token
 * (antes de que Angular pueda arrancar). D.12.
 */
const htaccess = `# Cache policy for TEST frontend
# HTML must always be revalidated
<IfModule mod_headers.c>
  <FilesMatch "^index\\.html$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>

  <FilesMatch "\\.(js|css)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>

  <FilesMatch "\\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>

# SPA fallback (D.12) - deep links / F5 / QR -> index.html
# Archivos y directorios reales (js, css, assets, imagenes) se sirven tal cual.
# Solo rutas inexistentes (p. ej. /consulta/ot/:token) caen a index.html.
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  RewriteRule ^ index.html [L]
</IfModule>
`;

const htaccessPath = path.join(browserDir, '.htaccess');
fs.writeFileSync(htaccessPath, htaccess, 'utf8');

const written = fs.readFileSync(htaccessPath, 'utf8');
if (!written.includes('RewriteEngine On') || !written.includes('index.html')) {
  throw new Error('postbuild-test: .htaccess SPA fallback no se escribió correctamente.');
}

console.log('postbuild-test: OK (cache headers + SPA fallback → .htaccess)');
