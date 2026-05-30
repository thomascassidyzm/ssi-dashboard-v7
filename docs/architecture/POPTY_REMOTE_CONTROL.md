# Popty — Remote-Control & Course-Production Architecture

A working system that lets the user operate their Mac (running Claude Code on a
Pro Max subscription) from their phone. The phone talks to the Mac over an ngrok
tunnel; an HTTP endpoint uses macOS AppleScript (`osascript`) to open an iTerm2
window and run the `claude` CLI. A set of pm2-managed Node services do the SSi
course-production work and stream live progress back to the phone over a
WebSocket.

Three layers: **a tunnel**, **an AppleScript launcher**, and **a local service mesh**.

---

## Principle 1 — The phone reaches the Mac through one ngrok tunnel

- Frontend is a Vue + Pinia app at **popty.app**. It resolves the backend URL in
  priority order (`src/services/api.js`, `src/stores/production.js`):
  1. `localStorage['api_base_url']` set via the in-app Environment Switcher
  2. relative URLs when the hostname contains `ngrok` (the tunnel *is* the backend)
  3. localhost for dev
- Every API request carries the header `ngrok-skip-browser-warning: true` so the
  ngrok interstitial never breaks calls.
- A **reserved ngrok domain** gives a stable phone bookmark. The tunnel lands on
  the Mac's single entry point: **Production API on port 3470**.

---

## Principle 2 — An HTTP endpoint drives the GUI via AppleScript (the core trick)

There is no SSH daemon. A request triggers `osascript` to physically open a
terminal and type a command into it.

Example — `POST /api/production/:courseCode/gender-prep/start` in
`services/production-api.cjs`:

1. Writes a `build_jobs` row to Supabase (so the job survives even if the phone
   disconnects).
2. Builds a shell command, e.g.
   `node gender-prep-coordinator.cjs spa_for_eng --concurrency 5 --batch-size 200 --job-id <id>`.
3. Runs `osascript -e '<AppleScript>'` to open an iTerm2 window and type the
   command into it (falling back to Terminal.app if iTerm2 isn't there):

```js
const cmd = `cd "${projectDir}" && node "${coordinatorPath}" ${courseCode} --concurrency 5 --batch-size 200 --job-id ${jobId}`
const escapedCmd = cmd.replace(/"/g, '\\"')

const itermScript = `tell application "iTerm"
  activate
  set newWindow to (create window with default profile)
  tell current session of newWindow
    set name to "Gender Prep: ${courseCode}"
    write text "${escapedCmd}"
  end tell
end tell`

const agent = spawnProc('osascript', ['-e', itermScript], { stdio: 'pipe', detached: true })
agent.unref()
agent.on('error', () => spawnInTerminalApp())   // Terminal.app fallback
```

Reusable spawn libraries (same pattern):

- `services/shared/spawn-agent-cli.cjs` — opens iTerm2 running the `claude` CLI;
  falls back to Terminal.app; batches 5 windows at a time.
- `services/shared/spawn-agent-terminal.cjs` — Terminal.app twin (also lets a
  second Pro Max account run in a different terminal app).
- `services/course-builder/lib/agent-spawner.cjs` — unified spawner with three
  modes: `iTerm2`, `Terminal`, `headless` (`SPAWN_MODE=headless` = background
  process, no GUI/AppleScript).

---

## Principle 3 — All LLM work runs on the subscription via the `claude` CLI

Because work is launched as the real `claude` CLI in a real terminal, it bills
against the Pro Max subscription, never the metered API. Hard rule: never use
`@anthropic-ai/sdk` directly — all LLM calls go through `claude --print`. Worker
processes (e.g. `gender-prep-coordinator.cjs`) fan out to many
`claude --print --model haiku` child processes.

A spawned-agent invocation looks like:

```
claude --model sonnet --dangerously-skip-permissions "$(cat /tmp/prompt.md)"
```

---

## Principle 4 — The phone can fully control the Mac, not just start jobs

Admin endpoints in `services/production-api.cjs`, all osascript/shell-driven:

- `GET  /api/admin/agents` — list open iTerm sessions
- `POST /api/admin/agents/kill-all` — pkill claude + close iTerm
- `POST /api/admin/restart-machine` — reboot via System Events
- `GET  /api/admin/pm2`, `GET /api/admin/system` — process list, RAM/CPU/uptime

---

## Principle 5 — A small service mesh, kept alive by pm2, behind one front door

Started by `npm run automation` (`start-automation.cjs`). Port 3470 is the single
entry point and proxies to the rest by path prefix.

| Port | Service        | File                                          | Role |
|------|----------------|-----------------------------------------------|------|
| 3470 | Production API | `services/production-api.cjs`                 | Main entry point: auth, course list, QA, WebSocket, spawn + admin endpoints, proxies to all others |
| 3471 | Course Builder | `services/course-builder-api.cjs`             | Content creation: `POST /api/seed/complete`, decomposition, checkpoints |
| 3465 | Phase 8 Audio  | `services/phases/phase8-audio-v13.cjs`        | TTS (Azure + ElevenLabs) → S3 + Supabase |
| 3466 | Phase 9 Manifest | `services/phases/phase9-manifest-compiler.cjs` | Compiles `course_manifest.json` from Supabase |

Service discovery: `start-automation.cjs` injects env vars into every child
(`PRODUCTION_API_URL`, `COURSE_BUILDER_URL`, `PHASE8_URL`, `PHASE9_URL`) with
localhost defaults, overridable for ngrok. Production API proxies by prefix:

```js
const COURSE_BUILDER_URL = process.env.COURSE_BUILDER_URL || 'http://localhost:3471'

async function proxyCourseBuilder(req, res) {
  const targetUrl = `${COURSE_BUILDER_URL}${req.originalUrl}`
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
    body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
  })
  res.status(response.status).json(await response.json())
}

app.all('/api/build/*', proxyCourseBuilder)   // also /api/golden/*, /api/qa/*, /api/phrases/*, ...
```

Audio routes proxy to Phase 8 on `http://localhost:3465`.

---

## Principle 6 — Live progress flows back over a WebSocket

Socket.IO at `/api/production/websocket` with per-course rooms
(e.g. `course:spa_for_eng`). The phase services don't hold the socket — they
`POST /api/production/internal/emit`, and Production API rebroadcasts to the room.

```js
const io = new Server(httpServer, { path: '/api/production/websocket', cors: { origin: '*' } })

io.on('connection', (socket) => {
  socket.on('join_course',  ({ courseCode }) => socket.join(`course:${courseCode}`))
  socket.on('leave_course', ({ courseCode }) => socket.leave(`course:${courseCode}`))
})

function emitToRoom(courseCode, event, data) {
  io.to(`course:${courseCode}`).emit(event, data)
}

// Phase 8/9 call this so they don't need to hold the socket themselves:
app.post('/api/production/internal/emit', (req, res) => {
  const { courseCode, event, data } = req.body
  emitToRoom(courseCode, event, { courseCode, ...data })
  res.json({ success: true })
})
```

Typical events: `legacyAudio:progress`, `sample_updated`, `audio_flagged`,
`course:statusChanged`.

---

## Principle 7 — Supabase + S3 are the source of truth; the phone never touches them directly

- **Supabase**: seeds, LEGOs, practice phrases, `course_audio`, QA flags, `build_jobs`.
- **S3 bucket `ssi-audio-stage`** (eu-west-1): audio stored flat as `{uuid}.mp3`.
- All traffic goes through port 3470; the frontend talks only to that API.

---

## End-to-end example

```
📱 popty.app — tap "Start"
      │  HTTPS  https://<ngrok-domain>/api/production/spa_for_eng/gender-prep/start
      │         (header: ngrok-skip-browser-warning)
      ▼  ngrok tunnel → Mac
🖥️ Production API :3470
      ├─ write build_jobs row → Supabase
      └─ osascript → iTerm2 opens, types:
             node gender-prep-coordinator.cjs spa_for_eng --concurrency 5 …
                  │
                  ├─ spawns N× `claude --print --model haiku`   (subscription-billed)
                  ├─ writes results → Supabase
                  └─ POST /api/production/internal/emit → WebSocket
      ◄────────────── live progress ──────────────┘
📱 progress bar updates on the phone
```
