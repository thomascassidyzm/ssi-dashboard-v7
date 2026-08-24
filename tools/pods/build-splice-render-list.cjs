#!/usr/bin/env node
/**
 * build-splice-render-list.cjs — collect every turn the splicer REFUSED into
 * one machine-usable list, so the (separate, Tom-triggered) render pass can be
 * aimed at exactly those turns and nothing else.
 *
 * This tool renders nothing and costs nothing. It reads the applied logs that
 * splice-sentence-clips.cjs wrote and turns their `refusals` arrays into a
 * single file with the per-turn detail a renderer needs: the course, the pod
 * row, the sentences to render, and the measured reason the free path would
 * not touch it.
 *
 * WHY IT IS A SEPARATE FILE AND NOT A FLAG ON THE SPLICER. The refusals are
 * the honest half of the splice result — the turns where cutting the existing
 * take would have been a guess. Keeping them in a standing list means the
 * money question ("what does the fallback actually cost?") is answerable from
 * a committed artefact instead of by re-running anything, and it means nobody
 * can quietly widen the render beyond what the free path genuinely could not
 * do (docs/pods/splice-vs-render-2026-08-24.md: "spend money only where the
 * free path measurably cannot do the job").
 *
 * The reasons, and what each one means for the renderer:
 *   too_few_gaps        the take runs its sentences together with no pause at
 *                       all. Nothing to cut. Must be rendered.
 *   margin_below_floor  a comma pause is nearly as long as the sentence gap,
 *                       so choosing between them is a coin toss. Rendering is
 *                       the safe answer; a human listen could also clear it.
 *   seam_not_silent     the cut landed somewhere audible. Must be rendered.
 *   seam_unmeasurable   the level check could not run. Treated as a refusal on
 *                       purpose — an unmeasured seam is not a verified one.
 *   no_whole_turn_clip  there is no source audio to cut. Render (and worth a
 *                       separate look: the turn has no whole-turn clip either).
 *   no_target_voice     the pod's cast has no target voice for this speaker.
 *                       A CASTING defect — rendering it would pick a voice by
 *                       accident. Do not render without fixing the cast first.
 *
 *   node tools/pods/build-splice-render-list.cjs [--date=YYYY-MM-DD]
 *
 * Writes docs/pods/splice-refusals-render-list-<date>.json.
 */
const fs = require('fs')
const path = require('path')

const REPO = path.resolve(__dirname, '../..')
const PODS = path.join(REPO, 'docs', 'pods')
const arg = (n, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${n}=`))
  return h ? h.slice(n.length + 3) : d
}
const DATE = arg('date', new Date().toISOString().slice(0, 10))

const files = fs.readdirSync(PODS)
  .filter((f) => f.endsWith(`-sentence-splice-${DATE}-applied-log.json`))
  .sort()
if (!files.length) {
  console.error(`no applied splice logs for ${DATE} in docs/pods/`)
  process.exit(1)
}

const turns = []
const byCourse = {}
const byReason = {}
let totalNeeding = 0
let totalLinked = 0

for (const f of files) {
  const log = JSON.parse(fs.readFileSync(path.join(PODS, f), 'utf8'))
  totalNeeding += log.multi_sentence_turns_needing_split || 0
  totalLinked += log.stats.linked || 0
  byCourse[log.course] = {
    needing_split: log.multi_sentence_turns_needing_split,
    linked: log.stats.linked,
    refused: log.stats.refused,
    clips_spliced: log.stats.spliced_clips,
    clips_reused: log.stats.reused_clips,
    errors: log.stats.errors,
  }
  for (const r of log.refusals || []) {
    byReason[r.reason] = (byReason[r.reason] || 0) + 1
    turns.push({
      course: log.course,
      pod: log.pod,
      sentence_row_id: r.id,
      global_order: r.order,
      reason: r.reason,
      // What a renderer needs to do the job:
      n_sentences: r.n,
      sentences: r.sentences || null,
      target_text: r.text,
      whole_turn_audio_id: r.target_audio_id || null,
      // What a human needs to second-guess the refusal:
      measure: r.measure || null,
    })
  }
}

/**
 * Turns that were spliced, LANDED, and then withdrawn because transcription
 * proved the pieces did not say their own sentences.
 *
 * These belong on the render list even though no gate refused them — that is
 * the point. On zho the margin heuristic could not tell a good cut from a bad
 * one (1.65 and 2.1 are correct; 1.53, 1.59 and 1.75 cut at a comma instead of
 * the sentence end), so the only thing that separated them was listening. A
 * refusal list built purely from the gates would silently omit them.
 */
for (const f of fs.readdirSync(PODS)) {
  if (!f.endsWith(`-misaligned-splice-unlink-${DATE}-applied-log.json`)) continue
  const log = JSON.parse(fs.readFileSync(path.join(PODS, f), 'utf8'))
  for (const r of log.rows || []) {
    const course = String(r.id).split(':')[0]
    byReason.stt_proved_misaligned = (byReason.stt_proved_misaligned || 0) + 1
    turns.push({
      course,
      pod: `${course}:pod-1`,
      sentence_row_id: r.id,
      global_order: null,
      reason: 'stt_proved_misaligned',
      n_sentences: (r.sentence_audio_ids || []).length || null,
      sentences: null,
      target_text: r.target_text,
      whole_turn_audio_id: null,
      measure: { withdrawn_after_landing: true, evidence: log.reason },
    })
  }
}

const out = {
  built_at: new Date().toISOString(),
  splice_run_date: DATE,
  source_logs: files,
  note: 'Refusals from the free splice pass. NOTHING here has been rendered. '
    + 'Rendering is a separate, Tom-triggered step.',
  gates: JSON.parse(fs.readFileSync(path.join(PODS, files[0]), 'utf8')).gates,
  totals: {
    courses: files.length,
    turns_needing_split: totalNeeding,
    turns_linked_by_splice: totalLinked,
    turns_refused: turns.length,
    refusal_rate: totalNeeding ? Number((turns.length / totalNeeding).toFixed(4)) : null,
    sentences_to_render: turns.reduce((a, t) => a + (t.n_sentences || 0), 0),
  },
  by_reason: byReason,
  by_course: byCourse,
  turns,
}

const outPath = path.join(PODS, `splice-refusals-render-list-${DATE}.json`)
fs.writeFileSync(outPath, JSON.stringify(out, null, 2))

console.log(`render list: ${turns.length} refused turns across ${files.length} courses `
  + `(${out.totals.sentences_to_render} sentences), ${(out.totals.refusal_rate * 100).toFixed(1)}% of ${totalNeeding} needing split`)
console.log(`  by reason: ${Object.entries(byReason).map(([k, v]) => `${k}=${v}`).join(' ')}`)
console.log(`  ${outPath}`)
