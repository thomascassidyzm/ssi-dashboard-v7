import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, mkdtempSync, writeFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

// Job #381: since job #850 useI18n imports Vite-only virtual modules, and the dump tool's esbuild
// bundle failed on them ("Could not resolve virtual:eng-boot"). Evaluate only the tool's alias
// plugin (importing the CLI would read configuration and run it) and bundle an import of both.
const source = readFileSync(new URL('./snapshot.mjs', import.meta.url), 'utf8')
const block = source.match(/const aliasPlugin = \{[\s\S]*?\n {2}\}\n/)?.[0]
assert.ok(block, 'alias plugin source must remain identifiable')

const require = createRequire(import.meta.url)
const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
// same lookup as the tool's findEsbuild: hoisted, else the pnpm store
const esbuild = (() => {
  try { return require(require.resolve('esbuild', { paths: [repo] })) } catch {
    const pnpm = path.join(repo, 'node_modules', '.pnpm')
    return require(path.join(pnpm, readdirSync(pnpm).filter((d) => d.startsWith('esbuild@')).sort().pop(), 'node_modules', 'esbuild'))
  }
})()

test('the dump bundle resolves the English virtual modules', async () => {
  // same realm as esbuild: its plugin API checks `filter instanceof RegExp`
  const plugin = new Function('path', 'existsSync', 'readFileSync', 'args', 'PLAYER_VUE', 'CORE_SRC', 'vuePath', `${block}\nreturn aliasPlugin`)(path, existsSync, readFileSync, {}, '/nonexistent', '/nonexistent', 'vue')
  const dir = mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'pcs-eng-'))
  const entry = path.join(dir, 'entry.mjs')
  writeFileSync(entry, "import a from 'virtual:eng-boot'\nimport b from 'virtual:eng-deferred'\nexport const n = Object.keys(a).length + Object.keys(b).length\n")
  const r = await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent', plugins: [plugin] })
  assert.equal(r.errors.length, 0)
  assert.match(r.outputFiles[0].text, /n = /)
})
