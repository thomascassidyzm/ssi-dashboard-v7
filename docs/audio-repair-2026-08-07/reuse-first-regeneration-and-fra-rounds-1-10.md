# Reuse-first regeneration — built, and run on French rounds 1–10

2026-08-07. Read-first summary, then the numbers, then what needs you.

---

## The headline

**Nothing needed rendering. Not one clip. £0 spent.**

The first 10 rounds of `fra_for_eng` are 107 cycles, 321 clip plays, **169 distinct clips**. The new
capability set every one of them aside, asked your question of each — *does this voice × text ×
language already exist?* — and got:

| | clips | |
|---|---|---|
| already correct, already linked | **168** | nothing to do |
| existed elsewhere, reused | **1** | copied in from `kor_for_eng`, no new audio |
| genuinely missing, rendered fresh | **0** | — |
| **cost** | **£0.00** | no TTS call was made |

Then it asked S3 whether the bytes are really there, because a database row is a claim and only
storage settles it. **169 of 169 alive**, 7.2 KB to 61 KB, median 16 KB. Nothing silent, nothing
truncated to a stub.

After the run, a fresh plan reads **169/169 already correct**. The delta is exactly the one action
logged — nothing else moved.

**Nothing was deleted. Not a row, not an object.** The clip that got replaced is still sitting
there untouched, and its id is in the log if you ever want it back.

---

## The Quebecois lead you asked about — the answer is zero

You said the intros *may* already exist in the Quebecois course, same known language, same target
language name. I checked it directly and had it independently checked.

**`fra_ca_for_eng` supplies zero usable clips for `fra_for_eng`, on every single role.** Not
because the texts don't match — they match a lot — but because the two courses have never once
shared a voice:

| role | texts that overlap | usable under same-voice | why |
|---|---|---|---|
| presentation (the intros) | 762 | **0** | fra is Eve; fra_ca is your clone + Azure Sonia |
| known (English) | 8,054 | **0** | fra_ca never used Eve, under any spelling |
| French target1/target2 | 14,466 pairs | **0** | fra_ca is Azure Sylvie/Antoine; fra is Eve/Leo |

So the instinct was right that the *words* are already there. They're just in someone else's mouth,
and borrowing them would have been a voice change made by a script rather than by you.

**Where the real reuse pool is**, for when we do this at full course scale: **3,625** of
`fra_for_eng`'s English texts already exist elsewhere in the estate on the exact same Eve voice —
mostly `spa_for_eng` (2,687), `kor_for_eng` (1,864) and `jpn_for_eng` (1,787). That is the pot the
full French run will draw on, and it is worth thousands of clips we would otherwise pay to
re-render.

---

## What to go and listen to

**popty.app/production/fra_for_eng/pipeline** — and the Audio Preview tool.

Play rounds 1 to 10 straight through. Ten LEGOs: *I want · to speak · French · with you · now · to
learn · I'm trying to · I'm trying to learn · how · often*.

One honest caveat, and it matters: **everything above proves the clips exist, are on the right
voice, and have real bytes. None of it proves they sound good.** Artefacts, clicks, a swallowed
word — no automated check here hears those. That is exactly what your manual play-through is for,
and it is the only step that can pass or fail this. Give Leo's fast layer the hardest listen; you
said his hit rate is the weaker one and he is still carrying target2.

---

## The new capability, and how you launch it next time

It is called **reuse-first regeneration**, it lives inside the phase-8 audio services, and it is on
the pipeline page as a panel with a rounds box and two buttons.

- **Plan (dry run)** — always safe, generates nothing, writes nothing, costs nothing. Shows the
  five buckets in plain English, the cycles/clip-plays/distinct-clips shape, and the render cost in
  clips and characters *before* anything can be spent.
- **Generate missing clips** — the money one. Requires typing the course code. Relinks everything
  reusable first, then renders only what is genuinely missing.

It is not hardcoded to French or to ten rounds. Point it at `deu_for_eng` with rounds 10 and it does
the same thing. That is the template process for the full French-then-German redo.

Four rules are built into it and held by 34 unit tests, so they can't quietly rot:

1. **It counts what a learner hears**, by running the real round generator — never by counting rows
   in `course_legos`. That miscount is what put us here.
2. **The course content decides what a clip says.** It never re-renders from a clip's own old text
   snapshot, which is structurally incapable of fixing a clip whose words are wrong.
3. **It never crosses a voice boundary.** Not for Azure, not for a regional accent, and — this one
   matters — not even for `eve` versus `xai_eve`, which are almost certainly the same voice. "Almost
   certainly" is a taste call, so it asks rather than assumes.
4. **Make before break.** Bytes proven in storage, new row created, and only then does the link
   move. There is no delete path in the module at all, and a test counts the deletions to prove it.

**On the click-removal pass that started all this**: I looked for it in the live phase-8 path. It is
already gone — the tail-repair that trimmed clips was deleted from `audio-processor.cjs`, and what
remains only *flags* a suspect tail and ships the clip exactly as rendered. Phase 8 today does
loudness normalisation and nothing else. That is the right state and I changed nothing about it.

---

## The one thing I actually changed in the course

Round 2 plays the English *"I want to speak"*. Its clip was the only one of the 53 English clips
sitting on the old bare `eve` voice id while its 52 siblings were all on `xai_eve`. I pointed it at
an existing Eve recording of the same words from `kor_for_eng` — same voice, zero spend, old clip
left in place. You will not hear a difference; the point is that the layer is now consistent with
what the course says its voice is.

---

## Needs you

**One decision: are `eve` and `xai_eve` the same voice?**

The estate carries both spellings — `eve` is the legacy id from before we started prefixing with the
provider. If they are the same voice, an extra **2,317** English texts (almost all from
`deu_for_eng`) join the reuse pool for the full French run, and the same duality will apply to
German. If they aren't, borrowing across them would be a voice change.

The tool currently refuses to treat them as equal unless told to, and tags every clip that reuses
through the assertion, so it is reversible either way.

**My recommendation: yes, treat them as one voice.** They are the same xAI voice under two id
conventions, the equivalence is recorded and auditable per clip, and it is worth thousands of clips
of avoided spend on the full run. One word: yes or no.

---

*Artifacts: the full per-clip decision log for this run is in the repo at
`docs/audio-repair-2026-08-07/fra_for_eng-rounds1-10-reuse-{dryrun,applied}-log.json`, and the
estate census at `docs/audio-repair-2026-08-07/quebecois-and-estate-reuse-census-2026-08-07.md`.*
