/**
 * THE GUARD, TRIED BY BREAKING IT (Kai's ruling 2026-09-21, job #506).
 *
 * Each case is a way a human-authored presentation line could be lost or
 * silently skipped, and asserts that it is not — with the guard reverted
 * (module gone, or its calls in phase8 gone) every one of these fails.
 *
 *   1. a course-wide regeneration over a marked line, LEGO UNCHANGED:
 *      the words used are the human's, not the template's, and the outcome
 *      says so in plain English;
 *   2. the same with the LEGO CHANGED: an agent judges, applies a reword,
 *      records why, rewords the pending row, queues an audio pass — no gate;
 *   3. a concept-level break: escalated once to course_qa_flags with the old
 *      and new LEGO, the sentence in full and a recommendation; the words are
 *      left alone; a second run does not raise a second flag;
 *   4. row replacement (job #497's shape — every course_audio row for the
 *      LEGO gone; and edit-cascade's delete-and-reinsert of the LEGO rows):
 *      the mark survives and the words come back from it, never the judge;
 *   5. the staleness check meets a marked pending row that does NOT quote
 *      its LEGO (seed 92's shape): it is fresh; a template row under the
 *      same LEGO is stale;
 *   6. the judge failing or answering nonsense escalates rather than guesses.
 *
 * The Supabase client is an in-memory fake: no live DB, no CLI, no TTS.
 * Run: npx vitest run services/shared/human-authored-presentations
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ha = require('./human-authored-presentations.cjs')

// ─── A small in-memory Supabase ───────────────────────────────────────────
function fakeSupabase(seed = {}) {
  const tables = {}
  for (const [t, rows] of Object.entries(seed)) tables[t] = rows.map(r => ({ ...r }))
  const tbl = (t) => (tables[t] = tables[t] || [])
  let nextId = 1
  const genId = () => `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`

  function builder(table) {
    const st = { op: 'select', filters: [], payload: null, single: null }
    const matches = (row) => st.filters.every(f => f.kind === 'eq' ? row[f.col] === f.val : f.val.includes(row[f.col]))
    const run = () => {
      let rows = tbl(table)
      let out
      if (st.op === 'select') out = rows.filter(matches)
      else if (st.op === 'insert') {
        out = st.payload.map(r => { const row = { id: genId(), ...r }; rows.push(row); return row })
      } else if (st.op === 'update') {
        out = rows.filter(matches).map(r => Object.assign(r, st.payload))
      } else if (st.op === 'delete') {
        const del = rows.filter(matches); tables[table] = rows.filter(r => !matches(r)); out = del
      }
      out = out.map(r => ({ ...r }))
      if (st.single === 'maybe') return { data: out[0] || null, error: null }
      if (st.single === 'one') return out.length === 1 ? { data: out[0], error: null } : { data: null, error: { message: `expected one row, got ${out.length}` } }
      return { data: out, error: null }
    }
    const b = {
      select() { if (st.op === 'select' || true) return b },
      insert(rows) { st.op = 'insert'; st.payload = Array.isArray(rows) ? rows : [rows]; return b },
      update(patch) { st.op = 'update'; st.payload = patch; return b },
      delete() { st.op = 'delete'; return b },
      eq(col, val) { st.filters.push({ kind: 'eq', col, val }); return b },
      in(col, val) { st.filters.push({ kind: 'in', col, val }); return b },
      order() { return b }, limit() { return b }, like() { return b }, lte() { return b }, range() { return b },
      maybeSingle() { st.single = 'maybe'; return b },
      single() { st.single = 'one'; return b },
      then(res, rej) { try { return Promise.resolve(run()).then(res, rej) } catch (e) { return Promise.reject(e).then(res, rej) } },
    }
    return b
  }
  return { from: builder, tables }
}

const COURSE = { course_code: 'deu_for_eng', known_lang: 'eng', target_lang: 'deu', voice_config: { voices: { presentation: { voiceId: 'x', provider: 'cartesia' } } } }
const KAI_83 = "Often in German, you will hear some kinds of words split into two pieces in sentences. Listen out for that. The German for 'to agree' is:"
const KAI_92 = 'As it happens, you already know quite a few words that can be split, so we will start throwing those into the mix from now on.'
const TEMPLATE_83 = "The German for: 'to agree', as in — 'I agree with that', is:"

function seeded() {
  return fakeSupabase({
    course_legos: [
      { lego_id: 'S0083L01', course_code: 'deu_for_eng', seed_number: 83, lego_index: 1, known_text: 'to agree', target_text: 'zustimmen', is_new: true },
      { lego_id: 'S0092L01', course_code: 'deu_for_eng', seed_number: 92, lego_index: 1, known_text: 'a while', target_text: 'eine Weile', is_new: true },
      { lego_id: 'S0001L01', course_code: 'deu_for_eng', seed_number: 1, lego_index: 1, known_text: 'I want', target_text: 'ich will', is_new: true },
    ],
    course_seeds: [
      { course_code: 'deu_for_eng', seed_number: 83, known_text: 'I agree with that and I think it is very important', target_text: 'Ich stimme dem zu, und ich denke, es ist sehr wichtig' },
      { course_code: 'deu_for_eng', seed_number: 92, known_text: 'I need to wait for a while', target_text: 'Ich muss eine Weile warten' },
    ],
    course_audio: [
      { id: 'pend-83', course_code: 'deu_for_eng', role: 'presentation', lego_id: 'S0083L01', text: KAI_83, text_normalized: KAI_83.toLowerCase(), s3_key: 'pending/A.mp3', voice_id: 'cartesia_x', origin: 'tts' },
      { id: 'rend-92', course_code: 'deu_for_eng', role: 'presentation', lego_id: 'S0092L01', text: KAI_92, text_normalized: KAI_92.toLowerCase(), s3_key: 'mastered/B.mp3', voice_id: 'xai_y', origin: 'tts' },
    ],
    human_authored_presentations: [], course_qa_flags: [], content_feedback: [], audio_pass_requests: [],
  })
}

async function markBoth(sb) {
  const legos = sb.tables.course_legos
  await ha.markHumanAuthored(sb, { courseCode: 'deu_for_eng', legoId: 'S0083L01', text: KAI_83, author: 'Kai', source: 'separable-verbs.cjs seed 83', lego: legos[0], by: 'test' })
  await ha.markHumanAuthored(sb, { courseCode: 'deu_for_eng', legoId: 'S0092L01', text: KAI_92, author: 'Kai', source: 'separable-verbs.cjs seed 92', lego: legos[1], by: 'test' })
}

describe('1. course-wide regeneration over a marked line, LEGO unchanged', () => {
  it('uses the human words, never the template, and says so', async () => {
    const sb = seeded(); await markBoth(sb)
    const judge = async () => { throw new Error('the judge must not be consulted when the LEGO is unchanged') }
    const r = await ha.resolveForCourse(sb, COURSE, { judge })
    // What the bulk route does with it: pres.presentation_text = textFor(lego_id)
    const presentations = [{ lego_id: 'S0083L01', presentation_text: TEMPLATE_83 }, { lego_id: 'S0001L01', presentation_text: 'The German for: I want, is:' }]
    for (const p of presentations) { const w = r.textFor(p.lego_id); if (w != null) p.presentation_text = w }
    expect(presentations[0].presentation_text).toBe(KAI_83)
    expect(presentations[1].presentation_text).toBe('The German for: I want, is:')
    expect(r.outcomes.map(o => o.outcome)).toEqual(['kept-unchanged-lego', 'kept-unchanged-lego'])
    expect(r.outcomes[0].message).toMatch(/human-authored wording kept/)
    expect(r.outcomes[0].message).toMatch(/template was not applied/)
  })

  it('a mark is idempotent to re-mark, and a wording edit RETAINS it (decisions accumulate)', async () => {
    const sb = seeded(); await markBoth(sb)
    const again = await ha.markHumanAuthored(sb, { courseCode: 'deu_for_eng', legoId: 'S0083L01', text: KAI_83, author: 'Kai', lego: sb.tables.course_legos[0], by: 'test' })
    expect(again.decisions.map(d => d.action)).toEqual(['marked', 'marked'])
    const edited = await ha.recordWordingEdit(sb, again, { text: KAI_83 + ' (edited)', by: 'kai', why: 'a tweak' })
    expect(edited.text).toBe(KAI_83 + ' (edited)')
    expect(edited.author).toBe('Kai')
    expect(edited.decisions.at(-1)).toMatchObject({ action: 'edited', by: 'kai', why: 'a tweak', old_text: KAI_83 })
    expect(sb.tables.human_authored_presentations).toHaveLength(2)
  })
})

describe('2. the same with the LEGO changed — maintenance, no approval gate', () => {
  it('an agent rewords, applies it, records why, rewords the pending row and queues an audio pass', async () => {
    const sb = seeded(); await markBoth(sb)
    sb.tables.course_legos[0].known_text = 'to agree with'   // the LEGO moves under Kai's line
    const REWORDED = KAI_83.replace("'to agree'", "'to agree with'")
    const asked = []
    const judge = async (input) => { asked.push(input); return { decision: 'rewrite', text: REWORDED, reason: 'the lead-in quotes the known side, which changed' } }
    const r = await ha.resolveForCourse(sb, COURSE, { judge, by: 'phase8 /regenerate-presentations' })
    expect(asked).toHaveLength(1)
    expect(asked[0].mark.reconciled_known_text).toBe('to agree')
    expect(asked[0].lego.known_text).toBe('to agree with')
    expect(r.textFor('S0083L01')).toBe(REWORDED)
    const o = r.outcomes.find(x => x.lego_id === 'S0083L01')
    expect(o.outcome).toBe('rewritten')
    expect(o.message).toMatch(/REWORDED/)
    expect(o.message).toMatch(/nothing rendered/)
    const mark = sb.tables.human_authored_presentations.find(m => m.lego_id === 'S0083L01')
    expect(mark.text).toBe(REWORDED)
    expect(mark.author).toBe('Kai')                       // still human-authored
    expect(mark.reconciled_known_text).toBe('to agree with')
    expect(mark.decisions.at(-1)).toMatchObject({ action: 'rewritten', old_text: KAI_83, new_text: REWORDED, reason: expect.stringMatching(/lead-in/) })
    expect(sb.tables.course_audio.find(a => a.id === 'pend-83').text).toBe(REWORDED)
    expect(sb.tables.audio_pass_requests).toHaveLength(1)
    expect(sb.tables.audio_pass_requests[0].reason).toMatch(/S0083L01 reworded/)
    expect(sb.tables.course_qa_flags).toHaveLength(0)     // no gate, no flag
    expect(sb.tables.content_feedback.some(f => f.feedback_type === ha.FEEDBACK_TYPE && /rewritten/.test(f.comment))).toBe(true)
  })

  it('an agent that judges KEEP reconciles the revision and records that too', async () => {
    const sb = seeded(); await markBoth(sb)
    sb.tables.course_legos[1].target_text = 'eine  Weile'  // target side moves; the doors-open line does not mention it
    const judge = async () => ({ decision: 'keep', text: KAI_92, reason: 'the line names no LEGO text' })
    const r = await ha.resolveForCourse(sb, COURSE, { judge })
    const o = r.outcomes.find(x => x.lego_id === 'S0092L01')
    expect(o.outcome).toBe('kept-unchanged-lego')          // whitespace-only: not a change at all
    sb.tables.course_legos[1].target_text = 'eine Weile lang'
    const r2 = await ha.resolveForCourse(sb, COURSE, { judge })
    const o2 = r2.outcomes.find(x => x.lego_id === 'S0092L01')
    expect(o2.outcome).toBe('kept')
    expect(o2.message).toMatch(/KEPT it unchanged/)
    const mark = sb.tables.human_authored_presentations.find(m => m.lego_id === 'S0092L01')
    expect(mark.reconciled_target_text).toBe('eine Weile lang')
    expect(mark.decisions.at(-1).action).toBe('kept')
    // and the row with the new wording of the pending row must equal the mark words
    expect(sb.tables.course_audio.find(a => a.id === 'rend-92').text).toBe(KAI_92)
  })

  it('a rewrite with no pending row queues one carrying the new words (no TTS)', async () => {
    const sb = seeded(); await markBoth(sb)
    sb.tables.course_legos[1].known_text = 'for a while'
    const NEW = KAI_92 + ' Really.'
    const judge = async () => ({ decision: 'rewrite', text: NEW, reason: 'test' })
    await ha.resolveForCourse(sb, COURSE, { judge })
    const rows = sb.tables.course_audio.filter(a => a.lego_id === 'S0092L01')
    expect(rows).toHaveLength(2)
    const pending = rows.find(a => a.s3_key.startsWith('pending/'))
    expect(pending.text).toBe(NEW)
    expect(rows.find(a => a.id === 'rend-92').text).toBe(KAI_92)   // make-before-break: the old clip is untouched
  })

  it('a dry run judges nothing and says so', async () => {
    const sb = seeded(); await markBoth(sb)
    sb.tables.course_legos[0].known_text = 'to agree with'
    const judge = async () => { throw new Error('dry run must not call the judge') }
    const r = await ha.resolveForCourse(sb, COURSE, { judge, dryRun: true })
    expect(r.outcomes.find(x => x.lego_id === 'S0083L01').outcome).toBe('would-judge')
    expect(sb.tables.human_authored_presentations.find(m => m.lego_id === 'S0083L01').text).toBe(KAI_83)
  })
})

describe('3. a concept-level break goes to Kai, once', () => {
  it('raises one course_qa_flags row with the old and new LEGO, the sentence and a recommendation; leaves the words alone; never twice', async () => {
    const sb = seeded(); await markBoth(sb)
    sb.tables.course_legos[0].known_text = 'to accept'
    sb.tables.course_legos[0].target_text = 'akzeptieren'   // not a separable verb: the explanation no longer fits what follows
    let calls = 0
    const judge = async () => { calls++; return { decision: 'escalate', text: KAI_83, reason: 'akzeptieren does not split; the line explains splitting' } }
    const r = await ha.resolveForCourse(sb, COURSE, { judge, by: 'phase8 /generate' })
    const o = r.outcomes.find(x => x.lego_id === 'S0083L01')
    expect(o.outcome).toBe('escalated')
    expect(o.message).toMatch(/ESCALATED to Kai/)
    expect(sb.tables.course_qa_flags).toHaveLength(1)
    const flag = sb.tables.course_qa_flags[0]
    expect(flag.check_type).toBe(ha.CHECK_TYPE)
    expect(flag.lego_id).toBe('S0083L01')
    expect(flag.seed_number).toBe(83)
    expect(flag.details.old_lego).toEqual({ known_text: 'to agree', target_text: 'zustimmen' })
    expect(flag.details.new_lego).toEqual({ known_text: 'to accept', target_text: 'akzeptieren' })
    expect(flag.details.current_text).toBe(KAI_83)
    expect(flag.details.recommendation).toMatch(/decides nothing/)
    const mark = sb.tables.human_authored_presentations.find(m => m.lego_id === 'S0083L01')
    expect(mark.text).toBe(KAI_83)
    expect(mark.open_flag_id).toBe(flag.id)
    expect(mark.reconciled_known_text).toBe('to agree')     // NOT reconciled — still flagged as moved
    expect(mark.decisions.at(-1).action).toBe('escalated')

    // Second run while the flag is open: no second flag, no second judgement, reported as waiting.
    const r2 = await ha.resolveForCourse(sb, COURSE, { judge })
    expect(calls).toBe(1)
    expect(r2.outcomes.find(x => x.lego_id === 'S0083L01').outcome).toBe('awaiting-kai')
    expect(sb.tables.course_qa_flags).toHaveLength(1)

    // Kai resolves the flag without rewording: the current words now stand for the current LEGO.
    sb.tables.course_qa_flags[0].status = 'resolved'
    const r3 = await ha.resolveForCourse(sb, COURSE, { judge })
    expect(r3.outcomes.find(x => x.lego_id === 'S0083L01').outcome).toBe('kept-after-kai')
    const after = sb.tables.human_authored_presentations.find(m => m.lego_id === 'S0083L01')
    expect(after.open_flag_id).toBeNull()
    expect(after.reconciled_known_text).toBe('to accept')
    expect(calls).toBe(1)
  })
})

describe('4. row replacement cannot lose the mark', () => {
  it("job #497's shape: every course_audio row for the LEGO is gone — the words come back from the mark, not the judge", async () => {
    const sb = seeded(); await markBoth(sb)
    sb.tables.course_audio = []                             // unlinked, purged, deleted — whatever a repair did
    const marks = await ha.loadMarks(sb, 'deu_for_eng')
    expect(marks.size).toBe(2)
    const needs = ha.markedNeeds({ marks, legos: sb.tables.course_legos, course: COURSE, legoIdsWithPresentation: new Set(), freshPendingLegoIds: new Set() })
    expect(needs.toGenerate.map(t => t.text).sort()).toEqual([KAI_83, KAI_92].sort())
    expect(needs.toGenerate.every(t => t.role === 'presentation' && t.human_authored)).toBe(true)
    expect(needs.report.every(r => /re-queued for TTS from the mark/.test(r.message))).toBe(true)
  })

  it("edit-cascade's shape: the LEGO rows are deleted and re-inserted — the mark survives and still applies", async () => {
    const sb = seeded(); await markBoth(sb)
    const copy = sb.tables.course_legos.map(l => ({ ...l }))
    sb.tables.course_legos = []                             // DELETE FROM course_legos WHERE seed_number = 83 …
    const mid = await ha.resolveForCourse(sb, COURSE, { judge: async () => { throw new Error('no') } })
    expect(mid.outcomes.every(o => o.outcome === 'lego-missing')).toBe(true)
    expect(mid.outcomes[0].message).toMatch(/nothing was rendered or removed/)
    sb.tables.course_legos = copy.map(l => ({ ...l, version: 1 }))   // … re-inserted, version reset
    const after = await ha.resolveForCourse(sb, COURSE, { judge: async () => { throw new Error('no') } })
    expect(after.textFor('S0083L01')).toBe(KAI_83)
    expect(after.outcomes.every(o => o.outcome === 'kept-unchanged-lego')).toBe(true)
  })

  it('a marked LEGO already rendered or fresh-pending is reported, not re-queued', () => {
    const marks = new Map([['S0083L01', { text: KAI_83, reconciled_known_text: 'to agree', reconciled_target_text: 'zustimmen' }]])
    const legos = [{ lego_id: 'S0083L01', known_text: 'to agree', target_text: 'zustimmen' }]
    const a = ha.markedNeeds({ marks, legos, course: COURSE, legoIdsWithPresentation: new Set(['S0083L01']), freshPendingLegoIds: new Set() })
    expect(a.toGenerate).toHaveLength(0); expect(a.report[0].outcome).toBe('rendered')
    const b = ha.markedNeeds({ marks, legos, course: COURSE, legoIdsWithPresentation: new Set(), freshPendingLegoIds: new Set(['S0083L01']) })
    expect(b.toGenerate).toHaveLength(0); expect(b.report[0].message).toMatch(/wording kept, audio queued/)
    const moved = ha.markedNeeds({ marks, legos: [{ ...legos[0], known_text: 'to agree with' }], course: COURSE, legoIdsWithPresentation: new Set(), freshPendingLegoIds: new Set(['S0083L01']) })
    expect(moved.report[0].message).toMatch(/LEGO has changed/)
  })
})

describe('5. the staleness check is a second door', () => {
  it("a marked pending row that does not quote its LEGO (seed 92) is fresh; a template row under a marked LEGO is stale", () => {
    const mark92 = { text: KAI_92 }
    expect(KAI_92.includes("'a while'")).toBe(false)         // the shape that got it purged before
    expect(ha.pendingRowIsFresh({ text: KAI_92 }, mark92)).toBe(true)
    expect(ha.pendingRowIsFresh({ text: KAI_92 + '!' }, mark92)).toBe(true)
    expect(ha.pendingRowIsFresh({ text: "The German for: 'a while', as in — 'I need to wait for a while', is:" }, mark92)).toBe(false)
    expect(ha.pendingRowIsFresh({ text: KAI_92 }, null)).toBeNull()   // unmarked: the quote rule decides
  })
})

describe('6. the judge failing escalates rather than guesses', () => {
  const input = { mark: { text: KAI_83, author: 'Kai', reconciled_known_text: 'to agree', reconciled_target_text: 'zustimmen' }, lego: { known_text: 'to accept', target_text: 'akzeptieren' }, seed: null, course: COURSE }
  it('CLI down → escalate', async () => {
    const v = await ha.judgeMaintenance(input, { chat: async () => { throw new Error('claude exited 1') } })
    expect(v.decision).toBe('escalate'); expect(v.reason).toMatch(/could not run/)
  })
  it('nonsense → escalate', async () => {
    const v = await ha.judgeMaintenance(input, { chat: async () => 'Sure! Here is my answer.' })
    expect(v.decision).toBe('escalate'); expect(v.reason).toMatch(/unreadable/)
  })
  it('REWRITE with the same words → keep; a real REWRITE carries its words; the prompt shows both LEGOs and the sentence', async () => {
    const same = await ha.judgeMaintenance(input, { chat: async () => JSON.stringify({ decision: 'REWRITE', text: KAI_83 + '.', reason: 'x' }) })
    expect(same.decision).toBe('keep')
    let prompt
    const real = await ha.judgeMaintenance(input, { chat: async (p) => { prompt = p; return `\`\`\`json\n${JSON.stringify({ decision: 'rewrite', text: 'New words.', reason: 'y' })}\n\`\`\`` } })
    expect(real).toEqual({ decision: 'rewrite', text: 'New words.', reason: 'y' })
    expect(prompt).toContain('"to agree"'); expect(prompt).toContain('"to accept"'); expect(prompt).toContain(KAI_83)
    expect(prompt).toMatch(/ESCALATE/)
  })
})
