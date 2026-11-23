# Item 8 plan + price (cs #877·AK for #868) — copy `ssi_copy_20261123t033000z` (built 2026-11-23 03:40Z)

Plan only: nothing applied, rendered or linked; no live reads. Regenerate: run the committed readers into a dir
(`course-dump-readonly-2026-10-14.cjs`, `gender-pairs-dump-readonly-2026-10-29.cjs`, `tools/candidates.py`,
`tools/audio/clip-provenance-readonly.cjs` over `<course>.cand-ids.txt`, `tools/audio/clip-voices.cjs` over every known
clip id, #710's `detect.json` from branch `cs/710-paid-cleanup-item-8b-hindi-two-v`), then
`COPY_DB=<copy> node tools/plan.cjs <dir> <outDir> ~/.local/state/ssi-tts-spend/ledger.jsonl`. The rules are in its header.

Files: `slots.json` (6,752 slots; each carries `speak` = the words to send, `evidence`, `why`; 8B slots also `want_voice`),
`sample.json` (10 per course), `excluded.json` (199 candidates left out, each with its reason).

## Counts and price (chars = length of the words to speak; "render" = one render per distinct text, library-first links the rest)

| course | slots | chars | render chars | evidence |
|---|---|---|---|---|
| spa_mx_for_eng | 386 | 14,166 | 12,680 | 329 date, 57 unknown |
| fra_ca_for_eng | 557 | 17,624 | 17,284 | 1 ledger, 9 date, **547 unknown** |
| por_br_for_eng | 308 | 10,708 | 9,288 | 167 ledger, 141 date |
| ara_for_eng | 360 | 15,995 | 14,764 | 4 ledger, 356 date |
| eng_for_pan | 2,451 | 91,681 | 88,418 | pair (male text in Vaani → Gurpreet) |
| eng_for_urd | 1,905 | 61,111 | 58,762 | pair (male text in Uzma → Asad, Azure) |
| eng_for_guj | 785 | 27,844 | 26,931 | pair (male text in Dhwani 780 / Isha 5 → Amit) |
| **total** | **6,752** | **239,129** | **228,127** | |

8A 1,611 slots / 58,493 chars; 8B 5,141 slots / 180,636 chars. If the fra_ca + spa_mx unknown pools are dropped after
the ear sample: −604 slots, ≈ −19,100 chars.

## 8A (target1 = the female seat; every target1 clip on a candidate slot is a female cast voice, checked by name)
Candidate = a slot whose target_text has a stored target-side reading `expanded_f` that differs. The clip label cannot
tell what a clip says (gender prep keeps the plain text), so evidence, strongest first (#131·AI's method, no transcript):
- **ledger**: the spend ledger shows the male text hash sent for this clip's voice within 30 min of its render.
- **date**: the clip was rendered before its pair's `processed_at`, so no female reading existed to speak. Caveat:
  if `processed_at` was re-stamped by a later re-process, an older reading may have existed; the ear sample checks it.
- **unknown**: rendered before the ledger (28 Sep) with the reading already in place, so phase8 MAY have spoken the
  female form. fra_ca's 547 were all rendered in July after its pairs were processed (21 Jul), which looks like a
  gender-prep regenerate pass, so many may already be right. **Recommend: Kai hears fra_ca's and spa_mx's 5 unknown
  samples before the parent spends on those pools.**
- Speaker rule (Kai's male-default, 16 Nov, as #142/#241 applied it): only rows that describe I/we (I/we + am, was, be,
  feel, went…), or bare fragments of such a seed. The rest are held, not rendered.
- The parent should render with `spokenText` = `speak` (or let the route's gender prep do it) and link with
  `replace` + `expectCurrent`; the route moves the voice onto the cast (Daniela, Léonie, Ana Paula, Maryam).

## 8B (known side, two known voices per gender)
The pair list of record is #710's rule: a stored known pair counts only when #710's detector called it speaker-gendered
(detector forms win), detector-only gendered texts add pairs, detector-neutral pairs are dropped. Reused from #710:
pan 1,306 stored verified + 1,128 detector-only (121 with detector forms different from the stored ones), 622 dropped
neutral; urd 1,343 + 487 (90 differ), 609 dropped; guj 784 verified, 0 detector-only (guj's detector only saw the
at-risk texts). Every course text with a stored pair was in the detector input (0 unmatched). Cast from
`ops/voice-casting/978/cast-settled.json` + `two-voice-undo-17.json` (not #710's stale VOICES table). Female-form
texts already in a female voice (pan 15, urd 17, guj 11) are fine. Neutral texts are out of scope (hash rule, left as is).

## Excluded (excluded.json)
- held, speaker not established: spa_mx 31, fra_ca 88, por_br 41, ara 20 (180). Some are real ("on my own",
  "thank you", fra "went nowhere"); they need a reader, not a guess.
- already re-recorded by #984 (female-form revision): spa_mx 9 slots (its 8 clips); none of #984's clip ids remain.
- ledger shows the female reading was sent (already right): spa_mx 4, por_br 1.
- voice unknown: por_br 3 slots on `cartesia_cb2694c3…`, spa_mx 2 on voice id `ara` (also a label mismatch).
- silent known slots (item 1, the parent's): pan 120, guj 28 that are gendered.

## Gaps
- `clip_spoken_text` verdicts are not read by any committed CLI reader; #984's re-records were caught by their
  revision reason instead. A slot whose clip carries a female verdict with no revision would be listed wrongly.
- The voice of `cartesia_cb2694c3-715f-4da9-99f3-1c974fff2928` (por_br, 3 slots) is not in the cast records: not guessed.
- 51 stored pairs in pan, 51 in urd and 127 in guj were never seen by #710's detector: left out (unverified).
