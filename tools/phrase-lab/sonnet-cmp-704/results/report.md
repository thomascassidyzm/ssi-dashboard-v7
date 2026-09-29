# v3 phrase generator: Sonnet 5.5 medium vs Opus 5.5 medium, 100 LEGOs (job #704)

## Verdict

**Do not move v3 to Sonnet 5.5 medium as a drop-in. Keep Opus 5.5 medium.** On 100 LEGOs, blind-judged by Codex (gpt-5.6-terra), Sonnet-medium had **17.3% of phrases flagged as unnatural against Opus's 8.4%**, a paired difference of **+8.9 points (95% CI +5.2 to +12.8)**. The 20-LEGO trial (#640) suggested 10.9% against 8.6%; twenty LEGOs could not separate those, and this run says the gap is real and about double.

- It is not a one-language effect. Sonnet is worse in all four languages (Italian +10.8, Spanish +11.6, German +6.3, French +5.4; the last two have intervals crossing zero on 17-18 LEGOs each) and in all three seed bands, including late course (251+: 12.4% against 6.2%, +6.2 points, CI +1.8 to +10.8).
- Gates and stem laziness do **not** separate the two: gate pass 84% (Sonnet) vs 87% (Opus), early-stem share 8.8% vs 8.2% (late band about 1% in both). The difference is naturalness, which is exactly what the mechanical gates cannot hear.
- Cost does not rescue it: on measured tokens Sonnet spent about as much per LEGO as Opus (below). Any saving is price per token or which pool pays, not fewer tokens.
- What Sonnet gets wrong is a recognisable pattern (see the examples): a bare LEGO with a tacked-on filler ("I'm grateful to you at the moment", "today"), a bare noun with no article ("we need group at night"), and trailing fragments in the USE phrases. A prompt or revise-loop fix might narrow it, but that would be a new trial, not this result.
- **Final gate is Tom's ear.** A judge model cannot hear clunky English, and Opus's own 8.4% shows how noisy "flagged" is. Before any tier decision, listen to a mid-course basket sample (about 20 baskets, Sonnet beside Opus, examples 1-5 below are the shape to expect).

## What was run

- **Sample:** 100 LEGOs, 25 per course (ita, spa, fra, deu _for_eng), random with fixed RNG seed **704** (mulberry32), seeds 11+ only, drawn from every LEGO the #409 Opus 5.5 medium runs of 27-28 Sep attempted (finished baskets plus gate-blocked ones). Bands, weighted to late course: **11-100: 5, 101-250: 8, 251+: 12** per course for ita/fra/deu. **Spanish has no Opus output beyond seed 221**, so its 25 are 5 / 20 in 11-100 / 101-250 (no 251+): an explicit gap, and it means the late band has three languages only. Totals: 20 in 11-100, 44 in 101-250, 36 in 251+.
- **Sonnet arm:** the unchanged `generateLegoPhrases` (same prompt, MAX_THINKING_TOKENS 10000, gates, 2 gate retries, course-so-far overused-stem view built from the Opus baskets of lower seeds plus live seeds 1-10), model swapped to `claude-sonnet-5-5` at `--effort medium` by a `claude` shim. Confirmed from the CLI transcripts: 179 calls, all claude-sonnet-5-5, all effort medium. Read-only Supabase client: any write throws; nothing was written to any course table.
- **Opus arm:** the existing #409 `candidates-orig` output (claude-opus-5-5, effort medium by CLI default), i.e. the gate-loop output **before** the naturalness revision, as in #640. Not re-run.
- **Judge:** Codex `gpt-5.6-terra`, the #409 naturalness prompt and batching, one call at a time. Blind: each basket got an opaque id, both arms were shuffled together within a course, the prompt never names an arm. Only baskets that passed the gate are judged, so **80 of the 100 LEGOs have a judged basket in both arms** (20 had a blocked basket in one arm or both).
- **Intervals:** flagged rates are sum(flagged)/sum(phrases) per group with **LEGO-clustered bootstrap** 95% intervals (5,000 resamples; phrases within a LEGO are not independent) and a paired Sonnet − Opus difference on the same resampled LEGOs. Gate pass rates use Wilson intervals. Small language × band cells (2-9 LEGOs) are shown for direction only.

## Flagged phrases (judge), Opus vs Sonnet-medium

| group | LEGOs judged in both arms | Opus flagged [95% CI] | Sonnet flagged [95% CI] | Sonnet − Opus [95% CI] |
|---|---|---|---|---|
| **all** | 80 | 8.4% [5.9–11.2] | **17.3% [13.0–21.9]** | **+8.9 pp [5.2, 12.8]** |
| ita | 25 | 7.1% [3.5–11.2] | 17.9% [10.9–26.3] | +10.8 [5.1, 17.9] |
| spa | 20 | 5.7% [2.3–9.8] | 17.2% [9.3–26.6] | +11.6 [4.4, 20.6] |
| fra | 18 | 13.3% [7.2–20.3] | 18.7% [8.9–30.5] | +5.4 [−2.9, 14.6] |
| deu | 17 | 8.7% [2.9–16.9] | 15.0% [6.5–25.2] | +6.3 [−0.4, 13.6] |
| 11-100 | 15 | 12.3% [5.4–21.3] | 23.0% [15.7–31.2] | +10.7 [5.0, 16.0] |
| 101-250 | 37 | 8.7% [5.2–12.9] | 18.7% [11.2–27.2] | +10.1 [3.1, 17.9] |
| 251+ (ita, fra, deu) | 28 | 6.2% [3.1–9.7] | 12.4% [7.3–18.1] | +6.2 [1.8, 10.8] |

Language × band, direction only (Sonnet − Opus, points): ita 11-100 +12.8, 101-250 +12.3, 251+ +9.0; spa 11-100 +10.0, 101-250 +12.0; fra 11-100 +14.5, 101-250 +8.8, 251+ +0.3; deu 11-100 +4.9, 101-250 +3.3, 251+ +8.9. Only French 251+ shows no gap.

LEGOs with at least one flagged phrase: Opus 39/80, Sonnet 50/80. Baskets with an over-used collocation named by the judge: Opus 41, Sonnet 36 (Sonnet slightly better on this measure, not significant). The judge's Opus rate was 8.3% in a first pass on 84 LEGOs and 8.4% here on 80, so the baseline is stable.

## Gates (per LEGO; blocked = failed after the generator's 2 retries)

| group | n | Opus pass [95% CI] | Sonnet pass [95% CI] | Opus first-try | Sonnet first-try | calls/LEGO Opus | calls/LEGO Sonnet |
|---|---|---|---|---|---|---|---|
| all | 100 | 87% [79–92] | 84% [76–90] | 47% | 43% | 1.73 | 1.79 |
| ita | 25 | 100% | 100% | 48% | 52% | 1.64 | 1.52 |
| spa | 25 | 92% | 88% | 56% | 44% | 1.56 | 1.68 |
| fra | 25 | 72% | 76% | 52% | 48% | 1.80 | 1.84 |
| deu | 25 | 84% | 72% | 32% | 28% | 1.92 | 2.12 |
| 11-100 | 20 | 80% | 80% | 40% | 30% | 1.85 | 2.00 |
| 101-250 | 44 | 93% | 89% | 59% | 45% | 1.55 | 1.73 |
| 251+ | 36 | 83% | 81% | 36% | 47% | 1.89 | 1.75 |

Gate behaviour is equivalent within noise (German is the weaker Sonnet cell, 18/25 against 21/25). The same LEGO can also flip between runs: spa S0151L03 passed on attempt 2 in the shakedown and was blocked (stem diversity) in the full run.

## Stem reuse (laziness), #398 instrument

Early-stem share = stem material from seeds 1-10 ÷ all stem material, both arms re-tiled by the same tiler (unmatched share 5.7% Opus, 5.2% Sonnet, so symmetric).

| group | LEGOs | Opus [95% CI] | Sonnet [95% CI] | Sonnet − Opus |
|---|---|---|---|---|
| all | 100 | 8.2% [5.7–11.1] | 8.8% [6.0–12.0] | +0.6 pp [−0.8, 2.1] |
| 11-100 | 20 | 25.7% [17.2–35.9] | 27.1% [17.4–37.8] | +1.4 [−3.4, 6.7] |
| 101-250 | 44 | 7.7% [5.1–10.3] | 7.4% [4.9–9.9] | −0.3 [−2.3, 1.8] |
| 251+ | 36 | 1.0% [0.3–1.8] | 1.4% [0.3–2.9] | +0.4 [−0.7, 1.8] |

No difference. Late-course early-stem share is about 1% in both arms, so on this measure the stem-laziness problem is not what separates the models. (The 24% live baseline is the live hand-built course, not v3.)

## Real tokens and cost per LEGO

From CLI transcripts (message.usage), not guesses. Sonnet: all 179 generator calls of the kept outputs (matches the 179 gate attempts in the output files exactly). Opus: a random sample of 224 #409 generator calls across the accounts (27-28 Sep), scaled by the sampled Opus calls/LEGO of 1.73.

| per LEGO | Sonnet 5.5 medium (measured, 100 LEGOs) | Opus 5.5 medium (sampled per call × 1.73) |
|---|---|---|
| generator calls | 1.79 | 1.73 |
| output tokens (incl. thinking) | 10,662 (thinking 8,001) | ~9,930 (thinking ~7,220) |
| cache-write tokens | 66,695 | ~76,300 |
| cache-read tokens | 25,342 | ~41,700 |
| fresh input tokens | ~4 | ~4 |

API-equivalent dollars are a **labelled estimate**: Sonnet 5.5's price is not in CLI 2.1.284's catalogue, so I assumed Sonnet 5 rates as #640 did ($2 in / $10 out per MTok, cache write $4, cache read assumed $0.20). That gives **about $0.38 per LEGO, about $38 for the 100 LEGOs** drawn from the subscription pool. I did not price Opus, since its rate would also be an assumption; the token table is the like-for-like fact. Sonnet is not using fewer tokens.

## Ten side-by-side examples (Opus vs Sonnet-medium, judge flags)

Five where Sonnet is worse, three where Opus is worse, two clean. ⚑ = the blind judge's flag and reason. Each shows up to four of that arm's phrases (flagged ones first).

### 1. ita_for_eng S0142L03 (seed 142, band 101-250): "I'm grateful to you" = "ti sono grato" — Sonnet worse
**Opus 5.5** — judge flagged 0 of 9; over-used: help me to x3
- B: yes, I'm grateful to you → sì, ti sono grato
- B: of course I'm grateful to you → certo che ti sono grato
- B: I'm grateful to you for helping me to understand → ti sono grato per avermi aiutato a capire
- B: thank you very much, I'm grateful to you → grazie mille, ti sono grato

**Sonnet 5.5 medium** — judge flagged 2 of 10
- B: I'm grateful to you today → ti sono grato oggi
- B: of course I'm grateful to you → certo che ti sono grato
- U: yes and I'm grateful to you at the moment → sì e ti sono grato al momento  ⚑ _English+ITA: Temporal qualifier makes gratitude sound contrived._
- U: I'm grateful to you if you can → ti sono grato se puoi  ⚑ _English+ITA: Incomplete conditional has no natural intended meaning._

### 2. ita_for_eng S0533L03 (seed 533, band 251+): "every word" = "ogni parola" — Sonnet worse
**Opus 5.5** — judge flagged 0 of 11; over-used: every word matters x3, check every word x3
- B: every word matters → ogni parola conta
- B: to check every word → controllare ogni parola
- B: I love every word → amo ogni parola
- B: she won't listen to every word → non ascolterà ogni parola

**Sonnet 5.5 medium** — judge flagged 2 of 11
- B: I love every word → amo ogni parola
- B: to check every word → controllare ogni parola
- U: I told her every word last night → le ho detto ogni parola ieri sera  ⚑ _English+ITA: This is not how natives express recounting everything said._
- U: I heard every word about that man → ho sentito ogni parola su quell'uomo  ⚑ _English+ITA: “Every word about” is not idiomatic._

### 3. spa_for_eng S0209L02 (seed 209, band 101-250): "group" = "grupo" — Sonnet worse
**Opus 5.5** — judge flagged 0 of 12; over-used: in this group x11
- B: in this group we're friends → en este grupo somos amigos
- B: we were talking in this group → estábamos hablando en este grupo
- B: in this group there are → en este grupo hay
- B: working together in this group → trabajando juntos en este grupo

**Sonnet 5.5 medium** — judge flagged 8 of 10; over-used: find group x3
- B: difficult group → grupo difícil
- B: we need group at night → necesitamos grupo por la noche  ⚑ _English+SPA: Both languages need an article before “group.”_
- B: to find group → encontrar grupo  ⚑ _English+SPA: Both languages need an article before “group.”_
- U: they want group with everyone else → quieren grupo con todos los demás  ⚑ _English+SPA: Bare “group” is unnatural in both languages._

### 4. deu_for_eng S0566L04 (seed 566, band 251+): "been" = "gewesen" — Sonnet worse
**Opus 5.5** — judge flagged 0 of 10
- B: been wet → nass gewesen
- B: would have been better → wäre besser gewesen
- B: because he would have been too late → weil er zu spät gewesen wäre
- B: would have been really difficult → wäre wirklich schwierig gewesen

**Sonnet 5.5 medium** — judge flagged 4 of 9
- B: been and gone → gewesen und gegangen  ⚑ _DEU: „gewesen und gegangen“ is not a natural standalone German expression._
- B: he has been sick → er ist krank gewesen
- B: he would have been late → er wäre spät gewesen  ⚑ _DEU: „spät gewesen“ is odd for arriving late._
- U: maybe he has been tired and then gone → vielleicht ist er müde gewesen und dann gegangen  ⚑ _English: English needs a destination or more natural past-tense phrasing._

### 5. fra_for_eng S0322L02 (seed 322, band 251+): "the same book" = "le même livre" — Sonnet worse
**Opus 5.5** — judge flagged 0 of 11
- B: to read the same book → lire le même livre
- B: the same book this year → le même livre cette année
- B: to look for the same book → chercher le même livre
- B: he couldn't find the same book → il ne pouvait pas trouver le même livre

**Sonnet 5.5 medium** — judge flagged 3 of 11
- B: I want the same book → je veux le même livre
- B: the same book with me → le même livre avec moi  ⚑ _English+FRA: Both fragments need a verb to express possession._
- U: the same book with them isn't a problem → le même livre avec eux n'est pas un problème  ⚑ _English+FRA: “With them” is unnatural for comparing identical books._
- U: I don't like the same book → je n'aime pas le même livre  ⚑ _English+FRA: Both versions need “reading” to express the intended repeated-book idea._

### 6. fra_for_eng S0358L02 (seed 358, band 251+): "the top" = "le sommet" — Opus worse
**Opus 5.5** — judge flagged 2 of 12; over-used: show you x3
- B: show me the top → me montrer le sommet  ⚑ _FRA: French infinitive does not match the imperative._
- B: the top this morning → le sommet ce matin
- B: she needed to find the top → elle avait besoin de trouver le sommet
- U: the top sounds like fun → le sommet a l'air amusant  ⚑ _English+FRA: A summit itself does not normally “sound like fun.”_

**Sonnet 5.5 medium** — judge flagged 0 of 9
- B: to find the top → trouver le sommet
- B: she needed to find the top → elle avait besoin de trouver le sommet
- B: the top isn't blue → le sommet n'est pas bleu
- B: to find the top with the group → trouver le sommet avec le groupe

### 7. spa_for_eng S0178L02 (seed 178, band 101-250): "although" = "aunque" — Opus worse
**Opus 5.5** — judge flagged 2 of 11
- B: although I had → aunque tuve
- B: although this is not difficult → aunque esto no es difícil
- B: it's useful although → es útil aunque  ⚑ _English+SPA: Both sentences trail off unnaturally after although._
- U: why do you want to stop although you think it's so good? → por qué quieres parar aunque piensas que es tan bueno?  ⚑ _English+SPA: “Although” is unnatural here; the intended meaning requires “if.”_

**Sonnet 5.5 medium** — judge flagged 0 of 11
- B: although I wanted → aunque quería
- B: although I had → aunque tuve
- B: difficult although fun → difícil aunque divertido
- B: although you wanted → aunque querías

### 8. ita_for_eng S0176L03 (seed 176, band 101-250): "next year" = "l'anno prossimo" — Opus worse
**Opus 5.5** — judge flagged 1 of 10
- B: I'll be ready next year → sarò pronto l'anno prossimo
- B: next year I'll ask → l'anno prossimo chiederò
- B: to come back next year with my friends → tornare l'anno prossimo con i miei amici
- U: I'm not sure if it will work next year → non sono sicuro se funzionerà l'anno prossimo  ⚑ _ITA: “Non sono sicuro se” is less natural here._

**Sonnet 5.5 medium** — judge flagged 0 of 10
- B: I'll ask next year → chiederò l'anno prossimo
- B: I want to learn next year → voglio imparare l'anno prossimo
- B: next year I'll be ready → l'anno prossimo sarò pronto
- B: next year with you → l'anno prossimo con te

### 9. deu_for_eng S0350L03 (seed 350, band 251+): "some old friends" = "einige alte Freunde" — both clean
**Opus 5.5** — judge flagged 0 of 11
- B: some old friends who speak German → einige alte Freunde, die Deutsch sprechen
- B: yes, some old friends → ja, einige alte Freunde
- B: she could bring along some old friends → sie könnte einige alte Freunde mitbringen
- B: enough time to call some old friends → genug Zeit einige alte Freunde anzurufen

**Sonnet 5.5 medium** — judge flagged 0 of 10; over-used: who speak German x3
- B: some old friends in the pub → einige alte Freunde in der Kneipe
- B: do you know some old friends? → kennst du einige alte Freunde?
- B: some old friends who speak German → einige alte Freunde, die Deutsch sprechen
- B: do you know some old friends in the office? → kennst du einige alte Freunde im Büro?

### 10. ita_for_eng S0466L02 (seed 466, band 251+): "throw it" = "buttarlo" — both clean
**Opus 5.5** — judge flagged 0 of 11; over-used: throw it away / buttarlo via x4
- B: throw it away → buttarlo via
- B: let me throw it → lasciami buttarlo
- B: we should throw it away → dovremmo buttarlo via
- B: they want to throw it in the garden → vogliono buttarlo in giardino

**Sonnet 5.5 medium** — judge flagged 0 of 11; over-used: throw it away / buttarlo via x3
- B: throw it away → buttarlo via
- B: we could throw it → potremmo buttarlo
- B: let me throw it → lasciami buttarlo
- B: we had to throw it → dovevamo buttarlo


## Gaps and things to know

- **The first generation attempt was contaminated and was thrown away.** The launcher and shim I kept in scratch were swept when my turn ended, so the first run silently fell back to real Opus (140 Opus calls in the transcripts, 01:02-01:44Z). I found it from the transcripts, moved those 31 outputs aside, re-ran exactly those 31 LEGOs on Sonnet, and re-judged everything. Every number above is from the clean second pass. The waste is real: about 140 Opus calls plus a shakedown and about 6 Sonnet calls of discarded work, on the claude@ pool, on top of the 179 counted calls.
- **Spanish has no late-course (251+) basket** because Opus never ran there; late-band results are ita/fra/deu only.
- **One judge, one family.** Codex gpt-5.6-terra is the same judge as #640 and #409; "flagged" is a model's opinion (Opus's own 8.4% shows the floor). It is unavailable-free here: no substitution was needed.
- **Opus arm = pre-naturalness-revision output**, like #640. The production path adds a revise loop on top; Sonnet's output would also be revisable, and this run did not test whether the loop closes the gap.
- The Sonnet course-so-far stem view was rebuilt from the Opus baskets of lower seeds, an approximation of what Opus saw live.
- 20 of 100 LEGOs were not judged in both arms because a basket was gate-blocked; blocked baskets are counted in the gate table only.
- Opus token figures are a sample of #409 calls, not the exact transcripts of the sampled LEGOs (transcripts do not carry a LEGO id).
- Scripts, sample and result tables are on branch `cs/704-v3-phrases-sonnet-medium-100-leg` under `tools/phrase-lab/sonnet-cmp-704/` (not merged). Raw generator output and judge verdicts are in `~/ssi-evidence/ssi-dashboard-v7/tools/phrase-lab/sonnet-cmp-704/`.
