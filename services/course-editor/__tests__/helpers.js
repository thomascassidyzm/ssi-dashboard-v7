import { expect } from 'vitest'

/**
 * Assert a (sync or async) fn throws a course-editor error with a given `.code`.
 * We assert on `.code` rather than `instanceof` because vitest's ESM test
 * context and the CJS source can resolve errors.cjs to two module instances,
 * breaking instanceof at the test boundary only. In production (single CJS
 * graph) instanceof works; `.code` is stable in both worlds.
 */
export async function expectThrowsCode(fn, code) {
  let err
  try {
    await fn()
  } catch (e) {
    err = e
  }
  expect(err, `expected to throw ${code}, but nothing was thrown`).toBeDefined()
  expect(err.code, `wrong error code (message: ${err && err.message})`).toBe(code)
  return err
}
