# Pod 3 group chat, round 4: round 3's rhythm, raised content, layer-3 moves

**Verdict in one line:** the same six people at the same pub, in short turns that cut across each other, but now talking about something genuinely interesting. Each evening builds an idea together and performs five or six of the layer-3 group-contribution moves, each one checked against its own test.

## Read these, best first

1. **Do sheep know your face?** Hugh says his ewes know his face and ignore his son Will. Jess calls it sentimental, and Femi half-remembers a study. The table tests the claim properly: is it the face or the walk, who feeds them, and was the follower bottle-fed? It ends on whether anyone counts the sheep that go to Will. Best because it has the shortest turns (median 8 words), the claim really is tested and shifts, and all six planned moves pass. [Replay](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/sheep.html) · [script](https://watson-1.tail4968cb.ts.net/d/d3e2e950)
2. **Is a rebuilt old town fake?** Danny is back from Warsaw, whose old town was rebuilt from Bellotto's paintings, errors included. The talk runs from the little sign that owns up to it, to Georgian fireplaces that are copies from the 1920s, to Hugh's barn built from chapel stones. It ends on whether you see a place properly before or after you read the sign. The most elevated of the three, with five moves. [Replay](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/warsaw.html) · [script](https://watson-1.tail4968cb.ts.net/d/586be4f5)
3. **Why can't you tickle yourself?** Danny's daughter's claim gets tried under the table. It moves through prediction, the delayed robot arm, rats chasing the hand, and on to memories you borrow from other people's retellings. Good content, but the turns run longer (median 15), and two of its five moves were only found after the run. [Replay](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/tickle.html) · [script](https://watson-1.tail4968cb.ts.net/d/b5777c37)

About 36 lines each, roughly 2 to 3 minutes of talk. The move IDs are the metagraph's own (`services/shared/metagraph/moves.json`). Each one appears as a stage direction above the turn and is never spoken.

| Sample | Words per line heard (median / max before cut) | Cut-ins | Over the end | Second speaker starts at | Laughs | Moves kept, by turn |
|---|---|---|---|---|---|---|
| Sheep | 8 / 31 | 8 | 2 | 4.6 s | 0 | F302@3, F2@5, F305@10, F306@15, F9@20, F304@25 |
| Warsaw | 14 / 34 | 9 | 2 | 5.7 s | 0 | F2@3, F301@8, F305@13, F16@19, F11@28 |
| Tickle | 15 / 35 | 9 | 1 | 5.6 s | 0 | F306@5*, F9@8, F16@14, F303@24, F305@25* |

\* found after the run by the same judge (`rejudge.cjs`), not planned. Moves planned but not placed: Warsaw F304 (the judge ruled the attempt at turn 23 was about one person changing sides, not about how the table was talking); tickle F302 (the flag was cut off before the claim) and F11 (the answer never handed the question on). Round 3 for comparison: median 10 to 12 words, max 33 to 43, with "ha" on most good lines.

## What changed from round 3

- **Cards (`personas.md`):** the same six people. Each card now has *Knows about* and *Would argue for*: Rhi on old houses, Hugh on animals' minds, Jess on stories, Femi on checking claims, Danny on memory and history, Sunny on the body and belief. The teasing and the warmth stay. Round 3's cards are in `v3/`.
- **Topics:** each arrives from something concrete, and each is a different kind of thing. Sheep is a half-remembered fact that gets challenged. Warsaw is an idea from a trip that the table pushes on. Tickling is why something everyday works the way it does. I swapped a planned "letters under the floorboards" dilemma for Warsaw because #986's round 3b already had three dilemma evenings.
- **Structure from the real-talk corpus (`style-corpus-structure.md`):** this is a structure-only digest of #987's six excerpts (/d/dbb63a59): turn-length counts (median 4 words, longest about 38), overlap patterns, and the seven points. **No line from the excerpts is committed.** The licences are NC, ND or all rights reserved. The engine is told to copy the structure only, and `measure.cjs` checks every line for any four-word run shared with the excerpts or with Tom and Aran's recording. All three evenings have zero.
- **Move planning (`chain.cjs`):** each evening has a plan of six moves, each with a turn window and a hint about who might make it. Inside the window the speaker is invited to make the move, and on the window's last turn it is required. F9 and F301 force the follow-up turn (confirm, or ratify and adopt) from the person whose view was read back. F303 is coined first and redeployed by someone else later. The speakers see only the ID and the move's test, never its name: in the probe they spoke the names aloud ("proves nothing", "fair enough, but I still").
- **Judge:** after the run, every tag is checked by a separate call against the move's test in moves.json, plus the group reading from #988's doc (/d/108cdbeb) and the three-person rule. A tag that fails is removed and logged in the run JSON under `judgements`. Six tags were removed across the probe and the four runs.
- **Laughter and punchlines:** laugh backchannels are filtered out in code, and there are none in any evening. Turns over 35 words are regenerated, and so are SHORT turns over 10 words. Endings are told not to wrap up or land a punchline.
- **One hand trim:** the sheep evening ended on a quip ("Kids who remember my birthday, obviously"), so its last turn was removed (recorded in the JSON under `handEdits`). It now ends on an open question. No line was reworded. No colleague names, no parentheses.

## What still doesn't work

- **The second speaker comes in at 4.6 to 5.7 s,** slower than round 3's 2 to 4 s, because the openers are fuller sentences.
- **Warsaw and tickle run longer than round 3** (median 14 to 15 words heard). The SHORT-turn cap came in after tickle take 1, and Warsaw still sits near 14.
- **Some moves read slightly signposted:** "that's where I was going with who feeds them" for F306 is close to the move's own name.
- **Tickle was run twice** (`out-tickle-take1.*` is the first take: three moves, with F9 sent to the wrong person, which led to the follow-up fix). That is four full runs in total, the budget.
- **Still no learner at the table.**

## Files
`node chain.cjs <sheep|warsaw|tickle|probe> <turns> opus`, with `OUT_KEY=`, `AVOID_FILE=` and `STYLE_FILE=style-corpus-structure.md`. Under systemd, pass `CLAUDE_CONFIG_DIR` or the CLI is not logged in. `node rejudge.cjs <key> <turn>:<F-id>` runs the judge on an untagged turn. `node measure.cjs <key> [reference text]` gives the table row and the borrowed-phrase check. Render with `node render-replay.cjs <key> "<title>" <html dir>`. The replays are committed in command-surface (`public/evidence/pod3-group-chat/{sheep,warsaw,tickle}.html`, commit 2aa8d2366b). The probe is in `probe/`. Rounds 1 to 3 are in `v1/`, `v2/` and `v3/`.
