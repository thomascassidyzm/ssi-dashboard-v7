import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { existingByS3KeyQuery } = require('./backfill-existing-lookup.cjs')

describe("the backfill's already-filed lookup", () => {
  it("scopes to the course when --course is given, so the agent login's 5 s cap is met by the course_code index", () => {
    const q = existingByS3KeyQuery(['mastered/A.mp3'], 'fry_for_eng')
    expect(q.text).toMatch(/s3_key = any\(\$1\)\s+and course_code = \$2/)
    expect(q.values).toEqual([['mastered/A.mp3'], 'fry_for_eng'])
  })

  it('stays as it was with no --course', () => {
    const q = existingByS3KeyQuery(['mastered/A.mp3'])
    expect(q.text).not.toMatch(/course_code =/)
    expect(q.values).toEqual([['mastered/A.mp3']])
  })

  it('is the query the script actually runs', () => {
    const src = readFileSync(new URL('./backfill-orphan-takes.cjs', import.meta.url), 'utf8')
    expect(src).toMatch(/pg\.query\(existingByS3KeyQuery\(keys, COURSE_FILTER\)\)/)
    expect(src).not.toMatch(/where s3_key = any/)
  })
})
