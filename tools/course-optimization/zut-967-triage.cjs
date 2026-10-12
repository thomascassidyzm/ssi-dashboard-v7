// Ramp #967 stream 2b — LLM-read triage of component-membership failures that the
// deterministic buckets could not explain (ops/967-zut-sweep/llm-queue.jsonl).
//
// One process, parallel `claude --print` calls (never the SDK), checkpointed: each batch's
// verdicts land in ops/967-zut-sweep/verdicts/batch-NNNN.json and a re-run skips batches
// already on disk. The verdict is a READING, never a write — the apply script re-proves every
// (b)/(c) mechanically against the live row before touching anything.
//
//   node tools/course-optimization/zut-967-triage.cjs [--concurrency 4] [--batch-size 20] [--model sonnet]
const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawn } = require('child_process')
// Bill the account this job was dispatched on (its CLAUDE_CONFIG_DIR), via the repo's helper,
// which strips ANTHROPIC_API_KEY/CLAUDECODE and injects the stored OAuth token.
if (process.env.CLAUDE_CONFIG_DIR && !process.env.SSI_CLAUDE_CONFIG_DIR) process.env.SSI_CLAUDE_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR
const { claudeEnv } = require('../../services/shared/claude-config.cjs')
const CLAUDE = process.env.CLAUDE_CLI || path.join(os.homedir(), '.local/bin/claude')

const DIR = path.join(__dirname, '../../ops/967-zut-sweep')
const OUT = path.join(DIR, 'verdicts')
const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const CONCURRENCY = +opt('--concurrency', 4)
const BATCH = +opt('--batch-size', 20)
const MODEL = opt('--model', 'sonnet')
const ONLY = opt('--only', null) // run a single batch number (calibration)

const RUBRIC = `You are triaging rows of a language course for the SaySomethingin method. Each item is a
COMPONENT row: a literal tiling gloss of part of an M-LEGO (multi-word chunk). Tom's ruling
(2026-07-04): component rows are exempt from known-side ZUT, but their TARGET text MUST be part
of their own seed's target sentence. Every item below FAILED that check: its target is not a
contiguous substring of the seed's target sentence (after lowercasing/punctuation stripping).
"known" = the learner's language, "target" = the language being learnt. Read each item against
its seed sentence (both languages), its LEGOs, and its sibling rows. Classify into EXACTLY one:

(c) CUT — ONLY if BOTH are provable from the evidence, not a judgement call:
    1. the row is NOT about its own sentence: its known AND target have no counterpart anywhere in
       the seed sentence or in its own LEGO (it belongs to some other sentence — a stray/orphan
       written under the wrong seed, a wrong-slot substitution, swapped halves);
    2. nothing learner-facing is lost: the seed's real chunk at that position is still taught by a
       LEGO or a sibling row (name its id in "sibling").
(b) FIX — exactly ONE correct target value is forced by the seed's own target text (elision,
    contraction, agreement/mood typo) AND that value is a contiguous substring of the seed target
    AND it still glosses the same known. Give it in "fixed_target" copied verbatim from the seed.
(a) MECHANICAL — a stale exact duplicate of a sibling component at the same LEGO that IS correct.
(d) JUDGEMENT / NOT A DEFECT — everything else, including:
    d-backgloss: literal gloss of a word the target sentence does not render (pro-drop "I"->"io",
      particle "that", dictionary/lemma form, a word the translation dropped) — the row IS about
      its sentence; whether such rows should exist is Tom's policy call.
    d-inflection: lemma or other inflected form of a word that IS in the sentence.
    d-discontiguous: words present but interposed, reordered, clitic-fused, or elided.
    d-lego-paraphrase: the row matches its own LEGO, but the LEGO itself differs from the seed
      sentence (the LEGO, not the row, disagrees with the seed) — escalate.
    d-seed-outlier: the seed sentence itself looks like the odd one out vs its LEGOs/siblings.
    d-other: anything else.
If you are uncertain between (c) and (d), the answer is (d). Cutting is rare and must be proven.

Reply with ONLY a JSON array, one object per item, in input order:
[{"id":"...","verdict":"a|b|c|d","class":"c-orphan|c-wrong-slot|b-fix|a-dup|d-backgloss|d-inflection|d-discontiguous|d-lego-paraphrase|d-seed-outlier|d-other","sibling":"<id or null>","fixed_target":"<or null>","why":"<one short sentence citing the seed text>"}]

ITEMS:
`

function compact(x) {
  return {
    id: x.id, seed_known: x.seed_known, seed_target: x.seed_target,
    row: { known: x.known, target: x.target, lego_index: x.lego_index },
    legos: x.legos.map(l => `L${l.li} ${l.id}: ${l.known} => ${l.target}`),
    same_lego_components: x.same_lego_components.map(l => `${l.id}: ${l.known} => ${l.target}`),
    other_components_in_seed: x.other_components_in_seed.map(l => `${l.id}: ${l.known} => ${l.target}`),
    same_lego_practice_sample: x.same_lego_practice.slice(0, 4).map(l => `${l.role}: ${l.known} => ${l.target}`),
  }
}

function runBatch(n, items) {
  const outFile = path.join(OUT, `batch-${String(n).padStart(4, '0')}.json`)
  if (fs.existsSync(outFile)) return Promise.resolve('skip')
  const prompt = RUBRIC + JSON.stringify(items.map(compact), null, 1)
  return new Promise(resolve => {
    const env = claudeEnv(process.env)
    for (const k of Object.keys(env)) if (/^CLAUDE_CODE_(MESSAGING|SESSION|CHILD)/.test(k)) delete env[k]
    const p = spawn(CLAUDE, ['--print', '--model', MODEL], { env, stdio: ['pipe', 'pipe', 'pipe'] })
    let out = '', err = ''
    p.stdout.on('data', d => out += d); p.stderr.on('data', d => err += d)
    p.on('close', code => {
      const m = out.match(/\[[\s\S]*\]/)
      let parsed = null
      try { parsed = m && JSON.parse(m[0]) } catch {}
      const ids = items.map(i => i.id)
      if (!parsed || parsed.length !== items.length || parsed.some((v, i) => v.id !== ids[i])) {
        fs.appendFileSync(path.join(DIR, 'triage-errors.log'), `batch ${n} code=${code} bad output: ${out.slice(0, 300)} ${err.slice(0, 300)}\n`)
        return resolve('fail')
      }
      fs.writeFileSync(outFile, JSON.stringify({ batch: n, model: MODEL, verdicts: parsed }, null, 1))
      resolve('ok')
    })
    p.stdin.end(prompt)
  })
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const rows = fs.readFileSync(path.join(DIR, 'llm-queue.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
  const batches = []
  for (let i = 0; i < rows.length; i += BATCH) batches.push(rows.slice(i, i + BATCH))
  if (ONLY != null) { console.log(await runBatch(+ONLY, batches[+ONLY])); return }
  console.log(`${rows.length} rows, ${batches.length} batches, concurrency ${CONCURRENCY}, model ${MODEL}`)
  for (let pass = 1; pass <= 3; pass++) {
    let next = 0; const tally = { ok: 0, skip: 0, fail: 0 }
    await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
      while (next < batches.length) { const n = next++; const r = await runBatch(n, batches[n]); tally[r]++; if (r !== 'skip') console.log(`pass ${pass} batch ${n}: ${r}`) }
    }))
    console.log(`pass ${pass}:`, tally)
    if (!tally.fail) break
  }
}

main().catch(e => { console.error('FATAL', e); process.exit(1) })
