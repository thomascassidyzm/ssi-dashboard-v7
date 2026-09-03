# Pod-0 English: one shared cast

**11 Aug 2026.** Your decision B is applied. Every pod-0 English track in the estate is now
Olivia and Tom — the two xAI clones already in wide use — instead of each course keeping its own
English cast. **Metadata only. Nothing was generated, nothing was deleted, no audio pointer moved.**

The way back is `docs/pods/pod-english-shared-cast-archive.json`, which holds the full
before-state of every pod. It has been tested, not just written.

---

## What changed

| | |
|---|---|
| Pods in scope | **96** |
| Pods changed | **78** |
| Character slots recast | **1,571** |
| Cast from nothing (had no English voice at all) | **23** |
| Already correct, left alone | **578** |
| **Human recordings, refused** | **44** |
| Genders filled (were absent) | 23 |
| Genders changed | 53 |

The English side was a patchwork of eight voices. It is now two:

| was | slots |
|---|---|
| Leo `xai:leo` | 482 |
| Sonia `en-GB-SoniaNeural` | 276 |
| Libby, Ryan, Hollie, Thomas, Alfie (Azure) | 209 |
| Olivia/Tom, but on the wrong character's gender | 61 |
| "Nova", sharing Olivia's own voice_id under a different name | 2 |
| no voice at all | 23 |

Those last two rows cost nothing to fix: same voice_id, so no clip is affected.

### The scope grew while I worked, and that is fine

Your brief named 60 pods. It is 96, because the alignment worker was cloning `pod-0-unrecorded`
pods the whole time I was running — 60 → 70 → 82 → 96 over about an hour. The tool takes its scope
from a query rather than a list, so the clones were picked up automatically, and it is idempotent:
a second full run found **0 changes and 2,178 slots already correct**. Re-run it when the alignment
work finishes and it will catch anything cloned after me.

### What it refused to touch

**44 character slots are human recordings.** `cym_n_for_eng` and `cym_s_for_eng` are voiced by Aran
and Catrin on *both* tracks — all 22 characters each. Overwriting those would have discarded the
cast of record for audio that people actually recorded. Both Welsh pods came through completely
untouched. **Flagging it for you to overrule if you disagree**, but the make-before-break rail says
a human recording's cast is not something a metadata sweep gets to reassign.

`voice_config.podCast` exists on exactly **3 courses** — `cym_n_for_eng`, `cym_s_for_eng` and the
E2E test fixture — and all three are human-recording casts. **Zero podCast changes.**

---

## Gender: 76 corrections, and the ones I did NOT make

Your rail said fix gender where it is missing or contradicts the character. The interesting finding
is how few genuinely qualified.

**23 filled, all `fin_for_eng`** — the one pod in the estate that was never cast at all: no gender
and no English voice on any of its 23 characters. Filled from the estate's own values:

> Anna f · Sarah f · Barista f · Receptionist f · Learner f · Guest m · James m · Local m ·
> Driver m · Friend m · Waiter m · Tourist m · Bartender m · Neighbour m · Pharmacist m ·
> Customer n · Customer 1 n · Customer 2 n · Customer 3 n · Narrator n · Assistant n ·
> Passenger n · \_default n

**53 changed — every one of them the Learner, `n` → `f`.**

**And I changed nothing else, deliberately.** At first glance the estate looks full of gender bugs:
`hin` has a male Barista where 58 other pods say female, `tha` has a female Waiter and Pharmacist,
`heb`/`ara_sy`/`cat` have a male Learner. Every single one of those traces to a documented,
text-evidence-based human pass — `pod-voice-gender-sweep-2026-07-16.md` and
`tha-listening-recast-plan-2026-07-16.md`, which between them fixed a real learner complaint
("male voice using female politeness particles"). A majority vote across 60 pods would have quietly
reverted all of it. **The apparent bugs are the fixes.**

### The Learner is the whole ball game, and it nearly went wrong

The Learner speaks **79 of the canon's 231 lines** — a third of the pod. `pod-sync.cjs`
already pins the Learner to `'f'` in committed code, with a written rationale. Measured against the
live estate that ruling is also exactly what makes a pod approvable:

- Learner `n` (→ male voice): line share **84% / 16%** — which PodLab `castFlags` marks **bad**,
  "lopsided; one voice carries the pod".
- Learner `f`: **50% / 50%**.

The two pods that already carried `'f'` were measurably the only balanced ones. So flipping it is
right — **but a blanket flip would have shipped a real bug.**

`gender` drives *both* tracks. This tool only writes the English voice, but the field it reads is
the same field `pod-sync` uses to pick the **target** voice on its next run. Set a Learner female
whose Arabic lines are male-scripted, and the next sync puts a female voice on those lines. That is
the July complaint, in mirror.

So the flip is gated on `tools/gendered-speech.cjs` — the estate's own detector, the one the July
sweep was built on — run over the whole course's Learner lines. **It found male markers in 9
courses and held them all back:**

> `ara`, `ara_eg`, `hin`, `ita`, `pol`, `por`, `por_br`, `spa`, `spa_mx` (17 pods)

plus four already recorded `'m'` and never touched (`ara_sy`, `cat`, `heb`, `spa_for_eng`).
`tha` detects **female** and flipped safely. The gate is course-scoped, not pod-scoped, because the
half-aligned clones have blank target text and would otherwise have looked innocent and flipped
while their own pod-0 held back.

**This is the one thing worth your eye.** Those 9 courses now have a male Learner and a 84/16 pod.
The alternative is a female Learner reading male-scripted Hindi. I would not change it without
changing the target text, which is content work, not casting.

---

## 1. The pool: no trap. Nothing to do.

`app_config.pod_voice_pools.eng` already has **Olivia at `f[0]` and Tom at `m[0]`**:

```
eng.f[0] = {"name":"Olivia","provider":"xai","voice_id":"bedd6226"}
eng.m[0] = {"name":"Tom",   "provider":"xai","voice_id":"gfzdpspr5fdp"}
```

`pod-sync` takes index 0 per gender, so the next sync re-derives exactly this cast. **No reorder was
needed and none was made** — the other 45 pools are untouched and byte-identical.

One caveat: the pool entries carry no `locale`, while the cast objects carry `locale: "en"` (copied
byte-for-byte from your `spa_for_eng` precedent). A future `pod-sync` would write the same voice
without the locale key — same audio, but the cast fingerprint would move. Worth knowing before
someone re-syncs a course after approving it.

**Unrelated, spotted in passing:** the `tur` pool is scrambled. `tur.f[0]` is
`tr-TR-AhmetNeural` — a male voice under the female key — and `tur.m` holds `Emel`, a female name.
Out of my scope; it will mis-cast the next Turkish sync.

## 2. The casting gate: nothing was invalidated, because nothing was approved

`castFingerprint` covers **every pod of a course**, so recasting pod-0 moves the fingerprint and
would stale any approval. **`app_config.pod_voice_approvals` is `{}` — there are no approvals in the
estate at all.** Nothing was invalidated. Everything must be approved fresh either way.

**Do other pods of these courses need the same treatment? Almost none — there are only three.**

| pod | lines |
|---|---|
| `hrv_for_eng:pod-1` | 180 |
| `spa_for_eng:music` | 749 |
| `spa_for_eng:travel-situations` | 72 |

Every other English-side course has *only* a pod-0. So the fingerprint concern is nearly moot: for
57 of 59 courses, approving the cast approves exactly what I changed. For `hrv_for_eng` and
`spa_for_eng` the approval would also cover those three pods, whose English is still the old
per-course cast. **I did not touch them, per your instruction — tell me and it is one more run.**

### Are the pods approvable now?

**40 of 96 are balanced. 56 still read lopsided — but 52 of those fix themselves.**

Those 52 are the pods still on the **old 142-line text**, where the Learner has only 6 lines, so the
gender ruling has nothing to bite on. Their metadata is already correct; when the alignment worker
moves them to the 231-line canon the Learner picks up its 79 lines and they become 50/50 **with no
further casting change**. The remaining 4 are the male-Learner courses above, and they are lopsided
for a documented reason.

## 3. What this invalidates: 5,369 clips

**5,369 distinct `course_audio` rows across 56 courses** currently point at an English voice that is
no longer the cast. 455 are already on it. `cym_n`/`cym_s` lose nothing (human, untouched);
`fin_for_eng` loses nothing (it never had an English clip).

Note this is *distinct clip rows*, not pod slots — the `-unrecorded` clones share their source's
audio ids, so counting slots would have double-counted. The slot figure is 7,338.

---

## 4. The flag you asked me to settle: **CONFIRMED, and it is expensive**

> `phase8-audio-v13.cjs findExistingAudio` filters on `.eq('course_code', courseCode)`, so the
> generator cannot reuse another course's clip.

**Confirmed.** It is now at **line 6110**, not 5799 — the file has moved since the survey:

```js
async function findExistingAudio(courseCode, text, language, role, voiceId) {
  const { data, error } = await supabase
    .from('course_audio')
    .select('id, language, voice_id')
    .eq('course_code', courseCode)          // ← the whole finding
    .in('text_normalized', audioKeyCandidates(textNorm))
```

Language and voice are then matched canonically in JS, but the course filter is a hard SQL
predicate. **A clip owned by another course is invisible to the generator.**

### So which number is real?

I priced it against the live database, steady state — one surviving pod-0 per course, 59 courses:

| | renders |
|---|---|
| **A. What phase8 would actually do today** | **10,193** |
| **B. Distinct `(text, voice)` identities that actually exist** | **539** |
| Duplication | **18.9×** |
| Wasted renders if A is approved as-is | **9,654** |

**10,193 is the real number.** Decision B gives you the shared *cast* — one voice, one sound, one
thing to approve — but on its own it delivers **none** of the plan's clip saving. Every course still
renders its own copy of "Good morning" in Olivia.

Both my numbers are larger than the plan's 374 / 5,837, and the reason is the text drift the survey
itself found: 16 of 59 courses are still on the old 142-line text with per-course rewording, so
there are genuinely more distinct strings today than the canon has lines. As alignment lands, B
falls toward the plan's 374. **The 18.9× ratio is the durable finding, not the absolute numbers.**

### The saving is reachable, and 16 courses already do it

The `course_code` filter is on the **generator**. The **link** has no such constraint — and this is
not theory:

```
1,904 cross-course English pointers are live on pod-0 right now.
Every eng_for_* course points at 119 clips owned by zho_for_eng.
```

Sixteen production courses already share one English clip set across course boundaries. So the
539-identity world needs no new architecture — it needs either a pointer pass (your open call 8) or
one relaxed lookup in `findExistingAudio` for English clips.

**My recommendation: do not approve 10,193 renders.** Approve the ~539, then point. It is the same
audio, a nineteenth of the spend, and one course's clips to re-render if you ever reject the voice.
That is a small code change standing between one generation approval and sixty-five.

---

## The tool

`tools/pods/recast-pod-english.cjs` — committed, dry-run by default, 16 tests over the pure
decision function.

- Reads `courses.known_lang`/`target_lang` to decide which track is English. Never the course code.
- Re-reads every row `FOR UPDATE` inside the transaction and **aborts the whole run** if it moved
  since the plan. Drift was not theoretical here: another worker was writing throughout.
- Archives every pod's full before-state before the first write, **add-only across re-runs** — a
  plain overwrite on the second run would have archived the already-recast state and silently turned
  the way back into a no-op.
- `--restore-from-archive` **proven, not asserted**: `jpn_for_eng:pod-0` was restored (Learner back
  to Sonia / `gender: n`), verified, and re-applied.

### Reconciled exactly

Re-read all 96 pods from the database afterwards:

```
character slots on the shared cast        2178
human-exempt slots, untouched               44
slots still off cast                         0
non-English track drift vs archive           0   ✓
English writes not in the applied log        0   ✓
gender changes vs archive                   76   = 23 fills + 53 Learner n→f
unexpected gender changes                    0   ✓
```

The delta equals the log and nothing else moved.

**No audio pass was queued — that is yours to do centrally.**
