#!/usr/bin/env node
/**
 * author-window-knowns.cjs — author the known-language (English) translation
 * for every fusion WINDOW of a pod course, into
 * listening_pod_sentences.window_known_map (sibling of atom_map_fine).
 *
 * A window = a contiguous span of fine units within one sentence — the chunks
 * the unified ladder plays at every fusion rung strictly between single units
 * (whose known = their gloss) and the whole sentence (whose known = the real
 * sentence translation take). Authoring covers ALL contiguous spans, which is
 * exactly the chained-overlap window set and a superset of the pairwise set —
 * so both fusion modes are covered and the pairwise/chained ear-fork stays
 * open. TTS later dedupes on text; this step is text-only (claude CLI, no
 * cost gate).
 *
 * Default per window = its gloss-concat where that already reads naturally;
 * the LLM rewrites only where fusion goes unnatural near sentence size.
 *
 *   node tools/author-window-knowns.cjs <course> [orders] [--dry]
 *   node tools/author-window-knowns.cjs hrv_for_eng            # whole pod-0
 *   node tools/author-window-knowns.cjs hrv_for_eng 131 --dry  # preview one
 *
 * Same skeleton as breakdown-fine.cjs (claude CLI, verification, worker pool).
 * Idempotent: re-running overwrites the draft map. Re-run after seam edits —
 * spans are indices into atom_map_fine, so a changed map invalidates the rows
 * it touches (stale spans simply stop matching and are re-authored).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const { execFile } = require('child_process')

const COURSE = process.argv[2]
const ORDERS = (process.argv[3] || '').split(',').map(Number).filter(Boolean)
const dry = process.argv.includes('--dry')
const MODEL = process.env.BD_MODEL || 'opus'
if (!COURSE) { console.error('usage: author-window-knowns.cjs <course> [orders] [--dry]'); process.exit(1) }
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

function claude(prompt) {
  return new Promise((res, rej) => {
    const e = { ...process.env }; delete e.CLAUDECODE
    execFile(process.env.HOME + '/.local/bin/claude', ['--print', '--model', MODEL, prompt], { env: e, maxBuffer: 1 << 22 },
      (err, o) => err ? rej(err) : res(o.trim()))
  })
}

// ---- mirror PodLab.vue exactly: sentence grouping + glue + window spans ----
const SENTENCE_PUNCT = /[.!?…。！？]/

function atomGroups(targetText, atoms) {
  const text = targetText || ''
  const lower = text.toLowerCase()
  const groups = [[]]
  let cursor = 0
  for (let i = 0; i < atoms.length; i++) {
    const idx = lower.indexOf(atoms[i].target_surface.toLowerCase(), cursor)
    if (i > 0 && idx !== -1 && SENTENCE_PUNCT.test(text.slice(cursor, idx))) groups.push([])
    groups[groups.length - 1].push(atoms[i])
    if (idx !== -1) cursor = idx + atoms[i].target_surface.length
  }
  return groups.filter((g) => g.length)
}

// leading one-unit exclamation ("Ciao!") glues onto the sentence that follows
function glueGroups(rawGroups) {
  const groups = []
  let carry = []
  rawGroups.forEach((g, i) => {
    // Only TURN-INITIAL one-unit groups (leading "Ciao!" interjections) glue
    // forward; a mid-turn one-unit group is a real sentence ("Impresioniran
    // sam.") and must stand alone — gluing it swallowed its known take.
    if (groups.length === 0 && g.length === 1 && i < rawGroups.length - 1) { carry.push(...g); return }
    groups.push([...carry, ...g])
    carry = []
  })
  if (carry.length) groups.push(carry)
  return groups
}

// every contiguous span of length 2..n-1 within an n-unit sentence
function windowSpans(n) {
  const spans = []
  for (let len = 2; len < n; len++)
    for (let start = 0; start + len <= n; start++) spans.push({ start, end: start + len - 1 })
  return spans
}

const RULES = `You author the ENGLISH heard alongside fused chunks of ONE dialogue turn in a listening exercise.
The learner has already heard each fine unit with its per-unit translation. Now units FUSE into windows (every contiguous run of units), and each window needs the English a translator-coach would say for exactly that stretch of speech — no more, no less.
THE DEFAULT: the units' translations, joined in order, ARE the window's English — KEEP the join whenever it reads as natural spoken English. This continuity is the point: the learner should hear the small translations audibly fusing into bigger ones.
REWRITE ONLY where the plain join goes wrong in English: connective tissue surfaces twice, agreement breaks, word order turns foreign, or the join reads as a word-list rather than a phrase. When you rewrite: minimal edit, reuse the units' own wording as far as possible, keep the meaning of exactly this span (never import meaning from outside the window, never complete the sentence for the learner), and keep any function-labels like [topic] as they are.
A window is a FRAGMENT of a sentence and may stay a fragment in English ("but I can't" / "that we saw yesterday") — never round it up to a full sentence.
Return ONLY JSON: {"windows":[{"s":<sentence#>,"start":<n>,"end":<n>,"known":"..."}]} — one entry for EVERY window listed, same s/start/end, in any order.`

;(async () => {
  let q = supabase.from('listening_pod_sentences')
    .select('id, global_order, target_text, known_text, atom_map_fine')
    .eq('pod_id', `${COURSE}:pod-0`).order('global_order')
  if (ORDERS.length) q = q.in('global_order', ORDERS)
  const { data: sents, error } = await q
  if (error) { console.error(error.message); process.exit(1) }

  let ok = 0, skipped = 0, failed = 0, windowsTotal = 0

  async function processTurn(s) {
    const atoms = (s.atom_map_fine || []).filter((a) => a.kind !== 'note')
    if (!atoms.length) { skipped++; return }
    const groups = glueGroups(atomGroups(s.target_text, atoms))
    // flat index of each group's first unit, to store spans in flat unit indices
    const offsets = []
    let off = 0
    for (const g of groups) { offsets.push(off); off += g.length }

    const wanted = [] // {gi, start, end} local to group
    groups.forEach((g, gi) => { for (const sp of windowSpans(g.length)) wanted.push({ gi, ...sp }) })
    if (!wanted.length) {
      if (!dry) await supabase.from('listening_pod_sentences').update({ window_known_map: [] }).eq('id', s.id)
      skipped++; return
    }

    const sentBlock = groups.map((g, gi) =>
      `sentence ${gi}: ${g.map((a) => a.target_surface).join(' ')}\n  units: ${g.map((a, ui) => `[${ui}] ${a.target_surface} = ${a.gloss ?? '(name, silent)'}`).join('  ')}`
    ).join('\n')
    const winBlock = wanted.map((w) => {
      const g = groups[w.gi]
      const join = g.slice(w.start, w.end + 1).map((a) => a.gloss).filter(Boolean).join(' ')
      return `s=${w.gi} start=${w.start} end=${w.end}  target: "${g.slice(w.start, w.end + 1).map((a) => a.target_surface).join(' ')}"  join: "${join}"`
    }).join('\n')
    const prompt = `${RULES}\n\nTURN (${COURSE}):\ntarget: ${s.target_text}\nEnglish (whole turn): ${s.known_text}\n\n${sentBlock}\n\nWINDOWS (every one needs a "known"):\n${winBlock}\n\nJSON only:`

    let plan
    try {
      const o = await claude(prompt)
      plan = JSON.parse(o.slice(o.indexOf('{'), o.lastIndexOf('}') + 1))
    } catch (e) { console.log(`S${s.global_order}: PARSE FAIL`); failed++; return }

    const got = new Map()
    for (const w of plan.windows || []) {
      if (typeof w.s !== 'number' || typeof w.start !== 'number' || typeof w.end !== 'number') continue
      if (typeof w.known !== 'string' || !w.known.trim()) continue
      got.set(`${w.s}:${w.start}:${w.end}`, w.known.trim())
    }
    const missing = wanted.filter((w) => !got.has(`${w.gi}:${w.start}:${w.end}`))
    if (missing.length) {
      console.log(`S${s.global_order}: ✗ ${missing.length}/${wanted.length} windows missing — skipped`)
      failed++; return
    }
    // store with FLAT unit indices (into atom_map_fine sans notes) + group index
    const map = wanted.map((w) => ({
      g: w.gi,
      start: offsets[w.gi] + w.start,
      end: offsets[w.gi] + w.end,
      known: got.get(`${w.gi}:${w.start}:${w.end}`),
    }))
    if (!dry) {
      const { error: werr } = await supabase.from('listening_pod_sentences').update({ window_known_map: map }).eq('id', s.id)
      if (werr) { console.log(`S${s.global_order}: WRITE FAIL ${werr.message}`); failed++; return }
    }
    const rewrites = map.filter((m, i) => {
      const w = wanted[i]; const g = groups[w.gi]
      return m.known !== g.slice(w.start, w.end + 1).map((a) => a.gloss).filter(Boolean).join(' ')
    }).length
    if (dry) map.forEach((m, i) => {
      const w = wanted[i]; const g = groups[w.gi]
      const join = g.slice(w.start, w.end + 1).map((a) => a.gloss).filter(Boolean).join(' ')
      const tgt = g.slice(w.start, w.end + 1).map((a) => a.target_surface).join(' ')
      console.log(`    s${m.g} [${m.start}-${m.end}] "${tgt}" → "${m.known}"${m.known === join ? '' : `   (join was: "${join}")`}`)
    })
    console.log(`S${s.global_order}: ✓ ${map.length} windows (${rewrites} rewritten)`)
    ok++; windowsTotal += map.length
  }

  const CONC = Number(process.env.BD_CONC || 20)
  let next = 0
  const worker = async () => { while (next < sents.length) await processTurn(sents[next++]) }
  await Promise.all(Array.from({ length: Math.min(CONC, sents.length) }, worker))
  console.log(`\n${dry ? '[DRY] ' : ''}${COURSE}: ${ok} turns authored (${windowsTotal} windows) → window_known_map, ${skipped} no-window turns, ${failed} failed.`)
  process.exit(failed ? 2 : 0)
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
