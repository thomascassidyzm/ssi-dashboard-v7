/**
 * Gender expansion follows the phrase text (job #741): an edited or new target text
 * gets its expansion row; a row that already exists for the text (Kai's hand fixes)
 * is never overwritten. In-memory supabase, stubbed model. No network.
 * Run: npx vitest run services/gender-expansion-refresh.test.cjs
 */
import { describe, it, expect, beforeEach } from 'vitest'
const claude = require('./shared/claude-cli.cjs')

let prompts = []
let reply = null
claude.claudeChat = async (prompt) => { prompts.push(prompt); return reply(prompt) }
const svc = require('./gender-haiku-service.cjs')

/** Just enough of the supabase builder for ensureExpansionForText. */
function fakeDb({ course = { target_lang: 'ita', needs_gender_prep: null }, rows = [] } = {}) {
  const db = { rows, upserts: [] }
  const q = (table) => {
    const f = []
    const api = {
      select() { return api }, eq(c, v) { f.push([c, v]); return api }, limit() { return api },
      maybeSingle: async () => ({ data: table === 'courses' ? course : null }),
      then(res) { res({ data: db.rows.filter(r => f.every(([c, v]) => r[c] === v)), error: null }) },
      upsert: async (row, opts) => {
        db.upserts.push({ row, opts })
        const dup = db.rows.some(r => r.course_code === row.course_code && r.original_text === row.original_text && r.text_side === row.text_side)
        if (!(dup && opts.ignoreDuplicates)) db.rows.push(row)
        return { error: null }
      },
    }
    return api
  }
  db.from = q
  return db
}

// A model that feminises "stanco" for the female voice and leaves the male voice alone.
const italianModel = (prompt) => {
  const female = /female speaker/.test(prompt)
  const phrases = [...prompt.matchAll(/^(\d+)\. (.+)$/gm)].map(m => ({ i: +m[1], t: female ? m[2].replace(/stanco/g, 'stanca') : m[2] }))
  return JSON.stringify({ results: phrases })
}

beforeEach(() => { prompts = []; reply = italianModel })

describe('ensureExpansionForText', () => {
  it('an edited phrase text gets a NEW expansion row for its new wording (the row from the old wording is left alone)', async () => {
    const old = { course_code: 'ita_for_eng', original_text: 'sono stanco oggi', language: 'ita', text_side: 'target', expanded_f: 'sono stanca oggi', expanded_m: null }
    const db = fakeDb({ rows: [old] })
    const out = await svc.ensureExpansionForText('ita_for_eng', 'sono stanco adesso', db)
    expect(out.status).toBe('written')
    expect(db.rows).toHaveLength(2)
    expect(db.rows[0]).toBe(old)                                 // untouched
    expect(db.rows[1]).toMatchObject({ original_text: 'sono stanco adesso', expanded_f: 'sono stanca adesso', expanded_m: null, text_side: 'target', language: 'ita' })
  })

  it("a row Kai's room hand-fixed is not clobbered, and the model is not even asked", async () => {
    const hand = { course_code: 'ita_for_eng', original_text: 'sono stanco adesso', language: 'ita', text_side: 'target', expanded_f: 'sono proprio stanca adesso', expanded_m: null }
    const db = fakeDb({ rows: [hand] })
    const out = await svc.ensureExpansionForText('ita_for_eng', 'sono stanco adesso', db)
    expect(out.status).toBe('exists')
    expect(db.rows).toEqual([hand])
    expect(db.upserts).toEqual([])
    expect(prompts).toEqual([])
  })

  it('a row that appears between the check and the write wins (ignoreDuplicates)', async () => {
    const db = fakeDb()
    const race = { course_code: 'ita_for_eng', original_text: 'sono stanco adesso', language: 'ita', text_side: 'target', expanded_f: 'HAND', expanded_m: null }
    reply = (p) => { if (!db.rows.length) db.rows.push(race); return italianModel(p) }
    await svc.ensureExpansionForText('ita_for_eng', 'sono stanco adesso', db)
    expect(db.rows).toEqual([race])
    expect(db.upserts[0].opts).toMatchObject({ ignoreDuplicates: true, onConflict: 'course_code,original_text,text_side' })
  })

  it('a text with no speaker-agreement variants writes no row (same as the course-wide coordinator)', async () => {
    const db = fakeDb()
    const out = await svc.ensureExpansionForText('ita_for_eng', 'dove vive la tua famiglia', db)
    expect(out.status).toBe('no-variants')
    expect(db.rows).toEqual([])
  })

  it('a model failure writes nothing and says so, so the next call tries again', async () => {
    const db = fakeDb()
    reply = () => { throw new Error('cli down') }
    expect((await svc.ensureExpansionForText('ita_for_eng', 'sono stanco adesso', db)).status).toBe('llm-failed')
    expect(db.rows).toEqual([])
    reply = italianModel
    expect((await svc.ensureExpansionForText('ita_for_eng', 'sono stanco adesso', db)).status).toBe('written')
  })

  it('an ungendered course, or a blank text, is left alone', async () => {
    expect((await svc.ensureExpansionForText('deu_for_eng', 'ich bin müde', fakeDb({ course: { target_lang: 'deu', needs_gender_prep: null } }))).status).toBe('not-gendered')
    expect((await svc.ensureExpansionForText('ita_for_eng', '  ', fakeDb())).status).toBe('skipped')
    expect(prompts).toEqual([])
  })

  it("the prompt carries Kai's rule", async () => {
    await svc.ensureExpansionForText('ita_for_eng', 'sono stanco adesso', fakeDb())
    expect(prompts[0]).toContain('a female form only applies where the word refers back to the speaker')
  })

  it('an edit and the regenerate that follows share one model call', async () => {
    const db = fakeDb()
    const [a, b] = await Promise.all([
      svc.ensureExpansionForText('ita_for_eng', 'sono stanco adesso', db),
      svc.ensureExpansionForText('ita_for_eng', 'sono stanco adesso', db),
    ])
    expect([a.status, b.status]).toEqual(['written', 'written'])
    expect(prompts).toHaveLength(2)    // one female + one male call, not four
    expect(db.rows).toHaveLength(1)
  })
})

describe('wiring', () => {
  const fs = require('fs'), path = require('path')
  it('the phrase PATCH and /regenerate-phrase both call it', () => {
    const api = fs.readFileSync(path.join(__dirname, 'production-api.cjs'), 'utf8')
    const p8 = fs.readFileSync(path.join(__dirname, 'phases/phase8-audio-v13.cjs'), 'utf8')
    expect(api).toMatch(/ensureExpansionForText\(courseCode, target_text, supabase\)/)
    expect(p8).toMatch(/ensureExpansionForText\(courseCode, effectiveTarget, supabase\)/)
  })
})
