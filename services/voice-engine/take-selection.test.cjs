/**
 * The two questions, pinned. The case that forced this file: a pod line whose
 * text gained a "…" pause cue on 2026-08-11 while the recordist's take of the
 * same sentence stays filed under the un-cued spelling — linked, playing to
 * learners, and reported to its own recordist as never recorded.
 */
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { isLineRecorded, lineHasTake, pickCurrentTake, resolveCurrentClip } = require('./take-selection.cjs')

/** Stub db: one course_audio table, only the calls the resolver makes. */
function stubDb(rows) {
  return {
    from() {
      let out = rows.slice()
      const q = {
        select() { return q },
        eq(col, val) { out = out.filter((r) => r[col] === val); return q },
        in(col, vals) { out = out.filter((r) => vals.includes(r[col])); return q },
        order(col, opts) {
          const dir = opts && opts.ascending === false ? -1 : 1
          out = out.slice().sort((a, b) => (String(a[col]) > String(b[col]) ? dir : -dir))
          return q
        },
        limit(n) { out = out.slice(0, n); return Promise.resolve({ data: out, error: null }) },
        maybeSingle() { return Promise.resolve({ data: out[0] || null, error: null }) },
      }
      return q
    },
  }
}

const spellings = ['human_aran_cym_n', 'human_aran_cym_n_2']

test.describe('lineHasTake', () => {
  test('sees a take filed under the line\'s own text', () => {
    const line = { kind: 'pod', text: 'A be ydy cyfrinair y wifi?' }
    const recordedKeys = new Set(['a be ydy cyfrinair y wifi'])
    assert.strictEqual(lineHasTake(line, { recordedKeys, spellings }), true)
  })

  test('sees a take through the SLOT when the pause cue broke the text match', () => {
    const line = { kind: 'pod', text: 'A be ydy… cyfrinair y wifi?', filledBy: ['human_aran_cym_n_2'] }
    const recordedKeys = new Set(['a be ydy cyfrinair y wifi'])
    assert.strictEqual(lineHasTake(line, { recordedKeys, spellings }), true)
  })

  test('does not claim a slot filled by somebody else', () => {
    const line = { kind: 'pod', text: 'Bore da, Sarah!', filledBy: ['human_catrinlliar_cym_n'] }
    assert.strictEqual(lineHasTake(line, { recordedKeys: new Set(), spellings }), false)
  })

  test('leaves an unlinked, unrecorded line outstanding', () => {
    const line = { kind: 'pod', text: 'Noswaith dda.', filledBy: [] }
    assert.strictEqual(lineHasTake(line, { recordedKeys: new Set(), spellings }), false)
  })

  test('a SEED line is recorded when ANY copy\'s slot holds this voice (2026-09-11)', () => {
    const filled = { kind: 'seed', role: 'target2', text: 'x', seedFilledBy: ['human_aran_cym_n', 'human_aran_cym_n'] }
    // One copy held by another recordist's clip, which linkSeedTake rightly
    // refuses to move. Under the old EVERY-copy rule this seed was served for
    // ever, asking for a take the linker would then decline to place.
    const partial = { kind: 'seed', role: 'target2', text: 'x', seedFilledBy: ['human_aran_cym_n', 'human_catrinlliar_cym_n'] }
    const theirs = { kind: 'seed', role: 'target2', text: 'x', seedFilledBy: ['human_catrinlliar_cym_n'] }
    assert.strictEqual(lineHasTake(filled, { recordedKeys: new Set(), spellings }), true)
    assert.strictEqual(lineHasTake(partial, { recordedKeys: new Set(), spellings }), true)
    assert.strictEqual(lineHasTake(theirs, { recordedKeys: new Set(), spellings }), false)
    // And a stored take of the words by this voice is a confirmed upload too.
    assert.strictEqual(lineHasTake(theirs, { recordedKeys: new Set(['x']), spellings }), true)
    // A fixture's KNOWN-side line is filed under the known language: the
    // target-language key set cannot vouch for it, only its slot can.
    const known = { kind: 'seed', role: 'known', text: 'x', seedFilledBy: [null] }
    assert.strictEqual(lineHasTake(known, { recordedKeys: new Set(['x']), spellings }), false)
  })

  // 2026-09-03. A MINIMAL-SET LEGO is scored by its own slot, exactly as a seed
  // is, because course_legos.target1_audio_id is what the splicer will reach
  // for. Tom's booth said "none recorded yet · 130 still to read" over 27 of his
  // own takes; these four cases are the shape of that bug.
  test('scores a minimal-set LEGO by its own slot', () => {
    const mine = { kind: 'quarry', quarrySource: 'lego', text: 'esta tarde', slotFilledBy: ['human_aran_cym_n'] }
    const empty = { kind: 'quarry', quarrySource: 'lego', text: 'esta tarde', slotFilledBy: [] }
    const theirs = { kind: 'quarry', quarrySource: 'lego', text: 'esta tarde', slotFilledBy: ['human_catrinlliar_cym_n'] }
    assert.strictEqual(lineHasTake(mine, { recordedKeys: new Set(), spellings }), true)
    assert.strictEqual(lineHasTake(empty, { recordedKeys: new Set(), spellings }), false)
    // A slot filled by somebody else is not this recordist's take (#378).
    assert.strictEqual(lineHasTake(theirs, { recordedKeys: new Set(['esta tarde']), spellings }), false)
  })

  test('scores a minimal-set WORD by clip identity, because it owns no slot', () => {
    const word = { kind: 'quarry', quarrySource: 'word', text: 'tarde', slotFilledBy: null }
    assert.strictEqual(lineHasTake(word, { recordedKeys: new Set(['tarde']), spellings }), true)
    assert.strictEqual(lineHasTake(word, { recordedKeys: new Set(), spellings }), false)
  })
})

// THE ACCEPTANCE (Tom, 2026-09-11): a line with a confirmed upload is recorded,
// and nothing else about it can say otherwise. Each case below is a state the
// estate has actually put a recorded line into and then re-served it.
test.describe('isLineRecorded — a confirmed upload is a recording, full stop', () => {
  const recorded = { kind: 'pod', text: 'Prynhawn da.', filledBy: ['human_aran_cym_n'] }
  const ctx = { recordedKeys: new Set(), spellings }

  test('under a rejected / refused verdict (a want written against the take)', () => {
    assert.strictEqual(isLineRecorded({ ...recorded, rerecordWanted: true, rerecordReason: 'clipped' }, ctx), true)
  })

  test('when the line was re-assigned to another owner but his take still fills the slot', () => {
    // The cast now names Catrin; the slot still holds Aran's clip. For ARAN it
    // is recorded. (For Catrin it is not — she has not read it — and the queue
    // routes it to her bucket; see recordist-queue.test.cjs.)
    assert.strictEqual(isLineRecorded({ ...recorded, speaker: 'Catrin' }, ctx), true)
  })

  test('when the pod moved: the row is the same row, the slot is the same slot', () => {
    assert.strictEqual(isLineRecorded({ ...recorded, podId: 'somewhere-else' }, ctx), true)
  })

  test('when the take is stored under an alias spelling of the voice', () => {
    assert.strictEqual(isLineRecorded({ ...recorded, filledBy: ['human_aran_cym_n_2'] }, ctx), true)
  })

  test('and a line with NO confirmed upload is still to read, whatever flags it carries', () => {
    assert.strictEqual(isLineRecorded({ kind: 'pod', text: 'Nos da.', filledBy: [], rerecordWanted: true }, ctx), false)
    assert.strictEqual(isLineRecorded({ kind: 'pod', text: 'Nos da.', filledBy: ['human_catrinlliar_cym_n'] }, ctx), false)
  })
})

// THE OTHER HALF OF THE INVARIANT: the learner's playback and the booth's
// Listen button resolve the SAME file for a line whose slot holds the
// recordist's take. Shaped on real Senedd rows (cym_n_for_eng:senedd-s4c-steve).
test.describe('resolveCurrentClip — learner path and booth path agree', () => {
  const rows = [
    { id: 'a1', s3_key: 'mastered/120944C0.mp3', voice_id: 'human_aran_cym_n', language: 'cym', text_normalized: 'diolch yn fawr', created_at: '2026-09-11T10:00:00Z' },
    { id: 'a0', s3_key: 'mastered/OLD.mp3', voice_id: 'human_aran_cym_n', language: 'cym', text_normalized: 'diolch yn fawr', created_at: '2026-09-10T10:00:00Z' },
  ]
  const sentence = { id: 'cym_n_for_eng:senedd-s4c-steve:SC160-S0567', target_text: 'Diolch yn fawr.', target_audio_id: 'a1' }

  test('same line, same file, through both declared modes', async () => {
    const db = stubDb(rows)
    const learner = await resolveCurrentClip(db, { sentence, track: 'target' })
    const booth = await resolveCurrentClip(db, { sentence, track: 'target', language: 'cym', restrictToVoices: spellings, allowIdentityFallback: true })
    assert.ok(learner && booth)
    assert.strictEqual(learner.s3Key, booth.s3Key)
    assert.strictEqual(learner.audioId, 'a1')
    assert.strictEqual(booth.source, 'slot')
  })

  test('an unlinked take is still HIS take on the booth path, and the learner hears nothing — a linking gap, reported, never a re-record', async () => {
    const db = stubDb(rows)
    const unlinked = { ...sentence, target_audio_id: null }
    const learner = await resolveCurrentClip(db, { sentence: unlinked, track: 'target' })
    const booth = await resolveCurrentClip(db, { sentence: unlinked, track: 'target', language: 'cym', restrictToVoices: spellings, allowIdentityFallback: true })
    assert.strictEqual(learner, null)
    assert.strictEqual(booth && booth.audioId, 'a1', 'newest stored take by the server clock')
  })
})

test.describe('pickCurrentTake', () => {
  test('takes the newest by the server\'s own clock', () => {
    const rows = [
      { id: 'june', created_at: '2026-06-15T15:43:24.708Z' },
      { id: 'august', created_at: '2026-08-23T17:17:01.985Z' },
    ]
    assert.strictEqual(pickCurrentTake(rows).id, 'august')
    assert.strictEqual(pickCurrentTake([]), null)
  })
})

test.describe('resolveCurrentClip — the one resolver', () => {
  const clips = [
    { id: 'slot-clip', s3_key: 'mastered/SLOT.mp3', voice_id: 'human_aran_cym_n', language: 'cym', text_normalized: 'a be ydy cyfrinair y wifi', created_at: '2026-06-15T00:00:00Z' },
    { id: 'newer-identity', s3_key: 'mastered/NEWER.mp3', voice_id: 'human_aran_cym_n', language: 'cym', text_normalized: 'noswaith dda', created_at: '2026-08-23T00:00:00Z' },
    { id: 'older-identity', s3_key: 'mastered/OLDER.mp3', voice_id: 'human_aran_cym_n_2', language: 'cym', text_normalized: 'noswaith dda', created_at: '2026-06-15T00:00:00Z' },
  ]
  const db = stubDb(clips)

  test('THE LEARNER AND THE RECORDIST GET THE SAME FILE when the slot is filled', async () => {
    const sentence = { target_audio_id: 'slot-clip', target_text: 'A be ydy… cyfrinair y wifi?' }
    const learner = await resolveCurrentClip(db, { sentence, track: 'target' })
    const recordist = await resolveCurrentClip(db, {
      sentence, track: 'target', language: 'cym',
      restrictToVoices: ['human_aran_cym_n', 'human_aran_cym_n_2'], allowIdentityFallback: true,
    })
    assert.strictEqual(learner.s3Key, 'mastered/SLOT.mp3')
    assert.strictEqual(recordist.s3Key, learner.s3Key)
    assert.strictEqual(learner.source, 'slot')
  })

  test('the learner view never invents a clip for an empty slot', async () => {
    const sentence = { target_audio_id: null, target_text: 'Noswaith dda.' }
    assert.strictEqual(await resolveCurrentClip(db, { sentence, track: 'target' }), null)
  })

  test('the recordist view falls back to their own NEWEST take, across spellings', async () => {
    const sentence = { target_audio_id: null, target_text: 'Noswaith dda.' }
    const got = await resolveCurrentClip(db, {
      sentence, track: 'target', language: 'cym',
      restrictToVoices: ['human_aran_cym_n', 'human_aran_cym_n_2'], allowIdentityFallback: true,
    })
    assert.strictEqual(got.s3Key, 'mastered/NEWER.mp3')
    assert.strictEqual(got.source, 'identity')
  })

  test('a slot filled by another voice is not this recordist\'s clip', async () => {
    const sentence = { target_audio_id: 'slot-clip', target_text: 'A be ydy… cyfrinair y wifi?' }
    const got = await resolveCurrentClip(db, {
      sentence, track: 'target', language: 'cym',
      restrictToVoices: ['human_catrinlliar_cym_n'], allowIdentityFallback: false,
    })
    assert.strictEqual(got, null)
  })
})
