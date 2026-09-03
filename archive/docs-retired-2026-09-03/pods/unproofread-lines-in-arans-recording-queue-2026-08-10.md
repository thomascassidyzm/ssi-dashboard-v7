# Why unproofread Welsh phrases are reaching Aran's recording queue

**Date:** 2026-08-10 · **Status:** read-only diagnosis, no code changed · **Course:** `cym_s_for_eng` and `cym_n_for_eng`

---

## The verdict, in one sentence

Aran is being handed lines to record that nobody has ever proofread, and they are **not** duplicates from an old pod version — there is no duplicate row anywhere in either Welsh pod; the real cause is that the DRAFT marker was only ever switched on for the 213 lines Opus wrote on 6 August, so the 142 lines of Welsh that were already in the pod from 11 June are equally machine-written, equally unread, and yet look completely clean to the recorder.

Concretely, on the Southern course right now: **Aran's recording queue is 87 lines. 15 carry the "DRAFT — AWAITING ARAN" badge. The other 72 carry nothing — and 67 of those 72 are June machine-drafted Welsh no human has ever read.** The screen even tells him "15 of your 87 lines are machine-written drafts nobody has proofread yet", which reads as a promise about the other 72 that is not true.

---

## What Aran is actually looking at

Aran is `admin` with `courses: "*"` and no `voice_id`, so he is not confined to the recorder shell. His recording surface resolves like this: `/record/cym_s_for_eng` → `RecordRoom.vue` finds his email in `courses.voice_config.podCast`, gets `podVoiceId = human_aran_cym_s`, sees no reading-script slot, and therefore opens in **dialogue mode** → `PodLongTakeStudio` → `GET /api/production/cym_s_for_eng/pods/recording-plan?voiceId=human_aran_cym_s`. So the DRAFT badge does reach his eyes, on the lines that have it. He is not in `AutocueStudio` and not on the course reading-script path.

His proofreading surface is `PodDetailView`, and the list he was given is the one built by `tools/pods/build-welsh-translation-worklist.cjs` — which is defined as exactly the rows with `target_text_draft = true`. **That is what "what he was asked to proofread" means, and it is why the two sets do not line up.**

He is live in it as I write: he cleared all 109 Northern drafts between 16:00 and 17:01 UTC today, and started on the Southern ones at 17:06.

## The two classes, and which one is the bug

**(a) Superseded pod version — DOES NOT EXIST. Ruled out with data.** Both Welsh courses have exactly two `listening_pods` rows, `pod-0` and `pod-0-unrecorded`, and they are a **partition, not a duplication**: 232 sentences split between them, never copied. Across both Welsh courses there are **zero** rows sharing a `target_text`, and **zero** sharing a `known_text`. So Aran's guess — "duplicates from a previous version of the pod" — is a near miss: the lines really are from the previous version of the pod, but they are the *surviving* previous version, sitting in the same pod as the new material, not a second copy of it.

**(b) Unproofread-but-current lines — this is the whole of it, and it is bigger than the badge suggests.** The `target_text_draft` column was created on 6 August (`database/migrations/20260806_pod_sentence_target_text_draft.sql`) with `DEFAULT false`. Every line that already existed became `false`. `false` therefore means two completely different things — "a human approved this" and "this predates the marker" — and nothing in the estate can tell them apart. The recording plan, the badge and the header warning all treat `false` as proofread.

Southern Welsh, by vintage:

| | line count | `target_text_draft` |
|---|---|---|
| Written 11 June by the pod generator, never touched since | 116 | **false** — reads as proofread |
| Written 11 June, rewritten by Opus on 6 Aug | 26 | true (badged) |
| New slots created 6 Aug, filled by Opus | 78 | true (badged) |
| New slots created 6 Aug, **June Welsh carried onto them** | 12 | **false** — reads as proofread |

The last row is the sharpest case and the one worth a line of code. `tools/pods/align-pod0-to-canonical.cjs` builds its write payload from a fixed ten-column list (line 318) that **does not include `target_text_draft`**. On the UPDATE path that is harmless. On the INSERT path the new row takes the column default, `false` — including when the tool has just *carried old, unread target text forward* onto that new slot. Eleven of those twelve are the whole of Scene 22 in Aran's Southern queue (`SC22-S001` … `SC22-S011`), and five of them are in his own queue at positions 83–87. Same twelve on the Northern course. The audit log confirms they have never once been `true`.

## Scale beyond Welsh

Across the estate there are **9,700-odd pod sentences carrying target text with `target_text_draft = false`**, of which only a few hundred have ever been read by a human. `spa_for_eng` has 1,066 such lines (103 of them created after 1 August), `deu_at_for_eng` 76, `fin_for_eng` all 142 — that course's entire pod was created after 1 August with the marker never set. Every one of those is a recorder being told nothing.

## Recommendation

**1. Do not fix this with a filter.** Excluding unproofread lines from the recording queue would delete 72 of Aran's 87 Southern lines and 287 of Catrin's 375 — it would not tidy the queue, it would end the recording session. And there is no column to filter on that separates "approved" from "never marked".

**2. The fix is the approval semantics — i.e. job #94, already scoped and awaiting your word.** The tick button plus `target_text_approved_by` / `target_text_approved_at` is exactly the thing that makes `false` mean one thing instead of two. Until those columns exist, no queue anywhere can honestly say which lines have been read. I have not built it, per your instruction.

**3. One small correction that is clearly right on its own: make the aligner carry the draft flag with the text it carries** — add `target_text_draft: carryTarget ? src.row.target_text_draft : false` to the payload in `align-pod0-to-canonical.cjs`. Today a line that *is* a flagged draft would silently lose its flag if the aligner ever re-ran over it, and the fleet rollout will run this tool across sixty more courses. I did **not** land this: it is not the cause of Aran's problem, the tool has no unit-test seam without exporting its planner, and your instruction was report-first on anything past a contained query fix. It is a one-word yes.

**4. Change the header copy either way.** "15 of your 87 lines are machine-written drafts nobody has proofread yet" is the sentence doing the damage — it implies the other 72 have been. Until approval is recorded, the honest line is that only the badged ones are *known* unread.

## One thing I saw that is someone else's live work

Between 16:44 and 16:46 UTC today, 19 sentences (scenes 1–3) were moved by direct SQL from `cym_n_for_eng:pod-0-unrecorded` back into `cym_n_for_eng:pod-0` — the id learner paths query, which the 6 August gating deliberately left childless to hold the pod off live. Only 2 of the 19 have any human recording. The Southern course's `pod-0` is still correctly empty. I have not touched it; flagging it because it makes Northern Welsh partly live and it happened during this investigation.

---

## Taste-safe defaults I took, flagged

- The brief's default was "if both leaks are present, fix the stale-version leak and report the unproofread one". Only one leak is present, and it is the one the brief said to report rather than fix. So: nothing applied.
- I could not reconstruct the exact queue Aran was looking at when he complained (around 16:20 UTC), because he has been clearing draft flags all afternoon. Every number above is the live state at 17:20 UTC today.

---

## The affected phrases

### Aran — cym_s_for_eng — the 72 unbadged lines (queue position | scene-sentence | speaker | Welsh)
1 | SC01-S001 | Neighbour | Bore da, Sarah!
2 | SC01-S003 | Neighbour | Dw i'n dda iawn, diolch. Ti'n mynd i'r gwaith?
3 | SC04-S001 | Friend | Helo, noswaith dda!
4 | SC04-S003 | Friend | Na, mae'n ddrwg 'da fi,… dw i'n brysur fory. Ond gad i ni si
5 | SC05-S001 | Neighbour | Noswaith dda, Sarah. Gest ti ddiwrnod hir?
6 | SC06-S001 | James | Esgusodwch fi. Helo. Beth yw eich enw chi?
7 | SC06-S003 | James | James dw i. Neis cwrdd â chi.
8 | SC06-S005 | James | Dw i'n dod o Fanceinion,… ond dw i'n byw… yn Llundain nawr. 
9 | SC06-S007 | James | Mae hon yn ddinas hyfryd. Beth dych chi'n neud?
10 | SC06-S009 | James | Mae'n ddrwg 'da fi,… wnes i ddim deall. Dw i'n dysgu Cymraeg
11 | SC06-S011 | James | Dw i'n dysgu Saesneg,… ond ddim mewn ysgol. Dw i'n gweithio…
12 | SC06-S013 | Narrator | Un. Dau. Tri. Gwyn. Du.
13 | SC07-S007 | Customer 2 | Gallen i gael dau goffi gwyn… a dau goffi du… ac un o rheina
14 | SC07-S009 | Customer 2 | Ydw,… alla i gael gwydraid o ddŵr… hefyd, os gwelwch yn dda.
15 | SC07-S011 | Customer 2 | Alla i dalu… gyda cherdyn? Oes contactless 'da chi?
16 | SC07-S013 | Customer 3 | Bore da. Dau Americano… a chwpaned o de,… os gwelwch yn dda.
17 | SC07-S015 | Narrator | Pump. Deg. Un deg pump. Coch. Gwyrdd.
18 | SC08-S005 | Customer 2 | Alla i gael hanner o seidr?
20 | SC08-S008 | Customer 3 | Licen i wydraid mawr… o win gwyn, os gwelwch yn dda.
21 | SC08-S010 | Customer 2 | Licen i… ddau wydraid arall o gwrw.
22 | SC08-S015 | Customer 2 | Oes brechdanau 'da chi? Licen i frechdan gaws,… os gwelwch y
23 | SC08-S016 | Narrator | Pedwar. Chwech. Wyth. Glas. Melyn.
24 | SC09-S002 | Waiter | Croeso. Dewch gyda fi,… os gwelwch yn dda. Dyma'r bwydlenni.
25 | SC09-S003 | Waiter | Licech chi ddŵr llonydd… neu ddŵr pefriog i ddechrau?
26 | SC09-S004 | Customer 2 | Licen ni… un botel o ddŵr pefriog… ac un botel o ddŵr llonyd
27 | SC09-S006 | Waiter | Oes… ma'r eog a'r risotto… yn rhydd o glwten. Ma gyda ni rai
28 | SC09-S008 | Waiter | Ma'r oen yn ardderchog. Ma fe 'di… cael ei goginio'n… araf, 
29 | SC09-S010 | Customer 2 | A'r risotto i fi. Gyda salad gwyrdd bach… i ddechrau.
30 | SC09-S011 | Waiter | Wrth gwrs. A beth licech… chi i'w yfed?
31 | SC09-S013 | Customer 2 | Byddai potel… o win coch y tŷ yn hyfryd.
32 | SC09-S014 | Waiter | Dewis ardderchog. Do i ag e draw nawr.
33 | SC09-S015 | Waiter | Ydy popeth yn iawn? Oes lle gyda chi i bwdin?
34 | SC09-S017 | Customer 2 | A'r bil… pan fyddwch chi'n barod. Allen ni rannu fe?
35 | SC09-S018 | Narrator | Saith. Naw. Un deg un. Oren. Porffor.
36 | SC10-S001 | Customer | Esgusodwch fi. Oes gyda chi… unrhyw dabledi lladd poen?
37 | SC10-S003 | Customer | Diolch. A oes gyda chi unrhyw… dabledi lladd poen i blant?
38 | SC10-S005 | Customer | Ma ishe i fi gael… rhywfaint o eli haul… a phast dannedd hef
39 | SC10-S007 | Customer | Diolch,… dych chi wedi bod yn help mawr. Dw i'n ddiolchgar i
41 | SC10-S010 | Narrator | Un deg dau. Un deg tri. Un deg pedwar. Pinc. Llwyd.
42 | SC11-S001 | Guest | Prynhawn da. Ma bwcin 'da fi… dan yr enw Jones.
43 | SC11-S003 | Guest | Wrth gwrs. Dyma fy mhasbort i.
44 | SC11-S005 | Guest | Oes golygfa 'da'r stafell?
45 | SC11-S007 | Guest | Am faint o'r gloch… ma brecwast yn… ca'l ei weini?
46 | SC11-S009 | Guest | Gwych. Ydy hi'n bosib… i ni ga'l check-out hwyr?
47 | SC11-S011 | Guest | A beth yw cyfrinair… y wifi?
48 | SC11-S013 | Narrator | Un deg chwech. Un deg saith. Un deg wyth. Dydd Llun. Dydd Ma
50 | SC12-S002 | Pharmacist | Wrth gwrs. Beth yw eich symptomau chi?
51 | SC12-S003 | Customer | Dw i 'di bod â phen tost… a gwddw tost ers ddoe.
52 | SC12-S004 | Pharmacist | Triwch barasetamol… ar gyfer y pen tost,…a'r losin 'ma… ar g
53 | SC12-S005 | Customer | Pa mor aml ddylwn i gymryd… y parasetamol?
54 | SC12-S006 | Pharmacist | Un bob pedair i chwe awr,… dim mwy nag wyth mewn diwrnod.
55 | SC12-S007 | Customer | Ydy hi'n iawn eu… cymryd nhw gyda bwyd?
56 | SC12-S008 | Pharmacist | Ydy, gyda bwyd… neu ar ôl bwyd sydd orau.
57 | SC12-S009 | Customer | Diolch. Alla i gael pecyn… o blasters hefyd?
59 | SC13-S001 | Tourist | Esgusodwch fi,… ydych chi'n gwybod… sut i gyrraedd… yr archf
60 | SC13-S002 | Local | Ydw,… mae hi tua deg munud… o waith cerdded. Cerwch yn syth…
61 | SC13-S003 | Tourist | Heibio i'r eglwys yna?
62 | SC13-S004 | Local | Ie, heibio i'r eglwys… a'r swyddfa bost.
63 | SC13-S005 | Local | Wrth yr ail gylchfan,… cymerwch… yr allanfa gyntaf.
64 | SC13-S006 | Tourist | A wedyn?
65 | SC13-S007 | Local | Fe welwch chi'r archfarchnad… ar eich ochr chwith,… jyst gyf
66 | SC13-S008 | Tourist | Gwych. Ac oes 'na beiriant arian… gerllaw?
67 | SC13-S009 | Local | Oes, mae un ar y stryd fawr,… wrth ymyl y becws.
68 | SC13-S010 | Tourist | Diolch yn fawr iawn. Dych chi wedi bod yn help mawr.
69 | SC13-S011 | Narrator | Tri deg. Pedwar deg. Pum deg. Dydd Gwener. Dydd Sadwrn.
71 | SC14-S004 | Driver | Falle tua ugain munud,… os byddwn ni… ddim yn anlwcus… gyda'
72 | SC14-S006 | Driver | Ydw,… bydda i'n eich gollwng chi… reit wrth y swyddfa docynn
83 | SC22-S002 | Friend | Wrth gwrs, dim problem. Ti i'w weld… yn siarad yn dda iawn. 
84 | SC22-S004 | Friend | Ydw i'n siarad… yn ddigon araf i ti nawr?
85 | SC22-S006 | Friend | Dw i'n meddwl… dy fod ti'n gwneud… yn dda iawn. Ti wedi creu
86 | SC22-S008 | Friend | Dylet ti fod yn hyderus… yn barod. Dw i'n meddwl… dy fod ti'
87 | SC22-S010 | Friend | Dw i'n meddwl… bod hynny'n normal. Mae dysgu iaith newydd… y

### Aran — cym_s_for_eng — the 15 badged DRAFT lines
19 | SC08-S006 | Customer 3 | Alla i weld y rhestr win? Dw i moyn gwydraid o win.
40 | SC10-S009 | Customer | Dych chi'n garedig iawn! Ydw, dw i ar wyliau,… ac ma ishe… i
49 | SC12-S001 | Customer | Bore da. Dw i ddim yn… teimlo'n grêt… — allwch chi argymell 
58 | SC12-S010 | Narrator | Un deg naw. Dau ddeg. Dau ddeg un. Dydd Mercher. Dydd Iau.
70 | SC14-S002 | Driver | Galla, wrth gwrs. Falle bydd hi'n cymryd… tipyn o amser,… ma
73 | SC14-S007 | Driver | Dyma ni. Deuddeg punt a hanner yw hi.
74 | SC14-S009 | Driver | Gallwch, wrth gwrs. Ma'r peiriant… jyst fan hyn.
75 | SC14-S010 | Narrator | Cant. Dau gant. Mil. Dydd Sul. Deuddeg o'r gloch.
76 | SC15-S011 | Narrator | Can mil. Chwe deg. Saith deg. Un o'r gloch. Un ar ddeg o'r g
77 | SC16-S011 | Narrator | Miliwn. Wyth deg. Naw deg. Dau o'r gloch. Deg o'r gloch.
78 | SC17-S011 | Narrator | Tri o'r gloch. Naw o'r gloch. Ionawr. Chwefror.
79 | SC18-S011 | Narrator | Pedwar o'r gloch. Wyth o'r gloch. Mawrth. Ebrill.
80 | SC19-S011 | Narrator | Pump o'r gloch. Saith o'r gloch. Mai. Mehefin.
81 | SC20-S011 | Narrator | Chwech o'r gloch. Gorffennaf. Awst. Medi.
82 | SC21-S014 | Narrator | Hydref. Tachwedd. Rhagfyr.

---

## Appendix — the code trace and the SQL

**Queue construction.** `GET /api/production/:courseCode/pods/recording-plan?voiceId=` (`services/voice-engine/pods-router.cjs:474`) → `fetchPods` (line 120, `listening_pods` filtered on `course_code` only — no version, status or supersession predicate) → `fetchAllSentences` (line 131) → `buildRecordingPlan` (`services/voice-engine/pods-plan.cjs:110`). Selection is by cast: a line enters this voice's queue when `castVoiceFor(cast, speaker).voiceId === voiceId` and the target text is non-empty. `targetIsDraft` is computed at line 162 and passed through as `draft: true` — it is a badge, never a filter. `finalizeRecordingPlan` (line 222) removes only lines already recorded by a human under an accepted voice id. Rendered by `PodLongTakeStudio.vue` — header warning at lines 37–41, per-line badge at line 109.

**The only writer that clears the marker** is `buildSentenceEditPatch` (`services/voice-engine/pods-cast.cjs:305`), as a side effect of a human writing `target_text`.

**The aligner's payload column list** — `tools/pods/align-pod0-to-canonical.cjs:318`:

```js
const COLUMNS = ['id', 'pod_id', 'scene_number', 'sentence_number', 'global_order',
  'speaker', 'known_text', 'target_text', 'target_audio_id', 'known_audio_id']
```

`target_text_draft` is absent, so every inserted slot takes `DEFAULT false` — including slots that receive carried-forward target text (line 181, `target_text: carryTarget ? src.row.target_text : ''`).

**Vintage vs marker:**

```sql
select p.course_code,
       case when s.created_at < '2026-08-01' then 'JUNE' else 'AUG regen' end vintage,
       s.target_text_draft, count(*)
from listening_pod_sentences s join listening_pods p on p.id = s.pod_id
where p.course_code like 'cym%'
group by 1,2,3 order by 1,2,3;
```

**Proof there are no duplicates** (returns 0 rows, both directions, both courses):

```sql
select a.id, b.id
from listening_pod_sentences a
join listening_pod_sentences b
  on lower(regexp_replace(a.target_text,'[^a-zA-Z0-9 ]','','g'))
   = lower(regexp_replace(b.target_text,'[^a-zA-Z0-9 ]','','g'))
 and a.pod_id < b.pod_id
join listening_pods pa on pa.id = a.pod_id
join listening_pods pb on pb.id = b.pod_id and pb.course_code = pa.course_code
where pa.course_code like 'cym%';
```

**Proof the twelve were never drafts:**

```sql
select s.id, s.target_text_draft, s.created_at,
  (select count(*) from content_audit_log l
    where l.table_name = 'listening_pod_sentences' and l.primary_key = s.id
      and (l.old_row->>'target_text_draft') = 'true') as ever_draft
from listening_pod_sentences s
where s.pod_id = 'cym_s_for_eng:pod-0-unrecorded'
  and s.created_at > '2026-08-01' and s.target_text_draft = false
order by s.global_order;
-- 12 rows, ever_draft = 0 on every one
```

The queue itself was reproduced by running the real `buildRecordingPlan` and `finalizeRecordingPlan` logic against the live database (the HTTP endpoint needs a dashboard session; that is the one thing I could not hit directly — see the gap note).

**Explicit gap:** I could not call `/api/production/.../recording-plan` over HTTP — it returns 401 without a dashboard JWT and I have no way to mint Aran's session. Every queue figure above therefore comes from executing the service's own plan-builder module against the live DB with the live cast, which is the same code path minus the auth wrapper. No figure here is from a document.
