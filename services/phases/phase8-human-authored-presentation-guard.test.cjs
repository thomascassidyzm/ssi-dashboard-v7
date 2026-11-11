/**
 * phase8 consults the human-authored presentation guard at every site where a
 * presentation line is chosen, authored, purged or rendered (job #506). The
 * module is proven in services/shared/human-authored-presentations.test.cjs;
 * this file pins that phase8 actually CALLS it — remove a call and the
 * guard dies quietly, which is the failure mode the ruling names.
 * Run: npx vitest run services/phases/phase8-human-authored-presentation-guard
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const SRC = fs.readFileSync(path.join(here, 'phase8-audio-v13.cjs'), 'utf8')

function routeBody(signature) {
  const start = SRC.indexOf(signature)
  expect(start, `route not found: ${signature}`).not.toBe(-1)
  const rest = SRC.slice(start + signature.length)
  const end = rest.search(/\napp\.(get|post|put|patch|delete)\(/)
  return end === -1 ? rest : rest.slice(0, end)
}
function fnBody(signature) {
  const start = SRC.indexOf(signature)
  expect(start, `function not found: ${signature}`).not.toBe(-1)
  const rest = SRC.slice(start)
  const end = rest.search(/\n\/\/ =====|\nasync function |\nfunction /)
  return end === -1 ? rest : rest.slice(0, end)
}

describe('phase8 wires the human-authored presentation guard', () => {
  it('imports the module', () => {
    expect(SRC).toMatch(/require\('\.\.\/shared\/human-authored-presentations\.cjs'\)/)
  })

  it('/regenerate-presentations resolves every mark and swaps the template text for the human words before planning', () => {
    const body = routeBody("app.post('/regenerate-presentations/:courseCode'")
    const resolveAt = body.indexOf('humanAuthored.resolveForCourse(')
    const swapAt = body.indexOf('haResolved.textFor(pres.lego_id)')
    const planAt = body.indexOf('planPresentationRefresh(')
    expect(resolveAt).toBeGreaterThan(-1)
    expect(swapAt).toBeGreaterThan(resolveAt)
    expect(planAt).toBeGreaterThan(swapAt)
    // reported, in the dry-run response and the live one — never silent
    expect((body.match(/humanAuthored: humanAuthoredReport/g) || []).length).toBe(2)
  })

  it('/generate judges changed LEGOs under marked lines before deciding what to render, and reports every outcome', () => {
    const body = routeBody("app.post('/generate/:courseCode'")
    const resolveAt = body.indexOf('humanAuthored.resolveForCourse(')
    const needsAt = body.indexOf('await getAudioNeeds(courseCode, releaseTarget, course, false, scopeSeeds)')
    expect(resolveAt).toBeGreaterThan(-1)
    expect(needsAt).toBeGreaterThan(resolveAt)
    expect((body.match(/humanAuthored: \[\.\.\.humanAuthoredOutcomes/g) || []).length).toBe(2)
  })

  it('getAudioNeeds never authors a marked LEGO from the template, treats a marked pending row by its words, and re-queues from the mark', () => {
    const body = fnBody('async function getAudioNeeds(')
    expect(body).toMatch(/humanAuthored\.loadMarks\(supabase, courseCode\)/)
    expect(body).toMatch(/if \(presentationMarks\.has\(lego\.lego_id\)\) continue/)
    const isFresh = body.slice(body.indexOf('const isFreshPending = (r) =>'))
    const markAt = isFresh.indexOf('humanAuthored.pendingRowIsFresh(r, mark)')
    const quoteAt = isFresh.indexOf('quotedProbe(v)')
    expect(markAt).toBeGreaterThan(-1)
    expect(quoteAt).toBeGreaterThan(markAt)   // the mark is consulted BEFORE the quote rule
    expect(body).toMatch(/&& !presentationMarks\.has\(id\)/)   // never re-authored
    expect(body).toMatch(/humanAuthored\.markedNeeds\(/)
    expect(body).toMatch(/humanAuthored: humanAuthoredReport/)
  })

  it('/regenerate-presentation (single) takes the words from the mark and records a supplied edit against it', () => {
    const body = routeBody("app.post('/regenerate-presentation/:courseCode/:legoId'")
    expect(body).toMatch(/humanAuthored\.loadMark\(supabase, courseCode, legoId\)/)
    expect(body).toMatch(/humanAuthored\.recordWordingEdit\(/)
    expect(body).toMatch(/presentationMark \? presentationMark\.text/)
    expect(body).not.toMatch(/\.eq\('lego_id', legoId\)\s*\.maybeSingle\(\)/)   // several rows per LEGO is normal now
  })
})

describe('phase8 wires the SOFT guard on hand-written intros (Kai, 2026-11-11, job #247·AH)', () => {
  it('imports it', () => {
    expect(SRC).toMatch(/require\('\.\.\/shared\/intro-authorship\.cjs'\)/)
  })
  it('/regenerate-presentations warns before the dry-run return and in the live answer, and never blocks', () => {
    const body = routeBody("app.post('/regenerate-presentations/:courseCode'")
    const warnAt = body.indexOf('introAuthorship.warningsFor(')
    const dryAt = body.indexOf('if (dryRun) {')
    expect(warnAt).toBeGreaterThan(-1)
    expect(dryAt).toBeGreaterThan(warnAt)                  // a preview warns too
    expect(body.match(/introWarnings,/g).length).toBe(2)   // dry-run and live answers
    expect(body).toMatch(/existingByLegoId\.get\(p\.lego_id\)\?\.text/)   // old = what the learner hears
    expect(body).not.toMatch(/introWarnings[\s\S]{0,80}return res\.status\(4/)   // a warning is never a refusal
  })
  it('/generate warns on authored intros that replace soft-marked words', () => {
    const body = routeBody("app.post('/generate/:courseCode'")
    expect(body).toMatch(/authorIntroWarnings = introAuthorship\.warningsFor\(/)
    expect(body).toMatch(/introWarnings: authorIntroWarnings/)
  })
  it('/regenerate-presentation (single) reports an introWarning in its answer', () => {
    const body = routeBody("app.post('/regenerate-presentation/:courseCode/:legoId'")
    expect(body).toMatch(/introAuthorship\.warningsFor\(/)
    expect(body).toMatch(/introWarning \? \{ introWarning \}/)
  })
})
