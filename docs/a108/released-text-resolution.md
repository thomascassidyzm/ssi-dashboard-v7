# A-108 — released text resolution table (79 rows)

Computed 2026-08-14. **This document does not write anything.** It is the input to the
apply step: for each of the 79 released pod rows carrying a gender-slash annotation or a
stage direction, it gives the exact corrected `target_text` (and, for the 4 Spanish rows,
the corrected `known_text` too).

Rule applied throughout, from `RELEASED-CLIP-FIX-SPEC.md`: **a slash agrees with whoever
it describes.** Self-reference → speaker's gender. Second-person reference → addressee's
gender. Each slash in a line resolved independently.

Cast read from `listening_pods.speakers` per pod, verified against
`docs/a108/speaker-gender-map.txt` — the two agree exactly for every pod touched here.
`pod-0` and `pod-0-unrecorded` carry identical casts within each course, so the same
resolution applies to both copies of a line.

Row counts reconcile with the spec: pol 49, lav 12, por 12, ara 2, spa 4 = **79**.

---

## Cast used (only the roles that appear in these scenes)

| Course | Role | Voice | Gender used |
|---|---|---|---|
| pol_for_eng | Sarah | Katarzyna | f |
| pol_for_eng | Neighbour | Mateusz | m |
| pol_for_eng | Barista / Barista (3 pm) | Eve | f |
| pol_for_eng | Bartender | Jakub | m |
| pol_for_eng | Customer | Aleksandra | f |
| pol_for_eng | Customer 1 | Aleksandra | f |
| pol_for_eng | Customer 2 | Ara | f |
| pol_for_eng | Customer 3 | Mateusz | m |
| pol_for_eng | Assistant | Ara | f |
| pol_for_eng | Receptionist | Aleksandra | f |
| pol_for_eng | Guest | Mateusz | m |
| pol_for_eng | Pharmacist | Mateusz | m |
| pol_for_eng | Tourist | Jakub | m |
| pol_for_eng | Local | Mateusz | m |
| lav_for_eng | Learner | Everita | f |
| lav_for_eng | Friend | Nils | m |
| por_for_eng | Learner | Eve | f |
| por_for_eng | Friend | Rex | m |
| ara_for_eng | Barista / Bartender | Khalid | m (see conflict §A) |
| ara_for_eng | Customer 1 | Ara | f |
| spa_for_eng | Pablo / Guardia | Manuel | m |
| spa_for_eng | Ana | Elvira | f |

---

## pol_for_eng — 49 rows (26 in `pod-0`, 23 in `pod-0-unrecorded`)

Both pods carry the same lines. Where a line exists in both, both ids are listed and the
corrected text is identical.

| id(s) | speaker | current target_text | corrected target_text | rule |
|---|---|---|---|---|
| `pol_for_eng:pod-0:SC01-S002`, `pol_for_eng:pod-0-unrecorded:SC01-S002` | Sarah | Dzień dobry. Jak się Pan/Pani ma? | **Dzień dobry. Jak się Pan ma?** | `Pan/Pani` = 2nd person → addressee Neighbour (m); corroborated by S003, where the Neighbour calls Sarah "Pani" |
| `pol_for_eng:pod-0:SC03-S001`, `pol_for_eng:pod-0-unrecorded:SC03-S001` | Barista (3 pm) | Dzień dobry. Co Pan/Pani chce? | **Dzień dobry. Co Pani chce?** | 2nd person → addressee Sarah (f), the only other participant in the scene |
| `pol_for_eng:pod-0:SC07-S001`, `pol_for_eng:pod-0-unrecorded:SC07-S001` | Barista | Dzień dobry. Co Pan/Pani chce? | **Dzień dobry. Co Pani chce?** | 2nd person → addressee Customer 1 (f), who replies at S002 |
| `pol_for_eng:pod-0:SC07-S003`, `pol_for_eng:pod-0-unrecorded:SC07-S003` | Barista | Czy chce Pan/Pani zwykłą czy dużą? | **Czy chce Pani zwykłą czy dużą?** | 2nd person → addressee Customer 1 (f), still mid-exchange |
| `pol_for_eng:pod-0:SC07-S004`, `pol_for_eng:pod-0-unrecorded:SC07-S004` | Customer 1 | Poproszę dużą. Z mlekiem owsianym, jeśli Pan/Pani ma. | **Poproszę dużą. Z mlekiem owsianym, jeśli Pani ma.** | 2nd person → addressee Barista (f) |
| `pol_for_eng:pod-0:SC07-S005`, `pol_for_eng:pod-0-unrecorded:SC07-S005` | Barista | Oczywiście. Czy chce Pan/Pani na miejscu czy na wynos? | **Oczywiście. Czy chce Pani na miejscu czy na wynos?** | 2nd person → addressee Customer 1 (f) |
| `pol_for_eng:pod-0:SC07-S008`, `pol_for_eng:pod-0-unrecorded:SC07-S008` | Barista | Już się robi. Czy chce Pan/Pani coś jeszcze? | **Już się robi. Czy chce Pani coś jeszcze?** | 2nd person → addressee Customer 2 (f), whose order at S007 this answers and who replies at S009 |
| `pol_for_eng:pod-0:SC07-S014`, `pol_for_eng:pod-0-unrecorded:SC07-S014` | Barista | Czy chce Pan/Pani usiąść? Stolik przy oknie jest wolny. | **Czy chce Pan usiąść? Stolik przy oknie jest wolny.** | 2nd person → addressee Customer 3 (m), who has just ordered at S013 |
| `pol_for_eng:pod-0:SC08-S001` | Bartender | Dobry wieczór. Co Pan/Pani chce? | **Dobry wieczór. Co Pani chce?** | 2nd person → addressee Customer 1 (f), who replies at S002 |
| `pol_for_eng:pod-0:SC08-S007` | Bartender | Mamy domowe czerwone, domowe białe albo może Pan/Pani wybrać jedno z naszych butelek. | **Mamy domowe czerwone, domowe białe albo może Pan wybrać jedno z naszych butelek.** | 2nd person → addressee Customer 3 (m), who asked for the wine list at S006 and replies at S008 |
| `pol_for_eng:pod-0:SC08-S012`, `pol_for_eng:pod-0-unrecorded:SC08-S012` | Customer 1 | Nie jestem pewny/pewna, czy jestem głodny/głodna. Czy macie menu? | **Nie jestem pewna, czy jestem głodna. Czy macie menu?** | both slashes self-reference → speaker Customer 1 (f) |
| `pol_for_eng:pod-0:SC10-S001`, `pol_for_eng:pod-0-unrecorded:SC10-S001` | Customer | Przepraszam. Czy ma Pan/Pani jakieś środki przeciwbólowe? | **Przepraszam. Czy ma Pani jakieś środki przeciwbólowe?** | 2nd person → addressee Assistant (f) |
| `pol_for_eng:pod-0:SC10-S003`, `pol_for_eng:pod-0-unrecorded:SC10-S003` | Customer | Dziękuję. A czy ma Pan/Pani jakieś środki przeciwbólowe dla dzieci? | **Dziękuję. A czy ma Pani jakieś środki przeciwbólowe dla dzieci?** | 2nd person → addressee Assistant (f) |
| `pol_for_eng:pod-0:SC10-S004`, `pol_for_eng:pod-0-unrecorded:SC10-S004` | Assistant | Myślę, że tak, ale będzie Pan/Pani musiał/musiała sprawdzić. | **Myślę, że tak, ale będzie Pani musiała sprawdzić.** | both slashes 2nd person (the addressee is the one who must look) → addressee Customer (f) |
| `pol_for_eng:pod-0:SC10-S006`, `pol_for_eng:pod-0-unrecorded:SC10-S006` | Assistant | Krem z filtrem jest tam po prawej stronie, a pastę do zębów znajdzie Pan/Pani zaraz za rogiem. | **Krem z filtrem jest tam po prawej stronie, a pastę do zębów znajdzie Pani zaraz za rogiem.** | 2nd person → addressee Customer (f) |
| `pol_for_eng:pod-0:SC10-S007`, `pol_for_eng:pod-0-unrecorded:SC10-S007` | Customer | Dziękuję, był Pan/była Pani bardzo pomocny/pomocna. Jestem bardzo wdzięczny/wdzięczna. | **Dziękuję, była Pani bardzo pomocna. Jestem bardzo wdzięczna.** | `był Pan/była Pani` and `pomocny/pomocna` are 2nd person → addressee Assistant (f); `wdzięczny/wdzięczna` is self-reference → speaker Customer (f). Both happen to be female here, but they are resolved separately |
| `pol_for_eng:pod-0:SC10-S008`, `pol_for_eng:pod-0-unrecorded:SC10-S008` | Assistant | Proszę. Czy jest Pan/Pani tu na wakacjach? Bardzo dobrze Pan/Pani mówi po polsku. | **Proszę. Czy jest Pani tu na wakacjach? Bardzo dobrze Pani mówi po polsku.** | both slashes 2nd person → addressee Customer (f) |
| `pol_for_eng:pod-0:SC10-S009`, `pol_for_eng:pod-0-unrecorded:SC10-S009` | Customer | To bardzo miłe z Pana/Pani strony! Tak, jestem na wakacjach i muszę więcej ćwiczyć, żeby lepiej mówić po polsku. Dziękuję bardzo i do widzenia. | **To bardzo miłe z Pani strony! Tak, jestem na wakacjach i muszę więcej ćwiczyć, żeby lepiej mówić po polsku. Dziękuję bardzo i do widzenia.** | 2nd person (genitive `Pana/Pani`) → addressee Assistant (f) |
| `pol_for_eng:pod-0:SC11-S002`, `pol_for_eng:pod-0-unrecorded:SC11-S002` | Receptionist | Witamy. Tak, ma Pan/Pani pokój dwuosobowy na trzy noce. Czy mogę prosić o dowód tożsamości? | **Witamy. Tak, ma Pan pokój dwuosobowy na trzy noce. Czy mogę prosić o dowód tożsamości?** | 2nd person → addressee Guest (m) |
| `pol_for_eng:pod-0:SC11-S010`, `pol_for_eng:pod-0-unrecorded:SC11-S010` | Receptionist | Tak, może Pan/Pani zostać do południa, bez dodatkowych opłat. | **Tak, może Pan zostać do południa, bez dodatkowych opłat.** | 2nd person → addressee Guest (m) |
| `pol_for_eng:pod-0:SC12-S001` | Customer | Dzień dobry. Niezbyt dobrze się czuję — czy może mi Pan/Pani coś polecić? | **Dzień dobry. Niezbyt dobrze się czuję — czy może mi Pan coś polecić?** | 2nd person → addressee Pharmacist (m) |
| `pol_for_eng:pod-0:SC12-S002`, `pol_for_eng:pod-0-unrecorded:SC12-S002` | Pharmacist | Oczywiście. Jakie ma Pan/Pani objawy? | **Oczywiście. Jakie ma Pani objawy?** | 2nd person → addressee Customer (f) |
| `pol_for_eng:pod-0:SC12-S005`, `pol_for_eng:pod-0-unrecorded:SC12-S005` | Customer | Jak często powinnam/powinienem brać paracetamol? | **Jak często powinnam brać paracetamol?** | self-reference → speaker Customer (f) |
| `pol_for_eng:pod-0:SC13-S001`, `pol_for_eng:pod-0-unrecorded:SC13-S001` | Tourist | Przepraszam, czy wie Pan/Pani, jak dojść do najbliższego supermarketu? | **Przepraszam, czy wie Pan, jak dojść do najbliższego supermarketu?** | 2nd person → addressee Local (m) |
| `pol_for_eng:pod-0:SC13-S007`, `pol_for_eng:pod-0-unrecorded:SC13-S007` | Local | Zobaczy Pan/Pani supermarket po lewej stronie, tuż naprzeciwko przystanku autobusowego. | **Zobaczy Pan supermarket po lewej stronie, tuż naprzeciwko przystanku autobusowego.** | 2nd person → addressee Tourist (m) |
| `pol_for_eng:pod-0:SC13-S010`, `pol_for_eng:pod-0-unrecorded:SC13-S010` | Tourist | Dziękuję bardzo. Był Pan/Pani bardzo pomocny/pomocna. | **Dziękuję bardzo. Był Pan bardzo pomocny.** | both slashes 2nd person → addressee Local (m). Note the source slash is malformed — `Był Pan/Pani` would need `była Pani` for the feminine; resolving to masculine sidesteps it |

---

## lav_for_eng — 12 rows (6 in `pod-0` SC15, 6 in `pod-0-unrecorded` SC22)

Two-hander: Learner (Everita, **f**) and Friend (Nils, **m**). Addressee is never in doubt.
Latvian writes the alternate as a dash-paren suffix; same rule applies.

| id(s) | speaker | current target_text | corrected target_text | rule |
|---|---|---|---|---|
| `lav_for_eng:pod-0:SC15-S001`, `lav_for_eng:pod-0-unrecorded:SC22-S001` | Learner | …Es neesmu **mācījies(-usies)** jau ļoti ilgi… | **Vai jums nebūtu iebildumu, ja es mēģinātu ar jums praktizēt latviešu valodas runāšanu? Es neesmu mācījusies jau ļoti ilgi, un man joprojām ir mazliet bail runāt ar citiem cilvēkiem.** | self-reference → speaker Learner (f) → fem. participle `mācījusies` |
| `lav_for_eng:pod-0:SC15-S005`, `lav_for_eng:pod-0-unrecorded:SC22-S005` | Learner | …Es neesmu **pārliecināts(-a)**, ko teikt… | **Jā, paldies. Runāt tikai ar vienu cilvēku ir vieglāk. Gan jau, ir mazliet grūti izdomāt, ko teikt. Es neesmu pārliecināta, ko teikt, bet man šķiet, ka es varu runāt pietiekami, lai sāktu sarunas.** | self-reference → speaker Learner (f) |
| `lav_for_eng:pod-0:SC15-S006`, `lav_for_eng:pod-0-unrecorded:SC22-S006` | Friend | Esmu **pārsteigts(-a)**. … tu esi **gatavs(-a)** … | **Es domāju, ka tu dari ļoti labi. Esmu pārsteigts. Es domāju, ka tu esi gatava sākt runāt latviešu valodā ar ikvienu, kas runā latviski.** | `pārsteigts(-a)` self-reference → speaker Friend (m); `gatavs(-a)` 2nd person → addressee Learner (f). Two rules in one line |
| `lav_for_eng:pod-0:SC15-S008`, `lav_for_eng:pod-0-unrecorded:SC22-S008` | Friend | Tev jau vajadzētu būt **pārliecinātam(-ai)**. … | **Tev jau vajadzētu būt pārliecinātai. Es domāju, ka tu dari daudz labāk, nekā tu apzinies. Man ir ērti ar tevi runāt, un es nerunāju ļoti lēni.** | 2nd person (dative subject `tev`) → addressee Learner (f) → fem. dative `pārliecinātai` |
| `lav_for_eng:pod-0:SC15-S009`, `lav_for_eng:pod-0-unrecorded:SC22-S009` | Learner | …cik **noguris(-usi)** es kļūstu… | **Tieši tāds treniņš man ir vajadzīgs. Man šķiet, ka es varu sajust, kā tas maina manas smadzenes, kamēr mēs runājam! Es patiešām novērtēju tavu palīdzību. Bet ir pārsteidzoši, cik nogurusi es kļūstu, kad runāju valodā, ko es nerunāju ļoti labi.** | self-reference → speaker Learner (f) |
| `lav_for_eng:pod-0:SC15-S011`, `lav_for_eng:pod-0-unrecorded:SC22-S011` | Learner | Esmu tiešām **priecīgs(-a)**… | **Tiešām jā. Esmu tiešām priecīga, ka varu vest tik daudz sarunas. Un es ceru, ka mēs varēsim vest vairāk sarunu nākotnē, kamēr es turpinu uzlaboties.** | self-reference → speaker Learner (f) |

---

## por_for_eng — 12 rows (6 in `pod-0` SC15, 6 in `pod-0-unrecorded` SC22)

Two-hander: Learner (Eve, **f**) and Friend (Rex, **m**). The scene addresses throughout
with `consigo` / `está` (the *você* register), so the second-person forms are the clitic
`-lo/-la` and the predicate adjective.

| id(s) | speaker | current target_text | corrected target_text | rule |
|---|---|---|---|---|
| `por_for_eng:pod-0:SC15-S001`, `por_for_eng:pod-0-unrecorded:SC22-S001` | Learner | …me sinto um pouco **nervoso/a**… | **Importava-se que eu tentasse praticar a falar português consigo? Não estou a aprender há muito tempo, e ainda me sinto um pouco nervosa a falar com outras pessoas.** | self-reference → speaker Learner (f) |
| `por_for_eng:pod-0:SC15-S002`, `por_for_eng:pod-0-unrecorded:SC22-S002` | Friend | Consigo **percebê-lo/a** facilmente. | **Claro que não, sem problema. Parece que fala muito bem. Consigo percebê-la facilmente.** | 2nd person (the clitic *is* the addressee) → addressee Learner (f) → `percebê-la` |
| `por_for_eng:pod-0:SC15-S003`, `por_for_eng:pod-0-unrecorded:SC22-S003` | Learner | **Obrigado/a**, é bom saber… | **Obrigada, é bom saber. Preciso de aprender mais palavras, e preciso de praticar a ouvir. Não percebo as pessoas muito bem quando não falam devagar.** | `obrigado/a` agrees with the thanker → speaker Learner (f) |
| `por_for_eng:pod-0:SC15-S005`, `por_for_eng:pod-0-unrecorded:SC22-S005` | Learner | Sim, **obrigado/a**… | **Sim, obrigada. É mais fácil falar com apenas uma pessoa. É um pouco difícil pensar em algo p'ra dizer, porém. Não sei bem o que dizer, mas sinto que consigo falar o suficiente p'ra começar a ter conversas.** | self-reference → speaker Learner (f) |
| `por_for_eng:pod-0:SC15-S006`, `por_for_eng:pod-0-unrecorded:SC22-S006` | Friend | Estou **impressionado/a**. … está **pronto/a** … | **Acho que está a fazer muito bem. Estou impressionado. Acho que está pronta p'ra começar a falar português com qualquer pessoa que fale português.** | `impressionado/a` self-reference → speaker Friend (m); `pronto/a` 2nd person → addressee Learner (f). Two rules in one line |
| `por_for_eng:pod-0:SC15-S009`, `por_for_eng:pod-0-unrecorded:SC22-S009` | Learner | …fico **cansado/a**… | **É exatamente o tipo de prática de que preciso. Acho que consigo sentir que está a mudar o meu cérebro enquanto falamos! Agradeço mesmo a sua ajuda. Mas é surpreendente como fico cansada quando estou a falar numa língua que não falo muito bem.** | self-reference → speaker Learner (f) |

---

## ara_for_eng — 2 rows

Both slashes are **second-person** (`عايز/عايزة إيه؟` = "what do *you* want?"), so they turn
on the customer, not on the barista/bartender. In both scenes the speaker who replies next
is **Customer 1**, cast as **Ara (f)** — see §A and §B for the two things I was told not to
guess.

| id | speaker | current target_text | corrected target_text | rule |
|---|---|---|---|---|
| `ara_for_eng:pod-0:SC07-S001` | Barista | صباح الخير. عايز/عايزة إيه؟ | **صباح الخير. عايزة إيه؟** | 2nd person → addressee = Customer 1, who replies at S002; Customer 1 is cast Ara (f) |
| `ara_for_eng:pod-0:SC08-S001` | Bartender | مساء الخير. عايز/عايزة إيه؟ | **مساء الخير. عايزة إيه؟** | 2nd person → addressee = Customer 1, who replies at S002; Customer 1 is cast Ara (f) |

---

## spa_for_eng — 4 rows (stage directions, both sides stripped)

No audio exists for these rows, so no render is implicated. Under Tom's rule 1 the
parenthetical is an annotation; stripping it leaves a clean natural sentence on both sides.

| id | speaker | current target_text → corrected | current known_text → corrected | rule |
|---|---|---|---|---|
| `spa_for_eng:travel-situations:SC01-S053` | Pablo | `(a Ana) ¿Llevas líquidos?` → **`¿Llevas líquidos?`** | `(to Ana) Do you have liquids?` → **`Do you have liquids?`** | stage direction, not gender — strip the annotation from both sides |
| `spa_for_eng:travel-situations:SC01-S057` | Guardia | `(a otro pasajero) Señor, por aquí, por favor.` → **`Señor, por aquí, por favor.`** | `(to another passenger) Sir, this way, please.` → **`Sir, this way, please.`** | stage direction — strip from both sides; the vocative `Señor` already carries who is addressed |
| `spa_for_eng:travel-situations:SC01-S059` | Ana | `(tras el escáner) Menudo alivio. ¿Todo bien?` → **`Menudo alivio. ¿Todo bien?`** | `(after the scanner) What a relief. All good?` → **`What a relief. All good?`** | stage direction — strip from both sides |
| `spa_for_eng:travel-situations:SC01-S065` | Pablo | `(vuelve) Aquí tienes. Hay cola hasta para eso.` → **`Aquí tienes. Hay cola hasta para eso.`** | `(returns) Here you go. There's a queue even for that.` → **`Here you go. There's a queue even for that.`** | stage direction — strip from both sides |

---

## §A — the ara_for_eng Barista cast conflict: **the voice should win**

`ara_for_eng` Barista is declared `gender: "f"` in `listening_pods.speakers` but cast with
**Khalid**, male in 18 of 22 castings estate-wide.

**My position: the voice wins — Barista is male.** Three reasons:

1. Tom's rule keys on what the learner *hears*. The declared field is invisible; the voice
   is the performance.
2. The declared field is demonstrably stale in this pod — it reads `"n"` for 8 of 23 roles
   including every numbered Customer, i.e. it was never maintained. The voice assignments
   were settled empirically across the estate.
3. Khalid is the pod's `_default` male voice and is used for every other male role in the
   cast (Bartender, Driver, Friend, Guest, James, Local, Neighbour, Pharmacist, Waiter).
   The Barista entry is the odd one out, which reads as a declared-field slip, not a
   casting decision.

**This changes nothing in the table above.** Both Arabic slashes are second-person, so
they resolve on the customer's gender. The conflict is flagged, not silently decided, and
does not need to be settled before the apply step runs.

(The same conflict exists for `por_for_eng` Barista — declared `f`, voice **Sal**, male
elsewhere — and touches none of the 12 annotated Portuguese rows. Same recommendation.)

## §B — the ara_for_eng addressee: settled by who replies, with one flag

Scenes 7 and 8 contain Customer 1 (Ara, **f**), Customer 2 (Eve, **f**) and Customer 3
(Tariq, **m**). In **both** scenes the greeting at S001 is answered immediately by
**Customer 1** at S002 — so the addressee is Customer 1, female, and the form is `عايزة`.
That settles it; it is not a gap.

**Flag — a pre-existing defect the fix will make audible.** Customer 1's own reply at
`SC07-S002` is `عايز قهوة سادة` — the *masculine* self-reference — spoken by the female
voice Ara. So once S001 reads `عايزة`, the learner hears the barista address a woman who
then answers as a man. That is a defect in `SC07-S002` / `SC08-S002`, **not** in the rows
I was asked to resolve.

I did **not** let the neighbouring text override the cast, because that text's gender
marking is demonstrably unreliable: in scene 8, **Customer 3 (Tariq, m) uses both genders
of himself two lines apart** — `أنا عايز كوباية نبيذ` at S006, then `عايزة كوباية كبيرة
نبيذ أبيض` at S008. A signal that contradicts itself inside one speaker inside one scene
cannot outrank the cast.

**Recommendation for a separate pass** (out of scope here, no action taken): audit the
non-annotated Arabic pod lines for self-reference gender against the cast. At minimum
`ara_for_eng:pod-0:SC07-S002`, `SC08-S002` (Customer 1, f: `عايز` → `عايزة`, and the
follow-on lines S004/S006 in scene 7, S004/S009 in scene 8) and `SC08-S008` (Customer 3,
m: `عايزة` → `عايز`) look wrong. These are released clips with audio, so they are a
make-before-break job of their own, not a text tweak.

---

## Confidence notes

- **pol, lav, por, spa: high confidence.** Every addressee is fixed either by a two-person
  scene or by an adjacent turn, and every form is a routine masculine/feminine alternation
  with no lexical choice involved. The Polish `Pan`/`Pani` case forms are carried through
  correctly (`z Pani strony` genitive, `będzie Pani musiała` future compound,
  `była Pani pomocna` past).
- **ara: high confidence on the rule, flagged on the surroundings.** `عايزة إيه؟` is the
  standard Egyptian colloquial feminine. The uncertainty is not in the form but in the
  scene's own internal consistency, covered in §B.
- **One malformed source annotation**, `pol_for_eng … SC13-S010`: `Był Pan/Pani` cannot be
  read feminine as written (that would need `Była Pani`). It resolves masculine anyway, so
  the malformation does not affect the output.
- **Out-of-scope register wobble, noted not touched**: `lav … S001` addresses the Friend
  with polite `jums`, then every later Learner turn switches to `tu`/`tevi`. Pre-existing,
  no annotation involved, left alone.
