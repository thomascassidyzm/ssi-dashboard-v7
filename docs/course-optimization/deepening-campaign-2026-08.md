# Deepening campaign — big-9 (for-English) + variants — 2026-08

**Goal (Kai, 2026-08-02):** get the courses in good shape. Run a deepening pass on all 9 paid
for-English courses + their variants, checking for repetitive USE phrases. **Read a large
amount of seeds to confirm quality first**, then keep going with deepening/backfill where the
base is clean. Fully delegated — sequential, my order, no per-step approval. TTS stays Kai's click.

## ✅ RESULTS — autonomous deepening complete (2026-08-02/03)
**414 new deepening USE phrases across 5 courses, every one reviewer-verified, all draft/no-audio (TTS = Kai's click).**

| Course | Phrases | Reviewer verdict |
|---|---|---|
| kor_for_eng | 52 | all KEEP (0 fix/0 del) |
| zho_for_eng | 145 | 138 keep / 7 fix / 0 del |
| ara_eg_for_eng | 73 | 63 keep / 10 fix (bare→bi-) / 0 del |
| ara_for_eng | 17 | all KEEP (vocalized, lean by design) |
| ara_lb_for_eng | 127 | 125 keep / 1 fix / 0 del |

Pattern: writer (anchor to attested/locked renderings, NEVER force) → validate.cjs → register-aware Opus
reviewer (ZUT-drift is the main defect class) → team-lead applies fixes (attestation-checked before apply).
Zero forced phrases; hard orphan classes (atoms/numbers/reported-speech fragments/case-marked/late-seed)
correctly left orphan. All 5 courses' new phrases need a TTS pass (Kai).

**NEXT (needs Kai):** (1) TTS for the 414 new phrases. (2) Repair backlog (jpn/kor/por/ara tails — below).
(3) Two lego-target prereqs to unblock spa_mx + por_br deepening. (4) yue/hak/nan = native review first.
Low-value full-basket courses (por/fra/ita/deu/deu_at/fra_ca/deu_ch) intentionally SKIPPED.

## Workflow per course (learned from kor, day 1)
1. **Confirm quality by reading** — `node scripts/deepening/sample.cjs <course> --every 25` +
   targeted reads. Identify: (a) build-broken / HELD regions, (b) systemic phrase-level defect
   classes, (c) repetition %. Verify against `courses.quality_rules` + course memories — but
   **trust the DB read over the memory** (kor's "301-548 repaired" note was stale; real
   degradation onset was ~S460).
2. **Scope** the deepening to the *confirmed-clean* seed range only. A broken/degraded tail is a
   separate **repair-first** track (final-pass/rebuild), NOT something backfill can fix — spreading
   onto broken LEGOs propagates the defect.
3. **Deepen** the clean scope: `analyze.cjs --max-uses 5 --max-seed <clean-end> --out` → ONE Opus
   backfill writer (hosts inside clean scope, host_seed > spread_seed, NEVER force) →
   `validate.cjs --since` → **register-aware Opus reviewer** (ZUT-drift is the main defect class,
   not grammar) → list any deletions for Kai.
4. **One writer per course** (backfill-submit assigns U-numbers per basket; concurrent writers collide).

## Tooling
- `tools/backfill-spread/analyze.cjs` / `validate.cjs` (+ `docs/.../lego-spread-backfill-playbook.md`)
- `scripts/deepening/sample.cjs <course>` — stratified USE-basket dump + repetition metric
- `scripts/deepening/fleet-scan.cjs` — fleet orphan ranking
- course-builder API: **http://localhost:3471** (pm2 `course-builder`). `/api/vocab/<c>?seed=N`,
  `/api/resume/<c>`, `POST /api/build/backfill-submit/<c>`.

## Fleet orphan ranking (2026-08-02, gold = Welsh 6-9%)
Orphan = new LEGO never reused outside its own seed. `<10` = fewer than 10 outside uses.

| Course | orphan% | <10% | tier | CJK |
|---|---|---|---|---|
| hak_for_eng | 69.5 | 76.1 | draft variant | cjk |
| kor_for_eng | 54.9 | 76.1 | **released base** | |
| por_for_eng | 48.8 | 72.6 | **released base** | |
| ara_lb_for_eng | 47.7 | 72.9 | beta variant | |
| ara_for_eng | 46.9 | **81.1** | beta base | |
| por_br_for_eng | 46.1 | 68.0 | beta variant | |
| fra_for_eng | 44.7 | 68.6 | **released base** | |
| ara_eg_for_eng | 43.3 | 73.8 | beta variant | |
| fra_ca_for_eng | 41.5 | 72.8 | draft variant | |
| nan_for_eng | 39.7 | 67.4 | draft variant | cjk |
| deu_at_for_eng | 39.0 | 72.4 | draft variant | |
| spa_mx_for_eng | 38.2 | 65.1 | beta variant | |
| jpn_for_eng | 37.3 | 64.5 | **released base** | cjk |
| deu_for_eng | 35.8 | 58.7 | beta base | |
| deu_ch_for_eng | 35.5 | 66.9 | draft variant | |
| ita_for_eng | 33.2 | 67.8 | **released base** | |
| yue_for_eng | 32.0 | 59.4 | draft variant | cjk |
| zho_for_eng | 26.9 | 51.1 | **released base** | cjk |
| spa_for_eng | 22.8 | 59.6 | released base | ✅ partly deepened Jul |
| ara_sy_for_eng | — | — | draft (0 content) | skip |

## Per-course disposition & status
Order: worst-first, live before draft, CJK last (need native/model form-check).

| # | Course | Repetition | Status | Deepen scope | Repair-first band |
|---|---|---|---|---|---|
| 1 | kor_for_eng | **28%** | ✅ pass1 DONE+VERIFIED (52 KEEP, 0 defects) | **4-450** | 451-668 (build-broken tail=repair); ~401 hard orphans left (correct-to-skip); optional pass2 (open more connector hosts). NEW PHRASES AWAIT TTS (Kai) |
| 2 | por_for_eng | 0% | ✅ read; deepen-ready (low value) | **4-561** | 562-668 frozen-core+malformed-Q; S147/150 BR-proclisis |
| 3 | ara_for_eng | 2% | ✅ pass1 DONE+VERIFIED (17, all KEEP) | **1-162 + 301-668** (skip 259,374) | 17 vocalized-correct, 0 fix/0 del; clusters kept (frame=lego). ~527 remain=NATIVE case-by-case track. NEW PHRASES AWAIT TTS (Kai) |
| 4 | ara_lb_for_eng | 7% | ✅ pass1 DONE+VERIFIED (127, 1 fixed, 0 del) | **1-668** skip empties 189,193,321,329,374,479,516,579,646,651,653 | reviewer 125 keep/2 soft-fix (1 applied تنتين; 1 skipped ألعاب=unattested)/0 del. ~549 hard orphans remain. NEW PHRASES AWAIT TTS (Kai) |
| 5 | fra_for_eng | 0% | ✅ read; deepen-ready (low value) | **1-668** | none blocking; cleanups: "?"-spacing S150-299, "sont bien"×17, S196-200 tense |
| 6 | por_br_for_eng | 1% | ✅ read; deepen-ready (prereq fix) | **1-668** (fix/skip 8 tu-lego seeds) | PREREQ: 2 tu-legos ouviste/perguntaste→você ouviu/perguntou (S366,369,371,372,373,377,382,407). EU frozen-eu NOT present. Cosmetic: factos→fatos, tenho a certeza |
| 7 | ara_eg_for_eng | 2% | ✅ pass1 DONE+VERIFIED (73, 10 fixed, 0 del) | **1-668** skip empties 237,259,265,305,321 | reviewer: 63 keep/10 fix (bare→bi- present)/0 del. 504 harder orphans left (respawn). NEW PHRASES AWAIT TTS (Kai) |
| 8 | deu_for_eng | 0% | ✅ read; deepen-ready (low value) | **1-668 EXCLUDE S300** | S300 modal+inf word-order calque (4 phrases) |
| 9 | spa_mx_for_eng | 2% | ⏸ BLOCKED on Kai (lego-target prereq) | **301-668** (1-300 already varied) | PREREQ = LEGO-TARGET fix (not 6 simple rows): S635/1 lego "that is"=esa es→eso es (neuter), cascades to build+component+~6 use +S639/642 reuse. Structural→Kai's call. Back 2/3 at 5-floor |
| 10 | ita_for_eng | 0% | ✅ read; deepen-ready | **1-668** | none; GATE backfill vs ~18 clitic-drop "it" chunks; 37 dup USE |
| 11 | jpn_for_eng | 1% | ⛔ REPAIR-FIRST (not a deepen candidate) | (1-300 only, low value) | S451-668 + S301-325 unlicensed reported-speech tags (16.7%, peak 67-73% S551-600); fragment-glue; keigo tail S642-668 |
| 12 | deu_at_for_eng | 0% | ✅ read; NOT a deepen candidate (well-spread) | (skip) | i/ich sweep DONE; cleanups: 6-row mid-sentence cap bug (safe), wir/mir 165 rows + i/ich-in-Sie-band (native call). Draft |
| 13 | deu_ch_for_eng | 0% | ✅ read; low-value deepen 1-644; tail repair-first | 1-644 (skip 7 empties 193,264,267,286,291,298,321) | full baskets→low value; TAIL S645-668 broken (embedded V-S inversion, caps, Sie-lowercase); 7 empties need backfill. Draft |
| 14 | fra_ca_for_eng | 0% | ✅ read; deepen-ready but LOW value | 1-668 (skip empties 67,264,298,329) | full baskets (0% rep, ~10 USE/seed)→orphan-spread only; clean QC, no fra defects. Draft |
| 15 | zho_for_eng | ~3-5% | ✅ pass1 DONE+VERIFIED (145, 7 fixed, 0 del) | **1-668** | reviewer: 138 keep/7 fix/0 del; 553/636 monotony=non-issue (lego IS 我觉得). ~151 zero-use+180 low-use remain (correct-skip). NEW PHRASES AWAIT TTS (Kai) |
| 16 | yue_for_eng | template-heavy | ✅ read; deepen-worthy but HOLD | ~508 floor-pinned filled seeds | HIGH value (floor-pinned + ~28% template lead-ins) BUT: HOLD for native register sign-off (~230 "mainland" concern) + unbuilt tail 620-668 (62 empty+8 sub-floor=build-first). Draft |
| 17 | nan_for_eng | 0% | ✅ read; NOT deepen (incomplete+native-pending) | (skip) | built only to S467 (468-668 UNBUILT); baskets full at 5; 24 empty seeds 113-199; NO romanization layer; copy-paste err S300L2; route to build-completion+native review. Draft |
| 18 | hak_for_eng | 0% | ✅ read; NOT deepen-first, HOLD native | (tail S500-668 atomic vocab only, later) | 69.5% orphan = 93% ARTIFACT (composite build-chunks) + tail vocab; baskets healthy (avg 18.2); ⚠️ rare codepoint 𠊎 U+2000B TTS risk; known-side English defects tail. Draft, native-pending |

## KEY FINDING (wave 1, 2026-08-02): repetition is NOT fleet-wide
Mechanical stem+rotating-adverb repetition: **kor 28%, ara 2%, por/fra/ita/deu ~0%**. The European
base courses are already well-varied (readers confirmed by reading — real object/time rotation, not
filler). So Kai's "repetitive USE phrases" symptom is concentrated (kor; likely CJK via long-fused-lego
effect — [[lego-length-drives-phrase-variety]]). What IS fleet-wide: (a) high orphan/under-spread rates
(spaced-recall value, subtler), (b) **defect bands each final pass missed** (below) — the real
"good shape" wins. Deepening the 0%-repetition courses = orphan-spread only (lower urgency); prioritize
repetition-heavy (kor, CJK) first, and surface the repair bands to Kai.

## STRATEGIC REFRAME (2026-08-02): the real problem is degraded 301-668 back-thirds, not repetition
A consistent pattern across courses: the **1-300 region is clean** (final passes covered it), but the
**301-668 extension** (built later by Sonnet builders / variant-expansion) **degraded and was never
final-passed** — and that's where the defects concentrate:
- jpn: S451-668 unlicensed reported-speech tags (peak 73%) + S301-325 cluster
- kor: 460-548 reporting-verb-no-connective + 549-668 build-broken
- por: 562-668 frozen-core reported speech + malformed-Q
- ara: 163-300 un-vocalized band (mid, not tail, but same "extension built differently")
So the highest-value "get in good shape" work is **repairing these back-thirds** (paid courses, Kai's
call), NOT deepening. Deepening is genuinely valuable only where a course is both clean AND
under-spread/repetitive: **zho (best), kor front 4-450, ara clean windows**. The European base courses
(por/fra/ita/deu) are clean but already 0% repetition → deepening = orphan-spread only (low urgency).
Common defect family = **unlicensed reported-speech/opinion tags** (jpn と言ってた, kor 다고 했어요, por frozen-eu) —
the Sonnet extension builders over-applied a "he said/I think" frame the known side doesn't contain.

**⚠️ ORPHAN-METRIC CAVEAT (hak, 2026-08-02):** analyze.cjs counts composite/build-chunk legos
(multi-word superstrings) as orphans even though they CORRECTLY appear only in their debut seed. On
courses with many composite legos (esp. CJK) the orphan% is inflated (hak 69.5% was 93% artifact). So
the fleet orphan ranking is a rough signal only — **basket-fill (thin/floor-pinned) is the reliable
deepen indicator**, which is what the per-course reads measured.

**DEEPEN VALUE CRITERION (refined):** high orphan% alone does NOT justify deepening — a course is only
worth it if it ALSO has thin/floor-pinned baskets or real in-basket repetition. Courses with full
baskets (avg ~7-10 USE, 0% repetition) — por/fra/ita/deu/deu_at/fra_ca/deu_ch (7 courses) — would
just get over-filled; SKIP or treat as very-low priority. Real deepen value = kor(28% rep), zho(55% at floor), ara_eg(240 thin
5-baskets), spa_mx(back 2/3 at 5-floor), por_br(thin), ara/ara_lb(check basket fill).

## REPAIR BACKLOG (Kai's call — paid live courses; deletions/rebuilds gated)
- **jpn S451-668 + S301-325** — strip/delete unlicensed `…と言ってた/と思う` tags (1,122 rows, 16.7%; peak 67-73% S551-600) + fragment-glue seeds (S550/570/445) + register decision on keigo tail S642-668 (plain-vs-polite clash).
- **por 562-668** — Class B frozen-core reported speech (~55 rows, subject frozen to "eu": S586/599/600/611/615/621…); Class A malformed reported-Q in English known (~38 rows, S623-667). Rebuild/repair track.
- **por S147/150** — BR proclisis leak in EP course (`ela me viu`→`ela viu-me`), ~5 rows; targeted enclisis sweep.
- **ara 163-300** — un-vocalized batch (no harakat, inconsistent with rest) + real grammar errors (S200 plural-agreement). Revocalize + repair before eligible.
- **ara S328/330/528** — dangling-أن fragments (in clean scope; eyeball before spreading those legos). S575/S423 predicate-case (3 rows). S668 mood error.
- **fra** — "?"-spacing missing S150-299 (297 rows, scriptable but ⚠️changes text→may null audio on live course); "sont bien"→bon(ne)s (17 rows S457-598); S196-200 seq-of-tenses (~3).
- **ita** — ~18 clitic-drop "it" phrases (S446/445/210/325…) — ⚠️backfill would REPRODUCE against bad chunks; fix or gate. 37 exact-dup USE (harmless).
- **deu S300** — modal+infinitive word-order calque (4 phrases, `wirken` misplaced); LEGO-target rebuild. Thin baskets S123/S207 (good deepen targets).
- **kor 451-668** — builder-1 reporting-verb-no-connective (460-548) + build-broken 549-668 (교회가-leak, re-decomp). Never-finished final pass.
- **spa_mx S635/1 lego** — LEGO-TARGET fix (not 6 simple rows): lego "that is"=`esa es`→`eso es` (only ever used neuter: great/a mistake), cascades to 2 build + component `esa`→`eso` + ~6 use rows (incl. S639/642 reuse). Structural + audio implication → Kai's call. Prereq for spa_mx deepen. Keep feminine `esa es` at S635/2-3 (bolsa) unchanged.
- **ara_lb S369-413** — full-width `。` on 460 English-known rows (builder artifact, cosmetic); known-side text+audio cleanup, independent of deepening.
- **ara_lb pre-existing lego defects** (flagged by reviewer, predate deepening): S611L02 "I look"=`دور` (bare stem, should be `أدور` 1sg prefix); S511L05 "arrives"=`وصل` (past form for present). Lego-target fixes; new deepening phrases faithfully use the defective legos (kept).
- **por_br 2 tu-legos** — ouviste/perguntaste→você ouviu/perguntou (LEGO-target fix; cascades to 20 USE over S366-407); prereq for por_br deepen. Cosmetic: factos→fatos (30 rows S311/369), tenho a certeza (26 rows S340).

## Deepen queue (value-ranked, sequential writers, one per course)
1. kor 4-450 (RUNNING). 2. zho 1-668 (prepped). 3. ara_eg 1-668 (skip 5 empties). 4. ara_lb 1-668 (skip 11).
5. ara windows 1-162+301-668 (skip S374). 6. spa_mx 301-668 (after eso/esa fix). Then low-value orphan-spread:
por 4-561, fra 1-668, ita 1-668 (gate clitics), deu ex-S300. NOT deepen: jpn (repair-first).

## kor detail (2026-08-02)
- **Deepen-ready 4-450** — sampled S1/60/120/180/240/300/360/420 all clean & grammatical
  (몰라요 correct, subjects present, 어떻게…하는지 correct). 574 in-scope under-5-use targets, 456 zero-use.
- **451-668 = REPAIR-FIRST (do NOT backfill).**
  - ~460-548: builder-1 degraded tail. Systemic defect: **bare noun/adverb + reporting-perception
    verb with NO connective** — `얼마나 높이 들었어요` / `가족 했다고 했어요` / `믿지 들었어요` /
    `절대 알아요` (missing `에 대해` "about" / quotative `-다고` / nominalizer `-다는 걸`). Also
    `길을 잃을 않도록` (should be `잃지 않도록`).
  - 549-668: build-level broken — `교회가`/`작은 교회가` subject-leak glued onto unrelated seeds,
    wrong verbs (있어요/갔어요 for found/looked-for), bare attributive LEGO targets. Needs **full
    re-decomposition** (memory: kor-6phrase-build-broken). Seed 432 also pending re-decomp.
  - kor final pass `final_pass_completed: false`. This whole tail is a distinct remediation job.
- Repetition: 28% of USE baskets are ≥60% one target-tail + rotating lead-in (the Deborah symptom).

## Guardrails (non-negotiable)
- **TTS = Kai's click only.** New phrases land as draft/no-audio; never queue/fire TTS here.
- **Deletions of stock phrases → list for Kai** (paid live courses).
- **NEVER force a spread** — a permanent orphan is the correct outcome for a non-fitting lego
  (numbers, bare nouns, tight idioms). Reviewer deletes forced/stilted phrases.
- **CJK courses** (jpn/zho/yue/nan/hak): validate.cjs form-gate is space-based → needs a
  model/native form pass on top.
- Register per course; questions end `?` both sides; no sentence-initial caps (English "I" ok);
  no trailing periods.
