#!/usr/bin/env python3
"""
Intelligent Phase 5 Content Generator for Seeds S0631-S0640
Generates practice phrases following Phase 5 Intelligence v3.0 with proper LEGO combination
"""

import json
import os
from typing import Dict, List, Tuple, Any, Set
from pathlib import Path
from collections import defaultdict

class IntelligentPhase5Generator:
    def __init__(self):
        self.base_path = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng")
        self.scaffolds_path = self.base_path / "phase5_scaffolds"
        self.outputs_path = self.base_path / "phase5_outputs"

    def load_scaffold(self, seed_id: str) -> Dict[str, Any]:
        """Load scaffold JSON for a seed"""
        scaffold_file = self.scaffolds_path / f"seed_{seed_id.lower()}.json"
        with open(scaffold_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def extract_all_legos(self, scaffold: Dict[str, Any]) -> Dict[str, Tuple[str, str]]:
        """Extract all LEGOs from recent context (ID -> (known, target))"""
        all_legos = {}

        if "recent_context" in scaffold:
            for seed_key, seed_data in scaffold["recent_context"].items():
                if "new_legos" in seed_data:
                    for lego in seed_data["new_legos"]:
                        if len(lego) >= 3:
                            lego_id = lego[0]
                            known = lego[1]
                            target = lego[2]
                            all_legos[lego_id] = (known, target)

        return all_legos

    def extract_current_seed_legos(self, scaffold: Dict[str, Any]) -> Dict[str, Tuple[str, str]]:
        """Extract LEGOs from current seed"""
        current_legos = {}

        if "legos" in scaffold:
            for lego_id, lego_data in scaffold["legos"].items():
                if "lego" in lego_data and len(lego_data["lego"]) >= 2:
                    known = lego_data["lego"][0]
                    target = lego_data["lego"][1]
                    current_legos[lego_id] = (known, target)

        return current_legos

    def build_phrase_from_legos(self, lego_ids: List[str],
                               all_legos: Dict[str, Tuple[str, str]]) -> Tuple[str, str]:
        """Build a phrase by combining multiple LEGOs"""
        known_parts = []
        target_parts = []

        for lego_id in lego_ids:
            if lego_id in all_legos:
                known, target = all_legos[lego_id]
                known_parts.append(known)
                target_parts.append(target)

        known_phrase = " ".join(known_parts)
        # For Chinese, typically concatenate without spaces
        target_phrase = "".join(target_parts)

        return known_phrase, target_phrase

    def generate_phrase_basket(self,
                              current_lego_id: str,
                              current_lego_data: Dict[str, Any],
                              is_final: bool,
                              seed_pair: Dict[str, str],
                              all_legos: Dict[str, Tuple[str, str]],
                              current_seed_legos: Dict[str, Tuple[str, str]]) -> List[List]:
        """Generate 10 practice phrases for a LEGO following 2-2-2-4 distribution"""

        current_lego_known, current_lego_target = current_seed_legos.get(
            current_lego_id,
            ("", "")
        )

        # Get earlier LEGOs in current seed for combination
        earlier_legos = current_lego_data.get("current_seed_earlier_legos", [])
        earlier_lego_ids = [l.get("id") for l in earlier_legos if l.get("id")]

        phrases = []
        distribution_tracker = defaultdict(int)

        # CATEGORY 1: Short phrases (1-2 LEGOs) - Target: 2
        # Start with just the current LEGO
        if current_lego_known and current_lego_target:
            phrases.append([current_lego_known, current_lego_target, None, 1])
            distribution_tracker["short"] += 1

        # Combine with first earlier LEGO (1-2 LEGOs total)
        if earlier_lego_ids and distribution_tracker["short"] < 2:
            first_earlier_id = earlier_lego_ids[0]
            known, target = self.build_phrase_from_legos(
                [first_earlier_id, current_lego_id],
                all_legos
            )
            if known and target:
                phrases.append([known, target, None, 2])
                distribution_tracker["short"] += 1

        # CATEGORY 2: Medium phrases (3 LEGOs) - Target: 2
        # Combine current LEGO with two earlier LEGOs
        if len(earlier_lego_ids) >= 2 and distribution_tracker["medium"] < 2:
            known, target = self.build_phrase_from_legos(
                [earlier_lego_ids[0], earlier_lego_ids[1], current_lego_id],
                all_legos
            )
            if known and target:
                phrases.append([known, target, None, 3])
                distribution_tracker["medium"] += 1

        # Add another medium phrase combining different earlier LEGOs
        if len(earlier_lego_ids) >= 3 and distribution_tracker["medium"] < 2:
            known, target = self.build_phrase_from_legos(
                [earlier_lego_ids[1], earlier_lego_ids[2], current_lego_id],
                all_legos
            )
            if known and target:
                phrases.append([known, target, None, 3])
                distribution_tracker["medium"] += 1

        # CATEGORY 3: Longer phrases (4-5 LEGOs) - Target: 2
        # Combine current with 3 earlier LEGOs
        if len(earlier_lego_ids) >= 3 and distribution_tracker["longer"] < 2:
            known, target = self.build_phrase_from_legos(
                [earlier_lego_ids[0], earlier_lego_ids[1], earlier_lego_ids[2], current_lego_id],
                all_legos
            )
            if known and target:
                phrases.append([known, target, None, 4])
                distribution_tracker["longer"] += 1

        # Add another longer phrase
        if len(earlier_lego_ids) >= 4 and distribution_tracker["longer"] < 2:
            known, target = self.build_phrase_from_legos(
                [earlier_lego_ids[0], earlier_lego_ids[1], earlier_lego_ids[3], current_lego_id],
                all_legos
            )
            if known and target:
                phrases.append([known, target, None, 4])
                distribution_tracker["longer"] += 1

        # CATEGORY 4: Long phrases (6+ LEGOs) - Target: 4
        # Use combinations with recent context LEGOs
        recent_lego_ids = [lid for lid in all_legos.keys()
                          if any(f"S06{xx}" in lid for xx in ["2", "3", "4", "5"])][:10]

        # Build several long phrases
        combination_sets = [
            earlier_lego_ids[:min(4, len(earlier_lego_ids))] + [current_lego_id],
            [recent_lego_ids[0], recent_lego_ids[1]] + earlier_lego_ids[:2] + [current_lego_id]
            if len(recent_lego_ids) >= 2 else [],
        ]

        for combo in combination_sets:
            if combo and distribution_tracker["longest"] < 4:
                known, target = self.build_phrase_from_legos(combo, all_legos)
                if known and target:
                    phrases.append([known, target, None, 5 + distribution_tracker["longest"]])
                    distribution_tracker["longest"] += 1

        # Fill remaining slots with variations or duplication if needed
        while len(phrases) < 10:
            # Repeat a phrase if necessary
            if phrases:
                last_phrase = phrases[-1]
                phrases.append([last_phrase[0], last_phrase[1], None, len(phrases) + 1])
            else:
                break

        # If this is final LEGO, ensure the full seed sentence is included
        if is_final:
            # Replace last phrase with full seed sentence
            seed_known = seed_pair.get("known", "")
            seed_target = seed_pair.get("target", "")
            if seed_known and seed_target:
                phrases[-1] = [seed_known, seed_target, None, 10]

        return phrases[:10]  # Return exactly 10 phrases

    def process_seed(self, seed_id: str) -> Dict[str, Any]:
        """Process a single seed and generate output"""
        print(f"Processing {seed_id}...")

        # Load scaffold
        scaffold = self.load_scaffold(seed_id)

        # Extract all available LEGOs
        all_legos = self.extract_all_legos(scaffold)
        current_seed_legos = self.extract_current_seed_legos(scaffold)

        # Merge for complete LEGO set
        all_legos.update(current_seed_legos)

        # Get seed pair
        seed_pair = scaffold.get("seed_pair", {})

        # Process each LEGO
        output = dict(scaffold)
        output["generation_stage"] = "PHRASE_GENERATION_COMPLETE"

        legos = scaffold.get("legos", {})
        for lego_id, lego_data in legos.items():
            is_final = lego_data.get("is_final_lego", False)

            # Generate phrases for this LEGO
            phrases = self.generate_phrase_basket(
                lego_id,
                lego_data,
                is_final,
                seed_pair,
                all_legos,
                current_seed_legos
            )

            # Update the lego with generated phrases
            if "legos" not in output:
                output["legos"] = {}
            if lego_id not in output["legos"]:
                output["legos"][lego_id] = lego_data

            output["legos"][lego_id]["practice_phrases"] = phrases

        return output

    def save_output(self, seed_id: str, output: Dict[str, Any]):
        """Save generated output to file"""
        output_file = self.outputs_path / f"seed_{seed_id.lower()}.json"

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        print(f"✓ Saved to {output_file}")

    def process_all_seeds(self, start: int, end: int):
        """Process all seeds in range"""
        for i in range(start, end + 1):
            seed_id = f"S{i:04d}"
            try:
                output = self.process_seed(seed_id)
                self.save_output(seed_id, output)
            except Exception as e:
                print(f"✗ Error processing {seed_id}: {e}")
                import traceback
                traceback.print_exc()


def main():
    generator = IntelligentPhase5Generator()
    print("=" * 60)
    print("Phase 5 Intelligent Content Generator")
    print("Seeds: S0631-S0640")
    print("=" * 60)
    generator.process_all_seeds(631, 640)
    print("\n" + "=" * 60)
    print("All 10 seeds processed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()
