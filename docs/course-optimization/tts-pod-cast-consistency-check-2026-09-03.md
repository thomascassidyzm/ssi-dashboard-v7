# Two-voice policy consistency check — TTS pod fleet vs Welsh (2026-09-03, ~00:5Xh)

Correction to the earlier framing: Tom already settled this — two voices is deliberate fleet-wide
policy, TTS included ("we recast everything to have only 2 voices, even TTS voices"). This is a
**consistency check**, not a comparison hunting for a third-voice case. No recommendation follows;
read-only throughout.

## 1. The policy is in force — with one honest gap in where the brief expected to find it

`courses.voice_config.podCast` (the field named in the brief) holds a cast for only **5 courses in
the whole DB**: `cym_n_for_eng`, `cym_nnew_for_eng` (both human, Welsh), `cym_s_for_eng` (empty),
plus the two test courses `fin_for_eng` and `zzz_test2_for_eng`. **No TTS course has anything there.**
That field is the *human-recording* cast store (per the code comment in
`pod1-percall-recast.cjs`: "`courses.voice_config.podCast` the HUMAN recording cast").

The TTS fleet's actual cast lives in **`listening_pods.speakers`**. Read there, live:

| distinct target voices | # live TTS pod courses |
|---|---|
| **2** | **61 / 61** |
| 0, 1, 3, 4, 5 | **0** |

Zero outliers. Every live TTS pod course — the 21 "pod-1" full-script courses (231 lines: `ara_eg`,
`ara`, `deu`, `eus`, `fra_ca`, `fra`, `gle`, `hin`, `hrv`, `isl`, `ita`, `jpn`, `kor`, `nld`,
`por_br`, `por`, `ron`, `spa`, `spa_mx`, `swe`, `zho` — all `_for_eng`) and the 40 "pod-0" shorter
courses (142 lines) — casts exactly one male and one female voice. Confirms the policy.

## 2. The casting rule, quoted (task 3)

`tools/pods/pod-cast-gate.cjs`, header, Tom's ruling of 2026-08-23 verbatim:

> "there's always male talking to female, so that two voices can actually do the whole thing, rather
> than per character, which was the problem previously."
>
> **The acceptance criterion: ZERO same-voice exchange pairs, and EXACTLY TWO voices in the cast.**

Casting is *per conversation*, not per character — that's the whole mechanism, and it's the same
mechanism Welsh runs on (`services/voice-engine/pods-cast.cjs`'s two-voice default, ruled 2026-08-06,
predates and matches this).

**"Exchange" has a specific, adjudicated meaning that matters for §3 below.** In the cafe/bar/
restaurant scenes, customers never address each other — each addresses the staff hub. Aran (who
reads the lines) disputed an earlier draft that counted "Customer 1 → Customer 2" as a real
conversational turn; Tom's adjudication sided with him. `pod1-percall-recast.cjs` enumerates these
as `NON_EXCHANGE` pairs (10 of them, scenes 7/8/9, e.g. `'8:4->8:5'` — bar customers ordering in
turn) and **excludes them from the collision count by design**. They are allowed to share a voice.

## 3. Alternation check, run against the live gate itself (not a re-implementation)

Ran `node tools/pods/pod1-two-voice-cast.cjs --verify` — the actual measurement tool, read-only
(no `--apply`; DB untouched, one new log file written to `docs/pods/`) — against all 21 live
`pod-1` courses.

**Two different numbers, and the gap between them is the finding:**

- **Naive raw adjacency** (any two different characters back-to-back on the same voice, no
  exemption): **11 per course**, identical across every language sampled (`fra`, `deu`, `jpn`,
  `spa`, `zho`, `por` checked directly) — 1 in the cafe scene, 5 in the bar scene, 4 in the
  restaurant scene, 1 elsewhere. This is in the same range as Welsh's reported ten.
- **The fleet's own official acceptance criterion** (excludes the 10 hub-ordering `NON_EXCHANGE`
  pairs above): **exactly 1 per course, uniform across all 21 courses, zero outliers.** Always the
  same pair: `Interlocutor↔Narrator`, scene 21. `Gate after: 0/21 PASS` — every course fails the
  gate, but only on this one collision (plus unrelated clip/text-drift failures — off-cast known
  audio, gender-adapted-text mismatches — that are a different defect class, not a casting-count
  issue).

**So: under the fleet's own definition of "exchange," the TTS fleet's genuine residue (1) is much
smaller than Welsh's reported ten — because that definition already excludes exactly the
cafe/bar/restaurant customer-ordering pattern that makes up Welsh's ten.** Two honest caveats,
not a call to re-open Welsh's number, just why it isn't a clean apples-to-apples read against the
"1":

- Welsh's live pod (`cym_n_for_eng:pod-0`, held) is on an **older structural version** — its speaker
  roster (22 keys: `Customer 1/2/3`, no `Cafe Barista`/`Bar Customer`/`Diner` split labels, no
  `Interlocutor`) predates the 2026-08-23/08-24 fleet passes (`pod1-percall-recast.cjs`'s scene-
  unique relabelling, `reattribute-pod1-speakers.cjs`) that produced the exact shape just measured
  above. It has not been run through this same tool.
  - **UNVERIFIED, flagging not asserting:** whether Welsh's "ten, all customer-to-customer" applied
    the same hub-ordering exemption is outside this brief and not re-checked here.
- **A documented gap, found live tonight:** `docs/pods/pod1-two-voice-cast-2026-08-24.md` states the
  `Interlocutor↔Narrator` residual is spurious (Narrator never converses — 352/352 of its lines are
  scene sign-offs, nobody answers it) and claims a code fix landed in `buildExchangeWeights`
  ("tagged `reason: 'non-conversant'`... 59/59 gate tests green"). **That string does not exist
  anywhere in the current codebase** (`grep -rl "non-conversant"` → no hits), and the live
  `--verify` run just reproduced the failure on all 21 courses. The documented fix was written up
  but never landed in the module the gate actually calls (`pod-cast-gate.cjs`). Reported as found;
  not touched, per read-only brief.

## Bottom line

Two voices is confirmed as consistent, deliberate, fleet-wide policy — no outliers anywhere in 61
live TTS pod courses. The casting rule is explicit in code and matches what Welsh already runs on.
On the narrow question of residue: TTS's *raw* same-voice-adjacency count (~11) is in Welsh's range;
TTS's *official gate* count (1, uniform, a known-and-written-up-but-not-yet-fixed false positive) is
much lower than Welsh's ten specifically because the fleet has an explicit ruling exempting hub-
ordering scenes that Welsh's number doesn't appear to have had applied. Nothing here suggests TTS
casting is worse than Welsh's — if anything the opposite, once exemptions are matched apples to
apples — but a same-tool re-measurement of Welsh is the only way to confirm that cleanly, and this
brief was read-only and didn't do it.
