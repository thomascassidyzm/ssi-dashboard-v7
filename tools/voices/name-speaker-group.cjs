#!/usr/bin/env node
/**
 * Name a likely-speaker group after a human has LISTENED (job #703).
 *
 *   node tools/voices/name-speaker-group.cjs cym_s_for_eng.target1.g1 human_cerys_matthews_cym_s --by tom
 *   node tools/voices/name-speaker-group.cjs cym_s_for_eng.target1.g1 --undo
 *   options: --adds-language eng   the artist also speaks this language (appended to voices.languages)
 *            --dry-run
 *
 * Writes one human_clip_attribution row per member clip (basis 'named-by-ear',
 * carrying the group id and who named it) and stamps the group. course_audio is
 * never touched. The clips reach clip_index at the next reconcile
 * (node tools/voices/reconcile-library.cjs --apply, or the nightly).
 * --undo removes exactly the attribution rows this group wrote.
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { tryCanonicalLanguage } = require('../../services/shared/clip-identity.cjs')

const args = process.argv.slice(2)
const flag = n => args.includes(n)
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null }
const positional = args.filter((a, i) => !a.startsWith('--') && !['--by', '--adds-language'].includes(args[i - 1]))

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const m = fs.readFileSync(path.join(__dirname, '..', '..', '.env.psql'), 'utf8').match(/DATABASE_URL=["']?([^"'\n]+)/)
  if (!m) throw new Error('DATABASE_URL not found')
  return m[1]
}

async function main() {
  const [groupId, voiceId] = positional
  if (!groupId || (!voiceId && !flag('--undo'))) { console.error('usage: name-speaker-group.cjs <group_id> <voice_id> --by <who> [--adds-language eng] [--dry-run]\n       name-speaker-group.cjs <group_id> --undo'); process.exit(2) }
  const client = new Client({ connectionString: databaseUrl(), statement_timeout: 60000 })
  await client.connect()
  try {
    const { rows: [g] } = await client.query('SELECT * FROM human_speaker_groups WHERE group_id = $1', [groupId])
    if (!g) throw new Error(`no group ${groupId}`)
    await client.query('BEGIN')
    if (flag('--undo')) {
      const r = await client.query('DELETE FROM human_clip_attribution WHERE group_id = $1 AND basis = \'named-by-ear\'', [groupId])
      await client.query('UPDATE human_speaker_groups SET voice_id = NULL, named_by = NULL, named_at = NULL WHERE group_id = $1', [groupId])
      await client.query(flag('--dry-run') ? 'ROLLBACK' : 'COMMIT')
      console.log(`${flag('--dry-run') ? 'would remove' : 'removed'} ${r.rowCount} attributions from ${groupId}`)
      return
    }
    const by = opt('--by')
    if (!by) throw new Error('--by <who named it> is required — a name is a person\'s call and is recorded as such')
    const { rows: [v] } = await client.query("SELECT voice_id, human_name, languages, clip_language FROM voices WHERE voice_id = $1 AND type = 'human'", [voiceId])
    if (!v) throw new Error(`${voiceId} is not a human voice in the registry — register the artist first (tools/voices/register-human-artists.cjs or the add-a-recording in-tray)`)
    const base = tryCanonicalLanguage(g.language)
    const add = opt('--adds-language')
    if (add) await client.query('UPDATE voices SET languages = (SELECT array_agg(DISTINCT x) FROM unnest(languages || $2::text) x), updated_at = now() WHERE voice_id = $1', [voiceId, add])
    else if (!(v.languages || []).map(tryCanonicalLanguage).includes(base)) throw new Error(`${v.human_name} is registered for ${(v.languages || []).join(',')}, this group speaks ${g.language} — pass --adds-language ${g.language} if they do`)
    const r = await client.query(
      `INSERT INTO human_clip_attribution (audio_id, voice_id, basis, group_id, attributed_by)
       SELECT m.audio_id, $2, 'named-by-ear', m.group_id, $3 FROM human_speaker_group_members m WHERE m.group_id = $1
       ON CONFLICT (audio_id) DO UPDATE SET voice_id = excluded.voice_id, basis = excluded.basis, group_id = excluded.group_id,
         attributed_by = excluded.attributed_by, attributed_at = now()`, [groupId, voiceId, by])
    await client.query('UPDATE human_speaker_groups SET voice_id = $2, named_by = $3, named_at = now() WHERE group_id = $1', [groupId, voiceId, by])
    await client.query(flag('--dry-run') ? 'ROLLBACK' : 'COMMIT')
    console.log(`${flag('--dry-run') ? 'would name' : 'named'} ${groupId} (${g.clip_count} clips) as ${v.human_name} (${voiceId}), by ${by}; ${r.rowCount} attribution rows`)
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); console.error(e.message); process.exitCode = 1 } finally { await client.end() }
}
if (require.main === module) main()
