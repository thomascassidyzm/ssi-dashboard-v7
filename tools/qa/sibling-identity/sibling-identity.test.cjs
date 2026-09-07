/**
 * The two things this check has to get right, asserted against a real Postgres
 * dialect via the generated SQL and against the classifier directly:
 *
 *   1. IT FIRES on two siblings under ONE key whose content is byte-identical.
 *   2. IT STAYS SILENT on the same text under DIFFERENT keys — #264's third pair,
 *      a stock phrase reused across scenes, which is legitimate. A check that
 *      cried wolf there would be switched off, and a check nobody trusts is worse
 *      than no check.
 *
 * Run: npx vitest run tools/qa/sibling-identity
 */

import { describe, it, expect } from 'vitest'

const { classify, candidateKey, MUST_DIFFER, MAY_REPEAT } = require('./register.cjs')
const { candidatesOfIndex } = require('./derive.cjs')
const { collisionSQL } = require('./check.cjs')

const podIndex = {
  tbl: 'canonical_pod_scenarios',
  idx: 'canonical_pod_scenarios_pod_slug_scene_sent_variant_key',
  cols: ['pod_slug', 'scene_number', 'sentence_number', 'variant_key'],
  tcols: ['english_text', 'target_text'],
}

describe('derivation', () => {
  it('derives the flow-variant shape from the unique index, naming no table', () => {
    const keys = candidatesOfIndex(podIndex).map(candidateKey)
    expect(keys).toContain('canonical_pod_scenarios::pod_slug,scene_number,sentence_number::variant_key')
  })

  it('never proposes a content column as the discriminator — that assertion would be vacuous', () => {
    const cands = candidatesOfIndex({
      tbl: 'course_audio', idx: 'unique_course_audio_per_voice',
      cols: ['course_code', 'text_normalized', 'language', 'role', 'voice_id'],
      tcols: ['text', 'text_normalized'],
    })
    expect(cands.map((c) => c.discriminator)).not.toContain('text_normalized')
  })
})

describe('the boundary — siblings vs reuse', () => {
  it('asserts that sibling FLOWS under one (pod, scene, sentence) must differ', () => {
    const c = candidatesOfIndex(podIndex).find((x) => x.discriminator === 'variant_key')
    const v = classify(c)
    expect(v.verdict).toBe(MUST_DIFFER)
    expect(v.fields).toEqual([['english_text'], ['target_text']])
  })

  it('does NOT assert across scenes — the same stock phrase in scene 8 and scene 20 is reuse', () => {
    const c = candidatesOfIndex(podIndex).find((x) => x.discriminator === 'scene_number')
    expect(classify(c).verdict).toBe(MAY_REPEAT)
  })

  it('does NOT assert across pods — one line shared by the health pod and its Welsh mirrors is reuse', () => {
    const c = candidatesOfIndex(podIndex).find((x) => x.discriminator === 'pod_slug')
    expect(classify(c).verdict).toBe(MAY_REPEAT)
  })

  it('an unregistered, non-scope, non-ordinal shape over authored text is UNKNOWN, never a guess', () => {
    const v = classify({
      table: 'some_new_content_table', groupCols: ['course_code'], discriminator: 'flavour',
      contentCols: ['target_text'],
    })
    expect(v.verdict).toBe('UNKNOWN')
  })
})

describe('the generated SQL', () => {
  const spec = {
    table: 'canonical_pod_scenarios',
    groupCols: ['pod_slug', 'scene_number', 'sentence_number'],
    discriminator: 'variant_key',
    fields: ['english_text'],
    pk: 'id',
  }

  it('groups by the sibling key AND the content, so only same-key duplicates can surface', () => {
    const sql = collisionSQL(spec)
    expect(sql).toMatch(/group by "pod_slug", "scene_number", "sentence_number", "english_text"/)
    expect(sql).toMatch(/having count\(\*\) > 1/)
  })

  it('never compares unauthored rows — a NULL or blank target is an authoring gap, not a collision', () => {
    const sql = collisionSQL(spec)
    expect(sql).toContain(`"english_text" is not null and btrim("english_text") <> ''`)
  })

  it('carries a registered exclusion into the WHERE clause (component rows tile, so they repeat)', () => {
    const sql = collisionSQL({ ...spec, where: "phrase_role is distinct from 'component'" })
    expect(sql).toContain(`phrase_role is distinct from 'component'`)
  })
})
