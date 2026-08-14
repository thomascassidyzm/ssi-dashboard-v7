# A-108 — hrv, bul, ukr, pol: what was wrong and what was written

459 staged draft lines examined line by line against the cast, the scene canon and the
released lines around them. **46 rows changed. Every one is still `target_text_draft = true`.**

| Course | Drafts examined | Register | Gender | Annotations | Total |
|---|---|---|---|---|---|
| bul_for_eng | 109 | 15 | 5 | 0 | **20** |
| pol_for_eng | 123 | 9 | 5 (+1 shared) | 0 | **15** |
| ukr_for_eng | 109 | 0 | 8 | 0 | **8** |
| hrv_for_eng | 118 | 2 | 1 | 0 | **3** |
| | **459** | **26** | **20** | **0** | **46** |

One pol row (`SC22-S001`) carried both faults and is counted once in each of the two limbs
and once in the total. Row-by-row before/after/reason: `docs/a108/hrv-bul-ukr-pol-applied-log.json`.
Applied by `docs/a108/hrv-bul-ukr-pol-apply.sql` — before-state assertion per row, abort on
drift, dry-run rolled back first, `target_text_draft` never touched.

## Annotations: nothing to do, and that is measured

Zero of the 459 drafts carry a slash form, bracket, paren or gloss. I ran the detector over
eight mark classes, not just `/`. This confirms the FINDINGS reading: the annotation defect
lives in **released, audio-backed** content, not in the staged drafts.

It is very much alive in `pol_for_eng`'s released lines, and it is worse than a count
suggests — the pattern is `Pan/Pani` in almost every service scene, plus stacked forms like
`był Pan/była Pani bardzo pomocny/pomocna` (s10.7) and `Nie jestem pewny/pewna, czy jestem
głodny/głodna` (s8.12). Those are out of this job's scope by the brief and are named in the
open items below.

## Gender: the cast resolved every speaker, no guesses needed

All four pods have a fully populated cast and **the Learner is female in all four** —
Kalina (bul), Polina (ukr), the ElevenLabs Sarah voice (hrv), Aleksandra (pol). `pol` is one
of the eight courses carrying the stale `gender:'n'` on the Learner; its voice is
`1b12d5daee6b`, so it resolves feminine exactly as the brief predicted.

The 20 gender fixes are all Slavic l-participles and predicate adjectives written masculine
under a female voice: `рекао→рекла`, `сигурен→сигурна`, `прав→права`, `щастлив→щастлива`,
`притеснен→притеснена`, `нервен→нервна`, `впевнений/зрозумів→впевнена/зрозуміла`,
`правий→права`, `щасливим→щасливою`, `дурним→дурною`, `хотів→хотіла` ×3,
`сказав→сказала`, `pewien/zrozumiałem→pewna/zrozumiałam`, `szczęśliwy→szczęśliwa`,
`zmartwiony→zmartwiona`, `powiedziałem→powiedziałam`, `zdenerwowany→zdenerwowana`.

Two of these are not the Learner: `ukr` **Customer 1** is voiced Polina (f) and orders
`Я б хотів` in two draft lines. Fixed to `хотіла`.

One is an addressee, not a speaker: `pol SC02-S004` says `Czy może mi **Pan** powiedzieć` to
the Passenger, and the Passenger in that pod is voiced Aleksandra. The honorific names the
person being spoken to and the cast settles it → `Pani`. I treated this as in-scope because
it is the same defect class — a gendered form contradicting a voice in the cast — and it is
resolvable without judgement.

**Left alone deliberately:** lines whose gendered word describes the *addressee* where the
cast cannot settle who that is — the scene-20 thank-you block in all four courses
(`pomogao` / `ljubazan`, `мил` / `приятелски настроен`, `допоміг` / `добрий`, `miły`).
These are solo practice lines with no cast member on the other side. Masculine default
stands; changing them would be a guess, not a resolution. 16 rows in total.

## Register: bul was the broken one, ukr was already right

**bul_for_eng — 15 fixes, the real defect in this batch.** Bulgarian service dialogue was
running on `ти`. A barista handing over coffee said `Ето кафето ти`, a pharmacist
said `Опитай`, a receptionist said `в стаята ти`, a local giving directions to a tourist
said `Продължи`, and the customer asked the pharmacist `можеш ли да ми препоръчаш`. All
moved to `Вие`. Eight more are staff-voiced practice lines in scenes 17 and 21 — a
receptionist asking a guest `Искаш ли да платиш` is the same fault in solo-practice clothing.

**pol_for_eng — 9 fixes.** Same shape: bartender `Będziesz dzisiaj jeść?`, pharmacist
`Spróbuj`, local `Idź prosto` / `skręć`, and three staff-voiced payment questions in scene 17.
The polite replacements are all gender-free by construction — `Proszę + infinitive` for
imperatives, `Państwo` for the plural guest party — so no annotation was needed to carry
both genders.

Polish also had the **opposite** fault: scene 22 is the Friend scene, its released lines are
all `ty` (`ciebie`, `radzisz sobie`, `tobą`, `twoją`), and two staged drafts had been written
in `Pan`. Those two went to T.

**ukr_for_eng — 0 register fixes. The previous agent's pass holds.** I checked every service
scene and every practice line: service dialogue is uniformly `ви`, peer scenes 1, 4, 5 are
uniformly `ти`, the staff-voiced practice lines in 17 and 21 are `ви`, and the conversational
ones in 19–22 are `ти`. That is Tom's rule applied correctly, including the exception clause.
Its gap was gender, not register — 8 rows, now fixed.

**hrv_for_eng — 2 fixes,** both peer scenes written formal: `SC06-S001` (`Kako se zovete?`
opening a scene whose other ten released lines are all `ti`) and `SC22-S001` (`s vama` in the
Friend scene).

### The line I drew in scenes 15–21, stated so you can overrule it

Solo practice lines have no cast on the other side, so I applied one rule: **flip T→V only
where the speech act is unambiguously service — asking a shop a price, asking where the
toilet is, or a staff-voiced payment/order question. I did not flip V→T anywhere in these
scenes.** A practice line in V is never *wrong* — the imagined addressee can legitimately be
a stranger — whereas T aimed at a bartender is wrong. So conversational lines about speaking
speed, thanks and kindness stayed T (Tom's default) even where a sibling language rendered
them V. That asymmetry is deliberate; it keeps the edit minimal and reversible.

## Confidence, honestly

- **Polish, Ukrainian, Croatian: confident.** The faults are structural — pronoun/verb
  register forms and l-participle/adjective agreement — not idiom or taste. Every replacement
  is a standard form, and I checked each against the released lines around it.
- **Bulgarian: confident on all 20.** Bulgarian carries the same two structures (`ти`/`Вие`
  clitics and gendered participles), and the fixes are the ordinary polite paradigm.
- **What I am NOT claiming:** that any of these lines are the *best* phrasing a native would
  choose. I fixed defects against Tom's three rules; I did not restyle. Where a line reads a
  little textbook, I left it.
- **No line was left unresolved for want of judgement.** The only things left standing are
  the 16 addressee-gender lines above, which are unresolvable in principle, not by me.

## Open items — outside this job's scope, someone should take them

1. **`pol_for_eng` released lines are full of `Pan/Pani` annotations.** ~49 rows, 25 distinct
   clips, publicly-visible beta. Every one violates rule 1, and s10.7 / s8.12 stack two
   slash-forms in a single sentence. Needs Tom's approval to re-render.
2. **Three scenes are now register-split between drafts and released lines**, and I could not
   close them because the released rows are out of scope:
   - `bul` scene 3 — the drafts I fixed to V sit next to released barista lines still on `ти`
     (`Какво мога да ти донеса?`, `Искаш ли нормално или голямо?`).
   - `ukr` scene 22 — the previous agent's drafts are T (correct for a Friend scene); the
     released remainder is V. The learner hears the Learner say `ти` and the Friend answer `вас`.
   - `pol` scene 1 — a Neighbour is greeted with released `Jak się Pan/Pani ma?`.
3. **`ukr` Customer 1 is masculine in six released lines** under a female voice (`Я б хотів`,
   `Я не впевнений`), the same defect I fixed in its two drafts.
4. **The Learner is masculine throughout the released scene 22 in all four courses**
   (`Nisam siguran`, `Не съм сигурен`, `не дуже впевнений`, `Nie jestem pewien`,
   `szczęśliwy`, `радий`, `сретан`) under a female voice. That is the largest single pocket
   of the gender defect left in these four courses, and it is entirely in released text.

No audio was generated. Nothing outside `target_text_draft = true` was touched.
