#!/usr/bin/env node
/**
 * READ ONLY. The reuse credit in this recount is only worth what the objects behind it are.
 * Samples credited clips - clips already on the voice a language would render onto - and
 * HEADs the real S3 object. Same check the 2026-08-13 English recount ran on its 440.
 * Sampled by md5(s3_key) so the draw is not clustered by course or date.
 *   node tools/noneng-distinct-recount/credit-liveness.cjs [--n 15]
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const { q } = require('./db.cjs')

const BUCKET = 'https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/'
const N = (() => { const i = process.argv.indexOf('--n'); return i > -1 ? Number(process.argv[i + 1]) : 15 })()

// (language, voice) pairs carrying real credit in this recount
const TARGETS = [
  ['kor', 'ara'], ['kor', 'leo'], ['zho', 'ara'], ['zho', 'leo'],
  ['ita', 'ara'], ['ita', 'leo'], ['deu', 'ara'], ['deu', 'leo'],
  ['fra', 'eve'], ['fra', 'leo'], ['cym', 'legacy_import'],
]

const head = key => {
  const out = execFileSync('curl', ['-s', '-m', '30', '-o', '/dev/null', '-w', '%{http_code} %{size_download}',
    '-r', '0-0', BUCKET + encodeURI(key)]).toString().trim()
  const [code] = out.split(' ')
  return { code: +code, raw: out }
}

;(async () => {
  const results = []
  for (const [lang, voice] of TARGETS) {
    const rows = await q(`
      SELECT ca.id, ca.s3_key, ca.text_stripped, ca.course_code, ca.file_size_bytes, ca.duration_ms
        FROM course_audio ca JOIN courses c ON c.course_code = ca.course_code
       WHERE c.target_lang = $1
         AND regexp_replace(ca.voice_id,'^(xai_|azure_)','') = $2
         AND coalesce(ca.s3_key,'') <> '' AND ca.s3_key NOT LIKE 'pending/%'
       ORDER BY md5(ca.s3_key) LIMIT $3`, [lang, voice, N])
    for (const r of rows) {
      const h = head(r.s3_key)
      results.push({ lang, voice, id: r.id, course: r.course_code, s3_key: r.s3_key,
        bytes_db: r.file_size_bytes, duration_ms: r.duration_ms, http: h.code, alive: h.code === 206 || h.code === 200 })
    }
    const set = results.filter(r => r.lang === lang && r.voice === voice)
    console.log(lang, voice, 'sampled', set.length, 'alive', set.filter(r => r.alive).length)
  }
  fs.writeFileSync(__dirname + '/credit-liveness.json', JSON.stringify(results, null, 1))
  console.log('TOTAL sampled', results.length, 'alive', results.filter(r => r.alive).length,
    'dead', results.filter(r => !r.alive).length)
})().catch(e => { console.error(e.message); process.exit(1) })
