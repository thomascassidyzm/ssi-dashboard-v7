/**
 * EVERY VOICE THE VOICE LAB OFFERS FOR CASTING, and what the consent block
 * would actually do about it.
 *
 * Tom, 2026-08-31, from his own screen: tom_001 sits directly above Tom_002,
 * same person, same voice — one castable with no consent badge at all, one
 * refused. "Either consent is genuinely recorded for tom_001, or older voices
 * are being silently grandfathered past the new rule."
 *
 * So this asks the page's own question of the page's own list: registry.build,
 * with the Cartesia catalogue merged in exactly as the screen merges it, and
 * for every candidate the four answers that decide the outcome —
 *   does a `voices` row exist at all
 *   what consent.describe() puts on the badge
 *   what voice-personhood.classify() calls it
 *   what the GATE would answer if somebody pressed Cast (verdict.allowed)
 * READ ONLY. Nothing is written, nothing is uncast.
 */
require('dotenv').config()
const registry = require('../../services/voicelab/registry.cjs')
const params = require('../../services/voicelab/params.cjs')
const consent = require('../../services/voicelab/consent.cjs')
const personhood = require('../../services/shared/voice-personhood.cjs')
const gate = require('../../services/shared/voice-consent-gate.cjs')

const db = require('../../services/supabase-client.cjs').getClient()

/** The screen's own rule for whether a Cast button is drawn (CandidateVoices.blockedFor). */
function screenOffersCast (c) {
  const k = c && c.consent
  if (!k || !k.aboutAPerson || k.authorised) return true
  if (!k.needsAsking) return true
  return false
}

async function main () {
  await params.cartesiaCatalogue()
  const { CARTESIA_CATALOGUE } = params._state()
  const out = await registry.build(db, { cartesiaCatalogue: CARTESIA_CATALOGUE })

  const { data: rows } = await db.from('voices').select(`voice_id, display_name, human_name, type, tts_engine, metadata_source, notes, ${consent.COLUMNS}`)
  const byId = new Map((rows || []).map((r) => [r.voice_id, r]))

  const seen = new Map()
  for (const lang of out.languages) {
    const lists = [
      ...(lang.candidates || []).map((c) => ({ ...c, where: `${lang.code}/phrase` })),
      ...((lang.guide && lang.guide.candidates) || []).map((c) => ({ ...c, where: `${lang.code}/guide` })),
    ]
    for (const c of lists) {
      const prev = seen.get(c.voiceId)
      if (prev) { prev.languages.add(lang.code); continue }
      seen.set(c.voiceId, { c, languages: new Set([lang.code]) })
    }
  }

  const report = []
  for (const [voiceId, { c, languages }] of seen) {
    const row = byId.get(voiceId) || null
    const verdict = await gate.verdictFor(voiceId, { db })
    report.push({
      voiceId,
      name: c.name,
      kind: c.kind,
      languages: [...languages].sort(),
      hasRow: Boolean(row),
      badge: c.consent ? c.consent.status : '(no consent block on the candidate)',
      aboutAPerson: c.consent ? c.consent.aboutAPerson : false,
      needsAsking: c.consent ? c.consent.needsAsking : false,
      classify: personhood.classify(voiceId, row),
      gateAllows: verdict.allowed,
      screenOffersCast: screenOffersCast(c),
    })
  }

  report.sort((a, b) => a.voiceId.localeCompare(b.voiceId))
  console.log(JSON.stringify({
    totals: {
      candidates: report.length,
      withNoVoicesRow: report.filter((r) => !r.hasRow).length,
      gateWouldRefuse: report.filter((r) => !r.gateAllows).length,
      screenOffersCastButGateRefuses: report.filter((r) => r.screenOffersCast && !r.gateAllows).length,
      castableAndAboutAPersonWithNoAuthorisedConsent: report.filter((r) =>
        r.gateAllows && personhood.isAboutAPerson(r.voiceId, byId.get(r.voiceId) || null) &&
        consent.statusOf(byId.get(r.voiceId) || null) !== 'authorised').length,
    },
    report,
  }, null, 1))
}
main().catch((e) => { console.error(e.stack || e.message); process.exit(1) })
