#!/usr/bin/env node
/* Rebuild catalog/index.json from whatever course files are in catalog/.
 *
 *   node make-catalog.js [dir]          # write it
 *   node make-catalog.js [dir] --check  # fail if it's out of date, change nothing
 *
 * This removes the hand-editing step: drop a course JSON into catalog/ and the
 * store entry is derived from the course itself. Fields you can't derive
 * (price, author, category) are read from the course, then from the existing
 * index entry, so anything you set by hand survives a rebuild.
 */
const fs = require('fs');
const path = require('path');

/* The directory can be passed in, because the build writes the catalogue into
   dist/ rather than next to this script. With no argument it still means
   ./catalog, so running it by hand inside a folder of course files works. */
const DIR = process.argv.slice(2).find(a => a[0] !== '-') || 'catalog';
const INDEX = path.join(DIR, 'index.json');
const CHECK = process.argv.includes('--check');

if (!fs.existsSync(DIR)) { console.error(`No ${DIR}/ directory here.`); process.exit(1); }

let existing = [];
try { existing = JSON.parse(fs.readFileSync(INDEX, 'utf8')); } catch (e) { existing = []; }
const prev = new Map(existing.map(e => [e.id, e]));

const files = fs.readdirSync(DIR).filter(f => /\.json$/.test(f) && f !== 'index.json').sort();
const out = [];
let bad = 0;

for (const f of files) {
  let c;
  try { c = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); }
  catch (e) { console.error(`  skipped ${f} — invalid JSON: ${e.message.split('\n')[0]}`); bad++; continue; }
  if (!c || !c.id || !c.title || !Array.isArray(c.modules)) { console.error(`  skipped ${f} — not a course (needs id, title, modules)`); bad++; continue; }

  const old = prev.get(c.id) || {};
  // hours: use what the course declares, else sum the modules, else derive from
  // the shape of the thing. The store shows this, so it cannot be 0.
  const lessonCount = c.modules.reduce((n, m) => n + ((m.lessons || []).length), 0);
  const quizCount = c.modules.filter(m => m.quiz).length;
  const derivedHours = Math.round(lessonCount * 1.15 + quizCount * 0.6 + (c.finalExam ? 1.5 : 0) + c.modules.length * 0.4);
  let hours = c.hours || (c.modules.reduce((n, m) => n + (m.hours || 0), 0)) || derivedHours || old.hours || 0;
  let weeks = c.weeks || Math.max(...c.modules.map(m => m.week || 0)) || old.weeks || c.modules.length;
  if (!isFinite(weeks) || weeks < 1) weeks = c.modules.length;

  out.push({
    id: c.id,
    title: c.title,
    subtitle: c.subtitle || old.subtitle || '',
    tagline: c.tagline || old.tagline || c.subtitle || '',
    accent: c.accent || old.accent || '#5b8cff',
    price: c.price != null ? c.price : (old.price != null ? old.price : 0),
    author: c.author || old.author || 'Oboros',
    category: c.category || old.category || 'General',
    weeks,
    hours,
    modules: c.modules.length,
    lessons: lessonCount
  });
}

out.sort((a, b) => a.id.localeCompare(b.id));
const next = JSON.stringify(out, null, 1) + '\n';
const current = fs.existsSync(INDEX) ? fs.readFileSync(INDEX, 'utf8') : '';

if (CHECK) {
  if (bad) { console.error('Some course files are unreadable — fix those first.'); process.exit(1); }
  if (next !== current) {
    console.error('catalog/index.json is out of date. Run: node make-catalog.js');
    process.exit(1);
  }
  console.log(`catalog/index.json is up to date (${out.length} courses).`);
  process.exit(0);
}

if (next === current) console.log(`catalog/index.json already up to date (${out.length} courses).`);
else { fs.writeFileSync(INDEX, next); console.log(`catalog/index.json written — ${out.length} courses.`); }

const byCat = out.reduce((m, c) => { (m[c.category] = m[c.category] || []).push(c.id); return m; }, {});
Object.keys(byCat).sort().forEach(k => console.log(`  ${k}: ${byCat[k].length}`));
if (bad) { console.error(`\n${bad} file(s) skipped.`); process.exit(1); }
