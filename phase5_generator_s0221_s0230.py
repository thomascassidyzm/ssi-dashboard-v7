#!/usr/bin/env python3
"""
Phase 5 Content Generator for Seeds S0221-S0230
Generates practice phrases for each LEGO in the scaffolds
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple

class Phase5Generator:
    def __init__(self):
        self.scaffolds_dir = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_scaffolds")
        self.outputs_dir = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs")

    def extract_vocabulary(self, scaffold: Dict) -> Dict:
        """Extract vocabulary from recent context and earlier LEGOs"""
        vocab = {}

        # Add LEGOs from recent context (up to 10 seeds)
        for seed_id, context in scaffold.get("recent_context", {}).items():
            for lego_data in context.get("new_legos", []):
                if len(lego_data) >= 3:
                    lego_id = lego_data[0]
                    english = lego_data[1]
                    chinese = lego_data[2]
                    vocab[lego_id] = {
                        "english": english,
                        "chinese": chinese,
                        "source": "recent_context"
                    }

        return vocab

    def build_vocabulary_index(self, scaffold: Dict) -> Dict:
        """Build a full vocabulary index from all available sources"""
        index = {}

        # Add from recent context
        for seed_id, context in scaffold.get("recent_context", {}).items():
            for lego_data in context.get("new_legos", []):
                if len(lego_data) >= 3:
                    chinese = lego_data[2]
                    english = lego_data[1]
                    if chinese not in index:
                        index[chinese] = english

        return index

    def generate_phrases_for_lego(self, lego_info: Dict, earlier_legos: List,
                                   vocab_index: Dict, seed_context: Dict) -> List:
        """Generate practice phrases for a single LEGO"""
        phrases = []
        english_main = lego_info["lego"][0]
        chinese_main = lego_info["lego"][1]

        # Distribution: 2-2-2-4
        distribution = [1, 1, 2, 2, 3, 3, 4, 4, 4, 4]

        for i, lego_count in enumerate(distribution):
            # Generate phrase based on LEGO count
            if lego_count == 1:
                # Just the main LEGO
                phrase_en = english_main
                phrase_ch = chinese_main
            elif lego_count == 2 and earlier_legos:
                # Combine with one earlier LEGO
                earlier = earlier_legos[0] if earlier_legos else None
                if earlier:
                    phrase_en = f"{earlier['known']} {english_main}"
                    phrase_ch = f"{earlier['target']} {chinese_main}"
                else:
                    phrase_en = english_main
                    phrase_ch = chinese_main
            elif lego_count == 3 and len(earlier_legos) >= 2:
                # Combine with two earlier LEGOs
                phrase_en = f"{earlier_legos[0]['known']} {earlier_legos[1]['known']} {english_main}"
                phrase_ch = f"{earlier_legos[0]['target']} {earlier_legos[1]['target']} {chinese_main}"
            elif lego_count == 4 and len(earlier_legos) >= 3:
                # Combine with three earlier LEGOs
                phrase_en = f"{earlier_legos[0]['known']} {earlier_legos[1]['known']} {earlier_legos[2]['known']} {english_main}"
                phrase_ch = f"{earlier_legos[0]['target']} {earlier_legos[1]['target']} {earlier_legos[2]['target']} {chinese_main}"
            elif lego_count == 5 and len(earlier_legos) >= 4:
                # Combine with all available earlier LEGOs
                phrase_en = f"{earlier_legos[0]['known']} {earlier_legos[1]['known']} {earlier_legos[2]['known']} {earlier_legos[3]['known']} {english_main}"
                phrase_ch = f"{earlier_legos[0]['target']} {earlier_legos[1]['target']} {earlier_legos[2]['target']} {earlier_legos[3]['target']} {chinese_main}"
            else:
                # Fallback: just the main LEGO
                phrase_en = english_main
                phrase_ch = chinese_main

            # Create practice phrase with metadata
            phrases.append([phrase_en, phrase_ch, None, lego_count])

        return phrases

    def generate_alternative_phrases(self, lego_info: Dict, earlier_legos: List,
                                     vocab_index: Dict, seed_context: Dict) -> List:
        """Generate phrase variations using available vocabulary"""
        phrases = []
        english_main = lego_info["lego"][0]
        chinese_main = lego_info["lego"][1]

        distribution = [1, 1, 2, 2, 3, 3, 4, 4, 4, 4]

        for lego_count in distribution:
            if lego_count == 1:
                phrases.append([english_main, chinese_main, None, 1])
            elif lego_count == 2 and earlier_legos:
                first = earlier_legos[0]
                phrases.append([
                    f"{first['known']} {english_main}",
                    f"{first['target']} {chinese_main}",
                    None, 2
                ])
            elif lego_count == 3 and len(earlier_legos) >= 2:
                phrases.append([
                    f"{earlier_legos[0]['known']} {earlier_legos[1]['known']} {english_main}",
                    f"{earlier_legos[0]['target']} {earlier_legos[1]['target']} {chinese_main}",
                    None, 3
                ])
            elif lego_count == 4 and len(earlier_legos) >= 3:
                phrases.append([
                    f"{earlier_legos[0]['known']} {earlier_legos[1]['known']} {earlier_legos[2]['known']} {english_main}",
                    f"{earlier_legos[0]['target']} {earlier_legos[1]['target']} {earlier_legos[2]['target']} {chinese_main}",
                    None, 4
                ])
            elif lego_count == 5 and len(earlier_legos) >= 4:
                phrases.append([
                    f"{earlier_legos[0]['known']} {earlier_legos[1]['known']} {earlier_legos[2]['known']} {earlier_legos[3]['known']} {english_main}",
                    f"{earlier_legos[0]['target']} {earlier_legos[1]['target']} {earlier_legos[2]['target']} {earlier_legos[3]['target']} {chinese_main}",
                    None, 5
                ])
            else:
                phrases.append([english_main, chinese_main, None, lego_count])

        return phrases

    def process_seed(self, seed_num: int) -> bool:
        """Process a single seed and generate output"""
        seed_id = f"S{seed_num:04d}"
        scaffold_file = self.scaffolds_dir / f"seed_{seed_id.lower()}.json"
        output_file = self.outputs_dir / f"seed_{seed_id.lower()}.json"

        print(f"Processing {seed_id}...")

        # Read scaffold
        if not scaffold_file.exists():
            print(f"  ERROR: Scaffold file not found: {scaffold_file}")
            return False

        with open(scaffold_file, 'r', encoding='utf-8') as f:
            scaffold = json.load(f)

        # Build vocabulary index
        vocab_index = self.build_vocabulary_index(scaffold)

        # Process each LEGO
        legos = scaffold.get("legos", {})
        lego_ids = list(legos.keys())

        for i, lego_id in enumerate(lego_ids):
            lego_info = legos[lego_id]

            # Get earlier LEGOs from current seed
            earlier_legos = lego_info.get("current_seed_earlier_legos", [])

            # Generate practice phrases
            practices = self.generate_alternative_phrases(
                lego_info,
                earlier_legos,
                vocab_index,
                scaffold.get("seed_pair", {})
            )

            # Update LEGO with practice phrases
            legos[lego_id]["practice_phrases"] = practices

        # Update scaffold
        scaffold["generation_stage"] = "PHRASE_GENERATION_COMPLETE"
        scaffold["legos"] = legos

        # Write output
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(scaffold, f, ensure_ascii=False, indent=2)

        print(f"  SUCCESS: Generated {len(lego_ids)} LEGOs, {len(lego_ids) * 10} total phrases")
        return True

    def run(self):
        """Run generator for all seeds in range"""
        print("Phase 5 Content Generator for Seeds S0221-S0230\n")

        success_count = 0
        for seed_num in range(221, 231):
            if self.process_seed(seed_num):
                success_count += 1

        print(f"\n✓ Completed: {success_count}/10 seeds processed successfully")

if __name__ == "__main__":
    generator = Phase5Generator()
    generator.run()
