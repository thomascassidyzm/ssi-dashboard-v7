# A-133 — the trailing-artefact rule, implemented and validated

**Headline: the two clips Tom failed are fixed, on the bytes he heard and on fresh renders; 24 fresh tag lines in 8 languages lost no tag; and the diagnosis's "exactly 2" was wrong — it is 4.**

Listening page, every clip an inline player, verified playing in a real browser:
https://watson-1.tail4968cb.ts.net/evidence/a133-trailing-artefact-validation-2026-08-17/index.html

Branch `feat/a133-tail-pad-in-chain-2026-08-17`. **Not merged, not deployed.** No course_audio row, no pod, no S3 object, no DB write.

---

## What landed in the chain

`services/audio-processor.cjs`, inside the existing `trimToEndOfSpeech`:

- **The cluster rule.** Take the speech BODY — the last event carrying ≥ `EOS_BODY_MS` (150ms) of energy. If everything after it is ≤ `EOS_MAX_ARTEFACT_MS` (120ms) *and* the first of them starts ≥ `EOS_MIN_CLEAR_MS` (200ms) after the body ends, the whole trailing cluster is artefact — whatever the individual lengths say — and end-of-speech becomes the end of the body. `endOfSpeechWithArtefacts()`.
- **The pad rule.** Never pad into a detected artefact: the 250ms decay is clamped to `artefactStart − 10ms`. Noor p3 needs this on its own, because its 45dB click sits *inside* the pad measured from a corrected end-of-speech.
- **Guard 4 exemption, stated because it matters.** The pre-existing "planned cut would remove a speech event" guard now exempts events inside the ruled-on artefact cluster. Without that it would veto the whole iteration — dropping a 40ms burst the length rule miscalled "speech" *is* the fix. Everything in front of the cluster stays fully protected.
- **The clamp cannot amputate, by arithmetic:** the rule only fires at ≥200ms clearance, so retained decay is never below 200 − 10 = 190ms. Tightest observed across 55 clips: 206ms.

## (a) The 55-clip sweep — surgical, but 4 clips, not 2

`tools/a108/a133-artefact-rule-sweep.cjs` runs the **real exported chain function on both sides**: the pre-change `services/audio-processor.cjs` taken verbatim out of commit `2673e1c7` into a gitignored scratch copy, versus the working tree. Not a reimplementation of the old behaviour — the old behaviour.

| clip | end-of-speech | file ends | delta | dropped |
|---|---|---|---|---|
| nld-noor-p1 | 2851 → 2355ms | 3101 → 2605ms | −496ms | 40ms/−24.7dB, 50ms/−19.6dB (both called SPEECH by length) |
| nld-noor-p3 | 2932 → 2481ms | 3096 → 2701ms | −395ms | 35ms/−21.2dB, 40ms/−24.5dB |
| eng-olivia-p4 | unchanged | 3437 → 3393ms | −44ms | 5ms/−42.9dB, 10ms/−44.5dB |
| nld-thijs-p1 | unchanged | 2520 → 2506ms | −14ms | 10ms/−38.1dB |

**The correction.** The diagnosis's rule-check measured only whether *end-of-speech* moved, and on that measure it is exactly 2 — the two Tom failed. But the companion pad rule also clips two clips whose end-of-speech did not move at all, to stop 10ms short of 5-10ms impulses at −43dB that the old chain kept inside the file. Retained decay there is 206ms and 236ms; nothing is amputated. The other 51 clips are decision-for-decision identical and **no guard refusal changed anywhere**.

Raw: `docs/a108/a133-artefact-rule-sweep-2026-08-17.json`.

## (b) The tag case — the named-untested case, now tested

`tools/a108/a133-artefact-rule-render-batch.cjs`. 12 lines, 8 languages (nl *toch*/*hè*, en *right*, de *oder*/*ne*, fr *hein*, es *¿no?*, cy *yndê*, ja *ね*), each rendered twice: once with a comma before the tag, once with an ellipsis, which makes the provider leave a longer pause and deliberately pushes the case into the rule's firing zone.

**24 clips, no tag eaten.** The rule fired on 2 — both Noor, the clicker — and on both it kept the tag and removed the artefacts *behind* it. On `tag-nl-noor-toch-ellipsis` it told a real *toch?* (400ms of energy) from a 45ms click that arrived 121ms later.

One clip reads "tag not heard": Céleste's *hein*. Whisper does not transcribe it on the **untouched provider bytes** either, and the rule did not fire on that clip, so the chain made no artefact decision there — an instrument limit, not an amputation. Two earlier "losses" (Welsh *yndê*) were my own matcher failing to strip a circumflex; fixed, and the tool now folds diacritics before comparing, because a false amputation report is as bad as a missed one.

## (c) Noor p1/p3, fresh — 4 of 8 takes clicked, all 4 cleaned

Four independent renders each, because this voice's click is intermittent per render; a single clean take would prove nothing. The loudest artefact measured anywhere in A-133 is in `noor-p3-take4`: a single-window burst at 3000ms reading **−7.0dB**, 56dB over its own −63dB room floor, 300ms after speech reached the floor. Removed. Whisper reads the complete sentence, final word included, on every after-clip.

One take needs saying plainly. `noor-p1-take3`'s ASR read of the final word changed (*alstublieft* → "als toevallig") between before and after, which is exactly the shape of the 2026-08-05 German amputation — so I checked rather than assumed. The envelope settles it: speech decays to the −65dB room floor by 2400ms, sits at floor for 200ms, then two isolated spikes at 2625ms (−33dB) and 2725ms (−20dB). The cut is at 2616ms, **216ms past the point speech reached the floor**. No word-bearing audio was removed; whisper re-read an unchanged word once the trailing click stopped giving it a spurious cue.

Raw: `docs/a108/a133-artefact-rule-validation-2026-08-17.json`.

## The finding I did not have before this batch: the rule lives in a 96ms window

`EOS_MIN_CLEAR_MS` is pinned from both sides by real audio:

- **Cannot go above 231ms** — Noor p3's genuine click stands 231ms clear. Raise the threshold and the fix is lost.
- **Cannot go below 135ms** — Nia's Welsh *yndê* sits 135ms clear carrying only **80ms** of energy. Lower it and a real tag gets eaten.

200ms sits inside that window with 65ms below and 31ms above. It held on all 87 clips measured. But the honest reading is that **the 120ms length ceiling is not what protects a short tag — the clearance is**, because real artefacts in this corpus reach 70ms and the shortest real tag carries 80ms. The two do not separate on length alone.

## Recommendation, unchanged

Drop Noor from the Dutch cast. The chain fix makes her survivable; it does not make her clean. She emitted a trailing artefact on 4 of 8 fresh takes here, one of them 56dB over its own room floor. A safety net is a bad reason to cast a defective voice.

## Spend

32 fresh renders across xAI and Azure — single-figure cents against the ~$0.20 approved for this validation batch.
