// A-108 apply: 79 released rows. DRY_RUN=1 validates only.
const { Client } = require('pg')
const fs = require('fs')
const DB = (fs.readFileSync('.env.psql','utf8').match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.+)$/m)||[])[1].trim().replace(/^['"]|['"]$/g,'')
const DRY = process.env.DRY_RUN !== '0'
const res = JSON.parse(fs.readFileSync('/tmp/a108-resolution.json', 'utf8'))
const SPA = ['spa_for_eng:travel-situations:SC01-S053','spa_for_eng:travel-situations:SC01-S057',
             'spa_for_eng:travel-situations:SC01-S059','spa_for_eng:travel-situations:SC01-S065']
const ANN = /[\/⁄∕()（）\[\]［］{}«»]|\-\(/

async function main () {
  const c = new Client({ connectionString: DB })
  await c.connect()
  const log = []; let bad = 0
  // 75 target-only rows
  for (const [id, after] of Object.entries(res)) {
    const { rows } = await c.query('SELECT id,target_text,target_text_draft FROM listening_pod_sentences WHERE id=$1', [id])
    if (!rows.length) { console.log(`MISSING ${id}`); bad++; continue }
    const before = rows[0].target_text
    if (rows[0].target_text_draft) { console.log(`IS_DRAFT(skip) ${id}`); bad++; continue }
    if (!ANN.test(before)) { console.log(`NO_ANNOTATION_IN_BEFORE ${id}: ${before}`); bad++; continue }
    if (ANN.test(after)) { console.log(`ANNOTATION_SURVIVES ${id}: ${after}`); bad++; continue }
    if (before === after) { console.log(`NOOP ${id}`); bad++; continue }
    log.push({ id, field: 'target_text', before, after })
  }
  // 4 spanish rows: strip leading parenthetical from BOTH sides
  for (const id of SPA) {
    const { rows } = await c.query('SELECT id,target_text,known_text FROM listening_pod_sentences WHERE id=$1', [id])
    if (!rows.length) { console.log(`MISSING ${id}`); bad++; continue }
    const t = rows[0].target_text.replace(/^\s*\([^)]*\)\s*/, '')
    const k = rows[0].known_text.replace(/^\s*\([^)]*\)\s*/, '')
    if (ANN.test(t) || ANN.test(k)) { console.log(`ANNOTATION_SURVIVES ${id}`); bad++; continue }
    log.push({ id, field: 'both', before: rows[0].target_text, after: t, known_before: rows[0].known_text, known_after: k })
  }
  console.log(`\nvalidated ${log.length} rows, ${bad} rejected`)
  if (!DRY && bad === 0) {
    await c.query('BEGIN')
    for (const r of log) {
      const q = r.field === 'both'
        ? await c.query('UPDATE listening_pod_sentences SET target_text=$1, known_text=$2, updated_at=now() WHERE id=$3 AND target_text=$4', [r.after, r.known_after, r.id, r.before])
        : await c.query('UPDATE listening_pod_sentences SET target_text=$1, updated_at=now() WHERE id=$2 AND target_text=$3', [r.after, r.id, r.before])
      if (q.rowCount !== 1) { await c.query('ROLLBACK'); throw new Error(`drift on ${r.id}`) }
    }
    await c.query('COMMIT')
    console.log(`APPLIED ${log.length} rows`)
  }
  fs.writeFileSync(DRY ? '/tmp/a108-released-dryrun.json' : '/tmp/a108-released-applied.json', JSON.stringify(log, null, 1))
  await c.end()
}
main().catch(e => { console.error(e.message); process.exit(1) })
