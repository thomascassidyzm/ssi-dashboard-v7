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
  // ON popty.app THE PROXY ALWAYS WINS — checked BEFORE the pin, deliberately.
  //
  // The app's environment bootstrap writes api_base_url into localStorage on
  // load, pointing at watson-1, and it does so for anonymous visitors too. So a
  // recordist who has merely opened the page once carries a pin that would send
  // them straight back out to watson-1 and straight back into the blocked
  // public-to-local-address-space fetch. Honouring the pin first is exactly the
  // bug: the surface stayed broken while the code read as if it were fixed.
  //
  // A pin is a development affordance, and on popty.app the same-origin proxy is
  // always present and always better, so there is nothing for a pin to usefully
  // say here. Off popty.app it still decides everything.
  // ...and on a Vercel PREVIEW of the same project, for the same reason. The
  // rewrite in vercel.json is part of the deployment, not of the production
  // alias, so every preview host proxies /api/recording/* exactly as popty.app
  // does — and a preview page reaching out to watson-1 directly is refused by
  // the browser exactly as popty.app's would be. Without this, staging a
  // recordist change could never be verified in a real browser.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host === 'popty.app' || host.endsWith('.vercel.app')) return ''
  }
  if (typeof localStorage !== 'undefined') {
    const pinned = localStorage.getItem('api_base_url')
    if (pinned) return pinned
  }
  return getApiUrl()
}

/** Full URL for a path under /api/recording. */
export function recordingUrl(path) {
  return `${recordingApiBase()}${path}`
}
