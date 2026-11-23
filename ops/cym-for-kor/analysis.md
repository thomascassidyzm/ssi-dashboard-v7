# Welsh for Korean speakers (cym_for_kor), step 1: the Korean seed prompts for all 668 seeds

Draft for Kai, 23 Nov 2026 (cs #764). This is seeds only. No LEGOs, no audio, nothing written to any course.

## The short version

**Where the Welsh came from.** No live course holds the 668 North Welsh seeds as seeds 1–668. The full Hadau Creiddiol North list (v5, approved by Aran) exists only as seeds **S1001–S1668 of the hidden sandbox `cym_nv2_for_eng`**. I read it on 23 Nov with one read-only Popty call, and the count is 668 of 668. The live `cym_n_for_eng` has 300 seeds and `cym_nnew_for_eng` has 267, so neither is the 668 list. I worked from the live rows, not the published JSON.

**What I wrote.** One Korean prompt for every seed, all in polite 해요. 저는 is always explicit (242 seeds). 당신 stands for every Welsh *ti* (178 seeds). Yes/no questions end in -나요? or -ㄹ까요?. Where a Welsh word had to keep its own Korean word so that a prompt has only one answer, I wrote that pairing into the seed's note. The precedent is `eng_for_kor`, whose 668 Korean prompts sit over the same curriculum.

**What works.** About 535 of the 668 seeds needed no flag at all. Checked across the whole file: no two different Welsh seeds share a Korean prompt (68 and 194 are the same Welsh sentence, so sharing one is correct). There are no 반말 or 합니다 forms. Every Welsh question has a Korean question.

**Where the trouble is** (133 seeds flagged; one seed can carry more than one flag):

- **REGISTER, 93 seeds.** Most are harmless: 45 are fragments ("an old man", "who said that…") that cannot carry a 해요 ending. Then come 당신 doubled in one line ("당신이 당신의 친구…"), 당신 standing in for a generic "you", and the formal block 639–655, where 당신 sits beside the honorific -시- and reads oddly.
- **LOST_DISTINCTION, 25 seeds.** These are Welsh contrasts Korean cannot carry. (a) Perfect, preterite and imperfect (*dw i wedi gweld / weles i / o'n i'n gweld*) all come out as -었어요. (b) Welsh "yes" changes with the verb (*yndw, do, oes, ia…*); Korean has only 네. (c) "would" and "will" both become -ㄹ 거예요; the if-clause usually shows which is meant. (d) *chwaer* and *brawd* (sister, brother) have no Korean word without an age. (e) "let's" (*gadewch i ni*).
- **ONE_ANSWER, 18 seeds.** Most of these I fixed by splitting a Korean word between two Welsh ones, and they are flagged so you can see the split. Four I could not fully fix: *gwylio* (watch) and *gweld* (see) are both 보다, though the object decides; *cael* (have) becomes 마시다 or 먹다 (217, 587); *braf* (nice) and *da* (good) are both 좋다; and *gwlad wahanol* (319, "a different country") could also be *gwlad arall*.
- **EN_CY_MISMATCH, 7 seeds.** Where the English and Welsh differ, I translated the Welsh: "check" vs *gweld* (525), "very" (575), *bendigedig* vs "great" (624). Three others (442 *dull*, 635 Siân, 250) differ from the original 668 English but not from the HC English.

**The formal "you" (the old sir/madam seeds).** HC North replaced "…sir" / "…madam" with *esgusodwch fi, … chi?*. So the formal mark in Korean is **실례지만** (not 실례합니다, which is 합니다-level) plus -(으)시- or 드리다 on the verb about the listener. Plural *chi gyd* is **여러분 모두**, and plain *chi* used as a plural (501) is **여러분**. These three pairings keep *ti*, formal *chi* and plural *chi* apart.

## Decisions for Kai (each answerable in a word)

1. **Keep 당신 for every *ti*, including the generic "you"?** I recommend **yes**. Welsh marks the person on every verb, so a Korean prompt with no subject would have two answers. The cost is translationese, and the readiness memo says the same.
2. **The formal block 639–655: drop 당신 and let 실례지만 + -시- carry the formal "you"?** I recommend **drop**. 당신 with -시- sounds odd or even rude, and -시- already points at the listener. (Draft keeps 당신, per the default.)
3. **Plural *chi* = 여러분, *chi gyd* = 여러분 모두?** I recommend **yes**.
4. **Accept that perfect, preterite and imperfect all become -었어요, and teach the difference in the LEGO introductions?** I recommend **accept**. The other route is to invent Korean markers, which teaches something false.
5. **Rule for "the" and "that": *y X* = the bare noun, *y X 'na* = 그 X, *y X 'ma* = 이 X, *draw acw* = 저기?** I recommend **yes**.
6. **Sister and brother as 자매 / 형제 (neutral but stiff) rather than 언니/누나/여동생 and so on?** I recommend **자매/형제**.
7. **Embedded *o* / *hi* always 그 / 그녀, even when it means the subject (235, 236, 343–345, 358, 359)?** I recommend **yes**. It is translationese, but it keeps the he/she contrast these seeds exist to drill, and the Welsh is just as open about who "she" is.
8. **"let's" = -기로 해요?** I recommend **yes**. A bare 해요 would mean "we talk".
9. **Approve the word splits as one set?** I recommend **yes**. Each is listed in the seed notes:
   - *siarad* 이야기하다 / *deud* 말하다
   - *ffeindio* 찾아내다 / *chwilio am* 찾다
   - *rŵan* 지금 / *ar hyn o bryd* 지금 이 순간
   - *cyn bo hir* 곧 / *yn fuan* 머지않아
   - *ffordd* 방법 / *dull* 방식
   - *credu* 믿다 / *ymddiried* 신뢰하다
   - *clywed* 듣다 / *gwrando* 귀 기울이다
   - *mi wna i* -ㄹ게요 / *mynd i* -ㄹ 거예요
   - *isio* -고 싶어요 / *liciwn i* -면 좋겠어요 / *fyddet ti'n licio* -ㄹ래요?
   - *rhaid* -아야 해요 / *angen* -ㄹ 필요가 있어요 / *dylwn* -는 게 좋겠어요
   - *ddim yn siŵr* 확실하지 않아요 / *ddim yn gwybod* 몰라요
   - *iawn* 아주 / *reit* 정말 / *eitha'* 꽤
   - *hapus* 행복하다, but *hapus efo* 만족하다 and *hapus i* 기꺼이
10. **Leave the four unresolved pairs to the object and context (*gwylio/gweld*, *cael*, *braf/da*, *gwahanol/arall* at 319)?** I recommend **yes**. Each one is a LEGO-introduction note, not a seed rewrite.
11. **Create a `cym_for_kor` course row now?** I recommend **no**. The canon does not need a course for seeds to exist; the file on the branch is enough until the build starts.

**Defaults I used where nothing was ruled.** Where 당신 is unnatural, I kept it and flagged it. Where the English and Welsh disagree, I translated the Welsh and flagged it. Where Welsh needs a "please" (*os gwelwch yn dda*), I kept 해요 and added 부탁해요, flagged. Where 반말 would be natural (the dog in 547 as 걔), I kept 해요.

## Gaps

- **Not read by a native Korean speaker.** I wrote the Korean myself and checked it only by reading. 25 uses -ㄹ 건가요?, a common question form outside the -나요/-ㄹ까요 rule.
- **The weave drops were not read.** In the sandbox, 13 of these HC seeds are excluded from the running order (`course_seed_weave_drops`). I found no Popty read route for that table, so all 668 are drafted and none are marked as dropped.
- **No checks ran** (none were needed: no build, no tests). The duplicate, register and question-ending checks were run over the file itself, not against the database.

## Step 2 — rulings applied (cs #772, 23 Nov)

Kai ruled on the 11 decisions on 23 Nov. His assistant took items 5, 8 and 9 on his behalf, and Kai answered "Yes to Korean" to the ti → 반말 switch. `seeds-ko-draft.json` now carries those rulings. `korean_step1` keeps the old 해요/당신 prompt beside each new one. New fields: `addressee` (ti / formal_chi / plural_chi / none), `register` (banmal / haeyo), `flags_step1`, `step2_note`, `weave_dropped` and `weave_drop_reason`, plus a top-level `intro_notes`.

**What was applied**
- **(a) ti → 반말** with 너/네가/네 for you and 나/내가/내 for I. The pronoun stays explicit in every seed, since Welsh marks the person on every verb. A ti question opens with a bare 너 ("너 오고 싶어?"). Every seed with no addressee is also in 반말: first person, he/she/they, and fragments.
- **(b) Formal chi** (639–655) uses 해요, with 실례지만 for esgusodwch fi and -시- or 드리다 on the listener's verb. There is no 당신 anywhere in the file. Two cases have no -시- because the subject is I or we asking permission: 639 (ga i …) and 414/630.
- *os gwelwch yn dda* is a chi form, so 414, 624 and 630 stay in 해요. In 624 it is 부탁해요 at the end of a statement. In 414 and 630 it is 부탁인데요 at the start, so each still ends as a question. All three are flagged REGISTER_JUDGED, because 624 answers a ti question.
- **(c) Plural chi and chi gyd** both become plain 여러분 in 해요, with no 모두. 501 (a parent to children who might argue) uses 너희 in 반말, flagged INTIMATE_PLURAL.
- **(d) Let's** becomes -자: 158 이야기하자, 522 동의하자, 534 나가지 말자.
- **(e) Past tenses.** Perfect, preterite and imperfect all come out as -었어. There are 212 seeds flagged TENSE_COLLAPSE, each with a LEGO-intro note to teach which Welsh past this is.
- **(f) Sister and brother** stay 자매 / 형제. **(g)** Embedded o / hi stay 그 / 그녀. One exception: 547 keeps 걔 for the dog, which is a main clause, not an embedded one.
- **(h)** The step-1 rule for *the*, *that* and *this* stands unchanged.
- **(i) The 13 word splits** are carried over in the register each seed now takes: -ㄹ게 / -ㄹ 거야, -고 싶어 / -면 좋겠어 / -ㄹ래?, -아야 해 / -ㄹ 필요가 있어 / -는 게 좋겠어, 확실하지 않아 / 몰라, and so on.
- **(j) The four context pairs** are flagged CONTEXT_PAIR on 45 seeds, each with a LEGO note: gwylio/gweld both 보다; braf/da both 좋다; cael as 보내다/마시다/먹다 (214, 217, 587); gwahanol/arall at 319.

**Counts.** 668 seeds: 636 changed, 32 unchanged. The unchanged ones are fragments with no pronoun or ending, plus 624. By addressee: 165 ti, 18 formal chi, 15 plural chi, 470 none. By register: 636 반말, 32 해요. Flags: TENSE_COLLAPSE 212, CONTEXT_PAIR 45, FRAGMENT 40, LOST_DISTINCTION 25, ONE_ANSWER 18, EN_CY_MISMATCH 7, REGISTER_JUDGED 3, INTIMATE_PLURAL 1. The last five carry over from step 1, except the two new kinds.

**Whole-file checks** (scripted over the file, not a test) found 0 problems:
- 0 Korean prompts shared by two different Welsh seeds;
- 당신 occurs 0 times, and 모두 occurs 0 times in plural chi;
- no 해요 ending, 저/제가 or honorific inside a 반말 seed;
- every formal seed has 해요 and opens with 실례지만, with -시- or 드리다 except 639, 414 and 630;
- every plural seed has 여러분 or 너희;
- every Welsh question ends in ? in Korean, and no statement became a question;
- every ti seed has 너/네 except the imperatives 466 and 527.

**Judgement calls to know about**
- 655 (실례지만, 저는 아주 잘하고 계신다고 생각해요) relies on -시- plus 실례지만 to mean "you". No he/she seed in this file uses -시-, so the prompt still has one answer within the course.
- 645 (제가 도와드릴 수 있어요) lets 드리다 carry "you".

**Intro line (ruling k)**, in `intro_notes.ti_banmal`:
- 웨일스어에서는 거의 누구에게나 ti를 쓸 수 있어요. 그래서 낯선 사람에게 반말을 하는 것과는 달라요.
- Gloss: "In Welsh you can say ti to almost everyone, so it isn't like using 반말 to a stranger."
- It is written in 해요 because it is the course speaking to the learner.

**Course row (ruling 11).** `POST /api/courses/create` on Popty :3470, with header `x-agent-id: kai-cym-for-kor-769`, answered HTTP 200 on 23 Nov. The route inserts exactly one `courses` row and nothing else (services/production-api.cjs:2095). Read back: `cym_for_kor`, known `kor`, target `cym`, "Welsh for Korean speakers", status `draft`, new_app_status `not_available`, seed_count 668. No seeds, LEGOs, phrases or audio were written. The language codes match `eng_for_kor` and `cym_n_for_eng`. Unlike our name, `eng_for_kor`'s display_name is in Korean.

**Weave drops.** There is no Popty read route for `course_seed_weave_drops`. The 13 HC drops come from the committed file `tools/course-optimization/weave-cym-nv2-2026-10-07.sql`, as that file's statement, not a live read. They are HC 2, 13, 33, 79, 179, 214, 215, 216, 219, 220, 224, 244 and 329. The later `weave-cym-nv2-keep-ten.sql` restores only old-seed drops (71 → 61), so these 13 still stand per the files. They are marked `weave_dropped: true`, and their Korean is kept. Each was dropped in `cym_nv2_for_eng` because an old seed from 1–137 already covered it. `cym_for_kor` is built on HC alone and has no such old seeds, so whether to drop them here is a LEGO-stage decision.

**LEGO-stage notes** are in each seed's `step2_note`: the TENSE_COLLAPSE intros, the CONTEXT_PAIR notes, plus 133 (dach chi efo'ch gilydd = 너와 누군가가 함께) and 547 (걔).

## Step 3 — proofread (cs #780, 23 Nov)

**No native Korean speaker has read this Korean.** These three checks are machine reads.

**Check 1: diff against eng_for_kor.** Live eng_for_kor known_text was read through `GET :3471/api/seeds/eng_for_kor?limit=1000`. HC seed n lines up with eng_for_kor S0n. 647 of the 668 English glosses are identical once Welsh is swapped for English, and 10 more differ only in a word. The remaining 21 share the slot with different wording: 639–655 are "sir/madam" in eng_for_kor, and 331, 332, 441, 442 and 557 are paraphrases. After register normalisation, 591 of 668 Korean prompts differ, almost all by design: explicit pronouns, siarad = 이야기하다, and the -ㄹ 필요가 있어 and 확실하지 않아 splits. I adopted eng_for_kor wording in 6 seeds: 33, 182, 618, 619, 620, and 414 (저희), whose wording was later replaced by the check-2 version. Full list: `step3/changes-check1.json`.

**Check 2: second opinion.** The cross-family read (sol) was refused three times (#781·AK, #783·AK, #787·AK). The refusal text, verbatim: "sol cannot run now — Codex cloud is spent: weekly allowance used (100%) and credit balance 0 is below one task (~40). A named model is never substituted". That is an explicit gap. In its place a fresh Claude Opus worker, #784·AK, did a **same-family** read and flagged 38 items (25 unnatural, 6 ungrammatical, 0 register, 3 drift, 4 one-answer). I accepted 31 and rejected 4; the other 3 were already fixed by check 1. The rejections:
- 26: 좋아 would cue da;
- 20 and 21: 익히다 would give dysgu a second Korean word;
- 491: 방식 is already dull.

Two of its fixes were changed to avoid clashes:
- 190, 281, 653 and 667 ("do you mind?") now use 불편해? rather than its suggested 신경 쓰여?, which would clash with malio = 신경 쓰다 in 538;
- 662 now uses 그걸로 이야기해요 rather than 그 언어를 해요, which would clash with yr iaith in 101.

Details: `step3/second-opinion.json` and `step3/second-opinion-fold.json`.

**Check 3: blind back-translation.** A Sonnet worker, #782·AK, translated the Korean to English without seeing the Welsh or the English glosses (`step3/backtranslation.json`). Two drifts: 182 (fixed in check 1) and 299 (반 → 절반). Its register tags agree with ours except at 414 (우리, fixed). It also showed that the Welsh conditional byddai…tasai, "would … if he could", came back as a plain future. I fixed this in 225 and 229 with -ㄹ 텐데, and in 352, the byddai'n medru form that 310, 412, 413 and 432 already render with 텐데.

**Applied:** 38 seeds changed in step 3. `korean_step2` keeps the previous prompt and `step3_note` cites the source. The Welsh was not touched: all 668 are identical to source-hc-north-668.json.

**Whole-file checks re-run, 0 real problems:**
- no two Welsh seeds share a Korean prompt;
- 당신 appears 0 times, and 모두 appears 0 times in plural seeds;
- every Welsh question is still a question in Korean, and no statement became one;
- no 해요, 저/제가/저희 in a 반말 seed;
- every formal seed opens with 실례지만, except the please seeds 414, 624 and 630, which follow their ruling;
- every plural seed has 여러분 or 너희, except the fragments 656 and 663.

**Welsh audio reuse**, read through `GET :3470/api/production/<course>/seeds?status=all` with one call per course. The Welsh of cym_nv2_for_eng S1001–S1668 is identical to this draft for all 668 seeds.
- **Seeds:** 641 of 668 have both target voices and 665 have at least one.
- **LEGOs:** 1,541, every one with both target voices.
- **Practice phrases:** 10,222. 4,312 have both voices and 8,406 have at least one.
- **Fully voiced seeds** (seed, every LEGO and every phrase, both voices): 151.
- The 13 weave-dropped seeds have no LEGOs.
- cym_n_for_eng adds only 6 more voiced phrase texts.

These counts are audio ids present on the slots, not checks that each clip is alive.

**Build-stage rule (Kai, 23 Nov 11:00Z):** keep the source Welsh phrases and the source LEGO splits. Where the Korean pairing genuinely needs a different split, list each seed with a one-line reason. That list can only be made once the Korean LEGO glosses exist. Start with the 45 CONTEXT_PAIR and 18 ONE_ANSWER seeds.
