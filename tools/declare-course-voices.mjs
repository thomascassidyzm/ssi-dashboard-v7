/**
 * STEP 0 · DECLARE — one voice per side per course, frozen as a versioned config.
 *
 * No audio is touched. Nothing is rendered. Nothing is deleted. It costs nothing, and it
 * is what makes every later step of the German and French migrations unambiguous: the
 * declared voice is what says which row wins in a slot that carries two.
 *
 * The declarations below are the ones the design settled, measured against the live
 * estate on 2026-08-06:
 *
 *   deu_for_eng     target1 ara · target2 leo · known eve
 *   fra_for_eng     eve throughout
 *   deu_at_for_eng  target1 de-AT-IngridNeural · known en-GB-SoniaNeural
 *
 * ⚠️ ONE OF THESE IS A DEFAULT AND NOT A RULING. `deu_at_for_eng`'s known side currently
 * carries three voices — en-GB-SoniaNeural (10,415), eve (1,604) and the clone (957) — and
 * the design says "one known voice chosen from its current three" without choosing. This
 * tool declares the dominant one, which changes the fewest clips and is one edit to
 * change. It is flagged in the run's output and in the report, not buried here.
 *
 * ⚠️ `deu_at_for_eng` IS THE HONEST FIRST EXCEPTION to xAI-first: de-AT has no xAI voice
 * on current catalogues, so Austrian German is Azure and no amount of cloning changes it
 * — an Austrian-German staff clone would need an Austrian-German speaker on the team.
 *
 * Writes through the versioned-config path, so the declaration has a content hash, the
 * previous state is still readable, and undeclaring a mistake is a repoint rather than a
 * memory of the old value.
 *
 *   node tools/declare-course-voices.mjs            # dry run: prints the diff, writes nothing
 *   node tools/declare-course-voices.mjs --apply    # writes the config
 */

import 'dotenv/config'
import { createRequire } from 'module'
import { getSupabase } from '../api/lib/supabase.js'
import { recordVersionAndPointer } from '../api/algorithm-config.js'
import { hashConfig } from '../api/lib/config-hash.js'

const require_ = createRequire(import.meta.url)
const vd = require_('../services/shared/voice-declarations.cjs')

const KEY = 'voice_declarations'

/** language is the side's language, needed only for the capability gate. */
const DECLARATIONS = [
  { course: 'deu_for_eng', role: 'known', voice: 'eve', language: 'eng' },
  { course: 'deu_for_eng', role: 'target1', voice: 'ara', language: 'deu' },
  { course: 'deu_for_eng', role: 'target2', voice: 'leo', language: 'deu' },
  { course: 'fra_for_eng', role: 'known', voice: 'eve', language: 'eng' },
  { course: 'fra_for_eng', role: 'target1', voice: 'eve', language: 'fra' },
  { course: 'fra_for_eng', role: 'target2', voice: 'eve', language: 'fra' },
  { course: 'deu_at_for_eng', role: 'known', voice: 'en-GB-SoniaNeural', language: 'eng', note: 'DEFAULT, not a ruling — the dominant of three current known voices' },
  { course: 'deu_at_for_eng', role: 'target1', voice: 'de-AT-IngridNeural', language: 'deu', note: 'Azure: de-AT has no xAI voice on current catalogues' },
]

const apply = process.argv.includes('--apply')

const supabase = getSupabase()
if (!supabase) {
  console.error('Supabase not configured — set the service credentials before running this.')
  process.exit(1)
}

const { data: existingRow, error: readError } = await supabase
  .from('algorithm_config').select('config').eq('key', KEY).maybeSingle()
if (readError) { console.error(`read ${KEY}: ${readError.message}`); process.exit(1) }

const { data: capRow } = await supabase
  .from('algorithm_config').select('config').eq('key', 'voice_capability').maybeSingle()
const capability = capRow?.config || {}

const before = existingRow?.config || { courses: {} }
const next = { courses: { ...(before.courses || {}) } }

let blocked = 0
for (const d of DECLARATIONS) {
  const check = vd.canDeclare(capability, d.voice, d.language)
  const canonical = vd.canonical(d.voice)
  const current = next.courses[d.course]?.[d.role]
  if (!check.allowed) {
    blocked++
    console.log(`  ✗ ${d.course}/${d.role} ${canonical} — REFUSED: ${check.reason}`)
    continue
  }
  next.courses[d.course] = { ...(next.courses[d.course] || {}), [d.role]: canonical }
  const change = current === canonical ? 'unchanged' : current ? `was ${current}` : 'new'
  console.log(`  ✓ ${d.course}/${d.role} → ${canonical}  (${change})${d.note ? `  — ${d.note}` : ''}`)
}

const hash = hashConfig(KEY, next)
console.log(`\n  config hash ${hash.slice(0, 16)}`)
console.log(`  ${blocked} declaration(s) refused by the capability gate`)

if (!apply) {
  console.log('\nDRY RUN — nothing written. Re-run with --apply to write the config.')
  process.exit(0)
}

const configHash = await recordVersionAndPointer(supabase, {
  key: KEY, config: next, channel: 'published',
  note: 'step 0 — declare deu_for_eng, fra_for_eng and deu_at_for_eng',
  actor: 'tools/declare-course-voices.mjs',
})
const { error: liveError } = await supabase.from('algorithm_config').upsert({
  key: KEY, config: next, updated_at: new Date().toISOString(), updated_by: 'tools/declare-course-voices.mjs',
}, { onConflict: 'key' })
if (liveError) { console.error(liveError.message); process.exit(1) }

console.log(`\nAPPLIED — ${KEY} published at ${configHash.slice(0, 16)}. No audio was touched.`)
