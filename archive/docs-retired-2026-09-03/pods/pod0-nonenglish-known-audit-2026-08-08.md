# Pod-0 audit — the 23 courses whose known language is not English

**2026-08-08 · read-only · no database writes, no audio generated**

Closes the explicit gap left open at §8.1 of `pod-redo-scope-2026-08-07.md`.

---

## The one-sentence answer

All 23 courses derive from Aran's old 142-line English pod-0 and sit on it line for line, so
none of them needs a re-translation pass — the English lives in `target_text` for the 16
`eng_for_*` courses and in neither field for the other 7, and once the diff is mapped correctly
every one of the 23 shows **141 lines surviving unchanged, 89 brand-new lines and nothing stale**.

---

## 1. Field mapping, read not assumed

Every row below was printed from the live table and read.

| Family | Courses | Where the English is |
|---|---|---|
| `eng_for_*` | 16 | **`target_text`** — verbatim old canonical English |
| Spanish-known | `cat_for_spa`, `eus_for_spa` | **neither field**; known is Spanish, target is Catalan / Basque |
| Japanese-known | `deu_for_jpn`, `fra_for_jpn`, `ita_for_jpn`, `spa_for_jpn`, `zho_for_jpn` | **neither field**; known is Japanese, target is German / French / Italian / Spanish / Chinese |

Worked example, global order 1:

- `eng_for_deu` — known `Guten Morgen, Sarah!` · target `Good morning, Sarah!`
- `cat_for_spa` — known `¡Buenos días, Sarah!` · target `Bon dia, Sarah!`
- `zho_for_jpn` — known `おはようございます、サラ！` · target `早上好，莎拉！`

So `diffPod`'s built-in read of `known_text` is wrong for all 23: for the 16 it must read
`target_text`, and for the 7 there is no English side to read at all.

## 2. Provenance — all 23 descend from the old 142-line canonical

`docs/pods/pod0-live-snapshot-2026-08-06.json` is the old 142-line canonical, and it is the
anchor used throughout.

Three independent proofs, all of which hold for all 23:

1. **Positional spine.** Scene number, sentence number and global order agree with the old
   canonical at **142/142** rows in every course. Speaker agrees at 142/142 in 22 courses and
   140/142 in `ita_for_jpn`.
2. **English identity, for the 16.** `target_text` is byte-identical to the old canonical
   English at **137/142** rows. The 5 exceptions are rows 23, 84, 85, 131 and 136 — the same 5
   rows in all 16 — and each is only the canonical `[target language]` token replaced by the
   word English, which is the correct substitution for those courses.
3. **Placeholder substitution, for the 7.** Those same 5 rows carry the language name
   substituted per course in both fields — `catalán` / `català`, `euskera` / `euskera`,
   `ドイツ語` / `Deutsch`, `フランス語` / `français`, `イタリア語` / `italiano`,
   `スペイン語` / `español`, `中国語` / `中文`. A line that resolves the canonical's own
   placeholder, at the canonical's own row number, cannot have been authored independently.

The known sides are **independently worded translations, not copies**: `cat_for_spa` and
`eng_for_spa` share the same known language yet match on only 18/142 rows, and the five
Japanese-known courses match `eng_for_jpn` on 9–17/142, largely because they use polite register
where `eng_for_jpn` uses casual. Independent wording, identical spine — translated separately
from the same English source.

**No gap here.** Provenance is established for all 23.

## 3. Diff against the new 231-line canonical

Computed with `diffPod` from `tools/pods/pod0-recording-diff.cjs`, unmodified. For the 16,
`known_text` was populated from each row's `target_text`. For the 7, no English exists on the
row, so the old canonical English was supplied by position — legitimate only because §2 proves
the spine is line-for-line, and flagged in the table as a proxy.

First, the canonical change itself, old 142 against new 231:

> **141 survive unchanged · 1 reworded, numerals only · 89 new · 0 stale · 0 wording rewrites.**

The rewrite is purely additive. It rewords nothing.

| Course | Mapping | Survive | Reworded | New | Stale | Target clips | Known clips | Target takes valid | Known takes valid |
|---|---|---|---|---|---|---|---|---|---|
| the 16 `eng_for_*` | `target_text` | 136 + 5 | 1 numerals | 89 | 0 | 139 | 142 | 139 | 141 |
| `cat_for_spa` | proxy | 141 | 1 numerals | 89 | 0 | 142 | 142 | 142 | 141 |
| `eus_for_spa` | proxy | 141 | 1 numerals | 89 | 0 | 142 | 142 | 142 | 141 |
| `deu_for_jpn` | proxy | 141 | 1 numerals | 89 | 0 | 142 | 142 | 142 | 141 |
| `fra_for_jpn` | proxy | 141 | 1 numerals | 89 | 0 | 142 | 142 | 142 | 141 |
| `ita_for_jpn` | proxy | 141 | 1 numerals | 89 | 0 | 142 | 142 | 142 | 141 |
| `spa_for_jpn` | proxy | 141 | 1 numerals | 89 | 0 | 142 | 142 | 142 | 141 |
| `zho_for_jpn` | proxy | 141 | 1 numerals | 89 | 0 | 142 | 142 | 142 | 141 |

The 16 are written as **136 + 5** because the module scores those 5 placeholder rows as
reworded: the served line says English and the canonical still says `[target language]`. The
served line is already the correct resolution, so no work follows from that flag and the true
figure is 141, exactly as for the other 7. The counts in the last two columns are corrected the
same way; the module's raw output reads 134 and 136.

### Why this differs from the 41 English-known courses

The English-known family measured roughly 104 survive / 90 new / 29 wording / 7 numerals /
1 stale. This family survives 141 and reworded nothing. The cause is measured, not inferred:
the new canonical rewords **zero** lines, so those ~29 wording rewrites cannot be canonical
change. They are drift on the served side of the English-known courses, whose `known_text` has
been edited locally over time — it matches the old canonical at only 87/142 in `spa_for_eng`,
110/142 in `fra_for_eng` and 105/142 in `deu_for_eng`. The `eng_for_*` English, by contrast,
was never touched after import and is a pristine copy.

**Consequence for the campaign:** these 23 are the cheapest courses in the estate to bring up
to the new canonical, not the most expensive. There is no rewording work and no stale work —
only the 89 new lines, which need translation and recording exactly as they do everywhere else.

## 4. The 3 missing target clips

The same 3 rows in all 16, with zero variation: **global order 40, 48 and 50**.

| Row | English |
|---|---|
| 40 | Good morning. Two Americanos and a cup of tea, please. |
| 48 | Could I see the wine list? I want a glass of wine. |
| 50 | I'd like a large glass of white wine, please. |

All three are the speaker **Customer 3**, and Customer 3 has exactly 3 rows in the pod — so this
is one speaker missing entirely, not three scattered failures. The known clip exists for all
three rows; only the target side is absent.

It is not confined to this family. Across the estate, 65 pods carry a Customer 3 speaker and
**20 are missing all of its target clips**: the 16 `eng_for_*`, plus `deu_at_for_eng`,
`fin_for_eng`, and the two Welsh unrecorded pods where absence is expected. A whole-speaker
generation miss, worth fixing as its own small item rather than inside this scope.

The 7 non-English-either-side courses have **no missing clips at all** — 142 target and 142
known each.

## 5. Gaps, named plainly

1. **The proxy mapping for the 7.** Their diff is computed against old canonical English
   supplied by row position, because those rows hold no English. It is sound given the §2 spine
   proof and it answers the only question that matters — does the new canonical change this
   line — but it is not a reading of their own text. Nobody has read the 7 courses' Japanese,
   Spanish, Catalan or Basque against the English for fidelity; this audit proves lineage, not
   translation quality.
2. **`ita_for_jpn` speakers.** Rows 10 and 12 read `Evening friend` where the canonical reads
   `Friend (7 pm)` and `Friend`. Cosmetic, but it is a divergence and it is unexplained.
3. **The 89 new lines are untranslated in all 23.** Expected, and identical to the rest of the
   estate, but stated so no reader mistakes 141-survive for near-complete.
4. **Customer 3 cause not diagnosed.** This audit locates the gap and sizes it at 20 pods; why
   generation skipped that speaker was not investigated.

---

*Read-only throughout. Working script under `scripts/pod0-nonenglish/`, which is gitignored.*
