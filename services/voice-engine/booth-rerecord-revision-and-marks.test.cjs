// TWO GUARANTEES A BOOTH RE-RECORD MAKES, both found missing by GPT-6 Astra's
// cold-check #592 of job #590 (2026-09-13), the day before Aran re-records nine
// marked Welsh lines:
//
//   1. THE CACHE. A re-take of a line whose clip identity already exists lands
//      on the SAME course_audio row, and the learner's address for that row is
//      <uuid>.v<audio_revision> — served immutable, keyed in player-vue's
//      IndexedDB by that string (ssi-learning-app/api/_utils/audioAccess.ts
//      buildAudioRef). Repointing s3_key in place without bumping the revision
//      means every phone that has played the line keeps the OLD take. No
//      course_audio trigger supplies the bump (Astra checked pg_trigger), so
//      the registration seam and the duplicate propagation both go through
//      services/shared/audio-revision-swap.cjs, the estate's one convention.
//
//   2. THE MARKS. One take fills every duplicate of the line (the two Senedd
//      "Prynhawn da." rows, s1 l1 and s9 l47). A duplicate the take failed to
//      reach must KEEP its re-record mark and the failure must reach the route
//      response — before this, the failure was logged and swallowed and every
//      mark was retired regardless, so the second row went on serving its old
//      clip with nothing left to say it still needed a take.
//
// The fake below is a MUTATING in-memory table set on purpose: swapClipInPlace
// re-reads the row after writing it and refuses unless the revision actually
// took, so a fake that ignored its own update would pass a swap that no-opped —
// the very bug under test.
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { commitPodRegistration } = require('./pods-registration.cjs')
const { propagateTakeToDuplicates, clearRerecordWants, resolveRecordist } = require('./recordist-queue.cjs')
const createRecordistRouter = require('./recordist-router.cjs')

const ARAN = 'human_aran_cym_n'
const TEXT = 'Prynhawn da.'
const quiet = { log() {}, info() {}, warn() {}, error() {} }

/** In-memory postgrest-ish fake. Rows are mutated by update/insert/upsert. */
function memDb(tables, opts = {}) {
  const failOn = opts.failOn || (() => null)   // ({table, op, row|patch, rows}) => error message | null
  return {
    tables,
    from(table) {
      if (!tables[table]) tables[table] = []
      let rows = tables[table]
      let filters = []
      let op = 'read', payload = null, conflict = null
      const apply = () => rows.filter((r) => filters.every((f) => f(r)))
      const run = async () => {
        const fail = failOn({ table, op, payload, rows: apply() })
        if (fail) return { data: null, error: { message: fail } }
        // Reads hand back COPIES, as postgrest does: a caller holding a row
        // from an earlier read must not see later writes through it.
        if (op === 'read') return { data: apply().map((r) => ({ ...r })), error: null }
        if (op === 'update') {
          const hit = apply()
          for (const r of hit) Object.assign(r, payload)
          return { data: hit.map((r) => ({ ...r })), error: null }
        }
        if (op === 'insert') {
          const row = { id: `new-${table}-${rows.length + 1}`, audio_revision: 1, ...payload }
          rows.push(row)
          return { data: [row], error: null }
        }
        if (op === 'upsert') {
          const keys = (conflict || 'id').split(',')
          const hit = rows.find((r) => keys.every((k) => r[k] === payload[k]))
          if (hit) { Object.assign(hit, payload); return { data: [hit], error: null } }
          const row = { id: `new-${table}-${rows.length + 1}`, ...payload }
          rows.push(row)
          return { data: [row], error: null }
        }
        throw new Error(`unhandled op ${op}`)
      }
      const q = {
        select() { return q },
        eq(col, val) { filters.push((r) => r[col] === val); return q },
        in(col, vals) { filters.push((r) => vals.includes(r[col])); return q },
        gt(col, val) { filters.push((r) => r[col] > val); return q },
        ilike(col, val) { const w = String(val).toLowerCase(); filters.push((r) => String(r[col] || '').toLowerCase() === w); return q },
        not(col, op2, val) { if (op2 === 'is' && val === null) filters.push((r) => r[col] != null); return q },
        order() { return q },
        limit(n) { return run().then((r) => ({ ...r, data: r.data ? r.data.slice(0, n) : r.data })) },
        range(a, b) { return run().then((r) => ({ ...r, data: r.data ? r.data.slice(a, b + 1) : r.data })) },
        maybeSingle() { return run().then((r) => ({ ...r, data: r.data ? (r.data[0] || null) : null })) },
        single() { return run().then((r) => (r.error ? r : { data: r.data[0] || null, error: r.data[0] ? null : { message: 'no row' } })) },
        update(p) { op = 'update'; payload = p; return q },
        insert(p) { op = 'insert'; payload = p; return q },
        upsert(p, o) { op = 'upsert'; payload = p; conflict = o && o.onConflict; return q },
        then(resolve, reject) { return run().then(resolve, reject) },
      }
      return q
    },
  }
}

const MARK = { target: { reason: 'Tom by ear 2026-09-13', markedBy: 'job #590' } }

function fixture() {
  return {
    language_recording_policy: [{ language: 'cym', human_only: true, voices: { m: { name: 'Aran', voiceId: ARAN } } }],
    dashboard_users: [],
    courses: [
      { course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: { podCast: { Cadeirydd: { name: 'Aran', gender: 'm', voiceId: ARAN } } } },
    ],
    listening_pods: [{ id: 'senedd', course_code: 'cym_n_for_eng', slug: 'senedd', title: 'Senedd', visibility: 'live' }],
    listening_pod_sentences: [
      { id: 's1l1', pod_id: 'senedd', global_order: 1, speaker: 'Cadeirydd', target_text: TEXT, known_text: 'Good afternoon.', target_audio_id: 'CLIP-OLD', rerecord_wanted: MARK },
      { id: 's9l47', pod_id: 'senedd', global_order: 47, speaker: 'Cadeirydd', target_text: TEXT, known_text: 'Good afternoon.', target_audio_id: 'CLIP-OLD', rerecord_wanted: MARK },
    ],
    course_audio: [
      { id: 'CLIP-OLD', course_code: 'cym_n_for_eng', text: TEXT, text_normalized: 'prynhawn da', language: 'cym', role: 'target1', voice_id: ARAN, origin: 'human', s3_key: 'mastered/OLD.mp3', audio_revision: 3, rerecord_wanted: { reason: 'Tom by ear', markedBy: 'job #590' } },
    ],
    course_audio_revisions: [],
  }
}

// ── 1. THE CACHE ────────────────────────────────────────────────────────────

test('a booth re-record of an existing clip identity keeps the uuid and bumps audio_revision, with a ledger row', async () => {
  const tables = fixture()
  const db = memDb(tables)
  const out = await commitPodRegistration({
    supabase: db, courseCode: 'cym_n_for_eng',
    context: { text: TEXT, language: 'cym', role: 'target1', voiceId: ARAN, kind: 'target', linkColumn: 'target_audio_id', sentenceId: 's1l1', replacedAudioId: 'CLIP-OLD' },
    s3Key: 'mastered/NEW.mp3', durationMs: 1200, fileSizeBytes: 9000, logger: quiet,
  })
  const clip = tables.course_audio.find((r) => r.id === 'CLIP-OLD')
  assert.equal(out.audioRow.id, 'CLIP-OLD', 'the row id never moves — no FK is ever left dangling')
  assert.equal(clip.s3_key, 'mastered/NEW.mp3', 'the bytes moved')
  assert.equal(clip.audio_revision, 4, 'audio_revision bumped: <uuid>.v4 is a fresh address every phone cache misses')
  assert.equal(out.revision, 4)
  assert.equal(out.repointedExistingRow, true)
  assert.equal(out.replacedS3Key, 'mastered/OLD.mp3', 'reversibility: the superseded key is reported')
  assert.equal(clip.rerecord_wanted, null, 'the clip-level want is fulfilled by the take itself')
  assert.equal(tables.course_audio.length, 1, 'no second row under the same identity')
  assert.deepEqual(
    tables.course_audio_revisions.map((r) => [r.audio_id, r.previous_revision, r.revision, r.previous_s3_key, r.new_s3_key, r.source]),
    [['CLIP-OLD', 3, 4, 'mastered/OLD.mp3', 'mastered/NEW.mp3', 'pod-booth-take']],
    'the rollback ledger records the swap'
  )
  const line = tables.listening_pod_sentences.find((r) => r.id === 's1l1')
  assert.equal(line.target_audio_id, 'CLIP-OLD')
  assert.equal(line.rerecord_wanted, null, 'the source line want is retired in the same commit as before')
})

test('a re-upload of an OLDER recording is refused: the row already holds a newer take, kept untouched', async () => {
  const tables = fixture()
  tables.course_audio[0].recorded_at = '2026-09-16T12:00:00.000Z'
  const db = memDb(tables)
  const out = await commitPodRegistration({
    supabase: db, courseCode: 'cym_n_for_eng',
    context: { text: TEXT, language: 'cym', role: 'target1', voiceId: ARAN, kind: 'target', linkColumn: 'target_audio_id', sentenceId: 's1l1', replacedAudioId: 'CLIP-OLD' },
    s3Key: 'mastered/STALE.mp3', recordedAt: '2026-09-16T09:00:00.000Z', logger: quiet,
  })
  const clip = tables.course_audio.find((r) => r.id === 'CLIP-OLD')
  assert.equal(out.skippedStale, true)
  assert.equal(out.audioRow.id, 'CLIP-OLD', 'the existing row is reported back, unchanged')
  assert.equal(clip.s3_key, 'mastered/OLD.mp3', 'the last-uploaded-but-older file never touched the row')
  assert.equal(clip.audio_revision, 3, 'no swap, no revision bump')
  assert.deepEqual(clip.rerecord_wanted, { reason: 'Tom by ear', markedBy: 'job #590' }, 'the want is not fulfilled by a take that was refused')
  assert.equal(tables.listening_pod_sentences.find((r) => r.id === 's1l1').target_audio_id, 'CLIP-OLD', 'the sentence FK is not re-pointed')
  assert.equal(tables.listening_pod_sentences.find((r) => r.id === 's1l1').rerecord_wanted, MARK, 'the source line want stays open — this line still needs its newer take registered')
})

test('a genuinely newer recording still swaps in and stores its own recorded_at', async () => {
  const tables = fixture()
  tables.course_audio[0].recorded_at = '2026-09-16T09:00:00.000Z'
  const db = memDb(tables)
  const out = await commitPodRegistration({
    supabase: db, courseCode: 'cym_n_for_eng',
    context: { text: TEXT, language: 'cym', role: 'target1', voiceId: ARAN, kind: 'target', linkColumn: 'target_audio_id', sentenceId: 's1l1', replacedAudioId: 'CLIP-OLD' },
    s3Key: 'mastered/NEW.mp3', recordedAt: '2026-09-16T12:00:00.000Z', logger: quiet,
  })
  const clip = tables.course_audio.find((r) => r.id === 'CLIP-OLD')
  assert.equal(out.skippedStale, undefined)
  assert.equal(clip.s3_key, 'mastered/NEW.mp3')
  assert.equal(clip.recorded_at, '2026-09-16T12:00:00.000Z')
  assert.equal(clip.audio_revision, 4)
})

test('a first take of a line (no existing identity) inserts a fresh row at revision 1 — a swap needs something to swap off', async () => {
  const tables = fixture()
  tables.course_audio = []
  const db = memDb(tables)
  const out = await commitPodRegistration({
    supabase: db, courseCode: 'cym_n_for_eng',
    context: { text: TEXT, language: 'cym', role: 'target1', voiceId: ARAN, kind: 'target', linkColumn: 'target_audio_id', sentenceId: 's1l1', replacedAudioId: null },
    s3Key: 'mastered/NEW.mp3', logger: quiet,
  })
  assert.equal(out.audioRow.created, true)
  assert.equal(out.revision, null)
  assert.equal(tables.course_audio_revisions.length, 0, 'no ledger row for a first take')
  assert.equal(tables.course_audio[0].s3_key, 'mastered/NEW.mp3')
  assert.equal(tables.listening_pod_sentences[0].target_audio_id, tables.course_audio[0].id)
})

test('propagating a take onto a duplicate that already holds this identity bumps ITS revision too', async () => {
  const tables = fixture()
  const db = memDb(tables)
  const aran = await resolveRecordist(db, ARAN)
  const out = await propagateTakeToDuplicates({ db, recordist: aran, sentenceId: 's1l1', text: TEXT, s3Key: 'mastered/NEW.mp3', logger: quiet })
  assert.deepEqual(out.linked.map((l) => l.sentenceId), ['s9l47'])
  assert.deepEqual(out.failed, [])
  const clip = tables.course_audio.find((r) => r.id === 'CLIP-OLD')
  assert.equal(clip.audio_revision, 4, 'the duplicate shares the clip row, so the same revision bump serves it')
  assert.equal(clip.s3_key, 'mastered/NEW.mp3')
  assert.equal(tables.course_audio_revisions.length, 1)
})

// ── 2. THE MARKS ────────────────────────────────────────────────────────────

test('propagation reports every duplicate it failed to fill, by id, instead of swallowing it', async () => {
  const tables = fixture()
  const db = memDb(tables, { failOn: ({ table, op, rows, payload }) => (table === 'listening_pod_sentences' && op === 'update' && payload.target_audio_id && rows.some((r) => r.id === 's9l47')) ? 'FK refused' : null })
  const aran = await resolveRecordist(db, ARAN)
  const out = await propagateTakeToDuplicates({ db, recordist: aran, sentenceId: 's1l1', text: TEXT, s3Key: 'mastered/NEW.mp3', logger: quiet })
  assert.deepEqual(out.linked, [])
  assert.deepEqual(out.failed.map((f) => [f.sentenceId, f.courseCode, f.stage]), [['s9l47', 'cym_n_for_eng', 'link']])
  assert.match(out.failed[0].error, /FK refused/)
})

test('clearRerecordWants keeps the mark on every line in `keep` and retires the rest', async () => {
  const tables = fixture()
  const db = memDb(tables)
  const aran = await resolveRecordist(db, ARAN)
  const cleared = await clearRerecordWants({ db, recordist: aran, text: TEXT, sentenceId: 's1l1', keep: { sentenceIds: ['s9l47'], courseCodes: [] }, logger: quiet })
  assert.equal(cleared.sentences, 1)
  assert.equal(tables.listening_pod_sentences.find((r) => r.id === 's1l1').rerecord_wanted, null, 'the source line is retired')
  assert.deepEqual(tables.listening_pod_sentences.find((r) => r.id === 's9l47').rerecord_wanted, MARK, 'the un-filled duplicate keeps its mark')
})

test('clearRerecordWants with keep.allDuplicates retires only the source line and only its own course clip', async () => {
  const tables = fixture()
  tables.courses.push({ course_code: 'cym_s_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: { podCast: { Cadeirydd: { name: 'Aran', gender: 'm', voiceId: ARAN } } } })
  tables.course_audio.push({ id: 'CLIP-S', course_code: 'cym_s_for_eng', text: TEXT, text_normalized: 'prynhawn da', language: 'cym', role: 'target1', voice_id: ARAN, origin: 'human', s3_key: 'mastered/S.mp3', audio_revision: 1, rerecord_wanted: { reason: 'x' } })
  const db = memDb(tables)
  const aran = await resolveRecordist(db, ARAN)
  const cleared = await clearRerecordWants({ db, recordist: aran, text: TEXT, sentenceId: 's1l1', sourceCourseCode: 'cym_n_for_eng', keep: { allDuplicates: true }, logger: quiet })
  assert.equal(cleared.sentences, 1)
  assert.equal(cleared.clips, 1)
  assert.equal(cleared.keptClips, 1)
  assert.equal(tables.course_audio.find((r) => r.id === 'CLIP-OLD').rerecord_wanted, null)
  assert.deepEqual(tables.course_audio.find((r) => r.id === 'CLIP-S').rerecord_wanted, { reason: 'x' }, 'the other course clip keeps its want')
  assert.deepEqual(tables.listening_pod_sentences.find((r) => r.id === 's9l47').rerecord_wanted, MARK)
})

async function takeViaRouter(tables, opts = {}) {
  const db = memDb(tables, opts)
  const router = createRecordistRouter({
    getDb: () => db, logger: quiet, s3: {},
    handleRecordingUpload: async (innerReq, innerRes) => {
      // The seam is stubbed: it "files" the take the way commitPodRegistration
      // would, so the route's propagation and retirement run against real rows.
      const clip = tables.course_audio.find((r) => r.id === 'CLIP-OLD')
      if (clip) { clip.s3_key = 'mastered/NEW.mp3'; clip.audio_revision += 1; clip.rerecord_wanted = null }
      const src = tables.listening_pod_sentences.find((r) => r.id === innerReq.body.metadata.sentenceId)
      src.rerecord_wanted = null
      if (opts.onFiled) opts.onFiled()
      innerRes.json({ success: true, uuid: 'CLIP-OLD', s3Key: 'mastered/NEW.mp3', rawKey: 'raw/x' })
    },
  })
  const layer = router.stack.find((l) => l.route && l.route.path === '/voice/:voiceId/take' && l.route.methods.post)
  const handle = layer.route.stack[0].handle
  const out = {}
  const settled = new Promise((resolve) => {
    out.res = { status(c) { out.status = c; return out.res }, json(b) { out.body = b; resolve(); return out.res } }
  })
  await handle({ params: { voiceId: ARAN }, query: {}, headers: { 'content-type': 'application/json' }, socket: {}, method: 'POST', originalUrl: `/voice/${ARAN}/take`, body: { lineId: 's1l1', audioData: 'AAAA', mimeType: 'audio/webm' } }, out.res)
  await settled
  return { status: out.status, body: out.body }
}

test('take route: when the duplicate is filled, both marks are retired and the response says so', async () => {
  const tables = fixture()
  const r = await takeViaRouter(tables)
  assert.equal(r.status, undefined, JSON.stringify(r.body))
  assert.equal(r.body.ok, true)
  assert.equal(r.body.alsoFilled, 1)
  assert.deepEqual(r.body.notFilled, [])
  assert.equal(r.body.warnings, undefined)
  assert.equal(tables.listening_pod_sentences.find((x) => x.id === 's9l47').rerecord_wanted, null)
})

test('take route: a duplicate the take did not reach KEEPS its mark, and the response names it', async () => {
  const tables = fixture()
  // Only the propagation LINK (the write carrying target_audio_id) fails; the
  // retirement write (rerecord_wanted) is allowed, so what keeps the mark is
  // the route's decision, not a second failure.
  const r = await takeViaRouter(tables, { failOn: ({ table, op, rows, payload }) => (table === 'listening_pod_sentences' && op === 'update' && payload.target_audio_id && rows.some((x) => x.id === 's9l47')) ? 'FK refused' : null })
  assert.equal(r.status, undefined, JSON.stringify(r.body))
  assert.equal(r.body.ok, true, 'the take itself is stored and linked — never failed by propagation')
  assert.equal(r.body.alsoFilled, 0)
  assert.deepEqual(r.body.notFilled.map((f) => f.sentenceId), ['s9l47'])
  assert.ok(Array.isArray(r.body.warnings) && r.body.warnings.some((w) => /s9l47/.test(w) && /mark stays/.test(w)), JSON.stringify(r.body.warnings))
  assert.deepEqual(tables.listening_pod_sentences.find((x) => x.id === 's9l47').rerecord_wanted, MARK, 'the un-filled duplicate still says it needs the take')
  assert.equal(tables.listening_pod_sentences.find((x) => x.id === 's1l1').rerecord_wanted, null)
})

test('take route: propagation blowing up wholesale keeps every duplicate mark and surfaces the error', async () => {
  const tables = fixture()
  // The FIRST courses read after the take is filed is propagation's; fail that
  // one only, so retirement itself still runs and its keep.allDuplicates path is
  // what holds the duplicate's mark.
  let filed = false, coursesReadsAfterFiling = 0
  const r = await takeViaRouter(tables, {
    onFiled: () => { filed = true },
    failOn: ({ table, op }) => (filed && table === 'courses' && op === 'read' && ++coursesReadsAfterFiling === 1) ? 'course list on fire' : null,
  })
  assert.equal(r.status, undefined, JSON.stringify(r.body))
  assert.equal(r.body.ok, true, 'the take is stored and linked whatever propagation did')
  assert.equal(r.body.alsoFilled, 0)
  assert.ok(r.body.warnings.some((w) => /course list on fire/.test(w) && /marks stay/.test(w)), JSON.stringify(r.body.warnings))
  assert.deepEqual(tables.listening_pod_sentences.find((x) => x.id === 's9l47').rerecord_wanted, MARK, 'nobody knows which duplicates were reached, so every duplicate keeps its mark')
  assert.equal(tables.listening_pod_sentences.find((x) => x.id === 's1l1').rerecord_wanted, null, 'the source line, which the take did reach, is retired')
})

// ── 3. THE TWO RESIDUALS FROM ASTRA COLD-CHECK #595 ─────────────────────────

test('take route: a failed pod-list read is "every duplicate unfilled" — the mark stays and the response warns, never ok-and-silent', async () => {
  const tables = fixture()
  // Before: propagation dropped the pods read error, returned an empty fill
  // list, retirement read that as "nothing to keep" and erased s9l47's mark;
  // the response was ok:true, notFilled:[], no warning.
  let filed = false, podReadsAfterFiling = 0
  const r = await takeViaRouter(tables, {
    onFiled: () => { filed = true },
    failOn: ({ table, op }) => (filed && table === 'listening_pods' && op === 'read' && ++podReadsAfterFiling === 1) ? 'pod list on fire' : null,
  })
  assert.equal(r.status, undefined, JSON.stringify(r.body))
  assert.equal(r.body.ok, true, 'the take is stored and linked whatever the pod-list read did')
  assert.equal(r.body.alsoFilled, 0)
  assert.ok(Array.isArray(r.body.warnings) && r.body.warnings.some((w) => /pod list on fire/.test(w) && /marks stay/.test(w)), JSON.stringify(r.body.warnings))
  assert.deepEqual(tables.listening_pod_sentences.find((x) => x.id === 's9l47').rerecord_wanted, MARK, 'the duplicate the take could not even enumerate keeps its mark')
  assert.equal(tables.listening_pod_sentences.find((x) => x.id === 's1l1').rerecord_wanted, null)
  assert.equal(r.body.wantsKept, 1)
})

test('take route: wantsKept counts the sentence marks retirement actually held — 1 on a wholesale failure, not 0', async () => {
  const tables = fixture()
  // Before: wantsKept = keptClips + notFilled.length; on wholesale failure the
  // failure list is empty and the one clip lives in the source course, so the
  // route reported wantsKept:0 while s9l47's mark was in fact preserved.
  let filed = false, coursesReadsAfterFiling = 0
  const r = await takeViaRouter(tables, {
    onFiled: () => { filed = true },
    failOn: ({ table, op }) => (filed && table === 'courses' && op === 'read' && ++coursesReadsAfterFiling === 1) ? 'course list on fire' : null,
  })
  assert.equal(r.status, undefined, JSON.stringify(r.body))
  assert.deepEqual(tables.listening_pod_sentences.find((x) => x.id === 's9l47').rerecord_wanted, MARK)
  assert.equal(r.body.wantsKept, 1, 'one retained sentence mark, counted from retirement, not from the (empty) failure list')
})

test('clearRerecordWants: a failed pods read reports keptSentences as null (unknown), never a fabricated 0', async () => {
  const tables = fixture()
  const db = memDb(tables, { failOn: ({ table, op }) => (table === 'listening_pods' && op === 'read') ? 'pod list on fire' : null })
  const aran = await resolveRecordist(db, ARAN)
  const cleared = await clearRerecordWants({ db, recordist: aran, text: TEXT, sentenceId: 's1l1', keep: { sentenceIds: ['s9l47'], courseCodes: [] }, logger: quiet })
  assert.equal(cleared.keptSentences, null, 'unknown, not 0 — the read that would have counted it never returned')
  assert.deepEqual(tables.listening_pod_sentences.find((r) => r.id === 's9l47').rerecord_wanted, MARK, 'the mark itself is untouched by the failed read')
})

test('take route: wantsKept is "unknown", not 0, when BOTH pod-list reads (propagation and retirement) fail', async () => {
  const tables = fixture()
  // Every listening_pods read AFTER the take is filed fails: propagation's own
  // (which makes it fall back to keep.allDuplicates) AND retirement's (which
  // is what this finding is about — before this fix that second failure was
  // swallowed and silently counted as keptSentences:0). The route's own
  // pre-upload pod lookup (for lineId → podId/sentenceId) must still succeed.
  let filed = false
  const r = await takeViaRouter(tables, {
    onFiled: () => { filed = true },
    failOn: ({ table, op }) => (filed && table === 'listening_pods' && op === 'read') ? 'pod list on fire' : null,
  })
  assert.equal(r.status, undefined, JSON.stringify(r.body))
  assert.equal(r.body.ok, true, 'the take itself is stored and linked whatever the pod-list reads did')
  assert.deepEqual(tables.listening_pod_sentences.find((x) => x.id === 's9l47').rerecord_wanted, MARK, 'nobody could enumerate duplicates, so the mark stays')
  assert.equal(r.body.wantsKept, 'unknown', 'we do not know how many marks were held — say so, do not claim 0')
})
