#!/usr/bin/env python3
"""
Validate GATE compliance for Agent 20 baskets
"""

import json

def load_json(path):
    with open(path, 'r') as f:
        return json.load(f)

def build_whitelist(registry):
    """Build whitelist of all Spanish words"""
    whitelist = set()
    for lego_id, lego_data in registry['legos'].items():
        if 'spanish_words' in lego_data:
            whitelist.update(lego_data['spanish_words'])
    return whitelist

def tokenize_spanish(phrase):
    """Tokenize Spanish phrase"""
    # Remove punctuation and convert to lowercase
    cleaned = phrase.lower().replace('.', '').replace(',', '').replace('?', '').replace('¿', '').replace('!', '').replace('¡', '')
    return [w for w in cleaned.split() if w]

def validate_baskets(baskets_path, registry_path):
    baskets = load_json(baskets_path)
    registry = load_json(registry_path)
    whitelist = build_whitelist(registry)

    print(f"Whitelist size: {len(whitelist)} words\n")

    violations = []
    total_phrases = 0

    for key, value in baskets.items():
        if not key.startswith('S'):
            continue

        lego_id = key
        if 'practice_phrases' not in value:
            continue

        for idx, phrase in enumerate(value['practice_phrases'], 1):
            total_phrases += 1
            english = phrase[0]
            spanish = phrase[1]

            words = tokenize_spanish(spanish)
            for word in words:
                if word not in whitelist:
                    violations.append({
                        'lego_id': lego_id,
                        'phrase_num': idx,
                        'english': english,
                        'spanish': spanish,
                        'violation': word
                    })

    print(f"Total phrases checked: {total_phrases}")
    print(f"Violations found: {len(violations)}\n")

    if violations:
        print("GATE COMPLIANCE VIOLATIONS:")
        for v in violations[:20]:  # Show first 20
            print(f"  {v['lego_id']} phrase {v['phrase_num']}: '{v['violation']}' not in whitelist")
            print(f"    EN: {v['english']}")
            print(f"    ES: {v['spanish']}")
            print()
    else:
        print("✅ ALL PHRASES ARE GATE COMPLIANT!")

    return len(violations) == 0

if __name__ == "__main__":
    baskets_path = "/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300/batch_output/agent_20_baskets.json"
    registry_path = "/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300/registry/lego_registry_s0001_s0300.json"

    is_valid = validate_baskets(baskets_path, registry_path)
    exit(0 if is_valid else 1)
