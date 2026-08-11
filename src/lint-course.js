#!/usr/bin/env node
/* Validate course JSON before it goes anywhere near the store.
 *
 *   node lint-course.js                     # every course in catalog/
 *   node lint-course.js path/to/course.json # one file
 *   node lint-course.js --strict            # warnings count as failures
 *
 * Exits non-zero if anything is wrong, so CI can gate on it.
 * Shares its rule set with the app: R.lintCourse in renderers.js.
 */
const fs = require('fs');
/* by default the built catalogue, so `npm run lint` checks what will ship */
const DIR = process.env.OBOROS_CATALOG || require('path').resolve(__dirname,'..','dist','catalog');
const path = require('path');
const R = require('./renderers.js');

const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const files = args.filter(a => !a.startsWith('--'));

const targets = files.length
  ? files
  : (fs.existsSync(DIR)
      ? fs.readdirSync(DIR).filter(f => /\.json$/.test(f) && f !== 'index.json').map(f => path.join(DIR, f))
      : []);

if (!targets.length) {
  console.error('Nothing to check. Put course JSON in catalog/, or pass a file path.');
  process.exit(1);
}

const C = { red: s => `\x1b[31m${s}\x1b[0m`, yel: s => `\x1b[33m${s}\x1b[0m`, grn: s => `\x1b[32m${s}\x1b[0m`, dim: s => `\x1b[2m${s}\x1b[0m` };

let totalErr = 0, totalWarn = 0;
const ids = new Map();

for (const file of targets) {
  let raw, course;
  try { raw = fs.readFileSync(file, 'utf8'); }
  catch (e) { console.log(C.red('✗ ') + file + '  — cannot read: ' + e.message); totalErr++; continue; }
  try { course = JSON.parse(raw); }
  catch (e) {
    // point at the line, which is what you actually need with a 200 KB file
    const m = /position (\d+)/.exec(e.message);
    let where = '';
    if (m) { const line = raw.slice(0, +m[1]).split('\n').length; where = ` (line ${line})`; }
    console.log(C.red('✗ ') + file + '  — invalid JSON' + where + ': ' + e.message.split('\n')[0]);
    totalErr++; continue;
  }

  const { errors, warnings } = R.lintCourse(course);

  // cross-file checks
  if (course && course.id) {
    if (ids.has(course.id)) errors.push(`Duplicate id "${course.id}" — also used by ${ids.get(course.id)}`);
    ids.set(course.id, file);
    const expect = path.join(path.dirname(file), course.id + '.json');
    if (path.basename(file) !== course.id + '.json')
      warnings.push(`Filename does not match id — the store fetches ${expect}`);
  }

  const kb = Math.round(raw.length / 1024);
  if (kb > 1024) warnings.push(`${kb} KB — large enough to be slow on mobile data; consider splitting the track`);

  const stats = countStats(course);
  const head = `${file}  ${C.dim(`${stats.modules} modules · ${stats.lessons} lessons · ${stats.questions} questions · ${kb} KB`)}`;

  if (!errors.length && !warnings.length) { console.log(C.grn('✓ ') + head); continue; }
  console.log((errors.length ? C.red('✗ ') : C.yel('! ')) + head);
  errors.forEach(e => console.log('    ' + C.red('error  ') + e));
  // the same warning repeated 200 times is noise — collapse by kind
  group(warnings).forEach(g => {
    if (g.items.length === 1) console.log('    ' + C.yel('warn   ') + g.items[0]);
    else {
      console.log('    ' + C.yel('warn   ') + `${g.kind}  ${C.dim(`(${g.items.length}×)`)}`);
      g.items.slice(0, 3).forEach(i => console.log('           ' + C.dim(i.split(': ')[0])));
      if (g.items.length > 3) console.log('           ' + C.dim(`…and ${g.items.length - 3} more`));
    }
  });
  totalErr += errors.length; totalWarn += warnings.length;
}

function group(list) {
  const m = new Map();
  list.forEach(w => {
    const i = w.indexOf(': ');
    const kind = i > -1 ? w.slice(i + 2) : w;
    if (!m.has(kind)) m.set(kind, { kind, items: [] });
    m.get(kind).items.push(w);
  });
  return [...m.values()];
}

function countStats(c) {
  let lessons = 0, questions = 0;
  const countEx = ex => { if (ex && Array.isArray(ex.questions)) ex.questions.forEach(q => { questions += (q && q.type === 'case' && Array.isArray(q.qs)) ? q.qs.length : 1; }); };
  (c.modules || []).forEach(m => { lessons += (m.lessons || []).length; countEx(m.quiz); });
  countEx(c.finalExam);
  return { modules: (c.modules || []).length, lessons, questions };
}

console.log('');
if (totalErr) console.log(C.red(`${totalErr} error${totalErr > 1 ? 's' : ''}`) + (totalWarn ? `, ${C.yel(totalWarn + ' warning' + (totalWarn > 1 ? 's' : ''))}` : ''));
else if (totalWarn) console.log(C.yel(`${totalWarn} warning${totalWarn > 1 ? 's' : ''}`) + ', no errors');
else console.log(C.grn(`All ${targets.length} course${targets.length > 1 ? 's' : ''} clean.`));

process.exit(totalErr || (STRICT && totalWarn) ? 1 : 0);
