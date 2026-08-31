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

/**
 * POST a multipart body to the lab. `call` sends JSON; a consent recording is
 * bytes, and the browser must be left to set its own multipart boundary — so
 * this is a sibling of `call` rather than a flag on it.
 */
async function postForm (path, form) {
  const headers = { 'ngrok-skip-browser-warning': 'true' }
  const token = await accessToken()
  if (!token) throw new Error('Not signed in — every Voice Lab endpoint needs a dashboard session.')
  headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${labBase()}${path}`, { method: 'POST', headers, body: form })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status, data })
  return data
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
  // CONSENT — the words, and the yes recorded onto a voice that already exists.
  // Neither call renders anything or spends anything.
  //
  // `recordConsentDeclaration` is the key to the standing consent block for a
  // voice nobody consented at birth: it takes a FormData when the person is at
  // a microphone (the line read aloud, checked by whisper on the box) and a
  // plain object when they are not (a named attestation). NAMED APART from the
  // `recordConsent` below on purpose — that one is the admin PUT that writes a
  // decision Tom obtained off-system, and a duplicate key in this object would
  // silently give both callers whichever definition came last.
  consentWording: () => call('/api/voicelab/consent-wording'),
  recordConsentDeclaration: (voiceId, body) =>
    body instanceof FormData
      ? postForm(`/api/voicelab/voices/${encodeURIComponent(voiceId)}/consent-declaration`, body)
      : call(`/api/voicelab/voices/${encodeURIComponent(voiceId)}/consent-declaration`, { method: 'POST', body }),

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
  prepareSamples: (language, voiceIds, { force = false } = {}) =>
    call(`/api/voicelab/languages/${encodeURIComponent(language)}/samples/prepare`, { method: 'POST', body: { voiceIds, force } }),

  // The same press, streamed. `onClip` fires once per rendered clip so the row
  // fills as it renders instead of after it; the promise resolves with the final
  // state, identical to what `prepareSamples` returns. Falls back to nothing
  // clever: a backend without the stream route answers HTML or 404, and the
  // caller catches that and uses the plain endpoint.
  prepareSamplesStream: async (language, voiceIds, { force = false } = {}, onClip = () => {}) => {
    const token = await accessToken()
    if (!token) throw new Error('Not signed in — every Voice Lab endpoint needs a dashboard session.')
    const res = await fetch(
      `${labBase()}/api/voicelab/languages/${encodeURIComponent(language)}/samples/prepare/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ voiceIds, force }),
      },
    )
    const ct = res.headers.get('content-type') || ''
    if (!res.ok || !(ct.includes('ndjson') || ct.includes('json'))) {
      const body = await res.text().catch(() => '')
      let msg = `HTTP ${res.status}`
      try { msg = JSON.parse(body).error || msg } catch { /* not json — keep the status */ }
      throw Object.assign(new Error(msg), { status: res.status, noStream: !ct.includes('ndjson') })
    }
    if (!res.body) throw Object.assign(new Error('no stream'), { noStream: true })

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    let final = null
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      // A chunk can split a line anywhere, so the tail stays in the buffer.
      const lines = buf.split('\n')
      buf = lines.pop() || ''
      for (const raw of lines) {
        const line = raw.trim()
        if (!line) continue
        let ev
        try { ev = JSON.parse(line) } catch { continue }
        if (ev.clip) onClip(ev.clip)
        if (ev.done) final = ev
      }
    }
    if (final && final.error) throw new Error(final.error)
    return final || {}
  },

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

  // ── CLONING FROM WHAT THE ESTATE ALREADY HOLDS (the primary path) ────────
  // Tom, 2026-08-31: "cloning FROM OUR OWN EXISTING RECORDINGS is the main
  // route, not a fallback". The first two calls spend NOTHING — they read the
  // archive and hand back URLs that play the original files straight from the
  // estate's bucket. The third builds one source file on the server and posts
  // it to Cartesia; it renders no speech.
  speakers: (language = '') =>
    call(`/api/voicelab/speakers${language ? `?language=${encodeURIComponent(language)}` : ''}`),
  speakerClips: (voiceId, { language = '', limit = 60 } = {}) =>
    call(`/api/voicelab/speakers/${encodeURIComponent(voiceId)}/clips?limit=${limit}` +
      (language ? `&language=${encodeURIComponent(language)}` : '')),
  cloneFromEstate: (body) =>
    call('/api/voicelab/voices/cartesia/clone-from-estate', { method: 'POST', body }),

  // Consent: recorded against the voice, queryable, and never inferred. Writing
  // `authorised` without a named human, a means and a date is refused by both
  // the route and the database.
  recordConsent: (voiceId, body) =>
    call(`/api/voicelab/voices/${encodeURIComponent(voiceId)}/consent`, { method: 'PUT', body }),

  // Un-create. Refused outright while the voice is cast into any slot.
  removeVoice: (voiceId) =>
    call(`/api/voicelab/voices/${encodeURIComponent(voiceId)}`, { method: 'DELETE' }),
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
  // `data` rides along on the error exactly as it does in `call`. The clone
  // route's refusals carry machine-readable flags beside the sentence
  // (needsAttestation, declarationNotHeard, heard, coverage) and the consent
  // step branches on them — a screen that had to string-match the prose would
  // break the first time the wording is redlined, which it will be.
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status, data })
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
