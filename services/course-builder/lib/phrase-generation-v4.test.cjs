/**
 * The per-LEGO phrase v4 door (job #544). No database, no model: the door's collaborators are injected.
 * Run: npx vitest run services/course-builder/lib/phrase-generation-v4.test.cjs
 */
import { describe, it, expect } from 'vitest'

const { prepareV4, buildV4Section, stagedRows, generateLegoPhrasesV4 } = require('./phrase-generation-v4.cjs')

const PATTERNS = [{ id: 'P1', name: 'want to', shape: 'I want to ___' }, { id: 'P2', name: 'can I', shape: 'can I ___' }]
const course = () => ({
  course: { course_code: 'fra_for_eng', status: 'beta' },
  seeds: [{ seed_number: 1, known_text: 'I want', target_text: 'je veux' }],
  legos: [{ id: 'l1', seed_number: 1, lego_index: 1, known_text: 'I want', target_text: 'je veux', type: 'A', is_new: true }],
  phrases: [{ id: 'c1', seed_number: 1, lego_index: 1, phrase_role: 'component', known_text: 'I', target_text: 'je' }],
})
const tagger = (opts = {}) => ({
  knownLanguageName: () => 'English',
  ensureTagged: async () => { if (opts.fail) throw new Error('haiku unavailable') },
  framesOf: (k) => (/can/.test(k) ? ['P2'] : ['P1']),
  hasOpener: (k) => /^thank you,/i.test(k),
})
const mkDeps = (over = {}) => ({
  door: { readCourse: async () => course(), gateStagedRows: async ({ rows }) => ({ refused: over.refuse ? rows.filter(over.refuse).map((r) => ({ ...r, reasons: ['ZUT whole course: clash'] })) : [] }) },
  gateCheck: {}, checkPhraseZUT: async () => [], patterns: PATTERNS,
  tagger: tagger(over.tagger),
  tagCourse: async () => {}, inventory: () => ({}), availableAt: () => ['P1', 'P2'],
  carriersByFrame: () => ({ P1: [{ known_text: 'I want', target_text: 'je veux' }], P2: [] }),
})
const phrases = (use) => ({ build: [{ known: 'I want to go', target: 'je veux aller' }], use: use.map((k) => ({ known: k, target: 't ' + k })) })

describe('buildV4Section', () => {
  it('lists each available frame with its taught carriers and forbids a stapled opener', () => {
    const s = buildV4Section({ available: ['P1', 'P2'], carriers: { P1: [{ known_text: 'I want', target_text: 'je veux' }] }, patterns: PATTERNS })
    expect(s).toContain('P1 want to')
    expect(s).toContain('"I want" = je veux')
    expect(s).toContain('P2 can I')
    expect(s).toMatch(/NOT ALLOWED[^]*stapled on the front/)
  })
})

describe('prepareV4 checks', () => {
  it('refuses a stapled opener and a USE that is not a sentence', async () => {
    const v4 = await prepareV4({}, 'fra_for_eng', 1, 1, { deps: mkDeps() })
    const reasons = await v4.extraCheck({ phrases: phrases(['thank you, I want to go home today', 'go']) })
    expect(reasons.join('\n')).toMatch(/stapled opener/)
    expect(reasons.join('\n')).toMatch(/USE "go": too short/)
  })

  it('carries the gap-fill door\'s own refusals into the reasons, and passes a clean set', async () => {
    const dirty = await prepareV4({}, 'fra_for_eng', 1, 1, { deps: mkDeps({ refuse: (r) => /home/.test(r.known_text) }) })
    expect((await dirty.extraCheck({ phrases: phrases(['I want to go home now please', 'can I want to go out tonight']) })).join('\n')).toMatch(/ZUT whole course: clash/)
    const clean = await prepareV4({}, 'fra_for_eng', 1, 1, { deps: mkDeps() })
    expect(await clean.extraCheck({ phrases: phrases(['I want to go home now please', 'can I want to go out tonight']) })).toEqual([])
    expect(clean.report.distinct_frames).toBe(2)
    expect(clean.report.frames).toBe('run')
  })

  it('says so when the frame tagger is down: the opener check is reported as NOT run, never as passed', async () => {
    const v4 = await prepareV4({}, 'fra_for_eng', 1, 1, { deps: mkDeps({ tagger: { fail: true } }) })
    const reasons = await v4.extraCheck({ phrases: phrases(['thank you, I want to go home today']) })
    expect(reasons.join('\n')).not.toMatch(/stapled opener/)
    expect(v4.report.frames).toMatch(/^not run: haiku unavailable/)
    expect(v4.report.distinct_frames).toBeNull()
  })

  it('takes a LEGO the builder proposes before the seed exists, and refuses an unknown one without a proposal', async () => {
    const d = mkDeps()
    d.door.readCourse = async () => ({ ...course(), legos: [] })
    await expect(prepareV4({}, 'fra_for_eng', 2, 1, { deps: d })).rejects.toThrow(/not in the course/)
    const v4 = await prepareV4({}, 'fra_for_eng', 2, 1, { proposedLego: { known: 'to go', target: 'aller', type: 'A' }, deps: d })
    expect(v4.lego).toMatchObject({ known_text: 'to go', target_text: 'aller', is_new: true })
  })
})

describe('generateLegoPhrasesV4', () => {
  it('hands v3\'s generator the v4 section and checker, stamps the result, and offers staged rows only for a set that passed', async () => {
    let seen
    const generateFn = async (sb, c, s, l, opts) => { seen = opts; await opts.extraCheck({ phrases: phrases(['I want to go home now please']) }); return { blocked: false, build: [], use: [] } }
    const ok = await generateLegoPhrasesV4({}, 'fra_for_eng', 1, 1, { generateFn, deps: mkDeps() })
    expect(seen.frameSectionFn()).toContain('PHRASE v4')
    expect(ok.pipeline).toBe('v4')
    expect(ok.staged_rows.map((r) => r.phrase_role)).toEqual(['build', 'use'])
    expect(ok.staged_rows[0]).toMatchObject({ seed_number: 1, lego_index: 1, lego_target: 'je veux', known_text: 'I want to go' })
    const blocked = await generateLegoPhrasesV4({}, 'fra_for_eng', 1, 1, { generateFn: async () => ({ blocked: true, build: [], use: [] }), deps: mkDeps() })
    expect(blocked.staged_rows).toEqual([])
  })
})

describe('stagedRows', () => {
  it('is the gap-fill door\'s row shape', () => {
    const rows = stagedRows({ phrases: phrases(['a b c d e']), lego: { known_text: 'k', target_text: 't' }, seedNumber: 3, legoIndex: 2, framesOfText: () => ['P1'] })
    expect(Object.keys(rows[0]).sort()).toEqual(['frames', 'known_text', 'lego_index', 'lego_known', 'lego_target', 'phrase_role', 'seed_number', 'target_text'])
  })
})
