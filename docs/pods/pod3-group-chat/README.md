# Pod 3 group chat, round 5: zombie's energy, fresh topics, the room breaks in

**Verdict in one line:** the table is back to round 3's zombie energy (winding each other up, stories sparking stories, gossip), but each evening starts from something specific that just happened to one of them, and someone always has a surprising angle on it. Glasses, crisps, the dog and the barman break in. The lines stall and restart. There are three or four group-contribution moves per evening, spaced out, each checked against its own test.

## Read these, best first

1. **The replacement hamster.** Femi's daughter's school quietly swapped the dead class hamster for a lookalike. She caught it because the new one bites, then asked Femi whether he'd do the same if she died. Surprising angles: Hugh skins a dead lamb so a ewe will take an orphan; Sunny's mum kept three budgies, all called Raja; every collie Hugh has owned has been called Fly, and for his son Will the dog that bit is the real one. It ends mid-story, on a tin of cat collars all marked Sooty. Best because it has the most zombie-like energy and every angle is a real one. [Replay](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/hamster.html) · [script](https://watson-1.tail4968cb.ts.net/d/d4bcb2bf)
2. **The note under the wallpaper.** Rhi found a 1962 paperhanger's pencilled note: *whoever reads this, I hope you're happier than me*, with a Cardiff win written beside it. The table looks at why he wrote the score, Year Nines' desk graffiti, an alibi, and Hugh's father's note that no one ever read. It has the shortest, loosest turns of the three (median 6 words) and is closest to real talk. The ending is unresolved: paper over it, or not? [Replay](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/wallpaper.html) · [script](https://watson-1.tail4968cb.ts.net/d/310608b9)
3. **Toast at 2:43.** Jess's new smart meter shows Matt getting up for toast at the same minute every night. Surprising angles: researchers have worked out which film someone was watching from their meter alone, and maybe Matt knows she's watching. It moves to Rhi watching Cai's dot on her phone and to the dogs that go quiet only for Will, and ends on Jess realising she may be the one waking him. Good, but the lines run longer (median 18). [Replay](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/kettle.html) · [script](https://watson-1.tail4968cb.ts.net/d/c42845a5)

| Sample | Words per line heard (median / max) | Turns of 6 words or fewer | Cut-ins | Over the end | Physical break-ins | Laughs | Second speaker starts at | Moves kept, by turn |
|---|---|---|---|---|---|---|---|---|
| Hamster | 12 / 32 | 14 | 9 | 2 | 5 | 0 | 5.7 s | F2@6, F16@15, F11@22, F303@27 |
| Wallpaper | 6 / 35 | 21 | 9 | 4 | 5 | 0 | 5.3 s | F306@6, F301@14, F16@28 |
| Kettle | 18 / 32 | 13 | 9 | 3 | 4 | 0 | 5.7 s | F302@5, F9@13, F305@20, F304@27 |

For comparison, #986's round 3b (/d/d9d99d4e) placed nine or ten of the ten moves in each 36 turns and had "ha" on most good lines.

## What changed, building on #986's round 3b

- **Topics:** no stock pub topics. Each one is specific, grows out of one person's life, and has just happened. Each gives the bright people at the table a real angle from the farm, the surgery, the classroom or a paper they half-remember. None repeats #986's eulogy, tell-her or know-the-day; those and every earlier round's bits are on the avoid-list.
- **Cards (`personas.md` v5):** round 3's energy is back: what winds each person up and the stories they tell. Round 4's *Knows about* and *Would argue for* stay, so each person has an angle to bring.
- **Structure:** `style-corpus-structure.md`, the structure-only digest of #987's corpus excerpts. No line from the excerpts is committed, and `measure.cjs` finds no four-word run shared with them in any evening.
- **No laugh track:** laugh backchannels are filtered out in code. There are none.
- **The room breaks in:** an `event` field puts a short stage direction before a turn (a pint nearly over, a crisp packet splitting, the barman clearing glasses, the spaniel, a phone lighting up). There are at most five per evening, at least four turns apart, and they never change the subject for good.
- **Looser lines:** "yeah", "right" and "go on" count as whole turns. About three turns in ten are nudged to be unpolished (a restart, a stall, a self-correction). The prompt bans quotable, balanced or twist-ending lines.
- **Moves at a realistic density:** four planned per evening, about seven turns apart. The judge strips any tag that fails its moves.json test, the group reading or the three-person rule. A move turn can no longer be cut off: in the probe an F16 was cut before its "but".
- **Files:** #986's round 3b evenings are in `v3/` (`README-3b.md`, `chain-3b.cjs`), and round 4 (sheep, Warsaw, tickle) is in `v4/`.

## What still doesn't work

- **The stammer is a bit uniform.** The "she's— she's" restarts are the right idea, but they come out in one style. Real talk mixes stalls, wrong words and abandoned turns more.
- **Wallpaper kept three moves:** the judge ruled its F11 ("Doesn't say. Femi?") a deferral, not a handing on. Left as it is, since a realistic density is the aim.
- **The second speaker comes in at 5 to 6 s.** The openers are still full sentences.
- **Kettle runs long** (median 18 words heard).
- **One hand fix, no rewording:** a doubled cut-off dash in wallpaper. No reruns.

## Files
`node chain.cjs <hamster|kettle|wallpaper|probe> 36 opus` with `AVOID_FILE=avoid-shared.txt STYLE_FILE=style-corpus-structure.md`. Under systemd, pass `CLAUDE_CONFIG_DIR`. The other tools are `measure.cjs`, `rejudge.cjs` and `render-replay.cjs`. The replays are committed in command-surface (`public/evidence/pod3-group-chat/{hamster,kettle,wallpaper}.html`, commit cdfa1fe2fe). The probe is in `probe/`.
