/**
 * recordist-queue.test.cjs — the queue derivation, over a stub db.
 *
 * These cover the four rules that decide whether a recordist is asked to read
 * the right thing: by-LANGUAGE not by-course, gender from the course's own
 * cast, collapse by clip identity, and recorded-under-ANY-spelling. The last
 * one is the reason Aran keeps his 111 Welsh takes instead of being asked to
 * read 42 of them again.
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { buildQueue, resolveRecordist, recordedSpellings, voicesForEmail } = require('./recordist-queue.cjs')

/** Minimal PostgREST-shaped stub: only the calls this module actually makes. */
function stubDb(tables) {
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      const q = {
        select() { return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        // Case-insensitive equality — dashboard_users.email is stored as typed,
        // while a JWT email arrives lowercased.
        ilike(col, val) {
          const want = String(val).toLowerCase()
          rows = rows.filter((r) => String(r[col] || '').toLowerCase() === want)
          return q
        },
        // Only the one form the queue uses: .not(col, 'is', null)
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

const CAST = {
  podCast: {
    Aran: { name: 'Aran', gender: 'm', voiceId: 'human_aran_cym_n' },
    Catrin: { name: 'Catrin', gender: 'f', voiceId: 'human_catrinlliar_cym_n' },
    Ghost: { name: 'Uncast', voiceId: 'human_ghost' },   // no gender on purpose
  },
}

function fixture({ audio = [] } = {}) {
  return {
    language_recording_policy: [{
      language: 'cym',
      human_only: true,
      voices: {
        m: { name: 'Aran', email: 'aran@hey.com', voiceId: 'human_aran_cym_n' },
        f: { name: 'Catrin', email: 'c@x.com', voiceId: 'human_catrinlliar_cym_n', aliases: ['human_catrinlliar_cym_s'] },
      },
    }],
    courses: [
      { course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: { ...CAST, podCastAliases: { human_aran_cym_n: ['human_aran_cym_n_2'] } } },
      { course_code: 'cym_s_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: CAST },
      { course_code: 'fra_for_eng', target_lang: 'fra', known_lang: 'eng', voice_config: CAST },
    ],
    listening_pods: [
      { id: 'p_n', course_code: 'cym_n_for_eng', slug: 'pod-0' },
      { id: 'p_s', course_code: 'cym_s_for_eng', slug: 'pod-0' },
      { id: 'p_f', course_code: 'fra_for_eng', slug: 'pod-0' },
    ],
    listening_pod_sentences: [
      { id: 's1', pod_id: 'p_n', global_order: 1, speaker: 'Aran', target_text: 'Bore da.', known_text: 'Good morning.' },
      { id: 's2', pod_id: 'p_n', global_order: 2, speaker: 'Catrin', target_text: 'Sut wyt ti?', known_text: 'How are you?' },
      { id: 's3', pod_id: 'p_n', global_order: 3, speaker: 'Ghost', target_text: 'Dim byd.', known_text: 'Nothing.' },
      // Same line as s1, another course — ONE recording, not two.
      { id: 's4', pod_id: 'p_s', global_order: 1, speaker: 'Aran', target_text: 'Bore da!', known_text: 'Good morning.' },
      { id: 's5', pod_id: 'p_s', global_order: 2, speaker: 'Aran', target_text: 'Nos da.', known_text: 'Good night.' },
      // French: a different language entirely, never in a Welsh queue.
      { id: 's6', pod_id: 'p_f', global_order: 1, speaker: 'Aran', target_text: 'Bonjour.', known_text: 'Hello.' },
    ],
    course_audio: audio,
  }
}

test('the queue spans every course of the language and no other language', async () => {
  const db = stubDb(fixture())
  const aran = await resolveRecordist(db, 'human_aran_cym_n')
  const q = await buildQueue(db, aran, { includeRecorded: true })
  assert.deepEqual(q.courses.sort(), ['cym_n_for_eng', 'cym_s_for_eng'])
  assert.equal(q.lines.some((l) => l.text === 'Bonjour.'), false, 'French must never enter a Welsh queue')
  assert.deepEqual(q.lines.map((l) => l.text).sort(), ['Bore da.', 'Nos da.'])
})

test('gender comes from the course cast, and an uncast speaker is counted, not guessed', async () => {
  const db = stubDb(fixture())
  const catrin = await resolveRecordist(db, 'human_catrinlliar_cym_n')
  const q = await buildQueue(db, catrin, { includeRecorded: true })
  assert.deepEqual(q.lines.map((l) => l.text), ['Sut wyt ti?'])
  assert.equal(q.uncast, 1, 'the gender-less speaker is reported, not dropped in silence')
  const aran = await buildQueue(stubDb(fixture()), await resolveRecordist(stubDb(fixture()), 'human_aran_cym_n'), {})
  assert.equal(aran.uncast, 1, 'and it is reported to both queues, never assigned to one')
})

test('one recording per clip identity — the same line in two courses collapses', async () => {
  const db = stubDb(fixture())
  const aran = await resolveRecordist(db, 'human_aran_cym_n')
  const q = await buildQueue(db, aran, { includeRecorded: true })
  // 'Bore da.' and 'Bore da!' normalise to one key: one read fills both pods.
  assert.equal(q.duplicatesCollapsed, 1)
  assert.equal(q.lines.find((l) => l.text === 'Bore da.').alsoFills, 1)
})

test('a take recorded under an ALIAS spelling counts as recorded', async () => {
  const db = stubDb(fixture({
    audio: [{ language: 'cym', voice_id: 'human_aran_cym_n_2', text_normalized: 'bore da' }],
  }))
  const aran = await resolveRecordist(db, 'human_aran_cym_n')
  assert.ok(aran.spellings.includes('human_aran_cym_n_2'), 'aliases widen the read')
  const q = await buildQueue(db, aran, { includeRecorded: true })
  assert.equal(q.recorded, 1)
  assert.equal(q.lines.find((l) => l.text === 'Bore da.').recorded, true)
  const hidden = await buildQueue(db, aran, {})
  assert.deepEqual(hidden.lines.map((l) => l.text), ['Nos da.'], 'recorded lines are skipped by default')
})

test('an alias spelling in the link opens the canonical voice’s queue', async () => {
  const db = stubDb(fixture())
  // from voice_config.podCastAliases (links handed out before the policy existed)
  const viaCourseAlias = await resolveRecordist(db, 'human_aran_cym_n_2')
  assert.equal(viaCourseAlias.voiceId, 'human_aran_cym_n')
  // from the policy row's own aliases — the per-language decision, one table
  const viaPolicyAlias = await resolveRecordist(db, 'human_catrinlliar_cym_s')
  assert.equal(viaPolicyAlias.voiceId, 'human_catrinlliar_cym_n')
  assert.ok(viaPolicyAlias.spellings.includes('human_catrinlliar_cym_s'),
    'a policy alias also widens the recorded lookup, so per-course takes still count')
  assert.equal(await resolveRecordist(db, 'human_nobody'), null)
})

test('recordedSpellings reaches canonical, alias and bare forms', () => {
  const spellings = recordedSpellings('human_aran_cym_n', new Map([['human_aran_cym_n', new Set(['human_aran_cym_n_2'])]]))
  assert.ok(spellings.includes('human_aran_cym_n'))
  assert.ok(spellings.includes('human_aran_cym_n_2'))
  assert.ok(spellings.includes('aran_cym_n'), 'the bare form is half the estate’s rows')
})

// ── The queue is content-type-agnostic (Tom, 2026-08-14) ────────────────────
// The 18 failing LEGO-narration clips ride the ordinary queue rather than a
// bespoke path. A queue item is "a piece of this language needing a human
// voice", not "a pod sentence".

test('a flagged re-record of ANY content type enters the queue, routed by required voice', async () => {
  const f = fixture()
  f.course_audio = [
    { id: 'ca1', course_code: 'cym_n_for_eng', role: 'presentation', language: 'cym',
      voice_id: 'human', text: 'The Welsh for <src>are they?</src> is <tgt>ydyn nhw?</tgt>',
      rerecord_wanted: { reason: 'ends abruptly', voice_gender: 'm' } },
    { id: 'ca2', course_code: 'cym_s_for_eng', role: 'presentation', language: 'cym',
      voice_id: 'human', text: 'The Welsh for <src>the girl</src> is <tgt>yr hogan</tgt>',
      rerecord_wanted: { reason: 'ends abruptly', voice_gender: 'f' } },
  ]
  const aran = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_aran_cym_n'), { includeRecorded: true })
  const catrin = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_catrinlliar_cym_n'), { includeRecorded: true })

  const aranRe = aran.lines.filter((l) => l.kind === 'rerecord')
  const catrinRe = catrin.lines.filter((l) => l.kind === 'rerecord')
  assert.equal(aranRe.length, 1, 'the male-voice re-record lands in the male queue')
  assert.equal(aranRe[0].id, 'ca1')
  assert.equal(aranRe[0].role, 'presentation', 'content type rides along for the surface to render')
  assert.equal(catrinRe.length, 1, 'and the female-voice one in the female queue')
  assert.equal(catrinRe[0].id, 'ca2')
  // Routed by REQUIRED voice, never by who recorded the original — the
  // originals are both stored under the shared untagged voice 'human'.
  assert.equal(aran.lines.some((l) => l.id === 'ca2'), false)
})

test('a re-record with no required voice is counted as uncast, never guessed into a queue', async () => {
  const f = fixture()
  f.course_audio = [
    { id: 'ca3', course_code: 'cym_n_for_eng', role: 'encouragement', language: 'cym',
      voice_id: 'human', text: 'Da iawn ti.', rerecord_wanted: { reason: 'clipped' } },
  ]
  const aran = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_aran_cym_n'), { includeRecorded: true })
  assert.equal(aran.lines.some((l) => l.id === 'ca3'), false)
  assert.equal(aran.uncast, 2, 'the gender-less speaker plus the gender-less re-record')
})

test('a re-record sharing a pod line’s text is ONE recording, not two', async () => {
  const f = fixture()
  f.course_audio = [
    { id: 'ca4', course_code: 'cym_n_for_eng', role: 'presentation', language: 'cym',
      voice_id: 'human', text: 'Bore da!', rerecord_wanted: { reason: 'clipped', voice_gender: 'm' } },
  ]
  const aran = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_aran_cym_n'), { includeRecorded: true })
  assert.equal(aran.lines.filter((l) => l.kind === 'rerecord').length, 0,
    'it collapses onto the pod line of the same clip identity')
  assert.equal(aran.lines.find((l) => l.text === 'Bore da.').alsoFills, 2)
})

// ── rule 6: a want makes a recorded line outstanding again ───────────────────
//
// Until 2026-08-16 this queue knew only "a clip exists", so the 90 re-record
// wants written for T-20 were invisible on the surface the recordists actually
// use: Aran's link showed 71 lines done when every one of them was queued for a
// re-record. These pin both carriers of a want and the make-before-break
// property that the old take stays playable while the line is outstanding.

test('a pod line flagged rerecord_wanted is outstanding even though a take exists', async () => {
  const f = fixture({ audio: [{ language: 'cym', voice_id: 'human_aran_cym_n', text_normalized: 'bore da' }] })
  const clean = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_aran_cym_n'), { includeRecorded: true })
  assert.equal(clean.lines.find((l) => l.text === 'Bore da.').recorded, true, 'baseline: a take alone is done')

  const wanted = fixture({ audio: [{ language: 'cym', voice_id: 'human_aran_cym_n', text_normalized: 'bore da' }] })
  wanted.listening_pod_sentences[0].rerecord_wanted = { target: 'human_aran_cym_n' }
  const q = await buildQueue(stubDb(wanted), await resolveRecordist(stubDb(wanted), 'human_aran_cym_n'), { includeRecorded: true })
  const line = q.lines.find((l) => l.text === 'Bore da.')
  assert.equal(line.recorded, false, 'the want outranks the take')
  // TOM, 2026-09-02: "they must NOT see any clips that have already been ruled
  // unusable - they must just see those as lines that still need recording."
  // The artist's wire used to carry rerecordWanted:true and a clipUrl to the
  // rejected take. It now carries neither, and the line is indistinguishable
  // from one nobody has ever read. MAKE BEFORE BREAK is untouched by this: the
  // clip is still in course_audio, still linked, still what the learner hears —
  // it is the ARTIST who is not shown it.
  assert.equal(line.rerecordWanted, false, 'no verdict on the artist wire')
  assert.equal(line.rerecordReason, null, 'and no reason')
  assert.equal(line.clipUrl, null, 'and no way to play the take we rejected')
  assert.equal(q.remaining, q.total, 'nothing on this voice counts as done')

  // ...and Tom's own page still sees every bit of it.
  const admin = await buildQueue(stubDb(wanted), await resolveRecordist(stubDb(wanted), 'human_aran_cym_n'),
    { includeRecorded: true, maskRejectedHistory: false })
  const adminLine = admin.lines.find((l) => l.text === 'Bore da.')
  assert.equal(adminLine.rerecordWanted, true, 'the record is not destroyed, only hidden from the reader')
  assert.ok(adminLine.clipUrl, 'and the rejected take is still retrievable by us')
  assert.equal(adminLine.recorded, admin.lines.find((l) => l.text === 'Bore da.').recorded,
    'masking moves no line in or out of the outstanding set')
  assert.equal(admin.total, q.total, 'so the two pages cannot disagree about the work')
  assert.equal(admin.recorded, q.recorded, 'nor about how much of it is done')
})

test('a want on ANY course’s copy of a collapsed line wants the one recording', async () => {
  // The collapse is by clip identity, so a want written against cym_s must not
  // be dropped when cym_n's copy is the representative the recordist sees.
  const f = fixture({ audio: [{ language: 'cym', voice_id: 'human_aran_cym_n', text_normalized: 'bore da' }] })
  f.listening_pod_sentences.find((s) => s.id === 's4').rerecord_wanted = { target: 'human_aran_cym_n' }
  const q = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_aran_cym_n'), { includeRecorded: true })
  assert.equal(q.lines.find((l) => l.text === 'Bore da.').recorded, false)
})

test('a want on the KNOWN track never reaches the target queue', async () => {
  // The known side of a human_only course is English and is somebody else's
  // queue entirely; reading it here would put lines in the wrong person's list.
  const f = fixture({ audio: [{ language: 'cym', voice_id: 'human_aran_cym_n', text_normalized: 'bore da' }] })
  f.listening_pod_sentences[0].rerecord_wanted = { known: 'human_aran_cym_n' }
  const q = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_aran_cym_n'), { includeRecorded: true })
  assert.equal(q.lines.find((l) => l.text === 'Bore da.').recorded, true)
})

test('a CLIP flagged rerecord_wanted re-opens the pod line of the same identity', async () => {
  // This is the path that carries "re-record everything you already recorded":
  // the flag goes on the clip, and the live pod line of that text re-opens.
  const f = fixture({ audio: [{ language: 'cym', voice_id: 'human_aran_cym_n', text_normalized: 'bore da' }] })
  f.course_audio.push({ id: 'ca9', course_code: 'cym_n_for_eng', role: 'target1', language: 'cym',
    voice_id: 'human_aran_cym_n', text: 'Bore da.', rerecord_wanted: { reason: 'trim-chain damage', voice_gender: 'm' } })
  const q = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_aran_cym_n'), { includeRecorded: true })
  const line = q.lines.find((l) => l.text === 'Bore da.')
  assert.equal(line.recorded, false)
  // The reason used to ride along to the recordist. Tom ruled it off their
  // screen on 2026-09-02 — "trim-chain damage" is our note to ourselves about
  // our own pipeline, and it reached the person who read the line.
  assert.equal(line.rerecordReason, null, 'the reason never reaches the reader')
  assert.equal(q.lines.filter((l) => l.kind === 'rerecord').length, 0, 'still ONE line, not two')

  const admin = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_aran_cym_n'),
    { includeRecorded: true, maskRejectedHistory: false })
  assert.equal(admin.lines.find((l) => l.text === 'Bore da.').rerecordReason, 'trim-chain damage',
    'it is still on the wire for us')
})

// ── the queue is one LANGUAGE's work, and the clip flag never overrode that ──

test('a want on a clip in ANOTHER language never enters this queue', async () => {
  // The header of recordist-queue has always said TARGET SIDE ONLY, and the pod
  // and seed sources have always obeyed it. This third source never checked, so
  // routing was by GENDER alone: on 2026-09-02, 28 of the 56 lines in Aran's
  // Welsh queue were ENGLISH — 18 presentation clips and 10 known-side lines,
  // "to escape from these angry eyes" among them — because they belonged to
  // cym_n_for_eng and the want named a male voice. He was one morning away from
  // being asked to read English in a Welsh session.
  const f = fixture({ audio: [{ language: 'cym', voice_id: 'human_aran_cym_n', text_normalized: 'bore da' }] })
  f.course_audio.push({ id: 'ca-eng', course_code: 'cym_n_for_eng', role: 'known', language: 'eng',
    voice_id: 'human', text: 'these angry eyes', rerecord_wanted: { reason: 'eyes defect', voice_gender: 'm' } })
  f.course_audio.push({ id: 'ca-cym', course_code: 'cym_n_for_eng', role: 'target1', language: 'cym',
    voice_id: 'human_aran_cym_n', text: 'y llygaid blin yma', rerecord_wanted: { reason: 'eyes defect', voice_gender: 'm' } })
  const q = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_aran_cym_n'), { includeRecorded: true })
  assert.equal(q.lines.filter((l) => l.text === 'these angry eyes').length, 0, 'the English line is not his work')
  assert.equal(q.lines.filter((l) => l.text === 'y llygaid blin yma').length, 1, 'the Welsh one still is')
})

// ── dialect: the second filter (Tom, 2026-08-19) ────────────────────────────
//
// The 197 Southern lines that sat in Aran's and Catrin's queues were not a
// casting mistake the queue could have caught: the queue is by LANGUAGE, cym_s
// is Welsh, and cym_s named Aran and Catrin in its own cast, so every rule the
// queue had said those lines were his. What was missing is that the SOUTHERN
// course is Southern as a fact of its content, whoever is cast on it.
//
// The default is what makes this a no-op everywhere else: a course with no
// dialect and a voice with no dialect are both 'standard', so the match is
// trivially true for every language that has one accent — which is all of them
// but Welsh. The first test below is the regression test for that, in miniature.

/** The Welsh fixture with the dialects actually declared, plus a Southern cast. */
function dialectFixture() {
  const f = fixture()
  f.courses.find((c) => c.course_code === 'cym_n_for_eng').dialect = 'north'
  f.courses.find((c) => c.course_code === 'cym_s_for_eng').dialect = 'south'
  f.language_recording_policy[0].voices = {
    m: { name: 'Aran', voiceId: 'human_aran_cym_n', dialect: 'north' },
    f: { name: 'Catrin', voiceId: 'human_catrinlliar_cym_n', dialect: 'north',
      aliases: ['human_catrinlliar_cym_s'] },
    'm:south': { name: 'Richard', voiceId: 'human_richard_cym_s', dialect: 'south' },
    'f:south': { name: 'Mali', voiceId: 'human_mali_cym_s', dialect: 'south' },
  }
  return f
}

test('an undeclared dialect is the default on both sides, so nothing changes', async () => {
  // The unmodified fixture declares no dialect anywhere — the shape every
  // single-dialect language on the estate is in. Both courses and both voices
  // fall to 'standard' and the queues are exactly what they were.
  const db = stubDb(fixture())
  const aran = await resolveRecordist(db, 'human_aran_cym_n')
  assert.equal(aran.dialect, 'standard', 'an untagged voice has the default, never null')
  const q = await buildQueue(db, aran, { includeRecorded: true })
  assert.deepEqual(q.lines.map((l) => l.text).sort(), ['Bore da.', 'Nos da.'])
  assert.equal(q.duplicatesCollapsed, 1, 'and one line still fills both courses')
})

test('a Southern line never enters a Northern queue', async () => {
  const f = dialectFixture()
  const aran = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_aran_cym_n'), { includeRecorded: true })
  // 'Nos da.' is cym_s only; 'Bore da!' is the cym_s copy of a line Aran also
  // has in cym_n. Neither may reach him through the Southern course.
  assert.deepEqual(aran.lines.map((l) => l.text), ['Bore da.'])
  assert.equal(aran.lines[0].courseCode, 'cym_n_for_eng')
  assert.equal(aran.lines[0].alsoFills, 0,
    'and his take is no longer promised to the Southern pod it must not fill')
})

test('the Southern voices get the Southern lines, in their own queue', async () => {
  const f = dialectFixture()
  const richard = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_richard_cym_s'), { includeRecorded: true })
  assert.deepEqual(richard.lines.map((l) => l.text).sort(), ['Bore da!', 'Nos da.'])
  assert.ok(richard.lines.every((l) => l.courseCode === 'cym_s_for_eng'))
  // Casting a Southern man does not disturb the Northern one — the collision
  // that made casting Mali and Richard impossible before this change.
  const aran = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_aran_cym_n'), { includeRecorded: true })
  assert.deepEqual(aran.lines.map((l) => l.text), ['Bore da.'])
})

test('the dialect comes from the course, never from who is cast on it', async () => {
  // The original bug in one assertion. cym_s_for_eng names Aran (m, north) in
  // its OWN cast — exactly the state the live course was in — and it is still
  // Southern, so his queue must stay Northern-only.
  const f = dialectFixture()
  assert.equal(f.courses.find((c) => c.course_code === 'cym_s_for_eng').voice_config.podCast.Aran.voiceId,
    'human_aran_cym_n', 'the Southern course really is cast to the Northern man')
  const aran = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_aran_cym_n'), { includeRecorded: true })
  assert.equal(aran.lines.some((l) => l.courseCode === 'cym_s_for_eng'), false)
})

test('a voice resolves to its own dialect, and an alias link opens the same queue', async () => {
  const db = stubDb(dialectFixture())
  const mali = await resolveRecordist(db, 'human_mali_cym_s')
  assert.equal(mali.dialect, 'south')
  assert.equal(mali.gender, 'f', 'gender is the slot key’s leading token')
  const catrin = await resolveRecordist(db, 'human_catrinlliar_cym_s')
  assert.equal(catrin.voiceId, 'human_catrinlliar_cym_n')
  assert.equal(catrin.dialect, 'north',
    'an OLD cym_s-spelt alias of the Northern woman is still the Northern woman')
})

test('a flagged re-record is routed by its course’s dialect, not just its gender', async () => {
  const f = dialectFixture()
  f.course_audio = [
    { id: 'caS', course_code: 'cym_s_for_eng', role: 'presentation', language: 'cym',
      voice_id: 'human', text: 'Shwmae.', rerecord_wanted: { reason: 'clipped', voice_gender: 'm' } },
  ]
  const aran = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_aran_cym_n'), { includeRecorded: true })
  assert.equal(aran.lines.some((l) => l.id === 'caS'), false, 'a Southern clip is not Northern work')
  const richard = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_richard_cym_s'), { includeRecorded: true })
  assert.equal(richard.lines.some((l) => l.id === 'caS'), true)
})

test('a same-dialect line in two courses still collapses to one recording', async () => {
  // Dialect narrows the collapse; it must not abolish it. Two NORTHERN courses
  // sharing a line are still one read.
  const f = dialectFixture()
  f.courses.push({ course_code: 'cym_n2_for_eng', target_lang: 'cym', known_lang: 'eng', dialect: 'north', voice_config: CAST })
  f.listening_pods.push({ id: 'p_n2', course_code: 'cym_n2_for_eng', slug: 'pod-0' })
  f.listening_pod_sentences.push({ id: 's7', pod_id: 'p_n2', global_order: 1, speaker: 'Aran', target_text: 'Bore da.', known_text: 'Good morning.' })
  const aran = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_aran_cym_n'), { includeRecorded: true })
  assert.equal(aran.lines.length, 1)
  assert.equal(aran.lines[0].alsoFills, 1, 'one Northern take still fills both Northern courses')
})

test('dialect tags are compared case- and space-insensitively', async () => {
  const f = dialectFixture()
  f.courses.find((c) => c.course_code === 'cym_n_for_eng').dialect = '  North '
  f.language_recording_policy[0].voices.m.dialect = 'NORTH'
  const aran = await buildQueue(stubDb(f), await resolveRecordist(stubDb(f), 'human_aran_cym_n'), { includeRecorded: true })
  assert.deepEqual(aran.lines.map((l) => l.text), ['Bore da.'],
    'spelling drift must never silently empty a recordist’s queue')
})


// ── /api/recording/mine: a LOGIN → its voice(s) ──────────────────────────────
// The two sources are both real and neither covers both people: Catrin's
// dashboard_users row carries her voice_id; Aran's is an admin row with none,
// and it is the policy that names aran@hey.com as the Welsh male voice.

function mineFixture(extra = {}) {
  const f = fixture()
  f.dashboard_users = extra.dashboard_users || []
  return f
}

test('a login named only by the POLICY resolves to its voice', async () => {
  const db = stubDb(mineFixture())
  const voices = await voicesForEmail(db, 'aran@hey.com')
  assert.deepStrictEqual(voices.map((v) => v.voiceId), ['human_aran_cym_n'])
  assert.strictEqual(voices[0].language, 'cym')
})

test('a login named only by dashboard_users.voice_id resolves to its voice', async () => {
  const db = stubDb(mineFixture({
    dashboard_users: [{ email: 'Catrin@Example.COM', voice_id: 'human_catrinlliar_cym_n' }],
  }))
  const voices = await voicesForEmail(db, 'catrin@example.com')
  assert.deepStrictEqual(voices.map((v) => v.voiceId), ['human_catrinlliar_cym_n'])
})

test('both sources naming the same person yield ONE voice, not two', async () => {
  const db = stubDb(mineFixture({
    dashboard_users: [{ email: 'aran@hey.com', voice_id: 'human_aran_cym_n' }],
  }))
  const voices = await voicesForEmail(db, 'aran@hey.com')
  assert.strictEqual(voices.length, 1)
})

test('an ALIAS spelling on the login row resolves to the canonical voice', async () => {
  const db = stubDb(mineFixture({
    dashboard_users: [{ email: 'c@x.com', voice_id: 'human_catrinlliar_cym_s' }],
  }))
  const voices = await voicesForEmail(db, 'c@x.com')
  assert.deepStrictEqual(voices.map((v) => v.voiceId), ['human_catrinlliar_cym_n'])
})

test('a stale voice_id no policy names is DROPPED, never a queue', async () => {
  const db = stubDb(mineFixture({
    dashboard_users: [{ email: 'erik@x.com', voice_id: 'human_erikwallis_pdc' }],
  }))
  assert.deepStrictEqual(await voicesForEmail(db, 'erik@x.com'), [])
})

test('an unknown or empty email gets no voices', async () => {
  const db = stubDb(mineFixture())
  assert.deepStrictEqual(await voicesForEmail(db, 'nobody@x.com'), [])
  assert.deepStrictEqual(await voicesForEmail(db, ''), [])
  assert.deepStrictEqual(await voicesForEmail(db, null), [])
})

// WHICH BODY OF WORK EACH LINE BELONGS TO. Tom, 2026-09-04: Aran's Senedd/S4C
// lines and his POD-1 lines are both kind 'pod' and arrived in one
// undifferentiated list. The surface cannot separate what the wire does not
// carry, so the pod's own identity goes on the wire — and stays null on every
// line that has no pod, which is what the surface reads as "group by kind".
test('a pod line carries its pod on the wire, and a line with no pod carries none', async () => {
  const f = fixture()
  f.listening_pods.push({ id: 'p_n2', course_code: 'cym_n_for_eng', slug: 'senedd-s4c-steve', title: 'Senedd: allegations of bullying at S4C' })
  f.listening_pod_sentences.push(
    { id: 's7', pod_id: 'p_n2', global_order: 1, speaker: 'Aran', target_text: 'Diolch, Gadeirydd.', known_text: 'Thank you, Chair.' })
  const db = stubDb(f)
  const aran = await resolveRecordist(db, 'human_aran_cym_n')
  const q = await buildQueue(db, aran, { includeRecorded: true })

  const pod0 = q.lines.find((l) => l.text === 'Bore da.')
  assert.equal(pod0.podId, 'p_n')
  assert.equal(pod0.podSlug, 'pod-0')
  const senedd = q.lines.find((l) => l.text === 'Diolch, Gadeirydd.')
  assert.equal(senedd.podSlug, 'senedd-s4c-steve')
  assert.equal(senedd.podTitle, 'Senedd: allegations of bullying at S4C')

  // AND THE ORDER IS THE ONE THE SERVER ALREADY SORTED BY — course, then pod
  // slug, then position — untouched. 'Nos da.' is cym_s's pod-0, which is why
  // the slugs read n:pod-0, n:senedd, s:pod-0 rather than all the pod-0s
  // together: the surface groups on the slug and never re-sorts, so a
  // recordist's queue cannot reshuffle between two loads of the same page.
  assert.deepEqual(q.lines.filter((l) => l.kind === 'pod').map((l) => l.podSlug),
    ['pod-0', 'senedd-s4c-steve', 'pod-0'])
})
