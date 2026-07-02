# ZUT Resolution Decisions — 2026-07-02

**Status: DECISION DRAFT for Kai review. No DB writes.**
Input: `scripts/experiments/weekend-scan/ZUT-EXPANSION-INPUT.md` re-verified against live DB 2026-07-02 (still 176 strip-induced conflicts; por/deu 06-25 rebuilds changed nothing here).
Doctrine: `methodology-zut-resolution` + `zut-resolution-dual-expand` + Kai's three refinements in `zut-expansion-plan-2026-06-25.md` (expand both sides to the seed's actual person; gender via the agreeing noun; **no discontinuous targets — contiguous chunks only**).

---

## Constraints discovered while working the actual cases

These shape every decision below; two weren't in the June plan:

1. **Seed rewording — allowed per-course, but last resort (Kai ruling 07-02).** The canonical English master list stays untouched; a single course MAY diverge its seed known_text when no clean expansion exists, but the rename must cascade consistently: seed known_text + LEGO gloss + every phrase using the old wording (+ known-side audio for all of them). Tiling validation is target-side only (`validation.cjs checkTiling`) so nothing breaks mechanically, but the presentation narration reads the gloss against the seed sentence — they must cohere. Order of preference: **seed-verbatim expansion ("they couldn't" → "no pudieron") ≫ off-seed rename with full cascade ≫ never an incoherent gloss/seed pair.**

2. **Unbracket, don't strip (NEW, cheapest class).** Some parentheticals are real English that tiles the seed — `I heard (that)` → `ouvi dizer que`, seed "I heard that he didn't…". Resolution = remove the brackets and keep the words: known becomes "I heard that". Zero collision, zero target change, minimal audio impact. Sweep for this class first in every course.

3. **No-ellipsis rule (Kai, 06-25).** If the disambiguated target would be discontinuous (German aux…participle, separable verbs), the expansion is invalid → joint-review pile.

4. **Negation may be baked in.** "they couldn't" → `no pudieron` is a legitimate M-LEGO (we already teach "I don't want"-style chunks). It's often the only expansion that respects constraint 1. Basket check required: if the LEGO's existing basket has *positive* uses of the form, the negative-baked known won't cover them.

5. **Consolidation is a real option for true synonyms** (ZUT outranks naturalness): rewrite the later LEGO's *target* onto the earlier taught mapping (e.g. zho 但 → 但是 everywhere). Costs target-audio regen for the affected rows; use when no natural known-side context distinguishes and a rename would break constraint 1.

---

## Policy decisions (the three open questions from the June plan)

### P1 — Case-particle policy (decision C): both strategies valid (Kai ruling 07-02)
Effects facts (confirmed in code): the serving walk (`learning-script-generator.cjs:249-255`, `manifest-generator.cjs:460-466`, voice-engine `db.cjs:67`) drops `is_new=false` LEGOs — the demoted LEGO's basket goes unserved and subsequent rounds renumber. **Kai's ruling: acceptable — "not perfect, but worth it for fixing a ZUT cleanly."** Basket handling: leaving the ~8 orphaned phrases is fine; optionally rehome individual phrases where there's an easy slot, respecting the basket rules (every phrase must contain its LEGO; no future-LEGO vocab). Deborah's R## references re-map after renumbering (note in her next handoff).

Choice per conflict:
- **Contiguous-context expansion** ("the same book" → 같은 책을, "with the woman" → 여자와) when the seed offers a clean adjacent modifier/governor — keeps round + basket, costs presentation + target-clip regen.
- **`is_new=false` demotion** when the case-marked form is genuinely the same intention as the taught citation form and context expansion would be forced — cheapest (no text/audio), accepts basket orphaning + renumbering.
- *Prerequisite check per course:* the particle machinery must be visibly taught before the first case-marked debut (kor particles pervasive from seed 1 — verify per course).
- *Related PR (separate lane):* live-player resume should fall forward when its anchored lego_id no longer yields a round — question drafted for Tom's agent; not a gate on this campaign.

### P2 — Hard tense/mood (decision E): deterministic English carriers where the seed already contains them, else Deborah
- Adopt the classic cross-course contract **where the seed words allow it** (constraint 1): *could* → conditional/Konj-II; *couldn't/wasn't able* in past-event seeds → expanded negative chunk (no pudieron / no podíamos / konnte-negative); *have/has X-ed* → perfect aux chunk when contiguous.
- **spa era/fue (ser imperfect vs preterite): route to Deborah** with the seed pairs. No honest English carrier; guessing would mis-teach.
- deu soll/sollte: NOT a clean "supposed to" split (S0528's "supposed to" actually maps to *sollte*) — per-item below, partly Deborah.

### P3 — Formal/plural register block (S0624–S0668, all courses): full-seed M-LEGO with the vocative inside
The block's seeds are deliberately tiny register drills ("could you say that sir?", "do you all want?"). The formal/2pl form collides with the informal LEGO because English has no T/V. Resolution: make the block LEGO the **whole seed utterance as one M-LEGO** — known includes the sir/madam/you-all cue that genuinely determines the form ("could you say that sir?" → "potrebbe dirlo, signore?"; "do you all want?" → "wollt ihr alle?"). Components teach the new verb form. **Sibling absorption via `is_new=false` only when unavoidable** — per the P1 finding it orphans the sibling's basket and renumbers rounds; the block sits at the course tail so the renumbering blast radius is small, but each absorption gets listed explicitly in the spec.
- This resolves ~45 of the 176 in one uniform pattern (all S0624+ members in ita/fra/deu/kor/ara/zho/spa).
- **Open sub-question (needs gate semantics, research in flight):** whether component-level phrases inside the M (e.g. bare "could you" → potrebbe) trip the phrase-granular ZUT gate; if so, component glosses must carry the vocative too.
- **fra "please" (s'il te plaît / s'il vous plaît) is the one register case OUTSIDE the block** (S0414 restaurant seed has no vocative) — flagged to Kai below.

### P4 — Scope
ZUT set (176) first. Grammar-singleton expansions (same strategies, no collision pressure) as a follow-up pass, reusing whatever policy survives this review.

---

## Per-conflict decisions — spa_for_eng (8)

| # | conflict | members | decision |
|---|---|---|---|
| 1 | enough | suficientes S0058 / suficiente S0378 | Expand both with their seed nouns: **"enough words" → "suficientes palabras"**, **"enough money" → "suficiente dinero"**. Bare "enough" retires. |
| 2 | you're doing it | lo estás haciendo S0072 / lo está haciendo S0655 | S0655 → **register block P3** (full-seed M "…you're doing very well, madam"). S0072 unchanged. |
| 3 | it was | era S0373 / fue S0125 | **Deborah** (P2). Present both seeds + proposed options; do not guess. |
| 4 | they had | tenían S0356 / lo habían S0622 | Expand perfect member: **"they had broken it" → "lo habían roto"** (contiguous ✓, tiles ✓). tenían keeps "they had". Verify *roto* introduced ≤S0622. |
| 5 | they could | podrían S0432 / pudieron S0433 | **"they couldn't" → "no pudieron"** (seed says "they couldn't find out…"; constraint 1 blocks the "managed to" rename). podrían keeps "they could". Basket check for positive pudieron uses. |
| 6 | to leave | irse S0345 / irme S0588 | Expand 1sg member: **"leave home" → "irme de casa"** (tiles "…and leave home" ✓). irse keeps "to leave". |
| 7 | to wake up | despertarnos S0108 / despertarse S0584 | Reflexive-infinitive person is context-determined; contiguous fix: **"to wake in the middle of the night" → "despertarnos en medio de la noche"** (M, tiles S0108 ✓). despertarse keeps "to wake up". |
| 8 | we could | podríamos S0413 / podíamos S0412 | Mirror of #5: **"we couldn't" → "no podíamos"** (seed "we couldn't allow…"). podríamos keeps "we could". Check against any "no pudimos" mapping course-wide. |

## Per-conflict decisions — fra_for_eng (21)

| # | conflict | decision |
|---|---|---|
| 1 | to stop (s'arrêter/t'arrêter S0067) | Expand S0067: **"do you want to stop" → "veux-tu t'arrêter"** (absorbs the "do you want" sibling if separate → is_new=false). s'arrêter keeps "to stop". |
| 2 | possible(s) | **"possible problems" → "problèmes possibles"**; singular keeps "possible". |
| 3 | ready (prêt/prêts) | **"not ready yet" → "pas encore prêts"** (contiguous ✓). prêt keeps "ready". |
| 4 | beautiful (beau/beaux) | **"are beautiful" → "sont beaux"** ("are" carries the plural). beau keeps "beautiful". |
| 5 | next (prochain/prochaine/ensuite) | All three expand: **"the next corner"→"au prochain coin"** (or "prochain coin"), **"next week"→"la semaine prochaine"**, **"come next"→"arriver ensuite"**. Bare "next" retires. |
| 6 | we don't know (connaît/savons) | **"we don't know the facts" → "on ne connaît pas les faits"**; savoir member keeps "we don't know". |
| 7 | interesting | **"interesting things" → "choses intéressantes"**; masc keeps "interesting". |
| 8 | only (seul/seulement) | **"the only" → "le seul"**; seulement keeps "only". Check "the only" against deu twin fix for cross-course consistency (independent courses — fine). |
| 9 | them (eux/les) | **"for them" → "pour eux"**; les keeps "them". |
| 10 | guess (devine/deviner) | **"guess who" → "devine qui"**; infinitive keeps "guess". |
| 11 | happy (content ×2 /heureuse/contents) | **"a happy family"→"une famille heureuse"**, **"they'll be happy"→"ils seront contents"**; content keeps "happy"; duplicate content member (S0344 vs S0599) → later one is_new=false. |
| 12 | please (te/vous plaît) | **FLAG TO KAI** — the one register fork outside the vocative block (S0414 has no sir/madam). Options: (a) accept restaurant-context license; (b) consolidate on one form; (c) expand "…red wine please" chunk. No clean fix. |
| 13 | what you said (tu as/vous avez) | S0648 → **register block P3**. |
| 14 | it is (c'est/ce soit) | Far-governor: bake the trigger — **"I don't think it's" → "je ne pense pas que ce soit"** (contiguous ✓ tiles ✓). Verify no competing "I don't think it's" mapping. |
| 15 | last night (la nuit dernière/hier soir) | True synonym, rename blocked by constraint 1 → **consolidate S0453 onto "la nuit dernière"** (retarget lego + seed target + basket, audio regen). ZUT outranks naturalness. |
| 16 | young (jeune/jeunes) | **"still young" → "encore jeunes"**; jeune keeps "young". |
| 17 | different (différents/différentes) | **"different words"→"mots différents"**, **"different areas"→"zones différentes"**; bare retires. |
| 18 | kind (gentille S0147/gentil S0478) | **"she was very kind"→"elle a été très gentille"**, **"such a kind heart"→"un cœur si gentil"**; bare retires. |
| 19 | to move (déménager/bouger) | Later debut expands: **"I move my head" → "je bouge ma tête"** (transitivity baked in, cf. spa mover lesson). déménager keeps "to move". |
| 20 | I heard that (±que) | Same expression, lego-boundary artifact: **extend S0364's target to include "que"** and set S0509 is_new=false (merge). Retile S0364. |
| 21 | that (ce/cela/que) | **"that boy"→"ce garçon"**; que S0121 → **is_new=false if "que" already componentized earlier** (expected — je pense que family), else "unusual that"→"inhabituel que"; cela S0644 → register block P3. |

## Per-conflict decisions — ita_for_eng (6)

| # | conflict | decision |
|---|---|---|
| 1 | you're doing (tu stia andando S0072/sta facendo S0646) | S0072 far-governor: **"I think that you're doing" → "penso che tu stia andando"** (also feeds the ita subjunctive-redecomposition plan). S0646 → register P3. |
| 2 | could you (potresti/potrebbe) | S0644 → register P3. |
| 3 | you speak (parli/lei lo parla) | S0647 → register P3. |
| 4 | to play (suonare S0098/giocare S0337+S0567) | **Swap the bare form to giocare** (games = default sense): expand suonare → **"playing something else" → "suonare qualcos'altro"** (tiles S0098 ✓); S0337 giocare becomes bare "to play" debut; S0567 duplicate → is_new=false. Verify both baskets read naturally after the swap. |
| 5 | help you (aiutarti/aiutarla) | S0645 → register P3. |
| 6 | what you said (hai detto/ha detto) | S0648 → register P3. |

## Per-conflict decisions — zho_for_eng (7)

| # | conflict | decision |
|---|---|---|
| 1 | but (但是/但×2/但是-dup) | **Consolidate on 但是** (true synonyms; 但是 taught first S0019): retarget 但 rows in S0426/S0537 (+phrases), S0539 dup → is_new=false. Target audio regen for touched rows. |
| 2 | time (时间/遍/时间-dup) | 遍 is the metadata-gloss case (把/遍 worklist): folds into **register P3** full-seed M for S0644 ("say that again" → 再说一遍 component). S0539 dup → is_new=false. |
| 3 | you (你/您) | S0642 → register P3 (madam seed carries 您). |
| 4 | how long (多久/多久了 — same seed S0033) | Lego-boundary artifact + 了-aspect: **whole-seed M** "how long have you been learning Chinese?" → 你学习中文多久了？ with 多久 as component; feeds the 了-determinism worklist item. |
| 5 | to turn left (向左转/左转) | **Consolidate on 向左转** (S0502 target rewrite, natural ✓). |
| 6 | okay (还行/好的) | TRICKY: 好的 maps to seed's "Yes," not "okay". Propose **"yes, that would be great" → "好的，那太好了"** M-chunk (S0624), or fold into register-adjacent block. Kai eyeball requested. |
| 7 | to think (以为/觉得×2) | **"used to think" → "以前以为"** (the mistaken-belief reading rides "used to" naturally, tiles S0536 ✓); 觉得 keeps "to think"; later duplicate → is_new=false. |

## Per-conflict decisions — por_for_eng (8)

| # | conflict | decision |
|---|---|---|
| 1 | my (minha/as minhas) | **"my keys" → "as minhas chaves"**; minha keeps "my". |
| 2 | possible(s) | **"possible problems" → "problemas possíveis"** (mirror fra). |
| 3 | to be (ser/ficar) | **"to be okay" → "ficar bem"**; ser keeps "to be". |
| 4 | I heard (ouvi/ouvi dizer que) | **Unbracket**: known "I heard that" → "ouvi dizer que" (constraint-2 class; tiles ✓, no target change). |
| 5 | that (isso×2/essa) | **"that's the best way" → "essa é a melhor maneira"** (M); isso dup S0497 → is_new=false. |
| 6 | them (eles/as) | **"with them" → "com eles"**; as keeps "them" (verify no masc "os" mapping course-wide). |
| 7 | when (quando/quando é que) | **"when did you start" → "quando é que começaste"** (M; component gloss for "quando é que" needs care — verify basket). |
| 8 | your (tua/teu) | **"your idea" → "a tua ideia"**, **"your ticket" → "o teu bilhete"**; bare retires. |

## deu_for_eng (52), kor_for_eng (51), ara_for_eng (23) — pattern assignment

The three big courses decompose almost entirely into the policies:

- **Register block (P3):** every S0624+ member — deu (könnten Sie/könntet ihr/Sie sprechen/wollt ihr alle/seid ihr/habt/werdet/euch/eures/möchtest…), kor (선생님/여사님/여러분 families, 말씀해/원하세요/생각하세요…), ara (تَشْعُرينَ/قُلْتِ/مُساعَدَتَكِ/يُمْكِنُكُمْ…). ~30 deu + ~25 kor + ~10 ara members.
- **C1 demotions:** kor bare-vs-particle noun pairs (책/책을/책이, 가방, 소식, 눈, 달걀, 차, 질문, 번호, 희망, 가족, 친구들, 아이들, 산, 휴가, 여자…) — the bare/citation debut stays the LEGO; case-marked twins demote. ara tanwin case pairs (طَويلٌ/طَويلاً; long list). deu Kinder/Kindern (dative-pl -n).
- **C2 governor expansions:** kor 여자와→"with the woman"-class (과/에/에서), deu "at the"→am/beim pair (expand with their nouns: "am anderen Ende", "beim letzten Mal"), kor 정원에/정원에서 ("in the garden" rest-vs-activity → expand with the verb context; genuinely tricky, per-item spec).
- **EASY person expansions (contiguous only):** deu wollte/wollten ("I wanted"/"they wanted"), sollten ("we should"→"sollten wir" — NOTE seed order "vielleicht sollten wir": chunk "sollten wir" contiguous ✓), mussten ("we had to"), dachte/dachten, hätte/hätten ("she would have"/"we would have" — Konj-II simple, contiguous), möchte/möchten/möchtest (person-expand), kann/kannst/könnt, habe/hast/habt, denke/denkt/denken, mag/magst, hoffe, werde/wirst/werdet, fühle/fühlst. Adjective-noun expansions: neue Wörter/einen neuen Ansatz/des neuen Jahres/ein neues Baby/(ein) neues; diese Person/diesen Koffer/diesem Teil/dieses Handtuch/diese Geschichte/diesem Wetter; meine Zimmernummer/meinem Schlafzimmerfenster/meine Spielzeuge/meiner Schwester; viele Gründe/viel mehr; letzte Mal/letzten Bus; gute Idee/gutes Beispiel; perfekte Haus. All contiguous German NPs ✓.
- **No-ellipsis exclusions (joint look, per Kai 06-25):** deu past participles gewollt/gedacht (haben…gewollt split) — leave out, list separately; "you feel"→du fühlst dich vs fühlst (reflexive splits: "wie fühlst du dich" — dich after subject — the M "fühlst du dich" IS contiguous in questions; propose per-item), helfe (dass ich dir helfe — verb-final; "dir helfe" contiguous? propose per-item).
- **Lexical renames blocked by constraint 1 → context expansion instead:** deu fand ("I thought it was very beautiful" → "ich fand es"-chunk? seed "ja, ich fand es sehr wunderschön": **"I thought it was" → "ich fand es"** hmm — needs care, per-item spec); wissen/kennen ("we don't know the facts"→"die Fakten nicht kennen" — mirror of fra #6; note German chunk "die Fakten nicht kennen" is contiguous ✓).
- **HARD → Deborah:** deu soll/sollte cluster (incl. the S0528 "supposed to"→sollte inversion), konnte/könnte/könnten where the seed gives no person split, wenn/wann ("when" conditional vs interrogative — actually wann="when?" questions, wenn=if/whenever: seed words "find out when"→wann is indirect-Q… propose rule wann=question/indirect-Q, wenn=if/whenever; borderline, include in Deborah pack with proposal), ara إِنْ/لَوْ (real/counterfactual if — same shape as wenn/wann; propose rule, Deborah confirms), spa era/fue.
- **ara specifics:** gender agreement via noun expansion (فِكْرَةٌ جَيِّدَة "a good idea" / جَيِّدٌ bare; كانَتْ with تِلْكَ "that was (fem)"→"تِلْكَ كانَتْ" chunk; جاهِزَةٌ "your coffee is ready" register seed → P3 full-seed M). Subjunctive far-governor (تَظُنَّ/تَسْتَطيعَ/يُريدوا after أَنْ/لَمْ): bake the trigger — **"أَنْ + subjunctive" chunks with the English matrix** ("to think" → "أَنْ تَظُنَّ" with known carrying the governing frame; per-item spec). The يُمْكِنُ-family (يُمْكِنُني / يُمْكِنُني أَنْ ±أَنْ) = lego-boundary merge like fra #20. تَفْعَلُ with/without tashkeel (S0646/S0167) = **normalization bug, not ZUT** — same word, one vocalized; unify orthography (register seed member also folds into P3). أرادوا triple (they wanted ×2 + they want) = duplicate mappings → keep earliest, later is_new=false; the "(they want)" S0419 member: seed "if they want" (إِذا أَرادوا — Arabic conditional uses past) → known stays "they wanted"? **No** — seed known says "if they want" → this is a construction-feature (past-after-إِذا); expand **"if they want" → "إِذا أَرادوا"** (contiguous ✓, teaches the conditional-past pattern). 

Full per-item tables for deu/kor/ara to the same depth as spa/fra above are the next deliverable — the pattern assignment above covers every member; items marked per-item spec get the same tiling/vocab/no-new-ZUT verification pass.

---

## Effects ledger (what each strategy touches) — CONFIRMED against code (research 07-02)

Mechanics established: `course_legos` carries its own audio slots (`known_audio_id`, `target1/2_audio_id`, `presentation_audio_id`); a DB trigger nulls the relevant slots on any text change (known change → known+presentation; target change → target1/2). Components are a JSONB array on the LEGO row (A→M restructure = one-row update + component presentation rows, `lego_id=null`, honouring `introduce:false`). Presentation regen = phase8 `/regenerate-presentation(s)` (delete-on-change; refuses `origin='human'` clips). Known-side tiling is not machine-validated; target-side tiling and component-substring checks are.

| strategy | text touched | serving impact | audio impact |
|---|---|---|---|
| Unbracket | lego known only | none | presentation + known clip regen (auto-nulled) |
| Same-target duplicates | **not actually ZUT** (same known → same target). No action needed for this campaign; drop from scope. | — | — |
| is_new=false demotion | flag only | **basket orphaned (unserved) + all later rounds renumber** — last resort only | demoted presentation clip retires |
| Expand both sides (M-merge) | known+target, components JSONB | round kept, basket kept | presentation + known + target1/2 regen per LEGO |
| Consolidate (synonym retarget) | lego target + basket phrase targets (+ seed target if it carries the form) | none structural | target clips for every touched row |
| Register full-seed M | lego known+target+components | absorptions renumber tail rounds (flagged per item) | presentation + target regen for block LEGO |
| Deborah pile | none yet | — | — |

**Scope correction from the effects work:** conflict members whose targets are IDENTICAL (fra content×2, zho 时间/觉得 dups, por isso dup, ita giocare S0567, deu wollte S0030/S0588, ara أرادوا orthographic twins) are convergence, not ZUT — they need no fix here (ara's tashkeel-vs-plain twins are an orthography normalization chore, separate list). This shrinks the real work below 176.

Costs are dominated by presentation regen (one clip per touched LEGO, known-language voice) + target clips for consolidations. Rough count: ~250 touched LEGOs → low hundreds of clips = within the "hundreds proceed" threshold, but **itemized plan + approval before any TTS per the standing gate**.

## Execution order (post-approval) — WITH KAI CHECKPOINTS (his ask, 07-02)
1. Unbracket class (all courses) — cheapest, kills several conflicts outright.
2. EASY expansions (Latin courses first — spa/fra/ita/por, then deu easy set). **→ CHECKPOINT: show Kai the applied diff + re-scan.**
3. kor+ara+deu case pass (expansion or demotion per item, per P1). **→ CHECKPOINT.**
4. Register block P3 (all courses, one pattern, ~45 conflicts). **→ CHECKPOINT.**
5. TRICKY per-item specs (far-governor bake-ins, zho consolidations, seed-divergence cases — each seed rewording listed explicitly).
6. Hard pile (era/fue, soll/sollte, konnte/könnte, wenn/wann, إِنْ/لَوْ, fra "please") — **resolved jointly with Kai** (his call 07-02: no Deborah handoff needed).
7. Re-run `zut-plan.cjs` all 9 → require strip-induced = 0 (readiness gate: whole-class detector, not fix-list verify).
8. Single itemized TTS regen plan for approval, then regen.

---

# APPENDIX: full per-item tables — deu / kor / ara (authored 07-02, pre-verification)

Legend: **EXP** = expand both sides (M-merge, contiguous chunk from the seed) · **P3** = register-block full-seed M · **DEM** = is_new=false demotion · **CONV** = same-target convergence, no action · **BOUND** = lego-boundary fix (extend span / merge twin) · **JOINT** = resolve with Kai · **VER** = flag needing DB verification before spec freeze. All EXP proposals quote the seed verbatim on both sides unless noted.

## deu_for_eng (52)

| # | conflict | decision per member |
|---|---|---|
| 1 | children | kinder×2 CONV · kindern S0567 **DEM** (dative from zusehen-construction; no clean contiguous chunk) |
| 2 | would have | hätte×2 CONV keep "would have" · hätten S0612 **EXP** "we would have"→"wir hätten" |
| 3 | should | sollte×2 CONV keep "should" · sollten S0499 **EXP** "we should"→"sollten wir" · soll S0043 **EXP** "how to answer"→"wie ich antworten soll" (seed's own wording; teaches verb-final indirect Q) — resolves the soll/sollte pile WITHOUT Deborah. VER: "how to answer" uniqueness |
| 4 | wanted | wollte×2 CONV · wollten S0435 **EXP** "they wanted"→"sie wollten" · gewollt S0580 **EXP** "we've often wanted"→"wir haben oft gewollt" (aux+adv+participle happen to be adjacent — rescued from the no-ellipsis pile) |
| 5 | things | S0528 **EXP** "those things"→"diese Sachen" · dinge keeps "things" |
| 6 | can | kannst S0090 keeps "can" · kann S0630 **EXP** "can I"→"kann ich" · könnt S0529 **EXP** "can you all"→"könnt ihr alle" · können S0469 **DEM** (infinitive under verb-final negation; no clean chunk) |
| 7 | you | dich S0524 **EXP** "call you"→"rufe dich" · Ihnen S0639 **P3** ("with you sir"→"mit Ihnen, mein Herr") · ihr S0529L03 **EXP** "you all"→ihr (aligns with S0657 CONV) |
| 8 | your | dein×2 CONV keep "your" · eure **EXP** "your hands"→"eure Hände" · deine S0614 **EXP** "your family"→"deine Familie" · deine S0564 **EXP** "your help"→"deine Hilfe" |
| 9 | thought | dachte×3 → **EXP** "I thought"→"ich dachte" (convergent) · dachten S0444 **EXP** "they thought"→"sie dachten" · fand S0374 **EXP** "I thought it was very beautiful"→"ich fand es sehr wunderschön" (finden-idiom as one chunk) · gedacht S0616 **EXP** "you thought that"→"du das gedacht hast" — TRICKY word-order, checkpoint eyeball |
| 10 | have | habe S0037 **EXP** "I have"→"ich habe" · habt S0663 **P3** · hast S0616 **absorbed** by #9 gedacht-chunk → is_new=false (flagged absorption) |
| 11 | goes | geht keeps "goes" · führt S0560 **EXP** "goes down"→"führt hinunter" |
| 12 | to know | wissen×2 CONV keep "to know" · kennen S0472 **EXP** "don't know the facts"→"die Fakten nicht kennen" (mirror of fra #6) |
| 13 | my | all five **EXP** with noun (+case-trigger where present): "out of my bedroom window"→"aus meinem Schlafzimmerfenster" · "my room number"→"meine Zimmernummer" · "my toys"→"meine Spielzeuge" · "with my sister"→"mit meiner Schwester" · "my choice"→"meine Wahl". Bare "my" retires |
| 14 | would like | möchte S0581 **EXP** "he'd like"→"er möchte" · möchte S0634 **EXP** "I'd like"→"Ich möchte" · möchten S0411 **EXP** "we would like"→"wir möchten" · möchtest S0631 **EXP** "would you like"→"möchtest du" |
| 15 | to grow up | aufwachsen keeps "to grow up" · aufzuwachsen S0582 **EXP** "to grow up here"→"hier aufzuwachsen" |
| 16 | at the | beim S0117 **EXP** "than the last time"→"als beim letzten Mal" (dual-expand vs #52) · am S0552 **EXP** "at the other end"→"am anderen Ende" |
| 17 | such a | S0478 **EXP** "such a kind heart"→"so ein gutes Herz" · S0423 **EXP** "such an obvious question"→"so eine offensichtliche Frage" |
| 18 | only | einzige S0481 **EXP** "the only"→"die einzige" · nur S0562 **rename (seed-verbatim)** "just"→nur. VER: no existing "just"→gerade is_new mapping (S0589 gerade!) — if collision, dual-fix |
| 19 | many | viel S0103 **EXP** "many more words"→"viel mehr Wörter" · viele S0475 **EXP** "many reasons"→"viele Gründe" |
| 20 | you work | arbeitest S0388 **EXP** "you work"→"du arbeitest" · arbeitet S0133 **EXP** "work together"→"zusammen arbeitet" (man-construction; checkpoint eyeball) |
| 21 | new | five noun-EXPs: "new words"→"neue Wörter" · "a new one"→"ein neues" · "a new approach"→"einen neuen Ansatz" · "of the new year"→"des neuen Jahres" · "their new baby"→"ihr neues Baby". Bare retires |
| 22 | different | "different words"→"verschiedene Wörter" · "of the different areas"→"der verschiedenen Bereiche" |
| 23 | you feel | S0040 keeps "you feel"→"du fühlst dich" · fühlst S0542 **DEM** (verb-final; same intention) |
| 24 | after | nachdem S0110 **EXP** "after we finish"→"nachdem wir fertig sind" · nach S0447 **EXP** "after the meal"→"nach dem Essen" |
| 25 | could | könnten S0644 + könntet S0659 **P3** · konnte S0148 **EXP** "when I couldn't answer"→"als ich nicht antworten konnte" · könnte S0501 **EXP** "if only I could trust you"→"wenn ich dir nur vertrauen könnte" — both TRICKY-size chunks, checkpoint eyeball |
| 26 | perfect | perfekt keeps · perfekte S0514 **EXP** "the perfect house"→"das perfekte Haus" |
| 27 | her | sie keeps "her" · ihre S0637 **EXP** "her bag"→"ihre Tasche" · ihr S0604 **EXP** "with her"→"bei ihr" |
| 28 | to stop | aufhören keeps "to stop" · anzuhalten S0402 **EXP** "to stop for food"→"zum Essen anzuhalten" |
| 29 | myself | mich×2 CONV · mir S0654 **P3** |
| 30 | had to | musste S0593 **EXP** "I had to"→"ich musste" · musste S0353 **EXP** "she needed to"→"sie musste" (seed-verbatim) · mussten S0455+S0521 **EXP** "we had to"→"wir mussten" (convergent) |
| 31 | this | six noun-EXPs: "in this part"→"in diesem Teil" · "that person"→"diese Person" · "that suitcase"→"diesen Koffer" · "that funny story"→"diese lustige Geschichte" · "in this dreadful weather"→"bei diesem schrecklichen Wetter" · "this towel"→"dieses Handtuch" |
| 32 | help | helfe S0171 **EXP** "that I help you"→"dass ich dir helfe" · helfen S0660 **P3** · hilfe S0605 **EXP** "because we needed help"→"weil wir Hilfe gebraucht haben" — TRICKY-size, checkpoint |
| 33 | had | hatte S0537 **EXP** "I was wrong"→"ich hatte unrecht" (seed-verbatim) · hatten S0587 **EXP** "that we had eggs for supper"→"dass wir Eier zum Abendessen hatten" · hatte S0081 **VER FIRST** — input shows lego paired with an unrelated seed ("when do you want to start?") = possible lego/seed misalignment in DB |
| 34 | me | mir×3 CONV keep "me" · mich S0548 — see #37 (absorbed) |
| 35 | one | man S0056 keeps "one" (gloss-quality note logged) · eines S0634 **EXP** "one of those"→"eines von denen" |
| 36 | will | wird keeps "will" · werde S0465 **EXP** "next time I will"→"Nächstes Mal werde ich" · wirst S0521 **EXP** "you'll forget"→"du vergessen wirst" · werdet S0668 **EXP** "you'll all"→"ihr werdet alle" |
| 37 | I feel | S0041 keeps "I feel"→"ich fühle mich" · S0548: fühle L04 **EXP** "I am feeling"→"Ich fühle mich" (M), mich L03 **absorbed** → is_new=false (flagged) |
| 38 | I think | ich denke keeps · finde S0553 **EXP** "I think the small church"→"Ich finde die kleine Kirche" — OR seed-divergence rename ("I find…") with cascade; checkpoint choice |
| 39 | would | würde S0535 keeps "would" · würden S0557 **EXP** "they would"→"sie würden" |
| 40 | are | sind S0396 keeps "are" · sind S0649 **P3** · seid S0664 **P3** |
| 41 | all | alle×2 CONV keep "all" · allen S0656 **P3** ("with you all"→"mit euch allen") |
| 42 | when | wenn S0435+S0540 **rename (seed-verbatim)** "if"→wenn · wann S0433 **EXP** "when the film started"→"wann der Film anfing". VER: no existing "if"→ob/falls is_new mapping |
| 43 | home | S0447 **BOUND** — lego mis-spanned ("hause" should be "nach Hause" = S0401's mapping) → extend span, then CONV |
| 44 | hope | hoffnung keeps "hope" · hoffe S0668 **EXP** "I hope"→"Ich hoffe" |
| 45 | problem | problem keeps · problems S0457 **EXP** "of the problem"→"des Problems" |
| 46 | good | "a good example"→"ein gutes Beispiel" · "a good idea"→"eine gute Idee". Bare retires |
| 47 | speak | sprechen S0647 + sprecht S0662 **P3** |
| 48 | want | wollen S0643 + wollt S0658 **P3** |
| 49 | think | denken S0651 + denkt S0666 **P3** · denke S0636 **EXP** "I think"→"Ich denke" (CONV with S0047) |
| 50 | you all | euch S0656 **P3** · ihr S0657 CONV with #7 "you all"→ihr |
| 51 | like | mag S0629 **EXP** "I like it"→"Ich mag es" · magst S0628 **EXP** "do you like"→"magst du". VER: "I like it" vs any gefällt-mapping |
| 52 | last | letzten S0589 **EXP** "the last bus"→"den letzten Bus" · letzte S0572 **EXP** "the last time"→"das letzte Mal" (dual-expand with #16) |

**deu Deborah/joint pile after this pass: EMPTY** — soll/sollte, konnte/könnte and wenn/wann all resolved by seed-verbatim expansion/rename. Remaining judgment items are checkpoint-eyeballs (#9, #20, #25, #32, #38), not language calls we can't make.

## kor_for_eng (51)

Register block (**P3**, full-seed M with vocative/여러분 in the known): something S0661 · sir 선생님과/선생님을/선생님 (S0639/S0654/S0643) · madam 여사님 family (S0642/S0645/S0647/S0648) · do-you-think S0651/S0666 · do-you-want S0643/S0658 · very 매우 S0655 · what 무엇이 S0652 · I-think 것 같아요 S0655 · please-say S0644/S0659 · you-all 여러분× (S0657/S0660/S0663/S0666/S0667) · want-to-go S0650/S0665 · that 그거 S0644. (Members outside the block keep their bare mapping: 아주="very", 뭐="what", 생각해요="I think", 뭔가를="something".)

Particle/case class (**EXP with the seed's adjacent modifier** — P1 default; DEM only where noted):

| conflict | decision |
|---|---|
| that 저/그건/그것이 | "that chair"→"저 의자" EXP · 그건 keeps "that" (×2 CONV) · 그것이 S0621 **DEM** (subject particle, quotative clause — no clean modifier) |
| he 그는×2/그가 | 그는 CONV keeps "he" · 그가 S0597 **DEM** (bare subject-particle twin) |
| bag | "her bag"→"그녀의 가방은" EXP · "that suitcase"→"그 가방을" EXP · "Jane's bag"→"제인의 가방이에요" EXP |
| book | 책 keeps "a book" · "the same book"→"같은 책을" EXP · "her book"→"그녀의 책이" EXP |
| news | "the news"→"그 소식이" EXP · "waiting for the news"→"소식을 기다리고" EXP |
| family | S0408: 가족을+행복한 merge → ONE M "a happy family"→"행복한 가족을" (행복한 lego expands, 가족을 absorbed is_new=false — also resolves "happy" conflict) · 가족 S0520 keeps "family" |
| friends | "some old friends"→"오래된 친구들을" EXP · 친구들이 S0454 **DEM** |
| holiday | 휴가 keeps · 휴가를 S0573 **DEM** · 휴가는 S0574 **DEM** (both bare-particle twins in long clauses) |
| hope | "lose hope"→"희망을 잃고" EXP · "the only real hope"→"유일한 진짜 희망은" EXP |
| question | 질문 keeps "a question" · "such an obvious question"→"그런 뻔한 질문을" EXP |
| eyes | "close my eyes"→"눈을 감아야" EXP · "your eyes are beautiful"→"눈이 아름다운" EXP (checkpoint wording) |
| egg | 달걀 keeps · 달걀을 S0587 **DEM** |
| number | 번호 keeps "number" (S0463 "my room number"→"제 방 번호" is already chunked) · 번호를 S0464 **DEM** |
| children | "take the children"→"아이들을 데려가고" EXP (VER chunk) · 아이들이 S0455 **DEM** |
| shop | 가게 keeps · "find a shop"→"가게를 찾고" EXP |
| mountains | "can see the mountains"→"산이 보여요" EXP (checkpoint gloss) · 산을 S0584 **DEM** |
| tea | 차 keeps · "like tea"→"차를 좋아해요" EXP |
| life | "a new life"→"새로운 삶을" EXP · 인생은 S0483 **DEM** |
| woman | 여자 keeps · "with that woman"→"그 여자와" EXP (C2 governor) |
| near | "near the entrance"→"입구 근처에" EXP · "near the hotel"→"호텔 근처에서" EXP · 근처예요 S0614 **DEM** |
| in the garden | **VER FIRST** — S0595's lego says 정원에서 but its seed target uses 정원에 (possible pre-broken tiling); then EXP with verbs ("put it in the garden"→"정원에 놓고") |
| themselves | 직접 S0450 **EXP** "catch the train themselves"→"기차를 직접 타야" (checkpoint) · 자기들을 keeps "themselves" · 자기들이 S0427 **DEM** |
| about | S0310 **BOUND** (lego "about"→"남자에 대해" contains the noun — re-span to "about that man"→"그 남자에 대해") · 대한 S0598 **DEM** |

Form-based / quotative class (FORM pile — decision C flavor, per-item):

| conflict | decision |
|---|---|
| can't 못/수 없어요/수 없는/없다는 | 수 없어요 keeps "can't" · 못 S0526 **EXP** "can't guess"→"못 맞추겠다는" (checkpoint) · 수 없는 S0336 **DEM** · 없다는 S0469 **DEM** (attributive/quotative forms) |
| to win 이길/이기게 | "can win"→"이길 수" EXP · "let (them) win"→"이기게" **EXP** "to let them win"→"이기게 할" (checkpoint) |
| to leave 떠나고/떠날 | 떠나고 keeps "to leave" · "ready to leave"→"떠날 준비" EXP |
| go 가고/갈 | 가고 keeps "go" · "to go on holiday"→"휴가 갈" EXP |
| go out 나가고/나가지 | 나가고 keeps "go out" · "not go outside"→"밖에 나가지" EXP (negative connector baked) |
| to drink 마시고/마실 | 마시고 keeps "to drink" · "something to drink"→"마실 걸" EXP |
| waiting 기다리는 게/기다리는 | 기다리는 게 S0576 keeps "waiting" (nominalized subject) · 기다리는 S0475 **DEM** (modifier form) |
| leaving 떠나는 걸/떠나는 | 떠나는 keeps · 떠나는 걸 S0590 **DEM** |
| to be 있을/있어도 | 있을 keeps "to be" · 있어도 S0604 **EXP** "even if (we) stay"→"있어도" (checkpoint — may DEM) |
| seeing 봐/보는 게 | 보는 게 keeps "seeing" · 봐 S0521 **JOINT** — worry-quotative "-(으)ㄹ까 봐" is a construction, not a gloss; propose baking "afraid that…"-chunk |
| meaning 뜻일/뜻은 | "could mean"→"뜻일 수" EXP · "doesn't mean"→"뜻은 아니에요" EXP |
| doesn't want to 싶지 않다고/싶어하지 않는 | quotative vs 3rd-person participle: "said she doesn't want to"→"싶지 않다고 했어요" EXP (checkpoint) · 싶어하지 않는 S0304 **DEM** |
| very brave ×2 | "were very brave"→"아주 용감했어요" EXP keeps past · 용감하다고 S0615 **EXP** "very brave (thought-quote)" → bake "아주 용감하다고 생각했어요" chunk (checkpoint) |
| possible 가능한/가능하지 | "possible problems"→"가능한 문제" EXP · "wouldn't be possible"→"가능하지 않을" EXP |
| I think 생각해요/것 같아요 | 생각해요 keeps "I think" · 것 같아요 → P3 (block member) |
| happy 기뻐요/행복한 | 기뻐요 keeps "happy" · 행복한 → resolved by family-merge above |
| do 해요/해 | 해요 keeps "do" · 해 S0485 **DEM** (light-verb inside causative chain) |
| to look for 찾으러/찾아야 | "needs to look for"→"찾아야 해요" EXP · 찾으러 S0510 **EXP** "gone to look for"→"찾으러 갔어요" |
| something 뭔가를×3/뭔가 | 뭔가를 CONV keep "something" · 뭔가 S0661 → P3 block |

## ara_for_eng (23)

| # | conflict | decision |
|---|---|---|
| 1 | can I ±أَنْ | **BOUND** — merge the يُمْكِنُني twins (extend S0630's span to include أَنْ where the seed has it) → CONV |
| 2 | to drink it لِأَشْرَبَهُ/لِتَشْرَبَهُ | 1sg vs 2sg subjunctive after لِ: **EXP** with matrix — "can I have something to drink"-side keeps لِأَشْرَبَهُ known "for me to drink it"; S0625 known "for you to drink it" — **needs light seed-known divergence** ("something to drink" is identical English both sides) → checkpoint (last-resort rule) |
| 3 | long طَويلاً/طَويلٌ | **DEM** S0619 (nominative case-twin; C1) |
| 4 | ready ×4 | جاهِزَةٌ S0627 **P3** ("your coffee is ready" full-seed) · مُسْتَعِدّونَ S0664 **P3** · مُسْتَعِدّينَ S0396 **EXP** "everybody ready"→"الجَميعُ مُسْتَعِدّينَ" · مُسْتَعِدٌّ keeps "ready" |
| 5 | you feel ينَ/ونَ | both **P3** (madam / you-all seeds) |
| 6 | you can ×3 | يُمْكِنُكَ twins **BOUND**+CONV · تستطيع S0292 **EXP** "you'll be able to"→"أَنْ تَسْتَطيعَ" (bake the أَنْ trigger) |
| 7 | helping you ـكِ/ـكَ | both **P3** (madam/sir seeds) |
| 8 | you said قُلْتِ/قُلْتَ | قُلْتِ S0648 **P3** · قُلْتَ keeps "you said" |
| 9 | you think ×3 | تَظُنّينَ S0651 **P3** · تَظُنَّ S0427 **EXP** "you to think"→"أَنْ تَظُنَّ" · تُفَكِّرَ S0091 **EXP** "to think quickly"→"أَنْ تُفَكِّرَ بِسُرْعَةٍ" |
| 10 | you all can ×2 | يُمْكِنُكُمْ S0659 **P3** · تَسْتَطيعوا S0668 **EXP** "you'll all be able to"→"أَنْ تَسْتَطيعوا" |
| 11 | if إِنْ/لَوْ | إِنْ S0654 **P3** (register seed) · لَوْ S0152 **EXP** "if I had known"→"لَوْ عَرَفْتُ" (seed-verbatim, counterfactual carrier) — **drops out of the joint pile** |
| 12 | you do ±tashkeel | orthographic twins — **normalize orthography** (separate chore list), not ZUT |
| 13 | what ما/ماذا | ماذا keeps "what" · ما S0451 **EXP** "what they wanted"→"ما أَرادوا" |
| 14 | last night case-twins | **DEM** later (C1 case ending) |
| 15 | they wanted ×3 | CONV + tashkeel-normalize · S0419 **EXP** "if they want"→"إِذا أَرادوا" (teaches conditional-past) |
| 16 | quiet هادِئينَ/هادئ | "remain quiet"→"نَبْقى هادِئينَ" EXP · bare keeps "quiet" |
| 17 | they want يُريدوا/يريدون | يريدون keeps "they want" · يُريدوا S0438 **EXP** "they didn't want"→"لَمْ يُريدوا" (seed-verbatim) |
| 18 | new جَديدَة/جَديداً | "new words"→"كَلِماتٍ جَديدَةً" EXP · "something new"→"شَيْئاً جَديداً" EXP |
| 19 | I can ±subj | أَسْتَطيعُ keeps "I can" · أستطيع S0291 **EXP** "I'll be able to"→"أَنْ أَسْتَطيعَ" |
| 20 | good ة/ٌ | "a good idea"→"فِكْرَةٌ جَيِّدَة" EXP · bare keeps "good" |
| 21 | was كان/كانَتْ | كان keeps "was" · كانَتْ S0124 **EXP** "that was"→"تِلْكَ كانَتْ" (fem carried by تِلْكَ; absorbs the تِلْكَ lego → flag) |
| 22 | that ×4 | ذٰلِكَ keeps "that" · إِنَّ S0102 **EXP** "to say that"→"نَقولَ إِنَّ" · تِلْكَ S0124 absorbed by #21 · الَّذي S0143 **EXP** "the same thing that"→"نَفْسُ الشَّيْءِ الَّذي" |
| 23 | kind ةً/ٌ | "she was very kind"→"كانَتْ لَطيفَةً" EXP (VER: overlaps #21's كانَتْ chunk — dual-expand check) · bare keeps "kind" |

**ara joint pile after this pass:** only #2 (to-drink-it English-identical fork → seed-divergence candidate).

---

## Verification pass (next step, before checkpoint 1)
Script `zut-spec-verify.cjs` to run every EXP/BOUND row against the live DB: (1) proposed target is a contiguous substring of the seed target; (2) proposed known words appear in the seed known (seed-verbatim rule) or item is flagged divergence; (3) proposed known collides with NO existing is_new known (post-strip normalized, course-wide); (4) every target word already introduced ≤ that seed; (5) absorptions/DEMs listed with basket sizes. Output: per-course PASS/FAIL table; failures get re-worked before anything is applied.

---

# Verification round 1 (07-02) — results and reworks

Verifier: `scripts/experiments/weekend-scan/zut-spec-verify.cjs` → `temp/zut-spec-2026-07-02/verify-report.md`. 298 member-actions checked against live DB: **261 PASS · 22 FAIL · 10 divergence-flag · 3 VER answered.**

## New principle from the failures: MINIMALITY
Fix only as many members as needed to make every known unique; leave the earliest/bare member untouched wherever the other members' fixes already clear the collision. This deletes several planned edits (less text churn, less audio):
- deu **thought**: after fand/gedacht/dachten fixes, all three dachte members keep bare "thought"→dachte (convergent) — S0615/S0387/S0536 NO ACTION.
- deu **have**: hast absorbed + habt in P3 leaves "have"→habe unique — S0037 NO ACTION.
- deu **had to**: after "we had to"→"wir mussten", both musste members keep "had to" — S0593/S0353 NO ACTION.
- deu **when**: after wann's expansion, both wenn members keep "when" — NO ACTION (kills the wenn/ob collision entirely; "if"-rename withdrawn).
- deu **think**: after denken/denkt go P3, denke keeps bare "think" — S0636 NO ACTION.
- fra/por **I heard that**: just DEM the later ±que twin (S0509, basket 7); no boundary surgery on S0364.

## Failure reworks (replacing the affected table rows)
| item | rework |
|---|---|
| ara S0630 can-I BOUND | twins are genuinely different frames → **EXP** "can I have"→"يُمْكِنُني الحُصولُ"; S0119 keeps "can I"→"يُمْكِنُني أَنْ" |
| ara S0123 good-idea | S0189 is an untashkeeled twin of the same mapping → **ORTHO-normalize S0189 + CONV**; S0123 expansion stands (convergent) |
| deu S0499 we-should | existing S0403 "we should"→sollten owns the known → S0499 **known-only fix** "we should" with target staying `sollten` (converges with S0403) |
| deu S0043 how-to-answer | **NEW pre-existing pair** with S0202 "how to answer"→"wie man beantworten sollte" → joint mini-pair, needs S0202 seed context (added to Hard/checkpoint pile) |
| deu S0529L03 you-all | stands; **sequencing**: apply after S0656 P3 (or atomically) |
| deu S0562 just→nur | real gerade collision → **EXP** "I just want"→"Ich will nur" instead |
| deu S0521 wir-mussten | verb-final, not contiguous → **EXP** full clause "why we needed to stay here"→"warum wir hier bleiben mussten" |
| deu capital-contiguity (S0615/S0353/S0536/S0037) | moot — NO ACTION per minimality; applier still matches contiguity case-insensitively |
| fra S0431 not-ready-yet | pre-existing sg twin S0345L03 owns the known → **EXP** "they're not ready yet"→"ils ne sont pas encore prêts" (dual-expand) |
| fra S0481 the-only | pre-existing fem twin S0094 "the only"→"la seule" → dual-expand: S0481 "the only real hope"→"le seul vrai espoir"; **S0094 added to spec** ("the only way"→"la seule façon", VER seed) |
| ita S0337 to-play | stands; **sequencing**: suonare expansion first |
| kor S0641 that-chair | verifier false-positive (whitespace tokenizer vs agglutinated 의자에) — re-verified by substring, VOCAB ok; stands |
| kor S0635 janes-bag | **NEW pre-existing near-twin** S0636 "jane's bag"→"제인의 가방인" → joint mini-pair: S0635 → "that is Jane's bag"→"그건 제인의 가방이에요"; S0636 per its seed (checkpoint) |
| kor S0580 children | contiguity fail confirmed → **DEM** (fallback per table) |
| kor S0302 doesnt-want-to | known corrected to "said that she doesn't want to"→"싶지 않다고 했어요"; sequence after S0304 DEM |
| por S0364/S0509 | same ±twin as fra → **DEM S0509**, unbracket S0364; no other change |
| spa S0622 they-had-broken | divergence fixed seed-verbatim: **"the children had broken it"→"los niños lo habían roto"** |
| deu S0557 they-would | seed says "wouldn't" → **EXP** "they wouldn't"→"sie würden nicht" (seed-verbatim) |
| deu S0117 at-the | known adjusted to "than last time"→"als beim letzten Mal" |
| deu S0171 help | known adjusted to "me to help you"→"dass ich dir helfe" |
| kor S0355 woman | known adjusted to "to that woman"→"그 여자와" (talk-to comitative) |
| remaining divergences (kor S0412/S0378/S0604, ara S0143) | milder seed-verbatim glosses at apply time; each listed in the spec with its adjusted known |

## Data bugs confirmed (separate repair items, not ZUT)
- **deu S0081L01** — lego "had"→hatte attached to unrelated seed ("when do you want to start?"), target not in seed. Needs its own investigation/repair.
- **kor S0595L01** — lego target 정원에서 not in its seed target (정원에). Fix lego to 정원에 → conflict dissolves into CONV with S0383.

## Follow-up sweep required
The verifier surfaced pre-existing same-known collisions the conflict input never listed (deu how-to-answer, fra not-ready-yet + the-only gender twins, kor jane's-bag). After this campaign lands, run a **whole-course known-collision sweep** (all is_new LEGOs, post-strip normalized) on all 9 — the strip-induced list was not the full ZUT universe.

## Sequencing constraints for the applier
Partner-member fixes must apply in dependency order (or atomically per conflict): S0133L04 before S0388L03 (deu you-work) · suonare before giocare (ita) · S0656 P3 before S0529L03 (deu you-all) · S0304 DEM before S0302 (kor) — the applier should re-run the collision check after each conflict-group commit.

## Cost roll-up (for the TTS plan)
~200 EXP/P3 LEGOs → presentation + known + target1/2 clips each · 28 DEMs → zero clips, ~245 phrases orphaned (sizes in verify-report) · 4 zho/fra consolidations → ~40 phrase-target regens. Total estimate: **mid-hundreds of clips** — itemized plan before generation per the standing gate.

---

# Learner-logic verification (07-02, pre-execution) — Kai's "does the course hold for a learner" check

**TTS note (Kai 07-02): full regen with new xAI voices is coming anyway — clip costs no longer constrain strategy choice. Standing plan-before-generate gate still applies.**

- **A. Consolidations must be course-wide sweeps.** zho standalone 但 appears in **17 phrases outside** the two fixed baskets (some at S106, long before 但's own S426 debut); bare 左转 in 10 outside S502 (including S395's own basket). A basket-only retarget would leave the learner cued "but"→但是 but scored against 但. → The zho consolidation rows sweep **every** phrase containing the retired form (但→但是: ~35 rows; 左转→向左转: ~22 rows), plus seed targets where they carry it.
- **B. kor particle prerequisite holds.** 14/20 of the first twenty seeds already display 을/를/이/가/은/는 in context — the particle system is ambient from the start, so a case-marked twin's debut was never the load-bearing teaching moment.
- **C. Demotion exposure is safe.** The demoted forms are either ambient (그가 in 161 phrases outside its basket, 아이들이 65 — the "debut" at S597/S455 was retroactive paperwork) or near-private (인생은/근처예요/친구들이 0 outside). No demotion strands a form the learner can't derive from noun + ambient particle.
- **D. Register-block components: rebuild, vocative-first.** Live component data in the block is poor-to-garbage (kor S0644L04 glosses the politeness ending 요 as **"thanks"**; deu/kor mostly empty; ita self-component carries the banned "(formal)" marker). P3 therefore **rebuilds components fresh** per block LEGO, ordered **vocative first** ([sir→signore][could you→potrebbe][say it→dirlo]) so the register license precedes the formal verb in the breakdown; component glosses marker-free. The informal/formal component collision ("could you"→potrebbe vs taught potresti) is accepted as context-licensed — the learner has just heard the vocative. (Fixing the garbage components is a free side-benefit of P3.)
- **E. Absorption baskets** behave like demotion baskets (orphaned, acceptable per ruling).

## Execution begins (stage 1+2): spa applied first as the sample course (per verify-before-bulk), then fra/ita/por; checkpoint 2 after the Latin set.
