# A-22 Stage 2 — the relink pass: what came back free, what is left to buy

**6,688 audio links recovered across 56 courses. Nothing was bought. Nothing was guessed.**
Applied live, verified in production in six narration languages.

---

## What happened

Stage 1 nulled 17,489 pointers that named audio rows which no longer existed. That was the
unlock: every relink path in the estate only ever fills a link that is *already* NULL, so while
those rows held a dead-but-truthy id they were permanently invisible to repair. Nulling them made
them eligible. This pass claimed them.

The blocker was that one slot — the "as in" intro a learner hears before each component of a
phrase — had never been healable, because nobody could name the clip it wanted. Stage 1's matcher
read the English narration template, so it scored **zero** on every course that narrates in French,
Japanese, Chinese, Korean or Sinhala — and those courses held most of the prize.

The fix was not to translate the template. It was to notice that these clips are **minted, not
discovered**: the generator builds the narration from a per-language template held in the estate's
own table. Rebuild that string and you have named the clip, in any language, without parsing a word
of narration.

Putting the *carrier* sentence into the key is what removed the ambiguity Stage 1 could not
separate — 445 of German's 926 components share their chunk and differ only in the "as in" sentence
the learner actually hears. Two clips matching this key are the same words in the same order.

---

## What came back free

Ranked by learners in the last 30 days. "Intros relinked" is the never-before-healable slot;
"all slots" includes the ordinary link repairs found alongside it.

| Course | Learners | Intros relinked | All slots | Still absent | No key |
|---|---:|---:|---:|---:|---:|
| jpn_for_eng | 145 | 0 | 12 | 0 | 0 |
| cym_n_for_eng | 73 | 0 | 18 | 0 | 0 |
| zho_for_eng | 47 | 0 | 13 | 579 | 0 |
| spa_for_eng | 47 | 0 | 6 | 0 | 0 |
| **deu_for_eng** | **25** | **926** | **930** | **0** | **0** |
| cym_s_for_eng | 16 | 0 | 17 | 0 | 0 |
| ell_for_eng | 11 | 0 | 38 | 548 | 0 |
| ara_eg_for_eng | 6 | 298 | 822 | 311 | 0 |
| hye_for_eng | 5 | 5 | 5 | 0 | 0 |
| eng_for_sin | 2 | 446 | 446 | 15 | 0 |
| fra_for_jpn | 1 | 999 | 1,000 | 3 | 0 |
| eng_for_fra | 1 | 936 | 937 | 147 | 0 |
| eng_for_kor | 1 | 648 | 649 | 70 | 0 |
| eng_for_zho | 1 | 604 | 605 | 68 | 0 |
| spa_for_jpn | 1 | 225 | 226 | 0 | 0 |
| deu_for_jpn | 1 | 205 | 206 | 3 | 0 |
| ita_for_jpn | 0 | 571 | 572 | 0 | 0 |
| *34 smaller courses* | — | 1 | 174 | — | — |
| **TOTAL** | | **5,864** | **6,688** | | |

**Ambiguous, left deliberately NULL: zero.** That is a real result, and here is the honest reason
for it. The rule had two safety axes. The first — carrier-in-key — did all the work. The second was
meant to refuse any clip whose own `lego_id` named a different LEGO, but **none of the 5,857 clips
written carries a `lego_id` at all**, so that axis never fired once. The zero rests entirely on the
carrier argument, not on two independent checks agreeing. Only 12 rows had more than one candidate,
and by construction those were duplicate renders of identical words.

**No key: 1,553**, almost all of them (1,522) on `eng_template`, which is scaffolding, not a course.
The real total across live courses is 19. Those have no presentation template, so they have no
defensible name, so they stay NULL and are counted rather than guessed.

---

## The German story

Stage 1 promised German needed no TTS at all for this class of damage, and that promise held
exactly: **926 nulled, 926 relinked, zero ambiguous, zero absent.** Beuno's own row — the component
on seed 1 that started this whole investigation — is relinked and verified serving live from
production.

**But German is not fixed, and it would be dishonest to leave it there.** Separately from the
17,489 dangling pointers, `deu_for_eng` has **170 LEGOs missing their intro clip entirely**. Every
one of those has its known audio and both target voices — it is short only the intro. On the
per-role rule that a LEGO needs all three or the player drops it, those 170 rounds are unreachable,
and no amount of relinking recovers them because the audio was never rendered. That needs TTS.

---

## The remaining buy

Ranked by exposure. The unit that matters is a **LEGO short of its triple**, because that drops the
whole round and everything downstream; a missing phrase intro is cosmetic beside it.

| Course | Learners | Broken LEGOs | Rescuable by an intro alone |
|---|---:|---:|---:|
| eng_for_hin | 216 | 53 | 53 |
| jpn_for_eng | 145 | 93 | 93 |
| gle_for_eng | 77 | 155 | 155 |
| spa_for_eng | 47 | 65 | 64 |
| zho_for_eng | 47 | 86 | 86 |
| fra_for_eng | 41 | 128 | 124 |
| deu_for_eng | 25 | 170 | 170 |
| eng_for_kan | 22 | 111 | 111 |
| eng_for_tel | 22 | 76 | 76 |
| eng_for_tam | 22 | 60 | 60 |
| eng_for_guj | 21 | 21 | 21 |
| eng_for_mar | 20 | 18 | 18 |
| ell_for_eng | 11 | 155 | 155 |
| ita_for_eng | 11 | 72 | 72 |
| afr_for_eng | 11 | 29 | 29 |
| hrv_for_eng | 10 | 104 | 104 |
| *…56 more live courses* | | | |
| **72 live-learner courses** | | **14,855** | **3,767** |

**3,767 broken rounds across courses with live learners are one intro clip each away from playing.**
That is roughly **237,000 characters** of narration (basis: the 62.9-character mean of the 72,146
LEGO intros that already exist). At commodity neural-TTS rates that is single-digit dollars; at
premium-voice rates it is materially more. **I do not have the estate's actual contracted rate, so
I am giving you the size, not a price.**

The 23 courses with zero live learners hold a further 6,133 broken LEGOs. They are excluded from the
recommendation deliberately.

---

## The decision — one word

**Shall I queue the intro-only rescue for the 72 courses with live learners — 3,767 clips, ~237k
characters, no new content, just the missing narration for LEGOs whose other three clips already
exist?**

**My recommendation: yes.** It is the cheapest thing in the estate per round recovered — each clip
un-breaks an entire round that is currently unreachable, and the content already exists in every
other respect. It is also the only remaining lever: relinking has now taken everything that was
free, so what is left genuinely has to be rendered.

To be clear about what "yes" means: I would **queue** the audio-pass requests, not render anything.
Rendering stays behind your approval gate exactly as it is today.

---

## How this was kept safe

- **Zero TTS spend.** Not one clip generated.
- **Fill-only.** Every write asserted `IS NULL` in its own WHERE clause; a row that had drifted
  under us would have aborted the whole pass. None did — 6,688 proposed, 6,688 written.
- **Storage-gated.** Every candidate object was HEADed in the bucket before it counted as recoverable.
  A database row is a claim; only the bucket settles it.
- **Reconciled exactly.** Dry-run count and applied count match row for row, zero delta.
- **Snapshotted first**, so the rollback is one statement setting these ids back to NULL.
- **Ambiguity refused, not resolved.** Where a rule could not defend a choice, the row stays NULL —
  a NULL costs the learner nothing now that the fallback works, whereas a mis-link puts the wrong
  narration in their ears with no signal that anything is wrong.

## Verified live in production

Ten courses, six narration languages — English, Japanese, French, Chinese, Korean, Sinhala. For each:
the row is written, the clip fetches cold (`x-vercel-cache: MISS`, HTTP 200, `audio/mpeg`), and the
clip's stored narration contains **both the row's own chunk and its carrier** — the check a merely
alive file passes and a mis-link fails. Every component-intro cycle in the production payload for
those courses now carries its `presentation_id`.

Sample, `eng_for_fra` — French narration, which Stage 1's matcher could not see at all:

> `"En anglais — 'avec' — comme dans — 'avec toi' — c'est :"`

## Known gap, reported not papered over

The learner-facing `cycles` endpoint answers **"Subscription required"** past the free preview
window, and this verification had no subscribed session. So the *payload* check is proven only for
early seeds; deeper rows are verified at the database and clip layers, which are not gated. My first
attempt to prove that a missing intro kills its round hit exactly this wall — the control case
failed identically, so that particular claim rests on the completeness rule and the data, not on an
observation I was able to make from outside.
