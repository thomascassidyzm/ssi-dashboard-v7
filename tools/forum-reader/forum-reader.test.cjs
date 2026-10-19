/**
 * The forum reader's rules as tests: staff dropped by Discourse's flags, @kai always surfaced,
 * state only moves forward, a quiet day sends nothing, the message goes into Kai's chat through the
 * Deborah check's door (surface-notice, toPerson kai), and every complaint is scanned for its
 * underlying issue in OUR course, legacy-app post or not (Kai, 2026-10-19).
 * Run: npx vitest run tools/forum-reader/forum-reader.test.cjs
 */
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const { mentionsKai, triage, parseFindings, buildPrompt, checkInPopty, containsWord, fetchNewPosts, postToKai, run } = require('./forum-reader.cjs')

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

// a learning-journey/search answer: rounds in course order, each with its LEGO's intro/debut and phrases
const round = (n, legoId, isNew, lego, phrases = []) => ({
  roundNumber: n, legoId, seedId: legoId.slice(0, 5), isNew,
  items: [{ type: 'debut', legoId, seedNumber: Number(legoId.slice(1, 5)), known_text: lego[0], target_text: lego[1], hasAudio: true },
    ...phrases.map(([k, t, hasAudio = true], i) => ({ type: 'practice', phrase_id: `${legoId}U0${i + 1}`, legoId, seedNumber: Number(legoId.slice(1, 5)), known_text: k, target_text: t, hasAudio }))],
})
const journeyGet = rounds => async url => {
  const q = decodeURIComponent(url.split('q=')[1] || '').toLowerCase()
  const hit = rounds.filter(r => /^\d+$/.test(q) ? r.seedId === `S${q.padStart(4, '0')}` : r.items.some(i => `${i.known_text} ${i.target_text}`.toLowerCase().includes(q)))
  return { rounds: hit, allItems: hit.flatMap(r => r.items) }
}

describe('the Sonnet answer', () => {
  it('parses a fenced JSON array, keeps a legacy-app report, and caps the word lists at three', () => {
    const f = parseFindings('```json\n[{"post_id":"7","course_codes":["spa_for_eng","spa_mx_for_eng"],"seed":"12","complaint":"c","issue":"used_before_taught","target_words":["a","b","c","d"],"known_words":[],"search_terms":["a","b","c","d"],"legacy_app":"likely","legacy_reason":"Level 1","confidence":"high"}]\n```')
    expect(f).toEqual([{ post_id: 7, course_codes: ['spa_for_eng', 'spa_mx_for_eng'], seed: 12, complaint: 'c', issue: 'used_before_taught', target_words: ['a', 'b', 'c'], known_words: [], search_terms: ['a', 'b', 'c'], legacy_app: 'likely', legacy_reason: 'Level 1', confidence: 'high' }])
  })

  it('tells Sonnet never to drop a post for seeming legacy or for wording not matching', () => {
    const p = buildPrompt([post({ raw: 'x' })], [])
    expect(p).toMatch(/NEVER leave a post out because it seems to be about the legacy app/)
    expect(p).toMatch(/legacy_app/)
    expect(p).toMatch(/used_before_taught/)
    expect(p).toMatch(/course_codes: up to 3/)
    expect(p).not.toMatch(/may not be listed/)
  })

  it('drops anything Sonnet labels an app complaint, and the prompt rules app/playback/UI out', () => {
    const f = parseFindings('[{"post_id":1,"issue":"app_not_content","complaint":"stuck in a loop"},{"post_id":2,"issue":"wrong_translation","complaint":"wrong word"}]')
    expect(f.map(x => x.post_id)).toEqual([2])
    const p = buildPrompt([post({ raw: 'x' })], [])
    expect(p).toMatch(/ONLY COURSE CONTENT/)
    expect(p).toMatch(/stuck in a loop/)
    expect(p).toMatch(/app_not_content/)
  })

  it('the keyword filter does not keep a post just for saying bug or glitch', () => {
    expect(triage([post({ raw: 'Found a bug, the app glitches on my phone' })]).candidates).toEqual([])
    expect(triage([post({ raw: 'I think this translation is off' })]).candidates.length).toBe(1)
  })

  it('takes an old single course_code answer as a one-item list', () => {
    expect(parseFindings('[{"post_id":1,"course_code":"cym_n_for_eng"}]')[0].course_codes).toEqual(['cym_n_for_eng'])
  })
})

describe('general voice comments (Kai, 2026-10-19)', () => {
  it('keeps a general voice-sound post in its own low-key section, not the main list; app complaints stay dropped', async () => {
    const voice = post({ id: 70, raw: 'The male voice sounds a bit robotic to me', topic_slug: 'v', topic_id: 3, post_number: 2 })
    expect(triage([voice]).candidates.length).toBe(1)
    const f = parseFindings('[{"post_id":70,"issue":"voice_general","complaint":"male voice sounds robotic","course_codes":[]},{"post_id":71,"issue":"app_not_content","complaint":"loop"}]')
    expect(f.map(x => x.post_id)).toEqual([70])
    expect(buildPrompt([voice], [])).toMatch(/voice_general/)
    const state = path.join(fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'fr-')), 'state.json')
    const get = async url => url.includes('/api/courses') ? { courses: [] } : { latest_posts: url.includes('before') ? [] : [voice] }
    const r = await run({ state, days: 1, llm: true, popty: true }, { get, screen: async () => f, send: async () => ({ ok: true }), log: () => {}, now: new Date('2026-10-19T07:00:00Z') })
    expect(r.findings).toEqual([])
    expect(r.message).toContain('VOICE COMMENTS (not for action')
    expect(r.message).not.toContain('POSSIBLE CONTENT PROBLEMS')
    expect(r.message).toContain('robotic')
    expect(r.message).toContain('/t/v/3/2')
  })
})

describe('the Popty scan for the underlying issue', () => {
  const codes = new Set(['spa_for_eng'])
  const course = [
    round(1, 'S0001L01', true, ['I want', 'quiero'], [['I want it', 'lo quiero']]),
    round(2, 'S0002L01', true, ['to speak', 'hablar'], [['I want to speak with you', 'quiero hablar contigo']]),
    round(3, 'S0003L01', true, ['with you', 'contigo']),
    round(4, 'S0004L01', true, ['I want', 'quiero']),
    round(5, 'S0005L01', true, ['now', 'ahora'], [['now', 'ahora', false]]),
  ]
  const get = journeyGet(course)

  it('finds a word used before it is taught, even when the learner\'s own wording is nowhere in the course', async () => {
    const c = await checkInPopty({ course_code: 'spa_for_eng', issue: 'used_before_taught', target_words: ['contigo'], known_words: [], search_terms: ['wording from the old app'], seed: null }, codes, get)
    expect(c.exists).toBe('yes')
    expect(c.says.join(' ')).toMatch(/"contigo" is first used in seed 2 .* only taught in seed 3/)
  })

  it('does not call a phrase built from several LEGOs "never taught"', async () => {
    const c = await checkInPopty({ course_code: 'spa_for_eng', issue: 'used_before_taught', target_words: ['hablar contigo'], known_words: [], search_terms: [], seed: null }, codes, get)
    expect(c.exists).toBe("can't tell")
    expect(c.says.join(' ')).toMatch(/is not a LEGO of its own/)
  })

  it('says no when the word is taught before its first use', async () => {
    const c = await checkInPopty({ course_code: 'spa_for_eng', issue: 'used_before_taught', target_words: ['hablar'], known_words: [], search_terms: [], seed: null }, codes, get)
    expect(c.exists).toBe('no')
  })

  it("can't tell, never no, when the word itself is not in the course", async () => {
    const c = await checkInPopty({ course_code: 'spa_for_eng', issue: 'used_before_taught', target_words: ['contigo', 'dyw e ddim'], known_words: [], search_terms: [], seed: null }, codes, get)
    expect(c.exists).toBe('yes')
    const d = await checkInPopty({ course_code: 'spa_for_eng', issue: 'used_before_taught', target_words: ['hablar', 'dyw e ddim'], known_words: [], search_terms: [], seed: null }, codes, get)
    expect(d.exists).toBe("can't tell")
    expect(d.says.join(' ')).toMatch(/not in our course in that spelling/)
  })

  it('finds an item introduced twice', async () => {
    const c = await checkInPopty({ course_code: 'spa_for_eng', issue: 'introduced_twice', target_words: ['quiero'], known_words: [], search_terms: [], seed: null }, codes, get)
    expect(c.exists).toBe('yes')
    expect(c.says.join(' ')).toMatch(/"quiero" is introduced as new 2 times/)
  })

  it('finds missing audio for a voice complaint, and lists the seed\'s LEGOs when a seed is named', async () => {
    const c = await checkInPopty({ course_code: 'spa_for_eng', issue: 'audio_or_voice', target_words: ['ahora'], known_words: [], search_terms: [], seed: 5 }, codes, get)
    expect(c.exists).toBe('yes')
    expect(c.says.join(' ')).toMatch(/seed 5 LEGOs now: now = ahora/)
  })

  it('matches whole words only', () => {
    expect(containsWord('quiero hablar contigo', 'con')).toBe(false)
    expect(containsWord('¿Hablas conmigo?', 'hablas')).toBe(true)
  })

  it("can't tell without a Popty course", async () => {
    expect((await checkInPopty({ course_code: null, target_words: ['x'] }, codes, get)).exists).toBe("can't tell")
    expect((await checkInPopty({ course_code: 'cym_x', target_words: ['x'] }, codes, get)).exists).toBe("can't tell")
  })
})

describe('delivery into Kai\'s chat', () => {
  it('posts to /api/surface-notice addressed toPerson kai, never a hard-coded room, under a session cookie', async () => {
    const dir = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'fr-'))
    fs.writeFileSync(path.join(dir, 's'), 'v2.fleet\n')
    const calls = []
    const fetchImpl = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => ({ ok: true, delivered: true }) } }
    await postToKai('hello', { env: { CS_SESSION_FILE: path.join(dir, 's') }, fetchImpl })
    expect(calls[0].url).toMatch(/\/api\/surface-notice$/)
    expect(JSON.parse(calls[0].init.body)).toEqual({ toPerson: 'kai', text: 'hello', relay: 'forum-reader' })
    expect(calls[0].init.headers.Cookie).toBe('cs_user=v2.fleet')
    await postToKai('hi', { env: { CS_SESSION_FILE: path.join(dir, 's'), FORUM_READER_WATSON_JOB: 'room-1' }, fetchImpl })
    expect(JSON.parse(calls[1].init.body).jobId).toBe('room-1')
  })

  it('refuses to send without an identity, and fails on a refused notice', async () => {
    await expect(postToKai('x', { env: { CS_SESSION_FILE: '/nonexistent' }, fetchImpl: async () => { throw new Error('should not be called') } })).rejects.toThrow(/no session cookie/)
    const dir = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'fr-'))
    fs.writeFileSync(path.join(dir, 's'), 'v2.x')
    await expect(postToKai('x', { env: { CS_SESSION_FILE: path.join(dir, 's') }, fetchImpl: async () => ({ ok: false, status: 409, json: async () => ({ ok: false }) }) })).rejects.toThrow(/409/)
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

  it('a quiet day sends nothing, skips Sonnet, and still advances the state', async () => {
    const state = tmpState()
    fs.writeFileSync(state, JSON.stringify({ lastPostId: 5 }))
    const ps = [post({ id: 6, raw: 'see you at the meetup' })]
    let screened = 0, sent = 0
    const get = async url => ({ latest_posts: url.includes('before') ? [] : ps })
    const r = await run({ state, llm: true, popty: true }, { get, screen: async () => { screened++; return [] }, send: async () => { sent++; return { ok: true } }, log: () => {} })
    expect([screened, sent, r.message]).toEqual([0, 0, null])
    expect(JSON.parse(fs.readFileSync(state, 'utf8')).lastPostId).toBe(6)
  })

  it('sends ONE plain message with mentions first, course, seed, complaint, our-course verdict apart from the legacy flag, and the link', async () => {
    const state = tmpState()
    fs.writeFileSync(state, JSON.stringify({ lastPostId: 999999 }))
    const err = post({ id: 50, raw: 'On Level 1 the old app used "contigo" before teaching it', topic_title: 'Spanish', post_url: '/t/spanish/9/2' })
    const men = post({ id: 51, raw: '@kai lovely work', staff: true, username: 'aran' })
    const course = [round(2, 'S0002L01', true, ['to speak', 'hablar'], [['to speak with you', 'hablar contigo']]), round(3, 'S0003L01', true, ['with you', 'contigo'])]
    const jget = journeyGet(course)
    const get = async url => url.includes('/api/courses') ? { courses: [{ course_code: 'spa_for_eng', display_name: 'Spanish' }] }
      : url.includes('learning-journey') ? jget(url)
      : { latest_posts: url.includes('before') ? [] : [men, err] }
    const screen = async () => [{ post_id: 50, course_codes: ['spa_for_eng'], seed: 2, complaint: 'contigo is used before it is taught', issue: 'used_before_taught', target_words: ['contigo'], known_words: [], search_terms: [], legacy_app: 'likely', legacy_reason: 'mentions Level 1', confidence: 'high' }]
    const sent = []
    const r = await run({ state, days: 14, llm: true, popty: true }, { get, screen, send: async m => { sent.push(m); return { ok: true } }, log: () => {}, now: new Date('2026-10-19T07:00:00Z') })
    expect(sent).toEqual([r.message])
    const m = r.message
    expect(m.indexOf('MENTIONS OF YOU')).toBeLessThan(m.indexOf('POSSIBLE CONTENT PROBLEMS'))
    expect(m).toContain('1. Spanish (spa_for_eng), seed 2')
    expect(m).toContain('Learner (learner1): contigo is used before it is taught')
    expect(m).toContain('Post: probably about the legacy app (mentions Level 1)')
    expect(m).toContain('Our course: YES, the issue is in our course')
    expect(m).toContain('https://en.forum.saysomethingin.com/t/spanish/9/2')
    expect(m).not.toMatch(/[#*>`]/)   // phone-readable plain text, no markdown
    expect(JSON.parse(fs.readFileSync(state, 'utf8')).lastPostId).toBe(999999)
  })

  it('scans every candidate course when the variant is unclear, one verdict line each', async () => {
    const state = tmpState()
    const err = post({ id: 60, raw: 'In Welsh "contigo" comes before it is taught' })
    const jget = journeyGet([round(2, 'S0002L01', true, ['to speak', 'hablar'], [['to speak with you', 'hablar contigo']]), round(3, 'S0003L01', true, ['with you', 'contigo'])])
    const get = async url => url.includes('/api/courses') ? { courses: [{ course_code: 'cym_n_for_eng', display_name: 'North Welsh' }, { course_code: 'cym_s_for_eng', display_name: 'South Welsh' }] }
      : url.includes('learning-journey') ? (url.includes('cym_s') ? { rounds: [], allItems: [] } : jget(url))
      : { latest_posts: url.includes('before') ? [] : [err] }
    const screen = async () => [{ post_id: 60, course_codes: ['cym_n_for_eng', 'cym_s_for_eng'], seed: null, complaint: 'c', issue: 'used_before_taught', target_words: ['contigo'], known_words: [], search_terms: [], legacy_app: 'unclear', legacy_reason: '', confidence: 'high' }]
    const r = await run({ state, days: 1, llm: true, popty: true }, { get, screen, send: async () => ({ ok: true }), log: () => {}, now: new Date('2026-10-19T07:00:00Z') })
    expect(r.message).toContain('1. cym_n_for_eng or cym_s_for_eng')
    expect(r.message).toContain('In North Welsh (cym_n_for_eng): YES')
    expect(r.message).toContain("In South Welsh (cym_s_for_eng): CAN'T TELL")
  })

  it('a failed send fails the run before the state moves', async () => {
    const state = tmpState()
    fs.writeFileSync(state, JSON.stringify({ lastPostId: 5 }))
    const get = async url => ({ latest_posts: url.includes('before') ? [] : [post({ id: 9, raw: '@kai hi' })] })
    await expect(run({ state, llm: false, popty: false }, { get, send: async () => { throw new Error('surface-notice failed: HTTP 409') }, log: () => {} })).rejects.toThrow('409')
    expect(JSON.parse(fs.readFileSync(state, 'utf8')).lastPostId).toBe(5)
  })
})

describe('a failed Sonnet pass', () => {
  it('fails the run before the state moves, so the posts are re-read next time', async () => {
    const state = path.join(fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'fr-')), 'state.json')
    fs.writeFileSync(state, JSON.stringify({ lastPostId: 5 }))
    const get = async url => url.includes('/api/courses') ? { courses: [] } : { latest_posts: url.includes('before') ? [] : [post({ id: 9, raw: 'wrong word' })] }
    await expect(run({ state, llm: true, popty: true }, { get, screen: async () => { throw new Error('cli down') }, send: async () => ({ ok: true }), log: () => {} })).rejects.toThrow('cli down')
    expect(JSON.parse(fs.readFileSync(state, 'utf8')).lastPostId).toBe(5)
  })
})
