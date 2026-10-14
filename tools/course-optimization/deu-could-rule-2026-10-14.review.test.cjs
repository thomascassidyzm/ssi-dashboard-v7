'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./deu-could-rule-2026-10-14.cjs');
const { ROWS } = require('./deu-could-rule-2026-10-14.data.cjs');
const { renderClip } = require('../../services/shared/audio-render-entry.cjs');

test('preparing S0311L01 audio must leave the live intro unchanged until edit-batch applies', async () => {
  const oldLego = { lego_id: 'S0311L01', is_new: true, known_text: 'he could not', target_text: 'er konnte nicht', components: [] };
  const p = T.plan({ seeds: [], phrases: [], legos: [oldLego] }, ROWS.filter(r => r[0] === oldLego.lego_id));
  const ask = T.clipAsks(p).find(a => a.role === 'presentation');
  let liveIntro = 'old-intro';
  // The real-render request at line 206, and the route's committed library-hit path.
  // No provider, network or database is used.
  await renderClip({ courseCode: 'deu_for_eng', role: ask.role, text: ask.text,
    purpose: 'offline review', requestedBy: 'review', legoId: ask.legoId }, {
    resolve: async () => ({ language: 'eng', voiceId: 'test', provider: 'test' }),
    link: async () => ({ audioId: 'new-intro', s3Key: 'existing-library-clip' }),
    linkLego: async ({ audioId }) => { liveIntro = audioId; return { linked: true }; },
  });
  assert.equal(oldLego.known_text, 'he could not');
  assert.equal(liveIntro, 'old-intro');
});
