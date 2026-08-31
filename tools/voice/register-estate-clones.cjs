/**
 * REGISTER THE CLONES THIS ESTATE OWNS AT CARTESIA BUT HAS NO ROW FOR.
 *
 * Tom, 2026-08-31, from his own screen: tom_001 sits directly above Tom_002 —
 * same person, same voice — one castable with no consent badge at all, one
 * refused. "Either consent is genuinely recorded for tom_001, or older voices
 * are being silently grandfathered past the new rule."
 *
 * Neither. THE EXEMPTION IS BY ROW ABSENCE, not by date.
 *
 * The consent gate asks services/shared/voice-personhood.cjs what a voice IS,
 * and that question is answered from the `voices` row. A Cartesia id with no
 * row classifies as `stock` — "a vendor catalogue voice, nobody behind it to
 * ask" — and stock is ungated, correctly, for the 290 real catalogue voices.
 * But the Voice Lab also offers the voices this estate OWNS at Cartesia, merged
 * straight from Cartesia's catalogue by its `is_owner` flag, and a voice we own
 * there is a voice we made: a clone of somebody. Made through the Voice Lab it
 * gets a row and is gated. Made in Cartesia's own web UI — which is where
 * tom_001 and aran_english_003 came from — it has no row at all, so the block
 * that refuses Tom_002 waves the identical voice through.
 *
 * This closes that by writing the row: same `registerVoice` the cast path uses,
 * `isClone: true`, and NO consent — the voice becomes refused-until-consented,
 * and the Voice Lab's consent panel is the way through.
 *
 * WHAT IT DOES NOT DO. It uncasts nothing, deletes nothing, and touches no
 * audio: clips already rendered keep playing, and any role already holding one
 * of these voices keeps holding it. What changes is that a NEW cast or a NEW
 * render is refused until somebody records the person's consent. Tom's ruling,
 * 2026-08-31: "we are never going to use a voice without consent."
 *
 *   node tools/voice/register-estate-clones.cjs             # dry run, the default
 *   node tools/voice/register-estate-clones.cjs --execute
 */
require('dotenv').config()

const params = require('../../services/voicelab/params.cjs')
const cartesia = require('../../services/voicelab/cartesia.cjs')
const consent = require('../../services/voicelab/consent.cjs')
const personhood = require('../../services/shared/voice-personhood.cjs')

const EXECUTE = process.argv.includes('--execute')

async function main () {
  const db = require('../../services/supabase-client.cjs').getClient()

  await params.cartesiaCatalogue()
  const { CARTESIA_CATALOGUE } = params._state()

  // One entry per voice: the catalogue is keyed by language and a voice can
  // appear under several.
  const owned = new Map()
  for (const [lang, voices] of Object.entries(CARTESIA_CATALOGUE || {})) {
    for (const v of voices || []) {
      if (!v.is_owner && !v.owner) continue
      if (!owned.has(v.id)) owned.set(v.id, { ...v, language: v.language || lang })
    }
  }

  const { data: rows } = await db.from('voices').select(`voice_id, ${consent.COLUMNS}`)
  const have = new Set((rows || []).map((r) => r.voice_id))

  const missing = [...owned.values()].filter((v) => !have.has(`cartesia_${v.id}`) && !have.has(v.id))

  console.log(`Cartesia says this estate owns ${owned.size} voice(s).`)
  console.log(`${missing.length} of them have no \`voices\` row, so the consent gate reads them as stock and lets them through.\n`)

  for (const v of missing) {
    const before = personhood.classify(`cartesia_${v.id}`, null)
    console.log(`  ${v.name}  (cartesia_${v.id}, ${v.language || '?'})  — classified "${before}" today`)
    if (!EXECUTE) continue
    const voice = await cartesia.registerVoice(db, {
      voiceId: v.id,
      name: v.name,
      language: v.language,
      gender: v.gender === 'feminine' ? 'f' : v.gender === 'masculine' ? 'm' : null,
      isClone: true,
      notes: 'Made at Cartesia outside the Voice Lab and registered on 2026-08-31 so the consent block can see it. No consent is recorded: this voice is refused until somebody records the person\'s answer in the Voice Lab.',
      registeredBy: 'tools/voice/register-estate-clones.cjs',
    })
    const { data: after } = await db.from('voices').select(`voice_id, ${consent.COLUMNS}`).eq('voice_id', voice.voice_id).maybeSingle()
    console.log(`    registered → classified "${personhood.classify(voice.voice_id, after)}", consent "${consent.statusOf(after)}"`)
  }

  if (!EXECUTE) console.log('\nDRY RUN. Nothing was written. Re-run with --execute.')
  else if (missing.length) {
    require('../../services/shared/voice-consent-gate.cjs').clearCache()
    console.log('\nDone. Nothing was uncast and no audio was touched — new casts and new renders of these voices are now refused until their consent is recorded.')
  }
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(1) })
