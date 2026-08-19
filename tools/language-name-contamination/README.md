# Language-name contamination detectors

Built 2026-08-19 for the yoruba/joruba sweep (docs/language-name-contamination-sweep-2026-08-19.md).

The defect: a batch translation run substituted a **language name** with the wrong
language's name — "She speaks Friulian" came back as `e fevele yoruba`.

Four independent detectors; a finding is only trusted when several agree.

| script | axis | notes |
|---|---|---|
| `scan4.cjs` | target names a language the known side does not (`extra`), and known side names the course's own language but the target does not (`missing-own`) | needs `langnames.cjs` |
| `scan5.cjs` | an untranslated **English** language name sitting inside non-English text | found the `*_for_jpn` placeholders |
| `scan6.cjs` | **self-calibrating** — learns each course's own language-name token from reference seeds 1/4/9/13/14/15/22/33, then checks the cluster 64/160/283/285/286/297 carries it | no pattern table, so it catches names `langnames.cjs` has never heard of |
| `langnames.cjs` | endonym/exonym patterns per language | incomplete by construction — treat a miss as a pattern gap, not an all-clear |

Run: `DOTENV_CONFIG_QUIET=true node tools/language-name-contamination/scan6.cjs` (needs `.env.psql`).

## Traps these scripts already work around
- JS `\b` is ASCII-only and a `\p{L}` lookbehind **wrongly rejects CJK/Thai/Arabic**, which have no
  spaces — `说中文` fails a left-boundary test. `match.cjs` demands boundaries only for Latin matches.
- Language names inflect (`davvisámegiela` / `davvisámegillii`, `hrvatskom`, `Gymraeg`), so only the
  **left** boundary is required. A right boundary silently hides real hits.
- Alternation order matters: `/sicilian|sicilianu/` matches the short branch first and then fails the
  boundary check, never trying the longer one.
- A raw hit is not a finding. `Italia`, `fins`, `hakkan`, `sami`, `russo` (=red), `thair`, `urduri`
  and Austrian `Deitsch` all match language-name patterns and are all innocent.
