import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(p, out);
    } else if (/\.(ts|html|scss|css)$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

// Longest-first replacements to avoid partial collisions
const replacements = [
  ['SolvixActionRevealService', 'ActionRevealService'],
  ['SolvixFeedbackService', 'FeedbackService'],
  ['SolvixScrollService', 'ScrollService'],
  ['SolvixActionSuccessOptions', 'ActionSuccessOptions'],
  ['SolvixRevealOptions', 'RevealOptions'],
  ['SolvixScrollOptions', 'ScrollOptions'],
  ['SolvixScrollTarget', 'ScrollTarget'],
  ['SolvixSnackTone', 'SnackTone'],
  ['showSolvixSnack', 'showSnack'],
  ['solvix-action-reveal.service', 'action-reveal.service'],
  ['solvix-feedback.service', 'feedback.service'],
  ['solvix-scroll.service', 'scroll.service'],
  ["'solvix-snack", "'ce-snack"],
  ['"solvix-snack', '"ce-snack'],
  ['solvix-context-highlight', 'ce-context-highlight'],
  ["'../utils/solvix-snack'", "'../utils/snack'"],
  ['"../utils/solvix-snack"', '"../utils/snack"'],
  ["'../../utils/solvix-snack'", "'../../utils/snack'"],
  ['"../../utils/solvix-snack"', '"../../utils/snack"'],
  ['utils/solvix-snack', 'utils/snack'],
];

const skipFiles = new Set([
  path.normalize(path.join(root, 'src/app/shared/utils/solvix-snack.ts')),
  path.normalize(path.join(root, 'src/app/shared/services/solvix-feedback.service.ts')),
  path.normalize(path.join(root, 'src/app/shared/services/solvix-feedback.service.spec.ts')),
  path.normalize(path.join(root, 'src/app/shared/services/solvix-scroll.service.ts')),
  path.normalize(path.join(root, 'src/app/shared/services/solvix-scroll.service.spec.ts')),
  path.normalize(path.join(root, 'src/app/shared/services/solvix-action-reveal.service.ts')),
  path.normalize(path.join(root, 'src/app/shared/services/solvix-action-reveal.service.spec.ts')),
]);

let changed = 0;
for (const file of walk(path.join(root, 'src'))) {
  if (skipFiles.has(path.normalize(file))) continue;
  let c = fs.readFileSync(file, 'utf8');
  const orig = c;
  for (const [from, to] of replacements) {
    c = c.split(from).join(to);
  }
  if (c !== orig) {
    fs.writeFileSync(file, c);
    changed++;
    console.log(path.relative(root, file));
  }
}
console.log(`Consumer files updated: ${changed}`);

const toDelete = [
  'src/app/shared/utils/solvix-snack.ts',
  'src/app/shared/services/solvix-feedback.service.ts',
  'src/app/shared/services/solvix-feedback.service.spec.ts',
  'src/app/shared/services/solvix-scroll.service.ts',
  'src/app/shared/services/solvix-scroll.service.spec.ts',
  'src/app/shared/services/solvix-action-reveal.service.ts',
  'src/app/shared/services/solvix-action-reveal.service.spec.ts',
];
for (const rel of toDelete) {
  const fp = path.join(root, rel);
  if (fs.existsSync(fp)) {
    fs.unlinkSync(fp);
    console.log(`deleted ${rel}`);
  }
}
