#!/usr/bin/env node
'use strict'
/**
 * copy-read.cjs — the ONE database reader for the paid-cleanup planning kits (item10/, plan-11-13-17-19/), cs #931·AI.
 *
 * WHY. On 19 Nov the item-10 and item-19 planners were cancelled (~10:20Z) because every read they made went to LIVE:
 * GET script-view / lego basket / seed baskets on Popty, and — heaviest — POST :3471/api/v2/validate, which reads a
 * whole course (seeds + LEGOs + every phrase) from live on EVERY call, once per touched seed. Planning reads belong on
 * the nightly restored copy (Tom 2026-11-05; changesets cs #835). This file reads ONLY that copy and REFUSES to run when
 * DATABASE_URL points anywhere else. The one thing the kits still send towards live is the edit door's dry run
 * (POST /api/production/<course>/edit-batch WITHOUT "apply"), from the kits' dryrun.py — never from here.
 *
 * DATABASE_URL: taken from the environment if set, else from ~/ssi-restore/qa-copy.env, else qa-copy-fresh.env.
 * Refused unless: user ssi_copy, database ssi_copy_*, host a local unix socket (or localhost/127.0.0.1/::1), and no
 * "supabase" anywhere in it.
 *
 *   node copy-read.cjs where                                      prints the redacted URL + copy build time
 *   node copy-read.cjs dump <course> <out.json> [maxSeed=700]     dump-course.py's shape (script-view semantics), + source
 *   node copy-read.cjs baskets <course> <out.json> <seed,...|all>  {lego_id: [full phrase rows]} (lego/<id>/basket rows)
 *   node copy-read.cjs components <course> <dir> <seed,...>       <dir>/<seed>.json = {lego_id: components} (seed baskets)
 *   node copy-read.cjs validate <course> <requests.json> <out.json>
 *        requests = [{fromSeed, override?}] — the course-builder's /v2/validate sweep, run IN PROCESS with its own
 *        exported checks (routes/v2.cjs _test) over the course loaded ONCE from the copy. out = [{failures}] in order.
 *   node copy-read.cjs snap <course> <out.json>                  tools/paid-cleanup-717/snapshot.cjs's shape, from the copy
 *   node copy-read.cjs changeset <plan.json> <out.jsonl> [job]   NO database: the plan's ops (each already carries
 *        `expect` = the text read) written as an ssi-changeset/1 file with services/shared/changeset.cjs, for the one
 *        governed applier. Check it offline: node tools/changeset/apply-changeset.cjs <out.jsonl> --check
 * Nothing here writes to any database.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')

const REPO = path.resolve(__dirname, '..', '..')
const ENV_FILES = [path.join(os.homedir(), 'ssi-restore', 'qa-copy.env'), path.join(os.homedir(), 'ssi-restore', 'qa-copy-fresh.env')]

function copyUrl() {
  let url = process.env.DATABASE_URL, from = 'env'
  if (!url) {
    for (const f of ENV_FILES) {
      if (!fs.existsSync(f)) continue
      const m = fs.readFileSync(f, 'utf8').match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m)
      if (m) { url = m[1].trim(); from = f; break }
    }
  }
  if (!url) throw new Error(`REFUSED: no DATABASE_URL and no copy env file (${ENV_FILES.join(', ')}) — the nightly copy is missing; report it, never read live`)
  const u = new URL(url)
  const host = u.searchParams.get('host') || u.hostname
  const user = decodeURIComponent(u.username)
  const dbn = decodeURIComponent(u.pathname.replace(/^\//, ''))
  const local = host.startsWith('/') || ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)
  if (/supabase/i.test(url) || !local || user !== 'ssi_copy' || !dbn.startsWith('ssi_copy_')) {
    throw new Error(`REFUSED: DATABASE_URL is not the local nightly copy (user=${user} host=${host} db=${dbn}) — these kits never read live`)
  }
  return { url, from, redacted: url.replace(/\/\/([^:@/]*)(:[^@]*)?@/, '//$1:***@'), host, dbn }
}

async function open() {
  const c = copyUrl()
  // Popty's own guarded client (agent-db.connect: index-defeating SQL refused before it is sent), on the COPY url.
  const db = require(path.join(REPO, 'services', 'shared', 'agent-db.cjs'))
  const pg = await db.connect({ url: c.url, app: 'agent:paid-cleanup-copy-read' })
  return { pg, c }
}

const lid = (n, i) => `S${String(n).padStart(4, '0')}L${String(i).padStart(2, '0')}`
const seedList = (s, all) => (s === 'all' ? all : String(s).split(',').filter(Boolean).map(Number))

async function dump(pg, c, course, out, maxSeed) {
  const seeds = (await pg.query(`SELECT seed_number, known_text, target_text, status FROM course_seeds
     WHERE course_code = $1 AND seed_number BETWEEN 1 AND $2 ORDER BY seed_number`, [course, maxSeed])).rows
  const legos = (await pg.query(`SELECT id, seed_number, lego_index, known_text, target_text, type, is_new,
     known_audio_id, target1_audio_id, target2_audio_id FROM course_legos
     WHERE course_code = $1 AND seed_number BETWEEN 1 AND $2 ORDER BY seed_number, lego_index`, [course, maxSeed])).rows
  const phr = (await pg.query(`SELECT id, seed_number, lego_index, position, phrase_role, known_text, target_text,
     known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases
     WHERE course_code = $1 AND seed_number BETWEEN 1 AND $2 ORDER BY seed_number, lego_index, position`, [course, maxSeed])).rows
  // script-view semantics: a seed/LEGO appears only through its phrases; the LEGO's own row is prepended as
  // 'lego_debut' (position 0) when it carries any audio.
  const S = new Map(seeds.map((s) => [s.seed_number, s]))
  const L = new Map(legos.map((l) => [`${l.seed_number}:${l.lego_index}`, l]))
  const bySeed = new Map()
  for (const p of phr) {
    if (!bySeed.has(p.seed_number)) bySeed.set(p.seed_number, new Map())
    const m = bySeed.get(p.seed_number)
    if (!m.has(p.lego_index)) m.set(p.lego_index, [])
    m.get(p.lego_index).push({ id: p.id, pos: p.position, type: p.phrase_role || 'build', known: p.known_text, target: p.target_text,
      ka: p.known_audio_id || null, t1: p.target1_audio_id || null, t2: p.target2_audio_id || null })
  }
  const outSeeds = [...bySeed.keys()].sort((a, b) => a - b).map((n) => {
    const s = S.get(n) || {}
    return { n, known: s.known_text || null, target: s.target_text || null, status: s.status || null,
      legos: [...bySeed.get(n).keys()].sort((a, b) => a - b).map((i) => {
        const l = L.get(`${n}:${i}`) || {}
        const ph = [...bySeed.get(n).get(i)]
        if (l.id && (l.known_audio_id || l.target1_audio_id || l.target2_audio_id)) {
          ph.unshift({ id: l.id, pos: 0, type: 'lego_debut', known: l.known_text, target: l.target_text,
            ka: l.known_audio_id || null, t1: l.target1_audio_id || null, t2: l.target2_audio_id || null })
        }
        ph.sort((a, b) => a.pos - b.pos)
        return { id: lid(n, i), idx: i, type: l.type || null, is_new: l.is_new ?? null, known: l.known_text || null, target: l.target_text || null, phrases: ph }
      }) }
  })
  const state = readState()
  fs.writeFileSync(out, JSON.stringify({ course, dumped: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    source: 'qa-copy', copy_db: c.dbn, copy_built: state.built || null, copy_host: c.host, seeds: outSeeds }))
  console.log(course, 'seeds', outSeeds.length, 'legos', outSeeds.reduce((a, s) => a + s.legos.length, 0),
    'phrases', outSeeds.reduce((a, s) => a + s.legos.reduce((b, l) => b + l.phrases.length, 0), 0), `(copy ${c.dbn})`)
}

async function baskets(pg, course, out, seedArg) {
  const all = seedArg === 'all'
  const nums = all ? [] : seedList(seedArg)
  const rows = (await pg.query(all
    ? `SELECT * FROM course_practice_phrases WHERE course_code = $1 ORDER BY seed_number, lego_index, position`
    : `SELECT * FROM course_practice_phrases WHERE course_code = $1 AND seed_number = ANY($2::int[]) ORDER BY seed_number, lego_index, position`,
  all ? [course] : [course, nums])).rows
  const B = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {}
  const fresh = {}
  for (const r of rows) (fresh[lid(r.seed_number, r.lego_index)] ||= []).push(JSON.parse(JSON.stringify(r)))
  Object.assign(B, fresh)
  fs.writeFileSync(out, JSON.stringify(B))
  console.log(course, 'baskets', Object.keys(B).length, 'read', Object.keys(fresh).length, 'rows', rows.length)
}

async function components(pg, course, dir, seedArg) {
  const nums = seedList(seedArg)
  // seed/<id>/baskets semantics: only LEGOs that have practice phrases appear; components mapped to {known,target}.
  const legos = (await pg.query(`SELECT l.seed_number, l.lego_index, l.components FROM course_legos l
     WHERE l.course_code = $1 AND l.seed_number = ANY($2::int[])
       AND EXISTS (SELECT 1 FROM course_practice_phrases p WHERE p.course_code = l.course_code
                   AND p.seed_number = l.seed_number AND p.lego_index = l.lego_index)`, [course, nums])).rows
  fs.mkdirSync(dir, { recursive: true })
  for (const n of nums) {
    const o = {}
    for (const l of legos.filter((x) => x.seed_number === n)) o[lid(n, l.lego_index)] = (l.components || []).map((c) => ({ known: c.known, target: c.target }))
    fs.writeFileSync(path.join(dir, `${n}.json`), JSON.stringify(o))
  }
  console.log(course, 'components for', nums.length, 'seeds')
}

async function validate(pg, course, reqFile, out) {
  const { accumulate, runSeedChecks } = require(path.join(REPO, 'services', 'course-builder', 'routes', 'v2.cjs'))._test
  const { isChinese } = require(path.join(REPO, 'services', 'course-builder', 'lib', 'language-config.cjs'))
  const chinese = isChinese(course)
  const seeds = (await pg.query(`SELECT seed_number, known_text, target_text FROM course_seeds
     WHERE course_code = $1 AND decomposed_at IS NOT NULL ORDER BY seed_number`, [course])).rows
  const legos = (await pg.query(`SELECT seed_number, lego_index, known_text, target_text, type, components, is_new FROM course_legos
     WHERE course_code = $1 ORDER BY seed_number, lego_index`, [course])).rows
  const phrases = (await pg.query(`SELECT seed_number, lego_index, known_text, target_text, phrase_role FROM course_practice_phrases
     WHERE course_code = $1`, [course])).rows
  const reqs = JSON.parse(fs.readFileSync(reqFile, 'utf8'))
  const answers = []
  for (const rq of reqs) {
    // the /v2/validate handler, body for body (routes/v2.cjs), on a fresh copy of the course per request
    const legosBySeed = {}
    for (const l of legos) (legosBySeed[l.seed_number] ||= []).push(l)
    const byKey = {}
    for (const p of phrases) (byKey[`${p.seed_number}:${p.lego_index}`] ||= []).push(p)
    const fromSeed = Number(rq.fromSeed) || 0
    const ov = rq.override
    let list = seeds
    if (ov && ov.seed_number != null) {
      const n = Number(ov.seed_number)
      if (Array.isArray(ov.legos)) {
        legosBySeed[n] = ov.legos.map((l) => ({ seed_number: n, lego_index: l.lego_index, known_text: l.known_text, target_text: l.target_text,
          type: l.type, components: l.components || null, is_new: l.is_new !== false }))
      }
      for (const k of Object.keys(byKey)) if (k.startsWith(`${n}:`)) delete byKey[k]
      if (ov.phrases && typeof ov.phrases === 'object') for (const [k, arr] of Object.entries(ov.phrases)) byKey[k] = arr
      list = list.map((s) => (s.seed_number === n ? { ...s, target_text: ov.target_text || s.target_text } : s))
      if (!list.some((s) => s.seed_number === n)) {
        list = [...list, { seed_number: n, known_text: ov.known_text || '', target_text: ov.target_text || '' }].sort((a, b) => a.seed_number - b.seed_number)
      }
    }
    const vocab = new Set()
    const failures = []
    for (const s of list) {
      const sl = legosBySeed[s.seed_number] || []
      if (fromSeed && s.seed_number < fromSeed) { accumulate(sl, vocab, chinese); continue }
      const issues = runSeedChecks(s, sl, byKey, vocab, course, chinese)
      accumulate(sl, vocab, chinese)
      if (issues.length) failures.push({ seed: s.seed_number, issues })
    }
    answers.push({ fromSeed, failures })
  }
  fs.writeFileSync(out, JSON.stringify(answers))
  console.log(course, 'validated', answers.length, 'request(s) on the copy')
}

async function snap(pg, c, course, out) {
  // same queries as tools/paid-cleanup-717/snapshot.cjs, on the copy connection only
  const db = require(path.join(REPO, 'services', 'shared', 'agent-db.cjs'))
  const seeds = (await pg.query(
    `SELECT seed_number, known_text, target_text, target_text_roman, status, known_audio_id::text AS ka, target1_audio_id::text AS t1, target2_audio_id::text AS t2
       FROM course_seeds WHERE course_code = $1 ORDER BY seed_number`, [course])).rows
  const legos = (await pg.query(
    `SELECT id::text AS uuid, lego_id, seed_number, lego_index, type, is_new, known_text, target_text, components,
            known_audio_id::text AS ka, target1_audio_id::text AS t1, target2_audio_id::text AS t2, presentation_audio_id AS pres
       FROM course_legos WHERE course_code = $1 ORDER BY seed_number, lego_index`, [course])).rows
  const phrases = (await pg.query(
    `SELECT id, seed_number, lego_index, lego_id, position, phrase_role, known_text, target_text, target_text_roman,
            known_audio_id::text AS ka, target1_audio_id::text AS t1, target2_audio_id::text AS t2, updated_at, status
       FROM course_practice_phrases WHERE course_code = $1 ORDER BY seed_number, lego_index, position`, [course])).rows
  const ids = [...seeds.flatMap((s) => [s.ka, s.t1, s.t2]), ...phrases.map((p) => p.ka), ...legos.map((l) => l.ka)]
  const clips = {}
  for (const k of await db.clipsById(pg, ids, { cols: 'id::text AS id, text, voice_id, role' })) clips[k.id] = { text: k.text, voice_id: k.voice_id, role: k.role }
  fs.writeFileSync(out, JSON.stringify({ course, db: c.dbn, source: 'qa-copy', copy_built: readState().built || null, at: new Date().toISOString(), seeds, legos, phrases, clips }))
  console.log(`${course} db=${c.dbn} seeds ${seeds.length} legos ${legos.length} phrases ${phrases.length} clips ${Object.keys(clips).length}`)
}

function changeset(planFile, out, job) {
  const cs = require(path.join(REPO, 'services', 'shared', 'changeset.cjs'))
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'))
  if (plan.source !== 'qa-copy') throw new Error(`REFUSED: ${planFile} was not planned from the nightly copy (source=${plan.source})`)
  const ops = (plan.ops || []).map((o) => cs.op(o.op, Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'op'))))
  if (ops.some((o) => 'apply' in o)) throw new Error('an op carries "apply"')
  cs.write(out, { course: plan.course, job, why: `paid cleanup plan ${path.basename(planFile)}: PLAN ONLY, awaits Kai's yes`,
    source: `nightly copy ${plan.copy_db || '?'} built ${plan.copy_built || '?'}` }, ops)
  console.log(`changeset ${out}: ${ops.length} op(s) for ${plan.course}`)
}

function readState() {
  try { return JSON.parse(fs.readFileSync(path.join(os.homedir(), 'ssi-restore', 'copy-state.json'), 'utf8')) } catch (_) { return {} }
}

async function main() {
  const [cmd, ...a] = process.argv.slice(2)
  if (cmd === 'where') {
    const c = copyUrl()
    console.log(JSON.stringify({ url: c.redacted, from: c.from, host: c.host, db: c.dbn, copy_built: readState().built || null }))
    return
  }
  if (cmd === 'changeset') return changeset(a[0], a[1], a[2] || 'cs #931·AI')
  const fn = { dump, baskets, components, validate, snap }[cmd]
  if (!fn) { console.error('usage: copy-read.cjs where | dump | baskets | components | validate | snap | changeset  (see header)'); process.exit(2) }
  const { pg, c } = await open()
  console.error(`copy-read: ${cmd} on ${c.redacted}`)
  try {
    if (cmd === 'dump') await dump(pg, c, a[0], a[1], Number(a[2] || 700))
    else if (cmd === 'snap') await snap(pg, c, a[0], a[1])
    else await fn(pg, ...a)
  } finally { await pg.end() }
}
main().catch((e) => { console.error(`copy-read: ${e.message}`); process.exit(1) })
