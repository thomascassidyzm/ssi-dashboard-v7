// "Edit this line" (Aran, 2026-10-15, job #709) — the booth's calls to
// /api/recording/admin/line-edit (services/voice-engine/booth-line-edit-router.cjs).
//
// WHO SEES THE BUTTON is the SERVER's answer, never this file's: the booth asks GET / once with
// the signed-in session, and only a 200 (a God admin: Tom, Aran, Kai) shows the control. No
// session (a private-link visitor) means no call and no button. The server checks again on every
// read and every write, so the button showing is never what lets an edit through.
import { recordingApiBase as apiBase } from '@/services/recordingApi'
import { useAuth } from '@/composables/useAuth'

const BASE = '/api/recording/admin/line-edit'

/** The lines that are a row of their own: a seed sentence, a LEGO, a practice phrase. */
export const isRowLine = (line) => /^(seed|lego|phrase):/.test(String((line && line.id) || line || ''))

async function token() {
  try { return await useAuth().getAccessToken() } catch { return null }
}

let access = null
/** True only when the server says this session is a God admin. Asked once per page load. */
export function canEditLines() {
  if (!access) {
    access = (async () => {
      const t = await token()
      if (!t) return false
      try {
        const r = await fetch(`${apiBase()}${BASE}`, { headers: { Authorization: `Bearer ${t}` } })
        return r.ok
      } catch { return false }
    })()
  }
  return access
}
/** Tests only: forget the cached answer. */
export function resetLineEditAccess() { access = null }

async function call(method, path, body) {
  const t = await token()
  const r = await fetch(`${apiBase()}${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    const e = new Error(data.error || `That did not work (${r.status}).`)
    e.status = r.status
    e.data = data
    throw e
  }
  return data
}

const linePath = (lineId) => `/line/${encodeURIComponent(lineId)}`
export const readLine = (lineId) => call('GET', linePath(lineId))
export const previewEdit = (lineId, edit) => call('POST', `${linePath(lineId)}/preview`, edit)
export const applyEdit = (lineId, edit) => call('POST', `${linePath(lineId)}/apply`, edit)
export const undoEdit = (courseCode, undoFile) => call('POST', '/undo', { courseCode, undoFile })
