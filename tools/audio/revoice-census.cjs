#!/usr/bin/env node
/**
 * RE-VOICE CENSUS + PLAN (job #113, Tom 2026-10-12 ~20:20Z, r-2026-10-12-ssi-audio-revision-of-existing-courses):
 *   "we ARE using Charlotte for all female English voices, Tom for all male English voices, and Tom for the intros in all courses where
 *    English is the known language. so when English is the target language- BOTH Tom and Charlotte's clips are needed. and also Tom and
 *    Charlotte should do the POD-1 voices. Tom and Aran do POD-2"
 *
 * READ-ONLY. Per live/beta course, every English slot that is NOT on its ruled voice, split into four categories:
 *   prompts   X_for_eng known slots                         -> Tom-006            (owner: #813, running)
 *   intros    X_for_eng presentation slots                  -> Tom-006 whole read (owner: #836 for the 11 premium courses, else #113)
 *   engTarget eng_for_X target1 -> Charlotte, target2 -> Tom-006 (slot gender, resolveVoice 'english-target'; target2 owner #813)
 *   pods      serving pod-1 English lines by speaker gender -> Charlotte (f) / Tom-006 (m)
 * and for each: how many distinct texts already exist in the ruled voice anywhere in the library (reuse, free) and how many genuinely need a
 * render, with characters. A text is charged ONCE estate-wide, to the first course in plan order that needs it: English is shared across
 * courses, so every later course reuses it. Human recordings are never counted (never outranked). Also counts the absolute-rule breach:
 * any Tom-006 clip whose language is not English.
 *
 *   node tools/audio/revoice-census.cjs [--json out.json] [--headroom 0.3] [--cap 1000000]
 */
const fs = require('fs'), path = require('path')
for (const p of [path.join(__dirname, '../../.env.psql'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env.psql']) if (fs.existsSync(p)) { require('dotenv').config({ path: p, quiet: true }); break }

const TOM_006 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const CHARLOTTE = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121'
const bare = v => v.replace(/^cartesia_/, '')
const SLOT_ALL = ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id']
const PREMIUM_11 = ['fra_for_eng', 'spa_for_eng', 'spa_mx_for_eng', 'deu_for_eng', 'zho_for_eng', 'ara_for_eng', 'por_for_eng', 'por_br_for_eng', 'kor_for_eng', 'jpn_for_eng', 'ita_for_eng']

/** Pure. Which category a slot is in, its ruled voice and owning job; null = not an English slot this ruling governs. */
function ruleFor({ course, knownLang, targetLang, col, speakerGender = null }) {
  const xForEng = knownLang === 'eng' && targetLang !== 'eng'
  const engForX = targetLang === 'eng' && knownLang !== 'eng'
  if (col === 'pod') return speakerGender === 'f' ? { cat: 'pods', voice: CHARLOTTE, owner: '#113' } : speakerGender === 'm' ? { cat: 'pods', voice: TOM_006, owner: '#113' } : { cat: 'pods', voice: null, owner: '#113' }
  if (xForEng && col === 'known_audio_id') return { cat: 'prompts', voice: TOM_006, owner: '#813' }
  if (xForEng && col === 'presentation_audio_id') return { cat: 'intros', voice: TOM_006, owner: PREMIUM_11.includes(course) ? '#836' : '#113' }
  if (engForX && col === 'target1_audio_id') return { cat: 'engTarget', voice: CHARLOTTE, owner: '#113' }
  if (engForX && col === 'target2_audio_id') return { cat: 'engTarget', voice: TOM_006, owner: '#813' }
  return null
}

/**
 * Pure. Charge each (voice, text) to render once, in course order; everything else is reuse. `items` rows:
 * {course, cat, owner, voice, t (normalised text), chars, slots, inLibrary}. Returns per-course x category totals.
 */
function chargeInOrder(order, items) {
  const charged = new Set(), out = {}
  const byCourse = new Map(); for (const it of items) { if (!byCourse.has(it.course)) byCourse.set(it.course, []); byCourse.get(it.course).push(it) }
  for (const course of order) for (const it of byCourse.get(course) || []) {
    const k = `${it.cat}|${it.owner}`; const o = ((out[course] = out[course] || {})[k] = out[course][k] || { slots: 0, texts: 0, reuseTexts: 0, renderTexts: 0, renderChars: 0, undetermined: 0 })
    o.slots += it.slots; o.texts++
    if (!it.voice) { o.undetermined += it.slots; continue }
    const key = `${it.voice}|${it.cat === 'intros' ? 'i' : ''}|${it.t}`
    if (it.inLibrary || charged.has(key)) o.reuseTexts++
    else { charged.add(key); o.renderTexts++; o.renderChars += it.chars }
  }
  return out
}

async function main(argv = process.argv.slice(2)) {
  const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
  const { Client } = require('pg')
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect(); await pg.query('set statement_timeout=0')
  try {
    const { rows: courses } = await pg.query(`select c.course_code, c.known_lang, c.target_lang, c.new_app_status,
        (select count(*) from course_enrollments e where e.course_id = c.course_code and e.last_practiced_at > now() - interval '30 days')::int active30,
        (select percentile_disc(0.9) within group (order by e.highest_completed_seed) from course_enrollments e where e.course_id = c.course_code and e.last_practiced_at > now() - interval '30 days') p90seed
      from courses c where c.new_app_status in ('live','beta') and (c.known_lang = 'eng' or c.target_lang = 'eng') order by 1`)
    const meta = new Map(courses.map(c => [c.course_code, c]))
    const codes = courses.map(c => c.course_code)

    // every English slot of every live/beta course: (course, col, clip) with slot count and first seed. One query per course and
    // English-side column (an estate-wide union ran past 10 minutes; per course each is an index scan on course_code).
    const slotRows = []
    for (const c of courses) {
      const cols = c.known_lang === 'eng' ? ['known_audio_id', 'presentation_audio_id'] : ['target1_audio_id', 'target2_audio_id']
      for (const [tbl, has] of Object.entries({ course_seeds: ['known_audio_id', 'target1_audio_id', 'target2_audio_id'], course_legos: SLOT_ALL, course_practice_phrases: SLOT_ALL }))
        for (const col of cols.filter(x => has.includes(x))) {
          const aid = tbl === 'course_legos' && col === 'presentation_audio_id' ? `nullif(x.${col}, '')::uuid` : `x.${col}`
          const { rows } = await pg.query(`with g as (select ${aid} aid, count(*)::int slots, min(x.seed_number) pos from ${tbl} x where x.course_code = $1 and x.${col} is not null
              ${tbl === 'course_practice_phrases' && col === 'presentation_audio_id' ? "and x.phrase_role is distinct from 'component'" : ''} group by 1)
            select $1::text course_code, '${col}' col, g.slots, g.pos, ca.voice_id, ca.text_normalized t, length(ca.text) chars, ca.origin
            from g join course_audio ca on ca.id = g.aid where ca.language in ('eng', 'en')`, [c.course_code])
          slotRows.push(...rows)
        }
      process.stderr.write(`${c.course_code} `)
    }

    // pods: the serving pod-1's English side, per sentence speaker (X_for_eng: known side; eng_for_X: target side)
    const { rows: podRows } = await pg.query(`with p as (select lp.id, lp.course_code, lp.speakers from serving_pod sp join listening_pods lp on lp.id = sp.pod_id where sp.course_code = any($1) and sp.slug = 'pod-1'),
        ids as (select p.course_code, s.speaker, p.speakers, s.global_order pos, unnest(array_remove(array[s.known_audio_id, s.target_audio_id] || coalesce(s.sentence_known_audio_ids, '{}') || coalesce(s.sentence_audio_ids, '{}') || coalesce(s.takeg_audio_ids, '{}'), null)) aid
          from p join listening_pod_sentences s on s.pod_id = p.id),
        g as (select course_code, speaker, speakers, aid, count(*)::int slots, min(pos) pos from ids group by 1, 2, 3, 4)
      select g.course_code, 'pod' col, g.slots, g.pos, g.speakers -> g.speaker ->> 'gender' gender, ca.voice_id, ca.text_normalized t, length(ca.text) chars, ca.origin
      from g join course_audio ca on ca.id = g.aid where ca.language in ('eng', 'en')`, [codes])

    // the slots off their ruled voice, grouped to (course, category, owner, voice, text)
    const want = new Map(), done = {}
    for (const r of [...slotRows, ...podRows]) {
      const c = meta.get(r.course_code); if (!c || r.origin === 'human') continue
      const rule = ruleFor({ course: r.course_code, knownLang: c.known_lang, targetLang: c.target_lang, col: r.col, speakerGender: r.gender })
      if (!rule) continue
      const onVoice = rule.voice && (r.voice_id === rule.voice || r.voice_id === bare(rule.voice))
      const dk = `${r.course_code}|${rule.cat}|${rule.owner}`; done[dk] = done[dk] || { ok: 0, off: 0 }
      if (onVoice) { done[dk].ok += r.slots; continue }
      done[dk].off += r.slots
      const k = `${r.course_code}|${rule.cat}|${rule.owner}|${rule.voice}|${r.t}`
      const it = want.get(k) || { course: r.course_code, cat: rule.cat, owner: rule.owner, voice: rule.voice, t: r.t, chars: r.chars || 0, slots: 0, pos: r.pos }
      it.slots += r.slots; want.set(k, it)
    }
    const items = [...want.values()]

    // library: which (voice, text) already exist in the ruled voice, usable, any course
    for (const v of [TOM_006, CHARLOTTE]) {
      const ts = [...new Set(items.filter(i => i.voice === v).map(i => i.t))]
      for (let i = 0; i < ts.length; i += 5000) {
        const { rows } = await pg.query(`select distinct text_normalized t from course_audio where voice_id = any($1) and language in ('eng','en') and text_normalized = any($2)
          and s3_key is not null and s3_key not like 'pending/%' and coalesce(duration_ms, 0) > 200`, [[v, bare(v)], ts.slice(i, i + 5000)])
        const hit = new Set(rows.map(r => r.t)); for (const it of items) if (it.voice === v && hit.has(it.t)) it.inLibrary = true
      }
    }

    // the absolute rule: Tom-006 never speaks non-English
    const { rows: [breach] } = await pg.query(`select count(*)::int clips, count(distinct language)::int langs, string_agg(distinct language, ',') languages from course_audio where voice_id = any($1) and language not in ('eng','en')`, [[TOM_006, bare(TOM_006)]])

    // PLAN ORDER: most active learners first; ties to the smaller course (fewer slots)
    const size = c => items.filter(i => i.course === c).reduce((n, i) => n + i.slots, 0)
    const order = [...codes].sort((a, b) => meta.get(b).active30 - meta.get(a).active30 || size(a) - size(b) || a.localeCompare(b))
    const charged = chargeInOrder(order, items)
    const cap = Number(opt('--cap', 1e6)), headroom = Number(opt('--headroom', 0.3))
    const result = { generatedAt: new Date().toISOString(), cap, headroom, perDay: Math.floor(cap * (1 - headroom)), tom006NonEnglish: breach, order: order.map(c => ({ course: c, ...meta.get(c), done: Object.fromEntries(Object.entries(done).filter(([k]) => k.startsWith(c + '|')).map(([k, v]) => [k.split('|').slice(1).join('|'), v])), plan: charged[c] || {} })) }
    if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(result, null, 1))
    const tot = {}
    for (const c of result.order) for (const [k, v] of Object.entries(c.plan)) { const t = (tot[k] = tot[k] || { slots: 0, reuseTexts: 0, renderTexts: 0, renderChars: 0, undetermined: 0 }); for (const f of Object.keys(t)) t[f] += v[f] }
    console.log(JSON.stringify({ totals: tot, tom006NonEnglish: breach }, null, 1))
    return result
  } finally { await pg.end() }
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1) })
module.exports = { ruleFor, chargeInOrder, TOM_006, CHARLOTTE, PREMIUM_11 }
