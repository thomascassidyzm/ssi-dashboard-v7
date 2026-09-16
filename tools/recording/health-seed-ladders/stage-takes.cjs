#!/usr/bin/env node
/**
 * stage-takes.cjs — THE BOOTH LOAD for the 57 health seeds, read as a minimal
 * recording set rather than as a 339-line ladder.
 *
 *   node tools/recording/health-seed-ladders/stage-takes.cjs            # pilot
 *   node tools/recording/health-seed-ladders/stage-takes.cjs --all
 *   node tools/recording/health-seed-ladders/stage-takes.cjs --json
 *
 * Read-only: it computes and prints, and writes nothing. Putting the lines in
 * front of Aran and Catrin is stage-pilot-pod.cjs, which is gated on --apply.
 *
 * THE RECORDING UNIT is two takes per seed per voice — a natural whole read and
 * a gapped read with a pause at every chunk joint. Both ride seams this estate
 * already owns: the natural read is the pod sentence's own line, and the gapped
 * read is TAKE G, which tools/render-take-g.cjs has rendered for TTS courses
 * since 2026-07-09 and tools/slice-take-g.cjs already slices into per-unit ms
 * spans. What was missing was only that a human could not record one, because
 * render-take-g needs TTS and Welsh has none. A sentence that declares its seams
 * in `atom_map_fine` now gets a second, gapped queue line
 * (recordist-queue.cjs#pushTakeG).
 *
 * THE CAST NEEDS NO WRITE. cym_n_for_eng casts target1 = Catrin
 * (human_catrinlliar_cym_n) and target2 = Aran (human_aran_cym_n), and the
 * health pod's speakers are cast to both — verified live 2026-09-16. The
 * 2026-09-02 seed-and-splice document says both slots are empty; that statement
 * is stale. Note the slots are the other way round from job #993's brief
 * (Aran → target1, Catrin → target2); the live cast is the one that exists and
 * nothing here changes it.
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

if (process.argv.includes('--apply')) {
  console.error([
    '--apply belongs to stage-pilot-pod.cjs, not here. This tool only counts.',
    '',
    '  node tools/recording/health-seed-ladders/stage-pilot-pod.cjs           # dry run',
    '  node tools/recording/health-seed-ladders/stage-pilot-pod.cjs --apply   # writes the held pod',
  ].join('\n'))
  process.exit(2)
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
line('Stage the pilot:  node tools/recording/health-seed-ladders/stage-pilot-pod.cjs --apply')
line('Assembly plan:    node tools/recording/health-seed-ladders/assemble-ladder.cjs --pilot')
line('Once takes land:  node tools/slice-take-g.cjs cym_n_for_eng --dry   (measures the seams)')
line('Then:             … assemble-ladder.cjs --pilot --from-store        (rung spans, or a loud failure)')
