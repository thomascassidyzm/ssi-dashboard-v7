#!/usr/bin/env node
'use strict';
// job #710 (1b): eng_for_hin male-form known lines voiced in Kriti -> Rehan. Audio only via POST /api/audio/render (voiceId Rehan named,
// library first, ONE render, no retries). Then link-clip replace+expectCurrent.  usage: node rehan-fix.cjs dry|render|link-dry|link
const fs = require('fs'); const path = require('path');
const POPTY = 'http://localhost:3470', REHAN = 'cartesia_205fc552-2cce-4307-baa1-598b9dc3dd01', LOG = path.join(__dirname, 'rehan-render.jsonl');
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'rehan-slots.json'), 'utf8'));
const post = async (p, b) => { const r = await fetch(POPTY + p, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'kai-710-hin-three-fixes' }, body: JSON.stringify(b), signal: AbortSignal.timeout(240000) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const logged = () => new Map((fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : []).filter(l => l.status === 200 && !l.body.dryRun).map(l => [l.text, l.body.audioId]));
(async () => {
  const mode = process.argv[2];
  const texts = [...new Set(J.map(s => s.text))];
  if (mode === 'dry' || mode === 'render') {
    const done = logged();
    for (const text of texts) {
      if (done.has(text)) continue;
      const r = await post('/api/audio/render', { courseCode: 'eng_for_hin', role: 'known', text, voiceId: REHAN, purpose: 'job #710 male-form known line must be Rehan (Kai 29 Oct; Tom r-2026-10-29)', dryRun: mode === 'dry' });
      console.log(mode, r.status, r.body.source, r.body.audioId, r.body.charsSpent ?? r.body.wouldSpendChars, r.body.code || '', text.slice(0, 30));
      if (mode === 'render') fs.appendFileSync(LOG, JSON.stringify({ text, status: r.status, body: r.body }) + '\n');
      if (r.status !== 200) { console.log('STOP', JSON.stringify(r.body).slice(0, 300)); break; }
    }
  } else if (mode === 'link-dry' || mode === 'link') {
    const done = logged();
    const links = J.filter(s => done.has(s.text)).map(s => ({ ...(s.id.startsWith('eng_for_hin:') ? { phraseId: s.id } : { legoId: s.id }), role: 'known', audioId: done.get(s.text), replace: true, expectCurrent: s.current }));
    const r = await post('/api/production/eng_for_hin/link-clip', { links, dryRun: mode === 'link-dry' });
    console.log(r.status, JSON.stringify(r.body).slice(0, 1500));
  }
})();
