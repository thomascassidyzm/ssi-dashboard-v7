# Pod 3 group chat, round 2: an articulate pub table arguing about something real

**Verdict in one line:** this is the conversation Tom asked for. Six sharp people with real stakes argue properly, change their minds partway, land good lines and stay distinguishable, and none of round 1's set pieces come back. What's left to fix is polish (a writerly sheen, a few habits that recur across evenings), not the concept.

## Read these, best first

1. **Who should win, the experts or the town?** 300 homes on the water meadow, approved over the town's objection. Best because the argument genuinely moves: the question turns from "experts or town" into who owns the right to build, who ate the cost, and who ends up holding the flood risk. Every character changes what the others think. [Replay](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/estate.html) · [script](https://watson-1.tail4968cb.ts.net/d/50fa396b)
2. **Should inheritance be taxed heavily?** Hugh's farm under the new rules; Jess says "Good." [Replay](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/inherit.html) · [script](https://watson-1.tail4968cb.ts.net/d/06caed6c)
3. **Is university still worth it?** Rhi's son Cai: history at Bristol or a paid aerospace apprenticeship. [Replay](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/degree.html) · [script](https://watson-1.tail4968cb.ts.net/d/e39609f4)

36 lines each, about 3 to 4 minutes of talk.

## What changed from round 1

- **Setting:** the back room of a pub in a market town in the Welsh Marches, mid-evening, regulars and friends-of-friends. Nobody hosts, so nobody refills glasses.
- **Cards:** a heating engineer who left school at 16, a Cambridge-educated beef farmer, a renting English teacher, an Environment Agency flood engineer, a probate solicitor who arrived from Gdańsk at 12, and a GP partner. Every one is articulate. No "gets wrong" line and no catchphrases. Each card lists six ways of arguing, and the engine rotates them. The round-1 cards and samples are kept in `v1/`.
- **Topics:** each one has a personal stake for someone at the table, not a seminar question.
- **Engine (`chain.cjs`):** the "flat, ordinary turns" and comic-flaw rules are gone. New rules: everyone is articulate; no lecture turns, no "both sides"; banned set pieces (misquoted thinkers, drinks to change the subject, a sentimental or punchline ending). Each topic has its own ending shape: mid-argument (inheritance), a grudging concession (estate), a tangent (degree). Also new: cut-in pressure after five polite turns, because the probe had none in 10 lines (`probe/`), and an optional `AVOID_FILE` of bits already used on other evenings.
- **One rerun:** the first degree take (kept in `probe/`) recycled bits from the other two. These were Femi's "you've merged two things", Sunny's dad's shop and Jess's Year 11s, plus a parent's confession about his son. It was rerun once with an avoid-list.

| Sample | Lines | Cut-ins | Over the end | Listener noises | Words per line | Spread |
|---|---|---|---|---|---|---|
| Estate | 36 | 6 | 2 | 10 | 2 to 115 | 0.81 |
| Inheritance | 36 | 7 | 2 | 5 | 4 to 108 | 0.76 |
| Degree | 36 | 6 | 1 | 4 | 2 to 106 | 1.05 |

Spread is the standard deviation of words per line divided by the mean; Aran's real pod-0.5 recording measured 0.84.

## What works
- **Real argument with stakes.** Positions come from people's lives (the rent, the farm, the surgery list, the flood map), and they collide. People concede ground grudgingly ("I'm only saying it the once because he'll be unbearable about it") rather than summarising.
- **Wit from sharpness.** Deadpan put-downs and teasing that lands; nobody is the fool.
- **Distinct voices.** With the names hidden you can still tell Hugh's understatement from Rhi's figures and Danny's case stories.
- **Round-1 set pieces gone.** No misquoted thinker, no refills, no touching close. The three endings differ.

## What doesn't, yet
- **A writerly sheen.** Many lines are a bit too well-turned for a pub; there are fewer dead ends and fumbles than at a real table.
- **Habits recur across evenings.** Estate and inheritance share Femi's "you've merged two things" move and Sunny's "I came in tonight on one side" turn. Danny tells a client case most times he speaks. The avoid-list fixed this for the third sample; running all three topics with a shared avoid-list from the start would fix it properly.
- **One small fact slip.** In the inheritance sample, Hugh (66) says he was nine in 1961.
- **Long first lines.** Opening turns are long, so the replays take 20 to 40 seconds to get going.
- **Still no learner at the table.** This tests the table talking to itself, as in round 1.

## Files
`node chain.cjs <estate|inherit|degree> <turns> opus` (optional `OUT_KEY=`, `AVOID_FILE=`). Render a replay with `node render-replay.cjs <topic> "<title>" <html dir>`. Replays are served from `~/command-surface/public/evidence/pod3-group-chat/`.
