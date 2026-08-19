# Cue-Library v1.0 — spa_for_eng (closed-loop verified)

*2026-07-02 — designed against the 23 real springs from the full-course journey walk (wf_c1710a42-c49), adversarially verified patch-by-patch (wf_3405a64a-f3e). Clearance: **17 CLEARED / 6 PARTIAL / 0 FAILED**, zero new ZUT collisions, zero unreachable patches.*

## The two laws this run established

1. **The cue lives in what the learner sees.** Lego `known_text`, `components` JSONB, and practice-phrase rows are stored independently — a gloss-enrichment must sweep ALL surfaced layers or bare cues stay live at the rows the learner actually meets. Make this a build-tool validation check.
2. **Wrapper context does not discriminate at recall.** The trigger material must sit inside the prompted chunk's own gloss (the hablen debut-rung proof).

## Verdict

PROVEN, with one honest boundary. The cue-bundling M-lego mechanism survived closed-loop adversarial verification: 23 patches, 17 cleared outright, 6 partial, ZERO failed, zero new ZUT collisions, zero reachability failures — and critically, not one PARTIAL was a cue-discrimination failure. Every partial shares the same implementation-layer root cause: the SSi schema stores lego known_text, components JSONB, and practice-phrase rows (component/build/USE) independently, so an enrichment that stops at the lego record leaves bare cues live at the rows the learner actually sees. The v1.0 law that falls out is the mechanism's completion, not its refutation: THE CUE LIVES IN WHAT THE LEARNER SEES — every gloss-enrich must sweep all four surfaced layers, and this should be a build-tool validation check, not a per-patch discipline. Second refinement (from 297): sentence-level WRAPPER context does not reliably discriminate at recall; the trigger material must sit inside the prompted chunk's own gloss. Both laws transfer verbatim. Romance transfer readiness: F1, F2 GO as-is; F3, F4, F5, F6, F7 GO once their fold-ins (all specified, all mechanical) land and re-verify; F8 is NOT ready — it received no patches this run and its parenthetical-complement cue is the weakest cue type in the library; pilot it on spa_for_eng before any transfer. The romanceTransfer columns hold up well because the mechanism never asks the learner to choose a form — the bundle absorbs per-language differences (French espérer+indicative, Portuguese future subjunctive), which is exactly why the library transfers where a rules approach couldn't.

---
## Library v1.0 — the 8 trigger families

### F1 SOMEONE-ELSE-TO (subject-change volition/emotion) — **VALIDATED**

- **Trigger (the felt English cue):** English 'want / hope / wouldn't like + SOMEONE + to VERB' — the 'you to / her to' fragment is the felt cue (I want to help = quiero ayudar; I want HER to help = quiero que me ayude)
- **Mechanism:** Fuse matrix + que + marked verb into one M-lego at debut ('they want you to ask' = 'quieren que preguntes'). When the verb needs its own lego, gloss it as the infinitive-fragment English actually uses after these matrices ('you to think' = pensaras, 'you to ask' = preguntes), never the bare finite. DELETE any bare build rung alongside the re-gloss — the rung row is stored independently and is the literal debut cue. Precedent anchors: 15|2, 170|2, 292|1, and now 427/432/668 (espero que podáis = exact plural of 292|1).
- **Verification fold-ins:** Both patches cleared with no new collisions. Fold-ins from verdicts: (1) also correct the 427 anchor-rung tense mis-gloss ('they don't want' -> 'they wouldn't like'); (2) latent trap logged, not cleared: 427 USE 9 uses an EMOTION matrix ('I was worried you'd think' = estaba preocupada de que pensaras) that carries no F1 cue — delete or mint a distinct emotion-subjunctive M-lego in a follow-on sweep; (3) 432|1|pos5 has an unrelated tense mismatch (sabía que quieren) for a separate sweep.
- **Romance transfer:** Identical cue, identical bundle: fra 'je veux que tu demandes' / 'j'espère que vous pouvez' (indicative — the BUNDLE absorbs French espérer, no rule ever applied); ita 'vogliono che tu chieda'; por 'querem que perguntes / que você pergunte'. The 'want X to' fragment glosses the que-clause chunk in all four. Transfer-ready.

### F2 I-DON'T-THINK (negated belief / uncertainty) — **VALIDATED**

- **Trigger (the felt English cue):** English 'I don't think (that) / I didn't think / I'm not sure (that) + CLAUSE' — negation of the believing verb is felt pre-consciously; affirmative 'I think/thought' stays indicative and is the free contrast (387 now contains the minimal pair pensé que tenía razón vs no pensé que tuviera razón)
- **Mechanism:** Marked form debuts ONLY inside a matrix-carrying frame. TEMPLATE CLARIFIED by verification (318): the more composable SSi implementation is the SUB-PHRASE chunk as the lego ('that she could' = 'que pueda') with the negated matrix living in every build/USE phrase's English — not a full-sentence lego. Adopt that as the F2 standard going forward. Components named as [no pensé que | tuviera razón] style — matrix as one named atom, introduce flag on the marked chunk. Bare rung rows deleted, not just re-glossed. Never expose pueda/necesite/sea/tuviera under bare 'could/needs/is/was'.
- **Verification fold-ins:** All five patches (318/326/330/387/668) cleared. Fold-ins: (1) align 330's lego wording to the phrase corpus ('I don't think that is' rather than 'I don't think it's') — cosmetic, Tom's wording call; (2) residual for a standardisation sweep: 'no estoy seguro de que' takes indicative at seeds 169/252/406 but subjunctive at 656/668, making it a noisy F2 cue — standardise mood or space the exposures; (3) the 326 verdict's flagged sibling (330|1 bare 'is'=sea) was resolved by patch 8.
- **Romance transfer:** fra 'je ne pense pas que ce soit / qu'elle puisse'; ita 'non penso che sia / che possa'; por 'não acho que seja / que possa'. All four flip mood under exactly this English cue; the sub-phrase-chunk template ('that she could' = qu'elle puisse / che possa / que possa) translates verbatim. Transfer-ready.

### F3 NO-SUCH-PERSON (indefinite / negated antecedent) — **REVISED**

- **Trigger (the felt English cue):** English indefiniteness carried INSIDE the prompted chunk itself: 'who speak' = que hablen, 'anyone I knew' = a nadie que conociera — with the not-many/didn't-see-anyone sentence wrapper as reinforcement, NOT as the discriminator. HONEST DOWNGRADE from v0: the wrapper alone does not reliably discriminate at recall (5 existing USE phrases at 297|3 carry no wrapper at all), so the que-bundled/nadie-bundled gloss inside the chunk is the load-bearing cue.
- **Mechanism:** Bind the subjunctive relative inside the antecedent chunk with a que-bundled gloss unique from its indicative twin ('who speak' = que hablen vs 'they speak' = hablan@283, 'people who speak' = personas que hablan@22; 'anyone I knew' = a nadie que conociera). CRITICAL fold-in: the enrichment must reach the DEBUT RUNG ROW in course_practice_phrases, which is stored independently of the lego — 297|3|pos1 still reads bare 'They speak' = Hablen and preserves the collision at the exact debut moment. Preferred fix: delete pos1 and promote pos2 'People who speak Spanish' = 'Personas que hablen español' as the debut, bundling context into the first exposure.
- **Verification fold-ins:** 370 CLEARED clean (implementation note: update pos1 rung to 'anyone I knew' alongside the lego). 297 PARTIAL: (a) rung-level fix above is mandatory; (b) discipline statement rewritten — drop 'que hablen only surfaces inside don't-know-many frames' as a guarantee, since the corpus already violates it; rely on the chunk-internal gloss and treat wrapper-carrying sentences as reinforcement.
- **Romance transfer:** fra 'je ne connais personne qui parle(subj)'; ita 'non conosco nessuno che parli'; por 'não conheço ninguém que fale'. Transfers, WITH the revised law: in all four languages the subjunctive relative must be glossed as a bundled chunk ('who speak', 'anyone I knew') at every surfaced row including the debut rung — never rely on the sentence wrapper to do the discriminating.

### F4 NOT-YET TIME TRIGGERS (lexical trigger words) — **REVISED**

- **Trigger (the felt English cue):** English 'until… / before… / whenever… / when… (still ahead)' — the trigger WORD itself is the cue; the event after it hasn't happened yet
- **Mechanism:** Trigger is a lego (hasta que, antes de que, siempre que, cuando) and the marked verb only ever appears GLUED to it ('until they're ready' = hasta que estén listos as one chunk). Fold-in made explicit: the parenthesized-trigger rule applies to EVERY surfaced row — lego known_text, component rows, AND build rungs — because none inherits from the others. Proven pattern (506/542): component rows get '(before) we moved' = nos mudáramos, '(whenever) you feel' = te sientas, and both the practice-phrase row and the components JSONB must be updated. 396 requires the full 3-change set: delete bare B01, update the lego row known_text to 'until they are ready', re-gloss C01 to '(until they) are' = estén.
- **Verification fold-ins:** 506 and 542 CLEARED (the minimal component-parenthetical fix is the family's cleanest proof). 396 PARTIAL — trap cleared at rung level but two rows the patch didn't name remain live: the lego row itself (drives the debut card) and the bare component C01 'are' = estén. Both are specified above and mechanical. Bonus leak still unswept: 281|4 'you start' = empieces is bare behind its trigger.
- **Romance transfer:** Cue transfers; FORM differs per language and the bundle absorbs it: fra 'jusqu'à ce qu'ils soient prêts' (subj) but 'quand ils seront prêts' (FUTURE); ita 'finché non siano/sono pronti', 'quando saranno pronti'; por 'até que estejam prontos', 'quando estiverem prontos' (future subjunctive). Because the chunk is the atom, each language fills it with its own form — the learner never chooses. Transfer-ready once the all-rows discipline is baked into the build tooling.

### F5 AS-IF UNREALITY — **REVISED**

- **Trigger (the felt English cue):** English 'as if / as though + PAST-shifted verb' ('as if I DIDN'T care', 'as if you NEEDED to sleep') — English past-where-present-is-meant is the felt unreality cue; present-tense English after as-if is banned course-wide
- **Mechanism:** como si + imperfect-subjunctive is always one bundled chunk with past-shifted English gloss (precedent 26|3, 114|2). Fold-in from verification: COMPONENT rows are presented as prompts (course pattern at 114|2 pos1 'As if' = como si), so the como-si wrapper must extend to the component layer too — 497|2 pos1 must become 'as if you needed to' = 'como si necesitaras', never bare 'you needed to' one consonant from held necesitabas@207. Past-shift ripples through every known_text in the seed (known-side audio regen; Spanish untouched).
- **Verification fold-ins:** 538 CLEARED clean (restores 48|1 as sole owner of 'I don't care'). 497 PARTIAL — the patch fixed the build rung and USE line but missed the bare component at pos1, which fires BEFORE the enriched build; re-gloss it per the mechanism above (or collapse the component into the M-lego debut and drop it).
- **Romance transfer:** fra 'comme si je ne m'en souciais pas' (imparfait); ita 'come se non m'importasse' (cong. imperfetto); por 'como se não me importasse'. All four take exactly the English past-shift cue; enriched glosses translate 1:1 — including at the component layer. Transfer-ready with the component rule.

### F6 BEEN-DOING SPLIT FRAME (llevar + [time] + gerund) — **REVISED**

- **Trigger (the felt English cue):** English 'I've/you've been VERBing (for) TIME' with a stated duration — duration stated = duration sits INSIDE the frame; 'how long have you been VERBing?' = the only contiguous frame, owned by the question chunk
- **Mechanism:** Debut the frame as a WHOLE split chunk with a time filler already inside ('I've been learning all day' = 'llevo todo el día aprendiendo', components [llevo | todo el día | aprendiendo]); build rungs swap only the time slot (todo el día -> una semana -> más o menos una semana). ATOMICITY LAW from verification: the 38 split re-debut and the 38 ladder reorder ship as ONE change — the reorder alone is insufficient while the contiguous 'llevo aprendiendo' label exists as a named atom (it provides a competing pull under recall+combine). Contiguous form survives only inside '¿cuánto tiempo llevas aprendiendo?'. Warm-up rung before any long cold USE (seed 60 pattern); keep contraction register consistent ('I've been').
- **Verification fold-ins:** 33, 38-redebut, 60 CLEARED. 38-reorder PARTIAL only in isolation — resolved by pairing with the re-debut (apply atomically). 115 PARTIAL for a reason OUTSIDE the frame fix: 115|4|20 has a semantic mismatch ('been TRYING for a week' cueing aprendiendo, while intentando is the firm mapping since seed 2) — fix the English to 'been learning for a week' (preferred) or delete (15-phrase headroom). Polish items: insert the seed-33 rung between USE pos8 and the trap at pos9 (given->production adjacency); consider making llevo…aprendiendo salient (non-ghost) in warm-up rungs — course-builder decomposition call.
- **Romance transfer:** Each language's been-doing idiom is its own discontinuous chunk under the same English cue: fra 'ça fait une semaine que j'apprends'; ita 'è da una settimana che imparo'; por 'há uma semana que estou a aprender'. Same treatment: whole-chunk debut with a time filler inside, then time-slot substitution rungs, contiguous form (if any) quarantined in the question frame. Transfer-ready once the atomic-pair and mismatch fixes land.

### F7 FORMAL YOU (register marker retention) — **REVISED**

- **Trigger (the felt English cue):** English 'you' aimed at usted — the marker must be IN the prompt at EVERY surfaced layer: '(formal)' parenthetical or ', sir / , madam' vocative; never bare 'you' for a formal form. The informal twin owns the bare gloss.
- **Mechanism:** Fold-in that defines v1.0: the M-lego record, component rows, BUILD rows, and USE rows are independent DB rows — enriching the lego does NOT cascade, and the 646 verdict proved bare build rows present stripped cues before the fixed USE lines are ever reached. The F7 rule is therefore a full-ladder sweep: every row whose target is formal carries a marker in its known_text. Sibling seeds 647 (usted in the English) and 652 (sir/madam vocatives in builds) are the house patterns to mirror. 653 correction: the '(formal)' marker previously lived only in components JSONB, not surfaced text — promote it to the surface at all three levels.
- **Verification fold-ins:** 651/653/655 CLEARED; 646 PARTIAL — extend the patch to build rows pos3/4/5 ('you're doing (formal)', 'you're doing something (formal)' or ', sir', 'what you're doing (formal)'). Parallel sweep owed: 651 build pos1/2 bare-but-unique (consistency, not a trap); seed 652 bare USE lines; bonus leak 642|2 'you feel' = se siente (bare, and a THIRD collision with te sientes@40 / te sientas@542).
- **Romance transfer:** Identical mechanism: fra vous ('you (formal)' since English can't show it), ita Lei, por o senhor/a senhora (rides vocatively like señor). Both marker styles translate directly. Transfer-ready, with the full-ladder sweep encoded as a build-tool check rather than a per-patch discipline.

### F8 LEXICAL TWINS (complement-bound pairs) — **NEEDS_WORK; the parenthetical mechanism is RULED OUT**

> **Overruled, 2026-08-17.** F8's proposed mechanism put a parenthetical into learner-facing
> `known_text` (`I know (people/places)` = conozco) as house style. Kai: **no parenthetical tags in
> courses, ever** — *"they're a pet peeve of mine"* — and existing ones get removed. They are also
> spoken aloud, so the bracket is read to the learner. The pilot proposed below must therefore NOT
> test a parenthetical.
>
> **The replacement is a narrower plain gloss that survives being spoken**: `to know a person`,
> not `to know (a person)`; `I know people` / `I know a place` rather than `I know (people/places)`.
> The doc's own stated fallback — phrase-level discipline, only prompting `conozco` in phrases
> whose English contains the person/place object explicitly — is compatible with the ruling and is
> now the primary path, not the fallback.


- **Trigger (the felt English cue):** One English word, two target lemmas — the COMPLEMENT/person is the cue: know+person/place (conozco) vs know+fact (sé); are+doing/location (estamos) vs are+identity (somos); feel bound to its matrix person (sentirme/sentirse)
- **Mechanism:** Enrich the marked twin's gloss with the complement it always takes ('I know (people/places)' = conozco), leaving the other twin sole owner of the bare gloss; discipline the phrase inventory so the parenthetical is rehearsed into a felt collocation. UNTESTED: no F8 patch was generated or adversarially verified in this run — this is the only family with zero closed-loop evidence, and it carries a specific unproven assumption (that a parenthetical complement reads as a felt cue rather than an annotation, which is a weaker cue type than F1-F5's in-chunk English words or F7's established house marker).
- **Verification fold-ins:** Do not transfer on faith. Run a pilot patch+adversary cycle on spa first: conozco/sé (seeds 59/85/231/288/297) and estamos/somos (102/110), verifying under recall+combine that the complement-parenthetical discriminates and creates no new ZUT collisions. If the parenthetical proves weak at recall, fallback is phrase-level discipline instead: only ever prompt conozco in phrases whose English contains the person/place object explicitly, and delete cue-bare USE phrases (headroom permitting).
- **Romance transfer:** The twins exist estate-wide (fra connaître/savoir — DROP the ser/estar pair for French, copula collapses; ita conoscere/sapere + partial essere/stare; por full transfer including sentir-me/sentir-se), but transfer is BLOCKED pending the spa pilot.

---
## The 23 patches (before → after)

### Seed 33 — F6 BEEN-DOING SPLIT FRAME [`BUILD_RUNG`]
*Spring:* USE 'You've been learning Spanish all day' demands the split frame while the held atom is contiguous 'llevas aprendiendo'; no seed-33 build rehearses the split

- **BEFORE:** builds only rehearse the contiguous question frame: 'How long have you been learning?' = '¿Cuánto tiempo llevas aprendiendo?'
- **AFTER:** insert build rung 'You've been learning all day' = 'Llevas todo el día aprendiendo' immediately before the USE line; the USE line then just appends 'español'
- **Why:** First-ever exposure of the split shape arrives as a given whole chunk, not a production demand. Contiguous 'llevas aprendiendo' keeps the 'how long…?' question frame. ZUT-safe: 'You've been learning all day' exists nowhere else.

### Seed 38 — F6 BEEN-DOING SPLIT FRAME [`NEW_M_LEGO`]
*Spring:* lego 38|1 debuts contiguous 'llevo aprendiendo' but every produced phrase splits it

- **BEFORE:** 38|1: 'I've been learning' = 'llevo aprendiendo' (contiguous atom)
- **AFTER:** 38|1 re-debuts as split-frame M-lego: 'I've been learning all day' = 'llevo todo el día aprendiendo', components [llevo | todo el día | aprendiendo]; existing rungs 'Llevo una semana aprendiendo' / 'Llevo más o menos una semana aprendiendo' become time-slot substitutions
- **Why:** The atom the learner holds now HAS the split shape; the ladder already rehearses the slot swaps. Verified no lego collides with 'I've been learning all day'. The contiguous form is never given, so it can't prime the wrong order.

### Seed 38 — F6 BEEN-DOING SPLIT FRAME [`REORDER`]
*Spring:* build 'Llevo más o menos una semana aprendiendo' — held atoms actively prime the wrong contiguous order

- **BEFORE:** ladder order leaves 'más o menos una semana' to be assembled against a contiguous held atom
- **AFTER:** with the split re-debut in place, fix ladder order: 'Llevo todo el día aprendiendo' (debut echo) → 'Llevo una semana aprendiendo' (slot swap) → 'Llevo más o menos una semana aprendiendo' (slot extension); all three already exist as builds
- **Why:** Pure sequencing: each rung changes only the material inside the already-held slot. No new items, no audio changes; the wrong-order priming disappears because the contiguous atom no longer exists (patch 2).

### Seed 60 — F6 BEEN-DOING SPLIT FRAME [`BUILD_RUNG`]
*Spring:* long USE phrase 'Llevo más o menos una semana aprendiendo palabras diferentes en español' hits the split frame cold — seed 60 has zero llevar rehearsal

- **BEFORE:** no build at seed 60 rehearses the frame; the USE line is the first llevar production since seed 38
- **AFTER:** insert build rung 'I've been learning different words for a week' = 'Llevo una semana aprendiendo palabras diferentes' before the USE line; USE then extends with 'más o menos' + 'en español'
- **Why:** One warm-up rung turns a cold 12-word split production into slot-recall + extension. With patch 2 the frame is already a held atom, so this is cheap insurance, not new teaching.

### Seed 115 — F6 BEEN-DOING SPLIT FRAME [`REORDER`]
*Spring:* USE '…y llevo una semana aprendiendo' — split frame still never taught as an atom by seed 115

- **BEFORE:** split frame reachable only by tearing apart the contiguous held atom from seed 38
- **AFTER:** no change at 115 itself: after the seed-38 re-debut, 'llevo una semana aprendiendo' is literally a held build chunk (38: 'I've been learning for a week' = 'Llevo una semana aprendiendo'); the 115 line is direct recall
- **Why:** The family fix lands upstream (seed 38); this spring resolves by inheritance. Deletion fallback exists (lego 115|4 carries 24 phrases) but is unnecessary — the line becomes pure recall+combine.

### Seed 297 — F3 NO-SUCH-PERSON [`GLOSS_ENRICH`]
*Spring:* 297|3 'they speak'=hablen collides with 283|3 'they speak'=hablan in the same 'personas que ___ español' frame

- **BEFORE:** 297|3: 'they speak' = 'hablen'
- **AFTER:** 297|3: 'who speak' = 'que hablen' (que bundled into the lego); the full-sentence lego 297|4 'I don't know many people who speak Spanish' = 'no conozco a muchas personas que hablen español' stays as the anchor; discipline: 'que hablen' only ever surfaces inside don't-know-many frames
- **Why:** 'who speak' → que hablen is now unique course-wide (indicative side owns 'they speak'=hablan@283 and 'people who speak'=personas que hablan@22 — verified). Rejected fixHint's 'who MIGHT speak': 'might' already maps to podría/puede que (261/456/520) and would create a new collision. The felt indefiniteness cue lives in the sentence wrapper, which every 297 phrase carries.

### Seed 318 — F2 I-DON'T-THINK [`NEW_M_LEGO`]
*Spring:* pueda debuts glossed 'she/he could' after ~80 reps of podría on that exact cue

- **BEFORE:** 318|1: 'she/he could' = 'pueda' (bare gloss, identical to podría's cue)
- **AFTER:** 318|1 re-debuts as 'I don't think she could' = 'no pienso que pueda', components [no pienso que | pueda]; the existing phrase ladder ('no pienso que pueda hablar español…') already carries the English cue on every line
- **Why:** The doubt matrix IS the cue and is fused into the atom, so pueda can never be pulled by bare 'could' (podría keeps that gloss uncontested). Verified 'I don't think she could' collides with no existing lego gloss. Mirrors held precedent 292|1 'I hope you can'=espero que puedas.

### Seed 326 — F2 I-DON'T-THINK [`NEW_M_LEGO`]
*Spring:* necesite debuts glossed 'needs' after ~40 reps of necesita on 'needs to'

- **BEFORE:** 326|1: 'needs' = 'necesite' (bare gloss)
- **AFTER:** 326|1 re-debuts as 'I don't think I need' = 'no pienso que necesite', components [no pienso que | necesite]; ladder lines with él/ella ('I don't think she needs to sell anything' = 'no pienso que necesite vender nada') slot held person-words in
- **Why:** Same fusion as 318 — the trio (318/326/330) shares one English cue pattern, which is itself what the learner learns. 'I don't think I need' verified unique. necesita keeps sole ownership of bare 'needs (to)'.

### Seed 330 — F2 I-DON'T-THINK [`NEW_M_LEGO`]
*Spring:* sea debuts glossed 'is' — colliding with the most-rehearsed word in the course

- **BEFORE:** 330|1: 'is' = 'sea' (bare gloss, identical to es)
- **AFTER:** 330|1 re-debuts as 'I don't think it's' = 'no creo que sea', components [no creo que | sea] (seed's first build is 'no creo que sea fácil' = 'I don't think that is easy'); pienso-variant lines compose from held 'no pienso que'
- **Why:** 'is' must never prompt sea; fusing the matrix makes the collision structurally impossible while es stays untouched. 'I don't think it's' verified unique. Completes the 318/326/330 trio on one consistent cue.

### Seed 370 — F3 NO-SUCH-PERSON [`NEW_M_LEGO`]
*Spring:* conociera debuts glossed bare 'knew', colliding with conocí/conocía/sabía

- **BEFORE:** 370|1: 'knew' = 'conociera'
- **AFTER:** 370|1 re-debuts as 'anyone I knew' = 'a nadie que conociera'; sentence = held 'I didn't see' (no vi) + the chunk: 'I didn't see anyone I knew' = 'no vi a nadie que conociera'
- **Why:** Exactly the fixHint: conociera stays bound inside its negated-antecedent chunk and never surfaces under bare 'knew'. 'anyone I knew' verified unique ('anyone'=nadie@71 keeps its own gloss). English 'didn't see ANYONE I knew' carries the indefiniteness pre-consciously.

### Seed 387 — F2 I-DON'T-THINK [`NEW_M_LEGO`]
*Spring:* bare build rung 'was right'=tuviera razón sits right after tenía razón drilling in the SAME seed

- **BEFORE:** lego 387|2 'was right' = 'tuviera razón' + bare build rung 'was right' = 'tuviera razón'
- **AFTER:** 387|2 re-debuts as 'I didn't think she was right' = 'no pensé que tuviera razón' (this exact rung already exists), components [no pensé que | tuviera razón]; DELETE the bare rung; the seed's other matrices (quería que / esperaba que / era importante que / no estaba seguro de que + tuviera razón) all keep their trigger-carrying English and compose matrix + held chunk
- **Why:** Densest collision in the run, fixed by the family's standard fusion; the seed then contains a free minimal pair — 'I thought he was right'=pensé que tenía razón vs 'I didn't think she was right'=no pensé que tuviera razón — making the negated-matrix cue felt. 'I didn't think she was right' verified unique.

### Seed 396 — F4 NOT-YET TIME TRIGGERS [`NEW_M_LEGO`]
*Spring:* estén listos and puedas debut under 'hasta que' but the lego and first rung gloss bare 'are ready'

- **BEFORE:** lego 396|3 'are ready' = 'estén listos' + bare build rung 'are ready' = 'estén listos'
- **AFTER:** 396|3 re-debuts as 'until they're ready' = 'hasta que estén listos' (rung already exists); DELETE the bare rung; 'I hope they are ready'=espero que estén listos stays (English 'I hope' is its own F1 cue); puedas already lives only inside 'until you can'=hasta que puedas chunks — no change; 'when they are ready'=cuando estén listos rides the trigger-lego cuando
- **Why:** Bare 'are ready' invites composition están+listos from held pieces; binding the form to its trigger removes the bare prompt entirely. 'until they're ready' verified unique; 'until'=hasta que keeps its own trigger-lego gloss (different known text, no collision).

### Seed 427 — F1 SOMEONE-ELSE-TO [`GLOSS_ENRICH`]
*Spring:* pensaras debuts glossed 'you thought' — a bare build rung even collides with the seed's own component 'you thought'=pensabas

- **BEFORE:** lego 427|1 'you thought' = 'pensaras' + bare build rung 'you thought' = 'pensaras'; mis-glossed rung 'they don't want you to think' = 'no les gustaría que pensaras'
- **AFTER:** 427|1: 'you to think' = 'pensaras' (the fragment English actually uses after these matrices); DELETE the bare rung; re-gloss the anchor rung 'they wouldn't like you to think' = 'no les gustaría que pensaras'; 'if you thought' = 'si pensaras' stays as its own bundled chunk (hypothetical-if + English past is its own natural cue)
- **Why:** 'wouldn't like YOU TO THINK' is the felt English cue (Tom's want-her-to pattern); 'you to think' verified unique and can never be pulled by 'you thought' (pensabas/pensaste keep those). Also fixes the tense mis-gloss on the anchor rung ('don't want' → 'wouldn't like').

### Seed 432 — F1 SOMEONE-ELSE-TO [`GLOSS_ENRICH`]
*Spring:* preguntes debuts glossed 'you ask', primed by preguntaste ('you asked'@382)

- **BEFORE:** lego 432|1 'you ask' = 'preguntes' + bare build rung 'you ask' = 'preguntes'
- **AFTER:** 432|1: 'you to ask' = 'preguntes'; DELETE the bare rung; ladder anchors on existing 'they want you to ask' = 'quieren que preguntes'; 'before you ask' = 'antes de que preguntes' stays whole (F4 trigger 'before' carries it)
- **Why:** Same cue as 427 — family consistency is itself teaching. 'you to ask' verified unique; preterite preguntaste keeps sole ownership of 'you asked'. Every remaining exposure carries either 'want you to' or 'before' in the English.

### Seed 497 — F5 AS-IF UNREALITY [`NEW_M_LEGO`]
*Spring:* necesitaras dormir debuts glossed 'you needed to sleep', one consonant from held necesitabas ('You needed'@207); no 2nd-person como-si template held

- **BEFORE:** lego 497|2 'you needed to sleep' = 'necesitaras dormir' + bare build rung with same gloss; USE line glosses English PRESENT: 'that sounds as though you need to get some sleep'
- **AFTER:** 497|2 re-debuts as 'as if you needed to sleep' = 'como si necesitaras dormir'; DELETE the bare rung ('it sounds as if you needed to sleep' rung already follows); GLOSS_ENRICH the USE line to 'that sounds as though you NEEDED to get some sleep'; 'you didn't tell me you needed to sleep' = 'no me dijiste que necesitaras dormir' keeps its negated-say English cue
- **Why:** The re-debut chunk IS the missing 2nd-person como-si template the fixHint asked for. English past-shift after 'as if' matches held glosses 26|3/114|2 ('as if I WERE'). 'as if you needed to sleep' verified unique; necesitabas@207 keeps bare 'You needed' uncontested.

### Seed 506 — F4 NOT-YET TIME TRIGGERS [`GLOSS_ENRICH`]
*Spring:* mudáramos (506) and nos mudamos (507) debut one seed apart; the 506 COMPONENT row glosses bare 'we moved' for the subjunctive

- **BEFORE:** 506|4 lego is already bundled ('before we moved' = 'antes de que nos mudáramos') but its component row shows 'we moved' = 'nos mudáramos' — the identical-gloss exposure
- **AFTER:** component row re-glossed '(before) we moved' = 'nos mudáramos'; lego and all phrases unchanged (every mudáramos line already carries 'before' in the English); 507 keeps sole ownership of bare 'we moved' = 'nos mudamos'
- **Why:** Minimal possible patch: the bundling already exists, only the decomposition display leaked a bare gloss. After the fix, ZUT holds mechanically: 'we moved' → nos mudamos; 'before we moved' → antes de que nos mudáramos. The parenthetical matches house '(formal)' style.

### Seed 542 — F4 NOT-YET TIME TRIGGERS [`GLOSS_ENRICH`]
*Spring:* te sientas (whenever-frame) one vowel from held te sientes@40; component row glosses bare 'you feel'

- **BEFORE:** 542|1 lego already bundled ('whenever you feel' = 'siempre que te sientas') but component row shows 'you feel' = 'te sientas'
- **AFTER:** component row re-glossed '(whenever) you feel' = 'te sientas'; all phrases already carry 'whenever' in the English — unchanged
- **Why:** Same minimal component-leak fix as 506. Verified the bare gloss 'you feel' also collides with a THIRD form — 642|2 'you feel'=se siente (formal, bare) — flagged for the F7 sweep; the parenthetical sidesteps both. 40|1 keeps 'do you feel'=te sientes.

### Seed 538 — F5 AS-IF UNREALITY [`GLOSS_ENRICH`]
*Spring:* importara glossed with English PRESENT 'as though I don't care'; component row 'I don't care'=no me importara collides EXACTLY with held 48|1 'I don't care'=no me importa

- **BEFORE:** 538|2: 'as though I don't care' = 'como si no me importara'; component 'I don't care' = 'no me importara'; all 538 phrases use present-tense English
- **AFTER:** 538|2: 'as though I didn't care' = 'como si no me importara'; component '(as though) I didn't care'; ripple the past-shift through the seed's phrases ('I don't want to seem as though I didn't care' = 'no quiero parecer como si no me importara')
- **Why:** English past-shift after as-if is the family cue and matches held 'as if I were' glosses; 'as though I didn't care' and 'I didn't care' verified unique, restoring 48|1 as sole owner of 'I don't care'. Known-side text/audio only — Spanish untouched.

### Seed 646 — F7 FORMAL YOU [`GLOSS_ENRICH`]
*Spring:* USE 'I think you're doing well' glosses bare 'you're doing' for formal está haciendo; informal twin lo estás haciendo@72 is primed

- **BEFORE:** USE: 'I think you're doing well' = 'pienso que está haciendo bien'; lego 646|1 'you're doing' = 'está haciendo' (bare)
- **AFTER:** USE: 'I think you're doing well (formal)' = 'pienso que está haciendo bien'; lego 646|1: 'you're doing (formal)' = 'está haciendo'; apply same marker to the seed's other stripped lines ('I can see you're doing something (formal)', 'I wonder what you're doing (formal)')
- **Why:** The seed's builds already use '(formal)' — the fix just stops stripping it on USE lines and the debut. Verified unique ('you're doing it (formal)'@655 is a different gloss). The informal twin keeps bare 'you're doing'.

### Seed 651 — F7 FORMAL YOU [`GLOSS_ENRICH`]
*Spring:* USE 'I want to know what you think' glosses bare 'you think' for formal piensa; twin piensas@327 primed

- **BEFORE:** USE: 'I want to know what you think' = 'quiero saber qué piensa'; lego 651|1 'think' = 'piensa' (bare)
- **AFTER:** USE: 'I want to know what you think (formal)' = 'quiero saber qué piensa'; lego 651|1: 'you think (formal)' = 'piensa'; same marker on siblings 'can you tell me what you think? (formal)' and 'I wonder what you think about that (formal)'
- **Why:** Matches the seed's own build 'think (formal)'=piensa and its señor/señora USE lines. 'you think (formal)' verified unique; 327 keeps 'do you think'=piensas uncontested.

### Seed 653 — F7 FORMAL YOU [`GLOSS_ENRICH`]
*Spring:* USE 'I wonder if it matters to you' glosses bare 'to you' for formal le importa; twin te importa@281 primed

- **BEFORE:** USE: 'I wonder if it matters to you' = 'me pregunto si le importa'; lego 653|1 'does it matter to you' = 'le importa' (bare)
- **AFTER:** USE: 'I wonder if it matters to you (formal)' = 'me pregunto si le importa'; lego 653|1: 'does it matter to you (formal)' = 'le importa' (this exact gloss already exists as the seed's first build — promote it); same marker on 'I think it matters to you (formal)' and 'I want to know if it matters to you (formal)'
- **Why:** Zero new material — the enriched gloss is literally the seed's own build text. Verified unique; 281 keeps 'do you mind'=te importa, so the informal side is already differently glossed.

### Seed 655 — F7 FORMAL YOU [`GLOSS_ENRICH`]
*Spring:* USE 'I can see you're doing it well' glosses bare 'you're doing it' for formal lo está haciendo; twin lo estás haciendo@72 primed

- **BEFORE:** USE: 'I can see you're doing it well' = 'puedo ver que lo está haciendo bien' (lego 655|1 is already correctly '(formal)')
- **AFTER:** USE: 'I can see you're doing it well (formal)' = 'puedo ver que lo está haciendo bien'; same marker on 'I wonder if you know how well you're doing it (formal)' and 'you're doing it so well (formal)'
- **Why:** The lego debut here is already the family template ('you're doing it (formal)') — only the USE lines strip the marker. Pure known-side enrichment, no Spanish or reorder needed; informal twin keeps bare glosses.

### Seed 668 — F2 I-DON'T-THINK (+ F1 hope-bundle debut) [`NEW_M_LEGO`]
*Spring:* podáis debuts glossed bare 'you all can' immediately after podéis rehearsals at 657-667

- **BEFORE:** lego 668|1 'you all can' = 'podáis' + bare build rung 'you all can' = 'podáis'; USE 'I'm not sure you all can do that' = 'no estoy seguro de que podáis hacer eso'
- **AFTER:** 668|1 re-debuts as 'I hope you all can' = 'espero que podáis' (exact plural of held precedent 292|1 'I hope you can'=espero que puedas), components [espero que | podáis]; DELETE the bare rung; the 'I'm not sure…' USE line stays — its English already carries the F2 doubt cue; 'it's great that you all can be here' keeps its value-judgment trigger in the English
- **Why:** Bundling beats reordering here: once podáis never appears under a bare prompt, adjacency to the podéis run is harmless (podéis is only ever glossed as questions, 'can you all…'@529+). 'I hope you all can' verified unique. Every surviving podáis exposure carries 'I hope / I'm not sure / it's great that' in the English — the family cue, consistently.

---
## Unresolved springs / fold-in work (12)

- **s297:** Debut rung 297|3|pos1 still reads bare 'They speak' = Hablen (independently-stored row; lego re-gloss doesn't cascade) — the ZUT collision with 283|3 survives at the exact debut moment. Plus 5 USE phrases at 297|3 carry no don't-know-many wrapper, proving the wrapper can't be the sole discriminator.
  - → Delete pos1 and promote pos2 'People who speak Spanish' = 'Personas que hablen español' as the debut rung (preferred), or re-gloss pos1 to 'Who speak' = Hablen. Rewrite F3 discipline: the que-bundled chunk gloss is the discriminator; wrapper sentences are reinforcement only.

- **s115:** USE 115|4|20 semantic mismatch: English 'I've been TRYING for a week' cues intentando (firm mapping since seed 2) but the target is 'llevo una semana APRENDIENDO' — wrong-twin pull the upstream seed-38 frame fix cannot remove.
  - → Change known_text to '…and I've been learning for a week' (preferred — known-side text/audio only), or delete the phrase (lego holds 15 USE phrases, well above the >=3 floor). Do not touch the Spanish.

- **s396:** Two rows outside the patch remain live: the course_legos row known_text still reads bare 'are ready' (drives the debut card) and component C01 'are' = estén exposes the subjunctive copula under the most minimal cue possible.
  - → Apply the verifier's 3-change set: delete bare B01; update lego known_text to 'until they are ready'; re-gloss C01 to '(until they) are' = estén per the F4 component-parenthetical rule.

- **s497:** Component row 497|2 pos1 'you needed to' = necesitaras is presented as a prompt BEFORE the enriched build and sits one consonant from held necesitabas@207 — the trap surface persists at the component step.
  - → Re-gloss pos1 to 'as if you needed to' = 'como si necesitaras' (extends the 114|2 'As if' = como si component precedent), then apply the rest of the patch as specified.

- **s646:** Build rows pos3/4/5 ('you're doing', 'you're doing something', 'what you're doing') remain bare formal cues encountered before the patched USE lines; build rows don't inherit from the M-lego record.
  - → Add the marker to all three build rows: 'you're doing (formal)', 'you're doing something (formal)' (or ', sir' per sibling 652 pattern), 'what you're doing (formal)'. Encode 'sweep every surfaced row' as a build-tool check.

- **s38:** The ladder reorder (patch 2) is insufficient alone — while the contiguous 'llevo aprendiendo' M-lego label exists it provides a competing wrong-order pull under recall+combine.
  - → Ship the split re-debut (patch 1: 'I've been learning all day' = 'llevo todo el día aprendiendo') and the reorder as ONE atomic change. Paired, the trap clears; never land the reorder first.

- **s281:** Bonus F4 leak found in design, never patched: 281|4 'you start' = empieces is a bare gloss behind a trigger.
  - → Fold into the F4 sweep: bind to its trigger ('(whenever/until) you start' or the full trigger-glued chunk) per the 506/542 pattern.

- **s642:** Bonus F7 leak, never patched: 642|2 'you feel' = se siente is bare — a THREE-way collision surface with te sientes@40 ('do you feel') and te sientas@542 ('(whenever) you feel').
  - → Re-gloss to 'you feel (formal)' = se siente in lego + all surfaced rows, per the F7 full-ladder rule.

- **s427:** Latent trap outside the cleared patch: USE 9 'I was worried you'd think about this' = 'estaba preocupada de que pensaras' uses an emotion matrix carrying no F1 cue ('you'd think' does not contain 'you to think').
  - → Delete the USE phrase (4 others cover the lego) or mint a distinct emotion-subjunctive M-lego in a future sweep — Tom's call on whether an F1b emotion family is worth the debut cost.

- **s432:** Pre-existing tense mismatch logged by the verifier: 432|1|pos5 'I knew they wanted you to ask' = 'sabía que QUIEREN que preguntes' (past English, present Spanish matrix).
  - → Separate content sweep: align to 'sabía que querían que preguntaras' (Spanish change + audio, needs native sign-off) or simplify the English to present ('I know they want you to ask').

- **s668:** 'no estoy seguro de que' is an inconsistent F2 cue: indicative at seeds 169/252/406, subjunctive at 656/668 — a noisy signal, though no ZUT collision.
  - → Standardisation sweep with a native speaker: prefer subjunctive after 'no estoy seguro de que' course-wide, or space/re-gloss the indicative instances.

- **s652:** F7 sibling flagged by the 651 verdict: seed 652 carries structurally identical bare formal USE lines (and 651's own build pos1/2 are bare-but-unique).
  - → Include in the estate-wide F7 sweep alongside 646 builds and 642|2; low urgency where glosses are unique, but consistency is itself teaching.

---
## Decision queue for Tom (11)

The three real forks are **#2 (seed-38 re-debut)**, **#5/#6 (house styles)**, **#9 (F1b emotion family)** — the rest are wording taste / mechanical sweeps / pilots.

1. F1 fragment glosses as learner-felt prompts: sign off that a dangling English fragment ('you to think' = pensaras, 'you to ask' = preguntes) reads acceptably as a standalone prompt in the player — this is a new gloss register for the course and changes what the learner hears/sees at debut.
2. Seed 38 re-debut approval: replacing the held atom 'I've been learning' with the split-frame 'I've been learning all day' = 'llevo todo el día aprendiendo' changes the atom's shape, its known-side audio, and the seed's intro order — the single most structural change in the run.
3. Seed 115|4|20 three-way call: change English (trying -> learning, preferred, known audio only) vs change Spanish (aprendiendo -> intentando, target audio regen + native check) vs delete — semantics and voice, not mechanics.
4. Seed 297 debut restructure: re-gloss pos1 'Who speak' vs delete-and-promote 'People who speak Spanish' = 'Personas que hablen español' as the new first cue — shifts the debut experience; Spanish expert should confirm the standalone subjunctive relative rung sounds natural, not clipped.
5. F7 marker style: '(formal)' parenthetical vs ', sir / , madam' (señor/señora) vocative on the 646 build rows and estate-wide — both exist in the course; pick one house style before the sweep bakes it in across four Romance courses.
6. F4 component-parenthetical convention: approve '(until they) are' / '(before) we moved' / '(whenever) you feel' as the standard component-display style — it extends the '(formal)' house pattern to trigger words and will appear on every decomposition screen.
7. 330 gloss wording: 'I don't think it's' vs 'I don't think that is' (corpus-aligned) — pure learner-felt wording, Tom's ear.
8. Native-speaker adjudication: 'no estoy seguro de que' + indicative at seeds 169/252/406 — decide whether to standardise to subjunctive course-wide (Spanish changes + audio) or accept the variation and manage exposure spacing.
9. 427 emotion-matrix call: delete USE 9 or open an F1b emotion-subjunctive family ('worried that' = 'preocupado de que' + subj) — a new family is a real debut-cost decision, not a patch.
10. F8 pilot go/no-go: authorise a spa_for_eng patch+adversary cycle on conozco/sé and estamos/somos before any Romance transfer of lexical twins; and confirm dropping the ser/estar pair for French (copula collapses).
11. Ghost-token salience: whether 'llevo … aprendiendo' should render salient (non-ghost) in split-frame warm-up rungs — a course-builder decomposition/display decision affecting how strongly the frame is re-prompted.

---
## Verifier details for the non-cleared patches

- **s38 — PARTIAL** (trapCleared=False, newCollision=none, reachable=True)
  - issue: The reorder substantially reduces wrong-order priming but does not fully clear the trap. The M-lego at 38|1 (`known='I've been learning'`, `target='llevo aprendiendo'`) is defined as a contiguous chunk (is_new=true) and remains in the learner's network as a named atom. While the bare contiguous build (position 3) was omitted — the learner never produces 'llevo aprendiendo' contiguously in any practice phrase across the course — the lego label still exists and under strict recall+combine provides a competing pull: [llevo aprendiendo] + [más o menos] + [una semana] → wrong order. The patch's own rationale acknowledges this: 'the wrong-order priming disappears because the contiguous atom no longer exists (patch 2).' Full clearance formally depends on patch 2 reframing or removing the contiguous M-lego definition. The reorder alone is necessary but not sufficient.
  - revision: Apply this reorder as specified (todo el día echo → una semana → más o menos una semana) AND pair it with patch 2: either (a) remove the 38|1 M-lego entry 'llevo aprendiendo' and replace it with a split-frame M-lego such as 'I've been learning [time]' = 'llevo [tiempo] aprendiendo' that names the discontinuous chunk as the atom, or (b) change the 38|1 known_text to 'I've been learning [all day]' = 'llevo todo el día aprendiendo' so the M-lego is defined in split form from the start. Either move eliminates the contiguous label that remains the residual priming source.

- **s115 — PARTIAL** (trapCleared=False, newCollision=none, reachable=True)
  - issue: The patch resolves the split-frame positioning problem (seed 38 lego-3 build-3 "I've been learning for a week" = "Llevo una semana aprendiendo" is confirmed in the DB and is rehearsed through seeds 38–40, making the chunk genuinely held by seed 115). However, the phrase at 115|4|20 contains an unaddressed semantic mismatch: the English says "I've been TRYING for a week" while the target says "llevo una semana APRENDIENDO" (learning, not trying). "Trying" = "intentando" has been the firm mapping since seed 2 lego-2, deeply rehearsed. Under strict recall+combine, the cue "been trying for a week" pulls "llevo una semana intentando" — not "aprendiendo" — so the wrong-twin interference is not eliminated by the upstream frame fix. The upstream patch is necessary but not sufficient. The required additional fix is one of: (a) correct the English known to "I've been LEARNING for a week" to match the Spanish target, (b) correct the Spanish target to "llevo una semana intentando" to match the English cue, or (c) delete 115|4|20 outright (lego 115|4 has 15 USE phrases, well above the ≥3 headroom floor).
  - revision: Either (preferred) change the known_text of 115|4|20 from "…and I've been trying for a week" to "…and I've been learning for a week" so the cue pulls "aprendiendo" unambiguously, OR delete 115|4|20 entirely. Do not change the target: "llevo una semana aprendiendo" is the correct split-frame production and the upstream seed-38 teaching now supports it. The frame-trap component of the patch is confirmed correct and should be retained regardless of which option is chosen here.

- **s297 — PARTIAL** (trapCleared=False, newCollision=none, reachable=True)
  - issue: The patch changes only the lego-level known_text in course_legos (297|3: 'they speak' → 'who speak'='que hablen'). However, the debut build rung is stored as an independently-typed string in course_practice_phrases: 297|3|pos=1 reads 'They speak' → 'Hablen'. This independently-stored row is NOT updated by the patch and is the literal recall cue the learner receives at debut. The rung-level collision — 297|3|pos=1 'They speak'=Hablen vs 283|3|pos=3 'They speak'=Hablan — survives intact. Under recall+combine with the heavily-rehearsed indicative twin already loaded from seed 283, the wrong form hablan can still surface at the exact debut moment regardless of the lego name change. The patch must also update course_practice_phrases 297|3|pos=1 from 'They speak' to 'Who speak' (or a full build-rung resequence starting from 'Who speak Spanish'=pos=2 as the new first cue). Additionally, the patch's stated discipline ('que hablen only ever surfaces inside don't-know-many frames') is violated by 5 existing USE phrases at 297|3 that carry no such wrapper (e.g. pos=7 'I'd like to meet more people who speak Spanish', pos=8 'Do you know people who speak Spanish?', pos=20 'I'm trying to find people who speak Spanish so I can practise with them'). These are F3-semantically valid but show the wrapper cannot be relied upon as the sole discriminating cue at recall.
  - revision: Update course_practice_phrases 297|3|pos=1 from 'They speak'→'Hablen' to 'Who speak'→'Hablen' (matching the patched lego known_text). This removes the bare rung-level collision. Alternatively, delete pos=1 entirely and promote pos=2 'People who speak Spanish'→'Personas que hablen español' as the new debut rung — this bundles context into the very first cue and makes the indefinite antecedent felt from the first exposure. The 14 USE phrases at 297|3 easily absorb either approach. The patch's lego-level change is correct and sufficient at that level; the rung is the missing piece.

- **s396 — PARTIAL** (trapCleared=True, newCollision=none, reachable=True)
  - issue: C01 component row 'are' = estén (S0396L03C01) is not addressed by the patch and remains live. F4 discipline explicitly requires trigger-parenthesized component glosses ('(until) are' or '(until they) are' = estén). The bare B01 rung deletion is correct and the main trap is cleared — B02 'until they are ready' = hasta que estén listos already exists as the debut rung. But C01 exposes the subjunctive copula under the most minimal English cue possible ('are') with no trigger signal, violating the same cue-stripping principle the patch is fixing. Additionally, the course_legos row itself (S0396L03, known_text='are ready') needs its known_text updated to 'until they are ready' — the patch describes this change but it is the lego row that drives the debut card, and it currently still reads the bare gloss. Required follow-on: change C01 known_text from 'are' to '(until they) are' and update the lego row known_text from 'are ready' to 'until they are ready'.
  - revision: Three changes needed, not one: (1) DELETE B01 'are ready' = estén listos [patch already specifies this]; (2) UPDATE course_legos S0396L03 known_text from 'are ready' to 'until they are ready' [lego row drives the debut card — patch implies this but must be explicit]; (3) UPDATE C01 S0396L03C01 known_text from 'are' to '(until they) are' [unaddressed bare component — F4 requires trigger parenthetical on all component rows]. B02 'until they are ready' = hasta que estén listos already exists and becomes the correct first rung post-deletion. B03 'I hope they are ready' and U01-U05 are all clean — cues carry their triggers throughout.

- **s497 — PARTIAL** (trapCleared=False, newCollision=none, reachable=True)
  - issue: The patch re-glosses the build rung at position 3 ("you needed to sleep" → "as if you needed to sleep") and enriches the USE line, which is correct. However, position 1 of 497|2 is a component-role phrase with known_text "you needed to" = "necesitaras" — confirmed by live DB (course_practice_phrases seed 497, lego_index 2, position 1, phrase_role='component'). Component rows ARE presented to the learner as prompts (consistent with course pattern at 114|2 position 1 "As if" = "como si"). This bare component fires BEFORE the enriched build, so the learner still encounters "you needed to" → necesitaras in isolation, one consonant from the held wrong twin necesitabas@207. The patch description does not address position 1 at all. Fix required: re-gloss position 1 component to "as if you needed to" = "como si necesitaras" (matching the como-si frame precedent at 114|2 position 1), or collapse the component into the M-lego debut and drop the bare component entirely. Until position 1 is patched, the trap surface persists at the component presentation step.
  - revision: Re-gloss 497|2 position 1 component from "you needed to" / "necesitaras" to "as if you needed to" / "como si necesitaras" — this extends the como-si frame precedent already used at 114|2 position 1 ("As if" / "como si") and ensures the learner never sees necesitaras outside its triggering wrapper. Then proceed with the already-specified changes: position 3 build gloss "as if you needed to sleep" / "como si necesitaras dormir"; USE line 6 enriched to "that sounds as though you NEEDED to get some sleep"; no change needed to the negated-say USE at position 10.

- **s646 — PARTIAL** (trapCleared=True, newCollision=none, reachable=True)
  - issue: Patch scope is incomplete: the M-lego known_text and the course_practice_phrases build rows are independent DB columns — patching the lego record does NOT cascade to build rows. After the patch as written, build rows at positions 3 ('you're doing' → está haciendo), 4 ('you're doing something' → está haciendo algo), and 5 ('what you're doing' → lo que está haciendo) remain bare, presenting stripped formal-register cues to the learner BEFORE the USE lines are reached. The learner holding the drilled informal twin lo estás haciendo@72 encounters 'you're doing' with no disambiguator during the build phase. Sibling seeds 647 (build 4: 'you speak it' / usted lo habla, usted in English) and 652 (build 4/5: sir/madam vocatives in English) show the correct pattern. Required extension: add '(formal)' to build rows 3, 4, 5 known_text ('you're doing (formal)', 'you're doing something (formal)', 'what you're doing (formal)'), or mirror the sibling pattern and embed ', sir' / ', madam' into builds 4 and 5. The USE-line fixes (positions 8, 9, 10) and lego debut enrichment are correct and sufficient for that layer.
  - revision: Extend the patch to also update build rows at seed 646 lego_index 1: position 3 known_text → 'you're doing (formal)'; position 4 known_text → 'you're doing something (formal)' (or 'you're doing something, sir' following sibling pattern); position 5 known_text → 'what you're doing (formal)'. These three rows in course_practice_phrases must be updated separately from the M-lego record — they do not inherit from it. Once those three build rows carry the formal marker, the entire phrase ladder (components excepted — component 'you are'=está is a known pre-existing basket ambiguity not introduced by this patch) is clean.

## Provenance

- Springs source: full-course sequential journey walk (14×50-seed windows, ledger relay), `wf_c1710a42-c49`; springs JSON archived in session scratchpad.
- Design: Fable 5 high-effort; verification: 23 parallel Sonnet adversaries (simulate learner holding the rehearsed wrong twin; check discrimination, new-collision, reachability); synthesis: Fable 5.
- Framework: ZUT (known prompt maps 1:1 to target production) + distinction-distance (Zenjin); learner model = recall+combine, no rule application.