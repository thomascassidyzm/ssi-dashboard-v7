#!/usr/bin/env python3
"""
Build whitelist of Spanish words from registry for GATE compliance
"""

import json
import re

def extract_spanish_words(text: str) -> list:
    """Extract individual Spanish words from text."""
    words = re.sub(r'[¿?¡!,;:.()[\]{}""«»]', ' ', text.lower())
    words = [w.strip() for w in words.split() if w.strip()]
    return words

# Load registry
print("Loading registry...")
with open('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/registry/lego_registry_s0001_s0500.json', 'r', encoding='utf-8') as f:
    registry = json.load(f)

# Build whitelist for all seeds up to S0500
whitelist = set()
word_sources = {}  # Track where each word came from

# Get LEGOs from registry
if 'legos' in registry:
    legos_dict = registry['legos']

    for lego_id, lego_data in legos_dict.items():
        # Extract seed number from lego_id (e.g., S0481L01 -> 481)
        if lego_id.startswith('S'):
            seed_num = int(lego_id[1:5])  # Extract SXXXX
            if seed_num > 500:
                continue

            if 'target' in lego_data:
                words = extract_spanish_words(lego_data['target'])
                for word in words:
                    whitelist.add(word)
                    if word not in word_sources:
                        word_sources[word] = []
                    word_sources[word].append(lego_id)

print(f"\nTotal unique Spanish words taught (S0001-S0500): {len(whitelist)}")
print(f"\nWhitelist saved to: whitelist_s0001_s0500.json")

# Save whitelist
whitelist_data = {
    "range": "S0001-S0500",
    "total_words": len(whitelist),
    "words": sorted(list(whitelist)),
    "word_sources": {w: word_sources[w][:3] for w in sorted(whitelist)}  # First 3 sources
}

with open('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/whitelist_s0001_s0500.json', 'w', encoding='utf-8') as f:
    json.dump(whitelist_data, f, indent=2, ensure_ascii=False)

print(f"Done! Whitelist contains {len(whitelist)} words.")
