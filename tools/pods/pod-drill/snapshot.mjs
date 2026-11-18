/**
 * POD SNAPSHOT — the pod as the PLAYER loads it, the input every Pod Drill stage run starts from
 * (moved to Popty from ssi-learning-app tools/pod-chunk-sizes.mjs in job #699, Tom 2026-11-03: "we need
 * everything that touches course content to be a popty tool"). The code is unchanged: it still bundles
 * the player's OWN loader (useListeningPods, listeningMetaCache) from a learning-app checkout
 * (tools/lib/learning-app.mjs: SSI_APP, default ~/ssi-learning-app), so the snapshot is what the player
 * sees and cannot drift from a Popty re-implementation of it. For the Drill:
 *   node tools/pods/pod-drill/snapshot.mjs --course=deu_for_eng --json=ops/pod-drill-cuts/deu_for_eng.dump.json --known-timings
 *
 * POD DRILL CHUNK SIZE (job #657, Tom 2026-10-29: "the number of syllables is too
 * high per drill chunk"). Read-only: loads a course's pod through the REAL loader
 * (useListeningPods) and lists, per playable card, the chunks the Drill ladder plays
 * at rung 0 (the authored fine units) with syllables from the repo's own counter.
 * A card with no fine map is ONE chunk, the whole sentence. Every write is blocked
 * at the fetch layer.
 *   node tools/pods/pod-drill/snapshot.mjs --course=ita_for_eng [--pod=pod-1] [--json=out.json] [--slice-on]
 *   node tools/pods/pod-drill/snapshot.mjs --all [--pod=pod-1]     (one summary line per course)
 *   --known-timings  also read each card's ENGLISH clip word timings (the same audio-row read the
 *                app makes for split clips, same columns, same reader) into knownWordTimings:
 *                the render's own Cartesia times (job #381, r-2026-11-03: no transcription)
 *   --slice-on   COUNTERFACTUAL: fusionDrill with its slice kill switch on, so cards
 *                with a fine map report their chunks as sliceable
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { APP } from '../../lib/learning-app.mjs'

// REPO_ROOT is the LEARNING-APP checkout (it was this file's own repo before the move): the loader, esbuild,
// vue, supabase-js and the .env files all resolve from it exactly as they did there.
const REPO_ROOT = APP
const require = createRequire(path.join(REPO_ROOT, 'tools', 'pod-chunk-sizes.mjs'))
const { createClient } = require('@supabase/supabase-js')
const PLAYER_VUE = path.join(REPO_ROOT, 'packages', 'player-vue')
const CORE_SRC = path.join(REPO_ROOT, 'packages', 'core', 'src')

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, '').split('=')
  return [k, v.length ? v.join('=') : true]
}))
if (!args.course && !args.all) {
  console.error('usage: --course=<code> [--pod=pod-1] [--json=out.json] [--slice-on] | --all')
  process.exit(2)
}

function loadEnv() {
  const out = {}
  for (const f of [path.join(REPO_ROOT, '.env'), path.join(REPO_ROOT, '.env.local'), path.join(PLAYER_VUE, '.env.local'),
    '/home/tomcassidy/ssi-learning-app/.env']) {
    if (!existsSync(f)) continue
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
      if (m && out[m[1]] === undefined) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    }
  }
  return {
    url: process.env.SUPABASE_URL || out.SUPABASE_URL || out.VITE_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || out.SUPABASE_SERVICE_ROLE_KEY,
  }
}

const blockedWrites = []
const readOnlyFetch = async (input, init = {}) => {
  const method = (init.method || 'GET').toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') {
    blockedWrites.push(`${method} ${String(input).slice(0, 80)}`)
    return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  return fetch(input, init)
}

function findEsbuild() {
  try { return require(require.resolve('esbuild', { paths: [REPO_ROOT] })) } catch {
    const pnpmDir = path.join(REPO_ROOT, 'node_modules', '.pnpm')
    const hit = readdirSync(pnpmDir).filter((d) => d.startsWith('esbuild@')).sort().pop()
    return require(path.join(pnpmDir, hit, 'node_modules', 'esbuild'))
  }
}
function findVue() {
  try { return require.resolve('vue', { paths: [PLAYER_VUE, REPO_ROOT] }) } catch { /* fall through */ }
  const pnpmDir = path.join(REPO_ROOT, 'node_modules', '.pnpm')
  const hit = readdirSync(pnpmDir).filter((d) => d.startsWith('vue@')).sort().pop()
  return path.join(pnpmDir, hit, 'node_modules', 'vue', 'index.mjs')
}

async function bundle() {
  const esbuild = findEsbuild()
  const scratch = process.env.CS_SCRATCH || path.join(REPO_ROOT, 'node_modules', '.cache')
  const genDir = path.join(scratch, 'pod-drill-sequence')
  mkdirSync(genDir, { recursive: true })
  const entry = path.join(genDir, 'entry.ts')
  const out = path.join(genDir, 'bundle.mjs')
  const src = (p) => path.join(PLAYER_VUE, 'src', p).replace(/\\/g, '/')
  writeFileSync(entry, [
    `export { useListeningPods } from '${src('composables/useListeningPods.ts')}'`,
    `export { countSyllables, syllableLangOf } from '${CORE_SRC.replace(/\\/g, '/')}/text/index.ts'`,
    `export * from '${CORE_SRC.replace(/\\/g, '/')}/pods/index.ts'`,
    `export { createApp, ref } from 'vue'`,
    `export { POD_CLIP_COLUMNS, readClipTimings } from '${src('composables/listeningMetaCache.ts')}'`,
    '',
  ].join('\n'))
  const vuePath = findVue()
  const aliasPlugin = {
    name: 'ssi-alias',
    setup(build) {
      build.onResolve({ filter: /^@ssi\/core(\/.*)?$/ }, (a) => {
        const sub = a.path.replace(/^@ssi\/core\/?/, '')
        const candidates = sub
          ? [path.join(CORE_SRC, sub, 'index.ts'), path.join(CORE_SRC, `${sub}.ts`)]
          : [path.join(CORE_SRC, 'index.ts')]
        return { path: candidates.find(existsSync) }
      })
      build.onResolve({ filter: /^@\// }, (a) => {
        const base = path.join(PLAYER_VUE, 'src', a.path.slice(2))
        return { path: [`${base}.ts`, path.join(base, 'index.ts'), base].find(existsSync) }
      })
      build.onResolve({ filter: /^vue$/ }, () => ({ path: vuePath }))
      if (args['slice-on']) {
        build.onLoad({ filter: /fusionDrill\.ts$/ }, (a) => ({
          contents: readFileSync(a.path, 'utf8').replace('DRILL_SLICE_PLAYBACK_ENABLED = false', 'DRILL_SLICE_PLAYBACK_ENABLED = true'),
          loader: 'ts',
        }))
      }
      // useI18n's English comes from Vite-only virtual modules (scripts/engLocaleSplit.mjs, job #850);
      // a data dump needs no interface strings, so they bundle as empty message tables (#381).
      build.onResolve({ filter: /^virtual:eng-(boot|deferred)$/ }, (a) => ({ path: a.path, namespace: 'eng-stub' }))
      build.onLoad({ filter: /.*/, namespace: 'eng-stub' }, () => ({ contents: 'export default {}', loader: 'js' }))
      build.onResolve({ filter: /^idb$/ }, () => ({ path: 'idb', namespace: 'stub' }))
      build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
        contents: 'const no = async () => { throw new Error("no IndexedDB in node") }; export const openDB = no; export const deleteDB = no;',
        loader: 'js',
      }))
    },
  }
  await esbuild.build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', target: 'node22',
    outfile: out, logLevel: 'error', plugins: [aliasPlugin], external: ['@supabase/supabase-js'],
    define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.MODE': '"production"' },
  })
  return import(`file://${out}?t=${Date.now()}`)
}

import { cardChunks, chunkStats, syllablesFor, attachKnownTimings } from './podChunkSizes.mjs'

const env = loadEnv()
if (!env.url || !env.key) { console.error('missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const sb = createClient(env.url, env.key, { global: { fetch: readOnlyFetch }, auth: { persistSession: false } })
const M = await bundle()
const realLog = { log: console.log, debug: console.debug, warn: console.warn, error: console.error }
const hush = () => { console.log = () => {}; console.debug = () => {}; console.warn = () => {}; console.error = () => {} }
const unhush = () => Object.assign(console, realLog)

async function loadScenes(course) {
  const app = M.createApp({ render: () => null })
  app.provide('supabase', { value: sb })
  let api
  hush()
  app.runWithContext(() => { api = M.useListeningPods(M.ref(course)) })
  for (let i = 0; i < 600 && (api.isLoading.value || (!api.scenes.value.length && !api.error.value)); i++) await new Promise((r) => setTimeout(r, 100))
  unhush()
  if (api.error.value) throw new Error(api.error.value)
  return api.scenes.value
}


async function run(course) {
  const sl = M.syllableLangOf(course.split('_for_')[0])
  const syl = (t) => syllablesFor(sl, t, M.countSyllables)
  const scenes = await loadScenes(course)
  const cards = []
  for (const sc of scenes) {
    if (args.pod && !String(sc.podId).endsWith(`:${args.pod}`)) continue
    for (const t of sc.turns) for (const s of t.sentences) {
      const c = cardChunks(s, syl)
      if (c) cards.push({ id: s.id, pod: sc.podId, scene: sc.sceneNumber, target: s.targetText, known: s.knownText,
        targetAudioId: s.targetAudioId, knownAudioId: s.knownAudioId, wordTimings: s.wordTimings ?? null,
        clipTimings: Object.assign({}, ...(s.fusionGroups || []).map((g) => g.clipTimings || {})), ...c })
    }
  }
  if (!args['known-timings']) return { course, syllableLang: sl, cards }
  const ids = [...new Set(cards.map((c) => String(c.knownAudioId || '').split('.')[0]).filter(Boolean))]
  const clips = []
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await sb.from('course_audio').select(M.POD_CLIP_COLUMNS).in('id', ids.slice(i, i + 150))
    if (error) throw new Error(`known-clip timings: ${error.message}`)
    clips.push(...(data || []))
  }
  return { course, syllableLang: sl, cards: attachKnownTimings(cards, clips, M.readClipTimings) }
}
const summarise = (r) => ({ course: r.course, cards: r.cards.length, fusionCards: r.cards.filter((c) => c.kind === 'fusion').length,
  ...chunkStats(r.cards.flatMap((c) => c.chunks.map((k) => k.syl))) })

if (args.all) {
  const { data } = await sb.from('listening_pods').select('id').eq('pod_type', 'core')
  const courses = [...new Set((data || []).map((r) => String(r.id).split(':')[0]))].sort()
  for (const c of courses) {
    try { console.log(JSON.stringify(summarise(await run(c)))) } catch (e) { console.log(JSON.stringify({ course: c, error: String(e.message || e) })) }
  }
} else {
  const r = await run(args.course)
  if (args.json) writeFileSync(args.json, JSON.stringify(r, null, 1))
  console.log(JSON.stringify(summarise(r)))
}
console.error(`${blockedWrites.length} write(s) blocked — nothing was changed in the database.`)
process.exit(0)
