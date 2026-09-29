/**
 * The resync never deletes a row it cannot replace (job #837, Astra card 887).
 * Pass one of job #821 ran with the model unreachable: all 44 generations failed, yet it deleted 142 rows and
 * filed 25 edit events, and its own report said it "wrote nothing". 40 of those 142 were not dead either: their
 * text was still live under another surface form ("sono pronto a imparare." vs live "sono pronto a imparare"),
 * and that live text had no row of its own. Now: generation runs first; one failure in a course refuses every
 * delete (and the event) in it; a stale-keyed row's live text is generated before the row may go.
 * Real script, driven through main(); pg, supabase, the generator and the event log are stubbed.
 * Run: npx vitest run tools/course-optimization/gender-expansions-resync-2026-09-29.test.cjs
 */
import { describe, it, expect, beforeEach } from 'vitest'
const path = require('path')
const os = require('os')
const fs = require('fs')
const { createRequire } = require('module')

const SCRIPT = path.join(__dirname, 'gender-expansions-resync-2026-09-29.cjs')
const req = createRequire(SCRIPT)

const STALE = { id: 'a', original_text: 'sono pronto a imparare.', language: 'ita', expanded_f: 'sono pronta a imparare.', expanded_m: 'sono pronto a imparare.', processed_at: '2026-07-15' }
const DEAD = { id: 'b', original_text: 'testo che non esiste più', language: 'ita', expanded_f: 'testa', expanded_m: 'testo', processed_at: '2026-07-15' }

let deleted, events, generated, ensureStatus, ended

function stub(resolved, exports) { require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports } }

function install() {
  deleted = []; events = []; generated = []
  let end; ended = new Promise(r => { end = r })
  const rows = [STALE, DEAD]
  class Client {
    async connect() {}
    async end() { end() }
    async query(sql) {
      if (/FROM course_audio/.test(sql)) return { rows: [] }
      if (/WITH m AS/.test(sql)) return { rows: [{ tx: 'sono stanco' }] }
      if (/AS live_text/.test(sql)) return { rows: [{ live_text: 'sono pronto a imparare' }, { live_text: 'sono stanco' }] }
      if (/SELECT original_text FROM course_gender_expansions/.test(sql)) return { rows: rows.map(r => ({ original_text: r.original_text })) }
      if (/SELECT g\.id/.test(sql)) return { rows: rows.map(r => ({ ...r })) }
      throw new Error('unexpected SQL in test: ' + sql.slice(0, 80))
    }
  }
  const sb = {
    from() {
      let id = null, del = false
      const q = {
        select() { return q }, delete() { del = true; return q },
        eq(_c, v) { id = v; if (del) { deleted.push(v); return Promise.resolve({ error: null }) } return q },
        async maybeSingle() { return { data: rows.find(r => r.id === id) || null } },
      }
      return q
    },
  }
  stub(req.resolve('pg'), { Client })
  stub(req.resolve('@supabase/supabase-js'), { createClient: () => sb })
  stub(req.resolve('../../services/shared/content-edit-log.cjs'), { recordContentEdit: async (_sb, e) => { events.push(e); return 'ev-' + events.length } })
  stub(req.resolve('../../services/shared/editor-identity.cjs'), { serviceIdentity: n => ({ name: n }) })
  stub(req.resolve('../../services/gender-haiku-service.cjs'), { ensureExpansionForText: async (_c, t) => { generated.push(t); return { status: ensureStatus(t) } } })
}

async function run() {
  process.env.APPLY = '1'; process.env.COURSES = 'ita_for_jpn'
  process.env.SSI_EVIDENCE_ROOT = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'resync-test-'))
  delete require.cache[SCRIPT]; delete require.cache[req.resolve('../lib/evidence-path.cjs')]
  const mod = require(SCRIPT)
  if (typeof mod.main === 'function') await mod.main(); else await ended
}

describe('gender-expansions resync: never delete what it cannot replace', () => {
  beforeEach(install)

  it('generation failing refuses every delete and files no event (the pass-one failure mode)', async () => {
    ensureStatus = () => 'llm-failed'
    await run()
    expect(deleted).toEqual([])
    expect(events).toEqual([])
  })

  it('a row keyed to a stale surface form gets its live text generated before the row goes', async () => {
    ensureStatus = t => (t === 'sono stanco' ? 'no-variants' : 'written')
    await run()
    expect(generated).toContain('sono pronto a imparare')
    expect(deleted.sort()).toEqual(['a', 'b'])
    expect(events).toHaveLength(1)
  })
})
