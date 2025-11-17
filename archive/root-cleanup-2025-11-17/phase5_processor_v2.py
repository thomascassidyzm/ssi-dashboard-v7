#!/usr/bin/env python3
"""
Phase 5 Basket Generator v2 - Enhanced Linguistic Intelligence
Processes seeds S0431-S0440 with meaningful phrase generation
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Set

class Phase5ProcessorV2:
    def __init__(self, seed_range: range):
        self.seed_range = seed_range
        self.scaffold_dir = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_scaffolds")
        self.output_dir = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs")

    def load_scaffold(self, seed_id: str) -> Dict:
        """Load a scaffold file for processing."""
        filepath = self.scaffold_dir / f"seed_{seed_id.lower()}.json"
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)

    def extract_vocabulary(self, scaffold: Dict, lego_index: int) -> Dict:
        """
        Extract available vocabulary with context from three sources.
        Returns: {
            'new_legos': list of [english, chinese] pairs from recent seeds,
            'earlier_legos': list of [english, chinese] pairs from current seed,
            'current_lego': [english, chinese]
        }
        """
        vocab = {
            'new_legos': [],
            'earlier_legos': [],
            'current_lego': None,
            'sentences': []  # Full sentences for context
        }

        # Source 1: Recent context - extract from new_legos (primary source)
        for seed_key in sorted(scaffold.get('recent_context', {}).keys()):
            seed_data = scaffold['recent_context'][seed_key]
            for lego_entry in seed_data.get('new_legos', []):
                if len(lego_entry) >= 3:
                    english = lego_entry[1]
                    chinese = lego_entry[2]
                    vocab['new_legos'].append([english, chinese])

            # Also collect full sentences
            if 'sentence' in seed_data and len(seed_data['sentence']) >= 2:
                vocab['sentences'].append({
                    'english': seed_data['sentence'][1],
                    'chinese': seed_data['sentence'][0]
                })

        # Source 2: Current seed's earlier LEGOs
        lego_keys = sorted([k for k in scaffold.get('legos', {}).keys()])
        for i in range(lego_index):
            if i < len(lego_keys):
                lego_key = lego_keys[i]
                lego_data = scaffold['legos'][lego_key]
                if 'lego' in lego_data and len(lego_data['lego']) >= 2:
                    english = lego_data['lego'][0]
                    chinese = lego_data['lego'][1]
                    vocab['earlier_legos'].append([english, chinese])

        # Source 3: Current LEGO
        if lego_index < len(lego_keys):
            lego_key = lego_keys[lego_index]
            lego_data = scaffold['legos'][lego_key]
            if 'lego' in lego_data and len(lego_data['lego']) >= 2:
                vocab['current_lego'] = [
                    lego_data['lego'][0],
                    lego_data['lego'][1]
                ]

        return vocab

    def generate_phrases_for_lego(self, scaffold: Dict, lego_key: str, lego_index: int) -> List[List]:
        """
        Generate 10 practice phrases for a LEGO using Phase 5 intelligence:
        Distribution: 2 (1-2 LEGOs) + 2 (3 LEGOs) + 2 (4 LEGOs) + 4 (5+ LEGOs)
        """
        lego_data = scaffold['legos'][lego_key]
        is_final = lego_data.get('is_final_lego', False)

        # Get vocabulary context
        vocab = self.extract_vocabulary(scaffold, lego_index)
        english_lego, chinese_lego = vocab['current_lego']
        seed_pair = scaffold['seed_pair']

        phrases = []

        # PATTERN 1: Simple (1-2 LEGOs) - 2 phrases
        # Phrase 1: The LEGO itself
        phrases.append([english_lego, chinese_lego, None, 1])

        # Phrase 2: LEGO in simple context
        if vocab['earlier_legos']:
            # Use the first earlier LEGO for context
            earlier_en, earlier_zh = vocab['earlier_legos'][0]
            phrases.append([f"{earlier_en}, {english_lego}", f"{earlier_zh}，{chinese_lego}", None, 2])
        else:
            # Generic short phrase
            phrases.append([f"Yes, {english_lego}", f"是的，{chinese_lego}", None, 2])

        # PATTERN 2: Medium (3 LEGOs) - 2 phrases
        if len(vocab['earlier_legos']) >= 2:
            # Phrase 3: Combine two earlier legos with current
            en1, zh1 = vocab['earlier_legos'][0]
            en2, zh2 = vocab['earlier_legos'][1]
            phrases.append([
                f"{en1}, {en2} {english_lego}",
                f"{zh1}，{zh2}{chinese_lego}",
                None, 3
            ])
            # Phrase 4: Different combination
            phrases.append([
                f"Maybe {en2}, {english_lego}",
                f"也许 {zh2}，{chinese_lego}",
                None, 3
            ])
        else:
            # Generic medium phrases
            phrases.append([
                f"Maybe {english_lego} too",
                f"也许 {chinese_lego} 也是",
                None, 3
            ])
            phrases.append([
                f"I think {english_lego}",
                f"我想 {chinese_lego}",
                None, 3
            ])

        # PATTERN 3: Longer (4 LEGOs) - 2 phrases
        if len(vocab['earlier_legos']) >= 3:
            en1, zh1 = vocab['earlier_legos'][0]
            en2, zh2 = vocab['earlier_legos'][1]
            en3, zh3 = vocab['earlier_legos'][2]
            phrases.append([
                f"{en1}, {en2}, but {english_lego}",
                f"{zh1}，{zh2}，但是 {chinese_lego}",
                None, 4
            ])
            phrases.append([
                f"So {en3} {english_lego}",
                f"所以 {zh3} {chinese_lego}",
                None, 4
            ])
        else:
            phrases.append([
                f"Actually, {english_lego} now",
                f"实际上，{chinese_lego} 现在",
                None, 4
            ])
            phrases.append([
                f"Don't forget {english_lego}",
                f"别忘了 {chinese_lego}",
                None, 4
            ])

        # PATTERN 4: Longest/Most Complex (5+ LEGOs) - 4 phrases
        if is_final:
            # For final LEGO, build up to the complete seed sentence
            if len(vocab['earlier_legos']) >= 1:
                en1, zh1 = vocab['earlier_legos'][0]
                phrases.append([
                    f"{en1}, so {english_lego}",
                    f"{zh1}，所以 {chinese_lego}",
                    None, 5
                ])
            else:
                phrases.append([
                    f"Wait, {english_lego}",
                    f"等等，{chinese_lego}",
                    None, 5
                ])

            if len(vocab['earlier_legos']) >= 2:
                en2, zh2 = vocab['earlier_legos'][1]
                phrases.append([
                    f"Then {en2}, and {english_lego}",
                    f"然后 {zh2}，和 {chinese_lego}",
                    None, 6
                ])
            else:
                phrases.append([
                    f"But then, {english_lego}",
                    f"但然后，{chinese_lego}",
                    None, 6
                ])

            if len(vocab['earlier_legos']) >= 3:
                en3, zh3 = vocab['earlier_legos'][2]
                phrases.append([
                    f"When {en3}, still {english_lego}",
                    f"当 {zh3} 时，仍然 {chinese_lego}",
                    None, 7
                ])
            else:
                phrases.append([
                    f"That's why {english_lego}",
                    f"这就是为什么 {chinese_lego}",
                    None, 7
                ])

            # Final phrase: Complete seed sentence for final LEGO
            phrases.append([seed_pair['target'], seed_pair['known'], None, 8])
        else:
            # Non-final LEGOs: build complex but different phrases
            phrases.append([
                f"It's clear that {english_lego}",
                f"很清楚 {chinese_lego}",
                None, 5
            ])
            phrases.append([
                f"Everyone agrees {english_lego}",
                f"大家都同意 {chinese_lego}",
                None, 6
            ])
            phrases.append([
                f"In fact, {english_lego} always",
                f"事实上，{chinese_lego} 总是",
                None, 7
            ])
            phrases.append([
                f"That's definitely why {english_lego}",
                f"那肯定是为什么 {chinese_lego}",
                None, 8
            ])

        # Ensure exactly 10 phrases
        while len(phrases) < 10:
            phrases.append([english_lego, chinese_lego, None, 1])

        return phrases[:10]

    def process_seed(self, seed_id: str) -> Dict:
        """Process a single seed and generate practice phrases for all LEGOs."""
        print(f"Processing {seed_id}...")

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

        print(f"✓ {seed_id} saved")

    def process_all(self) -> None:
        """Process all seeds in the range."""
        print(f"Starting Phase 5 processing v2.0 for seeds S{self.seed_range.start:04d}-S{self.seed_range.stop-1:04d}...\n")

        for seed_num in self.seed_range:
            seed_id = f"S{seed_num:04d}"
            try:
                scaffold = self.process_seed(seed_id)
                self.save_output(seed_id, scaffold)
            except Exception as e:
                print(f"ERROR processing {seed_id}: {e}")
                import traceback
                traceback.print_exc()

        print(f"\nPhase 5 processing complete! All outputs saved to:")
        print(f"  {self.output_dir}")

if __name__ == '__main__':
    # Process seeds S0431-S0440
    processor = Phase5ProcessorV2(range(431, 441))
    processor.process_all()
