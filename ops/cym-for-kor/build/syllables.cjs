// cym_for_kor (cs #813·AK): run Popty's OWN LEGO syllable cap (course-builder language-config
// checkLegoSyllables, the one /api/seed/complete enforces) over every LEGO in plan/*.json and
// print the ones over the cap. Pure function, files only — no DB, no route.
const fs = require('fs'), path = require('path')
const { checkLegoSyllables } = require('../../../services/course-builder/lib/language-config.cjs')
const dir = path.join(__dirname, 'plan')
let bad = 0
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const seeds = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).seeds
  for (const [n, s] of Object.entries(seeds)) for (const l of s.legos) {
    const r = checkLegoSyllables(l.cy, 'cym_for_kor')
    if (!r.ok) { bad++; console.log(`${f} S${n} "${l.cy}" ${r.syllables} > ${r.max}`) }
  }
}
console.log(bad ? `${bad} over the cap` : 'syllables clean')
process.exit(bad ? 1 : 0)
