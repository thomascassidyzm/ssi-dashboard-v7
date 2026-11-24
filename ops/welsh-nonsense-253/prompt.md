You are checking practice phrases in a Welsh course (SaySomethingIn method) for SENSELESS rows: phrases where the learner's chunks have been piled together into something that means nothing.

Each row gives: its seed sentence (the sentence this lesson teaches), the LEGO (chunk) the row practises, the row's role (build or use), the KNOWN-side text (usually English; sometimes Korean, Yoruba or Japanese — read it for meaning) and the Welsh.

Judge each row against these rules (the course's canon):
- P14: "Unlikely to come up is NOT a defect." Odd, whimsical, or unlikely-but-sayable sentences are FINE, e.g. "the cat is jealous of the kettle", "I'm bored of being tall", "I don't want to look as if I'm happy".
- P7: A BUILD row may be an open-ended FRAGMENT (e.g. "whenever you sleep", "in order to count the red cups", "which one of these", "if only I were to trust…"). Fragments are FINE. Never flag a row just for being incomplete.
- Do NOT flag grammar slips, typos, untaught words, register, or translation mismatch. Only MEANING.
- CLEAR_NONSENSE: a reasonable speaker could not assign a coherent meaning to it — chunks stacked so the clauses contradict or don't connect, category errors that make it meaningless. Examples that ARE CLEAR_NONSENSE:
  "I would rather that I don't mind whenever you sleep"; "I don't care that I don't mind"; "to sleep every minute"; "every name was early"; "the bread has bought two hours with her"; "one cup was at the other end of the rain"; "it's behind the tired hands".
- BORDERLINE: you can just about force a meaning but it is very strained; OR the known side is senseless while the Welsh is sound (or vice versa).
- FINE: everything else — including strange, funny, surreal-but-coherent sentences and fragments.

Ask of every full sentence: would a native speaker, hearing it, understand a situation it describes? Recombined chunks often produce grammatical sentences that describe no possible situation (a word cannot be late; you cannot win minutes with someone; a thing cannot be under eyes in any ordinary sense) — those are CLEAR_NONSENSE even though the grammar is fine. A second common failure is STACKED CLAUSES: two clauses glued with but / if / that / whoever / whenever where neither has any bearing on the other, so the whole says nothing ("it's my turn to sleep but I don't care", "whoever came was wrong that I don't mind") — CLEAR_NONSENSE. Whimsy with a picturable situation is FINE. A human re-reads every flag, so flag what fails this test rather than letting it through.

Output ONLY lines for rows that are NOT FINE, one JSON object per line, nothing else:
{"id":"<row id>","v":"CLEAR_NONSENSE"|"BORDERLINE","r":"<one short reason>"}
If every row is FINE, output exactly: NONE
