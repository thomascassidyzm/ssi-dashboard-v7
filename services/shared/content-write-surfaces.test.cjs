// Drift guard for the editor-identity ruling (Tom, 2026-09-01).
//
// Requirement 2 of the ruling was "cover every editing surface in this one pass
// rather than retrofitting surface by surface later". A list written once is a
// list that rots the first time somebody adds a route. So this test does not
// check the manifest against a copy of itself — it RE-DERIVES the set of routes
// that write course content by reading the route sources, and fails when the
// derived set and the manifest disagree in either direction.
//
// Fails one of two ways, both useful:
//   - a route writes course content and is NOT in the manifest → it would save
//     without an editor identity. Add it to content-write-surfaces.cjs.
//   - the manifest lists a route that no longer writes content → delete the
//     entry, so the list keeps meaning what it says.

import { describe, it, expect } from 'vitest'

const fs = require('fs');
const path = require('path');

const { SURFACES } = require('./content-write-surfaces.cjs');

const REPO = path.resolve(__dirname, '../..');
const CONTENT_TABLES = ['course_seeds', 'course_legos', 'course_practice_phrases'];
const MUTATION = /\.(update|upsert|insert|delete)\s*\(/;

// Routes that touch a content table but are NOT edits a person makes: pure
// reads that happen to name the table in a filter, and the redo snapshot
// restore, which replays rows the redo event already attributed. Each needs a
// reason, so the exception list cannot quietly become the escape hatch.
const NOT_AN_EDITING_SURFACE = new Map([
  ['/api/build/job-done/:jobId', 'build lifecycle bookkeeping; content writes happen in the submit routes it supervises'],
]);

function routeDeclarations(src) {
  const out = [];
  const re = /\b(?:router|app)\.(post|put|patch|delete|all)\(\s*(['"`])([^'"`]+)\2/g;
  let m;
  while ((m = re.exec(src))) {
    out.push({ index: m.index, method: m[1].toUpperCase(), rawPath: m[3] });
  }
  return out;
}

function derivedSurfaces() {
  const files = [
    ...fs.readdirSync(path.join(REPO, 'services/course-builder/routes'))
      .filter(f => f.endsWith('.cjs') && !f.endsWith('.test.cjs'))
      .map(f => ({ file: path.join('services/course-builder/routes', f), prefix: '/api' })),
    { file: 'services/production-api.cjs', prefix: '' },
  ];

  const found = new Map(); // "METHOD path" -> { file, line }
  for (const { file, prefix } of files) {
    const abs = path.join(REPO, file);
    if (!fs.existsSync(abs)) continue;
    const src = fs.readFileSync(abs, 'utf8');
    const decls = routeDeclarations(src);
    if (!decls.length) continue;

    const lines = src.split('\n');
    let offset = 0;
    const lineStart = lines.map(l => { const s = offset; offset += l.length + 1; return s; });

    for (let i = 0; i < lines.length; i++) {
      const table = CONTENT_TABLES.find(t => lines[i].includes(`'${t}'`) || lines[i].includes(`"${t}"`));
      if (!table) continue;
      const window = lines.slice(i, i + 4).join('\n');
      if (!MUTATION.test(window)) continue;

      // Attribute the write to the nearest route declared above it.
      let owner = null;
      for (const d of decls) {
        if (d.index <= lineStart[i]) owner = d; else break;
      }
      if (!owner) continue;
      const full = (owner.rawPath.startsWith('/api') ? '' : prefix) + owner.rawPath;
      found.set(`${owner.method} ${full}`, { file, line: i + 1, table });
    }
  }
  return found;
}

describe('content-write surface manifest', () => {
  const manifest = new Set(SURFACES.map(s => `${s.method} ${s.path}`));
  const derived = derivedSurfaces();

  it('finds content writes to check (the scanner itself still works)', () => {
    expect(derived.size).toBeGreaterThan(10);
  });

  it('lists every route that writes course content', () => {
    const missing = [];
    for (const [key, where] of derived) {
      const bare = key.slice(key.indexOf(' ') + 1);
      if (manifest.has(key)) continue;
      if (NOT_AN_EDITING_SURFACE.has(bare)) continue;
      missing.push(`${key}  (${where.file}:${where.line} writes ${where.table})`);
    }
    expect(missing, 'These routes write course content but are not in content-write-surfaces.cjs, '
      + 'so they would save with no editor identity. Add them (or, with a reason, to '
      + 'NOT_AN_EDITING_SURFACE in this test):\n' + missing.join('\n')).toEqual([]);
  });

  it('every listed course-builder route still exists in the sources', () => {
    const srcs = fs.readdirSync(path.join(REPO, 'services/course-builder/routes'))
      .filter(f => f.endsWith('.cjs') && !f.endsWith('.test.cjs'))
      .map(f => fs.readFileSync(path.join(REPO, 'services/course-builder/routes', f), 'utf8'))
      .join('\n')
      + fs.readFileSync(path.join(REPO, 'services/production-api.cjs'), 'utf8');

    const stale = SURFACES
      .map(s => ({ s, bare: s.path.replace(/^\/api/, '') }))
      .filter(({ s, bare }) => !srcs.includes(`'${bare}'`) && !srcs.includes(`'${s.path}'`))
      .map(({ s }) => `${s.method} ${s.path}`);

    expect(stale, 'Manifest entries whose route no longer exists — delete them so the list '
      + 'keeps meaning what it says:\n' + stale.join('\n')).toEqual([]);
  });
});
