// src/services/recordingApi.js
//
// THE ONE base URL for the /api/recording/* routes.
//
// It exists because this was written out by hand in four different files, and
// three of them were patched while the fourth quietly went on pointing at
// watson-1 — which is not a cosmetic duplication, because that fourth copy was
// the one that loads the recordist's queue. The page showed "Failed to fetch"
// with everything else fixed.
//
// WHY SAME-ORIGIN ON popty.app. A public document at popty.app fetching
// watson-1 directly is refused by the browser BEFORE CORS is consulted — Chrome
// blocks it as a public page reaching into the local address space:
//
//   Access to fetch at 'https://watson-1.tail4968cb.ts.net:8443/...'
//   from origin 'https://popty.app' has been blocked by CORS policy:
//   Permission was denied for this request to access the `local` address space.
//
// Header checks cannot catch this: the preflight and the GET both answer 200
// with a correct Access-Control-Allow-Origin, so curl sees a healthy backend
// while the browser still refuses. The recordist just reads "Failed to fetch".
//
// vercel.json proxies /api/recording/* through popty.app to watson-1, so the
// page only ever talks to its own origin and the private-network hop happens
// server-side, where no browser policy applies. Full note:
// docs/recordist-surface-2026-08-14/why-same-origin.md
//
// Import this. Do not write another one.

import { getApiUrl } from '@/services/api'

export function recordingApiBase() {
  // A pinned base always wins, so a dev box can point anywhere.
  if (typeof localStorage !== 'undefined') {
    const pinned = localStorage.getItem('api_base_url')
    if (pinned) return pinned
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'popty.app') return ''
  return getApiUrl()
}

/** Full URL for a path under /api/recording. */
export function recordingUrl(path) {
  return `${recordingApiBase()}${path}`
}
