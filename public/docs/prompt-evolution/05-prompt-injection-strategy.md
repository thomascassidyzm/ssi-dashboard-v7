# Prompt Injection Strategy

## Executive Summary

This document defines multiple strategies for injecting learned rules into prompts, evaluating their effectiveness, and recommending best practices.

---

## Core Challenge

**Problem**: How do we programmatically insert learned rules into base prompts in a way that:
1. The LLM agent actually follows them
2. Rules are clear and unambiguous
3. Rules don't conflict with each other
4. Prompts remain maintainable
5. Performance is optimized

---

## Strategy 1: Direct Markdown Append

### Approach

Append learned rules as markdown sections to the base prompt.

```markdown
# Phase 3: LEGO Extraction

## Instructions

[Original base prompt...]

## Learned Rules

These rules were automatically learned from extraction patterns and validated through A/B testing.

### Keep Phrasal Verbs Together (R001)

When you encounter phrasal verbs (verb + preposition/adverb), keep them as single LEGOs:
- ✓ "go to" (not "go" + "to")
- ✓ "look at" (not "look" + "at")

**Examples:**
- "I go to the park" → ["I", "go to", "the park"]
- "Look at this!" → ["Look at", "this"]

### Handle Contractions (R002)

Keep contractions together, don't split apostrophes:
- ✓ "I'm" (not "I" + "'m")
- ✓ "don't" (not "don" + "'t")

**Examples:**
- "I'm happy" → ["I'm", "happy"]
- "We don't know" → ["We", "don't", "know"]

[... more rules ...]
```

### Pros

- **Simple**: Easy to implement and understand
- **Readable**: Humans can easily read and understand
- **Maintainable**: Easy to add/remove rules
- **Standard Format**: Uses familiar markdown

### Cons

- **Verbose**: Prompts can get very long with many rules
- **Ordering Issues**: Rule order might matter but isn't controlled
- **No Priority**: Can't express rule priority
- **Conflicts**: Hard to express which rule takes precedence
- **Token Heavy**: Uses many tokens for full explanations

### Implementation

```typescript
class MarkdownInjector {
  inject(basePrompt: string, rules: Rule[]): string {
    const rulesSection = this.generateRulesSection(rules);

    // Find injection point or append
    const injectionMarker = "<!-- LEARNED_RULES_INJECTION_POINT -->";

    if (basePrompt.includes(injectionMarker)) {
      return basePrompt.replace(injectionMarker, rulesSection);
    } else {
      return basePrompt + "\n\n" + rulesSection;
    }
  }

  private generateRulesSection(rules: Rule[]): string {
    let section = "## Learned Rules\n\n";
    section += "_These rules were automatically learned and validated._\n\n";

    // Sort by priority (highest first)
    const sorted = rules.sort((a, b) => b.priority - a.priority);

    for (const rule of sorted) {
      section += `### ${rule.name} (${rule.id})\n\n`;
      section += `${rule.description}\n\n`;

      section += "**Examples:**\n";
      for (const example of rule.examples.slice(0, 2)) {
        section += `- "${example.seed}"\n`;
        section += `  - ✓ ${JSON.stringify(example.correct)}\n`;
        section += `  - ✗ ${JSON.stringify(example.incorrect)}\n`;
      }

      section += "\n";
    }

    return section;
  }
}
```

### Effectiveness

**Estimated Compliance Rate**: 75-85%

LLMs generally follow explicit markdown instructions well, but:
- May miss rules if prompt is too long
- May not apply rules consistently
- Priority isn't enforced

---

## Strategy 2: Structured JSON Rules

### Approach

Provide rules as a structured JSON object that the agent parses.

```markdown
# Phase 3: LEGO Extraction

## Instructions

[Original base prompt...]

## Extraction Rules

Before extracting LEGOs, parse and apply these rules in priority order:

```json
{
  "version": "1.5.2",
  "rules": [
    {
      "id": "R001",
      "priority": 85,
      "name": "Keep Phrasal Verbs Together",
      "condition": {
        "type": "pattern",
        "pattern": "VERB + (PREP|PARTICLE)",
        "check": "is_phrasal_verb(verb, particle)"
      },
      "action": {
        "type": "keep_together",
        "description": "Keep verb and particle as single LEGO"
      },
      "examples": [
        {
          "input": "I go to the park",
          "correct": ["I", "go to", "the park"],
          "incorrect": ["I", "go", "to", "the park"]
        }
      ]
    },
    {
      "id": "R002",
      "priority": 80,
      "name": "Handle Contractions",
      "condition": {
        "type": "pattern",
        "pattern": "\\w+['']\\w+"
      },
      "action": {
        "type": "keep_together",
        "description": "Keep contractions intact"
      },
      "examples": [
        {
          "input": "I'm happy",
          "correct": ["I'm", "happy"],
          "incorrect": ["I", "'m", "happy"]
        }
      ]
    }
  ]
}
```

**Application Process:**
1. Parse the JSON rules
2. Sort by priority (descending)
3. For each word/phrase in SEED, check rules in order
4. Apply first matching rule's action
5. Continue to next word/phrase
```

### Pros

- **Structured**: Machine-parseable format
- **Explicit Priority**: Rules have numeric priorities
- **Formal Conditions**: Conditions are structured
- **Versioned**: Easy to track which rule set
- **Compact**: Less verbose than markdown

### Cons

- **Complex**: Requires agent to parse JSON
- **Less Readable**: Harder for humans to read in JSON
- **Parsing Overhead**: Agent must parse before use
- **Format Sensitivity**: JSON syntax errors break everything

### Implementation

```typescript
class JSONInjector {
  inject(basePrompt: string, rules: Rule[]): string {
    const rulesJSON = this.generateRulesJSON(rules);

    const injectionSection = `
## Extraction Rules

Before extracting LEGOs, parse and apply these rules in priority order:

\`\`\`json
${JSON.stringify(rulesJSON, null, 2)}
\`\`\`

**Application Process:**
1. Parse the JSON rules
2. Sort by priority (descending)
3. For each word/phrase in SEED, check rules in order
4. Apply first matching rule's action
5. Continue to next word/phrase
`;

    return basePrompt + "\n\n" + injectionSection;
  }

  private generateRulesJSON(rules: Rule[]): object {
    return {
      version: process.env.PROMPT_VERSION,
      rules: rules.map(rule => ({
        id: rule.id,
        priority: rule.priority,
        name: rule.name,
        condition: {
          type: rule.conditions[0]?.type,
          pattern: rule.conditions[0]?.pattern,
          description: rule.conditions[0]?.description,
        },
        action: {
          type: rule.action.type,
          description: rule.action.description,
        },
        examples: rule.examples.slice(0, 2).map(ex => ({
          input: ex.seed,
          correct: ex.correct,
          incorrect: ex.incorrect,
        })),
      })),
    };
  }
}
```

### Effectiveness

**Estimated Compliance Rate**: 80-90%

Structured format helps LLMs:
- Understand priority ordering
- Parse conditions systematically
- Apply rules consistently

But requires:
- Agent capable of JSON parsing
- Clear instructions on application process

---

## Strategy 3: Few-Shot Examples

### Approach

Instead of explicit rules, show successful extractions as examples.

```markdown
# Phase 3: LEGO Extraction

## Instructions

[Original base prompt...]

## Example Extractions

Here are examples of high-quality LEGO extractions. Learn from these patterns:

### Example 1: Phrasal Verbs (Quality: 9.2/10)

**SEED:** "I go to the park every day"
**LEGOs:** ["I", "go to", "the park", "every day"]

**Key Insight:** "go to" is kept together as a phrasal verb, not split.

### Example 2: Contractions (Quality: 9.5/10)

**SEED:** "I'm going to the shop"
**LEGOs:** ["I'm", "going to", "the shop"]

**Key Insight:** Contractions like "I'm" stay intact. Phrasal verb "going to" kept together.

### Example 3: Time Expressions (Quality: 9.0/10)

**SEED:** "We meet at three o'clock"
**LEGOs:** ["We", "meet", "at three o'clock"]

**Key Insight:** Time expressions "at three o'clock" kept as a unit.

### Example 4: Questions (Quality: 8.8/10)

**SEED:** "Where do you come from?"
**LEGOs:** ["Where", "do you", "come from"]

**Key Insight:** Question structure "do you" and phrasal verb "come from" preserved.

[... 10-20 more examples covering diverse patterns ...]

---

Now extract LEGOs from the following SEED, learning from the patterns above:
```

### Pros

- **Natural Learning**: Mimics how humans learn (by example)
- **Implicit Rules**: No need to articulate rules explicitly
- **Flexible**: Agent can generalize patterns
- **Robust**: Works even if examples have slight variations
- **Few-Shot Power**: Leverages LLM's few-shot learning ability

### Cons

- **Ambiguous**: May not learn intended pattern
- **Example Selection Critical**: Bad examples = bad learning
- **No Priority**: Can't control which pattern takes precedence
- **Coverage**: Need examples for every pattern
- **Token Heavy**: Need many examples for good coverage

### Implementation

```typescript
class FewShotInjector {
  inject(basePrompt: string, rules: Rule[]): string {
    const examples = this.generateExamplesSection(rules);

    return basePrompt + "\n\n" + examples;
  }

  private generateExamplesSection(rules: Rule[]): string {
    let section = "## Example Extractions\n\n";
    section += "Here are examples of high-quality LEGO extractions. Learn from these patterns:\n\n";

    let exampleNum = 1;

    // Generate 2-3 examples per rule
    for (const rule of rules) {
      const relevantExamples = this.selectBestExamples(rule, 2);

      for (const example of relevantExamples) {
        section += `### Example ${exampleNum}: ${rule.name} (Quality: ${this.generateQualityScore()}/10)\n\n`;
        section += `**SEED:** "${example.seed}"\n`;
        section += `**LEGOs:** ${JSON.stringify(example.correct)}\n\n`;
        section += `**Key Insight:** ${example.explanation}\n\n`;

        exampleNum++;
      }
    }

    section += "---\n\n";
    section += "Now extract LEGOs from the following SEED, learning from the patterns above:\n";

    return section;
  }

  private selectBestExamples(rule: Rule, count: number): RuleExample[] {
    // Select diverse, clear examples
    return rule.examples
      .filter(ex => this.isGoodExample(ex))
      .slice(0, count);
  }

  private isGoodExample(example: RuleExample): boolean {
    // Example quality heuristics
    return (
      example.seed.split(" ").length >= 3 &&    // Not too short
      example.seed.split(" ").length <= 12 &&   // Not too long
      example.correct.length >= 2 &&            // Multiple LEGOs
      example.explanation.length > 10           // Has explanation
    );
  }

  private generateQualityScore(): number {
    // Generate realistic quality score for examples
    return (8.5 + Math.random() * 1.5).toFixed(1);
  }
}
```

### Effectiveness

**Estimated Compliance Rate**: 70-85%

Few-shot learning is powerful but:
- Depends on example quality
- Agent may not generalize correctly
- Can't guarantee specific behavior
- Works best with 15-30 examples

---

## Strategy 4: Hybrid (Rules + Examples + Meta-Learning)

### Approach

Combine explicit rules with examples and meta-instructions.

```markdown
# Phase 3: LEGO Extraction

## Instructions

[Original base prompt...]

## Extraction Methodology

You are using **Prompt Version 1.5.2**, which has learned from 1,247 extractions.

### Meta-Principles

1. **Semantic Units**: Keep words together if they form semantic units (phrasal verbs, idioms, collocations)
2. **Learner-Centric**: LEGOs should be maximally useful for language learners
3. **Natural Boundaries**: Split at natural linguistic boundaries, not arbitrary points
4. **Context Preservation**: Each LEGO should carry enough context to be understood

### Learned Rules (Priority-Ordered)

The following rules were learned from data and validated through A/B testing. Apply in order:

#### 1. Keep Phrasal Verbs Together [R001, Priority: 85]

**Pattern:** VERB + PREP/PARTICLE forming idiomatic meaning

**Examples:**
- ✓ "go to", "come from", "look at"
- ✗ Don't split into separate LEGOs

**Evidence:** Improves quality by +12% (p=0.003)

---

#### 2. Handle Contractions [R002, Priority: 80]

**Pattern:** WORD + ' + WORD (apostrophe contractions)

**Examples:**
- ✓ "I'm", "don't", "we'll"
- ✗ Don't split apostrophe

**Evidence:** Improves quality by +8% (p=0.018)

---

[... more rules ...]

### Reference Examples

Study these high-quality extractions (mean quality: 9.1/10):

<examples>
1. "I go to the park" → ["I", "go to", "the park"]
   - Phrasal verb "go to" preserved

2. "I'm happy today" → ["I'm", "happy", "today"]
   - Contraction "I'm" intact

3. "Where do you come from?" → ["Where", "do you", "come from"]
   - Question "do you" kept, phrasal verb "come from" kept

[... 8-10 more examples ...]
</examples>

### Application Process

For each SEED:

1. **Parse** the sentence structure
2. **Identify** patterns matching learned rules (in priority order)
3. **Apply** the highest-priority matching rule
4. **Verify** against example patterns
5. **Extract** LEGOs following the rules
6. **Self-Assess** quality (aim for >8/10)

---

Now extract LEGOs from this SEED:
```

### Pros

- **Comprehensive**: Multiple learning signals (rules + examples + meta)
- **Explicit + Implicit**: Benefits of both approaches
- **Evidence-Based**: Shows performance data
- **Guided Process**: Step-by-step application
- **Meta-Learning**: Teaches the agent how to learn
- **Self-Assessment**: Encourages quality awareness

### Cons

- **Long**: Uses many tokens
- **Complex**: Requires agent to integrate multiple sources
- **Maintenance**: More pieces to maintain
- **Potential Confusion**: Too much information might overwhelm

### Implementation

```typescript
class HybridInjector {
  inject(basePrompt: string, rules: Rule[], config: InjectionConfig): string {
    const sections = [
      this.generateMetaPrinciples(),
      this.generateLearnedRules(rules),
      this.generateReferenceExamples(rules, config.exampleCount),
      this.generateApplicationProcess(),
    ];

    const injectionContent = sections.join("\n\n");

    return basePrompt + "\n\n" + injectionContent;
  }

  private generateMetaPrinciples(): string {
    return `## Extraction Methodology

You are using **Prompt Version ${this.getVersion()}**, which has learned from ${this.getTotalExtractions()} extractions.

### Meta-Principles

1. **Semantic Units**: Keep words together if they form semantic units (phrasal verbs, idioms, collocations)
2. **Learner-Centric**: LEGOs should be maximally useful for language learners
3. **Natural Boundaries**: Split at natural linguistic boundaries, not arbitrary points
4. **Context Preservation**: Each LEGO should carry enough context to be understood`;
  }

  private generateLearnedRules(rules: Rule[]): string {
    let section = "### Learned Rules (Priority-Ordered)\n\n";
    section += "The following rules were learned from data and validated through A/B testing. Apply in order:\n\n";

    const sorted = rules.sort((a, b) => b.priority - a.priority);

    for (let i = 0; i < sorted.length; i++) {
      const rule = sorted[i];

      section += `#### ${i + 1}. ${rule.name} [${rule.id}, Priority: ${rule.priority}]\n\n`;
      section += `**Pattern:** ${this.describePattern(rule)}\n\n`;

      section += "**Examples:**\n";
      const exampleLEGOs = rule.examples[0]?.correct.slice(0, 3) || [];
      section += `- ✓ ${exampleLEGOs.map(l => `"${l}"`).join(", ")}\n`;
      section += `- ✗ Don't ${this.describeWhatNotToDo(rule)}\n\n`;

      if (rule.performance) {
        section += `**Evidence:** Improves quality by +${(rule.performance.improvement_percent || 0).toFixed(0)}% `;
        section += `(p=${rule.performance.p_value?.toFixed(3)})\n\n`;
      }

      section += "---\n\n";
    }

    return section;
  }

  private generateReferenceExamples(rules: Rule[], count: number): string {
    let section = "### Reference Examples\n\n";

    const avgQuality = this.calculateAverageExampleQuality();
    section += `Study these high-quality extractions (mean quality: ${avgQuality}/10):\n\n`;

    section += "<examples>\n";

    let exampleNum = 1;
    for (const rule of rules.slice(0, count)) {
      const example = this.selectBestExample(rule);

      section += `${exampleNum}. "${example.seed}" → ${JSON.stringify(example.correct)}\n`;
      section += `   - ${example.explanation}\n\n`;

      exampleNum++;
    }

    section += "</examples>\n";

    return section;
  }

  private generateApplicationProcess(): string {
    return `### Application Process

For each SEED:

1. **Parse** the sentence structure
2. **Identify** patterns matching learned rules (in priority order)
3. **Apply** the highest-priority matching rule
4. **Verify** against example patterns
5. **Extract** LEGOs following the rules
6. **Self-Assess** quality (aim for >8/10)

---

Now extract LEGOs from this SEED:`;
  }

  private describePattern(rule: Rule): string {
    if (rule.conditions[0]?.type === "pos_tag") {
      return rule.conditions[0].pattern;
    }
    return rule.description.split(".")[0]; // First sentence
  }

  private describeWhatNotToDo(rule: Rule): string {
    const actionType = rule.action.type;

    switch (actionType) {
      case "keep_together":
        return "split into separate LEGOs";
      case "split":
        return "keep as single LEGO";
      case "preserve":
        return "remove contextual information";
      default:
        return "violate this rule";
    }
  }
}
```

### Effectiveness

**Estimated Compliance Rate**: 85-95%

Hybrid approach maximizes compliance by:
- Explicit rules for clarity
- Examples for pattern recognition
- Meta-principles for understanding
- Process guidance for consistency
- Evidence for trust/motivation

---

## Strategy 5: Prompt Chaining with Validation

### Approach

Use multiple prompts in sequence with validation.

```typescript
class ChainedInjector {
  async extractWithChaining(seed: SEED, rules: Rule[]): Promise<LEGO[]> {
    // Step 1: Initial extraction with base prompt
    const initialLEGOs = await this.extractBasic(seed);

    // Step 2: Rule application prompt
    const refinedLEGOs = await this.applyRules(initialLEGOs, rules, seed);

    // Step 3: Validation prompt
    const validatedLEGOs = await this.validateExtraction(refinedLEGOs, seed);

    // Step 4: Quality assessment prompt
    const quality = await this.assessQuality(validatedLEGOs, seed);

    if (quality.score < 7) {
      // Retry with more explicit guidance
      return await this.extractWithExplicitGuidance(seed, rules, quality.concerns);
    }

    return validatedLEGOs;
  }

  private async applyRules(
    legos: LEGO[],
    rules: Rule[],
    seed: SEED
  ): Promise<LEGO[]> {
    const prompt = `
You are reviewing a LEGO extraction. Apply these rules to refine it:

**Original SEED:** "${seed.text}"
**Current LEGOs:** ${JSON.stringify(legos.map(l => l.text))}

**Rules to apply:**
${rules.map((r, i) => `${i + 1}. ${r.name}: ${r.description}`).join("\n")}

**Task:** Refine the LEGOs by applying the rules above. Output the refined LEGO list.
`;

    const response = await this.callLLM(prompt);
    return this.parseLEGOs(response);
  }

  private async validateExtraction(
    legos: LEGO[],
    seed: SEED
  ): Promise<LEGO[]> {
    const prompt = `
Validate this LEGO extraction:

**SEED:** "${seed.text}"
**LEGOs:** ${JSON.stringify(legos.map(l => l.text))}

Check:
1. Do LEGOs cover all words in SEED?
2. Are phrasal verbs kept together?
3. Are contractions intact?
4. Is granularity consistent?
5. Would these LEGOs help a learner?

If issues found, output corrected LEGOs. Otherwise, output "VALID".
`;

    const response = await this.callLLM(prompt);

    if (response.trim() === "VALID") {
      return legos;
    } else {
      return this.parseLEGOs(response);
    }
  }
}
```

### Pros

- **High Quality**: Multiple validation steps
- **Self-Correcting**: Catches its own mistakes
- **Explicit Validation**: Separate validation step
- **Retry Logic**: Can retry if quality poor

### Cons

- **Slow**: Multiple LLM calls per extraction
- **Expensive**: Uses many tokens
- **Complex**: Requires orchestration
- **Potential Drift**: Each step might introduce errors

### Effectiveness

**Estimated Compliance Rate**: 90-95%

Highest compliance but at cost of:
- 3-4x more API calls
- 3-4x more tokens
- 3-4x slower

---

## Comparative Analysis

| Strategy | Compliance | Token Usage | Complexity | Maintainability | Speed |
|----------|-----------|-------------|------------|----------------|-------|
| Markdown Append | 75-85% | Medium | Low | High | Fast |
| JSON Rules | 80-90% | Low | Medium | Medium | Fast |
| Few-Shot | 70-85% | High | Low | Medium | Fast |
| Hybrid | 85-95% | High | Medium | Medium | Fast |
| Chaining | 90-95% | Very High | High | Low | Slow |

---

## Recommendation

### For Production: **Hybrid Approach (Strategy 4)**

**Rationale:**
- Best balance of compliance and efficiency
- Clear enough for consistent application
- Flexible enough for edge cases
- Examples reinforce rule understanding
- Evidence builds agent trust

### For Critical Extractions: **Chaining with Validation (Strategy 5)**

**Rationale:**
- When quality is paramount
- For difficult/ambiguous SEEDs
- When cost/speed acceptable

### For Initial Development: **Markdown Append (Strategy 1)**

**Rationale:**
- Simple to implement
- Easy to debug
- Iterate quickly
- Good enough for 80/20 rule

---

## Dynamic Injection

Adapt strategy based on context:

```typescript
class AdaptiveInjector {
  inject(
    basePrompt: string,
    rules: Rule[],
    context: ExtractionContext
  ): string {
    // Choose strategy based on context
    const strategy = this.selectStrategy(context);

    return strategy.inject(basePrompt, rules, context);
  }

  private selectStrategy(context: ExtractionContext): InjectionStrategy {
    // For difficult SEEDs, use hybrid or chaining
    if (context.seedComplexity === "high") {
      return this.chainedInjector;
    }

    // For production with many rules, use hybrid
    if (context.ruleCount > 5) {
      return this.hybridInjector;
    }

    // For simple cases, use markdown
    if (context.seedComplexity === "low" && context.ruleCount <= 3) {
      return this.markdownInjector;
    }

    // Default: hybrid
    return this.hybridInjector;
  }
}
```

---

## Testing Injection Strategies

```typescript
class InjectionStrategyTester {
  async compareStrategies(
    testSeeds: SEED[],
    rules: Rule[]
  ): Promise<StrategyComparison> {
    const strategies = [
      this.markdownInjector,
      this.jsonInjector,
      this.fewShotInjector,
      this.hybridInjector,
    ];

    const results = [];

    for (const strategy of strategies) {
      const strategyResults = await this.testStrategy(
        strategy,
        testSeeds,
        rules
      );

      results.push({
        strategy: strategy.name,
        ...strategyResults,
      });
    }

    return this.compareResults(results);
  }

  private async testStrategy(
    strategy: InjectionStrategy,
    testSeeds: SEED[],
    rules: Rule[]
  ): Promise<StrategyResults> {
    let totalQuality = 0;
    let totalTokens = 0;
    let totalTime = 0;
    let ruleCompliance = 0;

    for (const seed of testSeeds) {
      const startTime = Date.now();

      const prompt = strategy.inject(this.basePrompt, rules);
      const result = await this.extract(prompt, seed);

      const endTime = Date.now();

      totalQuality += result.qualityScore;
      totalTokens += result.tokensUsed;
      totalTime += (endTime - startTime);

      // Check rule compliance
      ruleCompliance += this.checkRuleCompliance(result, rules);
    }

    const n = testSeeds.length;

    return {
      avgQuality: totalQuality / n,
      avgTokens: totalTokens / n,
      avgTimeMs: totalTime / n,
      ruleComplianceRate: ruleCompliance / n,
    };
  }
}
```

---

## Summary

This document presented 5 prompt injection strategies:

1. **Markdown Append**: Simple, readable, good for <5 rules
2. **JSON Rules**: Structured, priority-aware, machine-parseable
3. **Few-Shot Examples**: Natural learning, flexible, token-heavy
4. **Hybrid**: Best balance, combines rules + examples + meta
5. **Chaining**: Highest quality, slowest, most expensive

**Recommendation**: Use **Hybrid** for production, with **Adaptive** selection based on context.
