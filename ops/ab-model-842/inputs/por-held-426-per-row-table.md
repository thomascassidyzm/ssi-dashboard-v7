# por_for_eng: held items from the 22 Oct fix pass, checked and grouped (job #426·AI)

Study only. Nothing was written to the course. Read live through Popty's read routes on 17 Nov 2026, about 12:30 to 13:30 UTC.

## Step 1: up-to-date check, one row per held item

Every seed text is unchanged since 22 Oct. The 3 Nov and 4 Nov edits under S0384, S0390, S0450 and S0635 did not touch any held text. The 16 Nov female re-records (#142·AI) touched no held seed. Where they touched a copy (seed 26), the seed's clip was re-recorded too, so the relink is safe.

| # | Held item | Live now (17 Nov) | Class |
|---|---|---|---|
| 1 | Seed 141, two sentences, in no played basket | seed still "sem problema. Está tudo bem"; S0141L01 basket has no copy | still-real |
| 2 | Seed 82, two sentences + copy | seed unchanged; copy S0082L02U09 still two sentences (on the seed's own clips) | still-real |
| 3 | Seed 406 vs LEGO | seed "vai correr bem", LEGO "vai ficar bem"; seed in NO played basket | still-real |
| 4 | Seed 344 vs LEGO | seed "tem todo o gosto em ajudar-te", LEGO "contente em ajudar-te"; copy only at S0342L01U07, two seeds early | still-real |
| 5 | Seed 315 vs LEGO | seed "não podia pagar o carro", LEGO "não conseguia pagar"; copy S0315L01U01 "…um carro…", no eu | still-real |
| 6 | Seed 358 vs LEGO | seed "o teu amigo … she"; copy S0358L02U01 "a tua amiga" | still-real |
| 7 | Seed 379 vs LEGO | seed "tive a sorte de viajar até África"; copy "tive sorte suficiente para viajar para África" | still-real |
| 8 | Seed 384 vs LEGO | seed "há pouco", LEGO "há um momento" | still-real |
| 9 | Seed 390 vs LEGO | seed "a que está de pé", LEGO "parado"; copy "aquele que está parado" | still-real |
| 10 | Seed 403 outlier | seed "o máximo tempo possível"; LEGO and copy "o máximo de tempo possível" | still-real |
| 11 | Seed 450 lacks its LEGO | seed has no "eles próprios"; copy has it | still-real |
| 12 | S0079L01 intro "when (for questions)" | still reads that, clip 72917585 | still-real |
| 13 | S0111L01 U05/U06 plain quando in questions | unchanged; U06 has the exact English of seed 79 with a different answer, a real ZUT clash | still-real |
| 14 | Tile S0111L03 "it → (implied)" | component now reads "it → -"; your tiles rule leaves tiles alone | not-a-defect (no action asked) |
| 15 | Lowercase thursday / tuesday / jane | S0404L01, S0428L01 + B01, S0635L02 (both sides "jane") + B01 + B02 "jane's" | still-real |
| 16 | 55 pro-drop drifts | re-derived live: exactly 55 copies differ from their seed only by a subject pronoun (54 drop it, seed 162's copy adds tu) | still-real (P26 wants the exact sentence) |

**Totals: 15 still-real, 0 already fixed, 0 overtaken, 1 not-a-defect.**

Found in passing, not on the held list:
- 5 more drifted seed copies: 327 maneira/forma, 341 uns/alguns, 352, 378, 477.
- S0379L01U04 "she said she was lucky" → "ela disse que **tive** sorte". It should be teve.
- S0450L01 U02 and U05 have the same English with two answers (ir de comboio / tomar o comboio).
- Seed 43 has no LEGOs at all, so it is never played.

## Step 2: families, biggest first

### F1. Seed copy drift: the played copy is not the exact seed sentence (P26). 64 rows on 60 seeds
55 differ only by a pronoun. The other 5 (327, 341, 352, 378, 477) differ by one small word.
- Seed 1: seed "eu quero falar português contigo agora", copy "quero falar…"
- Seed 162: seed "o que é que achas disso?", copy "o que é que **tu** achas disso?"
- Seed 327: seed "outra maneira", copy "outra forma"
- **Fix per row:** set the copy to the exact seed text and link the seed's own target1/target2 clips. The known side is already identical. This is what #416 did for 10 rows on 22 Oct.
- **Clips:** 128 slots relinked, 0 rendered, **0 TTS chars**.
- **Evidence:** both forms are grammatical European Portuguese, where the subject pronoun is optional. The course's own phrases drop it throughout. So this is consistency under P26/K19, not grammar.

Per-row list: see the appendix.

### F2. ZUT, one English with two answers: the seed and its LEGO say the same thing two ways (L26). 9 rows

| Seed / row | Now | Proposed | Clips | Est chars |
|---|---|---|---|---|
| 390 | seed "a que está de pé perto da entrada"; LEGO "parado" | seed := "aquele que está parado perto da entrada" (= copy S0390L03U01) | seed t1/t2 → cbdcde0b / 5fe53a5f | 0 |
| 403 | seed "o máximo tempo possível" | seed := "devíamos ficar calados o máximo de tempo possível" (= copy S0403L03U01) | → e2da4603 / cc941678 | 0 |
| 315 | seed "não podia pagar o carro"; copy "…um carro…" | seed := "eu acho que ele não conseguia pagar o carro que queria"; copy S0315L01U01 := same | render seed t1+t2, copy relinks | ~104 |
| 384 | seed "há pouco"; LEGO "há um momento" | seed := "eu não conseguia concordar com o que ele disse há um momento"; copy S0384L02U01 := same | render t1+t2 | ~120 |
| 406 | seed "vai correr bem"; LEGO "vai ficar bem"; unplayed | seed := "não, tenho a certeza de que vai ficar bem"; add a USE row under S0406L01 on the seed's clips | render t1+t2 | ~82 |
| 344 | seed "tem todo o gosto em ajudar-te"; LEGO "contente em ajudar-te"; copy played early at S0342L01U07 | seed := "que disse que está contente em ajudar-te"; delete S0342L01U07; add the copy as a USE row under S0344L01 | render t1+t2 | ~80 |
| S0111L01U06 | "when did you start to learn? → quando começaste a aprender?" clashes with seed 79 | target := "quando é que começaste a aprender?" (= seed 79) | relink seed 79 clips | 0 |
| S0111L01U05 | "quando vais falar comigo?" | "quando é que vais falar comigo?" (the taught question form, K23) | render t1+t2 | ~62 |
| S0450L01U05 | duplicate English of U02, "tomar o comboio" | delete (U02 stays) | none | 0 |

**Subtotal ≈ 450 chars.**

Evidence:
- Priberam *parado*: "Que não se move" (standing still), which fits someone waiting at an entrance.
- Priberam *de pé*: "Levantado".
- Priberam *pouco*: "chegámos há pouco".

Both wordings in each pair are correct Portuguese. The defect is that the LEGO teaches one form and the seed asks for another. Moving the LEGO instead would re-voice 10 to 13 phrases per seed rather than one seed.

### F3. Meaning: the seed says something its English does not. 2 seeds, 0 chars
- **358.** The English has "she" but the seed says "o teu amigo". Seed := "a tua amiga disse que não conseguia chegar ao topo" (= copy S0358L02U01). Relink seed t1/t2 → 960c62d7 / 33605c5b.
- **450.** The English has "themselves", the seed has no "eles próprios". Seed := "não, têm de apanhar o comboio eles próprios" (= copy S0450L03U01). Relink → 0974334e / d5515898. Priberam *próprio* sense 10 gives "nós próprios" as the emphatic reflexive.

### F4. Clumsy: "tive sorte suficiente para" is a calque of "lucky enough to". Seed 379, ~9 rows
The seed's own "tive a sorte de viajar até África" is the natural form. Infopédia (EN-PT, *fortune*) gives "it was my good fortune to → tive a sorte de".
- **Seed:** keep it.
- **LEGO:** grow S0379L01 to "I was lucky enough to → tive a sorte de" (L27).
- **Copy:** S0379L03U01 := seed text, on the seed's clips.
- **Rewrite** "tive sorte suficiente (para)" → "tive a sorte de" in S0379L01 B02, B03, U01, U03 ("…se tive sorte", English "if I was lucky"), U06; S0379L02 B03, U06; and the S0379L03 "lucky enough to travel to Africa" build.
- **Fix the person** in S0379L01U04: "ela disse que **teve** sorte de estar lá".
- **Cost:** about 9 rows + LEGO + intro ≈ **775 chars**.

### F5. Two-sentence seed (P20 HARD for USE rows). 2 seeds
- **141.** Seed := "sem problema, está tudo bem" / "no problem, everything is okay". The words are the same, only the punctuation changes, so the existing seed clips stand (canon A7). Then add it as a USE row under S0141L01. **0 chars.**
- **82.** A dialogue line ("…Why not?" is a reply) cannot become one sentence. Delete copy S0082L02U09 and list seed 82 as P26 "no home". **0 chars.**

### F6. Capitals on English proper nouns. 6 rows, 0 chars
- S0404L01 "Thursday"
- S0428L01 + B01 "Tuesday"
- S0635L02 + B01 "Jane" (target too)
- S0635L02B02 "Jane's"

Same words, so the clips stand. If the database trigger unlinks a clip, relink it with allow_text_mismatch, as #416 did.

### F7. Intro read aloud wrong. 1 intro
S0079L01 := "The Portuguese for 'when', when you're asking a question, is:" — the K23 template. One presenter render, **~62 chars**.

## Step 3: one recommendation per family
- **F1:** apply all 64 copy := seed relinks in one edit-batch (0 chars).
- **F2:** move each seed to the LEGO's wording, reusing copy clips where they exist (390, 403 free). Render the four that need it (~390 chars). Fix U05/U06 and delete S0450L01U05.
- **F3:** seed := copy for 358 and 450 (0 chars).
- **F4:** keep seed 379, grow the LEGO to "tive a sorte de" and rewrite the calque rows (~775 chars). It is the only family that buys quality rather than consistency.
- **F5:** 141 one sentence on its own clips; 82 copy deleted and listed.
- **F6:** capitalise.
- **F7:** re-word and render the intro.

Every seed edit here unapproves its seed. Seed rewrites are your call under S15/L25.

**Total ≈ 1,300 chars**, all target or presenter.

## Gaps
- The Popty dry run was **not** run, because this job was study-only. These things are unverified until it is:
  - tiling for the re-worded seeds (390's "aquele que", 344's "está");
  - whether the DB trigger nulls any clip on the text edits.
- Online evidence is thin:
  - Infopédia, Reverso and Ciberdúvidas refused or had no entry for "o máximo de tempo possível" and "há pouco / há um momento".
  - The F2 claims rest on Priberam definitions plus the course's own LEGOs.
- No clip was heard. Audio facts are clip ids only.

## Appendix: F1 per-row list
| Seed | Row | Seed says | Copy says now | Fix | Clip slots relinked |
|---|---|---|---|---|---|
| 1 | S0001L05U04 | eu quero falar português contigo agora | quero falar português contigo agora | copy := seed text, seed's own target1/target2 clips | 2 |
| 8 | S0008L02U01 | eu vou tentar explicar o que quero dizer | vou tentar explicar o que quero dizer | copy := seed text, seed's own target1/target2 clips | 2 |
| 9 | S0009L02U04 | eu falo um pouco de português agora | falo um pouco de português agora | copy := seed text, seed's own target1/target2 clips | 2 |
| 12 | S0012L04U01 | eu não gostaria de adivinhar o que vai acontecer amanhã | não gostaria de adivinhar o que vai acontecer amanhã | copy := seed text, seed's own target1/target2 clips | 2 |
| 13 | S0013L02U01 | tu falas português muito bem | falas português muito bem | copy := seed text, seed's own target1/target2 clips | 2 |
| 18 | S0018L03U01 | nós queremos encontrar-nos às seis da tarde | queremos encontrar-nos às seis da tarde | copy := seed text, seed's own target1/target2 clips | 2 |
| 20 | S0020L03U01 | tu queres aprender o nome dele rapidamente | queres aprender o nome dele rapidamente | copy := seed text, seed's own target1/target2 clips | 2 |
| 23 | S0023L02U01 | eu vou começar a falar mais em breve | vou começar a falar mais em breve | copy := seed text, seed's own target1/target2 clips | 2 |
| 24 | S0024L02U01 | eu não vou conseguir lembrar-me facilmente | não vou conseguir lembrar-me facilmente | copy := seed text, seed's own target1/target2 clips | 2 |
| 25 | S0025L03U01 | tu vais ajudar-me antes de eu ter de ir? | vais ajudar-me antes de eu ter de ir? | copy := seed text, seed's own target1/target2 clips | 2 |
| 26 | S0026L02B02 | eu gosto de sentir que estou quase pronto para ir | gosto de sentir que estou quase pronto para ir | copy := seed text, seed's own target1/target2 clips | 2 |
| 26 | S0026L02U01 | eu gosto de sentir que estou quase pronto para ir | gosto de sentir que estou quase pronto para ir | copy := seed text, seed's own target1/target2 clips | 2 |
| 27 | S0027L02B02 | eu não gosto de demorar demasiado tempo a responder | não gosto de demorar demasiado tempo a responder | copy := seed text, seed's own target1/target2 clips | 2 |
| 27 | S0027L02U01 | eu não gosto de demorar demasiado tempo a responder | não gosto de demorar demasiado tempo a responder | copy := seed text, seed's own target1/target2 clips | 2 |
| 30 | S0030L03U01 | eu queria perguntar-te algo ontem | queria perguntar-te algo ontem | copy := seed text, seed's own target1/target2 clips | 2 |
| 31 | S0031L02U01 | tu querias falar comigo esta noite | querias falar comigo esta noite | copy := seed text, seed's own target1/target2 clips | 2 |
| 37 | S0037L03B02 | eu comecei a pensar nisso com cuidado no mês passado | comecei a pensar nisso com cuidado no mês passado | copy := seed text, seed's own target1/target2 clips | 2 |
| 37 | S0037L03U01 | eu comecei a pensar nisso com cuidado no mês passado | comecei a pensar nisso com cuidado no mês passado | copy := seed text, seed's own target1/target2 clips | 2 |
| 45 | S0045L02U06 | eu não preciso de saber tudo | não preciso de saber tudo | copy := seed text, seed's own target1/target2 clips | 2 |
| 48 | S0048L01U05 | eu não me importo de cometer erros | não me importo de cometer erros | copy := seed text, seed's own target1/target2 clips | 2 |
| 54 | S0054L04U06 | nós queríamos dar-te um pouco mais de tempo | queríamos dar-te um pouco mais de tempo | copy := seed text, seed's own target1/target2 clips | 2 |
| 59 | S0059L04U05 | eu sei como fazer o que preciso de fazer na próxima semana | sei como fazer o que preciso de fazer na próxima semana | copy := seed text, seed's own target1/target2 clips | 2 |
| 60 | S0060L04U05 | eu ainda não sei como dizer palavras diferentes suficientes | ainda não sei como dizer palavras diferentes suficientes | copy := seed text, seed's own target1/target2 clips | 2 |
| 125 | S0125L02U07 | eu acredito que a tua ideia era muito boa | acredito que a tua ideia era muito boa | copy := seed text, seed's own target1/target2 clips | 2 |
| 212 | S0212L03U08 | eles queriam pedir ajuda | queriam pedir ajuda | copy := seed text, seed's own target1/target2 clips | 2 |
| 297 | S0297L01B04 | eu não conheço muitas pessoas que falam português | não conheço muitas pessoas que falam português | copy := seed text, seed's own target1/target2 clips | 2 |
| 303 | S0303L01U03 | eu acho que ele quer sentar-se | acho que ele quer sentar-se | copy := seed text, seed's own target1/target2 clips | 2 |
| 325 | S0325L04U01 | eu acho que ele precisa de considerar dez problemas possíveis | acho que ele precisa de considerar dez problemas possíveis | copy := seed text, seed's own target1/target2 clips | 2 |
| 336 | S0336L02U01 | eu não acho que ela consiga abrir a porta | não acho que ela consiga abrir a porta | copy := seed text, seed's own target1/target2 clips | 2 |
| 342 | S0342L01U01 | eu conheci alguém que disse algo | conheci alguém que disse algo | copy := seed text, seed's own target1/target2 clips | 2 |
| 364 | S0364L04U01 | eu ouvi dizer que ele não gostava daquele lugar | ouvi dizer que ele não gostava daquele lugar | copy := seed text, seed's own target1/target2 clips | 2 |
| 365 | S0365L01U01 | eu não ouvi o que ela lhe disse | não ouvi o que ela lhe disse | copy := seed text, seed's own target1/target2 clips | 2 |
| 371 | S0371L02U01 | eu fui ver um filme na quarta-feira | fui ver um filme na quarta-feira | copy := seed text, seed's own target1/target2 clips | 2 |
| 376 | S0376L01U01 | eu não fui a lado nenhum no mês passado | não fui a lado nenhum no mês passado | copy := seed text, seed's own target1/target2 clips | 2 |
| 380 | S0380L02U01 | eu perguntei o que ela queria incluir | perguntei o que ela queria incluir | copy := seed text, seed's own target1/target2 clips | 2 |
| 381 | S0381L01U01 | eu não perguntei se ele queria seguir-nos | não perguntei se ele queria seguir-nos | copy := seed text, seed's own target1/target2 clips | 2 |
| 395 | S0395L02U01 | nós precisamos de virar à esquerda na próxima esquina | precisamos de virar à esquerda na próxima esquina | copy := seed text, seed's own target1/target2 clips | 2 |
| 411 | S0411L03U01 | nós gostaríamos de reservar uma mesa para quatro esta noite | gostaríamos de reservar uma mesa para quatro esta noite | copy := seed text, seed's own target1/target2 clips | 2 |
| 437 | S0437L02U01 | eles queriam angariar o máximo possível para caridade | queriam angariar o máximo possível para caridade | copy := seed text, seed's own target1/target2 clips | 2 |
| 438 | S0438L02U01 | eles não queriam decidir o que ele devia fazer | não queriam decidir o que ele devia fazer | copy := seed text, seed's own target1/target2 clips | 2 |
| 439 | S0439L01B01 | eles não querem morrer | não querem morrer | copy := seed text, seed's own target1/target2 clips | 2 |
| 447 | S0447L02U01 | eles vão conseguir levar-nos a casa depois da refeição? | vão conseguir levar-nos a casa depois da refeição? | copy := seed text, seed's own target1/target2 clips | 2 |
| 449 | S0449L02U01 | eles disseram que estavam quase prontos | disseram que estavam quase prontos | copy := seed text, seed's own target1/target2 clips | 2 |
| 451 | S0451L01U01 | eles disseram o que queriam fazer | disseram o que queriam fazer | copy := seed text, seed's own target1/target2 clips | 2 |
| 452 | S0452L01U01 | eles não disseram o que queriam fazer | não disseram o que queriam fazer | copy := seed text, seed's own target1/target2 clips | 2 |
| 453 | S0453L02U01 | eles disseram quem viram ontem à noite? | disseram quem viram ontem à noite? | copy := seed text, seed's own target1/target2 clips | 2 |
| 455 | S0455L03U01 | nós tivemos de sair porque as crianças estavam cansadas | tivemos de sair porque as crianças estavam cansadas | copy := seed text, seed's own target1/target2 clips | 2 |
| 460 | S0460L03U01 | eu quero encontrar uma loja perto do hotel | quero encontrar uma loja perto do hotel | copy := seed text, seed's own target1/target2 clips | 2 |
| 589 | S0589L04U01 | ela disse-me que tinha acabado de ver o último autocarro | disse-me que tinha acabado de ver o último autocarro | copy := seed text, seed's own target1/target2 clips | 2 |
| 15 | S0015L03U05 | e eu quero que fales português comigo amanhã | e quero que fales português comigo amanhã | copy := seed text, seed's own target1/target2 clips | 2 |
| 19 | S0019L03B04 | mas eu não quero parar de falar | mas não quero parar de falar | copy := seed text, seed's own target1/target2 clips | 2 |
| 19 | S0019L03U01 | mas eu não quero parar de falar | mas não quero parar de falar | copy := seed text, seed's own target1/target2 clips | 2 |
| 22 | S0022L02U04 | porque eu quero conhecer pessoas que falam português | porque quero conhecer pessoas que falam português | copy := seed text, seed's own target1/target2 clips | 2 |
| 162 | S0162L01U02 | o que é que achas disso? | o que é que tu achas disso? | copy := seed text, seed's own target1/target2 clips | 2 |
| 213 | S0213L02U06 | nós não sabemos o que eles estão a tentar alcançar | não sabemos o que estão a tentar alcançar | copy := seed text, seed's own target1/target2 clips | 2 |
| 368 | S0368L01U01 | sim, eu ouvi dizer que ele queria cultivar tomates | sim, ouvi dizer que ele queria cultivar tomates | copy := seed text, seed's own target1/target2 clips | 2 |
| 374 | S0374L01U01 | sim, eu achei que era muito bonito | sim, achei que era muito bonito | copy := seed text, seed's own target1/target2 clips | 2 |
| 375 | S0375L01U01 | não, eu não sabia o que ela estava a fazer | não, não sabia o que ela estava a fazer | copy := seed text, seed's own target1/target2 clips | 2 |
| 386 | S0386L01U01 | sim, eu concordei com ela | sim, concordei com ela | copy := seed text, seed's own target1/target2 clips | 2 |
| 327 | S0327L01U01 | achas que ela precisa de oferecer outra maneira? | achas que ela precisa de oferecer outra forma? | copy := seed text, seed's own target1/target2 clips | 2 |
| 341 | S0341L01U01 | eu conheci alguém há uns dias | conheci alguém há alguns dias | copy := seed text, seed's own target1/target2 clips | 2 |
| 352 | S0352L02U01 | mesmo que ele quisesse, não ia conseguir | mesmo que quisesse não conseguiria | copy := seed text, seed's own target1/target2 clips | 2 |
| 378 | S0378L02U01 | não, eu não tinha dinheiro suficiente para férias | não, não tinha dinheiro suficiente para as férias | copy := seed text, seed's own target1/target2 clips | 2 |
| 477 | S0477L02U02 | ele está doente desde o segundo dia das férias | ele está doente desde o segundo dia de férias | copy := seed text, seed's own target1/target2 clips | 2 |
