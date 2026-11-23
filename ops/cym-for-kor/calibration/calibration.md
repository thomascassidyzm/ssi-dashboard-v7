# Welsh for Korean speakers — calibration slice, seeds 1-30 (23 Nov)

Text only. Nothing written to Popty, no audio. **No native speaker has read any of the Korean yet.**

## Counts

- **LEGOs:** 93 new LEGOs in seeds 1-30. **70 same** split as the source course, **23 changed** (each with a reason below)
- **Phrases (seeds 1-10 only):** 63 written. **50 kept** (same Welsh as a source phrase that has audio), **13 new**, 2 source phrases swapped out
- **Welsh clips:** seeds 29/30 reuse the source seed clip. LEGOs 70 reuse a clip, 23 need new Welsh. Phrases (1-10) 50 reuse, 13 need new Welsh. Seeds 11-30 phrases: **unknown** (not built)
- **Korean lines to record:** all new. Seeds 1-10 ≈ 131 (10 seeds, 29 LEGO prompts, 29 intros, 63 phrases). Seeds 11-30 so far ≈ 148 (seeds, LEGO prompts, intros; phrases still to come)

## Questions for you (one word each)

1. **Changed splits where the source course leaves a gap.** The source (cym_nv2_for_eng) built HC 1-668 on top of 316 older seeds, so words like *efo*, *trio*, *dw i’n*, *licio*, *’fory* are not split out in HC 1-30. We have to teach them. I added the shortest LEGO each time. That accounts for most of the 23 changed splits; the rest are Korean-pairing merges such as *rhywun arall* = 다른 사람. **OK?** Recommend **yes**: without them the phrases use untaught words.
2. **Build the weave-dropped seeds 2 and 13?** Recommend **yes**: there are no older seeds in this course to cover them. I took their splits from the source's old seeds S0002, S0032 and S0034. All of those have clips.
3. **One Welsh form, two Korean wordings?** The Korean seeds say *siarad Cymraeg* two ways: 웨일스어로 이야기하다 (seed 1) and the more natural 웨일스어를 하다 (seeds 9, 13, 14). In both cases each Korean prompt still has one Welsh answer. Recommend **allow**, and to keep that true I keep 웨일스어로 for *yn y Gymraeg* and never put *siarad* and *yn y Gymraeg* in the same phrase.
4. **Intro voice:** one polite 해요 line per LEGO, e.g. ‘‘너와’는 웨일스어로 이렇게 말해요.’ **OK?** Recommend **yes**: it is short, polite to the learner, and the same template every time, so it can be checked by eye.
5. **Verb-frame prompts:** Korean puts the verb last. So a LEGO like *dw i isio* has the prompt ‘나는 ~고 싶어’, with the gap shown. **OK?** Recommend **yes**: it is the same stand-in idea you already approved for “it” frames.

## Where everything came from

- **Welsh source:** cym_nv2_for_eng S1001-S1030. Its Welsh matches HC 1-30 word for word. It was read live through Popty on 23 Nov. Its older seeds 1-316 supplied the LEGOs and phrases it relies on.
- **Korean seeds:** branch cs/780 @9a68ac155. #780 was still running when I took it. For seeds 1-30 it is identical to cs/764 (none of #780's 7 fixes touch 1-30). I did not change any seed Korean.
- **Reuse:** ‘reuse’ means the source row has both Welsh voices linked. It is not a check that the clip still plays.

## Gaps (honest)

- **Seeds 11-30 have no phrases yet.** The LEGOs, Korean prompts and reuse are done. Phrases were not built in the time box. For each seed I list how many source phrases pass the vocabulary check, so you can see what is there to reuse.
- The vocabulary check that picks reusable source phrases is my own text matcher run over Popty's seed listing, so some edge cases may be wrong. It is not the course-builder validator. Nothing was submitted, so the validator has not run.
- LEGO splits for 11-30 are a first pass. The ‘changed’ rows there need the same care seeds 1-10 got.

## Seed by seed

### 1. dw i isio siarad Cymraeg efo chdi rŵan
- 🇰🇷 나는 지금 너와 웨일스어로 이야기하고 싶어
- 🇬🇧 I want to speak Welsh with you now
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **dw i isio** = 나는 ~고 싶어 — same
  - intro: ‘나는 ~고 싶어’는 웨일스어로 이렇게 말해요.
- ♻ **siarad** = 이야기하다 — same
  - intro: ‘이야기하다’는 웨일스어로 이렇게 말해요.
- ♻ **Cymraeg** = 웨일스어 — same
  - intro: ‘웨일스어’는 웨일스어로 이렇게 말해요.
- ♻ **efo chdi** = 너와 — same
  - intro: ‘너와’는 웨일스어로 이렇게 말해요.
- ♻ **rŵan** = 지금 — same
  - intro: ‘지금’는 웨일스어로 이렇게 말해요.

**Phrases** (♻ = reuses a Welsh clip, 🆕 = new Welsh)
- ♻ dw i isio siarad → 나는 이야기하고 싶어
- 🆕 dw i isio siarad Cymraeg → 나는 웨일스어로 이야기하고 싶어
- ♻ siarad efo chdi → 너와 이야기하다
- 🆕 dw i isio siarad efo chdi → 나는 너와 이야기하고 싶어
- ♻ dw i isio siarad Cymraeg rŵan → 나는 지금 웨일스어로 이야기하고 싶어
- 🆕 dw i isio siarad efo chdi rŵan → 나는 지금 너와 이야기하고 싶어
- ♻ dw i isio siarad Cymraeg efo chdi rŵan → 나는 지금 너와 웨일스어로 이야기하고 싶어

### 2. dw i’n trio dysgu  *(weave-dropped in source; built)*
- 🇰🇷 나는 배우려고 노력하고 있어
- 🇬🇧 I'm trying to learn
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **dw i’n trio** = 나는 ~려고 노력하고 있어 — same
  - intro: ‘나는 ~려고 노력하고 있어’는 웨일스어로 이렇게 말해요.
- ♻ **dysgu** = 배우다 — same
  - intro: ‘배우다’는 웨일스어로 이렇게 말해요.

**Phrases** (♻ = reuses a Welsh clip, 🆕 = new Welsh)
- ♻ dw i’n trio siarad → 나는 이야기하려고 노력하고 있어
- ♻ dw i’n trio siarad Cymraeg → 나는 웨일스어로 이야기하려고 노력하고 있어
- ♻ dw i isio dysgu → 나는 배우고 싶어
- ♻ dw i isio dysgu Cymraeg → 나는 웨일스어를 배우고 싶어
- ♻ dw i’n trio dysgu Cymraeg rŵan → 나는 지금 웨일스어를 배우려고 노력하고 있어
- ♻ dw i’n trio dysgu → 나는 배우려고 노력하고 있어

### 3. sut i siarad mor aml â phosib
- 🇰🇷 가능한 한 자주 이야기하는 방법
- 🇬🇧 how to speak as often as possible
- Welsh clip: ♻ reuse

**LEGOs**
- 🆕 **sut i** = ~하는 방법 — *changed:* source splits "sut" (how) and leaves "i" uncovered; Korean renders "sut i + verb" as one frame "~하는 방법", and "i" has no Korean of its own
  - intro: ‘~하는 방법’는 웨일스어로 이렇게 말해요.
- ♻ **mor aml â phosib** = 가능한 한 자주 — same
  - intro: ‘가능한 한 자주’는 웨일스어로 이렇게 말해요.

**Phrases** (♻ = reuses a Welsh clip, 🆕 = new Welsh)
- ♻ sut i siarad → 이야기하는 방법
- ♻ sut i ddysgu → 배우는 방법
- ♻ sut i ddysgu Cymraeg → 웨일스어를 배우는 방법
- ♻ dw i’n trio dysgu sut i siarad Cymraeg → 나는 웨일스어로 이야기하는 방법을 배우려고 노력하고 있어
- ♻ siarad mor aml â phosib → 가능한 한 자주 이야기하다
- ♻ dw i isio siarad Cymraeg mor aml â phosib rŵan → 나는 지금 가능한 한 자주 웨일스어로 이야기하고 싶어
- ♻ sut i siarad mor aml â phosib → 가능한 한 자주 이야기하는 방법

### 4. sut i ddeud rhywbeth yn y Gymraeg
- 🇰🇷 웨일스어로 무언가를 말하는 방법
- 🇬🇧 how to say something in Welsh
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **ddeud** = 말하다 — same
  - intro: ‘말하다’는 웨일스어로 이렇게 말해요.
- ♻ **rhywbeth** = 무언가 — same
  - intro: ‘무언가’는 웨일스어로 이렇게 말해요.
- ♻ **yn y Gymraeg** = 웨일스어로 — same
  - intro: ‘웨일스어로’는 웨일스어로 이렇게 말해요.

**Phrases** (♻ = reuses a Welsh clip, 🆕 = new Welsh)
- ♻ sut i ddeud → 말하는 방법
- ♻ sut i ddeud rhywbeth → 무언가를 말하는 방법
- ♻ dw i isio deud rhywbeth rŵan → 나는 지금 무언가를 말하고 싶어
- ♻ dw i isio deud rhywbeth yn y Gymraeg → 나는 웨일스어로 무언가를 말하고 싶어
- ♻ sut i ddeud rhywbeth yn y Gymraeg → 웨일스어로 무언가를 말하는 방법

### 5. dw i’n mynd i ymarfer siarad efo rhywun arall
- 🇰🇷 나는 다른 사람과 이야기하는 연습을 할 거야
- 🇬🇧 I'm going to practise speaking with someone else
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **dw i’n mynd i** = 나는 ~ㄹ 거야 — same
  - intro: ‘나는 ~ㄹ 거야’는 웨일스어로 이렇게 말해요.
- ♻ **ymarfer siarad** = 이야기하는 연습을 하다 — same
  - intro: ‘이야기하는 연습을 하다’는 웨일스어로 이렇게 말해요.
- 🆕 **efo** = ~와/과 — *changed:* source has no LEGO for bare "efo" here (taught in the source's older seeds 1-316, which cym_for_kor does not have)
  - intro: ‘~와/과’는 웨일스어로 이렇게 말해요.
- 🆕 **rhywun arall** = 다른 사람 — *changed:* source splits "rhywun" (someone) and leaves "arall" uncovered; Korean says 다른 사람 as one unit, not 누군가 + 다른
  - intro: ‘다른 사람’는 웨일스어로 이렇게 말해요.

**Phrases** (♻ = reuses a Welsh clip, 🆕 = new Welsh)
- ♻ dw i’n mynd i siarad → 나는 이야기할 거야
- ♻ dw i’n mynd i ddysgu → 나는 배울 거야
- ♻ dw i’n mynd i siarad Cymraeg → 나는 웨일스어로 이야기할 거야
- ♻ dw i isio ymarfer siarad → 나는 이야기하는 연습을 하고 싶어
- ♻ dw i’n trio ymarfer siarad → 나는 이야기하는 연습을 하려고 노력하고 있어
- ♻ dw i’n mynd i ymarfer siarad → 나는 이야기하는 연습을 할 거야
- 🆕 dw i isio siarad efo rhywun arall → 나는 다른 사람과 이야기하고 싶어
- ♻ dw i’n mynd i ymarfer siarad efo rhywun arall → 나는 다른 사람과 이야기하는 연습을 할 거야

### 6. dw i’n trio cofio gair
- 🇰🇷 나는 단어 하나를 기억하려고 노력하고 있어
- 🇬🇧 I'm trying to remember a word
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **cofio** = 기억하다 — same
  - intro: ‘기억하다’는 웨일스어로 이렇게 말해요.
- ♻ **gair** = 단어 하나 — same
  - intro: ‘단어 하나’는 웨일스어로 이렇게 말해요.

**Phrases** (♻ = reuses a Welsh clip, 🆕 = new Welsh)
- ♻ dw i isio cofio → 나는 기억하고 싶어
- ♻ dw i’n trio cofio → 나는 기억하려고 노력하고 있어
- ♻ cofio gair → 단어 하나를 기억하다
- 🆕 dw i isio cofio gair → 나는 단어 하나를 기억하고 싶어
- ♻ dw i’n trio cofio gair → 나는 단어 하나를 기억하려고 노력하고 있어
- ✂ dropped *gair yn y Gymraeg*: a word in Welsh: Korean 웨일스어로 is taught as "in Welsh (speaking)", so "a word in Welsh" would need 웨일스어 단어, an untaught structure
- ✂ dropped *dw i’n trio cofio gair yn y Gymraeg*: same reason; in Korean it reads "remember in Welsh"

### 7. dw i isio trio mor galed ag y medra i heddiw
- 🇰🇷 나는 오늘 내가 할 수 있는 만큼 열심히 노력하고 싶어
- 🇬🇧 I want to try as hard as I can today
- Welsh clip: ♻ reuse

**LEGOs**
- 🆕 **trio** = 노력하다 — *changed:* source has no LEGO for bare "trio" in HC 7 (taught inside "dw i’n trio" and in the source's older seeds); needed for "dw i isio trio"
  - intro: ‘노력하다’는 웨일스어로 이렇게 말해요.
- ♻ **mor galed ag y medra i** = 내가 할 수 있는 만큼 열심히 — same
  - intro: ‘내가 할 수 있는 만큼 열심히’는 웨일스어로 이렇게 말해요.
- ♻ **heddiw** = 오늘 — same
  - intro: ‘오늘’는 웨일스어로 이렇게 말해요.

**Phrases** (♻ = reuses a Welsh clip, 🆕 = new Welsh)
- ♻ dw i isio trio → 나는 노력하고 싶어
- ♻ dw i’n mynd i drio → 나는 노력할 거야
- ♻ dw i’n trio mor galed ag y medra i → 나는 내가 할 수 있는 만큼 열심히 노력하고 있어
- 🆕 dw i isio trio mor galed ag y medra i → 나는 내가 할 수 있는 만큼 열심히 노력하고 싶어
- 🆕 dw i isio siarad Cymraeg heddiw → 나는 오늘 웨일스어로 이야기하고 싶어
- 🆕 dw i’n mynd i ymarfer siarad heddiw → 나는 오늘 이야기하는 연습을 할 거야
- ♻ dw i isio trio mor galed ag y medra i heddiw → 나는 오늘 내가 할 수 있는 만큼 열심히 노력하고 싶어

### 8. dw i’n mynd i drio esbonio be’ dw i’n ei olygu
- 🇰🇷 나는 내 말이 무슨 뜻인지 설명하려고 노력할 거야
- 🇬🇧 I'm going to try to explain what I mean
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **esbonio** = 설명하다 — same
  - intro: ‘설명하다’는 웨일스어로 이렇게 말해요.
- ♻ **be’ dw i’n ei olygu** = 내 말이 무슨 뜻인지 — same
  - intro: ‘내 말이 무슨 뜻인지’는 웨일스어로 이렇게 말해요.

**Phrases** (♻ = reuses a Welsh clip, 🆕 = new Welsh)
- ♻ dw i’n trio esbonio → 나는 설명하려고 노력하고 있어
- ♻ esbonio yn y Gymraeg → 웨일스어로 설명하다
- ♻ dw i’n mynd i esbonio heddiw → 나는 오늘 설명할 거야
- ♻ esbonio be’ dw i’n ei olygu → 내 말이 무슨 뜻인지 설명하다
- ♻ dw i’n trio esbonio be’ dw i’n ei olygu → 나는 내 말이 무슨 뜻인지 설명하려고 노력하고 있어
- ♻ dw i’n mynd i esbonio be’ dw i’n ei olygu → 나는 내 말이 무슨 뜻인지 설명할 거야
- ♻ dw i’n mynd i drio esbonio be’ dw i’n ei olygu → 나는 내 말이 무슨 뜻인지 설명하려고 노력할 거야

### 9. dw i’n siarad tipyn bach o Gymraeg rŵan
- 🇰🇷 나는 이제 웨일스어를 조금 해
- 🇬🇧 I speak a little Welsh now
- Welsh clip: ♻ reuse

**LEGOs**
- 🆕 **dw i’n** = 나는 ~해 (지금, 평소) — *changed:* source has no bare "dw i’n" LEGO at HC 9 (only inside dw i’n trio / dw i’n mynd i); Korean present "나는 ~해" needs it taught as its own piece
  - intro: ‘나는 ~해 (지금, 평소)’는 웨일스어로 이렇게 말해요.
- ♻ **tipyn bach o Gymraeg** = 웨일스어를 조금 — same
  - intro: ‘웨일스어를 조금’는 웨일스어로 이렇게 말해요.

**Phrases** (♻ = reuses a Welsh clip, 🆕 = new Welsh)
- 🆕 dw i’n dysgu Cymraeg → 나는 웨일스어를 배워
- 🆕 dw i’n siarad Cymraeg → 나는 웨일스어를 해
- ♻ siarad tipyn bach o Gymraeg → 웨일스어를 조금 하다
- 🆕 dw i isio siarad tipyn bach o Gymraeg heddiw → 나는 오늘 웨일스어를 조금 하고 싶어
- ♻ dw i’n siarad tipyn bach o Gymraeg rŵan → 나는 이제 웨일스어를 조금 해

### 10. dw i ddim yn siŵr os medra i gofio’r frawddeg gyfan
- 🇰🇷 나는 문장 전체를 기억할 수 있을지 확실하지 않아
- 🇬🇧 I'm not sure if I can remember the whole sentence
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **dw i ddim yn siŵr** = 나는 확실하지 않아 — same
  - intro: ‘나는 확실하지 않아’는 웨일스어로 이렇게 말해요.
- ♻ **os** = ~(할)지 — same
  - intro: ‘~(할)지’는 웨일스어로 이렇게 말해요.
- ♻ **medra i** = 나는 ~ㄹ 수 있어 — same
  - intro: ‘나는 ~ㄹ 수 있어’는 웨일스어로 이렇게 말해요.
- ♻ **cofio’r frawddeg gyfan** = 문장 전체를 기억하다 — same
  - intro: ‘문장 전체를 기억하다’는 웨일스어로 이렇게 말해요.

**Phrases** (♻ = reuses a Welsh clip, 🆕 = new Welsh)
- ♻ dw i ddim yn siŵr os medra i → 나는 내가 할 수 있을지 확실하지 않아
- ♻ medra i siarad → 나는 이야기할 수 있어
- ♻ dw i ddim yn siŵr os medra i gofio → 나는 기억할 수 있을지 확실하지 않아
- 🆕 dw i’n trio cofio’r frawddeg gyfan → 나는 문장 전체를 기억하려고 노력하고 있어
- 🆕 dw i ddim yn siŵr os dw i’n mynd i gofio’r frawddeg gyfan → 나는 문장 전체를 기억할지 확실하지 않아
- ♻ dw i ddim yn siŵr os medra i gofio’r frawddeg gyfan → 나는 문장 전체를 기억할 수 있을지 확실하지 않아

### 11. liciwn i fedru siarad ar ôl i ti orffen
- 🇰🇷 나는 네가 끝낸 후에 이야기할 수 있으면 좋겠어
- 🇬🇧 I'd like to be able to speak after you finish
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **liciwn i fedru** = 나는 ~ㄹ 수 있으면 좋겠어 — same
  - intro: ‘나는 ~ㄹ 수 있으면 좋겠어’는 웨일스어로 이렇게 말해요.
- ♻ **ar ôl i ti orffen** = 네가 끝낸 후에 — same
  - intro: ‘네가 끝낸 후에’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 9 source phrases pass the auto vocabulary check at this seed.*

### 12. fyddwn i ddim yn licio dyfalu be’ sy’n mynd i ddigwydd ’fory
- 🇰🇷 나는 내일 무슨 일이 일어날지 추측하고 싶지는 않을 것 같아
- 🇬🇧 I wouldn't like to guess what's going to happen tomorrow
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **fyddwn i ddim yn** = 나는 ~지 않을 것 같아 — same
  - intro: ‘나는 ~지 않을 것 같아’는 웨일스어로 이렇게 말해요.
- 🆕 **licio** = 좋아하다 — *changed:* bare "licio" uncovered at HC 12 in source (taught in its older seeds)
  - intro: ‘좋아하다’는 웨일스어로 이렇게 말해요.
- ♻ **dyfalu** = 추측하다 — same
  - intro: ‘추측하다’는 웨일스어로 이렇게 말해요.
- ♻ **be’ sy’n mynd i ddigwydd** = 무슨 일이 일어날지 — same
  - intro: ‘무슨 일이 일어날지’는 웨일스어로 이렇게 말해요.
- 🆕 **’fory** = 내일 — *changed:* uncovered at HC 12 in source (older seeds)
  - intro: ‘내일’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 16 source phrases pass the auto vocabulary check at this seed.*

### 13. ti’n siarad Cymraeg yn dda iawn  *(weave-dropped in source; built)*
- 🇰🇷 너는 웨일스어를 아주 잘해
- 🇬🇧 you speak Welsh very well
- Welsh clip: 🆕 new

**LEGOs**
- ♻ **ti’n siarad** = 너는 ~(말)해 — same
  - intro: ‘너는 ~(말)해’는 웨일스어로 이렇게 말해요.
- ♻ **yn dda iawn** = 아주 잘 — same
  - intro: ‘아주 잘’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 7 source phrases pass the auto vocabulary check at this seed.*

### 14. wyt ti’n siarad Cymraeg trwy’r dydd?
- 🇰🇷 너 하루 종일 웨일스어를 해?
- 🇬🇧 do you speak Welsh all day?
- Welsh clip: ♻ reuse

**LEGOs**
- 🆕 **wyt** = (질문) ~해? — *changed:* bare question "wyt" uncovered in source at HC 14; open question whether to teach "wyt ti’n siarad" as one LEGO instead
  - intro: ‘(질문) ~해?’는 웨일스어로 이렇게 말해요.
- ♻ **trwy’r dydd** = 하루 종일 — same
  - intro: ‘하루 종일’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 3 source phrases pass the auto vocabulary check at this seed.*

### 15. a dw i isio i ti siarad Cymraeg efo fi ’fory
- 🇰🇷 그리고 나는 네가 내일 나와 웨일스어로 이야기하기를 원해
- 🇬🇧 and I want you to speak Welsh with me tomorrow
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **a** = 그리고 — same
  - intro: ‘그리고’는 웨일스어로 이렇게 말해요.
- ♻ **dw i isio i ti siarad** = 나는 네가 ~ 이야기하기를 원해 — same
  - intro: ‘나는 네가 ~ 이야기하기를 원해’는 웨일스어로 이렇게 말해요.
- ♻ **efo fi** = 나와 — same
  - intro: ‘나와’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 5 source phrases pass the auto vocabulary check at this seed.*

### 16. mae o isio dod yn ôl efo pawb arall nes ymlaen
- 🇰🇷 그는 나중에 다른 모든 사람들과 함께 돌아오고 싶어해
- 🇬🇧 he wants to come back with everyone else later on
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **mae o** = 그는 — same
  - intro: ‘그는’는 웨일스어로 이렇게 말해요.
- 🆕 **isio** = ~고 싶어(하다) — *changed:* bare "isio" uncovered in source at HC 16 (taught only inside dw i isio etc.); Korean 3rd person needs -고 싶어해
  - intro: ‘~고 싶어(하다)’는 웨일스어로 이렇게 말해요.
- ♻ **dod yn ôl** = 돌아오다 — same
  - intro: ‘돌아오다’는 웨일스어로 이렇게 말해요.
- 🆕 **pawb arall** = 다른 모든 사람들 — *changed:* source splits "pawb" and leaves "arall" uncovered; Korean says 다른 모든 사람들 as one unit
  - intro: ‘다른 모든 사람들’는 웨일스어로 이렇게 말해요.
- ♻ **nes ymlaen** = 나중에 — same
  - intro: ‘나중에’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 37 source phrases pass the auto vocabulary check at this seed.*

### 17. mae hi isio ffeindio allan be’ ydy’r ateb
- 🇰🇷 그녀는 답이 무엇인지 알아내고 싶어해
- 🇬🇧 she wants to find out what the answer is
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **mae hi isio** = 그녀는 ~고 싶어해 — same
  - intro: ‘그녀는 ~고 싶어해’는 웨일스어로 이렇게 말해요.
- ♻ **ffeindio allan** = 알아내다 — same
  - intro: ‘알아내다’는 웨일스어로 이렇게 말해요.
- ♻ **be’ ydy’r ateb** = 답이 무엇인지 — same
  - intro: ‘답이 무엇인지’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 13 source phrases pass the auto vocabulary check at this seed.*

### 18. dan ni isio cyfarfod am chwech o’r gloch heno
- 🇰🇷 우리는 오늘 저녁 여섯 시에 만나고 싶어
- 🇬🇧 we want to meet at six o'clock this evening
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **dan ni isio** = 우리는 ~고 싶어 — same
  - intro: ‘우리는 ~고 싶어’는 웨일스어로 이렇게 말해요.
- ♻ **cyfarfod** = 만나다 — same
  - intro: ‘만나다’는 웨일스어로 이렇게 말해요.
- ♻ **am chwech o’r gloch** = 여섯 시에 — same
  - intro: ‘여섯 시에’는 웨일스어로 이렇게 말해요.
- ♻ **heno** = 오늘 저녁 — same
  - intro: ‘오늘 저녁’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 21 source phrases pass the auto vocabulary check at this seed.*

### 19. ond dw i ddim isio stopio siarad
- 🇰🇷 하지만 나는 이야기하는 것을 멈추고 싶지 않아
- 🇬🇧 but I don't want to stop talking
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **ond** = 하지만 — same
  - intro: ‘하지만’는 웨일스어로 이렇게 말해요.
- ♻ **dw i ddim isio** = 나는 ~고 싶지 않아 — same
  - intro: ‘나는 ~고 싶지 않아’는 웨일스어로 이렇게 말해요.
- ♻ **stopio** = 멈추다 — same
  - intro: ‘멈추다’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 29 source phrases pass the auto vocabulary check at this seed.*

### 20. ti isio dysgu ei enw fo’n gyflym
- 🇰🇷 너는 그의 이름을 빨리 배우고 싶어
- 🇬🇧 you want to learn his name quickly
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **ti isio** = 너는 ~고 싶어 — same
  - intro: ‘너는 ~고 싶어’는 웨일스어로 이렇게 말해요.
- ♻ **ei enw fo’n gyflym** = 그의 이름을 빨리 — same
  - intro: ‘그의 이름을 빨리’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 19 source phrases pass the auto vocabulary check at this seed.*

### 21. pam wyt ti’n dysgu ei henw hi?
- 🇰🇷 너 왜 그녀의 이름을 배우고 있어?
- 🇬🇧 why are you learning her name?
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **pam** = 왜 — same
  - intro: ‘왜’는 웨일스어로 이렇게 말해요.
- 🆕 **wyt ti’n** = 너 ~하고 있어? / 너 ~해? — *changed:* question form uncovered in source at HC 21 (older seeds)
  - intro: ‘너 ~하고 있어? / 너 ~해?’는 웨일스어로 이렇게 말해요.
- ♻ **ei henw hi** = 그녀의 이름 — same
  - intro: ‘그녀의 이름’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 33 source phrases pass the auto vocabulary check at this seed.*

### 22. achos dw i isio cyfarfod pobl sy’n siarad Cymraeg
- 🇰🇷 왜냐하면 나는 웨일스어를 하는 사람들을 만나고 싶기 때문이야
- 🇬🇧 because I want to meet people who speak Welsh
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **achos** = 왜냐하면 — same
  - intro: ‘왜냐하면’는 웨일스어로 이렇게 말해요.
- ♻ **pobl sy’n siarad** = ~하는 사람들 — same
  - intro: ‘~하는 사람들’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 6 source phrases pass the auto vocabulary check at this seed.*

### 23. dw i’n mynd i ddechrau siarad mwy cyn bo hir
- 🇰🇷 나는 곧 더 많이 이야기하기 시작할 거야
- 🇬🇧 I'm going to start talking more soon
- Welsh clip: ♻ reuse

**LEGOs**
- 🆕 **ddechrau** = 시작하다 — *changed:* "dechrau" uncovered in source at HC 23 (older seeds)
  - intro: ‘시작하다’는 웨일스어로 이렇게 말해요.
- ♻ **mwy** = 더 (많이) — same
  - intro: ‘더 (많이)’는 웨일스어로 이렇게 말해요.
- ♻ **cyn bo hir** = 곧 — same
  - intro: ‘곧’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 18 source phrases pass the auto vocabulary check at this seed.*

### 24. dw i ddim yn mynd i fedru cofio’n hawdd
- 🇰🇷 나는 쉽게 기억할 수 없을 거야
- 🇬🇧 I'm not going to be able to remember easily
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **dw i ddim yn mynd i** = 나는 ~지 않을 거야 / ~ㄹ 수 없을 거야 — same
  - intro: ‘나는 ~지 않을 거야 / ~ㄹ 수 없을 거야’는 웨일스어로 이렇게 말해요.
- 🆕 **fedru** = ~ㄹ 수 있다 — *changed:* uncovered in source at HC 24
  - intro: ‘~ㄹ 수 있다’는 웨일스어로 이렇게 말해요.
- ♻ **cofio’n hawdd** = 쉽게 기억하다 — same
  - intro: ‘쉽게 기억하다’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 23 source phrases pass the auto vocabulary check at this seed.*

### 25. wyt ti’n mynd i helpu fi cyn i mi orfod mynd?
- 🇰🇷 너 내가 가야 하기 전에 나를 도와줄 거야?
- 🇬🇧 are you going to help me before I have to go?
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **ti’n mynd i** = 너는 ~ㄹ 거야 — same
  - intro: ‘너는 ~ㄹ 거야’는 웨일스어로 이렇게 말해요.
- 🆕 **helpu fi** = 나를 도와주다 — *changed:* uncovered in source at HC 25
  - intro: ‘나를 도와주다’는 웨일스어로 이렇게 말해요.
- ♻ **cyn i mi orfod** = 내가 ~해야 하기 전에 — same
  - intro: ‘내가 ~해야 하기 전에’는 웨일스어로 이렇게 말해요.
- 🆕 **mynd** = 가다 — *changed:* uncovered in source at HC 25
  - intro: ‘가다’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 64 source phrases pass the auto vocabulary check at this seed.*

### 26. dw i’n licio teimlo fel taswn i bron yn barod i fynd
- 🇰🇷 나는 거의 갈 준비가 된 것처럼 느끼는 것을 좋아해
- 🇬🇧 I like feeling as if I'm nearly ready to go
- Welsh clip: ♻ reuse

**LEGOs**
- 🆕 **dw i’n licio** = 나는 ~는 것을 좋아해 — *changed:* uncovered in source at HC 26
  - intro: ‘나는 ~는 것을 좋아해’는 웨일스어로 이렇게 말해요.
- 🆕 **teimlo** = 느끼다 — *changed:* uncovered in source at HC 26
  - intro: ‘느끼다’는 웨일스어로 이렇게 말해요.
- ♻ **fel taswn i** = 마치 내가 ~인 것처럼 — same
  - intro: ‘마치 내가 ~인 것처럼’는 웨일스어로 이렇게 말해요.
- ♻ **bron yn barod** = 거의 준비가 된 — same
  - intro: ‘거의 준비가 된’는 웨일스어로 이렇게 말해요.
- 🆕 **i fynd** = 갈 (준비) — *changed:* uncovered in source at HC 26
  - intro: ‘갈 (준비)’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 22 source phrases pass the auto vocabulary check at this seed.*

### 27. dw i ddim yn licio cymryd gormod o amser i ateb
- 🇰🇷 나는 대답하는 데 시간을 너무 많이 들이는 것을 좋아하지 않아
- 🇬🇧 I don't like taking too much time to answer
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **dw i ddim** = 나는 ~지 않아 — same
  - intro: ‘나는 ~지 않아’는 웨일스어로 이렇게 말해요.
- ♻ **cymryd** = (시간을) 들이다 — same
  - intro: ‘(시간을) 들이다’는 웨일스어로 이렇게 말해요.
- 🆕 **gormod o amser** = 너무 많은 시간 — *changed:* source splits "gormod" alone; Korean 시간을 너무 많이 needs amser with it
  - intro: ‘너무 많은 시간’는 웨일스어로 이렇게 말해요.
- 🆕 **i ateb** = 대답하는 데 — *changed:* source splits "ateb" alone; "i" uncovered
  - intro: ‘대답하는 데’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 147 source phrases pass the auto vocabulary check at this seed.*

### 28. mae’n ddefnyddiol dechrau siarad cyn gynted ag y medri di
- 🇰🇷 네가 할 수 있는 한 빨리 이야기하기 시작하는 것이 유용해
- 🇬🇧 it's useful to start talking as soon as you can
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **mae’n ddefnyddiol** = ~것이 유용해 — same
  - intro: ‘~것이 유용해’는 웨일스어로 이렇게 말해요.
- ♻ **cyn gynted ag y medri di** = 네가 할 수 있는 한 빨리 — same
  - intro: ‘네가 할 수 있는 한 빨리’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 13 source phrases pass the auto vocabulary check at this seed.*

### 29. dw i’n edrych ymlaen at siarad yn well cyn gynted ag y medra i
- 🇰🇷 나는 내가 할 수 있는 한 빨리 더 잘 이야기하게 되기를 기대하고 있어
- 🇬🇧 I'm looking forward to speaking better as soon as I can
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **dw i’n edrych ymlaen at** = 나는 ~기를 기대하고 있어 — same
  - intro: ‘나는 ~기를 기대하고 있어’는 웨일스어로 이렇게 말해요.
- ♻ **yn well** = 더 잘 — same
  - intro: ‘더 잘’는 웨일스어로 이렇게 말해요.
- 🆕 **cyn gynted ag y medra i** = 내가 할 수 있는 한 빨리 — *changed:* source splits only "medra i" here and leaves "cyn gynted ag y" uncovered; mirrors HC 28's "cyn gynted ag y medri di"
  - intro: ‘내가 할 수 있는 한 빨리’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 17 source phrases pass the auto vocabulary check at this seed.*

### 30. o’n i isio gofyn rhywbeth i ti ddoe
- 🇰🇷 나는 어제 너에게 무언가를 물어보고 싶었어
- 🇬🇧 I wanted to ask you something yesterday
- Welsh clip: ♻ reuse

**LEGOs**
- ♻ **o’n i isio** = 나는 ~고 싶었어 — same
  - intro: ‘나는 ~고 싶었어’는 웨일스어로 이렇게 말해요.
- 🆕 **gofyn** = 묻다 — *changed:* uncovered in source at HC 30
  - intro: ‘묻다’는 웨일스어로 이렇게 말해요.
- 🆕 **i ti** = 너에게 — *changed:* uncovered in source at HC 30
  - intro: ‘너에게’는 웨일스어로 이렇게 말해요.
- ♻ **ddoe** = 어제 — same
  - intro: ‘어제’는 웨일스어로 이렇게 말해요.

*Phrases not built yet; 58 source phrases pass the auto vocabulary check at this seed.*
