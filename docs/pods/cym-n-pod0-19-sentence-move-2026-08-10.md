# Northern Welsh: 19 sentences moved into the live pod

**Date:** 2026-08-10 · **Status:** read-only diagnosis, nothing changed · **Course:** `cym_n_for_eng` (North Welsh for English speakers)

---

## The verdict, in two sentences

**Yes, this is affecting real learners now.** North Welsh is a released, public, live course, and its listening pod — deliberately empty and therefore hidden since 6 August — came back at 16:45 UTC today holding 19 lines, of which exactly 2 have any Welsh audio; so the Dialogues tab has reappeared showing three scenes of readable Welsh, and a learner who plays it hears two short lines from Aran and then silence-and-skip through the other seventeen.

**It looks accidental, not a deliberate go-live.** The trail says someone pressed Generate on the pod-0 slug in the dashboard, which rewrote the pod's header — deleting the "[GATED 2026-08-06]" warning title that was the only marker holding it off live — and then wrote three scenes of freshly machine-translated Welsh, dragging the working copy's rows out of the safe pod and into the live one as a side effect of how row ids are named. It also overwrote Aran's proofreading from earlier the same afternoon on 15 of the 19 lines.

**Recommendation: revert tonight.** One word from you and I will put the 19 rows back where they were and restore the gated title. See "What a revert means" at the end.

---

## (a) The 19 sentences, verified against the live database

The other worker's figures hold up exactly. Verified by direct SQL against production Supabase at 2026-08-10 ~18:00 UTC.

**Pod shapes right now:**

| Pod | Rows |
|---|---|
| `cym_n_for_eng:pod-0` — **the id learner paths query** | **19** |
| `cym_n_for_eng:pod-0-unrecorded` — working copy, not learner-facing | 213 |
| `cym_s_for_eng:pod-0` — Southern, still correctly empty | **0** |
| `cym_s_for_eng:pod-0-unrecorded` | 232 |

So: 19, not more. The Southern course is untouched and still safe. The 19 are scenes 1, 2 and 3 **complete** (4 + 5 + 10 lines) — `pod-0-unrecorded` now begins at scene 4, global order 20. A clean scene boundary, not a ragged one.

**"Has a recording" means:** `listening_pod_sentences.target_audio_id` is not null AND the `course_audio` row it points at has `origin = 'human'`. Both of the two that qualify are voiced by `human_aran_cym_n` — Aran's own North Welsh voice. Nothing here is TTS; the other 17 have no target clip at all, of any origin. **None of the 19 has any English-side clip either** (`known_audio_id` is null on all 19), so there is no English audio to carry a learner through the gaps.

**2 of 19 confirmed.** The full list, in play order:

| # | Code | Speaker | English | Welsh | Recording |
|---|---|---|---|---|---|
| 1 | SC01-S001 | Neighbour (8 am) | Good morning, Sarah! | Bore da, Sarah! | **YES** (Aran) |
| 2 | SC01-S002 | Sarah | Good morning. How are you? | Bore da. Sut wyt ti? | no |
| 3 | SC01-S003 | Neighbour | I'm very well, thank you. Are you going to work? | Dw i'n dda iawn, diolch. Wyt ti'n mynd i'r gwaith? | **YES** (Aran) |
| 4 | SC01-S004 | Sarah | Yes, I've got a busy day today. I hope you have a good day. See you later. | Ydw, mae gen i ddiwrnod prysur heddiw. Dw i'n gobeithio cei di ddiwrnod da. Wela i di. | no |
| 5 | SC02-S001 | Sarah | Excuse me, is this seat free? | Esgusodwch fi, ydy'r sedd yma'n rhydd? | no |
| 6 | SC02-S002 | Passenger | No, it's free… Go ahead. | Nac ydy, mae hi'n rhydd… Ewch ymlaen. | no |
| 7 | SC02-S003 | Sarah | How far is it to town? | Faint ydy hi i'r dre? | no |
| 8 | SC02-S004 | Sarah | Can you tell me how far it is to town? | Fedrwch chi ddweud wrtha i faint ydy hi i'r dre? | no |
| 9 | SC02-S005 | Passenger | It's not very far… Maybe three or four miles. | Dydy hi ddim yn bell iawn… Ella tair neu bedair milltir. | no |
| 10 | SC03-S001 | Barista (3 pm) | Good afternoon. What can I get you? | Prynhawn da. Be ga i chi? | no |
| 11 | SC03-S002 | Sarah | Good afternoon. Could I have a coffee, please. With milk but no sugar. To take away. | Prynhawn da. Ga i goffi, os gwelwch yn dda. Efo llaeth ond dim siwgr. I fynd allan. | no |
| 12 | SC03-S003 | Sarah | Do you have any food? | Oes gennych chi fwyd? | no |
| 13 | SC03-S004 | Sarah | Do you have any snacks? | Oes gennych chi snacs? | no |
| 14 | SC03-S005 | Sarah | Do you have crisps, or nuts, or anything? | Oes gennych chi grisps, neu gnau, neu rywbeth? | no |
| 15 | SC03-S006 | Barista | No, we've only got drinks. | Na, dim ond diodydd sy gennym ni. | no |
| 16 | SC03-S007 | Barista | Yes, would you like the menu? | Ia, hoffech chi'r fwydlen? | no |
| 17 | SC03-S008 | Sarah | Yes, please. | Ia, os gwelwch yn dda. | no |
| 18 | SC03-S009 | Barista | Here's your coffee. | Dyma'ch coffi chi. | no |
| 19 | SC03-S010 | Sarah | Thank you very much. Goodbye. | Diolch yn fawr iawn. Hwyl fawr. | no |

### The finding the original flag did not contain: the Welsh was overwritten too

This is the part worth your attention. The same write that moved the rows **also rewrote the Welsh on 15 of the 19, and the English on 6** — and the replacement Welsh is not Aran's, not the text that was in the pod before 6 August, and not the pre-align archive. It is fresh machine translation, and it is measurably worse.

Three examples, with what the row held at 16:20 today (Aran's own afternoon proofreading) against what it holds now:

| Code | Aran had | Now reads | Problem |
|---|---|---|---|
| SC03-S003 | Ydach chi'n gwneud bwyd? | Oes **gennych** chi fwyd? | `gennych` is not North Welsh; the North form is `gynnoch` |
| SC03-S004 | Oes gynnoch chi rywbeth ysgafn? | Oes gennych chi **snacs**? | English loan where `byrbrydau` was already there |
| SC03-S007 | Oes,… fasech chi'n licio'r fwydlen? | **Ia**, hoffech chi'r fwydlen? | `Ia` answers the wrong question type; `hoffech` is standard, not North colloquial |

Two more that are simply wrong: **SC02-S003 "Faint ydy hi i'r dre?" is glossed "How far is it to town?" but means "how much is it to town?"** — the pre-existing line was the correct "Pa mor bell ydy hi i'r dre?". And SC03-S005 renders "crisps" as **"grisps"**, which is not a word in either language.

So the damage is two-layered: a live pod that is 17/19 silent, **and** a dialect and accuracy regression on a course whose whole selling point is that it is colloquial Northern, sitting on top of proofreading Aran did four hours ago.

---

## (b) Reachability: yes, and here is what a learner gets

**The course is live.** `courses` row for `cym_n_for_eng`: `status = released`, `new_app_status = live`, `visibility = public`, `is_community = false`. There is no separate pod-level publish gate — the 6 August gating worked purely by leaving `pod-0` childless. *(PROVED from the live `courses` table.)*

**The learner reads exactly this pod id.** `packages/player-vue/src/composables/useListeningPods.ts:161` — ``const podId = `${course}:pod-0` `` — then selects `listening_pod_sentences` on `.eq('pod_id', podId)`. There is no version, status or supersession predicate anywhere on that read. Whatever is in `cym_n_for_eng:pod-0` is what the learner gets. *(PROVED from code.)*

**Empty vs non-empty is the whole gate.** Same file, line ~239: when a network read returns zero rows the composable calls `clearCachedListeningPodRows(course)` — described in its own comment as "the course has no pod live". That is precisely why an empty `pod-0` held the pod off. It is no longer empty. *(PROVED from code.)*

**In the main flow, the 17 silent lines are skipped.** `packages/player-vue/src/composables/usePodLapScheduler.ts:799` and `:901`, in both the main-stage and preview loops:

```ts
const sentence = members[k]
if (!sentence.target_audio_id) continue
```

No throw, no placeholder, no gap of silence — the sentence never becomes a play at all. And `if (plays.length === 0) return null` / `continue` means a cohort with nothing playable yields no lap rather than an error. *(PROVED from code.)*

**But the main flow is only one of two doors, and the second one does not skip — it shows.** The Dialogues tab in Listening Mode un-hides itself the moment the pod is non-empty (`packages/player-vue/src/components/ListeningOverlay.vue:526`):

```js
const podsAvailable = computed(
  () => pods.isLoading.value || !!pods.error.value || pods.scenes.value.length > 0,
)
```

That is your own 2026-08-08 ruling — "a pod with nothing in it is hidden, not offered", commit `c53ac4bc` — and it is precisely the mechanism that was holding Northern Welsh back. Nineteen rows means three scenes, which means the tab returns. Nothing on that path filters by audio, so **all 19 lines become visible cards**, machine Welsh and all. On a card with no clip, `buildModalQueue` (`:1247`) builds an empty queue, the player logs "No audio for phrase, skipping" (`:1437`), plays a 90 ms silence and auto-advances (`:1453-1458`). *(PROVED from the deployed source.)*

**So, in plain English, there are two learner experiences and both are bad:**

- **A learner past round 6, in the normal flow:** hears Aran say **"Bore da, Sarah!"** and **"Dw i'n dda iawn, diolch. Wyt ti'n mynd i'r gwaith?"** — two lines out of nineteen. The other seventeen never reach the audio layer. No crash and no dead silence; the pod simply ends almost as soon as it starts.
- **A learner who taps the Dialogues tab:** sees the tab reappear, sees three scene cards, and can **read** all 19 lines — including "Oes gennych chi snacs?" and "grisps". Tapping Scene 3, which has zero recordings, scrolls silently through ten cards in about a second and ends. Not so much a dead surface as a surface that visibly does nothing.

**Live confirmation — PROVED, not inferred.** `GET https://saysomethingin.app/api/courses/available` → 200, includes `cym_n_for_eng` at `new_app_status: live`, `pricing_tier: premium`. `version.json` → build `76fd5d8`, the `origin/main` tip carrying every guard quoted above. An anonymous Supabase read using the publishable key shipped inside the production JS bundle returns **19 rows for `pod_id=eq.cym_n_for_eng:pod-0`, exactly 2 with `target_audio_id`, 0 with `known_audio_id`** — so the rows are not RLS-blocked from a client. Fetching those two clips through `/api/audio/{id}` returns 200 `audio/mpeg`. The pod is reachable, the data is what we think it is, and the audio that exists does play. `algorithm_config.listening` is `{"enabled": true, "podActivationRound": 6}`, so pod laps begin at round 6.

**Two further consequences worth naming:**

1. **Drill mode has no translation audio for any of the 19,** because `known_audio_id` is null on every row — even the two recorded lines drill target-only.
2. **Aran's recording queue still contains these 19.** The recording plan filters `listening_pods` on `course_code` only (`services/voice-engine/pods-router.cjs`, `fetchPods`) and does not care which pod a row sits in. They now carry the machine text, not his. **If he records tonight he records the regression** — and since he already corrected several of these lines this afternoon, it will look to him like his edits did not save.

### Explicit gaps

- **Nobody drove the real UI as a signed-in, entitled Welsh learner.** The live checks above are HTTP and database probes against production, plus the deployed build's own source. They are not a screenshot of the pod. The repo has the right instrument (`packages/player-vue/e2e/empty-pod-hidden-probe.mjs`) but it needs an entitled session, and no test account was used.
- **I have not checked whether anyone is currently enrolled on `cym_n_for_eng`.** This answers *can a learner reach it* — proved yes — not *has one*.
- **The Popty API is not running on this box** (`~/.pm2/logs/production-api-out.log` last wrote on 30 July), so there is no HTTP access log for 16:44 UTC and no way to see the request that triggered the generate, or who sent it.
- **The offline bundle may also leak the working copy.** `api/courses/[code]/bundle.ts:387,664` selects pods by `course_code` and fetches sentences with `.in('pod_id', …)`, so an entitled learner's download would carry `pod-0-unrecorded` too — 85 of those 213 rows have clips that would be needlessly cached. Inference: an entitled bundle was not fetched.

*(The reachability section above is worker #103's trace of the deployed learning app, cross-checked against my own reading of `useListeningPods.ts` and `usePodLapScheduler.ts`.)*

---

## (c) The trail: what did it, and was it meant

Every write below is in `content_audit_log`, which stores the **old** row on each UPDATE. `changed_by_role` is `postgres` on every row in this table — including Aran's own edits — so **the audit log cannot name a person.** Nothing here identifies who was at the keyboard, and nothing below should be read as naming anyone.

**The sequence, to the second:**

| Time (UTC) | What |
|---|---|
| 16:00–17:01 | Aran clears 109 draft flags across the Northern course, editing Welsh as he goes — one row every few seconds. Demonstrably a human working through a list. |
| **16:44:39** | The `cym_n_for_eng:pod-0` **pod header** is rewritten. Its title changes from `[GATED 2026-08-06] placeholder — sentences moved to cym_n_for_eng:pod-0-unrecorded until Aran/Catrin record them` to `Northern Welsh (colloquial Gogledd Cymru Welsh) Listening Pods — Pod 0`. |
| 16:44:54 | Scene 1 written — 4 rows, one statement, identical to the microsecond. |
| 16:45:34 | Scene 2 written — 5 rows, one statement. |
| 16:45:51 | Scene 3 written — 10 rows, one statement. Then it stops. |

**Three statements, one per scene, in scene order, 40s and 17s apart.** That is not one mis-scoped `WHERE` clause — a mis-scope is a single statement. It is a scene-by-scene loop with model latency between iterations.

**The header rewrite is the fingerprint.** That new title is not typed prose; it is the exact output of the template in `services/pod-dialogue-generator.cjs:318` — ``title: `${targetLanguage} Listening Pods — Pod 0` `` — written alongside `source_file: 'generated:canonical'` and `metadata.status: 'draft'`, both of which the pod row still carries. That header write is `upsertPodRow`, which `generatePodBatch` calls once before it starts generating scenes. The endpoint is `POST /api/admin/pods/generate` (`services/production-api.cjs:3904`), whose slug **defaults to `pod-0`** and which is bounded at `deadlineMs: 45_000, maxScenes: 4`. Our run: header at 16:44:39, three scenes, stopped at 16:45:52 — 73 seconds, i.e. one call that overran its 45-second budget mid-scene-3 and returned, with the UI's continue-loop never firing again.

**Why generating a pod moved rows out of the safe pod.** The 6 August gating did not use `tools/pods/clone-pod.cjs` (which renames row ids to `<course>:pod-0-unrecorded:SC01-S001`). It moved the original rows by repointing `pod_id`, so all 213 rows sitting in `pod-0-unrecorded` still carry ids that read `cym_n_for_eng:pod-0:SC01-S001`. The generator builds its row ids as `` `${podId}:SC..-S..` `` and upserts on `id`. Generating scene 1 of `pod-0` therefore did not create a new row — it **collided with the working copy's row and dragged it back into `pod-0`**, rewriting its text on the way. The safety of the whole 6 August scheme rested on the two pods having distinct row ids, and they never did.

**Intentional or accidental?** My read: **accidental**, and I will give you the reasoning rather than just the label, because it is a judgement.

- Against "deliberate partial go-live": nobody staging a go-live starts with the three scenes that are **least** recorded. The 19 rows carry 2 clips; the 213 left behind carry 85. If you were bringing a pod live scene by scene you would bring the recorded scenes first. Nobody deliberately deletes their own "[GATED]" warning label either — that title was the safety note, and it was the first thing overwritten. And no deliberate go-live overwrites the proofreader's four-hours-old work with machine text in the same stroke.
- Against "stray SQL": the writes are far too structured — a per-scene loop, a matching header template, a 45-second budget honoured.
- What fits both facts: someone opened the pod tools for the Northern course while Aran was working in it and hit Generate, on a screen whose slug field defaults to `pod-0` and which gives no sign that `pod-0` is the live one and `pod-0-unrecorded` is where the work lives. The tool did exactly what it says on the tin. The gate was a naming convention, and a defaulted form field walked straight through it.

**One fact that does not fit, reported rather than smoothed over.** `writeSceneSentences` (`services/pod-dialogue-generator.cjs:344`) sets `target_audio_id: null` on every row it writes — that is on `origin/main` too, so it is what is deployed. Yet SC01-S001 and SC01-S003 kept Aran's clips through the 16:44:54 write, and there is no later audit row that could have restored them. So either the backend that served this call is running a build that differs from `origin/main`, or something other than the committed generator produced writes with the generator's exact header and cadence. I could not settle it: **the API is not running on this box, so I have no HTTP access log for 16:44 UTC and cannot see the request or its caller.** Everything else in this section is proved from the audit log and the source; this one thread is open.

---

## What a revert means, if you say the word

Reversing this is small and safe, and it is the make-before-break-shaped choice — it puts a live surface back to "absent" rather than "present but empty", which is the state you already decided you wanted on 6 August.

1. Repoint the 19 rows' `pod_id` back to `cym_n_for_eng:pod-0-unrecorded`, leaving `pod-0` childless and the pod invisible again.
2. Restore the `[GATED 2026-08-06] placeholder…` title on the `pod-0` header so the marker is back.
3. Restore the 15 overwritten Welsh lines and 6 English lines from the audit log's `old_row` — the pre-16:44 values, including Aran's afternoon edits, are all recoverable verbatim.

Nothing is deleted, no audio is touched, and Aran's two clips stay attached either way.

**The separate, one-word question underneath it:** should the row ids in `pod-0-unrecorded` be re-slugged so this cannot happen again? Today the two pods are one defaulted form field apart. Until the ids differ, any Generate on any gated course repeats this — and the fleet rollout will point that tool at sixty more courses.

---

## Appendix — the queries

Pod shapes and the 19 rows:

```sql
select p.id, p.course_code, count(s.id)
from listening_pods p
left join listening_pod_sentences s on s.pod_id = p.id
where p.course_code like 'cym%' group by 1,2 order by 1;

select s.global_order, s.speaker, s.known_text, s.target_text,
       ca.voice_id, ca.origin
from listening_pod_sentences s
left join course_audio ca on ca.id = s.target_audio_id
where s.pod_id = 'cym_n_for_eng:pod-0' order by s.global_order;
```

The move itself — what changed in each of the three statements:

```sql
select s.global_order, l.changed_at,
       (l.old_row->>'pod_id')      is distinct from s.pod_id      as pod_changed,
       (l.old_row->>'target_text') is distinct from s.target_text as text_changed,
       (l.old_row->>'known_text')  is distinct from s.known_text  as known_changed,
       l.old_row->>'target_text' as was, s.target_text as now
from listening_pod_sentences s
join content_audit_log l
  on l.primary_key = s.id and l.table_name = 'listening_pod_sentences'
 and l.changed_at in ('2026-08-10 16:44:54.714147+00',
                      '2026-08-10 16:45:34.912268+00',
                      '2026-08-10 16:45:51.529696+00')
where s.pod_id = 'cym_n_for_eng:pod-0' order by s.global_order;
-- 19 rows; pod_changed true on all 19, text_changed on 15, known_changed on 6
```

The header rewrite that removed the gating marker:

```sql
select changed_at, old_row->>'title', old_row->'metadata'->>'status', old_row->>'source_file'
from content_audit_log
where table_name = 'listening_pods' and primary_key = 'cym_n_for_eng:pod-0'
order by changed_at desc limit 3;
-- 16:44:39 old title = '[GATED 2026-08-06] placeholder — sentences moved to …'
```

Course liveness:

```sql
select course_code, status, new_app_status, visibility, is_community
from courses where course_code like 'cym%';
-- cym_n_for_eng | released | live | public | f
```
