/**
 * The forum reader's rules as tests: staff dropped by Discourse's flags, @kai always surfaced,
 * state only moves forward, and a quiet day publishes nothing.
 * Run: npx vitest run tools/forum-reader/forum-reader.test.cjs
 */
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const { mentionsKai, triage, parseFindings, checkInPopty, fetchNewPosts, run } = require('./forum-reader.cjs')

let nextId = 1000
const post = (o = {}) => ({
  id: ++nextId, username: 'learner1', staff: false, moderator: false, admin: false,
  created_at: '2026-10-18T09:00:00.000Z', topic_id: 1, topic_slug: 't', topic_title: 'Chat', post_number: 1,
  raw: 'Lovely day', cooked: '', ...o,
})

describe('who is read', () => {
  it('drops staff by any of the three Discourse flags, with no name list', () => {
    const ps = [post({ staff: true, raw: 'wrong translation' }), post({ moderator: true, raw: 'wrong translation' }),
      post({ admin: true, raw: 'wrong translation' }), post({ raw: 'wrong translation' })]
    const t = triage(ps)
    expect(t.learner.map(p => p.id)).toEqual([ps[3].id])
    expect(t.candidates.map(p => p.id)).toEqual([ps[3].id])
  })

  it('surfaces an @kai mention whatever it says and whoever wrote it, but not Kai himself', () => {
    const ps = [post({ raw: 'thanks @Kai!' }), post({ staff: true, raw: '@kai can you look' }),
      post({ username: 'Kai', staff: true, raw: '@kai note to self' }), post({ raw: 'email me at x@kai.com' }),
      post({ raw: '@kaiser hello' })]
    expect(triage(ps).mentions.map(p => p.id)).toEqual([ps[0].id, ps[1].id])
  })

  it('does not count @kai inside a quote of someone else', () => {
    expect(mentionsKai(post({ raw: '[quote="bob, post:3"]\n@kai hi\n[/quote]\nme too' }))).toBe(false)
    expect(mentionsKai(post({ raw: 'hi', cooked: '<p><a class="mention" href="/u/kai">@Kai</a></p>' }))).toBe(true)
  })
})

describe('the Sonnet answer and the Popty check', () => {
  it('parses a fenced JSON array and caps search terms at three', () => {
    const f = parseFindings('```json\n[{"post_id":"7","course_code":"hin_for_eng","summary":"s","quoted":["a"],"search_terms":["a","b","c","d"],"confidence":"high"}]\n```')
    expect(f).toEqual([{ post_id: 7, course_code: 'hin_for_eng', summary: 's', quoted: ['a'], search_terms: ['a', 'b', 'c'], confidence: 'high' }])
  })

  it('reports still present / no longer found / can\'t tell', async () => {
    const codes = new Set(['hin_for_eng'])
    const get = async url => ({ allItems: decodeURIComponent(url).includes('learn Hindi')
      ? [{ phrase_id: 'hin_for_eng:S0020L04U02', known_text: 'I want to learn Hindi', target_text: 'मैं हिंदी सीखना चाहता हूँ।' }]
      : [{ phrase_id: 'x', known_text: 'unrelated', target_text: 'y' }] })
    expect((await checkInPopty({ course_code: 'hin_for_eng', search_terms: ['learn Hindi'] }, codes, get)).status).toBe('wording found')
    expect((await checkInPopty({ course_code: 'hin_for_eng', search_terms: ['what I mean'] }, codes, get)).status).toBe('wording not found')
    expect((await checkInPopty({ course_code: null, search_terms: ['x'] }, codes, get)).status).toBe("can't tell")
    expect((await checkInPopty({ course_code: 'cym_x', search_terms: ['x'] }, codes, get)).status).toBe("can't tell")
  })
})

describe('the run', () => {
  const tmpState = () => path.join(fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'fr-')), 'state.json')

  it('pages /posts.json back to the last id seen and returns oldest first', async () => {
    const pages = { '': [{ id: 30 }, { id: 29 }], '?before=29': [{ id: 28 }, { id: 27 }, { id: 26 }] }
    const get = async url => ({ latest_posts: (pages[url.split('posts.json')[1]] || []).map(p => ({ ...p, created_at: '2026-10-18' })) })
    const { posts } = await fetchNewPosts({ afterId: 27, get, pause: 0 })
    expect(posts.map(p => p.id)).toEqual([28, 29, 30])
  })

  it('a quiet day publishes nothing, skips Sonnet, and still advances the state', async () => {
    const state = tmpState()
    fs.writeFileSync(state, JSON.stringify({ lastPostId: 5 }))
    const ps = [post({ id: 6, raw: 'see you at the meetup' })]
    let screened = 0, published = 0
    const get = async url => ({ latest_posts: url.includes('before') ? [] : ps })
    const r = await run({ state, llm: true, popty: true }, { get, screen: async () => { screened++; return [] }, publish: async () => { published++; return 'u' }, log: () => {} })
    expect([screened, published, r.doc]).toEqual([0, 0, null])
    expect(JSON.parse(fs.readFileSync(state, 'utf8')).lastPostId).toBe(6)
  })

  it('puts mentions first, publishes once, and never moves state backwards on a --days read-back', async () => {
    const state = tmpState()
    fs.writeFileSync(state, JSON.stringify({ lastPostId: 999999 }))
    const err = post({ id: 50, raw: 'The Hindi prompt "I want to learn Hindi" is wrong', topic_title: 'Hindi' })
    const men = post({ id: 51, raw: '@kai lovely work', staff: true, username: 'aran' })
    const get = async url => url.includes('/api/courses') ? { courses: [{ course_code: 'hin_for_eng', display_name: 'Hindi' }] }
      : url.includes('learning-journey') ? { allItems: [{ phrase_id: 'p1', known_text: 'I want to learn Hindi', target_text: 'z' }] }
      : { latest_posts: url.includes('before') ? [] : [men, err] }
    const screen = async () => [{ post_id: 50, course_code: 'hin_for_eng', summary: 'wrong Hindi', quoted: [], search_terms: ['learn Hindi'], confidence: 'high' }]
    const docs = []
    const r = await run({ state, days: 14, llm: true, popty: true }, { get, screen, publish: async d => { docs.push(d); return 'https://x/d/1' }, log: () => {}, now: new Date('2026-10-19T07:00:00Z') })
    expect(docs.length).toBe(1)
    expect(r.doc.indexOf('Mentions of you')).toBeLessThan(r.doc.indexOf('Possible content errors'))
    expect(r.doc).toContain('the wording is in the course')
    expect(JSON.parse(fs.readFileSync(state, 'utf8')).lastPostId).toBe(999999)
  })
})

describe('a failed Sonnet pass', () => {
  it('fails the run before the state moves, so the posts are re-read next time', async () => {
    const state = path.join(fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'fr-')), 'state.json')
    fs.writeFileSync(state, JSON.stringify({ lastPostId: 5 }))
    const get = async url => url.includes('/api/courses') ? { courses: [] } : { latest_posts: url.includes('before') ? [] : [post({ id: 9, raw: 'wrong word' })] }
    await expect(run({ state, llm: true, popty: true }, { get, screen: async () => { throw new Error('cli down') }, publish: async () => 'u', log: () => {} })).rejects.toThrow('cli down')
    expect(JSON.parse(fs.readFileSync(state, 'utf8')).lastPostId).toBe(5)
  })
})
