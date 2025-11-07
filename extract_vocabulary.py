#!/usr/bin/env python3
"""
Extract all Spanish vocabulary from lego_pairs.json up to a specified seed.
This creates a whitelist of exact Spanish forms for GATE compliance.
"""

import json
import sys

def extract_vocabulary(lego_pairs_path, up_to_seed):
    """Extract all Spanish words taught up to and including the specified seed."""

    with open(lego_pairs_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    vocabulary = set()
    seed_count = 0

    for seed in data['seeds']:
        seed_id = seed['seed_id']

        # Stop after reaching the target seed
        if seed_id == up_to_seed:
            seed_count += 1
            break

        seed_count += 1

        # Extract Spanish from each LEGO
        for lego in seed['legos']:
            target = lego['target']

            # Split multi-word LEGOs into individual words
            words = target.split()
            for word in words:
                # Remove punctuation but keep the word forms
                clean_word = word.strip('.,;:!?¿¡"\'')
                if clean_word:
                    vocabulary.add(clean_word)

    return sorted(vocabulary), seed_count

def main():
    lego_pairs_path = '/home/user/ssi-dashboard-v7/public/vfs/courses/spa_for_eng/lego_pairs.json'

    # Extract vocabulary up to S0025 (available for S0026)
    vocab_s0025, count = extract_vocabulary(lego_pairs_path, 'S0026')

    print(f"=== Vocabulary available through S0025 (for S0026) ===")
    print(f"Total seeds processed: {count}")
    print(f"Total unique Spanish words: {len(vocab_s0025)}")
    print(f"\nVocabulary list:")
    for word in vocab_s0025:
        print(f"  {word}")

    # Also save to a file for reference
    with open('/home/user/ssi-dashboard-v7/vocab_whitelist_s0025.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(vocab_s0025))

    print(f"\n✅ Vocabulary saved to vocab_whitelist_s0025.txt")

if __name__ == '__main__':
    main()
