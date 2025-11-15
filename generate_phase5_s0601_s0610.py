#!/usr/bin/env python3
"""
Phase 5 Content Generator for seeds S0601-S0610
Generates practice phrases following Phase 5 Intelligence v7.0
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Any
import random

class Phase5ContentGenerator:
    """Generates Phase 5 content for CMN course"""

    def __init__(self):
        self.scaffold_dir = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_scaffolds")
        self.output_dir = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs")
        self.seeds = ["S0601", "S0602", "S0603", "S0604", "S0605", "S0606", "S0607", "S0608", "S0609", "S0610"]

    def load_scaffold(self, seed_id: str) -> Dict[str, Any]:
        """Load scaffold file for a seed"""
        scaffold_file = self.scaffold_dir / f"seed_{seed_id.lower()}.json"
        with open(scaffold_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def build_vocabulary_pool(self, scaffold: Dict) -> Dict[str, str]:
        """Build available vocabulary from recent context and current seed"""
        vocab = {}

        # Add from recent context (recent 10 seeds)
        if 'recent_context' in scaffold:
            for seed_key, seed_data in scaffold['recent_context'].items():
                if 'new_legos' in seed_data:
                    for lego_info in seed_data['new_legos']:
                        # lego_info format: [id, english, chinese]
                        if len(lego_info) >= 3:
                            english = lego_info[1]
                            chinese = lego_info[2]
                            vocab[english] = chinese

        return vocab

    def generate_phrase_variants(self, english: str, chinese: str,
                                earlier_legos: List[Dict], vocab: Dict[str, str],
                                target_count: int = 10) -> List[List]:
        """Generate practice phrase variants for a LEGO"""
        phrases = []

        # Distribution: 2-2-2-4 (short_1_to_2, medium_3, longer_4, longest_5)
        distribution = [
            (1, 2),  # 2 phrases with index 1
            (2, 2),  # 2 phrases with index 2
            (3, 2),  # 2 phrases with index 3
            (4, 4),  # 4 phrases with index 4
        ]

        phrase_index = 1
        used_phrases = set()

        for complexity_level, count in distribution:
            for _ in range(count):
                # Generate phrase based on complexity
                if complexity_level == 1:
                    # Just the current LEGO
                    phrase = self._generate_simple_phrase(english, chinese)
                elif complexity_level == 2:
                    # Current LEGO with minimal context
                    phrase = self._generate_with_minimal_context(english, chinese, earlier_legos, vocab)
                elif complexity_level == 3:
                    # Current LEGO with moderate context
                    phrase = self._generate_with_context(english, chinese, earlier_legos, vocab)
                else:  # 4+
                    # Current LEGO with more complex context
                    phrase = self._generate_extended_phrase(english, chinese, earlier_legos, vocab)

                if phrase:
                    phrase_tuple = (phrase[0], phrase[1])
                    if phrase_tuple not in used_phrases:
                        phrases.append([phrase[0], phrase[1], None, phrase_index])
                        used_phrases.add(phrase_tuple)
                        phrase_index += 1
                    elif len(phrases) < target_count:
                        # Allow some variation even if similar
                        phrases.append([phrase[0], phrase[1], None, phrase_index])
                        phrase_index += 1

        # Ensure we have exactly target_count phrases
        while len(phrases) < target_count:
            phrase = self._generate_simple_phrase(english, chinese)
            if phrase:
                phrases.append([phrase[0], phrase[1], None, min(4, phrase_index % 4 + 1)])

        return phrases[:target_count]

    def _generate_simple_phrase(self, english: str, chinese: str) -> Tuple[str, str]:
        """Generate a simple phrase (just the LEGO)"""
        return (english, chinese)

    def _generate_with_minimal_context(self, english: str, chinese: str,
                                       earlier_legos: List[Dict], vocab: Dict[str, str]) -> Tuple[str, str]:
        """Generate phrase with one earlier LEGO"""
        if not earlier_legos:
            return (english, chinese)

        # Pick a recent earlier LEGO
        earlier = random.choice(earlier_legos[-2:] if len(earlier_legos) > 1 else earlier_legos)
        eng_earlier = earlier.get('known', '')
        cmn_earlier = earlier.get('target', '')

        if eng_earlier and cmn_earlier:
            # Combine with the current LEGO
            combined_eng = f"{eng_earlier} {english}"
            combined_cmn = f"{cmn_earlier}{chinese}"
            return (combined_eng, combined_cmn)

        return (english, chinese)

    def _generate_with_context(self, english: str, chinese: str,
                              earlier_legos: List[Dict], vocab: Dict[str, str]) -> Tuple[str, str]:
        """Generate phrase with context from 2-3 earlier LEGOs"""
        if len(earlier_legos) < 2:
            return self._generate_with_minimal_context(english, chinese, earlier_legos, vocab)

        # Pick 2 recent earlier LEGOs
        sample_size = min(3, len(earlier_legos))
        picked = random.sample(earlier_legos[-sample_size:], min(2, sample_size))

        eng_parts = []
        cmn_parts = []

        for lego in picked:
            eng_parts.append(lego.get('known', ''))
            cmn_parts.append(lego.get('target', ''))

        eng_parts.append(english)
        cmn_parts.append(chinese)

        # Filter empty strings and combine
        eng_parts = [p for p in eng_parts if p]
        cmn_parts = [p for p in cmn_parts if p]

        if eng_parts and cmn_parts:
            return (' '.join(eng_parts), ''.join(cmn_parts))

        return (english, chinese)

    def _generate_extended_phrase(self, english: str, chinese: str,
                                 earlier_legos: List[Dict], vocab: Dict[str, str]) -> Tuple[str, str]:
        """Generate phrase with more complex context"""
        if len(earlier_legos) < 1:
            return (english, chinese)

        # Build from multiple earlier LEGOs
        eng_parts = []
        cmn_parts = []

        # Add context from 2-3 earlier LEGOs
        sample_size = min(3, len(earlier_legos))
        picked = random.sample(earlier_legos[-sample_size:], sample_size)

        for lego in picked:
            eng_parts.append(lego.get('known', ''))
            cmn_parts.append(lego.get('target', ''))

        eng_parts.append(english)
        cmn_parts.append(chinese)

        # Filter and combine
        eng_parts = [p for p in eng_parts if p]
        cmn_parts = [p for p in cmn_parts if p]

        if eng_parts and cmn_parts:
            return (' '.join(eng_parts), ''.join(cmn_parts))

        return (english, chinese)

    def process_lego(self, lego_id: str, lego_data: Dict, scaffold: Dict) -> Dict:
        """Process a single LEGO and generate practice phrases"""
        english = lego_data['lego'][0] if isinstance(lego_data['lego'], list) else lego_data['lego']
        chinese = lego_data['lego'][1] if isinstance(lego_data['lego'], list) else ''

        # Build vocabulary pool
        vocab = self.build_vocabulary_pool(scaffold)

        # Get earlier LEGOs for context
        earlier_legos = lego_data.get('current_seed_earlier_legos', [])

        # Generate practice phrases
        target_count = lego_data.get('target_phrase_count', 10)
        practice_phrases = self.generate_phrase_variants(
            english, chinese, earlier_legos, vocab, target_count
        )

        # Update the LEGO with generated phrases
        updated_lego = lego_data.copy()
        updated_lego['practice_phrases'] = practice_phrases

        return updated_lego

    def generate_for_seed(self, seed_id: str) -> None:
        """Generate Phase 5 content for a single seed"""
        print(f"Processing {seed_id}...", end=" ", flush=True)

        # Load scaffold
        scaffold = self.load_scaffold(seed_id)

        # Process each LEGO
        if 'legos' in scaffold:
            for lego_id, lego_data in scaffold['legos'].items():
                scaffold['legos'][lego_id] = self.process_lego(lego_id, lego_data, scaffold)

        # Update generation stage
        scaffold['generation_stage'] = 'PHRASE_GENERATION_COMPLETE'

        # Write output
        output_file = self.output_dir / f"seed_{seed_id.lower()}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(scaffold, f, ensure_ascii=False, indent=2)

        print("✓")

    def generate_all(self) -> None:
        """Generate content for all seeds"""
        print(f"\nPhase 5 Content Generator for CMN Course (S0601-S0610)")
        print("=" * 60)

        for seed_id in self.seeds:
            try:
                self.generate_for_seed(seed_id)
            except Exception as e:
                print(f"✗ Error: {str(e)}")

        print("\n" + "=" * 60)
        print(f"Generation complete! Output files written to:")
        print(f"{self.output_dir}")


if __name__ == "__main__":
    generator = Phase5ContentGenerator()
    generator.generate_all()
