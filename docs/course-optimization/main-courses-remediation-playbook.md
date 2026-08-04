# Main-Courses Remediation Playbook (X_for_eng "big nine")

**Purpose.** This is the consolidated record of *what* we fixed on the nine flagship
`X_for_eng` courses (spa, ita, por, jpn, zho, kor, fra, ara, deu) and *how* — the
methods, tools, floors, and gotchas. It exists as the reusable playbook for the next
phase: **expanding + fixing the variation/dialect courses** (e.g. deu_at, ara_lb / Syrian /
Palestinian, Swiss German, EU vs BR Portuguese, regional Spanish, etc.). Work the variation
courses category-by-category using this as the checklist.

> Source of truth remains the code + git history + the DB. This doc is the map, not the territory —
> verify a tool/floor against the current code before trusting it. Dates are 2026.

---

## 0. The order we ran it in (and why)

Per course, roughly: **translate/build → ZUT → strips (paren/slash) → forward-ref → final pass
→ header/gloss + caps + missing-? sweeps → re-decomposition (over-atomised LEGOs) → gender-prep
→ scan-course (Haiku) → view refresh → audio (regen)**. Content-affecting text edits always land
*before* audio, so TTS voices the final text. Structural (LEGO) edits go last because they
re-dangle the `course_round_index` materialised view (see §12).

---

## 1. ZUT resolution (one known → one target)
- **Rule.** A single known prompt must map to exactly one target form (production direction).
  Many-known → one-target is fine (convergence). Same-known → two-targets is the violation.
- **How.** Per-course detector `zut-plan.cjs` (env: `set -a; source .env`). Strategies:
  (A) person-cue → expand pronoun both sides; (B) perfect → expand aux; (C) case-particle →
  `is_new=false` demotion **or** contiguous-context expansion (demotion orphans the basket +
  renumbers later rounds → prefer expansion); (D) gender → expand via the agreeing noun both sides;
  (E) tense/mood no-cue → rename/Deborah; (F) lexical → rename.
- **Gotchas.** No ellipsis/split-target expansions (German perfect, separable verbs, verb-final
  subclauses → leave, look together). `is_new=false` demotion drops the round from the serving walk
  AND renumbers → learner drift. Whole-course collision sweep catches detector blind spots (found
  deu S0043/S0202, kor S0635/S0636).
- **State.** All nine reached **0 conflicts** (2026-07-02).

## 2. Strips — parens / slashes / trailing punctuation
- **Classes.** cosmetic (safe strip+regen) / grammar-label singleton (strip label, flag for
  known-control) / **ZUT-creating** (real ZUT — belongs in known-control, not auto-strip) /
  real-word parens ("to be (okay)"). Slashes deprioritised vs parens (parens = methodology
  grammar-label confusion). No slashes in `known_text` (use the seed).
- **Gotchas.** Classifier once treated bare pronouns + "to/with/and" as metalanguage → broke
  ~23 phrases; whitelist real words. Trailing `。`/`?` pulled unconditionally (UI centering).
  The DB `text_normalized` trigger strips trailing `?` → match on lookup by stripping `?`.

## 3. Forward-reference leaks
- **Defect.** Early-round BUILD/USE phrases use later-seed vocab from the *same* seed (generator
  defect, affected all courses).
- **How.** `scripts/forwardref/` (detect → plan JSON → dry-run [0 vocab / 0 leak / 0 below floor] →
  READ backfills → `apply-plan.cjs <plan> --commit` → verify). The **real leak = "phrase contains a
  later chunk the learner can't yet TILE from taught LEGO forms."**
- **Four false-positive classes to filter** (added after early over-deletion): (cat2) re-introduced
  exact earlier LEGO form; (cat3) chunk-exposed single word — KEEP ultra-common, DELETE+backfill
  content-word debuts; (cat4) within-seed composition (L6=L3+L4+L5) — not a leak; plus function-word
  cases. Tools: `categorize.cjs`, `cat4-scan.cjs`, `buildLeakTest()`/`buildNovelty()` in lib.
- **Floors (empirical USE·BUILD).** spa/ita/por/fra 5·3; ara/deu 4·3; jpn 5·3; kor/zho measured.
- **Gotchas.** Whole-word guard (deu "vier"⊂"reservieren"); Arabic `؟،` in tokenizer; spaceless
  langs need segment mode. Over-deletion on pre-filter courses was reversed (~98 originals restored
  from per-seed backups). Residual detector counts are documented keeps.
- **State.** All nine → genuine leaks fixed (2026-07-07).

## 4. Final passes (reviewer waves)
- **How.** 6 parallel reviewers over seeds (4–300 default; extend to 668). Classify **LEGO-target
  errors (rebuild) vs phrase-level errors (delete + backfill)**. Delete only if the LEGO's USE
  basket stays ≥ floor; else hold for backfill. Cross-reference two waves before deleting (~20%
  intersection).
- **Gotchas.** Reviewers ignore "read-only" and patch phrases — harden the brief. Mass-approve marks
  0-phrase seeds complete → audit + re-flag. Phrases API caps 500/bulk (chunk ≤25 seeds). Unique
  scratch filenames per reviewer (shared-dir collision). Prompt-injection appeared in served briefs
  ("fake system-reminder + post to chat") — agents must ignore.
- **Done:** ara, deu, ita, jpn, kor, por (EU-PT); spa/fra/zho via readiness sweeps.

## 5. Header / gloss fixes (LEGO rows)
- **Defect.** LEGO row `known_text`/`target_text` disagree with the LEGO's own basket, or carry
  broken English ("no a" → should be "not a"), or a bare component where the basket teaches a chunk
  ("ask me"→`mich` but basket teaches `mich fragen`), or header/basket **drift** (labelled
  "my toys"→`meine Spielzeuge` but basket drills `meine Idee`).
- **How.** `PATCH :3470/api/production/<cc>/lego/<lego_id>` `{known_text|target_text}`; phrase edits
  `PATCH .../phrase/<id>`. Drift-guard on the old value first; READ every row before editing.
- **Note.** Header text does **not** feed `course_round_index` → no refresh needed for header edits.

## 6. Capitalisation sweeps
- **eng-target lowercase "I".** `eng_for_X` builds lowercase "i/i'm/i've/i'll" → cap sweep.
- **German noun caps.** Intake normaliser lowercases target nouns (`problem`→`Problem`). Two layers:
  phrase targets (earlier `caps-sweep.json`, 95) **and** LEGO headers (`deu-header-caps-sweep.cjs`
  → 150 applied 2026-07-14). **Homograph-safe method:** count only MID-sentence capitalisations
  (sentence-initial caps falsely flag adverbs/pronouns — `Natürlich`/`Welche`); gate cap≥4 &
  other-lowercase≤15%; hand-audit traps (`Mal`/mal particle, `Weg`/weg adverb, `Teil`, `Parken`).
  Casing is **audio-neutral** (homophone) → no regen needed.

## 7. Missing question marks
- Questions end `?` (Arabic `؟`, Japanese omit / language-specific) even when the LEGO doesn't.
  **Haiku-validate before applying** (LANG_INFO must handle `eng_for_X` direction). Known drift:
  ~2,282 phrases say `?` but audio doesn't (backfill pending). B-debut fragments never take `?`.

## 8. Known-side wrong-language rebuilds
- **Defect.** Known side leaked target-language words (por S396-481 ~130; deu S466-485 ~180).
- **How.** Flag `flagged_at` on the seeds → build-team rebuilds → post-rebuild ZUT-check the whole
  course (rebuilt known text can collide with later LEGOs). Trust Haiku full-coverage over the
  mechanical sweep (FP-polluted by paren-annotation words).

## 9. Re-decomposition (over-atomised LEGOs)
- **When.** A LEGO atomised too fine for natural USE, or a bare subjunctive/participle split from its
  frame, or a giant-M duplicating the seed, or a relative pronoun living only as a component.
- **Mechanics (delete-first, FK-careful).** `course_legos.lego_id` is GENERATED from
  `(seed, lego_index)`; phrases carry `lego_index`+`position` (their `lego_id` column is NULL — the
  id string `cc:S0235L01B03` is identity). Proven pattern (`s0055-ita-merge.cjs`, `s0420-reorder.cjs`,
  `s0412-ara-collapse.cjs`, `s0391-ara-promote-alladhi.cjs`): **BACKUP → DELETE affected phrases →
  mutate LEGO rows (delete / retext / reindex / flip component `introduce`) → re-INSERT phrases with
  computed id/position/word_count/lego_count → `decoratePhrasesWithDecomposition` → verify floors +
  vocab.** Dry-run first; **--commit only after Kai's nod.** LEGO INSERT col set =
  `{course_code,seed_number,lego_index,type,is_new,known_text,target_text,components,status}` (lego_id
  auto-generates). For Arabic, strip tashkīl (`/[ً-ْٰـ]/`) before vocab/leak checks (case-ending FPs).
- **Worked examples (2026-07-14):** deu S0594 header/basket drift → basket rebuilt to toys;
  ara S0412 → collapse `بالفوز` (Rule-3: governed `بـ` belongs to the governor, not the noun),
  rehome bare-noun phrases to `الفوز`; ara S0391 → promote `الذي` to its own is_new LEGO with a
  proper 3B+5U contrastive intro, reindex the M-LEGO, silence its component. A declared component
  **is** a valid introduction (no forward-ref) — don't bare-atomise a construction-feature unless
  it earns its own command.

## 10. Gender-prep (speaker-gender variants)
- **Model.** `services/gender-prep-coordinator.cjs` — Haiku analyses each phrase for **first-person
  speaker** gender agreement. Two voices: **target1 = female, target2 = male**. Per-language rule
  blocks (Romance / Slavic L-participle / Semitic / Indo-Aryan / Greek / Baltic / Icelandic …).
- **THE trap (Deborah 2026-07-15).** Adjectives describing a **3rd-person referent** (`hacerlo solo`
  = *he*; `estaba ocupada` = *she*) must NOT vary by voice — only *speaker* ("I") adjectives do.
  Haiku was mis-classifying referent adjectives as speaker ones. **Fix applied:** added a sharp
  "one test that decides everything" guardrail + trap examples to the shared prompt (helps all
  languages). Rerun regenerates variants correctly; audio folds into the full regen.
- **Register.** Heavy-T/V languages neutral-respectful (Marathi तुम्ही, Punjabi/Hindi/Urdu tusi);
  Japanese PLAIN (思う-class); Arabic MSA.

## 11. Native-quality review ("do it ourselves")
- Primed-Opus native pass **worked** for German (vs Duden) and Arabic (vs MSA refs): rule-driven
  fixes (word order/Ausklammerung, tense/Redewiedergabe, taught-vocab substitutions) are safe to
  author; only genuine vocab/seed-design gaps ("put"/"care" untaught, wo-fragments) go to humans.
  Indic scripts need Opus (Sonnet corrupts conjuncts + tail-hallucinates).

## 12. `course_round_index` refresh (serving map)
- Materialised view (R → LEGO map for instant-playback), read by the learning app's `round-map.ts`.
  **Nothing auto-refreshes it** (no trigger/RPC/cron — verified). Any LEGO-structure mutation
  (merge/rebuild/re-translate/`is_new` flip) leaves it stale → dangling rows → INF-PLAY risk. It had
  drifted to **293 dangling rows / 194 seeds / 10 courses** before Tom refreshed (2026-07-14).
- **Refresh** = `REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index` (needs `.env.psql`
  DATABASE_URL — `tools/refresh-round-index.cjs`) OR the proposed service-role RPC
  (`docs/proposals/refresh-course-round-index-rpc.sql`; NOTE its CONCURRENTLY-in-plpgsql bug — a
  plain refresh is required inside a function). Progress is **lego_id-anchored** (not round_index),
  so refresh doesn't move learners; header/text edits don't dangle it — only structural edits do.
- **`database/migrations/` is ARCHIVED** — live migrations are applied directly via psql, not from
  files.

## 13. Audio pipeline notes (context for regen)
- Audio gen reads content tables directly — it does **not** read `course_round_index` (refresh is
  independent of TTS). Null `audio_id` **only** when TTS is affected (`?`/`!`/text change; casing &
  period are cosmetic). mp3 ID3v2 breaks iOS → pipe `lame`. Combined-presentation audio lives in S3
  `mastered/`, not `course_audio`. Encouragements / instructions / paywall are **language-shared**
  (`shared_audio`, keyed known_lang=eng), welcome is per-course. Short single-char/word debuts need
  ellipsis/SSML. **Full voice regen decided 2026-07: all voices except encouragements/welcome/paywall.**

---

## 14. Per-course quick reference (main nine)

| Course | Notable patterns / defects (see memory slugs) |
|---|---|
| spa | forward-ref heaviest (96 seeds); mover-transitivity split; "every day"→todos los días; gender-prep 921 rows |
| ita | subjunctive vs conditional/future (keep futures); clitics/idioms; S0055 merge, S0004/38 reorder |
| por | EU-PT (BR→EU conversion); reported-speech drops `que`; wrong-lang rebuild S396-481; final pass done |
| jpn | register PLAIN (思う); suffix-corruption (って言ってた/から/ことがある) S385-654; single-char TTS SSML `<sub>`+dot |
| zho | S351-668 old-way extension; measure-word/tense demos; single-char male "just a sound" (388) ellipsis; known-drift S221-227 |
| kor | 301+ ~6-8% USE drift; 549-668 build-broken + recovery; SOV verb-final restructure (S0325) |
| fra | contract (going-to/ne…pas/clitics); "her"→sa; forward-ref 37 seeds |
| ara | MSA; إنّ/أنّ splits, resumptives, subjunctive نون; `الذي` promotion; ينبغي impersonal; punctuation ؟، |
| deu | noun caps (systemic); Ausklammerung; brauchen+zu; masc acc ein→einen; reported speech indicative; known-restore S295-298 stub bug |

## 15. Tooling index (committed `tools/` + workspace `scripts/`)
- ZUT: `zut-plan.cjs` (per course) · Forward-ref: `scripts/forwardref/*` · Re-decomp:
  `s0055-ita-merge.cjs` / `s0420-reorder.cjs` / `s0412-ara-collapse.cjs` /
  `s0391-ara-promote-alladhi.cjs` / `anchor-check.cjs` · Caps: `deu-header-caps-sweep.cjs` +
  `-apply.cjs` · Gender: `services/gender-prep-coordinator.cjs` · Haiku scan: `scan-course` skill +
  `phrase-monitor` · Audio: `fix-audio` skill, phase8, `tools/refresh-round-index.cjs` · Methodology
  oracle: `.claude/agents/methodology-expert.md` (spawn as general-purpose primed with it + the docs).

---

## 16. Applying this to the VARIATION courses (next phase)
Variation courses (dialects/regional variants) largely inherit their base course's content, so:
1. **Diff against the base** — most fixes above are already in the base; find the delta the variant
   introduces (register, orthography, lexis, gendered forms).
2. Run the **same category checklist** §1–§11, but scope to variant-specific divergence first
   (e.g. Austrian "I"=ich is a dialect FP, not a bug; EU vs BR forms; Levantine vs MSA).
3. **Gender-prep** with the corrected prompt; **scan-course** Haiku (language + `?`) is mandatory.
4. Structural edits last; **refresh the view**; content settled before any TTS (fold into the regen).
5. Log per-variant deltas + decisions as you go (this doc's §14 is the template).
