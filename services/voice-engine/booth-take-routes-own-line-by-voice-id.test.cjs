// EVERY RECORDING ROUTE REFUSES A TAKE ON A LINE THE RECORDIST'S VOICE ID DOES
// NOT OWN (job #351). Tom, 2026-09-12 12:08Z: a human take belongs to
// (language, voice id, text); gender is a property of the voice, never a key;
// a second voice of the same gender is told apart by voice id. Job #344 made
// that the queue's and propagation's one rule (lineVoiceId). Two cold verifiers
// (#348, #349) then showed the ROUTES still let a POLICY voice record another
// voice's line: the pod-line take checked ownership only for a cast-only voice,
// and the re-record take never looked at the clip's voice at all. So Bea (policy,
// f) could file her take onto Amina's (policy, f) pod line, and re-record
// Amina's flagged clip and retire Amina's want. The queue never showed Bea
// those uuids; the take has to hold the same rule the queue does.
//
// Third finding (#348): a podCast entry naming a voice id but omitting gender
// was dropped from that voice's queue (`uncast`) while propagation still
// resolved it as owned. Queue membership and ownership must agree.
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
process.env.CASTING_ACCESS_LEDGER = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'own-line-')), 'casting-access.jsonl')

const test = require('node:test')
const assert = require('node:assert')
const createRecordistRouter = require('./recordist-router.cjs')
const { buildQueue, resolveRecordist, propagateTakeToDuplicates } = require('./recordist-queue.cjs')

const BEA = 'human_bea_swa', AMINA = 'human_amina_swa', BEA_OLD = 'human_bea_swa_old'
const BEA_LINE = 's_bea', AMINA_LINE = 's_amina', NOGENDER_LINE = 's_amina_nogender'
const AMINA_CLIP = '11111111-1111-4111-8111-111111111111'
const BEA_ALIAS_CLIP = '22222222-2222-4222-8222-222222222222'
// Untagged narration ('human' bucket) whose want names no gender: nobody can
// be named to carry it, so it is in no queue.
const NOBODY_CLIP = '33333333-3333-4333-8333-333333333333'

// Swahili WITH a policy row naming two female voices, Bea and Amina. Neither
// is cast-only: no castCourses, so the course gate never fires and the only
// thing between Bea and Amina's line is ownership by voice id.
function fixture({ nobodyClip = false } = {}) {
  return {
    language_recording_policy: [{ language: 'swa', human_only: true, voices: {
      f: { name: 'Bea', voiceId: BEA, gender: 'f', aliases: [BEA_OLD], email: 'bea@example.com' },
      'f:2': { name: 'Amina', voiceId: AMINA, gender: 'f', email: 'amina@example.com' },
    } }],
    dashboard_users: [],
    courses: [
      { course_code: 'swa_for_eng', target_lang: 'swa', known_lang: 'eng', voice_config: { podCast: {
        Bea: { name: 'Bea', gender: 'f', voiceId: BEA },
        Amina: { name: 'Amina', gender: 'f', voiceId: AMINA },
      } } },
      // The gender-omitted cast: names Amina's voice id and nothing else.
      { course_code: 'swa_for_fra', target_lang: 'swa', known_lang: 'fra', voice_config: { podCast: {
        Amina: { name: 'Amina', voiceId: AMINA },
      } } },
    ],
    listening_pods: [
      { id: 'p_eng', course_code: 'swa_for_eng', slug: 'pod-1', title: 'Pod 1' },
      { id: 'p_fra', course_code: 'swa_for_fra', slug: 'pod-1', title: 'Pod 1' },
    ],
    listening_pod_sentences: [
      { id: BEA_LINE, pod_id: 'p_eng', global_order: 1, speaker: 'Bea', target_text: 'Habari.', known_text: 'Hello.' },
      { id: AMINA_LINE, pod_id: 'p_eng', global_order: 2, speaker: 'Amina', target_text: 'Asante.', known_text: 'Thanks.' },
      { id: NOGENDER_LINE, pod_id: 'p_fra', global_order: 1, speaker: 'Amina', target_text: 'Asante.', known_text: 'Merci.' },
    ],
    course_audio: [
      { id: AMINA_CLIP, course_code: 'swa_for_eng', text: 'Karibu.', role: 'target', language: 'swa', voice_id: AMINA, s3_key: 'k1', rerecord_wanted: { reason: 'clipped', voice_gender: 'f' } },
      { id: BEA_ALIAS_CLIP, course_code: 'swa_for_eng', text: 'Kwaheri.', role: 'target', language: 'swa', voice_id: BEA_OLD, s3_key: 'k2', rerecord_wanted: { reason: 'clipped', voice_gender: 'f' } },
      ...(nobodyClip ? [{ id: NOBODY_CLIP, course_code: 'swa_for_eng', text: 'Tutaonana.', role: 'narration', language: 'swa', voice_id: 'human', s3_key: 'k3', rerecord_wanted: { reason: 'clipped' } }] : []),
    ],
  }
}

function stubDb(tables, writes = []) {
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      let op = 'read', patch = null
      const q = {
        select() { return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        ilike(col, val) { const w = String(val).toLowerCase(); rows = rows.filter((r) => String(r[col] || '').toLowerCase() === w); return q },
        not(col, op2, val) { if (op2 === 'is' && val === null) rows = rows.filter((r) => r[col] != null); return q },
        order() { return q },
        limit(n) { return Promise.resolve({ data: rows.slice(0, n), error: null }) },
        range(from, to) { return Promise.resolve({ data: rows.slice(from, to + 1), error: null }) },
        maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        single() { return Promise.resolve({ data: op === 'upsert' ? { id: `new-${writes.length}`, ...patch } : rows[0] || null, error: null }) },
        update(p) { op = 'update'; patch = p; return q },
        upsert(p) { op = 'upsert'; patch = p; writes.push({ table, op, row: p }); return q },
        then(resolve, reject) {
          if (op === 'update') writes.push({ table, op, patch, ids: rows.map((r) => r.id) })
          return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
        },
      }
      return q
    },
  }
}

const quiet = { log() {}, info() {}, warn() {}, error() {} }

async function take(voiceId, lineId, tables = fixture()) {
  const writes = []
  const uploads = []
  const router = createRecordistRouter({
    getDb: () => stubDb(tables, writes),
    logger: quiet,
    s3: {},
    // The upload seam is the money: a refusal must happen BEFORE it is reached.
    handleRecordingUpload: async (innerReq, innerRes) => {
      uploads.push({ voiceId: innerReq.recordistVoiceId, courseCode: innerReq.params.courseCode, uuid: innerReq.body.uuid || null, sentenceId: innerReq.body.metadata.sentenceId || null })
      innerRes.json({ success: true, uuid: 'AUDIO-1', s3Key: 'mastered/x.mp3', rawKey: 'raw/x' })
    },
  })
  const layer = router.stack.find((l) => l.route && l.route.path === '/voice/:voiceId/take' && l.route.methods.post)
  const handle = layer.route.stack[0].handle
  const out = {}
  const settled = new Promise((resolve) => {
    out.res = {
      status(c) { out.status = c; return out.res },
      json(b) { out.body = b; resolve(); return out.res },
    }
  })
  await handle({
    params: { voiceId }, query: {}, headers: { 'content-type': 'application/json' }, socket: {},
    method: 'POST', originalUrl: `/voice/${voiceId}/take`,
    body: { lineId, audioData: 'AAAA', mimeType: 'audio/webm' },
  }, out.res)
  await settled
  return { status: out.status, body: out.body, uploads, writes }
}

test('a policy voice cannot record a pod line cast to another policy voice of the same gender', async () => {
  const r = await take(BEA, AMINA_LINE)
  assert.equal(r.status, 403, `expected a refusal, got ${r.status} ${JSON.stringify(r.body)}`)
  assert.equal(r.body.reason, 'not_cast_on_line')
  assert.equal(r.body.courseCode, 'swa_for_eng')
  assert.deepEqual(r.uploads, [], 'the upload seam is never reached')
  assert.deepEqual(r.writes, [], 'nothing is linked, nothing is retired')
})

test('a policy voice cannot re-record a rerecord_wanted clip owned by another voice', async () => {
  const r = await take(BEA, AMINA_CLIP)
  assert.equal(r.status, 403, `expected a refusal, got ${r.status} ${JSON.stringify(r.body)}`)
  assert.equal(r.body.reason, 'not_cast_on_line')
  assert.deepEqual(r.uploads, [], 'the upload seam is never reached')
  assert.deepEqual(r.writes, [], "Amina's want is untouched")
})

// Cold-verify #355 (2026-09-12): a flagged clip whose owner cannot be named
// (untagged narration, want naming no gender) was refused by nobody -- the
// ownership check read `owner && ...`, so a null owner fell through to the
// language and course gates and any policy voice of the language could
// re-record it and retire its want. The queue never offers such a clip to
// anyone (it is counted uncast); the take holds the same rule.
test('a flagged clip nobody is named to carry is refused at the take, as the queue never offered it', async () => {
  const tables = fixture({ nobodyClip: true })
  const q = await buildQueue(stubDb(tables), await resolveRecordist(stubDb(tables), BEA), { includeRecorded: true })
  assert.equal(q.lines.some((l) => l.id === NOBODY_CLIP), false, 'the queue never offers it')
  assert.equal(q.uncast, 1, 'it is counted uncast instead')
  const r = await take(BEA, NOBODY_CLIP, fixture({ nobodyClip: true }))
  assert.equal(r.status, 403, `expected a refusal, got ${r.status} ${JSON.stringify(r.body)}`)
  assert.equal(r.body.reason, 'not_cast_on_line')
  assert.deepEqual(r.uploads, [], 'the upload seam is never reached')
  assert.deepEqual(r.writes, [], 'the want is untouched')
})

test('the same voice still records its own pod line', async () => {
  const r = await take(BEA, BEA_LINE)
  assert.equal(r.status, undefined, `expected 200, got ${r.status} ${JSON.stringify(r.body)}`)
  assert.equal(r.body.ok, true)
  assert.deepEqual(r.uploads, [{ voiceId: BEA, courseCode: 'swa_for_eng', uuid: null, sentenceId: BEA_LINE }])
})

test('a clip stored under an OLD spelling of the voice is still its own: aliases count, and the want is retired', async () => {
  const r = await take(BEA, BEA_ALIAS_CLIP)
  assert.equal(r.status, undefined, `expected 200, got ${r.status} ${JSON.stringify(r.body)}`)
  assert.equal(r.body.kind, 'rerecord')
  assert.equal(r.body.wantsRetired, 1)
  assert.deepEqual(r.uploads, [{ voiceId: BEA, courseCode: 'swa_for_eng', uuid: BEA_ALIAS_CLIP, sentenceId: null }])
})

test('a cast that names a voice id but omits gender is that voice\'s queue line, and the same line propagation files onto', async () => {
  const db = stubDb(fixture())
  const amina = await resolveRecordist(db, AMINA)
  assert.equal(amina.castCourses, undefined, 'Amina is a policy voice, not cast-only')
  const q = await buildQueue(db, amina, { includeRecorded: true })
  // Her two copies of "Asante." collapse into one line (one is the other's duplicate).
  const mine = q.lines.filter((l) => l.text === 'Asante.')
  assert.equal(mine.length, 1, `Amina's queue: ${JSON.stringify(q.lines.map((l) => l.id))}`)
  assert.ok([AMINA_LINE, NOGENDER_LINE].includes(mine[0].id), `the representative is one of her copies, got ${mine[0].id}`)
  assert.equal(mine[0].alsoFills, 1, 'the gender-omitted copy is hers, not uncast: one take fills both')
  assert.equal(q.uncast, 0, 'a line with an owner is never uncast')

  const bea = await resolveRecordist(db, BEA)
  const qb = await buildQueue(db, bea, { includeRecorded: true })
  assert.deepEqual(qb.lines.filter((l) => l.kind !== 'rerecord').map((l) => l.id), [BEA_LINE], 'Bea sees none of it')
  // And the queue agrees with the take on the flagged clips: Amina's clip is
  // queued to Amina, not to the first female voice the policy names.
  assert.equal(qb.lines.some((l) => l.id === AMINA_CLIP), false, "Amina's clip is not in Bea's queue")
  assert.equal(q.lines.some((l) => l.id === AMINA_CLIP), true, "Amina's clip is in Amina's queue")
  assert.equal(qb.lines.some((l) => l.id === BEA_ALIAS_CLIP), true, "Bea's old-spelling clip is in Bea's queue")

  // Propagation agrees with the queue: a take on the eng copy fills the fra copy.
  const writes = []
  const out = await propagateTakeToDuplicates({ db: stubDb(fixture(), writes), recordist: amina, sentenceId: AMINA_LINE, text: 'Asante.', s3Key: 'mastered/a.mp3', logger: quiet })
  assert.deepEqual(out.linked.map((l) => l.sentenceId), [NOGENDER_LINE])
})

// Fourth finding (cold-verify #355): the `wanted` source still demanded a
// gender AFTER resolving the clip's owner. A community voice cast with no
// gender, whose flagged clip is stored under its voice id and whose want names
// no gender, was counted `uncast` and left out of its own queue, while the
// take route (correctly) let that voice record it.
const NOMI = 'human_nomi_swa'
const NOMI_CLIP = '33333333-3333-4333-8333-333333333333'
function communityFixture() {
  const f = fixture()
  f.language_recording_policy = []
  f.courses = [{ course_code: 'swa_for_deu', target_lang: 'swa', known_lang: 'deu', voice_config: { podCast: {
    Nomi: { name: 'Nomi', voiceId: NOMI, email: 'nomi@example.com' },
    Juma: { name: 'Juma', voiceId: 'human_juma_swa', gender: 'm', email: 'juma@example.com' },
  } } }]
  f.listening_pods = [{ id: 'p_deu', course_code: 'swa_for_deu', slug: 'pod-1', title: 'Pod 1' }]
  f.listening_pod_sentences = [{ id: 's_nomi', pod_id: 'p_deu', global_order: 1, speaker: 'Nomi', target_text: 'Habari.', known_text: 'Hallo.' }]
  f.course_audio = [{ id: NOMI_CLIP, course_code: 'swa_for_deu', text: 'Karibu.', role: 'target', language: 'swa', voice_id: NOMI, s3_key: 'k3', rerecord_wanted: { reason: 'clipped' } }]
  return f
}

test('a flagged clip owned by a community voice with no gender, and a want naming none, is that voice\'s queue line and not uncast', async () => {
  const db = stubDb(communityFixture())
  const nomi = await resolveRecordist(db, NOMI, { course: 'swa_for_deu' })
  assert.ok(nomi, 'Nomi is a live cast-only voice')
  const q = await buildQueue(db, nomi, { includeRecorded: true })
  assert.equal(q.lines.some((l) => l.id === NOMI_CLIP && l.kind === 'rerecord'), true, `Nomi's flagged clip is in her queue: ${JSON.stringify(q.lines.map((l) => l.id))}`)
  assert.equal(q.uncast, 0, 'a clip with an owner is never uncast')
  const juma = await resolveRecordist(db, 'human_juma_swa', { course: 'swa_for_deu' })
  const qj = await buildQueue(db, juma, { includeRecorded: true })
  assert.equal(qj.lines.some((l) => l.id === NOMI_CLIP), false, "Juma never sees Nomi's clip")
})
