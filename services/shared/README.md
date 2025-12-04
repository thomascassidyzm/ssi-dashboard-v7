# Shared Services Utilities

This directory contains shared utilities used across multiple services.

## Logger (`logger.cjs`)

A simple, consistent logging utility that standardizes log output across all services.

### Features

- Consistent prefix format: `[ServiceName] message`
- Optional timestamp support
- Supports `log()`, `warn()`, and `error()` methods
- Thin wrapper around console.log with formatting

### Basic Usage

```javascript
const createLogger = require('./services/shared/logger.cjs')

// Create a logger for your service
const logger = createLogger('MyService')

// Use it
logger.log('Server started on port 3000')
logger.warn('Configuration missing, using defaults')
logger.error('Failed to connect to database')
```

### Output

```
[MyService] Server started on port 3000
[MyService] Configuration missing, using defaults
[MyService] Failed to connect to database
```

### With Timestamps

```javascript
const logger = createLogger('MyService', { timestamp: true })

logger.log('Processing request')
```

### Output

```
[MyService] [2025-12-04T20:47:35.878Z] Processing request
```

### Multiple Arguments

The logger supports multiple arguments just like console.log:

```javascript
logger.log('Processing user:', { id: 123, name: 'Alice' })
logger.error('Database error:', error)
```

### Migration from Direct Console Calls

**Before:**
```javascript
console.log('[Phase 8] Audio generation started')
console.warn('[Supabase] Missing configuration')
console.error('[WS] Connection failed:', error)
```

**After:**
```javascript
const createLogger = require('./services/shared/logger.cjs')
const logger = createLogger('Phase8')  // or 'Supabase', 'ProductionAPI', etc.

logger.log('Audio generation started')
logger.warn('Missing configuration')
logger.error('Connection failed:', error)
```

## Config Loader (`config-loader.cjs`)

Loads and validates service configuration.

See individual file documentation for usage.
