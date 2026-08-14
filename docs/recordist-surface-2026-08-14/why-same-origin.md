# Why the recordist surface must be same-origin

The recordist route `/r/:voiceId` is the one page anonymous people open on their
phones. It cannot afford a cross-origin fetch.

`popty.app` talking straight to `watson-1.tail4968cb.ts.net:8443` is blocked by
the browser **before CORS is consulted**. Chrome refuses it as a public document
reaching into the local address space:

```
Access to fetch at 'https://watson-1.tail4968cb.ts.net:8443/...'
from origin 'https://popty.app' has been blocked by CORS policy:
Permission was denied for this request to access the `local` address space.
```

This is why header checks are useless here: the preflight and the GET both
answer `200` with a correct `Access-Control-Allow-Origin: https://popty.app`.
`curl` sees a perfectly healthy backend. The browser still refuses. To the
recordist it arrives as a bare **"Failed to fetch"**.

The fix is in `vercel.json`: `/api/recording/*` is proxied through `popty.app` to
watson-1, so the page only ever talks to its own origin and the private-network
hop happens server-side, where no browser policy applies.

Two things to keep true:

- **The rewrite must stay ABOVE the SPA catch-all** (`/((?!vfs).*)` →
  `/index.html`), or it is swallowed by it.
- **`vercel.json` rewrites accept only `source`, `destination`, `has`, `missing`.**
  An extra key — a `comment`, for instance — makes Vercel reject the whole
  config, and the symptom is simply that the site stops redeploying. That is what
  this note exists instead of.

When verifying, **check the response body, not the status**. An unrouted
`/api/*` on popty.app returns `200` with SPA HTML, so `res.ok` proves nothing.
