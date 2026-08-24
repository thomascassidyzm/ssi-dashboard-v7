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
 *   2. `explainer_audio_id` is OUT OF SCOPE entirely — deprecated 2026-08-24,
 *      neither measured nor written;
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

/**
 * The retired pod's row at scene 2, sentence 2 — a different conversation.
 * explainer_audio_id is carried on both fixtures below only to prove this
 * tool ignores it entirely (deprecated 2026-08-24) — never measured, never
 * repaired, whatever it points at.
 */
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
  it('covers exactly the three split-array slots — explainer_audio_id is out of scope', () => {
    expect(REPAIRABLE_SLOTS).toEqual([
      'sentence_audio_ids', 'sentence_known_audio_ids', 'takeg_audio_ids',
    ])
    expect(MEASURED_SLOTS).toEqual(REPAIRABLE_SLOTS)
  })

  it('never measures or plans a write on explainer_audio_id, even when it is inherited', () => {
    // e1 is byte-identical to OLD's explainer, same signature findInheritedSplitAudio
    // would flag on any of the three real slots — but the field is not in scope.
    const { plan, measured } = planPod({
      rows: [NEW], ancestorRowSets: [[OLD]], clips: CLIPS, speakers: SPEAKERS,
    })
    expect(measured.explainer_audio_id).toBeUndefined()
    const fields = plan.flatMap(p => p.slots.map(s => s.field)).sort()
    expect(fields).toEqual(['sentence_audio_ids', 'sentence_known_audio_ids', 'takeg_audio_ids'])
    expect(fields).not.toContain('explainer_audio_id')
  })
})

// FLIPPED 2026-08-24: the pod-sentence explainer narration track is
// deprecated. EXPLAINER_PROTECTED/isProtected (worker #312's sixteen
// protected rows) and the re-point/hold/cast-skip mechanics that used to
// govern explainer_audio_id are all removed from the tool along with them —
// this block used to assert those six behaviours; it now asserts the single
// fact that replaces them: the field is invisible to planPod, full stop.
describe('the explainer column is out of scope entirely (deprecated 2026-08-24)', () => {
  it('never plans a write on explainer_audio_id, protected row or not', () => {
    const row = { ...NEW, pod_id: 'spa_for_eng:pod-1', global_order: 3 }
    const { plan, held } = planPod({
      rows: [row], ancestorRowSets: [[OLD]], clips: CLIPS, speakers: SPEAKERS,
    })
    expect(plan[0].slots.map(s => s.field)).not.toContain('explainer_audio_id')
    expect(held.map(h => h.field)).not.toContain('explainer_audio_id')
  })

  it('ignores an inherited explainer regardless of what it quotes', () => {
    const clips = { ...CLIPS, e1: { text: '"Cosa fai". means what do you do.', voice_id: 'comp:rex+bedd6226' } }
    const { plan, held } = planPod({
      rows: [NEW], ancestorRowSets: [[OLD]], clips, speakers: SPEAKERS,
    })
    expect(plan[0].slots.map(s => s.field)).not.toContain('explainer_audio_id')
    expect(held.map(h => h.field)).not.toContain('explainer_audio_id')
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
    // the other in-scope slots have no candidate and still fall back
    expect(plan[0].slots.filter(x => x.action === 'null').map(x => x.field).sort())
      .toEqual(['sentence_known_audio_ids', 'takeg_audio_ids'])
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
