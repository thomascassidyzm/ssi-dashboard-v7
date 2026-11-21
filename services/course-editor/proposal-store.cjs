/**
 * Course editor — the PROPOSED-CHANGE store (job #116·AK). Aran, 2026-11-21: Popty has no staging and its data is live,
 * so an edit or removal is saved as a PROPOSAL first and changes nothing in the course; only an admin's explicit Apply
 * makes it real (through the edit door, services/course-editor/course-editor-router.cjs).
 *
 * A server-owned JSON file per course, kept by the Popty production service on watson-1 beside the edit door's own undo
 * files (tools/lib/evidence-path.cjs → ~/ssi-evidence/…/ops/course-editor-proposals/<course>.json, or
 * COURSE_EDITOR_STORE_DIR). Chosen because it needs NO schema change (a new table needs a migration only Tom approves),
 * and proposals are a note about the course, not course content. Writes are atomic (tmp + rename) and serialised per
 * course inside this one process, which is the only writer.
 *
 * A proposal: { id, kind: lego|phrase, key, action: edit|remove, before: {known,target}, after: {known,target}|null,
 *   proposedBy, proposedAt, status: pending|applied|undone|stale|failed, appliedBy?, appliedAt?, eventId?, undoOps?,
 *   change?, plan?, needsAudio?, audioQueued?, undoneBy?, undoneAt?, error? }
 * Discarding a pending proposal deletes it. Applied/undone ones are kept (the undo lives on the applied one).
 */
'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function storeDir() {
  if (process.env.COURSE_EDITOR_STORE_DIR) return process.env.COURSE_EDITOR_STORE_DIR
  return path.dirname(require('../../tools/lib/evidence-path.cjs').evidencePath('ops/course-editor-proposals/.keep'))
}

function createProposalStore({ dir = storeDir() } = {}) {
  const chains = new Map()
  const fileOf = (course) => path.join(dir, `${course.replace(/[^a-z0-9_]/gi, '')}.json`)

  function readAll(course) {
    try { return JSON.parse(fs.readFileSync(fileOf(course), 'utf8')).proposals || [] } catch (e) {
      if (e.code === 'ENOENT') return []
      throw e
    }
  }
  function writeAll(course, proposals) {
    fs.mkdirSync(dir, { recursive: true })
    const f = fileOf(course)
    const tmp = `${f}.${process.pid}.${Date.now()}.tmp`
    fs.writeFileSync(tmp, JSON.stringify({ course_code: course, proposals }, null, 1))
    fs.renameSync(tmp, f)
  }
  /** Run fn(proposals) -> result with the course's list, then save it; one at a time per course. */
  function mutate(course, fn) {
    const prev = chains.get(course) || Promise.resolve()
    const next = prev.catch(() => {}).then(async () => {
      const list = readAll(course)
      const out = await fn(list)
      writeAll(course, list)
      return out
    })
    chains.set(course, next)
    return next
  }

  return {
    list: (course) => readAll(course),
    mutate,
    newId: () => crypto.randomBytes(6).toString('hex'),
  }
}

module.exports = { createProposalStore }
