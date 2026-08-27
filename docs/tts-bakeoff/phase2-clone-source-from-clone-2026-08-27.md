# Phase 2, unblocked on your side — and the three blockers that were never yours

**2026-08-27.** Your clone source now exists, in your own voice, at the exact length every vendor's documentation allows. Nothing was written to the database and no course audio was touched.

**But the parked tests do not run today, and your recording was never the only thing stopping them.** I checked each of the three candidate legs on this box rather than trusting the phase-1 write-up. All three are blocked by something clone audio cannot fix.

---

## 1. What now exists — your voice, generated

Generated through the existing production path with `gfzdpspr5fdp` ("Tom001", your clone, created 1 May 2026), then measured with `ffprobe`.

| File | Length | Fits |
|---|---|---|
| **`block4-extended-raw`** — the primary sample | **24.5 s** | OpenAI's *"30 seconds or less"* ✅, Chatterbox (no stated limit) ✅ |
| `block4-full-raw` — the pack's block 4 verbatim | 16.8 s | Also legal, but shorter than the pack intended |
| **`cartesia-cut-raw`** — first two sentences | **6.3 s** | Cartesia instant clone, *"a clip of up to 10 seconds"* ✅ |

All mono. Raw is 24 kHz; the mastered variants are 48 kHz.

**Why an extended sample.** Read by your clone, block 4 comes out at 16.8 s — the pack budgeted ~22 s for a human, and the clone reads faster. Since we are generating rather than recording, there is no reason to leave a third of OpenAI's ceiling unused, so the primary sample appends two sentences of Passage A from the pack's block 5. That lands at 24.5 s: the "about 25 seconds" the pack asked for, with 5.5 s of headroom under the hard cap. **Passage A is block-5 material and is not in the 396 benchmark utterances**, so the hold-out discipline is intact — we are still measuring cloning, not repetition.

**Raw and mastered, both provided, and my call: send raw.** The vendors ask for the audio at the volume and quality you want back — Cartesia: *"Use clean recordings of a single speaker at the volume, pacing, and audio quality you want"* — and `masterAudio` normalises and trims for the course player, not for a cloning input. Mastered versions are there so you can hear the difference. WAV transcodes are included because Cartesia's documented format list excludes `.m4a` but takes `.wav` everywhere.

**One thing I did not generate: the OpenAI consent clip (block 2).** xAI's Enterprise agreement bars a customer from acting to *"misrepresent that any Output was human-generated"*, and that clip is a first-person statement that a human owns the voice and consents. **Record that one sentence yourself.** It is a single scripted line — a far lower noise bar than the 25-second expressive passage that actually blocked you, and it is the honest artefact anyway.

### Listen

Primary sample, 24.5 s — the one that goes to OpenAI and Chatterbox:

https://watson-1.tail4968cb.ts.net/evidence/tom-clone-source-2026-08-27/clips/block4-extended-raw.mp3

Cartesia's 6.3 s instant-clone cut:

https://watson-1.tail4968cb.ts.net/evidence/tom-clone-source-2026-08-27/clips/cartesia-cut-raw.mp3

The pack's block 4 verbatim, 16.8 s:

https://watson-1.tail4968cb.ts.net/evidence/tom-clone-source-2026-08-27/clips/block4-full-raw.mp3

Same block 4 after the course post-chain, for comparison:

https://watson-1.tail4968cb.ts.net/evidence/tom-clone-source-2026-08-27/clips/block4-full-mastered.mp3

**The question only your ear answers:** is this good enough to be a cloning source? A clone of a clone starts one generation down, and if the primary sample already sounds thin to you, the phase-2 result will not be about the vendors.

---

## 2. The three legs, each checked on this box today

| Candidate | Blocker | How I verified it |
|---|---|---|
| **Cartesia** | **No `CARTESIA_API_KEY`** anywhere — not in the repo `.env`, not in the environment, not in any sibling `.env`. | grep across all three |
| **OpenAI** | **No `OPENAI_API_KEY`**, *and* custom voices are sales-gated: *"Custom voices are limited to eligible customers. Contact our sales team."* Nobody has opened that conversation. | grep; vendor quote from phase-1 sourcing |
| **Chatterbox** | **Unrunnable on watson-1.** No GPU (`nvidia-smi` absent). The only Python is 3.14.4 with **no `pip` and no `ensurepip`**, and there is no `pipx`, `uv`, `conda` or `micromamba` on the box, so `torch` and `chatterbox-tts` cannot be installed at all. | `python3 -m pip` → "No module named pip"; `import ensurepip` → ModuleNotFoundError; `import torch` → ModuleNotFoundError; no installer on PATH |

**So the clone source clears one blocker of four, and it is the one that had a person waiting on it.** Two API keys and one GPU box are what stand between here and a phase-2 result. That is a much better place to be than "Tom needs a quiet room", because none of the remaining three needs anything from you except a decision.

**Honest gap:** because no leg can run, there are **no phase-2 clone-fidelity results in this report**. I am not going to dress a generated source file up as a test outcome. What ran today is the source generation and the blocker verification; the scoring pass is still parked, and now parked on credentials rather than on you.

---

## 3. Where your voice ID lives — one line, as asked

`courses.voice_config` in Supabase: `voices.<role> = { "provider": "xai", "voiceId": "gfzdpspr5fdp", "language": "en" }`. It passes untouched through `buildTTSConfig` (`services/voice-config-service.cjs:466`) into the `voice_id` field of the `/v1/tts` body (`services/tts-service.cjs:407`). Nothing whitelists voice IDs. Detail, if ever needed: `docs/tts-bakeoff/xai-terms-and-voice-seam-2026-08-27.md`.

---

## 4. The terms, in one paragraph, because they bear on what happens next

xAI's Enterprise agreement: *"Customer will not… use any Output to train any foundation models, large language models, or other artificial intelligence systems except as may be expressly permitted in an Order Form."* No competing-products qualifier — a flat bar. The AUP adds the competition-flavoured version and binds under either agreement. Both read against feeding these files to Cartesia or OpenAI. Commercial use of the audio itself is clean: Enterprise assigns you the Output outright. Full quotes, sources, dates and both readings of the ambiguous clauses: the companion terms doc.

Noted once and not relitigated: the phase-1 report's opening line is that SSi is leaving xAI voices on Aran's ethical ruling, and this route uses xAI to make the source for its own replacements. Your call whether he is in the conversation first.
