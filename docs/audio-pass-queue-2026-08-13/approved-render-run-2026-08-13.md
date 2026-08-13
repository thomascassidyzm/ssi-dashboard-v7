# The approved render run: what I found when I tried to execute it

**2026-08-13.** Tom approved a render plan on 12 August. It was written onto 59 rows of the
`audio_pass_requests` table and then nothing ran, because that table has no poller and no cron —
its fulfillers are named as prose inside the request text. I was dispatched to be the executor.

**Nothing was rendered onto the learner path. Nothing was deleted. Total spend: 9 test renders,
about $0.0001.** Both halves of the job turned out to be blocked.

> ## ⚠️ Correction, added later the same day
>
> **The "wrong-language voices" section below is wrong, and I have struck it through.** I read the
> **known** track and called it English. Course codes are `<target>_for_<known>` — so for
> `eng_for_pan`, English is the **target** track and Punjabi is the known one. Every Azure voice I
> named is the correct voice of the *learner's own language*, on the other track. Verified
> directly: `eng_for_pan:pod-0` has `known_text` in Punjabi script and `target_text` in English.
>
> **The English cast is Tom's clone plus Olivia — the top male and female picks of the `eng` voice
> pool. It is correct, and it does not need recasting.** A parallel session caught this and halted
> the recast before anything was touched: `docs/pods/pod0-recast-halted-2026-08-13.md` (`83ba414d`).
>
> **What survives the correction:** the approval gate refuses all 57 courses, `/generate-pods`
> cannot do the scope its own row names, and none of the plan's counts match live data. Those three
> findings were measured independently of the track error and still stand.

---

## The short version

| | Approved scope | What actually happened |
|---|---|---|
| **Group A** — pod-0 English | 1,128 renders across 57 courses | **Not run.** Refused by an owner-ruled safety gate on all 57. The stored cast is not the approved voices. |
| **Group B** — proven-bad live clips | 24 clips | **Not re-rendered.** All 4 clips the queue actually identifies are false alarms. The other 20 are not identified anywhere. |

Two things need Tom. Both are at the bottom.

---

## Group B first — the 24 "proven-failed" clips

This was the priority: 24 clips flagged as broken and live in front of learners.

### Only 4 of the 24 are actually named

The queue rows carry clip ids in their metadata. Between them they name **four** clips:
one in `eng_for_kan`, three in `ita_for_jpn`.

The row text says the 24 break down as "21 from the fra band-2 verdict cache + 3
`course_audio.veracity_pass=false`". The 3 are the Italian ones. The `eng_for_kan` clip is a
fourth that the arithmetic does not account for. **And the 21 French clips are not identified on
any queue row, in any document, or in any artifact I could find.** There is no `fra_for_eng` row
in this group at all.

I did find the verdict cache the row refers to — `~/.audio-veracity-verdicts.json`, 5,341 entries.
It holds **534** failures, not 21. There is no marker in it for "band 2" and no way to tell which
21 of the 534 were meant. **This is an explicit gap: 20 of the 24 clips cannot be located.**

### The 4 that are named are all false alarms

I checked each one against the live S3 bytes. First, confirming they had never been touched —
all four still alive, last-modified predating the queue write, exactly as the audit said.

Then I ran the detector. Here is what it heard:

| Course | Text the clip should say | What the detector heard | Verdict |
|---|---|---|---|
| `eng_for_kan` | it is okay | **"It is OK."** | flagged as broken |
| `ita_for_jpn` | "come se" | "Come si?" | flagged as broken |
| `ita_for_jpn` | più di | "PUD" | flagged as broken |
| `ita_for_jpn` | più di | "Pewdie!" | flagged as broken |

Look at the first row. The clip says **"it is okay"**. The transcriber wrote it down as
**"It is OK."** That is a perfect rendition of the line. It was flagged because "OK" is not
spelt the same as "okay" — an orthographic difference, not an audio fault. That clip is fine.

The Italian ones are two-word fragments ending in a short unstressed function word — *di*, *se*.
The transcriber does not reliably hear those. So I tested it: I rendered all three afresh from
Azure, three takes each, **nine brand-new renders**. Every single one failed the same check, for
the same reason, as the clips already on S3.

That is the proof. Azure does not truncate a six-character phrase, and it certainly does not
truncate it nine times out of nine in the same place. **The words are being spoken and not being
heard.** The gate cannot be passed by any render, because the renderer's own fresh output cannot
pass it either.

### The control, so this is not just a story about short clips

`ita_for_jpn` has **351** clips of two words or fewer. Only **2** of them are flagged. Of clips
three words and longer, **0 of 1,649** are flagged. So the detector is not simply broken on short
audio — it is specifically tripped by clips whose final word is a short function word the
transcriber drops.

**Decision: I did not re-render any of them.** Spending money to replace correct audio with
identical audio that fails the same check is not a repair. The nine test renders are what bought
the proof, and they were a hundredth of a penny.

---

## Group A — the 1,128 pod-0 English renders

### The safety gate refuses all 57 courses

`POST /generate-pods/:courseCode` has a sample-first hard gate — Tom's own ruling of 7 August.
A bulk run is refused unless a stored voice approval matches the course's live casting. I checked
all 57 courses. **All 57 refused, reason `no_approval`.** Not one has ever been approved.

The gate's own comment explains why it exists: sixteen courses are cast with wrong-language voices,
and a bulk run on that casting "fails 100% and burns ~19 hours of whisper for nothing."

### ~~It is refusing for exactly the right reason~~ — WRONG, see the correction above

~~The approved plan is a "pod-0 English fresh build (Eve + clone `xai:gfzdpspr5fdp`)". Here is
what the stored cast for the English track actually is:~~ **This reads the KNOWN track. For the 15
`eng_for_*` courses in the list, the known track is the learner's language, not English.**

- `xai:gfzdpspr5fdp` — the clone — 4,491 lines ✅
- `xai:bedd6226` — 1,530 lines
- **224 lines with no cast at all**
- and then a long tail of Azure voices *in the wrong language*, ~106 lines each:
  `pa-IN-Ojas` (Punjabi), `si-LK-Sameera` (Sinhala), `ur-PK-Asad` (Urdu),
  `ja-JP-Naoki` (Japanese), `bn-IN-Bashkar` (Bengali), `gu-IN-Niranjan` (Gujarati),
  `ta-LK-Kumar` (Tamil), `pt-PT-Duarte` (Portuguese), `fr-FR-Henri` (French), and more.

~~**Eve is not in the cast anywhere.** Running the job today would have spent money rendering
English lines in Punjabi, Sinhala, Urdu and Japanese voices.~~

**Corrected:** not one of those voices speaks a line of English. The real English cast is
`xai:gfzdpspr5fdp` (the clone, 11,546 slots) and `xai:bedd6226` (Olivia, 5,490) — the `eng` pool's
top male and female. Eve genuinely is absent, but Eve has **never** been an English voice on this
estate; she is a multilingual *target* voice across 19 locales. So "recast to Eve + clone" would
replace Olivia with Eve — a taste decision, not a repair.

### The named fulfiller cannot do the named scope in any case

The request row says the scope is "a fresh build over LINKED clips, which `/generate` skips", and
directs you to `/generate-pods` instead. But `/generate-pods` only queues sentences with **no**
audio linked. It skips linked clips too. So the tool named on the row cannot perform the job
described on the row.

### The re-count, which the plan asked for

The plan says: "Re-count pod-0. Pod count moved 104 → 106 while the aligner kept cloning. Re-run
immediately before rendering, not from tonight's number." Done. It has moved again — **109 pods
estate-wide now**, 57 of them pod-0 in the courses in scope.

| Figure | Plan said | Live today |
|---|---|---|
| pod-0 English clips present | 0 | **7,771 linked and alive** |
| Empty pod-0 English slots | 5,723 | **680** |
| Renders in scope | 1,128 | **251** distinct missing texts, or **3,326** distinct text × cast-voice |

None of the plan's numbers reconcile against live data. The premise "pod-0 English is 0 clips"
is not true: 7,771 English clips exist and are linked. They are in the wrong voices, which is a
different problem with a different fix — recasting, then rendering.

### The D5 overlap I was asked to check

`spa_for_eng` and `deu_at_for_eng` are both in the 57, and both carry unproofread draft lines that
decision D5 is holding. **In the event this is moot — nothing in Group A ran, so zero unproofread
lines were voiced.** Had the gate not stopped it, I would have held both courses.

**Still open, and not mine tonight:** `cym_s_for_eng` is released and serving 104 unproofread
draft lines to learners right now. Flagging it so it does not slip a second time.

### What was honoured

- **All `cym_*` courses** — none appear in the queue at all, and the 83 `cym_n` canon renders were
  deliberately never queued. Left exactly that way.
- **Explainer clips (D6)** — not touched.
- **The 784,266-render estate-wide English rebuild** — rejected, not approached.
- **The 12 older pending rows** — out of scope, not run, not tidied, status untouched.

---

## What needs Tom

**1. The veracity detector's last-word rule is producing false alarms, and it has already been
believed once.** All four identified clips are fine. A clip that says "it is okay" was queued for
re-rendering because a transcriber spelt it "OK". The same rule accounts for **467 of the 534**
failures sitting in the French verdict cache — which is where the missing 21 were supposed to come
from. *My recommendation: before any repair run trusts that cache again, exempt clips whose final
word is a short function word, and re-run it. Cheaper than rendering 467 clips that are probably
correct.*

**2. Pod-0 cannot be rendered until a cast is approved — but the cast is already right.**
~~Recast to Eve + clone first.~~ **Withdrawn: that recommendation rested on my track error.** The
English cast is the clone plus Olivia and needs no repair. What remains true is that all 57 courses
sit at `no_approval`, so nothing can render at all. *My recommendation: approve the existing cast
through the voice-approval gate and render on that. Swapping Olivia for Eve is a separate taste
call and should not be bundled into a render job.*

---

*Evidence: `scripts/a401/` in the Popty checkout (S3 baselines, the 59-row queue snapshot, the
re-count, the approval-gate probe, the control measurement).*
