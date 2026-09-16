#!/usr/bin/env node
/**
 * stage-takes.cjs — THE BOOTH LOAD, AND WHERE THESE LINES HAVE TO LIVE BEFORE
 * A BOOTH CAN SEE THEM.
 *
 *   node tools/recording/health-seed-ladders/stage-takes.cjs            # pilot
 *   node tools/recording/health-seed-ladders/stage-takes.cjs --all
 *   node tools/recording/health-seed-ladders/stage-takes.cjs --apply    # refuses
 *
 * Read-only. It writes nothing, sends nothing and records nothing, and --apply
 * refuses with the reason rather than doing half of it.
 *
 * THE REASON --apply REFUSES, which is the finding this tool exists to carry:
 *
 * THE RECORDIST QUEUE HAS NO STAGED STATE. services/voice-engine/recordist-queue.cjs
 * DERIVES the queue on every read from three live sources — pod sentences,
 * course_audio.rerecord_wanted, and course_seeds (the source-3 seam). There is
 * no staging table, no release flag, and nothing between "a row exists" and
 * "Aran sees it at the microphone". `notReady` is untranslated text, not a gate.
 * So in this estate, STAGING AND RELEASING ARE THE SAME ACT, and a pilot of five
 * is staged by putting FIVE seeds where the queue can see them and holding the
 * other forty-eight out until the pilot is judged.
 *
 * AND THESE 57 ARE NOT IN A CONTENT TABLE AT ALL. They are
 * `canonical_pod_scenarios` rows (pod_slug = 'health-general-welsh'), a canon
 * table with no audio FK of any kind — no queue source reads it. Job #991
 * declined to write them anywhere and was right to.
 *
 * THE RECOMMENDATION, which is Tom's or Kai's to take: mint them as a NEW course
 * `cym_n_health_for_eng` rather than as seeds 669+ of the live 668-seed
 * cym_n_for_eng. A new course does not move the live course's seed numbering,
 * round index or helix; it carries its own voice_config; and the seed seam picks
 * it up for free, because the queue derives by canonical TARGET LANGUAGE across
 * every course, not by a course list. `course_sectors` already holds the
 * precedent (spa_health_for_eng). Batch 1 creates it with the five pilot seeds;
 * batch 2 adds the other forty-eight when the pilot is judged. That is the
 * staging mechanism the estate already has, and it needs no new code.
 *
 * THE CAST NEEDS NO WRITE. cym_n_for_eng's voice_config.voices now names
 * target1 = Catrin (human_catrinlliar_cym_n) and target2 = Aran
 * (human_aran_cym_n) — verified live 2026-09-16. The 2026-09-02 seed-and-splice
 * document says both slots are empty; that statement is stale. Both voices,
 * solo, which is what Tom ruled for these seeds. A new course copies that block
 * verbatim; nothing about the cast is this job's to decide or to change.
 */
const { planLadder, takesFor, boothLoad, TAKE_GAPPED, TAKE_NATURAL } = require('./ladder.cjs')
const { classifySplit, CLASS_BLOCKED } = require('./partition.cjs')
const SEEDS = require('./health-seeds.json')

const VOICES = [
  { role: 'target1', name: 'Catrin Lliar', voiceId: 'human_catrinlliar_cym_n', booth: 'https://popty.app/r/human_catrinlliar_cym_n' },
  { role: 'target2', name: 'Aran', voiceId: 'human_aran_cym_n', booth: 'https://popty.app/r/human_aran_cym_n' },
]

const args = process.argv.slice(2)
const wantAll = args.includes('--all')
const wantJson = args.includes('--json')

if (args.includes('--apply')) {
  console.error([
    '--apply refuses, and the refusal is the deliverable.',
    '',
    'There is nowhere to stage these lines that the recordist queue can see.',
    'They are canonical_pod_scenarios rows — a canon table with no audio FK —',
    'and the queue derives only from pod sentences, course_audio.rerecord_wanted',
    'and course_seeds. Writing them into a content table does not stage them,',
    'it RELEASES them: the queue has no staged state and Aran and Catrin would',
    'see them at the next load of their booth link.',
    '',
    'The decision that unblocks this, Tom or Kai to take:',
    '  mint the five pilot seeds as a NEW course cym_n_health_for_eng,',
    '  copying cym_n_for_eng voice_config verbatim, and add the other 48',
    '  once the pilot takes are judged.',
    '',
    'Run without --apply for the booth load and the staged manifest.',
  ].join('\n'))
  process.exit(3)
}

const blocked = SEEDS.filter((s) => s.batch === 0)
const pilot = SEEDS.filter((s) => s.batch === 1)
const held = SEEDS.filter((s) => s.batch === 2)
const staged = wantAll ? [...pilot, ...held] : pilot

if (wantJson) {
  console.log(JSON.stringify({
    batch1: pilot.map((s) => s.code),
    batch2: held.map((s) => s.code),
    blocked: blocked.map((s) => ({ code: s.code, reason: s.partitionNote })),
    load: { pilot: boothLoad(pilot), cuttable: boothLoad([...pilot, ...held]), all: boothLoad(SEEDS) },
    takes: staged.flatMap((s) => VOICES.flatMap((v) => takesFor(s).map((kind) => ({
      seed: s.code, voice: v.voiceId, role: v.role, kind, state: 'staged, awaiting booth',
      expectedChunks: kind === TAKE_GAPPED ? s.chunks.map((c) => c.target) : null,
    })))),
  }, null, 2))
  process.exit(0)
}

const line = (l) => console.log(l)
line('READ-ONLY. Nothing staged here has been sent, recorded or generated.')
line('')
line(`Course: cym_n_for_eng (North Welsh), pod health-general-welsh, 57 seeds.`)
line(`Cast: ${VOICES.map((v) => `${v.role}=${v.name}`).join(', ')} — both voices, solo.`)
line('')
line('THE RECORDING UNIT — two takes per seed per voice:')
line(`  ${TAKE_GAPPED}  one read of the WHOLE sentence with a pause at every chunk joint.`)
line('           The quarry: align.cjs maps its voiced regions 1:1 onto the #991 split.')
line(`  ${TAKE_NATURAL} one read of the whole sentence at speaking pace.`)
line('           Ground truth: it IS the full-sentence rung, and every shorter rung')
line('           is cut from it using the gapped take as the map.')
line('  A single-chunk seed has no joints, so it gets the natural take only.')
line('')

const loadPilot = boothLoad(pilot)
const loadCuttable = boothLoad([...pilot, ...held])
const loadAll = boothLoad(SEEDS)
line('BOOTH LOAD — takes, against reading the LEAN ladder whole')
line('')
line('                                 takes/voice   takes, both   LEAN lines read whole')
const row = (label, l) => line(`  ${label.padEnd(30)} ${String(l.takesPerVoice).padStart(9)}   ${String(l.takesBothVoices).padStart(11)}   ${String(l.ladderLinesPerVoice).padStart(6)} / ${l.ladderLinesBothVoices}`)
row(`pilot (${pilot.length} seeds)`, loadPilot)
row(`cuttable set (${pilot.length + held.length} seeds)`, loadCuttable)
row(`all 57 seeds`, loadAll)
line('')
line(`  All 57 as two takes: ${loadAll.takesPerVoice} per voice / ${loadAll.takesBothVoices} both —`)
line(`  against ${loadAll.ladderLinesPerVoice} / ${loadAll.ladderLinesBothVoices} to read the LEAN ladder line by line.`)
line(`  ${Math.round(100 - (loadAll.takesPerVoice / loadAll.ladderLinesPerVoice) * 100)}% fewer takes.`)
line('')
line(`STAGED — batch 1, state "staged, awaiting booth" (${pilot.length} seeds, ${loadPilot.takesBothVoices} takes)`)
for (const s of pilot) {
  line(`  ${s.code}  n=${s.chunks.length}  ${s.partition.padEnd(11)} ${takesFor(s).join('+')}  ×2 voices`)
  line(`        ${s.pilotReason}`)
}
line('')
line(`HELD — batch 2, NOT released (${held.length} seeds, ${boothLoad(held).takesBothVoices} takes)`)
line('')
line(`OUT — not cuttable, out of both batches (${blocked.length} seeds)`)
for (const s of blocked) line(`  ${s.code}  ${s.partitionNote}`)
line('')
line('BOOTH LINKS (nothing has been sent to either):')
for (const v of VOICES) line(`  ${v.name.padEnd(13)} ${v.booth}`)
line('')
line('Assembly plan:  node tools/recording/health-seed-ladders/assemble-ladder.cjs --pilot')
line('Once takes land: … --pilot --takes <dir>    (exits non-zero on a chunk-count mismatch)')
