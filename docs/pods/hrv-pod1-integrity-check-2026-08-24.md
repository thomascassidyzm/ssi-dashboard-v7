# hrv_for_eng Pod 1 — integrity check vs the ita split-clip disease

2026-08-24. Evidence-only sweep, parallel to the ita root-cause investigation
(`docs/pods/ita-pod1-scene15-two-female-voices-rootcause-2026-08-24.md`). Nothing
written, rendered, unlinked or deleted.

## Verdict: INFECTED — same disease, same mechanism

`hrv_for_eng:pod-1` (live) carries the identical defect found in Italian: split-clip
arrays (`sentence_audio_ids`) copied **positionally** from the retired
`hrv_for_eng:pod-0-retired-2026-08-22` into pod-1, never re-derived, while
`target_audio_id` (the whole-turn clip) was correctly recast. Where the scene running
order or scene content changed between the two pods, the inherited split clips now play
audio for a **different sentence than the one on screen**, sometimes in an **off-cast
voice** left over from the old pod-0 cast.

## Check 1 — text/casting construction: PASS

- Exactly 2 target voices in the stored cast: `azure:hr-HR-SreckoNeural` (Srecko, m),
  `azure:hr-HR-GabrijelaNeural` (Gabrijela, f). No third target voice referenced.
- Exactly 2 known voices: `xai:gfzdpspr5fdp` (Tom clone), `xai:bedd6226` (Olivia) — the
  standard English pair.
- All 28 canonical characters map to exactly one voice pair each (speaker-stability
  holds; time-stamped variants like "Barista (3 pm)" fold onto the canonical name).
- No blank or unresolved `speaker` values found in the columns checked.

The **stored cast metadata is clean** — same finding as ita: "the metadata was not
lying." The defect is not in `listening_pods.speakers`, it's in the split-clip arrays
the cast gate never inspects.

## Check 2 — split-clip inheritance and content match: FAIL

Query: for every pod-1 row with 2+ `sentence_audio_ids`, compare to the same
`(scene_number, sentence_number)` slot in `pod-0-retired-2026-08-22`, and separately
check whether each split clip's own `course_audio.text` is a substring of (or contains)
its row's `target_text` — the same crude-but-real test the ita crew used course-wide.

| Metric | Count |
|---|---|
| pod-1 rows with a split-clip array (2+ clips) | 88 |
| ...byte-identical to pod-0-retired's same slot | **88 / 88** |
| ...of those, whole-turn clip (`target_audio_id`) also unchanged (probably harmless) | 7 |
| ...of those, whole-turn clip *was* recast but split array is stale (**suspect**) | **81** |
| Split rows where a clip's text does not match its own row's sentence (content-mismatch test) | **55 flag events, 54 distinct clips, across 10 of 22 scenes** |
| ...of the mismatched clips, carrying a voice outside the current 2-voice cast (old pod-0 ElevenLabs voices `EXAVITQu4vr4xnSDxMaL`, `JBFqnCBsd6RMkjVDRZzb`, `FGY2WhTYpPnrIDTdsKH5`) | **22** |

This lines up almost exactly with the ita crew's crude course-wide estimate for
hrv_for_eng (56/231 split clips, 24.2%) — my slot-level method landed on 55.

**Scene 15 is the worst, and it is the same wrong-conversation swap as Italian.**
26 of the 55 flagged events are in scene 15. Example, row `global_order 141`:

| slot | text | voice |
|---|---|---|
| row's own sentence (`target_text`) | *Koliko to košta?* ("How much does it cost?") | — |
| `sentence_audio_ids[1]` | *Bi li ti smetalo da pokušam vježbati govoriti hrvatski s tobom?* ("Would you mind if I tried to practise speaking Croatian with you?") | `EXAVITQu4vr4xnSDxMaL` — old pod-0 voice, not in the pod-1 cast |
| `sentence_audio_ids[2]` | *Ne učim ga jako dugo...* ("I haven't been learning it long...") | same off-cast voice |

Word-for-word the same "practising [language] with a friend" conversation bleeding
into a "how much does it cost?" scene that Tom heard live in ita scene 15. Other
affected scenes (3, 4, 5, 6, 7, 8, 9, 11, 14) show the same pattern at smaller scale —
mostly Learner-drill rows in scenes 3–9 where a short prompt's split clips carry
leftover multi-sentence audio from the old pod-0 slot.

## Check 3 — served audio spot-check: BLOCKED, not done

Attempted to fetch flagged clips through the production learner path
(`https://app.saysomethingin.com/api/audio/{id}?courseId=hrv_for_eng`) for 3 sample
clips. All three returned HTTP 404 with the SPA's `index.html` fallback body, not a
403/entitlement response — consistent with the ita crew's logged gap ("the learner
route needs entitlement", their workers #279/#281 were assigned to cover it). I did not
have a working learner session/entitlement token to get past this in the ~20 min
budget, so **I have not independently confirmed these bytes are what a live learner's
browser actually decodes** — my evidence is DB content/voice-id mismatch, not decoded
audio. Given how directly the row/clip pairing was inspected (exact text and voice_id
per clip), and how closely it reproduces the proven ita mechanism, I judge this a
high-confidence INFECTED call, but the byte-level confirmation is an explicit gap.

## Mechanism — same as ita, not independently re-diagnosed here

I did not re-derive *which* tool did the positional copy for hrv specifically; the ita
root-cause doc already names the candidates (`tools/pods/clone-pod.cjs`,
`pod-switchover.cjs`, `pod1-percall-recast.cjs`) and that crew owns the mechanism fix
across all courses. This report is course-specific evidence only, per the brief.

## What I did not do (per the brief)

No pointer touched, no clip unlinked, no audio generated, nothing written to any table.

## Gaps

- Served-bytes confirmation via the actual learner URL: blocked by entitlement, not done.
- Did not re-run the C4/C5 (scene cast-size / adjacent same-voice hand-off) checks from
  the spa_for_eng template — brief for hrv asked specifically for the ita disease check,
  which took priority in the time available.
- Did not check scenes 16–22 for pod-0 counterparts / inheritance (ita found scenes with
  no pod-0 counterpart are exempt from this defect class by construction — same is
  assumed true here but not explicitly re-verified row by row).
