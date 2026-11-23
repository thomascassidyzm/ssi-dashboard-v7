// Which ops of a C0108 changeset are LANDED live (cs #374·AI, 23 Nov). The applier's client times out at its own
// deadline while Popty's transaction can still commit: on the night of 22 Nov kor/lav/mlt (55 ops) and nan (14 ops)
// came back "HTTP 0 aborted" / "409 statement timeout" yet were in the DB. The re-run then ledgered them "already"
// (live holds the target) or, for inserts, "refused … already exists". All three mean the row is live as planned —
// readback (live-check.cjs) verifies that and night-audio voices it; a slot keyed only on "applied" is left silent.
const fs = require('fs');
const EXISTS = /(lego|phrase)\.insert: .* already exists$/;
function landed(ledgerFile) {
  const out = new Map();
  if (!fs.existsSync(ledgerFile)) return out;
  for (const l of fs.readFileSync(ledgerFile, 'utf8').split('\n').filter(Boolean)) {
    const r = JSON.parse(l);
    const ok = r.status === 'applied' || r.status === 'already' || (r.status === 'refused' && EXISTS.test(String(r.detail || '')));
    for (const i of r.ops || []) if (ok) out.set(i, r.status); else out.delete(i);
  }
  return out;
}
module.exports = { landed };
