// ONE POD TEXT PER TARGET LANGUAGE — the rule, and the guard that makes it structural.
//
// Tom's ruling, 2026-09-20 16:34Z: "All pods will be exactly the same for the language.
// It's completely unacceptable to have lots of different versions of the language."
//
// The complaint was never that the texts differ TODAY — measured that afternoon, six of
// the seven multi-course languages were already byte-identical. It was that nothing
// PREVENTED the next translation run, regen or hand-edit from forking a language again,
// and that this had been true for four weeks. So what is tested here is the PREVENTION.
//
// The first two tests are pure and hold the language KEY: regional variants are distinct
// languages and an ISO-prefix key would silently merge texts Tom keeps apart. The rest
// talk to the database, because the guard lives there — it is the only layer the Popty
// tools, the learning app, the booth router and a stray psql session all share, and a
// rule guarded at one door is not guarded (tools/pods/serving-slug.cjs, jobs #91/#93).
//
// SKIPPED, loudly and by name, without `.env.psql`: a machine without the secret gets a
// named gap, never a green tick it did not earn.

import { describe, it, expect } from 'vitest'

const fs = require('fs')
const path = require('path')
const { targetLang, chooseLanguageSource, splitByAgreement } = require('./bind-pod-text-to-language.cjs')

const ENV_PSQL = path.join(__dirname, '..', '..', '.env.psql')
const DATABASE_URL = process.env.DATABASE_URL || (fs.existsSync(ENV_PSQL)
  ? (fs.readFileSync(ENV_PSQL, 'utf8').match(/DATABASE_URL=(.+)/) || [])[1]?.trim()
  : null)

async function query (sql) {
  const { Client } = require('pg')
  const c = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await c.connect()
  try {
    await c.query("set statement_timeout='180s'")
    return (await c.query(sql)).rows
  } finally { await c.end() }
}

describe('the language key', () => {
  it('keeps regional variants apart — they are separate languages, not spellings', () => {
    expect(targetLang('spa_for_eng')).toBe('spa')
    expect(targetLang('spa_mx_for_eng')).toBe('spa_mx')      // Tom: Mexican Spanish is its own language
    expect(targetLang('cym_n_for_eng')).toBe('cym_n')        // north and south Welsh never collapse
    expect(targetLang('cym_s_for_eng')).toBe('cym_s')
    expect(targetLang('ara_eg_for_eng')).toBe('ara_eg')
    expect(targetLang('fra_ca_for_eng')).toBe('fra_ca')
    // …and joins courses that only differ by the learner's own language.
    expect(targetLang('fra_for_jpn')).toBe(targetLang('fra_for_eng'))
  })

  it('takes the language text from the *_for_eng course, and says so when it had to adopt instead', () => {
    const fra = chooseLanguageSource('fra', [
      { course_code: 'fra_for_eng', slug: 'pod-1', rows: 231 },
      { course_code: 'fra_for_jpn', slug: 'pod-1-231', rows: 231 },
    ], 231)
    expect(fra.course_code).toBe('fra_for_eng')
    expect(fra.adopted).toBe(false)

    // Catalan on 2026-09-20: no *_for_eng copy of the story exists, so the one 231-line
    // Catalan in existence is ADOPTED rather than derived, and must say so out loud.
    const cat = chooseLanguageSource('cat', [
      { course_code: 'cat_for_spa', slug: 'pod-1-231', rows: 231 },
      { course_code: 'cat_for_eng', slug: 'pod-1', rows: 142 },
    ], 231)
    expect(cat.course_code).toBe('cat_for_spa')
    expect(cat.adopted).toBe(true)
  })

  it('binds only the pods that already match, and names the ones that do not', () => {
    const canon = new Map([[1, 'bonjour'], [2, 'ça va ?']])
    const { agree, differ } = splitByAgreement(canon, [
      { course_code: 'fra_for_eng', slug: 'pod-1', lines: new Map([[1, 'bonjour'], [2, 'ça va ?']]) },
      { course_code: 'fra_for_jpn', slug: 'pod-1', lines: new Map([[1, 'bonjour'], [2, 'comment ça va ?']]) },
    ])
    expect(agree.map(p => p.course_code)).toEqual(['fra_for_eng'])
    expect(differ[0].diffs).toBe(1)   // binding NEVER rewrites a pod; it refuses and names it
  })
})

const suite = DATABASE_URL ? describe : describe.skip

suite('the database refuses a language two texts', () => {
  it('has the guard installed on listening_pod_sentences', async () => {
    const rows = await query(`
      select t.tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid
       where not t.tgisinternal and c.relname = 'listening_pod_sentences'
         and t.tgname = 'listening_pod_sentences_one_text_per_language'`)
    expect(rows.length, 'the one-text-per-language trigger is missing — a language is free to fork again').toBe(1)
  })

  it('refuses to bind a pod whose text does not already match its language canon', async () => {
    const rows = await query(`
      select t.tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid
       where not t.tgisinternal and c.relname = 'listening_pods'
         and t.tgname = 'listening_pods_canonical_lang_binding'`)
    expect(rows.length, 'binding is unchecked — a boolean could silently rewrite a live pod').toBe(1)
  })

  it('holds exactly one text per target language across every bound pod', async () => {
    const rows = await query('select * from pod_text_divergence')
    expect(rows, `pod text has forked: ${JSON.stringify(rows.slice(0, 5))}`).toEqual([])
  })

  it('binds every course of a multi-course language to the same canon, not just one of them', async () => {
    const rows = await query(`
      select split_part(p.course_code,'_for_',1) lang,
             count(*) filter (where p.canonical_lang_text) bound,
             count(*) total
        from listening_pods p
       where p.slug in ('pod-1','pod-1-231') and (p.pod_type is null or p.pod_type='core')
         and p.course_code not like 'zzz%'
         and exists (select 1 from canonical_pod_target_text c
                      where c.target_lang = split_part(p.course_code,'_for_',1))
       group by 1 having count(*) filter (where p.canonical_lang_text) = 0`)
    expect(rows, `a language has a canon but no pod bound to it: ${JSON.stringify(rows)}`).toEqual([])
  })
})

// THE RULE ITSELF, exercised against the live guard in a transaction that is ALWAYS
// rolled back. Nothing is written: the point is that the database, not a JS surface,
// is what makes a per-course fork impossible — a single-course edit to a bound pod
// becomes an edit to the LANGUAGE, carried to the canon row and to every sibling pod
// inside the same transaction. An artist correcting a French line in the booth is
// correcting French, not fra_for_eng (Tom, 2026-09-20).
suite('an edit to one course of a language is an edit to the language', () => {
  it('carries a single-course change to the canon and to the siblings, never forking', async () => {
    const { Client } = require('pg')
    const c = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
    await c.connect()
    try {
      await c.query("set statement_timeout='120s'")
      const [pod] = (await c.query(`
        select p.id, split_part(p.course_code,'_for_',1) lang
          from listening_pods p
         where p.canonical_lang_text
           and (select count(*) from listening_pods q
                 where q.canonical_lang_text
                   and split_part(q.course_code,'_for_',1) = split_part(p.course_code,'_for_',1)) > 1
         order by p.id limit 1`)).rows
      if (!pod) return expect.unreachable('no multi-course bound language to exercise the rule on')

      await c.query('BEGIN')
      const probe = `ZZZ one-text-per-language probe ${Date.now()}`
      await c.query('update listening_pod_sentences set target_text = $1 where pod_id = $2 and global_order = 1', [probe, pod.id])
      const rows = (await c.query(`
        select s.target_text from listening_pod_sentences s join listening_pods p on p.id = s.pod_id
         where p.canonical_lang_text and split_part(p.course_code,'_for_',1) = $1 and s.global_order = 1`, [pod.lang])).rows
      const canon = (await c.query(
        'select target_text from canonical_pod_target_text where pod_slug=$1 and target_lang=$2 and global_order=1', ['pod-1', pod.lang])).rows
      const forks = (await c.query('select * from pod_text_divergence')).rows
      await c.query('ROLLBACK')

      expect(rows.length).toBeGreaterThan(1)
      expect(new Set(rows.map(r => r.target_text)), 'the language forked').toEqual(new Set([probe]))
      expect(canon[0].target_text, 'the canon did not move with the edit').toBe(probe)
      expect(forks, 'divergence appeared').toEqual([])
    } finally {
      try { await c.query('ROLLBACK') } catch {}
      await c.end()
    }
  })
})
