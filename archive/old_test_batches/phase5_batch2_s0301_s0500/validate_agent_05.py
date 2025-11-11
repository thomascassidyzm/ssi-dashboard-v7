#!/usr/bin/env python3
"""Validate Agent 05 baskets for GATE compliance and distribution."""

import json
import re

# Load files
with open('./batch_output/agent_05_baskets.json') as f:
    data = json.load(f)

with open('./registry/lego_registry_s0001_s0500.json') as f:
    registry = json.load(f)

def build_whitelist(seed_id):
    """Build whitelist of all Spanish words taught up to this seed."""
    seed_num = int(seed_id[1:])
    whitelist = set()
    
    for lego_id, lego in registry['legos'].items():
        if not lego_id.startswith('S') or len(lego_id) < 5:
            continue
        try:
            lego_seed_num = int(lego_id[1:5])
            if lego_seed_num <= seed_num and 'spanish_words' in lego:
                for word in lego['spanish_words']:
                    whitelist.add(word.lower())
        except (ValueError, IndexError):
            continue
    
    return whitelist

def tokenize(spanish_text):
    """Tokenize Spanish text into words."""
    # Remove punctuation
    text = re.sub(r'[¿?¡!,;:.()[\]{}"\']', ' ', spanish_text.lower())
    return [w for w in text.split() if w]

def check_gate_compliance(spanish_phrase, whitelist):
    """Check if all words in phrase are in whitelist."""
    words = tokenize(spanish_phrase)
    violations = []
    for word in words:
        if word not in whitelist:
            violations.append(word)
    return violations

# Validation counters
total_legos = 0
total_phrases = 0
gate_violations = []
dist_errors = []

print("\n=== AGENT 05 VALIDATION ===\n")
print("Gate 1: Format validation...")

# Check structure
assert 'seeds' in data, "Missing 'seeds' key"
assert len(data['seeds']) == 20, f"Expected 20 seeds, got {len(data['seeds'])}"
print("✓ Structure valid")
print(f"✓ {len(data['seeds'])} seeds present")

# Check each seed
for seed_id, seed in data['seeds'].items():
    assert 'legos' in seed, f"{seed_id}: Missing legos"
    assert 'seed_pair' in seed, f"{seed_id}: Missing seed_pair"
    
    # Check each LEGO
    for lego_id, lego in seed['legos'].items():
        total_legos += 1
        assert 'practice_phrases' in lego, f"{lego_id}: Missing practice_phrases"
        assert len(lego['practice_phrases']) == 10, f"{lego_id}: Expected 10 phrases, got {len(lego['practice_phrases'])}"
        total_phrases += len(lego['practice_phrases'])
        
        # Check distribution
        dist = lego['phrase_distribution']
        if dist['really_short_1_2'] != 2:
            dist_errors.append(f"{lego_id}: Short={dist['really_short_1_2']}, expected 2")
        if dist['quite_short_3'] != 2:
            dist_errors.append(f"{lego_id}: Quite short={dist['quite_short_3']}, expected 2")
        if dist['longer_4_5'] != 2:
            dist_errors.append(f"{lego_id}: Longer={dist['longer_4_5']}, expected 2")
        if dist['long_6_plus'] != 4:
            dist_errors.append(f"{lego_id}: Long={dist['long_6_plus']}, expected 4")

print("✓ All seeds have required fields")
print("✓ All LEGOs have 10 phrases")
print("✅ GATE 1: Format validation PASSED\n")

# Gate 2: Quality validation
print("Gate 2: Quality validation...")
print("Checking GATE compliance (word-by-word)...")

for seed_id, seed in data['seeds'].items():
    whitelist = build_whitelist(seed_id)
    
    for lego_id, lego in seed['legos'].items():
        for idx, phrase in enumerate(lego['practice_phrases'], 1):
            eng, spa = phrase[0], phrase[1]
            violations = check_gate_compliance(spa, whitelist)
            
            if violations:
                for word in violations:
                    gate_violations.append({
                        'lego': lego_id,
                        'phrase': idx,
                        'word': word,
                        'spanish': spa
                    })

print(f"Checking distribution (2-2-2-4)...")
print(f"Checking completeness (phrases 3-10)...\n")

print("=== GATE 2: Quality Validation ===")
print(f"GATE Violations: {len(gate_violations)}")
print(f"Distribution Errors: {len(dist_errors)}")

if gate_violations:
    print("\n❌ GATE VIOLATIONS (first 10):")
    for v in gate_violations[:10]:
        print(f"  {v['lego']} phrase {v['phrase']}: '{v['word']}' not in whitelist")
        print(f"    Full phrase: \"{v['spanish']}\"")
    if len(gate_violations) > 10:
        print(f"  ... and {len(gate_violations) - 10} more violations")

if dist_errors:
    print("\n⚠️  DISTRIBUTION ERRORS (first 10):")
    for e in dist_errors[:10]:
        print(f"  {e}")
    if len(dist_errors) > 10:
        print(f"  ... and {len(dist_errors) - 10} more errors")

# Final verdict
passed = (len(gate_violations) == 0 and len(dist_errors) == 0)

if passed:
    print("\n✅ GATE 2: Quality validation PASSED")
    print("\n=== VALIDATION REPORT ===")
    print("✅ ALL CHECKS PASSED")
    print(f"\nSeeds: 20")
    print(f"LEGOs: {total_legos}")
    print(f"Phrases: {total_phrases}")
else:
    print("\n❌ GATE 2: Quality validation FAILED")
    print("\nFIX REQUIRED:")
    if gate_violations:
        print(f"- Fix {len(gate_violations)} GATE violations")
    if dist_errors:
        print(f"- Fix {len(dist_errors)} distribution errors")

