# The yoruba leak was 47 rows in 10 courses — and it is one of three language-name defects

**2026-08-19 · Kai's fix-and-sweep · course_seeds**

Kai reported 9 contaminated rows in 2 courses. The sweep found **47 in 10**, all from one
9-second batch run, plus two further defects of the same shape that nobody was looking for.
The 47 are fixed. 20 more rows are **not** fixed because they are already voiced, and I do not
cascade a text edit into recorded audio without saying so first.

---

## 1. What was wrong

A batch translation run put the word for **Yoruba** where each course's own language name belongs.

> "She speaks Friulian" → `e fevele yoruba`
> "She speaks Romansh" → `ella discurra joruba`

Spelling varied by language — `yoruba`, `joruba`, `jorubagiela`, Yiddish `יאָרובאַ` — which is why a
single-string search undercounts it.

## 2. The batch is now established, exactly

All ten contaminated courses were created in **one run on 2026-07-07, between 09:18:30 and 09:18:39Z** —
668 seeds each, one course per second:

`cor` → `roh` → `sme` → `yid` → `nap` → **`pdc`** → `fur` → `lmo` → `scn` → `vec` → `rgn`

That run had **eleven** members. Ten are contaminated. **`pdc_for_eng` (Pennsylvania Dutch) escaped** —
all fourteen of its language-name seeds correctly say `Deitsch`. So the batch is the boundary of the
defect, and it is now fully enumerated. No course outside that 09:18:3x window carries the yoruba leak.

The `*_for_cym` run 76 minutes later (09 courses, 10:34:57Z) is clean.

## 3. Confirmed and FIXED — 47 rows, 10 courses

Every replacement is **attested in a clean sibling seed of the same course** (seeds 1/4/9/13/14/15/22/33
say the same thing correctly). Nothing below was invented, and no minority-language spelling was
normalised — the Yiddish token is byte-identical to the one already in seed 22.

| Course | Seeds | Wrong | Right |
|---|---|---|---|
| `cor_for_eng` Cornish | 283, 285, 286, 297 | `Yoruba` | `Kernewek` |
| `fur_for_eng` Friulian | 283, 285, 286, 297 | `yoruba` | `furlan` |
| `lmo_for_eng` Lombard | 283, 285, 286, 297 | `yoruba` | `lombard` |
| `nap_for_eng` Neapolitan | 160, 283, 285, 286, 297 | `yoruba` | `napulitano` |
| `rgn_for_eng` Romagnol | 160, 283, 285, 286, 297 | `yoruba` | `rumagnôl` |
| `roh_for_eng` Romansh | 160, 283, 285, 286, 297 | `joruba` | `rumantsch` |
| `scn_for_eng` Sicilian | 160, 283, 285, 286, 297 | `yoruba` | `sicilianu` |
| `sme_for_eng` N. Sami | 160, 283, 285, 286, 297 | `jorubagiela` / `jorubagillii` | `davvisámegiela` / `davvisámegillii` |
| `vec_for_eng` Venetian | 64, 160, 283, 285, 286, 297 | `yoruba` | `vèneto` |
| `yid_for_eng` Yiddish | 283, 285, 286, 297 | `יאָרובאַ` | `ייִדיש` |

**`yid_for_eng` and `vec_for_eng` were not in the original report.** Yiddish was invisible to any Latin
search; Venetian carried a sixth row at seed 64.

Sample before/after:

| | before | after |
|---|---|---|
| `fur` 285 | `e fevele yoruba` | `e fevele furlan` |
| `roh` 160 | `co di ins quest pled per joruba?` | `co di ins quest pled per rumantsch?` |
| `sme` 285 | `son hupmá jorubagiela` | `son hupmá davvisámegiela` |
| `vec` 64 | `inparar yoruba no xe fàsiłe ma xe divertente` | `inparar vèneto no xe fàsiłe ma xe divertente` |
| `yid` 285 | `זי רעדט יאָרובאַ` | `זי רעדט ייִדיש` |

Northern Sami is worth a note: the corruption **preserved the correct case suffixes** (`-giela`
accusative, `-gillii` illative) and swapped only the stem, so the fix is stem-only and the grammar
was never wrong.

**Blast radius: nil.** All 47 rows were `draft`, unapproved, undecomposed, with 0 legos, 0 practice
phrases and 0 audio ids. No clip anywhere in the estate spoke the word. Kai's timing was right —
this cost nothing today and would have been a re-record next month. Post-fix residue across
`course_seeds`, `course_legos`, `course_practice_phrases` and `course_audio`: **zero**.

## 4. Also fixed — the same bug firing inside ordinary English words

`bre_for_eng` and `sbx_for_eng`, seeds 446 and 541. The language name was substituted into the middle
of words that merely started with `bre`:

| | before | after |
|---|---|---|
| 446 | `they won't be able to **Bretonak** that window` | `...to break that window` |
| 541 | `it's a good idea to try and **Bretonathe** slowly` | `...to breathe slowly` |

This is the known **side** — English. The Breton targets were always correct (`terriñ`, `analañ`), and
five sibling courses confirm the English. Both rows draft, zero blast radius.

## 5. NOT fixed — 20 rows that are already voiced ⛔

Seeds **283/285/286/297 again**, this time with an untranslated English placeholder left in the
Japanese known side (and in `zho`, also the Chinese target side):

| Course | known side reads | should read |
|---|---|---|
| `deu_for_jpn` | `Germanを話す友だち、誰がいる？` | `ドイツ語` |
| `fra_for_jpn` | `Frenchを話す友だち、誰がいる？` | `フランス語` |
| `ita_for_jpn` | `Italianを話す友だち、誰がいる？` | `イタリア語` |
| `spa_for_jpn` | `Spanishを話す友だち、誰がいる？` | `スペイン語` |
| `zho_for_jpn` | `Chineseを話す友だち…` **and** target `她会说Chinese。` | `中国語` / `中文` |

`por_for_jpn` is clean (`ポルトガル語` throughout), so this is 5 courses, not 6.

**I stopped on these rows.** Unlike the 47, they are `released`, decomposed, mostly approved, and voiced:

- **20 seed rows**
- **29 legos**, **208 practice phrases**
- **29 seed-linked audio clips** already rendered — 21 known-side (a Japanese sentence with the English
  word "German" spoken in the middle of it) and 8 `zho` target clips saying "Chinese" in Mandarin

Every correct replacement **is** attested in the same course's seeds 1/4/9/…/160, so the text fix is not
in doubt. What needs Kai's call is the audio: this is a presentation-mirrors-LEGO situation, so the text
edit obliges the matching clip fix in the same pass, and that is a re-render, not a free edit. **No audio
row was deleted or unlinked.** Recommend: queue an audio pass, then fix text and clips together.

## 6. Could not resolve — for Kai ❓

**`cym_for_yor`, 14 rows (seeds 1, 4, 9, 13, 14, 15, 22, 33, 64, 160, 283, 285, 286, 297).** The Yoruba
known side reads `èdè Welsh` — the English exonym sitting inside Yoruba text, e.g.
`Mo fẹ́ láti sọ èdè Welsh pẹ̀lú rẹ báyìí`. The Welsh targets are correct throughout.

**I do not know the Yoruba word for Welsh and I am not going to invent one.** Yoruba borrows language
names (`èdè Gẹ̀ẹ́sì` English, `èdè Faransé` French), so a form probably exists, but nothing in this
estate attests it and an invented word is worse than a hole. This needs a Yoruba speaker.

Blast radius if it is fixed: seeds 1, 4 and 9 are released and decomposed — **10 legos, 57 practice
phrases** — though no audio ids are set. Seeds 13 onward are draft and free.

## 7. Adjacent defects found by the same sweep (reported, not touched)

- **`hye_for_eng` 283/285/286/297** — the Armenian *is* its own language name, but misspelled:
  `հաերենի` for `հայերեն` (missing յ, wrong ending). The surrounding text is corrupt too
  (`Կո յնկերներից վորքյ են խոսում`). Consistent with the standing note that hye legos are corrupted.
  This is a spelling/corruption defect, not a wrong-language one, so it is out of this pass's scope.
- **`gle_cn_for_eng`** seeds 64, 160, 283, 285, 286, 297 and **`sbx_for_eng`** seeds 22, 33, 64, 160,
  283, 285, 286, 297, 446, 541 have **empty `target_text`**. Nothing to contaminate — but nothing to
  learn from either.
- **`fra_for_jpn` seed 1** — the language name is missing from *both* sides:
  `今話したいです。` / `Je veux parler maintenant.` Every sibling course names the language here.

## 8. Rejected candidates — why a raw hit count is not a finding

The detectors produced ~150 more hits. Every one was checked; all are innocent. The instructive ones:

| Hit | Course | Why it is fine |
|---|---|---|
| `Deitsch` ×14 at exactly the yoruba seed numbers | `deu_at_for_eng` | The most convincing false positive in the whole sweep — same 14 seeds, matches the Pennsylvania Dutch endonym. It is simply the Austrian spelling of *Deutsch*. Correct. |
| `Italia` / `Italien` / `イタリア` at seed 462 | ~40 courses | "My grandfather fought in **Italy** during the war" — a country, in every language. |
| `fins` ×15 | `cat_for_*` | Catalan for "until". |
| `hakkan` ×17 | `est_for_eng` | Estonian "I'm going to". |
| `sami` / `visâmi` | `ces`, `pol`, `srp`, `hrv`, `fur` | Slavic "themselves"; Friulian "remember myself". |
| `russo` | `nap_for_eng` | Neapolitan for **red**, not Russian. |
| `thair`, `thaispeáint` | `gle`, `gla` | Irish/Gaelic verb forms, not Thai. |
| `urduri` | `eus_for_*` | Basque for "nervous". |
| `Afrikaans` ×14 | `afr_for_eng` | Endonym and exonym are the same word. |
| `hrvatskom`, `srpskom`, `suomeksi`, `Türkçede`, `Gymraeg`, `euskaraz`, `i nGaeilge` | many | The own language name, correctly **inflected** — which is exactly why the detectors require only a left word boundary. |

And the honest counter-case Kai asked about: **`yor_for_eng` legitimately says Yoruba** in 14 seeds, 2
legos and 88 practice phrases. It is a Yoruba course. Untouched.

## 9. How it was found — four independent detectors

Calibration first: no number in this document comes from a detector that could not re-find Kai's
original 9 rows. All four found them.

1. **Cross-language** — target names a language the known side does not.
2. **Missing-own** — known side names the course's own language, target does not.
3. **Placeholder** — an untranslated English language name inside non-English text. *This one found
   the `*_for_jpn` family, which the other three missed.*
4. **Self-calibrating** — learns each course's own language-name token from its clean reference seeds,
   then checks the 64/160/283/285/286/297 cluster carries it. No pattern table, so it can catch names
   nobody wrote a pattern for.

The four converge on the same 47 rows. Committed with their traps documented at
`tools/language-name-contamination/`.

Three traps worth carrying forward, because each one silently hides real hits:

- **JS `\b` is ASCII-only, and a `\p{L}` lookbehind wrongly rejects CJK/Thai/Arabic** — they have no
  spaces, so `说中文` fails a naive boundary test. This is why the Chinese placeholder nearly escaped.
- **Language names inflect**, so only a *left* boundary can be required. Demanding a right boundary
  hides `davvisámegillii`, `hrvatskom`, `Gymraeg`.
- **Alternation order matters**: `/sicilian|sicilianu/` matches the short branch, fails the boundary
  check, and never tries the long one.

## 10. State after this pass

| | rows | status |
|---|---|---|
| yoruba/joruba contamination | 47 | **fixed**, residue zero, blast radius was nil |
| `Bretonak` / `Bretonathe` | 4 | **fixed** |
| `*_for_jpn` English placeholder | 20 | **not fixed** — voiced; needs an audio pass first |
| `cym_for_yor` `èdè Welsh` | 14 | **not fixed** — correct Yoruba word unknown |
| `hye_for_eng` corruption | 4 | reported, separate defect |
| empty `target_text` | 16 | reported |

Editing seed text unapproves the seed — intended, and in this case moot: all 51 edited rows were
already `draft` and unapproved. No audio row was deleted, unlinked, or re-rendered.
