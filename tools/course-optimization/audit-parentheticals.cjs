// Course-wide audit for the no-parentheses house law (ralph-methodology.md,
// "No Parentheses, Ever"). Scans course_legos (known_text + components[].known)
// and course_practice_phrases (known_text) across every course for any
// parenthesis character. Count + locations only — this script does not write
// anything. Prints a per-course summary and writes the full per-hit list to
// a local (gitignored) JSON file for follow-up scoping.
require('dotenv').config()
const { supabase } = require('../../services/supabase-client.cjs')

async function fetchAllPages(table, cols) {
  let all = []
  let from = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase.from(table).select(cols).range(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
}

async function main() {
  const legos = await fetchAllPages('course_legos', 'course_code,seed_number,lego_index,known_text,components')
  const phrases = await fetchAllPages('course_practice_phrases', 'id,course_code,seed_number,lego_index,position,phrase_role,known_text')

  const parenRe = /[()]/
  const legoHits = legos.filter(l => parenRe.test(l.known_text || ''))
  const compHits = []
  for (const l of legos) {
    for (const c of (l.components || [])) {
      if (parenRe.test(c.known || '')) compHits.push({ course_code: l.course_code, seed_number: l.seed_number, lego_index: l.lego_index, known: c.known })
    }
  }
  const phraseHits = phrases.filter(p => parenRe.test(p.known_text || ''))

  const totals = {}
  for (const h of [...legoHits, ...compHits, ...phraseHits]) totals[h.course_code] = (totals[h.course_code] || 0) + 1
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])

  console.log(`lego known_text hits: ${legoHits.length}`)
  console.log(`component known hits: ${compHits.length}`)
  console.log(`phrase known_text hits: ${phraseHits.length}`)
  console.log(`grand total: ${legoHits.length + compHits.length + phraseHits.length} across ${sorted.length} courses`)
  console.log('top 15:', sorted.slice(0, 15))

  const outPath = require('path').join(__dirname, '../../scripts/parenthetical-audit-full.json')
  require('fs').writeFileSync(outPath, JSON.stringify({ legoHits, compHits, phraseHits }, null, 2))
  console.log(`full per-hit data written to ${outPath} (gitignored — regenerate on demand, too large to commit)`)
}
main().catch(e => { console.error(e); process.exit(1) })
