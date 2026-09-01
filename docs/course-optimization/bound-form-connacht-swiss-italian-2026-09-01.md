# Connacht Irish, Swiss German and the Italian check — bound-form repair

*2026-09-01. The three courses done directly rather than by a family worker, as part of the 19-course pass. Synthesis and the other sixteen courses: `bound-form-licensor-repair-19-courses-2026-09-01.md`.*

---

## `gle_cn_for_eng` — Connacht Irish (done first, on Kai's reasoning: no audio, so free now and expensive later)

**Repair case 2 throughout — correct the form. No boundary moved.**

Nine LEGOs stored an Irish initial mutation *inside the chunk's base form*. The mutation is
only correct after the trigger that happened to precede the chunk in the seed sentence, and the
trigger sits outside the chunk. Eighteen practice phrases then used those chunks
**sentence-initially, with no trigger at all** — which is simply wrong Irish.

### Why case 2 and not case 1 (merge the licensor)

The course itself has already decided. It teaches the **unlenited citation form** elsewhere and
lets context do the mutating:

| The course's own attested citation | phrases using the mutated form in a *licensed* position |
|---|---|
| `S0264L01` "old man" = **seanfhear** | 23 |
| `S0265L01` "a friend" = **cara** | 132 |
| `S0047L03` "to make mistakes" = **botúin a dhéanamh** | 19 |
| `S0276L01` "to stay" = **fanacht** | 10 |
| `S0148L01` "he wasn't very patient" = `ní raibh **mórán** foighde aige` | — |

So the nine defective LEGOs are the minority slips, not the rule. Putting them back to citation
form is what the course already does everywhere else, and it needed no boundary redraw: no lego
index moved, no phrase id was reissued, no learner-progress migration was owed.

### The nine LEGOs

| LEGO | known | was | is now |
|---|---|---|---|
| S0046L02 | making mistakes | **bh**otúin a dhéanamh | botúin a dhéanamh |
| S0082L02 | to wait for you | **fh**anacht leat | fanacht leat |
| S0220L02 | a bit of television | **ph**íosa den teilibhisean | píosa den teilibhisean |
| S0231L01 | an old man | **sh**eanfhear | seanfhear |
| S0232L01 | an old woman | **sh**eanbhean | seanbhean |
| S0233L02 | a young woman | **bh**ean óg | bean óg |
| S0236L02 | to try to help | **dh**éanamh iarracht cabhrú | déanamh iarracht cabhrú |
| S0284L02 | my sister's friend | **ch**ara le mo dheirfiúr | cara le mo dheirfiúr |
| S0297L01 | many people | **mh**órán daoine | mórán daoine |

### The eighteen phrases that were actually wrong Irish

Each of these stood sentence-initially with nothing to license the mutation. Every *licensed*
occurrence (`ar sheanfhear`, `faoi bhotúin a dhéanamh`, `ag goil a fhanacht leat`,
`ar mhórán daoine`, `ar chara le mo dheirfiúr`) was left exactly as it was — those are correct.

| id | English | was | is now |
|---|---|---|---|
| S0231L02B01 | an old man who wanted to learn | sheanfhear a bhí ag iarraidh foghlaim | seanfhear a bhí ag iarraidh foghlaim |
| S0231L03B03 | an old man who wanted to ask for help | sheanfhear a bhí ag iarraidh cabhair a iarraidh | seanfhear … |
| S0232L02B02 | an old woman who can work | sheanbhean atá in ann obair | seanbhean atá in ann obair |
| S0233L03B01 | a young woman who knows your sister | bhean óg a bhfuil aithne aici ar do dheirfiúr | bean óg … |
| S0233L03B02 | an old woman who knows your sister | sheanbhean a bhfuil aithne aici ar do dheirfiúr | seanbhean … |
| S0234L04B02 | an old man who works with your sister | sheanfhear atá ag obair le do dheirfiúr | seanfhear … |
| S0235L02B02 | an old man who said something | sheanfhear a dúirt rud eicínt | seanfhear … |
| S0235L02B03 | a young woman who said something new | bhean óg a dúirt rud eicínt nua | bean óg … |
| S0235L03B03 | an old man who said that he wanted to learn | sheanfhear a dúirt go raibh sé ag iarraidh foghlaim | seanfhear … |
| S0236L01B02 | an old woman who said that she was going to tell me | sheanbhean a dúirt … | seanbhean … |
| S0236L01B03 | a young woman who said that she was going to tell me | bhean óg a dúirt … | bean óg … |
| S0284L02B01/B02/B03 | my sister's friend now / again / today | chara le mo dheirfiúr … | cara le mo dheirfiúr … |
| S0284L02C01 | friend | chara | cara |
| S0297L01B01/B02/B03 | many people today / here / who speak Irish | mhórán daoine … | mórán daoine … |

### It removed a ZUT collision

`S0231L01` "an old man" → `sheanfhear` and `S0264L01` "old man" → `seanfhear` were two different
targets for the same thing. Both now read `seanfhear`. Same for `S0046L02` "making mistakes" and
`S0047L03` "to make mistakes", both now `botúin a dhéanamh`. Every changed known prompt maps to
exactly one target.

### Audio

**None.** `course_audio` holds 0 rows for this course and 0 phrases carry a link, which is why
Kai wanted it first. Nothing to regenerate, no presentation clip to correct, and the future
recording pass will now be recording the corrected text.

### Left alone deliberately

- **`S0223L01C02` `fhiafraí díot` and `S0230L03C02` `fhear óg`** — component rows, not learner
  sentences. Each is a literal substring of a parent LEGO that *does* carry its licensor
  (`tá sé ag goil a fhiafraí díot`, `tá aithne agam ar fhear óg`), so the mutation is displayed
  in the environment that licenses it. Flagging rather than changing: changing them would break
  the substring relation to their own parent.
- **`ba sheanchara le`, `chuig a chara`, `le mo chairde`, `faoi do chara`, `chuile shórt`,
  `chugam`** — all carry their licensor inside the chunk, or are the correct standalone form.
  Not defects.
- **`S0124L01` / `S0248L02` `bhí mé ag cheapadh` ("I thought")** — this is *over*-lenition:
  `ag` does not lenite, so `ag cheapadh` is wrong in every environment. That is a different
  defect shape from this pass and I did not touch it. **Worth a look, Kai** — it affects the
  two LEGOs and their phrases.
- **`choinic mé` for "I saw"** (`S0184L01`, `S0216L01`, 48 phrases) — standard spelling is
  `chonaic mé`; `choinic` may be an intentional Connacht rendering. Orthography is never a
  build-time fix, so it is reported, not changed.
- No seed sentence was touched. `course_seeds.approved_at` is NULL for every affected seed, so
  there was no proofreading approval to withdraw (O5 does not bite here).

---

## `deu_ch_for_eng` — Swiss German

**Repair case 2 — correct the form. No boundary moved. The scan found 1; there are 5.**

A direct-question chunk (V2 inversion: `was hättsch gern`, `was dänked Sie`) was dropped into an
embedded clause after `ich weiss …`, which in Swiss German as in Standard German requires
verb-final order. The licensor is the subordinating environment, and no boundary redraw reaches
it — the LEGO is a legitimate direct question and is correct as a LEGO. Only the embedded uses
were wrong, so only those were changed.

The course's own attested embedded order settles it: `ich weiss, was du wottsch`,
`ich weiss genau, was du versuechsch z mache`, `ich weiss, was si hät`,
`ich weiss nöd, wie du heissisch`, `S0648L01 was Sie gseit händ`, `S0663L01 was ir gseit händ`.

| id | English | was | is now |
|---|---|---|---|
| S0631L01U03 | I know what you would like | ich weiss, was **hättsch gern** | ich weiss, was **du gern hättsch** |
| S0631L01U04 | I don't know what you would like | ich weiss nöd, was **hättsch gern** | ich weiss nöd, was **du gern hättsch** |
| S0651L01U04 | I know what you think, madam | ich weiss, was **dänked Sie** | ich weiss, was **Sie dänked** |
| S0652L01U04 | I know what you need, sir | ich weiss, was **bruuched Sie** | ich weiss, was **Sie bruuched** |
| S0666L01U04 | I know what you all think | ich weiss, was **dänked ir** | ich weiss, was **ir dänked** |

The last three are the same defect as the scan's specimen and were **not** in the scan — I found
them by searching the whole course for the shape rather than trusting the count.

Spelling note: the scan's suggested target wrote `gärn`; the course spells it `gern` in its own
eight phrases at seed 631, so `gern` is what I used. Orthography is not normalised in this pass.

### Audio

**None to regenerate.** The course holds 4,139 clips, but all five of these phrases carry NULL
on `known_audio_id`, `target1_audio_id` and `target2_audio_id` — this material has never been
rendered. No LEGO text changed, so no presentation clip is now announcing superseded text.
`approved_at` is NULL on seed 631, so nothing to unapprove.

### Left alone deliberately

- **`S0631L01B02`** has `known_text` = `was hättsch scho gern` — the known side is untranslated
  Swiss German, not English. A real defect, but a different one, and outside this pass.

---

## `ita_for_eng` — verified, no action

`ita_for_eng:S0558L01U05` reads **`non sapevo che era così tardi`** live, with both target audio
links present. It was repaired this morning, twelve minutes before the scan report was written,
which is why the report still listed it as open. A course-wide search for `sapev* che …` +
subjunctive now returns **0** rows. Nothing re-fixed, no clip regenerated a second time.

The ~900-clip xAI voice residue inside `ita_for_eng` is untouched, as instructed — a separate
and much larger decision.
