// ONE BOOTH PAGE, ONE TAB PER VOICE (Aran, 2026-10-14, job #392).
//
// Who counts as the same person, and which of their voices this caller may see, is the server's
// decision (services/voice-engine/booth-tabs.cjs). This file only holds what the page needs to draw
// it: the words on a tab, the keys this device holds, and the last answer, kept so the tabs draw at
// once on a return (the same reason booth-home.js keeps the home summary).

const BOOTH_KEY_STORE = 'popty.boothKey.'
const TABS_STORE = 'popty.boothTabs.'

// A tab names the language in its own words: Aran reads "Cymraeg | English". Any language not
// listed here is named in English, which is what the booth already says elsewhere.
const OWN_NAME = {
  cym: 'Cymraeg', eng: 'English', gle: 'Gaeilge', gla: 'Gàidhlig', glv: 'Gaelg', cor: 'Kernewek', bre: 'Brezhoneg',
  spa: 'Español', fra: 'Français', deu: 'Deutsch', ita: 'Italiano', por: 'Português', nld: 'Nederlands', eus: 'Euskara', cat: 'Català',
}
// The dialect tags the policy carries, in the words a reader would use.
const DIALECT_WORDS = { north: 'North', n: 'North', south: 'South', s: 'South' }

export function languageLabel(language, languageName) {
  return OWN_NAME[language] || languageName || language || ''
}

/**
 * The language a batch header leads with (job #392: "the where-am-I batch header must name the
 * language"), or '' when the course words already say it ("English for New Welsh — North").
 */
export function headerLanguage(courseWords, language, languageName) {
  const label = languageLabel(language, languageName)
  const words = String(courseWords || '')
  if (!label || (languageName && words.startsWith(languageName)) || words.startsWith(label)) return ''
  return label
}

/** The words on one tab. Two tabs in one language are told apart by dialect, then by name. */
export function tabLabel(tab, tabs = []) {
  const base = languageLabel(tab.language, tab.languageName)
  const same = tabs.filter((t) => t.language === tab.language)
  if (same.length < 2) return base
  const d = tab.dialect ? (DIALECT_WORDS[String(tab.dialect).toLowerCase()] || tab.dialect) : null
  const dialects = new Set(same.map((t) => t.dialect || ''))
  if (d && dialects.size === same.length) return `${base} · ${d}`
  return `${base} · ${tab.displayName || tab.voiceId}`
}

/** `x-booth-keys` for every voice this device holds a key for, except the page's own. */
export function heldKeysHeader(exceptVoiceId) {
  if (typeof localStorage === 'undefined') return ''
  const parts = []
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const name = localStorage.key(i)
      if (!name || !name.startsWith(BOOTH_KEY_STORE)) continue
      const voiceId = name.slice(BOOTH_KEY_STORE.length)
      const key = localStorage.getItem(name)
      if (voiceId && key && voiceId !== exceptVoiceId) parts.push(`${encodeURIComponent(voiceId)}:${key}`)
    }
  } catch { /* private mode: no held keys */ }
  return parts.join(',')
}

export function loadTabsSnapshot(voiceId) {
  try {
    const t = JSON.parse(localStorage.getItem(TABS_STORE + voiceId) || 'null')
    return Array.isArray(t) && t.some((x) => x.voiceId === voiceId) ? t : null
  } catch { return null }
}

/** Kept under every voice in the set, so whichever link opens next draws the same tabs. */
export function saveTabsSnapshot(voiceId, tabs) {
  try {
    const keep = (tabs || []).map(({ voiceId: v, displayName, language, languageName, dialect }) => ({ voiceId: v, displayName, language, languageName, dialect }))
    if (keep.length > 1) for (const t of keep) localStorage.setItem(TABS_STORE + t.voiceId, JSON.stringify(keep))
    else localStorage.removeItem(TABS_STORE + voiceId)
  } catch { /* private mode: the tabs just draw on the server's answer */ }
}
