# A-108 — what the 39 released clips actually say

Whisper decode of every clip, 2026-08-14. Verdict: **TTS spoke BOTH gendered forms aloud**
in 38 of 39 clips — not the word "slash", but both words in sequence. The audio is
audibly broken to a learner, so Tom's text-only branch was never available and the
re-render branch applies.

Latvian's dash-paren suffix decodes as a stray letter (`pārsteigts, a`), Portuguese
as a hyphenated tail (`obrigada-a`, `fico cansado a`). The one partial exception is
`percebê-lo/a`, where the second form was dropped — still wrong, since the addressee
is female.

```
OK  ara_for_eng 42702c3e-1767-470f-801e-95b9ed059102 -> "صباح الخير  عيز عيزة ايه"
OK  ara_for_eng a2679471-f037-4e8a-8f6e-14b93c19fbb0 -> "مساء الخير عايز عايزة ايه"
OK  lav_for_eng 074c6c7b-9ffd-4cb7-a749-29a95a830314 -> "Vajums nebūt iebildumu, jēs mēģināt ar jums praktizēt Latvijaiša valodas runāšam.  Es nēs mācījies uzies jau ļoti ilgi, un man jau projām ir mazliet bāju runāt ar citiem cilvēkiem."
OK  lav_for_eng 1e11f1e7-888b-44b0-acac-df20ef9f0ebc -> "Tev jau vajadzēt būt pārlēcinātam, aizdomāja, ka tu dari daudz labāk nekātu abzinies.  Man ir ērties tevi runāt, un es nerunāju ļoti lēni."
OK  lav_for_eng 99c2328a-d711-4a7d-b36a-fb41c14c28dd -> "Tiešām jā. Esmu tiešām priecīgs, kā varu vēst tik daudz sarunas, un es stāru, ka mēs varēsim vēst vairāk sarunu nākotnie, ka mērēs turpinu uzlaboties."
OK  lav_for_eng 9fa9a29b-f798-4b7e-86ce-d66c2752b7dc -> "Es domāju, ka tu daru ļoti labi.  Esmu pārsteikts, a.  Es domāju, ka tu esi gataus, a, sākt runāt Latvijaiša valodā rikvienu, kas runā Latviski."
OK  lav_for_eng cf2329ee-4895-4796-b88e-07306a641753 -> "Tieši tāds treniņš man ir vajadzīgs.  Man šķiet kais varu sajust, kā tas maina manas smadzenas, kamēr mēs runājām.  Es patiešām novērtēja tavu palīdzību.  Bet ir pārstēj dzosit cik noguris, usi eskļūstu, kad runāja valodā, ko es nerunāja ļoti labi."
OK  lav_for_eng f6efe0d8-42e5-469a-9aac-84864374cd2d -> "Jāpaldies. Runāt tikai ar vienu cilvēku ir vieglāk.  Gan jau ir mazliet grūti izdomāt, ko teikt.  Es nājasmu pārlecināts, ā, ko teikt, bet man šķetkais varu runāt pietiekami, lai sāktu sarunas."
OK  pol_for_eng 04c73f5a-7e57-487a-8c11-fd8f53548eb5 -> "Dobry wieczór, co Pan Pani chce?"
OK  pol_for_eng 0d63d580-40bd-4624-8b8c-3d01e1814e1e -> "Mamy domowe czerwone, domowe białe albo może pan i pani wybrać jedno z naszych putelek."
OK  pol_for_eng 29afbcee-aa20-473a-a1bc-d6e3d1e08ae2 -> "Czy chce Pan Pani zwykłą czy dużą?"
OK  pol_for_eng 2da6557b-2e6d-4056-a06e-38ae1a8b3a66 -> "Nie jestem pewna, pewna, czy jestem głodny, głodna.  Czy macie menu?"
OK  pol_for_eng 2f7da626-5947-4db6-9f44-67fcbe135cf3 -> "Przepraszam, czy wie Pan Pani, jak dojść do najbliższego supermarketu?"
OK  pol_for_eng 364d6024-de22-427c-aa9d-554ecbd21b36 -> "Krem z filtrem jest tam po prawej stronie, a pastę do zębów znajdzie Pan Pani zaraz za rogiem."
OK  pol_for_eng 45927109-b31f-49ba-a455-52a90bbe9f96 -> "Przepraszam. Pan, pani jakieś środki przeciwbólowe?"
OK  pol_for_eng 5c84eea6-220a-48b7-b61a-5737c868f024 -> "Dzień dobry. Jak się pan pani ma?"
OK  pol_for_eng 632e58b4-d4e1-4aeb-b24b-0ffe3278672a -> "Czy chce Pan Pani usiąść? Stolik przy oknie jest wolny."
OK  pol_for_eng 6361fe3c-65e4-40da-b489-ea1f198f9223 -> "Dziękuję. A czy ma pan pani jakieś środki przeciwbólowe dla dzieci?"
OK  pol_for_eng 716f7f96-0120-4b29-bb1d-a81ad2105205 -> "Myślę, że tak, ale będzie Pan, Pani musiał, musiała sprawdzić."
OK  pol_for_eng 830e9169-663f-426b-9139-f0c43bae8987 -> "Poproszę dużą. Z mlekiem owsianem jeśli pan pani ma."
OK  pol_for_eng 919e9eab-f83a-404d-9106-6a31d10eb031 -> "Już się robi. Czy chce Pan Pani coś jeszcze?"
OK  pol_for_eng 95d88b19-9f23-45f8-ad8f-bd8d80848aca -> "Dzień dobry. Co Pan Pani chce?"
OK  pol_for_eng a2c35586-c7b1-4fb3-94c9-6d4627e32992 -> "Oczywiście. Jakie ma Pan, Pani objawy?"
OK  pol_for_eng a7317303-b61b-4574-9985-690d7515c04e -> "Jak często powinnam powinienem brać paracytamol?"
OK  pol_for_eng b0cb7844-07ba-4da1-bb6b-5c44b9b4d588 -> "Tak może pan i pani zostać do południa bez dodatkowych opłat."
OK  pol_for_eng b306d089-2ff3-4765-b34d-e10647caa9ef -> "To bardzo miłe spana Pani strony.  Tak, jestem na wakacjach i muszę więcej ćwiczyć, żeby lepiej mówić po polsku.  Dziękuję bardzo i do widzenia."
OK  pol_for_eng cd1070cc-0d06-45d3-907d-2e3d9fa877a7 -> ""Dzień dobry. Niezbyt dobrze się czuję. Czy może mi pan pani coś polecić?""
OK  pol_for_eng cdd67292-54dc-4b74-92f2-7adac6f90f8a -> "Dziękuję bardzo. Był Pan Pani bardzo pomocny, pomocny."
OK  pol_for_eng d639d7ed-602f-49b8-af1c-bcd119f26560 -> "Proszę, czy jest Pan Pani tu na wakacjach?  Bardzo dobrze Pan Pani mówi po polsku."
OK  pol_for_eng d86468c8-c36a-4d63-89d0-e089f2fd98da -> "Witamy. Tak ma pan, pani pokój dwuosobowy na trzy noce.  Czy mogę prosić o dowód tożsamości?"
OK  pol_for_eng dafdafbc-70cb-4b98-942c-3cc75f7b832a -> "Zobaczy pan i supermarket po lewej stronie, tuż naprzeciwko przystanku autobusowego."
OK  pol_for_eng dca2c832-ac2a-4f36-aa24-90c7a967c321 -> "Oczywiście. Czy chcę Pan Pani na miejscu czy na wynos?"
OK  pol_for_eng ef8ed74c-c6d3-4708-80ae-489b9f21ac59 -> "Dziękuję. Był Pan, była Pani bardzo pomocny, pomocna.  Jestem bardzo wdzięczny, wdzięczna."
OK  por_for_eng 1f390ed4-6434-449e-b508-7d9e144d5aca -> "Sim, obrigada-a. É mais fácil falar com apenas uma pessoa.  É um pouco difícil pensar em algo para dizer, porém.  Não sei bem o que dizer, mas sinto que consigo falar o suficiente para começar a ter conversas."
OK  por_for_eng 4d3a7d4c-4496-46f0-b88c-67889365c5cd -> "Obrigado-a. É bom saber. Precise de aprender mais palavras e preciso de praticar ou ouvir.  Não perceba as pessoas muito bem quando não falam devagar."
OK  por_for_eng 6f864b1f-e016-4be2-87a0-14dc4040046f -> "É exatamente o tipo de prática de que preciso.  Acho que consigo sentir que está a mudar o meu cérebro enquanto falamos.  Agradeço mesmo a sua ajuda.  Mas é surpreendente como fico cansado a quando estou a falar numa língua que não  falo muito bem."
OK  por_for_eng b66d5008-77c4-43a2-b3e3-00b4aca9ae7a -> "importava-se que eu tentasse praticar a falar português consigo,  não estou a aprender há muito tempo e ainda me sinto um pouco nervoso a falar com outras pessoas."
OK  por_for_eng d8278819-0801-45bf-af45-6f8474396eb7 -> "Acho que está a fazer muito bem, estou impressionado a, acho que está pronto  a pré-comissar a falar português com qualquer pessoa que fale português."
OK  por_for_eng ecb25ca6-d120-4bd8-9daa-58b6387227e9 -> "Claro que não, sem problema.  Parece que fala muito bem, consigo percebê-lo facilmente."
```
