#!/usr/bin/env node
/**
 * ita-blind-ab-find.cjs — job #842 candidate search: practice phrases (ita_for_eng, one Cartesia voice) that can be rebuilt from
 * chunks cut out of OTHER existing whole takes of the same voice, at LEGO boundaries, each chunk in the same slot
 * (first / middle / last) it holds in its source take. Read-only; no TTS.   node tools/audio/ita-blind-ab-find.cjs <out.json>
 */
const fs = require('fs'), path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env.psql') })
const { Client } = require('pg')
const VOICE = 'cartesia_0e21713a-5e9a-428a-bed4-90d410b87f13'
const norm = (w) => String(w).toLowerCase().replace(/[^\p{L}\p{N}\p{M}']/gu, '').replace(/’/g, "'")

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect()
  const { rows: takes } = await pg.query(`select id, text, word_timings, duration_ms, lego_id from course_audio where course_code='ita_for_eng' and voice_id=$1 and word_timings is not null and role='target1' and coalesce(file_size_bytes,9999)>2000`, [VOICE])
  const { rows: phr } = await pg.query(`select p.id pid, p.target_text, p.phrase_role, p.lego_index, p.seed_number, a.id aid from course_practice_phrases p join course_audio a on a.id=p.target1_audio_id where p.course_code='ita_for_eng' and a.voice_id=$1 and a.word_timings is not null and p.phrase_role in ('use','build')`, [VOICE])
  const { rows: legos } = await pg.query(`select target_text from course_legos where course_code='ita_for_eng'`)
  const legoSet = new Set(legos.map(l => l.target_text.split(/\s+/).map(norm).filter(Boolean).join(' ')))
  // exact-timing takes only: word list must equal tokenised text
  const T = takes.map(t => ({ id: t.id, text: t.text, w: t.word_timings.words.map(norm), wt: t.word_timings, dur: t.duration_ms })).filter(t => t.w.length && t.w.every(Boolean))
  // index: ngram string -> [{take, i, n}] for ngrams up to 5 words
  const idx = new Map()
  for (const t of T) for (let i = 0; i < t.w.length; i++) for (let n = 1; n <= 5 && i + n <= t.w.length; n++) {
    const k = t.w.slice(i, i + n).join(' '); if (!idx.has(k)) idx.set(k, []); idx.get(k).push({ t, i, n })
  }
  const byId = new Map(T.map(t => [t.id, t]))
  const out = []
  for (const p of phr) {
    const P = byId.get(p.aid); if (!P || P.w.length < 3 || P.w.length > 14) continue
    // allowed boundaries: word positions where a LEGO ngram of P starts or ends
    const b = new Set([0, P.w.length])
    for (let i = 0; i < P.w.length; i++) for (let n = 1; n <= 5 && i + n <= P.w.length; n++) if (legoSet.has(P.w.slice(i, i + n).join(' '))) { b.add(i); b.add(i + n) }
    const cuts = [...b].sort((x, y) => x - y)
    // chunk source lookup
    const src = (i, j) => {
      const n = j - i; if (n > 5) return null
      const slot = i === 0 ? 'first' : j === P.w.length ? 'last' : 'middle'
      const hits = (idx.get(P.w.slice(i, j).join(' ')) || []).filter(h => h.t.id !== P.id && h.t.text !== P.text && h.t.w.join(' ') !== P.w.join(' ') &&
        (slot === 'first' ? h.i === 0 && h.t.w.length > n : slot === 'last' ? h.i + h.n === h.t.w.length && h.i > 0 : h.i > 0 && h.i + h.n < h.t.w.length))
      return hits.length ? { slot, hit: hits[Math.floor(hits.length / 2)], hits: hits.length } : null
    }
    // fewest chunks (>=2), DP over cuts
    const best = { }
    const solve = (ci) => {
      if (cuts[ci] === P.w.length) return { n: 0, chunks: [] }
      if (best[ci]) return best[ci]
      let r = null
      for (let cj = ci + 1; cj < cuts.length; cj++) {
        const s = src(cuts[ci], cuts[cj]); if (!s) continue
        const rest = solve(cj); if (!rest) continue
        const cand = { n: rest.n + 1, chunks: [{ from: cuts[ci], to: cuts[cj], ...s }, ...rest.chunks] }
        if (!r || cand.n < r.n) r = cand
      }
      return (best[ci] = r)
    }
    const r = solve(0)
    if (!r || r.n < 2 || r.n > 4) continue
    out.push({ pid: p.pid, role: p.phrase_role, text: p.target_text, aid: P.id, nwords: P.w.length, chunks: r.chunks.map(c => ({ from: c.from, to: c.to, text: P.w.slice(c.from, c.to).join(' '), slot: c.slot, srcId: c.hit.t.id, srcText: c.hit.t.text, srcI: c.hit.i, srcN: c.hit.n })) })
  }
  fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1))
  console.log(phr.length, 'phrases;', out.length, 'rebuildable')
  await pg.end()
}
main().catch(e => { console.error(e); process.exit(1) })
