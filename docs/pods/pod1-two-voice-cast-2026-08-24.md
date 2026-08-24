# Pod 1 — the two-voice cast, applied to all 22 courses

*2026-08-24. Tom's ruling: **Pod 1 standardises to TWO VOICES ONLY per course**, because the Welsh
and community courses only have two voices and everything should standardise to that pattern. The
earlier recommendation — split `Interlocutor` into Local/Waiter and invent a new Staff voice — is
overruled. No new voice was created anywhere.*

**Landed: 22 of 22 pods recast. The cast gate passes on 20 of 22. Nothing was rendered, nothing was
deleted, no audio pass was queued.**

---

## What actually governs casting

`checkPodCast` (`tools/pods/pod-cast-gate.cjs`) reads **`listening_pods.speakers`** — a JSONB map of
canonical speaker name → `{target: {voice_id, …}, known: {voice_id, …}}`. That map, and nothing else,
is the role-to-voice lookup. `content_audit_log` is a trigger's snapshot and governs nothing; the
speaker *labels* on `listening_pod_sentences` are matched against the map by canonical name
(parenthesised markers stripped: `Neighbour (8 am)` → `Neighbour`).

So this was a one-column change: `listening_pods.speakers`, on 22 rows.

## Why there was work to do

`reattribute-pod1-speakers.cjs` fixed a two-year-old mis-attribution: 11 drill lines per course that
only a shop, a hotel or a waiter could say were labelled `Learner`. Four became `Staff`, seven became
`Interlocutor`. Neither name was in any course's cast map, so the gate correctly reported them uncast
and flipped PASS → FAIL on 20 of 22 courses, blocking `unlink-off-cast-pod-clips.cjs` and therefore
step 1 of `pod1-render-sweep.cjs`. That tool refused to invent a voice, which was right. This one
does the casting, from voices the course already has.

## The cast, per course

Every pod already held **exactly two target voices and two known voices** — the two-voice standard is
not new; it has been the shape since the 2026-08-23 per-call recast. Voice A is read off the pod as
the Learner's voice; voice B is the pod's other existing voice. Nothing was chosen.

| Course | A — learner voice | B — second voice | known A / known B |
|---|---|---|---|
| ara_eg_for_eng | eve | rex | bedd6226 / gfzdpspr5fdp |
| ara_for_eng | ar-EG-SalmaNeural | ar-EG-ShakirNeural | bedd6226 / gfzdpspr5fdp |
| deu_at_for_eng | 44c91d64 | e1fc5a89 | bedd6226 / gfzdpspr5fdp |
| deu_for_eng | 3a7889066fa2 | 41321eb41295 | bedd6226 / gfzdpspr5fdp |
| eus_for_eng | eu-ES-AinhoaNeural | eu-ES-AnderNeural | bedd6226 / gfzdpspr5fdp |
| fra_ca_for_eng | fr-CA-SylvieNeural | fr-CA-JeanNeural | bedd6226 / gfzdpspr5fdp |
| fra_for_eng | 69smp8rm | 0p0rt7o1 | bedd6226 / gfzdpspr5fdp |
| gle_for_eng | ga-IE-OrlaNeural | ga-IE-ColmNeural | bedd6226 / gfzdpspr5fdp |
| hin_for_eng | ara | 89q2pnko | bedd6226 / gfzdpspr5fdp |
| hrv_for_eng | hr-HR-SreckoNeural | hr-HR-GabrijelaNeural | gfzdpspr5fdp / bedd6226 |
| isl_for_eng | is-IS-GudrunNeural | is-IS-GunnarNeural | bedd6226 / gfzdpspr5fdp |
| ita_for_eng | ara | x7avnu1k | bedd6226 / gfzdpspr5fdp |
| jpn_for_eng | ja-JP-MayuNeural | ja-JP-NaokiNeural | bedd6226 / gfzdpspr5fdp |
| kor_for_eng | ko-KR-YuJinNeural | bf9fe5b5f981 | bedd6226 / gfzdpspr5fdp |
| nld_for_eng | 58d27475085e | a13662ba951c | bedd6226 / gfzdpspr5fdp |
| por_br_for_eng | ara | pt-BR-JulioNeural | bedd6226 / gfzdpspr5fdp |
| por_for_eng | eve | rex | bedd6226 / gfzdpspr5fdp |
| ron_for_eng | ro-RO-AlinaNeural | ro-RO-EmilNeural | bedd6226 / gfzdpspr5fdp |
| spa_for_eng | es-ES-ElviraNeural | yis75yfp | bedd6226 / gfzdpspr5fdp |
| spa_mx_for_eng | es-MX-CarlotaNeural | es-MX-LucianoNeural | bedd6226 / gfzdpspr5fdp |
| swe_for_eng | 3b312632 | 4c7f16ff | bedd6226 / gfzdpspr5fdp |
| zho_for_eng | 33g9t0jl | jpi39icg | bedd6226 / gfzdpspr5fdp |

**Changes written:** `Staff` → B and `Interlocutor` → B on all 22. Plus, on spa and spa_mx only,
`Bar Customer 2` → A and `Diner 2` → A (see below). 48 map entries in total; no other role moved.

## The fork Tom needs to see

A **literal** reading of "every non-learner role goes to the second voice" was simulated first, and
measured. It is destructive, and the measurement is unambiguous.

Scenes 1–14 of Pod 1 are **two-hander dramas with no Learner in them at all** — Sarah↔Neighbour,
Anna↔James, Guest↔Receptionist, Diner 1↔Waiter. Putting every non-learner role on one voice collapses
all of them onto that single voice: **27 same-voice exchange pairs per course**, including Anna
answering herself for 11 turns and Guest answering the Receptionist for 11 turns. That breaks Tom's
*other* standing acceptance criterion for this very gate, ruled 2026-08-23: "ZERO same-voice exchange
pairs, and EXACTLY TWO voices in the cast — there's always male talking to female, so that two voices
can actually do the whole thing."

Both rulings are Tom's and they agree on the number: **two voices**. They disagree only on which
roles sit where. What was applied is the reading that satisfies both: **two voices only, no third
voice invented, and the new roles draw from the pair the course already has** — `Staff` and
`Interlocutor` speak to the Learner in scenes 15–21, so they sit on the voice the Learner is not on.

If Tom means the literal partition instead — one voice for the Learner, one for absolutely everyone
else, accepting that scenes 1–14 become a single voice talking to itself — say so and it is a
one-line change to `FLEET_ALIGNMENT` and a re-run. **Nothing here has to be undone to get there.**

## spa / spa_mx: does the ruling resolve them?

**Partly — and the residue is not casting at all.**

Their same-voice failures were a two-role drift from the fleet: in 20 of 22 courses `Bar Customer 2`
and `Diner 2` sit on the Learner's voice, which is what makes their exchanges with the Bartender and
the Waiter alternate. In spa and spa_mx alone they sat on the second voice. Aligning them to the
fleet standard is exactly the standardisation Tom asked for, needs no new voice, and cleared both
failures. **Casting on spa/spa_mx is now clean.**

What still fails the gate on those two — and only those two — is a different defect class entirely.
Ten Learner clips whose stored text disagrees with their row by exactly one word:

| | clip text says | row says |
|---|---|---|
| spa s16/2, s22/5 | seguro | segura |
| spa s19/2 | preocupado | preocupada |
| spa, spa_mx s22/1 | nervioso | nerviosa |
| spa, spa_mx s22/9 | cansado | cansada |
| spa, spa_mx s22/11 | contento | contenta |
| spa_mx s22/5 | seguro | segura |

Every one is masculine → feminine adjective agreement, on a Learner row, voiced by the female learner
voice. That is the signature of **gender adaptation**: the female voice speaks the adapted feminine
form, and `course_audio.text` stores the unadapted base. The clips are almost certainly correct and
the **gate is blind to adaptation**. It is a gate blind spot, not a content defect, and it is not
this change's to fix — flagged here for a separate decision.

## The Narrator rule (one gate correction, required)

Casting `Interlocutor` to the second voice fired a same-voice `Interlocutor↔Narrator (1 turn)` on all
22 courses. That finding is spurious.

**The Narrator does not converse.** Every one of its lines is a scene sign-off reading the clock and
the calendar — *"6 o'clock. July. August. September."* Measured across the 22 live pod-1 pods:
**352 of 352 Narrator lines are the last line of their scene.** Nobody ever answers it; the only
adjacency it can form is (scene's last speaker → Narrator). The gate passed on it until now purely by
accident — the Narrator sits on the second voice in every course, and every scene's last speaker
happened to sit on the other one. `Interlocutor` closes scene 21, so casting it ended the accident.

`buildExchangeWeights` now drops adjacencies the Narrator is party to, tagged `reason:
'non-conversant'`, on exactly the rule `NON_EXCHANGE` already encodes (adjacent, different speakers,
not talking to each other). It could not be enumerated by `scene:sentence` tag because the sign-off's
sentence number differs per structural class. Two tests pin it: the sign-off passes, and a genuine
Anna↔Guest collision inside a narrated scene still fails. 59/59 gate tests green.

## Re-render scope — REPORTED, NOT ACTED ON

**No TTS was generated. No audio pass was queued. No clip was deleted, unlinked or relinked.** This
decision is Tom's.

`checkPodCast` will *not* surface this backlog: its clip check judges membership of the pod's voice
**set**, and both voices remain in the set, so a role that swaps sides leaves clips that are on-cast
and mis-voiced. The numbers below are computed directly, clip by clip.

### Caused by this change

**11 turns per course × 22 courses = 242 turns** — the reattributed `Staff` and `Interlocutor` lines,
whose clips were rendered when those lines were still labelled `Learner` and so speak in the learner
voice. Plus 6 split clips on spa and 6 on spa_mx from the `Bar Customer 2` / `Diner 2` realignment.

| | rows | distinct clips | also referenced by rows OUTSIDE this scope |
|---|---|---|---|
| target whole-turn | 242 | **241** | 165 rows across 37 pods |
| known whole-turn | 242 | **110** | 407 rows across 59 pods |
| target split | 12 | — | — |
| known split | 6 | — | — |

**The known side is 110 clips, not 242** — the English narration is pooled across courses. And it
**cannot be re-rendered in place**: 407 rows outside this scope share those same 110 clips and would
be dragged onto the second voice with them. Make-before-break applies on both tracks — render new
clips, verify them, relink only the 242 in-scope rows, and never mutate the shared originals.

There is **no abandoned Staff voice**. No clip anywhere was ever rendered under a Staff or
Interlocutor voice, because those names were never cast. Nothing is orphaned by this change.

### Pre-existing drift, for contrast (not caused by this change)

**214 turns / 636 split clips** across 20 of the 22 courses, where a split-array clip's voice already
disagreed with its role's cast before today — the class `pod1-render-sweep.cjs` already exists to
work through. Worst: fra_ca (26 turns), jpn (25), kor (25), hrv (24). Clean: deu, deu_at, fra.

Full per-role breakdown: `docs/pods/pod1-two-voice-cast-2026-08-24-applied-log.json`.

## Migration protocol — does not apply

`docs/pods/pod-migration-protocol.md` governs changes to pod **content**: sentence text and sentence
position. Learner progress is keyed by `sentence_id` (`<pod>:SC17-S002`, or `<row.id>:s<k>` for a
split unit), and the protocol matches survivors on **known text**.

This change wrote one JSONB column on `listening_pods` and touched no `listening_pod_sentences` row —
no text moved, no slot moved, no audio link changed. Nothing to migrate, and nothing a learner could
be mis-credited for. Asserted by construction: the tool's only write is
`update listening_pods set speakers = …`.

## Reproduce / reverse

```
node tools/pods/pod1-two-voice-cast.cjs            # dry run, all 22
node tools/pods/pod1-two-voice-cast.cjs --verify   # gate only, writes nothing
node tools/pods/pod1-two-voice-cast.cjs --apply
```

Dry run by default; per-pod before-state assertion inside the UPDATE predicate (JSONB-to-JSONB, so
drift aborts rather than writes through); refuses to introduce any voice the pod does not already
have; refuses any pod that does not resolve to exactly two voices or has no `Learner` entry. The
applied log carries a full `castBefore` / `castAfter` snapshot per pod, so every change is reversible
from it. Re-running is idempotent — the verify pass reports `changes=0` on all 22.
