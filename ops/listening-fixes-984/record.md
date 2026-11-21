# Kai's listening notes: before and after (cs #984·AI, 19 Nov 2026)

Kai's message, 19 Nov, about 13:19Z, with the 13:21Z amendment on Janes. Spend: **516 Cartesia characters** of the 10,000 cap, plus **24 Azure characters** (free). Every write was pre-checked against the live row and went through a Popty route as `kai-984`. Listening page (15 clips, UNHEARD): https://watson-1.tail4968cb.ts.net:10000/d/045ff4b9

## A1. Sister-course slots #695 linked instead of rendering

#695·AI and its children #698/#702 linked 41 slots to existing clips (library hits, EXISTS_IN_LANGUAGE, one spliced intro). Their voices were looked up with `tools/audio/clip-voices.cjs`; the files are `linked-slots.json` and `linked-voices.json`.

- **Off-cast: 3 slots, all in spa_mx_for_eng.** That is under the 25 threshold, so all 3 were re-rendered in the Cartesia cast voice with Kai's approval token (it is the EXISTS_IN_LANGUAGE grant). Each new clip was verified alive, then relinked with `replace` + `expectCurrent`. Link event **f081340d**. 79 chars.

| row | role | before | after |
|---|---|---|---|
| S0090L03U05 *sería bueno practicar más* | target1 | dd64d763, Azure es-MX Carlota | **37c5cbed**, cartesia_5c5ad5e7 (cast) |
| S0090L03U05 | target2 | 85a43dd2, Azure es-MX Luciano | **9836e034**, cartesia_3a35daa1 (cast) |
| S0402L01U04 "we want to stop somewhere now" | known | 4961357a, xai_gfzdpspr5fdp | **2a4d4ee0**, cartesia_d293d509 (cast) |

The Azure phrase Kai heard was almost certainly S0090L03U05.

- **Azure, but this is the course's cast: ara_lb_for_eng seed 64 target1 and target2** (d05cc043 Layla, d2cfaf63 Rami). ara_lb's render cast is itself Azure: all 30 of #698's fresh ara_lb renders came out Layla/Rami. Kai said whole-course switches can wait, so nothing was done and nothing was queued.
- The other 36 linked slots are already in the course's cast voice. That includes the zho_for_hin library hits, which are in the zho Cartesia voices.

## A2. Gender prep

- **Systemic, yes.** `POST /api/audio/render` (`services/shared/audio-render-entry.cjs`) has no gender lookup. Only the phase8 basket generator applies `expandForVoice`. #695 sent the plain row text, so every render-route fill of a line whose speaker gender is marked comes out male in the female seat. The same cause was found in #129/#130.
- Also, none of #695's new texts has a `course_gender_expansions` row. spa_mx's newest row is from 20 Jul, so the edit-batch path does not create them either.
- **Found and fixed: 8 female target1 clips** (7 spa_mx, 1 ara_lb). Each was re-recorded in place, the #130/#142 method: same clip id, revision 2, `spokenText` set to the female form, row text unchanged. Each one was checked serving its new S3 object. 368 Cartesia + 24 Azure chars. Ids are in `gender-render.jsonl`.
  - spa_mx: *no me siento **lista** …* ×3 (S0115L02U06; S0115L03U03 = seed 115; S0115L03U04), *no estoy **lista** …* (S0088L01U05), *estoy **nerviosa** …* (S0147L03U08), *estoy un poco **cansada*** (S0055L01U06), *estoy **emocionada** …* (S0122L02U07 = seed 122).
  - ara_lb: *مبسوطة لأنك ساعدتني أفهم* (S0074L03U03, *mabsoota*, "I'm glad").
  - fra_ca's 5 target1 texts (*on veut se voir …*) have no gendered form. deu and zho do not mark speaker gender on these rows.

## B1. deu_for_eng "am" (S0626L02)

- **Before:** LEGO "am | bin", NEW, in seed 626 *no, I'm not thirsty, thank you → nein, ich bin nicht durstig, danke*. Intro: "The German for 'am', as in 'I am also here', is:".
- **Verdict: not acceptable.**
  - Canon **K26** (HARD): a person-marked target verb carries its pronoun on the known side, and *bin* is only ever "I am".
  - Canon **L2**: a LEGO must not be "too small to be meaningless".
  - The cut also left *ich* covered by no LEGO (**L27**).
- **After:** shortest cut, re-glossed in place to **"I'm | ich bin"** (event **f5a0956c**). LEGO and B01 changed.
  - Clips: known ebc84298 (library), target1 343a5435 / target2 fbf85cdf (library, deu cast), new intro **ae7a3832** "The German for: 'I'm', is:" (69 chars). The "as in" crutch is gone.
  - No other deu LEGO has the known "I'm", so there is no ZUT clash.
  - The 8 other phrases (*I am happy | ich bin glücklich* …) already contain *ich bin*. No tiles named the LEGO.
- **Held: the "not | nicht" gap in seed 626.** *nicht* has no LEGO here. It is taught at S0010L01, and S0213L03/S0241L04 already carry it not-new. Adding it is `lego.insert`, which is structural on a released course and needs `tom_go`.

## B2. "Janes" (S0635/S0636, 28 clips from #519): no change

- **Spelling:** *Janes Tasche* is correct. Under the official rules (Rat für deutsche Rechtschreibung, 2024 §80; formerly §97 E) a genitive name takes no apostrophe, *Evas Mutter*. The apostrophe form (*Eva's Blumenladen*) is only allowed when the whole phrase is itself a name, such as a shop sign, and the apostrophe-only genitive (*Hans'*) is only for names ending in an s-sound. So *Jane's* or *Janes'* would be wrong here. Sources: dewiki "Apostroph" (quoting the 2004 and 2024 rules), https://www.dewiki.de/Lexikon/%27 ; Rat für deutsche Rechtschreibung, Regelwerk, https://www.rechtschreibrat.com/DOX/regelwerk2004.pdf
- **Sound:** "Jane" is the English name, [dʒeɪn] (de.wiktionary "Jane"). German has no [eɪ] diphthong. Duden writes English loans with a narrow [ɛɪ̯] (e.g. *Mail* [mɛɪ̯l], duden.de/rechtschreibung/Mail), and in everyday speech it flattens to a long [eː]. So [dʒeːns], the "Jeens" Kai hears, is a normal German reading.
- What #519 fixed is still right: the LEGO no longer says English "Jane's" and the other rows no longer say "Yanes".
- **Conclusion:** no clear evidence it is wrong, so per Kai's 13:21Z amendment nothing was re-rendered.

## Gaps

- clip-page.cjs has no autoplay, so the listening page needs a press per clip.
- The "not | nicht" LEGO for seed 626 needs `tom_go`.
- The render route's missing gender lookup is systemic. Future render-route fills in gendered courses need the female text sent by hand.
- No audio-pass request was queued: there is no Popty route for it, and no row is silent.
