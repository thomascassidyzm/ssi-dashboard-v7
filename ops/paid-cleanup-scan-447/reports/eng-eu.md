# eng-eu — cleanup scan findings (#447): eng_for_spa, eng_for_fra, eng_for_deu, eng_for_ita, eng_for_por

Read-only scan, 17 Nov 2026. Nothing was applied, rendered or linked. Live data: each course dumped through Popty's script-view route at 14:06Z today.
English is the TARGET in all five courses, so the English side is the strict side (K8, K9). The known side (Spanish, French, …) has latitude (K6).

**How to read this.** REAL = a defect by the canon, with a fix. NOT = the detector fired but it is fine (the reason is given). LIST = not a defect, listed for Kai's shortest-cut pass.
Audio cost counts new text only: English × 2 voices + known × 1. LEGO re-glosses also need their intro re-voiced (O13), which is NOT in the figures.
No held or ruled lists exist for these five courses (searched ops/, git log, Kai's memory), so nothing here is marked KNOWN — except where a fix was made in one course and not the others, which is named.

| course | REAL | hand-judged | seed-sentence (P26) | not a defect | 7-8 syll. list | audio chars |
|---|---|---|---|---|---|---|
| eng_for_spa (Spanish speakers) | 223 | 126 | 97 | 44 | 42 | 5,601 |
| eng_for_fra (French speakers) | 148 | 77 | 71 | 66 | 34 | 1,732 |
| eng_for_deu (German speakers) | 198 | 118 | 80 | 98 | 34 | 2,166 |
| eng_for_ita (Italian speakers) | 136 | 81 | 55 | 72 | 26 | 1,984 |
| eng_for_por (Portuguese speakers) | 146 | 64 | 82 | 71 | 35 | 2,257 |

Total audio ≈ **13,740 characters** if every fix is taken (about 3,400 of that is one Spanish item: the "esta tarde" afternoon/evening clash).

## The one thing to know first: the seeds were polished, the baskets were not

In all five courses the seed sentences were edited after the LEGOs and practice rows were built. The baskets still carry the OLD wording.
That one cause produces most of the "LEGO not in seed", "seed not played" and "row does not contain its LEGO" hits below. Three shapes:
1. **The prompt was reworded** (e.g. spa seed 101 now says *me gusta ir descubriendo…*; the basket still says *estoy disfrutando descubriendo…*). The learner never says the new seed.
2. **The English was reworded** (e.g. fra seed 73 says *I've got more to learn*; the LEGO and rows say *I've still got a lot to learn*, which is what the French says). Now one prompt has two English answers.
3. **A LEGO was glossed from the old wording** (e.g. ita S0218L01 *molto | very* while the seed and all 7 rows say *much*).
For each, this report picks the side that matches the known language. Where both are fine English, the seed wording wins and the stale row is replaced by the seed sentence itself (its clips already exist: 0 chars).

## Priority: fixed in one course, not in the others (and families that repeat across all five)

- **S0207L01 "you've done" is not-new but was never taught** — fra, deu, ita, por. FIXED in eng_for_spa by job #412 on 14 Oct (commit d3d659d1). Same fix ×4: make it NEW with an intro and a played basket (L31).
- **S0257L01 (seed 257 "I like that blue thing") is not-new and never taught** — all five (spa *cosa | thing*, fra *ce truc | that thing*, deu *mag | like*, ita *blu | blue*, por *daquela coisa azul | that blue thing*). Make it NEW (L31).
- **"I'm not going to be able to" is 9 syllables** (over the L3 cap of 8) — spa S0024L02, fra S0024L01, ita S0024L01. Cut: *I'm not going to* + *be able to* (already taught at seed 11).
- **"as we were talking about earlier" is 9-10 syllables** — fra, deu, ita S0143L02. Cut: *we were talking about* + *earlier*.
- **"I woke" (seed 144) vs LEGO "I woke up"** — spa, fra, deu, ita (por basket also drops "to"). Seed English → *I woke up earlier than I wanted to this morning.*
- **"wake" (seed 108) vs LEGO "wake up"** — fra, deu, por; spa/ita baskets say "wake up" too. Seed English → *We didn't hope to wake up in the middle of the night.* (Soft: "didn't hope to" is itself stiff English; *We didn't expect to wake up…* is the natural line, but seeds 107/108 may be built on "hope" on purpose — propose only.)
- **"as soon as you can / as soon as I can" (seeds 28/29) vs rows and LEGOs "as soon as possible"** — deu, ita, por. The known says "as soon as possible" in all three; one prompt now has two answers. Seed English → "as soon as possible".
- **"What do you need to do" (seed 167) vs LEGO "have to do"** — spa, ita (tienes que / devi = have to). Seed English → *What do you have to do tomorrow afternoon?*
- **Question word order in a statement ("why are you not happy")** — spa S0145L02U01/U04, ita S0145L01U01/U04; also deu S0068L01U03, por S0166L01U02. Same family as spa_for_eng #181 group A.
- **him / her / you on the LEGO vs the seed** — spa 69, 177; por 127, 237, 242, 246, 294 (Portuguese *lhe / o* can be him, her or formal you; the seed says one, the LEGO another).


## eng_for_spa (Spanish speakers)

### Seed sentence never practised (no copy in any played basket) — 71 REAL (listed by mechanism, NOT read one by one) · audio 0
Canon: P26. Usual fix: add as USE row under its last new LEGO, seed clips reused.
- `seed 3` cómo hablar lo más posible | how to speak as often as possible → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 8` voy a tratar de explicar lo que quiero decir | I'm going to try to explain what I mean → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 22` porque quiero conocer a gente que habla inglés | because I want to meet people who speak English → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 23` voy a empezar a hablar más pronto | I'm going to start talking more soon → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 29` tengo ganas de hablar mejor en cuanto pueda | I'm looking forward to speaking better as soon as I can → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 32` ¿Querías mostrarme algo? | did you want to show me something? → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- … 65 more in the JSON (same fix).

### English word used before it is taught — 31 REAL of 31 read · audio ≈ 95 chars
Canon: K15, K8, K8/K14, S3/K8. Usual fix: delete; also: root fix: re-cut S0051L02 "cosas | things" → "cosas interesantes | interesting things" (one LEGO change, rows then pass).
- `S0011L03U06` me gustaría volver y hablar contigo después de aprender inglés | I'd like to come back and speak with you after learning English → delete — come back / and / learning untaught at seed 11 (sure)
- `S0026L04B03` tengo que irme | I need to leave → delete (same row as phrase_missing_lego) — dup of phrase_missing row (sure)
- `S0040L01B02` me siento bien | I feel okay → delete — "okay" one seed early (41) (likely)
- `S0040L01U04` me siento bien esta noche | I feel okay tonight → delete — "okay" one seed early (41) (likely)
- `S0043L01U06` no estaba pensando en contestar tan rápido | I wasn't thinking about answering so quickly → delete — "answering" never taught; "so" at 56 (sure)
- `S0051L02B01` cosas interesantes | interesting things → root fix: re-cut S0051L02 "cosas | things" → "cosas interesantes | interesting things" (one LEGO change, rows then pass) — seed 51 says "interesting things" but no LEGO teaches "interesting" until 58 (sure)
- … 25 more in the JSON (same fix).

### Question mark on one side only — 28 REAL of 28 read · audio ≈ 231 chars
Canon: A7/A9, A9, K9/L32. Usual fix: add "?" to the target text; re-record target only if the clip is read flat (ear); also: add ¿…? to the known text and re-record the known.
- `S0012L02B01` lo que va a pasar | what's going to happen? → drop the "?" from the target text; re-record target if the clip is read as a question — "lo que va a pasar" is "what's going to happen" (relative), target carries a question mark (likely)
- `S0012L02B02` lo que va a pasar mañana | what's going to happen tomorrow? → drop the "?" from the target text; re-record target if the clip is read as a question — "lo que va a pasar" is "what's going to happen" (relative), target carries a question mark (likely)
- `S0201L01B01` lo que iba a pasar | what was going to happen? → drop the "?" from the target text; re-record target if the clip is read as a question — "lo que va a pasar" is "what's going to happen" (relative), target carries a question mark (likely)
- `S0201L01B03` lo que iba a pasar después | what was going to happen next? → drop the "?" from the target text; re-record target if the clip is read as a question — "lo que va a pasar" is "what's going to happen" (relative), target carries a question mark (likely)
- `S0214L01B01` lo pasaste bien | did you have a good time? → ¿lo pasaste bien? | did you have a good time? — question in English, statement in Spanish: the prompt needs ¿…? or it is a different sentence (sure)
- `S0214L01B02` lo pasaste bien con ellos | did you have a good time with them? → ¿lo pasaste bien con ellos? | did you have a good time with them? — question in English, statement in Spanish: the prompt needs ¿…? or it is a different sentence (sure)
- … 22 more in the JSON (same fix).

### LEGO English not in its seed English — 18 REAL of 20 read, 2 not a defect · audio ≈ 880 chars
Canon: K2/L26, K26/L26, L26, L26/K2, L26/K9, L26/P17. Usual fix: reword as shown; also: seed English to the LEGO.
- `S0003L02`  | as much as possible →  | as often as possible — LEGO says "much", seed says "often" (sure)
- `S0015L03`  | and → y quiero que hables inglés conmigo mañana | And I want you to speak English with me tomorrow — seed 15 lost its "And" (the other 4 courses keep "And I want you to…"); LEGO "y | and" now has no home (likely)
- `S0069L01`  | she didn't want →  | he didn't want — LEGO "she", seed "he" (sure)
- `S0111L03`  | it changes us → nos cambia el cerebro | it changes our brain — LEGO "it changes us"; seed and 6 rows say "it changes our brain" (likely)
- `S0129L01`  | glad → covered by S0129L02 seed fix — "alegra | glad" — same seed fix as S0129L02 (likely)
- `S0129L02`  | I'm really glad that →  | I'm really glad that you're doing so well — LEGOs say "glad", seed says "so happy"; me alegra mucho = I'm really glad (likely)
- … 12 more in the JSON (same fix).
Not a defect: "that's not why" vs seed "that isn't why" (contraction) (×1); contraction only ("that's not" / "that isn't") (×1).

### Row does not contain its LEGO — 17 REAL of 17 read · audio ≈ 125 chars
Canon: P17, P17/K14, P17/K2, P17/K50. Usual fix: fixed by the S0111L03 re-cut; B03/B04 ("it changes when we learn", "something new changes us") then need the new LEGO or delete; also: delete (basket keeps its "okay" rows).
- `S0026L04B03` tengo que irme | I need to leave → delete — "I need to leave" under LEGO "to go"; need/leave untaught at seed 26 (sure)
- `S0041L01B03` estoy muy bien | I'm very well → delete (basket keeps its "okay" rows) — "estoy muy bien | I'm very well" under LEGO "bien | okay": no "okay", and bien → okay/well (likely)
- `S0041L01U01` estoy muy bien esta mañana | I'm very well this morning → delete (basket keeps its "okay" rows) — "estoy muy bien | I'm very well" under LEGO "bien | okay": no "okay", and bien → okay/well (likely)
- `S0041L01U03` estoy muy bien esta noche | I'm very well tonight → delete (basket keeps its "okay" rows) — "estoy muy bien | I'm very well" under LEGO "bien | okay": no "okay", and bien → okay/well (likely)
- `S0041L01U05` estoy muy bien hoy | I'm very well today → delete (basket keeps its "okay" rows) — "estoy muy bien | I'm very well" under LEGO "bien | okay": no "okay", and bien → okay/well (likely)
- `S0062L02B01` al mismo tiempo | at the same time → move under the re-cut S0062L03 "al mismo tiempo | at the same time" — "at the same time" rows filed under "help you" (sure)
- … 11 more in the JSON (same fix).

### Seed sentence practised only in its OLD prompt wording — 16 REAL of 16 read · audio 0
Canon: P26. Usual fix: replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26).
- `seed 9` ahora hablo un poco de inglés | I speak a little English now → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "hablo un poco de inglés ahora" (likely)
- `seed 35` ella no quiere leer nada esta tarde | she doesn't want to read anything this afternoon → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "ella no quiere leer nada por la tarde" (likely)
- `seed 77` me sorprende lo rápido que estoy empezando a entender | I'm surprised at how quickly I'm starting to understand → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "estoy sorprendida de lo rápido que estoy empezando a entender" (likely)
- `seed 88` todavía no estoy listo para hablar con gente que no conozco | I'm not ready to talk to people I don't know yet → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "no estoy lista para hablar con gente que no conozco todavía" (likely)
- `seed 93` ya es hora de irse | It's time to go now → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "es hora de irse ahora" (likely)
- `seed 101` me gusta ir descubriendo más sobre este idioma | I'm enjoying finding out more about this language → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "estoy disfrutando descubriendo más sobre este idioma" (likely)
- … 10 more in the JSON (same fix).

### Same row twice in one basket — 10 REAL of 10 read · audio 0
Canon: dup (spa #189). Usual fix: delete this copy.
- `S0009L01B03` hablo inglés con otra persona | I speak English with someone else → delete this copy — same pair twice in one basket (twin S0009L01U03) (sure)
- `S0014L02B04` ¿hablas inglés con otra persona? | do you speak English with someone else? → delete this copy — same pair twice in one basket (twin S0014L02U05) (sure)
- `S0020L03U04` quieres aprender inglés rápido esta tarde | you want to learn English quickly this evening → delete this copy — same pair twice in one basket (twin S0020L03B02) (sure)
- `S0021L02U02` ¿estás aprendiendo inglés rápido? | are you learning English quickly? → delete this copy — same pair twice in one basket (twin S0021L02B02) (sure)
- `S0057L01B02` no puedo recordar | I can't remember → delete this copy — same pair twice in one basket (twin S0057L01B01) (sure)
- `S0057L02B02` lo que quería decir | what I wanted to say → delete this copy — same pair twice in one basket (twin S0057L02B01) (sure)
- … 4 more in the JSON (same fix).

### LEGO prompt not in its seed prompt — 8 REAL of 28 read, 20 not a defect · audio ≈ 3,715 chars
Canon: L26/K2. Usual fix: seed known to match English/LEGO; also: delete the LEGO, rows rehome under S0027L04.
- `S0027L01` tiempo |  → delete the LEGO, rows rehome under S0027L04 — LEGO "tiempo | time" is in neither side of seed 27 ("tardar demasiado" carries it) (likely)
- `S0035L03` por la tarde |  → ZUT: esta tarde → afternoon AND evening. Unify: S0018L01 → "de la tarde | in the evening", seed 18 English "at six o'clock in the evening"; S0035L03 known → "esta tarde"; the 35 "esta tarde | this evening" rows → "this afternoon" — "por la tarde | this afternoon" vs seed "esta tarde"; and S0018L01 teaches "esta tarde | this evening" (57 rows say afternoon, 35 evening) — 34 played rows say esta tarde | this evening (likely)
- `S0101L02` estoy disfrutando |  → estoy disfrutando descubriendo más sobre este idioma |  — LEGO "estoy disfrutando" not in seed "me gusta ir descubriendo…" (English seed: I'm enjoying…) (likely)
- `S0115L01` tener una conversación |  → no me siento listo para tener una conversación |  — seed Spanish "hablar con alguien" vs English and LEGO "have a conversation" (likely)
- `S0117L01` definitivamente |  → definitivamente lo estoy haciendo mejor que la última vez que hablamos |  — seed Spanish has no "definitivamente" / "el uno al otro" that its LEGOs teach (likely)
- `S0132L03` eso es menos emocionante que |  → eso es menos emocionante que lo que ella decía |  — seed Spanish says "interesante", English and LEGO say "exciting" (likely)
- … 2 more in the JSON (same fix).
Not a defect: inflection / gender / elision / separable verb of the same word (known-side latitude) (×20).

### Seed sentence practised with DIFFERENT English — 6 REAL of 6 read · audio 0
Canon: P26/K2. Usual fix: unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars).
- `seed 69` no quería cuidar al perro joven toda la tarde | he didn't want to look after the young dog all afternoon → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "she didn't want to look after the young dog all afternoon" ≠ seed English (one prompt, two answers) (likely)
- `seed 80` no sé cuándo estaré listo | I'm not sure when I'll be ready → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i don't know when i'll be ready" ≠ seed English (one prompt, two answers) (likely)
- `seed 138` aquí era donde mi amigo quería quedar con nosotros | this was where my friend wanted to meet us → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "this is where my friend wanted to meet with us" ≠ seed English (one prompt, two answers) (likely)
- `seed 165` pero no sé si es verdad | but I'm not sure if it's true → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "but i don't know if it's true" ≠ seed English (one prompt, two answers) (likely)
- `seed 171` ¿Quieres que te ayude a buscarlo? | do you want me to help you look for it? → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "do you want me to help you find it" ≠ seed English (one prompt, two answers) (likely)
- `seed 177` le preguntaré adónde quiere ir | I'll ask her where she wants to go → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i'll ask him where he wants to go" ≠ seed English (one prompt, two answers) (likely)

### LEGO over 8 syllables (hand count) — 5 REAL of 5 read · audio ≈ 292 chars
Canon: L3. Usual fix: cut: I'm not going to + be able to (S0011L01); also: cut: I don't feel as if + I'm ready to.
- `S0024L02` no voy a poder | I'm not going to be able to → cut: I'm not going to + be able to (S0011L01) — hand count 9 syllables (tool estimate 7) (sure)
- `S0115L02` no me siento lista para | I don't feel as if I'm ready to → cut: I don't feel as if + I'm ready to — hand count 9 syllables (tool estimate 8) (sure)
- `S0122L02` me alegra mucho cómo va | I'm excited about how it's going → cut: I'm excited about + how it's going (note: 'me alegra mucho' is also 'I'm really glad' at S0129L02 — one prompt, two answers) — hand count 10 syllables (tool estimate 8) (sure)
- `S0131L03` demasiadas ideas dando vueltas | too many ideas going around → cut: too many ideas + going around — hand count 10 syllables (tool estimate 7) (sure)
- `S0295L01` no dije que quisiera | I didn't say that I wanted to → cut: I didn't say that + I wanted to — hand count 9 syllables (tool estimate 7) (sure)

### Seed sentence has no LEGO that fits it — 4 REAL of 4 read · audio 0
Canon: P26/L26. Usual fix: fix the LEGO, then add the seed row.
- `seed 129` me alegra mucho que te vaya tan bien | I'm so happy that you're doing so well → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 144` esta mañana me desperté antes de lo que quería | I woke earlier than I wanted to this morning → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 163` creo que es interesante | I think that it's interesting → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 200` dicen que quieren que terminemos todo a tiempo | they say they want to make sure that we finish everything in time → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)

### Same LEGO taught as NEW twice — 3 REAL of 3 read · audio ≈ 47 chars
Canon: L17/L32, L17/P25, L17/S3. Usual fix: re-cut S0062L03 to "al mismo tiempo | at the same time" (also fixes 9 untaught rows and 4 misfiled rows); also: mark not-new; rehome its played rows under S0135L01/L02 (P25).
- `S0062L03` no sé si | I'm not sure if → al mismo tiempo | at the same time — taught NEW twice in the same seed (= S0062L01); seed 62 has no LEGO for "at the same time" — this slot should be it (sure)
- `S0135L03` no sé | I don't know → mark not-new; rehome its played rows under S0135L01/L02 (P25) — "no sé | I don't know" already new at S0010L01 (sure)
- `S0281L02` te importa si | do you mind if → mark not-new; rehome rows (P25); the frame also ends in a gap ("do you mind if?") — see qmark rows — "te importa si | do you mind if" already new at S0190L02 (sure)

### Gapped / dotted LEGOs — 2 REAL of 2 read · audio 0
Canon: L32/K11. Usual fix: text: "do you speak?" | "¿Hablas?" (dots are not spoken; 0 chars unless the clip voiced them); also: text: "did you want?" | "¿querías?" (0 chars).
- `S0014L02` ¿Hablas...? | do you speak ...? → text: "do you speak?" | "¿Hablas?" (dots are not spoken; 0 chars unless the clip voiced them) — trailing "..." in a LEGO text (a tag, not a gap); text only (likely)
- `S0032L01` ¿querías...? | did you want...? → text: "did you want?" | "¿querías?" (0 chars) — trailing "..." in a LEGO text (likely)

### English pattern: embedded q order — 2 REAL of 2 read · audio ≈ 182 chars
Canon: K9. Usual fix: reword as shown.
- `S0145L02U01` claro que sé por qué no estás contento | of course I know why are you not happy → claro que sé por qué no estás contento | of course I know why you're not happy — question word order inside a statement (sure)
- `S0145L02U04` lo siento que no entiendo por qué no estás contento | I'm sorry that I don't understand why are you not happy → lo siento que no entiendo por qué no estás contento | I'm sorry that I don't understand why you're not happy — question word order inside a statement (sure)

### Played row with no audio — 1 REAL of 1 read · audio ≈ 34 chars
Canon: A16. Usual fix: render target (2 voices).
- `S0311L03B01`  | S0311L03 →  | interesting facts — played build row with empty target1/target2 (sure)

### Not-new LEGO that was never taught — 1 REAL of 1 read · audio 0
Canon: L31. Usual fix: make NEW with an intro and a played basket.
- `S0257L01` cosa | thing → make NEW with an intro and a played basket — not-new but no earlier LEGO equal on both sides (only "cosas | things") — may be the "1 eng_for_spa never-debuted pair" #422·Q queued on 14 Oct (Kai memory loose-ends-2026-10-14); not confirmed (sure)

### LEGOs of 7-8 syllables (list for the shortest-cut pass) — 0 REAL of 42 read
42 new LEGOs of 7-8 syllables, within the cap (full list in the JSON). E.g. `S0010L03` remember the whole sentence, `S0034L02` when other people are here, `S0059L02` how to do what I need to do, `S0074L02` for helping me to understand, `S0076L02` how much I've learnt already, `S0088L01` talk to people I don't know, `S0108L01` in the middle of the night, `S0120L02` it's interesting that you like, `S0128L01` like someone I used to know, `S0146L03` nothing seems to be working

### English pattern: adverb after object — 0 REAL of 5 read, 5 not a defect
Not a defect: "speak English often" is natural English (×5).

### English pattern: perfect with past time — 0 REAL of 3 read, 3 not a defect
Not a defect: "would have done … last time" / "since yesterday" are correct English (×3).

### English pattern: verb plus gerund calque — 0 REAL of 4 read, 4 not a defect
Not a defect: "bring" ends in -ing: regex false positive (×4).

### Seed vs basket differ only by a contraction — 0 REAL of 2 read, 2 not a defect
Not a defect: basket English differs only by a contraction: "that's not why i wanted to see you" (×1); basket English differs only by a contraction: "that's not what i'm trying to say" (×1).

### One prompt, two English answers (LEGO level) — 0 REAL of 2 read, 2 not a defect
Not a defect: the two prompts differ by ¿…? (question intonation, A7); the tool strips punctuation (×2).

### One prompt, two English answers (phrase level) — 0 REAL of 6 read, 6 not a defect
Not a defect: the two prompts differ by ¿…? (question intonation, A7); the tool strips punctuation (×4); question vs statement prompt differ by ¿…? (×1); question vs statement differ by ¿…? (A7) (×1).


## eng_for_fra (French speakers)

### Seed sentence never practised (no copy in any played basket) — 49 REAL (listed by mechanism, NOT read one by one) · audio 0
Canon: P26. Usual fix: add as USE row under its last new LEGO, seed clips reused.
- `seed 3` comment parler aussi souvent que possible. | how to speak as often as possible. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 4` comment dire quelque chose en anglais | how to say something in English → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 9` Je parle un peu anglais maintenant. | I speak a little English now. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 12` Je n'aimerais pas deviner ce qui va se passer demain. | I wouldn't like to guess what's going to happen tomorrow. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 15` Et je veux que tu parles anglais avec moi demain. | And I want you to speak English with me tomorrow. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 19` Mais je ne veux pas arrêter de parler. | But I don't want to stop talking. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- … 43 more in the JSON (same fix).

### English word used before it is taught — 38 REAL of 38 read · audio 0
Canon: K8, K8/K14, K8/K9. Usual fix: delete; also: delete; or reword with taught "it" where French takes y/le.
- `S0004L01U06` j'essaie de me souvenir comment dire quelque chose en anglais | I'm trying to remember how to say something in English → delete — remember at 6 (sure)
- `S0007L01B04` elle veut essayer | she wants to try → delete — she/wants at 16-17 (sure)
- `S0012L02U07` je n'aimerais pas deviner la réponse aujourd'hui | I wouldn't like to guess the answer today → delete — answer at 17 (sure)
- `S0014L01B04` est-ce que tu parles anglais avec moi ? | do you speak English with me? → delete or move one seed later — "me" one seed early (likely)
- `S0019L03U05` elle ne veut pas arrêter de parler avec quelqu'un d'autre | she doesn't want to stop talking with someone else → delete — doesn't at 34 (sure)
- `S0025L02U01` je veux me souvenir de ça avant que je doive partir | I want to remember that before I have to go → delete; or reword with taught "it" where French takes y/le — "ça | that" used before "that" is taught (47) (likely)
- … 32 more in the JSON (same fix).

### Seed sentence practised with DIFFERENT English — 18 REAL of 18 read · audio 0
Canon: P26/K2. Usual fix: unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars).
- `seed 14` Tu parles anglais toute la journée ? | Do you speak English all day? → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "you speak english all day" ≠ seed English (one prompt, two answers) (likely)
- `seed 21` Pourquoi tu apprends son prénom ? | Why are you learning her name? → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "why are you learning his name" ≠ seed English (one prompt, two answers) (likely)
- `seed 65` C'est important de prendre le temps de se tester. | It's important to take time to test yourself. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "it's important to take the time to test yourself" ≠ seed English (one prompt, two answers) (likely)
- `seed 73` Merci beaucoup, mais j'ai encore beaucoup à apprendre. | Thank you very much, but I've got more to learn. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "thank you very much but i've still got a lot to learn" ≠ seed English (one prompt, two answers) (likely)
- `seed 74` Merci beaucoup de m'avoir aidé à comprendre. | Thank you very much for helping me to understand. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "thank you very much for helping me understand" ≠ seed English (one prompt, two answers) (likely)
- `seed 75` Tu as encore beaucoup à apprendre ? | Have you got more to learn? → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "have you still got a lot to learn" ≠ seed English (one prompt, two answers) (likely)
- … 12 more in the JSON (same fix).

### LEGO English not in its seed English — 15 REAL of 18 read, 3 not a defect · audio ≈ 1,042 chars
Canon: L26. Usual fix: seed English; also: LEGO English.
- `S0065L02`  | take the time →  | It's important to take the time to test yourself. — prendre le temps = take the time (likely)
- `S0073L02`  | I've still got a lot to learn →  | Thank you very much, but I've still got a lot to learn. — seed English loose ("more to learn"); French and LEGO say "still got a lot" (sure)
- `S0075L01`  | have you still got →  | Have you still got a lot to learn? — same as 73 (sure)
- `S0075L02`  | a lot to learn → LEGO English — covered by seed 75 fix (sure)
- `S0076L02`  | everything I've already learnt →  | I'm very happy with everything I've already learnt. — French "tout ce que j'ai déjà appris"; seed English "how much" (likely)
- `S0091L02`  | fast enough →  | quickly enough — LEGO "fast enough", seed "quickly enough" (re-gloss LEGO) (likely)
- … 9 more in the JSON (same fix).
Not a defect: contraction only (×3).

### Row does not contain its LEGO — 9 REAL of 9 read · audio ≈ 180 chars
Canon: K2/P17, P17. Usual fix: fixed by S0149L01 LEGO re-gloss; also: seed 139 English → "I'm sorry that I have to leave so early"; LEGO → "have to leave".
- `S0139L02B02` je dois partir | I have to leave → je dois partir | I'm sorry that I have to leave so early — "je dois partir | I have to leave" under "need to leave": devoir → have to / need to (likely)
- `S0149L01B02` ce n'est pas très difficile à faire | this isn't very difficult to do → fixed by S0149L01 LEGO re-gloss — rows say "this", LEGO says "that" (sure)
- `S0149L01B03` bien sûr ce n'est pas très difficile | of course this isn't very difficult → fixed by S0149L01 LEGO re-gloss — rows say "this", LEGO says "that" (sure)
- `S0149L01U01` je pense que ce n'est pas très difficile | I think this isn't very difficult → fixed by S0149L01 LEGO re-gloss — rows say "this", LEGO says "that" (sure)
- `S0149L01U02` ce n'est pas très difficile si tu essaies | this isn't very difficult if you try → fixed by S0149L01 LEGO re-gloss — rows say "this", LEGO says "that" (sure)
- `S0149L01U03` ce n'est pas très difficile à comprendre | this isn't very difficult to understand → fixed by S0149L01 LEGO re-gloss — rows say "this", LEGO says "that" (sure)
- … 3 more in the JSON (same fix).

### LEGO over 8 syllables (hand count) — 5 REAL of 5 read · audio ≈ 308 chars
Canon: L3. Usual fix: cut: I'm not sure if + I can remember; also: cut: I'm not going to + be able to.
- `S0010L01` je ne suis pas sûr de pouvoir me souvenir | I'm not sure if I can remember → cut: I'm not sure if + I can remember — hand count 9 syllables (tool estimate 8) (sure)
- `S0024L01` je ne vais pas pouvoir | I'm not going to be able to → cut: I'm not going to + be able to — hand count 9 syllables (tool estimate 7) (sure)
- `S0035L01` elle ne veut rien lire | she doesn't want to read anything → cut: she doesn't want to + read anything — hand count 9 syllables (tool estimate 8) (sure)
- `S0143L02` dont on parlait tout à l'heure | as we were talking about earlier → cut: we were talking about + earlier — hand count 10 syllables (tool estimate 8) (sure)
- `S0152L01` je l'aurais fait différemment | I would have done it differently → cut: I would have done it + differently — hand count 9 syllables (tool estimate 8) (sure)

### LEGO prompt not in its seed prompt — 4 REAL of 30 read, 26 not a defect · audio ≈ 64 chars
Canon: L26/K2. Usual fix: Kai's call: seed known or LEGO; also: seed known.
- `S0014L01` est-ce que |  → Kai's call: seed known or LEGO — LEGO "est-ce que" not in seed known (seed lost it); basket row is a statement (likely)
- `S0021L03` son prénom à elle |  → Pourquoi tu apprends son prénom à elle ? |  — seed lost "à elle"; basket says "his name", seed "her name": son prénom → his/her (likely)
- `S0118L01` senti |  → Kai's call: seed known or LEGO — LEGO "senti | felt" not in seed known (likely)
- `S0282L01` ça ce n'est pas un problème |  → ce n'est pas un problème |  — LEGO known "ça ce n'est pas un problème" — odd French, not in seed (likely)
Not a defect: inflection / gender / elision / separable verb of the same word (known-side latitude) (×26).

### Same row twice in one basket — 2 REAL of 2 read · audio 0
Canon: dup (spa #189). Usual fix: delete this copy.
- `S0068L01U06` Qu'est-ce que tu cherches ? | What are you looking for? → delete this copy — same pair twice in one basket (twin S0068L01B01) (sure)
- `S0251L02U02` je ne veux pas partir avant qu'on ait fini | I don't want to leave before we finish → delete this copy — same pair twice in one basket (twin S0251L02B03) (sure)

### English pattern: perfect with past time — 2 REAL of 4 read, 2 not a defect · audio ≈ 138 chars
Canon: K9. Usual fix: reword as shown.
- `S0182L02U05` tu as vu mes clés hier ? | have you seen my keys yesterday? → tu as vu mes clés hier ? | did you see my keys yesterday? — present perfect with "yesterday" is not English (deu #435 en-calque model) (sure)
- `S0182L03U04` tu as vu mes clés quelque part hier ? | have you seen my keys anywhere yesterday? → tu as vu mes clés quelque part hier ? | did you see my keys anywhere yesterday? — present perfect with "yesterday" (sure)
Not a defect: "would have done … yesterday" is correct (×1); "since yesterday" takes the perfect (×1).

### Not-new LEGO that was never taught — 2 REAL of 2 read · audio 0
Canon: L31. Usual fix: make NEW with intro + played basket.
- `S0207L01` tu as fait | you've done → make NEW with intro + played basket — "tu as fait | you've done" is not-new but never taught (same slot in deu/ita/por) — FIXED in eng_for_spa by job #412 (commit d3d659d1, 14 Oct: "eng_for_spa S0207L01 debut (L31)"), not carried to this course (sure)
- `S0257L01` ce truc | that thing → make NEW with intro + played basket — "ce truc | that thing" not-new, never taught (seed 257 not-new in all five) (sure)

### Seed sentence has no LEGO that fits it — 2 REAL of 2 read · audio 0
Canon: P26/L26. Usual fix: fix the LEGO, then add the seed row.
- `seed 145` Pourquoi tu n'es plus heureux ? | Why are you not happy any more? → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 252` Quand est-ce que tu seras prêt à commencer ? | When will you be ready to start? → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)

### Seed sentence practised only in its OLD prompt wording — 2 REAL of 2 read · audio 0
Canon: P26. Usual fix: replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26).
- `seed 95` Tu es prêt à rentrer à la maison avec le prochain bus ? | Are you ready to go home on the next bus? → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "tu es prêt à rentrer avec le prochain bus" (likely)
- `seed 282` Non ce n'est pas un problème. | No that's not a problem. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "non ça ce n'est pas un problème" (likely)

### LEGOs of 7-8 syllables (list for the shortest-cut pass) — 0 REAL of 34 read
34 new LEGOs of 7-8 syllables, within the cap (full list in the JSON). E.g. `S0005L01` I'm going to practise speaking, `S0033L01` how long have you been learning, `S0034L01` he doesn't want to be quiet, `S0034L02` when other people are here, `S0037L01` I started to think about it, `S0055L02` when I didn't sleep very well, `S0073L02` I've still got a lot to learn, `S0076L02` everything I've already learnt, `S0077L03` I'm starting to understand, `S0108L03` in the middle of the night

### English pattern: adverb after object — 0 REAL of 6 read, 6 not a defect
Not a defect: "as often as possible" / "speak English often" are natural (×6).

### English pattern: bare yes no echo — 0 REAL of 1 read, 1 not a defect
Not a defect: "yes I can" is a natural English answer; the gle_v2 echo rule is about a KNOWN-side prompt heard out of context (×1).

### English pattern: embedded q order — 0 REAL of 2 read, 2 not a defect
Not a defect: "how to do it" is not a question clause: regex false positive (×2).

### English pattern: present for ongoing — 0 REAL of 1 read, 1 not a defect
Not a defect: "now I think" is correct (×1).

### English pattern: reported no backshift — 0 REAL of 4 read, 4 not a defect
Not a defect: no backshift is normal English when the fact still holds (P14: soft) (×4).

### Seed vs basket differ only by a contraction — 0 REAL of 4 read, 4 not a defect
Not a defect: basket English differs only by a contraction: "learning english isn't easy but it's fun" (×1); basket English differs only by a contraction: "that's why he didn't know the answer" (×1); basket English differs only by a contraction: "this is not the best choice i could make" (×1).

### Seed vs basket differ only by gender ending / dropped pronoun — 0 REAL of 16 read, 16 not a defect
Not a defect: basket plays the seed in its female / subject-dropped form (×16).

### One prompt, two English answers (phrase level) — 0 REAL of 1 read, 1 not a defect
Not a defect: one prompt is a statement, the other has "?" (A7) (×1).


## eng_for_deu (German speakers)

### Seed sentence never practised (no copy in any played basket) — 48 REAL (listed by mechanism, NOT read one by one) · audio 0
Canon: P26. Usual fix: add as USE row under its last new LEGO, seed clips reused.
- `seed 3` wie man so oft wie möglich spricht. | how to speak as often as possible. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 6` Ich versuche, mich an ein Wort zu erinnern. | I'm trying to remember a word. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 8` Ich werde versuchen zu erklären, was ich meine. | I'm going to try to explain what I mean. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 9` Ich spreche jetzt ein bisschen Englisch. | I speak a little English now. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 10` Ich bin nicht sicher, ob ich mich an den ganzen Satz erinnern kann. | I'm not sure if I can remember the whole sentence. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 15` Und ich möchte, dass du morgen mit mir Englisch sprichst. | And I want you to speak English with me tomorrow. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- … 42 more in the JSON (same fix).

### English word used before it is taught — 36 REAL of 57 read, 21 not a defect · audio 0
Canon: K8, K8/K14, S3/K29. Usual fix: delete; also: root fix: give seed 118 a LEGO "wir waren | we were" (or re-gloss S0118L02); rows then pass.
- `S0020L01U03` du möchtest morgen mit uns sprechen | you want to speak with us tomorrow → delete — "us" before seed 138 (no LEGO until 211) (sure)
- `S0020L01U04` du möchtest uns heute Abend um sechs Uhr treffen | you want to meet us at six o'clock this evening → delete — "us" before seed 138 (no LEGO until 211) (sure)
- `S0025L02U02` er möchte uns helfen | he wants to help us → delete — "us" before seed 138 (no LEGO until 211) (sure)
- `S0026L03U02` sie sagt, sie ist fast bereit zu gehen | she says she is nearly ready to go → delete — "says" never (vowel changes) (sure)
- `S0026L03U03` er sagt, er ist fast bereit zu gehen | he says he is nearly ready to go → delete — "says" never (sure)
- `S0026L03U06` ich denke, sie ist fast bereit zu gehen | I think she is nearly ready to go → delete — "think" at 37 (sure)
- … 30 more in the JSON (same fix).
Not a defect: "speaks" = taught "speak" + agreement -s (target-side small ending, K8 latitude) (×17); "us" is in seed 138's own sentence (K29 met earlier) — but S3: seed 138 has no LEGO covering "us" (×4).

### Same row twice in one basket — 22 REAL of 22 read · audio 0
Canon: dup (spa #189). Usual fix: delete this copy.
- `S0033L01B04` ich wollte fragen, wie lange | I wanted to ask how long → delete this copy — same pair twice in one basket (twin S0033L01U01) (sure)
- `S0043L01B02` ich habe nicht darüber nachgedacht | I wasn't thinking about it → delete this copy — same pair twice in one basket (twin S0043L01B01) (sure)
- `S0064L01B02` englisch zu lernen | learning English → delete this copy — same pair twice in one basket (twin S0064L01B01) (sure)
- `S0069L01B02` wollte nicht | didn't want → delete this copy — same pair twice in one basket (twin S0069L01B01) (sure)
- `S0069L04B02` den ganzen Nachmittag | all afternoon → delete this copy — same pair twice in one basket (twin S0069L04B01) (sure)
- `S0071L01B02` wir wollten nicht, dass jemand | we didn't want to let anyone → delete this copy — same pair twice in one basket (twin S0071L01B01) (sure)
- … 16 more in the JSON (same fix).

### Seed sentence practised with DIFFERENT English — 22 REAL of 22 read · audio 0
Canon: P26/K2. Usual fix: unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars).
- `seed 7` Ich möchte heute so gut ich kann versuchen. | I want to try as hard as I can today. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i want to try as well as i can today" ≠ seed English (one prompt, two answers) (likely)
- `seed 28` Es ist nützlich, so schnell wie möglich anzufangen zu reden. | It's useful to start talking as soon as you can. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "it's useful to start talking as soon as possible" ≠ seed English (one prompt, two answers) (likely)
- `seed 59` Ich weiß, was ich nächste Woche tun muss. | I know how to do what I need to do next week. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i know what i need to do next week" ≠ seed English (one prompt, two answers) (likely)
- `seed 60` Ich weiß noch nicht, wie man genug verschiedene Wörter sagt. | I don't know how to say enough different words yet. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i don't know yet how to say enough different words" ≠ seed English (one prompt, two answers) (likely)
- `seed 88` Ich bin noch nicht bereit, mit Leuten zu reden, die ich nicht kenne. | I'm not ready to talk to people I don't know yet. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i'm not ready yet to talk to people i don't know" ≠ seed English (one prompt, two answers) (likely)
- `seed 102` Wir versuchen zu sagen, dass es nicht so ist. | We're trying to say that it's not like that. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "we're trying to say that it's not like this" ≠ seed English (one prompt, two answers) (likely)
- … 16 more in the JSON (same fix).

### LEGO English not in its seed English — 21 REAL of 33 read, 12 not a defect · audio ≈ 1,270 chars
Canon: L26. Usual fix: seed English; also: LEGO English.
- `S0006L02`  | to remember something →  | to remember — LEGO adds "something" (an etwas); seed "a word" (likely)
- `S0007L02`  | as well as I can →  | I want to try as well as I can today. — so gut ich kann = as well as I can (sure)
- `S0026L02`  | the feeling → see why — "the feeling" vs seed "feeling as if" — German "das Gefühl"; English seed is loose: Kai's call (best guess)
- `S0028L02`  | as soon as possible →  | It's useful to start talking as soon as possible. — so schnell wie möglich = as soon as possible (same family in ita/por) (sure)
- `S0041L04`  | to get tired →  | I feel okay, but I'm starting to get tired. — müde werden = get tired (likely)
- `S0100L01`  | you should → see why — seed says shouldn't; covered by dup_debut (sure)
- … 15 more in the JSON (same fix).
Not a defect: contraction only (×7); stand-in "it/that" frame; phrases swap it (Kai 17 Nov) (×3); verb LEGO carries "to" (K54) (×2).

### Row does not contain its LEGO — 16 REAL of 43 read, 27 not a defect · audio ≈ 40 chars
Canon: K2/P17, K50, K9 (known natural), L32/K50, P17, P17/K2. Usual fix: delete; also: follows the S0294L02 ruling (Kai).
- `S0026L03U01` er ist fast bereit, Englisch zu sprechen | he is nearly ready to speak English → delete — "nearly ready to speak English" under "nearly ready to go" (sure)
- `S0027L01B04` ich mag es nicht, das Gefühl | I don't like the feeling → delete — "ich mag es nicht, das Gefühl" is broken German (sure)
- `S0047L03B02` ich denke, dass es gut ist | I think that it's good → delete — "it's good" under "that it's a good thing" (sure)
- `S0047L04U06` es ist mir egal, Fehler zu machen | I don't care about making mistakes → delete — "making" under "to make" — and it is seed 48 itself (sure)
- `S0050L03U05` es ist mir egal, so schnell wie möglich fertig zu werden | I don't care about finishing as quickly as possible → delete — "finishing" under "to finish…" (never taught) (sure)
- `S0159L02U04` das ist nicht schwierig | this is not difficult → das ist nicht schwierig | that isn't difficult — "das ist nicht schwierig | this is not difficult" under "that isn't" (sure)
- … 10 more in the JSON (same fix).
Not a defect: stand-in "it/that" swapped for the real object (Kai 17 Nov) (×17); fails only because the LEGO text is "than…" (gapped_lego row fixes it) (×8); verb LEGO "to guess"; rows need not carry "to" (×1).

### Seed sentence practised only in its OLD prompt wording — 8 REAL of 8 read · audio 0
Canon: P26. Usual fix: replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26).
- `seed 1` Ich möchte jetzt mit dir Englisch sprechen. | I want to speak English with you now. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "ich möchte jetzt englisch mit dir sprechen" (likely)
- `seed 5` Ich werde das Sprechen mit jemand anderem üben. | I'm going to practise speaking with someone else. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "ich werde mit jemand anderem sprechen üben" (likely)
- `seed 62` Ich bin nicht sicher, ob ich dir gleichzeitig helfen kann. | I'm not sure if I can help you at the same time. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "ich bin mir nicht sicher ob ich dir gleichzeitig helfen kann" (likely)
- `seed 80` Ich bin nicht sicher, wann ich bereit sein werde. | I'm not sure when I'll be ready. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "ich bin mir nicht sicher wann ich bereit sein werde" (likely)
- `seed 92` Ich würde das gerne noch eine Weile weiter machen. | I'd like to keep on doing this for a while. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "ich würde gerne das noch eine weile weiter machen" (likely)
- `seed 165` Aber ich bin nicht sicher, ob es wahr ist. | But I'm not sure if it's true. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "aber ich bin mir nicht sicher ob es wahr ist" (likely)
- … 2 more in the JSON (same fix).

### LEGO over 8 syllables (hand count) — 7 REAL of 7 read · audio ≈ 430 chars
Canon: L3. Usual fix: cut: to finish + as quickly as possible; also: cut: we didn't want to + let anyone.
- `S0050L03` so schnell wie möglich fertig zu werden | to finish as quickly as possible → cut: to finish + as quickly as possible — hand count 10 syllables (tool estimate 8) (sure)
- `S0071L01` wir wollten nicht, dass jemand | we didn't want to let anyone → cut: we didn't want to + let anyone — hand count 9 syllables (tool estimate 7) (sure)
- `S0086L01` es war leider nicht möglich | it wasn't possible unfortunately → cut: it wasn't possible + unfortunately — hand count 11 syllables (tool estimate 8) (sure)
- `S0114L02` heute schlechter als gestern | doing worse today than yesterday → cut: doing worse + today than yesterday — hand count 9 syllables (tool estimate 8) (sure)
- `S0131L02` Ideen in meinem Kopf herumschwirren | ideas going around in my head → cut: going around + in my head — hand count 10 syllables (tool estimate 8) (sure)
- `S0143L02` worüber wir vorhin gesprochen haben | we were talking about earlier → cut: we were talking about + earlier — hand count 9 syllables (tool estimate 8) (sure)
- `S0291L01` ich werde bald besser sprechen können | I'll be able to speak better soon → cut: I'll be able to + speak better soon — hand count 9 syllables (tool estimate 8) (sure)

### LEGO prompt not in its seed prompt — 5 REAL of 15 read, 10 not a defect · audio ≈ 71 chars
Canon: L26. Usual fix: LEGO known to the seed wording; also: seed known.
- `S0006L02` mich an etwas zu erinnern |  → LEGO known to the seed wording — "an etwas" vs seed "an ein Wort" (likely)
- `S0010L01` ich bin mir nicht sicher |  → Ich bin mir nicht sicher, ob ich mich an den ganzen Satz erinnern kann. |  — seed lost "mir"; LEGO + basket keep "ich bin mir nicht sicher" (also seeds 62, 80, 165) (likely)
- `S0216L01` ich habe jemanden getroffen |  → LEGO known to the seed wording — LEGO "jemanden" not in seed (see target row) (likely)
- `S0279L01` es war nicht |  → LEGO known to the seed wording — LEGO "es war nicht" not in seed "weil nicht mehr viel Zeit übrig war" (likely)
- `S0279L02` noch viel Zeit übrig |  → LEGO known to the seed wording — LEGO "noch viel Zeit übrig" vs seed "nicht mehr viel Zeit übrig" (likely)
Not a defect: inflection / gender / elision / separable verb of the same word (known-side latitude) (×10).

### Same LEGO taught as NEW twice — 3 REAL of 3 read · audio 0
Canon: L17. Usual fix: mark not-new; rehome rows.
- `S0100L01` du solltest | you should → mark not-new; rehome rows — "du solltest | you should" already new at S0099L01 — and seed 100 says shouldn't (sure)
- `S0234L02` arbeitet | works → mark not-new; rehome rows — "arbeitet | works" new at S0197L02 (sure)
- `S0246L01` zu beschäftigt | too busy → mark not-new; rehome rows — "zu beschäftigt | too busy" new at S0193L01 (sure)

### Gapped / dotted LEGOs — 2 REAL of 2 read · audio ≈ 59 chars
Canon: K11, L32. Usual fix: teach the middle, then one LEGO "ob ich mich an den ganzen Satz erinnern kann | if I can remember the whole sentence" is too long — cut "ob ich mich erinnern kann | if I can remember"; also: text: "than" (re-record only if the clip trails off: 8 chars).
- `S0010L02` ob ich ... kann | if I can → ob ich mich erinnern kann | if I can remember — "ob ich ... kann | if I can" is a gapped LEGO (verb-final German) (likely)
- `S0042L03` als | than… → text: "than" (re-record only if the clip trails off: 8 chars) — "than…" — trailing ellipsis in target; 8 rows then fail containment (sure)

### Not-new LEGO that was never taught — 2 REAL of 2 read · audio 0
Canon: L31. Usual fix: make NEW; also: make NEW, or re-gloss to an earlier pair ("ich mag | I like" S0026L01).
- `S0207L01` du hast getan | you've done → make NEW — "du hast getan | you've done" never taught — FIXED in eng_for_spa by job #412 (commit d3d659d1, 14 Oct: "eng_for_spa S0207L01 debut (L31)"), not carried to this course (sure)
- `S0257L01` mag | like → make NEW, or re-gloss to an earlier pair ("ich mag | I like" S0026L01) — "mag | like" not-new, never taught as that pair (likely)

### Seed sentence has no LEGO that fits it — 2 REAL of 2 read · audio 0
Canon: P26/L26. Usual fix: fix the LEGO, then add the seed row.
- `seed 106` Wir müssen uns nicht glücklich fühlen, wir müssen nur hart arbeiten. | We don't need to feel happy, we just need to work hard. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 241` Ich möchte es ihm nicht geben. | I don't want to give it to him. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)

### Played row with no audio — 1 REAL of 1 read · audio ≈ 46 chars
Canon: A16. Usual fix: render target.
- `S0147L02B02`  | S0147L02 →  | xxxxxxxxxxxxxxxxxxxxxxx — played build row with empty target1/target2 (sure)

### English pattern: embedded q order — 1 REAL of 1 read · audio ≈ 92 chars
Canon: K9. Usual fix: reword as shown.
- `S0068L01U03` bist du sicher, dass du weißt, wonach du suchst? | are you sure you know what are you looking for? → bist du sicher, dass du weißt, wonach du suchst? | are you sure you know what you're looking for? — question word order inside a statement (sure)

### English pattern: perfect with past time — 1 REAL of 5 read, 4 not a defect · audio ≈ 68 chars
Canon: K9. Usual fix: reword as shown.
- `S0254L01U04` ich mache das seit einer Weile | I have been doing that since a while ago → ich mache das seit einer Weile | I have been doing that for a while — "since a while ago" is not English (likely)
Not a defect: "since yesterday" takes the perfect (×4).

### English pattern: reported no backshift — 1 REAL of 1 read · audio ≈ 90 chars
Canon: K9. Usual fix: reword as shown.
- `S0253L02U04` er sagte, dass er in ein paar Minuten fertig ist | he said that he is done in a few minutes → er sagte, dass er in ein paar Minuten fertig ist | he said that he will be done in a few minutes — "he said that he is done in a few minutes" is not English for a future (likely)

### LEGOs of 7-8 syllables (list for the shortest-cut pass) — 0 REAL of 34 read
34 new LEGOs of 7-8 syllables, within the cap (full list in the JSON). E.g. `S0043L01` I wasn't thinking about it, `S0045L01` I don't need to know everything, `S0052L01` he wanted to write last week, `S0055L02` when I didn't sleep very well, `S0058L02` when you understand enough words, `S0070L01` she didn't want to tell me, `S0072L01` that you're doing very well, `S0073L02` but I've got more to learn, `S0074L01` for helping me to understand, `S0076L02` how much I've learnt already

### English pattern: adverb after object — 0 REAL of 9 read, 9 not a defect
Not a defect: adverb at the end is natural English here (×9).

### English pattern: double negative — 0 REAL of 2 read, 2 not a defect
Not a defect: two clauses, not a double negative (×2).

### English pattern: false friend preps — 0 REAL of 1 read, 1 not a defect
Not a defect: "explain her name" is correct (regex hit "explain her") (×1).

### English pattern: uncountable plural — 0 REAL of 1 read, 1 not a defect
Not a defect: "other people is" not present: regex hit "people is" across a clause (×1).

### Seed vs basket differ only by a contraction — 0 REAL of 11 read, 11 not a defect
Not a defect: basket English differs only by a contraction: "that's why he didn't know the answer" (×1); basket English differs only by a contraction: "this is not the best choice i could make" (×1); basket English differs only by a contraction: "you are like someone i used to know" (×1).


## eng_for_ita (Italian speakers)

### Seed sentence never practised (no copy in any played basket) — 36 REAL (listed by mechanism, NOT read one by one) · audio 0
Canon: P26. Usual fix: add as USE row under its last new LEGO, seed clips reused.
- `seed 3` come parlare il più spesso possibile. | how to speak as often as possible. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 5` Ho intenzione di esercitarmi a parlare con qualcun altro. | I'm going to practise speaking with someone else. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 15` E voglio che tu parli inglese con me domani. | And I want you to speak English with me tomorrow. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 47` Perché penso che sia una buona cosa fare errori. | Because I think that it's a good thing to make mistakes. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 53` Lei voleva mettere la sua lettera nella sua borsa. | She wanted to put his letter in her bag. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 54` Volevamo darti un po' più di tempo. | We wanted to give you a little more time. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- … 30 more in the JSON (same fix).

### Row does not contain its LEGO — 29 REAL of 29 read · audio ≈ 88 chars
Canon: K2, K2/P17, K50, P17. Usual fix: none beyond LEGO; also: none beyond LEGO; U03 "I have much time" is not natural → "I have a lot of time".
- `S0024L01B02` non riuscirò a parlare | I won't be able to speak → as untaught row — see untaught row (sure)
- `S0028L02U03` È utile rispondere il prima possibile | it's useful to answer as soon as possible → seeds 28/29 English → "as soon as possible" (same family deu/por) — "il prima possibile" → "as soon as possible" here, "as soon as you/I can" in seeds 28/29 (likely)
- `S0029L03U03` È utile rispondere il prima possibile | it's useful to answer as soon as possible → seeds 28/29 English → "as soon as possible" (same family deu/por) — "il prima possibile" → "as soon as possible" here, "as soon as you/I can" in seeds 28/29 (likely)
- `S0047L03U04` non mi preoccupo di fare errori perché penso che sia una buona cosa | I don't worry about making mistakes because I think that it's a good thing → delete — "making" under "to make" (sure)
- `S0109L01B02` dobbiamo lavorare sodo adesso | we must work hard now → none beyond LEGO — fixed by S0109L01 LEGO re-gloss (sure)
- `S0109L01B03` dobbiamo lavorare sodo oggi | we must work hard today → none beyond LEGO — fixed by S0109L01 LEGO re-gloss (sure)
- … 23 more in the JSON (same fix).

### LEGO English not in its seed English — 17 REAL of 22 read, 5 not a defect · audio ≈ 750 chars
Canon: L26. Usual fix: seed English; also: LEGO English.
- `S0040L02`  | right now →  | at the moment — in questo momento = at the moment (sure)
- `S0049L01`  | that's how it is →  | That's how it is, if you know what I mean. — È così; seed English "It's like this" (likely)
- `S0061L01`  | could you say it →  | Could you say it again a little more slowly? — dirlo = say it (likely)
- `S0072L01`  | you're going →  | you're doing — "you're going very well" is a calque (sure)
- `S0074L01`  | you don't have to be → Kai: re-cut seed 74 LEGOs ("grazie mille | thank you very much", "per avermi aiutato a capire | for helping me to understand"); move the stray three to a seed that says them or delete — seed 74 ("Thank you very much for helping me to understand") carries the LEGOs of a different sentence ("you don't have to be so hard on yourself") (sure)
- `S0074L02`  | so hard → Kai: re-cut seed 74 LEGOs ("grazie mille | thank you very much", "per avermi aiutato a capire | for helping me to understand"); move the stray three to a seed that says them or delete — as S0074L01 (sure)
- … 11 more in the JSON (same fix).
Not a defect: contraction only (×4); K54 (×1).

### Seed sentence practised with DIFFERENT English — 12 REAL of 12 read · audio 0
Canon: P26/K2. Usual fix: unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars).
- `seed 40` Come ti senti in questo momento? | How do you feel at the moment? → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "how do you feel right now" ≠ seed English (one prompt, two answers) (likely)
- `seed 49` È così, se sai cosa intendo. | It's like this, if you know what I mean. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "that's how it is if you know what i mean" ≠ seed English (one prompt, two answers) (likely)
- `seed 61` Potresti dirlo di nuovo un po' più lentamente? | Could you say that again a little more slowly? → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "could you say it again a little more slowly" ≠ seed English (one prompt, two answers) (likely)
- `seed 70` Lei non voleva dirmi dove era. | She didn't want to tell me where it was. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "she didn't want to tell me where she was" ≠ seed English (one prompt, two answers) (likely)
- `seed 72` Penso che tu stia andando molto bene. | I think that you're doing very well. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i think you're going very well" ≠ seed English (one prompt, two answers) (likely)
- `seed 132` Questo è meno entusiasmante di quello che lei stava dicendo. | That's less exciting than what she was saying. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "this is less exciting than what she was saying" ≠ seed English (one prompt, two answers) (likely)
- … 6 more in the JSON (same fix).

### LEGO prompt not in its seed prompt — 10 REAL of 37 read, 27 not a defect · audio ≈ 186 chars
Canon: K26, L26. Usual fix: LEGO known/target to the seed wording; also: seed known.
- `S0029L03` riesco |  → LEGO known/target to the seed wording — LEGO "riesco | I can" vs seed "il prima possibile" (likely)
- `S0082L02` per te |  → Non ti aspetterò. Perché no? |  — seed "Non aspetterò" has no "per te"/"ti" though English says "wait for you" (likely)
- `S0226L02` è |  → sta cercando di aiutarmi | is trying to help me — LEGO "è | is" — seed says "sta cercando di aiutarmi | is trying to help me" (likely)
- `S0244L02` un sacco |  → LEGO known/target to the seed wording — LEGO "un sacco" vs seed "molto" (likely)
- `S0251L01` fino a quando |  → LEGO known/target to the seed wording — LEGO "fino a quando" vs seed "prima che" (cross-course seed 251) (likely)
- `S0255L01` andare via |  → Quando pensi che sarai pronto ad andare via? |  — LEGO "andare via | leave"; seed "ad andare" (likely)
- … 4 more in the JSON (same fix).
Not a defect: inflection / gender / elision / separable verb of the same word (known-side latitude) (×27).

### LEGO over 8 syllables (hand count) — 5 REAL of 5 read · audio ≈ 296 chars
Canon: L3. Usual fix: cut: I'm not going to + be able to; also: cut: feeling as if + I'm nearly ready.
- `S0024L01` non riuscirò a | I'm not going to be able to → cut: I'm not going to + be able to — hand count 9 syllables (tool estimate 7) (sure)
- `S0026L02` sentirmi come se fossi quasi pronto | feeling as if I'm nearly ready → cut: feeling as if + I'm nearly ready — hand count 9 syllables (tool estimate 8) (sure)
- `S0115L02` pronto ad avere una conversazione | ready to have a conversation → cut: ready + to have a conversation — hand count 9 syllables (tool estimate 7) (sure)
- `S0143L02` di cui stavamo parlando prima | as we were talking about earlier → cut: we were talking about + earlier — hand count 10 syllables (tool estimate 8) (sure)
- `S0273L01` purtroppo ho troppo | unfortunately I've got too much → cut: unfortunately + I've got too much — hand count 9 syllables (tool estimate 8) (sure)

### Seed sentence has no LEGO that fits it — 4 REAL of 4 read · audio 0
Canon: P26/L26. Usual fix: fix the LEGO, then add the seed row.
- `seed 74` Grazie mille per avermi aiutato a capire. | Thank you very much for helping me to understand. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 154` Dove vuoi incontrarci sabato sera? | Where do you want to meet on Saturday night? → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 156` Vuoi andare al ristorante stasera? | Do you want to go to a restaurant tonight? → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 257` Mi piace quella cosa blu. | I like that blue thing. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)

### English word used before it is taught — 4 REAL of 4 read · audio ≈ 66 chars
Canon: K8, K8/P17. Usual fix: delete; also: "I'm not going to be able to speak".
- `S0007L01B03` non voglio provare | I don't want to try → delete — "don't" at 19 (sure)
- `S0024L01B02` non riuscirò a parlare | I won't be able to speak → non riuscirò a parlare | I'm not going to be able to speak — "won't" at 157 and LEGO not in row (sure)
- `S0264L01U01` un vecchio è venuto a chiedere aiuto | an old man came to ask for help → delete — "came" never (sure)
- `S0264L01U05` ho incontrato un vecchio che parlava inglese bene | I met an old man who spoke English well → delete — "spoke" never (sure)

### Same row twice in one basket — 3 REAL of 3 read · audio 0
Canon: dup (spa #189), dup/K9. Usual fix: delete this copy; also: delete.
- `S0027L01B02` non mi piace | I don't like → delete this copy — same pair twice in one basket (twin S0027L01B01) (sure)
- `S0145L01B03` non sei più felice? | not happy any more → delete — duplicate AND broken (known is a question, target a fragment) (sure)
- `S0202L02U04` non capiva la domanda | she didn't understand the question → delete this copy — same pair twice in one basket (twin S0202L02B03) (sure)

### Seed sentence practised only in its OLD prompt wording — 3 REAL of 3 read · audio 0
Canon: P26. Usual fix: replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26).
- `seed 56` Quindi riesco a ricordare come dire alcune parole. | So I can remember how to say a few words. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "quindi posso ricordare come dire alcune parole" (likely)
- `seed 209` Vogliono passare più tempo incontrandosi in gruppo. | They want to spend more time meeting as a group. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "vogliono passare più tempo a incontrarsi in gruppo" (likely)
- `seed 210` Pensano che dobbiamo discutere il problema. | They think that we need to discuss the problem. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "pensano che abbiamo bisogno di discutere il problema" (likely)

### English pattern: embedded q order — 2 REAL of 2 read · audio ≈ 224 chars
Canon: K9. Usual fix: reword as shown.
- `S0145L01U01` mi dispiace non riuscire a vedere perché non sei più felice | I'm sorry that I can't see why are you not happy any more → mi dispiace non riuscire a vedere perché non sei più felice | I'm sorry that I can't see why you're not happy any more — question word order inside a statement (sure)
- `S0145L01U04` non so perché non sei più felice e mi dispiace | I don't know why are you not happy any more and I'm sorry → non so perché non sei più felice e mi dispiace | I don't know why you're not happy any more and I'm sorry — question word order inside a statement (sure)

### English pattern: reported no backshift — 2 REAL of 2 read · audio ≈ 196 chars
Canon: K9. Usual fix: reword as shown.
- `S0129L02B03` pensavo che tu stessi andando così bene | I thought that you're doing so well → pensavo che tu stessi andando così bene | I thought that you were doing so well — past frame with present verb (pensavo che tu stessi) (sure)
- `S0129L02U02` pensavo che tu stessi andando così bene l'ultima volta che abbiamo parlato | I thought that you're doing so well last time we talked to each other → pensavo che tu stessi andando così bene l'ultima volta che abbiamo parlato | I thought that you were doing so well the last time we talked — past frame with present verb (sure)

### Not-new LEGO that was never taught — 2 REAL of 2 read · audio 0
Canon: L31. Usual fix: make NEW.
- `S0207L01` hai fatto | you've done → make NEW — "hai fatto | you've done" never taught — FIXED in eng_for_spa by job #412 (commit d3d659d1, 14 Oct: "eng_for_spa S0207L01 debut (L31)"), not carried to this course (sure)
- `S0257L01` blu | blue → make NEW — "blu | blue" never taught (sure)

### Question mark on one side only — 2 REAL of 2 read · audio ≈ 42 chars
Canon: A9. Usual fix: delete; also: reword as shown.
- `S0145L01B03` non sei più felice? | not happy any more → delete — see dup_rows (sure)
- `S0263L01B02` sai cosa intendo? | you know what I mean → sai cosa intendo? | you know what I mean? — English question lacks "?" (sure)

### One prompt, two English answers (LEGO level) — 2 REAL of 5 read, 3 not a defect · audio ≈ 62 chars
Canon: K2/L26, K2/L34. Usual fix: S0209L02 known → "incontrandosi" (the seed's own form); also: S0240L02 → "smettere di parlare | to stop talking" (L34: inside a larger LEGO).
- `incontrare` incontrare | [{"target": "meeting", "legos": ["S0209L02"]}, {"target": "meet", "legos": ["S0293L01"]}] → incontrandosi | [{"target": "meeting", "legos": ["S0209L02"]}, {"target": "meet", "legos": ["S0293L01"]}] — "incontrare" → "meeting" (S0209L02) and "meet" (S0293L01); seed 209 says "incontrandosi" (likely)
- `parlare` parlare | [{"target": "talking", "legos": ["S0240L02"]}, {"target": "speak", "legos": ["S0283L02"]}] → smettere di parlare | to stop talking — "parlare" → "talking" (S0240L02) and "speak" (likely)
Not a defect: "parli?" vs "parli": question mark differs (A7) (×1); "è | is" vs "e | and": the accent is stripped by the tool (×1); "to know" vs "know": K54 (×1).

### One prompt, two English answers (phrase level) — 2 REAL of 10 read, 8 not a defect · audio 0
Canon: K2/P15. Usual fix: Kai's call — seeds 20/21 may teach his/her on purpose (P15); if not, mark the her-rows "il nome di lei" or keep only one gender per prompt.
- `mi piacerebbe scoprire il suo nome` mi piacerebbe scoprire il suo nome | [{"target": "i'd like to find out his name", "rows": ["S0020L02U01"], "n": 1}, {"target": "i'd like to find out her name", "rows": ["S0021L03U03"], "n": 1}] → Kai's call — seeds 20/21 may teach his/her on purpose (P15); if not, mark the her-rows "il nome di lei" or keep only one gender per prompt — "il suo nome" → "his name" (seed 20 rows) and "her name" (seed 21 rows): one prompt, two answers (same in fra seed 21) (best guess)
- `vuoi ricordare il suo nome` vuoi ricordare il suo nome | [{"target": "you want to remember his name", "rows": ["S0020L02U06"], "n": 1}, {"target": "you want to remember her name", "rows": ["S0021L03U05"], "n": 1}] → Kai's call — seeds 20/21 may teach his/her on purpose (P15); if not, mark the her-rows "il nome di lei" or keep only one gender per prompt — "il suo nome" → "his name" (seed 20 rows) and "her name" (seed 21 rows): one prompt, two answers (same in fra seed 21) (best guess)
Not a defect: question vs statement differ by "?" (A7) (×4); same group as zut_lego row (×2); "è" vs "e": accent stripped by the tool (×1).

### English pattern: perfect with past time — 1 REAL of 8 read, 7 not a defect · audio ≈ 74 chars
Canon: K26/L26. Usual fix: reword as shown.
- `S0265L01U03` È mio amico dall'anno scorso | he has been a friend since last year → È mio amico dall'anno scorso | he has been my friend since last year — English drops "my" (È mio amico) — known says my friend (likely)
Not a defect: correct English (conditional perfect / since / relative clause) (×7).

### LEGOs of 7-8 syllables (list for the shortest-cut pass) — 0 REAL of 26 read
26 new LEGOs of 7-8 syllables, within the cap (full list in the JSON). E.g. `S0029L01` I'm looking forward to speaking, `S0033L01` how long have you been learning, `S0034L03` when other people are here, `S0076L02` with how much I've learnt already, `S0088L01` to talk to people I don't know, `S0101L01` I'm enjoying finding out more, `S0108L02` wake in the middle of the night, `S0109L02` to learn a lot of new words, `S0112L01` that was very interesting, `S0116L01` this isn't the best choice

### English pattern: adverb after object — 0 REAL of 3 read, 3 not a defect
Not a defect: natural English (×3).

### English pattern: duration present simple — 0 REAL of 2 read, 2 not a defect
Not a defect: "for a while" used correctly (×2).

### Seed vs basket differ only by a contraction — 0 REAL of 7 read, 7 not a defect
Not a defect: basket English differs only by a contraction: "learning english isn't easy but it's fun" (×1); basket English differs only by a contraction: "it isn't difficult to find the answer" (×1); basket English differs only by a contraction: "that's not what i'm trying to say" (×1).

### Seed vs basket differ only by gender ending / dropped pronoun — 0 REAL of 10 read, 10 not a defect
Not a defect: basket plays the seed in its female / subject-dropped form (×10).


## eng_for_por (Portuguese speakers)

### Seed sentence never practised (no copy in any played basket) — 39 REAL (listed by mechanism, NOT read one by one) · audio 0
Canon: P26. Usual fix: add as USE row under its last new LEGO, seed clips reused.
- `seed 5` Vou praticar falar com outra pessoa. | I'm going to practise speaking with someone else. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 10` Não tenho a certeza se consigo lembrar a frase toda. | I'm not sure if I can remember the whole sentence. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 11` Eu gostaria de poder falar depois de terminares. | I'd like to be able to speak after you finish. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 15` E eu quero que fales inglês comigo amanhã. | And I want you to speak English with me tomorrow. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 23` Vou começar a falar mais em breve. | I'm going to start talking more soon. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- `seed 28` É útil começar a falar o mais cedo possível. | It's useful to start talking as soon as you can. → add as USE row under its last new LEGO, seed clips reused — seed sentence in no played basket (sure)
- … 33 more in the JSON (same fix).

### LEGO English not in its seed English — 29 REAL of 31 read, 2 not a defect · audio ≈ 1,454 chars
Canon: L26/K2. Usual fix: LEGO English; also: seed English.
- `S0016L02`  | everybody →  | everyone — LEGO "everybody", seed "everyone" (likely)
- `S0028L01`  | as soon as possible →  | It's useful to start talking as soon as possible. — o mais cedo possível (sure)
- `S0029L02`  | to speak better as soon as possible →  | I'm looking forward to speaking better as soon as possible. — same family; LEGO is also 10 syllables (see L3) (sure)
- `S0097L02`  | when you want →  | Yes I'm ready to go when you want. — quando quiser (likely)
- `S0108L01`  | to wake up →  | We didn't hope to wake up in the middle of the night. — wake up (likely)
- `S0108L02`  | we didn't hope to wake up → see why — covered by seed 108 (likely)
- … 23 more in the JSON (same fix).
Not a defect: contraction only (×2).

### Seed sentence practised with DIFFERENT English — 28 REAL of 28 read · audio 0
Canon: P26/K2. Usual fix: unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars).
- `seed 29` Estou ansiosa para falar melhor o mais cedo possível. | I'm looking forward to speaking better as soon as I can. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i'm looking forward to speaking better as soon as possible" ≠ seed English (one prompt, two answers) (likely)
- `seed 93` Está na hora de ir. | It's time to go now. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "it's time to go" ≠ seed English (one prompt, two answers) (likely)
- `seed 97` Sim, estou pronta para ir quando quiser. | Yes I'm ready to go as soon as you want. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "yes i'm ready to go when you want" ≠ seed English (one prompt, two answers) (likely)
- `seed 108` Não esperávamos acordar a meio da noite. | We didn't hope to wake in the middle of the night. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "we didn't hope to wake up in the middle of the night" ≠ seed English (one prompt, two answers) (likely)
- `seed 120` É interessante que goste de ir de autocarro. | It's interesting that you like to go by bus. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "it is interesting that you like going by bus" ≠ seed English (one prompt, two answers) (likely)
- `seed 124` Eu achei que era uma boa ideia. | I thought that was a good idea. → unify to one English (see the LEGO row for the seed where there is one); replace the stale row with the seed sentence (seed clips, 0 chars) — same prompt, basket English "i thought that it was a good idea" ≠ seed English (one prompt, two answers) (likely)
- … 22 more in the JSON (same fix).

### Row does not contain its LEGO — 12 REAL of 14 read, 2 not a defect · audio ≈ 170 chars
Canon: K2/P17, K50, P17, P17/K9. Usual fix: none beyond LEGO; also: delete.
- `S0047L03B01` cometer erros | making mistakes → delete — "making mistakes" under "to make" (sure)
- `S0109L01U01` precisamos de trabalhar muito | we need to work hard → delete — "precisamos | we need to" under "must" (sure)
- `S0130L02U01` foi uma surpresa ouvir o que disseste | it was a surprise to hear what you said → foi uma surpresa ouvir o que disseste | that was a surprise to hear what you said — "it was a surprise" under "that was a surprise" (likely)
- `S0144L02B03` acordei mais cedo do que queria esta manhã | I woke earlier than I wanted this morning → acordei mais cedo do que queria esta manhã | I woke earlier than I wanted to this morning — "than I wanted this morning" lacks "to" (sure)
- `S0183L01B02` infelizmente não tive tempo | I'm afraid I didn't have time → none beyond LEGO — fixed by S0183L01 LEGO re-gloss (sure)
- `S0183L01B03` não, infelizmente não sei | no, I'm afraid I don't know → none beyond LEGO — fixed by S0183L01 LEGO re-gloss (sure)
- … 6 more in the JSON (same fix).
Not a defect: question LEGO reordered inside an embedded clause (×2).

### Seed sentence has no LEGO that fits it — 8 REAL of 8 read · audio 0
Canon: P26/L26. Usual fix: fix the LEGO, then add the seed row.
- `seed 113` Porque é que não consigo lembrar o que disseste? | Why can't I remember what you said? → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 241` Eu não quero dar-lhe isso. | I don't want to give it to him. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 242` Eu quero dar-lhe mais tempo. | I want to give her more time. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 246` Eu queria que ela o ajudasse mas estava muito ocupada. | I wanted her to help you but she was too busy. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 249` Eu quero que me ajudes antes de ir. | I want you to help me before you go. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- `seed 257` Eu gosto daquela coisa azul. | I like that blue thing. → fix the LEGO, then add the seed row — no new LEGO of this seed appears in its sentence (LEGO glossed from another wording) — follows the L26 fix for that seed (likely)
- … 2 more in the JSON (same fix).

### Seed sentence practised only in its OLD prompt wording — 7 REAL of 7 read · audio 0
Canon: P26. Usual fix: replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26).
- `seed 46` Mas não me preocupo com erros. | But I don't worry about making mistakes. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "mas não me preocupo com cometer erros" (likely)
- `seed 47` Porque eu acho que é bom cometer erros. | Because I think that it's a good thing to make mistakes. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "porque eu acho que é uma coisa boa cometer erros" (likely)
- `seed 76` Estou muito satisfeito com o quanto já aprendi. | I'm very happy with how much I've learnt already. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "estou muito satisfeito com o quanto aprendi já" (likely)
- `seed 121` É invulgar não gostar de usar o carro. | It's unusual that you don't like to use your car. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "é invulgar que não gosta de usar o carro" (likely)
- `seed 154` Onde é que queres encontrar-te na noite de sábado? | Where do you want to meet on Saturday night? → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "onde é que quer encontrar se na noite de sábado" (likely)
- `seed 157` Não vou conseguir estar lá no mês que vem. | I won't be able to be there next month. → replace the stale copy with the seed sentence as a USE row (seed clips reused); Kai picks the wording if the old one is better (P26) — basket carries the OLD known wording: "não vou conseguir estar lá o mês que vem" (likely)
- … 1 more in the JSON (same fix).

### Same row twice in one basket — 6 REAL of 6 read · audio 0
Canon: dup (spa #189). Usual fix: delete this copy.
- `S0063L01B02` não se importa de | you don't mind → delete this copy — same pair twice in one basket (twin S0063L01B01) (sure)
- `S0100L02U04` não se devia preocupar em fazer algo parecido | you shouldn't worry about doing something similar → delete this copy — same pair twice in one basket (twin S0100L02B03) (sure)
- `S0120L02B03` é interessante que goste de ir de autocarro | it is interesting that you like going by bus → delete this copy — same pair twice in one basket (twin S0120L02B02) (sure)
- `S0153L03B02` não teria dito | I wouldn't have said it → delete this copy — same pair twice in one basket (twin S0153L03B01) (sure)
- `S0189L01B02` sim, é uma boa ideia | yes, that's a good idea → delete this copy — same pair twice in one basket (twin S0189L01B01) (sure)
- `S0272L01B02` parece uma ótima ideia | sounds like a good idea → delete this copy — same pair twice in one basket (twin S0272L01B01) (sure)

### LEGO prompt not in its seed prompt — 5 REAL of 25 read, 20 not a defect · audio ≈ 109 chars
Canon: L26. Usual fix: seed known; also: LEGO known to the seed.
- `S0046L02` cometer erros |  → Mas não me preocupo em cometer erros. |  — seed known "com erros" lacks "cometer" (English "about making mistakes") (likely)
- `S0047L02` é uma coisa boa |  → Porque eu acho que é uma coisa boa cometer erros. |  — seed known "é bom" vs English + LEGO "é uma coisa boa" (likely)
- `S0094L01` vai funcionar |  → LEGO known to the seed — seed known "de funcionar" vs LEGO "vai funcionar" (likely)
- `S0182L04` já viu |  → LEGO known to the seed — seed lost "já" that the LEGO teaches (likely)
- `S0282L01` não é um problema |  → Não, não é um problema. |  — seed known "não há problema" vs LEGO "não é um problema" (likely)
Not a defect: inflection / gender / elision / separable verb of the same word (known-side latitude) (×20).

### LEGO over 8 syllables (hand count) — 4 REAL of 4 read · audio ≈ 252 chars
Canon: L3. Usual fix: cut: to speak better + as soon as possible (S0028); also: cut: anything else + before I answer.
- `S0029L02` falar melhor o mais cedo possível | to speak better as soon as possible → cut: to speak better + as soon as possible (S0028) — hand count 10 syllables (tool estimate 9) (sure)
- `S0250L01` mais alguma coisa antes de eu responder | anything more before I answer → cut: anything else + before I answer — hand count 9 syllables (tool estimate 8) (sure)
- `S0260L01` não faço a mínima ideia | I don't have the faintest idea → cut: I don't have + the faintest idea — hand count 9 syllables (tool estimate 8) (sure)
- `S0281L01` terminar o meu café antes de começar | finish my coffee before we start → cut: finish my coffee + before you start — hand count 9 syllables (tool estimate 8) (sure)

### Not-new LEGO that was never taught — 2 REAL of 2 read · audio 0
Canon: L31. Usual fix: make NEW.
- `S0207L01` fizeste | you've done → make NEW — "fizeste | you've done" never taught — FIXED in eng_for_spa by job #412 (commit d3d659d1, 14 Oct: "eng_for_spa S0207L01 debut (L31)"), not carried to this course (sure)
- `S0257L01` daquela coisa azul | that blue thing → make NEW — "daquela coisa azul | that blue thing" never taught (sure)

### Question mark on one side only — 2 REAL of 2 read · audio ≈ 32 chars
Canon: A9, K9/A9. Usual fix: add "?" to known; re-record known; also: delete.
- `S0150L01U05` pode dizer-me qual é o seu nome | can you tell me what your name is? → pode dizer-me qual é o seu nome? | can you tell me what your name is? — known lacks "?" (sure)
- `S0169L01B01` queres que eu faça? | you want me to do → delete — "you want me to do" is a fragment of a question (sure)

### English pattern: embedded q order — 1 REAL of 1 read · audio ≈ 94 chars
Canon: K9. Usual fix: reword as shown.
- `S0166L01U02` pode dizer-me como se diz o meu nome em inglês? | can you tell me how do you say my name in English? → pode dizer-me como se diz o meu nome em inglês? | can you tell me how you say my name in English? — question word order inside a question (sure)

### English pattern: perfect with past time — 1 REAL of 1 read · audio ≈ 86 chars
Canon: K9. Usual fix: reword as shown.
- `S0042L02U05` estou a aprender inglês melhor do que no mês passado | I've been learning English better than last month → estou a aprender inglês melhor do que no mês passado | I'm learning English better than last month — "I've been learning English better than last month" is not natural; known says estou a aprender (likely)

### English pattern: reported no backshift — 1 REAL of 14 read, 13 not a defect · audio ≈ 60 chars
Canon: K9. Usual fix: reword as shown.
- `S0105L01U06` não sabia que era assim | I didn't know it's like that → não sabia que era assim | I didn't know it was like that — "didn't know" + present reads wrong (likely)
Not a defect: "said that he is …" is normal English for a fact still true (P14, soft) (×13).

### One prompt, two English answers (phrase level) — 1 REAL of 3 read, 2 not a defect · audio 0
Canon: K2/A7. Usual fix: delete S0032L01U02.
- `querias mostrar-me algo ontem` querias mostrar-me algo ontem | [{"target": "you wanted to show me something yesterday", "rows": ["S0032L01U02"], "n": 1}, {"target": "did you want to show me something yesterday", "rows": ["S0032L02U01"], "n": 1}] → delete S0032L01U02 — S0032L01U02 is a statement row ("you wanted…") inside the question LEGO "did you want"; the other row asks it (likely)
Not a defect: K54 (×1); question vs statement differ by "?" (A7) (×1).

### LEGOs of 7-8 syllables (list for the shortest-cut pass) — 0 REAL of 35 read
35 new LEGOs of 7-8 syllables, within the cap (full list in the JSON). E.g. `S0033L01` how long have you been learning?, `S0034L02` when other people are here, `S0057L01` I can't remember how to say, `S0079L01` when did you start to learn, `S0081L01` when do you want to start, `S0108L03` in the middle of the night, `S0113L01` I can't remember what you said, `S0120L02` that you like going by bus, `S0121L02` don't like to use your car, `S0142L04` I'm grateful to you for helping

### English pattern: adverb after object — 0 REAL of 2 read, 2 not a defect
Not a defect: natural English (×2).

### English pattern: double negative — 0 REAL of 1 read, 1 not a defect
Not a defect: not a double negative (×1).

### Seed vs basket differ only by a contraction — 0 REAL of 4 read, 4 not a defect
Not a defect: basket English differs only by a contraction: "we're trying to say that it isn't like that" (×1); basket English differs only by a contraction: "you are like someone i used to know" (×1); basket English differs only by a contraction: "what is that blue thing over there" (×1).

### Seed vs basket differ only by gender ending / dropped pronoun — 0 REAL of 24 read, 24 not a defect
Not a defect: basket plays the seed in its female / subject-dropped form (×24).

### One prompt, two English answers (LEGO level) — 0 REAL of 1 read, 1 not a defect
Not a defect: "understand" vs "to understand": K54 (×1).

## Coverage

| family | spa | fra | deu | ita | por |
|---|---|---|---|---|---|
| mechanical detectors (all 17 families) | scanned, every hit read | same | same | same | same |
| seed_not_played: "missing" class (243 rows) | listed, not read one by one: the fix is mechanical (add the seed as a row, 0 chars) | same | same | same | same |
| seed_not_played: the other classes | every row read | same | same | same | same |
| lego_not_in_seed_known | read; default NOT where the difference is an inflection, gender ending, elision (qu'il, du) or separable verb — the tool counts these as missing words | same | same | same | same |
| English lexical patterns (17, see below) | scanned, every hit read | same | same | same | same |
| intro wording, wrong word spoken, female voice saying the male form | NOT scanned (ear-only by ruling A22, or no text route) | same | same | same | same |
| grammar / naturalness of rows nothing pointed at | NOT scanned (a separate read, R0.16) | same | same | same | same |

## English patterns added (`eng-eu.patterns.json`, side = target)

Built from the deu_for_eng #435 en-calque fixes (ops/deu-435) and spa_for_eng #181 wrong-English fixes (d/ff0787c4). Each fix-record pattern matches its own pre-fix text (detect.cjs calibration passes, exit 0).
Live hits that turned out REAL: embedded question order (6), present perfect with "yesterday" (3), no-backshift after a past verb (4), "since a while ago" (1), "I've been learning … than last month" (1).
Five patterns have NO known positive in any fix record and found nothing real here: future-in-time-clause, duration + present simple, preposition calques, uncountable plurals, "have hunger"-type calques. They stay in the file with kp = null as candidates only; by the brief they are **dropped as detectors** (named here).
Regex false positives worth knowing: `\w+ing` catches *bring*; "how to do" trips the question-order pattern; "people is" fires across a clause.

## Gaps (plain)

- **Not read one by one:** the 243 "seed never practised" rows (spa 71, fra 49, deu 48, ita 36, por 39). They are real by P26 and the fix is mechanical, but I did not check each seed sentence's English.
- **Audio not checked:** whether existing clips voice the dots in "do you speak ...?" / "than…", or read the 11 spa questions-without-"?" flat. Ear only (A22).
- **No proofread of eng_for_spa seeds 301-326.** eng_for_spa serves 326 seeds; seeds past 300 have not been confirmed proofread (Kai memory, released-seed-cap). Several spa hits are there (qmark rows S0304-S0326).
- **Intro texts not read.** Every LEGO re-gloss here needs its intro re-voiced; those characters are not in the totals.
- **Edit history not read** (admin login needed), so "which wording is newer" is inferred from the seed being the polished side, not from timestamps.
- **eng_for_spa S0257L01** may already be queued (Kai's 14 Oct note: "1 eng_for_spa never-debuted pair", #422·Q); I could not confirm which pair.
