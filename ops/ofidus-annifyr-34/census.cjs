'use strict';
// #34 census: every ofidus/gofidus row in cym_nv2/sv2. Read-only via Popty.
const BASE = 'http://localhost:3470';
const RX = /ofidus/i;
(async () => { for (const c of ['cym_nv2_for_eng', 'cym_sv2_for_eng']) {
  const d = await (await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: { 'x-agent-id': 'aran-watson-34' } })).json();
  for (const s of d.seeds) {
    if (RX.test(s.target_text)) console.log(c, 'SEED', s.seed_number, '|', s.target_text, '|', s.known_text, '| t1', s.target1_audio_id, 't2', s.target2_audio_id);
    for (const l of s.legos) {
      if (RX.test(l.target_text) || RX.test(JSON.stringify(l.components||[]))) console.log(c, 'LEGO', l.lego_id, 'new=' + l.is_new, '|', l.target_text, '|', l.known_text, '|', JSON.stringify(l.components || []), '| t1', l.target1_audio_id, 't2', l.target2_audio_id);
      for (const p of l.basket_phrases || []) if (RX.test(p.target_text)) console.log(c, 'PHR', p.id, '|', p.target_text);
    } } } })();
