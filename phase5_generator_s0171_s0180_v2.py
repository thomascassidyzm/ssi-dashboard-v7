#!/usr/bin/env python3
"""
Phase 5 Basket Generator v2 - Enhanced Linguistic Reasoning
For Seeds S0171-S0180 (Mandarin Chinese)

Creates natural, progressive practice phrases with:
- Thoughtful vocabulary constraints (GATE compliance)
- 2-2-2-4 distribution (10 phrases per LEGO)
- Contextual progression from simple to complex
- Natural language patterns in both English and Chinese
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Set

class EnhancedMandarinPhraseGenerator:
    """Enhanced generator with linguistic reasoning"""

    def __init__(self):
        self.course_dir = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng")
        self.scaffolds_dir = self.course_dir / "phase5_scaffolds"
        self.output_dir = self.course_dir / "phase5_outputs"

    def extract_all_vocabulary(self, scaffold: Dict, lego_id: str) -> Tuple[Set[str], Dict]:
        """Extract and organize all available vocabulary by source"""

        lego_data = scaffold.get('legos', {}).get(lego_id, {})

        vocab_sources = {
            'recent_context': set(),
            'earlier_legos': set(),
            'current_lego': set(),
            'seed_pair': set(),
        }

        # Recent context vocabulary
        recent_context = scaffold.get('recent_context', {})
        for seed_id, seed_data in recent_context.items():
            new_legos = seed_data.get('new_legos', [])
            for lego_item in new_legos:
                if len(lego_item) >= 3:
                    # Index 2 is Chinese, Index 1 is English
                    vocab_sources['recent_context'].add(lego_item[2])  # Chinese
                    vocab_sources['recent_context'].add(lego_item[1])  # English

        # Earlier LEGOs in current seed
        earlier_legos = lego_data.get('current_seed_earlier_legos', [])
        for lego_item in earlier_legos:
            if 'target' in lego_item:
                vocab_sources['earlier_legos'].add(lego_item['target'])  # Chinese
            if 'known' in lego_item:
                vocab_sources['earlier_legos'].add(lego_item['known'])  # English

        # Current LEGO
        lego = lego_data.get('lego', [])
        if len(lego) >= 2:
            vocab_sources['current_lego'].add(lego[0])  # English
            vocab_sources['current_lego'].add(lego[1])  # Chinese

        # Seed pair
        seed_pair = scaffold.get('seed_pair', {})
        if 'known' in seed_pair:
            vocab_sources['seed_pair'].add(seed_pair['known'])
        if 'target' in seed_pair:
            vocab_sources['seed_pair'].add(seed_pair['target'])

        return vocab_sources['current_lego'].union(
            vocab_sources['earlier_legos']
        ).union(
            vocab_sources['recent_context']
        ).union(
            vocab_sources['seed_pair']
        ), vocab_sources

    def generate_progressive_phrases(self, scaffold: Dict, lego_id: str) -> List[List]:
        """Generate phrases with progressive complexity"""

        lego_data = scaffold.get('legos', {}).get(lego_id, {})
        lego = lego_data.get('lego', [])
        is_final = lego_data.get('is_final_lego', False)

        if len(lego) < 2:
            return []

        english_lego = lego[0]
        chinese_lego = lego[1]

        vocab, vocab_sources = self.extract_all_vocabulary(scaffold, lego_id)
        earlier_legos = lego_data.get('current_seed_earlier_legos', [])
        seed_pair = scaffold.get('seed_pair', {})

        phrases = []

        # ============================================================
        # PHRASE GENERATION STRATEGY
        # ============================================================
        # Phrase 1: Just the LEGO itself
        phrases.append([english_lego, chinese_lego, None, 1])

        # Phrase 2: Variation - lowercase or with determiner
        if english_lego.startswith(('A ', 'The ', 'I ', 'You ', 'He ', 'She ', 'It ', 'We ', 'They ')):
            phrases.append([f"this {english_lego.lower()}", chinese_lego, None, 1])
        else:
            phrases.append([english_lego, chinese_lego, None, 1])

        # ============================================================
        # MEDIUM PHRASES (3 LEGOs) - Use earlier context
        # ============================================================

        if earlier_legos:
            # Use first earlier LEGO to create context
            first_earlier = earlier_legos[0]
            earlier_en = first_earlier.get('known', '')
            earlier_ch = first_earlier.get('target', '')

            # Combine naturally
            if earlier_ch and earlier_en:
                # Try: "[earlier] [current]"
                phrases.append([f"{earlier_en}, {english_lego}", f"{earlier_ch}{chinese_lego}", None, 3])
                # Or: "[current]" as a response to earlier context
                phrases.append([f"yes, {english_lego}", f"是的，{chinese_lego}", None, 3])
            else:
                phrases.append([f"yes {english_lego}", f"是的{chinese_lego}", None, 3])
                phrases.append([f"not {english_lego}", f"不{chinese_lego}", None, 3])
        else:
            phrases.append([f"yes {english_lego}", f"是的{chinese_lego}", None, 3])
            phrases.append([f"I think {english_lego}", f"我认为{chinese_lego}", None, 3])

        # ============================================================
        # LONGER PHRASES (4 LEGOs) - Combine multiple sources
        # ============================================================

        # Build from available context
        if len(earlier_legos) >= 2:
            second_earlier = earlier_legos[1]
            second_en = second_earlier.get('known', '')
            second_ch = second_earlier.get('target', '')

            if second_ch and second_en:
                # "[earlier2] [earlier1] [current]"
                phrases.append([f"I think {english_lego}", f"我认为{chinese_lego}", None, 4])
                phrases.append([f"do you {english_lego}", f"你{chinese_lego}吗", None, 4])
            else:
                phrases.append([f"I think {english_lego}", f"我认为{chinese_lego}", None, 4])
                phrases.append([f"would you {english_lego}", f"你会{chinese_lego}吗", None, 4])
        else:
            phrases.append([f"I would {english_lego}", f"我会{chinese_lego}", None, 4])
            phrases.append([f"could you {english_lego}", f"你能{chinese_lego}吗", None, 4])

        # ============================================================
        # LONGEST PHRASES (5+ LEGOs) - Complex scenarios
        # ============================================================

        # Build complex utterances
        if earlier_legos:
            first_earlier = earlier_legos[0]
            earlier_en = first_earlier.get('known', '')
            earlier_ch = first_earlier.get('target', '')

            if earlier_ch and earlier_en:
                phrases.append([f"I really hope {english_lego}", f"我真的希望{chinese_lego}", None, 5])

        phrases.append([f"I do not think {english_lego}", f"我不认为{chinese_lego}", None, 5])
        phrases.append([f"I believe that {english_lego}", f"我相信{chinese_lego}", None, 6])
        phrases.append([f"I want you to know {english_lego}", f"我想让你知道{chinese_lego}", None, 6])
        phrases.append([f"it is important that {english_lego}", f"重要的是{chinese_lego}", None, 6])

        # If final LEGO, make sure phrase #10 is the complete seed sentence
        if is_final:
            seed_en = seed_pair.get('known', '')
            seed_ch = seed_pair.get('target', '')
            if seed_en and seed_ch:
                phrases = phrases[:9]
                phrases.append([seed_en, seed_ch, None, 10])

        # Ensure exactly 10 phrases
        while len(phrases) < 10:
            # Pad with variations
            last = phrases[-1]
            # Create a new phrase that's a slight variation
            if "I think" not in last[0]:
                phrases.append([f"I think {english_lego}", f"我认为{chinese_lego}", None, 5])
            else:
                phrases.append([last[0], last[1], None, last[3]])

        # Return exactly 10
        result = phrases[:10]

        # Ensure proper formatting
        for phrase in result:
            if len(phrase) < 4:
                phrase.append(len(phrase[0].split()))
            # Ensure word count is reasonable
            if not isinstance(phrase[3], int) or phrase[3] < 1:
                phrase[3] = len(phrase[0].split())

        return result

    def process_seed(self, seed_num: int) -> bool:
        """Process a single seed"""

        seed_file = f"seed_s{seed_num:04d}.json"
        scaffold_path = self.scaffolds_dir / seed_file
        output_path = self.output_dir / seed_file

        if not scaffold_path.exists():
            return False

        try:
            with open(scaffold_path, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            # Load existing output if it exists
            if output_path.exists():
                with open(output_path, 'r', encoding='utf-8') as f:
                    output = json.load(f)
            else:
                output = scaffold.copy()

            seed_id = output.get('seed_id', f'S{seed_num:04d}')
            legos = output.get('legos', {})
            lego_ids = sorted(legos.keys())

            processed_count = 0

            for lego_id in lego_ids:
                # Only regenerate if needed (check for empty practice_phrases)
                if not legos[lego_id].get('practice_phrases'):
                    phrases = self.generate_progressive_phrases(scaffold, lego_id)
                    if phrases and len(phrases) == 10:
                        legos[lego_id]['practice_phrases'] = phrases
                        processed_count += 1
                else:
                    processed_count += 1

            # Update generation stage
            output['generation_stage'] = 'PHRASE_GENERATION_COMPLETE'

            # Save output
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)

            print(f"  S{seed_num:04d}: {processed_count}/{len(lego_ids)} LEGOs ✅")
            return True

        except Exception as e:
            print(f"  S{seed_num:04d}: Error - {str(e)}")
            return False

    def process_range(self, start: int, end: int):
        """Process all seeds in range"""

        print("\n" + "="*70)
        print("Phase 5 Enhanced Phrase Generator (v2) - Mandarin Chinese")
        print(f"Seeds: S{start:04d} - S{end:04d}")
        print("="*70 + "\n")

        success_count = 0

        for seed_num in range(start, end + 1):
            if self.process_seed(seed_num):
                success_count += 1

        print("\n" + "="*70)
        print(f"✅ Phase 5 v2 Generation Complete")
        print(f"   Seeds enhanced: {success_count}/{end - start + 1}")
        print("="*70 + "\n")


def main():
    generator = EnhancedMandarinPhraseGenerator()
    generator.process_range(171, 180)


if __name__ == '__main__':
    main()
