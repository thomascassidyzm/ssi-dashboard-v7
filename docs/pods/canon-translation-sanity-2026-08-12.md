# Canon pod-0 translation sanity — did we build the translations properly?

**2026-08-12. Read-only audit of the 39-course pod-0 canon alignment that landed 2026-08-11.**
Nothing was written. No audio was rendered. No pod was promoted.

---

## The headline answer

**Yes — with one honest correction to the question.**

Last night's rollout **did not build a single translation**. It aligned English and *carried
forward* translations that already existed. So "have we built all the translations properly"
splits into two answers:

| | verdict |
|---|---|
| Did the align do its job correctly? | **Yes — provably. Zero off-by-one, zero stale carries, zero leakage.** |
| Is the carried translation text good? | **Yes, where I could read it — high quality, with 35 defective lines named below.** |
| Are all the translations *there*? | **No. 4,465 slots are blank. That is not a defect — it is the job that hasn't been done yet.** |

**Nothing blocks tonight's plan** — because across the 39 aligned courses there are
**zero** target lines waiting to be rendered. Every carried line already has its take, and
every uncarried slot is empty text that no queue can pick up. The render risk that *does*
exist is elsewhere, and it is named in §6.

---

## 1. What landed — verified

All six commits exist and are ancestors of `origin/main`. (The local `main` checkout in this
workspace was stale at `fc4033cd`; that is a checkout artefact, not a landing gap.)

| commit | on `origin/main` |
|---|---|
| `23d1bf0d` 39 courses aligned to Aran's pod-0 canon | yes |
| `a404a2a7` the pod-0 canon align report | yes |
| `f285483a` dry-run across all 40 X_for_eng courses | yes |
| `065a74b0` the canon + shared-cast rollout, before and after | yes |
| `ee43c5a7` a canon pod-0 line may reuse a sibling course's clip | yes |
| `2e970c7b` pod-0 English is one shared cast | yes |

I read `docs/pods/pod0-canon-align-2026-08-11/REPORT.md` and
`tools/pods/align-pod0-to-canonical.cjs` before judging anything.

---

## 2. Alignment integrity — the check that would have caught an off-by-one

Row counts prove nothing, so I did not use them. Three independent tests:

### 2a. Slot, speaker and ordering against the canonical scenario

Every canon-aligned pod joined row-by-row to `canonical_pod_scenarios` on
`(scene_number, sentence_number)`:

| pods checked | rows | slots matched | speaker mismatches | `global_order` mismatches |
|---|---|---|---|---|
| 43 | 231 each | **231/231, all 43** | **0** | **0** |

### 2b. English text equals canon

215 rows across the fleet differ from the canonical English. **All 215** are explained by the
`[target language]` substitution, and every substituted name is right — `ara_for_eng`→Arabic,
`ara_eg_for_eng`→Egyptian Arabic, `ara_sy_for_eng`→Syrian Arabic, `fra_ca_for_eng`→Canadian
French, `spa_mx_for_eng`→Mexican Spanish, and so on for all 43. **Unexplained diffs: 0.**

### 2c. The decisive one — did every carried translation keep the English it was written for?

This is where a silent off-by-one would live and where row counts would stay perfect. For all
**5,468** filled target lines I checked whether the exact `(known_text, target_text)` pair
existed in that course's committed pre-align archive:

| result | rows |
|---|---|
| pairing preserved byte-for-byte | 4,448 |
| English differs — **numerals only** (`"One. Two. Three."` → `"1. 2. 3."`) | 214 |
| English differs — **punctuation/whitespace only** (`"Excuse me… "` → `"Excuse me - "`) | 113 |
| **English genuinely reworded but a stale target carried anyway** | **0** |

I read all 214 numeral carries: the targets hold the correct numbers
(`"1. 2. 3. White. Black."` → `"Едно. Две. Три. Бяло. Черно."`, `"30. 40. 50. Friday.
Saturday."` → `"Tríocha. Daichead. Caoga. Dé hAoine. Dé Sathairn."`). The English was
reformatted from words to digits; nothing was mispaired.

**No off-by-one exists.** A fourth check confirms the same from the other side: **zero** rows
hold an audio pointer against a blank slot (`take_no_text = 0`) — the aligner blanked text and
dropped the take together, every time.

---

## 3. Wrong-language leakage — the `dan-leaked-danish` class

Given the precedent, I checked this mechanically across all 43 pods rather than by eye,
because a plausible-but-wrong Scandinavian line passes every count.

| check | result |
|---|---|
| Target text in the expected script (Arabic/Hebrew/Greek/Armenian/Devanagari/Thai/Hangul/Kana/Han/Cyrillic) | **100%, every course** |
| Target text identical to the English `known_text` | **0** |
| Untranslated English words sitting in `target_text` | **0** |
| Mojibake / replacement characters | **0** |
| `TODO` / `TBD` / `PLACEHOLDER` / `[target language]` in target | **0** |
| Sibling-language lexical leaks (da↔sv↔no, nl↔de, lt↔lv, pl/uk/bg/hr) | **0** |

Confusable pairs, separated explicitly:

| pair | evidence | verdict |
|---|---|---|
| ukr vs bul | ukr: 102 lines with і/ї/є/ґ, **0** with Bulgarian ъ. bul: 50 with ъ, **0** with і/ї/є | clean |
| jpn vs zho | jpn: kana on 124/125 (the 125th is the all-kanji numerals line). zho: kana on **0**/130 | clean |
| fas vs ara | fas: Persian-only پ چ ژ گ on 66 lines. ara/ara_eg/ara_sy: **0** | clean |
| hin vs nep | hin: **0** occurrences of Nepali तपाईं; nep: 97 lines with छ/हो/गर्/तपाईं | clean |

**No leakage anywhere.** Five "placeholder" hits my first pass reported were my own regex
matching the Spanish word *todo* ("¿Todo bien?", "todo recto") — false positives, not defects.

---

## 4. Reading the actual target text

~180 lines read side-by-side across 22 languages. The full sampled set is in the tables below;
here is a representative slice.

### 4a. Clean, natural, correct (representative)

| course | scene | English | target |
|---|---|---|---|
| deu | 1/3 | I'm very well, thank you. Are you going to work? | Mir geht es sehr gut, danke. Gehst du zur Arbeit? |
| deu | 22/7 | It's just a little frustrating when I can't think quickly enough… | Es ist nur ein bisschen frustrierend, wenn ich nicht schnell genug denken kann, um mich richtig auszudrücken. |
| fra | 6/11 | I teach English, but not in a school. I work with adults… | J'enseigne l'anglais, mais pas dans une école. Je travaille avec des adultes. |
| ita | 9/9 | I'll have the lamb, please. With a side of greens. | Prendo l'agnello, per favore. Con un contorno di verdure. |
| spa | 9/5 | Excuse me - do you have anything gluten-free? Or for vegetarians? | Perdón, ¿tienen algo sin gluten? ¿O para vegetarianos? |
| tur | 13/2 | Yes, it's about a ten minute walk. Go straight along this road. | Evet, yaklaşık on dakikalık yürüyüş mesafesinde. Bu yoldan düz gidin. |
| jpn | 9/17 | And the bill, when you're ready. Could we split it? | 準備ができましたら、お会計もお願いします。割り勘にできますか？ |
| zho | 12/3 | I've had a headache and a sore throat since yesterday. | 我从昨天开始就头疼，嗓子也疼。 |
| ara | 14/2 | Yes, of course. It may take some time, there's a lot of traffic at the moment. | أيوه، بالطبع. ممكن ياخد شوية وقت، في زحمة كتير دلوقتي. |
| hin | 14/4 | Perhaps about twenty minutes, if we're not unlucky with the traffic lights. | शायद कोई बीस मिनट, अगर ट्रैफ़िक लाइट पर किस्मत साथ रही। |
| cym_s | 11/5 | Does the room have a view? | Oes golygfa 'da'r stafell? |
| ukr | 10/6 | Sunscreen is down there on your right, and you'll find toothpaste just round the corner. | Сонцезахисний крем — ось там, праворуч, а зубну пасту знайдете одразу за рогом. |
| kor | 9/4 | We'd like one bottle of sparkling water and one bottle of still water, please. | 탄산수 한 병이랑 일반 물 한 병 주세요. |
| dan | 12/4 | Try paracetamol for the headache, and these lozenges for the throat. | Prøv paracetamol til hovedpinen, og disse halspastiller til halsen. |

This is genuinely good work — idiomatic, register-appropriate, not calqued.

### 4b. Per-language verdict and my confidence

| language | verdict | confidence |
|---|---|---|
| spa, spa_mx | clean | high |
| fra, fra_ca | clean text; **register flag** (§7) | high |
| deu, deu_at | clean | high |
| ita | clean but 2 wobbles (§5) | high |
| por, por_br | clean but 1 mistranslation + slash markup (§5) | high |
| cat | clean | high |
| nld | clean but 1 clunky line (§5) | high |
| dan, nor | clean | high |
| swe | clean but 1 calque (§5) | high |
| ron | clean; minor internal register drift | medium-high |
| tur | clean text; **register flag** (§7) | medium-high |
| pol | clean text; **slash markup + register flag** (§5, §7) | medium |
| ell, ukr | clean | medium |
| zho, jpn | clean but 2 wobbles (§5) | medium |
| ara, ara_eg, ara_sy | clean, correctly dialectal; see the ara note (§8) | medium |
| hin | clean | medium |
| kor, heb | clean but 1 agreement error in heb (§5) | medium |
| cym_n, cym_s | clean | medium |
| lav | clean text; **parenthesis markup** (§5) | medium |
| **fas, tha, hye, nep, swa, eus, gle, isl, lit, est, bul, hrv, fin** | **NOT ASSESSED for translation quality** | — |

**On the not-assessed thirteen, I am being explicit:** I verified mechanically that each is in
the right language and script, carries no English, no mojibake, no placeholder, and no sibling
leak. I did **not** judge whether the sentences are good translations, because I cannot read
those languages to that standard. That is a real gap in this audit, not a clean bill. If you
want them judged, they need native or near-native review — a fan-out was refused by the
depth ceiling on this run.

---

## 5. The defects I actually found — 35 lines, all quoted

### 5a. Unrenderable gender-alternation markup (35 lines, 3 courses) — the real finding

Written "he/she" alternations sit in learner-facing `target_text`. A voice handed these reads
the punctuation aloud: *"pārliecināts open bracket minus a close bracket"*, *"Pan slash Pani"*.
This violates the no-parentheses / zero-explanation rail directly.

**`lav_for_eng` — 6 lines, parentheses:**

| scene | target text |
|---|---|
| 22/1 | Es neesmu mācījies**(-usies)** jau ļoti ilgi… |
| 22/5 | Es neesmu pārliecināts**(-a)**, ko teikt… |
| 22/6 | Esmu pārsteigts**(-a)**. …tu esi gatavs**(-a)** sākt runāt latviešu valodā… |
| 22/8 | Tev jau vajadzētu būt pārliecinātam**(-ai)**. |
| 22/9 | …cik noguris**(-usi)** es kļūstu… |
| 22/11 | Esmu tiešām priecīgs**(-a)**, ka varu vest tik daudz sarunas. |

**`pol_for_eng` — 23 lines, `Pan/Pani` slash:**

| scene | English | target |
|---|---|---|
| 1/2 | Good morning. How are you? | Dzień dobry. Jak się **Pan/Pani** ma? |
| 3/1 | Good afternoon. What can I get you? | Dzień dobry. Co **Pan/Pani** chce? |
| 7/3 | Do you want regular or large? | Czy chce **Pan/Pani** zwykłą czy dużą? |
| 7/8 | Right away. Would you like anything else? | Już się robi. Czy chce **Pan/Pani** coś jeszcze? |
| 12/2 | Of course. What are your symptoms? | Oczywiście. Jakie ma **Pan/Pani** objawy? |
| …18 more | | |

**`por_for_eng` — 6 lines, `/a` slash:**

| scene | target |
|---|---|
| 22/1 | …ainda me sinto um pouco nervoso**/a** a falar com outras pessoas. |
| 22/2 | Consigo percebê-lo**/a** facilmente. |
| 22/3 | Obrigado**/a**, é bom saber. |
| 22/5 | Sim, obrigado**/a**. |
| 22/6 | Estou impressionado**/a**. …está pronto**/a** p'ra começar… |
| 22/9 | …como fico cansado**/a** quando estou a falar… |

**Crucially: all 35 already have audio, and all 35 also sit on the live `pod-0`.** They were
recorded before this rollout. The align carried them faithfully — it did not create them, and
it will not re-render them. So this is a **pre-existing content debt, not a tonight blocker**.
It is worth queueing as its own cleanup pass, because the takes that exist may well contain a
spoken "slash".

### 5b. Translation wobbles worth an editor's eye (7 lines)

| course | scene | English | target | issue |
|---|---|---|---|---|
| ita | 6/6 | I'm from France. | Sono **della Francia**. | non-idiomatic; should be *Sono francese* / *Vengo dalla Francia* |
| ita | 7/1 | Good morning. What can I get you? | Buongiorno. **Cosa prendo?** | literally "what do I take?" — barista should say *Cosa prende?* / *Cosa Le porto?* |
| swe | 3/1 | Good afternoon. What can I get you? | Godeftermiddag. **Vad kan jag få dig?** | calque; natural Swedish is *Vad får det lov att vara?* |
| nld | 6/12 | Well, lovely to meet you. | Nou, leuk je te **hebben leren kennen**. | clunky; *leuk je te leren kennen* |
| por | 10/6 | …you'll find toothpaste just round the corner. | …a pasta de dentes encontra ali a seguir **à dobra**. | *dobra* = a fold; should be *à esquina* |
| jpn | 8/5 | Can I have a half of cider? | **サイダー**のハーフをひとつもらえますか？ | false friend — サイダー is lemonade in Japanese, not alcoholic cider |
| heb | 11/2 | …a double room for three nights. | …חדר זוגי **לשלוש לילות**. | agreement — *לילות* is masculine, needs *לשלושה* |
| zho | 7/6 | I'd like takeaway, please. | **外带。** | politeness dropped entirely; bare "takeaway" |

None of these is a build failure. They are the ordinary editorial residue of a large
translation estate, and every one is a one-line fix.

---

## 6. Draft flags — quantified

**Draft text must never be rendered.** Here is the whole picture.

| set | draft lines |
|---|---|
| The 39 aligned courses (`pod-0-unrecorded` / draft `pod-0`) | **0** |
| `spa_for_eng` (the pre-existing 231-row clone, contributed no debt) | 128 |
| `deu_at_for_eng` | 155 |
| `cym_s_for_eng` | 104 |

The aligner is the reason the 39 are at zero: it carries `target_text_draft` **with** the text
it describes, and refuses to let a carried line inherit the column default. That is the right
design and it held.

**The render-risk number that matters.** Filled target lines with no take — i.e. what a
generation run would actually pick up:

| course | lines needing target render | of which **draft** |
|---|---|---|
| cym_s_for_eng | 231 | **104** |
| cym_n_for_eng | 144 | 0 |
| deu_at_for_eng | 131 | **105** |
| spa_for_eng | 112 | **112** |
| fin_for_eng | 71 | 0 |
| **all other 38 courses** | **0** | 0 |
| **total** | **689** | **321** |

**321 of the 689 renderable lines are draft-flagged — 47%.** All of them are in `spa_for_eng`,
`deu_at_for_eng` and `cym_s_for_eng`, none of them in the 39-course rollout. If tonight's plan
touches those three pods, draft-flag filtering is the gate that has to hold. If it touches only
the 39, there is nothing to render at all on the target side.

Separately, the **English** side needs 5,594 of 9,933 slots rendered — that is the shared-cast
job on Olivia and Tom, not a translation question, and out of scope here.

---

## 7. Methodology rails — spot-checked, with what I actually found

- **No parentheses / zero explanation.** Canon English: **0** parentheses in `known_text`,
  fleet-wide — clean. Target side: the 35 lines in §5a are real violations. Speaker labels do
  carry parentheses (`Barista (3 pm)`, `Neighbour (8 am)`) but those are stage directions in a
  metadata field, never spoken, so I do not count them.

- **tu-first register.** The canon's scenes 1, 4 and 5 are a daily neighbour and a friend —
  exactly where the rail bites. Nine courses get it right (deu *du*, ell *εσύ*, ita *tu*,
  nld *je*, por *tu*, ron *tu*, spa *tú*, cym_s *ti*, fra_ca *tu*). Three do not:

  | course | line | issue |
  |---|---|---|
  | `fra_for_eng` | 1/2 "Comment **allez-vous** ?" · 1/3 "**Vous** allez au travail ?" · 5/1 "**Vous** avez eu une longue journée ?" | *vous* to a daily neighbour, throughout. `fra_ca_for_eng` writes *tu* on the identical canon lines — so this is a choice, not a constraint of French. |
  | `tur_for_eng` | 1/2 "**Nasılsınız?**" · 1/3 "İşe mi **gidiyorsunuz**?" · 5/1 "…**geçirdiniz**?" | *siz* to the neighbour — yet scene 4 to the friend is informal (*konuşalım*, *görüşürüz*). Internally inconsistent. |
  | `pol_for_eng` | 1/2 "Jak się **Pan/Pani** ma?" vs 5/1 "Czy **miałaś** długi dzień?" | Sarah addresses the neighbour formally in scene 1; the same neighbour addresses her informally in scene 5. Self-contradictory across one relationship. |

  These are pre-existing text, faithfully carried, not created last night. `fra_for_eng` is
  **released**, so its *vous* is already in learners' ears — worth a ruling before, not after,
  any re-record.

- **No untaught known-side machinery.** The known side is Aran's canonical English and is
  identical across all 43 pods, so this rail is satisfied by construction — there is one
  controlled English, not 43.

- **The sample is otherwise clean.** I found no other rail violations and did not manufacture any.

---

## 8. Two things worth a ruling (not defects)

- **`ara_for_eng` — the generic "Arabic" course is written in Egyptian Arabic.** Its text
  carries 26 Egyptian markers (*دلوقتي، عايز، النهارده، بكرة، أوضة*) and reads as consistent
  Cairene throughout. A separate `ara_eg_for_eng` course exists and shares only **25** identical
  lines with it. Which dialect the unmarked `ara` course is meant to teach is an editorial
  call, and the align neither made nor worsened it. (My first pass reported this as
  "Egyptian/Levantine mixed" — that was my marker regex matching *bas* and *shuway* as
  substrings. It is not mixed.)

- **Ellipses inside target text.** `cym_n` and `cym_s` carry `…` on 144 lines each, `hrv` on
  78, `fin` on 3 — e.g. cym_s 8/7 *"Ma 'da ni win coch y tŷ… a gwin gwyn y tŷ,… neu allech chi
  gael… un o'n poteli ni."* These read as authoring breath-marks, and they are **not** the
  chunked-take mechanism, which uses SSML `<break>` at atom seams rather than literal
  characters in the text (`docs/pods/chunked-take-recipe.md` §142). All 78 hrv lines are
  already rendered on a **released** course, which suggests it is tolerated practice. But
  cym_s's 144 ellipsis lines are **all still unrendered**, so whatever a voice does with `…` is
  about to matter for Welsh. Worth confirming intent before that render.

---

## 9. Verdict

**Were the translations built properly? Yes — the alignment is provably correct, and the
translation text is genuinely good where it can be read.**

The evidence that decides it is §2c: across 5,468 carried lines, **not one** kept a target
written for different English. Combined with 231/231 canon slot matching, zero speaker drift,
zero ordering drift, zero orphaned takes, and zero language leakage across 43 pods, there is
no silent corruption in this rollout. The aligner's conservatism — blank rather than guess —
is what bought that, and it is the right trade.

**Mostly, except X — X is precisely:**

1. **35 lines of unrenderable gender-alternation markup** in `lav` (6, parentheses), `pol` (23,
   `Pan/Pani`) and `por` (6, `/a`). Pre-existing, already recorded, faithfully carried.
   **Does not block tonight.** Queue as a cleanup pass; check whether the existing takes say
   "slash" out loud.
2. **321 draft-flagged lines among 689 render candidates**, all in `spa_for_eng`,
   `deu_at_for_eng` and `cym_s_for_eng` — none in the 39. **Blocks only if tonight touches
   those three pods.**
3. **Register: `fra` (released) uses *vous* to a daily neighbour; `pol` and `tur` contradict
   themselves** between scene 1 and scenes 4/5. A ruling, not a bug. **Does not block.**
4. **Thirteen languages not assessed for quality** — fas, tha, hye, nep, swa, eus, gle, isl,
   lit, est, bul, hrv, fin. Mechanically clean, humanly unread. **Does not block, but it is a
   real hole in this audit and I am not papering over it.**

**The 4,465 is not a defect.** It is 3,511 canon lines no served pod ever had, plus 954 lines
whose prior text was written for different English, plus the 40 archived numbers-drill rows.
I reconciled it exactly against the database: 4,465 blank slots plus 39 parked rows = 4,504
empty `target_text` values across the canon-aligned pods. The report's number is right.

**Nothing blocks tonight's generation plan for the 39 aligned courses**, because those courses
have **zero** target lines to render. The work in front of them is translation, not audio.
