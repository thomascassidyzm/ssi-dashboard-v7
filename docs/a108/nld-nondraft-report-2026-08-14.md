# A-108 — the Dutch non-draft pocket

`nld_for_eng`, rows with `target_text_draft = false`. Measured against the live DB and the
served S3 bytes on 2026-08-14. **Zero rows written. Zero clips rendered. No accept step run.**

## The headline

Every flagged Dutch line was whisper-decoded before anything else. **In 32 of 32 clips the
audio speaks the same register the text stores.** Not one clip already says the polite form,
so the free branch — text-fix where the audio is already right — has **no work in it at all**.

That makes the whole pocket a render question, and under the brief's rule (c) the correct move
is to stop on those rows rather than write them. Writing `u` into text the learner hears as
`je` would manufacture a text/audio mismatch that does not exist today: right now the text and
the audio agree, and both are merely too informal for the scene.

## What I actually counted

| | |
|---|---|
| non-draft rows in the course | **259** (`pod-0` 142, `pod-0-unrecorded` 117) |
| rows carrying an informal marker in a service scene | **56** |
| distinct clips behind them | **32** |
| rows written | **0** |
| clips rendered | **0** |

The brief expected roughly 49 rows / 28 clips. I measure 56 / 32, and it reconciles exactly:
24 clips serve two rows each (the two pods duplicate the same text against the same clip) and
8 clips serve one row — 24x2 + 8 = 56.

## Two of the three rules have no work in Dutch

**Rule 1 — annotations: zero.** No slash, Unicode slash, round or full-width paren, square or
full-width bracket, brace, angle, guillemet, backslash or dash-paren form appears in any Dutch
non-draft line, target side or known side. Consistent with the sweep's finding that every
annotation in the estate sits in `pol`/`lav`/`por`/`ara`/`spa`.

**Rule 2 — gender: structurally zero.** Dutch predicative adjectives and past participles do
not inflect for the speaker's gender, so there is no `cansado/a` shape for the rule to bite on.
The only person-noun anywhere in the pocket is `verpleegkundige`, which is gender-neutral — and
it is spoken by Anna, who is female anyway. The Dutch cast also carries no stale `gender:'n'` on
the Learner: Learner is `f`, voiced by Noor.

**Rule 3 — register: the whole job**, and it inverts exactly as the estate sweep found. Too-formal
is absent — the peer scenes 1, 4, 5, 6 and 22 return **zero** `u`/`uw`/`alstublieft`. The defect
is all in the other direction: T-forms to baristas, bartenders, waiters, shop assistants, a
pharmacist's counter, a taxi driver and a stranger on public transport.

## What the clips say

Free, unprimed decode — the stored text was never shown to whisper, which is the only way the
transcript can contradict it. `ggml-medium`, `-l nl`, same shape as `services/audio-veracity.cjs`
`decodeAudio()`. Script: `docs/a108/transcribe-nld-clips.sh`. Every transcript is in
`docs/a108/nld-nondraft-applied-log.json`, per row.

A representative slice:

```
2e29f878 -> "Komt eraan. Kan ik nog iets voor je doen?"
342096cd -> "Graag gedaan! Ben je hier op vakantie? Je spreekt erg goed Nederlands."
7c4cf451 -> "Wil je normaal of groot?"
8907b3c0 -> "Dank je wel. En heeft u ook pijnstillers voor kinderen?"
af1691ed -> "Nee, hij is vrij.  Alsjeblieft ga je gang."
ed8f66ae -> "Hallo, kunt u me naar het station brengen alsjeblieft?"
```

The last two are the interesting ones: they show the audio reproducing the *mixed* register the
text stores, `Kunt u ... alsjeblieft`, `Dank je wel. En heeft u ook`. The half-polite lines are
half-polite in the audio too. Nothing here is a transcription artefact of the register question.

## The render derivation — 29 clips, 51 rows, $0.024

Needs your approval as a separate decision. All 29 are `origin = tts`, xAI, no human recordings.

| clip | voice | rows | before | after (proposed) | chars |
|---|---|---|---|---|---|
| `8907b3c0` | Noor | 2 | Dank je wel. En heeft u ook pijnstillers voor kinderen? | **Dank u wel. En heeft u ook pijnstillers voor kinderen?** | 54 |
| `88cc7859` | Ara (Assistant/Customer 2) | 2 | Ik denk het wel, maar je moet even kijken om zeker te zijn. | **Ik denk het wel, maar u moet even kijken om zeker te zijn.** | 58 |
| `9d8272dd` | Noor | 2 | Dank je, je bent erg behulpzaam. Ik ben je erg dankbaar. | **Dank u, u bent erg behulpzaam. Ik ben u erg dankbaar.** | 53 |
| `342096cd` | Ara (Assistant/Customer 2) | 2 | Graag gedaan. Ben je hier op vakantie? Je spreekt erg goed Nederlands. | **Graag gedaan. Bent u hier op vakantie? U spreekt erg goed Nederlands.** | 69 |
| `b1033275` | Noor | 2 | Dat is heel vriendelijk van je! Ja, ik ben op vakantie, en ik moet meer oefenen om beter Nederlands te spreken. Hartelijk dank, en tot ziens. | **Dat is heel vriendelijk van u! Ja, ik ben op vakantie, en ik moet meer oefenen om beter Nederlands te spreken. Hartelijk dank, en tot ziens.** | 140 |
| `ed8f66ae` | Noor | 2 | Hallo. Kunt u me naar het station brengen, alsjeblieft? | **Hallo. Kunt u me naar het station brengen, alstublieft?** | 55 |
| `af1691ed` | Noor | 2 | Nee, hij is vrij. Alsjeblieft, ga je gang. | **Nee, hij is vrij. Alstublieft, gaat uw gang.** | 44 |
| `57371d03` | Eve (Barista) | 1 | Goedemiddag. Wat kan ik voor je doen? | **Goedemiddag. Wat kan ik voor u doen?** | 36 |
| `b09bab21` | Femke | 1 | Goedemiddag. Ik wil graag een koffie, alsjeblieft. Met melk maar zonder suiker. Om mee te nemen. | **Goedemiddag. Ik wil graag een koffie, alstublieft. Met melk maar zonder suiker. Om mee te nemen.** | 96 |
| `4e02e6ca` | Femke | 2 | Dank je wel. Tot ziens. | **Dank u wel. Tot ziens.** | 22 |
| `6f7f77e0` | Eve (Barista) | 1 | Goedemorgen. Wat kan ik voor je doen? | **Goedemorgen. Wat kan ik voor u doen?** | 36 |
| `d7446f04` | Thijs | 2 | Goedemorgen. Twee americano's en een kopje thee, alsjeblieft. | **Goedemorgen. Twee americano's en een kopje thee, alstublieft.** | 61 |
| `f0ba0d43` | Eve (Barista) | 2 | Wil je hier zitten? Het tafeltje bij het raam is vrij. | **Wilt u hier zitten? Het tafeltje bij het raam is vrij.** | 54 |
| `57fb7426` | Noor | 2 | Ik wil graag een zwarte koffie, alsjeblieft. | **Ik wil graag een zwarte koffie, alstublieft.** | 44 |
| `7c4cf451` | Eve (Barista) | 2 | Wil je normaal of groot? | **Wilt u normaal of groot?** | 24 |
| `8c296f8c` | Noor | 1 | Groot graag, alsjeblieft. Met havermelk als je dat hebt. | **Groot graag, alstublieft. Met havermelk als u dat heeft.** | 56 |
| `89e415c1` | Eve (Barista) | 2 | Natuurlijk. Wil je dit meenemen of hier eten? | **Natuurlijk. Wilt u dit meenemen of hier eten?** | 45 |
| `b1457d38` | Noor | 2 | Ik wil het meenemen, alsjeblieft. | **Ik wil het meenemen, alstublieft.** | 33 |
| `e00112a7` | Ara (Assistant/Customer 2) | 2 | Mag ik twee koffie verkeerd en twee zwarte koffies en één van die, alsjeblieft? | **Mag ik twee koffie verkeerd en twee zwarte koffies en één van die, alstublieft?** | 79 |
| `2e29f878` | Eve (Barista) | 2 | Komt eraan. Kan ik nog iets voor je doen? | **Komt eraan. Kan ik nog iets voor u doen?** | 40 |
| `aa1d45b6` | Ara (Assistant/Customer 2) | 2 | Ja, mag ik ook een glas water, alsjeblieft. | **Ja, mag ik ook een glas water, alstublieft.** | 43 |
| `cbbd2feb` | Ruben | 2 | Eten jullie vanavond? | **Eet u vanavond?** | 15 |
| `cd8e5861` | Ara (Assistant/Customer 2) | 1 | Hebben jullie broodjes? Ik wil graag een kaasbroodje, alsjeblieft. | **Hebben jullie broodjes? Ik wil graag een kaasbroodje, alstublieft.** | 66 |
| `f354eddb` | Noor | 1 | Ik wil graag een glas bitter, alsjeblieft. | **Ik wil graag een glas bitter, alstublieft.** | 42 |
| `b48bbe1d` | Ruben | 1 | We hebben een huisrood, een huiswit, of je kunt een van onze flessen nemen. | **We hebben een huisrood, een huiswit, of u kunt een van onze flessen nemen.** | 74 |
| `614b93b7` | Thijs | 2 | Ik wil graag een groot glas witte wijn, alsjeblieft. | **Ik wil graag een groot glas witte wijn, alstublieft.** | 52 |
| `8c6cb12b` | Noor | 2 | Gewoon twee koffies, alsjeblieft. Voor mij cafeïnevrij. | **Gewoon twee koffies, alstublieft. Voor mij cafeïnevrij.** | 55 |
| `f9751bf5` | Ara (Assistant/Customer 2) | 2 | We willen graag een fles bruisend water en een fles plat water, alsjeblieft. | **We willen graag een fles bruisend water en een fles plat water, alstublieft.** | 76 |
| `103c2cc6` | Noor | 2 | Ik neem het lam, alsjeblieft. Met een bijgerecht van groenten. | **Ik neem het lam, alstublieft. Met een bijgerecht van groenten.** | 62 |

**Total: 29 clips, 51 rows, 1,584 characters. At xAI's $15/1M that is $0.024** — under three
cents. The gate here is your approval and make-before-break, not the money.

Voices needed: Noor (`247783ebdd51`), Eve, Ara, Thijs (`a13662ba951c`), Femke (`58d27475085e`),
Ruben (`244e27b39200`) — all xAI, all already cast on this course, no Azure fallback anywhere.

## Five rows I deliberately left alone

Three clips, five rows, all the same call: **`jullie` addressed to the establishment rather than
to the person.**

- `37febb90` — `Hebben jullie een menu?` (customer to bartender, 2 rows)
- `9b3f3ffb` — `Welke ales hebben jullie?` (customer to bartender, 1 row)
- `d016d55c` — `Kan ik pinnen? Hebben jullie contactloos betalen?` (customer to barista, 2 rows)

My read: this is not a T-form aimed at the addressee. `Hebben jullie...?` asks what the *business*
stocks, and V-register Dutch speakers say it without breaking register — it is not the same act as
`Wil je...?` to the person in front of you. Logging it as a taste fork rather than acting on it.

The one `jullie` I did put in the render list is `cbbd2feb`, `Eten jullie vanavond?` — that is the
**bartender** speaking, and it addresses the customers as people, so it is genuinely staff using a
T-form to a customer. Proposed `Eet u vanavond?`.

## The `course_audio.text` discrepancy

Checked, per the brief. **Right now all 32 clips are in sync** — `course_audio.text` is
byte-identical to the pod row's `target_text` for every one of them. So there is no stale-text
problem to report *today*.

The discrepancy is prospective, and it is the same trap the sweep hit on the 39 released clips:
because the render path reads `course_audio.text` and not the pod row, **any pod-text-only edit
here would silently desync the two and a later re-render would speak the old informal words
again**. That is a second, independent reason the text edits are held rather than applied — a
Dutch fix has to move `course_audio.text` and the pod rows together, in the same operation that
renders. I have written neither.

## One thing outside the register question, flagged not fixed

Clip `b09bab21` (scene 3, Sarah, Femke) decodes with an extra sentence on the end that is not in
its stored text: `...Om mee te nemen.  Betekent dat er zo'n ophoofde erbij is.` The clip runs
10,896 ms for 96 characters — 113.5 ms/char against a 74.1 mean for this course's pod clips.
That is +1.7 standard deviations, which is **suggestive, not proof** (the pod's slowest clip runs
176 ms/char). It needs an ear, not a script. Noting it because that clip is already in the render
list, so a re-render would clear it either way.

## Gaps, stated plainly

- **No row was resolved by text alone**, because no clip qualified. That is the honest outcome of
  the whisper-first method, not a shortfall in it.
- **The three `jullie` clips are a judgment call I am declining to make for you**, not a defect I
  proved absent.
- **`b09bab21`'s extra tail is unverified by ear.** Whisper plus a duration outlier is the whole
  of the evidence.

## Files

- `docs/a108/nld-nondraft-applied-log.json` — all 56 rows: id, pod, scene, speaker, clip, voice,
  s3 key, before, `after: null`, `applied: false`, verdict, reason, transcript, and the assertion
  that `target_text_draft` is false on every one.
- `docs/a108/nld-resolution.json` — the proposed V form and rationale per clip.
- `docs/a108/transcribe-nld-clips.sh` — the decode used.
