'use strict'
// Standalone bare-assert script (node services/shared/postgrest-in-quote.test.cjs) — offline, no DB.
// cs #460: the zho_for_eng S0259L01 intro made supabase-js .in() emit a garbled list, so every
// clip-exists lookup missed, the render was paid and the INSERT hit 23505.
const assert = require('node:assert')
const { PostgrestFilterBuilder } = require('@supabase/postgrest-js')
const { inListFilter, emittedBy, installed } = require('./postgrest-in-quote.cjs')

const intro = `the chinese for: 'idea', is: <break time="300ms"/> <break time="10ms"/>`

// 1. the library's own .in (kept as .original) emits a malformed quoted value: an unescaped " inside "…"
const lib = emittedBy(PostgrestFilterBuilder.prototype.in.original || PostgrestFilterBuilder.prototype.in, [intro])
assert.strictEqual(lib, `in.("${intro}")`, 'library emits the raw quote unescaped (the bug)')

// 2. after install, the shipped .in emits PostgREST's quoted-value grammar: \" and \\ escaped
assert.ok(installed.patched, `patch installed: ${JSON.stringify(installed)}`)
const fixed = emittedBy(PostgrestFilterBuilder.prototype.in, [intro])
assert.strictEqual(fixed, `in.("the chinese for: 'idea', is: <break time=\\"300ms\\"/> <break time=\\"10ms\\"/>")`)
assert.strictEqual(inListFilter(['a\\b,c']), 'in.("a\\\\b,c")', 'backslash escaped')
assert.strictEqual(inListFilter(['say "hi"']), 'in.("say \\"hi\\"")', 'a quote without a comma is quoted too')

// 3. nothing that worked changes shape: ids and plain words are byte-identical to the library
const plain = ['3f2a-uuid', 'hola', 'idea', 42]
assert.strictEqual(emittedBy(PostgrestFilterBuilder.prototype.in, plain), emittedBy(PostgrestFilterBuilder.prototype.in.original, plain))

// 4. the patch is reached through the modules every free-text lookup loads
for (const m of ['./text-normalize.cjs', './clip-index.cjs', './audio-revision-swap.cjs']) require(m)
assert.ok(PostgrestFilterBuilder.prototype.in.original, 'still patched after loading the lookup modules')
console.log('postgrest-in-quote: ok')
