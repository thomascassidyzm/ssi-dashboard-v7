# Swiss German: can the Azure reader say dialect? — a listening page

**→ [Open the listening page](https://watson-1.tail4968cb.ts.net/evidence/deu-ch-dialect-listen-2026-08-28/index.html)** (phone-friendly, 67 clips, tap to play)

## What this is

The `deu_ch_for_eng` course is written in real Schwiizerdütsch — *ich wott*, *gsi*, *nöd*,
*öppis*, *hesch gha* — and not in standard German. 646 of its 1,558 LEGO lines carry clear
dialect markers, consistently from lesson 1 through lesson 668.

The voices configured for it are Microsoft's **Leni** and **Jan**, which are Swiss-*accented*
readers of *standard* German. Nobody built them to read dialect spelling. Whether they cope
with it is a taste call, and the page above is the harness for making it. It is not a verdict.

## What is on the page

| Section | Clips |
|---|---|
| Refused by the veracity checker | 4 |
| Most dialectal | 32 |
| Across the course (seeds 4–663) | 25 |
| English known side | 6 |
| **Total** | **67** |

Both target voices are represented (29 Leni, 28 Jan), and the twelve most dialect-heavy lines
are rendered in *both* so the two readers can be compared on the same words. Every clip on the
page was fetched from the served URL, checked for an mp3 frame header, measured for level
(peaks −4.6 to −1.8 dBFS, none silent) and played in a headless phone-sized browser before
publication.

## The refused clips, and why they are first

The pipeline's veracity gate refused four clips outright — each rendered three times and
rejected three times. They are on the page with the checker's own transcript beside the text,
because what the machine threw away is the sharpest evidence available about whether it should
have.

| Text | English | Voice | Checker heard | CER |
|---|---|---|---|---|
| `niemert isch sicher gsi` | nobody was sure | Jan | "Niemand ist sicher wie sie." | 0.43 |
| `wo öppis gseit hät` | who said something | Jan | "Wo er bisgzeit het?" | 0.39 |
| `gsi wär` | had been | Jan | "See you there!" | 1.57 |
| `hesch gha` | have you had | Leni | "Hischgau!" | 0.44 |

**A caveat that matters for reading those numbers.** The gate transcribes into standard German
and then compares that transcript, character by character, against the dialect *spelling*. On a
spot-check with a larger transcriber, `niemert isch sicher gsi` came back as
"Niemand ist sicher gewesen." — which is a correct standard-German rendering of the dialect
sentence, and would still score a large CER against the dialect text. So a high CER here is
consistent with audio that is fine and with audio that is mangled, and it cannot separate them.
Only a Swiss ear can.

## Explicit gaps

- **Nothing on this page is a verdict.** The intro deliberately stops at the question.
- **A bulk render of seeds 9–118 ran before this job started** and left roughly 4,000
  `deu_ch_for_eng` clips in the database. It stopped on its own when its driving process died;
  it was not the full-course run, and nothing restarted it. Those clips were reused here rather
  than re-rendered, but they exist un-audited and predate any decision on the voices.
- **The English meanings shown are the course's own known-side text**, not fresh translations.
