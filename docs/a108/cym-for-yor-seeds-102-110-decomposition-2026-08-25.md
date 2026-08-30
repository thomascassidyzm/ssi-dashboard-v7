# cym_for_yor seeds 102–110 — decomposition, and what needs a human ruling

Landed 2026-08-25. 9 seeds, 29 LEGOs, 280 phrase rows, written live to Supabase
(`course_legos` / `course_practice_phrases`) through `POST /api/seed/complete`.
No audio was generated, queued or cast. `course_audio` for this course is still zero rows.

| Seed | LEGOs | Phrases |
|---|---|---|
| 102 | 3 | 29 |
| 103 | 3 | 29 |
| 104 | 3 | 30 |
| 105 | 3 | 28 |
| 106 | 4 | 41 |
| 107 | 3 | 29 |
| 108 | 2 | 19 |
| 109 | 4 | 37 |
| 110 | 4 | 38 |

309 new rows checked: 0 non-NFC, 0 mojibake.

---

## 1. The gender-ambiguous seed: 105

Yoruba: `Ìyẹn ni ìdí tí kò mọ̀ ìdáhùn`
`kò` is third person negative. Yoruba does not say whether that person is a man or a woman.

Both Welsh readings, in full:

- **Masculine (as stored):** *Dyna pam doedd o ddim yn gwybod yr ateb.*
- **Feminine (for the second voice):** *Dyna pam doedd hi ddim yn gwybod yr ateb.*

**Presentation text I authored** (sits between "the Welsh for this is…" and the Welsh itself,
so it introduces rather than concludes):

> Yoruba doesn't tell you whether this person is a man or a woman — `kò` is simply "he didn't"
> or "she didn't", the same word either way. Welsh makes you pick one. So you're going to hear
> this sentence twice: once with **o** for a man, once with **hi** for a woman. Both are correct,
> and the choice is yours when you speak.

There is **no database column** for that presentation text. `course_legos` and `course_seeds` each
hold exactly one `target_text` string. This is a known gap; I have not invented a column for it.

Seed 102's *"bod hi ddim fel'na"* is impersonal `hi` with no referent — not a gender case, and not listed.

### The same ambiguity, 11 more times inside seed 105

Seed 105's second LEGO is `kò mọ̀` → `doedd o ddim yn gwybod`. Every phrase built on it inherits
the masculine reading. All eleven need the feminine twin if the two-voice device is applied:

| Yoruba | Welsh as stored | Feminine twin |
|---|---|---|
| Ìyẹn ni ìdí tí kò mọ̀ | Dyna pam doedd o ddim yn gwybod | Dyna pam doedd hi ddim yn gwybod |
| kò mọ̀ gbogbo nǹkan | doedd o ddim yn gwybod popeth | doedd hi ddim yn gwybod popeth |
| kò mọ̀ ohun tí mo túmọ̀ sí | doedd o ddim yn gwybod be dw i'n feddwl | doedd hi ddim yn gwybod be dw i'n feddwl |
| kò mọ̀ bí mo ṣe máa sọ nǹkan | doedd o ddim yn gwybod sut i ddeud rhywbeth | doedd hi ddim yn gwybod sut i ddeud rhywbeth |
| kò mọ̀ bí mo ṣe máa sọ èdè Welsh lánàá | doedd o ddim yn gwybod sut i siarad Cymraeg ddoe | doedd hi ddim yn gwybod sut i siarad Cymraeg ddoe |
| Ìyẹn ni ìdí tí kò mọ̀ ohun tí a ń ṣe | Dyna pam doedd o ddim yn gwybod be dan ni'n wneud | Dyna pam doedd hi ddim yn gwybod be dan ni'n wneud |
| kò mọ̀ ohun tí yóò ṣẹlẹ̀ nígbà tó bá yá | doedd o ddim yn gwybod be sy'n mynd i ddigwydd nes ymlaen | doedd hi ddim yn gwybod be sy'n mynd i ddigwydd nes ymlaen |
| kò mọ̀ orúkọ ọ̀rẹ́ rẹ̀ | doedd o ddim yn gwybod enw ei ffrind o | doedd hi ddim yn gwybod enw ei ffrind hi |
| kò mọ̀ ohunkóhun nípa rẹ̀ | doedd o ddim yn gwybod dim byd am y peth | doedd hi ddim yn gwybod dim byd am y peth |
| kò mọ̀ ìdáhùn | doedd o ddim yn gwybod yr ateb | doedd hi ddim yn gwybod yr ateb |
| kò mọ̀ ìdáhùn lánàá | doedd o ddim yn gwybod yr ateb ddoe | doedd hi ddim yn gwybod yr ateb ddoe |

Note the eighth row: `ọ̀rẹ́ rẹ̀` is *also* genderless, so the feminine twin flips two pronouns,
exactly like the seed 53 worked example.

---

## 2. The revoked gender rule is still live in the database, and my phrases sit on top of it

Seeds 16/17, 34/35 and 52/53 encode the rule Kai revoked:

- S016L1 `Ó fẹ́ láti` = **mae o isio**  vs  S017L3 `Ó fẹ́` = **mae hi isio**
- S034L1 `Kò fẹ́ láti` = **dydy o ddim isio**  vs  S035L1 `Kò fẹ́` = **dydy hi ddim isio**
- S052L1 `Ó fẹ́ kọ` = **oedd o isio sgwennu**  vs  S053L1 `Ó fẹ́ fi` = **oedd hi isio rhoi**

Those are the only taught chunks for "mae o isio" / "mae hi isio", so my phrases had to use them.
I did **not** apply the revoked rule: I used `Ó fẹ́ láti` for both genders, choosing per sentence.
That means nine of my rows open with the same Yoruba frame and land on different Welsh pronouns:

| Seed | Yoruba | Welsh |
|---|---|---|
| 104 | Ó fẹ́ láti yí nǹkan padà lónìí | Mae **o** isio newid rhywbeth heddiw |
| 104 | Ó fẹ́ láti yí ìtàn náà padà lẹ́ẹ̀kan síi | Mae **hi** isio newid y stori eto |
| 104 | Ó fẹ́ láti mọ ohun tí a ń ṣe | Mae **o** isio gwybod be dan ni'n wneud |
| 104 | Ó fẹ́ láti mọ ohun tí a ń ṣe lálẹ́ yìí | Mae **hi** isio gwybod be dan ni'n wneud heno |
| 107 | Ó fẹ́ láti rí ìtàn náà lẹ́ẹ̀kan síi | Mae **hi** isio gweld y stori eto |
| 107 | Ó fẹ́ láti mọ ohun tí o ń ṣe | Mae **o** isio gwybod be oeddet ti'n wneud |
| 107 | Ó fẹ́ láti mọ ohun tí o ń ṣe ní òwúrọ̀ yìí | Mae **hi** isio gwybod be oeddet ti'n wneud bore 'ma |
| 108 | Ó fẹ́ láti kà ìtàn náà ní àárín òru | Mae **o** isio darllen y stori yng nghanol y nos |
| 109 | Ó fẹ́ láti mọ nǹkan tuntun | Mae **hi** isio gwybod rhywbeth newydd |

No two of these share an identical Yoruba string, so the server's phrase-level ZUT gate found
nothing and held nothing out. But a learner meets the same opening frame resolving two ways.
Under the two-voice ruling that is arguably correct; under the database as it stands it is noise.
**This needs Kai's decision, and it needs it before any audio is cast for this course.**

---

## 3. Unmarked Yoruba mapping to marked Welsh — flagged, not ruled on

Four cases in my range. In each I took the Welsh exactly as it already stood in
`course_seeds.target_text` and did not retranslate.

**Seed 105** — `kò mọ̀` carries no tense marker. Welsh: *doedd o ddim yn gwybod*, imperfect past.
The same Yoruba `mọ̀` is taught as plain present at S049 (`tí o bá mọ̀` = *os ti'n gwybod*)
and S059 (`mo mọ̀` = *dw i'n gwybod*).

**Seed 107** — `A retí láti rí ohun tí o ń ṣe` → *Oedden ni'n gobeithio gweld be oeddet ti'n wneud.*
Two unmarked-to-past jumps in one sentence. `A retí` has no past marker and becomes imperfect
*Oedden ni'n*; `o ń ṣe` carries only the progressive `ń`, which marks aspect and not tense, and
becomes past progressive *oeddet ti'n wneud*.

**Seed 108** — `A kò retí láti jí ní àárín òru` → *Doedden ni ddim yn gobeithio deffro yng nghanol y nos.*
`A kò retí` has no past marker at all.

**Seed 110** — `mo fẹ́ láti sinmi` → *mi faswn i'n licio ymlacio*, a conditional with nothing
conditional on the Yoruba side. This one I did not create: seed 92 already teaches
`mo fẹ́ láti` = *mi faswn i'n licio*, and I reused that chunk rather than mint a duplicate.

I have invented no systematic tense rule. Each was decomposed on the Welsh as written.

---

## 4. Questions for a Welsh speaker

**`gweithio'n galed` and `weithio'n galed` are now two LEGOs from nearly the same Yoruba.**
S106L4 `láti ṣiṣẹ́ gidigidi` = *gweithio'n galed* (after *angen*, no mutation).
S109L2 `ṣiṣẹ́ gidigidi` = *weithio'n galed* (after *i ni*, soft mutation).
The only thing separating the two prompts is `láti`. The course already does this — S006L1
`láti rántí` = *cofio* against S010L2's mutated *gofio'r frawddeg gyfan* — so I followed
precedent, but it means the learner's cue for "which mutation" is a Yoruba infinitive marker.
Is that the pedagogy you want, or should mutation be taught some other way?

**`bod hi ddim fel'na`** (seed 102, given to me in `target_text`). Colloquial North Welsh, and
consistent with the seed. A purist would want *nad ydy hi fel'na*. Confirm it stands.

**`yr ateb` as an atom** (S105L3). The course already teaches `ìdáhùn náà` = *ateb* inside
S017L2 *be ydy'r ateb*, and `láti dáhùn` = *ateb* as the verb at S027L3. So "ateb" is now a
verb and a noun and *yr ateb* is a third entry. Reads fine to me; worth a native eye.

**`ac` vs `a`** (S110L2). I minted `àti` = *ac* alongside the existing S015L3 `Àti pé` = *a*.
Every phrase I wrote puts *ac* before a vowel or before *mae* / *mi*, which is correct standard
Welsh. But the learner now has two Yoruba prompts for what looks like one English word,
distinguished only by `pé`.

## 5. Questions for a Yoruba speaker

**`gbọ́` means both "hear" and "understand", and the course now splits it by string.**
S074L1 already teaches `láti gbọ́` = *i ddallt*. Seed 103 needed *clywed*, so I minted the bare
atom `gbọ́` = *clywed*. Two knowns, two targets, no hard collision — but a learner prompted with
`gbọ́` must produce *clywed* while `láti gbọ́` produces *i ddallt*, and nothing in Yoruba signals
that difference. Seeds 77 and 78 (another worker's range) will need *dallt* for `gbọ́` again and
will hit this.

**`ọ̀pọ̀lọpọ̀` = *llawer* (S103L3) against `ọ̀pọ̀` = *lot o* (S109L3).** Both mean "many/a lot".
Two Welsh words for what may be one Yoruba idea. Is the distinction real enough to teach?

**`retí` = *gobeithio* (S107L1) against S029L1 `Mo ń retí láti` = *dw i'n edrych ymlaen at*.**
Same verb, "hope" in one place and "look forward to" in another.

**`A kò` now maps to two different Welsh frames — see §6.**

---

## 6. The collision I created knowingly, and the three I avoided

**Created, and it needs a ruling.** Seed 108's LEGO 1 is `A kò` = *Doedden ni ddim*.
S036L2 already declares `A kò` = *dan ni ddim* as a **component** of `A kò fẹ́`. Same Yoruba
prompt, two Welsh targets — present in one place, past in the other. This is the tense problem
of §3 surfacing as a hard ZUT breach.

I could not avoid it. The Welsh needs a chunk meaning "we weren't", the honest single LEGO
`A kò retí` = *Doedden ni ddim yn gobeithio* is 10 estimated syllables against a hard cap of 8,
and every cap-legal split puts `A kò` on its own. Rather than write a dishonest gloss
(`A kò retí` → *Doedden ni ddim yn*, which drops the verb from the target while keeping it in
the prompt) I took the honest mapping and am reporting it. Suggested fix once ruled: drop the
bare `A kò` component from S036L2 so the present reading lives only in the full `A kò fẹ́` chunk.

**The server did not catch this.** `checkLegoConflict` queries `course_legos` only, and `A kò`
appears there solely as a *component* of another row's JSON. I caught it with a hand check
against every prior LEGO known **and** every prior component known.

**Avoided by the same hand check, all three invisible to the validator:**

1. Seed 103 — I had planned `láti gbọ́` = *clywed*. S074L1 had already taken `láti gbọ́` for
   *i ddallt*. Changed to the bare atom.
2. Seed 106 — I had planned the component `ṣiṣẹ́` = *gweithio*. S094L2 had already declared
   `ṣiṣẹ́` = *weithio*, the mutated form. Dropped my component rather than contradict it.
3. Seed 110 — I had planned `mo fẹ́ láti` = *mi faswn i'n licio*. S092L4 already had it.
   Reused the existing chunk instead of minting a duplicate.

---

## 7. Gates that did not run, and what I did instead

**The Yoruba side was never checked.** There is no `docs/pair-contracts/yor…` contract and no
`_known_yor` brief, so the known-side gate skipped on all nine submissions and every response
carried `known_side_unchecked / no_contract`. Every Yoruba sentence in these 280 rows rests on
my judgement alone. I constrained myself to Yoruba words and structures already introduced in
seeds 1–101 and used the live chunk inventory as the vocabulary list, but nothing verified that.

**`checkLegoConflict` cannot see phrase rows or components.** See §6. I ran the hand check on
every LEGO and component known in the course before each submission.

**`normalizeForZUT` tone-flattening was not in play.** I was on the `/api/seed/complete` path
throughout, which does exact string comparison. No finding either way.

**The phrase-complexity gate is warning-only** for build/use format LEGOs — `seed-complete.cjs`
skips it outright with `if (usesBuildUseFormat(lego)) continue`. Seeds 106 and 108 would have
tripped its SHORT-tier floor and were accepted regardless. I fixed 106 anyway; I left 108,
whose frames are long enough that no short phrase is possible.

**I did not wait for seeds 62–101.** When I started, only 1–61 were decomposed and the rest were
being written in parallel by other workers. Rather than block, I built every phrase in my range
from seeds 1–61 vocabulary plus my own LEGOs, which is conservative and always valid — but it
means my phrase baskets draw on a smaller pool than they could have. Seeds 66–71, 79–81, 88–91
and 97–101 were still missing when I finished, so anything they teach is absent from my phrases.

**No native reviewer.** Consistent with `gle_cn` and the rest of this estate's agent-built work,
nothing here has been seen by a Welsh or Yoruba speaker.

## Audio

None. No TTS, no casting, no `queue-audio-pass`, no phase8. `course_audio` for `cym_for_yor`
is still zero rows.

---

# Addendum, same day: seeds 1–101 are now all decomposed, and the census says why collisions got through

Re-checked after the sibling workers finished. Seeds 102–110 are unchanged — 29 LEGOs, 280 phrases,
`course_audio` still zero. Every seed below 102 now has LEGOs.

A course-wide census over **every LEGO known and every component known** finds four cases where one
Yoruba prompt maps to more than one Welsh target:

| Known | Maps to |
|---|---|
| `lè` | S10L1 component = *fedra*  ·  S61L1 component = *fedri* |
| `kò` | S64L2 component = *ddim*  ·  S69L1 = *doedd o ddim* |
| `a kò` | S36L2 component = *dan ni ddim*  ·  **S108L1 = *Doedden ni ddim*** (mine, already reported above) |
| `gbọ́` | **S103L2 = *clywed*** (mine)  ·  S77L2 = *dallt* |

Two distinct reasons the validator let all four through, and they are different bugs.

**Component knowns are never conflict-checked at all.** `checkLegoConflict` selects from
`course_legos` and matches on `known_text`. A known that exists only inside another row's
`components` JSON is invisible to it. That accounts for `lè`, `kò`, and my `a kò`.

**The conflict check only looks backwards.** `validation.cjs:484` applies
`.lt('seed_number', currentSeedNumber)`, so a submission is only ever compared against *lower*
seed numbers. That is correct for a single worker building in order. It is wrong for a parallel
fan-out holding non-contiguous ranges: when a lower seed lands *after* a higher one, the higher
one is invisible to it.

That is exactly what happened to `gbọ́`. My seed 103 minted `gbọ́` = *clywed* at **17:52:38**.
The seed 77 worker minted `gbọ́` = *dallt* at **17:54:33**, two minutes later. Seed 77 is lower
than 103, so my row was filtered out of the comparison and the gate passed something it would
have rejected in the other order. I flagged this as a risk in §5 above before it happened; it
has now happened.

I have not touched either row. Seed 77 is not my range, both seeds are accepted, and changing a
landed LEGO is a content change under the migration protocol — that is Kai's call, not mine.
The substantive question underneath is still the one in §5: Yoruba `gbọ́` covers both "hear" and
"understand", and the course now has three entries for it — `láti gbọ́` = *i ddallt* (S74),
bare `gbọ́` = *clywed* (S103, mine) and bare `gbọ́` = *dallt* (S77). Two of those three are the
same prompt.
