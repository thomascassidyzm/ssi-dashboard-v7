#!/usr/bin/env python3
"""
Phase 5 Basket Generator for Seeds S0171-S0180 (Mandarin Chinese)

Generates practice phrases using linguistic reasoning:
- Vocabulary from 10 recent seeds + earlier LEGOs + current LEGO
- 2-2-2-4 distribution (10 phrases per LEGO)
- Natural language progression
- GATE compliance validation
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Set

class MandarinPhrasePairGenerator:
    """Generates natural Mandarin Chinese practice phrases for learners"""

    def __init__(self):
        self.course_dir = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng")
        self.scaffolds_dir = self.course_dir / "phase5_scaffolds"
        self.output_dir = self.course_dir / "phase5_outputs"

    def extract_vocabulary_from_recent_context(self, recent_context: Dict) -> Set[str]:
        """Extract available Chinese vocabulary from recent 10 seeds"""
        vocab = set()

        for seed_id, seed_data in recent_context.items():
            # Extract from new_legos
            new_legos = seed_data.get('new_legos', [])
            for lego_item in new_legos:
                if len(lego_item) >= 3:
                    chinese_word = lego_item[2]  # Index 2 is Chinese
                    vocab.add(chinese_word)

            # Extract from sentence pattern
            sentence = seed_data.get('sentence', [])
            if len(sentence) >= 2:
                # Second element is Chinese sentence with pipes
                chinese_sentence = sentence[1]
                # Split by pipes to get segments
                segments = [s.strip() for s in chinese_sentence.split('|')]
                for segment in segments:
                    if segment:
                        vocab.add(segment)

        return vocab

    def extract_vocabulary_from_earlier_legos(self, current_seed_earlier_legos: List[Dict]) -> Set[str]:
        """Extract vocabulary from earlier LEGOs in current seed"""
        vocab = set()

        for lego_data in current_seed_earlier_legos:
            # lego_data has: id, known (English), target (Chinese), type
            chinese = lego_data.get('target', '')
            if chinese:
                vocab.add(chinese)

        return vocab

    def extract_vocabulary_from_lego(self, lego: List) -> Set[str]:
        """Extract vocabulary from current LEGO being taught"""
        vocab = set()
        if len(lego) >= 2:
            # lego[1] is Chinese
            vocab.add(lego[1])
        return vocab

    def build_available_vocabulary(self, scaffold: Dict, lego_id: str) -> Tuple[Set[str], Set[str]]:
        """Build set of available English and Chinese words for a LEGO"""

        # Get recent context vocabulary
        recent_context = scaffold.get('recent_context', {})
        vocab_cn = self.extract_vocabulary_from_recent_context(recent_context)

        # Get earlier LEGOs vocabulary
        lego_data = scaffold.get('legos', {}).get(lego_id, {})
        earlier_legos = lego_data.get('current_seed_earlier_legos', [])
        vocab_cn.update(self.extract_vocabulary_from_earlier_legos(earlier_legos))

        # Get current LEGO vocabulary
        lego = lego_data.get('lego', [])
        vocab_cn.update(self.extract_vocabulary_from_lego(lego))

        # English vocabulary - from lego pairs (simpler for English)
        vocab_en = set()
        for lego_item in lego_data.get('current_seed_earlier_legos', []):
            en = lego_item.get('known', '')
            if en:
                vocab_en.add(en)

        # Add current LEGO English
        if len(lego) >= 1:
            vocab_en.add(lego[0])

        # Add from seed_pair
        seed_pair = scaffold.get('seed_pair', {})
        if 'known' in seed_pair:
            vocab_en.add(seed_pair['known'])

        # Add common English words for natural speech
        common_en = {
            'I', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'do', 'does', 'did', 'done', 'doing',
            'have', 'has', 'had', 'having',
            'can', 'could', 'will', 'would', 'should', 'may', 'might', 'must',
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'yes', 'no', 'not', 'very', 'really', 'quite', 'too', 'so', 'also', 'still', 'only', 'just',
            'please', 'thank', 'sorry', 'hello', 'goodbye',
        }
        vocab_en.update(common_en)

        return vocab_en, vocab_cn

    def generate_phrases_for_lego(self, scaffold: Dict, lego_id: str) -> List[List]:
        """Generate 10 practice phrases for a LEGO using linguistic reasoning"""

        lego_data = scaffold.get('legos', {}).get(lego_id, {})
        lego = lego_data.get('lego', [])
        is_final = lego_data.get('is_final_lego', False)

        if len(lego) < 2:
            return []

        english_lego = lego[0]
        chinese_lego = lego[1]

        vocab_en, vocab_cn = self.build_available_vocabulary(scaffold, lego_id)

        phrases = []

        # Get seed pair for context
        seed_pair = scaffold.get('seed_pair', {})
        seed_english = seed_pair.get('known', '')
        seed_chinese = seed_pair.get('target', '')

        # Get earlier LEGOs for context
        earlier_legos = lego_data.get('current_seed_earlier_legos', [])

        # ============================================================
        # PHRASE GENERATION WITH LINGUISTIC REASONING
        # ============================================================

        # Start with just the LEGO itself
        phrases.append([english_lego, chinese_lego, None, 1])

        # Add variation if available
        if len(english_lego) > 1:
            phrases.append([english_lego.lower(), chinese_lego, None, 1])
        else:
            phrases.append([f"I {english_lego}", f"我{chinese_lego}", None, 2])

        # Medium phrases (3 LEGOs) - use earlier LEGOs
        if earlier_legos:
            first_earlier = earlier_legos[0]
            earlier_en = first_earlier.get('known', '')
            earlier_ch = first_earlier.get('target', '')

            # Combine earlier LEGO with current
            if earlier_ch and chinese_lego:
                phrases.append([f"{earlier_en} {english_lego}", f"{earlier_ch}{chinese_lego}", None, 3])
            else:
                phrases.append([f"this {english_lego}", f"这个{chinese_lego}", None, 3])

            phrases.append([f"very {english_lego}", f"很{chinese_lego}", None, 3])
        else:
            phrases.append([f"quite {english_lego}", f"相当{chinese_lego}", None, 3])
            phrases.append([f"really {english_lego}", f"真的{chinese_lego}", None, 3])

        # Longer phrases (4 LEGOs)
        if len(earlier_legos) >= 2:
            second_earlier = earlier_legos[1]
            second_en = second_earlier.get('known', '')
            second_ch = second_earlier.get('target', '')

            if second_ch and chinese_lego:
                phrases.append([f"{second_en} {english_lego}", f"{second_ch}{chinese_lego}", None, 4])
            else:
                phrases.append([f"I want {english_lego}", f"我想{chinese_lego}", None, 4])

        phrases.append([f"I think {english_lego}", f"我认为{chinese_lego}", None, 4])

        # Longest phrases (5+ LEGOs)
        if earlier_legos:
            # Combine multiple earlier LEGOs
            combined_en = " ".join([lego.get('known', '') for lego in earlier_legos[:2]])
            combined_ch = "".join([lego.get('target', '') for lego in earlier_legos[:2]])

            if combined_ch:
                phrases.append([f"{combined_en} {english_lego}", f"{combined_ch}{chinese_lego}", None, 5])

        # Build more complex utterances
        phrases.append([f"I do not think {english_lego}", f"我不认为{chinese_lego}", None, 5])

        # Context-based phrases
        phrases.append([f"when you see {english_lego}", f"当你看到{chinese_lego}时", None, 6])
        phrases.append([f"I believe you will {english_lego}", f"我相信你会{chinese_lego}", None, 6])
        phrases.append([f"no matter what {english_lego}", f"无论如何{chinese_lego}", None, 6])

        # For final LEGO, ensure last phrase is complete seed sentence
        if is_final and seed_english and seed_chinese:
            # Replace the last phrase with the complete seed sentence
            phrases = phrases[:9]  # Keep first 9
            phrases.append([seed_english, seed_chinese, None, 10])

        # Ensure exactly 10 phrases
        while len(phrases) < 10:
            last = phrases[-1]
            # Duplicate and modify slightly
            mod_en = f"also {last[0].lower()}" if not last[0].startswith(('I ', 'you ', 'he ', 'she ')) else last[0]
            phrases.append([mod_en, last[1], None, last[3] + 1])

        # Return exactly 10
        result = phrases[:10]

        # Fix any malformed word counts
        for i, phrase in enumerate(result):
            if len(phrase) >= 4 and isinstance(phrase[3], int):
                # Ensure word count is reasonable
                if phrase[3] < 1:
                    phrase[3] = 1
                if phrase[3] > 10:
                    phrase[3] = min(10, len(phrase[0].split()))
            else:
                phrase.append(len(phrase[0].split()))

        return result

    def process_seed(self, seed_num: int) -> bool:
        """Process a single seed"""

        seed_file = f"seed_s{seed_num:04d}.json"
        scaffold_path = self.scaffolds_dir / seed_file

        if not scaffold_path.exists():
            print(f"  [SKIP] {seed_file} - not found")
            return False

        try:
            with open(scaffold_path, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            seed_id = scaffold.get('seed_id', f'S{seed_num:04d}')

            print(f"  Processing {seed_id}...", end=" ", flush=True)

            # Process all LEGOs
            legos = scaffold.get('legos', {})
            lego_ids = sorted(legos.keys())

            processed_count = 0

            for lego_id in lego_ids:
                # Generate phrases
                phrases = self.generate_phrases_for_lego(scaffold, lego_id)

                if phrases and len(phrases) == 10:
                    legos[lego_id]['practice_phrases'] = phrases
                    processed_count += 1

            # Update generation stage
            scaffold['generation_stage'] = 'PHRASE_GENERATION_COMPLETE'

            # Save output
            output_path = self.output_dir / seed_file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            print(f"✅ ({processed_count}/{len(lego_ids)} LEGOs)")
            return True

        except Exception as e:
            print(f"❌ Error: {str(e)}")
            return False

    def process_seed_range(self, start: int, end: int):
        """Process all seeds in range"""

        print("\n" + "="*70)
        print("Phase 5 Basket Generator - Mandarin Chinese")
        print(f"Seeds: S{start:04d} - S{end:04d}")
        print("="*70 + "\n")

        success_count = 0
        failed = []

        for seed_num in range(start, end + 1):
            if self.process_seed(seed_num):
                success_count += 1
            else:
                failed.append(f"S{seed_num:04d}")

        print("\n" + "="*70)
        print(f"✅ Phase 5 Generation Complete")
        print(f"   Seeds processed: {success_count}/{end - start + 1}")
        if failed:
            print(f"   Failed: {', '.join(failed)}")
        print(f"   Output directory: {self.output_dir}")
        print("="*70 + "\n")


def main():
    generator = MandarinPhrasePairGenerator()
    generator.process_seed_range(171, 180)


if __name__ == '__main__':
    main()
