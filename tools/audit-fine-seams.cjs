#!/usr/bin/env node
/**
 * audit-fine-seams.cjs — surgical quality pass over existing atom_map_fine:
 * apply the INDEPENDENT-MEANING seam test (each side of every seam must itself
 * be a complete communicative unit) and MERGE the violations. Merge-only by
 * design — patch-repair over regeneration: no re-splits, no gloss churn on
 * untouched units, tiling can't break because merged surfaces are rebuilt from
 * the original text. This is the mechanical REJECT gate for the segmentation
 * rule authored in `tools/breakdown-fine.cjs` — run it right after that
 * script (or against any existing course) to catch/repair fragments it or an
 * earlier authoring pass let through.
 *
 * The rule this enforces (Tom + Aran, 2026-07-14, generalising the earlier
 * 2026-07-04 "hrvatski" case): a fragment that only makes sense glued to its
 * neighbour must merge — a bare word stranded after the phrase it completes
 * ("početi govoriti | hrvatski") is exactly this failure ("hrvatski" leans
 * back onto its verb phrase; "početi govoriti hrvatski" is ONE unit), but so
 * is any split of a single independent clause into its beats ("what are you
 * thinking" | "of doing today?" must merge into one phrase). Canonical
 * statement: `docs/pods/pod-ladder-proposal.md` §9. Conservative contract in
 * the prompt: when unsure, KEEP the seam.
 *
 * Merged units get a CLI-authored natural gloss and null ms spans (re-slice
 * fills them). Turns the audit changes are printed as a list for the re-run
 * pipeline (windows → Take G → knowns → slice).
 *
 *   node tools/audit-fine-seams.cjs <course> [orders] [--dry] [--pod=pod-N]
 *   node tools/audit-fine-seams.cjs zho_for_eng             # whole pod-0 (default)
 *   node tools/audit-fine-seams.cjs zho_for_eng --pod=pod-1
 *
 * claude CLI only, no TTS, no cost gate.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const { execFile } = require('child_process')

const COURSE = process.argv[2]
const ORDERS = (process.argv[3] || '').split(',').map(Number).filter(Boolean)
const dry = process.argv.includes('--dry')
const MODEL = process.env.BD_MODEL || 'opus'
const POD = require('./lib/pod-arg.cjs').parsePod(process.argv)
if (!COURSE) { console.error('usage: audit-fine-seams.cjs <course> [orders] [--dry] [--pod=pod-N]'); process.exit(1) }
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const KNOWN_NAMES = { eng: 'English', jpn: 'Japanese', zho: 'Chinese', spa: 'Spanish', fra: 'French', deu: 'German', ita: 'Italian', por: 'Portuguese', ara: 'Arabic', gle: 'Irish', cym: 'Welsh', rus: 'Russian', nld: 'Dutch', kor: 'Korean', hin: 'Hindi' }
const KNOWN = KNOWN_NAMES[(COURSE.split('_for_')[1] || 'eng').split('_')[0]] || 'the learner\'s language'
const alnum = (s) => (s || '').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, '')
const bare = (s) => (s || '').toLowerCase().replace(/[.,!?;:¿¡"'’，。？！、]/g, '').replace(/\s+/g, ' ').trim()
const slug = (s) => bare(s).replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').slice(0, 64)
const cleanSurface = (s) => String(s || '').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim()
const SENTENCE_PUNCT = /[.!?…。！？؟]/

function claude(prompt) {
  return new Promise((res, rej) => {
    const e = { ...process.env }; delete e.CLAUDECODE
    execFile(process.env.HOME + '/.local/bin/claude', ['--print', '--model', MODEL, prompt], { env: e, maxBuffer: 1 << 22 },
      (err, o) => err ? rej(err) : res(o.trim()))
  })
}

function atomGroups(targetText, atoms) {
  const text = targetText || ''
  const lower = text.toLowerCase()
  const groups = [[]]
  let cursor = 0
  for (let i = 0; i < atoms.length; i++) {
    const idx = lower.indexOf(atoms[i].u.target_surface.toLowerCase(), cursor)
    if (i > 0 && idx !== -1 && SENTENCE_PUNCT.test(text.slice(cursor, idx))) groups.push([])
    groups[groups.length - 1].push(atoms[i])
    if (idx !== -1) cursor = idx + atoms[i].u.target_surface.length
  }
  return groups.filter((g) => g.length)
}

// exact character span of each unit in the turn text (for surface rebuild)
function markUnits(turnText, units) {
  const lower = turnText.toLowerCase()
  const marks = []
  let cursor = 0
  for (const u of units) {
    const idx = lower.indexOf(u.target_surface.toLowerCase(), cursor)
    if (idx === -1) return null
    marks.push({ start: idx, end: idx + u.target_surface.length })
    cursor = idx + u.target_surface.length
  }
  return marks
}

const RULES = `You audit the seams of ONE dialogue turn's fine unit breakdown for a listening exercise. Units are meant to be INDEPENDENT MEANING units: each one a complete communicative unit a learner could hear alone and understand, never a fragment that only makes sense glued to its neighbour.
THE RULE — seams look BOTH ways: EACH side of every seam must itself stand alone as a complete thought. Two failure shapes to hunt for:
  (1) a bare word or short tag stranded after the phrase it completes — "početi govoriti | hrvatski" is WRONG ("hrvatski" leans back onto its verb phrase; "početi govoriti hrvatski" is ONE unit);
  (2) a single independent clause chopped into its beats even though every piece is a real word-group — "what are you thinking | of doing today?" is WRONG (neither half is a complete thought alone; "what are you thinking of doing today?" is ONE unit). The old "does this sound like a natural pause" test is NOT enough — the test now is "could this side stand alone, with no other context, as a thing a learner could say or hear and understand?" If either side needs its neighbour to make sense, MERGE across that seam.
The only seams that legitimately survive mid-sentence are between two INDEPENDENT clauses joined by a coordinator ("and"/"but"/"so") where each clause would stand alone as a complete statement, or a turn-initial interjection/vocative that is itself complete ("Right," / "Morning!") ahead of the clause that follows.
You may ONLY merge consecutive units within the same sentence — never re-split, never reorder, never cross sentence punctuation.
BE CONSERVATIVE: when unsure whether a side is genuinely independent, KEEP the seam — but a fragment that plainly cannot stand alone must be merged even if it looks like a normal-sized chunk.
For every merge, give the merged unit's natural translation in ${KNOWN} — the learner's own language (reuse the original units' wording where it stays natural).
Return ONLY JSON: {"merges":[{"s":<sentence#>,"from":<first unit#>,"to":<last unit#>,"gloss":"..."}]} — unit numbers are the [n] indices shown, per sentence; empty list if all seams pass.`

;(async () => {
  let q = supabase.from('listening_pod_sentences')
    .select('id, global_order, target_text, known_text, atom_map_fine')
    .eq('pod_id', `${COURSE}:${POD}`).order('global_order')
  if (ORDERS.length) q = q.in('global_order', ORDERS)
  const { data: sents, error } = await q
  if (error) { console.error(error.message); process.exit(1) }

  let clean = 0, changed = 0, failed = 0
  const changedOrders = []

  async function processTurn(s) {
    // carry original map indices so notes and order survive the rebuild
    const idxUnits = (s.atom_map_fine || []).map((u, mi) => ({ u, mi })).filter((x) => x.u.kind !== 'note')
    if (idxUnits.length < 2) { clean++; return }
    const groups = atomGroups(s.target_text, idxUnits) // RAW sentences — merges never cross punctuation

    const sentBlock = groups.map((g, gi) =>
      `sentence ${gi}: ${g.map((x) => x.u.target_surface).join(' ')}\n  units: ${g.map((x, ui) => `[${ui}] ${x.u.target_surface} = ${x.u.gloss ?? '(name)'}`).join('  ')}`
    ).join('\n')
    const prompt = `${RULES}\n\nTURN (${COURSE}):\ntarget: ${s.target_text}\nEnglish: ${s.known_text}\n\n${sentBlock}\n\nJSON only:`

    let plan
    try {
      const o = await claude(prompt)
      plan = JSON.parse(o.slice(o.indexOf('{'), o.lastIndexOf('}') + 1))
    } catch (e) { console.log(`S${s.global_order}: PARSE FAIL`); failed++; return }

    const merges = (plan.merges || []).filter((m) =>
      typeof m.s === 'number' && typeof m.from === 'number' && typeof m.to === 'number' &&
      m.to > m.from && groups[m.s] && groups[m.s][m.from] && groups[m.s][m.to] &&
      typeof m.gloss === 'string' && m.gloss.trim(),
    )
    if (!merges.length) { clean++; return }

    // apply merges: rebuild the flat unit list group by group
    const marks = markUnits(s.target_text, idxUnits.map((x) => x.u))
    if (!marks) { console.log(`S${s.global_order}: ✗ units don't walk the text — skipped`); failed++; return }
    const mergeByGroup = new Map()
    for (const m of merges) {
      if (!mergeByGroup.has(m.s)) mergeByGroup.set(m.s, [])
      mergeByGroup.get(m.s).push(m)
    }
    // overlapping merges within a group are refused (keep it simple + safe)
    for (const [gi, ms] of mergeByGroup) {
      ms.sort((a, b) => a.from - b.from)
      for (let i = 1; i < ms.length; i++) if (ms[i].from <= ms[i - 1].to) { console.log(`S${s.global_order}: ✗ overlapping merges — skipped`); failed++; return }
    }

    const newFlat = []
    let flatBase = 0
    groups.forEach((g, gi) => {
      const ms = mergeByGroup.get(gi) || []
      let ui = 0
      while (ui < g.length) {
        const m = ms.find((x) => x.from === ui)
        if (m) {
          const first = g[m.from], last = g[m.to]
          const flatFirst = flatBase + m.from, flatLast = flatBase + m.to
          // surface = the ORIGINAL text between the two units, so interior
          // punctuation ("jako dugo, i još") survives and tiling stays exact
          const surface = cleanSurface(s.target_text.slice(marks[flatFirst].start, marks[flatLast].end))
          newFlat.push({
            kind: g.slice(m.from, m.to + 1).every((x) => x.u.kind === 'passthrough') ? 'passthrough' : 'atom',
            gloss: m.gloss.trim(),
            lego_key: `s${s.global_order}-${slug(surface)}`,
            target_surface: surface,
            target_start_ms: null,
            target_end_ms: null,
          })
          ui = m.to + 1
        } else {
          newFlat.push({ ...g[ui].u })
          ui++
        }
      }
      flatBase += g.length
    })

    // tiling gate: merged surfaces must still reconstruct the turn exactly
    const before = idxUnits.map((x) => alnum(x.u.target_surface)).join('')
    const after = newFlat.map((u) => alnum(u.target_surface)).join('')
    if (before !== after) { console.log(`S${s.global_order}: ✗ TILING BREAK after merge — skipped`); failed++; return }

    for (const m of merges) {
      const g = groups[m.s]
      console.log(`S${s.global_order} s${m.s}: MERGE [${g.slice(m.from, m.to + 1).map((x) => x.u.target_surface).join(' | ')}] → "${m.gloss.trim()}"`)
    }
    if (!dry) {
      const { error: werr } = await supabase.from('listening_pod_sentences').update({ atom_map_fine: newFlat }).eq('id', s.id)
      if (werr) { console.log(`S${s.global_order}: WRITE FAIL ${werr.message}`); failed++; return }
    }
    changed++; changedOrders.push(s.global_order)
  }

  const CONC = Number(process.env.BD_CONC || 20)
  let next = 0
  const worker = async () => { while (next < (sents || []).length) await processTurn(sents[next++]) }
  await Promise.all(Array.from({ length: Math.min(CONC, (sents || []).length) }, worker))
  console.log(`\n${dry ? '[DRY] ' : ''}${COURSE}: ${clean} clean, ${changed} turns merged, ${failed} failed.`)
  if (changedOrders.length) console.log(`re-run pipeline for: ${changedOrders.sort((a, b) => a - b).join(',')}`)
  process.exit(failed ? 2 : 0)
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
