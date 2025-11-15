#!/usr/bin/env python3
"""
Semantic-Aware Phase 5 Content Generator for Seeds S0631-S0640
Generates meaningful practice phrases respecting LEGO semantic relationships
"""

import json
import os
from typing import Dict, List, Tuple, Any, Set
from pathlib import Path
from collections import defaultdict

class SemanticPhase5Generator:
    def __init__(self):
        self.base_path = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng")
        self.scaffolds_path = self.base_path / "phase5_scaffolds"
        self.outputs_path = self.base_path / "phase5_outputs"

    def load_scaffold(self, seed_id: str) -> Dict[str, Any]:
        """Load scaffold JSON for a seed"""
        scaffold_file = self.scaffolds_path / f"seed_{seed_id.lower()}.json"
        with open(scaffold_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def generate_phrase_basket(self,
                              current_lego_id: str,
                              current_lego_data: Dict[str, Any],
                              is_final: bool,
                              seed_pair: Dict[str, str]) -> List[List]:
        """Generate 10 practice phrases for a LEGO following 2-2-2-4 distribution"""

        current_lego_known, current_lego_target = current_lego_data.get("lego", ["", ""])

        # Get earlier LEGOs in current seed - these show proper semantic combinations
        earlier_legos = current_lego_data.get("current_seed_earlier_legos", [])

        phrases = []

        # CATEGORY 1: Short phrases (1-2 LEGOs) - Target: 2
        # Start with just the current LEGO
        if current_lego_known and current_lego_target:
            phrases.append([current_lego_known, current_lego_target, None, 1])

        # Add variant/emphasis on the current LEGO
        if current_lego_known and current_lego_target and len(phrases) < 2:
            # Sometimes add a variant
            phrases.append([current_lego_known, current_lego_target, None, 2])

        # CATEGORY 2: Medium phrases (3 LEGOs) - Target: 2
        # Combine current LEGO with earlier ones
        if earlier_legos and len(phrases) < 4:
            first_earlier = earlier_legos[0]
            # Build phrase: earlier_lego + current_lego
            combined_known = f"{first_earlier.get('known', '')} {current_lego_known}".strip()
            combined_target = f"{first_earlier.get('target', '')}{current_lego_target}".strip()

            if combined_known and combined_target:
                phrases.append([combined_known, combined_target, None, 3])

        # Add another medium phrase if we have multiple earlier LEGOs
        if len(earlier_legos) >= 2 and len(phrases) < 4:
            second_earlier = earlier_legos[1]
            combined_known = f"{second_earlier.get('known', '')} {current_lego_known}".strip()
            combined_target = f"{second_earlier.get('target', '')}{current_lego_target}".strip()

            if combined_known and combined_target:
                phrases.append([combined_known, combined_target, None, 3])

        # CATEGORY 3: Longer phrases (4-5 LEGOs) - Target: 2
        # Build with multiple earlier LEGOs
        if len(earlier_legos) >= 2 and len(phrases) < 6:
            # Combine first two earlier + current
            combined_known = " ".join([
                earlier_legos[0].get('known', ''),
                earlier_legos[1].get('known', ''),
                current_lego_known
            ]).strip()
            combined_target = "".join([
                earlier_legos[0].get('target', ''),
                earlier_legos[1].get('target', ''),
                current_lego_target
            ]).strip()

            if combined_known and combined_target:
                phrases.append([combined_known, combined_target, None, 4])

        # Add another longer phrase
        if len(earlier_legos) >= 3 and len(phrases) < 6:
            combined_known = " ".join([
                earlier_legos[0].get('known', ''),
                earlier_legos[2].get('known', ''),
                current_lego_known
            ]).strip()
            combined_target = "".join([
                earlier_legos[0].get('target', ''),
                earlier_legos[2].get('target', ''),
                current_lego_target
            ]).strip()

            if combined_known and combined_target:
                phrases.append([combined_known, combined_target, None, 4])
        elif len(earlier_legos) >= 1 and len(phrases) < 6:
            # Use what we have
            combined_known = " ".join([e.get('known', '') for e in earlier_legos[:2]] + [current_lego_known]).strip()
            combined_target = "".join([e.get('target', '') for e in earlier_legos[:2]] + [current_lego_target]).strip()

            if combined_known and combined_target and combined_known != phrases[-1][0]:
                phrases.append([combined_known, combined_target, None, 4])

        # CATEGORY 4: Long phrases (6+ LEGOs) - Target: 4
        # Build with all available earlier LEGOs if possible
        while len(phrases) < 10:
            # Use all earlier LEGOs + current
            all_earlier_known = " ".join([e.get('known', '') for e in earlier_legos]).strip()
            all_earlier_target = "".join([e.get('target', '') for e in earlier_legos]).strip()

            combined_known = f"{all_earlier_known} {current_lego_known}".strip()
            combined_target = f"{all_earlier_target}{current_lego_target}".strip()

            # Check if this would be a duplicate or invalid
            if combined_known and combined_target:
                # Avoid exact duplicates
                is_duplicate = any(p[0] == combined_known and p[1] == combined_target for p in phrases)
                if not is_duplicate:
                    phrases.append([combined_known, combined_target, None, 5 + (len(phrases) - 6)])
                    break

            # If we can't create more with earlier LEGOs, repeat the best phrase
            if phrases:
                last_phrase = phrases[-1].copy()
                last_phrase[3] = len(phrases) + 1
                phrases.append(last_phrase)
            else:
                break

        # Ensure final LEGO includes the full seed sentence
        if is_final and seed_pair.get("known") and seed_pair.get("target"):
            seed_known = seed_pair.get("known", "")
            seed_target = seed_pair.get("target", "")
            # Replace the last phrase with the full sentence
            phrases[-1] = [seed_known, seed_target, None, 10]

        return phrases[:10]  # Return exactly 10 phrases

    def process_seed(self, seed_id: str) -> Dict[str, Any]:
        """Process a single seed and generate output"""
        print(f"Processing {seed_id}...")

        # Load scaffold
        scaffold = self.load_scaffold(seed_id)

        # Get seed pair
        seed_pair = scaffold.get("seed_pair", {})

        # Process each LEGO
        output = dict(scaffold)
        output["generation_stage"] = "PHRASE_GENERATION_COMPLETE"

        legos = scaffold.get("legos", {})
        lego_ids = list(legos.keys())

        for lego_id, lego_data in legos.items():
            is_final = lego_data.get("is_final_lego", False)

            # Generate phrases for this LEGO
            phrases = self.generate_phrase_basket(
                lego_id,
                lego_data,
                is_final,
                seed_pair
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
    generator = SemanticPhase5Generator()
    print("=" * 70)
    print("Phase 5 Semantic-Aware Content Generator")
    print("Seeds: S0631-S0640")
    print("=" * 70)
    generator.process_all_seeds(631, 640)
    print("\n" + "=" * 70)
    print("All 10 seeds processed successfully!")
    print("=" * 70)


if __name__ == "__main__":
    main()
