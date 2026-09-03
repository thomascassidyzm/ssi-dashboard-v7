# Nothing recorded is lost — the durable take store

**2026-09-03. Landed on `main` (`790cd0010`), deployed and verified on popty.app.**

Tom's ruling, which is the whole job: *"work out an approach to make sure unequivocally
everything that is recorded is 100% uploaded. Always - we can NOT have things hanging and
never getting to popty."*

## What was broken

The upload queue was a plain JavaScript array inside the browser tab.

- Nothing outside the tab knew a take existed. A closed tab, a sleeping phone, an evicted
  page — the audio was simply gone, with no record on the server that it had ever been read.
- `MAX_RETRIES = 3`, backoff `[1s, 3s, 8s]`, and then `queue.shift()`. Twelve seconds of
  trying and the bytes were dropped on the floor.
- popty.app proxies `/api/recording/*` through Vercel and that edge route was measured
  answering 502 on roughly **4 of 11 attempts** on 2026-09-03 while the Node service behind
  it stayed healthy. A 502 is transient, so the queue retried it — three times — and then
  discarded the take.
- The screen said "Saving…" either way. Aran read ~250 Welsh lines that night and finished
  the session unable to tell whether his work had survived.

## What it does now

**1. Persist at capture, before any upload.** The moment a take exists as a Blob it is
written to IndexedDB (`src/services/takeStore.js`). This happens *before* the first
`fetch`, not after the first failure.

**2. The queue drains the shelf, not memory.** `useRecordistQueue.js` now holds no audio at
all. It walks the store and posts what is on it, so a closed tab loses a fetch, not a take.

**3. Retry for ever.** 1s, 3s, 8s, 20s, 60s, then every 60s with jitter, and the take stays
pending throughout. There is no give-up point for a transient failure. **The design survives
the edge route being broken outright** — which is the point, because fixing that route is a
different job and no amount of retrying was ever the fix Tom asked for.

**4. One exception, preserved exactly.** A deterministic 4xx is the server's verdict on
*those* bytes (a silent take, an unknown line), so it is not replayed. But it does not
vanish: the take stays on the device marked `refused`, with the server's own words on the
screen, and a deliberate way for the artist to discard it. Nothing is deleted without either
a confirmed store or an explicit, human-readable refusal.

**5. Bytes are deleted on exactly two paths** — a 2xx carrying an `audioId`, or a human
discarding a refused take. Never on a count, never on a timer.

**6. Resume on reopen.** `attach()` picks up anything on the shelf from this session or any
session before it, and the booth says out loud how much came from last time. Persisting
without a resume is just a different graveyard. The drain also wakes on the browser's
`online` event, on the tab returning to the foreground, and on a 30s heartbeat.

**7. Two tabs.** A localStorage claim, refreshed every 3s while working, stale after 8s. The
TTL is deliberately short because a tab *killed mid-upload* is the normal case here, and its
stale claim must not keep the reopened booth waiting.

**8. Degrades honestly.** IndexedDB is probed with a real write, not feature-detected
(`indexedDB` exists in Safari private mode and then throws on the first transaction). If it
is unusable, the booth falls back to the old in-memory behaviour **and says so** — capture is
never failed over storage.

## What the booth now says

Three states, three sets of words, never interchangeable:

| State | Words |
|---|---|
| device not persisting, work unsent | *"2 takes not saved on this device — this browser will not keep recordings, so keep this page open until they have all uploaded."* |
| unsent, but safe on the device | *"3 takes still to upload — saved on this device and uploading now. Nothing is lost if you close this page."* |
| everything confirmed on the server | nothing, because nothing is wrong |

The done card no longer says *"Keep this page open until everything has saved"* when that is
no longer true. `beforeunload` fires while recording, and for unsent work on a device that
will not persist it, and not otherwise — throwing a "Leave site?" dialog at the artist over
work that is already safe would be telling them their recordings are in danger when they
are not.

**Two wordings for Tom to overrule in one word if he wants them different:**
1. the leave-warning / done-card line — *"3 takes still to upload — they are saved on this
   device and will finish next time you open the booth"*;
2. the waiting banner — *"Saved on this device and uploading now. Nothing is lost if you
   close this page."*

## Proofs

Four, in a real headless Chromium against real IndexedDB, driving the real modules from the
dev server against a stub take endpoint. A throwaway voice id and a synthetic blob
throughout — **no real artist clip was touched, read or overwritten.**

| Proof | What was done | What was seen |
|---|---|---|
| **1 · tab killed mid-upload** | endpoint set to never answer, take recorded, upload confirmed in flight, **tab closed** | take was on the shelf before the first fetch; after reopening the booth on the same device it uploaded on its own — 40,610 bytes, `audioId aud-1` — and the shelf emptied only then |
| **2 · network dropped** | browser set offline, two takes recorded, 3s wait | server received 0; both takes sat on the shelf at 2 failed attempts each. Network restored → **both arrived**, shelf empty |
| **3 · endpoint forced to 502** | stub answering 502, take recorded | after **4 × 502 the take was still there** (the old queue discarded at 3 / ~12s). Endpoint recovered → take arrived, shelf empty |
| **4 · 4xx refusal** | stub answering 422 | take **kept** on the device, marked `refused`, and the artist shown the server's own words |

Plus **28 unit tests**, none of which existed before — there was no test for
`useRecordistQueue.js` at all. `src/services/takeStore.test.js` (14) and
`src/composables/useRecordistQueue.test.js` (14). Targeted run only; the repo's full vitest
baseline is not green on clean `main` and was deliberately not run.

**Deploy verified on the served chunk, not on a 200:**
`https://popty.app/assets/RecordistRoom-N8u6tFdh.js` contains
`durable-take-store-2026-09-03`. The live booth was opened read-only at a 390×844 phone
viewport: layout intact, zero horizontal overflow, no page errors, IndexedDB confirmed
working on the popty.app origin.

## What this does NOT cover

- **The capture path, trim and master chain are untouched** and were not exercised by these
  proofs. A take still sounds exactly as it did.
- **The Vercel edge fault is still there.** Loading the live booth read-only four times, two
  attempts made no `/api/recording/*` request at all within five seconds and two answered
  200. That is the measured `DNS_HOSTNAME_EMPTY` fault and it belongs to another job — this
  change is what makes it survivable rather than fatal.
- **Takes lost before tonight are not recovered by this.** They were never written down
  anywhere. Job #374 is counting that damage separately.
