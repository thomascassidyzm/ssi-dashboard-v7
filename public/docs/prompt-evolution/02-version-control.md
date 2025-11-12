# Prompt Version Control System

## Executive Summary

This document defines a comprehensive version control system for managing prompt evolution, including directory structure, versioning strategy, and Git integration.

---

## Directory Structure

```
prompts/
├── README.md                          # Overview of prompt system
├── .promptrc                          # Configuration file
├── schema/
│   └── rule_schema.json              # JSON schema for rule definitions
│
├── base/
│   ├── phase_1_v1.0.0.md             # Phase 1 base prompt (stable)
│   ├── phase_2_v1.0.0.md             # Phase 2 base prompt (stable)
│   └── phase_3/
│       ├── v1.0.0.md                 # Original base prompt
│       ├── v1.1.0.md                 # First learned rules incorporated
│       ├── v1.2.0.md                 # Additional learned rules
│       ├── v1.5.2.md                 # Current production version
│       └── CHANGELOG.md              # Human-readable changelog
│
├── rules/
│   ├── committed/
│   │   ├── R001_keep_phrasal_verbs.json
│   │   ├── R002_handle_contractions.json
│   │   ├── R003_preserve_idioms.json
│   │   ├── R012_keep_time_expressions.json
│   │   └── ...
│   │
│   ├── experimental/
│   │   ├── E001_preserve_question_intonation.json
│   │   └── E002_handle_nested_clauses.json
│   │
│   ├── candidate/
│   │   ├── C001_split_compound_sentences.json
│   │   └── C002_preserve_parallel_structure.json
│   │
│   └── rejected/
│       ├── X001_always_split_on_comma.json
│       └── X002_merge_short_words.json
│
├── templates/
│   ├── base_prompt_template.md       # Template for generating prompts
│   ├── rule_injection_template.md    # How to inject rules
│   └── examples_template.md          # Few-shot examples template
│
├── tests/
│   ├── fixtures/
│   │   ├── test_seeds.json           # Test SEEDs for validation
│   │   └── expected_outputs.json     # Expected LEGOs for regression tests
│   │
│   ├── regression/
│   │   ├── v1.0.0_results.json       # Baseline results
│   │   ├── v1.1.0_results.json
│   │   └── v1.5.2_results.json       # Current results
│   │
│   └── validation/
│       ├── overfitting_tests.json
│       └── conflict_tests.json
│
├── evolution/
│   ├── evolution_log.json            # Main evolution log
│   ├── ab_tests/
│   │   ├── test_001_phrasal_verbs.json
│   │   ├── test_002_contractions.json
│   │   └── ...
│   │
│   ├── patterns/
│   │   ├── detected_patterns.json    # Patterns detected from concerns
│   │   └── pattern_frequency.json    # How often patterns occur
│   │
│   └── metrics/
│       ├── daily_metrics.json        # Daily aggregated metrics
│       ├── version_comparison.json   # Version-to-version comparisons
│       └── rule_performance.json     # Per-rule performance tracking
│
├── builds/
│   ├── v1.5.2/
│   │   ├── prompt.md                 # Full compiled prompt
│   │   ├── rules_applied.json        # Rules included in this version
│   │   ├── build_metadata.json       # Build timestamp, commit hash, etc.
│   │   └── validation_report.json    # Pre-deployment validation
│   │
│   └── latest -> v1.5.2              # Symlink to current version
│
└── docs/
    ├── rule_writing_guide.md         # How to write good rules
    ├── versioning_guide.md           # Semantic versioning guidelines
    ├── conflict_resolution.md        # How conflicts are resolved
    └── api.md                        # API for accessing prompts
```

---

## Semantic Versioning

### Version Format: `MAJOR.MINOR.PATCH`

#### MAJOR Version (x.0.0)
Increment when:
- Complete prompt rewrite or restructuring
- Breaking changes to rule system
- Different extraction philosophy (e.g., switching from conservative to aggressive splitting)

**Example**: v1.x.x → v2.0.0
- Rewrite from "minimize splitting" to "maximize learning units"

#### MINOR Version (1.x.0)
Increment when:
- New rule committed from experimental
- Multiple rules refined
- Significant quality improvement (>5%)

**Example**: v1.5.0 → v1.6.0
- Added rule R012_keep_time_expressions
- Committed rule improves quality by 8%

#### PATCH Version (1.5.x)
Increment when:
- Bug fixes in existing rules
- Wording clarifications
- Minor refinements that don't change behavior significantly

**Example**: v1.5.2 → v1.5.3
- Fixed typo in R003_preserve_idioms
- Clarified examples in base prompt

### Version Tags

In addition to semantic version, add tags:

```
v1.5.2-stable        # Production-ready, fully tested
v1.6.0-rc1           # Release candidate (95% confidence)
v1.6.0-experimental  # Experimental version (testing new rules)
v1.5.3-hotfix        # Urgent fix for production issue
```

---

## Rule File Format

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "version", "name", "description", "status", "conditions", "examples"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[REC][0-9]{3}$",
      "description": "R=committed, E=experimental, C=candidate"
    },
    "version": {
      "type": "string",
      "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$"
    },
    "name": {
      "type": "string",
      "description": "Human-readable rule name"
    },
    "description": {
      "type": "string",
      "description": "Detailed description of what rule does"
    },
    "status": {
      "enum": ["candidate", "experimental", "committed", "stable", "rejected", "reverted"],
      "type": "string"
    },
    "category": {
      "enum": ["syntactic", "phrasal_unit", "semantic", "contextual", "aesthetic"],
      "type": "string"
    },
    "priority": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "conditions": {
      "type": "array",
      "description": "When this rule applies",
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "enum": ["pattern", "pos_tag", "dependency", "semantic", "contextual"]
          },
          "pattern": { "type": "string" },
          "description": { "type": "string" }
        }
      }
    },
    "action": {
      "type": "object",
      "description": "What to do when conditions met",
      "properties": {
        "type": {
          "enum": ["keep_together", "split", "merge", "preserve", "transform"]
        },
        "description": { "type": "string" }
      }
    },
    "examples": {
      "type": "array",
      "description": "Examples of rule application",
      "items": {
        "type": "object",
        "properties": {
          "seed": { "type": "string" },
          "correct": { "type": "array", "items": { "type": "string" } },
          "incorrect": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "learned_from": {
          "type": "array",
          "items": { "type": "string" },
          "description": "SEED IDs that taught this rule"
        },
        "created_at": { "type": "string", "format": "date-time" },
        "committed_at": { "type": "string", "format": "date-time" },
        "created_by": { "enum": ["human", "automatic", "hybrid"] },
        "generality_score": {
          "type": "object",
          "properties": {
            "breadth": { "type": "number", "minimum": 0, "maximum": 1 },
            "consistency": { "type": "number", "minimum": 0, "maximum": 1 },
            "magnitude": { "type": "number", "minimum": 0, "maximum": 1 },
            "overall": { "type": "number", "minimum": 0, "maximum": 1 }
          }
        }
      }
    },
    "performance": {
      "type": "object",
      "properties": {
        "baseline_quality": { "type": "number" },
        "with_rule_quality": { "type": "number" },
        "improvement": { "type": "number" },
        "p_value": { "type": "number" },
        "effect_size": { "type": "number" },
        "sample_size": { "type": "integer" },
        "test_id": { "type": "string" }
      }
    },
    "conflicts": {
      "type": "array",
      "description": "Rules that conflict with this one",
      "items": {
        "type": "object",
        "properties": {
          "rule_id": { "type": "string" },
          "conflict_type": { "enum": ["contradictory", "overlapping", "ordering"] },
          "severity": { "enum": ["critical", "moderate", "minor"] },
          "resolution": { "type": "string" }
        }
      }
    }
  }
}
```

### Example Rule File

**File**: `rules/committed/R001_keep_phrasal_verbs.json`

```json
{
  "id": "R001",
  "version": "1.0.0",
  "name": "Keep Phrasal Verbs Together",
  "description": "Phrasal verbs (verb + particle combinations) should be kept as single LEGOs because they function as semantic units. Splitting them would make the meaning unclear.",

  "status": "stable",
  "category": "phrasal_unit",
  "priority": 85,

  "conditions": [
    {
      "type": "pattern",
      "pattern": "VERB + (PARTICLE|PREP)",
      "description": "Match verb followed by particle or preposition that forms phrasal verb"
    },
    {
      "type": "semantic",
      "pattern": "is_phrasal_verb(verb, particle)",
      "description": "Semantic check that combination is idiomatic"
    }
  ],

  "action": {
    "type": "keep_together",
    "description": "Keep verb and particle as single LEGO"
  },

  "examples": [
    {
      "seed": "I go to the park",
      "correct": ["I", "go to", "the park"],
      "incorrect": ["I", "go", "to", "the park"],
      "explanation": "'go to' is a phrasal verb meaning 'visit'"
    },
    {
      "seed": "Look at this!",
      "correct": ["Look at", "this"],
      "incorrect": ["Look", "at", "this"],
      "explanation": "'look at' is a phrasal verb meaning 'observe'"
    },
    {
      "seed": "She comes from Wales",
      "correct": ["She", "comes from", "Wales"],
      "incorrect": ["She", "comes", "from", "Wales"],
      "explanation": "'comes from' is a phrasal verb indicating origin"
    },
    {
      "seed": "Turn on the light",
      "correct": ["Turn on", "the light"],
      "incorrect": ["Turn", "on", "the light"],
      "explanation": "'turn on' is a phrasal verb meaning 'activate'"
    }
  ],

  "metadata": {
    "learned_from": ["C0012", "C0034", "C0089", "C0103", "C0156"],
    "created_at": "2025-10-10T14:23:00Z",
    "committed_at": "2025-10-11T09:15:00Z",
    "created_by": "automatic",
    "generality_score": {
      "breadth": 0.87,
      "consistency": 0.91,
      "magnitude": 0.68,
      "overall": 0.82
    }
  },

  "performance": {
    "baseline_quality": 7.42,
    "with_rule_quality": 8.31,
    "improvement": 0.89,
    "p_value": 0.0034,
    "effect_size": 0.58,
    "sample_size": 67,
    "test_id": "ab_test_001"
  },

  "conflicts": []
}
```

---

## Evolution Log Schema

**File**: `evolution/evolution_log.json`

```json
{
  "schema_version": "1.0.0",
  "current_version": "1.5.2",
  "last_updated": "2025-10-11T10:30:00Z",

  "timeline": [
    {
      "version": "1.0.0",
      "date": "2025-10-01T00:00:00Z",
      "type": "baseline",
      "description": "Initial base prompt",
      "rules": [],
      "metrics": {
        "mean_quality": 7.12,
        "concern_rate": 0.089
      }
    },
    {
      "version": "1.1.0",
      "date": "2025-10-10T09:15:00Z",
      "type": "rule_addition",
      "description": "Added R001: Keep Phrasal Verbs Together",
      "rules": ["R001"],
      "metrics": {
        "mean_quality": 7.89,
        "concern_rate": 0.067,
        "improvement_from_previous": {
          "quality_delta": 0.77,
          "concern_rate_delta": -0.022,
          "p_value": 0.0034
        }
      }
    },
    {
      "version": "1.2.0",
      "date": "2025-10-11T10:30:00Z",
      "type": "rule_addition",
      "description": "Added R002: Handle Contractions",
      "rules": ["R001", "R002"],
      "metrics": {
        "mean_quality": 8.21,
        "concern_rate": 0.051,
        "improvement_from_previous": {
          "quality_delta": 0.32,
          "concern_rate_delta": -0.016,
          "p_value": 0.018
        }
      }
    }
  ],

  "rules": {
    "committed": [
      {
        "rule_id": "R001",
        "name": "Keep Phrasal Verbs Together",
        "version": "1.0.0",
        "status": "stable",
        "committed_in_version": "1.1.0",
        "committed_at": "2025-10-10T09:15:00Z",

        "learned_from": ["C0012", "C0034", "C0089", "C0103", "C0156"],

        "performance": {
          "quality_before": 7.12,
          "quality_after": 7.89,
          "improvement": 0.77,
          "p_value": 0.0034,
          "effect_size": 0.58,
          "sample_size": 67
        },

        "observation_period": {
          "start": "2025-10-10T09:15:00Z",
          "end": "2025-10-11T09:15:00Z",
          "status": "stable",
          "issues": []
        }
      },
      {
        "rule_id": "R002",
        "name": "Handle Contractions",
        "version": "1.0.0",
        "status": "committed",
        "committed_in_version": "1.2.0",
        "committed_at": "2025-10-11T10:30:00Z",

        "learned_from": ["C0023", "C0067", "C0145"],

        "performance": {
          "quality_before": 7.89,
          "quality_after": 8.21,
          "improvement": 0.32,
          "p_value": 0.018,
          "effect_size": 0.41,
          "sample_size": 58
        },

        "observation_period": {
          "start": "2025-10-11T10:30:00Z",
          "end": null,
          "status": "observing",
          "issues": []
        }
      }
    ],

    "experimental": [
      {
        "rule_id": "E001",
        "name": "Preserve Question Intonation",
        "version": "1.0.0",
        "status": "experimental",
        "created_at": "2025-10-11T08:00:00Z",

        "learned_from": ["C0178", "C0189", "C0201"],

        "ab_test": {
          "test_id": "ab_test_003",
          "start_date": "2025-10-11T08:30:00Z",
          "progress": {
            "samples_collected": 32,
            "samples_needed": 50,
            "percent_complete": 64
          },
          "current_results": {
            "control_quality": 8.21,
            "experimental_quality": 8.52,
            "delta": 0.31,
            "p_value": 0.023,
            "decision": "looking_good"
          }
        }
      }
    ],

    "candidate": [
      {
        "rule_id": "C001",
        "name": "Split Compound Sentences",
        "version": "1.0.0",
        "status": "candidate",
        "created_at": "2025-10-11T11:00:00Z",

        "learned_from": ["C0210", "C0215", "C0223", "C0234", "C0241"],

        "pattern": {
          "description": "Long sentences with 'and'/'but' could be split",
          "frequency": 7,
          "concern_types": ["over_complexity"]
        },

        "next_step": "Promote to experimental testing"
      }
    ],

    "rejected": [
      {
        "rule_id": "X001",
        "name": "Always Split on Comma",
        "version": "1.0.0",
        "status": "rejected",
        "created_at": "2025-10-08T14:00:00Z",
        "rejected_at": "2025-10-09T16:30:00Z",

        "learned_from": ["C0045", "C0052"],

        "rejection_reason": {
          "type": "performance",
          "description": "Decreased quality in A/B test",
          "ab_test_results": {
            "quality_before": 7.89,
            "quality_after": 7.23,
            "p_value": 0.002,
            "decision": "reject"
          }
        }
      }
    ]
  },

  "patterns": {
    "active": [
      {
        "pattern_id": "P001",
        "description": "Phrasal verbs being split incorrectly",
        "frequency": 12,
        "concern_type": "over_segmentation",
        "affected_seeds": ["C0012", "C0034", "C0089", "C0103"],
        "generated_rule": "R001",
        "status": "resolved"
      },
      {
        "pattern_id": "P002",
        "description": "Time expressions split awkwardly",
        "frequency": 5,
        "concern_type": "missing_context",
        "affected_seeds": ["C0210", "C0215", "C0223", "C0234", "C0241"],
        "generated_rule": "C001",
        "status": "candidate"
      }
    ],

    "monitoring": [
      {
        "pattern_id": "P003",
        "description": "Questions losing intonation markers",
        "frequency": 3,
        "concern_type": "missing_context",
        "affected_seeds": ["C0250", "C0256", "C0262"],
        "generated_rule": null,
        "status": "monitoring"
      }
    ]
  },

  "statistics": {
    "total_rules_learned": 2,
    "total_rules_tested": 4,
    "total_rules_rejected": 2,
    "success_rate": 0.50,

    "avg_time_to_commit": "1.2 days",
    "avg_improvement_per_rule": 0.545,

    "quality_progression": [
      {"version": "1.0.0", "quality": 7.12},
      {"version": "1.1.0", "quality": 7.89},
      {"version": "1.2.0", "quality": 8.21}
    ]
  }
}
```

---

## Prompt Build Process

### Build Script

```bash
#!/bin/bash
# build_prompt.sh

VERSION=$1
RULES_DIR="rules/committed"
BASE_TEMPLATE="templates/base_prompt_template.md"
OUTPUT_DIR="builds/$VERSION"

# Validate version format
if [[ ! $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: Invalid version format. Use semantic versioning (e.g., 1.5.2)"
  exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "Building prompt version $VERSION..."

# 1. Start with base template
cp "$BASE_TEMPLATE" "$OUTPUT_DIR/prompt.md"

# 2. Collect all committed rules
RULES_JSON="["
for rule_file in "$RULES_DIR"/*.json; do
  RULES_JSON+="$(cat "$rule_file"),"
done
RULES_JSON="${RULES_JSON%,}]"  # Remove trailing comma

echo "$RULES_JSON" > "$OUTPUT_DIR/rules_applied.json"

# 3. Inject rules into prompt
node scripts/inject_rules.js \
  --prompt "$OUTPUT_DIR/prompt.md" \
  --rules "$OUTPUT_DIR/rules_applied.json" \
  --output "$OUTPUT_DIR/prompt.md"

# 4. Run validation tests
echo "Running validation tests..."
node scripts/validate_prompt.js \
  --prompt "$OUTPUT_DIR/prompt.md" \
  --test-fixtures "tests/fixtures" \
  --output "$OUTPUT_DIR/validation_report.json"

VALIDATION_STATUS=$?

# 5. Create build metadata
cat > "$OUTPUT_DIR/build_metadata.json" <<EOF
{
  "version": "$VERSION",
  "built_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_commit": "$(git rev-parse HEAD)",
  "git_branch": "$(git branch --show-current)",
  "rules_count": $(echo "$RULES_JSON" | jq 'length'),
  "validation_passed": $([ $VALIDATION_STATUS -eq 0 ] && echo "true" || echo "false")
}
EOF

# 6. Update symlink to latest
ln -sfn "$OUTPUT_DIR" "builds/latest"

if [ $VALIDATION_STATUS -eq 0 ]; then
  echo "✓ Build successful: $OUTPUT_DIR"
  echo "✓ Validation passed"
else
  echo "✗ Build completed with validation warnings: $OUTPUT_DIR"
fi

# 7. Create git tag
git tag -a "v$VERSION" -m "Prompt version $VERSION"
echo "✓ Created git tag v$VERSION"
```

### Rule Injection Script

```typescript
// scripts/inject_rules.ts

import * as fs from 'fs';
import * as path from 'path';

interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  examples: Array<{
    seed: string;
    correct: string[];
    incorrect: string[];
    explanation: string;
  }>;
  metadata: {
    learned_from: string[];
    created_at: string;
  };
  performance: {
    improvement: number;
    p_value: number;
  };
}

function injectRules(
  promptTemplate: string,
  rules: Rule[]
): string {
  // Find injection point
  const INJECTION_MARKER = "<!-- LEARNED_RULES_INJECTION_POINT -->";

  if (!promptTemplate.includes(INJECTION_MARKER)) {
    throw new Error("Prompt template missing injection marker");
  }

  // Generate rules section
  const rulesMarkdown = generateRulesSection(rules);

  // Inject
  const finalPrompt = promptTemplate.replace(
    INJECTION_MARKER,
    rulesMarkdown
  );

  return finalPrompt;
}

function generateRulesSection(rules: Rule[]): string {
  // Sort by category and priority
  const categorized = groupByCategory(rules);

  let markdown = "## Learned Rules\n\n";
  markdown += "_These rules were automatically learned from extraction patterns ";
  markdown += "and have been validated through A/B testing._\n\n";

  for (const [category, categoryRules] of Object.entries(categorized)) {
    markdown += `### ${categoryName(category)}\n\n`;

    for (const rule of categoryRules) {
      markdown += `#### ${rule.name} (${rule.id})\n\n`;
      markdown += `${rule.description}\n\n`;

      markdown += "**Examples:**\n\n";
      for (const example of rule.examples.slice(0, 3)) {
        markdown += `- SEED: "${example.seed}"\n`;
        markdown += `  - ✓ Correct: ${JSON.stringify(example.correct)}\n`;
        markdown += `  - ✗ Incorrect: ${JSON.stringify(example.incorrect)}\n`;
        markdown += `  - _${example.explanation}_\n\n`;
      }

      markdown += `_Learned from ${rule.metadata.learned_from.length} SEEDs. `;
      markdown += `Improves quality by ${(rule.performance.improvement * 100).toFixed(1)}% `;
      markdown += `(p=${rule.performance.p_value.toFixed(4)})_\n\n`;
      markdown += "---\n\n";
    }
  }

  return markdown;
}

function groupByCategory(rules: Rule[]): Record<string, Rule[]> {
  const groups: Record<string, Rule[]> = {};

  for (const rule of rules) {
    if (!groups[rule.category]) {
      groups[rule.category] = [];
    }
    groups[rule.category].push(rule);
  }

  return groups;
}

function categoryName(category: string): string {
  const names: Record<string, string> = {
    syntactic: "Syntactic Rules",
    phrasal_unit: "Phrasal & Multi-Word Units",
    semantic: "Semantic Rules",
    contextual: "Contextual Rules",
    aesthetic: "Aesthetic & Style Rules",
  };
  return names[category] || category;
}
```

---

## Git Integration

### Branch Strategy

```
main
├── prompts/v1.5.2 (production)
│
├── develop
│   ├── prompts/v1.6.0-rc1 (release candidate)
│   │
│   └── feature/rule-E001-question-intonation
│       └── prompts/v1.6.0-experimental
│
└── hotfix/rule-R002-fix
    └── prompts/v1.5.3-hotfix
```

### Git Workflow

#### 1. New Rule Development

```bash
# Create feature branch for new experimental rule
git checkout -b feature/rule-E001-question-intonation develop

# Add experimental rule
cat > rules/experimental/E001_preserve_question_intonation.json <<EOF
{...}
EOF

# Commit
git add rules/experimental/E001_preserve_question_intonation.json
git commit -m "Add experimental rule E001: Preserve Question Intonation

Learned from SEEDs: C0178, C0189, C0201
Status: Starting A/B test"

# Push and create PR
git push origin feature/rule-E001-question-intonation
```

#### 2. Rule Promotion (Experimental → Committed)

```bash
# When A/B test passes, promote rule
git checkout develop

# Move rule to committed
git mv rules/experimental/E001_*.json rules/committed/R012_preserve_question_intonation.json

# Update rule status in JSON
vim rules/committed/R012_preserve_question_intonation.json
# Change: "status": "experimental" → "status": "committed"
# Change: "id": "E001" → "id": "R012"

# Build new prompt version
./scripts/build_prompt.sh 1.6.0

# Update evolution log
node scripts/update_evolution_log.js \
  --rule R012 \
  --version 1.6.0 \
  --action commit

# Commit all changes
git add .
git commit -m "Release v1.6.0: Commit rule R012

- Promoted E001 to R012 (Preserve Question Intonation)
- A/B test results: +0.31 quality improvement (p=0.023)
- Built prompt v1.6.0"

# Create release tag
git tag -a v1.6.0 -m "Release v1.6.0

New rules:
- R012: Preserve Question Intonation

Performance:
- Quality: 8.52/10 (+3.8% from v1.5.2)
- Concern rate: 4.1% (-0.8% from v1.5.2)"

# Merge to main for production deployment
git checkout main
git merge develop --no-ff -m "Merge v1.6.0 to production"
git push origin main --tags
```

#### 3. Hotfix for Production Issue

```bash
# Create hotfix branch from main
git checkout -b hotfix/rule-R002-fix main

# Fix the issue
vim rules/committed/R002_handle_contractions.json

# Build hotfix version
./scripts/build_prompt.sh 1.5.3-hotfix

# Commit
git add .
git commit -m "Hotfix v1.5.3: Fix R002 contraction handling

Fixed issue where contractions with apostrophes at end
were incorrectly split."

# Tag
git tag -a v1.5.3 -m "Hotfix v1.5.3: R002 contraction fix"

# Merge to both main and develop
git checkout main
git merge hotfix/rule-R002-fix --no-ff
git checkout develop
git merge hotfix/rule-R002-fix --no-ff

# Push
git push origin main develop --tags

# Delete hotfix branch
git branch -d hotfix/rule-R002-fix
```

---

## Version Comparison Tools

### CLI Tool

```bash
# Compare two versions
$ prompt-compare v1.5.0 v1.6.0

Comparing v1.5.0 → v1.6.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rules Added:
  + R012: Preserve Question Intonation

Rules Modified:
  ~ R002: Handle Contractions (v1.0.0 → v1.0.1)

Performance:
  Quality Score:     8.21 → 8.52  (+3.8%)
  Concern Rate:      4.9% → 4.1%  (-16.3%)
  LEGOs per SEED:    4.2 → 4.3    (+2.4%)

Statistical Significance:
  Quality improvement: p = 0.003 ✓
  Concern reduction:   p = 0.012 ✓

Recommendation: SAFE TO DEPLOY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# View specific rule history
$ prompt-rule-history R001

Rule: R001 - Keep Phrasal Verbs Together
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Timeline:
  2025-10-08  Created (automatic, from 5 SEEDs)
  2025-10-09  → Experimental (A/B test started)
  2025-10-10  → Committed (test passed)
  2025-10-11  → Stable (observation complete)

Performance:
  Initial:  7.12 quality
  Current:  8.31 quality
  Gain:     +0.89 (+12.5%)

Applied to: 847 extractions
Success rate: 98.3%
Conflicts: None

# Rollback to previous version
$ prompt-rollback v1.5.0 --reason "Quality degradation detected"

Rolling back: v1.6.0 → v1.5.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actions:
  1. Reverting builds/latest → builds/v1.5.0
  2. Marking R012 as 'reverted' in evolution log
  3. Creating git revert commit
  4. Notifying monitoring system

Rollback complete. Current version: v1.5.0
Reason logged: Quality degradation detected
```

---

## API for Accessing Prompts

```typescript
// Prompt Version API

class PromptVersionManager {
  /**
   * Get the current production prompt
   */
  async getCurrentPrompt(): Promise<Prompt> {
    const version = await this.getCurrentVersion();
    return this.getPromptByVersion(version);
  }

  /**
   * Get specific version of prompt
   */
  async getPromptByVersion(version: string): Promise<Prompt> {
    const buildPath = path.join(BUILDS_DIR, version);
    const promptText = await fs.readFile(
      path.join(buildPath, 'prompt.md'),
      'utf-8'
    );
    const rulesApplied = await fs.readJSON(
      path.join(buildPath, 'rules_applied.json')
    );
    const metadata = await fs.readJSON(
      path.join(buildPath, 'build_metadata.json')
    );

    return {
      version,
      text: promptText,
      rules: rulesApplied,
      metadata,
    };
  }

  /**
   * Get prompt for A/B testing
   * Returns appropriate version based on SEED assignment
   */
  async getPromptForSEED(seedId: string): Promise<Prompt> {
    const assignment = await this.getABTestAssignment(seedId);

    if (assignment.group === 'control') {
      return this.getCurrentPrompt();
    } else {
      return this.getPromptByVersion(assignment.experimentalVersion);
    }
  }

  /**
   * List all available versions
   */
  async listVersions(): Promise<VersionInfo[]> {
    const log = await fs.readJSON(EVOLUTION_LOG_PATH);
    return log.timeline.map(entry => ({
      version: entry.version,
      date: entry.date,
      description: entry.description,
      metrics: entry.metrics,
    }));
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    v1: string,
    v2: string
  ): Promise<VersionComparison> {
    const prompt1 = await this.getPromptByVersion(v1);
    const prompt2 = await this.getPromptByVersion(v2);

    // Compare rules
    const rulesAdded = prompt2.rules.filter(
      r => !prompt1.rules.find(r1 => r1.id === r.id)
    );
    const rulesRemoved = prompt1.rules.filter(
      r => !prompt2.rules.find(r2 => r2.id === r.id)
    );
    const rulesModified = prompt2.rules.filter(r => {
      const r1 = prompt1.rules.find(r1 => r1.id === r.id);
      return r1 && r1.version !== r.version;
    });

    // Compare performance
    const metrics1 = await this.getVersionMetrics(v1);
    const metrics2 = await this.getVersionMetrics(v2);

    return {
      version1: v1,
      version2: v2,
      rulesAdded,
      rulesRemoved,
      rulesModified,
      metricsComparison: {
        qualityDelta: metrics2.meanQuality - metrics1.meanQuality,
        concernRateDelta: metrics2.concernRate - metrics1.concernRate,
      },
    };
  }
}
```

---

## Backup and Recovery

### Automated Backups

```bash
# Cron job: Daily backup
0 2 * * * /opt/prompts/scripts/backup.sh

# backup.sh
#!/bin/bash

BACKUP_DIR="/backups/prompts"
DATE=$(date +%Y%m%d)

# Backup entire prompts directory
tar -czf "$BACKUP_DIR/prompts_$DATE.tar.gz" \
  /opt/prompts/{rules,evolution,builds,base}

# Backup to S3
aws s3 cp "$BACKUP_DIR/prompts_$DATE.tar.gz" \
  s3://apml-backups/prompts/

# Keep only last 30 days locally
find "$BACKUP_DIR" -name "prompts_*.tar.gz" -mtime +30 -delete

# Backup evolution database
pg_dump apml_evolution > "$BACKUP_DIR/evolution_db_$DATE.sql"
aws s3 cp "$BACKUP_DIR/evolution_db_$DATE.sql" \
  s3://apml-backups/database/
```

### Recovery Procedures

```bash
# Restore from backup
$ prompt-restore --date 2025-10-10

Restoring prompts from 2025-10-10...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Downloading backup from S3...
2. Extracting backup...
3. Restoring rules directory...
4. Restoring evolution log...
5. Rebuilding prompt versions...
6. Validating restoration...

✓ Restoration complete
  Prompt version: v1.5.0
  Rules restored: 10
  Evolution log: OK

# Rollback single rule
$ prompt-revert-rule R012 --reason "Performance regression"

Reverting rule R012...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actions:
  1. Moving R012 to reverted/
  2. Rebuilding prompt without R012
  3. Creating version v1.5.3
  4. Updating evolution log

✓ Rule R012 reverted
  New version: v1.5.3
  Rollback reason logged
```

---

## Summary

This version control system provides:

1. **Clear Structure**: Organized directory layout with separated concerns
2. **Semantic Versioning**: Predictable version numbering
3. **Rich Metadata**: Comprehensive tracking of rule performance and history
4. **Build Automation**: Scripts for building, testing, and deploying prompts
5. **Git Integration**: Standard Git workflow with branches and tags
6. **Comparison Tools**: Easy comparison between versions
7. **API Access**: Programmatic access to prompts and rules
8. **Backup/Recovery**: Robust backup and rollback capabilities

The system enables:
- **Auditability**: Every change is tracked and explained
- **Reproducibility**: Any version can be rebuilt from source
- **Safety**: Rollback available at any time
- **Collaboration**: Standard Git workflow for team development
- **Automation**: Scripts handle routine tasks
- **Testing**: A/B tests integrated into workflow
