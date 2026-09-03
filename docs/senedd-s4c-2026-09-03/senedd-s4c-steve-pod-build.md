# Steve's Senedd/S4C pod — the whole floor, in session order

Built 3 September 2026 and revised twice the same evening on Tom's corrections:
first **the English lines are TTS, not Aran**, then **the 51 English-only
contributions are IN**. Source: the Welsh Parliament's own bilingual XML export
of the Culture, Communications, Welsh Language, Sport and International Relations
Committee, 11 January 2024, agenda item 8 — *Allegations concerning bullying at
S4C: evidence session with S4C*.

## The numbers

| | |
|---|---|
| Contributions spoken in the session | **160** — every one of them is in the pod |
| Lines in the pod | **567**, `global_order` 1…567, no gaps |
| Welsh lines (Aran reads these) | **399** — byte-identical to the first build, in the same order |
| English floor lines (TTS reads these) | **168**, from the 51 contributions spoken in English |
| Aran's Welsh recording queue | **384 before, 384 after. Zero English, before and after.** |

**383 Welsh lines. About 1 hour 20 minutes of actual reading.** Unchanged by any
of this. Real booth time — settling, re-takes, a breath between lines — is
realistically 2½ to 4 hours, so one long sitting or two comfortable ones. If he
would rather do it in bites, the opening of the session is a natural first slice.

## The 51 English contributions are in, and they are the QUESTIONS

The first build carried only the 109 Welsh contributions, which left answers with
no questions. The English-only turns are overwhelmingly the committee asking:

| speaker | English contributions |
|---|---|
| Chris Jones | 17 |
| Tom Giffard | 15 |
| Alun Davies | 11 |
| Carolyn Thomas | 4 |
| Delyth Jewell | 2 |
| Rhodri Williams | 1 |
| Hefin David | 1 |

Three holes closed, and they are worth reading in the pod itself:

- **contribution orders 259–273** — a thirteen-turn hole. The entire Alun Davies
  ↔ Chris Jones exchange about the grievance against the chair, the Capital Law
  report and the non-executives' confidence vote was missing; Rhodri's Welsh
  reply at 274 arrived out of nowhere. It now runs from "Can I talk to you,
  Chris?" straight through to Rhodri answering it.
- **order 327** — a Welsh line whose entire content is *"Sori, pam dwi wedi troi
  i'r Saesneg, dwi ddim yn gwybod"* ("Sorry, I don't know why I turned to
  English there"). The English speech it apologises for is order 326, which the
  pod did not contain. It does now, immediately before it.
- **orders 217–219** — Chris Jones's English addition, Tom Giffard's challenge
  and Chris Jones's reply, between two Welsh answers from Rhodri Williams. The
  Welsh either side used to run straight together.

**Nothing was translated.** Those rows carry the English actually spoken in
`known_text` and an **empty string** in `target_text`. That is deliberate twice
over: nothing was said in Welsh, so nothing is invented in Welsh; and a blank
target is exactly what keeps these lines out of a Welsh recording queue —
`recordist-queue.cjs` skips a sentence with blank `target_text` (`if (!text)
continue`). Measured before and after: 384 Welsh lines, 0 English, both times.

Tom Giffard and Hefin David are new speakers in the cast. They carry a `known`
voice and **no** `target` voice, on purpose: they only ever spoke English on this
floor, so there is no Welsh for Aran to read and no claim on him.

## The English voice moved off xAI

**You asked which provider that English pod voice actually resolves to. It was
xAI.** `gfzdpspr5fdp` — the estate's standard male English pod clone, the one
`fra_for_eng` and twenty other pods use for their known track — is
`tts_engine = 'xai'` in the `voices` table. So this pod would have been born on
the provider being deprecated.

It is now rendered on **`8fef4d59-0a7e-4ad2-a261-6a3bb50734d2`**
(display name `tom_001`), your own Cartesia clone: consent authorised
2026-09-01, and the only Cartesia Tom clone with production clips behind it —
91 `spa_for_eng` known clips. **Two other authorised Tom clones exist at
Cartesia, `Tom_002` and `Tom_003`, both cloned in the Voice Lab and neither used
for anything yet.** If your ear prefers one of those it is a one-line change in
`tools/pods/senedd/set-senedd-cast.sql` plus a re-render.

**567 English clips: 539 rendered, 25 reused, 3 in the probe, 0 failed.**
Durations 0.8s to 32.9s, mean 6.8 seconds. All 567 linked, all 567 on Cartesia,
none on xAI. 17 sampled by the veracity gate, 17 passed, mean CER 0.006. The
served bytes were fetched back out of S3 for four spot-checks and their
durations match the database exactly.

**A correction worth having.** This branch is 1,445 commits behind `main`, and
the Cartesia wiring I added to it to make the render possible **already exists on
`main`, done better**, since 2026-08-27 — eight dispatch sites in phase 8, a
provider policy that already names `tom_001` as your English-only clone, and
phonology gating. My grep found nothing because the checkout, not the estate, was
missing it. Nothing needs to land on `main` from that commit and it must never be
merged over what is there. One live consequence, now fixed: `main`'s
`generateCartesia` passes a cast's `voice_id` **straight to the vendor**, which
only knows the bare uuid, so the cast stores it bare. A prefixed id renders fine
on this branch and 400s under production code.

## The Welsh no-TTS guard is untouched

`cym_n_for_eng` still refuses Welsh TTS in every spelling (`cy`, `cy-GB`, `cym`,
`cym_n`), still refuses a call that names no language, and still permits exactly
one thing: the known half of the course's own code. The guard asks what LANGUAGE
the clip is, not which provider is rendering it, so moving to Cartesia changed
nothing about it. No Welsh was synthesised. Not one clip.

## The splitting

Unchanged for the Welsh: paragraph first, then sentence, and where the translator
merged or split a sentence, a small length-ratio alignment over 1:1 / 1:2 / 2:1
groupings only. Where that does not come out clearly good, the unit stays whole.
8 contributions needed that fallback. English-only contributions are split
monolingually — paragraph, then sentence — with no pairing to protect.

Nothing was translated, tidied, corrected or normalised. Splitting is the only
editing operation performed on the record's words.

## Where it is

- Pod `cym_n_for_eng:senedd-s4c-steve`, **visibility `held`**, and
  **`required_role = previewer_001`** — two independent structural locks, not a
  setting someone could flip.
- Aran reaches the Welsh at his existing link, `/r/human_aran_cym_n`.
- The rebuild was a DELETE + INSERT rather than an in-place renumber, because
  every ordering column moves when the English is interleaved and both
  `(pod_id, global_order)` and `(pod_id, scene_number, sentence_number)` are
  UNIQUE. Verified safe before the write, and only true of this pod: **zero**
  linked human takes, **zero** re-record wants, **zero** rows in
  `learner_pod_state`. Aran's "already recorded" status is derived from
  `course_audio` by text identity, never from these links, so no take of his
  could be lost by it. The pre-write snapshot is
  `senedd-s4c-steve-pre-bilingual-snapshot.json`.

## Still open, and still yours

1. **Which Cartesia clone.** `tom_001` is in use and authorised; `Tom_002` and
   `Tom_003` are authorised and unused. One word if you want a different one.
2. **The fleet.** `gfzdpspr5fdp` is the estate's default English pod voice, on
   the dying provider, well beyond this pod — see the census in the report.
3. **Steve's access.** `required_role = previewer_001` is on the pod but no grant
   is written: two learner rows match "Steve" and neither is obviously him.
   Somebody who knows which account is his does one INSERT into `learner_roles`.
