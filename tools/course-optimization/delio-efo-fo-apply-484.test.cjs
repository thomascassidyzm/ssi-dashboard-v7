'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { efoFoFor } = require('./delio-efo-fo-apply-484.cjs');
test('bare final delio gets efo fo; objects, mid-line delio and the LEGO itself untouched', () => {
  assert.deepStrictEqual(efoFoFor('I must deal', 'rhaid i mi ddelio'), { target: 'rhaid i mi ddelio efo fo', known: 'I must deal with it' });
  assert.deepStrictEqual(efoFoFor('to deal', 'isio delio'), { target: 'isio delio efo fo', known: 'to deal with it' });
  assert.strictEqual(efoFoFor('to deal with the arrangements', 'ddelio efo’r trefniadau'), null);
  assert.strictEqual(efoFoFor('to deal today', 'delio heddiw'), null);
  assert.strictEqual(efoFoFor('to deal', 'ddelio'), null);
});
