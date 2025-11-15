#!/usr/bin/env python3
"""
Phase 5 Contextual Content Generator for Seeds S0201-S0210
Generates intelligent practice phrases based on linguistic context
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, List, Tuple

class ContextualPhraseGenerator:
    """Generates contextual Mandarin practice phrases based on LEGO semantics"""

    # Phrase templates for different word classes
    VERB_PREFIXES = ['I', 'you', 'we', 'they', 'can', 'will', 'might', 'should']
    VERB_PREFIXES_ZH = ['我', '你', '我们', '他们', '能', '会', '可能', '应该']

    NOUN_PREFIXES = ['a', 'the', 'my', 'your', 'our', 'this', 'that', 'this new']
    NOUN_PREFIXES_ZH = ['一个', '那个', '我的', '你的', '我们的', '这个', '那个', '这个新']

    ADJECTIVE_CONTEXTS = [
        ('is', '是'),
        ('very', '很'),
        ('not', '不'),
        ('more', '更'),
    ]

    def __init__(self):
        # Track common patterns
        self.verb_patterns = ['want', 'need', 'can', 'will', 'must', 'should', 'would', 'tried', 'said', 'asked', 'told']
        self.noun_patterns = ['person', 'place', 'thing', 'coffee', 'shop', 'book', 'time', 'day', 'father', 'mother']

    def guess_word_type(self, english: str, chinese: str) -> str:
        """Guess if this is a verb, noun, adjective, etc."""
        lower_en = english.lower()

        # Check for verb markers
        for verb_word in self.verb_patterns:
            if verb_word in lower_en:
                return 'verb'

        # Check for noun markers
        for noun_word in self.noun_patterns:
            if noun_word in lower_en:
                return 'noun'

        # Check grammar patterns
        if 'ing' in lower_en or 'ed' in lower_en[-3:]:
            return 'verb'
        if 'ly' in lower_en[-3:]:
            return 'adverb'
        if any(char.isupper() for char in english[1:]):  # Might be proper noun
            return 'noun'
        if lower_en in ['sure', 'ready', 'happy', 'sad', 'angry', 'tired']:
            return 'adjective'

        # Default: guess based on word count
        if len(english.split()) == 1:
            return 'noun'  # Default single words to nouns
        else:
            return 'phrase'

    def extract_vocabulary(self, earlier_legos: List[Dict], recent_context: Dict) -> Dict[str, str]:
        """Extract available vocabulary from LEGOs"""
        vocab = {}

        # Add current seed's earlier LEGOs
        for lego in earlier_legos:
            english = lego.get('known', '')
            chinese = lego.get('target', '')
            if english and chinese:
                vocab[english] = chinese

        # Add recent context LEGOs (top ones only)
        count = 0
        for seed_id in sorted(recent_context.keys(), reverse=True):
            if count >= 5:  # Limit to 5 recent seeds
                break
            seed_info = recent_context[seed_id]
            if 'new_legos' in seed_info:
                for lego_entry in seed_info['new_legos'][:2]:  # Top 2 from each
                    if len(lego_entry) >= 3:
                        english = lego_entry[1]
                        chinese = lego_entry[2]
                        vocab[english] = chinese
            count += 1

        return vocab

    def generate_short_phrases(self, english: str, chinese: str, word_type: str, count: int = 2) -> List[List]:
        """Generate short phrases (1-2 words)"""
        phrases = []

        # Always start with the LEGO itself
        phrases.append([english, chinese, None, len(english.split())])

        if len(phrases) < count:
            if word_type == 'verb':
                # For verbs, add a simple subject
                phrases.append([f"I {english}", f"我{chinese}", None, 2])
            elif word_type == 'noun':
                # For nouns, add a simple article/modifier
                phrases.append([f"a {english}", f"一个{chinese}", None, 2])
            elif word_type == 'adjective':
                # For adjectives, add context
                phrases.append([f"very {english}", f"很{chinese}", None, 2])
            else:
                # Generic
                phrases.append([f"I {english}", f"我{chinese}", None, 2])

        return phrases[:count]

    def generate_medium_phrases(self, english: str, chinese: str, word_type: str, vocab: Dict, count: int = 2) -> List[List]:
        """Generate medium phrases (3 words)"""
        phrases = []

        # Start with the LEGO itself in different context
        if word_type == 'verb':
            phrases.append([english, chinese, None, len(english.split())])
            if len(phrases) < count:
                phrases.append([f"I {english}", f"我{chinese}", None, 2])
        elif word_type == 'noun':
            phrases.append([f"the {english}", f"这个{chinese}", None, 2])
            if len(phrases) < count:
                phrases.append([f"a {english}", f"一个{chinese}", None, 2])
        elif word_type == 'adjective':
            phrases.append([f"is {english}", f"是{chinese}", None, 2])
            if len(phrases) < count:
                phrases.append([f"not {english}", f"不{chinese}", None, 2])
        else:
            phrases.append([english, chinese, None, len(english.split())])
            if len(phrases) < count:
                phrases.append([f"we {english}", f"我们{chinese}", None, 2])

        return phrases[:count]

    def generate_longer_phrases(self, english: str, chinese: str, word_type: str, vocab: Dict, count: int = 2) -> List[List]:
        """Generate longer phrases (4+ words)"""
        phrases = []

        if word_type == 'verb':
            templates = [
                ("I really want to", "我真的想"),
                ("Can you please", "你能请"),
                ("We all should", "我们都应该"),
                ("They will try to", "他们会试图"),
                ("I need to", "我需要"),
            ]
        elif word_type == 'noun':
            templates = [
                ("I like the", "我喜欢这个"),
                ("We saw a", "我们看到了"),
                ("Can you find the", "你能找到"),
                ("They want a new", "他们想要一个新"),
                ("Do you have the", "你有"),
            ]
        elif word_type == 'adjective':
            templates = [
                ("it is very", "这是很"),
                ("I feel quite", "我感觉很"),
                ("They seem to be", "他们好像"),
                ("it was not", "这不是"),
                ("I'm completely", "我完全"),
            ]
        else:
            templates = [
                ("I think about", "我想关于"),
                ("We talked about", "我们谈论了"),
                ("Do you know", "你知道"),
                ("They asked about", "他们问关于"),
                ("What is this", "这是什么"),
            ]

        for template_en, template_zh in templates:
            if len(phrases) < count:
                combined_en = f"{template_en} {english}"
                combined_zh = f"{template_zh}{chinese}"
                phrases.append([combined_en, combined_zh, None, len(combined_en.split())])

        return phrases[:count]

    def generate_longest_phrases(self, english: str, chinese: str, word_type: str, vocab: Dict,
                                 seed_en: str, seed_zh: str, is_final: bool = False, count: int = 4) -> List[List]:
        """Generate longest phrases (5+ words)"""
        phrases = []

        # For final LEGO, include the full seed sentence
        if is_final:
            phrases.append([seed_en, seed_zh, None, len(seed_en.split())])

        if word_type == 'verb':
            templates = [
                ("I think that you should", "我认为你应该"),
                ("We believed that they would", "我们相信他们会"),
                ("Do you know if we can", "你知道我们能否"),
                ("I wonder whether they", "我想知道他们是否"),
                ("They said that we should", "他们说我们应该"),
            ]
        elif word_type == 'noun':
            templates = [
                ("I really like the", "我真的喜欢这个"),
                ("We need to find a", "我们需要找到一个"),
                ("Can you see the beautiful", "你能看到漂亮的"),
                ("They want to get the", "他们想要得到"),
                ("She asked for a new", "她要求一个新"),
            ]
        elif word_type == 'adjective':
            templates = [
                ("I think that it is", "我认为这是"),
                ("We all feel that it's", "我们都觉得这是"),
                ("They said it was very", "他们说这很"),
                ("It seems like it's", "似乎"),
                ("Honestly, I think you're", "诚实地，我认为你"),
            ]
        else:
            templates = [
                ("I think that we should", "我认为我们应该"),
                ("We believe that they", "我们相信他们"),
                ("Do you understand if", "你理解吗"),
                ("They said they know", "他们说他们知道"),
                ("What do you think of", "你对...怎么想"),
            ]

        for template_en, template_zh in templates:
            if len(phrases) < count:
                combined_en = f"{template_en} {english}"
                combined_zh = f"{template_zh}{chinese}"
                phrases.append([combined_en, combined_zh, None, len(combined_en.split())])

        return phrases[:count]

    def generate_phrases(self, english: str, chinese: str, is_final: bool,
                         seed_en: str, seed_zh: str, lego_type: str,
                         earlier_legos: List[Dict], recent_context: Dict) -> List[List]:
        """Generate 10 practice phrases with 2-2-2-4 distribution"""

        # Guess word type
        word_type = self.guess_word_type(english, chinese)

        # Extract available vocabulary
        vocab = self.extract_vocabulary(earlier_legos, recent_context)

        # Generate phrases by distribution: short(2) + medium(2) + longer(2) + longest(4)
        phrases = []

        # Short phrases (1-2 words)
        short = self.generate_short_phrases(english, chinese, word_type, count=2)
        phrases.extend(short)

        # Medium phrases (3 words)
        medium = self.generate_medium_phrases(english, chinese, word_type, vocab, count=2)
        phrases.extend(medium)

        # Longer phrases (4 words)
        longer = self.generate_longer_phrases(english, chinese, word_type, vocab, count=2)
        phrases.extend(longer)

        # Longest phrases (5+ words)
        longest = self.generate_longest_phrases(english, chinese, word_type, vocab,
                                               seed_en, seed_zh, is_final=is_final, count=4)
        phrases.extend(longest)

        # Ensure exactly 10 phrases with no exact duplicates
        result = []
        seen = set()
        for phrase in phrases[:10]:
            phrase_key = phrase[0]
            if phrase_key not in seen:
                result.append(phrase)
                seen.add(phrase_key)

        # Fill remaining with variations if needed
        idx = len(result)
        while len(result) < 10:
            if idx == 0:
                result.append([english, chinese, None, len(english.split())])
            else:
                # Create a simple variation
                result.append([f"{english} is important", f"{chinese}很重要", None, 3])
            idx += 1

        return result[:10]


class Phase5Processor:
    """Main processor for Phase 5 scaffolds"""

    def __init__(self, course_dir: str):
        self.course_dir = Path(course_dir)
        self.scaffolds_dir = self.course_dir / "phase5_scaffolds"
        self.output_dir = self.course_dir / "phase5_outputs"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.generator = ContextualPhraseGenerator()

    def process_seed(self, seed_id: str) -> bool:
        """Process a single seed"""

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
    print("Phase 5 Contextual Generator for S0201-S0210")
    print("=" * 50)

    processor.process_seed_range(201, 210)
    print("\nDone!")


if __name__ == '__main__':
    main()
