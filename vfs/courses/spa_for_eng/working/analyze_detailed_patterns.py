#!/usr/bin/env python3
"""Detailed pattern analysis of LEGO decompositions"""

import json
from collections import defaultdict

# Load the lego pairs
with open('lego_pairs.tmp.json', 'r') as f:
    data = json.load(f)

print("=" * 80)
print("DETAILED PATTERN ANALYSIS")
print("=" * 80)
print()

# Analyze composites with feeders
composites_with_feeders = []
composites_without_feeders = []

for seed in data['seeds']:
    seed_id = seed[0]
    legos = seed[2]

    for lego in legos:
        if lego[1] == 'C':
            target = lego[2]
            known = lego[3]
            components = lego[4] if len(lego) > 4 else []

            # Check if any components have feeder references
            has_feeder = False
            feeder_refs = []
            for comp in components:
                if len(comp) == 3:  # Has feeder reference
                    has_feeder = True
                    feeder_refs.append(comp)

            if has_feeder:
                composites_with_feeders.append({
                    'seed_id': seed_id,
                    'target': target,
                    'known': known,
                    'components': components,
                    'feeder_refs': feeder_refs
                })
            else:
                composites_without_feeders.append({
                    'seed_id': seed_id,
                    'target': target,
                    'known': known,
                    'components': components
                })

print(f"COMPOSITE LEGOs with feeders: {len(composites_with_feeders)}")
print(f"COMPOSITE LEGOs without feeders: {len(composites_without_feeders)}")
print()

print("=" * 80)
print("COMPOSITES WITH FEEDERS (first 20 examples)")
print("=" * 80)
for i, ex in enumerate(composites_with_feeders[:20], 1):
    print(f"\n{i}. [{ex['seed_id']}] '{ex['target']}' → '{ex['known']}'")
    print(f"   Components:")
    for comp in ex['components']:
        if len(comp) == 2:
            print(f"     - '{comp[0]}' → '{comp[1]}'")
        elif len(comp) == 3:
            print(f"     - '{comp[0]}' → '{comp[1]}' [FEEDER: {comp[2]}]")

print("\n" + "=" * 80)
print("COMPOSITES WITHOUT FEEDERS (first 20 examples)")
print("=" * 80)
for i, ex in enumerate(composites_without_feeders[:20], 1):
    print(f"\n{i}. [{ex['seed_id']}] '{ex['target']}' → '{ex['known']}'")
    print(f"   Components:")
    for comp in ex['components']:
        print(f"     - '{comp[0]}' → '{comp[1]}'")

# Analyze article patterns
print("\n" + "=" * 80)
print("ARTICLE PATTERNS")
print("=" * 80)
article_composites = []
articles = ['un', 'una', 'el', 'la', 'los', 'las']

for seed in data['seeds']:
    seed_id = seed[0]
    legos = seed[2]

    for lego in legos:
        if lego[1] == 'C':
            target = lego[2]
            known = lego[3]
            components = lego[4] if len(lego) > 4 else []

            # Check if first component is an article
            if components and any(components[0][0].lower() in articles for comp in [components[0]]):
                article_composites.append({
                    'seed_id': seed_id,
                    'target': target,
                    'known': known,
                    'components': components
                })

print(f"Composites with articles: {len(article_composites)}")
print(f"\nFirst 15 examples:")
for i, ex in enumerate(article_composites[:15], 1):
    print(f"{i}. [{ex['seed_id']}] '{ex['target']}' → '{ex['known']}'")
    for comp in ex['components']:
        if len(comp) >= 2:
            print(f"     - '{comp[0]}' → '{comp[1]}'")

# Analyze verb constructions
print("\n" + "=" * 80)
print("VERB CONSTRUCTION PATTERNS")
print("=" * 80)

# Progressive (estar + gerund)
progressive = []
for seed in data['seeds']:
    seed_id = seed[0]
    legos = seed[2]

    for lego in legos:
        if lego[1] == 'C':
            target = lego[2]
            known = lego[3]
            if 'estoy' in target.lower() or 'está' in target.lower() or 'estás' in target.lower():
                progressive.append({
                    'seed_id': seed_id,
                    'target': target,
                    'known': known,
                    'components': lego[4] if len(lego) > 4 else []
                })

print(f"\nProgressive constructions (estar + gerund): {len(progressive)}")
for i, ex in enumerate(progressive[:10], 1):
    print(f"{i}. [{ex['seed_id']}] '{ex['target']}' → '{ex['known']}'")
    for comp in ex['components']:
        if len(comp) >= 2:
            print(f"     - '{comp[0]}' → '{comp[1]}'")

# Future periphrastic (ir a + infinitive)
future = []
for seed in data['seeds']:
    seed_id = seed[0]
    legos = seed[2]

    for lego in legos:
        if lego[1] == 'C':
            target = lego[2]
            known = lego[3]
            if ('voy a' in target.lower() or 'va a' in target.lower() or
                'vas a' in target.lower() or 'van a' in target.lower()):
                future.append({
                    'seed_id': seed_id,
                    'target': target,
                    'known': known,
                    'components': lego[4] if len(lego) > 4 else []
                })

print(f"\nFuture periphrastic (ir a + infinitive): {len(future)}")
for i, ex in enumerate(future[:10], 1):
    print(f"{i}. [{ex['seed_id']}] '{ex['target']}' → '{ex['known']}'")
    for comp in ex['components']:
        if len(comp) >= 2:
            print(f"     - '{comp[0]}' → '{comp[1]}'")

# Negations
negations = []
for seed in data['seeds']:
    seed_id = seed[0]
    legos = seed[2]

    for lego in legos:
        if lego[1] == 'C':
            target = lego[2]
            known = lego[3]
            if target.lower().startswith('no '):
                negations.append({
                    'seed_id': seed_id,
                    'target': target,
                    'known': known,
                    'components': lego[4] if len(lego) > 4 else []
                })

print(f"\nNegations (No + ...): {len(negations)}")
for i, ex in enumerate(negations[:15], 1):
    print(f"{i}. [{ex['seed_id']}] '{ex['target']}' → '{ex['known']}'")
    for comp in ex['components']:
        if len(comp) >= 2:
            print(f"     - '{comp[0]}' → '{comp[1]}'")

# Analyze preposition patterns
print("\n" + "=" * 80)
print("PREPOSITION PATTERNS")
print("=" * 80)

prep_composites = []
preps = ['a', 'de', 'en', 'con', 'por', 'para', 'sobre', 'sin']

for seed in data['seeds']:
    seed_id = seed[0]
    legos = seed[2]

    for lego in legos:
        if lego[1] == 'C':
            target = lego[2]
            known = lego[3]
            components = lego[4] if len(lego) > 4 else []

            # Check if any component is a preposition
            if components:
                for comp in components:
                    if comp[0].lower() in preps:
                        prep_composites.append({
                            'seed_id': seed_id,
                            'target': target,
                            'known': known,
                            'components': components,
                            'prep': comp[0]
                        })
                        break

print(f"Composites containing prepositions: {len(prep_composites)}")
print(f"\nFirst 20 examples:")
for i, ex in enumerate(prep_composites[:20], 1):
    print(f"{i}. [{ex['seed_id']}] '{ex['target']}' → '{ex['known']}' [prep: {ex['prep']}]")
    for comp in ex['components']:
        if len(comp) >= 2:
            print(f"     - '{comp[0]}' → '{comp[1]}'")

# Analyze subjunctive patterns
print("\n" + "=" * 80)
print("SUBJUNCTIVE PATTERNS (que + subjunctive verb)")
print("=" * 80)

subjunctive = []
for seed in data['seeds']:
    seed_id = seed[0]
    legos = seed[2]

    for lego in legos:
        if lego[1] == 'C':
            target = lego[2]
            known = lego[3]
            if target.lower().startswith('que ') and len(target.split()) == 2:
                subjunctive.append({
                    'seed_id': seed_id,
                    'target': target,
                    'known': known,
                    'components': lego[4] if len(lego) > 4 else []
                })

print(f"Subjunctive constructions (que + verb): {len(subjunctive)}")
for i, ex in enumerate(subjunctive[:15], 1):
    print(f"{i}. [{ex['seed_id']}] '{ex['target']}' → '{ex['known']}'")
    for comp in ex['components']:
        if len(comp) >= 2:
            print(f"     - '{comp[0]}' → '{comp[1]}'")

print("\n" + "=" * 80)
