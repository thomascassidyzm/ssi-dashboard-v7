// Job #542: build <course>.plan.json (the work list tools/audio/tom006-intros-836.cjs reads) for the is_new LEGOs whose intro still quotes
// the OLD English after job #530·V's "to"-infinitive edit. Input = tools/check-intro-mirror.cjs --json output (read-only census).
//   node ops/836-tom006-intros/_542_plan_from_mirror.cjs <course> <mirror.json> <known-mismatch.json>
// A LEGO is in the set when its intro is a chunk MISMATCH, it is is_new, it is not human-authored (guarded), and its known text now starts "to "/"not to "
// or its known clip was one job #542 re-linked. The new intro keeps the old frame, quotes the CURRENT known text, and keeps the "as in" clause only if
// that sentence still contains the chunk (canon: a frame-B context must contain the chunk). Pure file transform: no database.
const fs = require('fs')
const [course, mirrorPath, kmPath] = process.argv.slice(2)
const BREAK = '<break time="300ms"/>'
const mirror = JSON.parse(fs.readFileSync(mirrorPath, 'utf8')), km = JSON.parse(fs.readFileSync(kmPath, 'utf8'))
const fixedLegos = new Set(km.rows.map(r => r.lego_id))
const words = t => String(t).toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, ' ').split(/\s+/).filter(Boolean).join(' ')
const contains = (ctx, chunk) => (' ' + words(ctx) + ' ').includes(' ' + words(chunk) + ' ')
const out = [], held = [], other = []
for (const r of mirror.rows.filter(r => r.kind === 'lego' && r.status === 'mismatch' && r.is_new && r.reasons.includes('chunk'))) {
  const inSet = fixedLegos.has(r.id) || /^(not )?to /i.test(r.known)
  if (!inSet) { other.push(r.id); continue }
  if (r.guarded) { held.push(r.id); continue }
  const lang = (/^The (.+?) for/.exec(r.intro) || [])[1]
  const ctx = (/, as in — '(.*)', is:/.exec(r.intro) || [])[1]
  if (!lang) { held.push(r.id + ' (unparsed)'); continue }
  const keep = ctx && contains(ctx, r.known)
  out.push({ id: null, lego_id: r.id, seed: r.seed, oldClip: r.link, oldVoice: r.voice, oldText: r.intro, alreadyT6: false, keepAsIn: !!keep,
    newText: `The ${lang} for: '${r.known}'${keep ? `, as in — '${ctx}'` : ''}, is: ${BREAK}` })
}
fs.writeFileSync(`${__dirname}/${course}.plan.json`, JSON.stringify(out, null, 1))
console.log(JSON.stringify({ course, planned: out.length, asIn: out.filter(o => o.keepAsIn).length, chars: out.reduce((a, o) => a + o.newText.length, 0), heldGuardedOrUnparsed: held, otherPreexistingMismatchesNotTouched: other.length }))
