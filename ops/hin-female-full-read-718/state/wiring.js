// Wiring census over Popty's read route only (GET /api/production/:course/audio/by-text). No DB access.
const S = process.env.CS_SCRATCH;
const { all } = require(S + '/all.json');
const exp = require(S + '/exp.json');
const byText = new Map(all.map(e => [e.t, e]));
const out = [];
(async () => {
  for (const x of exp) {
    const e = byText.get(x.original_text);
    const occ = e ? e.occ : [];
    const played = occ.filter(o => o.kind !== 'component' && o.sn <= 300);
    const row = { text: x.original_text, f: x.expanded_f, m: x.expanded_m, rows: occ.length, played: played.length,
      a1Null: played.filter(o => !o.a1).length, a2Null: played.filter(o => !o.a2).length,
      seeds: [...new Set(occ.map(o => o.sn))].sort((a, b) => a - b) };
    const look = async (text, role) => {
      const r = await fetch(`http://localhost:3470/api/production/hin_for_eng/audio/by-text?text=${encodeURIComponent(text)}&role=${role}`);
      const j = await r.json().catch(() => ({}));
      return r.ok && j.uuid ? { uuid: j.uuid, role: j.role } : null;
    };
    if (x.expanded_f) row.fClip = await look(x.expanded_f, 'target1');
    if (x.expanded_m) row.mClip = await look(x.expanded_m, 'target2');
    // is any played slot already pointing at the reading's clip?
    const want = row.fClip?.uuid || row.mClip?.uuid;
    row.slotOnReading = want ? played.filter(o => (x.expanded_f ? o.a1 : o.a2) === want).length : 0;
    out.push(row);
  }
  require('fs').writeFileSync(S + '/wiring.json', JSON.stringify(out, null, 1));
  const c = k => out.filter(k).length;
  console.log('expansions', out.length, 'with no row', c(r => !r.rows), 'only unplayed rows (seed>300/component)', c(r => r.rows && !r.played));
  console.log('female reading clip exists (target1, by text)', c(r => r.fClip), 'male reading clip exists', c(r => r.mClip), 'slots already on reading clip', out.reduce((a, r) => a + r.slotOnReading, 0));
  console.log('played slots total', out.reduce((a, r) => a + r.played, 0), 'a1 null', out.reduce((a, r) => a + r.a1Null, 0), 'a2 null', out.reduce((a, r) => a + r.a2Null, 0));
  console.log('fClip role', JSON.stringify(out.filter(r => r.fClip).slice(0, 5).map(r => [r.f, r.fClip])));
})();
