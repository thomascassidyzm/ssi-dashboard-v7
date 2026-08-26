/**
 * clone-source-store.cjs — where a pack take goes, and how the page knows.
 *
 * S3 IS THE WHOLE DATABASE HERE, on purpose. See the header of
 * clone-source-pack.cjs: the isolation from course audio is meant to be
 * structural, and the strongest form of "this can never leak into a course" is
 * that there is no row anywhere for anything to find. The bucket answers both
 * questions the surface asks — what have I recorded, and where are those bytes
 * — from one prefix listing per page load.
 *
 * KEY LAYOUT
 *   clone-source/<packId>/<itemId>/<epochMs>-<uuid>.<ext>              a take
 *   clone-source/<packId>/_rejected/<itemId>/<epochMs>-<uuid>.<ext>    over-cap
 *
 * The epoch prefix is fixed-width for the next 250 years, so "the newest take"
 * is a lexicographic max over the listing and needs no HEAD and no metadata
 * read. Retakes never overwrite: every take is kept, the newest one is the one
 * offered back, and the rejects are kept too because a take Tom has already
 * spoken is never thrown away by this system — it is only declined.
 */

'use strict'

const crypto = require('crypto')
const { spawn } = require('child_process')
const { writeFile, unlink, mkdtemp } = require('fs/promises')
const os = require('os')
const path = require('path')

const ROOT = 'clone-source'

/** Container extension from a browser mime string. Mirrors the recorder client. */
function extForMime(mimeType) {
  const t = String(mimeType || '').toLowerCase()
  if (t.includes('webm')) return 'webm'
  if (t.includes('ogg')) return 'ogg'
  if (t.includes('wav')) return 'wav'
  if (t.includes('mpeg') || t.includes('mp3')) return 'mp3'
  if (t.includes('mp4') || t.includes('m4a') || t.includes('aac')) return 'm4a'
  return 'bin'
}

function itemPrefix(packId, itemId) {
  return `${ROOT}/${packId}/${itemId}/`
}

function packPrefix(packId) {
  return `${ROOT}/${packId}/`
}

function takeKey({ packId, itemId, mimeType, rejected = false, now = Date.now(), id = crypto.randomUUID() }) {
  const stamp = String(now).padStart(13, '0')
  const ext = extForMime(mimeType)
  return rejected
    ? `${ROOT}/${packId}/_rejected/${itemId}/${stamp}-${id}.${ext}`
    : `${ROOT}/${packId}/${itemId}/${stamp}-${id}.${ext}`
}

/**
 * Which items have a take, and the newest key for each.
 *
 * One ListObjectsV2 for the whole pack. `_rejected/` is excluded here — a
 * declined take must not make its item read as done, which is the entire point
 * of declining it.
 */
function indexTakes(objects, packId) {
  const byItem = new Map()
  const prefix = packPrefix(packId)
  for (const o of objects || []) {
    if (!o || !o.key || !o.key.startsWith(prefix)) continue
    const rest = o.key.slice(prefix.length)
    const slash = rest.indexOf('/')
    if (slash <= 0) continue
    const itemId = rest.slice(0, slash)
    if (itemId === '_rejected') continue
    const prev = byItem.get(itemId)
    if (!prev || o.key > prev.key) byItem.set(itemId, o)
  }
  return byItem
}

/**
 * How long the recorded audio actually is, in seconds, or null if we cannot
 * tell. ffprobe over a temp file — a browser's webm/opus blob has no duration
 * in its header often enough that reading bytes is not an option, and the cap
 * this feeds is a vendor's hard refusal, not a nicety.
 *
 * Returning null on any failure is deliberate: an unprobeable take is stored,
 * not refused. Losing bytes Tom has already spoken to protect a limit we could
 * not measure would be the worse error by a distance.
 */
async function probeDurationSeconds(buffer, mimeType, { exec = spawn } = {}) {
  let dir = null
  let file = null
  try {
    dir = await mkdtemp(path.join(os.tmpdir(), 'clone-src-'))
    file = path.join(dir, `probe.${extForMime(mimeType)}`)
    await writeFile(file, buffer)
    const out = await new Promise((resolve) => {
      const p = exec('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        file,
      ])
      let stdout = ''
      p.stdout && p.stdout.on('data', (d) => { stdout += d })
      p.on('error', () => resolve(null))
      p.on('close', (code) => resolve(code === 0 ? stdout.trim() : null))
    })
    const secs = out === null ? NaN : parseFloat(out)
    return Number.isFinite(secs) && secs > 0 ? secs : null
  } catch {
    return null
  } finally {
    if (file) await unlink(file).catch(() => {})
  }
}

/**
 * The message shown to the reader when a take is over its vendor cap. It says
 * the number, the rule and the fix — a bare "too long" leaves someone on a
 * phone guessing at how much too long.
 */
function overCapMessage(item, seconds) {
  const s = seconds.toFixed(1)
  return `That take is ${s} seconds and this one is capped at ${item.maxSeconds}. ` +
    (item.id === 'b4-cloning-sample'
      ? "OpenAI refuses any sample over 30 seconds, so it cannot be used. Read it again a little quicker, or drop the last sentence and go. Nothing was lost — the take is kept."
      : 'Read it again a little quicker. Nothing was lost — the take is kept.')
}

/**
 * Shape the pack for the recordist surface's existing contract.
 *
 * Field-for-field what buildQueue returns for a real recordist, so the page
 * needs no knowledge that a pack exists: `text` is the line, `knownText` is the
 * block's note (the surface renders it small under the line), `rerecordReason`
 * is the constraint (rendered smaller still). `courseCode` is null and stays
 * null — there is no course in this, at any layer.
 */
function buildPackQueue(pack, takesByItem, { includeRecorded = false } = {}) {
  const lines = []
  let recorded = 0
  for (const item of pack.items) {
    const take = takesByItem.get(item.id) || null
    const isRecorded = !!take
    if (isRecorded) recorded += 1
    if (!isRecorded || includeRecorded) {
      lines.push({
        id: item.id,
        order: item.order,
        text: item.text,
        knownText: item.note || null,
        speaker: item.title || null,
        courseCode: null,
        recorded: isRecorded,
        clipUrl: take
          ? `/api/recording/voice/${encodeURIComponent(pack.voiceId)}/line/${encodeURIComponent(item.id)}/clip`
          : null,
        rerecordWanted: false,
        alsoFills: 0,
        kind: 'pack',
        role: null,
        rerecordReason: item.why || null,
      })
    }
  }
  return {
    lines,
    total: pack.items.length,
    recorded,
    remaining: pack.items.length - recorded,
  }
}

module.exports = {
  ROOT,
  extForMime,
  itemPrefix,
  packPrefix,
  takeKey,
  indexTakes,
  probeDurationSeconds,
  overCapMessage,
  buildPackQueue,
}
