# por_br_for_eng — cs #698·AI, 18 Nov 2026 — DRY RUN ONLY, NOT APPLIED

Out of TTS share (4,500 chars for the whole child; fra_ca+ara_lb+deu used it). Every row re-read live 18 Nov: all
93 still carry the European form. plan.json = 87 phrases + 6 LEGOs; ops.json = text-only edit-batch; dry.json =
8 clean dry-run batches (200, ok). Price: ≤ 6,320 chars (target1+target2 per changed text, before library hits).

Rules applied (Brazilian norm; Michaelis "ter certeza", Priberam BR):
- `ter a certeza` → `ter certeza` (42 rows + LEGOs S0202L03, S0340L01). The course already says `tenho certeza` in S0482L04U05.
- `se magoou` → `se machucou` (16; BR magoar = hurt feelings, machucar = physical hurt) + LEGO S0339L01.
- `falando a sério` → `falando sério` (9 + LEGO S0482L04).
- tu-forms `perguntaste`/`concordaste` → `você perguntou`/`você concordou` (19 + LEGOs S0382L01, S0385L01; K26).
- `pensar em` → `considerar` (7; carries #432's seed-98 fix to its rows).
LEGO English unchanged everywhere, so no intro re-record is needed (O13 satisfied). To apply: render with
`python3 ../tools/sp.py audio por_br_for_eng real`, then `ops`, `post … dry`, `post … apply`.
