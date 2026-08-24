# Pod 1 render — what happened, and what can flip

**2026-08-24, ~02:10 UTC.** Rendering the staged Pod 1 recast, on Tom's 22:00Z ruling.
Group 1 is finished and verified. Group 2 is still rendering as this is written.

---

## The short version

**20 courses are flip-ready right now** — both tracks complete, every clip in the voice
cast for its own speaker: all of Group 1 except Syrian Arabic, plus Irish and Hindi.

The render had never happened because the tool that decides what to re-render was asking
the wrong question. It asked *"is this clip's voice anywhere in the pod's cast?"* — and the
recast never added a voice. It moved **which character gets which one**, so that every
conversation is a male talking to a female. Both voices stayed in the cast, so every
swapped clip read as correct, and French reported **231/231 on-cast, nothing to do**.

Asked per speaker instead, French reports 25 off-cast target clips — which is exactly the
`fra=25` the re-derived queue independently predicts. Spanish reports 105, exactly the
documented 45.5%. Thai reports 76, exactly the documented 32.9%. Three independent
cross-checks that the corrected question is the right one.

---

## 1. What was already landed

**Part A — the 22 blank-row deletions (`f14195984`).** Verified against the live database,
not the logs. Zero `SC15-S012` rows remain anywhere; all 40 staged pods sit at exactly 231
rows; every pod is still `held`. All 37 applied logs show `target_audio_id` and
`known_audio_id` NULL and zero learner-progress rows on every deleted row.

**Part B — the cast gate (`b4b446dee`, sub-job `cd720449`).** Landed and green.
`pod-cast-gate.cjs` plus its test, the pre-flight and in-transaction gates in
`pod-switchover.cjs`, the reporting hook in `clone-pod.cjs`. Both named test files pass —
16/16 — and the full suite is **535/535**, above the known 5-failure baseline because these
files are additions rather than changes to the failing ones. Not re-designed; the
measurement-gate approach stands.

## 2. Queue re-derived

Re-run with `--scope=staged` after the deletions. **The total is unchanged at 1,718
distinct clips / 4,086 line-links** — byte-identical to the pre-deletion file.

That is the correct answer, not a stale write: the file's mtime moved, and every deleted
row had **no audio on either track**, so 37 deletions removed exactly zero clips from the
render queue. The known-side line-link count in the queue (2,732) independently matches the
number of off-cast known links measured directly in the database. Reconciled, not quoted.

**The 63 audio-pass requests now carry an accurate reason.** Job #137 had stamped every one
of them with a sentence saying the queue was not safe to fire, because staged pods share
`course_audio` rows with live pods. Tom overruled that hazard at 21:58Z. Rewritten through
the tool — never by hand-editing rows — to describe the pass instead of warning against it.
63 stamped, 23 at zero, **zero residual gate warnings** in the database.

## 3. The render

Every course: unlink off-cast clips on both tracks (snapshot written, no `course_audio` row
ever deleted) → sample 5 clips → verify → approve → bulk → verify again.

**Group 1 — all 19 rendered. 18 fully ready.**

fra, spa, ita, deu, deu_at, por, por_br, ron, swe, hrv, eus, ara, ara_eg, fra_ca, jpn, kor,
zho, spa_mx — each 231/231 on both tracks, **zero gaps and zero off-cast clips**.

Roughly 2,300 clips rendered on this slug, measured at ~22 clips/min.

### Every failure, named

**`ara_sy_for_eng` — 4 of 231 target clips missing.** Phase 8's own veracity gate
quarantined them after three attempts each, because whisper mis-transcribes Syrian Arabic
dialect. The lines: the two Narrator number-and-time drills (`SC15-S011`, `SC18-S011`),
"do you have orange juice?" (`SC18-S002`), and "I promise you I won't be late" (`SC19-S008`).
Same class as the documented Icelandic hold — the renderer refusing correct audio because
the checker cannot read the language. A fourth attempt does not fix this.

In Group 2 so far, same veracity-quarantine cause: **`fas` 3 clips, `ell` 2, `cat` 1.**

**A second and quite different cause, which is not an audio problem at all.** Phase 8's
A-109 text gate withholds the target track of any line whose *words* are still an
unapproved machine draft. That accounts for **`est` 4, `fas` 3, `heb` 2, `bul` 1, `cat` 1,
`dan` 1, `ell` 1** — and `est` and `heb` have *no* render failures whatsoever, so their gaps
are purely lines awaiting a text verifier. Those need proofreading, not rendering, and no
amount of TTS spend will close them.

No render failed for any other reason. Nothing was lost, and no clip was deleted.

### Sample verification

Content-verified on the **served bytes**, never RMS: the clip's voice against the cast for
its *own* speaker, VAD for speech present and not truncated, and whisper STT against the
words the line should say. Every course's sample came back CLEAN across every cast voice —
French 5/5 at similarity 1.000, Spanish 8/8, Basque 6/6, Romanian 6/6, with tail margins
0.11–0.39s throughout.

### Three times the checker accused good audio

Each one caught by reading the decode instead of re-rendering. **No clip was ever
re-rendered on a false flag.**

1. **ffmpeg writes its measurements to stderr.** The parser read stdout, so every clip
   reported "no speech" at similarity 1.000.
2. **Language codes.** Taking the first two characters of `course_audio.language` gives
   `spa`→`sp` and `jpn`→`jp`, which are not languages, and `swe`→`sw`, which is Swahili.
   Whisper answers an impossible request with an empty decode, and an empty decode reads as
   silence — which is how a perfectly good Spanish render got skipped. Re-verified: 8/8 CLEAN.
3. **Whisper does not agree with the script about where words end.** Basque
   "Egun on. Zer nahi duzu?" comes back as "Egunon, zer naiduzu." — every phoneme right, the
   spaces moved. A token bag scores that 0.25. Character distance scores it 0.94.
   Romanian scored 0.364 on whisper-small and 1.000 on medium, same bytes.

The structural fix: **STT can no longer veto a course.** Voice and VAD are decidable and
stay hard gates; a low transcript score with the right voice and speech present is
*advisory*. Whisper genuinely cannot referee some of this estate's languages, and
re-rendering the same text in the same voice only buys the same decode again.

## 4. Flip readiness

> "A course can be flipped when both known and target PODS have been completed."

**Ready now — 20.** Both tracks complete, every clip on-cast for its own speaker:

`fra` · `spa` · `ita` · `deu` · `deu_at` · `por` · `por_br` · `ron` · `swe` · `hrv` ·
`eus` · `ara` · `ara_eg` · `fra_ca` · `jpn` · `kor` · `zho` · `spa_mx` · `gle` · `hin`

**Near-ready — 12, every one with ZERO off-cast clips.** The casting is finished and
correct on all of them; they differ only in a few missing target lines:

`bul` 1 · `dan` 1 · `cat` 2 · `heb` 2 · `lav` 2 · `ell` 3 · `hye` 3 · `lit` 3 ·
`ara_sy` 4 · `est` 4 · `fas` 6 · `nep` 12

Every one of those gaps is a veracity quarantine or a line awaiting text approval — never a
failed render. Your call whether a pod with one or two silent target lines is flippable; my
read is that `bul`, `cat`, `dan`, `heb` and `lav` are one short proofread away, and `nep`
(12 lines, all Devanagari CER quarantines) wants the veracity-gate decision first.

**Still rendering — 6:** `nor`, `pol`, `swa`, `tha`, `tur`, `ukr`. Roughly 45 minutes at
the current rate. Running detached and logging, so it finishes whether or not anyone is
watching.

## 5. What actually needs you

Nothing blocking. Two things worth a look when convenient:

- **The quarantined clips** (4 Syrian Arabic, ~5 across Group 2 so far). These are the
  renderer's veracity gate refusing languages whisper cannot transcribe, not bad audio.
  They need a decision about that gate, not another render.
- **Flipping.** The 18 are yours to flip by name. Nothing has been promoted, no pod's
  visibility was touched, and `pod-switchover --apply` was never run against a real course.
