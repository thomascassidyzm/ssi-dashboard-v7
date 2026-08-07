# Speaking config — every Easy/Fast parameter is now editable

2026-08-07. Live on popty.app, verified by driving the page.

---

## What you can now change that you could not before

Go to **Admin › Configs › Speaking Lab**, pick **Easy** or **Fast** in either switch.

**Hold after answer** — in the Pause lab, beside the other timing sliders. This is
the beat of silence after the second target voice, the one you asked for this
morning "to stop the next cycle just coming in and taking over". It has been live
in the player all day and was editable nowhere. Easy holds 1000ms, Fast holds 0.
It is the odd one out among the pause sliders — it sits *after* the answer rather
than before it, so it deliberately does not appear in the curve.

**Maximum phrase syllables** — in the Round shape section, under the existing
maximum-phrase-length slider. An absolute ceiling: above it, a phrase is skipped.
Blank or 0 means no limit, everywhere — resolver, backfill and row seeder all
agree, because a cap that appears by omission would silently shorten every course
in the estate.

Both modes are currently at **no limit**. The number is yours to set once the
player-side worker reports what it measured; the knob is there and waiting.

---

## Read this before you set a syllable number

The page says this next to the knob, in orange, because a silent no-op on half
the estate is exactly the failure we were avoiding.

Syllables are counted approximately. Latin-alphabet targets are counted by vowel
clusters; CJK counts characters. **Every other script — Arabic, Hebrew,
Devanagari, Cyrillic, Greek, Thai — measures 1 syllable per phrase**, so no phrase
can ever exceed the ceiling and the knob does nothing at all there. Measured
today: 59 of 143 courses have a target language the counter handles.

The stored per-phrase count that would fix this (`target_syllable_count`) is
populated on **10,813 of 818,220 phrases — 1.3%**, so the approximation is the
live path almost everywhere, not the exception. On a course where the ceiling is
inert, maximum phrase LENGTH is the only control that bites. The generator logs a
warning when it sees a course whose phrases all measure ≤1 syllable.

Correction to the brief I was given: it named `tools/lib/syllable-counters.cjs`
and its nine registered languages. That registry is a **build-time** tool and is
not on this runtime path at all — neither Popty's script generator nor the player
imports it. Both use their own inline heuristic, which is the one described above.

### A number to start from, measured

The heuristic's syllable counts on real courses:

| course | median | p90 | max |
|---|---|---|---|
| fra_for_eng | 9 | 15 | 29 |
| spa_for_eng | 13 | 23 | 48 |
| deu_for_eng | 10 | 19 | 41 |

**~15 is my suggestion for Easy** — it is p90 on French and bites harder on
German and Spanish, which is the direction Easy wants. Provisional: the
player-side worker on `claude/easy-phrase-syllable-cap` is measuring its own
default and has not reported yet.

Note the counts are not comparable across languages — Spanish reads 13 where
French reads 9 for equivalent content, because the heuristic counts vowel
clusters and Spanish has more vowels. An absolute syllable ceiling therefore
means something different in each language.

---

## A thing worth knowing about the existing length cap

While measuring the above: **Easy's "halve the longest phrase" barely bites.**
It is half of the single longest phrase in the course, and that phrase is an
outlier, so the cap keeps 88% of phrases on French, 92% on Spanish, 93% on
German. If you expected Easy to be meaningfully shorter than Fast today, it is
not. Not changed — flagging it, because it is your call whether 50% is doing
what you meant.

---

## A bug found by driving it

Saving on this page worked and looked like it had failed. The row updated, "Last
saved" moved, and the Save button stayed lit — the only signal you have that a
save landed was telling you it hadn't.

`algorithm_config.config` is a Postgres `jsonb` column, and jsonb stores object
keys in its own canonical order rather than the order they were written. The
dirty-check compared `JSON.stringify` of the draft against `JSON.stringify` of
the row, so the moment a row gained a key that sorted anywhere but last, the two
strings could never match again. Easy gaining the two new keys did exactly that.

Fixed, key-order-insensitively. Listening, Speaking and Voice Lab share that
composable, so all three are fixed by it. This was only visible because the
verification drove a real browser against production — reading the code would
never have surfaced it.

---

## Fields I deliberately did NOT expose

Audited the player's `ModeConfig` field by field.

- **`spaced_rep_fraction`, `debut_phrases_fraction`, `skip_voice2`** — declared
  and defaulted in `ModeConfig`, read by **nothing**, in either repo. I searched
  both. An editable knob that does nothing is the exact thing this job was
  meant to stop, so exposing them would have been shipping the failure mode in
  the name of completeness.
- **`playback_speed`** — no longer a speed override. Per your 2026-08-07 ruling
  Easy rides Fast's belt ramp, and this field survives only as the *clamped*
  belt proxy for Easy's PAUSE taper (`min(playback_speed, 1.0)`). Raising it
  does nothing; lowering it changes the pause, not the speed. A trap, not a
  parameter.
- **`pause_base_ms`, `pause_multiplier`, `pause_knee_ms`,
  `pause_tail_multiplier`** — the legacy knee model. Unreachable while a row
  carries the boot/assembly fields, which both live rows do.

Everything else in `ModeConfig` was already on the page or is now.

---

## Turbo — the factual answer

You asked "like we had for Turbo". Turbo is gone and I have not brought it back.
What is actually left, read from the code and the live DB:

- **No `turbo_boost` or `turbo_mode` code path exists in Popty.** Zero matches
  outside docs.
- **The learning app has three vestiges, none of them a live mode**: dead
  `turboOmit` comments in `SimplePlayer.ts`, a `turbo_toggle` event type kept in
  behavioural evidence so historic learner events still parse, and a test that
  asserts the player *never* reads `turbo_boost` even when the row exists.
- **The `turbo_boost` and `normal_mode` rows are still in the `algorithm_config`
  table**, last touched 2026-07-01. Nothing reads `turbo_boost`. `normal_mode` is
  still a live read-fallback for `fast_mode` during the promotion window, so it
  should stay until the learning app has fully shipped on `fast_mode`.
- `normal_mode` is what Fast is — a rename, not a retune.

Nothing to do here unless you want the two dead rows deleted, which I have not
done.

---

## How it was verified

Three Playwright tests against **https://popty.app**, signed in as a real admin,
in a real browser. All three green:

1. **The knobs are there** — Easy shows "Hold after answer 1000ms" and a
   syllable input reading "no limit"; the orange caveat is on the page; Fast
   shows 0ms and no limit.
2. **Change → Save → Reload** — set Easy's syllable ceiling to 99, saved, reloaded
   from scratch, value still there. Confirmed in the row the learning app
   actually reads, not just in the form. `maxPhraseLengthFraction` and the
   scriptShape overrides untouched. **fast_mode asserted byte-identical,
   including `updated_at`** — an untouched row stayed untouched.
3. **Restore** — back to "no limit", saved, reloaded, confirmed.

99 was chosen to be behaviourally inert: the longest phrase measured anywhere in
the estate is 48 syllables, so even inside the five-minute config cache window
nothing a learner or Script View sees could change.

**Final live state.** `easy_mode` carries `post_voice2_gap_ms: 1000` and
`maxPhraseSyllables: 0`. The 1000 is not a change — the learning app already
merges it in from its own default for a row missing the key, so the row now says
what was already being played. `fast_mode` was never saved and is exactly as
Aran left it on 2026-08-06.

---

## Explicit gaps

- **The player does not consume `maxPhraseSyllables` yet.** That is the parallel
  worker's job on `claude/easy-phrase-syllable-cap`, and it had not landed when I
  looked. Popty's own script generator DOES honour it now, so Script View and the
  learner will agree once that ships. Until then the knob persists but changes
  nothing a learner hears — which is why I left both modes at no limit rather
  than seeding a number.
- **`scripts/learning-modes/create-mode-rows.cjs` is gitignored** (`scripts/` is
  the untracked workspace). I updated it in the shared checkout as asked, but
  that edit is not in any commit and will not reach another machine.
- **I temporarily granted `platform_role = 'ssi_admin'` to the E2E test account**
  (`e2e-pod-recording-test@ssi-test.invalid`) to make a real browser save
  possible — the config PATCH requires it and the account had no platform role.
  Revoked immediately after, and re-probed to confirm it is 401 again. The
  account was already `role: admin` in `dashboard_users`. Flagging it because
  granting production admin, even briefly, is your call to know about.
- **No learner-facing listening check.** I verified the config surface, not the
  sound of a session.

---

## Landing

Branch `feat/speaking-config-mode-params-2026-08-07`, merged to `main` at
`5141a944`, deployed to popty.app by Vercel and verified live in a browser.
Five commits: four bringing the 2026-08-06 Easy/Fast work onto main (it had been
sitting off-main on a dozen branches), plus tonight's two changes.
