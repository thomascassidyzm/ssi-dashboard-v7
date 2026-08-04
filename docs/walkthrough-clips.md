# "How this works" clips — the authoring contract

The engine is ported from `ssi-learning-app`. This file is the part the code
can't tell you: the conventions, and which of them fail the build.

**A clip is not video and not voiced.** It is hand-authored JSON, compiled to a
static pack, replayed as an overlay on the real page over real data — a pulse
ring on the actual element plus a step card, with the page underneath fully
interactive. Zero model calls, zero runtime cost, nothing generated.

## The three founder rulings, as gates

Tom, 2026-08-04, verbatim: *"anything that popty.app can DO, can/must be broken
down into a clip / < 5 steps / each step is a choice: click, setting, toggle"*.

| Ruling | Gate | Fails on |
|---|---|---|
| total coverage | `gateInventory` | a walk that is not a capability in `tools/walkthrough/inventory.json` |
| fewer than 5 steps | `validateWalkSchema` | `steps.length > 4` — split the journey and chain it with `next` |
| every step is a choice | `validateWalkSchema` | a step without `choice: click \| setting \| toggle` |

A step's `say` is **one sentence explaining its PURPOSE**, not the mechanics.
*"so the system knows which course you mean"* — not *"click the dropdown."*

## `data-persona` — the convention that gives the persona gate teeth

The learning app's persona gate leans on a `v-if="!member"` template marker.
Popty has no such marker: visibility lives in `useAuth` (`isAdmin`,
`isRecorder`, `hasDashboardAccess`), expressed variously in templates and in
the router guard. A straight port would have been a no-op that looks like a
gate — a clip could point a recorder at an admin-only button and compile green.

So: **every walk anchor declares who can see it, and the declaration is
cross-checked against the guards around it.**

```html
<button data-walk="open-user-management" data-persona="admin">Users</button>
<button data-walk="open-course" data-persona="all">Open</button>
```

Values are `admin`, `editor`, `recorder` (Popty's real roles — `useAuth.js`,
and the `<option>`s in `UserManagement.vue`), space-separated, or `all`.

Four ways this fails the build:

1. **No `data-persona` on a walk anchor.** Absence is a failure, never a silent
   pass. This is what stops the gate degrading into decoration.
2. **The walk is offered to a persona the anchor does not admit** — the
   recorder-pointed-at-an-admin-button case.
3. **The declaration overclaims against its guards.** The compiler walks the
   anchor's *ancestor chain* — in Popty the guard is almost never on the
   button, it is on the section wrapper — and reads `v-if`/`v-show`
   expressions mentioning `isAdmin` / `isRecorder`. Declaring `all` inside a
   `v-if="isAdmin"` section fails.
4. **A recorder clip outside the Record Room.** The router guard bounces role
   `recorder` out of every other route, so that offer is a lie no template
   attribute could catch. `gateRecorderConfinement` reads the guard from
   `src/router/index.js` and refuses to pass silently if it ever leaves.

Guard-expression reading is a heuristic — it only knows the `useAuth` flags
Popty actually guards on, and an expression it does not recognise imposes no
constraint. Gate 1 (mandatory declaration) is the teeth; gate 3 is the
cross-check that catches a lying declaration.

## Authored vs skeleton

`status: "authored"` is finished training material. `status: "skeleton"` is an
honest placeholder: a capability we know Popty has, with proposed steps and
`say: null` where a sentence still needs Tom's voice.

- Only `authored` walks reach the runtime pack — a skeleton is never offered.
- An `authored` walk carrying `TODO(tom)` **fails the compile**.
- Skeleton walks are exempt from the anchor check (their anchors are proposals,
  not yet annotated); every other gate still applies, and the compile prints
  the exemption as a count.

That distinction is the integrity of the whole thing: the placeholder set
cannot silently ship as finished training material.

## Safety

`DESTRUCTIVE_ANCHOR_PATTERNS` is re-derived for Popty's own money-and-
irreversibility surface — builds, TTS spend, audio passes, course deletion —
not the learning app's invites-and-entitlements list. A **click-advance** step
on any of them fails the build; a clip may point at them, never walk the
user's finger onto them. The runtime carries a verbatim mirror (lockstep-
checked) so even a hand-edited pack cannot attach the listener.

`startWalk()` may only appear inside an `@click` handler. A clip starts from a
user tap or not at all — structurally, not by convention.

## Running it

```
node tools/walkthrough/compile.mjs           # write the pack + docs render
node tools/walkthrough/compile.mjs --check   # validate only, no writes (CI)
node --test tools/walkthrough/lib.test.mjs   # the gates, on fixtures
```

Both run in `.github/workflows/explainer-check.yml` on every push and PR.
