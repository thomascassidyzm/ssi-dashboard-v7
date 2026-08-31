# Could-occupy tagging (known language: eng)

Generated 2026-08-31 from `course_seeds` across 80 eng-known courses (52735 rows → **2174 distinct known texts**), tagged against the shape store `services/shared/metagraph/nodes.json (docs/pods/shape-graph-2026-08-30.md)`. Read-only, deterministic, no LLM.

**COULD-OCCUPY, NEVER ATTESTATION.** COULD-OCCUPY, never attestation. A seed is one sentence with no turn around it, so it cannot attest a shape — a move is a position defined relative to the turn before it. Each row says only: if a turn were built around this sentence, which shape positions could it fill.

**Keyed by TEXT, not by seed number.** by normalised known TEXT, never by seed number — there is ONE canonical seed set, identical by definition, but a course’s KNOWN TEXT is derived and legitimately differentiated per pair, so a course inherits a tag by matching text. Only ~653 of the 2174 texts appear in most courses; 1,143 appear in exactly one. That measures COURSE KNOWN TEXTS, not seeds: the seed set is canonical and identical by definition, and the known side is a teaching instrument that each pair renders for itself — seed 1 alone has 116 distinct known texts across 130 courses.

**Coverage:** 965 texts carry a specific tag, 1185 carry only a generic one (`C6`, `C0` — true of nearly every declarative and therefore no index at all), 24 carry none (single-word fragments: "An idea.", "Woman.", "Badly."). Of the 110 positions in the shape store, **36 have a specific filler and 74 have none.**

## The filler pool — positions the seed corpus can supply

| position | shape / slot | specific fillers | worn form, quoted |
|---|---|---:|---|
| `N13#1` | Not-knowing / question | 464 | "Are you all ready?" |
| `N5#1` | Acquaintance / Q | 276 | "Did they say who they saw last night?" |
| `N8#1` | Recommendation / solicit | 276 | "Did they say who they saw last night?" |
| `N12#2` | Trouble-and-advice / elicit | 276 | "Did they say who they saw last night?" |
| `N14#1` | Premise audit / claim | 216 | "No they're wasting everybody's time." |
| `N15#1` | Parked disagreement / position | 216 | "No they're wasting everybody's time." |
| `N303#1` | The specimen / claim about how something works | 216 | "No they're wasting everybody's time." |
| `N11#2` | Mutual assessment / counter-assess | 111 | "But that doesn't mean we can't change it." |
| `N7#2` | Arrangement / decline+account+counter | 108 | "But that doesn't mean we can't change it." |
| `N15#2` | Parked disagreement / counter | 108 | "But that doesn't mean we can't change it." |
| `N4#4` | Instruction-giving / confirm | 87 | "I'm afraid that you'll forget why we needed to stay here." |
| `N7#4` | Arrangement / accept | 87 | "I'm afraid that you'll forget why we needed to stay here." |
| `N8#3` | Recommendation / uptake | 87 | "I'm afraid that you'll forget why we needed to stay here." |
| `N11#6` | Mutual assessment / emphatic agree | 87 | "I'm afraid that you'll forget why we needed to stay here." |
| `N13#2` | Not-knowing / I-don’t-know held with status | 78 | "I'm not sure if I can help you, sir." |
| `N9#2` | Feasibility request / grant+limit+pre-empt | 64 | "But that doesn't mean we can't change it." |
| `N4#1` | Instruction-giving / request | 54 | "Can I have something to drink please?" |
| `N2#2` | Transaction / order | 46 | "Can you all put your hands up?" |
| `N7#1` | Arrangement / proposal | 30 | "Do you want to go madam?" |
| `N306#1` | The co-staged scene / propose the frame | 30 | "Do you want to go madam?" |
| `N302#2` | Digression-and-return / run the detour | 16 | "I used to live around here years ago before we moved." |
| `N909#1` | Story → matched story / anecdote | 16 | "I used to live around here years ago before we moved." |
| `N4#2` | Instruction-giving / instruct | 14 | "Let me throw it over the wall." |
| `N12#4` | Trouble-and-advice / advise | 14 | "Let me throw it over the wall." |
| `N12#6` | Trouble-and-advice / instruct | 14 | "Let me throw it over the wall." |
| `N9#1` | Feasibility request / is-it-possible? | 8 | "Can I have something to drink please?" |
| `N2#7` | Transaction / receipt | 6 | "No, I'm not thirsty, thank you." |
| `N10#2` | Compliment / thank+downgrade | 6 | "No, I'm not thirsty, thank you." |
| `N2#1` | Transaction / solicit | 5 | "Do you have to leave in a few days?" |
| `N3#1` | Availability enquiry / is-there-X? | 5 | "Do you have to leave in a few days?" |
| `N6#2` | Repair / non-understanding+request | 5 | "Could you say that again a little more slowly?" |
| `N10#1` | Compliment / compliment | 3 | "Do you want me to help you look for it?" |
| `N12#1` | Trouble-and-advice / trouble declaration | 2 | "It hurts most when I move my head up and down." |
| `N908#1` | Complaint-with-partner-turn / grievance voiced | 2 | "It hurts most when I move my head up and down." |
| `N1#1` | Ritual open/close / hail | 1 | "Hello there, my friend" |
| `N1#2` | Ritual open/close / return | 1 | "Hello there, my friend" |

## The 74 positions with no specific filler — the honest holes

Two kinds, and only one of them is a gap worth closing. **Response-relative positions** (read-back, reformulate, ratify-the-completion, "the partner completes it rather than answering") cannot be supplied by a seed corpus at all, because they are defined against a prior turn and a seed has none — no amount of tagging will fill them, and pod material is where they live. **Deep-conversation positions** (`N301`–`N306`, `N9xx`, `N501`) are Method-Pod and sector material, not beginner-course material, and their emptiness here says the corpora are doing their separate jobs.

One entry is worth reading twice: `N3#2 Availability enquiry / answer` shows zero SPECIFIC fillers while the corpus holds 1,685 plain declaratives that could fill it. That is the generic/specific split working as intended, not an absence.

- `N2#3` — Transaction / clarify
- `N2#4` — Transaction / specify
- `N2#5` — Transaction / deliver
- `N2#6` — Transaction / reckoning
- `N3#2` — Availability enquiry / answer
- `N4#3` — Instruction-giving / read-back
- `N4#5` — Instruction-giving / continue
- `N4#6` — Instruction-giving / instruct
- `N5#2` — Acquaintance / A+return
- `N6#1` — Repair / turn
- `N6#3` — Repair / reformulate
- `N6#4` — Repair / resume
- `N7#3` — Arrangement / decline+account+counter
- `N8#2` — Recommendation / recommend with grounds
- `N11#1` — Mutual assessment / self-downgrade
- `N11#3` — Mutual assessment / concede-and-hold
- `N11#4` — Mutual assessment / counter-assess
- `N11#5` — Mutual assessment / normalise+tag
- `N12#3` — Trouble-and-advice / report
- `N12#5` — Trouble-and-advice / dosage-Q
- `N13#3` — Not-knowing / the question it licenses
- `N14#2` — Premise audit / how-do-we-know-that
- `N14#3` — Premise audit / ground supplied or conceded
- `N15#3` — Parked disagreement / counter held
- `N15#4` — Parked disagreement / explicit park
- `N16#1` — Precision haggle / number
- `N16#2` — Precision haggle / counterbid
- `N16#3` — Precision haggle / counterbid
- `N16#4` — Precision haggle / settlement formula
- `N17#1` — Interruption-and-bank / turn
- `N17#2` — Interruption-and-bank / break
- `N17#3` — Interruption-and-bank / name it and bank the thread
- `N301#1` — Joint construction / open the clause and leave it hanging
- `N301#2` — Joint construction / complete it (1–6 words)
- `N301#3` — Joint construction / ratify, or amend the completion
- `N301#4` — Joint construction / extend beyond the opener's version
- `N302#1` — Digression-and-return / digress (flag optional)
- `N302#3` — Digression-and-return / return marker, or thread-loss admitted
- `N302#4` — Digression-and-return / either party restores the thread
- `N302#5` — Digression-and-return / resume, detour optionally claimed as evidence
- `N303#2` — The specimen / the partner is enrolled as the live case
- `N303#3` — The specimen / perform / undergo, imperfection allowed
- `N303#4` — The specimen / the result is folded back into the claim
- `N304#1` — The reported claim too big to hold / report the claim + its source + its epistemic status
- `N304#2` — The reported claim too big to hold / register its size
- `N304#3` — The reported claim too big to hold / try it on jointly ('she would say…')
- `N304#4` — The reported claim too big to hold / leave it unresolved
- `N305#1` — The proxy pitch / perform the pitch of the partner's thing
- `N305#2` — The proxy pitch / owner ratifies or corrects
- `N305#3` — The proxy pitch / owner extends; the improvement may be adopted
- `N306#2` — The co-staged scene / voice a role inside it
- `N306#3` — The co-staged scene / the partner voices a role or the counter-role
- `N306#4` — The co-staged scene / read the scene back into the live argument
- `N902#1` — The razor / theory claimed
- `N902#2` — The razor / invite the full statement — 'listen to yourself'
- `N902#3` — The razor / the full statement, self-refuting
- `N902#4` — The razor / one-line verdict
- `N903#1` — Public position-abandonment / the old position quoted
- `N903#2` — Public position-abandonment / recantation at full strength, no hedge
- `N903#3` — Public position-abandonment / the partner joins the abandonment
- `N907#1` — The misreading corrected / turn
- `N907#2` — The misreading corrected / paraphrase offered
- `N907#3` — The misreading corrected / refused and replaced — 'that's not what I'm saying'
- `N907#4` — The misreading corrected / continue on the corrected reading
- `N908#2` — Complaint-with-partner-turn / the partner completes it rather than answering
- `N908#3` — Complaint-with-partner-turn / held jointly — no fix owed
- `N909#2` — Story → matched story / structurally matching anecdote
- `N909#3` — Story → matched story / the match ratified — no verdict owed
- `N501#1` — Compelled make-safe / danger discovered, usually mid-other-business, unbidden
- `N501#2` — Compelled make-safe / danger declared against the norm
- `N501#3` — Compelled make-safe / the compelled act announced and DONE; consent not sought and refusal unavailable
- `N501#4` — Compelled make-safe / the record affixed and the reinstatement condition named — 'nobody reconnects that until it's re-tested'
- `N501#5` — Compelled make-safe / press on the person → drop the self, hold the duty, name the forum
- `N501#6` — Compelled make-safe / the onward path — who can fix it, what happens next (routes into the quote)

## Position classes

| id | class | fires on | maps to |
|---|---|---:|---|
| C1 | availability question | 5 | N3#1 N2#1 |
| C2 | possibility / permission question | 8 | N9#1 N4#1 |
| C3 | request of the other | 46 | N4#1 N2#2 |
| C4 | wh-question / elicitation | 276 | N5#1 N13#1 N12#2 N8#1 |
| C5 | repair initiation | 5 | N6#2 |
| C6 *(generic)* | plain answer / report | 1685 | N3#2 N12#3 |
| C7 | hedged answer — roughly, and it depends | 62 | N3#2 N9#2 N12#3 |
| C8 | can't comply, with a reason | 2 | N7#2 N9#2 N15#2 |
| C9 | decline / counter with an account | 108 | N7#2 N15#2 N11#2 |
| C10 | proposal | 30 | N7#1 N306#1 |
| C11 | acceptance / uptake | 87 | N7#4 N8#3 N4#4 N11#6 |
| C12 | instruction / advice | 14 | N4#2 N12#4 N12#6 |
| C13 | read-back / receipt | 0 | N4#3 N2#7 |
| C14 | thanks / downgrade | 6 | N10#2 N2#7 |
| C15 | compliment / positive assessment of the other | 3 | N10#1 N11#2 |
| C16 | self-downgrade | 0 | N11#1 N11#3 |
| C17 | trouble declaration | 2 | N12#1 N908#1 |
| C18 | not-knowing, held | 78 | N13#2 |
| C19 | claim / generalisation | 216 | N14#1 N15#1 N303#1 |
| C20 | anecdote opener | 16 | N909#1 N302#2 |
| C21 | greeting / ritual open or close | 1 | N1#1 N1#2 |
| C22 | reckoning | 0 | N2#6 |
| C24 | polar question | 188 | N13#1 |
| C0 *(generic)* | any turn — the generic first position | 2149 | N6#1 N17#1 N907#1 |
| C23 | explicit park | 0 | N15#4 N17#3 |

Machine-readable companion with every tagged sentence and the full pool: `could-occupy-eng.json`. Regenerate: `node tools/frame-layer/could-occupy.cjs` (`--sample` prints a 40-row probe and writes nothing).
