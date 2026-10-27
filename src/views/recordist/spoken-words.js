// The booth's copy of services/shared/spoken-words.cjs — read that file for the rule (Aran,
// job #198: one take serves every line that says the same words). Kept identical by
// services/shared/spoken-words.test.cjs, which runs both over the same texts.

const APOSTROPHES = /[’‘ʼʻ`´′]/g

export function spokenWordsKey(text) {
  if (text === null || text === undefined) return ''
  return String(text)
    .replace(/<[^>]*>/g, ' ')
    .normalize('NFC')
    .toLowerCase()
    .replace(APOSTROPHES, "'")
    .replace(/[^\p{L}\p{N}\p{M}' ]+/gu, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter(Boolean)
    .join(' ')
}

// THE LINES ONE TAKE SERVES, IN THE BOOTH. Same spoken words on the same side (target or known),
// read at natural pace. A Take G / gapped line is a different performance of its words and has no
// twins. Null = this line has no twins.
export function twinKey(line) {
  if (!line || line.kind === 'takeg' || line.readStyle === 'gapped') return null
  const k = spokenWordsKey(line.text)
  return k ? `${line.role === 'known' ? 'known' : 'target'}|${k}` : null
}

// The twin keys already SAID in this batch: every line settled on its own (`ownSettled`: recorded,
// saved or still going up) plus `closing` — the keys of lines whose take was closed a moment ago and
// has not landed yet. The booth picks the next line at the instant he moves on, before the take of
// the line he is leaving is filed, so without `closing` the very next line — the LEGO of exactly the
// seed's words — was offered straight after the seed (27 Oct 2026, 10 times in one session).
export function saidTwinKeys(lines, ownSettled, closing = []) {
  const out = new Set(closing)
  for (const l of lines || []) {
    if (!ownSettled(l)) continue
    const k = twinKey(l)
    if (k) out.add(k)
  }
  return out
}
