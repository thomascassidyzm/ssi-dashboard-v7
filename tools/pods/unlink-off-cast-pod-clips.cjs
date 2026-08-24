#!/usr/bin/env node
/**
 * unlink-off-cast-pod-clips.cjs — NULL the pod links of clips whose voice is not in
 * the pod's own cast, so /generate-pods refills them on the cast voices.
 *
 * WHY THIS EXISTS (2026-08-22, the ita/spa/fra/zho rollout). The readiness gate in
 * pod-switchover.cjs counts sentences with NO audio. It cannot see a sentence whose
 * audio exists but is in the WRONG VOICE — so a pod can read 0/0/0/0/0 "ready" while
 * a third of it plays in voices nobody cast and nobody approved.
 *
 * That is not hypothetical. spa_for_eng:pod-0-unrecorded passed readiness with 231/231
 * clips alive and ffprobe-clean while 80 of them were on Eve, Ara and four other voices
 * outside Tom's approved Manuel + Elvira pair. Croatian, the finished article, is
 * 231/231 ON-CAST — that is the real standard, and this tool is how the others reach it.
 *
 * TRACKS (2026-08-23). The tool was target-only, which left the single
 * highest-leverage item in the pod-1 rollout unreachable: the 366 shared English
 * KNOWN-side clips, pooled ~7.5 ways across 40 courses, whose recast is the thing
 * that completes the known track for every course at once. --track=known reads the
 * cast from speakers[*].known.voice_id and NULLs known_audio_id, and is otherwise
 * the same operation with the same assertions.
 *
 * SAFETY.
 *   - Reads the cast from listening_pods.speakers. If the pod resolves to no cast
 *     voices at all it aborts rather than treating everything as off-cast.
 *   - Provider prefixes are stripped before comparison ('xai_yis75yfp' and 'yis75yfp'
 *     are one voice, not two) — the one bug that would make this delete the world.
 *   - NULLs the pod's LINK only. No course_audio row is deleted; every clip survives
 *     and any link can be restored from the snapshot this writes.
 *   - Refuses any pod slug outside a literal staging allowlist, and — since the slug
 *     alone is a weak lock — re-reads the pod's visibility from the DB and refuses
 *     anything that is not `held`. Make-before-break still governs the live pods:
 *     this only ever runs on staging, where no learner can hear a gap.
 *   - Per-row before-state assertion inside the UPDATE predicate; drift aborts the run.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write.
 *
 *   node tools/pods/unlink-off-cast-pod-clips.cjs --pod=spa_for_eng:pod-0-unrecorded
 *   node tools/pods/unlink-off-cast-pod-clips.cjs --pod=spa_for_eng:pod-0-unrecorded --apply
 *   node tools/pods/unlink-off-cast-pod-clips.cjs --pod=fra_for_eng:pod-1-staged-2026-08-23 --track=known --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const REPO = path.join(__dirname, '..', '..')
const APPLY = process.argv.includes('--apply')
const arg = (n) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}

/**
 * Staging slugs this tool may touch. Group 1's staged clones are named
 * `pod-1-staged-2026-08-23`, not `*-unrecorded`, so the original `-unrecorded$`
 * guard refused exactly the 19 pods the pod-1 rollout needs. The allowlist is
 * deliberately literal: a new staging convention has to be added here on purpose,
 * and everything else — above all a live `pod-0` — stays out of reach.
 */
const STAGING_SLUGS = ['pod-1-staged-2026-08-23']
function podSlugAllowed(podId) {
  const slug = String(podId || '').split(':').slice(1).join(':')
  return /-unrecorded$/.test(slug) || STAGING_SLUGS.includes(slug)
}

const TRACKS = {
  target: { link: 'target_audio_id', castOf: (e) => e && e.target && e.target.voice_id },
  known: { link: 'known_audio_id', castOf: (e) => e && e.known && e.known.voice_id },
}

const POD_ID = arg('pod')
const TRACK = arg('track') || 'target'
if (require.main === module) {
  if (!POD_ID) {
    console.error('FAILED: --pod=<pod_id> is required')
    process.exit(1)
  }
  if (!TRACKS[TRACK]) {
    console.error(`FAILED: --track=${TRACK} is not target|known`)
    process.exit(1)
  }
  if (!podSlugAllowed(POD_ID)) {
    console.error(`FAILED: ${POD_ID} is not a sanctioned staging pod (${['*-unrecorded', ...STAGING_SLUGS].join(', ')}). This tool will not touch a live pod.`)
    process.exit(1)
  }
}
const logPath = (kind) =>
  path.join(REPO, 'docs', 'pods', `${String(POD_ID).replace(/:/g, '-')}-off-cast-${TRACK}-unlink-${kind}-log.json`)

// 'xai_yis75yfp' and 'yis75yfp' are the same voice recorded two ways.
const norm = (v) => String(v || '').replace(/^(xai_|azure_|eleven_)/, '')

// "Susjed (08:00) (M)" → "Susjed", matching phase-8's canonicalSpeakerName.
// A time-of-day suffix is the same character: "Barista (3 pm)" opens the scene
// that "Barista" finishes, and they must share a voice.
const canonicalSpeaker = (s) => String(s || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * The voice this speaker is cast in on this track, normalised — or null if the
 * speaker has no cast entry at all. Mirrors resolvePodSpeakerVoice's lookup
 * order (canonical, then raw, then _default) so this tool and the renderer can
 * never disagree about who should be speaking.
 */
function expectedVoiceFor(speakers, speaker, track) {
  const spec = TRACKS[track]
  if (!spec) throw new Error(`unknown track ${track}`)
  const map = speakers || {}
  const entry = map[canonicalSpeaker(speaker)] || map[speaker] || map._default
  const v = spec.castOf(entry)
  return v ? norm(v) : null
}

async function main() {
  const spec = TRACKS[TRACK]
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  try {
    // The slug is an allowlist, not a proof. A held pod is serving nobody;
    // anything else is a live pod wearing a staging-shaped slug.
    const { rows: podRows } = await c.query(
      `select speakers, visibility from listening_pods where id = $1`, [POD_ID]
    )
    if (podRows.length !== 1) throw new Error(`pod ${POD_ID} not found`)
    if (podRows[0].visibility !== 'held') {
      throw new Error(`pod ${POD_ID} has visibility=${JSON.stringify(podRows[0].visibility)}, not 'held' — refusing to touch a pod that may be serving learners`)
    }

    const cast = new Set(
      Object.values(podRows[0].speakers || {})
        .map(spec.castOf)
        .filter(Boolean)
        .map(norm)
    )
    if (!cast.size) throw new Error(`pod ${POD_ID} resolves to NO cast ${TRACK} voices — refusing to treat every clip as off-cast`)
    console.log(`Cast ${TRACK} voices for ${POD_ID}: ${[...cast].join(', ')}`)

    const { rows } = await c.query(
      `select s.id, s.speaker, s.${spec.link} as audio_id, ca.voice_id, ca.s3_key
         from listening_pod_sentences s
         join course_audio ca on ca.id = s.${spec.link}
        where s.pod_id = $1
        order by s.global_order`,
      [POD_ID]
    )

    // PER-SPEAKER, not set-membership (2026-08-23). The original check asked
    // "is this clip's voice anywhere in the pod's cast?", which is blind to the
    // one thing the pod-1 recast actually did: it moved WHICH CHARACTER gets
    // which voice, so that every conversation is a male talking to a female.
    // fra_for_eng read 231/231 "on-cast" while Customer, Driver and Tourist all
    // spoke in the voice now cast for Barista — both voices in the cast set, both
    // on the wrong character. The expected voice is resolved for each row's own
    // speaker, exactly as phase-8's resolvePodSpeakerVoice does, parenthetical
    // time-of-day suffixes and all ("Barista (3 pm)" is the Barista).
    const speakers = podRows[0].speakers || {}
    const expectedFor = (speaker) => expectedVoiceFor(speakers, speaker, TRACK)

    const uncast = [...new Set(rows.filter((r) => !expectedFor(r.speaker)).map((r) => canonicalSpeaker(r.speaker)))]
    if (uncast.length) {
      throw new Error(`pod ${POD_ID} has speakers with no ${TRACK} cast entry: ${uncast.join(', ')} — refusing to guess which voice they should be in`)
    }

    const offCast = rows.filter((r) => norm(r.voice_id) !== expectedFor(r.speaker))
    const byMove = offCast.reduce((m, r) => {
      const k = `${norm(r.voice_id)} → ${expectedFor(r.speaker)}`
      m[k] = (m[k] || 0) + 1; return m
    }, {})
    console.log(`${rows.length} linked ${TRACK} clips; ${rows.length - offCast.length} on-cast, ${offCast.length} OFF-CAST for their own speaker`)
    if (offCast.length) console.log(`  voice moves: ${JSON.stringify(byMove)}`)

    const log = offCast.map((r) => ({
      ...r,
      track: TRACK,
      link_column: spec.link,
      expected_voice: expectedFor(r.speaker),
      reason: `${TRACK} voice ${r.voice_id} is not the voice cast for speaker ${JSON.stringify(canonicalSpeaker(r.speaker))} (${expectedFor(r.speaker)})`,
      action: APPLY ? 'unlinked' : 'would-unlink',
    }))

    if (!APPLY) {
      fs.writeFileSync(logPath('dryrun'), JSON.stringify(log, null, 2))
      console.log(`DRY RUN. Wrote ${log.length} rows to ${logPath('dryrun')}`)
      await c.end()
      return
    }

    await c.query('BEGIN')
    for (const r of offCast) {
      // The predicate re-asserts the exact link we read, so a concurrent writer
      // that already replaced this clip loses the race instead of the clip.
      const res = await c.query(
        `update listening_pod_sentences
            set ${spec.link} = null
          where id = $1 and pod_id = $2 and ${spec.link} = $3
          returning id`,
        [r.id, POD_ID, r.audio_id]
      )
      if (res.rowCount !== 1) {
        throw new Error(`DRIFT: row ${r.id} no longer links clip ${r.audio_id} — aborting whole run, nothing written`)
      }
    }
    await c.query('COMMIT')
    fs.writeFileSync(logPath('applied'), JSON.stringify(log, null, 2))
    console.log(`APPLIED. Unlinked ${log.length} off-cast ${TRACK} clips (no course_audio row deleted). Wrote ${logPath('applied')}`)
    console.log(`▶ Next: POST /generate-pods/<course> with pod_ids=["${POD_ID}"], roles=["${TRACK}"] to refill them on the cast voices.`)
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {})
    console.error('FAILED:', e.message)
    process.exit(1)
  } finally {
    await c.end()
  }
}

module.exports = { podSlugAllowed, STAGING_SLUGS, TRACKS, norm, canonicalSpeaker, expectedVoiceFor }

if (require.main === module) main()
