/**
 * Unit tests for the residual inherited-slot repair (2026-08-24).
 *
 * `repair-split-array-inheritance.cjs` cleared the bulk of the clone+align
 * inheritance defect off the live pod-1 fleet, judging a slot by whether its
 * clips' text tiles the row. That test passes a slot whose clips happen to say
 * something the row also says — and 45 array slots survived it while still
 * being BYTE-IDENTICAL to the retired pod's same (scene, sentence) slot. In the
 * measured population those are near-misses that matter: ita s6/7 displays
 * "Cosa fai?" and plays a clip saying "Cosa fa?"; hrv s4/3 displays the feminine
 * "zauzeta" and plays "zauzet".
 *
 * The facts pinned here:
 *   1. the detector is `findInheritedSplitAudio` — byte identity, never a
 *      similarity test;
 *   2. `explainer_audio_id` is MEASURED and never written (worker #312 owns it);
 *   3. a replacement is taken only after make-before-break — alive, cast for THIS
 *      ROW'S SPEAKER, and coherent with the row's own text;
 *   4. cast is judged PER SPEAKER, not by set membership — the ara_eg s2/2 shape,
 *      where the clips are the pod's female voice on a male character's line;
 *   5. a row whose own whole-turn clip is wrong is excluded, because nulling it
 *      would fall back to something already wrong.
 *
 * Pure unit tests. Nothing here opens a database.
 */

import { describe, it, expect } from 'vitest'

const {
  REPAIRABLE_SLOTS,
  MEASURED_SLOTS,
  EXPLAINER_PROTECTED,
  isProtected,
  verifyWholeTurn,
  replacementRefusal,
  planPod,
} = require('./repair-residual-inherited-split-slots.cjs')

/** Two characters, two voices, per track — the pod-1 casting shape. */
const SPEAKERS = {
  Passenger: { target: { voice_id: 'rex' }, known: { voice_id: 'gfzdpspr5fdp' } },
  Driver: { target: { voice_id: 'eve' }, known: { voice_id: 'bedd6226' } },
}

const clip = (text, voice_id) => ({ text, voice_id })

/** The retired pod's row at scene 2, sentence 2 — a different conversation. */
const OLD = {
  id: 'x:pod-0:SC02-S002',
  scene_number: 2,
  sentence_number: 2,
  speaker: 'Passenger',
  target_text: 'Buongiorno. Come sta?',
  known_text: 'Good morning. How are you?',
  sentence_audio_ids: ['a1', 'a2'],
  sentence_known_audio_ids: ['k1', 'k2'],
  takeg_audio_ids: ['g1', null],
  explainer_audio_id: 'e1',
}

/** The live row now occupying that slot: new text, the old slots left standing. */
const NEW = {
  id: 'x:pod-1:SC02-S002',
  scene_number: 2,
  sentence_number: 2,
  speaker: 'Passenger',
  target_text: 'Questa è una città bellissima. Cosa fai?',
  known_text: 'This is a beautiful city. What do you do?',
  target_audio_id: 'w-t',
  known_audio_id: 'w-k',
  sentence_audio_ids: ['a1', 'a2'],
  sentence_known_audio_ids: ['k1', 'k2'],
  takeg_audio_ids: ['g1', null],
  explainer_audio_id: 'e1',
}

const CLIPS = {
  'w-t': clip('Questa è una città bellissima. Cosa fai?', 'rex'),
  'w-k': clip('This is a beautiful city. What do you do?', 'gfzdpspr5fdp'),
  a1: clip('Buongiorno.', 'rex'),
  a2: clip('Come sta?', 'rex'),
  k1: clip('Good morning.', 'gfzdpspr5fdp'),
  k2: clip('How are you?', 'gfzdpspr5fdp'),
  g1: clip('Buongiorno, [pause] come sta?', 'rex'),
  e1: clip('"Buongiorno". means good morning.', 'comp:rex+bedd6226'),
}

describe('scope', () => {
  it('covers all four non-whole-turn slots once the explainer fence is lifted', () => {
    expect(REPAIRABLE_SLOTS).toEqual([
      'sentence_audio_ids', 'sentence_known_audio_ids', 'takeg_audio_ids', 'explainer_audio_id',
    ])
    expect(MEASURED_SLOTS).toEqual(REPAIRABLE_SLOTS)
  })

  it('measures the inherited explainer and repairs it when it explains another row', () => {
    const { plan, measured } = planPod({
      rows: [NEW], ancestorRowSets: [[OLD]], clips: CLIPS, speakers: SPEAKERS,
    })
    expect(measured.explainer_audio_id).toBe(1)
    const fields = plan.flatMap(p => p.slots.map(s => s.field)).sort()
    expect(fields).toEqual([
      'explainer_audio_id', 'sentence_audio_ids', 'sentence_known_audio_ids', 'takeg_audio_ids',
    ])
    const ex = plan[0].slots.find(s => s.field === 'explainer_audio_id')
    expect(ex.action).toBe('null')
    expect(ex.before).toBe('e1') // scalar, snapshotted as a scalar
  })
})

describe('the explainer column', () => {
  /** #312's sixteen — the exact keys it published, by pod_id and global_order. */
  it('holds all sixteen of worker #312\'s protected rows', () => {
    expect(EXPLAINER_PROTECTED.size).toBe(16)
    expect(isProtected({ pod_id: 'ara_eg_for_eng:pod-1', global_order: 20 })).toBe(true)
    expect(isProtected({ pod_id: 'spa_for_eng:pod-1', global_order: 3 })).toBe(true)
    expect(isProtected({ pod_id: 'spa_for_eng:pod-1', global_order: 4 })).toBe(false)
  })

  it('never plans a write on a protected row, even when it is inherited and wrong', () => {
    const row = { ...NEW, pod_id: 'spa_for_eng:pod-1', global_order: 3 }
    const { plan, held } = planPod({
      rows: [row], ancestorRowSets: [[OLD]], clips: CLIPS, speakers: SPEAKERS,
    })
    expect(plan[0].slots.map(s => s.field)).not.toContain('explainer_audio_id')
    expect(held.map(h => h.why).join(' ')).toMatch(/protected/)
  })

  it('leaves an inherited explainer that still quotes its own row', () => {
    // The slot was carried across a text change, but the gloss happens to
    // explain the NEW row — a gloss that explains its row is not a defect.
    const clips = { ...CLIPS, e1: { text: '"Cosa fai". means what do you do.', voice_id: 'comp:rex+bedd6226' } }
    const { plan, held } = planPod({
      rows: [NEW], ancestorRowSets: [[OLD]], clips, speakers: SPEAKERS,
    })
    expect(plan[0].slots.map(s => s.field)).not.toContain('explainer_audio_id')
    expect(held.map(h => h.why).join(' ')).toMatch(/still quotes this row/)
  })

  it('re-points to a retired row carrying BOTH texts identical, and does not cast-test the composite', () => {
    const elsewhere = {
      ...OLD,
      id: 'x:pod-0:SC09-S001',
      scene_number: 9,
      target_text: NEW.target_text,
      known_text: NEW.known_text,
      explainer_audio_id: 'e9',
    }
    const clips = {
      ...CLIPS,
      // gloss half is the legacy narrator — deliberately off-cast, by design
      e9: { text: '"Cosa fai". means what do you do.', voice_id: 'comp:rex+en-GB-SoniaNeural' },
    }
    const { plan } = planPod({
      rows: [NEW], ancestorRowSets: [[OLD, elsewhere]], clips, speakers: SPEAKERS,
    })
    const ex = plan[0].slots.find(s => s.field === 'explainer_audio_id')
    expect(ex.action).toBe('re-point')
    expect(ex.after).toBe('e9')
  })

  it('requires BOTH texts to match for an explainer re-point — target alone is not enough', () => {
    const targetOnly = {
      ...OLD,
      id: 'x:pod-0:SC09-S001',
      scene_number: 9,
      target_text: NEW.target_text,
      known_text: 'Some other translation entirely.',
      explainer_audio_id: 'e9',
    }
    const clips = { ...CLIPS, e9: { text: '"Cosa fai". means what do you do.', voice_id: 'comp:rex+bedd6226' } }
    const { plan } = planPod({
      rows: [NEW], ancestorRowSets: [[OLD, targetOnly]], clips, speakers: SPEAKERS,
    })
    expect(plan[0].slots.find(s => s.field === 'explainer_audio_id').action).toBe('null')
  })

  it('does not refuse an explainer candidate for an off-cast gloss half', () => {
    const clips = { ...CLIPS, e9: { text: '"Cosa fai". means what do you do.', voice_id: 'comp:rex+en-GB-SoniaNeural' } }
    expect(replacementRefusal('e9', 'explainer_audio_id', NEW, clips, SPEAKERS)).toBeNull()
  })

  it('still refuses an explainer candidate that quotes a different conversation', () => {
    const clips = { ...CLIPS, e9: { text: '"Buongiorno". means good morning.', voice_id: 'comp:rex+bedd6226' } }
    expect(replacementRefusal('e9', 'explainer_audio_id', NEW, clips, SPEAKERS)).toMatch(/row-text walk/)
  })
})

describe('planPod', () => {
  it('nulls an inherited slot when no correct clip set exists', () => {
    const { plan } = planPod({
      rows: [NEW], ancestorRowSets: [[OLD]], clips: CLIPS, speakers: SPEAKERS,
    })
    expect(plan).toHaveLength(1)
    for (const s of plan[0].slots) {
      expect(s.action).toBe('null')
      expect(s.after).toBeNull()
      expect(s.before).not.toBeNull() // snapshotted, so the write is reversible
    }
  })

  it('re-points when a retired row renders this row\'s exact text, alive and in cast', () => {
    // The same conversation lived at scene 9 on the retired pod, correctly split.
    const elsewhere = {
      ...OLD,
      id: 'x:pod-0:SC09-S001',
      scene_number: 9,
      sentence_number: 1,
      target_text: NEW.target_text,
      known_text: NEW.known_text,
      sentence_audio_ids: ['b1', 'b2'],
    }
    const clips = {
      ...CLIPS,
      b1: clip('Questa è una città bellissima.', 'rex'),
      b2: clip('Cosa fai?', 'xai_rex'), // prefixed form of the same voice
    }
    const { plan } = planPod({
      rows: [NEW], ancestorRowSets: [[OLD, elsewhere]], clips, speakers: SPEAKERS,
    })
    const s = plan[0].slots.find(x => x.field === 'sentence_audio_ids')
    expect(s.action).toBe('re-point')
    expect(s.after).toEqual(['b1', 'b2'])
    // the other slots have no candidate and still fall back
    expect(plan[0].slots.filter(x => x.action === 'null').map(x => x.field).sort())
      .toEqual(['explainer_audio_id', 'sentence_known_audio_ids', 'takeg_audio_ids'])
  })

  it('refuses a candidate voiced by the wrong character, even though it IS in the cast', () => {
    // ara_eg s2/2: the clips are the pod's female voice; the row's speaker is male.
    const elsewhere = {
      ...OLD,
      id: 'x:pod-0:SC09-S001',
      scene_number: 9,
      target_text: NEW.target_text,
      sentence_audio_ids: ['b1', 'b2'],
    }
    const clips = {
      ...CLIPS,
      b1: clip('Questa è una città bellissima.', 'eve'),
      b2: clip('Cosa fai?', 'eve'),
    }
    const { plan } = planPod({
      rows: [NEW], ancestorRowSets: [[OLD, elsewhere]], clips, speakers: SPEAKERS,
    })
    expect(plan[0].slots.find(x => x.field === 'sentence_audio_ids').action).toBe('null')
  })

  it('refuses a candidate with a dead clip — make-before-break', () => {
    const elsewhere = {
      ...OLD, id: 'x:pod-0:SC09-S001', scene_number: 9,
      target_text: NEW.target_text, sentence_audio_ids: ['b1', 'gone'],
    }
    const clips = { ...CLIPS, b1: clip('Questa è una città bellissima.', 'rex') }
    const { plan } = planPod({
      rows: [NEW], ancestorRowSets: [[OLD, elsewhere]], clips, speakers: SPEAKERS,
    })
    expect(plan[0].slots.find(x => x.field === 'sentence_audio_ids').action).toBe('null')
  })

  it('does not flag a slot whose text never changed', () => {
    const unchanged = { ...NEW, target_text: OLD.target_text, known_text: OLD.known_text }
    const clips = { ...CLIPS, 'w-t': clip(OLD.target_text, 'rex'), 'w-k': clip(OLD.known_text, 'gfzdpspr5fdp') }
    const { plan, measured } = planPod({
      rows: [unchanged], ancestorRowSets: [[OLD]], clips, speakers: SPEAKERS,
    })
    expect(plan).toHaveLength(0)
    expect(Object.values(measured).every(n => n === 0)).toBe(true)
  })

  it('excludes a row whose own whole-turn clip is wrong — nulling would fall back to that', () => {
    const clips = { ...CLIPS, 'w-t': clip('Qualcosa di completamente diverso.', 'rex') }
    const { plan, badRows, wholeTurnFailures } = planPod({
      rows: [NEW], ancestorRowSets: [[OLD]], clips, speakers: SPEAKERS,
    })
    expect(plan).toHaveLength(0)
    expect(badRows).toEqual([NEW.id])
    expect(wholeTurnFailures.join(' ')).toMatch(/text mismatch/)
  })

  it('unions findings across every ancestor pod — inheritance can be more than one hop', () => {
    const hop = { ...OLD, id: 'x:pod-1-retired:SC02-S002', takeg_audio_ids: ['g9'] }
    const rows = [{ ...NEW, takeg_audio_ids: ['g9'] }]
    const clips = { ...CLIPS, g9: clip('Buongiorno, [pause] come sta?', 'rex') }
    const { plan } = planPod({
      rows, ancestorRowSets: [[OLD], [hop]], clips, speakers: SPEAKERS,
    })
    expect(plan[0].slots.map(s => s.field)).toContain('takeg_audio_ids')
  })
})

describe('verifyWholeTurn', () => {
  it('fails a whole-turn clip voiced by another character in the same cast', () => {
    const clips = { ...CLIPS, 'w-t': clip(NEW.target_text, 'eve') }
    const { badRows, failures } = verifyWholeTurn([NEW], clips, SPEAKERS)
    expect([...badRows]).toEqual([NEW.id])
    expect(failures.join(' ')).toMatch(/is not Passenger's cast target voice rex/)
  })

  it('passes a clip whose voice carries a provider prefix', () => {
    const clips = { ...CLIPS, 'w-t': clip(NEW.target_text, 'xai_rex') }
    expect([...verifyWholeTurn([NEW], clips, SPEAKERS).badRows]).toEqual([])
  })
})

describe('replacementRefusal', () => {
  it('refuses pieces that are not in this row\'s text at all', () => {
    const why = replacementRefusal(['a1', 'a2'], 'sentence_audio_ids', NEW, CLIPS, SPEAKERS)
    expect(why).toMatch(/row-text walk/)
  })

  it('refuses pieces that appear out of order', () => {
    const clips = {
      ...CLIPS,
      b1: clip('Cosa fai?', 'rex'),
      b2: clip('Questa è una città bellissima.', 'rex'),
    }
    expect(replacementRefusal(['b1', 'b2'], 'sentence_audio_ids', NEW, clips, SPEAKERS))
      .toMatch(/row-text walk/)
  })

  it('accepts an alive, in-cast, in-order set', () => {
    const clips = {
      ...CLIPS,
      b1: clip('Questa è una città bellissima.', 'rex'),
      b2: clip('Cosa fai?', 'rex'),
    }
    expect(replacementRefusal(['b1', 'b2'], 'sentence_audio_ids', NEW, clips, SPEAKERS)).toBeNull()
  })
})
