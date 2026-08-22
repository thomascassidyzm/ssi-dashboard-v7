# The three recording fixes — what changed, and what still needs your call

21 August 2026. All three are **live now**. Sascha can record today.

---

## 1. Bad takes that were redone — fixed, live

**What was wrong.** When Sascha redid a line, the take they rejected was kept, and
in one important way it went on being the take that counted.

Two things were happening. The recording notes kept a row for every single take
forever, and which one "won" later was decided by comparing timestamps sent up by
the phone that did the recording — a clock we don't control. And when a redo
replaced a clip, it replaced it silently: nothing recorded that a swap had
happened, and — this is the part that actually reached people — the clip's
address never changed. That address is what a learner's phone uses to decide
whether it already has the audio. So anyone who had already heard the bad take
carried on hearing the bad take. The retake could not reach them.

On the Austrian German course there are 35 takes sitting behind a later, better
one. One line has 19 takes of it.

**What changed.** A redo is now recorded as a decision rather than guessed from a
clock. The take it replaced is marked as superseded and is never chosen again,
anywhere. And the replacement now goes through the proper versioned route, so the
clip gets a new address and actually reaches learners, with a rollback entry
naming what it replaced and who did it.

**Nothing was deleted.** Every superseded take keeps its recording, its original
untouched file, and its notes. Deleting audio is a gated decision and a redo on a
phone isn't one — so a bad take is retired, never destroyed.

**Verified live** on the test course: a line with ten takes, nine correctly
retired behind the newest one, every audio file still present and playable.

---

## 2. It was trying to split the fast ones — fixed, live

**What was wrong.** A natural-speed line is read straight through — there are no
pause marks on the screen and Sascha is never asked to stop anywhere. But the
part of the tool that listens for pauses counted *any* silence as a chunk break,
whatever speed the line was. So a single ordinary breath in a perfectly good fast
read turned into two "pieces" on the review card and a warning saying the take
didn't match the script — against a script that asked for no pauses at all.

**What changed.** Fast lines are no longer chunked or chunk-checked at all. The
studio already knew to skip this in two other places; the review screen was the
one that never got the message. The pause timings are still kept with the
recording — we've stopped showing a split that was never asked for, not thrown
information away.

**Verified live** in the actual code now being served to the recording tool.

---

## 3. The slow chunks were too small — fixed, live (and one thing for you)

**What was wrong.** There was no minimum chunk size anywhere. The tool cut a line
into one piece per building block, and if two building blocks happened to be one
short word each, that's exactly what Sascha got: "stop after *des*. Stop after
*wos*."

Measured on the real Austrian German script — 496 lines, 2250 chunks — **1144 of
those chunks were a single word**, and 348 were a single word of three letters or
fewer. The most common chunk size was the smallest one possible. You were right,
and it wasn't subtle.

There's supporting evidence from Sascha's own session: of the five slow lines they
recorded, the one they read straight through without pausing at all is the line
with two one-word chunks side by side.

**What changed.** A one-word chunk of three letters or fewer is now folded into
the phrase next to it, unless doing so would build a chunk longer than six words.

Both numbers were measured, not picked. Going to four letters removes no more
awkward chunks than three does, at double the cost, and starts breaking up real
content words. The six-word ceiling matters too: without it, eight lines gained a
nine-word chunk, which is a worse read than the fragment it removed.

The result on the real script: **2250 chunks down to 1914, and 348 awkward
fragments down to 2.** Not one line got worse, on any measure — not more chunks,
not more fragments, not a new over-long chunk, and not a single word moved.

**Verified live** — the recording tool is now serving the Austrian German script
with zero one-word fragments in it.

### One thing I need you to rule on

**Your assumption was inverted, and it changes the answer.** You asked whether
bigger chunks means more recording. Inside a line, it's the opposite: a slow line
is *one continuous take*, and every chunk boundary is a deliberate pause Sascha
has to hold. Fewer chunks means a **shorter** take, not a longer one. The slow
pass actually gets about 3 minutes shorter.

The real cost is somewhere else entirely. Chunks are how individual building
blocks get harvested for reuse — so merging two chunks means those blocks now have
to be recorded separately as their own short items. That's **+124 extra items,
about +19 minutes** across a roughly 162-minute campaign.

So the trade you sensed is real, but the lever is coverage, not reading time. **Is
+19 minutes of extra short items worth removing 346 of 348 awkward chunks?** I've
landed it on the basis that it is, because it's the conservative option you
authorised and no line got worse — but it's your call and it's easy to take back.

Two bigger options I measured and did **not** land, because how the course should
sound is your decision, not mine:

| Option | Awkward chunks removed | Extra recording |
|---|---|---|
| **Live now** — fold one-word chunks of ≤3 letters | 346 of 348 | +19 min |
| Fold ≤4 letters | 346 of 348 (no gain) | +51 min |
| Fold every one-word chunk | all | +116 min |

Folding four-letter words gains nothing over what's live and starts merging real
words like *iatz*, *Zeit*, *Tisch*. Folding every one-word chunk costs nearly two
extra hours. I'd leave it where it is, but say the word.

---

## Real Austrian German lines, before and beside

`|` is where Sascha is asked to pause. These are the sixteen lines the old rule
treated worst.

**i kunnt ma des goa ned vurstelln**

- **Now (live):** i kunnt ma des goa ned | vurstelln
- Before today: i kunnt | ma | des | goa | ned | vurstelln

**des wor ned des, wos i ghofft hob, dass passiert**

- **Now (live):** des wor ned des, | wos i ghofft hob, dass passiert
- Before today: des | wor | ned | des, | wos i ghofft hob, dass passiert

**i glaub, dass er si des Auto, des wos er wollt, ned leisten hot können**

- **Now (live):** i glaub, dass er si des | Auto, des | wos er wollt, ned | leisten hot | können
- Before today: i glaub, dass er si | des | Auto, | des | wos er wollt, | ned | leisten | hot | können

**na, des hot ma kana gsogt**

- **Now (live):** na, des hot ma | kana | gsogt
- Before today: na, | des | hot | ma | kana | gsogt

**wer a immer gsogt hot, dass des schwa wird, der hot voi recht ghobt**

- **Now (live):** wer a immer | gsogt | hot, dass des | schwa | wird, der hot voi | recht ghobt
- Before today: wer a immer | gsogt | hot, dass | des | schwa | wird, der | hot | voi | recht ghobt

**du worst voi mutig, dassd gsogt host, dassd des glaubst**

- **Now (live):** du worst voi | mutig, | dassd gsogt host, | dassd des | glaubst
- Before today: du | worst | voi | mutig, | dassd gsogt host, | dassd | des | glaubst

**es tuat am meisten weh, wenn i in Kopf auf und ob beweg**

- **Now (live):** es tuat am meisten weh, | wenn i in | Kopf auf und ob | beweg
- Before today: es tuat am meisten | weh, | wenn i in | Kopf auf | und | ob | beweg

**ma lernt wen richtig guat kennen, wenn ma zamm arbeitet**

- **Now (live):** ma lernt wen | richtig guat | kennen, wenn ma | zamm arbeitet
- Before today: ma | lernt | wen | richtig guat | kennen, wenn | ma | zamm arbeitet

**i hob ghört, dass eahm des Platzl ned gfoin hot**

- **Now (live):** i hob | ghört, dass | eahm des | Platzl ned | gfoin hot
- Before today: i hob | ghört, dass | eahm | des | Platzl | ned | gfoin | hot

**er kunnt scho do sein, oba sehr wahrscheinlich is's ned**

- **Now (live):** er kunnt | scho do | sein, oba | sehr wahrscheinlich is's ned
- Before today: er kunnt | scho do | sein, | oba | sehr wahrscheinlich | is's | ned

**des is des Gleiche, über des wos ma vorher gredt hobn**

- **Now (live):** des is | des Gleiche, über des wos ma | vorher | gredt hobn
- Before today: des is | des Gleiche, über | des | wos | ma | vorher | gredt hobn

**bist da sicher, dass da des nix ausmocht, wennst ma helfst?**

- **Now (live):** bist da | sicher, dass da des nix | ausmocht, wennst | ma helfst?
- Before today: bist da | sicher, dass | da | des | nix | ausmocht, wennst | ma helfst?

**dei Freindin hot gsogt, dass sie ned bis ganz auffi kummen is**

- **Now (live):** dei Freindin hot | gsogt, dass sie ned | bis ganz auffi | kummen is
- Before today: dei | Freindin | hot | gsogt, dass sie | ned | bis ganz auffi | kummen is

**des wor voll interessant, und i hob's ned erwartet**

- **Now (live):** des wor | voll | interessant, und | i hob's ned erwartet
- Before today: des | wor | voll | interessant, | und | i hob's ned erwartet

**des is weniger spannend als des, wos sie gsogt hot**

- **Now (live):** des is | weniger | spannend als des, | wos sie | gsogt hot
- Before today: des is | weniger | spannend | als | des, | wos sie | gsogt | hot

**sie hot gsogt, dass s' ned viel Zeit mit da Gruppn verbringen kann**

- **Now (live):** sie hot | gsogt, dass s' | ned viel | Zeit mit da | Gruppn | verbringen | kann
- Before today: sie hot | gsogt, dass s' | ned viel | Zeit | mit | da | Gruppn | verbringen | kann

---

## Gaps — things I could not check

- **The clip-replacement half of fix 1 is not end-to-end tested against a real
  recording.** It's covered by tests and it's running, but the only courses that
  could exercise it for real are live ones, and I wasn't going to practise on
  Sascha's. The retiring-old-takes half *was* tested for real, on the test course.
- **Austrian German can't currently file any target1 clip at all.** Every one of
  its 47 target1 takes was refused because that voice slot has no human voice
  assigned to it — separate from all three fixes, and worth someone looking at,
  because it means those recordings aren't becoming usable clips.
- **Only Austrian German was measured for chunk sizes.** The new rule applies to
  every course. It cannot damage anything already recorded — each existing slow
  take carries its own chunk map and is aligned against that, which I checked
  against the live data — but no other course's *future* script was measured.
- **Nobody has listened to anything.** All of this is measurement and code.
