#!/usr/bin/env node
// Item 20 resume (cs #740·AI): filled <course>/sheet.json -> plans/S####.json (generated:true) that build.cjs reads.
// A line goes into a plan only when it has `known` and `en` and no `hold`. A seed whose plan file was written by hand
// (no generated:true, e.g. the #718·AI urd probe) is left alone and its sheet lines are reported as covered there.
// usage: node sheet2plans.cjs <course>
const fs = require('fs'); const path = require('path');
const L = require('./lib.cjs');
const course = process.argv[2]; const cdir = path.join(L.ITEM_DIR, course); const pdir = path.join(cdir, 'plans');
fs.mkdirSync(pdir, { recursive: true });
const sheet = JSON.parse(fs.readFileSync(path.join(cdir, 'sheet.json'), 'utf8'));
const bySeed = new Map(); const st = { lines: sheet.lines.length, planned: 0, held: 0, empty: 0, hand_plan: 0 };
for (const ln of sheet.lines) {
  if (ln.hold) { st.held++; continue; }
  if (!ln.known || !ln.en) { st.empty++; continue; }
  if (!bySeed.has(ln.seed)) bySeed.set(ln.seed, []); bySeed.get(ln.seed).push(ln);
}
for (const [seed, lns] of bySeed) {
  const f = path.join(pdir, `S${String(seed).padStart(4, '0')}.json`);
  if (fs.existsSync(f) && !JSON.parse(fs.readFileSync(f, 'utf8')).generated) { st.hand_plan += lns.length; continue; }
  const plan = { seed, generated: true, legos: {}, known_ok: {}, notes: 'item 20 back-fill (cs #740·AI): English from eng_for_hin rows (hin_row) unless authored' };
  for (const ln of lns) {
    const e = plan.legos[ln.lego.slice(5)] ||= {};
    if (ln.slot.startsWith('update:')) (e.update ||= {})[ln.slot.slice(7)] = [ln.known, ln.en, null, ln.gender || undefined];
    else (e.insert ||= []).push(['build', ln.known, ln.en, null, ln.gender || undefined]);
    if (ln.known_ok) plan.known_ok[`${ln.lego}${ln.slot.startsWith('update:') ? ln.slot.slice(7) : ''}`] = ln.known_ok;
    st.planned++;
  }
  fs.writeFileSync(f, JSON.stringify(plan, null, 1));
}
// Drop generated plans for seeds the sheet no longer plans (a line was held or emptied).
for (const f of fs.readdirSync(pdir)) { const p = JSON.parse(fs.readFileSync(path.join(pdir, f), 'utf8')); if (p.generated && !bySeed.has(p.seed)) fs.unlinkSync(path.join(pdir, f)); }
console.log(course, JSON.stringify(st), 'seeds', bySeed.size);
