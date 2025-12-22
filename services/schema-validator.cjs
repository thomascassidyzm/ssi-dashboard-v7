/**
 * Schema Validator Service
 *
 * Validates that the live Supabase database matches the APML schema specification.
 * Extracted from apml-compiler.cjs for use by the dashboard API.
 */

const fs = require('fs')
const path = require('path')

// Default APML schema path
const DEFAULT_SCHEMA_PATH = path.join(__dirname, '../apml/core/audio-registry-v12.apml')

/**
 * APML Parser - extracts table definitions from APML files
 */
class APMLParser {
  constructor(content) {
    this.content = content
  }

  parse() {
    const schema = {
      meta: this.extractMeta(),
      tables: {}
    }

    const tableBlocks = this.extractTableBlocks()
    for (const block of tableBlocks) {
      const table = this.parseTable(block)
      if (table) {
        schema.tables[table.name] = table
      }
    }

    return schema
  }

  extractMeta() {
    const meta = {}
    const versionMatch = this.content.match(/version:\s*"(\d+\.\d+\.\d+)"/)
    if (versionMatch) meta.schemaVersion = versionMatch[1]
    return meta
  }

  extractTableBlocks() {
    const blocks = []
    const tableRegex = /^\s{4}table\s+(\w+):/gm
    let match

    while ((match = tableRegex.exec(this.content)) !== null) {
      const tableName = match[1]
      const startPos = match.index

      let endPos = this.content.length
      const nextTableMatch = this.content.slice(startPos + 1).match(/^\s{4}table\s+\w+:/m)
      if (nextTableMatch) {
        endPos = startPos + 1 + nextTableMatch.index
      }

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
      columns: {}
    }

    const columnsSection = this.extractSection(block.content, 'columns:')
    if (columnsSection) {
      table.columns = this.parseColumns(columnsSection)
    }

    return table
  }

  extractSection(content, sectionName) {
    const startRegex = new RegExp(`^\\s+${sectionName}`, 'm')
    const match = content.match(startRegex)
    if (!match) return null

    const startPos = match.index + match[0].length
    const lines = content.slice(startPos).split('\n')
    const sectionLines = []
    const baseIndent = this.getIndent(match[0])

    for (const line of lines) {
      if (line.trim() === '') {
        sectionLines.push(line)
        continue
      }

      const indent = this.getIndent(line)
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
      const columnMatch = line.match(/^(\s{8})(\w+):$/)
      if (columnMatch) {
        if (currentColumn) {
          columns[currentColumn] = this.parseColumnContent(currentColumn, columnContent.join('\n'))
        }
        currentColumn = columnMatch[2]
        columnContent = []
        continue
      }

      if (currentColumn && line.match(/^\s{10}/)) {
        columnContent.push(line)
      }
    }

    if (currentColumn) {
      columns[currentColumn] = this.parseColumnContent(currentColumn, columnContent.join('\n'))
    }

    return columns
  }

  parseColumnContent(name, content) {
    const col = { name }

    const typeMatch = content.match(/type:\s*"([^"]+)"/)
    if (typeMatch) col.type = typeMatch[1]

    const nullableMatch = content.match(/nullable:\s*(true|false)/)
    col.nullable = nullableMatch ? nullableMatch[1] === 'true' : true

    return col
  }
}

/**
 * Schema Validator - compares APML schema against live Supabase database
 */
class SchemaValidator {
  constructor(supabaseClient) {
    this.supabase = supabaseClient
  }

  /**
   * Load and parse the APML schema file
   */
  loadSchema(schemaPath = DEFAULT_SCHEMA_PATH) {
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`)
    }

    const content = fs.readFileSync(schemaPath, 'utf-8')
    const parser = new APMLParser(content)
    return parser.parse()
  }

  /**
   * Validate database against APML schema
   *
   * @param {string} schemaPath - Optional path to APML schema file
   * @returns {Object} Validation results
   */
  async validate(schemaPath = DEFAULT_SCHEMA_PATH) {
    const schema = this.loadSchema(schemaPath)

    const results = {
      valid: true,
      schemaVersion: schema.meta.schemaVersion,
      validatedAt: new Date().toISOString(),
      tables: {},
      summary: {
        total: Object.keys(schema.tables).length,
        matched: 0,
        missing: 0,
        columnIssues: 0
      }
    }

    for (const [tableName, table] of Object.entries(schema.tables)) {
      const tableResult = await this.validateTable(tableName, table)
      results.tables[tableName] = tableResult

      if (tableResult.status === 'OK') {
        results.summary.matched++
      } else if (tableResult.status === 'MISSING') {
        results.summary.missing++
        results.valid = false
      } else {
        results.summary.columnIssues++
        results.valid = false
      }
    }

    return results
  }

  /**
   * Validate a single table
   */
  async validateTable(tableName, apmlTable) {
    // Try to query the table
    const { data, error } = await this.supabase
      .from(tableName)
      .select('*')
      .limit(1)

    if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
      return { status: 'MISSING', columns: {}, message: 'Table does not exist' }
    }

    // Table exists - check columns
    const columnResults = {}
    const apmlColumns = Object.keys(apmlTable.columns)
    let allColumnsOk = true

    for (const colName of apmlColumns) {
      try {
        const { error: colError } = await this.supabase
          .from(tableName)
          .select(colName)
          .limit(1)

        if (colError && colError.message.includes(colName)) {
          columnResults[colName] = 'MISSING'
          allColumnsOk = false
        } else {
          columnResults[colName] = 'OK'
        }
      } catch (e) {
        columnResults[colName] = 'ERROR'
        allColumnsOk = false
      }
    }

    // Check for extra columns in DB not in APML
    const actualColumns = data && data[0] ? Object.keys(data[0]) : []
    const extraColumns = actualColumns.filter(c => !apmlColumns.includes(c))

    if (allColumnsOk && extraColumns.length === 0) {
      return {
        status: 'OK',
        columnCount: apmlColumns.length,
        columns: columnResults
      }
    } else {
      const missingCols = Object.entries(columnResults)
        .filter(([_, status]) => status !== 'OK')
        .map(([name]) => name)

      return {
        status: 'MISMATCH',
        columns: columnResults,
        missingColumns: missingCols,
        extraColumns,
        message: missingCols.length > 0
          ? `Missing columns: ${missingCols.join(', ')}`
          : `Extra columns in DB: ${extraColumns.join(', ')}`
      }
    }
  }
}

module.exports = {
  SchemaValidator,
  APMLParser,
  DEFAULT_SCHEMA_PATH
}
