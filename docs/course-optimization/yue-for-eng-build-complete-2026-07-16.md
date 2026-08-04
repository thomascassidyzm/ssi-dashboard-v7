# yue_for_eng (Cantonese) — Build Complete + Post-Build Sweep Queue

**Date:** 2026-07-16
**Status:** ✅ DECOMPOSITION BUILD COMPLETE — 668/668 seeds, quality PASS, 1171 LEGOs / 8996 phrases, ratio 7.7
**Register:** Colloquial written Cantonese (口語), HK/GZ, Traditional Han
**⛔ HOLD TTS** until this sweep is worked and Kai signs off on the register decisions below.

Independently verified via stats + resume (668/668, seeds_with_legos=668) and a full-course scan of all 668 seeds. Corruption = 0, missing seeds = 0.

---

## 1. COMPLETENESS — one item for Kai to confirm

- **62 seeds have basketCount 0** (no new LEGOs — all-reused-vocab reinforcement/dup seeds). This matches the known empty-basket phenomenon (see memory `single-word-seed-empty-baskets`, `manifest-empty-seed-drop`), BUT these are **full-sentence seeds** (e.g. S668 "I hope you'll all be able to go" → 我希望你哋全部都可以去), not bare-vocab, and 62 is a high count (9%), concentrated in the final sir/madam block (S636–668) plus scattered reinforcement seeds.
- **ACTION (Kai):** confirm whether these seeds carry reinforcement practice phrases via their reused LEGOs (fine) or are genuinely content-less (would need USE-phrase backfill). I lack DB access to resolve which; the 8996 phrase total is fully accounted for under non-empty seeds, so if these need content it's a backfill job.
- Empty-basket seed list: 223,228,238,239,242,246,249,252,269,282,298,337,370,391,425,454,455,526,533,540,544,566,572,583,599,603,605,607,612,613,619,620,625,630,632,636,637,638,643,645,646,647,648,649,650,651,652,653,654,655,657,658,659,660,661,662,663,664,665,666,667,668

## 2. DEDUP — 68 duplicate is_new targets (all ZUT-clean, non-breaking)

Same target declared is_new in ≥2 seeds. Split into **KEEP** (genuine polysemy — distinct senses correctly taught separately) vs **MERGE** (same sense re-taught — make the 2nd is_new=false or drop).

**KEEP (genuine polysemy, ~9):** 信 (letter S52 / to-trust S501) · 話 (words S49 / to-say S70) · 聽 (listen teng1 S71 / coming-prefix ting1 S192 — see TTS §4) · 種 (kind S101 / to-plant S366) · 車 (car S121 / give-a-lift S447) · 使 (need-to S44 / spend-time-money S256) · 叫 (be-called S150 / to-order S243) · 幾 (quite S41 / a-few S56) · 留 (leave-something S185 / to-stay S276)

**MERGE (same sense, ~59):** 佢哋(x3 they/them S87/134/356) · 問下(x3 S99/405/609) · 對(x3 S122/398/574) · 噉(x3 S172/429/571) · 點樣(S3/581) · 完(S11/251) · 之後(S11/447) · 會發生咩事(S12/348) · 一齊(S16/517) · 遲啲(S16/400) · 知道(S17/606) · 今晚(S18/294) · 差唔多(S26/449) · 好似(S26/497) · 去(S27/271) · 講得好啲(S29/291) · 進步(S44/568) · 擔心(S46/270) · 咁樣(S49/505) · 嘅話(S49/225) · 肯定(S63/340) · 聽到(S71/366) · 快(S77/561) · 關於(S83/310) · 可能(S86/261) · 可惜(S86/273) · 啦(S90/501) · 喇(S93/480) · 搭(S95/450) · 希望(S107/557) · 睇下(S107/220) · 差(S114/534) · 特別(S121/573) · 以前(S128/309) · 令(S132/485) · 一切(S141/458) · 頭先(S143/384) · 傾(S143/356) · 方式(S153/443) · 辦法(S157/313) · 需要(S170/296) · 幫助(S172/564) · 帶(S181/580) · 放(S195/314) · 諗頭(S196/259) · 機會(S206/456) · 開(S214/336) · 話俾我知(S222/589) · 家姐(S233/594) · 耐(S275/618) · 啱(S387/543) · 細路(S392/567) · 安靜(S403/549) · 以為(S427/536) · 嚟講(S429/574) · 更(S444/565) · 舖頭(S460/591) · 真係(S496/576) · 落去(S563/591)

(Kai's call on the KEEP/MERGE line for borderline POS-splits like 進步/擔心/可惜 verb-vs-adjective.)

## 3. REGISTER DECISIONS (Kai's call)

- **個 vs 嘅 possessive:** course leans 個-colloquial (verified: 個名 26 vs 嘅名 4; 個朋友 10 vs 嘅朋友 2). Decide: standardize on 個 (colloquial) or 嘅 (general)? Sweep the minority 嘅名/嘅朋友 deviations either way. Builder was told first-occurrence-wins from S201.
- **俾 vs 畀:** builder kept 俾(let/allow) distinct from 畀(give) — same morpheme bei2, **identical TTS audio**, standard 口語 uses 畀 for both. Keep visual distinction or unify→畀?
- **SWC-drift:** 裏面 "the interior" (S498) leans Standard-Written/Mandarin; colloquial prefers 入面 (present as "inside" S492). Also spot-check for 想法-type forms.
- **Formal-address block S642–668:** sir/madam = 先生/女士 (translation chose 女士 for madam — confirm vs 太太/小姐); you-all = 你哋全部.
- **Sibling terms:** defaulted to elder 家姐/阿哥 (Cantonese lacks bare sibling term) — consistency check.
- **bare 記 for "remember"** (S6): consistent/ZUT-safe but leans "memorise"; analysis prescribed 記得/記住 for recall. (Builder later added 記得/記唔起 for recall senses.)

## 4. TTS PREP (before audio generation)

- **Latin-script targets (3 — need English/letter pronunciation in Cantonese audio):** `send` (S357 "to text", authentic HK code-switch) · `BB` (S519 "baby", say "bee-bee") · `Jane` (S635 proper noun). All from canonical seed targets, preserved verbatim (correct). Kai: keep authentic loanwords or purify (send→傳/發)?
- **Homograph:** 聽 = listen (teng1) vs coming-prefix (ting1, 聽日/聽晚) — ensure TTS reads each correctly.
- **Punctuation normalize:** some canonical-seed-derived phrases carry halfwidth commas (e.g. S178 我冇時間, ...); builder's own phrases use fullwidth ，. Scan-course sweep: halfwidth ,/?/! → fullwidth ，。？！ in Han text.

## 5. NATIVE-CHECK — near-synonym clusters (learner-clarity only; all genuine, ZUT-correct)

Confirm a learner won't find these confusing: "only/just/merely/simply"→唯一/啱啱先/只/只係 · "all"→所有/晒/一切/全部 (4-way) · "family"→家庭/家人/屋企人 (3-way) · "to go"→行/走/去 · "idea"→主意/諗頭 · "this time"→今次/呢次 · "try"→試/嘗試.

## 6. GLOSS/PHRASE FIXES (minor)

- **學+名 collocation** (3 phrases, S0020L02 + S0023L01): 學 = learn a skill/language, NOT a name (學佢個名 → 記住佢個名). Only these early pre-guidance cases; builder corrected from S24 onward.
- **S0022L04 "who (relative)"→嘅**: RESOLVED (relabeled, fixed in both components jsonb + course_practice_phrases row; verified).
- **dummy inanimate "it"→佢 as subject** (S0520 佢可能發生咗... — canonical translation, reads animate; native drops it or 呢件事). Isolated to this canonical seed.
- **S0001 weak bridge** "I want now"→我而家想 (dangling); **S313 場比賽 vs 場波** (games) — minor, per builder flag.
- Minor native-polish (low priority): 想+abstract-noun for "want a [noun]" (想一個新生活 — 想要 more natural); loose 建立+諗頭/啲嘢 collocations.

---

## Infra note
`services/course-builder/routes/seed-complete.cjs` LOGOGRAPHIC_LANGS allowlist fix (added yue/nan/hak) committed to kai-stage `9f0de2a1` — **the nan (Hokkien) and hak (Hakka) builds need this same fix (now in place).**

## Build learnings for nan/hak Sinitic builds
- Bound 2-char verb A-not-A → use 係咪 frame (你係咪知道), not reduplication.
- A-not-A reduplication of a registered compound in a canonical seed target (鍾唔鍾意) fails SEED-LEVEL tiling → declare the whole A-not-A form as its own M-LEGO.
- Component text lives in TWO places (course_legos.components jsonb + course_practice_phrases phrase_role='component') — edit/verify both; verify via baskets API, not target_text SQL.
- Markdown Components line supports only plain `known → target` — no inline annotations (they bake into stored text).
