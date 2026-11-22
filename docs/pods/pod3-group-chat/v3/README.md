# Pod 3 group chat, round 3: real pub talk, short turns

**Verdict in one line:** this now sounds like a table of quick, funny friends in a pub. The same six bright people, but they tell stories, tease each other, gossip and take a daft question far too seriously, in turns of about ten words. The replays get going in 2 to 4 seconds.

## Read these, best first

1. **Who goes first in a zombie apocalypse?** Femi's seven-year-old asked him at breakfast; Femi said Danny would go first. It goes from zombies to whether the dead float, to a ewe Hugh lost in the river in 2007, to chip-shop ratings, to gossip about Pauline's loft and who Derek ran off with. It ends mid-story. Best because it wanders the way pub talk does and every turn bounces off the one before. [Replay](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/zombie.html) · [script](https://watson-1.tail4968cb.ts.net/d/80b1a687)
2. **Danny's Lisbon shirt.** The airline lost his case, and Kasia picked him an eleven-euro shirt off a market stall. It goes from the shirt, to Hugh's baler-twine belt, to Rhi in Danny's airing cupboard, to his foraged mushrooms, to the wood where the cricket second eleven wee. [Replay](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/lisbon.html) · [script](https://watson-1.tail4968cb.ts.net/d/f62e9681)
3. **She reads the last page first.** Rhi confesses; Jess can't let it go. Spoilers turn into Jess's ex Craig, and then Hugh reveals that Craig married his niece. [Replay](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/lastpage.html) · [script](https://watson-1.tail4968cb.ts.net/d/695f09f2)

36 lines each, roughly 2 minutes of talk.

| Sample | Words per line (median / max) | Cut-ins | Over the end | Second speaker starts at |
|---|---|---|---|---|
| Zombie | 10 / 33 | 9 | 8 | 4.1 s |
| Lisbon | 12 / 43 | 9 | 5 | 3.6 s |
| Last page | 10 / 38 | 11 | 5 | 2.1 s |

Round 2 ran from 2 to 115 words per line and took 20 to 40 seconds to get going.

## What changed from round 2

- **Cards (`personas.md`):** the same six people and the same pub. Each card now says what the person teases others about, what winds them up, the stories they tell and what they're daft about (wild swimming, a feud with a peacock, foraging, Strictly, chippy ratings). The debate moves are gone. Danny and Sunny are told not to tell work cases. Round 2's cards are in `v2/`.
- **Topics:** pub moments with energy already in them (a story, an everyday hot take, a daft hypothetical), never a seminar question. Each one is allowed to wander off its starting point.
- **Engine (`chain.cjs`):** "argue about something that matters" is replaced with pub talk. Turns are mostly one sentence; anything over 50 words is regenerated once. The first line is under 15 words. Cut-ins come about 1 turn in 3. New bans: no politics, policy or current-affairs debate, no lecture or explanation turns. Each speaker is told never to repeat the kind of move they have already made that evening. There is a fixed-facts line for ages and dates.
- **Grounding:** `style-real-talk.md` is about ten lightly trimmed lines from Tom and Aran's real recorded conversation (2026-09-25). The engine copies its texture and is told never to borrow its words. A `STYLE_FILE` hook can add more corpus excerpts.
- **Shared avoid-list (`avoid-shared.txt`):** the avoid-list ran from the start. It carried round 2's habits and grew after each evening, so no bit recurs across the three.
- **One hand edit:** a piece of town gossip in the zombie sample named a "Mandy". That is a colleague's name, so it was changed to Shelley. No other line was touched. There were no reruns.

## What still doesn't work

- **The laughter is heavy.** "ha" backchannels land on most good lines, and Rhi laughs at nearly everything. It reads a bit like a laugh track.
- **Lines are still a little too neat.** The jokes are tighter and land more often than at a real table. There are some fumbles ("the, the torch walk thing"), but fewer dead ends than in Tom and Aran's real recording.
- **Endings:** the last-page sample ends on a punchline ("You'd have rung me sooner"), which the rules ban. The other two end as designed.
- **The toilet humour clusters.** The Lisbon evening goes to wee jokes twice.
- **Still no learner at the table,** as in rounds 1 and 2.
- **Round 2's replays are gone.** degree.html, estate.html and inherit.html were deleted from the evidence folder by something outside this job (they were never committed), and #980's worktree, with its run JSON, has been wiped, so they cannot be rebuilt. Their scripts are still published. This round's replays are committed in command-surface, and its run JSON is force-added here so they can be rebuilt.

## Files
`node chain.cjs <lisbon|lastpage|zombie> <turns> opus`, with optional `OUT_KEY=`, `AVOID_FILE=` and `STYLE_FILE=`. Under systemd, pass `CLAUDE_CONFIG_DIR` or the CLI is not logged in. Render a replay with `node render-replay.cjs <topic> "<title>" <html dir>`. The 10-turn probe is in `probe/`. Rounds 1 and 2 are in `v1/` and `v2/`.
