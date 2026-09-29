// applyElisionSpaceHint — the Azure input-only remedy for a swallowed elision.
//
// Kai's ear, 2026-09-28: every Azure Elsa/Benigno clip of "ha detto
// qualcos'altro?" says "ha detto altro?". The 2026-09-10 question-mark pass
// had measured the same and found that "qualcos' altro" (one space after the
// apostrophe) is spoken in full. Before this hint the string sent to Azure
// was the canonical spelling, so this file's first test FAILS on the pre-fix
// code (the text came back unchanged) and PASSES on the post-fix code.
//
// Run: npx vitest run services/azure-elision-space-hint.test.cjs
import { describe, it, expect } from 'vitest'
const { applyElisionSpaceHint } = require('./azure-tts-service.cjs')

describe('applyElisionSpaceHint — the qualcos\' row', () => {
  it('opens qualcos\'altro so Azure speaks the elided word', () => {
    expect(applyElisionSpaceHint("ha detto qualcos'altro?")).toBe("ha detto qualcos' altro?")
    expect(applyElisionSpaceHint("qualcos'altro")).toBe("qualcos' altro")
    expect(applyElisionSpaceHint("Puoi dirmi qualcos'altro prima che io risponda?")).toBe("Puoi dirmi qualcos' altro prima che io risponda?")
  })

  it('is idempotent — an already-spaced input gains no second space', () => {
    expect(applyElisionSpaceHint("ha detto qualcos' altro?")).toBe("ha detto qualcos' altro?")
  })

  it('touches no other elision — d\'accordo, l\'uomo, all\'aperto, com\'è render correctly and stay closed', () => {
    for (const s of ["d'accordo", "l'uomo", "l'anno", "all'aperto", "com'è", "non l'avrei detto"]) {
      expect(applyElisionSpaceHint(s)).toBe(s)
    }
  })

  it('leaves qualcosa (no elision) and empty input alone', () => {
    expect(applyElisionSpaceHint('voleva qualcosa da bere')).toBe('voleva qualcosa da bere')
    expect(applyElisionSpaceHint('')).toBe('')
    expect(applyElisionSpaceHint(null)).toBe(null)
  })
})
