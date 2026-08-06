# Aran's Welsh drafts, verified live on popty.app — 2026-08-06

Camberley being offline does not hide the Welsh drafts. Popty's environment switcher
points its backend at **SSi Machine (Cloud)** — watson-1 — and the whole feature works
from there. Verified through the real site, signed in, in a real browser. Not localhost,
not the repo.

## Where Aran clicks

1. Go to **https://popty.app** and sign in as usual (aran@hey.com — he is admin,
   all courses).
2. Top bar, the dropdown left of the clock: pick **SSi Machine (Cloud)**. The page
   reloads and the dot beside it goes green. This is a one-off — the browser remembers it.
3. Pick the course in the course dropdown: **Welsh (North) for English Speakers**
   (`cym_n_for_eng`) or **Welsh (South)** (`cym_s_for_eng`).
4. On the Overview, scroll to **AUDIO → Human Recording**. Directly under it is an orange
   strip: *"109 pod lines awaiting proofread — machine-written Welsh (North) nobody has
   read yet."* Click it.
5. It opens Pod 0 with **Showing drafts only** already on: every drafted line, its English
   beside it, in scene order, each ringed and badged **DRAFT — AWAITING PROOFREAD**.
6. Press **✎** on a line, read it, press **Save**. The DRAFT marker comes off that line —
   even if he changed nothing, because "it still fits" is his judgement to make. Every
   count on every surface drops by one.

Direct links, if he'd rather skip steps 3–4 (still do step 2 first):

- https://popty.app/production/cym_n_for_eng/pods/pod-0?drafts=1
- https://popty.app/production/cym_s_for_eng/pods/pod-0?drafts=1

## What was actually verified

A headless Chromium drove the deployed popty.app end to end, signed in through real
Supabase auth as a throwaway **admin** identity (Aran's access level; deleted afterwards,
zero residue). Every check passed:

| Check | Result |
|---|---|
| Sign in to popty.app | landed signed-in |
| Backend is SSi Machine (Cloud) | `ssi_environment=watson`, `api_base_url=https://watson-1.tail4968cb.ts.net:8443` |
| `cym_n_for_eng` draft strip on Overview | **109 pod lines awaiting proofread** |
| `cym_n_for_eng` strip lands on the drafts | `…/pods/pod-0?drafts=1` · 109 DRAFT-badged lines on screen · filter present |
| `cym_s_for_eng` draft strip on Overview | **104 pod lines awaiting proofread** |
| `cym_s_for_eng` strip lands on the drafts | `…/pods/pod-0?drafts=1` · 104 DRAFT-badged lines on screen · filter present |
| Every production API call went to watson-1 | 12 of 12, none anywhere else |

Live counts re-measured today, not carried over: **cym_n 109, cym_s 104** — the same as the
earlier report. `fra_for_eng` returns 0, so the endpoint is counting drafts, not rows.

Backend health, checked rather than assumed: `production-api` on watson-1 port 3470 answers
`/health` with `supabase: connected` at commit `ecefd464`; the Tailscale Funnel on
`:8443` is on and serving it; from the **public** funnel ingress (not the tailnet path)
the drafts endpoint returns 200 with an admin token, 401 with none; CORS preflight from
origin `https://popty.app` is allowed explicitly.

Probe: `scripts/verify-welsh-drafts-popty-live.cjs`, screenshots in
`scripts/out/welsh-drafts-live/`.

## One thing fixed on the way

The strip read *"machine-written **cym** nobody has read yet"* and the pod panel counted
*"109 **cym_n** lines"* — raw ISO codes printed into a human sentence, because
`ProductionOverview` used `courseInfo.targetLang` straight and `PodDetailView` kept its own
language table with no `cym_n`/`cym_s` in it. One shared `getLanguageName()` now backs
both, dialect code first: it reads **Welsh (North)** and **Welsh (South)**. Copy only —
no counts, no gating, no behaviour changed. Commit `b3eda193`, on `main`, deployed to
popty.app and re-verified live after the deploy.

## The one caveat worth knowing

If a machine is **on Tom's tailnet**, its MagicDNS answers `watson-1.tail4968cb.ts.net`
with the tailnet address `100.108.9.37`, and Chrome then refuses the call under Private
Network Access: *"blocked by CORS policy: Permission was denied for this request to access
the `local` address space."* Observed on watson-1 itself. Off the tailnet — which is
Aran — the same name resolves to Tailscale's public funnel ingress and everything works,
which is what the verification above ran against. If **Tom** checks it from a tailnet
device and sees that error, it is this, not a broken deployment: quit Tailscale on that
device, or use a device that isn't on the tailnet.

## The gap that remains

Unchanged from before: the Welsh itself is still a machine draft until Aran reads it.
Nothing here changes that — it makes the waiting visible and gives him the one-click way
to end it, line by line. Recorders cannot clear the marker; only Aran or another
editor/admin on the course can.
