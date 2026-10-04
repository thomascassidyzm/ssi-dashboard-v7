import { describe, it, expect } from 'vitest'
import { reconcileBuffers, anyDirty, bufferKey } from './guessTextBuffers.js'

const item = (id, content) => ({ kind: 'tell', id, live: { content } })
const k = (id) => bufferKey({ kind: 'tell', id })

describe('guess text editor buffers survive a reload', () => {
  it('saving one item keeps every other unsaved box', () => {
    const edits = { [k('a')]: 'A saved', [k('b')]: 'B half-typed', [k('c')]: 'C', [k('d')]: 'D typed during save' }
    const oldBase = { [k('a')]: 'A', [k('b')]: 'B', [k('c')]: 'C', [k('d')]: 'D' }
    const fresh = [item('a', 'A saved'), item('b', 'B'), item('c', 'C'), item('d', 'D')]
    reconcileBuffers(edits, oldBase, fresh, { [k('a')]: 'A saved' })
    expect(edits[k('b')]).toBe('B half-typed')
    expect(edits[k('d')]).toBe('D typed during save')
    expect(edits[k('a')]).toBe('A saved')
  })
  it('keeps text typed into the SAVED box after the save was sent', () => {
    const edits = { [k('a')]: 'A saved and then more' }
    reconcileBuffers(edits, { [k('a')]: 'A' }, [item('a', 'A saved')], { [k('a')]: 'A saved' })
    expect(edits[k('a')]).toBe('A saved and then more')
  })
  it('refreshes clean boxes to the new live text (someone else saved)', () => {
    const edits = { [k('b')]: 'B' }
    reconcileBuffers(edits, { [k('b')]: 'B' }, [item('b', 'B by someone else')])
    expect(edits[k('b')]).toBe('B by someone else')
  })
  it('anyDirty flags unsaved edits only', () => {
    const items = [item('a', 'A')]
    expect(anyDirty({ [k('a')]: 'A ' }, items)).toBe(false)
    expect(anyDirty({ [k('a')]: 'A2' }, items)).toBe(true)
  })
})
