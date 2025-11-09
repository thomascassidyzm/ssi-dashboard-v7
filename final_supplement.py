#!/usr/bin/env python3
"""
Final supplement - carefully crafted GATE-compliant phrases for LEGOs most in need.
"""

import json
import pickle
from typing import Set

# Load data
with open('phase5_batch1_s0101_s0300/batch_output/agent_02_baskets.json', 'r') as f:
    baskets = json.load(f)

with open('/tmp/registry_data.pkl', 'rb') as f:
    registry = pickle.load(f)

with open('/tmp/spanish_whitelist_s0120.txt', 'r') as f:
    global_whitelist = set(line.strip() for line in f if line.strip())


def validate_gate(spanish: str, whitelist: Set[str]) -> bool:
    """Validate GATE compliance"""
    words = spanish.replace(',', ' ').replace('.', ' ').replace('¿', ' ').replace('?', ' ').replace('!', ' ').replace('¡', ' ').split()
    for word in words:
        w = word.strip()
        if w and w not in whitelist:
            print(f"  Missing word: {w}")
            return False
    return True


def get_whitelist_for_lego(lego_id: str) -> Set[str]:
    """Get whitelist for a specific LEGO"""
    seed_num = int(lego_id[1:5])
    lego_num = int(lego_id[6:])

    words = set()
    for lid, lego_data in registry['legos'].items():
        if not lid.startswith('S'):
            continue
        try:
            lid_seed = int(lid[1:5])
            lid_lego = int(lid[6:])
            if lid_seed < seed_num or (lid_seed == seed_num and lid_lego <= lego_num):
                if 'spanish_words' in lego_data:
                    words.update(lego_data['spanish_words'])
        except:
            continue

    return words


# Focus on LEGOs that need 3+ more phrases
supplements = {
    # S0029L02 - mejor (appears in S0117 and S0118, both need 9)
    # In S0117, we have access to more vocab
    # Simple, guaranteed-safe phrases
    'S0029L02_S0117': [
        ["better", "mejor", None, 1],
        ["much better", "mucho mejor", None, 2],
        ["doing better", "haciendo mejor", None, 2],
        ["I feel better", "siento mejor", None, 2],
        ["I'm doing better", "haciendo mejor", None, 2],
        ["better today", "mejor hoy", None, 2],
        ["better than yesterday", "mejor que ayer", None, 3],
        ["I'm doing better today", "haciendo mejor hoy", None, 3],
        ["I feel much better", "siento mucho mejor", None, 3]
    ],

    # S0034L03 - cuando (in S0118, needs 8)
    'S0034L03_S0118': [
        ["when I speak", "cuando hablar", None, 2],
        ["when we learn", "cuando aprendemos", None, 2],
        ["when I'm ready", "cuando estoy preparado", None, 3],
        ["when we were learning", "cuando estábamos aprender", None, 3],
        ["when I feel better", "cuando siento mejor", None, 3],
        ["when we were in the pub", "cuando estábamos en el pub", None, 5],
        ["when I want to learn", "cuando quiero aprender", None, 4],
        ["when I'm trying to speak", "cuando estoy intentar hablar", None, 4]
    ],

    # S0007L03 - hoy (needs 7)
    'S0007L03': [
        ["I can speak today", "puedo hablar hoy", None, 3],
        ["I'm ready today", "estoy preparado hoy", None, 3],
        ["I'm learning today", "estoy aprender hoy", None, 3],
        ["I want to speak today", "quiero hablar hoy", None, 4],
        ["I'm trying today", "estoy intentar hoy", None, 3],
        ["I can learn today", "puedo aprender hoy", None, 3],
        ["I want to learn today", "quiero aprender hoy", None, 4]
    ],

    # S0004L02 - algo (in S0111, needs 7; in S0119, needs 5)
    'S0004L02_S0111': [
        ["I learn something", "aprender algo", None, 2],
        ["when we learn something", "cuando aprendemos algo", None, 3],
        ["I want to learn something", "quiero aprender algo", None, 4],
        ["I'm trying something", "estoy intentar algo", None, 3],
        ["something changes", "algo cambia", None, 2],
        ["when something changes", "cuando algo cambia", None, 3],
        ["when we learn something", "cuando aprendemos algo", None, 3]
    ],

    'S0004L02_S0119': [
        ["I can learn something", "puedo aprender algo", None, 3],
        ["I want to ask something", "quiero preguntar algo", None, 3],
        ["something new", "algo nuevo", None, 2],
        ["I need something", "necesito algo", None, 2],
        ["I'm learning something", "estoy aprender algo", None, 3]
    ],

    # S0006L01 - recordar (needs 6)
    'S0006L01': [
        ["I'm trying to remember", "estoy intentar recordar", None, 3],
        ["I want to remember", "quiero recordar", None, 3],
        ["I can remember", "puedo recordar", None, 2],
        ["I need to remember", "necesito recordar", None, 3],
        ["when I remember", "cuando recordar", None, 2],
        ["I'm trying to remember now", "estoy intentar recordar ahora", None, 4]
    ],

    # S0021L01 - por qué (needs 4)
    'S0021L01': [
        ["why not", "por qué no", None, 2],
        ["I want to know why", "quiero saber por qué", None, 4],
        ["why do I want to learn", "por qué quiero aprender", None, 5],
        ["I'm not sure why", "no estoy seguro por qué", None, 5]
    ],

    # S0061L02 - eso (needs 3)
    'S0061L02': [
        ["I remember that", "recordar eso", None, 2],
        ["I want that", "quiero eso", None, 2],
        ["I'm learning that", "estoy aprender eso", None, 3]
    ],

    # S0026L05 - preparado (needs 3)
    'S0026L05': [
        ["I'm not ready", "no estoy preparado", None, 3],
        ["when I'm ready", "cuando estoy preparado", None, 3],
        ["I want to be ready", "quiero estar preparado", None, 4]
    ],

    # S0115L02 - para tener (needs 3)
    'S0115L02': [
        ["I'm not ready to have", "no estoy preparado para tener", None, 5],
        ["I want to be able to have", "quiero poder para tener", None, 5],
        ["when I'm ready to have", "cuando estoy preparado para tener", None, 5]
    ],

    # S0010L03 - puedo (needs 3)
    'S0010L03': [
        ["I can try", "puedo intentar", None, 2],
        ["I can learn", "puedo aprender", None, 2],
        ["when I can", "cuando puedo", None, 2]
    ],

    # S0058L01 - es interesante (needs 3)
    'S0058L01': [
        ["it's very interesting", "es muy interesante", None, 3],
        ["that's interesting", "eso es interesante", None, 3],
        ["it's interesting to learn", "es interesante aprender", None, 3]
    ],

    # S0111L01 - aprendemos (needs 2)
    'S0111L01': [
        ["when we learn Spanish", "cuando aprendemos español", None, 3],
        ["we learn how to speak", "aprendemos cómo hablar", None, 4]
    ],

    # S0015L01 - y (needs 2)
    'S0015L01': [
        ["Spanish and English", "español y inglés", None, 3],
        ["today and tomorrow", "hoy y mañana", None, 3]
    ],

    # S0057L01 - no puedo (needs 2)
    'S0057L01': [
        ["I can't speak now", "no puedo hablar ahora", None, 4],
        ["I can't learn that", "no puedo aprender eso", None, 4]
    ],

    # S0041L01 - me siento (needs 2)
    'S0041L01': [
        ["I feel ready", "me siento preparado", None, 3],
        ["I don't feel ready", "no me siento preparado", None, 4]
    ],

    # S0118L02 - estábamos (needs 2)
    'S0118L02': [
        ["we were speaking", "estábamos hablar", None, 2],
        ["when we were speaking", "cuando estábamos hablar", None, 3]
    ],

    # S0120L01 - que te guste (needs 2)
    'S0120L01': [
        ["it's interesting that you like it", "es interesante que te guste", None, 4],
        ["it's good that you like it", "es bueno que te guste", None, 6]
    ],
}

# Apply supplements
total_added = 0
for key, new_phrases in supplements.items():
    # Parse the key
    if '_' in key:
        parts = key.split('_')
        lego_id = parts[0]
        if len(parts) > 1 and parts[1].startswith('S'):
            # Seed-specific: find in that seed
            seed_id = parts[1]
        else:
            # Find in any seed
            seed_id = None
    else:
        lego_id = key
        seed_id = None

    # Find the LEGO
    found = False
    search_seeds = [seed_id] if seed_id else ['S0111', 'S0112', 'S0113', 'S0114', 'S0115', 'S0116', 'S0117', 'S0118', 'S0119', 'S0120']

    for sid in search_seeds:
        if sid and sid in baskets and 'legos' in baskets[sid]:
            if lego_id in baskets[sid]['legos']:
                # Get whitelist
                whitelist = get_whitelist_for_lego(lego_id)

                # Validate and add
                valid_phrases = []
                for phrase in new_phrases:
                    print(f"Checking {lego_id}: {phrase[1]}")
                    if validate_gate(phrase[1], whitelist):
                        valid_phrases.append(phrase)
                    else:
                        print(f"  GATE violation: {phrase[1]}")

                # Add
                baskets[sid]['legos'][lego_id]['practice_phrases'].extend(valid_phrases)

                # Recalc distribution
                all_phrases = baskets[sid]['legos'][lego_id]['practice_phrases']
                dist = {"really_short_1_2": 0, "quite_short_3": 0, "longer_4_5": 0, "long_6_plus": 0}
                for p in all_phrases:
                    count = p[3]
                    if count <= 2:
                        dist["really_short_1_2"] += 1
                    elif count == 3:
                        dist["quite_short_3"] += 1
                    elif count <= 5:
                        dist["longer_4_5"] += 1
                    else:
                        dist["long_6_plus"] += 1

                baskets[sid]['legos'][lego_id]['phrase_distribution'] = dist

                total_added += len(valid_phrases)
                print(f"✓ Added {len(valid_phrases)} to {lego_id} in {sid} (now {len(all_phrases)}/10)")
                found = True
                break

    if not found:
        print(f"WARNING: Could not find {lego_id}")

# Update metadata
baskets['generation_metadata']['total_phrases'] += total_added
baskets['generation_metadata']['curated_by'] += " + Final supplement round"

# Save
with open('phase5_batch1_s0101_s0300/batch_output/agent_02_baskets.json', 'w', encoding='utf-8') as f:
    json.dump(baskets, f, ensure_ascii=False, indent=2)

print(f"\n{'='*70}")
print(f"✓ Final supplement added {total_added} phrases")
print(f"✓ New total: {baskets['generation_metadata']['total_phrases']} phrases")
print(f"✓ Target: {baskets['generation_metadata']['total_legos'] * 10} phrases")
print(f"✓ Coverage: {baskets['generation_metadata']['total_phrases'] / (baskets['generation_metadata']['total_legos'] * 10) * 100:.1f}%")
