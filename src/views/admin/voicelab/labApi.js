// ============================================================================
// labApi — the Voice Lab's one door to its backend.
//
// The lab RENDERS audio: TTS, then the same masterAudio the course pipeline
// runs, then the six-gate stack (two whisper passes). None of that can live in
// a Vercel function, so it lives in production-api on a real box and the SPA
// talks to it through getApiUrl() — the same base every other Popty screen
// uses, and the same base the Environment Switcher repoints.
//
// WHY THERE IS A FALLBACK, stated rather than hidden: popty.app defaults its
// API to https://ssi-machine.ngrok.app (Camberley), whose checkout is not
// currently deployable. A backend without /api/voicelab is not a routing bug
// and must not be reported as one — `probe()` asks the configured backend
// whether it has the lab, and the screen says which backend answered. The
// operator can switch to "SSi Machine (Cloud)" (the watson-1 Tailscale Funnel,
// the same URL the Environment Switcher offers) in one click.
// ============================================================================
import { getApiUrl } from '../../../services/api'
import { useAuth } from '../../../composables/useAuth'

/** The Environment Switcher's "SSi Machine (Cloud)" entry, verbatim. */
export const CLOUD_BACKEND = 'https://watson-1.tail4968cb.ts.net:8443'

export function labBase () {
  return getApiUrl() || ''
}

/** Point the whole dashboard at watson-1 — the same write the switcher makes. */
export function useCloudBackend () {
  localStorage.setItem('api_base_url', CLOUD_BACKEND)
  localStorage.setItem('api_environment', 'watson')
}

async function accessToken () {
  try {
    return await useAuth().getAccessToken()
  } catch {
    return null
  }
}

// Every lab endpoint is behind a dashboard session — reads included, because a
// read here lists what has been spent and what it sounded like. So `auth` is on
// by default rather than per-call.
async function call (path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'ngrok-skip-browser-warning': 'true' }
  if (body) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = await accessToken()
    if (!token) throw new Error('Not signed in — every Voice Lab endpoint needs a dashboard session.')
    headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(`${labBase()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('json')) {
    // An HTML body here is the SPA 404 or an ngrok interstitial, never a lab
    // response. Say which, rather than letting res.json() throw "Unexpected
    // token '<'" and reading as a code bug.
    throw Object.assign(
      new Error(`${labBase() || 'this backend'} answered ${res.status} with ${ct || 'no content type'} — it has no Voice Lab.`),
      { noLab: true, status: res.status }
    )
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status, data })
  return data
}

/** Does the configured backend have the lab at all? Never throws. */
export async function probe () {
  try {
    const params = await call('/api/voicelab/params')
    return { ok: true, base: labBase(), params }
  } catch (e) {
    return { ok: false, base: labBase(), error: e.message, noLab: Boolean(e.noLab) }
  }
}

export const api = {
  params: () => call('/api/voicelab/params'),
  courses: () => call('/api/voicelab/courses'),
  sentences: (q) => call(`/api/voicelab/sentences?${new URLSearchParams(q)}`),
  estimate: (body) => call('/api/voicelab/estimate', { method: 'POST', body }),
  createRun: (body) => call('/api/voicelab/runs', { method: 'POST', body }),
  listRuns: (limit = 50) => call(`/api/voicelab/runs?limit=${limit}`),
  getRun: (id) => call(`/api/voicelab/runs/${encodeURIComponent(id)}`),
  rerun: (id) => call(`/api/voicelab/runs/${encodeURIComponent(id)}/rerun`, { method: 'POST' }),
  exportConfig: (id) => call(`/api/voicelab/runs/${encodeURIComponent(id)}/export`, { method: 'POST' }),

  // The per-language registry. `languages` spends nothing; the two slot calls
  // write voice_language_roles and nothing else — no render, no course_audio.
  languages: () => call('/api/voicelab/languages'),
  castSlot: (language, body) =>
    call(`/api/voicelab/languages/${encodeURIComponent(language)}/slot`, { method: 'PUT', body }),
  // `slot` is 'phrase' (the male/female course voices — the default) or 'guide'
  // (the instruction and encouragement voice, one per KNOWN language, which has
  // no gender axis, so the query carries none).
  clearSlot: (language, { gender, rank, slot = 'phrase' }) =>
    call(
      `/api/voicelab/languages/${encodeURIComponent(language)}/slot?slot=${slot}&rank=${rank}` +
      (slot === 'guide' ? '' : `&gender=${gender}`),
      { method: 'DELETE' }
    ),

  // SAMPLES — hearing a candidate voice say a real course line.
  //
  // `samples` SPENDS NOTHING: it returns what is already cached here or already
  // owned by the estate, plus the plain list of voices that have neither. It is
  // what the page calls when a language is opened, which is exactly why it must
  // not render — "open it and it plays" is the whole point.
  //
  // `prepareSamples` is the one call on this path that spends: one Cartesia clip
  // per voice, capped at 12 per press by the backend and refused on top of that
  // by the lab's daily character ceiling. Nothing here writes course_audio.
  samples: (language, voiceIds = []) =>
    call(`/api/voicelab/languages/${encodeURIComponent(language)}/samples?voices=${encodeURIComponent(voiceIds.join(','))}`),
  prepareSamples: (language, voiceIds) =>
    call(`/api/voicelab/languages/${encodeURIComponent(language)}/samples/prepare`, { method: 'POST', body: { voiceIds } }),

  // PER-VOICE NATURAL PACE. `pace` is the reading surface — measured from clips
  // that already exist, so it spends nothing. `nudgePace` writes ONE column:
  // the human's correction. The measurement itself is deliberately not
  // writable from a screen (Tom's ruling, 2026-08-29: pace is measured from
  // rendered audio, never asked of a human).
  pace: () => call('/api/voicelab/pace'),
  nudgePace: (voiceId, { nudge, note = null }) =>
    call(`/api/voicelab/voices/${encodeURIComponent(voiceId)}/pace`, { method: 'PUT', body: { nudge, note } }),

  // Cloning uploads one sample and returns a voice id. It RENDERS NOTHING and
  // cannot trigger a bulk run — hearing the clone is a separate, capped
  // audition through the ordinary render path.
  cloneVoice: (formData) => upload('/api/voicelab/voices/cartesia/clone', formData),

  // The audition is the one call on the clone path that spends. The backend
  // caps it at CLONE_AUDITION_MAX_CLIPS (3) and the lab's daily character
  // ceiling still refuses on top of that.
  auditionVoice: (body) => call('/api/voicelab/voices/cartesia/audition', { method: 'POST', body }),
}

/** multipart POST. Same session gate as `call`; the browser sets the boundary. */
async function upload (path, formData) {
  const token = await accessToken()
  if (!token) throw new Error('Not signed in — every Voice Lab endpoint needs a dashboard session.')
  const res = await fetch(`${labBase()}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status })
  return data
}

/**
 * Clip URLs come back relative to the lab backend, not to popty.app — and the
 * clip route is behind the same dashboard session as everything else. An
 * `<audio src>` cannot set an Authorization header, so the backend accepts the
 * identical bearer token as `?access_token=`. Same token, same check, different
 * transport.
 */
export async function clipUrl (url) {
  if (!url) return ''
  const absolute = /^https?:/.test(url) ? url : `${labBase()}${url}`
  const token = await accessToken()
  if (!token) return absolute
  return `${absolute}${absolute.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`
}

/**
 * Poll one experiment until it stops running. The clips are playable long
 * before the verdicts land — the whisper passes take the best part of a minute
 * per clip — so the caller gets every intermediate state, not just the last.
 */
export function pollRun (id, onUpdate, { intervalMs = 2500, timeoutMs = 20 * 60 * 1000 } = {}) {
  let stopped = false
  const startedAt = Date.now()
  ;(async () => {
    while (!stopped) {
      try {
        const { experiment } = await api.getRun(id)
        onUpdate(experiment)
        if (experiment.status !== 'running') return
      } catch (e) {
        onUpdate(null, e)
      }
      if (Date.now() - startedAt > timeoutMs) {
        onUpdate(null, new Error('Stopped polling after 20 minutes — the run is still on the backend; reopen it from Experiments.'))
        return
      }
      await new Promise((r) => setTimeout(r, intervalMs))
    }
  })()
  return () => { stopped = true }
}
