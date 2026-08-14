# A-108 — done card

Tom's ruling of 2026-08-14 applied across the estate's pod translations.

## What landed

**423 text edits, all verified live in Supabase by re-query.**

- **344 draft edits across 27 courses** — register and gender on staged translations.
- **79 released rows** — every gender-slash annotation and stage direction removed.

**Rule 1 is now clean estate-wide: zero annotations remain in `listening_pod_sentences`**,
drafts and released alike. The 4,852 drafts stay flagged as drafts — a register fix is not
a human proofread, so nothing was silently promoted.

## The three rules, as they actually fell out

**Rule 1 (no annotations) had no work in the drafts.** Zero of 4,852 staged lines carried a
mark, across eight mark classes. Every annotation in the estate was in older released,
audio-backed content — the opposite of where the plate item pointed.

**Rule 2 (gender matches the speaker) resolved from the cast, not the stale field.** Eight
courses carry `gender:'n'` on the Learner; all eight are cast with `eve`, `ara` or
Aleksandra, female across 120 gendered entries. Biggest single finding: **Thai, 85 lines
written in a man's voice** (`ครับ` 99 times, `ค่ะ` zero) for a mostly-female cast — and the
course's own non-draft rows already did it correctly, so the drafts were the regression.

**Rule 3 (tu by default, polite where context demands) inverted.** Too-formal was nearly
absent. The real fault was **too-informal in service scenes, running by whole language**:
Dutch `wil je de menukaart?` to a barista, Bulgarian `Ето кафето ти`, Italian `Ecco il tuo
caffè`, a Romanian *waiter* asking `Mai ai loc de desert?`, Catalan `Aquí ho tens` from a
taxi driver.

Per language: tha 85, ron 39, nld 33, cat 26, ita 21, bul 20, pol 15, por_br 12, por 10,
ara_eg 15, hin 14, ukr 8, ara_sy 9, ara 7, fin 4, lit 4, heb 3, hrv 3, hye 3, lav 3,
spa_mx 3, deu_at 1, isl 1, tur 1, zho 1, nep 1.

**Six languages correctly changed nothing**, and those zeros are facts about the languages:
Irish has no T-V distinction; Nordic `De`/`Ni` died with the du-reform; Japanese and Korean
have a politeness axis rather than a T-V pair; Basque `zu` is the standard form; Swahili and
Hebrew have no T-V at all.

## The released clips

All 39 whisper-decoded. **In 38 of 39 the synthesiser reads both gendered forms aloud** —
`jak się pan pani ma`, `będzie Pan, Pani musiał, musiała`, `Esmu pārsteikts, a`,
`obrigada-a`, `fico cansado a`. The text-only branch was never available.

Text is corrected. **Audio is not rendered**, for two reasons:

1. **The render reads `course_audio.text`, not the pod row** — so correcting the pod text
   alone would have re-rendered the same broken words. Those 39 clip texts need syncing.
2. **One collides.** `ara_for_eng`'s bartender line resolves to `مساء الخير. عايزة إيه؟`,
   which already exists as a separate clip on the same course, language, role and voice.
   The unique index cannot hold both. That row is a **relink**, not a render.
3. **`accept` requires `--i-have-listened`** — a human attestation. Nothing rendered,
   nothing billed, no clip deleted.

## Open, not actioned

- **The non-draft pocket.** Every worker hit it independently: Dutch 49 lines / 28 clips,
  Icelandic and Greek scene 22 masculine under female voices, Thai six more `ผม` lines,
  Estonian scene 10 left half-polite. Same shape as the 39.
- **The Thai cast cannot name half its speakers.** `Customer 1/2/3` and `Passenger` have no
  entry in `listening_pods.speakers`, so phase 8 drops them to `_default` = Krit, male. 18
  rows written female would render male. A cast fix, needed before `tha` pod-0 renders.
- **`ara_sy` runs the other way** — drafts were feminine, its Learner is cast male
  (`ar-SY-LaithNeural`). Nine fixes went feminine→masculine. If a female persona was
  intended, the fix is recasting and reverting those nine.
- **Addressee agreement is a second axis.** Rule 2 names the speaker; lines like
  `Jesteś bardzo miły` describe the *addressee*. Resolvable where a scene partner exists,
  not in solo practice scenes.
- **`course_audio` carries parenthetical/slash text on tens of thousands of non-pod rows**
  (hin 1,326, swa 1,231, nep 1,169) — a mix of real breaches and regex false positives,
  well outside A-108.
