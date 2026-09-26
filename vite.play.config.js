// PLAY SERVER config ([play-scaffold]: lives only on play-* branches; command-surface job #347).
// The normal config, mounted under PLAY_BASE behind the command surface's :10000 door, with its
// /api proxy unchanged (the production API) — the door refuses every write before it gets here —
// and Supabase reached through the door's read-only ~supabase/ path (VITE_SUPABASE_URL, set by
// ops/play-copy.cjs serve). Never used by a production build.
import { mergeConfig } from 'vite'
import base from './vite.config.js'

export default mergeConfig(base, {
  base: process.env.PLAY_BASE || '/play/',
  cacheDir: process.env.PLAY_CACHE_DIR || 'node_modules/.vite-play',
  server: {
    host: '127.0.0.1',
    port: Number(process.env.PLAY_PORT || 5280),
    strictPort: true,
    allowedHosts: true,
    fs: { strict: false }, // node_modules is a link to the shared install, outside this tree
  },
})
