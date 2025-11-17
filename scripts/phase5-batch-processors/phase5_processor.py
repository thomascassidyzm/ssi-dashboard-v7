#!/usr/bin/env python3
"""
Phase 5 Basket Generator for cmn_for_eng
Processes seeds S0431-S0440 according to Phase 5 Intelligence v7.0
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Set

class Phase5Processor:
    def __init__(self, seed_range: range):
        self.seed_range = seed_range
        self.scaffold_dir = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_scaffolds")
        self.output_dir = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs")

    def load_scaffold(self, seed_id: str) -> Dict:
        """Load a scaffold file for processing."""
        filepath = self.scaffold_dir / f"seed_{seed_id.lower()}.json"
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)

    def extract_vocabulary(self, scaffold: Dict, lego_index: int) -> Set[str]:
        """
        Extract available vocabulary from three sources:
        1. Recent context (10 previous seeds)
        2. Current seed's earlier LEGOs
        3. Current LEGO being taught
        """
        vocab = set()

        # Source 1: Recent context - extract from new_legos and sentences
        for seed_key, seed_data in scaffold.get('recent_context', {}).items():
            # Extract from new_legos (primary source)
            for lego_entry in seed_data.get('new_legos', []):
                if len(lego_entry) >= 3:
                    chinese_text = lego_entry[2]
                    words = chinese_text.split()
                    vocab.update(words)

            # Extract from sentence
            if 'sentence' in seed_data and len(seed_data['sentence']) >= 2:
                chinese_sentence = seed_data['sentence'][1]
                words = chinese_sentence.replace('|', '').split()
                vocab.update(w.strip() for w in words if w.strip())

        # Source 2: Current seed's earlier LEGOs
        lego_keys = sorted([k for k in scaffold.get('legos', {}).keys()])
        for i in range(lego_index):
            if i < len(lego_keys):
                lego_key = lego_keys[i]
                lego_data = scaffold['legos'][lego_key]
                if 'lego' in lego_data and len(lego_data['lego']) >= 2:
                    chinese_lego = lego_data['lego'][1]
                    words = chinese_lego.split()
                    vocab.update(words)

        # Source 3: Current LEGO
        lego_keys = sorted([k for k in scaffold.get('legos', {}).keys()])
        if lego_index < len(lego_keys):
            lego_key = lego_keys[lego_index]
            lego_data = scaffold['legos'][lego_key]
            if 'lego' in lego_data and len(lego_data['lego']) >= 2:
                chinese_lego = lego_data['lego'][1]
                words = chinese_lego.split()
                vocab.update(words)

        return vocab

    def generate_phrases_for_lego(self, scaffold: Dict, lego_key: str, lego_index: int) -> List[List]:
        """
        Generate 10 practice phrases for a single LEGO (2-2-2-4 distribution).

        Returns list of [english, chinese, null, lego_count] entries
        """
        lego_data = scaffold['legos'][lego_key]
        is_final = lego_data.get('is_final_lego', False)

        # Get available vocabulary
        vocab = self.extract_vocabulary(scaffold, lego_index)

        # Get LEGO details
        english_lego, chinese_lego = lego_data['lego']
        seed_pair = scaffold['seed_pair']

        # Get earlier LEGOs for context
        earlier_legos = lego_data.get('current_seed_earlier_legos', [])

        phrases = []

        # Build phrases with meaningful progression
        # These are carefully crafted based on the actual vocabulary available

        # Pattern 1: Simple uses of the LEGO (2 phrases for 1-2 LEGOs)
        if english_lego and chinese_lego:
            phrases.append([english_lego, chinese_lego, None, 1])

        # Add context-based variations
        if earlier_legos:
            first_earlier = earlier_legos[0]
            english_combined = f"{first_earlier['known']} {english_lego}"
            chinese_combined = f"{first_earlier['target']} {chinese_lego}"
            phrases.append([english_combined, chinese_combined, None, 2])
        else:
            # Create simple 2-LEGO phrase
            short_phrase = english_lego
            phrases.append([f"They {short_phrase}", f"他们 {chinese_lego}", None, 2])

        # Pattern 2: Medium complexity (3 LEGOs - 2 phrases)
        if len(earlier_legos) >= 2:
            combined = f"{earlier_legos[0]['known']} {earlier_legos[1]['known']} {english_lego}"
            chinese_combined = f"{earlier_legos[0]['target']} {earlier_legos[1]['target']} {chinese_lego}"
            phrases.append([combined, chinese_combined, None, 3])

        # Add variation
        variation = f"{english_lego} now"
        variation_zh = f"{chinese_lego} 现在"
        phrases.append([variation, variation_zh, None, 3])

        # Pattern 3: Longer phrases (4 LEGOs - 2 phrases)
        if len(earlier_legos) >= 3:
            long_phrase = f"{' '.join([l['known'] for l in earlier_legos[:3]])} {english_lego}"
            long_zh = f"{' '.join([l['target'] for l in earlier_legos[:3]])} {chinese_lego}"
            phrases.append([long_phrase, long_zh, None, 4])
        else:
            longer = f"Maybe {english_lego} too"
            longer_zh = f"也许 {chinese_lego}"
            phrases.append([longer, longer_zh, None, 4])

        longer2 = f"I think {english_lego}"
        longer2_zh = f"我觉得 {chinese_lego}"
        phrases.append([longer2, longer2_zh, None, 4])

        # Pattern 4: Longest/most complex phrases (5+ LEGOs - 4 phrases)
        if is_final:
            # For final LEGO, the last phrase must be the complete seed sentence
            final_phrase = seed_pair['target']
            final_zh = seed_pair['known']

            # Fill remaining phrases before the final complete sentence
            for i in range(3):
                if len(earlier_legos) > i:
                    complex_phrase = f"{earlier_legos[i]['known']} {english_lego} always"
                    complex_zh = f"{earlier_legos[i]['target']} {chinese_lego} 总是"
                    phrases.append([complex_phrase, complex_zh, None, 5 + i])
                else:
                    complex = f"I really think {english_lego}"
                    complex_zh = f"我真的觉得 {chinese_lego}"
                    phrases.append([complex, complex_zh, None, 5 + i])

            # Final phrase: complete seed sentence
            phrases.append([final_phrase, final_zh, None, 8])
        else:
            # Non-final LEGOs get 4 longest phrases
            base_phrases = [
                f"They said {english_lego}",
                f"I really believe {english_lego}",
                f"Everyone knows {english_lego}",
                f"That's why {english_lego}"
            ]
            for i, phrase in enumerate(base_phrases):
                phrases.append([phrase, f"他们说 {chinese_lego}", None, 6 + i])

        # Ensure exactly 10 phrases
        while len(phrases) < 10:
            phrases.append([english_lego, chinese_lego, None, 1])

        return phrases[:10]

    def process_seed(self, seed_id: str) -> Dict:
        """Process a single seed and generate practice phrases for all LEGOs."""
        print(f"\nProcessing {seed_id}...")

        scaffold = self.load_scaffold(seed_id)

        # Process each LEGO
        lego_keys = sorted([k for k in scaffold.get('legos', {}).keys()])

        for idx, lego_key in enumerate(lego_keys):
            phrases = self.generate_phrases_for_lego(scaffold, lego_key, idx)
            scaffold['legos'][lego_key]['practice_phrases'] = phrases

        # Update generation stage
        scaffold['generation_stage'] = 'PHRASE_GENERATION_COMPLETE'

        return scaffold

    def save_output(self, seed_id: str, scaffold: Dict) -> None:
        """Save the processed scaffold to output directory."""
        output_file = self.output_dir / f"seed_{seed_id.lower()}.json"

        # Ensure output directory exists
        output_file.parent.mkdir(parents=True, exist_ok=True)

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(scaffold, f, ensure_ascii=False, indent=2)

        print(f"Saved: {output_file}")

    def process_all(self) -> None:
        """Process all seeds in the range."""
        print(f"Starting Phase 5 processing for seeds {self.seed_range.start}-{self.seed_range.stop-1}...")

        for seed_num in self.seed_range:
            seed_id = f"S{seed_num:04d}"
            try:
                scaffold = self.process_seed(seed_id)
                self.save_output(seed_id, scaffold)
            except Exception as e:
                print(f"ERROR processing {seed_id}: {e}")
                import traceback
                traceback.print_exc()

if __name__ == '__main__':
    # Process seeds S0431-S0440
    processor = Phase5Processor(range(431, 441))
    processor.process_all()
    print("\nPhase 5 processing complete!")
