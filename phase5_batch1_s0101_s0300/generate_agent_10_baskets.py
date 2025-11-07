#!/usr/bin/env python3
"""
Generate LEGO baskets for Agent 10 (S0191-S0200)
With strict GATE compliance and quality control
"""

import json
import re
from typing import Dict, List, Set, Tuple
from datetime import datetime

class BasketGenerator:
    def __init__(self, registry_path: str, agent_input_path: str):
        """Initialize the basket generator"""
        with open(registry_path, 'r', encoding='utf-8') as f:
            self.registry = json.load(f)

        with open(agent_input_path, 'r', encoding='utf-8') as f:
            self.agent_input = json.load(f)

        # Build cumulative whitelist by LEGO ID
        self.whitelist_by_lego = {}
        self._build_whitelists()

    def _build_whitelists(self):
        """Build cumulative whitelists for each LEGO"""
        # Filter to only standard SXXXXLXX format LEGOs
        def parse_lego_id(lego_id):
            if lego_id.startswith('S') and 'L' in lego_id:
                try:
                    parts = lego_id.split('L')
                    seed_num = int(parts[0][1:])
                    lego_num = int(parts[1])
                    return (seed_num, lego_num)
                except:
                    return (999999, 999999)  # Push invalid ones to end
            return (999999, 999999)  # Push non-standard ones to end

        lego_ids = sorted([k for k in self.registry['legos'].keys() if k.startswith('S')],
                         key=parse_lego_id)

        cumulative_words = set()
        for lego_id in lego_ids:
            lego_data = self.registry['legos'][lego_id]
            # Add all Spanish words from this LEGO
            for word in lego_data.get('spanish_words', []):
                cumulative_words.add(word.lower())

            # Store cumulative whitelist up to and including this LEGO
            self.whitelist_by_lego[lego_id] = cumulative_words.copy()

    def get_whitelist_for_seed(self, seed_id: str, lego_index: int) -> Set[str]:
        """Get whitelist available up to a specific LEGO in a seed"""
        # Find the seed data
        seed_data = None
        for seed in self.agent_input['seeds']:
            if seed['seed_id'] == seed_id:
                seed_data = seed
                break

        if not seed_data:
            return set()

        # Get the LEGO ID at the specified index (or before if checking previous)
        if lego_index < 0:
            # Get whitelist from previous seed
            prev_seed_num = int(seed_id[1:]) - 1
            if prev_seed_num < 1:
                return set()
            prev_seed_id = f"S{prev_seed_num:04d}"
            for seed in self.agent_input['seeds']:
                if seed['seed_id'] == prev_seed_id:
                    if seed['legos']:
                        last_lego_id = seed['legos'][-1]['id']
                        return self.whitelist_by_lego.get(last_lego_id, set())
            return set()

        if lego_index >= len(seed_data['legos']):
            lego_index = len(seed_data['legos']) - 1

        current_lego_id = seed_data['legos'][lego_index]['id']

        # Return whitelist up to (but not including) current LEGO for first phrase
        # Or including current LEGO for subsequent phrases
        if lego_index == 0:
            # For first LEGO, get previous seed's last LEGO
            prev_seed_num = int(seed_id[1:]) - 1
            if prev_seed_num < 1:
                return set()

            # Find the previous LEGO in registry
            def parse_lego_id(lego_id):
                if lego_id.startswith('S') and 'L' in lego_id:
                    try:
                        parts = lego_id.split('L')
                        seed_num = int(parts[0][1:])
                        lego_num = int(parts[1])
                        return (seed_num, lego_num)
                    except:
                        return (999999, 999999)
                return (999999, 999999)

            lego_ids = sorted([k for k in self.registry['legos'].keys() if k.startswith('S')],
                             key=parse_lego_id)

            current_idx = lego_ids.index(current_lego_id)
            if current_idx > 0:
                prev_lego_id = lego_ids[current_idx - 1]
                return self.whitelist_by_lego.get(prev_lego_id, set())
            return set()
        else:
            # Get previous LEGO in same seed
            prev_lego_id = seed_data['legos'][lego_index - 1]['id']
            return self.whitelist_by_lego.get(prev_lego_id, set())

    def validate_spanish_phrase(self, spanish: str, whitelist: Set[str]) -> Tuple[bool, List[str]]:
        """
        Validate that all words in Spanish phrase are in whitelist
        Returns: (is_valid, list_of_invalid_words)
        """
        # Tokenize Spanish text
        # Remove punctuation for validation but keep apostrophes
        text = spanish.lower()
        text = re.sub(r'[.!?,:;¿¡]', '', text)

        words = text.split()
        invalid_words = []

        for word in words:
            if word not in whitelist:
                invalid_words.append(word)

        return len(invalid_words) == 0, invalid_words

    def generate_phrases_for_lego(self, seed_id: str, lego_index: int,
                                  lego_data: dict, whitelist: Set[str]) -> List[List]:
        """Generate 10 practice phrases for a LEGO"""

        lego_target = lego_data['target']
        lego_known = lego_data['known']
        lego_id = lego_data['id']

        # Get seed info
        seed_data = None
        for seed in self.agent_input['seeds']:
            if seed['seed_id'] == seed_id:
                seed_data = seed
                break

        is_final_lego = (lego_index == len(seed_data['legos']) - 1)

        phrases = []

        # This is where we'll generate phrases manually based on the seed context
        # For now, return placeholder structure
        return phrases

    def generate_basket_for_seed(self, seed_id: str) -> dict:
        """Generate complete basket for a seed"""

        # Find seed data
        seed_data = None
        for seed in self.agent_input['seeds']:
            if seed['seed_id'] == seed_id:
                seed_data = seed
                break

        if not seed_data:
            raise ValueError(f"Seed {seed_id} not found")

        basket = {
            "version": "curated_v7_spanish",
            "seed": seed_id,
            "course_direction": "Spanish for English speakers",
            "mapping": "KNOWN (English) → TARGET (Spanish)",
            "seed_pair": seed_data['seed_pair'],
            "patterns_introduced": "",
            "cumulative_patterns": [],
            "cumulative_legos": seed_data['cumulative_legos'],
            "curation_metadata": {
                "curated_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "curated_by": "Claude Code - Phase 5 v3.0 STRICT GATE compliance",
                "gate_compliance_note": f"Generated with strict GATE compliance - only exact Spanish forms taught in LEGOs through {seed_id}"
            }
        }

        # Generate phrases for each LEGO
        for lego_index, lego_data in enumerate(seed_data['legos']):
            lego_id = lego_data['id']

            # Get whitelist for this LEGO
            whitelist = self.get_whitelist_for_seed(seed_id, lego_index)

            # Add current LEGO's words to whitelist for generating phrases
            current_lego_words = set()
            if 'target' in lego_data:
                target_text = lego_data['target'].lower()
                target_text = re.sub(r'[.!?,:;¿¡]', '', target_text)
                current_lego_words = set(target_text.split())

            full_whitelist = whitelist.union(current_lego_words)

            # Generate phrases
            phrases = self.generate_phrases_for_lego(
                seed_id, lego_index, lego_data, full_whitelist
            )

            # Create LEGO basket entry
            basket[lego_id] = {
                "lego": [lego_data['known'], lego_data['target']],
                "type": lego_data['type'],
                "available_legos": len(whitelist),
                "available_patterns": [],
                "practice_phrases": phrases,
                "phrase_distribution": {
                    "really_short_1_2": 0,
                    "quite_short_3": 0,
                    "longer_4_5": 0,
                    "long_6_plus": 0
                },
                "pattern_coverage": "",
                "gate_compliance": f"STRICT - Only S0001-{seed_id} LEGOs available"
            }

        return basket


def main():
    """Main execution"""
    registry_path = "/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300/registry/lego_registry_s0001_s0300.json"
    agent_input_path = "/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300/batch_input/agent_10_seeds.json"

    generator = BasketGenerator(registry_path, agent_input_path)

    # Test whitelist generation
    print("Testing whitelist generation...")
    print(f"Total LEGOs in registry: {len(generator.registry['legos'])}")
    print(f"Total seeds to process: {len(generator.agent_input['seeds'])}")

    # Show whitelist size for first seed
    first_seed = generator.agent_input['seeds'][0]
    whitelist = generator.get_whitelist_for_seed(first_seed['seed_id'], 0)
    print(f"\nWhitelist size for {first_seed['seed_id']} LEGO 0: {len(whitelist)}")
    print(f"Sample words: {list(whitelist)[:20]}")


if __name__ == "__main__":
    main()
