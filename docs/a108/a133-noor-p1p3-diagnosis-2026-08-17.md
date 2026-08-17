# A-133 — why Noor p1 and p3 still click, and what it costs to fix

**Headline: both failures are residual clicks the chain missed — not clicks inside the speech, and not voice-quality artefact. The chain has a real, precisely-located gap, and the same voice also produced a tail artefact on all five of its lines.**

Tom failed Noor (xai `247783ebdd51`, the known Dutch female clicker) on p1 and p3 of the 55-render phrase test, and passed her p2/p4/p5. Those are exactly the two clips where the chain removed nothing worth mentioning — p1 lost 67ms, p3 lost nothing at all — while p2/p4/p5 each lost 460-610ms. That coincidence is the whole story.

Read-only diagnosis: no render, no spend, no DB, no S3. It measures the files job #949 already wrote. Tool: `tools/a108/a133-noor-p1p3-diagnosis.cjs`. Raw numbers: `docs/a108/a133-noor-p1p3-diagnosis-2026-08-17.json`. The rule check below: `tools/a108/a133-trailing-artefact-rule-check.cjs`.

---

## What is actually in the two failing clips

Both clips finish the sentence and then emit isolated bursts out in the dead room tone, and the chain keeps them.

**p1 — *Ik wil graag een glas bitter, alstublieft.*** — one sustained speech event 110→2355ms, then:

| burst | energy above threshold | level | clear of the last real speech |
|---|---|---|---|
| 2646ms | **40ms** | -24.7dB | 291ms |
| 2801ms | **50ms** | -19.6dB | 446ms |

**p3 — *Kun je me vertellen waar het station is, alsjeblieft?*** — one sustained speech event 85→2480ms, then:

| burst | energy above threshold | level | clear of the last real speech |
|---|---|---|---|
| 2711ms | 35ms | -21.2dB — **45.1dB over its own local floor** | 231ms |
| 2892ms | **40ms** | -24.5dB | 412ms |

The 45.1dB burst in p3 is the loudest artefact anywhere in this batch. It is what Tom heard.

## These bursts contain no words — proved, not assumed

Cut each AFTER clip at the end of its real speech plus a short pad and read it with local whisper. If the trailing bursts carried any part of the sentence, the cut transcript would lose it. It does not:

| clip | cut at | transcript |
|---|---|---|
| Noor p1 full (3101ms) | — | *Ik wil graag een glas bitter, alstublieft.* |
| Noor p1 cut | **2605ms** | *Ik wil graag een glas bitter, alstublieft.* |
| Noor p3 full (3096ms) | — | *Kun je me vertellen waar het station is alsjeblieft?* |
| Noor p3 cut, click excluded | **2680ms** | *Kun je me vertellen waar het station is alsjeblieft?* |

The complete sentence, final word included, is over before the bursts start. They are post-speech artefacts.

## Why the chain — which is working — could not see them

The trim only ever looks **past** end-of-speech. It classifies an above-threshold event as SPEECH when it carries **≥40ms** of real energy (`EOS_MIN_SPEECH_MS`, `services/audio-processor.cjs:600`), IMPULSE when shorter. Two separate consequences, one per clip:

- **p1**: the two bursts carry 40ms and 50ms of real energy — **over** the 40ms line. The detector calls them speech, end-of-speech moves out to 2851ms, and the chain then protects them and pads a further 250ms past them. It removed 67ms of what was left.
- **p3**: the 2892ms burst is 40ms — on the line, called speech. That puts end-of-speech at 2937ms, which places the 45dB click at 2711ms **before** end-of-speech. A post-EOS scan cannot reach something that is not post-EOS. The guard reported no cut needed; the file already ended tight.

So the failure mode is one mechanism with two faces: **once a trailing artefact is long enough to be mistaken for speech, it is protected, and so is every artefact in front of it.**

## Why the other Dutch voices are unaffected

Every Dutch voice tested emits *something* after the sentence; the difference is length. Femke: nothing. Thijs: 5-10ms. Ruben: 5-35ms. All comfortably under the 40ms line, all correctly classified as impulses, all removed. **Noor's clicks carry 35-50ms of energy — she sits exactly on the boundary**, which is why the chain rescues her sometimes and the others always.

The four impulses the previous report left in place (25-45ms past end of speech, on the /p/ of *stop* and the /t/ of *stopped* and *alsjeblieft*) are a different thing entirely — those are release bursts, glued to the word, with essentially no clearance. Nothing here touches them.

## The other finding: Noor emits a tail artefact on 5 of 5 lines

| line | trailing artefacts in the raw | chain caught them? | Tom's ear |
|---|---|---|---|
| p1 | 2 (40ms, 50ms) | **no** — misread as speech | FAIL |
| p2 | 2 (20ms, 10ms) | yes, 569ms removed | pass |
| p3 | 2 (35ms, 40ms) | **no** — click sits before EOS | FAIL |
| p4 | 3 (10ms, 5ms, 20ms) | yes, 612ms removed | pass |
| p5 | 2 (30ms, 40ms) | yes, 456ms removed | pass |

This is not a voice that occasionally clicks. It is a voice that clicks on **every render**, and whose clicks happen to be long enough that the safety net misses two in five. Job #948 measured the same thing a different way: five of six repeat renders clicked.

---

## Verdict

**Hypothesis (a): a residual click the chain missed.** Not (b) — the bursts are cleanly separated from the speech by 231-446ms of room floor and carry no words. Not (c) — this is a discrete impulse in dead air, not a quality of the voice's speech.

The chain needs another iteration. **The voice also needs to go.** Those are not alternatives.

## Recommendation — two things, in this order

**1. Chain iteration: a trailing-artefact rule. Cheap, orthogonal, fixes the whole class.**

The current detector asks only "is this event long enough to be speech?". Add the question it is missing: "does anything real precede it?"

Take the **speech body** — the last event carrying ≥150ms of energy. If everything after it is short (<120ms each) *and* the first of them starts ≥200ms after the body ends, the whole trailing cluster is artefact, whatever the individual lengths. No single rendered line has a 200ms internal silence followed only by 35-50ms fragments. End-of-speech becomes the end of the body. One companion rule, which p3 needs: **never pad into a detected artefact** — `end = min(eos + 250ms, first artefact start − 10ms)`, because p3's 45dB click at 2711ms sits inside the 250ms pad from a corrected end-of-speech at 2480ms.

The cluster form matters, and I only know that because the first version I wrote failed. Testing each trailing event against its immediate predecessor leaves p1 untouched — its second burst is only 100ms clear of its first, so the two artefacts protect each other. Measuring the cluster against the speech body fixes it.

**Run over all 55 raw clips, the rule changes end-of-speech on exactly 2 — the two Tom failed:**

| clip | end-of-speech | file would end | dropped |
|---|---|---|---|
| Noor p1 | 2851 → **2355ms** | 2605ms | 2646ms/40ms/-24.7dB, 2801ms/50ms/-19.6dB |
| Noor p3 | 2932 → **2481ms** | 2701ms | 2892ms/40ms/-24.5dB (and the pad rule keeps the 2711ms click out) |

Zero change on the other 53, including every clip Tom passed. p1's proposed end is 2605ms — exactly the cut whisper already confirmed keeps the complete sentence. p3's is 2701ms, which keeps 21ms *more* audio than the verified-safe 2680ms cut while still stopping 10ms before the click onset at 2711ms. Femke's genuine 90ms sentence-final event has only 36ms of clearance and is untouched; the four protected plosive releases have 25-45ms of clearance, an order of magnitude under the rule.

**The residual risk, stated rather than smoothed over:** a line that genuinely ends in a short tag after a pause — *…, hè?*, *…, toch?* — has the same shape as an artefact cluster to this rule, and this batch contains no such line, so it is untested rather than proven safe. That is what the validation batch is for: the same 55 shapes plus a handful of deliberate short-tag endings, ASR-checked before and after. If a tag gets amputated there, the rule tightens before it goes anywhere near production.

Cost: no spend to write, one validation batch to prove (~$0.20), fully reversible. **I have not touched the chain — this is the report first, as instructed.** Say go and it lands with the same before/after listening page.

**2. Drop Noor from the Dutch cast.** She is one of four xAI Dutch voices, three of which Tom passed perfectly, and she carries only 330 clips in `nld_for_eng` — the smallest Dutch inventory bar Ruben's 46. A chain fix would make her *survivable*; it would not make her clean, because the artefact is in the provider's bytes on every single render, and a safety net is a bad reason to cast a defective voice. Replacing 330 clips is roughly a dollar of renders, make-before-break, on a course whose Dutch cast is being rebuilt anyway now Azure is out.

**Explicitly not recommended: a retry-on-click render policy.** It costs a second render on every clicking voice forever, adds a failure mode at render time, and buys nothing the trailing-artefact rule does not buy once — a worse deal on all three legs.

One knock-on worth naming, already flagged by #948 and confirmed here: the voice screen judges a candidate on a **single** render. Noor clicks on 5 of 5 lines but the chain hides 3 of them, so a one-render screen clears her comfortably. Any future screen should render a voice more than once and read the raw bytes, not the mastered ones.
