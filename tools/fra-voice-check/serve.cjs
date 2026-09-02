#!/usr/bin/env node
/**
 * fra-voice-check — a tiny read-only static server for the four-voice French
 * listening page Kai sends to an outside reviewer.
 *
 * WHY A SERVER AT ALL: the page also lives under command-surface/public/evidence/,
 * but that host is TAILNET-ONLY — an outside reviewer gets a 403 there. The one
 * internet-reachable surface on watson-1 is the tailscale funnel on :8443, so a
 * page for someone outside the tailnet needs its own port and its own funnel path.
 * Same shape as tools/concat-listening-test/serve.cjs.
 *
 * Serves FRA_VOICE_CHECK_DATA_DIR (index.html + clips/*.mp3). Not PORT= : agent
 * shells on watson-1 carry a stray PORT=4317.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.FRA_VOICE_CHECK_PORT || 4792);
const ROOT = path.resolve(process.env.FRA_VOICE_CHECK_DATA_DIR
  || '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/fra-voice-check');
// The funnel mounts this at a sub-path and strips nothing, so requests arrive as
// /french-voice-check/... — tolerate the prefix with or without it.
const PREFIX = process.env.FRA_VOICE_CHECK_PREFIX || '/french-voice-check';
const TYPES = { '.html': 'text/html; charset=utf-8', '.mp3': 'audio/mpeg' };

http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === PREFIX) { res.writeHead(302, { Location: PREFIX + '/' }); return res.end(); }
  if (p.startsWith(PREFIX + '/')) p = p.slice(PREFIX.length);
  if (p === '/' || p === '') p = '/index.html';
  const file = path.join(ROOT, p);
  // Containment check: never serve outside ROOT whatever the path contains.
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end('forbidden'); }
  const ext = path.extname(file).toLowerCase();
  if (!TYPES[ext]) { res.writeHead(404); return res.end('not found'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
    // Range support: mobile Safari asks for byte ranges before it will play an mp3.
    const range = req.headers.range;
    const head = { 'Content-Type': TYPES[ext], 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=3600' };
    const m = range && /^bytes=(\d*)-(\d*)$/.exec(range);
    if (m) {
      const start = m[1] ? parseInt(m[1], 10) : 0;
      const end = m[2] ? parseInt(m[2], 10) : st.size - 1;
      if (start >= st.size || end >= st.size || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end();
      }
      res.writeHead(206, { ...head, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...head, 'Content-Length': st.size });
    fs.createReadStream(file).pipe(res);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`fra-voice-check on ${PORT}, root ${ROOT}, prefix ${PREFIX}`));
