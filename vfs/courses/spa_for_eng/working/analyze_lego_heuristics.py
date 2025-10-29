#!/usr/bin/env python3
"""Analyze actual LEGO decomposition heuristics from lego_pairs.tmp.json"""

import json
from collections import defaultdict, Counter

# Load the lego pairs
with open('lego_pairs.tmp.json', 'r') as f:
    data = json.load(f)

# Statistics
stats = {
    'total_seeds': len(data['seeds']),
    'total_legos': 0,
    'base_legos': 0,
    'composite_legos': 0,
    'base_patterns': Counter(),
    'composite_patterns': Counter(),
    'word_mappings': defaultdict(set),  # target word -> set of known translations
    'composite_constructions': [],
    'base_examples': [],
    'composite_examples': []
}

# Analyze each seed
for seed in data['seeds']:
    seed_id = seed[0]
    target_sentence, known_sentence = seed[1]
    legos = seed[2]

    stats['total_legos'] += len(legos)

    for lego in legos:
        lego_id = lego[0]
        lego_type = lego[1]
        target = lego[2]
        known = lego[3]

        if lego_type == 'B':
            stats['base_legos'] += 1

            # Track word count patterns
            target_words = len(target.split())
            known_words = len(known.split())
            stats['base_patterns'][(target_words, known_words)] += 1

            # Track mappings
            stats['word_mappings'][target].add(known)

            # Collect examples
            if len(stats['base_examples']) < 50:
                stats['base_examples'].append({
                    'seed_id': seed_id,
                    'target': target,
                    'known': known,
                    'target_words': target_words,
                    'known_words': known_words
                })

        elif lego_type == 'C':
            stats['composite_legos'] += 1

            # Track word count patterns
            target_words = len(target.split())
            known_words = len(known.split())
            stats['composite_patterns'][(target_words, known_words)] += 1

            # Get components
            components = lego[4] if len(lego) > 4 else []

            # Collect examples
            if len(stats['composite_examples']) < 50:
                stats['composite_examples'].append({
                    'seed_id': seed_id,
                    'target': target,
                    'known': known,
                    'target_words': target_words,
                    'known_words': known_words,
                    'num_components': len(components),
                    'components': components
                })

# Find FD violations (one target word mapping to multiple known translations)
fd_violations = {}
for target, knowns in stats['word_mappings'].items():
    if len(knowns) > 1:
        fd_violations[target] = list(knowns)

# Print analysis
print("=" * 80)
print("LEGO DECOMPOSITION HEURISTICS ANALYSIS")
print("=" * 80)
print()

print(f"Total Seeds: {stats['total_seeds']}")
print(f"Total LEGOs: {stats['total_legos']}")
print(f"  BASE LEGOs: {stats['base_legos']} ({stats['base_legos']/stats['total_legos']*100:.1f}%)")
print(f"  COMPOSITE LEGOs: {stats['composite_legos']} ({stats['composite_legos']/stats['total_legos']*100:.1f}%)")
print()

print("=" * 80)
print("BASE LEGO PATTERNS (by word count)")
print("=" * 80)
print("(Target words, Known words) -> Count")
for pattern, count in stats['base_patterns'].most_common(10):
    print(f"  {pattern}: {count}")
print()

print("=" * 80)
print("COMPOSITE LEGO PATTERNS (by word count)")
print("=" * 80)
print("(Target words, Known words) -> Count")
for pattern, count in stats['composite_patterns'].most_common(10):
    print(f"  {pattern}: {count}")
print()

print("=" * 80)
print("BASE LEGO EXAMPLES (first 30)")
print("=" * 80)
for i, ex in enumerate(stats['base_examples'][:30], 1):
    print(f"{i}. [{ex['seed_id']}] '{ex['target']}' → '{ex['known']}' ({ex['target_words']}→{ex['known_words']} words)")
print()

print("=" * 80)
print("COMPOSITE LEGO EXAMPLES (first 30)")
print("=" * 80)
for i, ex in enumerate(stats['composite_examples'][:30], 1):
    print(f"{i}. [{ex['seed_id']}] '{ex['target']}' → '{ex['known']}' ({ex['target_words']}→{ex['known_words']} words, {ex['num_components']} components)")
    for comp in ex['components']:
        if len(comp) == 2:
            print(f"     - '{comp[0]}' → '{comp[1]}'")
        elif len(comp) == 3:
            print(f"     - '{comp[0]}' → '{comp[1]}' [ref: {comp[2]}]")
print()

print("=" * 80)
print("FUNCTIONAL DETERMINISM VIOLATIONS (first 20)")
print("=" * 80)
print("Target words that map to multiple known translations:")
for i, (target, knowns) in enumerate(list(fd_violations.items())[:20], 1):
    print(f"{i}. '{target}' → {knowns}")
print(f"\nTotal FD violations: {len(fd_violations)}")
print()

# Analyze specific patterns
print("=" * 80)
print("PATTERN ANALYSIS")
print("=" * 80)

# Articles
articles = ['un', 'una', 'el', 'la', 'los', 'las']
article_examples = []
for ex in stats['base_examples']:
    if ex['target'].lower() in articles:
        article_examples.append(ex)

print(f"\n1. ARTICLES as standalone BASE LEGOs: {len(article_examples)}")
for ex in article_examples[:5]:
    print(f"   - '{ex['target']}' → '{ex['known']}'")

# Prepositions
prepositions = ['a', 'de', 'en', 'con', 'por', 'para']
prep_examples = []
for ex in stats['base_examples']:
    if ex['target'].lower() in prepositions:
        prep_examples.append(ex)

print(f"\n2. PREPOSITIONS as standalone BASE LEGOs: {len(prep_examples)}")
for ex in prep_examples[:5]:
    print(f"   - '{ex['target']}' → '{ex['known']}'")

# Auxiliaries
aux_patterns = ['estoy', 'estás', 'está', 'estamos', 'están', 'voy', 'vas', 'va', 'vamos', 'van']
aux_in_composite = []
aux_standalone = []
for ex in stats['composite_examples']:
    if any(aux in ex['target'].lower() for aux in aux_patterns):
        aux_in_composite.append(ex)
for ex in stats['base_examples']:
    if any(aux in ex['target'].lower() for aux in aux_patterns):
        aux_standalone.append(ex)

print(f"\n3. AUXILIARIES:")
print(f"   - In COMPOSITE: {len(aux_in_composite)}")
for ex in aux_in_composite[:3]:
    print(f"     '{ex['target']}' → '{ex['known']}'")
print(f"   - Standalone BASE: {len(aux_standalone)}")
for ex in aux_standalone[:3]:
    print(f"     '{ex['target']}' → '{ex['known']}'")

# Negations
neg_patterns = ['no', 'nunca', 'nada', 'nadie']
neg_in_composite = []
neg_standalone = []
for ex in stats['composite_examples']:
    if any(ex['target'].lower().startswith(neg) for neg in neg_patterns):
        neg_in_composite.append(ex)
for ex in stats['base_examples']:
    if ex['target'].lower() in neg_patterns:
        neg_standalone.append(ex)

print(f"\n4. NEGATIONS:")
print(f"   - In COMPOSITE: {len(neg_in_composite)}")
for ex in neg_in_composite[:5]:
    print(f"     '{ex['target']}' → '{ex['known']}'")
print(f"   - Standalone BASE: {len(neg_standalone)}")
for ex in neg_standalone[:3]:
    print(f"     '{ex['target']}' → '{ex['known']}'")

print()
print("=" * 80)
