// A-133 — build the voice-tail screening list, in Tom's priority order.
//
// Tom's ruling, 2026-08-17: "sample HEAVY-USE voices first, not alphabetically.
// (1) English voices first — his own voice clone and Olivia; (2) the big money
// courses next — Chinese, Spanish, German, French, Japanese; (3) everything
// else after."
//
// This reads the estate and emits the candidate list already ordered that way,
// with each voice's measured clip count attached so the ordering is evidence and
// not a guess. Feed the output to a133-voice-tail-screen.cjs, which re-applies
// prioritise() anyway — belt and braces, so a hand-edited list can't silently
// fall back to whatever order someone typed it in.
//
// READ-ONLY. One SELECT. Renders nothing, spends nothing, writes one JSON file.
// Needs .env.psql (DATABASE_URL, secret zero) — see docs/secrets-vault.md.
//
// TWO TRAPS THIS FILE HANDLES, both of which have burned queries before:
//   1. Voice ids exist in BARE and PREFIXED spellings ('eve' / 'xai_eve'). Tom's
//      clone is 183,194 rows as `gfzdpspr5fdp` and another 142,029 as
//      `xai_gfzdpspr5fdp`; Olivia is 70,281 + 79,956. Match one spelling and you
//      under-count a voice by about half and mis-rank the whole list.
//   2. "Olivia" is not findable by name. `voices` stores her as id `bedd6226`
//      with display_name 'Olivia'; `course_audio.voice_id` never contains the
//      string 'olivia' anywhere. A name search returns zero rows and reads as
//      "there is no Olivia voice", which is exactly the wrong conclusion — she
//      is the 4th heaviest voice in the estate.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.psql') })
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path')
const { Client } = require('pg')
const { prioritise } = require('./a133-voice-tail-screen.cjs')

// Probe lines, one per language a voice might serve. Short, sentence-final, and
// chosen to end on a consonant where the language allows it — a trailing vowel's
// decay partly masks a post-speech impulse and makes the screen less sensitive.
// Mandarin is the known weak case here: its syllables end in vowels or nasals, so
// the zho line has a softer decay than the others and the screen is correspondingly
// less sensitive on it. Stated rather than papered over.
const LINES = {
  eng: "I'd like a glass of water, please.",
  nld: 'Ik wil graag een glas bitter, alstublieft.',
  zho: '请给我一杯水，谢谢。',
  spa: 'Quiero un vaso de agua, por favor.',
  deu: 'Ich möchte bitte ein Glas Wasser.',
  fra: 'Je voudrais boire quelque chose.',
  jpn: 'お水を一杯お願いします。',
}
// xAI wants a short language tag; Azure infers it from the voice name.
const XAI_TAG = { eng: 'en', nld: 'nl', zho: 'zh', spa: 'es', deu: 'de', fra: 'fr', jpn: 'ja' }

// A voice is worth a render if it has actually shipped this many clips. Below
// this it is noise (one-off experiments, legacy imports) and it belongs in a
// separate not-yet-cast sweep, not this one.
const MIN_CLIPS = Number(process.env.MIN_CLIPS || 2000)

const SQL = `
  select regexp_replace(a.voice_id, '^(xai_|azure_|elevenlabs_)', '') as voice,
         c.target_lang,
         count(*)::int as clips
  from course_audio a
  join courses c on c.course_code = a.course_code
  where a.voice_id is not null
    and a.voice_id <> 'legacy_import'
    and a.voice_id not like 'comp:%'
  group by 1, 2
`

// A VOICE'S LANGUAGE IS A PROPERTY OF THE VOICE, NOT OF THE COURSES IT SERVES.
// This is worth stating because deriving it from courses.target_lang is wrong and
// looks right: a course has two sides, and roughly half the estate's clips are a
// voice speaking the KNOWN side. Doing it that way labelled zh-CN-XiaochenNeural
// "English" (she reads the Chinese known side of eng_for_zho, whose target_lang
// IS 'eng') and ta-LK-SaranyaNeural "Korean". Both are nonsense, and both would
// have been screened on the wrong probe line.
//
// So: Azure voice names carry their own locale, and the xAI pool is the
// English-side pool by construction.
const AZURE_LOCALE = /^([a-z]{2})-([A-Z]{2})-/
const LOCALE_TO_LANG = { en: 'eng', nl: 'nld', zh: 'zho', es: 'spa', de: 'deu', fr: 'fra', ja: 'jpn' }

// The xAI multilingual + clone pool reads the ENGLISH known side in every course
// in the estate — that is what Tom's clone, Olivia, Eve, Leo and Ara are for.
// Per-language xAI clones (Dutch Noor and friends) are not in this set and are
// resolved from the pod voice list instead.
const XAI_ENGLISH_POOL = new Set(['gfzdpspr5fdp', 'bedd6226', 'eve', 'leo', 'ara', 'rex', 'sal'])

// Per-language xAI voice ids, read from the pod pool file (owned elsewhere —
// read only, never written here).
const XAI_BY_LANG = (() => {
  const m = new Map()
  try {
    const pool = require('../pod-voices-xai.json')
    for (const [tag, list] of Object.entries(pool)) {
      if (tag === 'multilingual') continue
      const lang = LOCALE_TO_LANG[tag.split('-')[0]]
      for (const v of list) m.set(v.voice_id, lang || `xai:${tag}`)
    }
  } catch { /* pool file absent — xAI per-language voices fall into the gap list */ }
  return m
})()

// Returns the language this voice SPEAKS, or null if we cannot tell — in which
// case it goes to the explicit gap list rather than being screened on a guess.
function languageOf(voice) {
  const loc = voice.match(AZURE_LOCALE)
  if (loc) return LOCALE_TO_LANG[loc[1]] || `locale:${loc[1]}`
  if (XAI_ENGLISH_POOL.has(voice)) return 'eng'
  return XAI_BY_LANG.get(voice) || null
}

async function main() {
  const out = process.argv[2] || '/tmp/a133-screen-list.json'
  if (!process.env.DATABASE_URL) {
    console.error('need DATABASE_URL (.env.psql at the repo root) — see docs/secrets-vault.md §Provisioning')
    process.exit(1)
  }
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  const { rows } = await db.query(SQL)
  await db.end()

  // Collapse the bare/prefixed duality, and pick the language a voice mostly serves.
  const byVoice = new Map()
  for (const r of rows) {
    const e = byVoice.get(r.voice) || { voice: r.voice, clips: 0, langs: new Map() }
    e.clips += r.clips
    e.langs.set(r.target_lang, (e.langs.get(r.target_lang) || 0) + r.clips)
    byVoice.set(r.voice, e)
  }

  const skipped = []
  const candidates = []
  for (const e of byVoice.values()) {
    if (e.clips < MIN_CLIPS) continue
    const lang = languageOf(e.voice)
    const text = lang && LINES[lang]
    if (!text) {
      skipped.push({
        voice: e.voice, clips: e.clips,
        lang: lang || 'unknown',
        why: lang ? 'no probe line for this language yet' : 'cannot tell what language this voice speaks',
      })
      continue
    }
    const isAzure = /^[a-z]{2}-[A-Z]{2}-/.test(e.voice)
    candidates.push({
      key: (isAzure ? 'azure_' : 'xai_') + e.voice,
      provider: isAzure ? 'azure' : 'xai',
      ...(isAzure ? { voiceName: e.voice } : { voiceId: e.voice, lang: XAI_TAG[lang] }),
      screenLang: lang, lang, clips: e.clips, text,
    })
  }

  const ordered = prioritise(candidates)
  fs.writeFileSync(out, JSON.stringify(ordered, null, 2))

  for (const t of [1, 2, 3]) {
    const g = ordered.filter(v => v.tier === t)
    console.log(`\n── tier ${t} — ${g.length} voice(s), ${g.reduce((a, v) => a + v.clips, 0).toLocaleString()} shipped clips`)
    for (const v of g.slice(0, 12)) console.log(`   ${String(v.clips).padStart(7)}  ${v.key.padEnd(30)} ${v.tierWhy}`)
    if (g.length > 12) console.log(`   … and ${g.length - 12} more`)
  }
  if (skipped.length) {
    console.log(`\nEXPLICIT GAP — ${skipped.length} voice(s) with >=${MIN_CLIPS} clips are NOT in the list because`)
    console.log('no probe line exists for their language yet. Add them to LINES before claiming coverage:')
    for (const s of skipped.sort((a, b) => b.clips - a.clips).slice(0, 20)) {
      console.log(`   ${String(s.clips).padStart(7)}  ${s.voice.padEnd(30)} ${s.lang}`)
    }
    if (skipped.length > 20) console.log(`   … and ${skipped.length - 20} more`)
  }
  console.log(`\nwrote ${out} — ${ordered.length} voice(s), ~$${(ordered.length * 0.002).toFixed(2)} to screen.`)
  console.log('Running that sweep is bulk rendering and is Tom\'s call — this file only builds the list.')
}

if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(1) })
