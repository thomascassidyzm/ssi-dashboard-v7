# yue_for_eng — Register Sweep Plan ("too mainland, too formal")

**Date:** 2026-07-27
**Trigger:** Kai's native (HK) friend reviewed the course: "sounds too mainland and too formal."
**Scope:** full course scan — 668 seeds + 8,996 phrases (all roles), dumped via :3471 API 2026-07-27.
**Status:** ✅ §A EXECUTED 2026-07-27 (Kai approved) — 71 phrases + 7 legos + 8 seeds updated, 0 errors; residual scan clean; verified via baskets API. A3 (及時) and A8 (家庭) moved to §B after row inspection (see notes). §B awaits native answers.
**Cost note:** `course_audio` rows for yue_for_eng = **0** (TTS hold intact). Renames are FREE now; after TTS every one costs regeneration. Do this sweep before any audio.

---

## Diagnosis

**The grammatical base is clean.** Zero hits course-wide for the classic Mandarin markers: 的/是/不/他/她/它/們/這/那/什麼/誰/看/吃/說/給/很/了/喜歡/現在/一起/被/讓 (excluding legit 不過/不如/其他). The course speaks in 係/唔/冇/嘅/佢/哋/而家/睇/食/講 throughout. The friend is NOT hearing Mandarin grammar.

**What they're hearing is a formal-vocabulary layer, and it has a systematic root cause:** ZUT distinct-gloss pressure. Where English has near-synonyms (need/require, all/everything/the whole lot, way/manner, help/assistance, try/attempt, finish/complete, enough/sufficient), the builder minted a distinct Cantonese target for each — and satisfied distinctness by reaching up the register ladder into Standard Written Chinese (需要, 一切, 方式, 幫助, 嘗試, 完成, 足夠…). Each individual choice is defensible; stacked across the course (~230 rows in ~20 clusters) it reads as mainland/formal register.

**The fix is ZUT-legal:** ZUT forbids one known → two targets. Two knowns → one target is fine (the build-complete doc's 59-item dedup list is exactly this). So "to complete" can simply map to 做完 alongside "to finish" — no new vocab, no ZUT break.

Also contributing (note, not necessarily fix):
- **Final-particle density:** only 5.7% of USE phrases end in a particle (啊/呀/囉/㗎/喎/嘛/啦…). Real spoken Cantonese is particle-rich; literal seed translation keeps them scarce. Inherent to the method — flag to the friend as explanation, not a defect.
- **Formal-address block S636–668** (sir/madam = 先生/女士, you-all = 你哋全部) is *canonical course design* — deliberately formal register drills, same as the Sie-block in German. Explain to the friend; only the 女士-vs-太太/小姐 lexical choice is reviewable.

---

## Native-check sheet (cluster by cluster)

Counts = rows (seeds+phrases) containing the form, substring-based (±1–2 for boundary artifacts, e.g. 記完+成句嘢 matched 完成).

### A. Clear wins — ✅ EXECUTED 2026-07-27

| # | Formal | Rows | LEGO(s) | Replaced with | Outcome |
|---|--------|------|---------|--------------|-------|
| A1 | 裏面 "the interior" | 10 | S0498 | 入面 | ✅ Done. Dup with S0492 "inside"→入面 (legal). |
| A2 | 一切 "the whole lot / absolutely everything" | 18 | S0141, S0458 | 所有嘢 | ✅ Done. Now triple-target with S0278 "everything" (legal; fold into dedup sweep). |
| A4 | 嘗試 "to attempt" | 9 | S0491 | 試 | ✅ Done. Dup with S0002 "to try"→試. (試下 rejected: 試下+咗 clash.) Seed 你試幫手嗰種方式 → native glance = B13. |
| A5 | 完成 "to complete" | 9 | S0200 | 做完 | ✅ Done. B03/U03 rewritten (完成緊→做完緊 impossible: resultative+progressive clash) → "completed\|做完咗", "wants to complete\|想做完個方法". S0011 我記完+成句嘢 false-positive untouched. |
| A6 | 到目前為止 "so far" | 16 | S0187 | 到而家為止 | ✅ Done. 目 orphan-check clean (數目 S0434 introduces its own chars). |
| A7 | 足夠 "sufficient" | 12 | S0294 | 夠 | ✅ Done. 冇足夠→唔夠 (possession→suffice negation); B03 "want sufficient\|想足夠" rewritten → "sufficient money\|夠錢". Dup with S0058 "enough"→夠. |
| A9 | 想法 "a thought" | 2 | phrase-only (S0131) | 諗法 | ✅ Done. Seed itself already said 諗法 — these were drift rows; lego is 法, containment holds. |
| A10 | 幫助 verb-reading rows | 3 | S0564 | noun frames | ✅ Done. All 19 rows turned out noun-use except 3 ambiguous: 想幫助→想要幫助 (×2), 你可唔可以幫助→你可唔可以畀啲幫助. Noun 幫助 itself = B3. |

**Moved to §B after row inspection:**
- ~~A3~~ 及時 → **B11**: no invariant colloquial replacement — 趕得切/嚟得切 inflect under negation (你點解冇及時答 would need 趕唔切), which breaks LEGO-substring containment. Needs native suggestion or keep.
- ~~A8~~ 家庭 → **B12**: seed is 組織一個開心家庭, and 組織家庭 is genuine HK colloquial for "start a family"; 屋企人/家人 (members) can't cover the unit sense. Likely keep.

### B. ✅ DECIDED BY CLAUDE + EXECUTED 2026-07-27 (Kai delegated the calls)

Kai preferred decisions over questions. Executed: **B2 更→更加** (legos S0444/S0565, 16 phrases, 2 seeds), **B4 方式→方法** (legos S0153/S0443, 20 phrases, 3 seeds — note pre-existing ZUT collision: known "way" already → 樣 S0049 / 辦法 S0313 / now 方法 S0443; not worsened, known-side disambiguation → dedup pass), **B7 願意→肯** (lego S0569, 11 phrases, 2 seeds — 肯 char known from 肯定 S0063). 46 phrases + 5 legos + 7 seeds, 0 errors, residuals clean.
Kept (my call): B1 需要 (real HK speech; 要 already overloaded), B3 幫助-noun, B5 所有+noun, B6 確保, B8 建立, B9 然後, B10 女士, B11 及時 (no invariant spoken form), B12 家庭 (組織家庭 genuine), B13 你試幫手嗰種方法.
**Native review now runs as a plain 191-phrase read-through** (changed rows + kept-cluster rows): artifact above, number-mapping in `yue-register-readthrough-list-2026-07-27.md`. Friend replies with numbers of anything unnatural.

Original question table (for reference):

| # | Form | Rows | LEGO(s) | Alternative | Question for native |
|---|------|------|---------|-------------|---------------------|
| B1 | 需要 "to need/require" | 30 | S0170, S0296 | 要 | 需要 is heard in HK speech, but 30 rows is a lot. Collapse both to 要, or keep 需要 for "require" only? |
| B2 | 更 / 更加 "more/even more" | 29 | S0137 更加, S0444/S0565 bare 更 | 仲 / all→更加 | Bare 更+adj (更有效率/更仔細) leans written. 更加 OK in speech? Or 仲? |
| B3 | 幫助 as NOUN (好有幫助 / 你嘅幫助) | ~14 | S0172 "assistance" | keep? | 好有幫助 sounds normal HK to me — confirm. |
| B4 | 方式 "way/manner" | 22 | S0153, S0443 | 方法 / 噉樣做 | 用同樣嘅方式做 → 用同樣嘅方法做? 辦法 also taught S0157. |
| B5 | 所有 attributive ("all the answers" 所有答案) | ~9 of 27 | S0045 | 全部 / 所有嘅 | 所有嘢 itself is fine; bare 所有+noun the question. |
| B6 | 確保 "to ensure" | 11 | S0200 | 搞清楚/肯定 | 確保 used in HK speech? Feels office-register. |
| B7 | 願意 "prepared to" | 13 | S0569 | 肯 | 肯 is the spoken form; 願意 understood but formal. |
| B8 | 建立 "to build (a life/idea)" | 11 | S0332 | 起/整/創造? | Depends what's being built; build doc already flagged loose 建立 collocations. |
| B9 | 然後 "and then" | 12 | S0168 | 跟住 | 然後 is extremely common in real HK speech — probably KEEP. |
| B10 | 女士 "madam" | 16 | S0642 | 太太/小姐? | Formal block is intentional; only the word choice is open (build doc §3). |
| B11 | 及時 "in time" | 12 | S0091 | ? | Was A3. 趕得切/嚟得切 inflect under negation (趕唔切) — breaks the invariant-LEGO rule. Native: is there an invariant spoken form, or is 及時 acceptable? |
| B12 | 家庭 "family (unit)" | 10 | S0408 | keep? | Was A8. 組織一個開心家庭 — 組織家庭 is real HK speech; confirm keep. Drill rows 你有冇見家庭/幫家庭 slightly bare — worth a classifier (個)? |
| B13 | S0491 seed after A4 | 1 | — | — | "I love the way you try to help" now = 我好鍾意你試幫手嗰種方式. Natural, or prefer 試下幫手-type rephrase? (方式 itself = B4.) |

### C. Explain to friend, don't change

- **S636–668 sir/madam drills** are deliberately formal register (canonical across all courses).
- **Low particle density** — method translates seed meaning literally; particles arrive via the tutor/audio experience, not text padding.
- **記 for "remember"**, 個-possessive lean, elder-sibling defaults: already-decided register items (build doc §3).

---

## Execution mechanics (once signed off)

Per-cluster, this is the [lego-rename-downstream-audit] pattern:
1. `course_legos.target_text` rename (+ `components` jsonb if M-LEGO — text lives in TWO places).
2. Sweep `course_practice_phrases.target_text` for every phrase containing the old form (build/use/component roles).
3. Sweep `course_seeds.target_text` where the seed sentence itself carries the form.
4. Where collapsing onto an existing target (A2/A4/A5/A7/A8): mark the redundant LEGO's `is_new=false` or merge — fold into the pending 59-item dedup sweep from the build-complete doc (same mechanical pass, do together).
5. Re-verify via baskets API (NOT target_text SQL), per yue build lesson.
6. Guardrail: every statement filters `course_code='yue_for_eng'`; SELECT+count before write.

**Do this in the same pass as the pending dedup sweep** (build-complete doc §2) — same tables, same verification, one review cycle for Kai.

**New dups created by §A (add to the dedup-sweep MERGE list, is_new handling = Kai's call there):** 試 (S0002/S0491) · 夠 (S0058/S0294) · 所有嘢 (S0141/S0278/S0458) · 入面 (S0492/S0498). All deliberate two-knowns-one-target collapses; is_new left true for now (re-presentation is harmless; flipping to false risks the empty-basket phenomenon).

## Fable native pass (2026-07-27, ongoing)

After the friend's verdict ("this is not Cantonese"), a Fable agent ran a native-quality pass. **Seeds 1-100: DONE + APPLIED** — 1,972 phrases reviewed, 150 fixes (137 target + 11 known-only + 2 collision-safe alternates authored by orchestrator), 16 flags, clean rate ~85%. All fixes independently re-validated (containment/vocab/dup/staleness) before applying; agent's only gap was window-local dup checking (2 collisions with S0201/S0247 rows — fixed in the 101-250 brief). Deliverable: `temp/yue-fable-pass-seeds-1-100.json`. **Seeds 101-250 agent running** (`yue-fable-native-pass-2`).

Top defect classes (course-wide hunt list): 想+NP calque (~45 rows in first window alone) · scheduled-future V緊 · dangling 俾/畀/花/將 · missing degree 好 · 咁快啲 stacking · 識-for-知 · V-O compounds (傾偈緊 — unfixable under containment, needs lego decision) · 冇夠/唔準備好 mis-negations.

### Lego rebuilds + flag resolution — ✅ EXECUTED 2026-07-27 (Kai authorized, full effect exploration done)

- **S0091L01 得夠快 → 夠快** ("quickly enough"): moves the negation slot outside the lego so 講**得唔**夠快 is expressible. Footprint = seed 91 only; positive rows contain 得夠快 ⊃ 夠快 (untouched); components jsonb aligned; the 2 broken negative-potential rows fixed (你點解講得唔夠快, 其他人傾偈傾得唔夠快). Baskets API verified.
- **S0058L04 當你識夠字嘅時候 → 你識夠字嗰陣** (書面語 → 口語): seed + basket swept, components jsonb rebuilt (3 components), component rows C01-C03 rewritten + C04/C05 deleted. 當-char origination checked: later 當-legos (S0124/S0495/S0542/S0603) are is_new and self-introduce. Baskets API verified: old string gone.
- **嗰陣 (S0034L03) basket**: ALL 8 drill rows were FRONTED (嗰陣我喺度 = reads "then", not "when") — flipped to postposed (我喺度嗰陣 …). Lego + gloss unchanged (postposed "when" is correct).
- **15 of 16 flagged rows resolved** via content rewrites within rails — incl. seed-12 識/知 rows (→唔肯定 frames), 發生 danglers (→會唔會發生 questions), bare-名 rows (個 is taught S6 — Fable over-cautious), 短傾偈/傾偈緊 (→短嘅故事/同佢傾偈), 將+bare-verb (→記住/講完), 唔準備好 (→佢今日準備好), 想太多 (→講太多), 我咁想 (→咁快試; 咁容易+咁多 were dup-taken). 1 remaining flag: none — all 16 closed.
- **Seed fixes**: S0020 學識佢個名→記佢個名 (aligns seed with its already-fixed basket; 學+name is wrong collocation), S0058 as above.
- **當-family course decision**: KEEP 當時 (S0124/S0603 — genuine spoken HK). QUEUED for window-3 execution with basket data: 每當 (S0542) → 每次, bare 當 "at such time as" (S0495) → restructure with 嗰陣; 嘅時候 (S0440) borderline — decide with basket in hand.
- **Deferred to Kai (golden-range 1-10, human review domain)**: S0006L01 bare 記, S0003L04 盡量多啲. Noted, not touched: 成句 lego (component-like fragment; standalone 成句嘢 = S0010L04 exists), 其他人 gloss, 快啲 gloss (usage now natural after phrase fixes).
- **Round-index note**: lego mutations were target-text renames only (no structural change), but the `course_round_index` materialised view was not refreshed (no .env.psql on this machine, no refresh endpoint found in services/). Same pending bucket as the fin course refresh — do both when on a machine with DB access.

### Window 2 (seeds 101-250) — ✅ APPLIED 2026-07-27
212 fixes (205 target + 7 known-only), 0 validation failures. All 18 flags resolved by orchestrator with lego latitude: 冇人V咗→有人-subject rewrites; 對-topic rows→licensed predicates; 短時間 basket→喺短時間內 frames; 達到 basket→achievable frames. Lego rebuilds: **開→開唔開心** (S0214L02, A-not-A M-lego rule), **介→介意** (S0190L01; joins merge list with S0063L02 "to mind"), gloss fixes 留="to stay" (dup S0276, merge candidate), 感到="to feel (emotion)", 第="another one". Design calls decided: generic classifier 個 accepted course-wide; 叫 polysemy legal; 梗係-initial acceptable; question-mark knowns → one mechanical qmark scan after all windows (not per-row). Deliverable: `temp/yue-fable-pass-seeds-101-250.json`. **Windows 3 (251-400) + 4 (401-550) running in parallel; 5 (551-668) next.**

### Window 3 (seeds 251-400) — ✅ APPLIED 2026-07-27
205 fixes validated 205/205, applied. All 11 flags resolved by orchestrator + 28 further edits. Lego rebuilds: **淨低→留低** (S0351, incl. seed — 淨低 transitive is wrong, 留低 native), **條路度→喺條路度 / 花園度→喺花園度** (S0369/S0383 — both seeds already contained the 喺-form, survive rename). Kept deliberately: **放 stays bare** (seed pattern 放喺枱面 requires it; renaming to 放低 would break seed tiling — only no-locative rows needed 低, already patched), **跟住 keeps target** (discourse-marker collision only bites danglers → objects added to 5 rows instead), 失去 kept for abstract loss (danglers → 機會/希望 objects). Question-knowns missing "?": 282 counted in this window (JSON) — reinforces the one-shot mechanical qmark scan. Deliverable: `temp/yue-fable-pass-seeds-251-400.json`.

### Window 5 (seeds 551-668) — ✅ APPLIED 2026-07-27
215 fixes (213 target + 2 known-only) + 2 flags resolved (每朝 fragments → 我每朝都嚟/每朝都做). Dirtiest window (77.4% clean): builder stamped 3 systematically defective template slots on noun/adjective legos — want-X (想X calque), is-this-X-咩 (咩 misused as neutral y/n particle), she-knows-X (佢識+inanimate). Lego fixes: jane→Jane (case), S0574 對 gloss→"towards" (consistent dup with S0398), 耐 bare-fragment problem deferred to dedup (S618 is a re-teach of S275 — is_new=false dissolves it). Formal block 636-668 respected as polite register. Deliverable: `temp/yue-fable-pass-seeds-551-668.json`.

### Cross-window 咩 sweep (seeds 251-400) — ✅ APPLIED 2026-07-27
Window 3 self-exempted "咩-questions" as policy; window 5 proved neutral-question 咩 is a real defect (marks disbelief, never taught as y/n). Orchestrator scan of 251-400: 32 咩-rows, 23 suspects, 16 genuine (可惜咩/佢靚咩/佢肯定咩…) → fixed with 係咪 forms (16/16). Seeds 401-550 will get the same scan after window 4 lands.

### Window 4 (seeds 401-550) — ✅ APPLIED 2026-07-27 · NATIVE PASS COMPLETE COURSE-WIDE
435 fixes applied (418 target + 13 known-only + 4 collision-safe alternates). All 25 flags resolved: V-O perfective clashes (嗌交咗→habitual/future frames keeping the lego), 有冇+咗 double-aspect (→declarative past), 服務/傳到/撐住/之後/喎/分鐘後 danglers (→completed frames), 真正咩→係咪真正嘅朋友. **Queued lego rebuilds executed: 當 (S0495)→嗰陣** (basket restructured postposed, seed 當佢重要嘅時候→重要嗰陣 — also kills a dummy-佢) **and 每當 (S0542)→每次** (components+C-row updated, seed fixed). **咩 sweep 401-550**: 58 suspects → 48 genuine neutral-questions fixed to 係咪 forms (咩-as-'what' and negative-polarity 咩 exempted). **識+inanimate scan 1-250**: only 1 genuine (識方法→知道個方法) — earlier windows were clean. Window 4 also found+fixed 4 verbatim dups my A1 sweep created between S492/S498 baskets (lesson: substring sweeps need dup-checks — harness has them now). Deliverable: `temp/yue-fable-pass-seeds-401-550.json` (17 lego-level issues listed; the 3 template slots + empty-basket lego list fold into existing queues).

**COURSE-WIDE TOTALS (07-27): ~1,550 phrase repairs · 15 legos rebuilt/re-glossed · 7 seeds fixed · clean-rate by window 85/86.5/86/76/77.4%.**

### Remaining queue (ordered)
1. **Mechanical qmark scan** — ~700 question knowns missing "?" counted across windows (use haiku qmark tooling; feedback_haiku_is_mandatory).
2. **Dedup sweep** — original 59 MERGE items + new deliberate dups from collapses (試·夠·所有嘢·入面·做完·方法·更加·肯·介意·留·嗰陣 S34/S495·耐 S275/S618·每次?). One pass, then re-verify via baskets API.
3. **Kai (golden range)**: bare 記 (S6), 盡量多啲 (S3).
4. **Empty-basket seeds** (62, incl. window-4's 34 empty legos / 7 fully-empty seeds 425/454/455/526/533/540/544) — confirm reinforcement-by-design or backfill.
5. **Round-index refresh** (machine with .env.psql; joint with fin course).
6. **TTS**: HK Cantonese voice selection (native vets samples) → --plan → Kai approval. 3 Latin-script targets (send/BB/Jane) need script-mix handling; 聽 teng1/ting1 homograph check.

## Open follow-ups

- **TTS voice choice matters as much as text** for "sounds mainland": when audio is eventually planned, the voice must be Hong Kong Cantonese (not Guangzhou/mainland-accented, and not a voice that reads 書面語 prosody). Put the friend on voice-sample duty before any bulk generation.
- Friend is the ideal reviewer for column B — 10 yes/no calls, ~10 minutes.
