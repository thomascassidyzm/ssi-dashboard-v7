#!/usr/bin/env python3
"""
Refined Phase 5 Content Generator for Seeds S0631-S0640
Creates meaningful phrases with proper LEGO distribution and semantic awareness
"""

import json
from pathlib import Path
from typing import Dict, List, Tuple, Any

class RefinedPhase5Generator:
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
                              seed_pair: Dict[str, str],
                              all_lego_data: Dict[str, Tuple[str, str]]) -> List[List]:
        """Generate 10 practice phrases for a LEGO"""

        current_known, current_target = current_lego_data.get("lego", ["", ""])
        earlier_legos = current_lego_data.get("current_seed_earlier_legos", [])

        phrases = []

        # Helper function to create a phrase from LEGO IDs
        def create_phrase_from_legos(lego_ids: List[str]) -> Tuple[str, str]:
            known_parts = []
            target_parts = []
            for lid in lego_ids:
                if lid in all_lego_data:
                    known, target = all_lego_data[lid]
                    known_parts.append(known)
                    target_parts.append(target)
            known_phrase = " ".join([p for p in known_parts if p]).strip()
            # For Chinese, concatenate without spaces
            target_phrase = "".join([p for p in target_parts if p]).strip()
            return known_phrase, target_phrase

        # CATEGORY 1: Short phrases (1-2 LEGOs) - Target: 2
        # Just the current LEGO
        if current_known and current_target:
            phrases.append([current_known, current_target, None, 1])
            phrases.append([current_known, current_target, None, 2])

        # CATEGORY 2: Medium phrases (3 LEGOs) - Target: 2
        # Combine with earlier LEGOs
        if earlier_legos and len(phrases) < 4:
            # Get a specific earlier LEGO to combine (not all)
            first_earlier_id = earlier_legos[0].get("id")
            if first_earlier_id:
                known, target = create_phrase_from_legos([first_earlier_id, current_lego_id])
                if known and target and len(phrases) < 4:
                    phrases.append([known, target, None, 3])

        if len(earlier_legos) >= 2 and len(phrases) < 4:
            second_earlier_id = earlier_legos[1].get("id")
            if second_earlier_id:
                known, target = create_phrase_from_legos([second_earlier_id, current_lego_id])
                if known and target and len(phrases) < 4:
                    # Avoid duplicates
                    if not any(p[0] == known and p[1] == target for p in phrases):
                        phrases.append([known, target, None, 3])

        # CATEGORY 3: Longer phrases (4-5 LEGOs) - Target: 2
        if len(earlier_legos) >= 2 and len(phrases) < 6:
            ids_to_use = [earlier_legos[0].get("id"), earlier_legos[1].get("id"), current_lego_id]
            ids_to_use = [i for i in ids_to_use if i]
            known, target = create_phrase_from_legos(ids_to_use)
            if known and target and len(phrases) < 6:
                if not any(p[0] == known and p[1] == target for p in phrases):
                    phrases.append([known, target, None, 4])

        if len(earlier_legos) >= 3 and len(phrases) < 6:
            ids_to_use = [earlier_legos[0].get("id"), earlier_legos[2].get("id"), current_lego_id]
            ids_to_use = [i for i in ids_to_use if i]
            known, target = create_phrase_from_legos(ids_to_use)
            if known and target and len(phrases) < 6:
                if not any(p[0] == known and p[1] == target for p in phrases):
                    phrases.append([known, target, None, 4])

        # CATEGORY 4: Long phrases (6+ LEGOs) - Target: 4
        # Include progressively more earlier LEGOs
        remaining = 10 - len(phrases)

        # Try using the current LEGO with combinations of earlier ones
        if earlier_legos and remaining > 0:
            # Use all earlier LEGOs + current (if applicable and makes sense)
            all_earlier_ids = [e.get("id") for e in earlier_legos if e.get("id")]

            # But avoid creating too many combinations - just use sensible ones
            # For long phrases, try: first 2 + current, first 3 + current, all + current
            for num_to_use in [2, 3, 4]:
                if num_to_use <= len(all_earlier_ids) and remaining > 0:
                    ids_subset = all_earlier_ids[:num_to_use] + [current_lego_id]
                    known, target = create_phrase_from_legos(ids_subset)
                    if known and target:
                        if not any(p[0] == known and p[1] == target for p in phrases):
                            phrases.append([known, target, None, 5 + (10 - len(phrases) - remaining)])
                            remaining = 10 - len(phrases)
                            if remaining <= 0:
                                break

        # Fill remaining slots by repeating the current LEGO (as a fallback)
        while len(phrases) < 10:
            phrases.append([current_known, current_target, None, len(phrases) + 1])

        # If this is the final LEGO, ensure the full seed sentence is the last phrase
        if is_final:
            seed_known = seed_pair.get("known", "")
            seed_target = seed_pair.get("target", "")
            if seed_known and seed_target:
                # Replace the last phrase with the seed pair
                phrases[-1] = [seed_known, seed_target, None, 10]

        return phrases[:10]

    def process_seed(self, seed_id: str) -> Dict[str, Any]:
        """Process a single seed and generate output"""
        print(f"Processing {seed_id}...")

        # Load scaffold
        scaffold = self.load_scaffold(seed_id)

        # Build a map of all LEGOs in the current seed for quick lookup
        all_lego_data = {}
        if "legos" in scaffold:
            for lego_id, lego_data in scaffold["legos"].items():
                if "lego" in lego_data:
                    known, target = lego_data["lego"][0], lego_data["lego"][1]
                    all_lego_data[lego_id] = (known, target)

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
                all_lego_data
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
        print(f"  ✓ Saved {seed_id}")

    def process_all_seeds(self, start: int, end: int):
        """Process all seeds in range"""
        processed = 0
        for i in range(start, end + 1):
            seed_id = f"S{i:04d}"
            try:
                output = self.process_seed(seed_id)
                self.save_output(seed_id, output)
                processed += 1
            except Exception as e:
                print(f"  ✗ Error: {e}")
                import traceback
                traceback.print_exc()
        return processed


def main():
    generator = RefinedPhase5Generator()
    print("=" * 70)
    print("Phase 5 Refined Content Generator")
    print("Seeds: S0631-S0640")
    print("=" * 70)

    processed = generator.process_all_seeds(631, 640)

    print("=" * 70)
    print(f"Completed: {processed}/10 seeds successfully generated")
    print("Output location: /public/vfs/courses/cmn_for_eng/phase5_outputs/")
    print("=" * 70)


if __name__ == "__main__":
    main()
