require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const { createClient } = require('@supabase/supabase-js')
const { execFileSync } = require('child_process')
const fs = require('fs'), os = require('os'), path = require('path')
const { medianF0 } = require('./pitch.cjs')
const veracity = require('../../services/audio-veracity.cjs')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const BUCKET = process.env.S3_BUCKET, REGION = process.env.AWS_REGION || 'eu-west-1'
const url = k => `https://${BUCKET}.s3.${REGION}.amazonaws.com/${k}`

// Measured 2026-08-13 over 41 PRE-EXISTING English clips per voice (baseline.cjs):
//   clone  xai_gfzdpspr5fdp  min 79  median 103  max 176
//   Olivia xai_bedd6226      min 148 median 195  max 250
// The tails OVERLAP (148-176), so a hard band would lie. Classification is
// therefore nearest-baseline-median, and a clip that classifies to the OTHER
// cast member is flagged REVIEW for a human listen -- never silently passed
// and never auto-failed on pitch alone. The definitive substitution check is
// voice_id: an Azure fallback records an Azure voice, not xai_*.
//
// course_audio stores this cast in TWO id formats: 594 rows in scope read
// `xai_gfzdpspr5fdp`/`xai_bedd6226`, and 8 older rows (all pre-existing clips
// this run reused free, none rendered tonight) read the bare `gfzdpspr5fdp`.
// Same voice, historical formatting drift. Keying on the bare id and stripping
// the provider prefix is what makes this a check of WHO SPOKE rather than a
// check of WHICH ID FORMAT WAS FASHIONABLE THAT MONTH -- the first draft of
// this script reported those 8 as WRONG-VOICE, which was the checker lying.
const CAST = {
  gfzdpspr5fdp: { name: 'clone(M)',  median: 103 },
  bedd6226:     { name: 'Olivia(F)', median: 195 },
}
const castOf = vid => CAST[String(vid || '').replace(/^xai_/, '')]
const castIdOf = vid => String(vid || '').replace(/^xai_/, '')
const classifyF0 = f0 => Object.entries(CAST)
  .map(([id, c]) => ({ id, name: c.name, d: Math.abs(f0 - c.median) }))
  .sort((a, b) => a.d - b.d)[0]

const scope = require('./scope.json')
const courseFilter = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2] : null

;(async()=>{
  const target = scope.filter(s => !courseFilter || s.course_code === courseFilter)
  const ids = target.map(s => s.sentence_id)
  const sents = []
  for (let i=0;i<ids.length;i+=200) {
    const { data, error } = await sb.from('listening_pod_sentences')
      .select('id, known_audio_id, target_audio_id').in('id', ids.slice(i,i+200))
    if (error) throw new Error(error.message); sents.push(...data)
  }
  const byId = new Map(sents.map(s=>[s.id,s]))
  const linked = target.map(s => ({ ...s,
    audio_id: s.side==='known' ? byId.get(s.sentence_id)?.known_audio_id : byId.get(s.sentence_id)?.target_audio_id }))
  const withAudio = linked.filter(s => s.audio_id)
  const stillEmpty = linked.filter(s => !s.audio_id)

  const aids = [...new Set(withAudio.map(s=>s.audio_id))]
  const audio = []
  for (let i=0;i<aids.length;i+=200) {
    const { data, error } = await sb.from('course_audio')
      .select('id, text, voice_id, language, role, s3_key, duration_ms, created_at, origin')
      .in('id', aids.slice(i,i+200))
    if (error) throw new Error(error.message); audio.push(...data)
  }
  const aById = new Map(audio.map(a=>[a.id,a]))

  // Results stream to JSONL as they are produced, and a rerun skips what is
  // already there. The first attempt at this pass (2026-08-13 02:27) wrote its
  // JSON only at the end, was killed by a session boundary 12 minutes in with
  // ~350 clips already decoded, and lost every one of them. Whisper time is
  // expensive; never hold it all in memory again.
  // ONE shared ledger across every invocation, deliberately: the per-course
  // runs and the final `all` run share it, so `all` costs only the clips no
  // per-course run reached and still produces the whole-scope summary.
  const jsonl = __dirname + '/verify-results.jsonl'
  const done = new Map()
  if (fs.existsSync(jsonl)) for (const line of fs.readFileSync(jsonl,'utf8').split('\n')) {
    if (!line.trim()) continue
    try { const r = JSON.parse(line); done.set(r.sentence_id + '|' + r.side, r) } catch {}
  }
  const sink = fs.createWriteStream(jsonl, { flags: 'a' })
  const emit = r => { sink.write(JSON.stringify(r) + '\n') }
  if (done.size) console.error(`resuming: ${done.size} clips already verified in ${path.basename(jsonl)}`)

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'pod0ver-'))
  const results = []
  let n = 0
  for (const s of withAudio) {
    n++
    const cached = done.get(s.sentence_id + '|' + s.side)
    if (cached && cached.audio_id === s.audio_id) { results.push(cached); continue }
    if (n % 25 === 0) console.error(`  ${courseFilter||'all'} ${n}/${withAudio.length}`)
    const a = aById.get(s.audio_id)
    const r = { sentence_id: s.sentence_id, course: s.course_code, side: s.side, audio_id: s.audio_id,
                text: s.text, checks: {}, ok: false }
    if (!a) { r.checks.db_row = 'MISSING'; emit(r); results.push(r); continue }
    r.voice_id = a.voice_id; r.duration_ms = a.duration_ms; r.s3_key = a.s3_key

    // 1. voice identity — catches an Azure fallback substituting a wrong voice
    const cast = castOf(a.voice_id)
    r.checks.voice_id = cast ? 'OK ' + cast.name : 'WRONG-VOICE ' + a.voice_id
    // 2. language/role sanity
    r.checks.language = a.language === 'eng' ? 'OK' : 'WRONG ' + a.language
    // 3. bytes alive
    const dest = path.join(tmp, a.id + '.mp3')
    let size = 0
    try { execFileSync('curl',['-s','-f','-o',dest,url(a.s3_key)],{timeout:60000}); size = fs.statSync(dest).size }
    catch (e) { r.checks.alive = 'DEAD'; emit(r); results.push(r); continue }
    r.size = size
    r.checks.alive = size > 2000 ? 'OK' : 'TOO-SMALL ' + size
    // 4. real decodable audio with duration
    try {
      const dur = parseFloat(execFileSync('ffprobe',['-v','quiet','-show_entries','format=duration','-of','csv=p=0',dest]).toString().trim())
      r.seconds = dur
      r.checks.duration = dur > 0.15 ? 'OK' : 'TOO-SHORT ' + dur
    } catch (e) { r.checks.duration = 'UNDECODABLE' }
    // 5. VOICE MATCH — measured pitch must sit in this cast member's band
    try {
      const p = medianF0(dest); r.f0 = p.f0; r.f0_frames = p.frames
      if (!cast) r.checks.voice_match = 'N/A (unknown voice)'
      else if (p.f0 === null) r.checks.voice_match = 'REVIEW unmeasurable (' + p.frames + ' voiced frames)'
      else {
        const nearest = classifyF0(p.f0)
        r.f0_nearest = nearest.name
        r.checks.voice_match = nearest.id === castIdOf(a.voice_id)
          ? `OK ${p.f0}Hz nearest ${cast.name}`
          : `REVIEW ${p.f0}Hz sounds nearer ${nearest.name} than the cast ${cast.name}`
      }
    } catch (e) { r.checks.voice_match = 'ERROR ' + e.message.slice(0,40) }
    // 6. CONTENT — unprimed ASR round trip against the expected text
    try {
      const v = await veracity.checkAudioVeracity(dest, s.text, 'eng')
      r.asr = v.decode; r.cer = v.cer
      r.checks.content = !v.checked ? ('UNCHECKED ' + (v.reason||'')) : (v.pass ? 'OK' : 'FAIL ' + (v.reason||'') + ' cer=' + v.cer)
    } catch (e) { r.checks.content = 'ERROR ' + e.message.slice(0,60) }

    r.ok = Object.values(r.checks).every(c => String(c).startsWith('OK'))
    r.review = !r.ok && Object.values(r.checks).every(c => /^(OK|REVIEW)/.test(String(c)))
    emit(r); results.push(r)
  }
  fs.rmSync(tmp,{recursive:true,force:true})

  const out = {
    scope_slots: target.length, still_empty: stillEmpty.length, verified: results.length,
    all_green: results.filter(r=>r.ok).length,
    review: results.filter(r=>r.review).length,
    hard_fail: results.filter(r=>!r.ok && !r.review).length,
    review_items: results.filter(r=>r.review).map(r=>({id:r.sentence_id,text:r.text,voice:r.voice_id,f0:r.f0,checks:r.checks})),
    failures: results.filter(r=>!r.ok && !r.review),
  }
  const tally = {}
  for (const r of results) for (const [k,v] of Object.entries(r.checks)) {
    const key = k + ': ' + String(v).split(' ')[0]; tally[key] = (tally[key]||0)+1
  }
  out.check_tally = tally
  const f = __dirname + '/verify-' + (courseFilter||'all') + '.json'
  fs.writeFileSync(f, JSON.stringify({ summary: out, results }, null, 2))
  console.log(JSON.stringify(out, null, 2).slice(0, 6000))
  console.log('\nfull results ->', f)
})().catch(e=>{console.error('FAIL',e.stack);process.exit(1)})
