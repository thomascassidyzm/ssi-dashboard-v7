#!/usr/bin/env node
/**
 * Build a per-lang Sonnet prompt: given the 14 cosmetic-reusable English texts,
 * identify which OLD shared_audio entries in the lang correspond to them (KEEP),
 * and which don't (DELETE — they're translations of deprecated English content).
 */
require('dotenv/config')
const fs = require('fs')
const path = require('path')
const { supabase } = require('../../services/supabase-client.cjs')

const LANGS_WITH_OLD = ['ara','deu','fra','ita','jpn','kor','por','spa','tam','zho']
const OUT_DIR = path.join(__dirname, '..', '..', 'temp', 'encouragement-migration', 'delete-id')
fs.mkdirSync(OUT_DIR, { recursive: true })

;(async () => {
  const reusable = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'temp', 'encouragement-migration', 'reusable-eng-reference.json'), 'utf8'))
  const reusableEnc = reusable.filter(r => r.type === 'encouragement').sort((a,b) => a.newSeq - b.newSeq)
  const reusableInst = reusable.filter(r => r.type === 'instruction').sort((a,b) => a.newSeq - b.newSeq)

  for (const lang of LANGS_WITH_OLD) {
    const { data: enc } = await supabase.from('shared_audio').select('id, text').eq('language', lang).eq('audio_type', 'encouragement').lt('created_at', '2026-05-01')
    const { data: inst } = await supabase.from('shared_audio').select('id, text').eq('language', lang).eq('audio_type', 'instruction').lt('created_at', '2026-05-01')

    const prompt = `You are mapping translated audio entries to their English source.

CONTEXT: We have an OLD English content set and a NEW English content set. Most NEW entries are completely different from OLD ones, but 14 encouragement and 14 instruction English entries are essentially UNCHANGED (only cosmetic differences: punctuation, quote style, etc.). For those 14+14, the existing OLD ${lang} translations are still valid and we want to KEEP them. The other OLD ${lang} entries are translations of DEPRECATED English content and should be DELETED.

Your job: for each OLD ${lang} entry below, identify which English entry (by seq number) it is a translation of, OR mark it "DELETE" if it doesn't match any of the 14 reusable English texts (meaning it translates a deprecated English text).

=== 14 REUSABLE English ENCOURAGEMENTS (these are the only ones whose OLD ${lang} translation we want to KEEP) ===
${reusableEnc.map(r => `seq=${r.newSeq}: ${r.oldText}`).join('\n\n')}

=== 14 REUSABLE English INSTRUCTIONS (these are the only ones whose OLD ${lang} translation we want to KEEP) ===
${reusableInst.map(r => `seq=${r.newSeq}: ${r.oldText}`).join('\n\n')}

=== OLD ${lang} ENCOURAGEMENTS (${enc.length} entries) ===
${enc.map(e => `id=${e.id}\ntext: ${e.text}`).join('\n\n')}

=== OLD ${lang} INSTRUCTIONS (${inst.length} entries) ===
${inst.map(e => `id=${e.id}\ntext: ${e.text}`).join('\n\n')}

OUTPUT: a JSON array, one object per ${lang} entry (across both encouragement and instruction). Each object has:
  - id: the ${lang} entry's UUID
  - audio_type: "encouragement" or "instruction"
  - decision: either an integer seq number (if it translates one of the 14 reusable English entries of the same audio_type) or the string "DELETE" (if it doesn't match any reusable text)

Only output the JSON array. No prose, no markdown fences. Every input ${lang} entry MUST appear exactly once in the output.

Match by MEANING, not just word-by-word. The translations may have stylistic variation but the topic and content should clearly match the English source.`

    fs.writeFileSync(path.join(OUT_DIR, `${lang}.prompt.txt`), prompt)
    console.log(`${lang}: prompt written (${enc.length} enc + ${inst.length} inst = ${enc.length + inst.length} entries)`)
  }
  console.log(`\nAll prompts in ${OUT_DIR}`)
})().catch(e => { console.error(e); process.exit(1) })
