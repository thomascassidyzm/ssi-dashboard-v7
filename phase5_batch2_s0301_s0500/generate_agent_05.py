#!/usr/bin/env python3
"""
Agent 05 Basket Generator - S0381-S0400
Strict GATE compliance with word-by-word validation
"""

import json
import re
from datetime import datetime
from typing import Dict, List, Set, Tuple

# Load input files
with open('batch_input/agent_05_seeds.json', 'r', encoding='utf-8') as f:
    agent_data = json.load(f)

with open('registry/lego_registry_s0001_s0500.json', 'r', encoding='utf-8') as f:
    registry = json.load(f)

def build_whitelist_up_to(seed_id: str) -> Set[str]:
    """Build whitelist of all Spanish words taught up to (and including) this seed"""
    # Extract seed number
    seed_num = int(seed_id[1:5])  # S0381 -> 381

    whitelist = set()
    for lego_id, lego_data in registry['legos'].items():
        # Extract LEGO seed number (e.g., S0381L01 -> 381)
        lego_seed_num = int(lego_id[1:5])

        # Only include LEGOs from seeds before or equal to current seed
        if lego_seed_num <= seed_num:
            if 'spanish_words' in lego_data:
                for word in lego_data['spanish_words']:
                    whitelist.add(word.lower())

    return whitelist

def tokenize_spanish(text: str) -> List[str]:
    """Tokenize Spanish text into individual words"""
    # Remove punctuation and split
    text = text.lower()
    text = re.sub(r'[¿?¡!,;:.()[\]{}]', ' ', text)
    words = [w for w in text.split() if w]
    return words

def validate_phrase(spanish: str, whitelist: Set[str]) -> Tuple[bool, List[str]]:
    """Check if all words in Spanish phrase are in whitelist"""
    words = tokenize_spanish(spanish)
    violations = []
    for word in words:
        if word not in whitelist:
            violations.append(word)
    return (len(violations) == 0, violations)

print("Starting Agent 05 basket generation...")
print(f"Seeds: S0381-S0400")
print(f"Total seeds: {len(agent_data['seeds'])}")

# Build whitelist for S0400 to check coverage
whitelist_s0400 = build_whitelist_up_to('S0400')
print(f"Whitelist size for S0400: {len(whitelist_s0400)} unique Spanish words")

print("\nNote: This script requires extensive phrase templates.")
print("Due to the complexity, I'll generate a comprehensive JSON structure with proper validation.")
