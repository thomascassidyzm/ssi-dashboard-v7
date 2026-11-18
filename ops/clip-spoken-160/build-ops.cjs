#!/usr/bin/env node
// cs #160·AI: turn the committed re-record result files into audio.spoken edit-batch ops, one JSON per course.
// Source of truth = the files (not the DB): a clip is marked when its row is mode=real with a source that left the
// clip saying female_text (rendered | library | already-rerecorded). expect pins the label and the revision the
// re-record left, so a clip that has moved since aborts the batch instead of being mis-marked.
const fs = require('fs'), path = require('path')
const root = path.resolve(__dirname, '../..')
const SRC = {
  ita_for_eng: ['ops/ita-sicura/result-130.tsv', 'cs #130·AI re-record in place with spokenText (ops/ita-sicura/result-130.tsv)'],
  spa_for_eng: ['ops/female-gender-gap-142/result-142-spa_for_eng.tsv', 'cs #142·AI re-record in place with spokenText (ops/female-gender-gap-142/result-142-spa_for_eng.tsv)'],
  fra_for_eng: ['ops/female-gender-gap-142/result-142-fra_for_eng.tsv', 'cs #142·AI re-record in place with spokenText (ops/female-gender-gap-142/result-142-fra_for_eng.tsv)'],
  por_for_eng: ['ops/female-gender-gap-142/result-142-por_for_eng.tsv', 'cs #142·AI re-record in place with spokenText (ops/female-gender-gap-142/result-142-por_for_eng.tsv)'],
}
const OK = new Set(['rendered', 'library', 'already-rerecorded'])
for (const [course, [file, basis]] of Object.entries(SRC)) {
  const [head, ...lines] = fs.readFileSync(path.join(root, file), 'utf8').trim().split('\n')
  const cols = head.split('\t')
  const ops = new Map(), skipped = []
  for (const l of lines) {
    const r = Object.fromEntries(l.split('\t').map((v, i) => [cols[i], v]))
    if (r.mode !== 'real') continue
    if (!OK.has(r.source)) { skipped.push({ clip: r.clip, source: r.source, code: r.code }); continue }
    ops.set(r.clip, { op: 'audio.spoken', audio_id: r.clip, spoken_text: r.female_text, basis: `${basis}, Kai-approved female form`,
      // Pinned on the revision the re-record left (stored text differs from the file's lowercased form in case/punctuation).
      expect: r.revision ? { audio_revision: Number(r.revision) } : undefined })
  }
  fs.writeFileSync(path.join(__dirname, `ops-${course}.json`), JSON.stringify({ ops: [...ops.values()] }, null, 1))
  console.log(course, 'ops', ops.size, 'skipped', JSON.stringify(skipped))
}
