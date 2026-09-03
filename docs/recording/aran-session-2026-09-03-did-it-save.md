# Did Aran's takes save? — 2026-09-03 session

**Read-only investigation. Nothing was written, edited, deleted or re-linked.**

## The answer

**EVERYTHING SAVED. There is nothing for Aran to re-read.**

Every take that reached the server was mastered, filed to the database and written to
storage. Every clip row has a live audio object behind it. Nothing is stuck in a
half-saved state, and no clip row is pointing at an object that isn't there.

## The session, from the data

Established from the data, not from a clock. The only Aran recording burst on the
server today:

| | |
|---|---|
| First take accepted | 2026-09-03 **10:32:43 UTC** = 11:32 UK |
| Last take accepted | 2026-09-03 **11:27:51 UTC** = 12:27 UK |
| Takes accepted by the server | **195** |
| Distinct lines those cover | **118** (so 77 of the 195 were retakes of a line he read again) |
| Clip rows written | 118 |
| Clip rows with a live audio object in storage | **118 of 118** (HEAD-probed every one) |
| Clip rows with no retrievable object | **0** |
| Takes that arrived and were not filed | **0** |
| Device | Blue Snowball on ChromeOS/Chrome 151 — his booth machine |
| Recorded-by | aran@hey.com |

Per voice-id spelling (all three spellings resolve to the same man, and the live
queue endpoint confirms it — asking for `human_aran_cym_n_2` or `human_aran_cym_s`
returns the `human_aran_cym_n` queue):

| voice_id | clips today | clips all time | objects present |
|---|---|---|---|
| human_aran_cym_n | 118 | 225 | all |
| human_aran_cym_n_2 | 0 | 42 | all |
| human_Aran / Aran (2026-01 legacy) | 0 | 4 | all |
| **total** | **118** | **271** | **271 of 271** |

Roles today: 29 `target1` (pod lines), 89 `target2` (seed script lines).

## The clock

Aran's message is stamped 01:16 and the screenshot 01.19.23; that screenshot landed
on this machine at **22:19:57 UTC**, so the phone clock in that screenshot is running
**UTC+3** relative to the server. The server clock and the production database clock
agree with each other independently (both 22:24 UTC when checked), so the offset is
in the phone, not the server.

His own account fingerprints this session exactly: he says *"In about 200 phrases, it
hung maybe four or five times"* — the server accepted **195 takes** in this burst, and
the saved-clip timeline contains **five long stalls** (below). That is his session.

## The three layers, reconciled

1. **Storage** — 118 of 118 objects present, 6.9 MB total, none truncated or tiny.
   All 271 Aran clips ever recorded also still have live objects. Clean.
2. **Database** — 195 provenance rows, 118 surviving clip rows, every clip row joins
   to its provenance take. No orphan rows, no rows without provenance. Clean.
3. **The booth queue** — one disagreement found, and it costs him work rather than
   losing it (see below).

### The one disagreement: 6 lines saved but still listed as outstanding

Six seed lines were recorded today, are in the database, and have live audio — yet
the live queue endpoint still lists them as outstanding, so the booth will ask him to
read them again. **He should NOT re-read these; they are already saved:**

- `ti’n siarad hi`
- `dw i’n meddwl bo’ ti’n siarad Cymraeg yn dda iawn`
- `wnest ti ddechrau wythnos yn ôl`
- `fedri di ddeud o eto bach yn arafach?`
- `mae o`
- `y ffilm ’na`

All six are `cym_n_for_eng` seed lines at `role=target2`. Matched by the same
`normalizeForDb()` the storage identity uses, so this is not a normalisation artefact
of my own. Not urgent — nothing is lost — but it is a real bug in the queue's
recorded-lookup for seed `target2` lines.

Queue as it stands right now: **1157 lines total, 162 recorded, 995 remaining.**

## The hangs — measured, not inferred

Gaps between consecutive saved clips during the session (his reading pace ran about
28 s a line, so anything over ~45 s is a stall):

| Stall | Length | Server-side event at that moment |
|---|---|---|
| 10:35:03 | 192 s | — |
| 10:38:41 | 164 s | — |
| 10:42:35 | 174 s | — |
| 10:46:35 | 48 s | — |
| 10:49:05 | 55 s | — |
| 10:50:41 | 144 s | **production API restarted 10:50:46** |
| 10:53:59 | **697 s** (11.6 min) | — |

Five stalls of 2–12 minutes. That matches "four or five times" precisely.

**What I measured:**

- The production API was **restarted twice during his session** — 10:50:46 and
  11:20:27 UTC — by other work on this box. A restart kills the in-flight upload and
  refuses connections for a few seconds. The booth's upload queue is **sequential,
  one at a time**, with 3 retries at 1 s / 3 s / 8 s backoff, so a single failed take
  freezes everything queued behind it for at least 12 seconds, and longer if the
  retries also land during the restart. One stall (10:50:41, 144 s) sits exactly on a
  restart.
- The database was throwing **statement timeouts** through this period, including one
  on the booth's own endpoint: `[Recordist] queue: recorded lookup failed: canceling
  statement due to statement timeout`, plus a Cloudflare 525 to Supabase. That is the
  queue's "what's already done" lookup failing — which is exactly what would leave the
  booth's screen unable to resolve items and showing them as unfinished.
- **The Vercel edge 502 (`DNS_HOSTNAME_EMPTY`) did NOT reproduce tonight.** I ran 32
  requests through `https://popty.app/api/recording/*`: **32 of 32 returned 200**,
  zero 502s, zero `x-vercel-error` headers. Median 1.55 s edge vs 1.45 s hitting the
  Node service directly, so the edge is adding ~0.1–0.3 s and is healthy right now.
  Three requests did take 4.3 s, 9.5 s and 10.2 s — the tail is lumpy. I could not
  test it retrospectively for his window, so I cannot rule it out as a contributor;
  I can only say it is not failing now.

**What I did not measure:** how long each take took the server to master and
speech-gate. The box was, and is, running a 16,208-clip audio re-render, and every
take goes through ffmpeg mastering plus a Whisper speech check on that same CPU. That
is the most likely cause of the stalls that don't sit on a restart, but I am naming it
as the leading hypothesis, not a proven cause.

## Explicit gaps

1. **"Knocking on 250" vs 195 takes accepted.** The server has no record of an
   attempt that never arrived, so I cannot see the difference from here. The most
   likely explanation is that his count includes reads he discarded before saving —
   he mentions background noise and a dog, and 77 of the 195 takes were retakes of a
   line he'd already read, so plenty of re-reading was happening. **Nothing is
   missing from any line he completed.**
2. **A take still pending in the browser when the tab closed exists nowhere else.**
   The upload queue is entirely in-memory in the browser tab; there is no server-side
   record of a pending take. So I can prove what arrived, and I can prove all of it
   saved — I cannot enumerate anything that never left his laptop. There is no
   evidence any did: the last take arrived at 11:27:51 and the queue had drained.
3. **No recording activity at all on the server after 13:09 UTC today**, from anyone.
   If Aran believes he recorded a second, later session, none of it reached the
   server and it would need re-reading — but there is no evidence of one, and his own
   "about 200 phrases, four or five hangs" matches the morning burst exactly.
4. **Catrin**: no takes from her today at all (one text edit only). Not chased.

## Recommendations — none implemented

Ranked. Nothing here is urgent enough to stop Aran recording again.

1. **Stop restarting the production API while an artist is recording.** Two restarts
   landed inside his session. A one-line "someone is recording" flag that the deploy
   /restart path checks, or simply a rule that the booth is quiet hours, removes the
   single proven cause of a stall.
2. **Make the upload queue survive the tab.** Persist pending takes' bytes to
   IndexedDB and re-drain on reload. Today, a closed tab silently destroys anything
   still in flight and nobody — artist or server — can tell what was lost. This is
   the only path by which an artist can actually lose work.
3. **Make the queue concurrent, or at least don't let one failure block the line.**
   Sequential + 12 s of backoff means one bad take stalls everything behind it. Two
   or three in flight, and failures parked in a side list rather than at the head,
   turns a 12 s freeze into nothing visible.
4. **Give the booth heading a real end state.** "Saving…" that never resolves, when
   the takes are in fact saved, is what caused tonight's worry. Have the client
   re-check the server ("is this line recorded?") when an upload's response is lost,
   and show "all N saved, verified" against the server rather than against its own
   in-memory counter.
5. **Fix the seed `target2` recorded-lookup** so the six lines above stop being
   offered to him again.
6. **Throttle heavy background renders while a booth session is live.** Take mastering
   and the Whisper gate compete with the 16k re-render for the same cores.
7. Aran asked for a pause button that discards the current attempt and restarts on
   play, and for a waveform display. Both are his words, both are cheap, neither is
   mine to decide.
