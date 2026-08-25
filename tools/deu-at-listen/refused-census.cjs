#!/usr/bin/env node
/**
 * Census the takes that reached S3 but no database row, for one course.
 *
 * The course a take belongs to is NOT guessable from the key — it is in the S3
 * object's own metadata (`coursecode`), written at upload. Job #628 found five
 * Welsh (cym_n_for_eng) takes sitting in what everyone had been calling "the 31
 * Austrian orphans"; without this read they would have been served to Kai inside
 * an Austrian German review.
 *
 * `itemid`, where the object carries one, names the exact course line — which
 * moves a take out of the "nobody can say what this is" bucket entirely.
 *
 * Usage: node tools/deu-at-listen/refused-census.cjs <uuid-list.json> <out.json> [courseCode]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const fs = require('fs')
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3')

const s3 = new S3Client({ region: process.env.AWS_REGION, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } })
const [listPath, outPath, courseCode = 'deu_at_for_eng'] = process.argv.slice(2)
const uuids = JSON.parse(fs.readFileSync(listPath, 'utf8'))
const KEY_PATTERNS = ['mastered/%s.mp3', 'raw/%s.webm', 'raw/%s.mp4', 'raw/%s.m4a', 'raw/%s.ogg', 'raw/%s.mp3']

;(async () => {
  const all = []
  for (const uuid of uuids) {
    let found = null
    for (const pat of KEY_PATTERNS) {
      const Key = pat.replace('%s', uuid)
      try {
        const h = await s3.send(new HeadObjectCommand({ Bucket: process.env.S3_BUCKET, Key }))
        const m = h.Metadata || {}
        found = {
          uuid, s3_key: Key,
          last_modified: h.LastModified.toISOString(),
          size_bytes: h.ContentLength,
          course_code: m.coursecode || null,
          item_id: m.itemid || null,
          role: m.role || null,
        }
        break
      } catch { /* try the next container */ }
    }
    all.push(found || { uuid, s3_key: null, course_code: null, note: 'no object under any known key pattern' })
  }
  const mine = all.filter((t) => t.course_code === courseCode)
  const others = all.filter((t) => t.course_code !== courseCode)
  fs.writeFileSync(outPath, JSON.stringify({
    built_at: new Date().toISOString(),
    course: courseCode,
    // Counted and named, never silently dropped.
    excluded_other_courses: others.map((t) => ({ uuid: t.uuid, course_code: t.course_code, s3_key: t.s3_key })),
    takes: mine,
  }, null, 1))
  console.log(`${mine.length} belong to ${courseCode}; ${others.length} excluded:`)
  for (const o of others) console.log(`  ${o.uuid.slice(0, 8)} → ${o.course_code}`)
  console.log(`${mine.filter((t) => t.item_id).length} carry an itemid naming their course line`)
})()
