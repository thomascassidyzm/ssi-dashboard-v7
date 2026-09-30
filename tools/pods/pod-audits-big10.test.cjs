// The two read-only big-10 audits (job #950): what makes a Drill card "target-silent", and what counts as a wrong-gender voice.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { drillCards } = require('./drill-gap-audit-big10.cjs')
const { summarise } = require('./pod-voice-census-big10.cjs')

describe('drillCards', () => {
  // the learner app's composers are injected; here a plain per-sentence split with no fine map
  const split = (row) => row.sentence_audio_ids.map((id, i) => ({ targetText: row.target_text.split('. ')[i], targetAudioId: id, knownText: '', knownAudioId: null }));
  it('one card per sentence unit, carrying its clip pointer — a null pointer is what makes a card silent', () => {
    const cards = drillCards([{ global_order: 7, target_text: 'Uno. Dos', sentence_audio_ids: ['a', null] }], new Map(), { splitRowUnits: split, buildFusionGroups: () => null });
    expect(cards.map((c) => c.targetClip)).toEqual(['a', null]);
  });
});

describe('summarise', () => {
  const voices = new Map([['lena', { name: 'Lena', engine: 'xai', gender: 'f' }], ['rex', { name: 'Rex', engine: 'xai', gender: 'm' }]]);
  it('counts clips by speaker gender and flags an opposite-gender voice', () => {
    const s = summarise([{ speaker: 'A', voice_id: 'xai_lena', n: 3 }, { speaker: 'B', voice_id: 'xai_lena', n: 2 }],
      { A: { gender: 'f' }, B: { gender: 'm' } }, new Map([['lena', { name: 'Lena', tts_engine: 'xai', gender: 'f' }]]));
    expect(s.byGender.f['Lena (xai)']).toBe(3);
    expect(s.byGender.m['Lena (xai)']).toBe(2);
    expect(s.genderMismatch).toBe(2);
  });
});
