#!/usr/bin/env node
// List rows in baskets a plan touches that do NOT contain their LEGO and that the plan leaves alone
// (pre-existing; /v2/validate then blocks the batch). Reads the local snapshot only. (cs #759·AI)
// usage: node containment-gaps.cjs <course> <from> <to>
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const [course, from, to] = process.argv.slice(2);
const cdir = path.join(L.ITEM_DIR, course);
const applied = new Set();
for (const f of fs.readdirSync(path.join(cdir, 'batches')).filter(f => f.endsWith('.apply.json'))) {
  const a = JSON.parse(fs.readFileSync(path.join(cdir, 'batches', f), 'utf8')); if (a.applied) a.seeds.forEach(s => applied.add(s));
}
const seeds = L.loadLive(course);
for (const s of seeds) {
  if (s.seed_number < +from || s.seed_number > +to || applied.has(s.seed_number)) continue;
  const pf = path.join(cdir, 'plans', `S${String(s.seed_number).padStart(4, '0')}.json`);
  if (!fs.existsSync(pf)) continue;
  const plan = JSON.parse(fs.readFileSync(pf, 'utf8'));
  for (const [li, e] of Object.entries(plan.legos || {})) {
    const l = s.legos.find(x => x.lego_id.endsWith(li)); if (!l) continue;
    const touched = new Set([...(e.delete || []), ...Object.keys(e.update || {})]);
    for (const p of l.basket_phrases) {
      const k = L.short(p.id).slice(8);
      if (p.phrase_role === 'component' || touched.has(k)) continue;
      if (!L.containsLego(course, s.seed_number, l.target_text, p.target_text))
        console.log(`${l.lego_id}${k}\t${p.phrase_role}\tLEGO=${l.known_text} | ${l.target_text}\tROW=${p.known_text} | ${p.target_text}`);
    }
  }
}
