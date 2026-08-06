# How fixes are actually done here

**For Kai. 6 August 2026.**

You said you don't trust this estate's agents with fixes yet, and that we should do some one-on-one
work first. So this is not a fix job. **Nothing was applied. No database writes, no TTS, no spend.**
It is my attempt to show I've understood, by reconstructing what was actually done today and
yesterday and writing the rules down.

I went to the real evidence: the live database, the actual diffs, and the working notes the local
agent left on this machine. Where a methodology document disagreed with what was really done, I went
with what was really done.

One thing I should say up front, because it changes the shape of this: **the good Finnish material is
here.** The local agent's whole Finnish working directory is sitting on this machine, scripts and
all. I could read it, re-run its checks, and verify its claims against the live database. That is the
best evidence in this report by a distance.

---

## Part 1 — What was actually fixed

### Finnish — the run you said got good by the end

**11 rows changed, not 9.** The brief said nine. The backup file holds eleven and the database
confirms all eleven moved. The two nobody mentioned were seed 346, `tosi paljon` → `paljon`.

I checked this myself rather than taking the report's word for it. The database says seven Finnish
practice phrases were edited today and no LEGOs; the other four were deletions, so they don't show up
as edits. Seven plus four is eleven.

**The five grammar fixes.** Finnish has a rule with no exceptions: a negative sentence can't take a
"whole object". So "I don't remember his name" needs *nimeä*, not *nimen*.

| Where | Before | After |
|---|---|---|
| "I don't remember his name" | mä en muista sen **nimen** | mä en muista sen **nimeä** |
| "I haven't seen the bus" | mä en oo nähnyt **bussin** | mä en oo nähnyt **bussia** |
| "I don't want to give an excuse" | antaa **tekosyyn** | antaa **tekosyytä** |
| "you shouldn't give an excuse" | antaa **tekosyyn** | antaa **tekosyytä** |
| "I don't want to find an excuse" | löytää **tekosyyn** | löytää **tekosyytä** |

The first two are safe and one of them repaired a real defect: before the fix, that row was the only
place in the whole course saying *sen nimen*, while its own sibling three rows earlier already said
*sen nimeä*. Same English shape, two different Finnish answers. The fix removed that.

**The last three are the interesting ones, and they are still wrong right now.** I confirmed this
against the live database this evening, not from the report:

- The word *tekosyytä* appears in exactly **three** rows of the entire course — the three that were
  just changed. The learner has never seen it anywhere else.
- The tile's own card still says *tekosyyn*. So do all three of its build phrases. I checked: they
  are unchanged, last touched on 16 July.

So the tile now **teaches one form and tests another**. In play order, the partitive first appears at
position 4 — the very first use row — with no build having taught it.

The local agent's judgement here is the thing I most want to copy. It did **not** revert. Reverting
would have put three ungrammatical Finnish sentences back to buy tile consistency — trading a
correctness bug for a consistency bug. Instead it said plainly: *"until a build teaches tekosyytä,
seed 523 is internally more contradictory than it was this morning"*, and proposed rewriting one
build row, both sides, so the form gets taught one position before it's demanded:

> "to find an excuse" / *löytää tekosyyn* → **"you don't want to give an excuse"** / **_sä et haluu
> antaa tekosyytä_**

And then it counted the cost of its own proposal out loud: *löytää tekosyyn* stops being built, so a
later row has to compose two separately-taught things instead.

**The four deletions** were duplicate lines — two English prompts landing on one identical Finnish
sentence, e.g. "I know you're learning Finnish" deleted because "I know **that** you're learning
Finnish" already existed with the same Finnish. All four are restorable word-for-word from the backup
file. The agent then noted that you have since ruled that two Englishes on one target isn't a defect,
so it flagged them for you to restore or let stand rather than deciding for you.

**One real defect found in the synonym sweep: seed 371 is an island.** It is the only seed in the
course using the `katto-` stem; nine other seeds all use standard `katso-`. Same seed, only one using
*leffa* where four others use *elokuva*. 14 rows.

And here is the part that shows the lesson had landed. It recommended merging `kattomaan` →
`katsomaan` with confidence, but **refused to assert** `leffaa` → `elokuvaa`, because the course has
never shown the form *elokuvaa*. In its own words, that would be *"the exact mistake this whole
report is about."* It caught itself about to commit the seed-523 error a second time.

### Spanish — 349 padded practice phrases rewritten

The defect, plainly: a practice phrase that is just the round's chunk with a stock time-or-place word
bolted on the end, sometimes ungrammatical. Deborah found it.

| Before | After |
|---|---|
| I am feeling sad yesterday | I am feeling sad, so it's a good idea to try and breathe slowly |
| whenever you feel here | whenever you feel alone around here |
| small here | the small door is open |
| in the mud yesterday | I found the dog alone in the mud |
| I'm afraid that here | I'm afraid that I don't want it |
| nowhere anywhere | to go nowhere |

Three things about how this was done matter more than the rows:

**It rewrote the Use role, not just Build.** 259 of the 349 were Use rows. A build-only fix would
have left three quarters of the defect standing.

**A native-Spanish proofreader was pointed at the fixer's own first draft and told to assume it was
flawed. It rejected 182 of 367 — and was right.** Real errors it caught include *antes pensaba que
**es** un coche rápido* (needs *era*), and "because I have got to be inside the entrance **before we
moved**" — a present obligation glued to a past clause. Rows were regenerated against the specific
criticism and re-reviewed five times: 185 → 259 → 298 → 316 → 326 → 332. Then it **stopped rather
than force the rest**, on the grounds that shipping Spanish a proofreader had already rejected would
swap one defect for a subtler one.

**It audited itself and published the number that made it look bad.** An independent audit found
~30% of the rows it rewrote weren't actually broken English or Spanish. It reported that, then
explained the criterion difference rather than burying it — and the same audit found 18 genuinely
broken rows its own rule had missed, which it then fixed.

**The detector's real failure mode is worth more than the headline.** A second pass hand-judged 85 of
the 367 rows against their full rounds pulled live, and **47 of the 85 were wrongly flagged**. But it
didn't stop at "30% false positives" — it found *where* the detector was wrong, and the split is
brutal:

| | false-positive rate |
|---|---|
| Below round 1050 | **93.3%** — near worthless |
| Rounds 1050–1199 | **12.5%** — reliable |
| Build rows | 32 wrong to 9 right |
| Use rows | 15 wrong to 29 right |

The reason is the good bit. The rule flagged a phrase when several rows in one round shared a stock
tail. That doesn't detect padding — it detects **rounds where the generator collapsed**, which only
happened in that upper band. Below it, the same signal fires on rounds that are simply tiled well.
And the detector had no concept of role, so a legitimate build fragment looked identical to a bare
fragment posing as a full sentence. "I'd like to read my book today / tonight / tomorrow" is six
perfectly natural utterances; the rule condemned them all.

It also caught the mirror image: of the rows the density rule *spared*, **18 were clear defects**, and
inside the 1050–1199 band 11 of 16 spared rows were real. So the rule was wrong in both directions at
once, and only splitting the population by band and role revealed it.

**One honest wrinkle in how it was done.** All 349 rows had *both* sides rewritten — there is not one
where the English was left alone. In two of them the fault was purely Spanish (`¿Quién era allí?`
needed *estaba*; `estáis haciendo muy bien` was missing *lo*) and the English was rewritten anyway.
The job flagged the second itself as *"a heavier edit than the fault required."* Worth holding onto:
your ruling **permits** rewording both sides, it doesn't oblige it. The Spanish machinery could only
express two outcomes — replace both sides, or leave completely alone. Fix-in-place and reword-one-side
weren't options it could reach, and **nothing was deleted at all** — there is no delete path in the
tooling.

No TTS was run. 1,041 clips now need generating and that spend is sitting waiting for your approval.

### English as the target language

**First, a correction to my own method.** I originally counted "what changed today" from row
timestamps. That's the weak way, because an audio relink bumps a timestamp exactly like a rewrite
does. There is a proper provenance trail — `content_audit_log` keeps the whole previous row — so you
can compare the actual old text to the actual current text and a timestamp bump can't fool you. Run
that way, across every English-as-target course:

| Course | rows audited today | English text actually changed |
|---|---|---|
| eng_for_mar | 38 | **38** |
| eng_for_por | 932 | **28** |
| eng_for_ita | 678 | **0** |
| eng_for_ara / deu / fra / guj / jpn / kor / spa / tam / zho … | 104–1,135 each | **0** |

I re-ran this myself rather than take it on trust. It confirms **eng_for_ita was not content-edited**
— its 678 rows all changed at one timestamp, are all component rows, and only their audio link moved.
And it turned up a course I had missed entirely.

**eng_for_por — the second English-as-target course fixed today, 28 rows.** If what you remember is a
Romance course, this is probably it. It came from Deborah's report, and it's a textbook sweep: the
flag was one phrase, and the fix went across the whole family.

| Before | After |
|---|---|
| as soon as you can | as soon as possible |
| to answer as soon as you can | to answer as soon as possible |
| I want to meet as soon as you can | I want to meet as soon as possible |
| I'm going to try to answer as soon as you can | I'm going to try to answer as soon as possible |
| you can *(the component)* | possible |

Note what got changed: the component, the LEGO, every build and every use — not just the row that was
reported. That's the ladder working. Leaving the component saying "you can" while the sentences said
"as soon as possible" would have been the classic half-fix.

**eng_for_mar: 34 phrases rewritten.** This is the one that bears directly on your ruling about
English quality.

Every one of the 34 originals failed your hard grammatical constraint. A sample:

| Before | After | What was wrong |
|---|---|---|
| I think that's very well | I think that's a very good idea | adverb where a noun phrase belongs |
| he's going to already | I think that he's going to ask you | the verb had been eaten |
| why don't you want? | why don't you want to wait? | no complement |
| on the table very well | it's on the table | a tag glued to a bare fragment |
| very difficult | **isn't** very difficult | **the negation had been dropped** |

The dropped-negation class is the worst thing in the set: the Marathi says *not difficult*, the
English said *difficult*. Four rows were teaching the opposite of the truth.

The dominant cause is one generator bolting a stock tag — *very well, not sure, yet, already,
tonight* — onto whatever was in front of it with no grammatical check. 26 of the 34 are that.

**The triage lesson.** A sweep produced 568 flagged rows, cut to about 209 — because the biggest
bucket, phrases containing "in English", **wasn't a defect at all**. It's the drill format: a
generated slot meaning *"…now say it in English"*, attached to a bare fragment **by design**. There
are 720 of them live across 270 seeds, in fixed template positions. `happy with how much in English`
reads as broken English and is ordinary course content. Rewriting them would have silenced 720
working slots. The classifier could read English shape but had no model of the course's own template
vocabulary.

**Then it got cut again, and this is the sharper lesson.** The first triage was done **English-only,
without Marathi**. Once Marathi was authorised, **20 more rows in the same eleven seeds** turned out
to carry the identical defect — and several are invisible from the English side. `so I hope you'll
finish soon` is perfectly good English; the Marathi says *soon* twice. `he's going to in English` has
no verb in it at all.

> **A one-sided audit certifies one side only.** 568 → ~209 → **139**, and the last cut only came from
> reading the other language.

**The independent cross-check — the best verification practice I found today.** Three authors worked
the same 35 phrases from the same brief, **blind to the first author's drafts**, and a fourth
re-verified after the repair landed.

- They **converged on byte-identical Marathi** for several rows, arrived at independently. Without a
  speaker on hand, that's the strongest evidence available.
- They **independently left the false positive alone** — agreeing *not* to act is as informative as
  agreeing to act.
- **Three of their versions were adopted over the original fixer's**, and the reason is the bit worth
  copying. Not "more correct" — **less dependent on a judgement nobody could verify**. `felt better
  today` was withdrawn for `felt okay`, because *ठीक* is invariant and sidesteps an agreement call.
  `I left it on the table` became `it's on the table` to sidestep a *put* vs *leave* distinction. The
  count of items resting on an unverifiable call dropped from six to three.
- **The check caught the repair introducing a brand-new defect.** One rewrite landed on English that
  already existed elsewhere in the course **carrying different Marathi** — a ZUT collision created by
  the fix itself. The consistency checker had only ever looked for duplicates *within* a LEGO, never
  course-wide. And the cross-check's proposed replacement was **also** a duplicate, which was caught
  too; a third version was finally written.

So: fix, have someone else attack it blind, accept being beaten on three, and then discover your
checker had a hole that let your own fix create the defect it was meant to remove.

### Greek — a diagnosis, not a fix

Worth being precise, because you remember it as a fix. **No Greek text was changed today.** I
checked: the 38 Greek LEGOs and 548 Greek phrases whose timestamps moved today are component rows
whose *audio links* changed, not their words.

What actually happened is a diagnosis, and it's a good one:

- **The wrong-person bug is not live.** 559 places where an English "to X" is reused inside a
  practice phrase; 559 have the right person; **0** mismatches. That is the whole population, not a
  sample.
- The bracketed tags learners were hearing — *"the Greek for: 'to answer (I, aorist)', is:"* — are
  real. It didn't guess: Azure writes a per-word list of what it actually voiced, and the brackets,
  the "I" and the "aorist" are all in it. Corroborated by clip length: 69 of 69 tagged clips match
  the duration you'd predict from the full text, 0 of 69 match the stripped text.
- For Greek the tag lives only in the spoken intro, so it's ~70 clips to re-render, not a data
  repair.

**And then it corrected itself.** The first conclusion was "the fix is presentational". Independent
workers came back and it was folded in that this is a **Greek-only** conclusion: in Telugu, Russian
and Nepali the same tags are baked into the source text (822 of 1,657 Telugu LEGOs), where every
re-render reproduces them. That's a materially bigger job. It flagged it rather than scoping it,
because it wasn't asked.

It also refused to propose new wording for the intros, on the grounds that the presentation design is
Aran's call.

---

## Part 2 — The house style, as rules you can check

Each rule has the real case it came from and how I'd verify a fix obeys it.

**1. Never introduce a form the learner hasn't met. This is the top rule.**
*From:* Finnish seed 523. The grammar fix was correct and still made the tile worse, because
*tekosyytä* exists in exactly three rows of the course — the three it just created.
*Check:* before writing any replacement, search the whole course for every word-form in it and
confirm each appears at or before this seed. Not the dictionary word — **the exact form**. If it
doesn't appear earlier, either teach it in a build first or don't use it.

**2. A fix isn't done when it's correct. It's done when the tile agrees with itself.**
*From:* the same case — the card and all three build rows still teach *tekosyyn*.
*Check:* after any phrase edit, read the card and every build and use row in that tile in play order.
If a form first appears in a use row, that's the defect.

**3. When correctness and consistency collide, keep the correctness and say what you've broken.**
*From:* the agent's refusal to revert seed 523 — reverting would restore three ungrammatical
sentences. It kept the grammar and wrote down, in plain words, that the tile is now more contradictory
than it was that morning.
*Check:* did the report name the thing it left worse? A fix report with no cost stated hasn't finished.

**4. The English must be grammatically correct, and shouldn't sound weird — especially when English
is the target.** Your ruling, and it settles a genuine contradiction in our own docs: one of them said
slightly stilted English is fine as long as it tiles. It isn't the default any more. Grammatical
correctness is hard; naturalness is near-hard; a ZUT-driven compromise is a rare exception you justify
one at a time.
*Check:* read the English aloud on its own. If you wouldn't say it, it needs a reason in writing, not
a shrug.

**5. You may reword both sides. You may delete. Neither is failure.**
*From:* your ruling, and it produced a better seed-523 fix than the agent's first attempt — it
unlocked rewriting a build row's English as well as its Finnish. It also unlocked two known-side fixes
it had parked.
*Check:* prefer fix in place → reword one side → reword both → delete. Take the first that leaves the
course consistent, not the first that makes the flag go away. If you delete, check what's left: the
course norm is 5 use rows per LEGO, and dropping to 3 puts a tile in the bottom half-percent.
*The other half of this rule:* permission to reword isn't an obligation. All 349 Spanish rows had
both sides rewritten, including two where only the Spanish was at fault — the job flagged one of those
itself as "a heavier edit than the fault required". Before building a tool, check it can express the
whole ladder: the Spanish tooling could only replace both sides or leave alone, so the middle rungs
were unreachable and delete didn't exist.

**6. Same English → two different target words is a technique, not a defect — but watch where they
sit.** Your ruling. The constraint is placement: not too many close together, and not early on where
learners are nervous.
*Check:* when you find a pair, don't report it as a duplicate. Report how far apart they are and how
early they appear. Two Englishes landing on **one** target isn't a defect at all.

**7. Calibrate the detector before you believe a number, and calibrate the lookup too.**
*From:* the Spanish prerequisite gate was run against the course's existing good phrases first — 95.7%
and 98.9% pass — so it was known to match how the course behaves before it was trusted to reject
anything. The Greek tag count was corroborated two independent ways.
*Check:* has the detector found something you already know is there? If not, its zero means nothing.
I hit this myself while writing this: I ran an estate-wide ID check that returned 93,193 "problems",
and they were all my own mistake — LEGO ids simply aren't prefixed. An uncalibrated count is a rumour.

**7b. Ask what changed, not what was touched.** A row's timestamp moves when its audio link changes,
exactly as it does when someone rewrites the words. I made this mistake first time through and it
nearly cost me a wrong answer about which courses were fixed today.
*Check:* use `content_audit_log` — it keeps the whole previous row, so you compare old text to current
text and a timestamp bump can't fool you. This is how eng_for_ita was settled: 678 rows touched,
**zero** words changed.

**8. Code counts. Only you can judge meaning.**
*From:* "I want talking more" passed the vocabulary gate, because every word in it had been properly
introduced. A frame-coverage check returned zero problems across 9,846 items — a clean bill of health
from a check that cannot read language.
*Check:* never let "the gate passed" stand in for "someone read it". Ask what the check was
physically capable of noticing.

**9. Hunt your own false positives — and don't over-hunt.**
*From:* the eng_for_mar sweep, where 568 became ~209 because "in English" was the drill format, not
broken English. But also: a batch of Chinese variants was written off as noise and turned out to be
real, because Chinese marks tense with particles rather than word endings.
*Check:* keep two lists — "known false-positive class" and "class I haven't understood yet." Default
to false-positive only on the first. The second gets read by hand.

**9b. When a detector is wrong, find out *where* it's wrong before you throw it away.**
*From:* the Spanish audit. "30% false positives" would have been a useless verdict. Split by round
band and by role and it becomes: 93% wrong below round 1050, 12% wrong above it; on build rows wrong
three times out of four, on use rows right two times out of three. The rule wasn't detecting padding
at all — it was detecting rounds where the generator had collapsed. Same rule, and it was
simultaneously over-firing in one band and missing 11 of 16 real defects in another.
*Check:* before accepting or binning a detector, slice its hits by every dimension you have — position
in the course, row role, seed band — and report the rate per slice. A single overall percentage hides
which half of the tool works.

**10. Count clusters, not flags.**
*From:* 1,123 real problems collapsed to about 90 consolidations covering 617 of them.
*Check:* a report whose headline is a raw hit count hasn't done the work. How many distinct fixes?

**11. Get someone else to attack your own work, and publish it when they win.**
*From:* the Spanish proofreader rejecting 182 of 367 first-draft rewrites; the independent Finnish
verifier that confirmed two fixes and then found the sweep had **missed three more**; the eng_for_mar
cross-check whose three alternatives were adopted over the original fixer's.
*Check:* did an independent pass run, and did anything change because of it? If nothing changed, the
check probably wasn't adversarial.

**11b. Your fix can create the very defect you're removing — check course-wide, not locally.**
*From:* an eng_for_mar rewrite that landed on English already used elsewhere in the course with
different Marathi. The consistency checker only looked inside the LEGO, so it passed. The
independently proposed replacement was a duplicate too.
*Check:* before writing any new text, search the **whole course** for that exact known-side wording.
Never add a second rendering of a phrasing that already has one. Run the duplicate check course-wide
after the write, not just on the tile.

**11c. A one-sided audit certifies one side only.**
*From:* eng_for_mar. The English-only triage cleared seeds that were still broken in Marathi — `so I
hope you'll finish soon` is perfect English over a Marathi sentence that says "soon" twice. The count
fell 568 → 209 → 139, and the last cut came only from reading the other language.
*Check:* say which side you actually read. If you read one, your verdict covers one, and the report
must say so rather than implying the row is clean.

**11d. Prefer the fix that rests on the fewest unverifiable judgements.**
*From:* three cross-check alternatives adopted over the original fixer's — `felt okay` over `felt
better today` because the word is invariant and dodges an agreement call nobody present could settle.
*Check:* when two candidate fixes are both correct, pick the one needing less knowledge you can't
confirm. Count how many of your fixes rest on a call you couldn't check, and drive that number down.

**12. Stop rather than force the last rows.**
*From:* Spanish stopping at 332 of 367 when the pass rate flattened, rather than shipping Spanish a
proofreader had rejected.
*Check:* skipped rows named with a one-line reason each. Two good phrases beat ten stilted ones.

**13. Apostrophes die in the shell.** A fix sent as an inline shell payload turns "don't" into
"dont", silently.
*Check:* submit from a file, then search your changed rows for `dont / cant / im / wont / didnt`. I
ran this against the seven Finnish rows edited today: **zero damage**, so that batch was submitted
properly.

**14. Changing text desyncs its audio, and you must not fix that with TTS.**
*From:* Spanish — 1,041 clips now need generating, and the job stopped and asked rather than spending.
*Check:* was the audio link cleared, was the count reported as its own line, and was approval asked
for rather than assumed?

**15. Report the gap instead of covering it.**
*From:* Spanish naming three rows that were "never adjudicated — a tooling drop-out, not a judgement";
Finnish naming 81 unaudited tiles and explicitly refusing to put a number on them.
*Check:* does the report say what it couldn't do? A confident report with no gap list is the one to
distrust.

**16. Don't add flags.** Your ruling — you flag, we resolve. Nothing gets a new flag-raising feature.

---

## Part 3 — Early versus late: what actually changed in the Finnish run

This is the delta you asked for, and it's sharp.

**Early.** The sweep found candidates and the fixes were applied. The test being applied was *"is this
sentence correct?"* — and by that test all five grammar fixes pass, because they are all correct
Finnish. Four rows were deleted as duplicates on a rule that has since been overturned, and two rows
were changed on reasoning (`very`/`really` → *tosi*) you also overturned. The fixes were right; the
reasons weren't always.

**Middle.** An independent session was pointed at the two proposed fixes and told to refute them. It
confirmed both, and then found that **the original sweep was accurate but not complete** — it had
missed three phrases in seed 523. Its own words: *"the true count is five, not two."* That's the first
step change: verification stopped being a rubber stamp and started finding things.

**Late.** The test changed from *"is this sentence correct?"* to **"has the learner met this, and does
the tile still agree with itself?"** That single change is what found that three of the five correct
fixes had left the course teaching one form and testing another. It's also what stopped the agent
swapping *leffaa* for *elokuvaa* — same trap, caught before it was sprung this time.

Three other things arrived with it:

- **Method stated and calibrated.** The late work says what it swept (277 cards), what it returned
  (2 hits), and demonstrates the Unicode word-boundary trap rather than assuming it — showing that
  the naive check both misses `sen nimeä` and falsely fires inside `nimeäminen`.
- **The cost of its own proposal counted out loud**, including the option it recommends *against*,
  with the number attached (deleting would put the tile in the bottom 0.5% of the course).
- **Numbers refused where they'd be fake.** 81 tiles unaudited: *"likely mostly noise, but genuinely
  unchecked — I am not claiming a number."*

**So the lesson in one line:** the early run asked whether the sentence was right. The late run asked
whether the learner could get there. Everything else follows from that.

---

## Part 4 — What I could not find, and one precise ask

Honest gaps:

1. **I could not find an early Finnish fix log or brief.** I have the backup file with all 11 original
   rows, and I have the late reports. I do **not** have the document that commissioned the original
   nine, or the reasoning written at the time. My early-versus-late account is reconstructed from what
   the late reports say about the early ones plus the backup file — which is decent evidence, but it
   is the late run's account of the early run, not the early run's own.

2. **The ZUT resolution catalogue does not exist in this repo.** Two of our own tools point at a file
   called `methodology-zut-resolution` twice, for "the full pattern catalogue". There is no such file
   anywhere in the tree. **This is the precise ask worth making of your local agent** — it is the
   named home of exactly the material we keep reconstructing from three partial sources. Ask for that
   file, and for anything alongside it in the same folder.

3. **Whether the Finnish proposals were ever ruled on.** The late report ends with seven items awaiting
   your decision. As of tonight the database says none of them have been applied — seed 523's build
   row is untouched, seed 371 still says `kattomaan`. So the tile that tests an untaught form is live
   right now. I have not applied anything.

4. **Verification depth is uneven, and here is the honest map.** Finnish I verified row by row against
   the live database. The English-as-target counts I re-ran myself through the audit log, including
   the Portuguese rewrites quoted above and the zero for eng_for_ita. The Spanish account was
   independently re-derived from the live database and the fix scripts by a second session — the
   band-and-role numbers are theirs and I have not personally re-run them. The Greek reconstruction is
   still with a third session; anything it corrects will land after this document.

   Worth saying plainly: **my first pass got the "what changed today" question wrong**, by counting
   timestamps instead of comparing text. It would have let me tell you eng_for_ita was fixed when not
   one word of it was. That's rule 7b, and I earned it the same way everything else here was earned.

5. **One thing I found that nobody has reported, offered as a finding rather than a fix.** In the Greek
   course, 7,771 of 8,065 practice phrases have an id beginning `el_for_eng:` while the course itself
   is `ell_for_eng` — one missing letter. The other 294 use the correct prefix. No rows collide, so
   nothing is duplicated, and I have **not** established that anything is broken by it. But an agent
   that constructs a row id from the course code will silently miss 96% of the Greek course and get a
   clean-looking zero. Greek is the only course in the estate with this. Worth someone looking; I
   haven't touched it.

---

## The document I changed

You asked me to fix the one repo file that contradicts you. `phrase-fixer` told a fix agent **"Don't
delete"** and **"Don't rewrite the whole phrase"** — the opposite of what you instructed. It also set
no bar at all for English quality, and taught the inline shell command that eats apostrophes.

It now leads with your five rulings, quoted, marked as outranking the rest of the file. Deletion moved
out of "leave for human" and into the agent's own call. The English bar is written in as hard
grammatical correctness with naturalness near-hard. The seed-523 case is in there as the worked
example of introducing a form the learner hasn't met.

It is committed on a branch and **not merged** — merging is Tom's call, not mine.
