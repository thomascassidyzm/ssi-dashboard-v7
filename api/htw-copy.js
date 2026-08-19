/**
 * GET  /api/htw-copy   → { current, original, savedAt, savedBy, versions }
 * POST /api/htw-copy   → save a new version. Body: { content: "<markdown>" }
 *
 * A permanent thin alias for /api/copy?doc=htw. The link popty.app/htw-copy was
 * handed to an editor before the Copy area was generalised, so this endpoint
 * answers exactly as it always did and must never be removed.
 *
 * All the behaviour — auth, the append-only store, the response shape — lives in
 * ./copy.js. This file only pins the doc id.
 */

import { handleCopy } from './copy.js';

export default async function handler(req, res) {
  return handleCopy(req, res, 'htw');
}
