import { describe, it, expect } from 'vitest'
import { shapeTranslations, shapeLegoBreakdowns } from './courseEditorRows.js'

describe('shapeTranslations', () => {
  it('aliases known/target phrases and falls back uuid to seed_id', () => {
    expect(shapeTranslations([{ known_phrase: 'hi', target_phrase: 'bonjour', seed_id: 's1' }]))
      .toEqual([{ known_phrase: 'hi', target_phrase: 'bonjour', seed_id: 's1', source: 'hi', target: 'bonjour', uuid: 's1' }])
    expect(shapeTranslations(undefined)).toEqual([])
  })
})

describe('shapeLegoBreakdowns', () => {
  it('maps a database seed row to the editor shape', () => {
    const out = shapeLegoBreakdowns([{
      seed_id: 7,
      seed_pair: { known: 'I want', target: 'je veux' },
      legos: [
        { id: 'L1', known: 'I', target: 'je', type: 'A' },
        { id: 'L2', known: 'I want', target: 'je veux', type: 'M', new: false, ref: 'x',
          components: [{ known: 'I', target: 'je' }, { known: 'want', target: 'veux' }] },
      ]
    }])
    expect(out).toEqual([{
      seed_id: 7, original_target: 'je veux', original_known: 'I want',
      lego_pairs: [
        { lego_id: 'L1', target_chunk: 'je', known_chunk: 'I', lego_type: 'ATOMIC', is_new: true, ref: null, componentization: null },
        { lego_id: 'L2', target_chunk: 'je veux', known_chunk: 'I want', lego_type: 'COMPOSITE', is_new: false, ref: 'x', componentization: 'I = je, want = veux' },
      ]
    }])
  })

  it('tolerates missing seed_pair and legos', () => {
    expect(shapeLegoBreakdowns([{ seed_id: 1 }])).toEqual([{ seed_id: 1, original_target: '', original_known: '', lego_pairs: [] }])
    expect(shapeLegoBreakdowns(null)).toEqual([])
  })
})
