# Thai pod-0: the 43 uncast lines were a labelling accident, and they are relabelled

*2026-08-14. Tom's ruling: option A from the casting page — relabel, don't cast.*

## What was wrong

`tha_for_eng:pod-0-unrecorded` labelled its sentence rows with generic speaker
names — `Customer 1`, `Customer 2`, `Customer 3`, `Customer`, `Passenger` — while
`listening_pods.speakers` holds the recorded pod's scene-specific ones. 43 lines
therefore matched no cast entry at all, and `resolvePodSpeakerVoice()` drops an
unknown label onto `speakers._default` without saying anything: Krit, male, xai
`908c4626660f`. 18 of the 43 are written female. The gate added in `0cda2107`
(`findUncastSpeakers`) refused the render rather than let that happen.

One generic label spans several different characters, which is why casting the
generic labels would have been wrong: `Customer 1` is a woman ordering coffee in
scene 7 and a man ordering lamb in scene 9.

## What was done

`tools/pods/tha-pod0-speaker-relabel-2026-08-14.cjs`, dry run then `--apply`.
**45 rows relabelled. No casting changed, no audio generated, no clip deleted.**
The only column written is `listening_pod_sentences.speaker`;
`listening_pods.speakers` is untouched, so the cast fingerprint does not move and
no approval is invalidated.

| scene | was | now | lines | voice it now resolves to |
|---|---|---|---|---|
| 2 | Passenger | Bus passenger | 2 | m · Krit `908c4626660f` |
| 4 | Friend | Evening friend | 2 | f · Eve `eve` |
| 7 | Customer 1 | Cafe customer 1 | 3 | f · Aroon `4ff93971bfdc` |
| 7 | Customer 2 | Cafe customer 2 | 3 | f · Eve `eve` |
| 7 | Customer 3 | Cafe customer 3 | 1 | m · Rex `rex` |
| 8 | Customer 1 | Bar customer 1 | 5 | f · Ara `ara` |
| 8 | Customer 2 | Bar customer 2 | 3 | f · Aroon `4ff93971bfdc` |
| 8 | Customer 3 | Bar customer 3 | 2 | f · Eve `eve` |
| 9 | Customer 1 | Diner 1 | 6 | m · Krit `908c4626660f` |
| 9 | Customer 2 | Diner 2 | 4 | m · Rex `rex` |
| 10 | Customer | Shopper | 5 | f · Aroon `4ff93971bfdc` |
| 12 | Customer | Patient | 5 | m · Rex `rex` |
| 14 | Passenger | Taxi passenger | 4 | m · Rex `rex` |

The specific bug, now resolved:

- `Customer 1` → **Cafe customer 1** f Aroon (scene 7) **vs Diner 1** m Krit (scene 9) — distinct
- `Customer` → **Shopper** f Aroon (scene 10) **vs Patient** m Rex (scene 12) — distinct
- `Passenger` → **Bus passenger** m Krit (scene 2) **vs Taxi passenger** m Rex (scene 14) — distinct

## The two extra rows the gate could not see

The 45 are the gate's 43 plus **scene 4's two `Friend` rows**. `Friend` IS a cast
name — scenes 15 and 22's friend, a man (ผม) — so `findUncastSpeakers` passes it
silently. But scene 4's friend is the recorded pod's **Evening friend**, a woman
(ค่ะ, นะคะ) cast on Eve. Left alone, those two lines would have rendered a woman
on a male voice with nothing complaining: the same accident as the 43, one label
spanning two characters, invisible to a check that only looks for *missing* keys.
Same evidence, same fix, relabelled with the rest.

## How each row was proved, not assumed

The unrecorded pod is a scene-for-scene, `sentence_number`-for-`sentence_number`
twin of the recorded pod. The script asserts at run time, per row, that the
**recorded counterpart at the identical (scene, sentence) is already spoken by the
role being written** — 44 of 45 rows, all agreeing, abort on any disagreement.
The 45th (`SC02-S005`) is a draft line that exists only in the unrecorded pod;
scene 2 is a two-hander, Sarah asks how far it is into town and this line answers
her, so it is the bus passenger by content.

Writes are conditional (`.eq('speaker', <old value>)`) and assert exactly one row
returned with the new value, so a row someone else had already moved would stop
the run rather than be overwritten.

## Gate status after the relabel

- **Uncast-speaker gate (#546, `findUncastSpeakers`): CLEAR.** 0 uncast roles
  across both Thai pods. Not bypassed, not weakened — it passes on the data.
- **Sample-first cast-approval gate: STILL BLOCKING, correctly.**
  `checkApproval('tha_for_eng')` → `{ ok: false, reason: 'no_approval' }`. Live
  cast fingerprint `673fdde3a1790d04`, no approval has ever been written for this
  course. Thai is one of the languages still awaiting a voice pick on the casting
  page. This is the pre-existing gate doing its job and is unrelated to the
  relabel.

## Proofread: nothing renderable is waiting

`tha_for_eng:pod-0-unrecorded` has **106 draft lines of 232** (`target_text_draft
= true`). The recorded pod has none.

The renderer still has **no proofread gate** — `phase8-audio-v13.cjs` does not
reference `target_text_draft` anywhere; only `services/voice-engine/pods-plan.cjs`
marks drafts, for the recording pack. That is the a108 finding, unchanged, so any
render must exclude draft rows by hand the way the Spanish render did.

In this case that is moot: of 107 rows with no target audio, **106 are draft** and
the single non-draft one, `SC15-S012`, is an empty placeholder — blank
`target_text`, blank `known_text`, Narrator. So the non-draft render backlog for
Thai pod-0 is **zero real lines**. No render is warranted and none was run.

## What remains before Thai pod-0 can render

1. A Thai voice pick / cast approval from Tom (the casting page ask) — writes the
   approval the sample-first gate wants.
2. A proofread pass over the 106 draft lines. Three of them are worth naming:
   scene 8's `SC08-S002`, `SC08-S004`, `SC08-S005` were redrafted with masculine
   ครับ/ผม on **Bar customer 1 and 2**, who are women in the recorded pod (ค่ะ/คะ
   throughout) and are cast female. The relabel is right; the draft Thai is what
   disagrees with itself. They are draft, so nothing renders them today.
3. `SC15-S012`, the empty Narrator row, wants deleting or filling — flagged, not
   touched, since deleting rows needs its own plan.

Logs: `docs/pods/tha-pod0-speaker-relabel-2026-08-14-dryrun-log.json` and
`-applied-log.json`, per row, with before and after.
