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
  ['/api/seed/translate', 'seed-translate.cjs is never mounted — dead code, so it is not a surface. '
    + 'The "is it still unmounted" test below turns this reason into an assertion.'],
]);

function routeDeclarations(src) {
  const out = [];
  const re = /\b(?:router|app)\.(get|post|put|patch|delete|all)\(\s*(['"`])([^'"`]+)\2/g;
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
  const helpers = [];
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
      if (!owner) {
        // A content write in a helper ABOVE every route declaration. This is the
        // blind spot that hid initializeCourseSeeds — 668 course_seeds rows
        // written from two GET routes, invisible because the scanner attributed
        // writes only to a route declared before them. Collected, not dropped.
        helpers.push(`${file}:${i + 1} writes ${table} from a top-level helper`);
        continue;
      }
      const full = (owner.rawPath.startsWith('/api') ? '' : prefix) + owner.rawPath;
      found.set(`${owner.method} ${full}`, { file, line: i + 1, table });
    }
  }
  return { found, helpers };
}

describe('content-write surface manifest', () => {
  const manifest = new Set(SURFACES.map(s => `${s.method} ${s.path}`));
  const { found: derived, helpers } = derivedSurfaces();

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

  // Content writes that live in a helper rather than a route body. Each one is
  // reachable only through a route that IS gated, so identity is captured; what
  // varies is whether the helper can stamp the rows it writes. Listed here with
  // that status, so a NEW helper write shows up as a failure rather than as
  // nothing at all.
  it('accounts for every content write that lives in a helper', () => {
    const ACCOUNTED = [
      // Stamped: `req` is threaded through and the rows carry the event.
      'services/course-builder/routes/translation.cjs writes course_seeds from a top-level helper',
      'services/course-builder/routes/seed-complete.cjs writes course_seeds from a top-level helper',
    ];
    const unaccounted = helpers.filter(h => !ACCOUNTED.some(a => h.replace(/:\d+ /, ' ') === a));
    expect(unaccounted, 'A content write in a helper is invisible to the route scan — the class '
      + 'that hid initializeCourseSeeds. Thread the identity through and list it here:\n'
      + unaccounted.join('\n')).toEqual([]);
  });

  // The exemption above is only true while the module stays unmounted. Pin it,
  // so wiring seed-translate.cjs up fails here instead of quietly shipping an
  // ungated content write.
  it('seed-translate.cjs is still unmounted, which is what excuses it', () => {
    const entry = fs.readFileSync(path.join(REPO, 'services/course-builder-api.cjs'), 'utf8');
    expect(entry.includes('seed-translate'),
      'seed-translate.cjs is now mounted — it writes course_seeds, course_legos and '
      + 'course_practice_phrases, so add it to content-write-surfaces.cjs and drop the '
      + 'exemption in NOT_AN_EDITING_SURFACE. Note it reads its course from ?course=, '
      + 'which courseCodeFrom() does not look at.').toBe(false);
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
