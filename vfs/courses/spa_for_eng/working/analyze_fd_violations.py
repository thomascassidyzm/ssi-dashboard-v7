#!/usr/bin/env python3
"""Analyze FD violations in detail"""

import json
from collections import defaultdict

# Load the lego pairs
with open('lego_pairs.tmp.json', 'r') as f:
    data = json.load(f)

print("=" * 80)
print("FUNCTIONAL DETERMINISM (FD) VIOLATION ANALYSIS")
print("=" * 80)
print()

# Track all target word mappings
word_mappings = defaultdict(list)  # target word -> [(seed_id, known_translation)]

for seed in data['seeds']:
    seed_id = seed[0]
    legos = seed[2]

    for lego in legos:
        lego_type = lego[1]
        target = lego[2]
        known = lego[3]

        if lego_type == 'B':  # Only BASE LEGOs for FD analysis
            # Extract first word from target
            target_word = target.strip().split()[0] if target.strip() else target
            word_mappings[target_word].append((seed_id, known, target))

# Find violations
violations = {}
for target_word, mappings in word_mappings.items():
    # Get unique known translations
    unique_knowns = set(m[1] for m in mappings)

    if len(unique_knowns) > 1:
        violations[target_word] = {
            'known_translations': list(unique_knowns),
            'count': len(unique_knowns),
            'examples': mappings[:5]  # First 5 examples
        }

print(f"Total BASE LEGOs analyzed: {sum(len(m) for m in word_mappings.values())}")
print(f"Unique target words: {len(word_mappings)}")
print(f"FD violations: {len(violations)}")
print()

# Sort by number of different translations
sorted_violations = sorted(violations.items(), key=lambda x: x[1]['count'], reverse=True)

print("=" * 80)
print("TOP 30 FD VIOLATIONS (by number of different translations)")
print("=" * 80)
print()

for i, (target_word, info) in enumerate(sorted_violations[:30], 1):
    print(f"{i}. '{target_word}' → {info['count']} different translations")
    print(f"   Translations: {info['known_translations']}")
    print(f"   Examples:")
    for seed_id, known, full_target in info['examples']:
        print(f"     - [{seed_id}] '{full_target}' → '{known}'")
    print()

# Analyze specific patterns
print("=" * 80)
print("ANALYSIS: Why do these FD violations occur?")
print("=" * 80)
print()

# Case 1: Infinitive vs. conjugated forms
print("1. INFINITIVE vs. CONJUGATED FORMS")
print("-" * 40)
infinitive_issues = []
for target_word, info in violations.items():
    knowns = info['known_translations']
    # Check if it's infinitive variation (e.g., "to X" vs "X")
    if any('to ' in k for k in knowns) and any('to ' not in k for k in knowns):
        infinitive_issues.append((target_word, info))

print(f"Found {len(infinitive_issues)} verbs with infinitive/conjugated variations")
for target_word, info in infinitive_issues[:10]:
    print(f"  '{target_word}': {info['known_translations']}")
print()

# Case 2: Gerund variations
print("2. GERUND vs. OTHER FORMS")
print("-" * 40)
gerund_issues = []
for target_word, info in violations.items():
    knowns = info['known_translations']
    # Check if it's gerund variation (e.g., "speaking" vs "to speak")
    if any(k.endswith('ing') for k in knowns) and any(not k.endswith('ing') for k in knowns):
        gerund_issues.append((target_word, info))

print(f"Found {len(gerund_issues)} verbs with gerund variations")
for target_word, info in gerund_issues[:10]:
    print(f"  '{target_word}': {info['known_translations']}")
print()

# Case 3: Capitalization
print("3. CAPITALIZATION DIFFERENCES")
print("-" * 40)
cap_issues = []
for target_word, info in violations.items():
    knowns = info['known_translations']
    # Check if difference is just capitalization
    lower_set = set(k.lower() for k in knowns)
    if len(lower_set) < len(knowns):
        cap_issues.append((target_word, info))

print(f"Found {len(cap_issues)} words with capitalization-only differences")
for target_word, info in cap_issues[:10]:
    print(f"  '{target_word}': {info['known_translations']}")
print()

# Case 4: Context-dependent (true polysemy)
print("4. TRUE POLYSEMY (context-dependent meanings)")
print("-" * 40)
polysemy_issues = []
for target_word, info in violations.items():
    knowns = set(k.lower().replace('to ', '').strip() for k in info['known_translations'])
    # If still multiple meanings after normalization, it's true polysemy
    if len(knowns) > 1 and target_word not in [t for t, _ in infinitive_issues] and target_word not in [t for t, _ in gerund_issues]:
        polysemy_issues.append((target_word, info))

print(f"Found {len(polysemy_issues)} words with true polysemy")
for target_word, info in polysemy_issues[:15]:
    print(f"  '{target_word}': {info['known_translations']}")
    for seed_id, known, full_target in info['examples'][:3]:
        print(f"     - [{seed_id}] '{full_target}' → '{known}'")
print()

print("=" * 80)
print("SUMMARY")
print("=" * 80)
print(f"Total FD violations: {len(violations)}")
print(f"  - Infinitive/conjugated variations: {len(infinitive_issues)}")
print(f"  - Gerund variations: {len(gerund_issues)}")
print(f"  - Capitalization only: {len(cap_issues)}")
print(f"  - True polysemy: {len(polysemy_issues)}")
print()
print("RECOMMENDATION:")
print("- Infinitive/gerund/capitalization differences: Normalize to most common form")
print("- True polysemy: These need to be made into COMPOSITE LEGOs with context")
print()
