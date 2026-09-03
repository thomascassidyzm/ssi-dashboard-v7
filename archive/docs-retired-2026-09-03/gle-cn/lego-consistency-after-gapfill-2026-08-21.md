# Connemara — LEGO consistency and `is_new` check after the gap-seed fill

**Course:** gle_cn_for_eng · **Date:** 21 August 2026 · **Scope:** all 766 LEGO rows, seeds 1–300, no sampling.

## What I waited for

The four gap builders (#699 seeds 30–37, #700 seeds 38–44, #701 seeds 273–290,
#702 seeds 293–300) and the collision sweep (#705) all finished before I looked at
anything. Every one of seeds 1–300 now has LEGOs, and writing had stopped for eight
minutes before the check began.

## The headline

| | |
|---|---|
| Teaching units in the course | **719** |
| LEGO rows carrying them | 766 |
| Wrongly marked as a debut, now fixed | **27** |
| Introduced but never flagged as a debut | **0** |
| Left for Kai's ruling | **2** |
| Seeds unapproved by this work | **0** |

## Why it happened

The builder's duplicate check only compares a new LEGO against seeds **numbered lower
than the one being built**. A seed built out of order therefore cannot see that the same
unit was already introduced later on. Every one of the 27 defects is that blind spot.

The damage runs both ways, and both are visible in the list. Seven of the 27 are units the
newly-built gap seeds have now claimed as their debut — "yesterday", "I wanted" and
"to ask you something" all now start at seed 30, so the old later debuts at seeds 238, 204
and 119 had to give way. The other twenty were plain later repeats.

## What I fixed

Twenty-seven LEGOs that were marked as a debut but were not the first occurrence of their
unit are now `is_new = false`. Each of them still leaves at least one genuine debut in its
own seed, so no seed lost its whole teaching content.

Full list, with the seed that actually owns the debut:

| LEGO | Real debut | Known | Target |
|---|---|---|---|
| S0028L02 | seed 23 | to start talking | tosú ag caint |
| S0074L01 | seed 73 | thank you very much | go raibh míle maith agat |
| S0103L02 | seed 71 | to hear | a chloisteáil |
| S0119L02 | seed 30 | to ask you something | rud eicínt a fhiafraí díot |
| S0140L01 | seed 139 | I'm sorry | tá brón orm |
| S0144L03 | seed 39 | this morning | ar maidin |
| S0149L04 | seed 23 | soon | go luath |
| S0156L03 | seed 31 | tonight | anocht |
| S0161L01 | seed 150 | can you | an bhfuil tú in ann |
| S0163L03 | seed 47 | I think | tá mé ag cheapadh |
| S0184L03 | seed 183 | them | iad |
| S0191L01 | seed 155 | I don't mind | ní miste liom |
| S0193L01 | seed 139 | I'm sorry | tá brón orm |
| S0197L02 | seed 99 | working | ag obair |
| S0204L01 | seed 30 | I wanted | bhí mé ag iarraidh |
| S0215L02 | seed 154 | on Saturday night | oíche Dé Sathairn |
| S0216L01 | seed 184 | I saw | choinic mé |
| S0219L02 | seed 110 | to relax | scíth a ligean |
| S0219L03 | seed 92 | for a while | go ceann tamaill |
| S0221L03 | seed 168 | and then | agus ansin |
| S0222L01 | seed 70 | to tell me | inseacht dom |
| S0226L02 | seed 63 | helping me | cabhrú liom |
| S0231L03 | seed 212 | to ask for help | cabhair a iarraidh |
| S0238L02 | *held — see below* | yesterday | inné |
| S0248L02 | seed 124 | I thought | bhí mé ag cheapadh |
| S0274L02 | seed 139 | to leave | imeacht |
| S0277L03 | seed 59 | next week | an tseachtain seo chugainn |
| S0278L03 | seed 234 | last night | aréir |

## The reverse direction: clean

Not one unit in the course is practised without being introduced first. Every one of the
719 units has its earliest occurrence marked as the debut, and there are no `is_new = false`
rows whose partner sits at a later seed.

## Two things needing Kai's ruling

**1. Seed 238 would be emptied.** Its only teaching unit is "yesterday" → *inné*, which the
newly-built seed 30 now owns as the debut. Flipping it would leave seed 238 with no debut
at all, so the seed would vanish from the learner's path along with its eight practice
phrases. I left it alone. *Recommendation: give seed 238 a replacement debut LEGO rather
than flipping this one, since it is a whole round that would otherwise disappear.*

**2. One Irish phrase is taught twice under two English labels.** *Níl muid ag iarraidh*
debuts at seed 36 as "we don't want" and again at seed 103 as "we're not trying". The unit
keys differ, so neither the collision sweep nor a first-occurrence rule catches it, but the
learner meets the same Irish string as a debut twice. *Recommendation: this is squarely the
"try" ruling's territory and a worker is inside those rows right now, so it should be
settled there rather than by me — most likely by upchunking the English on one of the two.*

## Things worth knowing, not defects

- **The 27 flips take 223 practice phrases off the learner's path** when the course is
  eventually published. That is the correct end state — the builder itself creates no
  practice phrases for a duplicate — but the phrases are good material, and reassigning
  them to a sibling LEGO instead of leaving them dormant is a teaching decision, not a
  mechanical one. No phrase was deleted.
- **No learner is affected today.** The course is not in the delivery index at all — it has
  zero rows there, because the gap seeds were written straight to the database. Publishing
  it is a separate decision and I did not touch it.
- **Three pre-existing one-known-two-targets pairs** sit outside the gap seeds and outside
  this brief: "doing" (*ag déanamh* / *a dhéanamh*), "I don't know" (*níl a fhios agam* /
  *níl aithne agam ar*) and "to read" (*a léamh* / *léamh*). Each looks like a real grammar
  distinction the English side does not yet separate.

## Gap in this report

The five worker conversations disappeared from the surface listing rather than reporting
completion, so I confirmed they had finished from the data — all 300 seeds built, and no
write to the course for eight minutes — rather than from their own reports. Nothing in the
check depends on their wording, but their reports were not available to me.

## Nothing was unapproved

The edit touched only the `is_new` flag, which fires no version bump and no audio
unlinking. All 300 released seeds are still released, and no audio was generated.
