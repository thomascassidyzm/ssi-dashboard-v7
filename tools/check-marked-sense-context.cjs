#!/usr/bin/env node
/**
 * K23(d) — THE MARKED SENSE MAY NEVER BE PROMPTED WITHOUT ITS CONTEXT.
 *
 *   node tools/check-marked-sense-context.cjs <course_code> [--json] [--all-roles]
 *
 * READ-ONLY, WARN-ONLY, always exits 0. It writes nothing and generates no audio.
 *
 * WHY THIS EXISTS. The canon's own words on K23(d): "This is the part with teeth…
 * A fix at the point of introduction is not a fix. Every prompt in the course that
 * reaches for the marked sense must carry, visibly in the known side, the context
 * that makes it the only possible answer… So this rule obliges a WHOLE-COURSE AUDIT
 * as part of the fix", and "there is no gate for any of this".
 *
 * There still isn't. This is the reading list that whole-course audit needs, and it
 * is deliberately not a gate — see tools/marked-sense/detect.cjs for why a string
 * test cannot decide acquaintance, and why `clear` demands a positive cue while a
 * flag demands nothing.
 *
 * USE PHRASES ARE THE SHARP END (canon P16, K23(e) route 2). A BUILD plays once,
 * immediately after its presentation, and never resurfaces cold — so a bare BUILD is
 * LEGAL and is not reported unless you pass --all-roles. A USE replays at any later
 * point with nothing around it, which is exactly the prompt K23(d) is about.
 *
 * The eleven ita_for_eng conoscere USE phrases re-authored on 2026-09-10 are what
 * this was written from; tools/check-marked-sense-context.test.js pins all eleven
 * of their BEFORE texts as flagged and all eleven AFTER texts as clear.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const { classifyPrompt } = require('./marked-sense/detect.cjs')

// Per-course declaration of the MARKED sense: the one that needs context.
// K23(f): where one sense is specific and the other general, only the SPECIFIC one
// is listed here — the general sense is the default answer to a bare prompt.
const MARKED_SENSES = {
  ita_for_eng: {
    label: 'conoscere (acquaintance) — sapere is the default',
    target: /\bconosc|\bconobb/i,
  },
}

async function main() {
  const course = process.argv[2]
  const asJson = process.argv.includes('--json')
  const allRoles = process.argv.includes('--all-roles')
  if (!course) { console.error('usage: check-marked-sense-context.cjs <course_code> [--json] [--all-roles]'); process.exit(2) }

  const spec = MARKED_SENSES[course]
  if (!spec) {
    console.log(`[--] ${course} declares no marked sense in MARKED_SENSES — nothing to audit.`)
    console.log('     Add one only where a real one-known-word/two-target-words clash exists (K23).')
    return
  }

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { data, error } = await sb.from('course_practice_phrases')
    .select('id, seed_number, lego_index, position, phrase_role, known_text, target_text')
    .eq('course_code', course)
  if (error) throw error

  const hits = data.filter(p => spec.target.test(p.target_text || ''))
  const scope = allRoles ? hits : hits.filter(p => p.phrase_role === 'use')
  const flagged = scope
    .map(p => ({ ...p, ...classifyPrompt(p.known_text) }))
    .filter(p => p.flagged)
    .sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index || a.position - b.position)

  if (asJson) { console.log(JSON.stringify({ course, marked: spec.label, scanned: scope.length, flagged }, null, 2)); return }

  console.log(`[${flagged.length}] MARKED SENSE PROMPTED WITHOUT CONTEXT — ${course}`)
  console.log(`     marked sense: ${spec.label}`)
  console.log(`     scanned: ${scope.length} ${allRoles ? 'phrases (all roles)' : "USE phrases"} of ${hits.length} carrying the marked sense`)
  for (const f of flagged) console.log(`     ${f.id}  "${f.known_text}" || "${f.target_text}"`)
  console.log('')
  console.log('     A flag is a prompt to READ, never a verdict. Clearing one means giving the')
  console.log('     prompt a real acquaintance object (K23(d)) — or, if it reads fine, saying why.')
}

main().catch(e => { console.error(e); process.exit(1) })
