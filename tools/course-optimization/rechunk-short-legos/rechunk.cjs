#!/usr/bin/env node
// tools/course-optimization/rechunk-short-legos/rechunk.cjs — job #192 (Tom 2026-10-12)
//
// Fixes debut LEGOs that cannot be practised well by chunking them UP (or, failing that, re-chunking the
// seed), and gives every changed LEGO a basket of phrases that BOTH Sonnet and Opus judged good and that pass
// the strict course-builder gate (tools/phrase-gate/gate-check.cjs). "There's really never a good reason to
// have a bad phrase"; "fewer phrases beats bad ones" — so floors are reported, never filled with a weak phrase.
// The seed's own text is never touched (S15); only its decomposition.
//
// One plan per course: ops/rechunk-short-legos/plans/<course>.json (written by a person, one op per seed —
// see lib.cjs for the op shape and the PROGRESS RULE that fixes it: never renumber, never reuse an index,
// a merge keeps the highest index, an in-place change is refused while any learner's position sits on it).
//
//   node rechunk.cjs check  <course>              read-only: live snapshot, op rules, learner positions, L31/O12 census
//   node rechunk.cjs author <course> [--seeds a,b] Sonnet authors + judges, Opus judges cold, gate → plans/<course>.baskets.json
//   node rechunk.cjs apply  <course> [--seeds a,b] [--apply]   DRY RUN unless --apply. One transaction per seed.
//   node rechunk.cjs undo   <course> [--seeds a,b] [--apply]   puts each seed back exactly as the ledger holds it
//
// Writes: the ledger line (the seed's FULL before-state) is appended and fsynced BEFORE the transaction opens;
// undo restores that snapshot. After a run that wrote anything: course_round_index refreshed (by construction),
// courses.content_version bumped (patch) so cached bundles refetch, ONE audio-pass request queued (no TTS here —
// the new texts wait for Tom's voice budget, and the player drops a round whose LEGO has no audio until then).
// Editor identity: serviceIdentity('rechunk-short-legos') + recordContentEdit (intro-mirror and debut-practice
// checks run at exit over the seeds touched).
'use strict'
const fs = require('fs'), path = require('path'), os = require('os')
const { spawn } = require('child_process')
const L = require('./lib.cjs')

const REPO = path.resolve(__dirname, '..', '..', '..')
const OPS = path.join(REPO, 'ops', 'rechunk-short-legos')
const SWEEP = 'rechunk-short-legos'
const SURFACE = 'tools/course-optimization/rechunk-short-legos/rechunk.cjs'
const JOB = '#192'
const EVIDENCE = path.join(os.homedir(), 'ssi-evidence', 'ssi-dashboard-v7', 'ops', 'rechunk-short-legos')
const SHARED = '/home/tomcassidy/SSi/ssi-dashboard-v7-clean'

const argv = process.argv.slice(2)
const [CMD, COURSE] = argv
const APPLY = argv.includes('--apply')
const SEEDS = (() => { const i = argv.indexOf('--seeds'); return i > 0 ? new Set(argv[i + 1].split(',').map(Number)) : null })()

function readEnv(file) {
  const out = {}
  if (!fs.existsSync(file)) return out
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()); if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '') }
  return out
}
const ENV = { ...readEnv(path.join(SHARED, '.env')), ...readEnv(path.join(SHARED, '.env.psql')) }
async function pgClient() {
  const { Client } = require('pg')
  const c = new Client({ connectionString: process.env.DATABASE_URL || ENV.DATABASE_URL })
  await c.connect(); return c
}
let _sb = null
function supabase() {
  if (_sb) return _sb
  const { createClient } = require('@supabase/supabase-js')
  _sb = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  return _sb
}
const planPath = (c) => path.join(OPS, 'plans', `${c}.json`)
const basketsPath = (c) => path.join(OPS, 'plans', `${c}.baskets.json`)
const ledgerPath = (c) => path.join(OPS, 'undo', `${c}.jsonl`)
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))
const say = (...a) => console.error(...a)

async function loadSeed(pg, course, seed) {
  const { rows: [s] } = await pg.query('SELECT * FROM course_seeds WHERE course_code=$1 AND seed_number=$2', [course, seed])
  const { rows: legos } = await pg.query('SELECT * FROM course_legos WHERE course_code=$1 AND seed_number=$2 ORDER BY lego_index', [course, seed])
  const { rows: phrases } = await pg.query('SELECT * FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 ORDER BY lego_index, position', [course, seed])
  const ids = legos.map((l) => l.lego_id)
  const { rows: intros } = await pg.query('SELECT * FROM lego_introductions WHERE course_code=$1 AND lego_id = ANY($2)', [course, ids])
  const { rows: audioTags } = await pg.query("SELECT id, lego_id, role FROM course_audio WHERE course_code=$1 AND lego_id = ANY($2) AND role='presentation'", [course, ids])
  return { seed: s, legos, phrases, intros, audioTags }
}
const asBefore = (legos) => legos.map((l) => ({ idx: l.lego_index, type: l.type, known: l.known_text, target: l.target_text, components: l.components, is_new: l.is_new }))
const planned = (plan) => plan.seeds.filter((s) => !SEEDS || SEEDS.has(s.seed))

// ── check ─────────────────────────────────────────────────────────────────────────────────────────
async function check(course) {
  const plan = readJson(planPath(course)), pg = await pgClient()
  const { estimateSyllables } = require(path.join(REPO, 'services/course-builder/lib/language-config.cjs'))
  const { rows: cursors } = await pg.query('SELECT learner_id, last_completed_lego_id, highest_completed_lego_id FROM course_enrollments WHERE course_id=$1', [course])
  const out = []
  for (const p of planned(plan)) {
    const live = await loadSeed(pg, course, p.seed)
    const before = asBefore(live.legos)
    const problems = L.checkOp(live.seed, before, p, { estimateSyllables, courseCode: course })
    const conflicts = L.cursorConflicts(p.seed, p, cursors)
    // L31: a later not-new LEGO whose earlier exact pair this op removes or changes.
    const touched = live.legos.filter((l) => (p.delete || []).includes(l.lego_index) || (p.set || {})[l.lego_index])
    const l31 = []
    for (const t of touched) {
      const { rows } = await pg.query('SELECT lego_id, is_new FROM course_legos WHERE course_code=$1 AND seed_number>$2 AND NOT is_new AND lower(known_text)=lower($3) AND lower(target_text)=lower($4)', [course, p.seed, t.known_text, t.target_text])
      for (const r of rows) l31.push(`${r.lego_id} was not-new on ${t.lego_id}'s pair "${t.known_text} → ${t.target_text}"`)
    }
    out.push({ seed: p.seed, kind: p.kind, problems, learnersOnChangedLego: conflicts.length, l31,
      before: before.map((l) => `L${l.idx} ${l.known} → ${l.target}`), after: L.afterLegos(before, p).map((l) => `L${l.idx}${l.change === 'keep' ? '' : ' [' + l.change + ']'} ${l.known} → ${l.target}`) })
  }
  await pg.end()
  for (const o of out) {
    say(`S${o.seed} ${o.kind}: ${o.problems.length ? 'PROBLEMS ' + o.problems.join('; ') : 'ok'}${o.learnersOnChangedLego ? ` — ${o.learnersOnChangedLego} learner(s) on a changed LEGO: apply will refuse` : ''}${o.l31.length ? ' — L31: ' + o.l31.join('; ') : ''}`)
    say(`   before: ${o.before.join(' | ')}\n   after:  ${o.after.join(' | ')}`)
  }
  return out
}

// ── author ────────────────────────────────────────────────────────────────────────────────────────
const LANG = { afr: 'Afrikaans', spa: 'Spanish', fra: 'French', deu: 'German', ita: 'Italian', zho: 'Mandarin Chinese', jpn: 'Japanese', eng: 'English', ara: 'Arabic' }
function languages(course) { const [t, k] = course.split('_for_'); return { target: LANG[t.split('_')[0]] || t, known: LANG[k] || k } }
async function callClaude(model, system, user, label) {
  const dir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.cs-accounts', 'account-3')
  const env = { ...process.env, CLAUDE_CONFIG_DIR: dir }
  const tok = path.join(dir, '.cs-oauth-token'); if (fs.existsSync(tok)) env.CLAUDE_CODE_OAUTH_TOKEN = fs.readFileSync(tok, 'utf8').trim()
  for (const k of ['CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT', 'CLAUDE_CODE_CHILD_SESSION', 'CLAUDE_CODE_SESSION_ID']) delete env[k]
  const bin = path.join(os.homedir(), '.local/bin/claude')
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await new Promise((res) => {
      const p = spawn(bin, ['--print', '--model', model, '--tools', '', '--no-session-persistence', '--strict-mcp-config', '--output-format', 'json', '--system-prompt', system], { cwd: os.tmpdir(), env, stdio: ['pipe', 'pipe', 'pipe'] })
      let o = '', e = ''; const t = setTimeout(() => p.kill('SIGTERM'), 15 * 60e3)
      p.stdout.on('data', (d) => (o += d)); p.stderr.on('data', (d) => (e += d))
      p.on('close', (code) => { clearTimeout(t); res({ code, o, e }) }); p.stdin.end(user)
    })
    let j = null; try { j = JSON.parse(r.o) } catch {}
    if (j && !j.is_error && typeof j.result === 'string') {
      const s = j.result, a = s.indexOf('{'), b = s.lastIndexOf('}')
      try { return { json: JSON.parse(s.slice(a, b + 1)), served: Object.keys(j.modelUsage || {})[0] || model, raw: s } } catch (err) { say(`${label}: unparseable (${err.message}), retry`) }
    } else say(`${label}: ${model} failed (${String((j && j.result) || r.e).slice(0, 200)}), retry`)
    await new Promise((res) => setTimeout(res, 15e3 * attempt))
  }
  throw new Error(`${label}: ${model} failed three times`)
}
const RUBRIC_DIGEST = `Tom's and Kai's rules (exact intent):
- Least action to confidence. ZUT: one KNOWN prompt maps to exactly one TARGET across the course. A slightly stilted but tileable English prompt is correct (the known side is a controlled language): it may use only glosses of LEGOs already taught, glue words and taught constructions.
- No parentheses, slashes or explanations anywhere. Informal register by default.
- Every phrase contains its LEGO's exact target words, and uses only target vocabulary already taught (list given) plus the LEGO itself.
- BUILD: the LEGO plus one to three other taught LEGOs, short; may be a fragment, but must extend naturally into a full sentence.
- USE: one complete natural sentence, longer than a BUILD, never more than one sentence. Tier 1 only: natural as said, not "possible but clunky", never wrong.
- The target must be grammatical and say exactly what the known says (agreement, word order, verb-final subordinate clauses, double negation 'nie...nie' in Afrikaans, etc.).
- "There's never a good reason to have a bad phrase." "Fewer phrases beats bad ones." When unsure a phrase is good, it is BAD.`
function contextText(c) {
  const { target, known } = languages(c.course)
  return `Course ${c.course}: the learner speaks ${known} (KNOWN) and is learning ${target} (TARGET).
SEED ${c.seed}: known "${c.seedKnown}" | target "${c.seedTarget}"
The seed's LEGOs after re-chunking: ${c.seedLegos.map((l) => `L${l.idx} "${l.known}" = "${l.target}"`).join('; ')}
THE LEGO: L${c.lego.idx} [${c.lego.type}] known "${c.lego.known}" = target "${c.lego.target}"${c.lego.components ? ` (pieces: ${c.lego.components.map((x) => `${x.known}=${x.target}`).join(', ')})` : ''}
TARGET VOCABULARY ALREADY TAUGHT (every LEGO and piece before this one): ${c.vocab.join(' · ')}
KNOWN-SIDE GLOSSES ALREADY TAUGHT: ${c.glosses.join(' · ')}`
}
function authorPrompt(c) {
  const system = `You write practice phrases for one LEGO of an SSi language course, and judge the ones it already has. Answer with ONE JSON object only.\n\n${RUBRIC_DIGEST}`
  const user = `${contextText(c)}

EXISTING PHRASES that already contain this LEGO (judge each):
${c.existing.map((p, i) => `E${i + 1} ${p.role.toUpperCase()}: "${p.known}" => "${p.target}"`).join('\n') || '(none)'}

TASK: (1) judge every existing phrase GOOD or BAD; (2) write NEW candidates: ${c.want.build} BUILD and ${c.want.use} USE. An independent judge will reject any that is not clearly good, so write only phrases you would stake the course on — each must still be a real BUILD or USE as defined above. Vary the frames; never repeat an existing phrase.${c.feedback ? `

ALREADY ACCEPTED (do not repeat): ${c.feedback.accepted.map((p) => `"${p.known}" => "${p.target}"`).join('; ') || 'none'}
REJECTED BY THE JUDGE, with its reason (learn from these): ${c.feedback.rejected.map((p) => `"${p.known}" => "${p.target}" — ${p.why}`).join(' | ')}` : ''}
Answer: {"judge":[{"ref":"E1","verdict":"GOOD"|"BAD","reason":"..."}],"new":[{"role":"build"|"use","known":"...","target":"..."}]}`
  return { system, user }
}
function judgePrompt(c, items) {
  const system = `You are an independent judge of practice phrases for one LEGO of an SSi language course. Judge each phrase cold, by the rules; you are not there to agree with anyone. Answer with ONE JSON object only.\n\n${RUBRIC_DIGEST}`
  const user = `${contextText(c)}

PHRASES TO JUDGE:
${items.map((p) => `${p.ref} ${p.role.toUpperCase()}: "${p.known}" => "${p.target}"`).join('\n')}

For EVERY phrase: GOOD only if it is grammatical and natural in ${languages(c.course).target}, says exactly what the known side says, the known side is natural (tier 1) and uses only taught material, it contains the LEGO, and (USE) it is one complete sentence. Otherwise BAD.
Answer: {"verdicts":[{"ref":"P1","verdict":"GOOD"|"BAD","reason":"..."}]}`
  return { system, user }
}
async function taughtBefore(pg, course, seed, seedLegosAfter, idx) {
  const { rows } = await pg.query('SELECT seed_number, lego_index, known_text, target_text, components FROM course_legos WHERE course_code=$1 AND seed_number<$2 ORDER BY seed_number, lego_index', [course, seed])
  const all = [...rows.map((r) => ({ known: r.known_text, target: r.target_text, components: r.components })), ...seedLegosAfter.filter((l) => l.idx <= idx)]
  const vocab = new Set(), glosses = new Set()
  for (const l of all) { vocab.add(l.target); if (l.known) glosses.add(l.known); for (const c of l.components || []) { vocab.add(c.target); if (c.known) glosses.add(c.known) } }
  return { vocab: [...vocab], glosses: [...glosses] }
}
async function author(course) {
  const plan = readJson(planPath(course)), pg = await pgClient()
  const { checkWordContainment } = require(path.join(REPO, 'services/course-builder/lib/text-normalization.cjs'))
  const gate = require(path.join(REPO, 'tools/phrase-gate/gate-check.cjs'))
  const ctx = gate.makeCourseCtx(supabase(), course)
  const PHRASE_GATES = ['bareLego', 'containment', 'vocab', 'zut', 'knownSide']
  const baskets = fs.existsSync(basketsPath(course)) ? readJson(basketsPath(course)) : { course, seeds: {} }
  fs.mkdirSync(EVIDENCE, { recursive: true })
  for (const p of planned(plan)) {
    const live = await loadSeed(pg, course, p.seed)
    const before = asBefore(live.legos), after = L.afterLegos(before, p)
    const seedOut = { seed: p.seed, kind: p.kind, snapshot: live.legos.map((l) => ({ idx: l.lego_index, known: l.known_text, target: l.target_text })), legos: {} }
    for (const lego of L.workLegos(before, p)) {
      // candidates already in the DB: phrases of this LEGO and of any LEGO this op deletes, that contain the new LEGO
      const fromIdx = new Set([lego.idx, ...(p.delete || [])])
      const existing = live.phrases.filter((r) => fromIdx.has(r.lego_index) && ['build', 'use'].includes(r.phrase_role) && checkWordContainment(lego.target, r.target_text))
        .map((r) => ({ id: r.id, role: r.phrase_role, known: r.known_text, target: r.target_text }))
      const t = await taughtBefore(pg, course, p.seed, after, lego.idx)
      const label = `S${p.seed}L${lego.idx}`
      const entryBase = { courseCode: course, seedNumber: p.seed, legoIndex: lego.idx, legoId: L.legoId(p.seed, lego.idx), legoKnown: lego.known, legoTarget: lego.target, components: lego.components, seedTarget: p.seedTarget || live.seed.target_text }
      const items = [], served = {}
      // Up to two rounds. Round 2 only asks for what is still missing, and shows Sonnet what the judge rejected
      // and why. Opus never sees which phrases Sonnet wrote, nor any of Sonnet's reasons — every round is judged cold.
      for (let round = 1; round <= 2; round++) {
        const keptNow = items.filter((x) => x.keep)
        const want = { build: Math.max(0, 4 - keptNow.filter((x) => x.role === 'build').length) + 2, use: Math.max(0, 6 - keptNow.filter((x) => x.role === 'use').length) + 3 }
        if (round === 2 && keptNow.filter((x) => x.role === 'build').length >= 3 && keptNow.filter((x) => x.role === 'use').length >= 5) break
        const c = { course, seed: p.seed, seedKnown: live.seed.known_text, seedTarget: p.seedTarget || live.seed.target_text, seedLegos: after, lego, existing: round === 1 ? existing : [], want, ...t,
          feedback: round === 1 ? null : { accepted: keptNow, rejected: items.filter((x) => !x.keep && x.source === 'new') } }
        const A = await callClaude('sonnet', authorPrompt(c).system, authorPrompt(c).user, `${label} sonnet r${round}`)
        fs.writeFileSync(path.join(EVIDENCE, `${course}.${label}.r${round}.sonnet.txt`), A.raw)
        const sonnetGood = new Map((A.json.judge || []).map((j) => [j.ref, String(j.verdict).toUpperCase() === 'GOOD']))
        const fresh = [
          ...c.existing.map((e, i) => ({ ...e, source: 'kept', sonnet: sonnetGood.get(`E${i + 1}`) === true, sonnetReason: (A.json.judge || []).find((j) => j.ref === `E${i + 1}`)?.reason || null })),
          ...(A.json.new || []).filter((n) => n && ['build', 'use'].includes(n.role) && n.known && n.target).map((n) => ({ role: n.role, known: n.known.trim(), target: n.target.trim(), source: 'new', sonnet: true })),
        ].filter((x) => !items.some((y) => L.norm(y.target) === L.norm(x.target) && L.norm(y.known) === L.norm(x.known)))
          .map((x, i) => ({ ...x, ref: `P${i + 1}`, round }))
        if (!fresh.length) break
        const B = await callClaude('opus', judgePrompt(c, fresh).system, judgePrompt(c, fresh).user, `${label} opus r${round}`)
        fs.writeFileSync(path.join(EVIDENCE, `${course}.${label}.r${round}.opus.txt`), B.raw)
        served.sonnet = A.served; served.opus = B.served
        const opus = new Map((B.json.verdicts || []).map((v) => [v.ref, { good: String(v.verdict).toUpperCase() === 'GOOD', reason: v.reason }]))
        for (const it of fresh) {
          it.opus = opus.get(it.ref)?.good === true; it.opusReason = opus.get(it.ref)?.reason || 'no verdict'
          if (!(it.sonnet && it.opus)) { it.keep = false; it.why = !it.sonnet ? `Sonnet: bad — ${it.sonnetReason || ''}` : `Opus: bad — ${it.opusReason}` }
          else {
            const g = await gate.checkPhraseSet({ ...entryBase, phrases: [{ role: it.role, known: it.known, target: it.target }] }, ctx)
            const fails = PHRASE_GATES.filter((n) => g.gates?.[n]?.pass === false)
            it.keep = !fails.length; it.why = fails.length ? `gate: ${fails.join(', ')}` : 'both judges good, gate pass'
          }
          // the same normalised target twice under one LEGO teaches nothing new: keep the first
          if (it.keep && items.some((y) => y.keep && L.norm(y.target) === L.norm(it.target))) { it.keep = false; it.why = 'duplicate target' }
          items.push(it)
        }
      }
      const A = { served: served.sonnet }, B = { served: served.opus }
      // Caps: BUILD is "three or four, never five" (Tom 2026-08-28, the gate's buildCountSpec); USE at most 8, so a
      // LEGO stays within the 13-phrase basket. Phrases already in the course are preferred, then first-judged.
      for (const [role, cap] of [['build', 4], ['use', 8]]) {
        const k = items.filter((x) => x.keep && x.role === role).sort((a, b) => (a.source === 'kept' ? 0 : 1) - (b.source === 'kept' ? 0 : 1))
        for (const x of k.slice(cap)) { x.keep = false; x.why = `good, but over the ${role.toUpperCase()} cap of ${cap}` }
      }
      const kept = items.filter((x) => x.keep)
      const set = await gate.checkPhraseSet({ ...entryBase, phrases: kept.map(({ role, known, target }) => ({ role, known, target })) }, ctx)
      seedOut.legos[lego.idx] = { lego, served: { sonnet: A.served, opus: B.served }, items, keptBuild: kept.filter((x) => x.role === 'build').length, keptUse: kept.filter((x) => x.role === 'use').length,
        setGates: Object.fromEntries(Object.entries(set.gates || {}).filter(([, v]) => v && v.pass === false).map(([k, v]) => [k, v.detail || v.error || true])) }
      say(`${label} "${lego.known}" → "${lego.target}": kept ${seedOut.legos[lego.idx].keptBuild} BUILD + ${seedOut.legos[lego.idx].keptUse} USE of ${items.length} (${A.served} / ${B.served})`)
    }
    baskets.seeds[p.seed] = seedOut
    fs.writeFileSync(basketsPath(course), JSON.stringify(baskets, null, 1) + '\n')
  }
  await pg.end()
}

// ── apply ─────────────────────────────────────────────────────────────────────────────────────────
// the course writes apostrophes straight ('n, I'm); a model's curly one would split ZUT and containment keys
const straight = (t) => String(t || '').replace(/[’‘]/g, "'")
function appendLedger(course, line) {
  const f = ledgerPath(course); fs.mkdirSync(path.dirname(f), { recursive: true })
  const fd = fs.openSync(f, 'a'); fs.writeSync(fd, JSON.stringify(line) + '\n'); fs.fsyncSync(fd); fs.closeSync(fd)
}
async function apply(course) {
  const plan = readJson(planPath(course)), baskets = readJson(basketsPath(course)), pg = await pgClient()
  const { estimateSyllables } = require(path.join(REPO, 'services/course-builder/lib/language-config.cjs'))
  const { makePhraseId, computeLegoPosition } = require(path.join(REPO, 'services/course-builder/lib/phrase-structure.cjs'))
  const report = []
  let identity = null, events = null
  for (const p of planned(plan)) {
    const b = baskets.seeds[p.seed]
    const tag = `S${p.seed}`
    if (!b) { report.push({ seed: p.seed, outcome: 'skip', why: 'no authored baskets' }); continue }
    const live = await loadSeed(pg, course, p.seed)
    const before = asBefore(live.legos)
    // drift: the LEGOs must read exactly as they did when the baskets were authored
    const snap = JSON.stringify(b.snapshot), now = JSON.stringify(live.legos.map((l) => ({ idx: l.lego_index, known: l.known_text, target: l.target_text })))
    if (snap !== now) { report.push({ seed: p.seed, outcome: 'skip', why: 'drift: the seed\'s LEGOs changed since the baskets were authored' }); continue }
    const problems = L.checkOp(live.seed, before, p, { estimateSyllables, courseCode: course })
    if (problems.length) { report.push({ seed: p.seed, outcome: 'skip', why: problems.join('; ') }); continue }
    const { rows: cursors } = await pg.query('SELECT learner_id, last_completed_lego_id, highest_completed_lego_id FROM course_enrollments WHERE course_id=$1', [course])
    const conflicts = L.cursorConflicts(p.seed, p, cursors)
    if (conflicts.length) { report.push({ seed: p.seed, outcome: 'skip', why: `${conflicts.length} learner(s) stand on a LEGO this op changes in place — it would credit them with a LEGO they never heard` }); continue }
    const work = L.workLegos(before, p)
    const empty = work.filter((l) => !(b.legos[l.idx]?.items || []).some((x) => x.keep))
    if (empty.length) { report.push({ seed: p.seed, outcome: 'skip', why: `no good phrase survived for ${empty.map((l) => `L${l.idx} "${l.known}"`).join(', ')} — a second signal to chunk differently; left unchanged for Tom` }); continue }
    const after = L.afterLegos(before, p)
    const changedIdx = new Set(after.filter((l) => l.change !== 'keep').map((l) => l.idx))
    const keepIds = new Set(work.flatMap((l) => b.legos[l.idx].items.filter((x) => x.keep && x.id).map((x) => x.id)))
    // rows to delete: every phrase of a deleted LEGO, every component row of a changed LEGO, every BUILD/USE
    // phrase of a changed or topped-up LEGO that was not kept (a top-up keeps only what both judges passed)
    const workIdx = new Set(work.map((l) => l.idx))
    const delPhrase = live.phrases.filter((r) => (p.delete || []).includes(r.lego_index)
      || (changedIdx.has(r.lego_index) && r.phrase_role === 'component')
      || (workIdx.has(r.lego_index) && ['build', 'use'].includes(r.phrase_role) && !keepIds.has(r.id)))
      .filter((r) => !keepIds.has(r.id))
    // kept rows that sit under a deleted LEGO move (re-homed with a fresh id); kept rows already under their LEGO stay
    const inserts = [], moves = []
    const issued = live.phrases.map((r) => r.id)
    for (const l of work) {
      const items = b.legos[l.idx].items.filter((x) => x.keep)
      const lpos = Math.max(0, ...live.phrases.filter((r) => r.lego_index === l.idx && !delPhrase.includes(r)).map((r) => r.position))
      let pos = lpos
      if (changedIdx.has(l.idx) && l.type === 'M') {
        const ids = L.allocateIds(course, p.seed, l.idx, 'component', l.components.length, issued); issued.push(...ids)
        l.components.forEach((c, i) => inserts.push({ id: ids[i], lego: l, role: 'component', known: c.known, target: c.target, position: ++pos, component_index: i }))
      }
      for (const it of items) {
        const r = it.id && live.phrases.find((x) => x.id === it.id)
        if (r && r.lego_index === l.idx) continue
        const [id] = L.allocateIds(course, p.seed, l.idx, it.role, 1, issued); issued.push(id)
        if (r) { moves.push({ from: r, id }); delPhrase.push(r) }
        inserts.push({ id, lego: l, role: it.role, known: straight(it.known), target: straight(it.target), position: ++pos, carried: r || null })
      }
    }
    const line = { seed: p.seed, at: new Date().toISOString(), job: JOB, op: p, before: live, after: after.map((l) => ({ idx: l.idx, known: l.known, target: l.target, change: l.change })), insertedIds: inserts.map((i) => i.id) }
    const summary = { seed: p.seed, kind: p.kind, deleteLegos: (p.delete || []).map((i) => L.legoId(p.seed, i)), changeLegos: Object.keys(p.set || {}).map((i) => L.legoId(p.seed, Number(i))), addLegos: (p.add || []).map((a) => L.legoId(p.seed, a.idx)), deletePhrases: delPhrase.length, insertPhrases: inserts.length, moved: moves.length }
    if (!APPLY) { report.push({ ...summary, outcome: 'would apply' }); continue }
    if (!identity) {
      const { serviceIdentity } = require(path.join(REPO, 'services/shared/editor-identity.cjs'))
      identity = serviceIdentity(SWEEP, { role: 'content-sweep' })
    }
    const { recordContentEdit } = require(path.join(REPO, 'services/shared/content-edit-log.cjs'))
    const ev = await recordContentEdit(supabase(), { identity, courseCode: course, surface: SURFACE, operation: 'lego-rechunk',
      scope: { seed_numbers: [p.seed], lego_ids: [...summary.deleteLegos, ...summary.changeLegos, ...summary.addLegos], rows: delPhrase.length + inserts.length },
      detail: { job: JOB, kind: p.kind, why: p.why, before: before.map((l) => `L${l.idx} ${l.known} → ${l.target}`), after: line.after.map((l) => `L${l.idx} ${l.known} → ${l.target}`) } })
    line.eventId = ev
    appendLedger(course, line)   // BEFORE the transaction: undo can always find the before-state
    try {
      await pg.query('BEGIN')
      await pg.query('SELECT 1 FROM course_legos WHERE course_code=$1 AND seed_number=$2 FOR UPDATE', [course, p.seed])
      for (const r of delPhrase) { const d = await pg.query('DELETE FROM course_practice_phrases WHERE id=$1 AND course_code=$2', [r.id, course]); if (d.rowCount !== 1) throw new Error(`${r.id}: delete ${d.rowCount}`) }
      for (const l of after.filter((x) => x.change === 'set')) {
        const old = live.legos.find((x) => x.lego_index === l.idx)
        const u = await pg.query(`UPDATE course_legos SET type=$1, known_text=$2, target_text=$3, components=$4, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL,
            target1_duration_ms=NULL, target2_duration_ms=NULL, presentation_audio_id=NULL, known_gloss_segments=NULL, target_text_roman=NULL, last_edit_event_id=$5, updated_at=now()
          WHERE id=$6 AND known_text IS NOT DISTINCT FROM $7 AND target_text=$8`, [l.type, l.known, l.target, l.components ? JSON.stringify(l.components) : null, ev, old.id, old.known_text, old.target_text])
        if (u.rowCount !== 1) throw new Error(`${old.lego_id}: update ${u.rowCount}`)
      }
      // the old intro speaks the old cut: untag it (the clip is kept — O11) so phase8's linker cannot re-point it
      // (ssi-lego-reorder-must-retag-intro-clips), and drop the introduction row that names it
      for (const l of after.filter((x) => x.change === 'set')) {
        const id = L.legoId(p.seed, l.idx)
        await pg.query("UPDATE course_audio SET lego_id=NULL WHERE course_code=$1 AND lego_id=$2 AND role='presentation'", [course, id])
        await pg.query('DELETE FROM lego_introductions WHERE course_code=$1 AND lego_id=$2', [course, id])
      }
      for (const i of p.delete || []) {
        const id = L.legoId(p.seed, i)
        await pg.query('DELETE FROM lego_introductions WHERE course_code=$1 AND lego_id=$2', [course, id])
        const d = await pg.query('DELETE FROM course_legos WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3', [course, p.seed, i]); if (d.rowCount !== 1) throw new Error(`${id}: delete ${d.rowCount}`)
      }
      for (const a of p.add || []) {
        await pg.query(`INSERT INTO course_legos (course_code, seed_number, lego_index, type, is_new, known_text, target_text, components, status, last_edit_event_id)
          VALUES ($1,$2,$3,$4,true,$5,$6,$7,'draft',$8)`, [course, p.seed, a.idx, a.type, a.known, a.target, a.components ? JSON.stringify(a.components) : null, ev])
      }
      for (const i of inserts) {
        const meta = i.role === 'component' ? { buildup: 'component', component_index: i.component_index } : { format: 'build_use', source: SWEEP, job: JOB }
        const c = i.carried
        await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce,
            known_audio_id, target1_audio_id, target2_audio_id, target1_duration_ms, target2_duration_ms, last_edit_event_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11,'{}',$12,$13,true,$14,$15,$16,$17,$18,$19)`,
          [i.id, course, p.seed, i.lego.idx, i.position, i.known, i.target, i.target.length, ((i.known || '').match(/\s+/g) || []).length + 1, JSON.stringify(meta), i.role,
            computeLegoPosition(i.target, i.lego.target), L.legoId(p.seed, i.lego.idx), c ? c.known_audio_id : null, c ? c.target1_audio_id : null, c ? c.target2_audio_id : null, c ? c.target1_duration_ms : null, c ? c.target2_duration_ms : null, ev])
      }
      if (p.seedTarget) {
        // the seed sentence changes with the cut; its target clips speak the old words, so they are unlinked (the clips are kept — O11) and re-rendered by the audio route
        const u = await pg.query('UPDATE course_seeds SET target_text=$1, target1_audio_id=NULL, target2_audio_id=NULL, target_text_roman=NULL WHERE course_code=$2 AND seed_number=$3 AND target_text=$4', [p.seedTarget, course, p.seed, live.seed.target_text])
        if (u.rowCount !== 1) throw new Error(`S${p.seed}: seed target update ${u.rowCount}`)
      }
      await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [ev, course, p.seed])
      await pg.query('COMMIT')   // the deferred DEBUT_WITHOUT_PRACTICE guard runs here
      report.push({ ...summary, outcome: 'applied', event: ev })
      say(`${tag}: applied (${p.kind})`)
    } catch (e) {
      await pg.query('ROLLBACK').catch(() => {})
      appendLedger(course, { seed: p.seed, at: new Date().toISOString(), action: 'rolled-back', why: e.message })
      report.push({ ...summary, outcome: 'ERROR', why: e.message }); say(`${tag}: ROLLED BACK — ${e.message}`)
    }
  }
  await finish(course, pg, report, 'rechunk')
  return report
}

async function finish(course, pg, report, what) {
  const wrote = report.filter((r) => ['applied', 'undone'].includes(r.outcome))
  if (APPLY && wrote.length) {
    const { refreshNow } = require(path.join(REPO, 'services/shared/round-index-refresh.cjs'))
    process.env.DATABASE_URL = process.env.DATABASE_URL || ENV.DATABASE_URL
    await refreshNow()
    const { bumpCourseVersion } = require(path.join(REPO, 'services/shared/course-version.cjs'))
    const v = await bumpCourseVersion(supabase(), course, 'patch')
    // A draft, hidden clone (clone.cjs) never queues audio: it is a preview of the text layer on the source's clips,
    // and anything it needs voiced is voiced when the change is rolled out to the real course.
    const { rows: [crs] } = await pg.query('SELECT status, visibility, new_app_status FROM courses WHERE course_code=$1', [course])
    if (crs && crs.status === 'draft' && crs.new_app_status === 'not_available') { say(`${course}: round index refreshed; content_version → ${v}; draft clone — no audio pass queued`); }
    else {
    const { queueAudioPass } = require(path.join(REPO, 'services/shared/audio-pass-queue.cjs'))
    const q = await queueAudioPass(supabase(), { courseCode: course, requestedBy: `@${SWEEP}`, append: true, metadataKey: 'rechunk_short_legos',
      reason: `job ${JOB} ${what}: ${wrote.length} seed(s) ${what === 'undo' ? 'restored' : 're-chunked'}; LEGOs, intros and phrases without audio need it (render waits for Tom's approval)`, metadata: { job: JOB, seeds: wrote.map((r) => r.seed) } })
    say(`${course}: round index refreshed; content_version → ${v}; audio pass ${q.queued ? 'queued' : q.touched ? 'joined' : 'NOT queued: ' + (q.error || q.reason)}`)
    }
  }
  await pg.end()
  fs.mkdirSync(EVIDENCE, { recursive: true })
  const f = path.join(EVIDENCE, `${course}.${what}.${APPLY ? 'applied' : 'dryrun'}.${Date.now()}.json`)
  fs.writeFileSync(f, JSON.stringify(report, null, 1)); say(`report → ${f}`)
  for (const r of report) say(`S${r.seed}: ${r.outcome}${r.why ? ' — ' + r.why : ''}${r.deletePhrases != null ? ` (−${r.deletePhrases} / +${r.insertPhrases} rows)` : ''}`)
}

// ── undo ──────────────────────────────────────────────────────────────────────────────────────────
// Restores each seed to the ledger's before-snapshot: its LEGOs, every phrase row, introduction rows,
// presentation tags and approval — in one transaction per seed. Refuses if the seed no longer reads as the
// rechunk left it (someone edited it since): never overwrites newer work.
const LEGO_COLS_SKIP = new Set(['lego_id'])   // generated
async function undo(course) {
  const lines = fs.readFileSync(ledgerPath(course), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const pg = await pgClient(), report = []
  const latest = new Map()
  for (const l of lines) { if (l.action === 'rolled-back') continue; if (l.action === 'undone') latest.delete(l.seed); else if (l.before) latest.set(l.seed, l) }
  for (const [seed, l] of latest) {
    if (SEEDS && !SEEDS.has(seed)) continue
    const live = await loadSeed(pg, course, seed)
    const nowShape = JSON.stringify(live.legos.map((x) => ({ idx: x.lego_index, known: x.known_text, target: x.target_text })))
    const leftShape = JSON.stringify(l.after.map((x) => ({ idx: x.idx, known: x.known, target: x.target })))
    if (nowShape !== leftShape) { report.push({ seed, outcome: 'skip', why: 'the seed has changed since the re-chunk; not overwriting newer work' }); continue }
    if (!APPLY) { report.push({ seed, outcome: 'would undo' }); continue }
    try {
      await pg.query('BEGIN')
      await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2', [course, seed])
      await pg.query('DELETE FROM lego_introductions WHERE course_code=$1 AND lego_id = ANY($2)', [course, live.legos.map((x) => x.lego_id)])
      await pg.query('DELETE FROM course_legos WHERE course_code=$1 AND seed_number=$2', [course, seed])
      // json/jsonb values go back as JSON text (an array there is JSON, not a Postgres array); everything else as read
      const { rows: jcols } = await pg.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND table_name = ANY($1) AND data_type IN ('json','jsonb')", [['course_legos', 'course_practice_phrases', 'lego_introductions']])
      const isJson = (t, k) => jcols.some((j) => j.table_name === t && j.column_name === k)
      const ins = async (table, row, skip = new Set()) => {
        const cols = Object.keys(row).filter((k) => !skip.has(k))
        await pg.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map((_, i) => '$' + (i + 1)).join(',')})`, cols.map((k) => L.sqlValue(isJson(table, k), row[k])))
      }
      for (const r of l.before.legos) await ins('course_legos', r, LEGO_COLS_SKIP)
      for (const r of l.before.phrases) await ins('course_practice_phrases', r)
      for (const r of l.before.intros) await ins('lego_introductions', r)
      for (const t of l.before.audioTags) await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2', [t.lego_id, t.id])
      await pg.query('UPDATE course_seeds SET approved_at=$1, target_text=$4, target1_audio_id=$5, target2_audio_id=$6, target_text_roman=$7 WHERE course_code=$2 AND seed_number=$3', [l.before.seed.approved_at, course, seed, l.before.seed.target_text, l.before.seed.target1_audio_id, l.before.seed.target2_audio_id, l.before.seed.target_text_roman])
      await pg.query('COMMIT')
      appendLedger(course, { seed, at: new Date().toISOString(), action: 'undone' })
      report.push({ seed, outcome: 'undone' })
    } catch (e) { await pg.query('ROLLBACK').catch(() => {}); report.push({ seed, outcome: 'ERROR', why: e.message }) }
  }
  await finish(course, pg, report, 'undo')
}

if (require.main === module) {
  const fn = { check, author, apply, undo }[CMD]
  if (!fn || !COURSE) { console.error('usage: rechunk.cjs check|author|apply|undo <course> [--seeds a,b] [--apply]'); process.exit(2) }
  if (/cym/.test(COURSE)) { console.error('Welsh is out of scope (Tom): never re-chunk a cym course.'); process.exit(2) }
  fn(COURSE).then(() => { if (!process.exitCode) process.exitCode = 0 }).catch((e) => { console.error(e.stack || e.message); process.exit(1) })
}
module.exports = { authorPrompt, judgePrompt }
