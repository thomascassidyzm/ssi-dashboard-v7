#!/usr/bin/env node
/**
 * GROUP THE UNNAMED HUMAN TAKES BY LIKELY SPEAKER (job #703, Tom 2026-09-29:
 * "where evidence is ambiguous, group by likely speaker and publish a short
 * listening sheet for Tom to name by ear; don't guess names").
 *
 *   node tools/voices/legacy-speaker-groups.cjs --fp fp.jsonl              # dry run: prints the groups
 *   node tools/voices/legacy-speaker-groups.cjs --fp fp.jsonl --apply      # writes human_speaker_groups + members
 *
 * Input: acoustic fingerprints from tools/voices/acoustic-fingerprint.cjs (pitch
 * + timbre per S3 object). A group is a set of clips that sound like one person
 * in one place in the course. It NEVER carries a name: the name is written by
 * tools/voices/name-speaker-group.cjs after a human has listened.
 *
 * HOW A SLOT IS SPLIT. A slot is (course, role) for the Welsh imports and
 * (role, voice) for the shared English instruction takes.
 *   - Where a clip's words locate it in the course (a LEGO, a practice phrase or
 *     the seed sentence), clips are bucketed into windows of 10 seeds. A window's
 *     centroid averages ~40 clips, which cancels the phoneme-to-phoneme noise of
 *     a one-word clip; adjacent windows of one speaker sit 1–2.5 apart, a change
 *     of speaker 4–6 (cym_s target1, seeds 120→130: 6.0). Windows are then
 *     merged by average linkage until the nearest pair is more than
 *     WINDOW_MERGE_DISTANCE apart. A group under MIN_GROUP_SHARE of the slot is
 *     absorbed into its nearest neighbour — one odd window is a bad day, not a person.
 *   - A clip whose words are not in the course (12% of them) joins the nearest group by sound.
 *   - A slot with no course positions at all is split by k-means only if the
 *     split is clean (silhouette >= KMEANS_MIN_SILHOUETTE); otherwise it is one group.
 * est_gender is the group's median pitch — evidence for the sheet, never a name
 * and never written to a voice.
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const args = process.argv.slice(2)
const arg = (n, d = null) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const WINDOW_SEEDS = 10
const MIN_WINDOW_CLIPS = 8
const WINDOW_MERGE_DISTANCE = 3.2
const MIN_GROUP_SHARE = 0.04
const KMEANS_MIN_SILHOUETTE = 0.28
const LTAS_WEIGHT = 0.35
const SAMPLES_PER_GROUP = 5

const vecOf = d => [12 * Math.log2(d.f0 / 100), ...d.ltas.map(x => x * LTAS_WEIGHT)]
const dist = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0))
const centroid = vs => vs[0].map((_, i) => vs.reduce((s, v) => s + v[i], 0) / vs.length)
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
const f0OfVec = v => 100 * Math.pow(2, v[0] / 12)
const normText = t => String(t || '').trim().toLowerCase().replace(/[.!]+$/, '')

/** Average-linkage merge of items ({ c: centroid, n: weight, members }) until the nearest pair is >= threshold. */
function agglomerate(items, threshold) {
  let cl = items.map(i => ({ c: i.c, n: i.n, members: [i] }))
  const linkage = (a, b) => {
    let s = 0, w = 0
    for (const x of a.members) for (const y of b.members) { s += dist(x.c, y.c) * x.n * y.n; w += x.n * y.n }
    return s / w
  }
  for (;;) {
    let best = null
    for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) {
      const d = linkage(cl[i], cl[j])
      if (!best || d < best.d) best = { i, j, d }
    }
    if (!best || best.d >= threshold) break
    const a = cl[best.i], b = cl[best.j]
    const members = [...a.members, ...b.members]
    const n = members.reduce((s, m) => s + m.n, 0)
    const c = a.c.map((_, k) => members.reduce((s, m) => s + m.c[k] * m.n, 0) / n)
    cl = cl.filter((_, k) => k !== best.i && k !== best.j).concat({ c, n, members })
  }
  return cl
}

/** Split one slot's clips into groups. clips: [{ id, key, vec, seed|null }]. Pure — tested. */
function splitSlot(clips) {
  const usable = clips.filter(c => c.vec)
  if (usable.length < 20) return { groups: [{ clips: usable, basis: 'too-few-to-split' }], unusable: clips.length - usable.length }
  const seeded = usable.filter(c => c.seed != null)
  let groups
  if (seeded.length >= 0.5 * usable.length) {
    const wins = new Map()
    for (const c of seeded) { const w = Math.floor(c.seed / WINDOW_SEEDS); (wins.get(w) || wins.set(w, []).get(w)).push(c) }
    const items = [...wins.entries()].filter(([, cs]) => cs.length >= MIN_WINDOW_CLIPS).map(([w, cs]) => ({ w, c: centroid(cs.map(x => x.vec)), n: cs.length, cs }))
    let merged = agglomerate(items, WINDOW_MERGE_DISTANCE)
    // a group under MIN_GROUP_SHARE is absorbed into its nearest neighbour
    for (;;) {
      const total = merged.reduce((s, g) => s + g.n, 0)
      const small = merged.filter(g => g.n < MIN_GROUP_SHARE * total).sort((a, b) => a.n - b.n)[0]
      if (!small || merged.length < 2) break
      const others = merged.filter(g => g !== small)
      const near = others.sort((a, b) => dist(a.c, small.c) - dist(b.c, small.c))[0]
      near.members.push(...small.members); near.n += small.n
      near.c = near.c.map((_, k) => near.members.reduce((s, m) => s + m.c[k] * m.n, 0) / near.n)
      merged = merged.filter(g => g !== small)
    }
    groups = merged.map(g => ({ c: g.c, windows: new Set(g.members.map(m => m.w)), clips: [], basis: 'seed-block' }))
    for (const c of usable) {
      let g = null
      if (c.seed != null) g = groups.find(x => x.windows.has(Math.floor(c.seed / WINDOW_SEEDS)))
      if (g) { g.clips.push(c); continue }
      const near = groups.slice().sort((a, b) => dist(a.c, c.vec) - dist(b.c, c.vec))[0]
      near.clips.push({ ...c, basisOverride: 'acoustic-nearest' })
    }
  } else {
    groups = [{ clips: usable, basis: 'one-voice' }]
    const two = kmeans2(usable.map(c => c.vec))
    if (two && two.silhouette >= KMEANS_MIN_SILHOUETTE) {
      groups = [0, 1].map(k => ({ clips: usable.filter((_, i) => two.labels[i] === k), basis: 'acoustic-kmeans' })).filter(g => g.clips.length)
    }
  }
  return { groups, unusable: clips.length - usable.length }
}

function kmeans2(X) {
  if (X.length < 40) return null
  let a = X[0], b = X.reduce((far, x) => (dist(x, a) > dist(far, a) ? x : far), X[0])
  let labels = []
  for (let it = 0; it < 30; it++) {
    labels = X.map(x => (dist(x, a) <= dist(x, b) ? 0 : 1))
    const A = X.filter((_, i) => labels[i] === 0), B = X.filter((_, i) => labels[i] === 1)
    if (!A.length || !B.length) return null
    a = centroid(A); b = centroid(B)
  }
  const sample = X.map((_, i) => i).filter((_, i) => i % Math.ceil(X.length / 300) === 0)
  let s = 0, n = 0
  for (const i of sample) {
    const own = sample.filter(j => j !== i && labels[j] === labels[i]), other = sample.filter(j => labels[j] !== labels[i])
    if (!own.length || !other.length) continue
    const av = arr => arr.reduce((t, j) => t + dist(X[i], X[j]), 0) / arr.length
    const A = av(own), B = av(other)
    s += (B - A) / Math.max(A, B); n++
  }
  return { labels, silhouette: n ? s / n : 0 }
}

const genderOf = f0 => (f0 < 165 ? 'm' : f0 >= 185 ? 'f' : null)

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const m = fs.readFileSync(path.join(__dirname, '..', '..', '.env.psql'), 'utf8').match(/DATABASE_URL=["']?([^"'\n]+)/)
  if (!m) throw new Error('DATABASE_URL not found')
  return m[1]
}

async function main() {
  const fpFile = arg('--fp')
  if (!fpFile) { console.error('usage: --fp fp.jsonl [--apply]'); process.exit(2) }
  const apply = args.includes('--apply')
  const fp = new Map()
  for (const l of fs.readFileSync(fpFile, 'utf8').split('\n').filter(Boolean)) {
    const d = JSON.parse(l)
    if (d.ok && d.secs >= 1.0 && d.voicedFrac >= 0.25) fp.set(d.key, d)
  }
  const client = new Client({ connectionString: databaseUrl(), statement_timeout: 120000 })
  await client.connect()
  try {
    const { rows } = await client.query(
      `SELECT id, course_code, role, voice_id, s3_key, text, duration_ms, language FROM course_audio
        WHERE origin = 'human' AND voice_id IN ('legacy_import', 'human', 'human_recording')`)
    // where a clip's words sit in the course: the earliest seed any LEGO, phrase or seed sentence with those words belongs to
    const seedOf = new Map()
    const { rows: sm } = await client.query(
      `SELECT course_code, side, t, min(sn) AS sn FROM (
         SELECT course_code, 'target' side, lower(regexp_replace(trim(target_text), '[.!]+$', '')) t, seed_number sn FROM course_legos WHERE course_code IN (SELECT DISTINCT course_code FROM course_audio WHERE origin='human' AND voice_id = 'legacy_import')
         UNION ALL SELECT course_code, 'target', lower(regexp_replace(trim(target_text), '[.!]+$', '')), seed_number FROM course_practice_phrases WHERE course_code IN (SELECT DISTINCT course_code FROM course_audio WHERE origin='human' AND voice_id = 'legacy_import')
         UNION ALL SELECT course_code, 'target', lower(regexp_replace(trim(target_text), '[.!]+$', '')), seed_number FROM course_seeds WHERE course_code IN (SELECT DISTINCT course_code FROM course_audio WHERE origin='human' AND voice_id = 'legacy_import')
         UNION ALL SELECT course_code, 'known', lower(regexp_replace(trim(known_text), '[.!]+$', '')), seed_number FROM course_legos WHERE known_text IS NOT NULL AND course_code IN (SELECT DISTINCT course_code FROM course_audio WHERE origin='human' AND voice_id = 'legacy_import')
         UNION ALL SELECT course_code, 'known', lower(regexp_replace(trim(known_text), '[.!]+$', '')), seed_number FROM course_practice_phrases WHERE known_text IS NOT NULL AND course_code IN (SELECT DISTINCT course_code FROM course_audio WHERE origin='human' AND voice_id = 'legacy_import')
         UNION ALL SELECT course_code, 'known', lower(regexp_replace(trim(known_text), '[.!]+$', '')), seed_number FROM course_seeds WHERE known_text IS NOT NULL AND course_code IN (SELECT DISTINCT course_code FROM course_audio WHERE origin='human' AND voice_id = 'legacy_import')
       ) x GROUP BY 1, 2, 3`)
    for (const r of sm) seedOf.set(`${r.course_code}|${r.side}|${r.t}`, Number(r.sn))

    // slots
    const slots = new Map()
    for (const r of rows) {
      const shared = r.voice_id !== 'legacy_import'
      const slot = shared ? `shared.${r.role}.${r.voice_id}` : `${r.course_code}.${r.role}`
      const d = fp.get(r.s3_key)
      const seed = shared ? null : seedOf.get(`${r.course_code}|${r.role === 'known' ? 'known' : 'target'}|${normText(r.text)}`)
      ;(slots.get(slot) || slots.set(slot, []).get(slot)).push({ id: r.id, key: r.s3_key, course: r.course_code, role: r.role, lang: r.language, voice_id: r.voice_id, vec: d ? vecOf(d) : null, f0: d ? d.f0 : null, seed: seed == null ? null : seed, text: r.text, ms: r.duration_ms })
    }

    const out = []
    for (const [slot, clips] of [...slots.entries()].sort()) {
      if (/presentation$/.test(slot)) { /* English presenter — split like any other slot */ }
      const { groups, unusable } = splitSlot(clips)
      groups.sort((a, b) => (median(a.clips.filter(c => c.seed != null).map(c => c.seed)) || 0) - (median(b.clips.filter(c => c.seed != null).map(c => c.seed)) || 0))
      groups.forEach((g, i) => {
        const cs = g.clips
        if (!cs.length) return
        const c = centroid(cs.map(x => x.vec)), f0 = median(cs.map(x => x.f0))
        const seeds = cs.map(x => x.seed).filter(s => s != null)
        const samples = cs.filter(x => x.ms && x.ms >= 1200 && x.ms <= 6000).sort((a, b) => dist(a.vec, c) - dist(b.vec, c)).slice(0, SAMPLES_PER_GROUP)
        out.push({ group_id: `${slot}.g${i + 1}`, slot, course: cs[0].course, role: cs[0].role, lang: cs[0].lang, n: cs.length, unusableInSlot: unusable, f0, gender: genderOf(f0),
          seedRange: seeds.length ? [Math.min(...seeds), Math.max(...seeds)] : null, basis: g.basis, samples: samples.map(s => s.id), clips: cs })
      })
    }
    for (const g of out) console.log(`${g.group_id.padEnd(44)} n=${String(g.n).padStart(5)} f0=${String(Math.round(g.f0)).padStart(3)}Hz gender≈${g.gender || '?'} seeds=${g.seedRange ? g.seedRange.join('-') : '-'} (${g.basis})`)
    if (!apply) { console.log('\ndry run — nothing written. --apply to write.'); return }

    await client.query('BEGIN')
    await client.query('DELETE FROM human_speaker_group_members WHERE group_id IN (SELECT group_id FROM human_speaker_groups WHERE voice_id IS NULL)')
    await client.query('DELETE FROM human_speaker_groups WHERE voice_id IS NULL')
    for (const g of out) {
      await client.query(
        `INSERT INTO human_speaker_groups (group_id, course_code, role, language, est_gender, f0_median_hz, clip_count, sample_audio_ids)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::uuid[]) ON CONFLICT (group_id) DO NOTHING`,
        [g.group_id, g.course, g.role, g.lang, g.gender, g.f0.toFixed(1), g.n, g.samples])
      for (let k = 0; k < g.clips.length; k += 1000) {
        const b = g.clips.slice(k, k + 1000)
        await client.query(
          `INSERT INTO human_speaker_group_members (audio_id, group_id, basis) SELECT * FROM unnest($1::uuid[], $2::text[], $3::text[])
           ON CONFLICT (audio_id) DO UPDATE SET group_id = excluded.group_id, basis = excluded.basis`,
          [b.map(c => c.id), b.map(() => g.group_id), b.map(c => c.basisOverride || g.basis)])
      }
    }
    await client.query('COMMIT')
    console.log(`\nwrote ${out.length} groups`)
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e } finally { await client.end() }
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1) })
module.exports = { splitSlot, agglomerate, vecOf, genderOf }
