// The PVC slot rule: the plan's ceiling is Scale's 4, and a create that needs a slot the plan lacks is refused
// (job #350·AC; the #560·AA tool hard-coded Startup's 2 and would have refused the account's 2nd Pro clone).
const test = require('node:test'), assert = require('node:assert')
const { slotVerdict } = require('./cartesia-pvc.cjs')
test('one Pro clone on a 4-slot plan leaves three free', () => {
  assert.deepStrictEqual(slotVerdict([{ id: 'a' }], 4), { ok: true, used: 1, of: 4, free: 3 })
  assert.strictEqual(slotVerdict([{ id: 'a' }]).ok, true) // default ceiling is the Scale plan's
})
test('a full plan refuses: freeing a slot is a person\'s decision', () => {
  const v = slotVerdict([{}, {}, {}, {}], 4)
  assert.strictEqual(v.ok, false); assert.match(v.why, /4\/4/)
})
