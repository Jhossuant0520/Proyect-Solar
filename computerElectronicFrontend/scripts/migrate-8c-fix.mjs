import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

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

const keys = Object.keys(map).sort((a, b) => b.length - a.length);

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

/* —— 1. Rewrite _tokens.scss semantic aliases correctly —— */
const tokensPath = path.join(root, 'src/styles/_tokens.scss');
let tok = fs.readFileSync(tokensPath, 'utf8');

const semanticBlock = `@mixin semantic-aliases {
  /* —— Tokens semánticos (capa 2) —— */
  /* Fuente de valor: --solvix-* (legacy). Consumidores: --color-* / --ce-* / neutros. */
  --color-bg: var(--solvix-bg);
  --color-surface-1: var(--solvix-surface);
  --color-surface-2: var(--solvix-surface-low);
  --color-surface-elevated: var(--solvix-surface-elevated);
  --color-panel: var(--solvix-panel);
  --color-panel-inset: var(--solvix-panel-inset);
  --color-row-hover: var(--solvix-row-hover);

  --color-text-primary: var(--solvix-text);
  --color-text-secondary: var(--solvix-text-secondary);
  --color-text-muted: var(--solvix-text-muted);

  --color-border: var(--solvix-border);
  --color-border-subtle: var(--solvix-border-subtle);

  --color-primary: var(--solvix-primary);
  --color-primary-hover: var(--solvix-primary-hover);
  --color-primary-soft: var(--solvix-primary-soft);

  --color-success: var(--solvix-success);
  --color-success-soft: var(--solvix-success-soft);
  --color-warning: var(--solvix-warning);
  --color-warning-soft: var(--solvix-warning-soft);
  --color-danger: var(--solvix-error);
  --color-danger-soft: var(--solvix-danger-soft);
  --color-info: var(--solvix-info);
  --color-info-soft: var(--solvix-info-soft);

  --color-focus: var(--solvix-primary);
  --color-overlay: var(--solvix-overlay);

  --color-home-card-bg: var(--solvix-home-card-bg);
  --color-home-card-bg-solid: var(--solvix-home-card-bg-solid);
  --color-home-card-border: var(--solvix-home-card-border);
  --color-home-card-shadow: var(--solvix-home-card-shadow);
  --color-home-card-hover-shadow: var(--solvix-home-card-hover-shadow);
  --color-home-separator: var(--solvix-home-separator);

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
}`;

tok = tok.replace(/@mixin semantic-aliases \{[\s\S]*?\n\}/, semanticBlock);

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

tok = tok.replace(
  /\.ce-mono,\s*\n\.solvix-mono \{[\s\S]*?\}/,
  `.ce-mono,
.solvix-mono {
  font-family: var(--font-mono, var(--solvix-font-mono));
  letter-spacing: 0.05em;
}`
);

fs.writeFileSync(tokensPath, tok);
console.log('Fixed _tokens.scss semantic-aliases');

/* —— 2. Migrate remaining var(--solvix-X …) in consumers (NOT inside tokens definitions / alias RHS) —— */
const skipRewrite = new Set([
  path.normalize(tokensPath),
]);

let consumerChanged = 0;
for (const file of walk(path.join(root, 'src'))) {
  if (skipRewrite.has(path.normalize(file))) continue;
  let c = fs.readFileSync(file, 'utf8');
  const orig = c;

  // Collapse accidental double refs from prior pass: var(--color-x, var(--color-x)) → var(--color-x)
  c = c.replace(/var\((--[a-z0-9-]+),\s*var\(\1\)\)/g, 'var($1)');

  for (const k of keys) {
    const next = map[k];
    // var(--solvix-k) → var(--next)
    c = c.split(`var(--solvix-${k})`).join(`var(--${next})`);
    // var(--solvix-k, fallback) → var(--next, fallback)
    c = c.split(`var(--solvix-${k},`).join(`var(--${next},`);
  }

  if (c !== orig) {
    fs.writeFileSync(file, c);
    consumerChanged++;
  }
}
console.log(`Consumer/fallback files updated: ${consumerChanged}`);

/* —— 3. Auxiliary classes (dual where services still emit legacy) —— */
const classPairs = [
  // [legacy, new] — CSS selectors get dual; HTML/TS consumers get new (except service files)
];

function dualizeSelectors(content, legacy, neu) {
  // Avoid double-dual if already present
  if (content.includes(`.${neu}`) && content.includes(`.${legacy}`)) {
    // still ensure paired where only legacy appears alone as a selector start
  }
  // Replace standalone class selectors carefully via line-based heuristics
  let out = content;
  // panelClass / string literals / HTML classes handled separately
  return out;
}

const auxCssFiles = [
  'src/styles.scss',
  'src/styles/_tokens.scss',
  'src/styles/_motion.scss',
  'src/styles/_a11y.scss',
  'src/styles/_snackbar.scss',
  'src/styles/_admin-ce.scss',
  'src/styles/_theme-light.scss',
];

const selectorMap = [
  { legacy: 'solvix-dialog-panel', neu: 'ce-dialog-panel' },
  { legacy: 'solvix-dialog-backdrop', neu: 'ce-dialog-backdrop' },
  { legacy: 'solvix-context-highlight', neu: 'ce-context-highlight' },
  { legacy: 'solvix-card-interactive', neu: 'ce-card-interactive' },
  { legacy: 'solvix-mono', neu: 'ce-mono' },
  // snack kept dual for SolvixFeedbackService (8D) — add ce-snack alongside
  { legacy: 'solvix-snack', neu: 'ce-snack' },
];

for (const rel of auxCssFiles) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) continue;
  let c = fs.readFileSync(fp, 'utf8');
  const orig = c;
  for (const { legacy, neu } of selectorMap) {
    // .legacy → .neu,\n.legacy  (when not already dual)
    const re = new RegExp(`(^|[\\s,{>+~])\\.${legacy}(?![\\w-])`, 'gm');
    c = c.replace(re, (m, pre) => {
      // if previous chars already have .neu, skip
      return `${pre}.${neu},\n.${legacy}`;
    });
    // Clean accidental triples / duplicates from re-runs
    c = c.replaceAll(`.${neu},\n.${neu},\n.${legacy}`, `.${neu},\n.${legacy}`);
    c = c.replaceAll(`.${neu},\n.${neu},\n.${neu},\n.${legacy}`, `.${neu},\n.${legacy}`);
  }
  // keyframes: keep solvix-* names OR dual-alias — leave animation names; services use class not keyframe
  if (c !== orig) {
    fs.writeFileSync(fp, c);
    console.log(`Dual selectors: ${rel}`);
  }
}

/* —— 4. Update HTML/TS consumers for aux classes (NOT feedback/scroll/action-reveal services) —— */
const serviceGuard = [
  'solvix-feedback.service',
  'solvix-scroll.service',
  'solvix-action-reveal.service',
  'solvix-snack.ts',
];

const consumerClassMap = [
  { legacy: 'solvix-mono', neu: 'ce-mono' },
  { legacy: 'solvix-dialog-panel', neu: 'ce-dialog-panel' },
  { legacy: 'solvix-dialog-backdrop', neu: 'ce-dialog-backdrop' },
  { legacy: 'solvix-card-interactive', neu: 'ce-card-interactive' },
  // context-highlight + snack: services emit legacy — leave TS service strings; update non-service if any
];

let classConsumers = 0;
for (const file of walk(path.join(root, 'src'))) {
  const base = path.basename(file);
  if (serviceGuard.some((g) => file.includes(g) || base === g)) continue;
  if (!/\.(html|ts|scss)$/.test(file)) continue;
  // skip pure style sheets already dualized above for selector dual — still update class refs in feature scss
  let c = fs.readFileSync(file, 'utf8');
  const orig = c;
  for (const { legacy, neu } of consumerClassMap) {
    // HTML class attributes and TS string panelClass
    c = c.replaceAll(`'${legacy}'`, `'${neu}'`);
    c = c.replaceAll(`"${legacy}"`, `"${neu}"`);
    c = c.replaceAll(` ${legacy}`, ` ${neu}`);
    c = c.replaceAll(`"${legacy} `, `"${neu} `);
    c = c.replaceAll(`'${legacy} `, `'${neu} `);
    c = c.replaceAll(`class="${legacy}"`, `class="${neu}"`);
    c = c.replaceAll(`class='${legacy}'`, `class='${neu}'`);
    c = c.replaceAll(`.${legacy}`, `.${neu}`);
    // restore dual in global style files if we overwrote — handled by re-read? feature files want neu only
  }
  if (c !== orig) {
    fs.writeFileSync(file, c);
    classConsumers++;
  }
}
console.log(`Aux class consumers updated: ${classConsumers}`);

/* Re-apply dual on global CSS after consumer pass may have flipped them to neu-only */
for (const rel of auxCssFiles) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) continue;
  let c = fs.readFileSync(fp, 'utf8');
  const orig = c;
  for (const { legacy, neu } of selectorMap) {
    // If only .neu remains without .legacy sibling nearby, add dual
    const onlyNeu = new RegExp(`(^|[\\s,{>+~])\\.${neu}(?!,\\s*\\n?\\.${legacy})(?![\\w-])`, 'gm');
    c = c.replace(onlyNeu, (m, pre) => `${pre}.${neu},\n.${legacy}`);
    c = c.replaceAll(`.${neu},\n.${neu},\n.${legacy}`, `.${neu},\n.${legacy}`);
    c = c.replaceAll(`.${neu},\n.${legacy},\n.${neu},\n.${legacy}`, `.${neu},\n.${legacy}`);
  }
  if (c !== orig) fs.writeFileSync(fp, c);
}

/* —— 5. Fix styles.scss app-bg —— */
const stylesPath = path.join(root, 'src/styles.scss');
let styles = fs.readFileSync(stylesPath, 'utf8');
styles = styles.replace(/var\((--[a-z0-9-]+),\s*var\(\1\)\)/g, 'var($1)');
fs.writeFileSync(stylesPath, styles);

let left = 0;
const leftFiles = [];
for (const file of walk(path.join(root, 'src'))) {
  const c = fs.readFileSync(file, 'utf8');
  const m = c.match(/var\(--solvix-/g);
  if (m) {
    left += m.length;
    leftFiles.push(`${path.relative(root, file)}:${m.length}`);
  }
}
console.log(`Remaining var(--solvix- usages: ${left}`);
leftFiles.sort((a, b) => Number(b.split(':')[1]) - Number(a.split(':')[1]));
console.log(leftFiles.slice(0, 15).join('\n'));
