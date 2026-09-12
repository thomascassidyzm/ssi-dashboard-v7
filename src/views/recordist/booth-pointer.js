// WHICH BOOTH THIS BROWSER CAME FROM.
//
// Tom, 2026-09-12, testing /r/human_tom_zzz as a voice artist: he needs the
// course Overview and the pod drafts pages, "because I am also an editor of the
// lines", and a way back to the booth from all of them. The booth is a public,
// link-is-identity page and the pages it points at are course pages that know
// nothing about voices, so the way back is remembered HERE, per tab: the booth
// writes its voice on load, and any course page reads it to draw one link.
// sessionStorage, not localStorage, so a shared laptop never offers Aran's
// booth to whoever opens Popty next.
const KEY = 'popty.booth.voice'

export function rememberBooth(voiceId) {
  try { if (voiceId) sessionStorage.setItem(KEY, String(voiceId)) } catch { /* private mode: no way back, no crash */ }
}

export function rememberedBooth() {
  try { return sessionStorage.getItem(KEY) || null } catch { return null }
}
