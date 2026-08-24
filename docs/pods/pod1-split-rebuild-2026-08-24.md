# Pod 1 split rebuild — per course

*2026-08-24. Nothing is running in the background; every number below is final.*

## Your question first

**"Have we just royally fucked this up? Because we didn't really know what the app itself was playing?"**

Yes — half of it, and that is the honest answer. This morning's repair was written without checking
the consumer. It correctly found that Pod 1's split arrays pointed at a retired pod's clips, and it
correctly NULLed them, which stopped the scrambled audio. But nobody opened
`podSentenceSplit.ts` to see what the player does with a NULL array, and what it does is fall
straight back to serving the whole turn as one block. So the repair swapped a loud fault for a quiet
one and reported itself clean, because it only ever checked the database against itself. The lesson
is narrow and specific: a content change to a live pod is not verified by re-reading the rows you
wrote — it is verified by reading the code that consumes them, and then by listening. The good news
is that the damage was confined to *granularity*. The whole-turn audio was never wrong: I checked
all 231 Italian rows and 231 of 231 target clips and 231 of 231 known clips speak exactly their own
row's text. Learners have been hearing the right words, badly packaged.

## What I found that the brief did not predict

**The rebuild is a render job, not a relinking job.** The brief expected most of this to be free
relinking. It is not. Pod 1 never had its own per-sentence clips rendered at all — the arrays it
carried were always pointing at another pod's clips, which is the bug we removed. Across the 21
non-Italian courses, only **15 turns out of 1,516** can be relinked without paying for TTS. I have
done all 15; they are ungated and they are landed.

**`atom_map_fine` was inherited too.** The split arrays were not the only thing copied positionally.
On `ita_for_eng:pod-1`, 27 of 141 fine maps do not walk their own row's text, and some describe a
different turn entirely — row SC15's "Quanto costa?" carries a fine map about politely asking to
practise Italian. The tool used to fail those rows. It now falls back to splitting the row's **own
text** on the app's own sentence boundary, which keeps the rule the brief set: derive from this row,
never from another pod's data.

## Italian — done, and verified live

| | |
|---|---|
| Multi-sentence turns | 100 |
| Already correctly split (left alone) | 31 |
| **Rebuilt today** | **69** |
| Clips newly rendered | **311** |
| Clips reused with no TTS call | 45 |
| Failed | 0 |
| Still unsplit after the run | 1 |

The one residual is `SC6-S7` — *"Questa è una città bellissima. Cosa fai?"* — whose fine map treats
the turn as a single unit. It plays as a block; it is two short sentences and it is the only one
left in the course.

**Verified through the production path**, not S3:

- Every clip 200s through the learner proxy at `saysomethingin.app/api/audio/<id>` and through
  `ssi-learning-app.vercel.app`, `audio/mpeg`, and the five scene-15 clips are five genuinely
  distinct files (distinct md5s, durations 0.94s–1.32s) — not one file served five times.
- Each clip's stored text is exactly one sentence of its own row's text, and every clip carries a
  voice that is in that pod's declared cast. Sampled scenes 6, 9, 12, 14, 15: James renders on
  `x7avnu1k`, Anna on `ara`, per-speaker, as cast.
- All 99 split rows agree with the app's own boundary regex — clip count equals the number of
  sentence parts the main-flow scheduler will show, so text and audio cannot misalign in either
  door. This mattered: the scheduler splits text *without* the clip-text oracle the overlay uses.
- The app's own tests pass — 99 of 99 across `podSentenceSplit.test.ts` and
  `usePodLapScheduler.test.ts`.

Tap to hear the split working — scene 15's numbers drill, now five separate clips instead of one block:

https://saysomethingin.app/api/audio/ace04101-930a-47f8-b79d-1fbb74c44827

https://saysomethingin.app/api/audio/c5c0c02a-57b0-4f6d-8b12-c57723d9d819

https://saysomethingin.app/api/audio/e77c75b5-22c1-41df-b555-7381eb74adff

**On caching** — you were right to suspect it, but it should not stand in your way here. The player
fetches these rows live from Supabase on every session; the IndexedDB snapshot is only a fallback
for when that fetch fails, and only exists if you deliberately downloaded the course offline. The
`audio_revision` trap does not bite either, because these are brand-new clip ids, not re-renders
behind old URLs. If Italian still sounds like one block on your phone, force-reload once — and if it
*still* does, tell me, because that would be a real finding and not a cache.

## The other 21 — stopped at the spend gate, awaiting one word

The fleet dry run costs nothing and it says: **1,516 turns to rebuild, 7,297 clips genuinely new,
about 15× the 500-clip bar I was told to stop and ask at.** So I stopped the render leg and put a
card in front of you. Roughly 380,000 characters of TTS — single-digit to low-tens of dollars — and
2–3 hours of wall clock at safe concurrency. **My recommendation is yes, do all 21**: the fault is
learner-facing on every one of them, the whole-turn audio is verified correct so this is purely a
granularity fix, and nothing is deleted, so the worst case is a few dollars spent and learners keep
exactly what they have today.

| Course | Multi turns needing a split | Rebuilt today (free) | Clips rendered | Clips reused | Awaiting your yes | New clips if approved |
|---|---|---|---|---|---|---|
| ita_for_eng | 100 | **69** | **311** | 45 | 0 | — |
| ara_eg_for_eng | 60 | 0 | 0 | 0 | 60 | 310 |
| ara_for_eng | 100 | 0 | 0 | 0 | 100 | 519 |
| deu_at_for_eng | 100 | 0 | 0 | 0 | 100 | 540 |
| deu_for_eng | 100 | 0 | 0 | 0 | 100 | 535 |
| eus_for_eng | 35 | 3 | 0 | 16 | 32 | 150 |
| fra_ca_for_eng | 63 | 0 | 0 | 0 | 63 | 295 |
| fra_for_eng | 100 | 0 | 0 | 0 | 100 | 528 |
| gle_for_eng | 33 | 1 | 0 | 4 | 32 | 134 |
| hin_for_eng | 8 | 1 | 0 | 2 | 7 | 22 |
| hrv_for_eng | 112 | 0 | 0 | 0 | 112 | 437 |
| isl_for_eng | 52 | 1 | 0 | 4 | 51 | 221 |
| jpn_for_eng | 103 | 0 | 0 | 0 | 103 | 426 |
| kor_for_eng | 82 | 4 | 0 | 23 | 78 | 350 |
| nld_for_eng | 58 | 0 | 0 | 0 | 58 | 272 |
| por_br_for_eng | 80 | 0 | 0 | 0 | 80 | 401 |
| por_for_eng | 57 | 0 | 0 | 0 | 57 | 295 |
| ron_for_eng | 29 | 1 | 0 | 4 | 28 | 133 |
| spa_for_eng | 81 | 3 | 0 | 18 | 78 | 385 |
| spa_mx_for_eng | 100 | 0 | 0 | 0 | 100 | 511 |
| swe_for_eng | 100 | 0 | 0 | 0 | 100 | 519 |
| zho_for_eng | 63 | 1 | 0 | 4 | 62 | 314 |
| **Total** | **1,616** | **84** | **311** | **120** | **1,501** | **7,297** |

Zero failures anywhere. Nothing was deleted at any point, and no whole-turn clip was touched.

## Learner progress — handled, in the same transaction

Splitting a row moves its progress key from `<row_id>` to `<row_id>:s<n>`, so `learner_pod_state`
has to move with it or learners silently lose what they had heard. Across the whole fleet there were
49 progress rows sitting on slots I was about to split — small, but real.

I carried them forward rather than dropping them, and the reason matters: protocol rule 6 drops a
changed sentence because crediting someone for the unheard is the harm being avoided, but nothing
changed here. This is a change of *granularity*, and the whole-turn clip was verified to speak
exactly this row's own text, so a learner with N exposures of the turn has genuinely heard each of
its sentences N times. The carry is `GREATEST`-guarded, so rule 7 — progress cannot go backwards —
holds by construction rather than by care. Carry and delete commit in one transaction, snapshotted
to a log first and reversible from it (rule 8). Applied: Italian 2 rows onto 4 slots, Basque 1 row
onto 2 slots. Every other changed course had none.

## Explicit gaps — things I could not do or did not do

1. **The 21 courses are not fixed.** 1,489 multi-sentence turns across them still play as one
   block right now. That is the spend gate doing its job, not an oversight, but it is real and it is
   learner-facing today.
2. **Italian `SC6-S7` is still unsplit** — its fine map calls the two-sentence turn one unit.
3. **`atom_map_fine` is corrupt on Pod 1 beyond the rows I touched.** I worked around it with the
   own-text fallback, but the underlying data is still wrong — it feeds the fusion/drill ladder,
   which I have not audited. This deserves its own job.
4. **I could not verify by ear or by transcript.** `word_boundaries` is empty on these clips (it is
   an Azure feature and these are xAI voices), and whisper on this box is unreliable on clips this
   short. My verification is text, voice-cast, distinct bytes and production-path reachability —
   strong, but not a listening test. The clips above are for your ear, which is the real gate.
5. **Concurrent sessions were writing while I measured.** Two courses' linked counts moved by one
   row between my first and last census. Nothing I wrote is affected, but the fleet numbers are a
   snapshot of a moving database.
6. **Whole-turn defects deliberately skipped, per your standing decisions**: the Spanish
   gender-agreement rows (`spa_for_eng` s16/2, s19/2, s22/1, s22/5, s22/9, s22/11; `spa_mx_for_eng`
   s22/1, s22/5, s22/9, s22/11) and the `xai_ara` Italian voice instability. Both await your rulings.
7. **A branch collision.** Another session was committing on the branch name I had taken and moved
   HEAD under me, so my commit landed on `fix/ita-pod1-scene15-rootcause-2026-08-24`. I pushed the
   commit by hash to a uniquely-named branch rather than rewriting a branch other sessions are
   standing on. Nothing was lost; the commit exists on both.
