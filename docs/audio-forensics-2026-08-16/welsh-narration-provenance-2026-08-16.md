# The 18 Welsh narration lines: where they came from, and what to do with them

**They are held. Aran's queue is 153 lines of pure pod work and cannot serve him an unknown line.**
Verified on the live surface, not inferred: Aran 170 → **153**, Catrin 276 → **275**, zero narration
lines in either. Nothing was deleted — the wants are parked under a `held` key and restore in one
statement.

2026-08-16. You didn't recognise these lines. You were right not to: **you never authored them.**
They are the old app's own introduction narration, imported wholesale with the Welsh courses, bound
to LEGO slots by ordinal position in a JSON file. Nobody in Popty chose them.

**But they are real, they are human, they are correct, and they are live.** The "18 clips 404" report
does not reproduce: all 18 objects are on S3 and all 18 serve **200** with correct bytes through the
learner app today. The 404 was the recording surface's take route, not the learner path.

---

## The three answers

### 1. Where did they come from?

| | |
|---|---|
| The bytes | Uploaded to S3 **2025-05-15**, 11:24–11:34 UTC — old-app masters, seven months before Popty had these courses |
| The text | The old app's `presentation` field, carrying its `<src>`/`<tgt>` markup, from `Welsh-north_for_English_speakers_20250604_162031.json` (mapping documented in `ssi-learning-app/docs/welsh-json-to-v12-mapping.md:105,265,270`) |
| The first import | `database/import-lego-introductions.cjs` (commit `5e69849b`), run **2025-12-24** (cym_n) / **2025-12-31** (cym_s) — wrote `lego_introductions.audio_uuid` = the raw S3 filename uuid |
| The `course_audio` rows | **2026-02-16 17:34–17:37 UTC**, one event, **1,317 rows** across both Welsh courses — a backfill that materialised `course_audio` out of `lego_introductions` (uuid and duration copied straight across) with the text supplied from the JSON |
| The learner pointer | `course_legos.presentation_audio_id` — **set on all 18**, written later again, by the Feb-2026 presentation-linking work |

**The binding rule is the whole story.** `import-lego-introductions.cjs:60` derives the LEGO id from
*ordinal position* in the JSON — `S{seedIdx+1}L{legoIdx+1}` — never from matching the text. That is
exactly how narration you never chose ends up sitting under a specific LEGO slot with a live pointer.

**They are not a special cohort.** All 1,317 Welsh presentation clips arrived the same way. These 18
were singled out by one thing only: the 2026-08-14 tail-integrity sweep flagged them `FAIL_steep_tail`.

### 2. Did the old app ever serve audio — TTS or human?

**Yes, and human, on all 18.** Four independent measurements agree:

- **The bytes exist and are old.** 49–199 KB each, S3 `LastModified` 2025-05-15, i.e. the old app's own
  master files, not anything rendered here.
- **The audio says what the row says.** Transcribed all 18: e.g. S0141L01 → *"The Welsh for 'are they'
  is ydyn nhw. Ydyn nhw."*, S0159L01 → *"…is fel athro for a man, or fel athrawes for a woman."*
- **The wording drifts from the stored text in the way only human speech does** — the audio says *"The
  Welsh **word** to give her"* where the row reads *"The Welsh **for** to give her"*, and *"which you'll
  usually hear as **just** y fenga"* where the row omits the "just". Text transcribed from speech, not
  speech rendered from text. No TTS pipeline produces that drift.
- **One human male voice throughout.** Median F0 107–158 Hz across all 18 (Aran's known pod takes
  measure 137–151 Hz on the same instrument).

**No TTS was ever involved, and TTS is not an option now**: Welsh is `human_only` in
`language_recording_policy`, and this is the presenter's own teaching voice.

### 3. Reachable, or dead weight?

**Reachable — every one. Heard — none.**

- `course_legos.presentation_audio_id` is set on **18/18** (verified independently), and that is the
  column the learner path reads: `ssi-learning-app/api/courses/[code]/cycles.ts:739` selects it for the
  INTRO cycle; `api/audio/[audioId].ts:126` streams the bytes from `ssi-audio-stage`.
- Both courses are `released` / `public` / `live`, and nothing caps the Welsh round map.
- **All 18 return 200 with correct bytes through production right now.** The 404 came from probing the
  wrong host — `app.saysomethingin.com` 404s every id including known-good controls; the learner
  domain is `saysomethingin.app`.
- They sit at **rounds 220–532** (seeds 141–301). The deepest any learner has ever reached in any Welsh
  course is **seed 86**, and cym_s has zero progress rows at all. 87 learners enrolled in cym_n, 29 in
  cym_s, **none past seed 100**.

`lego_introductions.presentation_audio_id` is NULL on all 18 — that table's `audio_uuid` holds the raw
S3 uuid, a December-import artefact, and nothing on the learner path reads it. (This is the provenance
join gotcha: joining `audio_uuid` to `course_audio.id` reads as "no provenance" and is wrong both ways.)

---

## Is the defect even real? Measured, with a control

The flag says "steep tail — cut rather than allowed to finish". I measured the energy in the last
150 ms against each clip's own 90th-percentile level:

| cohort | tail / p90 |
|---|---|
| **The 17 cym_n flagged clips** | **0.30 – 0.53** |
| Six unflagged cym_n narration clips (control) | 0.000 – 0.080 |
| A clean cym_s narration clip | 0.001 |

**The flag is right about the 17.** They stop with the voice still at ~40% of full level — the last word
is there, but its release is chopped. The control shows this is not how the cohort was mastered; it is
specific to these clips.

**The flag is wrong about the 18th.** cym_s `S0301L02` ends at **0.000** — a clean, fully-decayed tail.
It is not clipped.

### And S0301L02 has a different problem

Its stored text is the English lead-in — *"Okay, now, moving on, the way I want you to say "in you"
is:"* — but its **audio contains no English at all**: 8.2 s of *"Ynoch chi. Ynoch chi."* Eight other
cym_s narration clips sampled at random, including three with the same colon-ending lead-in form, all
match their text exactly. So this is a genuine one-row text↔audio misalignment from the import, not a
house style.

It also carries `voice_gender: 'f'`, which is what put it in **Catrin's** queue — on a clip whose voice
measures 155 Hz, male. The routing was wrong as well as the flag.

---

## Per line

Reachable = a learner in normal play would hear it. Heard = anyone actually has. **No learner has heard
any of these 18.**

| # | course | lego | seed / round | line | reachable | ever had audio | recommendation |
|---|---|---|---|---|---|---|---|
| 1 | cym_n | S0141L01 | 141 / 220 | are they? → ydyn nhw? | ✅ | ✅ human | **record** |
| 2 | cym_n | S0142L01 | 142 / 222 | the oldest → yr hynaf | ✅ | ✅ human | **record** |
| 3 | cym_n | S0144L01 | 144 / 225 | the girl → yr hogan | ✅ | ✅ human | **record** |
| 4 | cym_n | S0148L02 | 148 / 233 | one boy → un hogyn | ✅ | ✅ human | **record** |
| 5 | cym_n | S0153L01 | 153 / 241 | the youngest → y fenga | ✅ | ✅ human | **record** |
| 6 | cym_n | S0158L02 | 158 / 250 | in his thirties → yn ei dridegau | ✅ | ✅ human | **record** |
| 7 | cym_n | S0159L01 | 159 / 251 | as a teacher → fel athro / fel athrawes | ✅ | ✅ human | **record** |
| 8 | cym_n | S0161L03 | 161 / 255 | don't they? → tydyn nhw? | ✅ | ✅ human | **record** |
| 9 | cym_n | S0163L01 | 163 / 257 | to fly → hedfan | ✅ | ✅ human | **record** |
| 10 | cym_n | S0164L01 | 164 / 258 | when → pan oeddan nhw | ✅ | ✅ human | **record** |
| 11 | cym_n | S0232L02 | 232 / 374 | to give her → rhoi iddi hi | ✅ | ✅ human | **record** |
| 12 | cym_n | S0234L01 | 234 / 376 | if I asked you to help me → 'swn i'n gofyn i ti helpu fi | ✅ | ✅ human | **record** |
| 13 | cym_n | S0235L01 | 235 / 378 | to deal with → delio efo | ✅ | ✅ human | **record** |
| 14 | cym_n | S0235L02 | 235 / 379 | I wanted her to help you → o'n i isio iddi hi helpu chdi | ✅ | ✅ human | **record** |
| 15 | cym_n | S0245L02 | 245 / 394 | before she tells you → cyn iddi ddeud wrthot ti | ✅ | ✅ human | **record** |
| 16 | cym_n | S0248L01 | 248 / 398 | until → tan | ✅ | ✅ human | **record** |
| 17 | cym_n | S0252L02 | 252 / 404 | on Thursday → ddydd Iau | ✅ | ✅ human | **record** |
| 18 | cym_s | S0301L02 | 301 / 532 | in you → ynoch chi | ✅ | ✅ human | **keep** — see below |

### The b×s×c sentence for the 17: **record**

Better: they are the only Welsh narration measured as genuinely end-clipped, and every learner who
ever passes seed 141 hears every one of them. Simpler: they already ride the one recordist surface with
no new mechanism — it is seventeen lines, about fifteen minutes, in a session that is happening anyway.
Cheaper: seventeen re-reads now versus a permanent defect in a premium course, and no TTS spend is even
lawful here — Welsh is `human_only`.

**The timing is the point, though.** They go into a *later, named narration session* — not Aran's first
pods session, and not before you decide whose voice the Welsh narration is. Nobody is within 55 seeds
of hearing them, so there is no clock on this.

### The b×s×c sentence for S0301L02: **keep — retire the want, fix the text**

Better: it isn't damaged (clean tail, 0.000), so re-recording it fixes nothing, and cutting it would
delete a real course line ("in you" / "ynoch chi") that has correct audio. Simpler: retiring one
false-positive flag is one statement, versus staging a studio line nobody needs. Cheaper: free, against
a wasted take in a female voice for a male clip. What it *does* need is its **text** corrected to
describe its own audio — a separate one-row content fix, not a recording job.

---

## Decision candidates — logged, not acted on

1. **Whose voice is the Welsh narration?** Not attributable from the data: `voice_id='human'` is one
   untagged bucket and `recording_provenance` has nothing for any of these. All 18 measure male; the
   cym_n cohort sits a little lower than Aran's known pod takes. A human has to listen and say.
2. **493 Welsh narration rows end in a colon with no Welsh in the text** (228 cym_n, 265 cym_s) — the
   old app's "here comes the answer" form, where the Welsh arrived as a separate element. Three sampled
   clips of this form contain the lead-in **and no Welsh at all**, which on Popty's single-clip intro
   cycle means the learner hears a sentence that stops at "…is:". That is a bigger question than these
   18 and is untouched here.
3. **`lego_introductions.presentation_audio_id` is NULL for all 1,317 Welsh narration rows** while it is
   populated for 45,014 of 47,644 estate-wide. Harmless today — nothing on the learner path reads it —
   but it is a trap for the next person who joins on it.

---

## Explicit gaps

- **The old-app JSON is not on this machine.** It lived in `~/Downloads` on your Mac. No copy, archive
  or dump survives here, so no one can quote file-and-line for the 18 texts. The provenance above rests
  on the mapping doc, the importer source, the S3 upload dates and the row-level reconciliation — strong,
  but indirect.
- **The 2026-02-16 backfill script does not exist** in any commit, branch or working tree. Its mechanism
  is provable from the data it left; the script itself is gone.
- **There are no import job logs.** `content_audit_log` starts 2026-07-03 and records no INSERTs at all,
  by design — the Feb event could never have been logged there.
- **Whisper transcription of Welsh is unreliable** and was used only to establish that speech is present
  and matches, never to judge quality. The clipping verdict is an energy measurement, not a transcript.
- The entitled-learner cycles response was not driven end to end (no learner JWT minted). Reachability
  rests on the code path plus the unauthenticated proxy serving 200.

---

## Final verdict — Tom's ruling, 2026-08-16

**No TTS in the Welsh courses. All 18 are human recordings — the adversarial TTS-vs-human
verification is moot.** Tom read this trace and settled it; the two verification workers dispatched
to check TTS-vs-human independently (#789, #790) were disregarded as unnecessary once the ruling
landed.

Restored to the recording queues, exactly per the per-line table above:
- **The 17 cym_n lines: restored** — `held` unnested back to active, unchanged male/Aran casting.
  Landed as a **later, named narration session**, not Aran's first — they sit at the tail of his
  queue (indices 153-169 of 170), after all 153 pod lines, by the existing queue-ordering design
  (`course_audio` wants sort after pod lines; no new code needed). Verified live: Aran **153 → 170**.
- **cym_s `S0301L02`: retired, not restored** — the audio is correct and undamaged (clean 0.000 tail);
  re-recording it teaches nothing. Its `f` gender tag was the routing bug that put it in Catrin's
  queue, not a cast choice; retiring the want removes it from both queues. Catrin stays at 275 — no
  false-positive re-record land there. The text↔audio mismatch on this row is a **separate,
  logged follow-up** (one-row content fix), not acted on here.

Full restore detail: `welsh-narration-queue-hold-2026-08-16.md` (this directory), "RESTORED" section.

## Landing line

Commits are on **`fix/welsh-narration-queue-hold-2026-08-16`**, pushed to origin. The queue-hold write
(18 rows parked) and the restore write (17 restored, 1 retired) are both database state changes,
already live and verified on popty.app — nothing here needs deploying. Not yet merged to `main` as of
the hold commit; land status for the restore commits is in the branch's own history at push time.
