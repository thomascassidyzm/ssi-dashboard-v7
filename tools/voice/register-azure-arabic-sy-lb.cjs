/**
 * REGISTER AZURE'S SYRIAN AND LEBANESE ARABIC NEURAL VOICES AS CASTING CANDIDATES.
 *
 * Same row shape as the four Azure Arabic voices already registered (ar-EG-Salma,
 * ar-EG-Shakir, ar-AE-Hamdan, ar-AE-Fatima): tts/azure, languages {ar}, locale
 * from the id. REGISTER ONLY — nothing is cast, nothing is rendered. Idempotent.
 *
 *   node tools/voice/register-azure-arabic-sy-lb.cjs             # dry run
 *   node tools/voice/register-azure-arabic-sy-lb.cjs --execute
 */
require('dotenv').config()
const { Client } = require('pg')

const VOICES = ['ar-SY-AmanyNeural', 'ar-SY-LaithNeural', 'ar-LB-LaylaNeural', 'ar-LB-RamiNeural']

function rowFor(id) {
  const [lang, region, rest] = id.split('-')
  return { voice_id: id, tts_locale: `${lang}-${region}`, tts_voice_name: rest, display_name: rest.replace(/Neural$/, '') }
}

async function main() {
  const execute = process.argv.includes('--execute')
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  for (const id of VOICES) {
    const r = rowFor(id)
    if (!execute) { console.log('would register', id); continue }
    const res = await db.query(
      `insert into voices (voice_id, type, tts_engine, tts_voice_name, tts_locale, languages, display_name, is_active)
       values ($1,'tts','azure',$2,$3,'{ar}',$4,true) on conflict (voice_id) do nothing`,
      [r.voice_id, r.tts_voice_name, r.tts_locale, r.display_name])
    console.log(res.rowCount ? 'registered' : 'already there', id)
  }
  await db.end()
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1) })
module.exports = { VOICES, rowFor }
