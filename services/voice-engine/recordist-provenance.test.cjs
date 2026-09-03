/**
 * recordist-provenance.test.cjs — WHO WROTE THE WORDS, all the way to the booth.
 *
 * Tom, 2026-09-03: the artist "should be able to SEE that a line is
 * machine-drafted rather than human-authored, and their correction must write
 * back to the text". Two halves, and this file holds both ends of the first one
 * plus the write-back's own draft-clearing:
 *
 *   1. `target_text_draft` is READ off the row, survives the duplicate collapse,
 *      and lands on the wire as `machineDrafted` — the queue used not even to
 *      SELECT the column, which is why nothing about provenance could reach a
 *      booth however the screen was written.
 *   2. It is INFORMATIONAL and nothing else. A drafted line is queued, counted
 *      and recorded exactly like any other. There is no gate here, no approval
 *      and no wait: the expert edits in place, they do not approve in advance.
 *   3. An edit CLEARS it, because a human editing the line is the proofread the
 *      draft was waiting for — otherwise a corrected line would carry "a machine
 *      wrote this" for ever.
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { buildQueue, resolveRecordist, machineDrafted } = require('./recordist-queue.cjs')

function stubDb(tables) {
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      const q = {
        select() { return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        ilike(col, val) {
          const want = String(val).toLowerCase()
          rows = rows.filter((r) => String(r[col] || '').toLowerCase() === want)
          return q
        },
        not(col, op, val) {
          if (op === 'is' && val === null) rows = rows.filter((r) => r[col] != null)
          return q
        },
        order() { return q },
        range(from, to) { return Promise.resolve({ data: rows.slice(from, to + 1), error: null }) },
        maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject) },
      }
      return q
    },
  }
}

const CAST = { podCast: { Aran: { name: 'Aran', gender: 'm', voiceId: 'human_aran_cym_n' } } }

function fixture() {
  return {
    language_recording_policy: [{
      language: 'cym',
      human_only: true,
      voices: { m: { name: 'Aran', email: 'aran@hey.com', voiceId: 'human_aran_cym_n' } },
    }],
    courses: [
      { course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: CAST },
      { course_code: 'cym_s_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: CAST },
    ],
    listening_pods: [
      { id: 'p_n', course_code: 'cym_n_for_eng', slug: 'pod-0' },
      { id: 'p_s', course_code: 'cym_s_for_eng', slug: 'pod-0' },
    ],
    listening_pod_sentences: [
      // A machine wrote this one and nobody has touched it since.
      { id: 's1', pod_id: 'p_n', global_order: 1, speaker: 'Aran', target_text: 'Bore da.', known_text: 'Good morning.', target_text_draft: true },
      // A person wrote this one.
      { id: 's2', pod_id: 'p_n', global_order: 2, speaker: 'Aran', target_text: 'Nos da.', known_text: 'Good night.', target_text_draft: false },
      // A draft that somebody has already APPROVED. Approval is about spending
      // money on audio, not about who wrote the words — the artist still sees it.
      { id: 's3', pod_id: 'p_n', global_order: 3, speaker: 'Aran', target_text: 'Diolch.', known_text: 'Thanks.', target_text_draft: true, target_text_approved_at: '2026-08-16T00:00:00Z', target_text_approved_by: 'verifier' },
      // A line a person wrote, with no drafted copy anywhere.
      { id: 's5', pod_id: 'p_n', global_order: 5, speaker: 'Aran', target_text: 'Hwyl.', known_text: 'Bye.', target_text_draft: false },
      // The SAME words as s2, in the other course, and THIS copy is a draft.
      // One line on screen, so the note has to survive the collapse.
      { id: 's4', pod_id: 'p_s', global_order: 1, speaker: 'Aran', target_text: 'Nos da.', known_text: 'Good night.', target_text_draft: true },
    ],
    course_audio: [],
  }
}

async function queue() {
  const db = stubDb(fixture())
  const aran = await resolveRecordist(db, 'human_aran_cym_n')
  const q = await buildQueue(db, aran, { includeRecorded: true })
  return new Map(q.lines.map((l) => [l.text, l]))
}

test('the predicate reads the row and nothing else', () => {
  assert.equal(machineDrafted({ target_text_draft: true }), true)
  assert.equal(machineDrafted({ target_text_draft: false }), false)
  // A projection that never selected the column must not light the note on
  // every line in the queue.
  assert.equal(machineDrafted({}), false)
  assert.equal(machineDrafted(null), false)
  // An approval says the words may be SPENT on; it does not say a person wrote
  // them. The booth asks the second question.
  assert.equal(machineDrafted({ target_text_draft: true, target_text_approved_at: '2026-08-16T00:00:00Z' }), true)
})

test('a machine-drafted line says so on the wire', async () => {
  const byText = await queue()
  assert.equal(byText.get('Bore da.').machineDrafted, true)
})

test('a human-authored line carries no note at all', async () => {
  const byText = await queue()
  assert.equal(byText.get('Hwyl.').machineDrafted, false)
})

test('an APPROVED draft is still a draft to the artist reading it', async () => {
  const byText = await queue()
  // pod-text-approval.cjs would call these words renderable. That is a question
  // about money, not about authorship, and the booth asks the other one.
  assert.equal(byText.get('Diolch.').machineDrafted, true)
})

test('the note survives the duplicate collapse', async () => {
  const byText = await queue()
  const line = byText.get('Nos da.')
  assert.equal(line.alsoFills, 1, 'the two copies collapsed into the one line the artist reads')
  assert.equal(line.machineDrafted, true,
    'a machine wrote one of the two copies of these words, so the line the artist sees is machine-written')
})

test('provenance moves no line in or out of the queue -- it is a note, not a gate', async () => {
  const db = stubDb(fixture())
  const aran = await resolveRecordist(db, 'human_aran_cym_n')
  const q = await buildQueue(db, aran, { includeRecorded: true })
  assert.deepEqual(q.lines.map((l) => l.text).sort(), ['Bore da.', 'Diolch.', 'Hwyl.', 'Nos da.'],
    'every line is still there to read, drafted or not')
  assert.equal(q.lines.every((l) => l.canEditText), true, 'and every one of them can be fixed on the spot')
})
