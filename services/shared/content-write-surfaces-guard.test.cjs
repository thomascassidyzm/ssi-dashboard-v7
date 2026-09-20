import { describe, it, expect } from 'vitest'

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const manifest = require('./content-write-surfaces.cjs');

// Exercise the actual drift guard, not a second implementation of its rules.
// Mutations are isolated in memory; neither the manifest nor require.cache changes.
function runLegoGuard(omittedPath) {
  const filename = path.join(__dirname, 'content-write-surfaces.test.cjs');
  const source = fs.readFileSync(filename, 'utf8')
    .replace(/^import \{ describe, it, expect \} from 'vitest'\s*$/m, '');
  const surfaces = manifest.SURFACES.map(surface => {
    const copy = { ...surface };
    if (copy.method === 'POST' && copy.path === omittedPath) delete copy.legos;
    return copy;
  });
  const guards = [];
  vm.runInNewContext(source, {
    __dirname,
    require(id) {
      if (id === './content-write-surfaces.cjs') {
        return { ...manifest, SURFACES: surfaces,
          LEGO_WRITING_SURFACES: surfaces.filter(surface => surface.legos) };
      }
      return require(id);
    },
    describe(_name, body) { body(); },
    it(name, body) {
      if (name === 'flags every route that writes course_legos, and only those') {
        guards.push(body);
      }
    },
    expect,
  }, { filename });
  expect(guards, 'The existing lego drift guard must still be exercised').toHaveLength(1);
  guards[0]();
}

describe('lego flag drift guard mutation coverage', () => {
  it('accepts the complete manifest', () => {
    expect(() => runLegoGuard()).not.toThrow();
  });

  it.each(['/api/lego', '/api/build/redo-undo/:courseCode'])(
    'rejects a missing lego flag on POST %s', route => {
      expect(manifest.LEGO_WRITING_SURFACES.some(surface =>
        surface.method === 'POST' && surface.path === route)).toBe(true);
      expect(() => runLegoGuard(route)).toThrow(route);
    },
  );
});
