#!/usr/bin/env node
/**
 * Build per-language translation prompts for the encouragement migration.
 * Translates 96 English texts (48 encouragements + 48 instructions, all robo-Aran TTS)
 * into 35 known languages.
 *
 * Reads:  temp/encouragement-migration/eng-source.json
 * Writes: temp/encouragement-migration/prompts/{lang}.prompt.txt
 *         temp/encouragement-migration/batches/{lang}.json
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..', 'temp', 'encouragement-migration')
const SRC = path.join(ROOT, 'eng-source.json')
const PROMPTS_DIR = path.join(ROOT, 'prompts')
const BATCHES_DIR = path.join(ROOT, 'batches')

// All 35 known languages we want to translate to (per Kai 2026-04-29).
// 18 paywall-eligible + 17 non-paywall existing-encouragement langs.
const LANGS = {
  // Paywall-eligible (18)
  ara: { name: 'Modern Standard Arabic', style: '- MSA / الفصحى, formal warm register.\n- RTL script. Use Arabic ؟ ، .\n- Brand names ("SaySomethingin", "SSi", "Aran") stay in Latin script.' },
  aze: { name: 'Azerbaijani',            style: '- Latin Azerbaijani script. Polite "siz" form.' },
  ben: { name: 'Bengali',                style: '- Bengali script. Polite আপনি form.' },
  deu: { name: 'German',                 style: '- Standard Hochdeutsch. Match du / Sie convention from existing de.json.' },
  fra: { name: 'French',                 style: '- European French. tu form. NO space before ? ! : ; (UI style, not formal typography).' },
  guj: { name: 'Gujarati',               style: '- Gujarati script. Polite તમે form.' },
  hin: { name: 'Hindi',                  style: '- Devanagari. Polite आप form.' },
  ita: { name: 'Italian',                style: '- Standard Italian. tu form.' },
  jpn: { name: 'Japanese',               style: '- Polite です/ます register. Tech terms in katakana where conventional.' },
  kor: { name: 'Korean',                 style: '- Polite -습니다 / -세요 register. ? for questions, no space before.' },
  lit: { name: 'Lithuanian',             style: '- Lithuanian (lietuvių). Polite second-person; warm but professional.' },
  pan: { name: 'Punjabi',                style: '- Gurmukhi script. Polite ਤੁਸੀਂ form.' },
  por: { name: 'Brazilian Portuguese',   style: '- Brazilian PT. você form. Aplicativo not aplicação.' },
  sin: { name: 'Sinhala',                style: '- Sinhala script (සිංහල). Polite register.' },
  spa: { name: 'Spanish (Castilian)',    style: '- Castilian Spanish. tú form. Inverted ¡ ¿.' },
  tam: { name: 'Tamil',                  style: '- Tamil script (தமிழ்). Polite register.' },
  urd: { name: 'Urdu',                   style: '- Urdu Nastaliq script, RTL. Polite آپ form. Brand names stay Latin.' },
  zho: { name: 'Mandarin (Simplified)',  style: '- Simplified Chinese (Hanzi). Polite 您 form. Full-width punctuation: 。 ， ？ ！.' },

  // Non-paywall existing-encouragement langs (17) — already have encouragements but content predates the new English set
  bul: { name: 'Bulgarian',              style: '- Bulgarian (Cyrillic). Polite/respectful register.' },
  ces: { name: 'Czech',                  style: '- Standard Czech. Polite vykání where appropriate.' },
  dan: { name: 'Danish',                 style: '- Standard Danish. Informal, friendly tone matching mobile-app convention.' },
  ell: { name: 'Greek',                  style: '- Standard Modern Greek. Polite/friendly register. Note: Greek uses ; for question mark.' },
  fil: { name: 'Filipino (Tagalog)',     style: '- Filipino/Tagalog. Polite po/opo register.' },
  fin: { name: 'Finnish',                style: '- Neutral-polite Finnish.' },
  hrv: { name: 'Croatian',               style: '- Standard Croatian. Polite Vi form for "you".' },
  ind: { name: 'Indonesian',             style: '- Bahasa Indonesia. Polite "Anda" or warm "kamu" — match existing tone.' },
  msa: { name: 'Malay (Standard)',       style: '- Bahasa Melayu (standard). Polite "anda" register.' },
  nld: { name: 'Dutch',                  style: '- Dutch. je form (informal/warm).' },
  pol: { name: 'Polish',                 style: '- Standard Polish. Polite formal register (Pan/Pani).' },
  ron: { name: 'Romanian',               style: '- Standard Romanian. Polite dumneavoastră or warm tu — match existing tone.' },
  rus: { name: 'Russian',                style: '- Standard Russian. Warm but respectful (Вы form for the user).' },
  slk: { name: 'Slovak',                 style: '- Standard Slovak. Polite vykanie.' },
  swe: { name: 'Swedish',                style: '- Standard Swedish. Informal du form (universal in modern Swedish UI).' },
  tur: { name: 'Turkish',                style: '- Standard Turkish. Polite siz form.' },
  ukr: { name: 'Ukrainian',              style: '- Standard Ukrainian. Polite Ви form.' },
}

function build() {
  if (!fs.existsSync(SRC)) {
    console.error('Source not found:', SRC)
    process.exit(1)
  }
  fs.mkdirSync(PROMPTS_DIR, { recursive: true })
  fs.mkdirSync(BATCHES_DIR, { recursive: true })

  const source = JSON.parse(fs.readFileSync(SRC, 'utf8'))

  for (const [code, info] of Object.entries(LANGS)) {
    fs.writeFileSync(path.join(BATCHES_DIR, `${code}.json`), JSON.stringify(source, null, 2))

    const prompt = `You are translating Aran's spoken-audio scripts from English to ${info.name} (${code}) for the SaySomethingin (SSi) language-learning mobile app. These are spoken by Aran (the founder) — half are SHORT motivational lines (encouragements, played randomly between exercises) and half are LONGER pedagogical clips (instructions, played in sequence at fixed points). His tone is warm, slightly self-deprecating, encouraging — Aran is an unusually likeable presenter who talks to learners like an old friend who genuinely cares. The instructions in particular are mini-lectures where he explains how the brain learns, why mistakes are good, why repetition is the engine, etc.

## Style rules
${info.style}

- Brand "SaySomethingin" stays in English.
- "SSi" stays as-is.
- "Aran" (founder name) stays as-is.
- Capture Aran's voice: warm, conversational, occasionally self-deprecating, never preachy. He's the reassuring teacher who tells you you're doing great even when you mess up — *because* you're trying.
- Translate the FEEL, not just the words. If the English uses a colloquial idiom, find the closest equivalent in your target language. If a metaphor doesn't land, replace with one that does.
- Preserve sentence count where natural; don't merge or split unless the target language strongly prefers a different structure.

CRITICAL JSON rule: inside string values, NEVER use the ASCII straight double-quote character ("). When the translation needs quotation marks, use the language's natural typographic quotes:
- German: „ ... "
- French: « ... »
- Italian/Spanish/Portuguese: « ... » or " ... "
- Japanese/Chinese/Korean: 「 ... 」
- Hindi/Bengali/Gujarati/Punjabi/Urdu/Tamil: " ... " or no quotes
- Other: " ... " or « ... »

## Source (${source.length} entries — JSON array of { sequence_within_type, audio_type, text })
\`\`\`json
${JSON.stringify(source, null, 2)}
\`\`\`

## Output instructions
Output ONLY a JSON array of { sequence_within_type, audio_type, text } where each entry's sequence_within_type and audio_type match the source and text is the ${info.name} translation. No prose, no markdown fences, no commentary. Every input entry must appear exactly once.

If a passage is genuinely ambiguous, still produce a best-effort translation. The JSON itself must come first and be parseable on its own.
`
    fs.writeFileSync(path.join(PROMPTS_DIR, `${code}.prompt.txt`), prompt)
    console.log(`  ${code}: ${source.length} entries`)
  }
}

build()
