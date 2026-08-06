#!/usr/bin/env node
/**
 * Build per-language translation prompts for the 128 new EN keys we just added.
 * Mirrors the wave 1/2/3 UI translation pattern.
 *
 * Reads:  temp/ssi-xlsx/new-en-keys.json
 * Writes: temp/ssi-xlsx/en-additions-prompts/{lang}.prompt.txt
 *         temp/ssi-xlsx/en-additions-batches/{lang}.json
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..', 'temp', 'ssi-xlsx')
const SRC = path.join(ROOT, 'new-en-keys.json')
const TR_DIR = path.join(require('os').homedir(), 'Documents', 'GitHub', 'course-configs', 'Translations')
const PROMPTS_DIR = path.join(ROOT, 'en-additions-prompts')
const BATCHES_DIR = path.join(ROOT, 'en-additions-batches')

const LANGS = {
  ar:  { name: 'Modern Standard Arabic', file: 'ar', style: '- MSA / الفصحى, formal warm register.\n- RTL script. Use Arabic ؟ ، .\n- Brand names ("SaySomethingin", "SSi", "Aran") stay in Latin script.' },
  bn:  { name: 'Bengali',                  file: 'bn', style: '- Bengali script. Polite আপনি form.' },
  cmn: { name: 'Mandarin (Simplified)',    file: 'cmn', style: '- Simplified Chinese (Hanzi). Polite 您 form. Full-width punctuation: 。 ， ？ ！.' },
  cy:  { name: 'Welsh',                    file: 'cy', style: '- North Walian register matching existing cy.json. Use ti (singular informal).' },
  de:  { name: 'German',                   file: 'de', style: '- Standard Hochdeutsch. Match du / Sie convention from existing de.json.' },
  es:  { name: 'Spanish (Castilian)',      file: 'es', style: '- Castilian Spanish. tú form. Inverted ¡ ¿.' },
  eu:  { name: 'Basque',                   file: 'eu', style: '- Standard Batua matching existing eu.json.' },
  fi:  { name: 'Finnish',                  file: 'fi', style: '- Neutral-polite register matching fi.json.' },
  fr:  { name: 'French',                   file: 'fr', style: '- European French. tu form. Sentence case (no title-case unless proper noun). Space before ? ! :.' },
  ga:  { name: 'Irish',                    file: 'ga', style: '- An Caighdeán Oifigiúil register matching ga.json.' },
  gu:  { name: 'Gujarati',                 file: 'gu', style: '- Gujarati script. Polite તમે form.' },
  hi:  { name: 'Hindi',                    file: 'hi', style: '- Devanagari. Polite आप form.' },
  it:  { name: 'Italian',                  file: 'it', style: '- Standard Italian. tu form.' },
  ja:  { name: 'Japanese',                 file: 'ja', style: '- Polite です/ます register. Tech terms in katakana where conventional.' },
  ko:  { name: 'Korean',                   file: 'ko', style: '- Polite -습니다 / -세요 / -주세요 register. ? for questions, no space before.' },
  nl:  { name: 'Dutch',                    file: 'nl', style: '- Dutch (Nederlands). je form matching nl.json.' },
  pa:  { name: 'Punjabi',                  file: 'pa', style: '- Gurmukhi script. Polite ਤੁਸੀਂ form.' },
  pt:  { name: 'Brazilian Portuguese',     file: 'pt', style: '- Brazilian PT. você form. Aplicativo not aplicação.' },
  si:  { name: 'Sinhala',                  file: 'si', style: '- Sinhala script. Polite register matching si.json.' },
  ta:  { name: 'Tamil',                    file: 'ta', style: '- Tamil script. Polite register matching ta.json.' },
  ur:  { name: 'Urdu',                     file: 'ur', style: '- Urdu Nastaliq script, RTL. Polite آپ form. Brand names stay Latin.' },
  yo:  { name: 'Yoruba',                   file: 'yo', style: '- Yoruba (Èdè Yorùbá), Latin script with diacritics. Polite/respectful register. Preserve diacritics carefully (à, á, ẹ̀, ọ́, etc.).' },
}

function build() {
  const newKeys = JSON.parse(fs.readFileSync(SRC, 'utf8'))
  fs.mkdirSync(PROMPTS_DIR, { recursive: true })
  fs.mkdirSync(BATCHES_DIR, { recursive: true })

  for (const [code, info] of Object.entries(LANGS)) {
    fs.writeFileSync(path.join(BATCHES_DIR, `${code}.json`), JSON.stringify(newKeys, null, 2))
    const existingPath = path.join(TR_DIR, info.file + '.json')
    const existing = fs.existsSync(existingPath) ? JSON.parse(fs.readFileSync(existingPath, 'utf8')) : {}

    const prompt = `You are translating UI strings from English to ${info.name} (${code}) for the SaySomethingin (SSi) language-learning mobile app. These are 128 newly-added strings that the existing translation file is missing.

## Style rules
${info.style}

- Brand "SaySomethingin" stays in English.
- "SSi" stays as-is.
- "Aran" (founder name) stays as-is.
- App Store / Google Play / Google / Apple / Facebook stay in English.
- Variable placeholders in {curly_braces} (e.g. {variableSubscription_price1}, {amount}, {currency}, {belt_color}) MUST be preserved EXACTLY as in the EN source — do not translate, do not move whitespace inside braces.
- Preserve newlines (\\n) and other escape sequences exactly as in source.

CRITICAL JSON rule: inside string values, NEVER use the ASCII straight double-quote character (\"). When the translation needs quotation marks, use the language's natural typographic quotes:
- German: „ ... "
- French: « ... »
- Italian/Spanish/Portuguese: « ... » or " ... "
- Japanese/Chinese/Korean: 「 ... 」
- Hindi/Bengali/Gujarati/Punjabi/Urdu: " ... " or no quote marks
- Other: " ... " or « ... »

## Existing translation file (read for tone, register, terminology)
\`\`\`json
${JSON.stringify(existing, null, 2)}
\`\`\`

## Keys to translate (${Object.keys(newKeys).length} entries — JSON object: key -> EN source string)
\`\`\`json
${JSON.stringify(newKeys, null, 2)}
\`\`\`

## Output instructions
Output ONLY a JSON object mapping each input key to its ${info.name} translation. No prose, no markdown fences, no commentary. Every input key must appear in the output exactly once with a non-empty translated value. All {variables} preserved.

If a key is genuinely ambiguous, still produce a best-effort translation. The JSON itself must come first and be parseable on its own.
`
    fs.writeFileSync(path.join(PROMPTS_DIR, `${code}.prompt.txt`), prompt)
    console.log(`  ${code}: ${Object.keys(newKeys).length} entries`)
  }
}

build()
