import fs from 'node:fs';
import path from 'node:path';

const replacements = [
  [/solvix-section-header/g, 'ce-section-header'],
  [/solvix-page-header/g, 'ce-page-header'],
  [/solvix-metric-card/g, 'ce-metric-card'],
  [/solvix-empty-state/g, 'ce-empty-state'],
  [/solvix-error-state/g, 'ce-error-state'],
  [/solvix-loading-state/g, 'ce-loading-state'],
  [/solvix-field-help/g, 'ce-field-help'],
  [/solvix-progress-fases/g, 'ce-progress-fases'],
  [/solvix-signature-pad/g, 'ce-signature-pad'],
  [/solvix-theme-toggle/g, 'ce-theme-toggle'],
  [/solvix-button/g, 'ce-button'],
  [/solvix-badge/g, 'ce-badge'],
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(p, out);
    } else if (p.endsWith('.scss')) {
      out.push(p);
    }
  }
  return out;
}

let n = 0;
for (const file of walk('src')) {
  let c = fs.readFileSync(file, 'utf8');
  const orig = c;
  for (const [re, to] of replacements) c = c.replace(re, to);
  if (c !== orig) {
    fs.writeFileSync(file, c);
    n++;
    console.log(path.relative(process.cwd(), file));
  }
}
console.log(`files: ${n}`);
