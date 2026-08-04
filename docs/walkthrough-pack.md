# "How this works" clips — compiled render

**Version `1b858366ba44` · generated 2026-08-04 by `tools/walkthrough/compile.mjs`. DO NOT EDIT — edit tools/walkthrough/walks/*.json and recompile.**

Coverage: **100%** — 4 authored (10 steps) · 0 skeleton (0 steps) · 4 capabilities in the inventory.

## Authored

### check-a-course — Clearing QA flags

Personas: admin, editor · place: checking

1. [`qa-filters` · setting · advance click] Narrow the list to one kind of problem at a time — errors first, so the breakages get seen before the nitpicks.
2. [`qa-dismiss-flag` · click · advance next] Dismiss says the CHECKER was wrong, not the content — the phrase stays exactly as it is. Use it whenever the flag is a false positive.
3. [`qa-approve-all` · click · advance next] Approving deletes every flag you did NOT dismiss, so dismiss first and approve last. Nothing goes until you tap this.
   - terminal: Dismiss the false positives, then approve once. This clip changed nothing — only your own taps do.

### popty-main-areas — Where everything lives

Personas: admin, editor · place: home

1. [`home-courses` · click · advance next] Courses is where the work happens — every course you can touch, at whatever stage it is in. Start here when you have something to build, translate, record or ship.
2. [`home-how` · click · advance next] **How & Why** is the app explaining itself — what to do here, and the rulings behind it. It is compiled from the code, so it cannot drift out of date the way a manual would.
3. [`home-admin` · click · advance next] Admin is the settings that apply across every course at once — who has access, and how the algorithms behave. Change something here and it changes everywhere.
   - terminal: Three doors, and that is the whole hub. Nothing you tapped during this changed anything.

### record-your-part — Your two kinds of recording

Personas: admin, editor, recorder · place: record-room

1. [`record-mode-script` · toggle · advance click] Reading script is the long list of phrases in your own voice part — stop and pick it up whenever you like, because what you have already read is skipped.
2. [`record-mode-dialogue` · toggle · advance click] Dialogue lines are recorded as one continuous take and sliced up afterwards, so you can act the conversation instead of stopping between every line.
   - terminal: Whichever you pick, everything is saved under your voice part — so two people can never be mistaken for each other.

### where-the-rulings-live — Finding the ruling behind a decision

Personas: admin · place: how

1. [`how-ruling-card` · click · advance next] Rulings are the decisions the whole app obeys — read one when you want to know WHY something behaves the way it does, rather than how to work it.
2. [`how-stocktake-link` · click · advance next] Stock-take is the same truth as numbers — what actually exists in the database right now, so you can check a ruling against reality instead of trusting it.
   - terminal: Ruling first, stock-take second: the decision, then the evidence it is still being kept.

## Skeleton — not offered, awaiting authoring

