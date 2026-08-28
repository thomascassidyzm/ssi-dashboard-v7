# The 576, read one by one

**76 cases pulled from the live database and judged against your rule, 28 August 2026.**

The earlier report gave the shape of the 576 but carried no case list, so the 576 was recomputed
from the live rows — same query, same clearing test — and came back **576 exactly**. The split by
closeness came back 214 near-misses / 362 word-level misses against the reported 220/356; that is
a slightly different way of measuring "within one character", not a different set of lessons.

Then 76 of them were read, row by row. Every judgement below is against your rule: **strict on the
target side, exact form, the only tolerance being something a learner would barely perceive.**

---

## What it comes to

| | share of the 76 | what it means |
|---|---|---|
| **The rule is too strict** | 8 — 11% | the word is there; a learner connects it instantly |
| **Slack you already granted, not implemented** | 5 — 7% | mutation and elision cases the check still flags |
| **The lesson word is misspelled** | 13 — 17% | sentences are right, the lesson is wrong |
| **Real defect** | 49 — 64% | the word genuinely is not there |
| **Other** | 1 — 1% | taught and drilled forms are two different registers |

Scaled to the whole 576, weighting each language by how many of the 576 it owns:

- **~310 real defects** — a little over half
- **~165 misspelled lesson words** — essentially all Armenian
- **~55 where the rule needs slack**
- **~45 already covered by slack you granted, which the check does not yet apply**

---

# FIRST: where the rule is too strict

Three categories survive an adversarial second read. Two more were proposed and knocked down; they
are recorded at the end of this section because knowing what does *not* deserve slack is worth as
much as knowing what does.

## 1. Arabic case vowels — but only the bare ones

Arabic writes short vowels as optional marks. The lesson word and the sentence disagree about
whether to write them, and about the final case vowel, which the sentence's grammar forces and
which no citation form can match. The letters — the part a reader actually reads — are identical,
and in speech the ending is routinely dropped altogether.

| taught | in the sentence | difference |
|---|---|---|
| أَسْتَريح *(I relax)* | أَسْتَريحُ | one final vowel mark, nothing else |
| القَميصِ *(the shirt)* | القَميصُ / القَميصَ | case ending only |
| الفُسْتانِ *(the dress)* | الفُسْتانُ / الفُسْتانَ | case ending only |

**The slack: ignore vowel-marking differences entirely, and treat a bare final case vowel as the
vowel-ending tolerance you already granted.** The same applies to Hebrew for the same reason.

**The boundary, and it is a real one.** هادئ *(quiet)* drilled as هادِئاً is *not* in this category
and was moved out of it on the second read: that ending adds an audible *-an* syllable, which is a
sound the learner hears and not a mark they never see. **Bare case vowel: slack. Tanwīn: defect.**
That line is worth writing down explicitly, because a rule that says "final vowels are fine" would
swallow both.

## 2. A function word colloquially clipped (Welsh, and any spoken register)

| taught | in the sentence |
|---|---|
| **beth** oedd yn digwydd | **be'** oedd yn digwydd |
| ti'n gwybod **bod** | ti'n gwybod **bo'** fi ddim isio gofyn am help |

The course teaches the written form and drills the spoken one. Nobody learning Welsh stops on
*be'* for *beth*. This is the same shape as the *qu'* for *que* and *y* → *'r* elisions you have
already accepted — **the same category, clipping a word's tail instead of its vowel** — and the
apostrophe is right there in the text announcing what happened.

## 3. A grammatical particle glued to the taught word (Korean, and every agglutinative language)

| taught | in the sentence | what attached |
|---|---|---|
| 여행 *(travel)* | 여행**을** | the object particle |
| 더 따뜻한 곳 *(somewhere warmer)* | 더 따뜻한 곳**에** | the place particle |

Not a variation at all: **the taught form is present, untouched, with a grammatically obligatory
particle on its right-hand end.** The sentence could not have been written any other way. Same
shape as the Arabic case ending — a case marker that happens to be spelled attached. The same will
be true of Japanese, Turkish, Finnish and Hungarian wherever they appear.

**What is not in this category:** 기억 *(remember)* drilled as 기억**해요**. That is the noun 기억
turned into the verb 기억하다 and then conjugated — a new part of speech, not a particle. Rejected
on the second read, and correctly a defect. **Particles: slack. 하다-verbing: defect.**

## 4. An enclitic pronoun welded onto an infinitive (Spanish, and Portuguese/Italian)

*por* **ayudar** taught; *muchas gracias por* **ayudarme** practised. The pronoun is joined to the
verb by spelling convention alone — in another tense it would stand as a separate word before it.
The taught form is intact and sits at the front of what the learner reads. One case in this
sample, but the pattern runs through every Romance course.

## Proposed and rejected

- **Greek "a conjugation differing only in the final vowel."** σιωπώ taught, σιωπά drilled. It
  looks like one vowel, but it is *I am quiet* versus *he is quiet* — a change of person and of
  meaning. **No slack.** The strict rule is doing exactly what it is for. It was the only Greek
  case in the sample, so Greek's 13 lessons now rest on nothing; treat them as unexamined.
- **Subject pronouns dropped** (Chinese 你, Portuguese *te*, Catalan *ho*). Several real defects are
  one small word from passing. They stay defects under your rule as written. If you ever want a
  fourth tolerance, that is where the next argument is — but it is a missing word, not a changed
  one, and it is a different kind of thing from the three above.

## And the slack you already granted, which the check still flags

Five of the 76 are cases your existing tolerances already cover. They are flagged only because the
mechanical check does not implement mutation or elision at all:

- **y fenga → 'r fenga** — Welsh, the article elides
- **diwrnod cyntaf → ar ddiwrnod cyntaf** — Welsh, soft mutation d → dd
- **bywiog → fywiog** — Welsh, soft mutation b → f
- **dinas → ddinas** — Welsh, soft mutation d → dd
- **jusqu'à ce que → jusqu'à ce qu'elle** — French, *que* elides

Roughly 45 of the 576 are this, about a third of the Welsh. They need no ruling from you, only code.

---

# SECOND: the lesson word is misspelled — Armenian, 13 of 14

Every Armenian case but one was the same thing: the sentences are correct Armenian and the
lesson's own word has a typo. The sentences do not need touching; the lesson word does.

| taught | should be | meaning |
|---|---|---|
| այսոր | այսօր | today |
| վստարովեր չեմ | վստահ չեմ | I'm not sure |
| օժուտակ | օգտակար | useful |
| ամևն | ամեն | everything |
| արկեն | արդեն | already |
| կեզ | քեզ | to you |
| կարկրում | կարծում | thought |
| րոպև | րոպե | minutes |
| կարկրում | կարծում | you think |
| ոգնել | օգնել | to help |
| ասեյի | ասեի | I would tell |
| կարեվորի | կարևոր | significant |
| երղար | երկար | long |

Most are one letter — ո for օ, կ for ք, ղ for կ — and two of them (կարեվորի) also break the **և**
ligature apart into ե+վ, which matters because that break *is* a legitimate spelling variant in
other contexts and should not be counted as a typo on its own.

**The one that is not a typo:** կարում *(can)*, drilled as կարող. կարում եմ is an attested
colloquial Eastern Armenian form, not a misspelling — so this is a lesson and its practice sitting
in two different registers of the same verb. Not a typo, and not the same form either. It is
counted as **Other** above, and it is the one Armenian case where a human who speaks the language
should decide which form the course means to teach.

Armenian owns 175 of the 576. On this sample about 93% of them are misspellings.

---

# THIRD: real defects — the word genuinely is not there

## German: not a rule problem, a build pattern

All twelve German cases read are one failure: the lesson teaches a phrase, and the practice set
drills only the easiest word in it — usually the word the learner already had.

| taught | what was practised instead |
|---|---|
| ich hatte **unrecht** | ich hatte / sie hatte / er hatte |
| **Nächstes Mal** werde ich | werde / ich werde / ich werde fragen |
| wenn ich dir nur **vertrauen** könnte | könnte / ich könnte / ich könnte es versuchen |
| warum wir hier **bleiben** mussten | mussten / wir mussten / sie mussten bleiben |
| ein gutes **Beispiel** | gutes / gutes Essen / das ist gutes Essen |
| nirgendwo **zu wohnen** | nirgendwo / er war nirgendwo |
| Sie **sprechen es, gnädige Frau** | sprechen / ich will auch sprechen |
| ich kenne **diese Leute** | Ich kenne sie nicht |
| **die** Zeit von allen | zeit von allen |
| **beim** nächsten Mal | nächsten Mal / ich erwarte jedes Mal |
| eine **Frau, die** | Die Frau die hier ist |
| **um** bitten | Warum bitten wenn du es selbst machen kannst |

Two footnotes. *um bitten* is a broken lesson word to begin with — German says *um etwas bitten* —
and the only place *um* occurs in its sentences is inside the word *Warum*. And *die Zeit von
allen* is the mildest in the set: only the article is missing.

## The same pattern elsewhere

| language | taught | practised | why it fails |
|---|---|---|---|
| Welsh (S) | mae'n ddrwg 'da fi | sentences about learning Welsh | not one sentence is related |
| Welsh anthem | pleidiol wyf i'm **gwlad** | pleidiol wyf i'm beirdd / cantorion | every sentence swaps the last word out |
| Welsh anthem | **beirdd** *(poets)* | bardd *(poet)* | singular drilled for plural |
| Welsh | teimlo fel gwneud **rhywbeth** | beth wyt ti'n teimlo fel gwneud? | the "something" became the question word |
| Greek | **σιωπώ** *(I am quiet)* | σιωπά *(he is quiet)* | a change of person |
| French | **elle a été** très gentille | elle est très gentille | present drilled for past |
| French | **zones** différentes | très différentes | the noun never appears |
| French | un **cœur** si gentil | si gentil / très gentil | the noun never appears |
| French | **je bouge ma tête** | bouger / essayer de bouger | infinitive only, no head |
| French | je peux vous aider **madame** | je peux vous aider aujourd'hui | the English side still says "madam" |
| Spanish | suficientes **palabras** | Suficientes cosas / amigos / personas | the noun never appears |
| Spanish | conozco a **un** hombre | Conozco a ese hombre | a different determiner |
| Spanish (MX) | este **idioma** | este es diferente | the noun never appears |
| Spanish (MX) | conocer a **alguien** | conocer / llegas a conocer | the pronoun never appears |
| Spanish (MX) | conoce a **tu hermana** | conoce a alguien | the object was swapped |
| Korean | 떠날 **준비** | 떠날 / 지금 떠날 | "ready" never appears |
| Korean | 뜻일 **수** | 뜻일 / 오늘 뜻일 | the modal never appears |
| Korean | **잊어버릴까** 봐 | 봐 / 봐 지금 | only the tail word survives |
| Korean | 차를 **좋아해요** | 차를 마시고 | "like" never appears |
| Korean | **여사님** 어떻게 생각하세요? | 선생님 어떻게 생각하세요? | the address term was swapped |
| Korean | **기억** *(noun)* | 기억해요 | turned into a conjugated verb |
| Chinese | 记住**整个句子** | 记住怎么说 / 记住一个词 | "the whole sentence" never appears |
| Chinese | 不**应该**指望 | 不要指望 / 不能指望 | a different modal each time |
| Chinese | 给我讲了**那个有趣的**故事 | 给我讲了故事 | the description is dropped |
| Chinese | **喝**点什么 | 点什么 / 多一点 | the verb never appears |
| Chinese | **你**学习中文多久了 | 你学习多久了 / 学习中文多久了 | every word appears, never all in one sentence |
| Chinese | **你**怎么付钱 | 怎么付钱 / 担心付钱 | the subject is dropped |
| Catalan | **ho** sento | sento | half the phrase, and only one sentence exists |
| Portuguese | **te** ajudaria | ela ajudaria / ele ajudaria | the pronoun is gone, the English keeps "you" |
| Arabic | **أن** تفكر بسرعة | تفكر بسرعة | the particle is dropped |
| Arabic | **لم يكن** أحد | لم يعرف أحد | a different verb |
| Arabic | **نبقى** هادئين | هم هادئين / الناس هادئين | "remain" never appears |
| Arabic | **قهوتك** جاهزة | إنها جاهزة | "your coffee" never appears |
| Arabic | هادئ | هادِئاً | tanwīn — the boundary case above |
| English (for Chinese) | Doesn't want | Wouldn't like to speak English | a different phrase entirely |
| Basque | ikasi | ikasten | a genuine change of verb form |
| Finnish | **pystyä** jatkamaan | pystynyt jatkamaan / en pysty jatkamaan | infinitive taught, participle drilled |

The last two are the rule working exactly as designed.

---

# How the 76 were chosen

Not hand-picked. All 576 were recomputed from live rows, bucketed by language, then within each
language split four ways — near-miss against word-level miss, crossed with early seeds against
late seeds — and cases taken at even intervals through each cell after sorting by course and seed
number. Whatever landed on those intervals is what was read, clear cases and murky ones alike.
German and Armenian had fixed quotas because you asked for them; the other quotas follow how much
of the 576 each language owns.

The result: **14 languages, 18 courses.** Armenian 14, German 12, Welsh 10, Korean 8, Arabic 8,
Spanish 6, French 6, Chinese 6, and one each from Catalan, Greek, English-for-Chinese, Basque,
Finnish and Portuguese. **Seeds range from 1 to 651.** 31 of the 76 are near-misses, 45 are
word-level misses.

Every case was read from the live lesson and practice-phrase rows. **No row was changed and
nothing was fixed.** Two independent second readers were then run over the riskiest calls — the
Armenian misspellings and the eleven rule-too-strict claims, both briefed to overturn them. They
overturned three of the eleven and one of the fourteen, and every overturn is reflected above.

# How far to trust the extrapolation

- **Armenian and German — trust it.** 13 of 14 and 12 of 12 on a single failure mode each, and both
  modes are mechanical enough that variation would be a surprise. Armenian's 175 are misspellings;
  German's 68 are the drill-the-easy-word build pattern.
- **Welsh, Korean, Arabic — the direction is right, the exact split is not.** 8–10 cases each, and
  each language mixes two or three modes, so a split could move ten points either way.
- **Greek rests on nothing.** Its single case was overturned. Its 13 lessons are unexamined and are
  counted as real defects on no evidence.
- **Italian's 9 cases were not sampled at all** — the small-language quota landed elsewhere. Also
  counted as real defects on no evidence.
- Overall: the two big proportions — real defects and misspellings — are good to roughly ±5 points.
  The two small ones are good to maybe ±10, because they rest on the languages with the thinnest
  samples. The one thing the sample says with real confidence is the **shape**: this is not one
  problem. It is a spelling problem in Armenian, a build-pattern problem in German, a
  not-implemented-tolerance problem in Welsh, and a genuine defect everywhere else.
