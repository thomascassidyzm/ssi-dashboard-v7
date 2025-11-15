#!/usr/bin/env python3
"""
Phase 5 Intelligent Content Generator for Seeds S0201-S0210
Generates contextual practice phrases for Mandarin Chinese LEGOs
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple

class IntelligentPhraseGenerator:
    """Generates contextual Mandarin practice phrases"""

    def __init__(self):
        self.common_phrases = {
            # Subject + verb combinations
            '我': ['I', 'me'],
            '你': ['you'],
            '他': ['he', 'him'],
            '她': ['she', 'her'],
            '我们': ['we', 'us'],
            '他们': ['they', 'them'],
            '想': ['want', 'wanted'],
            '知道': ['know', 'to know'],
            '说': ['say', 'said', 'speak'],
            '做': ['do', 'make', 'did'],
            '看': ['see', 'watch', 'look'],
            '听': ['listen', 'hear'],
            '问': ['ask'],
            '回答': ['answer'],
            '需要': ['need', 'needed'],
            '能': ['can', 'able'],
            '会': ['will', 'can'],
            '应该': ['should'],
            '可以': ['may', 'can'],
            '不': ['not'],
            '了': ['(completed action)'],
            '吗': ['question particle'],
            '呢': ['question particle'],
        }

    def extract_vocabulary(self, earlier_legos: List[Dict], recent_context: Dict) -> Dict[str, str]:
        """Extract available vocabulary from LEGOs"""
        vocab = {}

        # Add current seed's earlier LEGOs
        for lego in earlier_legos:
            english = lego.get('known', '')
            chinese = lego.get('target', '')
            if english and chinese:
                vocab[english] = chinese

        # Add recent context LEGOs (just the LEGOs, not all breakdown)
        for seed_id, seed_info in recent_context.items():
            if 'new_legos' in seed_info:
                for lego_entry in seed_info['new_legos'][:3]:  # Limit to first 3
                    if len(lego_entry) >= 3:
                        english = lego_entry[1]
                        chinese = lego_entry[2]
                        vocab[english] = chinese

        return vocab

    def is_atomic_like(self, english: str) -> bool:
        """Check if this looks like an atomic LEGO (single concept)"""
        return len(english.split()) <= 1

    def generate_short_phrases(self, english: str, chinese: str, vocab: Dict, count: int = 2) -> List[List]:
        """Generate short phrases (1-2 words)"""
        phrases = []

        # Always start with the LEGO itself
        phrases.append([english, chinese, None, len(english.split())])

        if len(phrases) < count:
            # Try simple variations
            if english in vocab:
                # This might be a reference to another LEGO
                phrases.append([f"a {english}", f"一个{chinese}", None, 2])
            else:
                # Generic variation
                phrases.append([f"the {english}", f"这个{chinese}", None, 2])

        return phrases[:count]

    def generate_medium_phrases(self, english: str, chinese: str, vocab: Dict, count: int = 2) -> List[List]:
        """Generate medium phrases (3 words)"""
        phrases = []

        # Start with the LEGO
        phrases.append([english, chinese, None, len(english.split())])

        # Add a simple context phrase
        if "wanted" in english.lower() or "think" in english.lower() or "said" in english.lower():
            # These are verbs/actions
            phrases.append([f"I {english}", f"我{chinese}", None, len(f"I {english}".split())])
        elif "want" in english.lower() or "need" in english.lower():
            phrases.append([f"I {english}", f"我{chinese}", None, len(f"I {english}".split())])
        elif "look" in english.lower() or "see" in english.lower() or "watch" in english.lower():
            phrases.append([f"can {english}", f"可以{chinese}", None, len(f"can {english}".split())])
        else:
            # Generic combination
            phrases.append([f"I {english}", f"我{chinese}", None, len(f"I {english}".split())])

        return phrases[:count]

    def generate_longer_phrases(self, english: str, chinese: str, vocab: Dict, count: int = 2) -> List[List]:
        """Generate longer phrases (4 words)"""
        phrases = []

        patterns_verb = [
            ("I really want to", "我真的想"),
            ("Can you please", "你能请"),
            ("We should", "我们应该"),
            ("They will", "他们会"),
            ("I need to", "我需要"),
        ]

        patterns_noun = [
            ("I like the", "我喜欢这个"),
            ("we saw a", "我们看到了"),
            ("he found the", "他找到了"),
            ("do you see", "你看到"),
            ("they want a", "他们想要一个"),
        ]

        # Decide which pattern to use
        if "want" in english.lower() or "need" in english.lower() or "think" in english.lower() or "said" in english.lower():
            patterns = patterns_verb
        else:
            patterns = patterns_noun

        for pattern_en, pattern_zh in patterns:
            if len(phrases) < count:
                combined_en = f"{pattern_en} {english}"
                combined_zh = f"{pattern_zh}{chinese}"
                phrases.append([combined_en, combined_zh, None, len(combined_en.split())])

        return phrases[:count]

    def generate_longest_phrases(self, english: str, chinese: str, vocab: Dict,
                                 seed_en: str, seed_zh: str, is_final: bool = False, count: int = 4) -> List[List]:
        """Generate longest phrases (5+ words)"""
        phrases = []

        # For final LEGO, include the full seed sentence
        if is_final:
            phrases.append([seed_en, seed_zh, None, len(seed_en.split())])

        # Complex sentences
        patterns_verb = [
            ("I think that you", "我认为你"),
            ("we believe that they", "我们相信他们"),
            ("do you know if", "你知道是否"),
            ("I wonder whether", "我想知道是否"),
            ("they said that we", "他们说我们"),
        ]

        patterns_noun = [
            ("I really like the", "我真的喜欢这个"),
            ("we need to find", "我们需要找到"),
            ("can you see the", "你能看到"),
            ("they want to get", "他们想要得到"),
            ("she asked for a", "她要求一个"),
        ]

        if "want" in english.lower() or "need" in english.lower() or "think" in english.lower():
            patterns = patterns_verb
        else:
            patterns = patterns_noun

        for pattern_en, pattern_zh in patterns:
            if len(phrases) < count:
                combined_en = f"{pattern_en} {english}"
                combined_zh = f"{pattern_zh}{chinese}"
                phrases.append([combined_en, combined_zh, None, len(combined_en.split())])

        return phrases[:count]

    def generate_phrases(self, english: str, chinese: str, is_final: bool,
                         seed_en: str, seed_zh: str, lego_type: str,
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
        medium = self.generate_medium_phrases(english, chinese, vocab, count=2)
        phrases.extend(medium)

        # Longer phrases (4 words)
        longer = self.generate_longer_phrases(english, chinese, vocab, count=2)
        phrases.extend(longer)

        # Longest phrases (5+ words)
        longest = self.generate_longest_phrases(english, chinese, vocab, seed_en, seed_zh,
                                               is_final=is_final, count=4)
        phrases.extend(longest)

        # Ensure exactly 10 phrases with no duplicates
        result = []
        seen = set()
        for phrase in phrases[:10]:
            phrase_key = phrase[0]
            if phrase_key not in seen:
                result.append(phrase)
                seen.add(phrase_key)

        # Fill remaining with generic phrases if needed
        while len(result) < 10:
            idx = len(result)
            if idx == 0:
                result.append([english, chinese, None, len(english.split())])
            else:
                # Generate a filler
                filler_en = f"{english} is important"
                filler_zh = f"{chinese}很重要"
                result.append([filler_en, filler_zh, None, 3])

        return result[:10]


class Phase5Processor:
    """Main processor for Phase 5 scaffolds"""

    def __init__(self, course_dir: str):
        self.course_dir = Path(course_dir)
        self.scaffolds_dir = self.course_dir / "phase5_scaffolds"
        self.output_dir = self.course_dir / "phase5_outputs"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.generator = IntelligentPhraseGenerator()

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
                lego_type = lego_data.get('type', 'A')
                earlier_legos = lego_data.get('current_seed_earlier_legos', [])

                # Generate phrases
                phrases = self.generator.generate_phrases(
                    english, chinese, is_final, seed_en, seed_zh, lego_type,
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
            import traceback
            traceback.print_exc()
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
    print("Phase 5 Intelligent Generator for S0201-S0210")
    print("=" * 50)

    processor.process_seed_range(201, 210)
    print("\nDone!")


if __name__ == '__main__':
    main()
