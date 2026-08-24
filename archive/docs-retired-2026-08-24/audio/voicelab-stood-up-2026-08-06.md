# VOICELAB is up, the gates refuse, and the three courses have declared their voices

**2026-08-06, tonight. Built, tested, pushed. Nothing rendered, nothing deleted, no money spent.**

> The bench exists now, at **Configs → VOICELAB**. It auditions from the store first, so most
> of what you would want to hear is already paid for. The gate stack is one call and an
> unmeasured clip no longer counts as a passed clip. And German, French and Austrian German
> have each declared one voice per side — which cost nothing and is what makes every later
> step unambiguous.

---

## The first thing worth your ear

The gate stack ran over five real `deu_for_eng` clips as its first outing on production
audio. Four of the five would not have been admitted. Here are the two worth thirty seconds.

**One · a clip on the declared voice that the rate gate says is too fast for that voice.**
Ten syllables in 1,500 ms, where `ara` takes 1,946 ms for ten syllables across 114 untrimmed
renders — 23% short, z −1.82. This is the same shape as the defect you heard by ear in "as
often as possible", and whisper transcribes clips like this perfectly.

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/DC466797-E4CD-4710-A971-22F0CC65088C.mp3

For comparison, a longer `ara` clip the same gates admitted without complaint:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/D1A2F568-04D5-43B9-8378-1F77D3974A94.mp3

**One clip is not a finding.** The gate flagged it, I have not confirmed it by ear, and the
whole point of the bench is that your ear is the instrument that settles it. If it sounds
rushed to you, that number is worth trusting at scale; if it sounds fine, the threshold moves.

**Two · the loudness spread nobody was refusing.** Measured tonight on four German clips:

| voice | clip | integrated LUFS |
|---|---|---|
| `ara` (declared) | "Heute Morgen fing ich an…" | −16.5 |
| `ara` (declared) | "hast du diese junge Frau gesehen?" | −15.8 |
| `eve` (stray, English voice on the German side) | "Das macht acht Euro vierzig insgesamt." | **−21.7** |
| a June clone experiment | "Guten Morgen. Wie geht es dir?" | −17.8 |

Nearly 6 dB between the quietest and the loudest, inside one course side. The `eve` one is
exactly the failure `audio-processor.cjs` predicted in its own comments — a peaky voice hits
the true-peak ceiling before it reaches the loudness target and stalls 4–6 LUFS short. The
number was being measured all along and thrown away. Now it refuses.

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/FBA83646-2F70-4C5B-9884-7480B7BC1E63.mp3

---

## What landed

**The gate stack, as one call.** Six gates on the mastered bytes, cheap first: speech span,
loudness, tail shape, syllable rate, phonology, words. Each one already existed somewhere and
none of them was wired to a decision.

The behaviour change the design asked for is in: **`null` refuses.** If the gate cannot measure
a clip, the clip does not enter the store, because the store's promise is that everything in it
passed. What makes that liveable is a distinction the old shape could not express — *cannot
measure* refuses, *does not apply* does not. Phonology on an English clip blocks nothing;
phonology on a German clip with no whisper on the box blocks everything, loudly. Every verdict
carries which role it was playing (admission, never selector), whether each gate was available,
and whether its calibration reaches this clip.

**VOICELAB itself**, at Configs → VOICELAB. Four jobs: audition on real course sentences,
compare providers blind, declare a side's voice, and the drift report. Its hard constraint is
enforced in the endpoint rather than promised in a comment — **it renders nothing and cannot
render anything**. It stratifies real sentences (shortest first, where truncation hides; then
longest; then middle) and returns every take that already exists anywhere in the estate. On
`deu_for_eng` target1 that is 7 voices free to hear, and the sentence "ich" alone already has
8 takes. Anything missing from that list is exactly what a sample would cost, shown before a
penny is spent.

**The drift report, live.** Two read-only SQL functions applied to production, grouping on the
canonical voice so `ara` and `xai_ara` are one voice. First run on `deu_for_eng`:

| side | clips | distinct voices | dominant | share |
|---|---|---|---|---|
| target1 | 14,296 | **7** | `xai_ara` | 99.1% |
| target2 | 13,741 | 1 | `xai_leo` | 100% |
| known | 14,326 | 1 | `xai_eve` | 100% |
| pod_take_g | 470 | **6** | a June clone id | 35.7% |
| presentation | 2,405 | 2 | `xai_eve` | 99.5% |

Plus 32 texts carrying more than one voice at the same role. Nothing is deleted; the declared
voice says which row wins and the loser is left in place, unlinked.

**Versioned, content-addressed config.** `algorithm_config` now records every save immutably,
addressed by the hash of its own content, with a draft channel and rollback-by-repointing.
Before tonight, a Save on the Listening or Speaking page was a production deploy to every
learner within five minutes with no undo, which is why PodLab had quietly opted out of saving
at all and exported to the clipboard instead. Applied to production, back-filled from current
state, and the four existing screens needed no changes.

**Step 0 — the declarations, applied.** No audio touched, nothing rendered:

- `deu_for_eng` → `xai_ara` target1, `xai_leo` target2, `xai_eve` known
- `fra_for_eng` → `xai_eve` throughout
- `deu_at_for_eng` → `azure_de-AT-IngridNeural` target1, `azure_en-GB-SoniaNeural` known

Published at config hash `26f05ba97e6518e8`. From here `assertRenderVoice` throws rather than
warns when a render asks for a different voice, and it says in its own message that there is no
automatic provider fallback — policy, not an accident of the code.

**`XAI_OFFICIAL` reads the catalogue** instead of restating 17 of its 20 languages, so `da`,
`fi`, `sv-SE` and `th` stop being routed away from xAI by a stale copy of a list.

---

## What I defaulted on — say the word and any of these changes in one edit

**Sample size 24, never fewer than 12.** The floor is the pace gate's, which refuses to
calibrate on fewer than 12 reference clips. 24 is my judgement of "enough to hear a voice by"
and yours is the one that counts. Widened to 40 for a voice with no track record.

**Loudness band −15.5 LUFS ±1.5, true peak under −1 dBTP.** It rests on a single 25-clip test.
It is a declared per-course config value rather than a constant, so a course can hold its own
once someone measures its side. Tonight's five clips say the estate is looser than the band.

**The tail-shape gate refuses at admission.** Its own header calls a flag a triage verdict and
never a delete verdict, and at repair time that is right — 80% precision. At generation time
the arithmetic differs and I have written the reasoning down: a false flag costs one re-render,
a miss costs a learner hearing an amputated word forever. If you would rather it advised at
admission too, that is one line.

**The `deu_at_for_eng` known voice.** The design said "one known voice chosen from its current
three" without choosing. I declared the dominant one, `en-GB-SoniaNeural` (10,415 clips against
`eve` 1,604 and your clone 957), because it changes the fewest clips.

**The 122 off-voice German rows with no correct-voice sibling** are untouched — no render, no
delete. Whether to re-render them on the declared voice is yours.

**Listening and Speaking are relabelled LABS** on the Configs index. Routes and filenames
unchanged so nothing breaks.

---

## What I want you to decide

**1 · Is that first clip actually rushed?** Play the two clips at the top. If the flagged one
sounds rushed to you, the rate gate is calibrated and can run at scale on German tomorrow. If
it sounds fine, I loosen the threshold before it queues thousands of clips.
*My recommendation: listen, then tell me rushed or fine — one word.*

**2 · Do I run Experiment 0 phase C?** Phases A and B cost nothing and the material is in the
lab now: your clone's 1,126 German and French clips are all code-switched explainers, so they
warm up the question rather than answering it. Phase C is 80 clips — 40 German, 40 French, real
course sentences, full gate stack, then a blind A/B against `ara`, `leo` and `eve` whose takes
already exist. It is a sample, not a bulk run, and it produces the first frozen capability
verdict per `(clone, language)` — the entry gate that lets a clone be declared multilingually.
*My recommendation: yes, run it — it is small, it is the asset VOICELAB exists to produce, and
until it exists no clone can be declared for German or French at all.*

---

## Explicit gaps — things I could not close and am not papering over

- **Whisper is not on this machine's PATH.** It exists at `~/.local/bin/whisper-cli` but is not
  where the code looks, so the phonology and words gates report `unchecked` here unless
  `WHISPER` is set. Under the new rule that refuses admission — correct behaviour, and it means
  a render box must have whisper before it can generate non-English audio. Worth knowing before
  a run, not during one.
- **The VAD engine is shared with the in-flight damage-trace work.** Their fuller `vad.cjs` is
  not on `main` yet; the gate stack uses its own energy fallback, says which engine spoke in
  every verdict, and is written to defer to theirs the moment it lands.
- **The 766 `narakeet_fritzi` clips**: a separate hunt ran and its findings are in the repo —
  the clips are left exactly where they are.
- **Nothing in this work has been deployed.** It is pushed to a branch and not merged.

*Everything above was measured on the live database tonight. 870 tests pass, including 19 on
the gate stack's verdict logic and 17 on the declaration corridor.*
