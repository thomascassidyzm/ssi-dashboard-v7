# Sinhala (eng_for_sin) — the 27 broken presentation clips, repaired text-first

**2026-08-18.** Kai's ruling: fix the text first, then re-record from the corrected text.

## Lead numbers

| | |
|---|---|
| Rows actually broken when I started | **27 of 27** — none had been fixed |
| Texts corrected | **26** (via already-rendered clean text; 0 new text writes needed) |
| Cards now correct and verified live | **26** |
| Clips re-recorded | **0** |
| Clips relinked (no spend) | **26** |
| Actual spend | **~$0.002** — 3 Azure attempts on one clip, all refused by the veracity gate, nothing delivered |
| Still broken, awaiting your word | **1** — `S0225L01`, seed 225 |
| Same defect found beyond the 27 | **147 more presentation clips**, and it starts at seed 1 |

**The course is `eng_for_sin`, not `sin_for_eng`** — English taught to Sinhala speakers. The narration is Sinhala (the learner's own language); the thing being taught is English.

## What I found, versus what I was told

I was told a couple of cards might still point at bad clips and that clean re-renders might already exist. I re-established all of it from the live database rather than trusting it. The real state was worse:

- **All 27 were still broken and still linked.** Not "a couple" — every one. Each still pointed at its original 2026-04-15 clip, `audio_revision`=1, text byte-identical to the corrupt original.
- **26 clean replacements did exist**, rendered 2026-08-17, sitting in `course_audio` with **zero links pointing at them**. The render leg had run; the relink leg had never landed.
- **`S0225L01` had no replacement at all.**

So the count was still 27, and the fix was mostly a relink, not a re-record.

## What was actually wrong — it was the text, and I can prove it

Every presentation clip in this course follows one exact template:

```
ඉංග්‍රීසිෙන්. '<SLOT1>'. '<SLOT2>' ඉතින්. :
```

Across 1,241 reachable presentation clips: **1,170 have SLOT1 byte-identical to the card's `known_text`**, and **282 have an empty SLOT2**. So SLOT1 must equal the card, and an empty SLOT2 is normal and well-precedented — 23% of the course already ships that way.

On the 27, two things were wrong:

- **24 of 27 announced the wrong phrase in SLOT1** — the card teaches one thing, the voice says another.
- **27 of 27 had gibberish filler in SLOT2** — the meaningless token `ඒ ගෙ` repeated three to nine times.

This is not inference. Every one of the 27 clips carries `word_boundaries` — Azure's own record of what it spoke, word by word with timings. **27 of 27 spoke the filler.** The worked example:

| | |
|---|---|
| Card `S0197L02` (seed 197) teaches | ගුරුවරයෙක් හැටියට වැඩ කරනවා — *"works as a teacher"* |
| The clip it pointed at actually spoke | `ඉංග්‍රීසිෙන් . 'පුතා '. 'මගේ පුතා ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ' ඉතින් . :` |
| i.e. the learner heard | *"my son"* — then five repeats of a nonsense syllable |

Re-recording that text would have faithfully reproduced "son". Your ruling was right.

**The card text itself is clean.** I checked all 1,300 `course_legos` rows in the course: **0** carry the filler or the pronoun corruption. The damage is confined to the narration script in `course_audio`. That is why 26 of these needed no text write at all — the corrected text already existed on the replacement rows.

## The 27, row by row

`SLOT1 was` = what the voice announced. `SLOT1 now` = what it announces after the fix.

| Seed | LEGO | Card teaches (Sinhala) | = English | SLOT1 was | SLOT1 now | Outcome |
|---|---|---|---|---|---|---|
| 178 | `S0178L01` | මට වෙලාවක් තිබුණේ නෑ | I didn't have time | හැබැයි | මට වෙලාවක් තිබුණේ නෑ | relinked `83f8d45c` |
| 178 | `S0178L02` | ඔයාව දකින්න ඕනේ වුණත් | although I wanted to see you | මමා ළඟ ටයිම් නොතිබුණා | ඔයාව දකින්න ඕනේ වුණත් | relinked `67e9ab8d` |
| 180 | `S0180L01` | මගේ පොත කියවන්න | to read my book | කියවන්නයි | මගේ පොත කියවන්න | relinked `424cb5d5` |
| 181 | `S0181L02` | මගේ අම්මව එක්කගෙන යන්න | take my mother | අරගෙන | මගේ අම්මව එක්කගෙන යන්න | relinked `9f0c7c60` |
| 184 | `S0184L02` | ටිකක් කලින් | a while ago | ටිකක් කලින් | ටිකක් කලින් | relinked `6fbc12e6` |
| 194 | `S0194L01` | ඔයා හොයන්නේ | are you looking for | හොයන්නේ | ඔයා හොයන්නේ | relinked `163d99ba` |
| 196 | `S0196L02` | ඔයා අහලා තියෙනවාද | have you heard | අලුත්ම | ඔයා අහලා තියෙනවාද | relinked `44724583` |
| 197 | `S0197L02` | ගුරුවරයෙක් හැටියට වැඩ කරනවා | works as a teacher | පුතා | ගුරුවරයෙක් හැටියට වැඩ කරනවා | relinked `a99a2bad` |
| 198 | `S0198L01` | මගේ දුව | my daughter | මමා ගේ දුව | මගේ දුව | relinked `b5e8dee9` |
| 198 | `S0198L02` | සභාව වෙනුවෙන් වැඩ කරනවා | works for the council | ඒ ගෙ ඒ ගෙ | සභාව වෙනුවෙන් වැඩ කරනවා | relinked `38c90897` |
| 201 | `S0201L01` | මොකද වෙන්න යන්නේ | what was going to happen | මොකද වෙන්නේ කියලා දැනගන්නයි | මොකද වෙන්න යන්නේ | relinked `1cf4e3c4` |
| 202 | `S0202L01` | කාටවත් විශ්වාස තිබුණේ නෑ | nobody was sure | ප්‍රශ්නෙ | කාටවත් විශ්වාස තිබුණේ නෑ | relinked `c0a252a4` |
| 202 | `S0202L02` | ප්‍රශ්නෙට උත්තර දෙන්න | answer the question | විශ්වාස | ප්‍රශ්නෙට උත්තර දෙන්න | relinked `39b42259` |
| 203 | `S0203L01` | ඔයා මොකද කරන්නේ | what would you do | ඉල්ලුවොත් | ඔයා මොකද කරන්නේ | relinked `2cea71ac` |
| 204 | `S0204L01` | කටයුතු හදාගන්න | to deal with the arrangements | සම්බන්ධව | කටයුතු හදාගන්න | relinked `a7e2bf94` |
| 206 | `S0206L01` | අවස්ථාව | the chance | අවස්ථාව | අවස්ථාව | relinked `dd5c5936` |
| 207 | `S0207L01` | ඔයා කරලා තියෙනවා | you've done | ඔයා කරලා | ඔයා කරලා තියෙනවා | relinked `5b97734c` |
| 210 | `S0210L01` | ප්‍රශ්නේ ගැන සාකච්ඡා කරන්න | to discuss the problem | සාකච්ඡා | ප්‍රශ්නේ ගැන සාකච්ඡා කරන්න | relinked `9254cadf` |
| 214 | `S0214L01` | ඔයාට ලැබුණාද | did you have | ලැබුණා | ඔයාට ලැබුණාද | relinked `9b42be65` |
| 214 | `S0214L02` | හොඳ ටයිමක් | a good time | සති අන්තේ | හොඳ ටයිමක් | relinked `9252de60` |
| 218 | `S0218L01` | මම ගොඩාක් දේ කළේ නෑ | I didn't do much | මමා ඉරිදා ගොඩාක් දේ කළේ නෑ | මම ගොඩාක් දේ කළේ නෑ | relinked `6d213d64` |
| 225 | `S0225L01` | උත්තරයක් | an answer | ඔයාට දෙනවා | — | **BLOCKED** |
| 230 | `S0230L01` | ඔයා එක්ක වැඩ කරන්නයි කැමති | who wants to work with you | කැමැති | ඔයා එක්ක වැඩ කරන්නයි කැමති | relinked `295996ef` |
| 231 | `S0231L01` | මහලු | old | මහලු | මහලු | relinked `3896c1ba` |
| 249 | `S0249L01` | මට ඕනේ ඔයා | I want you to | මමා ඔයාට ඕනේ | මට ඕනේ ඔයා | relinked `07ec5f1f` |
| 260 | `S0260L01` | කිසිම අදහසක් | the faintest idea | කිසිම | කිසිම අදහසක් | relinked `bbe31976` |
| 261 | `S0261L01` | ඒක වෙන්න පුළුවන් | it might be | වෙන්නට ඕනේ | ඒක වෙන්න පුළුවන් | relinked `7a80db13` |

## How each fix was checked before it went live

I checked all 27 individually — no sampling.

**Context, per row.** For every one I pulled the seed it belongs to, every sibling LEGO in that seed, and the seed's full sentence. The corruption turned out to have a shape: SLOT1 was usually stolen from a *neighbouring* LEGO. `S0197L02` got seed 197's *other* LEGO ("my son"); `S0225L01` got `S0225L02`'s ("he would give you"); `S0214L02` got `S0214L03`'s ("at the weekend"). A mis-indexed generation pass in April, not random noise.

**The other audio slots are fine.** I checked `known_audio_id`, `target1_audio_id` and `target2_audio_id` on all 27 against the card text: **0 mismatches**. Only the presentation slot was damaged. (One false alarm I chased down and cleared: four clips *tagged* `lego_id='S0225L01'` say "give you". They are stale tags on retired rows, not links — the card's real links are correct. `course_audio.lego_id` records which chunk a clip was cut for, not what plays.)

**Vocabulary.** 11 of the 26 replacements carry an authored example sentence in SLOT2 rather than leaving it empty. For each I checked (a) that the sentence actually contains the LEGO it is illustrating and (b) every word against the course's own Sinhala corpus up to that seed — 13,687 rows of LEGO, seed and phrase text. **11 of 11 contain their LEGO; 11 of 11 have zero out-of-corpus words.** Honest caveat: that check is partly tautological, since the sentences were drawn from the corpus in the first place. A non-zero result would have been a red flag; zero is confirmatory, not proof of grammaticality. See *Needs a native reader* below.

**The assets, before touching any link.** Make-before-break: I fetched all 26 replacements through the live learner route before changing anything. **26/26 HTTP 200, non-zero, and ffprobe duration matching the database row exactly — delta 0 ms on every one.** Same voice as the incumbents (`azure_si-LK-SameeraNeural`, uniform across all 2,355 presentation clips in the course, so there is no voice drift). Every replacement is shorter than the clip it replaces, consistent with the filler being gone.

**The relink itself** was guarded — each update required the old clip id to still be in place, so a concurrent change would have aborted rather than overwritten. 26/26 guards matched. Nothing was deleted; all 27 original rows are untouched and still in `course_audio`.

## Verified against what the app actually serves

Not against the database's opinion of itself. I replicated the player's own resolution path — an anon-key PostgREST read of `course_legos.presentation_audio_id`, which is step 1 of `loadIntroAudio` and the single source of truth for which clip plays — then fetched the resulting clip through the live audio route and probed the bytes.

**26 of 27 PASS**, on all four checks at once: SLOT1 now equals the card text, no filler remains, the live route returns HTTP 200, and the served audio's measured duration matches the linked row.

The one FAIL is `S0225L01`, covered below.

Two things I confirmed rather than assumed:
- **`courses.content_stamp` moved** (2026-08-17T15:01 → 2026-08-18T15:40). That is the key the player compares to decide a cached script is stale, and the trigger fires on *any* `course_legos` update — so learners holding a cached script will revalidate. Without it the fix would have been invisible to anyone who had already played the course.
- **`lego_introductions` holds no rows for any of the 27**, so `course_legos` was the only link needing a change. (It has 742 rows for this course, but it is a fallback that only fires when step 1 can't resolve — which never happens here.)

## The one still broken: S0225L01, seed 225 — and why

`S0225L01` teaches **උත්තරයක්** — *"an answer"*. Its clip says **'ඔයාට දෙනවා'** — *"give you"* — then `ඒ ගෙ` six times. It had no pre-rendered replacement, so it was the only row in this job that genuinely needed TTS.

I sent the corrected text to the purpose-built route. **The veracity gate refused it three times and quarantined it.** It reported hearing `අපින්න්න්න්න්න්න්න්...`.

**That refusal is a false negative, and I can show it.** The gate verifies a render by decoding it with whisper and comparing. I ran the same whisper, the same model, against Sinhala clips whose content is *independently known*:

- 6 replacement clips, `ggml-small` → every one decoded as `අපි අපි අපි අපි` or `අපින්න්න්න්...`
- 3 clips on the larger `ggml-medium`, including **the corrupt `S0197L02` clip whose exact spoken words are on record in `word_boundaries`** → degenerate repetition again. Whisper did not recover a single word it is known to contain.

Whisper has **zero discriminating power on this voice**. It fails identically on good clips and bad ones. The gate is not detecting a problem with the audio; it cannot read Sinhala at all.

The cause is structural: `audio-veracity.cjs` maps `sin: 'si'` in `WHISPER_ISO1`, and **there is no capability guard** — being in that map is what switches the gate on for a language, with nothing checking whether the decoder actually works there. So for Sinhala the gate fails 100% of the time, which means **every gated single-clip repair route is currently blocked for this language**.

**This is your call, not mine.** I have approval to spend pennies; I do not have approval to route around a production safety gate, and turning it off globally has broken the render path before. Three options:

1. **Leave it.** One learner-facing card stays wrong. It has been wrong since April; it is no worse than yesterday.
2. **Add a capability guard** so the gate skips languages where whisper is not competent, rather than hard-failing them. Fixes the class, not just this clip — but it is a change to a safety mechanism and wants its own review.
3. **Render this one clip through an ungated path.** Fastest, but it is exactly the "assume the render was fine" move the gate exists to prevent — and for Sinhala I would have no way to verify the result either.

I did not guess. The row is byte-identical to its pre-attempt state — I verified the text, duration, `s3_key` and veracity columns are all unchanged, so there is no audio/text desync and no orphaned link. The gate failed before the database write and rolled back cleanly.

**Cost of the attempt: 3 Azure renders of a 37-character line, roughly $0.002. Nothing delivered for it.** That is the entire spend of this job.

## The same defect, well beyond the 27

You asked me to find it elsewhere and report rather than fix silently. I have not touched any of the following.

I ran my own census over all **1,241** reachable presentation clips (my anchor numbers — 1,241 total, 1,170 SLOT1-matches, 282 empty SLOT2 — were independently reproduced by a second agent, job #117):

| Defect | Count still live |
|---|---|
| SLOT1 ≠ card text — voice announces the wrong phrase | **48** (includes `S0225L01`) |
| Clear `ඒ ගෙ` filler | **6** (includes `S0225L01`) |
| Doubled-**ම** pronoun corruption (`මමට`, `මමා`, `මමතා`) | **117** |
| **Union — distinct clips still defective** | **148** (of which 147 are outside the approved 27; the 148th is `S0225L01`) |

**The pronoun corruption starts at seed 1.** `S0001L01` teaches මට ඕනේ ("I want") and the voice announces **මමට ඕනේ** — an extra ම. Seeds 1, 2 and 3 all carry it in their example sentences. Every learner of this course hears it in the first minute. It is one character, and it is the most-heard defect in the course.

Worked examples of the wrong-phrase class:

| Seed | LEGO | Card teaches | Voice announces |
|---|---|---|---|
| 69 | `S0069L02` | තරුණ (*young*) | ලිහිල්ල |
| 116 | `S0116L02` | වෙනස (*change*) | ෙවෙනස |
| 131 | `S0131L01` | ගේ හිසේ | හිස |
| 147 | `S0147L02` | කලබල | ළිහිල් නෑ |

**Four of the seeds I just repaired still contain a broken sibling card.** The approved 27 was scoped by clip, not by seed, so a learner reaching seed 197 still meets a broken card next to the fixed one:

| Seed | I fixed | Still broken | What the broken one announces |
|---|---|---|---|
| 184 | `S0184L02` | `S0184L01` | `'ඒවා ඔෆිස් එකේ ඒ ගාවෙ ඒ ගෙ දැක්කා'` |
| 196 | `S0196L02` | `S0196L01` | `'ඔයා ඒ ගෙ ගැන'` |
| 197 | `S0197L02` | `S0197L01` | `'ගේ ඒ ගෙ වැඩ'` |
| 207 | `S0207L01` | `S0207L02` | `'ඒ ගෙ ඕනේ කළේ ඒ ගෙ ඒ ගෙ'` |

If you want a second pass, **seed-complete rather than clip-scoped** is the shape I would ask for.

## Needs a native reader — I am not guessing

You don't read Sinhala and neither, reliably, does anything on this machine. Three things I will not rule on:

1. **`ඒ ගාවෙ` may not be a defect.** In the 27 it appeared inside runs of `ඒ ගෙ` and was clearly filler. But elsewhere it sits in semantically plausible slots — `ඒ ගාවෙ කතා` glossed as *"talk with them"* — and ගාව means *near*, so it may be a clumsy-but-intended rendering of "with them". **24 practice-phrase rows and 3 presentation clips (all seed 146) turn on this one question.** I counted them separately from the 117+48+6 above rather than inflating the number. My raw SQL matched 43 practice-phrase rows; 19 of those were `ඒ ගෙදර` ("that house") — legitimate, and excluded.
2. **The 11 authored example sentences** pass containment and corpus checks but have not been read by a Sinhala speaker for grammaticality. e.g. `S0198L01`: *මම අද මගේ දුවව දැක්කා*. Note it inflects the LEGO (මගේ දුව → මගේ දුවව); that is presumably correct accusative, but it is a judgement I am not qualified to make.
3. **`ඉංග්‍රීසිෙන්` may be misspelled course-wide.** The standard form is ඉංග්‍රීසි**ය**ෙන් — the narration appears to be missing a ය. It reads identically in all 1,241 clips including every healthy one, so it is either correct-in-colloquial-usage or a defect baked into every presentation in the course. **I did not touch it.** If it is wrong, it is the single highest-volume text defect in `eng_for_sin`.

## Gaps, stated plainly

- **I could not verify by ASR what any Sinhala clip says.** Whisper is unusable for this language at both model sizes, as shown above. For the 26 relinked clips my evidence is: correct text on the row, correct voice, alive through the live route, and exact duration match — strong, but not word-level proof. The asymmetry is what justifies the change: the incumbents are *proven* wrong by `word_boundaries`; the replacements are unproven but correct by construction. Relinking strictly improves the learner's position.
- **The 26 replacements carry no `word_boundaries` and no veracity verdict.** They were rendered 2026-08-17 through a path that did not record either, so the proof available for the corrupt clips is not available for their replacements.
- **A stale-tag hazard I chose not to touch.** Each of the 26 retired clips still carries its `lego_id`, so two `course_audio` rows now share each tag. This does not affect the learner — the player resolves by link, step 1, and the code documents exactly this trap from the Greek incident of 2026-08-11. But `phase8`'s own `/regenerate-presentation` looks a row up with `.eq('lego_id', …).maybeSingle()`, which will now fail for these 26 LEGOs. **The next person to regenerate one of these presentations will hit it.** I left it alone because clearing tags means writing to `course_audio`, which fires the `audio_autolink` and canonical-identity triggers, and the hazard is operational rather than learner-facing. Worth a follow-up.
- **The wider census is text-based**, from `course_audio.text` and `word_boundaries`. I did not listen to the 147.

## What I did not do

No audio row was deleted. No clip was deleted. No text was written to `course_audio` or `course_legos` — the 26 corrections were achieved by pointing each card at a row that already carried the correct text. Nothing outside the 27 was changed.
