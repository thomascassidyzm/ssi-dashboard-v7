import { describe, test, expect } from 'vitest'
import {
  detectVersion,
  transformToV5,
  transformToV7,
  validateV5Format,
  validateV7Format,
  getNormalizedFormat,
  extractLegoSummary,
  extractPatternSummary,
  isMolecularLego,
  getLegoComponents
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
  ],
  pattern_data: {
    S0001: {
      P01: {
        structure: 'Quiero + infinitive',
        introduced: 'S0001'
      }
    }
  }
}

const mockV5Data = {
  version: '5.0',
  methodology: 'Known Language First Mapping',
  terminology: 'Atomic (A) / Molecular (M)',
  course: 'spa_for_eng',
  target_language: 'spa',
  known_language: 'eng',
  extracted_date: '2025-01-06',
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
  ],
  pattern_summary: {
    P01: {
      introduced: 'S0001',
      structure: 'Quiero + infinitive',
      instances: ['S0001']
    }
  },
  lego_summary: {
    total_legos: 3,
    atomic: 2,
    molecular: 1
  }
}

const mockS0011V5 = {
  version: '5.0',
  methodology: 'Known Language First Mapping',
  terminology: 'Atomic (A) / Molecular (M)',
  course: 'spa_for_eng',
  target_language: 'spa',
  known_language: 'eng',
  extracted_date: '2025-01-06',
  seeds: [
    [
      'S0011',
      [
        'Me gustaría poder hablar después de que termines.',
        "I'd like to be able to speak after you finish."
      ],
      [
        [
          'S0011L01',
          'M',
          'Me gustaría',
          "I'd like",
          [
            ['Me', 'me/to me'],
            ['gustaría', 'would please']
          ]
        ],
        ['S0011L02', 'A', 'poder', 'to be able to'],
        [
          'S0011L03',
          'M',
          'después de que termines',
          'after you finish',
          [
            ['después de que', 'after that'],
            ['termines', 'you finish (subj)']
          ]
        ]
      ]
    ]
  ],
  pattern_summary: {
    P04: {
      introduced: 'S0011',
      structure: 'Me gustaría + infinitive',
      instances: ['S0011']
    },
    P10: {
      introduced: 'S0011',
      structure: 'después de que + subjunctive',
      instances: ['S0011']
    }
  },
  lego_summary: {
    total_legos: 3,
    atomic: 1,
    molecular: 2
  }
}

// Tests

describe('Format Detection', () => {
  test('detects v5.0 format by version field', () => {
    expect(detectVersion(mockV5Data)).toBe('5.0')
  })

  test('detects v5.0 format by methodology field', () => {
    const data = { ...mockV5Data }
    delete data.version
    expect(detectVersion(data)).toBe('5.0')
  })

  test('detects v5.0 format by seed pair structure (array)', () => {
    const data = {
      seeds: [
        ['S0001', ['Quiero hablar.', 'I want to speak.'], []]
      ]
    }
    expect(detectVersion(data)).toBe('5.0')
  })

  test('detects v7.7 format by version field', () => {
    expect(detectVersion(mockV7Data)).toBe('7.7')
  })

  test('detects v7.7 format by seed pair structure (object)', () => {
    const data = {
      seeds: [
        ['S0001', { target: 'Quiero hablar.', known: 'I want to speak.' }, []]
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

describe('Format Transformation: v7.7 → v5.0', () => {
  test('transforms basic structure correctly', () => {
    const result = transformToV5(mockV7Data)

    expect(result.version).toBe('5.0')
    expect(result.methodology).toBe('Known Language First Mapping')
    expect(result.terminology).toBe('Atomic (A) / Molecular (M)')
    expect(result.seeds).toHaveLength(2)
  })

  test('transforms seed pair from object to array', () => {
    const result = transformToV5(mockV7Data)
    const firstSeed = result.seeds[0]

    expect(Array.isArray(firstSeed[1])).toBe(true)
    expect(firstSeed[1]).toEqual(['Quiero hablar.', 'I want to speak.'])
  })

  test('transforms LEGO types: A stays A', () => {
    const result = transformToV5(mockV7Data)
    const firstSeed = result.seeds[0]
    const firstLego = firstSeed[2][0]

    expect(firstLego[1]).toBe('A')
  })

  test('transforms LEGO types: C → M', () => {
    const result = transformToV5(mockV7Data)
    const secondSeed = result.seeds[1]
    const molecularLego = secondSeed[2][0]

    expect(molecularLego[0]).toBe('S0002L01')
    expect(molecularLego[1]).toBe('M')
    expect(molecularLego[2]).toBe('Estoy intentando')
  })

  test('adds componentization array to molecular LEGOs', () => {
    const result = transformToV5(mockV7Data)
    const secondSeed = result.seeds[1]
    const molecularLego = secondSeed[2][0]

    expect(molecularLego.length).toBeGreaterThanOrEqual(5)
    expect(Array.isArray(molecularLego[4])).toBe(true)
  })

  test('calculates lego_summary correctly', () => {
    const result = transformToV5(mockV7Data)

    expect(result.lego_summary.total_legos).toBe(4)
    expect(result.lego_summary.atomic).toBe(3)
    expect(result.lego_summary.molecular).toBe(1)
  })

  test('preserves pattern data as pattern_summary', () => {
    const result = transformToV5(mockV7Data)

    expect(result.pattern_summary).toBeDefined()
    expect(result.pattern_summary.P01).toBeDefined()
    expect(result.pattern_summary.P01.introduced).toBe('S0001')
  })

  test('throws error for invalid data', () => {
    expect(() => transformToV5(null)).toThrow()
    expect(() => transformToV5({})).toThrow()
  })
})

describe('Format Transformation: v5.0 → v7.7', () => {
  test('transforms basic structure correctly', () => {
    const result = transformToV7(mockV5Data)

    expect(result.version).toBe('7.7')
    expect(result.seeds).toHaveLength(2)
  })

  test('transforms seed pair from array to object', () => {
    const result = transformToV7(mockV5Data)
    const firstSeed = result.seeds[0]

    expect(typeof firstSeed[1]).toBe('object')
    expect(Array.isArray(firstSeed[1])).toBe(false)
    expect(firstSeed[1]).toEqual({
      target: 'Quiero hablar.',
      known: 'I want to speak.'
    })
  })

  test('transforms LEGO types: A stays A', () => {
    const result = transformToV7(mockV5Data)
    const firstSeed = result.seeds[0]
    const firstLego = firstSeed[2][0]

    expect(firstLego[1]).toBe('A')
  })

  test('transforms LEGO types: M → C', () => {
    const result = transformToV7(mockV5Data)
    const secondSeed = result.seeds[1]
    const complexLego = secondSeed[2][0]

    expect(complexLego[0]).toBe('S0002L01')
    expect(complexLego[1]).toBe('C')
    expect(complexLego[2]).toBe('Estoy intentando')
  })

  test('removes componentization array', () => {
    const result = transformToV7(mockV5Data)
    const secondSeed = result.seeds[1]
    const complexLego = secondSeed[2][0]

    expect(complexLego.length).toBe(4) // [id, type, target, known]
  })

  test('transforms pattern_summary to pattern_data', () => {
    const result = transformToV7(mockV5Data)

    expect(result.pattern_data).toBeDefined()
    expect(result.pattern_data.S0001).toBeDefined()
    expect(result.pattern_data.S0001.P01).toBeDefined()
  })

  test('throws error for invalid data', () => {
    expect(() => transformToV7(null)).toThrow()
    expect(() => transformToV7({})).toThrow()
  })
})

describe('Format Validation: v5.0', () => {
  test('validates correct v5.0 format', () => {
    const result = validateV5Format(mockV5Data)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('validates S0011 molecular LEGO format', () => {
    const result = validateV5Format(mockS0011V5)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('detects missing version field', () => {
    const invalid = { ...mockV5Data }
    delete invalid.version

    const result = validateV5Format(invalid)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('version'))).toBe(true)
  })

  test('detects invalid seed pair format (should be array)', () => {
    const invalid = {
      version: '5.0',
      seeds: [
        ['S0001', { target: 'Quiero', known: 'I want' }, []]
      ]
    }

    const result = validateV5Format(invalid)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('seed_pair'))).toBe(true)
  })

  test('detects invalid LEGO type (not A or M)', () => {
    const invalid = {
      version: '5.0',
      seeds: [
        [
          'S0001',
          ['Quiero', 'I want'],
          [['S0001L01', 'C', 'Quiero', 'I want']]
        ]
      ]
    }

    const result = validateV5Format(invalid)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Invalid type'))).toBe(true)
  })

  test('detects missing componentization for molecular LEGO', () => {
    const invalid = {
      version: '5.0',
      seeds: [
        [
          'S0001',
          ['Quiero hablar', 'I want to speak'],
          [['S0001L01', 'M', 'Quiero hablar', 'I want to speak']] // Missing components!
        ]
      ]
    }

    const result = validateV5Format(invalid)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('componentization'))).toBe(true)
  })

  test('detects invalid componentization structure', () => {
    const invalid = {
      version: '5.0',
      seeds: [
        [
          'S0001',
          ['Quiero hablar', 'I want to speak'],
          [
            [
              'S0001L01',
              'M',
              'Quiero hablar',
              'I want to speak',
              ['invalid'] // Should be [[word, translation]]
            ]
          ]
        ]
      ]
    }

    const result = validateV5Format(invalid)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('component'))).toBe(true)
  })

  test('validates null data', () => {
    const result = validateV5Format(null)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Data is null or undefined')
  })
})

describe('Format Validation: v7.7', () => {
  test('validates correct v7.7 format', () => {
    const result = validateV7Format(mockV7Data)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('detects invalid seed pair format (should be object)', () => {
    const invalid = {
      seeds: [
        ['S0001', ['Quiero', 'I want'], []]
      ]
    }

    const result = validateV7Format(invalid)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('seed_pair'))).toBe(true)
  })

  test('detects missing target or known in seed pair', () => {
    const invalid = {
      seeds: [
        ['S0001', { target: 'Quiero' }, []] // Missing 'known'
      ]
    }

    const result = validateV7Format(invalid)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('missing target or known'))).toBe(true)
  })

  test('detects invalid LEGO type (not A/B/C/D)', () => {
    const invalid = {
      seeds: [
        [
          'S0001',
          { target: 'Quiero', known: 'I want' },
          [['S0001L01', 'M', 'Quiero', 'I want']] // M is not valid in v7.7
        ]
      ]
    }

    const result = validateV7Format(invalid)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Invalid type'))).toBe(true)
  })

  test('validates null data', () => {
    const result = validateV7Format(null)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Data is null or undefined')
  })
})

describe('Normalized Format', () => {
  test('returns v5.0 data unchanged', () => {
    const result = getNormalizedFormat(mockV5Data)

    expect(result.version).toBe('5.0')
    expect(result).toEqual(mockV5Data)
  })

  test('transforms v7.7 to v5.0', () => {
    const result = getNormalizedFormat(mockV7Data)

    expect(result.version).toBe('5.0')
    expect(result.methodology).toBe('Known Language First Mapping')
  })

  test('throws error for unknown format', () => {
    expect(() => getNormalizedFormat({})).toThrow('unknown format')
  })
})

describe('LEGO Summary Extraction', () => {
  test('extracts summary from v5.0 data', () => {
    const summary = extractLegoSummary(mockV5Data)

    expect(summary.total_legos).toBe(3)
    expect(summary.atomic).toBe(2)
    expect(summary.molecular).toBe(1)
    expect(summary.seeds).toBe(2)
  })

  test('extracts summary from v7.7 data', () => {
    const summary = extractLegoSummary(mockV7Data)

    expect(summary.total_legos).toBe(4)
    expect(summary.atomic).toBe(3)
    expect(summary.molecular).toBe(1)
    expect(summary.seeds).toBe(2)
  })

  test('calculates summary when not present', () => {
    const dataWithoutSummary = { ...mockV5Data }
    delete dataWithoutSummary.lego_summary

    const summary = extractLegoSummary(dataWithoutSummary)

    expect(summary.total_legos).toBe(4)
    expect(summary.atomic).toBe(3)
    expect(summary.molecular).toBe(1)
  })
})

describe('Pattern Summary Extraction', () => {
  test('extracts pattern summary from v5.0 data', () => {
    const patterns = extractPatternSummary(mockV5Data)

    expect(patterns.P01).toBeDefined()
    expect(patterns.P01.structure).toBe('Quiero + infinitive')
    expect(patterns.P01.introduced).toBe('S0001')
  })

  test('extracts pattern summary from v7.7 data', () => {
    const patterns = extractPatternSummary(mockV7Data)

    expect(patterns.P01).toBeDefined()
  })

  test('returns empty object when no patterns', () => {
    const dataWithoutPatterns = { ...mockV5Data }
    delete dataWithoutPatterns.pattern_summary

    const patterns = extractPatternSummary(dataWithoutPatterns)

    expect(patterns).toEqual({})
  })
})

describe('Molecular LEGO Detection', () => {
  test('identifies atomic LEGO', () => {
    const atomicLego = ['S0001L01', 'A', 'Quiero', 'I want']

    expect(isMolecularLego(atomicLego)).toBe(false)
  })

  test('identifies molecular LEGO by type M', () => {
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

  test('identifies molecular LEGO by components presence', () => {
    const molecularLego = [
      'S0002L01',
      'C',
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
    expect(isMolecularLego([])).toBe(false)
    expect(isMolecularLego(['S0001L01'])).toBe(false)
  })
})

describe('LEGO Components Extraction', () => {
  test('extracts components from molecular LEGO', () => {
    const molecularLego = [
      'S0011L01',
      'M',
      'Me gustaría',
      "I'd like",
      [
        ['Me', 'me/to me'],
        ['gustaría', 'would please']
      ]
    ]

    const components = getLegoComponents(molecularLego)

    expect(components).toHaveLength(2)
    expect(components[0]).toEqual(['Me', 'me/to me'])
    expect(components[1]).toEqual(['gustaría', 'would please'])
  })

  test('returns null for atomic LEGO', () => {
    const atomicLego = ['S0001L01', 'A', 'Quiero', 'I want']

    const components = getLegoComponents(atomicLego)

    expect(components).toBeNull()
  })

  test('returns empty array for molecular LEGO without components', () => {
    const molecularLego = ['S0002L01', 'M', 'Estoy intentando', "I'm trying"]

    const components = getLegoComponents(molecularLego)

    expect(components).toEqual([])
  })
})

describe('Round-trip Transformation', () => {
  test('v7.7 → v5.0 → v7.7 preserves basic structure', () => {
    const v5 = transformToV5(mockV7Data)
    const v7Again = transformToV7(v5)

    expect(v7Again.version).toBe('7.7')
    expect(v7Again.seeds).toHaveLength(mockV7Data.seeds.length)

    // Check seed pairs
    expect(v7Again.seeds[0][1]).toEqual(mockV7Data.seeds[0][1])

    // Check LEGO IDs and content
    expect(v7Again.seeds[0][2][0][0]).toBe('S0001L01')
    expect(v7Again.seeds[0][2][0][2]).toBe('Quiero')
  })

  test('v5.0 → v7.7 → v5.0 preserves basic structure', () => {
    const v7 = transformToV7(mockV5Data)
    const v5Again = transformToV5(v7)

    expect(v5Again.version).toBe('5.0')
    expect(v5Again.seeds).toHaveLength(mockV5Data.seeds.length)

    // Check seed pairs
    expect(v5Again.seeds[0][1]).toEqual(mockV5Data.seeds[0][1])

    // Check LEGO IDs and content
    expect(v5Again.seeds[0][2][0][0]).toBe('S0001L01')
    expect(v5Again.seeds[0][2][0][2]).toBe('Quiero')
  })
})

describe('Real-world Example: S0011', () => {
  test('validates S0011 v5.0 format', () => {
    const result = validateV5Format(mockS0011V5)

    expect(result.valid).toBe(true)
  })

  test('identifies molecular LEGOs in S0011', () => {
    const legos = mockS0011V5.seeds[0][2]

    expect(isMolecularLego(legos[0])).toBe(true) // Me gustaría
    expect(isMolecularLego(legos[1])).toBe(false) // poder (atomic)
    expect(isMolecularLego(legos[2])).toBe(true) // después de que termines
  })

  test('extracts components from S0011 molecular LEGOs', () => {
    const legos = mockS0011V5.seeds[0][2]

    const l01Components = getLegoComponents(legos[0])
    expect(l01Components).toHaveLength(2)
    expect(l01Components[0]).toEqual(['Me', 'me/to me'])

    const l03Components = getLegoComponents(legos[2])
    expect(l03Components).toHaveLength(2)
    expect(l03Components[0]).toEqual(['después de que', 'after that'])
  })

  test('extracts correct pattern summary from S0011', () => {
    const patterns = extractPatternSummary(mockS0011V5)

    expect(patterns.P04).toBeDefined()
    expect(patterns.P04.structure).toBe('Me gustaría + infinitive')

    expect(patterns.P10).toBeDefined()
    expect(patterns.P10.structure).toBe('después de que + subjunctive')
  })

  test('extracts correct LEGO summary from S0011', () => {
    const summary = extractLegoSummary(mockS0011V5)

    expect(summary.total_legos).toBe(3)
    expect(summary.atomic).toBe(1)
    expect(summary.molecular).toBe(2)
  })
})
