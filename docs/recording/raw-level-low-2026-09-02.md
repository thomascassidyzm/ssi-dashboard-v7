# It was not the desktop. It was a remembered tickbox.

*2026-09-02. Tom, after recording through https://popty.app/r/human_tom_zzz: "the RAW sound level is super super low. it it because I was recording on my desktop? maybe I'll have another go from my phone".*

## The answer that matters first: Catrin's recordings are fine

**No, Catrin's real Welsh takes are not quiet.** All 61 of them, measured off S3 tonight:

| | raw true peak | mastered, integrated | mastered noise floor |
|---|---|---|---|
| **Catrin, 61 takes, 2026-08-23** | **−4.5 dBFS** | **−16.6 LUFS** | −71.0 dBFS |
| Aran, 36 takes, same session | −5.4 dBFS | −16.3 LUFS | −62.9 dBFS |

Target is −16 LUFS. She lands on it. Her worst take needed 9.5 dB of lift and her best needed none, which is exactly the working range the mastering chain is built for, and her noise floor at −71 dBFS is the quietest in the whole sample — the census that called it "the quietest on the estate" was right. **Nothing of hers needs re-doing and nothing needs rescuing.**

Every one of her takes carries `capture:voice` in its provenance, i.e. she recorded the day after the voice profile became the default and got it. The count, for the record: the database has **61** takes filed under `human_catrinlliar_cym_n` from that session, not 38 and not 56.

While in there I also sampled 24 script-mode takes from Sasha and Kai over 19–23 August, because that is the *other* capture surface and it is where the estate's German and Finnish content is coming from. Those are healthy too: −5 to −8 dBFS raw peak, mastering out at −17 LUFS.

**So no real recorded content on this estate is quiet. The problem is confined to Tom's own two test sessions.**

## What Tom's clips measure

| session | profile | raw peak | lift needed | mastered |
|---|---|---|---|---|
| 2026-09-02, MacBook Air, Chrome, 7 takes | `capture:dry` | **−18.9 dBFS** | +19.5 dB | −16.6 LUFS, floor **−34.9 dBFS** |
| 2026-09-02, iPhone, Safari, 9 takes, four minutes later | `capture:voice` | **−2.5 dBFS** | +4.8 dB | −16.3 LUFS, floor −62.7 dBFS |
| 2026-08-22, iPhone, 6 takes (the old default) | dry, untagged | −28.5 dBFS | +31.1 dB | −26.2 LUFS, floor −54.6 dBFS |

The August row reproduces the August measurement to the decimal, which is a useful check that tonight's instrument agrees with that one.

## The cause

**The desktop was on the raw-microphone profile and the phone was not, because that toggle was remembered in `localStorage` and his desktop browser was still carrying it.**

`RecordistRoom.vue` read `localStorage.getItem('recordist.captureProfile')` and honoured whatever it found, unvalidated, unversioned, with no expiry and nothing on screen at the start of a session to say which profile the room had opened on. Once a browser has the key it keeps it. His phone had never been given the key, so it fell through to the default — `voice` — and was 16 dB louder.

**So Tom's hypothesis is refuted, and the way it is refuted matters.** The phone *was* louder, and it was not because it is a phone. Same person, same room, four minutes apart, two browsers, and the only variable that moved was a stored string. Had he opened the booth on a *fresh* desktop browser it would have been just as loud as the phone; had the phone been carrying the key it would have been far worse than the desktop, because on iOS the dry profile is the RemoteIO tap with no gain at all — that is the −28.5 dBFS row above.

Two smaller things fall out of the same measurements:

- **He was hearing the raw, and the raw was genuinely low — but tonight's mastered clips did reach target.** The dry desktop takes master out at −16.6 LUFS, not ten decibels short the way August's did; the measure-then-gain chain in `audio-processor.cjs` does deliver +19.5 dB where a single `loudnorm` pass could not deliver +30. What the +19.5 dB lift *does* cost is the noise floor: **−34.9 dBFS on the mastered dry clips against −62.7 on the voice ones from the same evening.** That is 28 dB of audible hiss, and it is why this is a real defect and not merely a low meter reading.
- **The two loud untagged MacBook takes at 17:52 are from a cached pre-22-August bundle**, before the profile tag existed. They are not evidence about profiles and are not counted as such.

## What changed

One file of behaviour, `src/views/RecordistRoom.vue`:

- **The raw-microphone toggle is no longer remembered.** The room always opens on the voice profile. The toggle is a per-session diagnostic — one tick away whenever it is wanted, gone next time the room opens.
- **A legacy stored key is cleared on sight**, so the browsers already carrying one — Tom's desktop, and possibly Aran's rig — are unstuck by the next page load rather than by anyone remembering to go and untick it.
- **While the raw tap is armed, the room says so in words**, in an amber panel under the toggle. It was possible to be on it and not know.

Nothing was added to the post-processing chain. No new ffmpeg stage, no gain node, no normalisation step, nothing near `ANTI_CLICK_FADE`. The fix is at capture time and costs one constraint object.

Why not simply delete the dry profile? Because it is the measuring instrument — `/admin/capture-ab` and the raw-vs-processed row both depend on being able to ask for the bare tap — and because a toggle the room offers that silently does nothing is worse than no toggle. Session-only is the version that is better (nobody can be pinned), simpler (one line fewer than the version that persists) and cheaper (no migration, no key versioning to maintain).

Two comments were corrected, no behaviour attached:

- `useTapRecorder.js`'s peak-bar block reasoned from "autoGainControl is off", which stopped being true on 22 August. **The detector itself is not broken** — its floor is measured against the room's own noise rather than chosen as an absolute, which is precisely what makes it hold across profiles. Only the sentence was stale, and the thresholds did not need retuning.
- `useContinuousRecorder.ts` says its all-false request is "the same request the pod recorder makes". It has not been since 22 August. Left dry on purpose — its VAD is demonstrably broken by the noise suppressor, and the 24 field takes measured above say it is healthy — but the comment now names the divergence and the condition under which it would stop being safe.

## Salvage: nothing of Catrin's needs rescuing, because nothing of hers is quiet

Tom's question was whether her clips are *quiet but clean* — a missing-gain problem normalisation can lift safely — or *quiet and noisy*, where the lift drags hiss up with the voice and re-recording is the honest answer. Neither. They are **loud and clean**, so the salvage question does not arise. Per clip, all 61:

| | min | median | max |
|---|---|---|---|
| raw true peak | −9.8 dBFS | **−4.4 dBFS** | 0.0 dBFS |
| raw noise floor | −89.6 dBFS | −79.4 dBFS | −46.4 dBFS |
| raw signal-to-noise | 46.4 dB | **75.3 dB** | 85.2 dB |
| mastered, integrated | −20.1 LUFS | **−16.3 LUFS** | −14.7 LUFS |
| mastered noise floor | −84.1 dBFS | −71.8 dBFS | −33.9 dBFS |

**Not one of her 61 takes is below −12 dBFS raw peak**, and her quietest is −9.8. For comparison the dry desktop takes tonight sat at −18.9 and the dry iPhone takes in August at −28.5. Her median SNR of 75 dB is what Tom expected from a Blue Snowball and is what she got — the Snowball's modest output level did not compound with anything, because there was nothing to compound with. Only two takes fall under 50 dB SNR and both are superseded, i.e. she retook them herself on the night.

**And she was never carrying the stale key.** All 61 of her provenance rows read `capture:voice`. Aran's rig had the correct profile on 23 August and still does, which is the one thing that could have made this an evening's lost work and did not.

**Verdict: yes, they are keepable as they stand — no normalisation pass, no re-record, no action at all.**

One small thing worth a follow-up, unrelated to capture: **five of her takes master out 3–4 LUFS under target** (−18.8 to −20.1 LUFS) from raw peaks of −4 to 0 dBFS, so the shortfall is on the mastering side, not the microphone. The raw is retained for all of them, so they can be re-mastered make-before-break whenever someone is in that code — it is a polish item, not a defect a learner would notice against neighbours at −16.3.

## Salvage, everything else

Nothing learner-facing needs it. Catrin's and Aran's Welsh takes are at target. The only quiet clips in existence are 13 of Tom's own in `zzz_test2_for_eng` and `zzz_test_for_eng`: the 7 from tonight are already at −16.6 LUFS and only carry a raised floor, and the 6 from August sit at −26.2 LUFS and would need another +10 dB, which would put their floor around −45 dBFS and be audible. Both sets are test fixtures. **Re-record them; do not re-master anything.**

## What is not verified

I cannot sit in front of a microphone. The change is verified by build, by three new tests in `RecordistRoom.captureprofile.test.js` (opens on voice with nothing stored; a stored `dry` is neither honoured nor kept; the key is never written back), and by the existing four recorder suites still green — 30 tests, all passing. **What remains open is one real capture**: Tom opening the booth link on the desktop after deploy and reading one line. If the constraint fix has landed, that take's provenance will say `capture:voice` and its raw peak should come in near the phone's −2.5 dBFS rather than −18.9. One tap closes it.
