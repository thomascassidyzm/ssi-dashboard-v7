# The shape metagraph

The store. One location, one reader, both labs consume it.

- **Specification:** `docs/pods/shape-graph-2026-08-30.md` — derived and audited against all
  231 rows of `canonical_pod_scenarios` where `pod_slug = 'pod-0'`. If anything here disagrees
  with that document, the document is right.
- **Guide:** `docs/pods/metagraph-store-2026-08-30.md` — what is in the store, the format, how to
  read it, and what the coverage read-out can rely on staying stable.
- **Schema:** `schemas/metagraph-v1-schema.json`
- **Self-check:** `node tools/metagraph-selfcheck.cjs` (run from the repo root)

```js
const mg = require('./services/shared/metagraph/index.cjs');

mg.load();                  // the whole store, indexed
mg.get('N3');               // any node, bound pair, move, edge or outcome shape by id
mg.coverage('pod-0');       // { traversed, revisited, never, visitCounts }
mg.branches('pod-0');       // the branch points a linear format cannot say
mg.deliveryOrder();         // derived from the survivability edges, never authored
```

The graph is **language-agnostic**. English is the notation it is written in, not its content:
nothing in these files carries a `lang_pair` or a target language.
