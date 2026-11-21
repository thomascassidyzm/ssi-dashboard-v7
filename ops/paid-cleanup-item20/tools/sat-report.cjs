#!/usr/bin/env node
// cs #79·AJ: the per-course results of the Saturday run, from files only (ledgers, audio logs, spend file, validate diffs).
// Writes ~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item20/results.md (+ .json) and prints a one-line summary.
// usage: node sat-report.cjs [<item dir>]
const fs = require('fs'); const os = require('os'); const path = require('path');
const ITEM = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const cs = require(path.join(ITEM, '../../services/shared/changeset.cjs'));
const { slotsFor } = require(path.join(ITEM, '../paid-cleanup-item9/tools/ledger-state.cjs'));
const EV = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item20');
const COURSES = ['eng_for_urd', 'eng_for_pan', 'eng_for_mar', 'eng_for_ben', 'eng_for_guj'];
const lines = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
const out = []; const T = { ops: 0, applied: 0, already: 0, drift: 0, refused: 0, left: 0, slots: 0, linked: 0, rendered: 0, refusedA: 0, unanswered: 0, cart: 0, az: 0 };
for (const c of COURSES) {
  const f = path.join(ITEM, c, 'changesets', 'item20.changeset.jsonl');
  if (!fs.existsSync(f)) continue;
  const { ops, ledger, slots } = slotsFor(f);
  const st = {}; for (const v of ledger.values()) st[v] = (st[v] || 0) + 1;
  const led = lines(`${f}.applied.jsonl`);
  const held = led.filter((l) => l.status === 'drift' || l.status === 'refused').map((l) => ({ status: l.status, ops: l.ops, detail: String(l.detail || l.error || '').slice(0, 200) }));
  const undo = [...new Set(led.filter((l) => l.status === 'applied').map((l) => JSON.stringify({ event: l.event_id || l.eventId || null, undo: l.undo_file || l.undoFile || null })))].map((x) => JSON.parse(x));
  const audio = lines(`${f}.audio.jsonl`); const answered = new Set(audio.map((a) => a.key));
  const r = { course: c, ops: ops.length, applied: st.applied || 0, already: st.already || 0, drift: st.drift || 0, refused: st.refused || 0, left: ops.length - ledger.size,
    slots: slots.length, unanswered: slots.filter((s) => !answered.has(s.key)).length,
    linked_library: audio.filter((a) => a.ok && a.source === 'library' && a.link && a.link.ok).length,
    rendered_linked: audio.filter((a) => a.ok && a.source === 'rendered' && a.link && a.link.ok).length,
    link_failed: audio.filter((a) => a.ok && !(a.link && a.link.ok)).length,
    refused_audio: audio.filter((a) => !a.ok).length,
    refused_codes: audio.filter((a) => !a.ok).reduce((m, a) => { m[a.code || a.http] = (m[a.code || a.http] || 0) + 1; return m; }, {}),
    cartesia_chars: audio.filter((a) => a.cartesia).reduce((s, a) => s + (a.charsSpent || 0), 0),
    azure_chars: audio.filter((a) => !a.cartesia).reduce((s, a) => s + (a.charsSpent || 0), 0),
    undo, held: held.slice(0, 50),
    validate: fs.existsSync(path.join(ITEM, c, 'validate-diff.json')) ? (({ touched, pass_after, fixed, new_issues }) => ({ touched, pass_after, fixed, new_issues: (new_issues || []).length }))(JSON.parse(fs.readFileSync(path.join(ITEM, c, 'validate-diff.json'), 'utf8'))) : null };
  out.push(r);
  for (const [k, v] of [['ops', r.ops], ['applied', r.applied], ['already', r.already], ['drift', r.drift], ['refused', r.refused], ['left', r.left], ['slots', r.slots], ['linked', r.linked_library], ['rendered', r.rendered_linked], ['refusedA', r.refused_audio], ['unanswered', r.unanswered], ['cart', r.cartesia_chars], ['az', r.azure_chars]]) T[k] += v;
}
fs.mkdirSync(EV, { recursive: true });
fs.writeFileSync(path.join(EV, 'results.json'), JSON.stringify({ at: new Date().toISOString(), total: T, courses: out }, null, 1));
const md = ['| course | ops | applied | already | held (drift/refused) | text left | audio slots | linked free | rendered | link failed | audio refused | unanswered | Cartesia | Azure | validate after (touched / pass / new issues) |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...out.map((r) => `| ${r.course} | ${r.ops} | ${r.applied} | ${r.already} | ${r.drift}/${r.refused} | ${r.left} | ${r.slots} | ${r.linked_library} | ${r.rendered_linked} | ${r.link_failed} | ${r.refused_audio} ${JSON.stringify(r.refused_codes)} | ${r.unanswered} | ${r.cartesia_chars} | ${r.azure_chars} | ${r.validate ? `${r.validate.touched} / ${r.validate.pass_after} / ${r.validate.new_issues}` : 'not run'} |`)];
fs.writeFileSync(path.join(EV, 'results.md'), md.join('\n') + '\n');
console.log(`item20: applied ${T.applied}/${T.ops} (+${T.already} already), held ${T.drift + T.refused}, text left ${T.left}; audio ${T.slots} slots: linked ${T.linked}, rendered ${T.rendered}, refused ${T.refusedA}, unanswered ${T.unanswered}; Cartesia ${T.cart}, Azure ${T.az}`);
