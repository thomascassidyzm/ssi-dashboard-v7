import { describe, test, expect } from 'vitest'
import {
  detectVersion,
  transformToV5_1,
  transformV5_0ToV5_1,
  transformV5_1ToV5_0,
  transformV5_1ToV7,
  validateV5_1Format,
  getNormalizedFormat,
  extractLegoSummary,
  isMolecularLego,
  getLegoComponents,
  isNewLego,
  getLegoReference
} from '../src/services/legoFormatAdapter.js'

// Test Data Fixtures

const mockV7Data = {
  version: '7.7',
  course: 'spa_for_eng',
  target_language: 'spa',
  known_language: 'eng',
  extracted_date: '2025-01-06',
  seeds: [
    [
      'S0001',
      { target: 'Quiero hablar.', known: 'I want to speak.' },
      [
        ['S0001L01', 'A', 'Quiero', 'I want'],
        ['S0001L02', 'A', 'hablar', 'to speak']
      ]
    ],
    [
      'S0002',
      { target: 'Estoy intentando hablar.', known: "I'm trying to speak." },
      [
        ['S0002L01', 'C', 'Estoy intentando', "I'm trying"],
        ['S0002L02', 'A', 'hablar', 'to speak']
      ]
    ]
  ]
}

const mockV5_0Data = {
  version: '5.0',
  methodology: 'Known Language First Mapping',
  terminology: 'Atomic (A) / Molecular (M)',
  extraction_date: '2025-01-06',
  seeds: [
    [
      'S0001',
      ['Quiero hablar.', 'I want to speak.'],
      [
        ['S0001L01', 'A', 'Quiero', 'I want'],
        ['S0001L02', 'A', 'hablar', 'to speak']
      ]
    ],
    [
      'S0002',
      ['Estoy intentando hablar.', "I'm trying to speak."],
      [
        [
          'S0002L01',
          'M',
          'Estoy intentando',
          "I'm trying",
          [
            ['Estoy', 'I am'],
            ['intentando', 'trying']
          ]
        ],
        ['S0002L02', 'A', 'hablar', 'to speak']
      ]
    ]
  ]
}

const mockV5_1Data = {
  version: '5.0.1',
  methodology: 'Phase 3 LEGO + Pattern Extraction v5.0.1 - COMPLETE TILING',
  extraction_date: '2025-01-06',
  note: 'Every seed shows ALL LEGOs (new + referenced) needed to reconstruct it.',
  seeds: [
    {
      seed_id: 'S0001',
      seed_pair: ['Quiero hablar.', 'I want to speak.'],
      legos: [
        { id: 'S0001L01', type: 'A', target: 'Quiero', known: 'I want', new: true },
        { id: 'S0001L02', type: 'A', target: 'hablar', known: 'to speak', new: true }
      ],
      patterns: ['P01_introduced'],
      cumulative_legos: 2
    },
    {
      seed_id: 'S0002',
      seed_pair: ['Estoy intentando hablar.', "I'm trying to speak."],
      legos: [
        {
          id: 'S0002L01',
          type: 'M',
          target: 'Estoy intentando',
          known: "I'm trying",
          new: true,
          components: [
            ['Estoy', 'I am'],
            ['intentando', 'trying']
          ]
        },
        { id: 'S0001L02', type: 'A', target: 'hablar', known: 'to speak', ref: 'S0001' }
      ],
      patterns: ['P02_introduced'],
      cumulative_legos: 3
    }
  ],
  extraction_notes: {
    lego_summary: {
      total_new_legos: 3,
      atomic: 2,
      molecular: 1
    }
  }
}

// Tests

describe('Format Detection', () => {
  test('detects v5.0.1 format by version field', () => {
    expect(detectVersion(mockV5_1Data)).toBe('5.0.1')
  })

  test('detects v5.0.1 format by seed object structure', () => {
    const data = { ...mockV5_1Data }
    delete data.version
    expect(detectVersion(data)).toBe('5.0.1')
  })

  test('detects v5.0.0 format by seed array structure', () => {
    expect(detectVersion(mockV5_0Data)).toBe('5.0.0')
  })

  test('detects v7.7 format by version field', () => {
    expect(detectVersion(mockV7Data)).toBe('7.7')
  })

  test('detects v7.7 format by seed pair object structure', () => {
    const data = {
      seeds: [
        ['S0001', { target: 'Quiero', known: 'I want' }, []]
      ]
    }
    expect(detectVersion(data)).toBe('7.7')
  })

  test('returns unknown for invalid data', () => {
    expect(detectVersion(null)).toBe('unknown')
    expect(detectVersion({})).toBe('unknown')
    expect(detectVersion({ seeds: [] })).toBe('unknown')
  })
})

describe('Format Transformation: v7.7 → v5.0.1', () => {
  test('transforms basic structure correctly', () => {
    const result = transformToV5_1(mockV7Data)

    expect(result.version).toBe('5.0.1')
    expect(result.methodology).toContain('COMPLETE TILING')
    expect(result.seeds).toHaveLength(2)
  })

  test('transforms seeds to object structure', () => {
    const result = transformToV5_1(mockV7Data)
    const firstSeed = result.seeds[0]

    expect(typeof firstSeed).toBe('object')
    expect(firstSeed.seed_id).toBe('S0001')
    expect(Array.isArray(firstSeed.seed_pair)).toBe(true)
    expect(firstSeed.legos).toBeDefined()
    expect(firstSeed.patterns).toBeDefined()
    expect(firstSeed.cumulative_legos).toBeDefined()
  })

  test('transforms LEGOs to object structure', () => {
    const result = transformToV5_1(mockV7Data)
    const firstLego = result.seeds[0].legos[0]

    expect(typeof firstLego).toBe('object')
    expect(firstLego.id).toBe('S0001L01')
    expect(firstLego.type).toBe('A')
    expect(firstLego.target).toBe('Quiero')
    expect(firstLego.known).toBe('I want')
    expect(firstLego.new).toBe(true)
  })

  test('marks new vs referenced LEGOs', () => {
    const result = transformToV5_1(mockV7Data)

    // S0001: Both LEGOs are new
    expect(result.seeds[0].legos[0].new).toBe(true)
    expect(result.seeds[0].legos[1].new).toBe(true)

    // S0002: First LEGO new, second is reference to S0001
    expect(result.seeds[1].legos[0].new).toBe(true)
    expect(result.seeds[1].legos[1].new).toBeUndefined()
    expect(result.seeds[1].legos[1].ref).toBe('S0001')
  })

  test('tracks cumulative LEGOs', () => {
    const result = transformToV5_1(mockV7Data)

    expect(result.seeds[0].cumulative_legos).toBe(2) // 2 new in S0001
    expect(result.seeds[1].cumulative_legos).toBe(3) // +1 new in S0002
  })

  test('transforms C/D types to M', () => {
    const result = transformToV5_1(mockV7Data)
    const molecularLego = result.seeds[1].legos[0]

    expect(molecularLego.type).toBe('M')
    expect(molecularLego.components).toBeDefined()
  })

  test('adds componentization to molecular LEGOs', () => {
    const result = transformToV5_1(mockV7Data)
    const molecularLego = result.seeds[1].legos[0]

    expect(Array.isArray(molecularLego.components)).toBe(true)
    expect(molecularLego.components.length).toBeGreaterThan(0)
  })
})

describe('Format Transformation: v5.0.0 → v5.0.1', () => {
  test('transforms array seeds to object seeds', () => {
    const result = transformV5_0ToV5_1(mockV5_0Data)

    expect(result.version).toBe('5.0.1')
    expect(typeof result.seeds[0]).toBe('object')
    expect(result.seeds[0].seed_id).toBe('S0001')
  })

  test('transforms array LEGOs to object LEGOs', () => {
    const result = transformV5_0ToV5_1(mockV5_0Data)
    const firstLego = result.seeds[0].legos[0]

    expect(typeof firstLego).toBe('object')
    expect(firstLego.id).toBe('S0001L01')
    expect(firstLego.type).toBe('A')
  })

  test('adds new/ref markers', () => {
    const result = transformV5_0ToV5_1(mockV5_0Data)

    expect(result.seeds[0].legos[0].new).toBe(true)
    expect(result.seeds[1].legos[1].ref).toBe('S0001')
  })

  test('preserves componentization', () => {
    const result = transformV5_0ToV5_1(mockV5_0Data)
    const molecularLego = result.seeds[1].legos[0]

    expect(molecularLego.components).toBeDefined()
    expect(molecularLego.components).toHaveLength(2)
  })
})

describe('Format Transformation: v5.0.1 → v5.0.0', () => {
  test('transforms object seeds to array seeds', () => {
    const result = transformV5_1ToV5_0(mockV5_1Data)

    expect(result.version).toBe('5.0')
    expect(Array.isArray(result.seeds[0])).toBe(true)
    expect(result.seeds[0][0]).toBe('S0001')
  })

  test('transforms object LEGOs to array LEGOs', () => {
    const result = transformV5_1ToV5_0(mockV5_1Data)
    const firstLego = result.seeds[0][2][0]

    expect(Array.isArray(firstLego)).toBe(true)
    expect(firstLego[0]).toBe('S0001L01')
    expect(firstLego[1]).toBe('A')
  })

  test('preserves componentization in arrays', () => {
    const result = transformV5_1ToV5_0(mockV5_1Data)
    const molecularLego = result.seeds[1][2][0]

    expect(molecularLego[4]).toBeDefined()
    expect(Array.isArray(molecularLego[4])).toBe(true)
  })
})

describe('Format Transformation: v5.0.1 → v7.7', () => {
  test('transforms to v7.7 structure', () => {
    const result = transformV5_1ToV7(mockV5_1Data)

    expect(result.version).toBe('7.7')
    expect(Array.isArray(result.seeds[0])).toBe(true)
  })

  test('transforms seed pairs to objects', () => {
    const result = transformV5_1ToV7(mockV5_1Data)
    const seedPair = result.seeds[0][1]

    expect(typeof seedPair).toBe('object')
    expect(seedPair.target).toBe('Quiero hablar.')
    expect(seedPair.known).toBe('I want to speak.')
  })

  test('only includes new LEGOs (not referenced)', () => {
    const result = transformV5_1ToV7(mockV5_1Data)

    // S0001: 2 new LEGOs
    expect(result.seeds[0][2]).toHaveLength(2)

    // S0002: 1 new LEGO (hablar is referenced, not new)
    expect(result.seeds[1][2]).toHaveLength(1)
  })

  test('transforms M to C type', () => {
    const result = transformV5_1ToV7(mockV5_1Data)
    const molecularLego = result.seeds[1][2][0]

    expect(molecularLego[1]).toBe('C')
  })

  test('removes componentization', () => {
    const result = transformV5_1ToV7(mockV5_1Data)
    const molecularLego = result.seeds[1][2][0]

    expect(molecularLego.length).toBe(4) // [id, type, target, known]
  })
})

describe('Format Validation: v5.0.1', () => {
  test('validates correct v5.0.1 format', () => {
    const result = validateV5_1Format(mockV5_1Data)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('detects missing seed_id', () => {
    const invalid = {
      version: '5.0.1',
      seeds: [
        {
          seed_pair: ['test', 'test'],
          legos: [],
          patterns: [],
          cumulative_legos: 0
        }
      ]
    }

    const result = validateV5_1Format(invalid)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('seed_id'))).toBe(true)
  })

  test('detects invalid LEGO structure (array instead of object)', () => {
    const invalid = {
      version: '5.0.1',
      seeds: [
        {
          seed_id: 'S0001',
          seed_pair: ['test', 'test'],
          legos: [
            ['S0001L01', 'A', 'test', 'test'] // Array, should be object
          ],
          patterns: [],
          cumulative_legos: 1
        }
      ]
    }

    const result = validateV5_1Format(invalid)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Should be object'))).toBe(true)
  })

  test('detects missing new/ref markers', () => {
    const invalid = {
      version: '5.0.1',
      seeds: [
        {
          seed_id: 'S0001',
          seed_pair: ['test', 'test'],
          legos: [
            { id: 'S0001L01', type: 'A', target: 'test', known: 'test' } // Missing new/ref
          ],
          patterns: [],
          cumulative_legos: 1
        }
      ]
    }

    const result = validateV5_1Format(invalid)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('new or ref marker'))).toBe(true)
  })

  test('detects molecular LEGO without componentization', () => {
    const invalid = {
      version: '5.0.1',
      seeds: [
        {
          seed_id: 'S0001',
          seed_pair: ['test', 'test'],
          legos: [
            { id: 'S0001L01', type: 'M', target: 'test test', known: 'test test', new: true }
            // Missing components
          ],
          patterns: [],
          cumulative_legos: 1
        }
      ]
    }

    const result = validateV5_1Format(invalid)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('componentization'))).toBe(true)
  })

  test('detects missing cumulative_legos', () => {
    const invalid = {
      version: '5.0.1',
      seeds: [
        {
          seed_id: 'S0001',
          seed_pair: ['test', 'test'],
          legos: [
            { id: 'S0001L01', type: 'A', target: 'test', known: 'test', new: true }
          ],
          patterns: []
          // Missing cumulative_legos
        }
      ]
    }

    const result = validateV5_1Format(invalid)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('cumulative_legos'))).toBe(true)
  })

  test('validates null data', () => {
    const result = validateV5_1Format(null)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Data is null or undefined')
  })
})

describe('Normalized Format', () => {
  test('returns v5.0.1 data unchanged', () => {
    const result = getNormalizedFormat(mockV5_1Data)

    expect(result.version).toBe('5.0.1')
    expect(result).toEqual(mockV5_1Data)
  })

  test('transforms v5.0.0 to v5.0.1', () => {
    const result = getNormalizedFormat(mockV5_0Data)

    expect(result.version).toBe('5.0.1')
    expect(typeof result.seeds[0]).toBe('object')
    expect(result.seeds[0].seed_id).toBe('S0001')
  })

  test('transforms v7.7 to v5.0.1', () => {
    const result = getNormalizedFormat(mockV7Data)

    expect(result.version).toBe('5.0.1')
    expect(typeof result.seeds[0]).toBe('object')
  })

  test('throws error for unknown format', () => {
    expect(() => getNormalizedFormat({})).toThrow('unknown format')
  })
})

describe('LEGO Summary Extraction', () => {
  test('extracts summary from v5.0.1 data', () => {
    const summary = extractLegoSummary(mockV5_1Data)

    expect(summary.total_new_legos).toBe(3)
    expect(summary.atomic).toBe(2)
    expect(summary.molecular).toBe(1)
    expect(summary.seeds).toBe(2)
  })

  test('extracts summary from v5.0.0 data', () => {
    const summary = extractLegoSummary(mockV5_0Data)

    expect(summary.total_new_legos).toBe(3) // Counts new LEGOs only
    expect(summary.atomic).toBe(2)
    expect(summary.molecular).toBe(1)
  })

  test('extracts summary from v7.7 data', () => {
    const summary = extractLegoSummary(mockV7Data)

    expect(summary.total_new_legos).toBe(3)
    expect(summary.seeds).toBe(2)
  })
})

describe('Molecular LEGO Detection', () => {
  test('identifies atomic LEGO (v5.0.1 object)', () => {
    const atomicLego = { id: 'S0001L01', type: 'A', target: 'Quiero', known: 'I want', new: true }

    expect(isMolecularLego(atomicLego)).toBe(false)
  })

  test('identifies molecular LEGO (v5.0.1 object)', () => {
    const molecularLego = mockV5_1Data.seeds[1].legos[0]

    expect(isMolecularLego(molecularLego)).toBe(true)
  })

  test('identifies atomic LEGO (v5.0.0 array)', () => {
    const atomicLego = ['S0001L01', 'A', 'Quiero', 'I want']

    expect(isMolecularLego(atomicLego)).toBe(false)
  })

  test('identifies molecular LEGO (v5.0.0 array)', () => {
    const molecularLego = [
      'S0002L01',
      'M',
      'Estoy intentando',
      "I'm trying",
      [
        ['Estoy', 'I am'],
        ['intentando', 'trying']
      ]
    ]

    expect(isMolecularLego(molecularLego)).toBe(true)
  })

  test('handles invalid input', () => {
    expect(isMolecularLego(null)).toBe(false)
    expect(isMolecularLego(undefined)).toBe(false)
    expect(isMolecularLego({})).toBe(false)
  })
})

describe('LEGO Components Extraction', () => {
  test('extracts components from v5.0.1 molecular LEGO', () => {
    const molecularLego = mockV5_1Data.seeds[1].legos[0]
    const components = getLegoComponents(molecularLego)

    expect(components).toHaveLength(2)
    expect(components[0]).toEqual(['Estoy', 'I am'])
    expect(components[1]).toEqual(['intentando', 'trying'])
  })

  test('extracts components from v5.0.0 molecular LEGO', () => {
    const molecularLego = mockV5_0Data.seeds[1][2][0]
    const components = getLegoComponents(molecularLego)

    expect(components).toHaveLength(2)
    expect(components[0]).toEqual(['Estoy', 'I am'])
  })

  test('returns null for atomic LEGO', () => {
    const atomicLego = { id: 'S0001L01', type: 'A', target: 'Quiero', known: 'I want', new: true }
    const components = getLegoComponents(atomicLego)

    expect(components).toBeNull()
  })
})

describe('New/Ref Detection', () => {
  test('identifies new LEGO', () => {
    const newLego = mockV5_1Data.seeds[0].legos[0]

    expect(isNewLego(newLego)).toBe(true)
  })

  test('identifies referenced LEGO', () => {
    const refLego = mockV5_1Data.seeds[1].legos[1]

    expect(isNewLego(refLego)).toBe(false)
  })

  test('gets reference seed ID', () => {
    const refLego = mockV5_1Data.seeds[1].legos[1]

    expect(getLegoReference(refLego)).toBe('S0001')
  })

  test('returns null for new LEGO reference', () => {
    const newLego = mockV5_1Data.seeds[0].legos[0]

    expect(getLegoReference(newLego)).toBeNull()
  })
})

describe('Complete Tiling Validation', () => {
  test('validates complete tiling (all LEGOs present)', () => {
    // S0002 uses "hablar" from S0001 - should be present as referenced LEGO
    const s0002 = mockV5_1Data.seeds[1]

    const hasHablar = s0002.legos.some(lego => lego.target === 'hablar')
    expect(hasHablar).toBe(true)

    const hablarLego = s0002.legos.find(lego => lego.target === 'hablar')
    expect(hablarLego.ref).toBe('S0001')
  })

  test('cumulative count increases correctly', () => {
    expect(mockV5_1Data.seeds[0].cumulative_legos).toBe(2)
    expect(mockV5_1Data.seeds[1].cumulative_legos).toBe(3) // +1 from previous
  })
})

describe('Round-trip Transformations', () => {
  test('v5.0.1 → v5.0.0 → v5.0.1 preserves structure', () => {
    const v5_0 = transformV5_1ToV5_0(mockV5_1Data)
    const v5_1Again = transformV5_0ToV5_1(v5_0)

    expect(v5_1Again.version).toBe('5.0.1')
    expect(v5_1Again.seeds).toHaveLength(mockV5_1Data.seeds.length)
    expect(v5_1Again.seeds[0].seed_id).toBe('S0001')
  })

  test('v7.7 → v5.0.1 → v7.7 preserves basic structure', () => {
    const v5_1 = transformToV5_1(mockV7Data)
    const v7Again = transformV5_1ToV7(v5_1)

    expect(v7Again.version).toBe('7.7')
    expect(v7Again.seeds).toHaveLength(mockV7Data.seeds.length)
    expect(v7Again.seeds[0][0]).toBe('S0001')
  })
})
