import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const tokensPath = path.join(root, 'src/styles/_tokens.scss');

const map = {
  bg: 'color-bg',
  surface: 'color-surface-1',
  'surface-low': 'color-surface-2',
  'surface-high': 'color-surface-high',
  'surface-elevated': 'color-surface-elevated',
  'surface-container': 'color-surface-container',
  'surface-lowest': 'color-surface-lowest',
  panel: 'color-panel',
  'panel-inset': 'color-panel-inset',
  'row-hover': 'color-row-hover',
  primary: 'color-primary',
  'primary-hover': 'color-primary-hover',
  'primary-soft': 'color-primary-soft',
  'primary-container': 'color-primary-container',
  secondary: 'color-secondary',
  neon: 'ce-neon',
  deep: 'ce-deep',
  text: 'color-text-primary',
  'text-secondary': 'color-text-secondary',
  'text-muted': 'color-text-muted',
  'text-body': 'color-text-body',
  border: 'color-border',
  'border-subtle': 'color-border-subtle',
  success: 'color-success',
  'success-soft': 'color-success-soft',
  warning: 'color-warning',
  'warning-soft': 'color-warning-soft',
  error: 'color-danger',
  'error-bg': 'color-danger-bg',
  info: 'color-info',
  'info-soft': 'color-info-soft',
  'danger-soft': 'color-danger-soft',
  'neutral-soft': 'color-neutral-soft',
  'on-primary': 'color-on-primary',
  'on-surface': 'color-on-surface',
  'on-surface-variant': 'color-on-surface-variant',
  outline: 'color-outline',
  'outline-variant': 'color-outline-variant',
  overlay: 'color-overlay',
  shadow: 'shadow',
  'shadow-sm': 'shadow-sm',
  glow: 'ce-glow',
  'scrollbar-track': 'scrollbar-track',
  'scrollbar-thumb': 'scrollbar-thumb',
  'scrollbar-thumb-hover': 'scrollbar-thumb-hover',
  'scrollbar-size': 'scrollbar-size',
  'topbar-bg': 'topbar-bg',
  'topbar-height': 'topbar-height',
  'sidebar-width': 'sidebar-width',
  'snack-surface-from': 'snack-surface-from',
  'snack-surface-to': 'snack-surface-to',
  'select-panel-bg': 'select-panel-bg',
  'btn-tech-primary-bg': 'btn-tech-primary-bg',
  'btn-tech-primary-fg': 'btn-tech-primary-fg',
  'btn-tech-primary-hover': 'btn-tech-primary-hover',
  'btn-tech-secondary-bg': 'btn-tech-secondary-bg',
  'btn-tech-secondary-fg': 'btn-tech-secondary-fg',
  'btn-tech-secondary-hover': 'btn-tech-secondary-hover',
  'btn-tech-tertiary-fg': 'btn-tech-tertiary-fg',
  'btn-tech-tertiary-hover': 'btn-tech-tertiary-hover',
  'home-card-bg': 'color-home-card-bg',
  'home-card-bg-solid': 'color-home-card-bg-solid',
  'home-card-border': 'color-home-card-border',
  'home-card-shadow': 'color-home-card-shadow',
  'home-card-hover-shadow': 'color-home-card-hover-shadow',
  'home-separator': 'color-home-separator',
  'home-overlay-from': 'color-home-overlay-from',
  'home-glow-soft': 'color-home-glow-soft',
  'home-glow-mid': 'color-home-glow-mid',
  'home-inset-glow': 'color-home-inset-glow',
  font: 'font-sans',
  'font-mono': 'font-mono',
  radius: 'radius',
  'radius-card': 'radius-card',
  'focus-ring': 'focus-ring',
  'focus-offset': 'focus-offset',
  'touch-min': 'touch-min',
};

let tok = fs.readFileSync(tokensPath, 'utf8');
tok = tok
  .replaceAll('@mixin solvix-theme-dark', '@mixin theme-dark')
  .replaceAll('@mixin solvix-theme-light', '@mixin theme-light')
  .replaceAll('@mixin solvix-semantic-aliases', '@mixin semantic-aliases')
  .replaceAll('@include solvix-theme-dark', '@include theme-dark')
  .replaceAll('@include solvix-theme-light', '@include theme-light')
  .replaceAll('@include solvix-semantic-aliases', '@include semantic-aliases');

tok = tok.replace(
  '// SOLVIX design tokens',
  '// Design tokens — Computer & Electronic / capa semántica'
);
tok = tok.replace(
  '// Los componentes deben usar --solvix-* o --color-* (nunca hex ad-hoc).',
  '// Preferir --color-* / --ce-* / tokens neutros. --solvix-* permanece como alias legacy.'
);

const extraAliases = `
  --color-surface-high: var(--solvix-surface-high);
  --color-surface-container: var(--solvix-surface-container, var(--solvix-surface-low));
  --color-surface-lowest: var(--solvix-surface-lowest, var(--solvix-bg));
  --color-secondary: var(--solvix-secondary);
  --ce-neon: var(--solvix-neon);
  --ce-deep: var(--solvix-deep);
  --ce-glow: var(--solvix-glow);
  --color-danger-bg: var(--solvix-error-bg);
  --color-neutral-soft: var(--solvix-neutral-soft);
  --color-on-primary: var(--solvix-on-primary);
  --color-on-surface: var(--solvix-on-surface, var(--solvix-text));
  --color-on-surface-variant: var(--solvix-on-surface-variant, var(--solvix-text-secondary));
  --color-outline: var(--solvix-outline, var(--solvix-border));
  --color-outline-variant: var(--solvix-outline-variant, var(--solvix-border-subtle));
  --color-primary-container: var(--solvix-primary-container, var(--solvix-primary-soft));
  --color-text-body: var(--solvix-text-body, var(--solvix-text-secondary));
  --shadow: var(--solvix-shadow);
  --shadow-sm: var(--solvix-shadow-sm);
  --scrollbar-track: var(--solvix-scrollbar-track);
  --scrollbar-thumb: var(--solvix-scrollbar-thumb);
  --scrollbar-thumb-hover: var(--solvix-scrollbar-thumb-hover);
  --scrollbar-size: var(--solvix-scrollbar-size);
  --topbar-bg: var(--solvix-topbar-bg);
  --topbar-height: var(--solvix-topbar-height);
  --sidebar-width: var(--solvix-sidebar-width);
  --snack-surface-from: var(--solvix-snack-surface-from);
  --snack-surface-to: var(--solvix-snack-surface-to);
  --select-panel-bg: var(--solvix-select-panel-bg);
  --btn-tech-primary-bg: var(--solvix-btn-tech-primary-bg);
  --btn-tech-primary-fg: var(--solvix-btn-tech-primary-fg);
  --btn-tech-primary-hover: var(--solvix-btn-tech-primary-hover);
  --btn-tech-secondary-bg: var(--solvix-btn-tech-secondary-bg);
  --btn-tech-secondary-fg: var(--solvix-btn-tech-secondary-fg);
  --btn-tech-secondary-hover: var(--solvix-btn-tech-secondary-hover);
  --btn-tech-tertiary-fg: var(--solvix-btn-tech-tertiary-fg);
  --btn-tech-tertiary-hover: var(--solvix-btn-tech-tertiary-hover);
  --color-home-overlay-from: var(--solvix-home-overlay-from);
  --color-home-glow-soft: var(--solvix-home-glow-soft);
  --color-home-glow-mid: var(--solvix-home-glow-mid);
  --color-home-inset-glow: var(--solvix-home-inset-glow);
  --font-sans: var(--solvix-font);
  --font-mono: var(--solvix-font-mono);
  --radius: var(--solvix-radius);
  --radius-card: var(--solvix-radius-card);
  --focus-ring: var(--solvix-focus-ring, 2px solid var(--color-primary));
  --focus-offset: var(--solvix-focus-offset, 2px);
  --touch-min: var(--solvix-touch-min, 44px);
`;

if (!tok.includes('--ce-neon:')) {
  tok = tok.replace(
    /(--color-home-separator:\s*var\(--solvix-home-separator\);)/,
    `$1\n${extraAliases}`
  );
}

tok = tok.replace(
  /\.solvix-mono\s*\{[\s\S]*?\}/,
  `.ce-mono,
.solvix-mono {
  font-family: var(--font-mono, var(--solvix-font-mono));
  letter-spacing: 0.05em;
}`
);

if (!tok.includes('--font-sans: var(--solvix-font);')) {
  tok = tok.replace(
    /(--solvix-scrollbar-size:\s*6px;)/,
    `$1
  --font-sans: var(--solvix-font);
  --font-mono: var(--solvix-font-mono);
  --sidebar-width: var(--solvix-sidebar-width);
  --topbar-height: var(--solvix-topbar-height);
  --radius: var(--solvix-radius);
  --radius-card: var(--solvix-radius-card);
  --scrollbar-size: var(--solvix-scrollbar-size);`
  );
}

fs.writeFileSync(tokensPath, tok);
console.log('tokens.scss updated');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(p, out);
    } else if (/\.(scss|css|ts|html)$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

const keys = Object.keys(map).sort((a, b) => b.length - a.length);
let changed = 0;
for (const file of walk(path.join(root, 'src'))) {
  let c = fs.readFileSync(file, 'utf8');
  const orig = c;
  for (const k of keys) {
    c = c.split(`var(--solvix-${k})`).join(`var(--${map[k]})`);
  }
  if (c !== orig) {
    fs.writeFileSync(file, c);
    changed++;
  }
}
console.log(`Consumer files updated: ${changed}`);

let left = 0;
for (const file of walk(path.join(root, 'src'))) {
  const c = fs.readFileSync(file, 'utf8');
  const m = c.match(/var\(--solvix-/g);
  if (m) left += m.length;
}
console.log(`Remaining var(--solvix- usages: ${left}`);
