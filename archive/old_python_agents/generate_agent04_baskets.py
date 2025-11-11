#!/usr/bin/env python3
"""
Generate practice phrase baskets for Agent 04 (Seeds S0131-S0140)
Following Phase 5 v3.0 spec with strict GATE compliance
"""

import json
from datetime import datetime
from typing import List, Dict, Set, Tuple

def load_registry(path: str) -> Dict:
    """Load the LEGO registry"""
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_seeds(path: str) -> Dict:
    """Load the seed data"""
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def build_whitelist_up_to(registry: Dict, lego_id: str) -> Set[str]:
    """Build whitelist of all Spanish words taught up to and including this LEGO"""
    whitelist = set()

    # Extract seed and lego numbers
    seed_num = int(lego_id[1:4])  # S0131L01 -> 131
    lego_num = int(lego_id[6:8])  # S0131L01 -> 1

    # Include all LEGOs from S0001 through current
    for lego_key, lego_data in registry['legos'].items():
        # Skip non-seed LEGOs (like PROV prefixes)
        if not lego_key.startswith('S'):
            continue

        try:
            curr_seed = int(lego_key[1:4])
            curr_lego = int(lego_key[6:8])

            # Include if:
            # - Earlier seed, OR
            # - Same seed but earlier or equal LEGO number
            if curr_seed < seed_num or (curr_seed == seed_num and curr_lego <= lego_num):
                whitelist.update(lego_data['spanish_words'])
        except (ValueError, IndexError):
            # Skip malformed LEGO IDs
            continue

    return whitelist

def validate_gate_compliance(spanish_phrase: str, whitelist: Set[str]) -> bool:
    """Check if all words in Spanish phrase are in whitelist"""
    # Simple tokenization - split on spaces and remove punctuation
    import re
    words = re.findall(r'\w+', spanish_phrase.lower())

    for word in words:
        if word not in whitelist:
            return False
    return True

def count_legos_in_phrase(phrase: str, lego_map: Dict) -> int:
    """Count approximate number of LEGOs in a phrase"""
    # This is a rough estimate based on word count
    words = phrase.split()
    return len(words)

# Pre-generated baskets with GATE compliance validation
BASKETS = {
    "S0131L01": {
        "lego": ["there are", "hay"],
        "type": "A",
        "practice_phrases": [
            ["there are", "hay", 1],
            ["there are ideas", "hay ideas", 2],
            ["there are too many ideas", "hay demasiadas ideas", 3],
            ["there are many ideas", "hay muchas ideas", 3],
            ["I don't know if there are ideas", "no sé si hay ideas", 5],
            ["I think that there are too many ideas", "creo que hay demasiadas ideas", 6],
            ["there are many new ideas in my head", "hay muchas ideas nuevas en mi cabeza", 8],
            ["there are many difficult things to learn", "hay muchas cosas difíciles para aprender", 7],
            ["there are many words I need to remember", "hay muchas palabras que necesito recordar", 8],
            ["I think that there are many new words", "creo que hay muchas palabras nuevas", 7]
        ]
    },
    "S0131L02": {
        "lego": ["too many", "demasiadas"],
        "type": "A",
        "practice_phrases": [
            ["too many", "demasiadas", 1],
            ["too many ideas", "demasiadas ideas", 2],
            ["too many new ideas", "demasiadas ideas nuevas", 3],
            ["there are too many words", "hay demasiadas palabras", 4],
            ["there are too many new things to learn", "hay demasiadas cosas nuevas para aprender", 6],
            ["I think that there are too many ideas", "creo que hay demasiadas ideas", 7],
            ["I'm sorry that there are too many difficult words", "lo siento que hay demasiadas palabras difíciles", 8],
            ["there are too many things I need to remember", "hay demasiadas cosas que necesito recordar", 8],
            ["I don't know if there are too many ideas", "no sé si hay demasiadas ideas", 9],
            ["there are too many new words going around in my head", "hay demasiadas palabras nuevas dando vueltas en mi cabeza", 10]
        ]
    },
    "S0131L03": {
        "lego": ["ideas", "ideas"],
        "type": "A",
        "practice_phrases": [
            ["ideas", "ideas", 1],
            ["many ideas", "muchas ideas", 2],
            ["too many ideas", "demasiadas ideas", 2],
            ["there are many ideas", "hay muchas ideas", 3],
            ["there are too many new ideas", "hay demasiadas ideas nuevas", 4],
            ["I think that there are many good ideas", "creo que hay muchas ideas buenas", 7],
            ["I'm so happy that there are many ideas", "estoy tan feliz de que hay muchas ideas", 9],
            ["there are many new ideas I need to learn", "hay muchas ideas nuevas que necesito aprender", 9],
            ["I'm excited about how many ideas there are", "estoy entusiasmado por cuántas ideas hay", 7],
            ["there are too many ideas going around in my head", "hay demasiadas ideas dando vueltas en mi cabeza", 9]
        ]
    },
    "S0131L04": {
        "lego": ["going around", "dando vueltas"],
        "type": "M",
        "practice_phrases": [
            ["going around", "dando vueltas", 1],
            ["ideas going around", "ideas dando vueltas", 2],
            ["many ideas going around", "muchas ideas dando vueltas", 3],
            ["there are ideas going around", "hay ideas dando vueltas", 4],
            ["there are many words going around in my head", "hay muchas palabras dando vueltas en mi cabeza", 9],
            ["there are too many new ideas going around", "hay demasiadas ideas nuevas dando vueltas", 6],
            ["I think that there are many ideas going around", "creo que hay muchas ideas dando vueltas", 8],
            ["there are many difficult things going around in my brain", "hay muchas cosas difíciles dando vueltas en mi cerebro", 10],
            ["there are many new words going around", "hay muchas palabras nuevas dando vueltas", 6],
            ["I don't know why there are ideas going around", "no sé por qué hay ideas dando vueltas", 9]
        ]
    },
    "S0131L05": {
        "lego": ["in", "en"],
        "type": "A",
        "practice_phrases": [
            ["in", "en", 1],
            ["in my head", "en mi cabeza", 2],
            ["ideas in my head", "ideas en mi cabeza", 3],
            ["many ideas in my brain", "muchas ideas en mi cerebro", 4],
            ["there are many words in my head", "hay muchas palabras en mi cabeza", 7],
            ["there are too many ideas going around in my head", "hay demasiadas ideas dando vueltas en mi cabeza", 9],
            ["I'm working on something difficult in my brain", "estoy trabajando en algo difícil en mi cerebro", 8],
            ["there are many new things I need to learn in this language", "hay muchas cosas nuevas que necesito aprender en este lenguaje", 12],
            ["I think that there are many new ideas in my head", "creo que hay muchas ideas nuevas en mi cabeza", 10],
            ["I don't know what is going around in my head", "no sé lo que está dando vueltas en mi cabeza", 11]
        ]
    },
    "S0131L06": {
        "lego": ["head", "cabeza"],
        "type": "A",
        "practice_phrases": [
            ["head", "cabeza", 1],
            ["my head", "mi cabeza", 2],
            ["in my head", "en mi cabeza", 2],
            ["ideas in my head", "ideas en mi cabeza", 3],
            ["many words in my head", "muchas palabras en mi cabeza", 4],
            ["there are too many ideas in my head", "hay demasiadas ideas en mi cabeza", 7],
            ["there are many new words going around in my head", "hay muchas palabras nuevas dando vueltas en mi cabeza", 9],
            ["I think that there are many ideas in my head", "creo que hay muchas ideas en mi cabeza", 9],
            ["I'm not sure what is going around in my head", "no estoy seguro lo que está dando vueltas en mi cabeza", 11],
            ["there are too many ideas going around in my head", "hay demasiadas ideas dando vueltas en mi cabeza", 9]
        ]
    }
}

def generate_all_baskets(seed_data: Dict, registry: Dict) -> Dict:
    """Generate baskets for all seeds S0131-S0140"""

    output = {
        "version": "curated_v6_molecular_lego",
        "course_direction": "Spanish for English speakers",
        "mapping": "KNOWN (English) → TARGET (Spanish)",
        "agent_id": 4,
        "seed_range": "S0131-S0140",
        "generation_date": datetime.now().isoformat(),
        "generated_by": "Claude Code - Agent 04 basket generator",
        "baskets": {}
    }

    for seed in seed_data['seeds']:
        seed_id = seed['seed_id']
        print(f"Processing {seed_id}...")

        # Add seed-level metadata
        output['baskets'][seed_id] = {
            "seed_pair": seed['seed_pair'],
            "cumulative_legos": seed['cumulative_legos'],
            "legos": {}
        }

        # Process each LEGO in this seed
        for lego in seed['legos']:
            lego_id = lego['id']
            print(f"  Processing {lego_id}...")

            # Build whitelist up to this LEGO
            whitelist = build_whitelist_up_to(registry, lego_id)

            # Use pre-generated basket if available
            if lego_id in BASKETS:
                basket = BASKETS[lego_id]
            else:
                # Generate basket dynamically
                basket = generate_basket_for_lego(lego, whitelist, seed_id, seed['seed_pair'])

            # Validate GATE compliance
            for phrase in basket['practice_phrases']:
                spanish = phrase[1]
                if not validate_gate_compliance(spanish, whitelist):
                    print(f"    WARNING: GATE violation in {lego_id}: {spanish}")

            output['baskets'][seed_id]['legos'][lego_id] = basket

    return output

def generate_basket_for_lego(lego: Dict, whitelist: Set[str], seed_id: str, seed_pair: Dict) -> Dict:
    """Generate a practice basket for a single LEGO"""
    # This will be filled with manual curation
    # For now, return a placeholder structure
    return {
        "lego": [lego['known'], lego['target']],
        "type": lego['type'],
        "practice_phrases": []
    }

def main():
    print("Agent 04 Basket Generator Starting...")
    print("=" * 60)

    # Load data
    registry_path = '/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300/registry/lego_registry_s0001_s0300.json'
    seeds_path = '/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300/batch_input/agent_04_seeds.json'
    output_path = '/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300/batch_output/agent_04_baskets.json'

    print(f"Loading registry from: {registry_path}")
    registry = load_registry(registry_path)

    print(f"Loading seeds from: {seeds_path}")
    seed_data = load_seeds(seeds_path)

    print(f"\nGenerating baskets for {seed_data['total_seeds']} seeds...")
    print(f"Seed range: {seed_data['seed_range']}")
    print()

    # For now, just validate the structure and show what we'll generate
    total_legos = 0
    for seed in seed_data['seeds']:
        lego_count = len(seed['legos'])
        total_legos += lego_count
        print(f"{seed['seed_id']}: {lego_count} LEGOs")
        for lego in seed['legos']:
            whitelist = build_whitelist_up_to(registry, lego['id'])
            print(f"  {lego['id']}: {lego['target']} (whitelist: {len(whitelist)} words)")

    print(f"\nTotal LEGOs to process: {total_legos}")
    print(f"Total phrases to generate: {total_legos * 10}")

    print("\n" + "=" * 60)
    print("NOTE: This script shows the structure. Full basket generation")
    print("requires manual curation to ensure naturalness and quality.")
    print("=" * 60)

if __name__ == "__main__":
    main()
