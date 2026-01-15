# APML Documentation

This folder contains documentation about APML itself (the language specification,
migration guides, and architectural documents).

## Contents

### Current Documentation

| File | Description |
|------|-------------|
| `ssi-apml-analysis.apml` | Analysis of expressing SSi in APML, including proposed APML-EDU extensions |
| `v9-migration-log.apml` | Complete log of migration from old phase numbering to APML v9.0 |
| `v9-pipeline-architecture.apml` | Pipeline architecture specification for APML v9.0 |

## Purpose

These documents explain:
- How SSi can be expressed in APML
- The APML-EDU extension proposal for educational/pedagogical applications
- Migration history from previous APML versions
- Current pipeline architecture and data flows

## Related Folders

- `/apml/core/` - Core specifications (audio-registry, naming-conventions, etc.)
- `/apml/phases/` - Phase specifications (phase-0 through phase-9)
- `/apml/archive/` - Deprecated versions
- `/apml/services/` - Service specifications
- `/apml/interfaces/` - UI interface specifications

## APML Language Specification

The canonical APML v2.1.0 language specification is at:
`/apml/APML-v2.1.0-SPECIFICATION.apml`

This includes:
- Core constructs (data, interface, logic, computed, validate)
- APML-EDU extensions (content, methodology, production, audio, parameters, adaptation)
- Compilation targets (TypeScript, Vue 3, Pinia, SQL)
- Trinity Principle validation
