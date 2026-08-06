#!/usr/bin/env node
/**
 * Build per-language translation prompts for paywall expansion.
 * Reads temp/paywall-expansion/eng-source.json, writes one prompt file per
 * target known-language. Then run-paywall-translations.sh fans out N parallel
 * `claude --print --model opus` calls.
 *
 * No DB writes, no audio generation. Just prep.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..', 'temp', 'paywall-expansion')
const SRC = path.join(ROOT, 'eng-source.json')
const PROMPTS_DIR = path.join(ROOT, 'prompts')
const BATCHES_DIR = path.join(ROOT, 'batches')

const LANGS = {
  ara: { name: 'Modern Standard Arabic',                style: '- MSA / الفصحى, formal warm register.\n- RTL script. Use Arabic question mark ؟ and Arabic comma ،.\n- Brand names ("SaySomethingin", "Aran") stay in Latin script.' },
  aze: { name: 'Azerbaijani',                             style: '- Latin Azerbaijani script. Use the polite "siz" form for the user.\n- Match warm, encouraging tone.' },
  ben: { name: 'Bengali',                                 style: '- Bengali script (বাংলা). Polite আপনি form for the user.\n- Tech terms in Bengali where conventional, English loanwords where natural.' },
  deu: { name: 'German',                                  style: '- Standard Hochdeutsch. Use du form (informal/warm).\n- Match Aran\'s playful but encouraging tone.' },
  fra: { name: 'French',                                  style: '- European French. Use tu form (informal/warm).\n- French punctuation: space before ? ! :.' },
  guj: { name: 'Gujarati',                                style: '- Gujarati script (ગુજરાતી). Polite તમે form for the user.' },
  hin: { name: 'Hindi',                                   style: '- Devanagari script (हिन्दी).\n- Polite आप form for the user.' },
  ita: { name: 'Italian',                                 style: '- Standard Italian. Use tu form.' },
  jpn: { name: 'Japanese',                                style: '- Polite です/ます register.\n- Tech/UI terms in katakana where conventional. Use 「」 for in-text quotation if needed.' },
  kor: { name: 'Korean',                                  style: '- Polite -습니다 / -세요 / -주세요 register.\n- Korean punctuation conventions: ? for questions, no space before.' },
  lit: { name: 'Lithuanian',                              style: '- Lithuanian (lietuvių). Polite second-person; warm but professional register.' },
  pan: { name: 'Punjabi',                                 style: '- Gurmukhi script (ਪੰਜਾਬੀ). Polite ਤੁਸੀਂ form for the user.' },
  por: { name: 'Brazilian Portuguese',                    style: '- Brazilian PT. Use "você" (not "tu"). "Aplicativo" not "aplicação". Stay Brazilian throughout.' },
  spa: { name: 'Spanish (Castilian)',                     style: '- Castilian Spanish. Use tú form. Inverted ¡ ¿ for exclamations and questions.' },
  tam: { name: 'Tamil',                                   style: '- Tamil script (தமிழ்). Polite register.' },
  urd: { name: 'Urdu',                                    style: '- Urdu Nastaliq script (اردو), RTL.\n- Polite آپ form for the user.\n- Brand names and English loanwords (App, Subscribe, etc.) stay in Latin script where conventional.\n- Numerals can stay Western (123).' },
  zho: { name: 'Mandarin Chinese (Simplified)',           style: '- Simplified Chinese (Hanzi). Polite 您 form when addressing the user.\n- Full-width punctuation: 。 ， ？ ！.' },
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
    // Batch: array of { sequence, text } in source order
    const batch = source
    fs.writeFileSync(path.join(BATCHES_DIR, `${code}.json`), JSON.stringify(batch, null, 2))

    const prompt = `You are translating paywall messages from English to ${info.name} (${code}) for the SaySomethingin (SSi) language-learning mobile app. These are spoken by Aran (the founder) to free-tier users when they reach the end of free content. The tone is warm, slightly self-deprecating, encouraging — Aran is an unusually likeable presenter who talks to learners like an old friend.

## Style rules
${info.style}

- Brand "SaySomethingin" stays in English.
- "SSi" stays as-is.
- "Aran" (founder name) stays as-is.
- Capture the warmth, slight humour, and self-deprecating tone where it appears in the source. Avoid corporate "subscription marketing" vibes.
- Translate "free content", "paid", "subscription", "subscribe" idiomatically — match the natural way these are talked about in ${info.name}-speaking app contexts.
- Preserve the structure (sentence count) where natural; don't merge or split sentences unless the target language strongly prefers a different structure.
- Don't flag source typos — translate the clean intended meaning silently.

## Source (${batch.length} entries — JSON array of { sequence, text })
\`\`\`json
${JSON.stringify(batch, null, 2)}
\`\`\`

## Output instructions
Output ONLY a JSON array of { sequence, text } where each entry's sequence matches the source and text is the ${info.name} translation. No prose, no markdown fences, no commentary. Every input entry must appear exactly once. Sequences must be preserved.

CRITICAL JSON rule: inside string values, NEVER use the ASCII straight double-quote character (\"). When the translation needs quotation marks, use the language's natural typographic quotes:
- German: „ ... "
- French: « ... » (with the standard non-breaking spaces)
- Italian: « ... » or " ... "
- Spanish/Portuguese: « ... » or " ... "
- Mandarin/Chinese: 「 ... 」 or "..."
- Japanese: 「 ... 」
- Korean: " ... " or 「 ... 」
- Hindi/Bengali/Gujarati/Punjabi/Urdu: " ... " or use no quote marks
- Tamil: " ... "
- Arabic: " ... " or « ... »
This keeps the JSON parseable. If you have to refer to a UI button label or filename in English, render it without quotes around it (or use language-typographic quotes).

If you encounter a passage that's genuinely ambiguous and you cannot confidently translate, still produce a best-effort translation and note the sequence at the very end after the JSON closes, prefixed with "AMBIGUOUS: <sequence>: <reason>". The JSON itself must come first and be parseable on its own.
`
    fs.writeFileSync(path.join(PROMPTS_DIR, `${code}.prompt.txt`), prompt)
    console.log(`  ${code}: ${batch.length} entries`)
  }
}

build()
