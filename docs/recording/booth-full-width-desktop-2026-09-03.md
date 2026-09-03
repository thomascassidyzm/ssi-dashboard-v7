# The booth uses the full width of a desktop screen

*2026-09-03. Tom: "improve the booth so it goes FULL WIDTH on desktop".*

## What changed

One block of CSS in `src/views/RecordistRoom.vue`, inside `@media (min-width: 900px)`.
The booth's single `max-width: 640px` — the narrow column Tom was looking at — is lifted
above 900px wide and nothing else about the page is touched. Nothing was added to fill
the space.

Above 900px:
- the container fills the screen with a 2rem page padding;
- the completeness grid gets **80 marks per row at 1920px** and 71 at 1440px, against 15 on a
  phone: 385 lines are five rows of marks instead of twenty-six;
- the spoken line keeps a **34-character reading measure** inside the now-wide well, and the
  instructions and toggle notes keep 68 — a 2.1rem line stretched to 1900px is harder to read
  aloud from than the column it replaced;
- Back and Again stop scaling with the viewport (fixed 9rem); Next still takes the rest of the row.

## The phone is untouched

It is a `min-width` query, so no rule in it can apply below 900px — that is a fact of CSS, not
a judgement. Measured on the deployed page at 390×844: container `max-width: 640px`,
padding `0.6rem`, 15 marks per row — the same values that ship today.

## Verified on the deployed booth

Marker grepped out of the served bytes at `https://popty.app/assets/RecordistRoom-BvZFBXys.css`:

```
@media (min-width: 900px){.recordist[data-v-7d3f9ed6]{max-width:none;padding:1.25rem 2rem}...}
```

Looked at in a real browser on `https://popty.app/r/human_aran_cym_n` at 1440×900, 1920×1080
and 390×844. Nothing was recorded and no edit was saved.

- **Tappable grid** — tapped a mark 200 marks into NEW SEEDS: the line's own words opened
  **24px below the mark**, i.e. on the very next line of the wrapping strip, still on the row of
  the question. Both sections still read with their own counts (POD-1 78/2, NEW SEEDS 83/222).
- **Edit in place** — tapped a line in the full list: the editor opened at the same left edge,
  within 8px of the words it replaced, focused. Escape closed it and saved nothing.
- **Not verified:** the transport buttons being disabled while the editor is open. That lives on
  the recording stage, which cannot be reached without pressing record, and nothing in this
  change touches it.

## Screenshots

Tailnet only: <https://watson-1.tail4968cb.ts.net/evidence/booth-full-width-2026-09-03/>

- `final-desktop-1920.png`, `final-desktop-1440.png` — the wide layout
- `final-phone-390.png` — the phone, unchanged
- `after-1440-grid-tap.png` — a mark tapped at desktop width
- `after-1440-edit-in-place.png` — the editor open on a row
