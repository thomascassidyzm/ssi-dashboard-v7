#!/usr/bin/env node
/**
 * APML Schema Compiler v2.0
 *
 * A robust compiler that reads APML schema definitions and generates:
 * - PostgreSQL DDL (Supabase migrations)
 * - TypeScript types
 * - Zod validation schemas
 *
 * Aligned with APML 12 Directions:
 * - D01: Output format is parameterized (--target)
 * - D05: Parses raw APML, generates derived artifacts
 * - D08: Explicit error messages with context
 * - D10: Verbose mode shows parsing progress
 *
 * Usage:
 *   node apml-compiler.cjs <input.apml> --target postgresql [--output <file>] [--verbose]
 *   node apml-compiler.cjs <input.apml> --target typescript [--output <file>]
 *   node apml-compiler.cjs <input.apml> --target zod [--output <file>]
 */

const fs = require('fs')
const path = require('path')

// ============================================================================
// APML PARSER
// ============================================================================

class APMLParser {
  constructor(content, options = {}) {
    this.content = content
    this.verbose = options.verbose || false
    this.lines = content.split('\n')
    this.position = 0
  }

  log(msg) {
    if (this.verbose) console.log(`[PARSER] ${msg}`)
  }

  parse() {
    const schema = {
      meta: this.extractMeta(),
      tables: {},
      enums: {}
    }

    // Find schema block
    const schemaStart = this.content.indexOf('schema:')
    if (schemaStart === -1) {
      throw new Error('No schema: block found in APML file')
    }

    // Extract tables
    const tableBlocks = this.extractTableBlocks()
    for (const block of tableBlocks) {
      const table = this.parseTable(block)
      if (table) {
        schema.tables[table.name] = table
        this.log(`Parsed table: ${table.name} (${Object.keys(table.columns).length} columns)`)
      }
    }

    return schema
  }

  extractMeta() {
    const meta = {}

    // Version
    const versionMatch = this.content.match(/Version:\s*(\d+\.\d+\.\d+)/)
    if (versionMatch) meta.version = versionMatch[1]

    // Schema version
    const schemaVersionMatch = this.content.match(/version:\s*"(\d+\.\d+\.\d+)"/)
    if (schemaVersionMatch) meta.schemaVersion = schemaVersionMatch[1]

    // Database
    const databaseMatch = this.content.match(/database:\s*"(\w+)"/)
    if (databaseMatch) meta.database = databaseMatch[1]

    return meta
  }

  extractTableBlocks() {
    const blocks = []
    const tableRegex = /^\s{4}table\s+(\w+):/gm
    let match

    while ((match = tableRegex.exec(this.content)) !== null) {
      const tableName = match[1]
      const startPos = match.index

      // Find the end of this table block (next table or end of schema section)
      let endPos = this.content.length
      const nextTableMatch = this.content.slice(startPos + 1).match(/^\s{4}table\s+\w+:/m)
      if (nextTableMatch) {
        endPos = startPos + 1 + nextTableMatch.index
      }

      // Also check for end of schema block
      const schemaEndMatch = this.content.slice(startPos).match(/^## =/m)
      if (schemaEndMatch && startPos + schemaEndMatch.index < endPos) {
        endPos = startPos + schemaEndMatch.index
      }

      blocks.push({
        name: tableName,
        content: this.content.slice(startPos, endPos)
      })
    }

    return blocks
  }

  parseTable(block) {
    const table = {
      name: block.name,
      description: null,
      columns: {},
      constraints: [],
      indexes: []
    }

    // Extract description
    const descMatch = block.content.match(/description:\s*"([^"]+)"/)
    if (descMatch) table.description = descMatch[1]

    // Extract columns
    const columnsSection = this.extractSection(block.content, 'columns:')
    if (columnsSection) {
      table.columns = this.parseColumns(columnsSection)
    }

    // Extract constraints
    const constraintsSection = this.extractSection(block.content, 'constraints:')
    if (constraintsSection) {
      table.constraints = this.parseConstraints(constraintsSection)
    }

    // Extract indexes
    const indexesSection = this.extractSection(block.content, 'indexes:')
    if (indexesSection) {
      table.indexes = this.parseIndexes(indexesSection)
    }

    return table
  }

  extractSection(content, sectionName) {
    const startRegex = new RegExp(`^\\s+${sectionName}`, 'm')
    const match = content.match(startRegex)
    if (!match) return null

    const startPos = match.index + match[0].length
    const lines = content.slice(startPos).split('\n')

    // Find where section ends (next section at same or lower indent, or end)
    const sectionLines = []
    const baseIndent = this.getIndent(match[0])

    for (const line of lines) {
      if (line.trim() === '') {
        sectionLines.push(line)
        continue
      }

      const indent = this.getIndent(line)
      // If we hit something at same or lower indent that's a section header, stop
      if (indent <= baseIndent && line.trim().endsWith(':') && !line.trim().startsWith('-')) {
        break
      }
      sectionLines.push(line)
    }

    return sectionLines.join('\n')
  }

  getIndent(line) {
    const match = line.match(/^(\s*)/)
    return match ? match[1].length : 0
  }

  parseColumns(content) {
    const columns = {}
    const lines = content.split('\n')

    let currentColumn = null
    let columnContent = []

    for (const line of lines) {
      // New column definition (8-space indent + name + colon)
      const columnMatch = line.match(/^(\s{8})(\w+):$/)
      if (columnMatch) {
        // Save previous column
        if (currentColumn) {
          columns[currentColumn] = this.parseColumnContent(currentColumn, columnContent.join('\n'))
        }
        currentColumn = columnMatch[2]
        columnContent = []
        continue
      }

      // Column property (10+ space indent)
      if (currentColumn && line.match(/^\s{10}/)) {
        columnContent.push(line)
      }
    }

    // Save last column
    if (currentColumn) {
      columns[currentColumn] = this.parseColumnContent(currentColumn, columnContent.join('\n'))
    }

    return columns
  }

  parseColumnContent(name, content) {
    const col = { name }

    // Type
    const typeMatch = content.match(/type:\s*"([^"]+)"/)
    if (typeMatch) col.type = typeMatch[1]

    // Nullable
    const nullableMatch = content.match(/nullable:\s*(true|false)/)
    col.nullable = nullableMatch ? nullableMatch[1] === 'true' : true

    // Primary key
    const pkMatch = content.match(/primary_key:\s*(true|false)/)
    col.primaryKey = pkMatch && pkMatch[1] === 'true'

    // Default
    const defaultMatch = content.match(/default:\s*"([^"]+)"/)
    if (defaultMatch) col.default = defaultMatch[1]

    // Unique
    const uniqueMatch = content.match(/unique:\s*(true|false)/)
    col.unique = uniqueMatch && uniqueMatch[1] === 'true'

    // References
    const refMatch = content.match(/references:\s*"([^"]+)"/)
    if (refMatch) col.references = refMatch[1]

    // On delete
    const onDeleteMatch = content.match(/on_delete:\s*"([^"]+)"/)
    if (onDeleteMatch) col.onDelete = onDeleteMatch[1]

    // Generated
    const generatedMatch = content.match(/generated:\s*"([^"]+)"/)
    if (generatedMatch) col.generated = generatedMatch[1]

    // Stored
    const storedMatch = content.match(/stored:\s*(true|false)/)
    col.stored = storedMatch && storedMatch[1] === 'true'

    // Values (enum-like)
    const valuesMatch = content.match(/values:\s*\[([^\]]+)\]/)
    if (valuesMatch) {
      col.values = valuesMatch[1].split(',').map(v => v.trim().replace(/"/g, ''))
    }

    // Description
    const descMatch = content.match(/description:\s*"([^"]+)"/)
    if (descMatch) col.description = descMatch[1]

    return col
  }

  parseConstraints(content) {
    const constraints = []
    const lines = content.split('\n')

    let currentConstraint = null
    let constraintContent = []

    for (const line of lines) {
      const constraintMatch = line.match(/^(\s{8})(\w+):$/)
      if (constraintMatch) {
        if (currentConstraint) {
          constraints.push(this.parseConstraintContent(currentConstraint, constraintContent.join('\n')))
        }
        currentConstraint = constraintMatch[2]
        constraintContent = []
        continue
      }

      if (currentConstraint && line.match(/^\s{10}/)) {
        constraintContent.push(line)
      }
    }

    if (currentConstraint) {
      constraints.push(this.parseConstraintContent(currentConstraint, constraintContent.join('\n')))
    }

    return constraints
  }

  parseConstraintContent(name, content) {
    const constraint = { name }

    const typeMatch = content.match(/type:\s*"([^"]+)"/)
    constraint.type = typeMatch ? typeMatch[1] : 'UNIQUE'

    const columnsMatch = content.match(/columns:\s*\[([^\]]+)\]/)
    if (columnsMatch) {
      constraint.columns = columnsMatch[1].split(',').map(c => c.trim().replace(/"/g, ''))
    } else {
      constraint.columns = []
    }

    return constraint
  }

  parseIndexes(content) {
    const indexes = []
    const lines = content.split('\n')

    let currentIndex = null
    let indexContent = []

    for (const line of lines) {
      const indexMatch = line.match(/^(\s{8})(\w+):$/)
      if (indexMatch) {
        if (currentIndex) {
          indexes.push(this.parseIndexContent(currentIndex, indexContent.join('\n')))
        }
        currentIndex = indexMatch[2]
        indexContent = []
        continue
      }

      if (currentIndex && line.match(/^\s{10}/)) {
        indexContent.push(line)
      }
    }

    if (currentIndex) {
      indexes.push(this.parseIndexContent(currentIndex, indexContent.join('\n')))
    }

    return indexes
  }

  parseIndexContent(name, content) {
    const index = { name }

    const columnsMatch = content.match(/columns:\s*\[([^\]]+)\]/)
    if (columnsMatch) {
      index.columns = columnsMatch[1].split(',').map(c => c.trim().replace(/"/g, ''))
    } else {
      index.columns = []
    }

    return index
  }
}

// ============================================================================
// CODE GENERATORS
// ============================================================================

class PostgreSQLGenerator {
  constructor(schema, options = {}) {
    this.schema = schema
    this.options = options
  }

  generate() {
    const lines = []
    const timestamp = new Date().toISOString()

    lines.push(`-- ============================================================================`)
    lines.push(`-- APML Compiled Schema`)
    lines.push(`-- Version: ${this.schema.meta.schemaVersion || 'unknown'}`)
    lines.push(`-- Generated: ${timestamp}`)
    lines.push(`-- Compiler: apml-compiler.cjs v2.0`)
    lines.push(`-- ============================================================================`)
    lines.push('')
    lines.push(`-- Enable UUID extension`)
    lines.push(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`)
    lines.push('')

    for (const [tableName, table] of Object.entries(this.schema.tables)) {
      lines.push(...this.generateTable(table))
      lines.push('')
    }

    return lines.join('\n')
  }

  generateTable(table) {
    const lines = []

    lines.push(`-- ----------------------------------------------------------------------------`)
    lines.push(`-- Table: ${table.name}`)
    if (table.description) {
      lines.push(`-- ${table.description}`)
    }
    lines.push(`-- ----------------------------------------------------------------------------`)
    lines.push('')

    const columnDefs = []
    const tableLevelConstraints = []

    // Generate columns
    for (const [colName, col] of Object.entries(table.columns)) {
      columnDefs.push(this.generateColumn(col))

      // Collect primary key
      if (col.primaryKey) {
        tableLevelConstraints.push(`  PRIMARY KEY (${colName})`)
      }

      // Collect foreign keys
      if (col.references) {
        const onDelete = col.onDelete ? ` ON DELETE ${col.onDelete}` : ''
        tableLevelConstraints.push(`  FOREIGN KEY (${colName}) REFERENCES ${col.references}${onDelete}`)
      }
    }

    // Add explicit constraints
    for (const constraint of table.constraints) {
      if (constraint.type === 'UNIQUE' && constraint.columns.length > 0) {
        tableLevelConstraints.push(`  CONSTRAINT ${constraint.name} UNIQUE (${constraint.columns.join(', ')})`)
      }
    }

    lines.push(`CREATE TABLE IF NOT EXISTS ${table.name} (`)
    lines.push([...columnDefs, ...tableLevelConstraints].join(',\n'))
    lines.push(`);`)

    // Generate indexes
    for (const index of table.indexes) {
      if (index.columns.length > 0) {
        lines.push(`CREATE INDEX IF NOT EXISTS ${index.name} ON ${table.name} (${index.columns.join(', ')});`)
      }
    }

    // Add table comment
    if (table.description) {
      lines.push(`COMMENT ON TABLE ${table.name} IS '${table.description.replace(/'/g, "''")}';`)
    }

    return lines
  }

  generateColumn(col) {
    const parts = [`  ${col.name}`]

    // Type
    parts.push(this.mapType(col.type))

    // Generated column
    if (col.generated) {
      return `  ${col.name} ${this.mapType(col.type)} GENERATED ALWAYS AS (${col.generated}) STORED`
    }

    // NOT NULL
    if (!col.nullable && !col.primaryKey) {
      parts.push('NOT NULL')
    }

    // DEFAULT
    if (col.default) {
      parts.push(`DEFAULT ${col.default}`)
    }

    // UNIQUE (column-level)
    if (col.unique) {
      parts.push('UNIQUE')
    }

    return parts.join(' ')
  }

  mapType(apmlType) {
    const typeMap = {
      'UUID': 'UUID',
      'TEXT': 'TEXT',
      'TEXT[]': 'TEXT[]',
      'INTEGER': 'INTEGER',
      'BOOLEAN': 'BOOLEAN',
      'TIMESTAMPTZ': 'TIMESTAMPTZ',
      'JSONB': 'JSONB'
    }
    return typeMap[apmlType] || 'TEXT'
  }
}

class TypeScriptGenerator {
  constructor(schema, options = {}) {
    this.schema = schema
    this.options = options
  }

  generate() {
    const lines = []
    const timestamp = new Date().toISOString()

    lines.push(`// ============================================================================`)
    lines.push(`// APML Compiled TypeScript Types`)
    lines.push(`// Version: ${this.schema.meta.schemaVersion || 'unknown'}`)
    lines.push(`// Generated: ${timestamp}`)
    lines.push(`// Compiler: apml-compiler.cjs v2.0`)
    lines.push(`// ============================================================================`)
    lines.push('')

    for (const [tableName, table] of Object.entries(this.schema.tables)) {
      lines.push(...this.generateInterface(table))
      lines.push('')
      lines.push(...this.generateInsertType(table))
      lines.push('')
    }

    return lines.join('\n')
  }

  generateInterface(table) {
    const lines = []
    const interfaceName = this.toPascalCase(table.name)

    if (table.description) {
      lines.push(`/** ${table.description} */`)
    }
    lines.push(`export interface ${interfaceName} {`)

    for (const [colName, col] of Object.entries(table.columns)) {
      const tsType = this.mapType(col)
      const optional = col.nullable && !col.primaryKey ? '?' : ''

      if (col.description) {
        lines.push(`  /** ${col.description} */`)
      }
      lines.push(`  ${colName}${optional}: ${tsType};`)
    }

    lines.push('}')
    return lines
  }

  generateInsertType(table) {
    const lines = []
    const typeName = `${this.toPascalCase(table.name)}Insert`

    lines.push(`/** Insert type for ${table.name} (omits auto-generated fields) */`)
    lines.push(`export interface ${typeName} {`)

    for (const [colName, col] of Object.entries(table.columns)) {
      // Skip auto-generated fields
      if (col.primaryKey && col.default) continue
      if (col.generated) continue
      if (col.default === 'NOW()') continue

      const tsType = this.mapType(col)
      const optional = col.nullable || col.default ? '?' : ''

      lines.push(`  ${colName}${optional}: ${tsType};`)
    }

    lines.push('}')
    return lines
  }

  mapType(col) {
    const typeMap = {
      'UUID': 'string',
      'TEXT': 'string',
      'TEXT[]': 'string[]',
      'INTEGER': 'number',
      'BOOLEAN': 'boolean',
      'TIMESTAMPTZ': 'string',
      'JSONB': 'Record<string, unknown>'
    }

    let tsType = typeMap[col.type] || 'string'

    // Handle enum-like values
    if (col.values && col.values.length > 0) {
      tsType = col.values.map(v => `'${v}'`).join(' | ')
    }

    return tsType
  }

  toPascalCase(str) {
    return str.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  }
}

class ZodGenerator {
  constructor(schema, options = {}) {
    this.schema = schema
    this.options = options
  }

  generate() {
    const lines = []
    const timestamp = new Date().toISOString()

    lines.push(`// ============================================================================`)
    lines.push(`// APML Compiled Zod Schemas`)
    lines.push(`// Version: ${this.schema.meta.schemaVersion || 'unknown'}`)
    lines.push(`// Generated: ${timestamp}`)
    lines.push(`// Compiler: apml-compiler.cjs v2.0`)
    lines.push(`// ============================================================================`)
    lines.push('')
    lines.push(`import { z } from 'zod';`)
    lines.push('')

    for (const [tableName, table] of Object.entries(this.schema.tables)) {
      lines.push(...this.generateSchema(table))
      lines.push('')
    }

    return lines.join('\n')
  }

  generateSchema(table) {
    const lines = []
    const schemaName = `${this.toCamelCase(table.name)}Schema`

    if (table.description) {
      lines.push(`/** ${table.description} */`)
    }
    lines.push(`export const ${schemaName} = z.object({`)

    for (const [colName, col] of Object.entries(table.columns)) {
      const zodType = this.mapType(col)
      lines.push(`  ${colName}: ${zodType},`)
    }

    lines.push(`});`)
    lines.push('')
    lines.push(`export type ${this.toPascalCase(table.name)} = z.infer<typeof ${schemaName}>;`)

    return lines
  }

  mapType(col) {
    let base

    // Handle enum-like values first
    if (col.values && col.values.length > 0) {
      base = `z.enum([${col.values.map(v => `'${v}'`).join(', ')}])`
    } else {
      const typeMap = {
        'UUID': 'z.string().uuid()',
        'TEXT': 'z.string()',
        'TEXT[]': 'z.array(z.string())',
        'INTEGER': 'z.number().int()',
        'BOOLEAN': 'z.boolean()',
        'TIMESTAMPTZ': 'z.string().datetime()',
        'JSONB': 'z.record(z.unknown())'
      }
      base = typeMap[col.type] || 'z.string()'
    }

    // Handle nullable
    if (col.nullable) {
      base = `${base}.nullable()`
    }

    // Handle optional (has default or nullable)
    if (col.default || col.nullable) {
      base = `${base}.optional()`
    }

    return base
  }

  toPascalCase(str) {
    return str.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  }

  toCamelCase(str) {
    const pascal = this.toPascalCase(str)
    return pascal.charAt(0).toLowerCase() + pascal.slice(1)
  }
}

// ============================================================================
// CLI
// ============================================================================

function main() {
  const args = process.argv.slice(2)

  if (args.length < 1 || args.includes('--help')) {
    console.log(`
APML Schema Compiler v2.0

Usage:
  node apml-compiler.cjs <input.apml> --target <postgresql|typescript|zod> [options]

Options:
  --target <type>    Output format: postgresql, typescript, or zod
  --output <file>    Output file path (defaults to input with new extension)
  --verbose          Show parsing progress

Examples:
  node apml-compiler.cjs audio-registry-v12.apml --target postgresql
  node apml-compiler.cjs audio-registry-v12.apml --target typescript --output types.ts
  node apml-compiler.cjs audio-registry-v12.apml --target zod --verbose
`)
    process.exit(0)
  }

  // Parse arguments
  const inputFile = path.resolve(process.cwd(), args[0])
  const targetIndex = args.indexOf('--target')
  const target = targetIndex >= 0 ? args[targetIndex + 1] : 'postgresql'
  const outputIndex = args.indexOf('--output')
  const verbose = args.includes('--verbose')

  // Validate input
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: File not found: ${inputFile}`)
    process.exit(1)
  }

  if (!['postgresql', 'typescript', 'zod'].includes(target)) {
    console.error(`Error: Unknown target: ${target}. Use postgresql, typescript, or zod.`)
    process.exit(1)
  }

  // Parse APML
  console.log(`Parsing: ${path.basename(inputFile)}`)
  const content = fs.readFileSync(inputFile, 'utf-8')

  const parser = new APMLParser(content, { verbose })
  const schema = parser.parse()

  console.log(`Found ${Object.keys(schema.tables).length} tables`)

  // Generate output
  let generator
  let extension

  switch (target) {
    case 'postgresql':
      generator = new PostgreSQLGenerator(schema, { verbose })
      extension = '.sql'
      break
    case 'typescript':
      generator = new TypeScriptGenerator(schema, { verbose })
      extension = '.ts'
      break
    case 'zod':
      generator = new ZodGenerator(schema, { verbose })
      extension = '.zod.ts'
      break
  }

  const output = generator.generate()

  // Determine output file
  let outputFile
  if (outputIndex >= 0) {
    outputFile = path.resolve(process.cwd(), args[outputIndex + 1])
  } else {
    outputFile = inputFile.replace('.apml', extension)
  }

  // Write output
  fs.writeFileSync(outputFile, output)
  console.log(`Generated: ${outputFile}`)
}

main()
