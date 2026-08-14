# One recordist surface — human recording, rebuilt

2026-08-14. Tom's brief, in his words: *"we can do better than this as an interface: can't we?"*,
*"let's think harder about what this needs, and what this does NOT need"*, *"all of this process
needs making more obvious, more natural"*, *"although we only need the PODS recorded by language,
not by course from now on"*, *"remember — better x simpler x cheaper"*.

The scope line, which decides everything else: *"we're improving the WHOLE human recording set of
processes for any languages WE DECIDE we don't have the TTS voices for"*. Per **language**, decided
by a human. Not per course, not per clip, and never inferred.

---

## The finding that matters most

Welsh is not one course. It is **four**: `cym_n_for_eng`, `cym_s_for_eng`, `cym_for_yor`,
`cym_anthem_for_jpn`. Every human-recording surface we had was scoped to a single course and a
single pod, so a Welsh recordist could only ever see a quarter of Welsh.

That is the whole answer to Tom's *"why only 63 clips for Aran — I'm pretty sure he's going to need
to do more of them"*. He was right, and the cause was structural.

Measured tonight against the live database:

| Queue | Lines in scope | After identity dedupe | Already recorded | Left to record |
|---|---|---|---|---|
| Aran (m, Welsh) | 168 | **150** | 68 | **82** |
| Catrin (f, Welsh) | 286 | **273** | 0 | **273** |
| Tom (m, `zzz` test) | 12 | 12 | 0 | 12 |
| Test voice (f, `zzz`) | 12 | 12 | 0 | 12 |

Two things fall out of that table:

- Aran's queue is **150 lines, not 63**. He has 82 still to do, not a handful.
- The canonical clip identity `(language, text_normalized, voice_id)` collapsed **18 duplicate lines
  for Aran and 13 for Catrin**. Those are lines the old per-course model would have made them record
  two or three times over — the same Welsh sentence, once per course. Recording by language is not
  just tidier, it is **31 fewer takes** for these two people alone, and that saving grows with every
  new Welsh course.

## Where the per-language decision lives

One table, `language_recording_policy`, and nowhere else:

- `language` — the canonical region-free `database_code` (`cym`, `zzz`), the same spelling
  `clip-identity.cjs` produces. This is what makes "by language, not by course" expressible at all.
- `human_only` — **the** flag. True = we have no TTS voice we accept for this language.
- `voices` — the two queues, `{"m": {...}, "f": {...}}`, mirroring the `podCast` shape the estate
  already casts with, so Aran and Catrin map onto it with no new casting model.
- `notes` — why, in a human's words.

Aran's and Catrin's voice ids are lifted **verbatim** from `cym_n_for_eng`'s stored `podCast`, so
every record link Aran already holds resolves to the same identity and none of his 111 existing
clips are stranded. His alias spellings (`human_aran_cym_n_2`, `human_aranv3_cym_n`) are resolved
back to the canonical voice, which is why his recorded count reads 68 rather than 0.

**What the flag gates:** with `human_only` on, that language's missing audio is not TTS-rendered —
it waits for a human. It deliberately does **not** retro-delete or supersede existing TTS clips in
the language. That is a separate, destructive decision and it is Tom's to make, not this job's.

## The test language is real, on purpose

`zzz_test_for_eng` now has `target_lang = 'zzz'`, a first-class language in the reference CSV, with
24 lines split 12/12 between a male and a female queue.

It had to be **real** — same tables, same upload path, same storage, same playback, same coverage
bar. A demo mode cannot tell Tom whether the real pipeline works, which was the entire point of him
asking for it.

Retargeting it off `eng` mattered more than it looks: the queue is by language now, so a test course
still claiming to be English would have injected two dozen fake lines straight into the real English
queue. The `zzz` prefix keeps it at the bottom of every alphabetical list. The course stays `draft`
and `hidden`, and is never learner-facing.

## Things deliberately left alone

- No existing audio was deleted, superseded or converged. The six old e2e clips in the test course
  are still on disk and still reachable.
- The estate-wide `audio_clips` convergence backfill stays on its urgent hold. Human decisions
  outrank canon, and that backfill would restore takes a human had rejected.
- No TTS was generated. Human recording is free; rendering is not, and it is an approval gate.
- Raw-take archival at `raw/{UUID}.{ext}` **before** processing is untouched. That is what makes a
  refused take survivable, and its absence is why the T-20 originals are gone.

## Open — one line each, cheap to overrule

- **8 Welsh lines are uncast**: their pod character has no gender in any course's `podCast`, so they
  route to neither queue. They are counted and surfaced rather than guessed at or silently dropped.
  Tell us which voice takes them and they join a queue immediately.
- **Female queue is much larger than male** (273 vs 82). That is the existing casting, not a new
  choice — Catrin simply has not started. Worth knowing before the "your queue is live" message goes
  out.
- **Two voices per language** (one male, one female) is kept as the shape, rather than inventing a
  new casting model, because Aran and Catrin already map onto it.
