#!/usr/bin/env python3
"""Show FULL CONTEXT for all FD violations"""

import json
from collections import defaultdict

# Load both files
with open('lego_pairs.tmp.json', 'r') as f:
    lego_data = json.load(f)

with open('seed_pairs.json', 'r') as f:
    seed_data = json.load(f)

print("=" * 100)
print("FD VIOLATIONS WITH FULL SEED CONTEXT")
print("=" * 100)
print()

# Build lookup: seed_id -> (target_sentence, known_sentence)
seed_lookup = {}
for seed_id, pair in seed_data['translations'].items():
    seed_lookup[seed_id] = pair

# Track all target word mappings with FULL context
word_mappings = defaultdict(list)  # target word -> [(seed_id, known, full_target, target_sentence, known_sentence)]

for seed in lego_data['seeds']:
    seed_id = seed[0]
    target_sentence, known_sentence = seed[1]
    legos = seed[2]

    for lego in legos:
        if lego[1] == 'B':  # Only BASE LEGOs
            target = lego[2]
            known = lego[3]

            # Extract first word for grouping (but keep full target too)
            target_word = target.strip().split()[0] if target.strip() else target

            word_mappings[target_word].append({
                'seed_id': seed_id,
                'lego_target': target,
                'lego_known': known,
                'target_sentence': target_sentence,
                'known_sentence': known_sentence
            })

# Find violations
violations = {}
for target_word, mappings in word_mappings.items():
    # Get unique known translations
    unique_knowns = set(m['lego_known'] for m in mappings)

    if len(unique_knowns) > 1:
        violations[target_word] = {
            'unique_knowns': list(unique_knowns),
            'count': len(unique_knowns),
            'mappings': mappings
        }

# Sort by severity (number of different translations)
sorted_violations = sorted(violations.items(), key=lambda x: x[1]['count'], reverse=True)

print(f"Total FD violations: {len(violations)}")
print()

# Categorize
trivial_caps = []
infinitive_issues = []
gerund_issues = []
real_problems = []

for target_word, info in sorted_violations:
    knowns = set(info['unique_knowns'])

    # Check if just capitalization
    lower_knowns = set(k.lower() for k in knowns)
    if len(lower_knowns) == 1:
        trivial_caps.append((target_word, info))
    # Check if infinitive variation
    elif any('to ' in k for k in knowns) and any('to ' not in k and not k.endswith('ing') for k in knowns):
        infinitive_issues.append((target_word, info))
    # Check if gerund variation
    elif any(k.endswith('ing') for k in knowns):
        gerund_issues.append((target_word, info))
    else:
        real_problems.append((target_word, info))

print(f"CATEGORIZATION:")
print(f"  Trivial (capitalization only): {len(trivial_caps)}")
print(f"  Infinitive variations: {len(infinitive_issues)}")
print(f"  Gerund variations: {len(gerund_issues)}")
print(f"  Real problems (polysemy, inconsistency): {len(real_problems)}")
print()

# Function to print violation with context
def print_violation_context(target_word, info, limit=None):
    print(f"{'='*100}")
    print(f"TARGET WORD: '{target_word}'")
    print(f"{'='*100}")
    print(f"Translations: {info['unique_knowns']}")
    print(f"Occurrences: {len(info['mappings'])}")
    print()

    # Group by known translation
    by_translation = defaultdict(list)
    for m in info['mappings']:
        by_translation[m['lego_known']].append(m)

    for known, examples in by_translation.items():
        print(f"  Translation: '{known}' ({len(examples)} occurrences)")
        print(f"  {'-'*96}")

        display_examples = examples[:limit] if limit else examples
        for ex in display_examples:
            print(f"    [{ex['seed_id']}]")
            print(f"    Target:  {ex['target_sentence']}")
            print(f"    Known:   {ex['known_sentence']}")
            print(f"    LEGO:    '{ex['lego_target']}' → '{ex['lego_known']}'")
            print()

        if limit and len(examples) > limit:
            print(f"    ... and {len(examples) - limit} more\n")
    print()

# Output files
output = {
    'trivial_caps': [],
    'infinitive_issues': [],
    'gerund_issues': [],
    'real_problems': []
}

# SECTION 1: TRIVIAL (CAPITALIZATION ONLY) - DON'T SHOW THESE, JUST COUNT
print("=" * 100)
print("SECTION 1: TRIVIAL VIOLATIONS (CAPITALIZATION ONLY)")
print("=" * 100)
print(f"Count: {len(trivial_caps)}")
print("These are NOT real problems - validator is wrong to flag these!")
print()
for target_word, info in trivial_caps:
    print(f"  - '{target_word}': {info['unique_knowns']}")
    output['trivial_caps'].append({
        'target_word': target_word,
        'translations': info['unique_knowns'],
        'occurrences': len(info['mappings'])
    })
print()

# SECTION 2: INFINITIVE VARIATIONS - SHOW FIRST 10 WITH FULL CONTEXT
print("=" * 100)
print("SECTION 2: INFINITIVE VARIATIONS")
print("=" * 100)
print(f"Count: {len(infinitive_issues)}")
print("These might be real issues - need to check if infinitive is actually required in context")
print()

for i, (target_word, info) in enumerate(infinitive_issues[:10]):
    print_violation_context(target_word, info, limit=3)
    output['infinitive_issues'].append({
        'target_word': target_word,
        'translations': info['unique_knowns'],
        'mappings': info['mappings']
    })
    if i >= 9:
        break

if len(infinitive_issues) > 10:
    print(f"... and {len(infinitive_issues) - 10} more infinitive issues")
    print()

# SECTION 3: GERUND VARIATIONS - SHOW FIRST 10 WITH FULL CONTEXT
print("=" * 100)
print("SECTION 3: GERUND VARIATIONS")
print("=" * 100)
print(f"Count: {len(gerund_issues)}")
print("These might be real issues - need to check if gerund/infinitive distinction matters")
print()

for i, (target_word, info) in enumerate(gerund_issues[:10]):
    print_violation_context(target_word, info, limit=3)
    output['gerund_issues'].append({
        'target_word': target_word,
        'translations': info['unique_knowns'],
        'mappings': info['mappings']
    })
    if i >= 9:
        break

if len(gerund_issues) > 10:
    print(f"... and {len(gerund_issues) - 10} more gerund issues")
    print()

# SECTION 4: REAL PROBLEMS - SHOW ALL WITH FULL CONTEXT
print("=" * 100)
print("SECTION 4: REAL PROBLEMS (POLYSEMY, INCONSISTENCY)")
print("=" * 100)
print(f"Count: {len(real_problems)}")
print("These are likely ACTUAL issues that need fixing")
print()

for target_word, info in real_problems:
    print_violation_context(target_word, info, limit=5)
    output['real_problems'].append({
        'target_word': target_word,
        'translations': info['unique_knowns'],
        'mappings': info['mappings']
    })

# Save to JSON for further analysis
with open('fd_violations_categorized.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print()
print("=" * 100)
print("SUMMARY")
print("=" * 100)
print(f"Total FD violations: {len(violations)}")
print(f"  - Trivial (caps): {len(trivial_caps)} ← IGNORE THESE")
print(f"  - Infinitive: {len(infinitive_issues)} ← REVIEW THESE")
print(f"  - Gerund: {len(gerund_issues)} ← REVIEW THESE")
print(f"  - Real problems: {len(real_problems)} ← FIX THESE")
print()
print("Full data saved to: fd_violations_categorized.json")
