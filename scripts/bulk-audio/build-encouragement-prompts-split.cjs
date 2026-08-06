#!/usr/bin/env node
/**
 * Build SPLIT translation prompts for the 7 langs that hit Sonnet's output token cliff
 * on the original combined-prompt run. Each lang gets TWO prompts:
 *   - {lang}.enc.prompt.txt  → 48 encouragements
 *   - {lang}.inst.prompt.txt → 48 instructions
 *
 * Halving the output keeps each call well under the per-call token budget.
 *
 * Reads:  temp/encouragement-migration/eng-source.json
 * Writes: temp/encouragement-migration/prompts-split/{lang}.{type}.prompt.txt
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..', 'temp', 'encouragement-migration')
const SRC = path.join(ROOT, 'eng-source.json')
const OUT_DIR = path.join(ROOT, 'prompts-split')

// 7 langs that failed in the original retry — token-cliff truncation
const LANGS = {
  deu: { name: 'German',           style: '- Standard Hochdeutsch. Match du / Sie convention from existing de.json.' },
  fil: { name: 'Filipino (Tagalog)', style: '- Filipino/Tagalog. Polite po/opo register.' },
  fin: { name: 'Finnish',          style: '- Neutral-polite Finnish.' },
  msa: { name: 'Malay (Standard)', style: '- Bahasa Melayu (standard). Polite "anda" register.' },
  nld: { name: 'Dutch',            style: '- Dutch. je form (informal/warm).' },
  pan: { name: 'Punjabi',          style: '- Gurmukhi script. Polite ਤੁਸੀਂ form.' },
  pol: { name: 'Polish',           style: '- Standard Polish. Polite formal register (Pan/Pani).' },
}

function buildPrompt(langName, style, audioType, entries) {
  const typeLabel = audioType === 'encouragement'
    ? `SHORT motivational lines played randomly between exercises (${entries.length} entries)`
    : `LONGER pedagogical clips played in sequence at fixed points in the course (${entries.length} entries)`

  return `You are translating Aran's spoken-audio scripts from English to ${langName} for the SaySomethingin (SSi) language-learning mobile app. These are ${typeLabel}, all spoken by Aran (the founder). His tone is warm, slightly self-deprecating, encouraging — an unusually likeable presenter who talks to learners like an old friend who genuinely cares.${audioType === 'instruction' ? ' The instructions are mini-lectures where he explains how the brain learns, why mistakes are good, why repetition is the engine, etc.' : ''}

## Style rules
${style}

- Brand "SaySomethingin" stays in English.
- "SSi" stays as-is.
- "Aran" (founder name) stays as-is.
- Capture Aran's voice: warm, conversational, occasionally self-deprecating, never preachy. The reassuring teacher who tells you you're doing great even when you mess up — *because* you're trying.
- Translate the FEEL, not just the words. If the English uses a colloquial idiom, find the closest equivalent. If a metaphor doesn't land, replace it with one that does.
- Preserve sentence count where natural; don't merge or split unless the target language strongly prefers a different structure.

CRITICAL JSON rule: inside string values, NEVER use the ASCII straight double-quote character ("). When the translation needs quotation marks, use the language's natural typographic quotes:
- German: „ ... "
- French: « ... »
- Italian/Spanish/Portuguese: « ... » or " ... "
- Japanese/Chinese/Korean: 「 ... 」
- Hindi/Bengali/Gujarati/Punjabi/Urdu/Tamil: " ... " or no quotes
- Other: " ... " or « ... »

## Source (${entries.length} entries — JSON array of { sequence_within_type, audio_type, text })
\`\`\`json
${JSON.stringify(entries, null, 2)}
\`\`\`

## Output instructions
Output ONLY a JSON array of { sequence_within_type, audio_type, text } where each entry's sequence_within_type and audio_type match the source and text is the ${langName} translation. No prose, no markdown fences, no commentary. Every input entry must appear exactly once.

If a passage is genuinely ambiguous, still produce a best-effort translation. The JSON itself must come first and be parseable on its own.
`
}

function main() {
  if (!fs.existsSync(SRC)) { console.error('Source not found:', SRC); process.exit(1) }
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const source = JSON.parse(fs.readFileSync(SRC, 'utf8'))
  const enc = source.filter(s => s.audio_type === 'encouragement')
  const inst = source.filter(s => s.audio_type === 'instruction')
  console.log(`Source: ${enc.length} encouragements + ${inst.length} instructions`)

  for (const [code, info] of Object.entries(LANGS)) {
    fs.writeFileSync(path.join(OUT_DIR, `${code}.enc.prompt.txt`), buildPrompt(info.name, info.style, 'encouragement', enc))
    fs.writeFileSync(path.join(OUT_DIR, `${code}.inst.prompt.txt`), buildPrompt(info.name, info.style, 'instruction', inst))
    console.log(`  ${code}: enc + inst prompts written`)
  }
}

main()
