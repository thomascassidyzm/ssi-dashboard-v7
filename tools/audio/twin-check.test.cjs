// Twin check (job #303): a target2 slot playing its own target1 FILE is found and costed; a cast voice is the bar for wrong voice.
// No DB: pure functions over a fixture, plus a fake pg for the free-relink lookup. Run: npx vitest run tools/audio/twin-check.test.cjs
import { describe, it, expect } from 'vitest'
const T = require('./twin-check.cjs')
const { lintSql } = require('../../services/shared/agent-db.cjs')
const fs = require('fs'), path = require('path')

const ALESSANDRA = 'cartesia_0e21713a-0000-4000-8000-000000000001', LORENZO = 'cartesia_ee16f140-0000-4000-8000-000000000002'
const cast = { roles: [
  { language: 'ita', gender: 'f', rank: 0, slot: 'phrase', voice_id: ALESSANDRA, assigned_by: 'tom-ruling-2026-10-04-ita', notes: null },
  { language: 'ita', gender: 'm', rank: 0, slot: 'phrase', voice_id: LORENZO, assigned_by: 'tom-ruling-2026-10-04-ita', notes: null },
] }
const ita = { course_code: 'ita_for_eng', known_lang: 'eng', target_lang: 'ita' }
const kli = { course_code: 'tlh_for_eng', known_lang: 'eng', target_lang: 'tlh' }   // no cast for this language
// The 9 Oct fingerprint: target2 rows pointing at the female file of the same words, labelled with the female voice.
const twin = (key, tx, pos) => ({ tbl: 'course_seeds', key, pos, aid: `a-${key}`, tx, t: tx, language: 'ita', v2: ALESSANDRA, v1: ALESSANDRA, s3_key: `mastered/${key}.mp3` })

describe('twin check', () => {
  it('groups twin slots per sentence and names the cast voice of the slot (Lorenzo), never the clip it plays', () => {
    const { slots, items } = T.twinItems(ita, [twin('s1', 'sono stanco', 1), twin('l1', 'sono stanco', 1), twin('s2', 'andiamo', 2)], cast)
    expect(slots).toBe(3)
    expect(items.map((x) => [x.t, x.slots, x.voice])).toEqual([['sono stanco', 2, LORENZO], ['andiamo', 1, LORENZO]])
  })
  it('costs only what is not already in the cast voice; an uncast language is counted, not priced', async () => {
    const { items } = T.twinItems(ita, [twin('s1', 'sono stanco', 1), twin('s2', 'andiamo', 2)], cast)
    const seen = []
    const pg = { query: async (sql, params) => { seen.push({ sql, params }); return { rows: [{ i: params[1].indexOf('andiamo') }] } } }
    await T.attachFree(pg, items)
    expect(seen[0].params[3]).toEqual([LORENZO, LORENZO])          // asked in the slot's voice
    expect(T.twinCost(items)).toEqual({ sentences: 2, uncast: 0, free: 1, render: 1, chars: 'sono stanco'.length })
    const none = T.twinItems(kli, [{ ...twin('k1', 'Qapla', 1), language: 'tlh' }], cast)
    expect(none.items[0].voice).toBe(null)
    expect(T.twinCost(none.items)).toMatchObject({ uncast: 1, render: 0, chars: 0 })
  })
  it('wrong voice is drift from resolveVoice; human, uncast and no-ruling slots are never counted as wrong', () => {
    const w = T.wrongVoice({ groups: [
      { role: 'target2', status: 'drift', slots: 250, tbl: 'course_seeds', col: 'target2_audio_id', voice_id: ALESSANDRA, resolved: LORENZO },
      { role: 'target2', status: 'ok', slots: 900 },
      { role: 'target1', status: 'human', slots: 10 },
      { role: 'target1', status: 'refused', slots: 4 },
      { role: 'known', status: 'no-ruling', slots: 3 },
    ] })
    expect([w.wrong, w.uncast, w.noRuling, w.byRole.target2.wrong, w.byRole.target1.wrong]).toEqual([250, 4, 3, 250, 0])
    expect(w.byRole.target2.examples[0]).toContain(LORENZO)
  })
  it('the twin query compares FILES and the tool passes the SQL lint (no cast on a key column)', () => {
    expect(T.twinSql('course_seeds', null)).toMatch(/a1\.s3_key = a2\.s3_key/)
    expect(lintSql(fs.readFileSync(path.join(__dirname, 'twin-check.cjs'), 'utf8')).filter((f) => f.rule === 'key-cast')).toEqual([])
  })
})
