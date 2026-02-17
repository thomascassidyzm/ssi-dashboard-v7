#!/usr/bin/env node
/**
 * Validate gender expansions - check for hallucinations where Haiku
 * changed meaning instead of just adjusting gender agreement.
 *
 * Usage: node scripts/validate-gender-expansions.cjs fra_for_eng
 */

require('dotenv').config()

const Anthropic = require('@anthropic-ai/sdk')
const { createClient } = require('@supabase/supabase-js')

const courseCode = process.argv[2]
if (!courseCode) {
  console.error('Usage: node scripts/validate-gender-expansions.cjs <course_code>')
  process.exit(1)
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const anthropic = new Anthropic()

const BATCH_SIZE = 40
const MAX_CONCURRENCY = 5

async function validateBatch(pairs) {
  const numbered = pairs.map((p, i) =>
    `${i + 1}. "${p.original}" → "${p.expanded}" [${p.role}]`
  ).join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: `You are validating gender-agreement adjustments for French TTS audio.

For each pair below, the original text was adjusted for a ${'{female or male}'} speaker.
Valid changes: adjective agreement (content→contente), past participle agreement (aidé→aidée),
ami→amie, seul→seule, bon→bonne, etc. Also valid: fixing noun-adjective agreement (différents→différentes for feminine nouns like "choses").

INVALID changes: different words, changed meaning, added/removed words, grammar corrections unrelated to gender, spelling corrections.

Pairs:
${numbered}

For each pair, respond ONLY with JSON: {"results": [{"i": 1, "ok": true}, {"i": 2, "ok": false, "reason": "changed verb from vais to peux"}]}
Only include "reason" for items where ok=false.` }]
  })

  const content = response.content[0]?.text || ''
  try {
    const match = content.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      return parsed.results || []
    }
  } catch {}
  return []
}

async function main() {
  // Load all expansions
  const { data: rows, error } = await supabase
    .from('course_gender_expansions')
    .select('id, original_text, expanded_f, expanded_m')
    .eq('course_code', courseCode)

  if (error) { console.error(error.message); process.exit(1) }
  console.log(`Loaded ${rows.length} gender expansion rows for ${courseCode}`)

  // Build pairs to validate
  const pairs = []
  for (const row of rows) {
    if (row.expanded_f) {
      pairs.push({ id: row.id, original: row.original_text, expanded: row.expanded_f, role: 'female', field: 'expanded_f' })
    }
    if (row.expanded_m) {
      pairs.push({ id: row.id, original: row.original_text, expanded: row.expanded_m, role: 'male', field: 'expanded_m' })
    }
  }
  console.log(`${pairs.length} individual changes to validate`)

  // Process in batches
  const batches = []
  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    batches.push(pairs.slice(i, i + BATCH_SIZE))
  }

  const flagged = []
  let processed = 0

  for (let i = 0; i < batches.length; i += MAX_CONCURRENCY) {
    const concurrent = batches.slice(i, i + MAX_CONCURRENCY)
    const results = await Promise.all(
      concurrent.map(async (batch, batchIdx) => {
        const batchResults = await validateBatch(batch)
        const batchFlagged = []
        for (const r of batchResults) {
          if (!r.ok) {
            const pair = batch[r.i - 1]
            if (pair) {
              batchFlagged.push({ ...pair, reason: r.reason || 'unknown' })
            }
          }
        }
        return batchFlagged
      })
    )
    flagged.push(...results.flat())
    processed += concurrent.length
    if (processed % 5 === 0 || processed === batches.length) {
      console.log(`Progress: ${Math.min(processed, batches.length)}/${batches.length} batches`)
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`VALIDATION COMPLETE`)
  console.log(`${'='.repeat(60)}`)
  console.log(`Total changes checked: ${pairs.length}`)
  console.log(`Flagged (potential hallucinations): ${flagged.length}`)

  if (flagged.length > 0) {
    console.log(`\nFLAGGED ITEMS:`)
    for (const f of flagged) {
      console.log(`\n  [${f.role}] "${f.original}"`)
      console.log(`       → "${f.expanded}"`)
      console.log(`       Reason: ${f.reason}`)
    }
  } else {
    console.log(`\nAll changes are valid gender adjustments.`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
