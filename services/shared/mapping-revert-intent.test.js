// The revert predicate holds a door open in one direction and shut in the other:
// a deliberate "put it back" must get through, and an accident must not.
import { describe, it, expect } from 'vitest'
import { isRevertRequest } from './mapping-revert-intent.cjs'

describe('isRevertRequest', () => {
  it('reads an explicit null as a revert', () => {
    expect(isRevertRequest({ source: 'phrase', segments: null })).toBe(true)
  })

  it('reads an empty list as a revert too — both spellings are accepted', () => {
    expect(isRevertRequest({ source: 'phrase', segments: [] })).toBe(true)
  })

  it('is NOT a revert when the segments field is missing entirely', () => {
    // A dropped field is a malformed save, not an intention. It must keep
    // failing the shape check rather than silently wiping the row.
    expect(isRevertRequest({ source: 'phrase' })).toBe(false)
    expect(isRevertRequest({})).toBe(false)
  })

  it('is NOT a revert when real segments are submitted', () => {
    expect(isRevertRequest({ segments: [{ span: 2, known: 'a word' }] })).toBe(false)
  })

  it('is NOT a revert for undefined, a non-object body, or anything falsy', () => {
    expect(isRevertRequest(undefined)).toBe(false)
    expect(isRevertRequest(null)).toBe(false)
    expect(isRevertRequest('segments')).toBe(false)
    expect(isRevertRequest([])).toBe(false)
    // An explicit `undefined` value still counts as "the field was not sent".
    expect(isRevertRequest({ segments: undefined })).toBe(false)
  })

  it('is NOT a revert for other empty-ish values that are not the agreed spelling', () => {
    expect(isRevertRequest({ segments: '' })).toBe(false)
    expect(isRevertRequest({ segments: 0 })).toBe(false)
    expect(isRevertRequest({ segments: false })).toBe(false)
    expect(isRevertRequest({ segments: {} })).toBe(false)
  })
})
