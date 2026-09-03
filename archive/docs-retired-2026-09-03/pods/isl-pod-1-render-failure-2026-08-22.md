# Icelandic pods — render failure, NOT flipped

*2026-08-22. Part of the free-tier render chain (ron, swe, isl, eus, run in that fixed order).
This is an honest failure report, not a cutover record — `isl_for_eng` was never touched beyond
the render attempt below.*

---

## The headline

**Icelandic (`isl_for_eng`) is NOT flipped.** The render chain left 11 of 231 staged sentences
with no usable target audio. Per standing doctrine (make-before-break: a new pod is proven
complete *before* the live pod is touched) this course is held back rather than forced through.

---

## What happened

Detached systemd render chain (`pod-render-chain-free-tier-2026-08-22`), target track only, run
third (after Romanian, Swedish): **120 generated, 5 reused, 11 failed** out of 136 queued.
Veracity: 29 sampled, 18 passed, **11 quarantined after 3 render attempts each** on
CER-above-threshold grounds. 0 rerendered successfully for these 11 — each was retried and
quarantined again.

**Independently confirmed against the live database**, not just the render log: `verify-pod-audio.cjs
--probe-all` on `isl_for_eng:pod-0-unrecorded` shows exactly **11 of 231 target rows unresolved**
(no `target_audio_id` at all — quarantine leaves the row unlinked, it does not leave a bad clip
linked). The known-language track is untouched and fully resolved (231/231). This is the
independent-verification layer catching the identical 11 rows the render log already named —
two different checks agreeing, not one check taken on faith.

---

## The 11 quarantined sentences

| Sentence | CER | ASR heard |
|---|---:|---|
| `SC03-S007` | 0.50 | "Já, viðstum að civilin." |
| `SC07-S002` | 0.34 | "Ég vil gært mann for svoft kaffi." |
| `SC17-S003` | 0.37 | "Getum við sétha og herfverkjith. Taðk!" |
| `SC07-S012` | 0.42 | "Ílvitað.  Þart naði að porsinn." |
| `SC12-S010` | 0.74 | "Nítjan, tuftú, tuftú égtt. Milvík að þaður.  Fyft að þaður." |
| `SC17-S008` | 0.40 | "Er vattne vuft?" |
| `SC14-S006` | 0.35 | "Já, í skuttleður peint að með er sölunni." |
| `SC18-S002` | 0.55 | "Er þeir með ahbál sinnsjáva?" |
| `SC18-S007` | 0.45 | "að það reiðt.  Havir reiðt fyrmir?" |
| `SC18-S004` | 0.44 | "Fyrr Bátrun hérvann." |
| `SC20-S007` | 0.67 | "Kon kið servið aðlma það?" |

These read as TTS mispronunciation/hallucination on Icelandic-specific phonemes and consonant
clusters (the ASR transcriptions above are gibberish relative to what the target sentences should
say) rather than a systemic voice or pipeline fault — 220/231 sentences on the same voice pair
rendered and passed veracity cleanly. This looks like a per-sentence TTS quality problem
concentrated in scenes 3, 7, 12, 14, 17, 18, 20, not a course-wide defect.

---

## Why this is not flipped, and won't be forced

`docs/pods/pod-migration-protocol.md` and `AUDIO_PIPELINE_ARCHITECTURE.md` §6b both require a new
asset to be generated and verified *before* the old one is touched — never the reverse. Flipping
`isl_for_eng` now would put 11 silent (or old-content) slots in front of learners with no target
audio at all. No forecast, rehearsal, or flip has been run against the real Icelandic course; the
`isl-pod0-switchover-prospective-2026-08-22.json` forecast (carry 52 / drop 38, committed
2026-08-22) remains prospective-only, untouched by this job.

---

## What clean courses did in the same run

Romanian, Swedish and Basque all rendered with 0 failures and were verified + flipped
independently — see their own cutover records. This failure is isolated to Icelandic; it did not
block or degrade the other three.

---

## What needs Tom / next steps (not actioned here)

- Re-render just these 11 sentences (a targeted re-render, not a full bulk pass) and see if a
  fresh attempt clears the CER threshold — TTS retries have cleared similar quarantines before.
- If they persist, this may need a native-speaker/human take for these 11 lines specifically
  (Icelandic phoneme coverage is a known hard case for synthetic TTS).
- Once all 231 target rows resolve clean, re-run the full verify → rehearse → flip sequence used
  for Romanian/Swedish/Basque — nothing about the forecast or migration plan needs to change,
  only the render needs to finish.

---

*No pod content, database row, or learner progress for `isl_for_eng` was modified by this job.*
