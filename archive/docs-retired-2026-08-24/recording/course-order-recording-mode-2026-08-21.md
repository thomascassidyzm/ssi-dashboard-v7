# Recording in course order — a weekend mode for Sascha

**21 August 2026 · for Kai · Austrian German (`deu_at_for_eng`), and every other course**

## The link

```
https://popty.app/record/deu_at_for_eng?order=course
```

That is the whole thing. Same Record Room, same sign-in, same script, same two
passes. The only difference is the order the lines come in.

Without `?order=course` nothing changes for anybody. Any existing link, and any
link with `?maxSeed=N` on it, behaves exactly as it did this morning. The mode
only turns on for the exact word `course` — `?order=COURSE` or `?order=sequential`
quietly falls back to normal, so a typo can never reorder somebody's session.

## What it does

The script picks its lines by chunk coverage — the fewest sentences that between
them contain every chunk the course needs. That selection is untouched. What
changes is the reading order.

| | opens at | then |
|---|---|---|
| normal (coverage order) | seed 333 | 567, 26, 234, 228, 47 … |
| `?order=course` | seed 3 | 4, 6, 7, 12, 14 … up to 667 |

The same 496 lines, in the order the course itself runs: seed number first, then
within a seed the seed sentence before the practice phrases built on it. Sascha
reads straight through from the top, and the audio that exists first is audio for
the **start** of the course.

Course order starts at seed 3 rather than seed 1 because seeds 1 and 2 have no
line of their own in the script — everything they teach is already carried by a
line further on. That is the coverage selection doing its job, and it is the same
in both orders.

## Monday

Whoever picks the coverage-optimised concatenation work back up resumes from
wherever Sascha stopped. Every line Sascha records in course order is a line the
coverage script asked for anyway — it is the same 496 — so nothing recorded this
weekend is wasted or has to be read again, and the remaining work is simply the
lines further down the list.

Nothing about coverage, chunking or concatenation was redesigned. That was
explicitly left for Monday.

## Verified

On the live API, against the real Austrian German course:

- 496 lines both ways, **identical set**, identical coverage statistics,
  identical direct-record list — only the sequence differs;
- course order runs monotonically from seed 3 to seed 667;
- chunk boundaries come through unchanged (`wia ma|so oft wia möglich redt`);
- the default request, with no `order` param, is byte-for-byte the script that
  was being served before.

13 unit tests cover the ordering rules and the link parameter
(`tools/recording-optimizer/recording-script-order.test.cjs`,
`src/composables/autocue-script-order.test.js`).

## Where it lives

- `tools/recording-optimizer/generate-recording-script.cjs` — `orderSelectedPhrases()`,
  and `--order course` on the CLI;
- `services/production-api.cjs` — `?order=course` on
  `GET /api/production/:courseCode/recording-script`;
- `src/composables/useAutocueState.js` + `AutocueStudio.vue` — the link parameter,
  and a one-line note on the ready screen when the mode is on.
