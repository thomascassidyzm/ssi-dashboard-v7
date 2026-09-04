/**
 * READ-ONLY. Italian clone probe, step 1+2: who the voices are, and what they'd say.
 * No writes of any kind.
 */
require('dotenv').config({ path: '.env.psql' })
const { Client } = require('pg')

async function main () {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await c.connect()
  const ids = [
    'cartesia_f56e05e2-d043-4b41-a7cb-faf528b99e01',
    'cartesia_e7ed10ad-8aaa-41fd-b3a2-eb7d5e0b4bac',
    'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2',
    'cartesia_33890587-a29f-4416-ba61-2615c74f92fe',
  ]
  const cols = await c.query(
    `select column_name from information_schema.columns where table_name='voices' order by ordinal_position`)
  console.log('VOICES COLUMNS:', cols.rows.map(r => r.column_name).join(', '))
  const v = await c.query(`select * from voices where voice_id = any($1)`, [ids])
  console.log('\n=== VOICE ROWS ===')
  console.log(JSON.stringify(v.rows, null, 2))

  const pcols = await c.query(
    `select column_name from information_schema.columns where table_name='canonical_pod_scenarios' order by ordinal_position`)
  console.log('\nPOD COLUMNS:', pcols.rows.map(r => r.column_name).join(', '))
  const p = await c.query(
    `select global_order, speaker, english_text, target_text
       from canonical_pod_scenarios where pod_slug='method-pod-chapters'
       and global_order = any($1) order by global_order`,
    [[1, 2, 3, 4, 5, 6, 7, 9, 18, 129, 299]])
  console.log('\n=== SAMPLE LINES ===')
  for (const r of p.rows) console.log(`${r.global_order}\t${r.speaker}\t${JSON.stringify(r.target_text)}`)
  await c.end()
}
main().catch(e => { console.error(e.message); process.exit(1) })
