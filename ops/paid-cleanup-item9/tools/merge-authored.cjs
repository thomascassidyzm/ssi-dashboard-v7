#!/usr/bin/env node
// cs #778: merge the mechanical delete plan (<course>/plans/, from plan-auto.cjs) with the hand-authored
// back-fill and re-cuts (<course>/authored/S####.json, same schema as a plan file: legos.Lnn.insert/update,
// lego_ops; plus legos.Lnn.keep: [suffixes] to cancel a planned delete) into <course>/merged/.
// A row that is authored as an "update" is never also deleted. Then: ITEM9_PLANS=merged node build.cjs …
// usage: node merge-authored.cjs <course> [--only free|filled]
//   --only free   : just the deletes whose LEGO needs no back-fill (backfill.json author_build+author_use == 0)
//   --only filled : everything else (authored rows + the deletes that wait for them + re-cuts)
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const [course, ...rest] = process.argv.slice(2);
const only = rest.includes('--only') ? rest[rest.indexOf('--only') + 1] : null;
const cdir = path.join(L.ITEM_DIR, course);
const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const list = (d) => fs.existsSync(path.join(cdir, d)) ? fs.readdirSync(path.join(cdir, d)).filter(f => /^S\d{4}\.json$/.test(f)) : [];
const bf = fs.existsSync(path.join(cdir, 'backfill.json')) ? rd(path.join(cdir, 'backfill.json')) : { shortfall: {} };
const needsFill = new Set(Object.entries(bf.shortfall || {}).filter(([, x]) => x.author_build + x.author_use > 0).map(([k]) => k));
const out = path.join(cdir, 'merged');
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f));
const files = new Set([...list('plans'), ...list('authored')]);
let nDel = 0, nIns = 0, nUpd = 0, nLego = 0, kept = [];
for (const f of [...files].sort()) {
  const auto = list('plans').includes(f) ? rd(path.join(cdir, 'plans', f)) : null;
  const auth = list('authored').includes(f) ? rd(path.join(cdir, 'authored', f)) : null;
  const seed = (auto || auth).seed;
  const tag = f.slice(0, 5);
  const m = { seed, legos: {}, notes: [auto && auto.notes, auth && auth.notes].filter(Boolean).join(' | ') };
  for (const li of new Set([...Object.keys((auto || {}).legos || {}), ...Object.keys((auth || {}).legos || {})])) {
    const lid = `${tag}${li}`;
    const a = ((auto || {}).legos || {})[li] || {}, h = ((auth || {}).legos || {})[li] || {};
    const isFill = needsFill.has(lid) || Object.keys(h).length > 0; // free deletes were applied first, alone
    if (only === 'free' && isFill) continue;
    if (only === 'filled' && !isFill) continue;
    const upd = h.update || {};
    const keep = new Set(h.keep || []);
    const del = (a.delete || []).filter(s => !upd[s] && !keep.has(s));
    for (const s of keep) kept.push(`${lid}${s}`);
    const e = {};
    if (del.length) e.delete = del;
    if (Object.keys(upd).length) e.update = upd;
    if ((h.insert || []).length) e.insert = h.insert;
    if (a.accept_gap || h.accept_gap) e.accept_gap = h.accept_gap || a.accept_gap;
    if (Object.keys(e).filter(k => k !== 'accept_gap').length) { m.legos[li] = e; nDel += del.length; nIns += (h.insert || []).length; nUpd += Object.keys(upd).length; }
  }
  if (auth && auth.lego_ops && only !== 'free') { m.lego_ops = auth.lego_ops; nLego += Object.keys(auth.lego_ops).length; }
  if (Object.keys(m.legos).length || m.lego_ops) fs.writeFileSync(path.join(out, f), JSON.stringify(m, null, 1));
}
console.log(`${course} merged${only ? ' (' + only + ')' : ''}: delete ${nDel}, insert ${nIns}, update ${nUpd}, lego_ops ${nLego}${kept.length ? ', kept (delete cancelled) ' + kept.join(' ') : ''}`);
