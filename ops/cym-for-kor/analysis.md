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
