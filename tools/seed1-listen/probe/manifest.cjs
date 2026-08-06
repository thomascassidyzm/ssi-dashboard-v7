const P = require('./paths.cjs')
require('dotenv').config({ path: P.psqlEnvPath })
/**
 * Build the fra_for_eng seed-1 listening manifest: every DISTINCT LIVE clip the
 * learner can reach from seed 1, carrying BOTH sides of its owning row (English +
 * French) so a human listening on a phone knows what they should be hearing.
 *
 * Resolution is by *_audio_id column, exactly as scripts/seed1-census/census.cjs —
 * NOT by course_audio.lego_id, which is null on most of these rows.
 */
const { Client } = require('pg'); const fs = require('fs')
const COURSE = process.env.LISTEN_COURSE || 'fra_for_eng'

const SQL = `
with links as (
  select 'seed' as src, s.seed_id as owner, 'known' as slot, s.known_audio_id as aid,
         s.known_text as owner_known, s.target_text as owner_target
    from course_seeds s where s.course_code=$1 and s.seed_number=1
  union all select 'seed', s.seed_id, 'target1', s.target1_audio_id, s.known_text, s.target_text from course_seeds s where s.course_code=$1 and s.seed_number=1
  union all select 'seed', s.seed_id, 'target2', s.target2_audio_id, s.known_text, s.target_text from course_seeds s where s.course_code=$1 and s.seed_number=1
  union all select 'lego', l.lego_id, 'known', l.known_audio_id, l.known_text, l.target_text from course_legos l where l.course_code=$1 and l.seed_number=1
  union all select 'lego', l.lego_id, 'target1', l.target1_audio_id, l.known_text, l.target_text from course_legos l where l.course_code=$1 and l.seed_number=1
  union all select 'lego', l.lego_id, 'target2', l.target2_audio_id, l.known_text, l.target_text from course_legos l where l.course_code=$1 and l.seed_number=1
  union all select 'lego', l.lego_id, 'presentation', nullif(l.presentation_audio_id,'')::uuid, l.known_text, l.target_text from course_legos l where l.course_code=$1 and l.seed_number=1
  union all select 'phrase', p.id, 'known', p.known_audio_id, p.known_text, p.target_text from course_practice_phrases p where p.course_code=$1 and p.seed_number=1
  union all select 'phrase', p.id, 'target1', p.target1_audio_id, p.known_text, p.target_text from course_practice_phrases p where p.course_code=$1 and p.seed_number=1
  union all select 'phrase', p.id, 'target2', p.target2_audio_id, p.known_text, p.target_text from course_practice_phrases p where p.course_code=$1 and p.seed_number=1
  union all select 'phrase', p.id, 'presentation', p.presentation_audio_id, p.known_text, p.target_text from course_practice_phrases p where p.course_code=$1 and p.seed_number=1
)
select k.src, k.owner, k.slot, k.aid, k.owner_known, k.owner_target,
       a.id is not null as row_exists,
       a.role, a.text, a.text_stripped, a.s3_key, a.duration_ms, a.voice_id,
       a.origin, a.language, a.word_boundaries, a.created_at
  from links k left join course_audio a on a.id = k.aid
 where k.aid is not null
 order by k.src, k.owner, k.slot`

;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect()
  const { rows } = await c.query(SQL, [COURSE])
  const live = rows.filter(r => r.row_exists && !/::superseded/i.test(r.text || ''))
  const byId = new Map()
  for (const r of live) {
    if (!byId.has(r.aid)) {
      byId.set(r.aid, {
        id: r.aid,
        role: r.role,
        slot: r.slot,
        text: r.text,
        text_stripped: r.text_stripped,
        language: r.language,
        voice_id: r.voice_id,
        origin: r.origin,
        s3_key: r.s3_key,
        duration_ms: r.duration_ms,
        created_at: r.created_at,
        word_boundaries: r.word_boundaries,
        known_text: r.owner_known,
        target_text: r.owner_target,
        slots: []
      })
    }
    byId.get(r.aid).slots.push(`${r.src}:${r.owner}:${r.slot}`)
  }
  const clips = [...byId.values()]
  const out = {
    generated_note: 'live clips reachable from seed 1, resolved by *_audio_id columns',
    course: COURSE,
    liveRefs: live.length,
    supersededRefs: rows.filter(r => r.row_exists && /::superseded/i.test(r.text || '')).length,
    danglingRefs: rows.filter(r => !r.row_exists).length,
    distinctLiveClips: clips.length,
    clips
  }
  fs.mkdirSync(P.DATA_DIR, { recursive: true })
  fs.writeFileSync(P.manifest(COURSE), JSON.stringify(out, null, 2))
  console.log(`${COURSE}: ${live.length} live refs -> ${clips.length} distinct live clips`)
  console.log('  with word_boundaries:', clips.filter(x => x.word_boundaries).length)
  console.log('  by role:', JSON.stringify(clips.reduce((m, r) => (m[r.role || '(null)'] = (m[r.role || '(null)'] || 0) + 1, m), {})))
  await c.end()
})().catch(e => { console.error('FATAL', e.message); process.exit(1) })
