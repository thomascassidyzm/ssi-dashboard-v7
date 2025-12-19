#!/usr/bin/env node
/**
 * APML Schema Compiler
 *
 * Reads APML schema definitions and generates:
 * - PostgreSQL DDL (CREATE TABLE, indexes, constraints)
 * - TypeScript types
 *
 * Usage:
 *   node compile-schema.cjs ../core/audio-registry-v12.apml --target postgresql
 *   node compile-schema.cjs ../core/audio-registry-v12.apml --target typescript
 */

const fs = require('fs')
const path = require('path')

// Simple APML parser for schema blocks
function parseAPMLSchema(content) {
  const schema = {
    version: null,
    tables: {}
  }

  // Extract version
  const versionMatch = content.match(/version:\s*"([^"]+)"/)
  if (versionMatch) schema.version = versionMatch[1]

  // Extract table definitions
  const tableRegex = /table\s+(\w+):\s*\n([\s\S]*?)(?=\n\s*table\s+|\n\s*##|$)/g
  let match

  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1]
    const tableContent = match[2]
    schema.tables[tableName] = parseTable(tableName, tableContent)
  }

  return schema
}

function parseTable(name, content) {
  const table = {
    name,
    description: null,
    columns: {},
    constraints: {},
    indexes: {}
  }

  // Extract description
  const descMatch = content.match(/description:\s*"([^"]+)"/)
  if (descMatch) table.description = descMatch[1]

  // Extract columns section
  const columnsMatch = content.match(/columns:\s*\n([\s\S]*?)(?=\n\s*constraints:|$)/i)
  if (columnsMatch) {
    table.columns = parseColumns(columnsMatch[1])
  }

  // Extract constraints section
  const constraintsMatch = content.match(/constraints:\s*\n([\s\S]*?)(?=\n\s*indexes:|$)/i)
  if (constraintsMatch) {
    table.constraints = parseConstraints(constraintsMatch[1])
  }

  // Extract indexes section
  const indexesMatch = content.match(/indexes:\s*\n([\s\S]*?)$/i)
  if (indexesMatch) {
    table.indexes = parseIndexes(indexesMatch[1])
  }

  return table
}

function parseColumns(content) {
  const columns = {}
  const columnRegex = /(\w+):\s*\n([\s\S]*?)(?=\n\s+\w+:|$)/g
  let match

  while ((match = columnRegex.exec(content)) !== null) {
    const colName = match[1]
    const colContent = match[2]
    columns[colName] = parseColumn(colName, colContent)
  }

  return columns
}

function parseColumn(name, content) {
  const col = { name }

  // Type
  const typeMatch = content.match(/type:\s*"([^"]+)"/)
  if (typeMatch) col.type = typeMatch[1]

  // Nullable
  const nullableMatch = content.match(/nullable:\s*(true|false)/)
  col.nullable = nullableMatch ? nullableMatch[1] === 'true' : true

  // Primary key
  const pkMatch = content.match(/primary_key:\s*(true|false)/)
  col.primaryKey = pkMatch ? pkMatch[1] === 'true' : false

  // Default
  const defaultMatch = content.match(/default:\s*"([^"]+)"/)
  if (defaultMatch) col.default = defaultMatch[1]

  // Unique
  const uniqueMatch = content.match(/unique:\s*(true|false)/)
  col.unique = uniqueMatch ? uniqueMatch[1] === 'true' : false

  // References (foreign key)
  const referencesMatch = content.match(/references:\s*"([^"]+)"/)
  if (referencesMatch) col.references = referencesMatch[1]

  // On delete
  const onDeleteMatch = content.match(/on_delete:\s*"([^"]+)"/)
  if (onDeleteMatch) col.onDelete = onDeleteMatch[1]

  // Generated column
  const generatedMatch = content.match(/generated:\s*"([^"]+)"/)
  if (generatedMatch) col.generated = generatedMatch[1]

  // Stored (for generated columns)
  const storedMatch = content.match(/stored:\s*(true|false)/)
  col.stored = storedMatch ? storedMatch[1] === 'true' : false

  // Values (enum-like constraints)
  const valuesMatch = content.match(/values:\s*\[(.*?)\]/)
  if (valuesMatch) {
    col.values = valuesMatch[1].split(',').map(v => v.trim().replace(/"/g, ''))
  }

  return col
}

function parseConstraints(content) {
  const constraints = {}
  const constraintRegex = /(\w+):\s*\n([\s\S]*?)(?=\n\s+\w+:|$)/g
  let match

  while ((match = constraintRegex.exec(content)) !== null) {
    const name = match[1]
    const constraintContent = match[2]

    const typeMatch = constraintContent.match(/type:\s*"([^"]+)"/)
    const columnsMatch = constraintContent.match(/columns:\s*\[(.*?)\]/)

    constraints[name] = {
      type: typeMatch ? typeMatch[1] : 'UNIQUE',
      columns: columnsMatch
        ? columnsMatch[1].split(',').map(c => c.trim().replace(/"/g, ''))
        : []
    }
  }

  return constraints
}

function parseIndexes(content) {
  const indexes = {}
  const indexRegex = /(\w+):\s*\n([\s\S]*?)(?=\n\s+\w+:|$)/g
  let match

  while ((match = indexRegex.exec(content)) !== null) {
    const name = match[1]
    const indexContent = match[2]

    const columnsMatch = indexContent.match(/columns:\s*\[(.*?)\]/)

    indexes[name] = {
      columns: columnsMatch
        ? columnsMatch[1].split(',').map(c => c.trim().replace(/"/g, ''))
        : []
    }
  }

  return indexes
}

// Generate PostgreSQL DDL
function generatePostgreSQL(schema) {
  const lines = []
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '')

  lines.push(`-- APML Schema Compiler Output`)
  lines.push(`-- Version: ${schema.version}`)
  lines.push(`-- Generated: ${new Date().toISOString()}`)
  lines.push(`-- Source: audio-registry-v12.apml`)
  lines.push('')

  for (const [tableName, table] of Object.entries(schema.tables)) {
    lines.push(`-- ============================================================================`)
    lines.push(`-- TABLE: ${tableName}`)
    if (table.description) {
      lines.push(`-- ${table.description}`)
    }
    lines.push(`-- ============================================================================`)
    lines.push('')
    lines.push(`CREATE TABLE IF NOT EXISTS ${tableName} (`)

    const columnDefs = []
    const constraints = []

    for (const [colName, col] of Object.entries(table.columns)) {
      let def = `  ${colName} ${mapType(col.type)}`

      if (col.generated) {
        def += ` GENERATED ALWAYS AS (${col.generated}) STORED`
      } else {
        if (!col.nullable) def += ' NOT NULL'
        if (col.default) def += ` DEFAULT ${col.default}`
        if (col.unique) def += ' UNIQUE'
      }

      columnDefs.push(def)

      if (col.primaryKey) {
        constraints.push(`  PRIMARY KEY (${colName})`)
      }

      if (col.references) {
        const onDelete = col.onDelete ? ` ON DELETE ${col.onDelete}` : ''
        constraints.push(`  FOREIGN KEY (${colName}) REFERENCES ${col.references}${onDelete}`)
      }
    }

    // Add table-level constraints
    for (const [constName, constraint] of Object.entries(table.constraints || {})) {
      if (constraint.type === 'UNIQUE') {
        constraints.push(`  CONSTRAINT ${constName} UNIQUE (${constraint.columns.join(', ')})`)
      }
    }

    lines.push([...columnDefs, ...constraints].join(',\n'))
    lines.push(');')
    lines.push('')

    // Create indexes
    for (const [indexName, index] of Object.entries(table.indexes || {})) {
      lines.push(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${index.columns.join(', ')});`)
    }

    lines.push('')
  }

  return lines.join('\n')
}

function mapType(apmlType) {
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

// Generate TypeScript types
function generateTypeScript(schema) {
  const lines = []

  lines.push(`// APML Schema Compiler Output`)
  lines.push(`// Version: ${schema.version}`)
  lines.push(`// Generated: ${new Date().toISOString()}`)
  lines.push('')

  for (const [tableName, table] of Object.entries(schema.tables)) {
    const interfaceName = toPascalCase(tableName)

    if (table.description) {
      lines.push(`/** ${table.description} */`)
    }
    lines.push(`export interface ${interfaceName} {`)

    for (const [colName, col] of Object.entries(table.columns)) {
      const tsType = mapToTypeScript(col)
      const optional = col.nullable && !col.primaryKey && !col.default ? '?' : ''
      lines.push(`  ${colName}${optional}: ${tsType};`)
    }

    lines.push('}')
    lines.push('')

    // Insert type (without auto-generated fields)
    lines.push(`export interface ${interfaceName}Insert {`)
    for (const [colName, col] of Object.entries(table.columns)) {
      if (col.primaryKey && col.default) continue // Skip auto-generated PK
      if (col.generated) continue // Skip generated columns
      if (col.default === 'NOW()') continue // Skip auto timestamps

      const tsType = mapToTypeScript(col)
      const optional = col.nullable || col.default ? '?' : ''
      lines.push(`  ${colName}${optional}: ${tsType};`)
    }
    lines.push('}')
    lines.push('')
  }

  return lines.join('\n')
}

function mapToTypeScript(col) {
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

function toPascalCase(str) {
  return str.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
}

// Main
function main() {
  const args = process.argv.slice(2)

  if (args.length < 1) {
    console.log('Usage: node compile-schema.cjs <apml-file> [--target postgresql|typescript]')
    process.exit(1)
  }

  const inputFile = path.resolve(__dirname, args[0])
  const target = args.includes('--target')
    ? args[args.indexOf('--target') + 1]
    : 'postgresql'

  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`)
    process.exit(1)
  }

  const content = fs.readFileSync(inputFile, 'utf-8')
  const schema = parseAPMLSchema(content)

  console.log(`Parsed ${Object.keys(schema.tables).length} tables from ${path.basename(inputFile)}`)

  let output
  let outputFile

  if (target === 'postgresql') {
    output = generatePostgreSQL(schema)
    outputFile = inputFile.replace('.apml', '.sql')
  } else if (target === 'typescript') {
    output = generateTypeScript(schema)
    outputFile = inputFile.replace('.apml', '.ts')
  } else {
    console.error(`Unknown target: ${target}`)
    process.exit(1)
  }

  fs.writeFileSync(outputFile, output)
  console.log(`Generated: ${outputFile}`)
}

main()
