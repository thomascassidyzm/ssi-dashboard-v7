#!/usr/bin/env python3
"""
Phase 5 Content Generator for Seeds S0201-S0210
Generates practice phrases for Mandarin Chinese LEGOs following 2-2-2-4 distribution
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple

class MandarinPhraseGenerator:
    """Generates natural Mandarin practice phrases"""

    def __init__(self):
        # Common Mandarin phrases and patterns
        self.simple_starters = ['我', '你', '他', '她', '我们', '他们', '这是', '那是', '有']
        self.modifiers = ['很', '都', '也', '不', '可以', '想', '需要', '应该', '能够']
        self.time_words = ['今天', '昨天', '明天', '现在', '晚上', '早上', '下午', '中午']
        self.connectors = ['和', '或', '但是', '因为', '所以', '如果', '那么']
        self.question_forms = ['吗', '呢', '吗', '呀']

    def extract_vocabulary(self, earlier_legos: List[Dict], recent_context: Dict) -> Dict[str, str]:
        """Extract available vocabulary from LEGOs"""
        vocab = {}

        # Add current seed's earlier LEGOs
        for lego in earlier_legos:
            english = lego.get('known', '')
            chinese = lego.get('target', '')
            if english and chinese:
                vocab[english] = chinese

        # Add recent context LEGOs
        for seed_id, seed_info in recent_context.items():
            if 'new_legos' in seed_info:
                for lego_entry in seed_info['new_legos']:
                    if len(lego_entry) >= 3:
                        english = lego_entry[1]
                        chinese = lego_entry[2]
                        vocab[english] = chinese

        return vocab

    def generate_short_phrases(self, english: str, chinese: str, vocab: Dict, count: int = 2) -> List[List]:
        """Generate short phrases (1-2 word length)"""
        phrases = []

        # First phrase: just the LEGO itself
        phrases.append([english, chinese, None, len(english.split())])

        if len(phrases) < count:
            # Second phrase: simple context
            if english in vocab or '的' not in chinese:
                # Try using a simple modifier
                modifiers = [('a', '一'), ('the', '这'), ('this', '这个')]
                modifier_en, modifier_zh = modifiers[len(phrases) % len(modifiers)]
                phrases.append([f"{modifier_en} {english}", f"{modifier_zh}{chinese}", None, 2])

        return phrases[:count]

    def generate_medium_phrases(self, english: str, chinese: str, vocab: Dict,
                                is_first_medium: bool = False, count: int = 2) -> List[List]:
        """Generate medium phrases (3 words)"""
        phrases = []

        if is_first_medium:
            # Often repeat the short phrase first
            phrases.append([english, chinese, None, len(english.split())])

        # Add context-building phrases
        simple_prefixes = [
            ('I', '我'),
            ('you', '你'),
            ('can', '可以'),
            ('want to', '想'),
            ('need to', '需要'),
        ]

        for prefix_en, prefix_zh in simple_prefixes:
            if len(phrases) < count:
                combined_en = f"{prefix_en} {english}"
                combined_zh = f"{prefix_zh}{chinese}"
                phrases.append([combined_en, combined_zh, None, len(combined_en.split())])

        return phrases[:count]

    def generate_longer_phrases(self, english: str, chinese: str, vocab: Dict, count: int = 2) -> List[List]:
        """Generate longer phrases (4+ words)"""
        phrases = []

        # More complex sentence structures with templates
        templates = [
            ("I like to", "我喜欢"),
            ("I want to", "我想"),
            ("Can you", "你能"),
            ("We should", "我们应该"),
            ("They might", "他们可能"),
        ]

        chinese_templates = [
            "我真的",
            "你现在",
            "他们都",
            "我们可以",
            "你想",
        ]

        for i, (template_en, template_zh) in enumerate(templates):
            if len(phrases) < count:
                combined_en = f"{template_en} {english}"
                combined_zh = f"{template_zh}{chinese}"
                phrases.append([combined_en, combined_zh, None, len(combined_en.split())])

        return phrases[:count]

    def generate_longest_phrases(self, english: str, chinese: str, vocab: Dict,
                                 seed_en: str, seed_zh: str, is_final: bool = False, count: int = 4) -> List[List]:
        """Generate longest phrases (5+ words)"""
        phrases = []

        # For final LEGO, include the full seed sentence
        if is_final:
            phrases.append([seed_en, seed_zh, None, len(seed_en.split())])

        # Complex sentences - be more careful with word combinations
        sentence_templates = [
            "I believe that",
            "we think that",
            "they said",
            "do you know",
            "I wonder",
            "it seems like",
            "because of this",
            "according to them",
        ]

        phrase_templates = [
            "我认为",
            "我们想",
            "他们说",
            "你知道",
            "我想知道",
            "似乎",
            "因为这个",
            "根据他们",
        ]

        for i in range(count):
            if i < len(sentence_templates):
                template_en = sentence_templates[i]
                template_zh = phrase_templates[i]
                combined_en = f"{template_en} {english}"
                combined_zh = f"{template_zh}{chinese}"
                phrases.append([combined_en, combined_zh, None, len(combined_en.split())])

        return phrases[:count]

    def generate_phrases(self, english: str, chinese: str, is_final: bool,
                         seed_en: str, seed_zh: str,
                         earlier_legos: List[Dict], recent_context: Dict) -> List[List]:
        """Generate 10 practice phrases with 2-2-2-4 distribution"""

        # Extract available vocabulary
        vocab = self.extract_vocabulary(earlier_legos, recent_context)

        # Generate phrases by distribution: short(2) + medium(2) + longer(2) + longest(4)
        phrases = []

        # Short phrases (1-2 words)
        short = self.generate_short_phrases(english, chinese, vocab, count=2)
        phrases.extend(short)

        # Medium phrases (3 words)
        medium = self.generate_medium_phrases(english, chinese, vocab,
                                            is_first_medium=(len(short) < 2), count=2)
        phrases.extend(medium)

        # Longer phrases (4 words)
        longer = self.generate_longer_phrases(english, chinese, vocab, count=2)
        phrases.extend(longer)

        # Longest phrases (5+ words)
        longest = self.generate_longest_phrases(english, chinese, vocab, seed_en, seed_zh,
                                               is_final=is_final, count=4)
        phrases.extend(longest)

        # Ensure exactly 10 phrases
        phrases = phrases[:10]
        while len(phrases) < 10:
            phrases.append(phrases[-1])

        return phrases


class Phase5Processor:
    """Main processor for Phase 5 scaffolds"""

    def __init__(self, course_dir: str):
        self.course_dir = Path(course_dir)
        self.scaffolds_dir = self.course_dir / "phase5_scaffolds"
        self.output_dir = self.course_dir / "phase5_outputs"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.generator = MandarinPhraseGenerator()

    def process_seed(self, seed_id: str) -> bool:
        """Process a single seed (S0201-S0210)"""

        # Find the scaffold file
        scaffold_file = self.scaffolds_dir / f"seed_{seed_id.lower()}.json"

        if not scaffold_file.exists():
            print(f"✗ Scaffold not found: {scaffold_file}")
            return False

        try:
            with open(scaffold_file, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            seed_en = scaffold['seed_pair']['known']
            seed_zh = scaffold['seed_pair']['target']

            print(f"  Processing {seed_id}...", end=" ", flush=True)

            legos = scaffold.get('legos', {})
            lego_ids = sorted(legos.keys())

            recent_context = scaffold.get('recent_context', {})
            processed = 0

            # Process each LEGO
            for lego_id in lego_ids:
                lego_data = legos[lego_id]
                english = lego_data['lego'][0]
                chinese = lego_data['lego'][1]
                is_final = lego_data.get('is_final_lego', False)
                earlier_legos = lego_data.get('current_seed_earlier_legos', [])

                # Generate phrases
                phrases = self.generator.generate_phrases(
                    english, chinese, is_final, seed_en, seed_zh,
                    earlier_legos, recent_context
                )

                # Update the scaffold with generated phrases
                lego_data['practice_phrases'] = phrases

                # Update phrase distribution
                distribution = {
                    'short_1_to_2_legos': 2,
                    'medium_3_legos': 2,
                    'longer_4_legos': 2,
                    'longest_5_legos': 4
                }
                lego_data['phrase_distribution'] = distribution

                processed += 1

            # Write output file
            output_file = self.output_dir / f"seed_{seed_id.lower()}.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            print(f"✓ ({processed} LEGOs)")
            return True

        except Exception as e:
            print(f"✗ Error: {e}")
            return False

    def process_seed_range(self, start_num: int, end_num: int):
        """Process a range of seeds"""
        successful = 0
        failed = 0

        for num in range(start_num, end_num + 1):
            seed_id = f"S{num:04d}"
            if self.process_seed(seed_id):
                successful += 1
            else:
                failed += 1

        print(f"\nCompleted: {successful}/{successful+failed} seeds processed")
        return successful, failed


def main():
    """Main entry point"""
    course_dir = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng"

    processor = Phase5Processor(course_dir)
    print("Phase 5 Content Generator for S0201-S0210")
    print("=" * 50)

    processor.process_seed_range(201, 210)
    print("\nDone!")


if __name__ == '__main__':
    main()
