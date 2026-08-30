# The known-side gate emits a permanent false advisory on 21% of our phrases

Found while building `gle_cn_for_eng` on 2026-08-18. Worker #170 reported the noise; this is the
mechanism, confirmed by reading the code and quantified against the live course. **Not a Connemara
question — a gate question**, and it affects every `*_for_eng` course, so it is filed separately.

## What you see

Every submit from seed 5 onward logged, per phrase:

```
⚠ S0005L01: known-side "I'm going to speak" — machinery "going" needs going-to (unlicensed)
```

It fires **on the very seed that introduces `I'm going to`**, and on every seed after it, forever.

## Why

Two pieces that don't meet.

**1.** `services/course-builder/lib/validation.cjs:821-825` — `KNOWN_GRAMMAR` is a **hardcoded
constant**, not read from any contract:

```js
const KNOWN_GRAMMAR = {
  been: ['have-you-been'], got: ['have-got'], going: ['going-to'],
  have: ['have-you-been', 'have-got', 'want-to-have'], "'ve": [...], ve: [...],
};
```

**2.** `docs/pair-contracts/_default_eng.contract.cjs` declares **`constructions: []`** — empty. So
`ctx.consPos` is `{}`, and no construction id has a position.

The check at `validation.cjs:878-881`:

```js
const govs = ctx.grammar[raw] || ctx.grammar[s];              // 'going' -> ['going-to']
const ok = govs.some((g) => currentPos >= (ctx.consPos[g] ?? Infinity));
if (!ok) probs.push(`machinery "${raw}" needs ${govs.join('/')} (unlicensed)`);
```

`consPos['going-to']` is `undefined` → `?? Infinity` → `currentPos >= Infinity` is **always false**
→ `ok` is **always false** → the advisory is **unconditional**.

**So the six tokens `been`, `got`, `going`, `have`, `'ve`, `ve` can never be licensed by any
eng-known course that uses the default contract.** There is no seed number at which the warning
stops.

## Reach, measured on the live course

| | |
|---|---|
| banked practice phrases in `gle_cn_for_eng` | 266 |
| carrying a `KNOWN_GRAMMAR` token, i.e. permanently false-flagged | **56 (21%)** |

And it will get worse, not better: this course teaches `I'm going to → tá mé chun` at seed 5 and
`have to → caithfidh mé` at seed 25, both high-frequency. The English corpus has 7 "have to" seeds
and 56 "can/able" seeds.

## Why it matters even though nothing is blocked

These are **warnings, not errors** — `seed-complete.cjs:1544-1566` blocks on vocab breaches and only
warns on construction/licensing advisories, deliberately, because contracts are mostly unratified.
So no seed was wrongly refused and no content is wrong.

**The cost is that the advisory channel is now noise.** A real construction-licensing breach — the
thing this check exists to catch — arrives in the same stream as 56 false ones and is
indistinguishable from them. That is the same failure shape as the two already on record: the gate
that "could not run" looking identical to a pass (fixed today in `57ca7419`), and the veracity
last-word rule where 467 of 534 failures were one false rule.

## The fix, and it is small

Either:
- **(a)** give `_default_eng.contract.cjs` real `constructions` entries with positions for
  `going-to`, `have-got`, `have-you-been`, `want-to-have` — the honest fix, but it needs someone to
  decide those positions per course; or
- **(b)** treat an **undeclared** construction as *unjudgeable rather than unlicensed* — i.e. when
  `consPos[g]` is undefined for every governor, `continue` instead of pushing a problem. That
  matches how the v2 gate already handles exactly this case at
  `known-side-gate-v2.cjs:281-284` (*"where the course never teaches it as vocabulary at all, it is
  machinery of the learner's own language and is free"*) and how the same file handles negation
  (*"where the contract declares no negation construction we cannot date it, so we do not judge
  it"*). **The v1 gate is the one wired into `/seed/complete`; the v2 gate already has the right
  rule.**

(b) is one line and is consistent with the doctrine already written in the v2 file. I have **not
applied either** — this is outside the Connemara brief and it touches a shared gate that other
courses submit through, so it needs its own decision.

## Verified / not verified

- **CONFIRMED by reading the code** and by the constant and contract quoted above.
- **CONFIRMED by measurement**: 56/266 banked phrases, counted with an Irish-aware bounded matcher.
- **NOT verified:** whether any `*_for_eng` course has a non-default contract that *does* declare
  these constructions. I only checked `_default_eng`. If one exists, that course is unaffected.
- **NOT verified:** whether the v2 gate is reachable from any live submit path. The call site in
  `seed-complete.cjs` uses `checkKnownSide` (v1, `validation.cjs`), not `checkKnownSideV2`.
