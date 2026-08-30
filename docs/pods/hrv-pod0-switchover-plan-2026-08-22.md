# Croatian pods — the switchover and what happens to progress

*Written 2026-08-22. Every number below was measured live against the production database today.
Nothing has been written: every run behind this page was a dry run.*

---

## The headline

The Croatian listening pod is being replaced. The 142-sentence pod the learners hear now
(slug `pod-0`) is archived, and the 231-sentence pod built last night (slug `pod-0-unrecorded`)
takes its place in the slug the player already reads.

Five learners have progress in the Croatian pod. Between them they hold **383 sentence records
carrying 1,368 exposures**. Of those:

- **241 records carry over — 835 exposures. 61% of all the progress there is.**
- 142 records drop — 533 exposures — and dropping costs a little re-listening and nothing else.
- 169 mis-credits are prevented: 169 times, a naive swap would have credited a learner with a
  sentence they have never heard.

**Is progress mostly covered? Yes.** Nearly two-thirds of it carries, and the third that doesn't
is almost entirely content that has genuinely gone: of the 38 old sentences that leave the canon,
36 are simply no longer in the pod, and only 2 are near-misses caused by a wording change. No
learner can go backwards — that is guaranteed by how the counter works, not by care.

Put the other way round: **104 of the 142 old sentences (73%) survive word-for-word into the new
pod**, and 127 of the new pod's 231 sentences are material no Croatian learner has ever heard.
The pod grows from 15 scenes to 22.

The concentration is worth knowing: one learner holds 289 of the 383 records and 1,010 of the
1,368 exposures. They carry 60%. The other four carry between 53% and 78%.

---

## Readiness — is the new pod actually finished?

**Yes. It is complete and I verified every part of that claim myself today.**

| Check | Result |
|---|---|
| Sentences | 231, across 22 scenes |
| Croatian text present | 231 of 231 — none empty, none still flagged draft |
| Croatian audio linked | 231 of 231 |
| English audio linked | 231 of 231 |
| Broken links (id pointing at no audio row) | 0 |
| Clips missing from storage, or zero-length | 0 |
| **Clips fetched live from S3 and confirmed playable** | **462 of 462** |

I probed all 462 clips — both tracks, every sentence — directly against the audio bucket. Every
one returned a real file. Nothing is missing, so **no audio needs generating and no audio-pass
request needs queueing**. That is the whole of the readiness answer.

The two-voice casting rule holds exactly. On the Croatian track: 150 lines on the male voice
(Srećko), 81 on the female (Gabrijela). On the English track: 150 lines on one voice, 81 on the
other. That is precisely the 150/81 split the casting commit set out to produce, on both tracks.
The voice ids appear under two spellings in the database — some rows carry an `azure_` prefix and
some don't — but they resolve to the same two Croatian voices, and the counts prove it.

For contrast, the pod being retired is cast across seven different voice ids, including three
ElevenLabs voices that are not the approved pair at all — 69 of its 142 Croatian lines are on them. That is what the new pod replaces.

---

## The progress-mapping table

Progress moves by content, never by position: a sentence keeps its exposures only if the identical
text appears in the new pod, in the scene that corresponds to its old one. The full record-by-record
mapping — all 383 records, each with the learner, the sentence, the exposures, and either the exact
slot it lands on or the reason it drops — is committed alongside this page as
**`docs/pods/hrv-pod0-switchover-2026-08-22-prospective.json`**.

Summarised by scene:

| Old scene | Sentences | Survive | Becomes new scene | Exposures | Carried |
|---:|---:|---:|---:|---:|---:|
| 1 | 4 | 3 | 1 | 439 | 373 |
| 2 | 2 | 1 | 2 | 77 | 40 |
| 3 | 3 | 1 | 3 | 205 | 43 |
| 4 | 3 | 1 | 4 | 121 | 36 |
| 5 | 2 | 1 | 5 | 40 | 23 |
| 6 | 13 | 11 | 6 | 77 | 58 |
| 7 | 15 | 7 | 7 | 54 | 20 |
| 8 | 16 | 9 | 8 | 56 | 28 |
| 9 | 18 | 16 | 9 | 70 | 58 |
| 10 | 10 | 9 | 10 | 40 | 30 |
| 11 | 13 | 11 | 11 | 50 | 36 |
| 12 | 10 | 8 | 12 | 34 | 22 |
| 13 | 11 | 10 | 13 | 36 | 26 |
| 14 | 10 | 6 | 14 | 36 | 16 |
| **15** | 12 | 10 | **22** | 33 | 26 |
| | **142** | **104** | | **1,368** | **835** |

Fourteen scenes keep their number. Old scene 15 becomes new scene 22, because seven scenes were
inserted ahead of it — exactly the relocation the rule was designed to allow, and it carries its
26 exposures across without complaint. Not one match was rejected for having moved too far.

**What drops, and why.** All 142 dropped records drop for a single reason: the sentence is no
longer anywhere in the new pod. None drop because of a position problem, and none drop because
the tool was unsure. There are no duplicate sentence texts in either pod, so no match anywhere in
this migration was a guess.

The heaviest single loss is the pod's very first line. "Good morning, Sarah!" has become
"Good morning!", and one learner had heard the old line 32 times. Because a changed sentence
counts as new rather than as surviving, those exposures drop rather than transferring onto a line
nobody has heard. That is the rule working, not failing.

**The renaming costs 11 records and 83 exposures in total** — two sentences, "Good morning, Sarah!"
and "Good evening, Sarah. Did you have a long day?" That is 6% of all Croatian pod progress, and
it is the entire price of the Friend rename.

### On the 2026-08-14 forecast

There is an older prospective log at `docs/pods/a107-prospective/hrv_for_eng.json`. **It is stale
and this page supersedes it.** It was run against a 232-row staged pod, before the rename. Its
forecast was 106 survivors, 252 records carrying 918 exposures.

The delta is clean and it is entirely the rename: 2 fewer survivors, 11 records moved from carry
to drop, 83 fewer exposures carried. Nothing else changed — no learner has added an exposure to
the Croatian pod in the eight days since. The old file's headline numbers should not be quoted;
these should.

---

## What about pod-1?

The Croatian course carries a third pod, slug `pod-1`, holding 180 sentences. Three facts settle it:

1. **No learner has any progress in it.** All 383 progress records in the Croatian course sit
   under `pod-0`. `pod-1` has zero. There is nothing to map, so there is no migration to design.
2. **No code path serves it.** Every place the player picks a listening pod hardcodes the string
   `<course>:pod-0` — five sites, re-verified in the app today: `useListeningPods.ts`,
   `listeningMetaCache.ts`, `usePodLapScheduler.ts`, `generateLearningScript.ts` and
   `usePodStage0.ts`. There is no slug lookup, no pod ordering walk and no flag. The only
   mentions of `pod-1` anywhere in the learning app are inside a test fixture. **No Croatian
   learner has ever been served a line of it.**
3. **Its content does not overlap anything.** Not one of its 180 sentences appears in the old
   pod-0 or in the new pod. It is a completely separate set of dialogues — Laura and Mark,
   commuting and weather — with its own finished audio. It is not an old version of pod-0
   despite its title saying "Pod 0", and the new pod does not absorb it.

**So pod-1 is not part of this switchover, and I am recommending we leave it exactly where it is.**
The commission framed it as one of the things being replaced. On the evidence it cannot be: there
is no progress to preserve, no learner to protect, and archiving it would shelve 180 finished,
audio-complete Croatian sentences that nothing else covers, in exchange for nothing. Touching it is
strictly more work, more risk and more loss than not touching it. The switchover does not go near it.

That also means the cross-pod mapping question evaporates. I had a fallback ready — carry exposures
only on an exact unique text match, drop everything else — and it turns out to have nothing to
operate on. Recording it here so nobody re-derives it: **it was never needed.**

---

## The cutover sequence

Run these in order, from the repo root of `ssi-dashboard-v7-clean`. Nothing here needs re-deriving.

**1. Re-check readiness and see the plan. Writes nothing.**

```bash
node tools/pods/pod-switchover.cjs --course=hrv_for_eng --stamp=2026-08-22
```

Expect: `231 sentences`, `0 untranslated, 0 draft, 0 without target audio, 0 without known audio`,
and `carry 241, keep 0, merge 0, drop 142 — prevents 169 mis-credits`. **If the carry and drop
numbers differ from 241 and 142, stop.** It means the canon has moved since this page was written,
and the mapping needs re-reading before anything is flipped.

**2. Re-save the record-level mapping as it stands at the moment of the flip. Writes nothing.**

```bash
node tools/pods/pod-state-migrate.cjs --course=hrv_for_eng \
  --from=pod-0 --to=pod-0-unrecorded \
  --log=docs/pods/hrv-pod0-switchover-applied-$(date +%F).json
```

**3. Flip. One transaction: archive, promote, migrate progress.**

```bash
node tools/pods/pod-switchover.cjs --course=hrv_for_eng --stamp=2026-08-22 --apply
```

Expect: `switched. archived 142, promoted 231.` and `learner progress: 241 carried, 142 dropped.`
The tool asserts its own post-conditions inside the transaction — sentence counts on both pods,
and that no progress record is left pointing at a sentence that does not exist. If any assertion
fails the whole thing rolls back and nothing has happened.

**4. Verify.**

```bash
node -e "require('dotenv').config({path:'.env.psql'});const{Client}=require('pg');(async()=>{
const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();
console.table((await c.query(\"select p.slug,count(s.*) sentences from listening_pods p left join listening_pod_sentences s on s.pod_id=p.id where p.course_code='hrv_for_eng' group by 1 order by 1\")).rows);
console.table((await c.query(\"select split_part(sentence_id,':',2) slug,count(*) rows,sum(exposures) exposures from learner_pod_state where course_code='hrv_for_eng' group by 1\")).rows);
await c.end()})()"
```

Expect three pods — `pod-0` with 231 sentences, `pod-0-retired-2026-08-22` with 142, and `pod-1`
with 180, untouched — and 241 progress records carrying 835 exposures, all under `pod-0`.

Then open the pod in Popty and confirm it renders on the live slug, and confirm the player serves
the 22-scene pod to a Croatian learner.

**5. The way back, if it was wrong.**

```bash
node tools/pods/pod-switchover.cjs --course=hrv_for_eng --stamp=2026-08-22 --rollback --apply
```

**The `--stamp=2026-08-22` must be identical on the apply and the rollback.** It is the name the
old pod is archived under, and the rollback finds the old pod by that name. **The tool prints its own rollback line at the end of the
dry run, and that line omits the stamp — do not copy it. Use the command above.** Mismatch it and the
rollback refuses outright rather than doing anything strange — but write it correctly and the
question never comes up. The tool's default stamp is `2026-08-14`, a date inherited from the
estate-wide sweep; I am overriding it so the archived pod carries the date it was actually retired.
That is my call, recorded here rather than asked about.

---

## The forks

Two, both answerable in a word.

**1. pod-1: leave it, or archive it?**
It holds 180 finished Croatian sentences on their own dialogues, no learner has any progress in
it, and no code path serves it to anybody. **My recommendation: leave.** Archiving destroys
nothing and gains nothing, and the content may be worth something later; it costs nothing where it
sits. The switchover does not touch it either way.

**2. Flip now, or wait for Aran's answers on the Friend rename?**
The four naming and wording questions in `docs/pods/hrv-pod0-friend-signoff-ask-2026-08-22.md`
are still open, and they change English canon that propagates to every language pair.
**My recommendation: flip now.** A later wording change is simply another content change, and it
goes through this same protocol, with the same tools, at the same cost — the machinery is now
routine. Holding a finished 231-sentence pod off the learners to wait for a question about a
character's name is paying rent on nothing. The measured price of a future rename is visible above:
two sentences cost 83 exposures.

Everything else that looked like a fork resolved on the evidence: the cross-pod mapping rule wasn't
needed, the archive stamp is a naming choice I made, and there is no audio gap to decide about.

---

## The risks, and what the way back restores

**The offline bundle ships more pods than it should — still harmless.** The bundle endpoint selects
every listening pod for a course with no filter on slug or type, so it already includes the staged
pod, and after the flip it will include the retired one. This is still latent, not live: nothing at
runtime consumes that part of the bundle, and there is no downloader walking it. Verified in the
app today. **What the flip does to it: the bundle keeps listing three pods for Croatian; the ids
change and nothing reads them.** Worth fixing one day with a `pod_type` filter; not worth holding
this up.

**The retired pod sits inside the "pod-0 family" that Popty's own voice-approvals surface searches.**
That surface picks a course's current pod by preferring `pod-0-unrecorded`, then falling back to
whichever pod-0-family pod holds the most sentences. After the flip there is no `pod-0-unrecorded`,
and the promoted pod has 231 sentences against the retired pod's 142 — so it picks correctly. But
it picks correctly by counting, not by knowing. This is a Popty admin surface only; it is nowhere
near a learner. Flagging it because it is the kind of thing that bites a course where the retirement
happens to be larger than the replacement.

**Two Popty URLs stop working, by design.** The pilot pod's page at
`/production/hrv_for_eng/pods/pod-0-unrecorded` — the one Tom was sent — will 404 after the flip,
because that slug no longer exists. The content is at `/production/hrv_for_eng/pods/pod-0`.

**The flip cannot half-happen.** Archive, promote and progress migration are one transaction with
its own post-checks. Either all of it lands or none of it does.

**What the rollback restores:** the old 142-sentence pod back on the live slug, the new pod back on
its staging slug, and learner progress mapped back by exactly the same content rule. Audio is never
deleted by any of this — the old pod is renamed, not destroyed, and every clip it links to stays
where it is.

**What the rollback does not restore:** the 533 exposures dropped on the way in. Those records are
deleted at the flip, and rolling back re-derives progress from what survived, not from what was
there before. In practice that means a learner who rolls back has re-listening to do on lines they
had already met — the same cost as the forward migration, paid twice. There is no penalty and no
lost course progress: the course-level progress ratchet is never touched by any of this.

**The thing this whole protocol exists to prevent is the thing that would happen if someone edited
the live pod in place instead.** 169 times over, a learner would be silently credited with a
sentence they had never heard, at whatever level of familiarity they had reached with the sentence
that used to be in that slot. No error, no alarm, nothing to notice. That is what happened to Welsh
on 11 August. The commands above are the reason it will not happen to Croatian.

---

*Measured live 2026-08-22 against the production database. Rules applied as adopted by Tom on
2026-08-16 (plate A-111): `docs/pods/pod-migration-protocol.md`. Record-level mapping:
`docs/pods/hrv-pod0-switchover-2026-08-22-prospective.json`.*
