# ⛔ RESCINDED — do not act on this document

> **2026-08-27.** Tom rejected this scope and it is stood down. It counted 55,091 clips carrying his voice **without verifying that anything plays them**, contrary to his 2026-08-24 ruling that a clip type must be proven consumed in code first. `pod_explainer` — 13,099 clips, ~1.54M credits of it — turns out to be served only by the `admin-pod-auditioner` route, not to learners at all.
>
> Superseded by **`docs/tts-bakeoff/pod-consumed-set-verification-2026-08-27.md`**, which establishes the genuinely consumed set: 11,161 clips, ~0.29M credits.
>
> Kept for the record, not for use. Nothing below should be queued.

---

# Replacing your pod voice — the scope, and the two things you should see first

**2026-08-27.** Instant clone confirmed, no PVC training started, no slot spent. This is the scoped plan for putting `tom_001` into the pods, **staged and not fired** — audio runs are human-triggered through popty.app, and nothing here renders itself.

**Noted once so the record is clean:** this replacement is a deliberate carve-out from your forward-only ruling, not a contradiction of it. Forward-only still governs everything else; the pods are an exception you have made on purpose.

---

## 1. The size of it, measured

| | Clips | Minutes | Characters | Courses |
|---|---|---|---|---|
| `pod_fine_known` | 41,992 | 1,335 | 1,169,586 | 38 |
| `pod_explainer` | 13,099 | 2,232 | 1,539,517 | 46 |
| **Total in your clone** | **55,091** | **3,567 min ≈ 59½ hours** | **2,709,103** | — |

**Cartesia bills roughly one credit per character.** So the full replacement is about **2.71 million credits against the 1.25 million your Startup plan includes each month** — a little over two months of your entire allowance, or an overage bill, in one run.

That is not a reason not to do it. It is a number you should say yes to on purpose rather than discover afterwards, and it is far past the $20 cap that governed the bake-off, so **I have not queued anything.**

---

## 2. The thing that does not match your plan

> *"he is only used on English-language pods"*

**That is not what the data says.** Of the 13,099 `pod_explainer` clips in your clone, **8,413 are English or `auto` — and 4,686 are not.** Your cloned voice is speaking French, Chinese, Japanese, Arabic, German, Spanish, Italian, Korean, Turkish, Hindi and Portuguese pod content across 46 courses.

The cause is in the code rather than in anyone's decision: `services/run-pod-explainer-batch.cjs:41` defaults `EXPLAINER_VOICE_ID` to `gfzdpspr5fdp` — your clone — for **every** course, whatever language it is in. Nothing ever scoped it to English.

**And a related flag while we are here:** 8,413 of those clips carry `language: 'auto'`. That is the exact setting the Italian pilot on 2026-07-10 proved reads cross-language words with English phonology — the reason the phonology gate exists. A chunk of the existing pod catalogue was rendered under it.

So the manifest is split in two, and the second half needs a ruling from you rather than a batch from me.

| Tranche | What it is | Clips | Minutes | Credits |
|---|---|---|---|---|
| **A** | English and `auto` pod clips — what you described | **50,405** | 2,690 | ~2.12M |
| **B** | Pod clips of yours speaking **other languages** | **4,686** | 877 | ~0.59M |

**My recommendation: fire A, hold B.** Tranche B is a different question wearing the same clothes — whether your voice should be the explainer for a Japanese or Arabic course at all is a product call about who the learner thinks is talking to them, and re-rendering it in a better clone would quietly re-commit to a decision nobody consciously made. If the answer is that it *should* be you, B is a second run and costs nothing extra to defer.

---

## 3. What is staged, and how you fire it

The manifest is committed at `tools/tts-bakeoff/pod-replacement-manifest-2026-08-27.json` — 152 rows, every course/role/language group with its clip count, minutes and characters, split into the two tranches above. That is the work-list, not a trigger.

**Nothing renders until you press it in popty.app.** The regeneration routes are human-triggered by design (`POST /api/production/:courseCode/regeneration/trigger-all` behind the dashboard), and I have deliberately not queued, scheduled or pre-flighted a single clip.

### Two standing rails this run sits under, both from the repo's own doctrine

**Make-before-break, without exception.** A voice swap generates and verifies the new asset *before* the old one is touched: render, verify each new clip is alive and correct-voiced, swap the links atomically, and only then delete the old clip. Deletion never precedes a verified replacement — not even "we'll regenerate right after". This is not caution in the abstract: the `fra_for_eng` Azure purge on 2026-08-03 deleted 31,310 rows before re-rendering and left about 2,000 course slots **silent for two days**. At 55,091 clips this run is bigger than that one. Doctrine and the two tools that already do it correctly: `docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md` §6b.

**Pod content is never edited in place.** Learner progress is filed under a sentence's *slot*, not its text, so an in-place pod edit silently credits a learner with a sentence they never heard — no error, no alarm. This run replaces audio under unchanged text, which is the benign case, but it is close enough to the dangerous one that it goes through `docs/pods/pod-migration-protocol.md` rather than around it.

**Before the first real run, two things I would want true**, and neither is done yet:
- **A shakedown course first, not the fleet.** One course, English, watched end to end, listened to before the second one starts. A dry-run proves nothing about 50,000 clips; a first real run is a shakedown and should be treated as one.
- **The course `voice_config` has to point at Cartesia for the pod roles.** Under ruling A no existing course was flipped, which is correct — and it means the pod replacement needs an explicit, deliberate config change per course. That is the switch that makes this run happen, and it is the one place where "forward-only" and "replace the pods" have to be reconciled by hand rather than by policy.

---

## 4. Aran — his English clone is built and renamed

**`aran_english_001`** — `d318a91c-8ccd-4739-b1c4-d0cd950cd481`, cloned from his own English presentation audio in `cym_n_for_eng`. Your ruling that Aran is the North Welsh voice settles the attribution I was holding open, so it is now named rather than labelled by provenance.

You are right that Welsh does not arise: **Cartesia has no Welsh**, and Welsh is human-recorded by standing rule anyway. What this clone is for is his **English** — which is exactly what the archive gave us, and there are ~115 minutes more of it if a Pro clone is ever wanted.

Listen and send: **https://watson-1.tail4968cb.ts.net/d/04124617** — his source recording next to four clips of the clone. The demo-and-approval line is at the top: nothing goes to production in his voice until he says yes.

---

## 5. Catrin — verified, and she needs nothing

**You were right.** Every clip attributed to Catrin in the database is Welsh:

| voice_id | language | role | clips |
|---|---|---|---|
| `human_catrinlliar_cym_n` | cym | target1 | 56 |
| `catrin_human` | cym | target1 / target2 | 35 |

**Zero English rows. No Catrin English clone is needed, and I have deleted the demo one** rather than leave an unapproved clone of someone's voice sitting in the workspace.

**Worth correcting, because I put it in front of you earlier:** the census inferred from an SSi doc that Catrin voices South Welsh's English presentation. That inference does not survive the data — the 117 minutes of English on `cym_s_for_eng` is a bare, **unattributed** `human` voice id, and Catrin's own rows are Welsh only. So we do not actually know whose English that is. It is not evidence of Catrin, and I am not going to clone it on a guess.

---

## 6. What this cost, and what is waiting on you

No PVC training, no slot spent, no pod audio rendered. Today's Cartesia spend remains the bake-off samples and demos — a few thousand credits of 1.25 million.

**Waiting on you:** the tranche-B ruling, and then firing tranche A in popty.app when you want it — ideally one shakedown course first.
