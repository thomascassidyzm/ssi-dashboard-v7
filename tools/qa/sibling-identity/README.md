# sibling-identity — is any variant byte-identical to its sibling?

A variant exists in order to DIFFER from its siblings under the same key. One that
is byte-identical to its sibling fails its own definition — and fails silently: the
row is well-formed, non-null and correctly counted, so every count-based and
null-based audit passes it. Job #264 found two such rows in the South Welsh health
pod. Nothing anywhere compared two siblings to each other.

Read-only. It repairs nothing, and it must not: which words replace a duplicated
flow is a dialect and register call, per case.

```
node tools/qa/sibling-identity/check.cjs [--json FILE] [--quiet]   # one run, full report
node tools/qa/sibling-identity/nightly.cjs [--no-notice]           # the scheduled leg
npx vitest run tools/qa/sibling-identity                           # the boundary tests
```

## Where it looks — derived, never listed

`derive.cjs` asks the live catalogue: every composite unique index in `public`,
every way of dropping one column to leave a group key and a discriminator, on any
table carrying authored text. No table name appears in it. `register.cjs` supplies
the one thing a catalogue cannot state — whether siblings under that key are MEANT
to differ — and anything it does not name comes back UNKNOWN, reported and never
assumed either way.

## What it does not assert

Global uniqueness. #264 found three duplicate pairs and only two were defects; the
third was a stock phrase reused across scenes, which is fine. Two rules draw that
line, and both are reported as rules so they can be argued with per table:

* **the scope rule** — siblings differing only by which course/pod/language they
  belong to are one item reused in two scopes;
* **the ordinal rule** — a position in a document is not a variant of another
  position, so identical content at two positions is repetition across the
  document. Where positions genuinely ARE variants the register says so and wins
  (`course_practice_phrases.position`).

## Calibration

`check.cjs` reproduces #264's known positive — the health walk, scenes 8 and 20 —
or reports nothing and exits 2. A check that runs clean over the estate while a
known defect sits in it is a broken check that would then be trusted nightly.

## Install the nightly

```
cp tools/qa/sibling-identity/systemd/ssi-sibling-identity.{service,timer} ~/.config/systemd/user/
systemctl --user daemon-reload && systemctl --user enable --now ssi-sibling-identity.timer
```

Quiet is silent; a rise, or a new shape nobody has ruled on, posts one notice into
the Popty project channel. Snapshots: `~/.local/state/ssi-sibling-identity/`.
