'use strict'
/**
 * Quote-safe `.in()` for every supabase-js query in the process (cs #460).
 *
 * postgrest-js 2.87.1 `PostgrestFilterBuilder.in` wraps a value containing `,` `(` or `)` in double
 * quotes but does NOT escape a `"` or `\` inside it. So an SSML intro such as
 *   The Chinese for: 'idea', is: <break time="300ms"/>
 * goes out as in.("...is: <break time="300ms"/>") — a garbled list that PostgREST answers with
 * no rows and no error. Every clip-exists lookup keyed on free text (clip-index, writeOrSwapClip's
 * findHolder, clip-library, rerecord-gate, phase8, recordist) then reported "no clip", the render
 * was PAID, and the INSERT hit 23505 unique_course_audio_per_voice and was dropped
 * (zho_for_eng S0259L01, paid twice: #431·AI, #449·AI).
 *
 * The fix is at the source, once, so no free-text `.in()` anywhere — present or future — can
 * leak: a string value containing any of , ( ) " \ is quoted with `"` and `\` backslash-escaped,
 * which is PostgREST's own grammar for a quoted list value. Everything else is emitted exactly as
 * the library emits it today (ids, plain words), so nothing that works changes shape.
 *
 * Self-retiring: at install it asks the library's own `.in` what it emits for a value with a comma
 * and a quote. If a future postgrest-js already escapes it, the patch is NOT applied (no double
 * escaping). Idempotent: installing twice is a no-op.
 */

const NEEDS_QUOTES = /[,()"\\]/
const PROBE = 'a,"b'
const MARK = Symbol.for('popty.postgrestInQuoteSafe')

/** One list value exactly as PostgREST must receive it inside in.(…). */
function quoteListValue(v) {
  if (typeof v !== 'string' || !NEEDS_QUOTES.test(v)) return `${v}`
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/** The `in.(…)` operand for a list of values (deduplicated, as the library does). */
function inListFilter(values) {
  return `in.(${Array.from(new Set(values)).map(quoteListValue).join(',')})`
}

/** What a given `.in` implementation emits for `values` (runs it on a bare stand-in, no network). */
function emittedBy(inFn, values) {
  const fake = { url: new URL('http://probe.invalid/t') }
  inFn.call(fake, 'c', values)
  return fake.url.searchParams.get('c')
}

function install(Builder) {
  const B = Builder || require('@supabase/postgrest-js').PostgrestFilterBuilder
  const orig = B.prototype.in
  if (orig[MARK]) return { patched: true, already: true }
  if (emittedBy(orig, [PROBE]) === inListFilter([PROBE])) return { patched: false, reason: 'library already escapes' }
  function quoteSafeIn(column, values) {
    this.url.searchParams.append(column, inListFilter(values))
    return this
  }
  quoteSafeIn[MARK] = true
  quoteSafeIn.original = orig
  B.prototype.in = quoteSafeIn
  return { patched: true }
}

let installed = null
try { installed = install() } catch (e) { installed = { patched: false, reason: e.message } }

module.exports = { quoteListValue, inListFilter, emittedBy, install, installed }
