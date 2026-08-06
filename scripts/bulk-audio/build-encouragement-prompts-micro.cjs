#!/usr/bin/env node
/**
 * Build MICRO translation prompts — split each lang's enc + inst into 4 sub-batches
 * of 12 entries each, for the 7 langs that hit Sonnet's output token cliff on both
 * the original combined-prompt run and the half-split retry.
 *
 * Output: temp/encouragement-migration/prompts-micro/{lang}.{type}.{N}.prompt.txt
 *   where N = 1..4
 *
 * 7 langs × (4 enc parts + 4 inst parts) = 56 prompts total
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..', 'temp', 'encouragement-migration')
const SRC = path.join(ROOT, 'eng-source.json')
const OUT_DIR = path.join(ROOT, 'prompts-micro')
const SUB_BATCH = 12

const LANGS = {
  deu: { name: 'German',           style: '- Standard Hochdeutsch. Match du / Sie convention from existing de.json.' },
  fil: { name: 'Filipino (Tagalog)', style: '- Filipino/Tagalog. Polite po/opo register.' },
  fin: { name: 'Finnish',          style: '- Neutral-polite Finnish.' },
  msa: { name: 'Malay (Standard)', style: '- Bahasa Melayu (standard). Polite "anda" register.' },
  nld: { name: 'Dutch',            style: '- Dutch. je form (informal/warm).' },
  pan: { name: 'Punjabi',          style: '- Gurmukhi script. Polite ਤੁਸੀਂ form.' },
  pol: { name: 'Polish',           style: '- Standard Polish. Polite formal register (Pan/Pani).' },
}

function buildPrompt(langName, style, audioType, entries, partIdx, totalParts) {
  const typeLabel = audioType === 'encouragement'
    ? `SHORT motivational lines played randomly between exercises`
    : `LONGER pedagogical clips played in sequence at fixed points in the course`

  return `You are translating Aran's spoken-audio scripts from English to ${langName} for the SaySomethingin (SSi) language-learning mobile app. These are ${typeLabel} (${entries.length} entries — part ${partIdx} of ${totalParts}), spoken by Aran (the founder). His tone is warm, slightly self-deprecating, encouraging — an unusually likeable presenter who talks to learners like an old friend who genuinely cares.${audioType === 'instruction' ? ' These instructions are mini-lectures where he explains how the brain learns, why mistakes are good, why repetition is the engine, etc.' : ''}

## Style rules
${style}

- Brand "SaySomethingin" stays in English.
- "SSi" stays as-is.
- "Aran" (founder name) stays as-is.
- Capture Aran's voice: warm, conversational, occasionally self-deprecating, never preachy.
- Translate the FEEL, not just the words. If the English uses a colloquial idiom, find the closest equivalent. If a metaphor doesn't land, replace it with one that does.

CRITICAL JSON rule: inside string values, NEVER use the ASCII straight double-quote character ("). When the translation needs quotation marks, use the language's natural typographic quotes:
- German: „ ... "
- Dutch / Polish / Finnish: " ... " or 「 ... 」
- Punjabi: " ... " or no quotes
- Filipino / Malay: " ... " or 「 ... 」

## Source (${entries.length} entries — JSON array)
\`\`\`json
${JSON.stringify(entries, null, 2)}
\`\`\`

## Output instructions
Output ONLY a JSON array of { sequence_within_type, audio_type, text } where each entry's sequence_within_type and audio_type match the source and text is the ${langName} translation. No prose, no markdown fences, no commentary. Every input entry must appear exactly once.
`
}

function main() {
  if (!fs.existsSync(SRC)) { console.error('Source not found:', SRC); process.exit(1) }
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const source = JSON.parse(fs.readFileSync(SRC, 'utf8'))
  const enc = source.filter(s => s.audio_type === 'encouragement')
  const inst = source.filter(s => s.audio_type === 'instruction')

  function chunks(arr) {
    const out = []
    for (let i = 0; i < arr.length; i += SUB_BATCH) out.push(arr.slice(i, i + SUB_BATCH))
    return out
  }
  const encParts = chunks(enc)
  const instParts = chunks(inst)
  console.log(`Source: ${enc.length} enc → ${encParts.length} parts of ≤${SUB_BATCH}; ${inst.length} inst → ${instParts.length} parts of ≤${SUB_BATCH}`)

  for (const [code, info] of Object.entries(LANGS)) {
    encParts.forEach((part, i) => {
      const fname = `${code}.enc.${i + 1}.prompt.txt`
      fs.writeFileSync(path.join(OUT_DIR, fname), buildPrompt(info.name, info.style, 'encouragement', part, i + 1, encParts.length))
    })
    instParts.forEach((part, i) => {
      const fname = `${code}.inst.${i + 1}.prompt.txt`
      fs.writeFileSync(path.join(OUT_DIR, fname), buildPrompt(info.name, info.style, 'instruction', part, i + 1, instParts.length))
    })
    console.log(`  ${code}: ${encParts.length} enc + ${instParts.length} inst prompts`)
  }
}

main()
