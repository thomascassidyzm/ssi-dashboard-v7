// PLAY SERVER config ([play-scaffold]: lives only on play-* branches; command-surface job #347).
// The normal config, mounted under PLAY_BASE behind the command surface's :10000 door, with its
// /api proxy unchanged (the production API) — the door refuses every write before it gets here —
// and Supabase reached through the door's read-only ~supabase/ path (VITE_SUPABASE_URL, set by
// ops/play-copy.cjs serve). Never used by a production build.
import { mergeConfig } from 'vite'
import base from './vite.config.js'

const BASE = process.env.PLAY_BASE || '/play/'
const API_ORIGINS = (process.env.PLAY_API_ORIGINS || '').split(',').filter(Boolean)

// First thing in <head>: (1) <base href> so the router, which reads it, keeps every page under
// BASE; (2) calls the app aims at the production API's own address go to this origin instead,
// through the door, which lets reads through and refuses writes (its Content-Security-Policy
// refuses any call that still tries to leave). (3) No service worker.
const playHead = {
  name: 'play-head',
  apply: 'serve',
  transformIndexHtml: {
    order: 'pre',
    handler: () => [
      { tag: 'base', attrs: { href: BASE }, injectTo: 'head-prepend' },
      { tag: 'script', injectTo: 'head-prepend', children: `(function () {
  var O = ${JSON.stringify(API_ORIGINS)};
  function fix(u) { u = String(u); for (var i = 0; i < O.length; i++) if (u.indexOf(O[i] + '/') === 0) return u.slice(O[i].length); return u }
  var f = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === 'string' || input instanceof URL) input = fix(input);
    else if (input && input.url && fix(input.url) !== input.url) input = new Request(fix(input.url), input);
    return f.call(this, input, init)
  };
  var open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u) { arguments[1] = fix(u); return open.apply(this, arguments) };
  var sw = navigator.serviceWorker;
  if (sw) try { sw.register = function () { return Promise.reject(new Error('play copies never run a service worker')) } } catch (e) {}
})()` },
    ],
  },
}

export default mergeConfig(base, {
  plugins: [playHead],
  base: BASE,
  cacheDir: process.env.PLAY_CACHE_DIR || 'node_modules/.vite-play',
  server: {
    host: '127.0.0.1',
    port: Number(process.env.PLAY_PORT || 5280),
    strictPort: true,
    allowedHosts: true,
    fs: { strict: false }, // node_modules is a link to the shared install, outside this tree
  },
})
