// The SQL normalize_text() and the JS normalizeForDb() are ONE rule written twice (Tom 2026-10-13: a trailing ?
// distinguishes a recording). This test pins the two spellings together: it extracts the regexes from the
// migration and runs the SAME table of cases through them (translated POSIX -> JS) and through normalizeForDb.
// Live parity over 202,092 real rows was checked by tools/audio-question-key-backfill.cjs; this keeps the files honest.
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const path = require('path')
const { normalizeForDb } = require('./text-normalize.cjs')

const sql = fs.readFileSync(path.join(__dirname, '../../database/migrations/20261013_audio_key_keeps_question_mark.sql'), 'utf8')
const m = {
  detect: sql.match(/IF t ~ '([^']+)' THEN/)[1],
  collapse: sql.match(/regexp_replace\(t, '([^']+)', '\?'\)/)[1],
  rtrim: sql.match(/RETURN rtrim\(t, '([^']+)'\)/)[1],
}
const toJs = (re) => new RegExp(re.replace(/\[:space:\]/g, '\\s'))
function sqlNormalize(text) {
  const t = text.toLowerCase().trim()
  if (toJs(m.detect).test(t)) return t.replace(toJs(m.collapse), '?')
  return t.replace(new RegExp('[' + m.rtrim.replace(/[\]\\^-]/g, '\\$&') + ']+$'), '')
}

describe('SQL normalize_text migration == JS normalizeForDb', () => {
  const cases = ['Onde era?', 'onde era', 'What?!', 'what!?', 'what??', 'Tu viens ?', '本当に？', '我很惊讶。', 'vamos!', '¿Verdad?', '¡Vamos!', 'a  b?', '...?', 'x. ?', 'plain']
  for (const c of cases) it(`agrees on ${JSON.stringify(c)}`, () => expect(sqlNormalize(c)).toBe(normalizeForDb(c)))
  it('the migration never strips a trailing ? from a question', () => {
    expect(sql).not.toMatch(/rtrim\(lower\(trim\(input_text\)\), '\.\?!/)
  })
})
