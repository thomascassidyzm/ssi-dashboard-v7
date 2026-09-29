/**
 * The gender row follows the text on EVERY write path (job #821).
 * Before: only production-api's phrase PATCH refreshed course_gender_expansions, so
 * a seed edit (or any other surface in content-write-surfaces.cjs) left the edited
 * wording with no female form. Now the content-edit gate asks for a sync after any
 * text-writing surface. Real express + real gate; in-memory supabase; stubbed model.
 * Run: npx vitest run services/shared/gender-expansion-sync.test.cjs
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
process.env.GENDER_SYNC_DEBOUNCE_MS = '20'
const express = require('express')
const http = require('http')
const claude = require('./claude-cli.cjs')
let prompts = []
claude.claudeChat = async (prompt) => {
  prompts.push(prompt)
  const female = /female speaker/.test(prompt)
  return JSON.stringify({ results: [...prompt.matchAll(/^(\d+)\. (.+)$/gm)].map(m => ({ i: +m[1], t: female ? m[2].replace(/stanco/g, 'stanca') : m[2] })) })
}
const { contentEditGate } = require('./content-edit-gate.cjs')
const { syncGenderExpansions } = require('./gender-expansion-sync.cjs')

const HUMAN = { email: 'kai@example.com', name: 'Kai', role: 'admin', courses: '*', voice_id: null }
function makeDb(store) {
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: HUMAN.email } }, error: null }) },
    from(table) {
      const f = []; let gte = null
      const rows = () => (store[table] || []).filter(r => f.every(([c, v]) => r[c] === v) && (!gte || r[gte[0]] >= gte[1]))
      const q = {
        select() { return q }, eq(c, v) { f.push([c, v]); return q }, gte(c, v) { gte = [c, v]; return q }, limit() { return q },
        maybeSingle: async () => ({ data: table === 'dashboard_users' ? HUMAN : table === 'courses' ? { target_lang: 'ita', needs_gender_prep: null } : null, error: null }),
        single: async () => ({ data: { id: 'evt' }, error: null }),
        insert() { return q },
        upsert: async (row) => { (store[table] ||= []).push(row); return { error: null } },
        then(res) { res({ data: rows(), error: null }) },
      }
      return q
    },
  }
}

let server
afterEach(async () => { if (server) await new Promise(r => server.close(r)); server = null })
beforeEach(() => { prompts = [] })
const waitFor = async (fn) => { for (let i = 0; i < 100; i++) { if (fn()) return true; await new Promise(r => setTimeout(r, 20)) } return false }

describe('gender row follows the text', () => {
  it('a seed edit through the gate gives the new wording its female row', async () => {
    const store = { course_gender_expansions: [], course_seeds: [], course_legos: [], course_practice_phrases: [] }
    const db = makeDb(store)
    const app = express(); app.use(express.json())
    app.use(contentEditGate({ supabase: db, service: 'course-builder', logger: { warn() {}, error() {}, info() {} } }))
    app.patch('/api/seed/:courseCode/:seedNumber', (req, res) => {
      store.course_seeds.push({ course_code: 'ita_for_eng', target_text: 'sono stanco adesso', updated_at: new Date().toISOString() })
      res.json({ ok: true })
    })
    server = http.createServer(app); await new Promise(r => server.listen(0, '127.0.0.1', r))
    const r = await fetch(`http://127.0.0.1:${server.address().port}/api/seed/ita_for_eng/42`, {
      method: 'PATCH', headers: { 'content-type': 'application/json', 'x-agent-id': 'test' }, body: '{}' })
    expect(r.status).toBe(200)
    expect(await waitFor(() => store.course_gender_expansions.length === 1)).toBe(true)
    expect(store.course_gender_expansions[0]).toMatchObject({ original_text: 'sono stanco adesso', expanded_f: 'sono stanca adesso', text_side: 'target' })
  })

  it('texts not written since the edit began are left alone (no model spend on the rest of the course)', async () => {
    const store = { course_gender_expansions: [], course_legos: [], course_practice_phrases: [],
      course_seeds: [
        { course_code: 'ita_for_eng', target_text: 'sono stanco vecchio', updated_at: '2026-07-15T00:00:00Z' },
        { course_code: 'ita_for_eng', target_text: 'sono stanco nuovo', updated_at: new Date().toISOString() }] }
    const t = await syncGenderExpansions('ita_for_eng', { supabase: makeDb(store), since: Date.now() - 60000 })
    expect(t).toMatchObject({ considered: 1, written: 1 })
    expect(store.course_gender_expansions.map(r => r.original_text)).toEqual(['sono stanco nuovo'])
  })

  it('an operation that writes no text (approve) never asks for a sync', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'content-edit-gate.cjs'), 'utf8')
    expect(src).toMatch(/NO_TEXT_OPERATIONS = new Set\(\[[^\]]*'approve'/)
  })
})
