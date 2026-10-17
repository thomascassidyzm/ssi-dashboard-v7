#!/usr/bin/env node
/**
 * COURSE AUDIO REPORT (job #837, Tom 2026-10-17): "what has been done recently in terms of per-course audio, which voice fills
 * which slots now, and which other voices are available". READ-ONLY: it reads, it never points, renders or deletes anything.
 *
 *   node tools/audio/course-audio-report.cjs --course spa_mx_for_eng [--publish] [--days 14] [--explain-day 2026-10-12]
 *   node tools/audio/course-audio-report.cjs --premium11 [--publish]
 *
 * Built on voice-audit (slot classification against resolveVoice, clipCensus). The app plays only the slot pointer
 * (*_audio_id), so:
 *   SLOTS   per role (known, target1, target2, intros) how many slots each voice fills NOW, the cast voice flagged, and per voice
 *           how many of those slots have the SAME text in ANOTHER voice sitting in course_audio for this course, unpointed.
 *   RECENT  per day, last N days: clips made per role/voice and how many of them some slot points at.
 *   EXPLAIN (--explain-day) why cast-voice clips made that day are unpointed: the slots that carry the same text, and what they play.
 * --publish posts the page through the surface publish route (one page per course); needs CS_CONV_TOKEN / CS_CONV_ID in the env.
 */
const va = require('./voice-audit.cjs')
const rv = require('../../services/shared/resolve-voice.cjs')

const ROLE_LABEL = Object.freeze({ known: 'Known (English prompt)', target1: 'Target 1 (female)', target2: 'Target 2 (male)', presentation: 'Intros' })
const ROLES = Object.freeze(['known', 'target1', 'target2', 'presentation'])
const short = (v) => (v ? String(v).replace(/^cartesia_/, 'cartesia ').replace(/^azure_/, 'azure ').slice(0, 30) : 'none ruled')
const n = (x) => Number(x).toLocaleString('en-GB')

/** Pure. Fold classify groups into { role: [{voice, slots, isCast, human, alts:{}, altSlots}] }, biggest first. */
function slotTable(groups) {
  const out = {}
  for (const g of groups) {
    const rows = (out[g.role] ||= new Map())
    const cur = rows.get(g.voice_id) || { voice: g.voice_id, slots: 0, isCast: false, human: g.status === 'human', alts: {}, altSlots: 0 }
    cur.slots += g.slots; cur.isCast = cur.isCast || g.status === 'ok'
    rows.set(g.voice_id, cur)
  }
  return Object.fromEntries(Object.entries(out).map(([k, m]) => [k, [...m.values()].sort((x, y) => y.slots - x.slots)]))
}

/** Pure. Keep the last `days` days (inclusive of today) of clipCensus rows, grouped by day, newest first. */
function recentByDay(census, days, today = new Date()) {
  const cut = new Date(today.getTime() - (days - 1) * 864e5).toISOString().slice(0, 10)
  const by = new Map()
  for (const r of census) if (r.day >= cut) { if (!by.has(r.day)) by.set(r.day, []); by.get(r.day).push(r) }
  return [...by.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
}

/** Pure. Bucket an explain row: why is this cast clip unpointed? */
function whyUnpointed(r) {
  if (!Number(r.matching_slots)) return 'no slot carries this text now (the text was changed or removed since, or it is an intro)'
  if (Number(r.slots_on_cast) === Number(r.matching_slots)) return 'every slot with this text already plays another clip in the cast voice (a duplicate take)'
  if (Number(r.slots_on_other)) return 'a slot with this text still plays another voice (a real pointer gap)'
  return 'a slot with this text has no clip at all (empty pointer)'
}

const pointedCte = () => {
  const ptrs = []
  for (const [tbl, cols] of Object.entries(va.SLOT_COLUMNS)) for (const col of cols) ptrs.push(`select ${va.ptr(tbl, col)} id from ${tbl} x where x.course_code = $1 and x.${col} is not null`)
  return `p as (select distinct id from (${ptrs.join(' union all ')}) u)`
}

/**
 * Per (role, slot voice): the slots whose text also exists, UNPOINTED, in another voice of this course. One pass: the unpointed
 * clips fold to one voices[] per (language, text, role), join to the slots, and group by the other-voices set, so a slot with two
 * alternatives counts once in `altSlots` and once under each voice in `alts`. Returns [{role, voice_id, others:[...], slots}].
 */
async function altGroups(pg, code) {
  const parts = []
  for (const [tbl, cols] of Object.entries(va.SLOT_COLUMNS)) for (const col of cols) {
    const role = rv.roleOfColumn(col)
    parts.push(`select '${role}' role, ca.voice_id, array_remove(a.voices, ca.voice_id) others, count(*)::int slots from ${tbl} x
      join course_audio ca on ca.id = ${va.ptr(tbl, col)}
      join alts a on a.language = ca.language and a.text_normalized = ca.text_normalized and a.role = '${role}'
      where x.course_code = $1 and cardinality(array_remove(a.voices, ca.voice_id)) > 0 group by 1, 2, 3`)
  }
  const alts = `alts as (select c.language, c.text_normalized, c.role, array_agg(distinct c.voice_id) voices from course_audio c
    left join p on p.id = c.id where c.course_code = $1 and c.role in ('known','target1','target2','presentation') and ${va.usable('c')} and p.id is null group by 1, 2, 3)`
  const { rows } = await pg.query(`with ${pointedCte()}, ${alts} select role, voice_id, others, sum(slots)::int slots from (${parts.join(' union all ')}) z group by 1, 2, 3`, [code])
  return rows
}

/** Cast-voice clips made on `day` that no slot points at, with what the slots carrying their text play. */
async function explainDay(pg, code, day, castByRole) {
  const slotSel = []
  for (const [tbl, cols] of Object.entries(va.SLOT_COLUMNS)) for (const col of cols) {
    const role = rv.roleOfColumn(col)
    if (role === 'presentation') continue
    const txt = role === 'known' ? 'known_text' : 'target_text'
    slotSel.push(`select '${role}' role, x.seed_number, lower(trim(x.${txt})) txt, x.${col} ptr from ${tbl} x where x.course_code = $1`)
  }
  const pairs = Object.entries(castByRole).filter(([r, v]) => v && r !== 'presentation').map(([r, v]) => `(ca.role = '${r}' and ca.voice_id = '${String(v).replace(/'/g, '')}')`).join(' or ')
  if (!pairs) return []
  const { rows } = await pg.query(`with ${pointedCte()},
    s as (${slotSel.join(' union all ')}),
    u as (select ca.id, ca.role, ca.text_normalized, ca.voice_id from course_audio ca where ca.course_code = $1 and to_char(date_trunc('day', ca.created_at), 'YYYY-MM-DD') = $2
      and (${pairs}) and ${va.usable('ca')} and not exists (select 1 from p where p.id = ca.id))
    select u.id, u.role, count(s.role)::int matching_slots,
      count(*) filter (where s.ptr is not null and c2.voice_id = u.voice_id)::int slots_on_cast,
      count(*) filter (where s.ptr is not null and c2.voice_id <> u.voice_id)::int slots_on_other,
      (array_agg(distinct s.seed_number order by s.seed_number) filter (where s.seed_number is not null))[1:12] sample_seeds
    from u left join s on s.role = u.role and s.txt = u.text_normalized
    left join course_audio c2 on c2.id = s.ptr
    group by u.id, u.role`, [code, day])
  return rows
}

/** Pure. The plain-English page. */
function renderPage(code, d) {
  const L = [`# ${code} — audio slots and recent work`, '', `Read-only report, ${d.when}. The app plays only what each slot points at, so "filled by" means the clip a slot points at right now. Nothing was changed.`, '', '## 1. Who fills the slots now', '']
  for (const role of ROLES) {
    const rows = d.slots[role] || []
    if (!rows.length) continue
    const total = rows.reduce((a, r) => a + r.slots, 0)
    L.push(`### ${ROLE_LABEL[role]} — ${n(total)} slots filled`, '', `Cast voice: **${short(d.cast[role])}**`, '', '| Voice | Slots | Share | Same text also available in another voice, unpointed |', '|---|---:|---:|---|')
    for (const r of rows) {
      const alts = Object.entries(r.alts).sort((a, b) => b[1] - a[1]).map(([v, c]) => `${short(v)}: ${n(c)}`).join('; ')
      L.push(`| ${short(r.voice)}${r.isCast ? ' ⭐ cast' : ''}${r.human ? ' (human)' : ''} | ${n(r.slots)} | ${(100 * r.slots / total).toFixed(1)}% | ${r.altSlots ? `${n(r.altSlots)} slots — ${alts}` : 'none'} |`)
    }
    L.push('')
  }
  L.push(`## 2. Last ${d.days} days of clips made`, '', 'Per day: clips created in this course, by role and voice, and how many a slot actually points at ("pointed"). Unpointed means it exists but the app will not play it.', '')
  if (!d.recent.length) L.push('_No clips made in this window._', '')
  for (const [day, rows] of d.recent) {
    const tot = rows.reduce((a, r) => a + Number(r.clips), 0), pt = rows.reduce((a, r) => a + Number(r.pointed), 0)
    L.push(`**${day}** — ${n(tot)} clips, ${n(pt)} pointed, ${n(tot - pt)} unpointed`)
    for (const r of rows) L.push(`- ${ROLE_LABEL[r.role] || r.role}: ${short(r.voice_id)}${r.voice_id === d.cast[r.role] ? ' ⭐' : ''} — ${n(r.clips)} clips, ${n(r.pointed)} pointed`)
    L.push('')
  }
  if (d.explain) L.push(`## 3. Why the cast-voice clips from ${d.explain.day} are unpointed`, '', d.explain.text, '')
  return L.join('\n')
}

function explainText(day, rows) {
  if (!rows.length) return `No unpointed cast-voice clips were made on ${day}.`
  const by = new Map()
  for (const r of rows) { const k = whyUnpointed(r); const e = by.get(k) || { n: 0, seeds: new Set() }; e.n++; for (const s of r.sample_seeds || []) e.seeds.add(s); by.set(k, e) }
  const L = [`${rows.length} cast-voice clips made on ${day} are not pointed at by any slot:`, '']
  for (const [k, e] of [...by.entries()].sort((a, b) => b[1].n - a[1].n)) L.push(`- **${e.n}** — ${k}${e.seeds.size ? `. Seeds (sample): ${[...e.seeds].sort((a, b) => a - b).slice(0, 15).join(', ')}` : ''}`)
  return L.join('\n')
}

async function publish(title, content) {
  const r = await fetch('http://localhost:4317/api/publish-doc', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cs-conv': process.env.CS_CONV_TOKEN || '' }, body: JSON.stringify({ title, content, conv_id: process.env.CS_CONV_ID || undefined }) })
  return r.json()
}

async function reportFor(pg, db, cast, code, { days, explainDay: ed }) {
  const course = await rv.loadCourse(db, code)
  const cl = va.classify(course, await va.groupedSlots(pg, code), cast)
  const castByRole = {}
  for (const g of cl.groups) if (g.resolved && !castByRole[g.role]) castByRole[g.role] = g.resolved
  const slots = slotTable(cl.groups)
  for (const g of await altGroups(pg, code)) {
    const r = slots[g.role] && slots[g.role].find((x) => x.voice === g.voice_id); if (!r) continue
    r.altSlots += g.slots
    for (const v of g.others) r.alts[v] = (r.alts[v] || 0) + g.slots
  }
  const d = { slots, cast: castByRole, recent: recentByDay(await va.clipCensus(pg, code), days), days, when: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC' }
  if (ed) { const rows = await explainDay(pg, code, ed, castByRole); d.explain = { day: ed, rows, text: explainText(ed, rows) } }
  return d
}

async function main(argv = process.argv.slice(2)) {
  const opt = (f, dflt) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : dflt }, has = (f) => argv.includes(f)
  const codes = has('--premium11') ? va.PREMIUM_11 : String(opt('--course', '')).split(',').filter(Boolean)
  if (!codes.length) throw new Error('name --course <code> or --premium11')
  const { pg, db } = await va.connect()
  try {
    const cast = await rv.loadCast(db), out = {}
    for (const code of codes) {
      const d = await reportFor(pg, db, cast, code, { days: Number(opt('--days', 14)), explainDay: opt('--explain-day', null) })
      const page = renderPage(code, d)
      out[code] = page
      if (has('--publish')) { const r = await publish(`${code} audio slots and recent work`, page); console.log(`${code}\t${r.url || JSON.stringify(r)}`) }
      else console.log(page)
    }
    return out
  } finally { await pg.end() }
}

if (require.main === module) main().catch((e) => { console.error(e.message || e); process.exit(1) })
module.exports = { slotTable, recentByDay, whyUnpointed, explainText, renderPage, main }
