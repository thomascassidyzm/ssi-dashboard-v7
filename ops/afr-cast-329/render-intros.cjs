// job #329: spoken intros for the afr_for_eng debut LEGOs that have none. Text = the course's own intro shape
// ("The Afrikaans for: 'X', as in — 'seed', is:") when the seed sentence contains the chunk, bare otherwise. One render-route call per LEGO:
// afr_for_eng is a Tom-006 WHOLE-intro course (voicing-policy.config.json wholeIntroVoices): the text ends 'is: <break time="300ms"/>' (Tom 2026-10-12)
// and the route binds course_legos.presentation_audio_id itself. First pass spliced 11 in Charlotte (policy allowed it before the config line); this
// pass re-renders every one of the 21 in Tom-006 so the new intros share one voice. The spliced clips are kept, never deleted.
//   node render-intros.cjs [--dry]
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.psql'), quiet: true })
const { Client } = require('pg')
const pa = require('../../services/phases/presentation-author.cjs')
const tpl = "The {target_lang_name} for: '{known}', as in — '{seed}', is:"
;(async () => {
  const dry = process.argv.includes('--dry')
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect()
  const { rows } = await c.query(`select l.lego_id, l.known_text, s.known_text seed from course_legos l join course_seeds s on s.course_code=l.course_code and s.seed_number=l.seed_number
    left join course_audio a on a.id::text=l.presentation_audio_id::text
    where l.course_code='afr_for_eng' and l.is_new and (l.presentation_audio_id is null or (a.voice_id not like '%d293d509%' and a.created_at >= '2026-10-13')) order by l.lego_id`)
  let spent = 0; const fail = []
  for (const r of rows) {
    const chunk = pa.introChunk(r.known_text)
    const frame = pa.fallbackFrame(chunk, r.seed.replace(/[.!?]+$/, '')) === 'B' ? 'B' : 'A'
    const text = pa.renderIntro({ frame, template: tpl, targetLangName: 'Afrikaans', chunk, seed: r.seed, knownLang: 'eng' }) + ' <break time="300ms"/>'
    const res = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job329-afr-intros' },
      body: JSON.stringify({ courseCode: 'afr_for_eng', role: 'presentation', text, legoId: r.lego_id, purpose: 'job329: intro for a debut LEGO with none (Tom 2026-10-13)', dryRun: dry }) })
    const o = await res.json().catch(() => ({}))
    if (!o.ok) { fail.push([r.lego_id, res.status, o.error || o.code]); console.log('FAIL', r.lego_id, o.error || o.code); continue }
    spent += o.charsSpent || o.wouldSpendChars || 0
    console.log(r.lego_id, o.source, o.legoLinked ? 'linked' : '', text.slice(0, 70))
  }
  console.log({ n: rows.length, spent, fail }); await c.end()
})()
