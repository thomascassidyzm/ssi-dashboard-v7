# Pod 3 group chat, round 3: a pub table contributing to a real question

**Verdict in one line:** the table is now doing what layer 3 is meant to teach. Six bright people pick up each other's lines, sharpen them, concede and hold, hand the floor on, and coin phrases the rest reuse. The talk is pub talk in short turns about a question that came out of something that just happened. Each evening places nine or ten of the ten moves. The argument moves, and the replays get going in about 4 seconds.

## Read these, best first

1. **Hugh has to give the eulogy.** Clive farmed next door for forty years and was mean with it. Clive once sent Hugh a bill for the diesel after pulling him out of a ditch, and from there the question turns: Clive wasn't mean, he was "itemised". Hugh adopts the word, the table reuses it, and it turns out Clive chose Hugh himself and asked for the eulogy to be short. Best, because the question becomes a better question and every move does real work. [Replay](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/eulogy.html) · [script](https://watson-1.tail4968cb.ts.net/d/93edca4b)
2. **Does Rhi tell Gwen?** Rhi saw Gwen's husband in a Ludlow hotel sharing a pudding with another woman, and Rhi is servicing Gwen's boiler on Thursday. It moves from "say nothing" to who Gwen would forgive, then to a rehearsal with Sunny playing Gwen, then to whether Gwen already knows. [Replay](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/tellher.html) · [script](https://watson-1.tail4968cb.ts.net/d/2d5ae571)
3. **Would you want to know the day?** Femi says yes; Sunny says he wouldn't. "It's not the day you die, it's the day you start dying." It drifts into stories about people planning for death (a coffin full of potatoes, an envelope that turns out to hold a gas bill) and ends on the mums who keep every bill. [Replay](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/knowday.html) · [script](https://watson-1.tail4968cb.ts.net/d/e672c783)

36 lines each, six speakers each, roughly 2 to 3 minutes of talk. Every turn that carries a move shows its ID: as a code after the name in the script, and as a small badge in the replay.

## Moves placed (turn numbers)

| Move | Eulogy | Tell her | Know the day |
|---|---|---|---|
| F9 let me check I've got it | 5 | 5 | 7 |
| F301 so what you're saying is | 17 | 15 | 11 |
| F305 absorb and build | 21 | 20 | 13 |
| F16 fair enough, but I still | 23, 36 | 9 | 8 |
| F2 do it and throw something in | 6, 8, 31 | 13, 26 | 17 |
| F303 the shared line | 20 | 11, 29 | 15 |
| F304 comment on the medium | 25 | 12 | not placed |
| F306 exactly where I'm about to go | 12 | 16 | 6 |
| F11 and you? | 22 | 19 | 16 |
| F302 it proves nothing, accept it anyway | 24 | 14 | 18 |

The engine tags its own moves. I read every tagged turn against the move's test. One tag failed: "know the day" turn 19 ("Whole table's—") is about who holds which position, not about the conversation itself, so it was stripped and F304 is unplaced there. Two tags are on the generous side. In "tell her", turn 15 F301 ("so it's hereditary") is adopted only implicitly. In "know the day", turn 15 F303 ("Colour-coded—") reuses Jess's word but gets cut off after it.

| Sample | Words per line (median / max) | Turns of 6 words or fewer | Cut-ins | Over the end | Second speaker starts at |
|---|---|---|---|---|---|
| Eulogy | 6 / 32 | 20 | 9 | 2 | 4.6 s |
| Tell her | 15 / 33 | 11 | 9 | 6 | 4.6 s |
| Know the day | 17 / 37 | 13 | 9 | 2 | 4.2 s |

Round 2 ran from 2 to 115 words per line and took 20 to 40 seconds to get going.

## How it was built

- **Structure** comes from #987's real recorded excerpts (Santa Barbara, KIParla, Val.Es.Co, CLAPI, /d/dbb63a59), used for shape only, never lines: tiny turns, constant overlap, stories that get interrupted, teasing over opinions. A few lines of Tom and Aran's own recorded talk (`style-real-talk.md`) are in the prompt as a texture reference.
- **Content** is a question a pub table would genuinely chew on, set off by something that just happened: a eulogy for a mean neighbour, whether to tell a friend, whether you'd want to know your death date. It is not policy, not a seminar, and not a lads' holiday. The engine bans toilet, sex and drunk humour on these evenings.
- **Moves** (#988, /d/108cdbeb): the engine gets the ten move tests and may tag a turn only when it passes. Each turn it is told which moves are still unplaced. In the middle of the evening it is sometimes nudged to place one, but only if it fits.
- **Cards** (`personas.md`): the same six people in the same pub. They are rewritten around teasing, stories and what each person is daft about. Danny and Sunny don't tell work cases. Round 2 is in `v2/` and round 1 in `v1/`.
- **Engine** (`chain.cjs`): mostly one-sentence turns; anything over 50 words is regenerated once. The first line is under 15 words, cut-ins come about 1 turn in 3, and nobody repeats the kind of move they have already made. Bans: no politics, no lecture turns, no sentimental or punchline endings. There is a shared avoid-list (`avoid-shared.txt`). No reruns; one 12-turn probe (`probe/`).

## The first take this round: pure banter, no question

Before #988's move set arrived, round 3 ran as pure pub banter: a zombie hypothetical, Danny's Lisbon shirt, and someone who reads the last page first. They are livelier but say less. Nobody has to contribute to anything. [Zombie](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/zombie.html) · [Lisbon](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/lisbon.html) · [Last page](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/lastpage.html)

## What still doesn't work

- **Too many laughs.** "ha" backchannels land on most good lines, which reads like a laugh track.
- **Still a little written.** The real excerpts are far messier: half the turns are "yeah" and "right", with abandoned sentences and side business (plates, candles). These samples have fewer dead ends than real talk, and almost nothing physical breaks in.
- **Move density is higher than a real evening's.** All ten moves in 36 turns is a teaching sample, not a recording. For a learner pod that is probably right; as a picture of a real night it is a touch busy.
- **Still no learner at the table,** as in rounds 1 and 2.

## Files
`node chain.cjs <eulogy|tellher|knowday|zombie|lisbon|lastpage> <turns> opus`, with optional `OUT_KEY=`, `AVOID_FILE=` and `STYLE_FILE=`. Moves are on for eulogy, tellher and knowday. Under systemd, pass `CLAUDE_CONFIG_DIR` or the CLI is not logged in. Render with `node render-replay.cjs <topic> "<title>" <html dir>`; it writes `script-<topic>.md` with move codes. The run JSON is committed, so replays can be rebuilt.
