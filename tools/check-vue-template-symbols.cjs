#!/usr/bin/env node
/**
 * TEMPLATE-SYMBOL GATE — does every identifier a template uses actually exist
 * in its `<script setup>`?
 *
 * Written 2026-08-31, the afternoon a rewrite of the Voice Lab's clone panel
 * (67794654b) deleted `canRecord`, `pickFile`, `canSubmitClone` and the whole
 * MediaRecorder block from the script while leaving every one of their buttons
 * in the template. Vue compiles an unknown identifier to `_ctx.<name>` and says
 * NOTHING — not at build time, not at runtime. So the page shipped, the deploy
 * was green, and "Record it here" simply rendered disabled, blaming the
 * browser: "This browser will not give the page a microphone." Tom hit it live,
 * in front of Aran.
 *
 * The check: compile each SFC's template with its own script bindings and look
 * for surviving `_ctx.` accesses. In a `<script setup>` component every real
 * binding resolves to `$setup`, so `_ctx.foo` means foo is not defined anywhere
 * the template can see it — a global the component never imported, a leftover
 * from a deleted block, or a v-for alias used outside its loop.
 *
 * Runs in a couple of seconds over the whole repo and needs only
 * @vue/compiler-sfc.
 *
 *   node tools/check-vue-template-symbols.cjs            # gate: exit 1 on new hits
 *   node tools/check-vue-template-symbols.cjs --all      # list every hit, baseline included
 *
 * BASELINE: two pre-existing hits found the same day, both genuine but in other
 * people's files and both older than this gate. They are listed so the gate
 * fails on NEW breakage only. Fixing one means deleting its line here.
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')

// file → symbols known-bad on 2026-08-31, with what is actually wrong.
const BASELINE = {
  // `v-if="phaseData.exists"` sits OUTSIDE the v-for that binds phaseData, so
  // it reads undefined and throws whenever that branch renders.
  'src/views/CourseValidator.vue': ['phaseData'],
  // `@click="() => { window.location.reload() }"` — `window` is not a template
  // global in Vue 3, so the handler throws instead of reloading.
  'src/views/production/components/PhraseEditModal.vue': ['window'],
}

// Vue DOES expose these on _ctx by design.
const ALLOWED = new Set([
  '$emit', '$slots', '$attrs', '$props', '$refs', '$el', '$nextTick',
  '$forceUpdate', '$watch', '$parent', '$root', '$options', '$data',
])

let sfc
try {
  sfc = require('@vue/compiler-sfc')
} catch {
  console.error('check-vue-template-symbols: @vue/compiler-sfc is not installed — skipping.')
  process.exit(0)
}

const all = process.argv.includes('--all')
const files = execSync('git ls-files "*.vue"', { cwd: ROOT, encoding: 'utf8' })
  .split('\n').map((s) => s.trim()).filter(Boolean)

let failures = 0
let baselined = 0

for (const rel of files) {
  const abs = path.join(ROOT, rel)
  let miss = []
  try {
    const { descriptor } = sfc.parse(fs.readFileSync(abs, 'utf8'), { filename: rel })
    if (!descriptor.template || !descriptor.scriptSetup) continue
    const script = sfc.compileScript(descriptor, { id: 'gate' })
    const { code } = sfc.compileTemplate({
      source: descriptor.template.content,
      filename: rel,
      id: 'gate',
      compilerOptions: { bindingMetadata: script.bindings },
    })
    miss = [...new Set([...code.matchAll(/_ctx\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))]
      .filter((n) => !ALLOWED.has(n))
  } catch (e) {
    // A file that will not compile is the build's problem, not this gate's.
    continue
  }
  if (!miss.length) continue

  const known = BASELINE[rel] || []
  const fresh = miss.filter((n) => !known.includes(n))
  if (fresh.length) {
    failures++
    console.error(`✗ ${rel}`)
    console.error(`  used in the template, defined nowhere in the script: ${fresh.join(', ')}`)
  } else {
    baselined++
    if (all) console.log(`· ${rel} (baseline): ${miss.join(', ')}`)
  }
}

if (failures) {
  console.error('')
  console.error(`${failures} component(s) name something in the template that the script does not define.`)
  console.error('Vue renders these as undefined without a word: a button goes permanently disabled,')
  console.error('a handler binds nothing, a computed reads !undefined. Define it or stop using it.')
  process.exit(1)
}
console.log(`✓ template symbols resolve in ${files.length} components (${baselined} baselined).`)
