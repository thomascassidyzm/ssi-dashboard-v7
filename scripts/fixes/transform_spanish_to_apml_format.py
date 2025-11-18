#!/usr/bin/env python3
"""
Transform Spanish course data into APML format matching Italian reference

Input files (Spanish source):
  - seed_pairs.json (Phase 1)
  - lego_pairs.json (Phase 3)
  - lego_baskets_deduplicated.json (Phase 5)

Output file (APML format):
  - Spanish_for_English_speakers_COURSE_YYYYMMDD_HHMMSS.json

Based on: Italian_for_English_speakers_COURSE_20250827_144821.json
"""

import json
import uuid
import hashlib
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Tuple

class SpanishToAPMLTransformer:
    def __init__(self, course_dir: str):
        self.course_dir = Path(course_dir)
        self.seed_pairs = {}
        self.lego_pairs = {}
        self.lego_baskets = {}
        self.introductions = {}
        self.known_lang = "en"
        self.target_lang = "es"

    def generate_deterministic_uuid(self, text: str, language: str, role: str, cadence: str) -> str:
        """
        Generate deterministic UUID based on text and metadata

        Format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
        - Segments 1 & 5: Hash of text
        - Segment 2: Hash of language
        - Segment 3: Hash of role
        - Segment 4: Hash of cadence
        """
        # Create hash of text
        text_hash = hashlib.md5(text.encode('utf-8')).hexdigest().upper()

        # Create hash of metadata
        lang_hash = hashlib.md5(language.encode('utf-8')).hexdigest().upper()
        role_hash = hashlib.md5(role.encode('utf-8')).hexdigest().upper()
        cadence_hash = hashlib.md5(cadence.encode('utf-8')).hexdigest().upper()

        # Build UUID segments
        # Segment 1: First 8 chars of text hash
        seg1 = text_hash[0:8]

        # Segment 2: First 4 chars of language hash
        seg2 = lang_hash[0:4]

        # Segment 3: First 4 chars of role hash
        seg3 = role_hash[0:4]

        # Segment 4: First 4 chars of cadence hash
        seg4 = cadence_hash[0:4]

        # Segment 5: Last 12 chars of text hash
        seg5 = text_hash[-12:]

        return f"{seg1}-{seg2}-{seg3}-{seg4}-{seg5}"

    def load_source_files(self):
        """Load all Spanish source files"""
        print("Loading source files...")

        # Load seed_pairs.json
        with open(self.course_dir / 'seed_pairs.json', 'r', encoding='utf-8') as f:
            seed_data = json.load(f)
            self.seed_pairs = {k: v for k, v in seed_data.get('translations', {}).items()}

        # Load lego_pairs.json
        with open(self.course_dir / 'lego_pairs.json', 'r', encoding='utf-8') as f:
            lego_data = json.load(f)
            # Index by seed_id for quick lookup
            for seed in lego_data.get('seeds', []):
                self.lego_pairs[seed['seed_id']] = seed

        # Load lego_baskets_deduplicated.json
        with open(self.course_dir / 'lego_baskets_deduplicated.json', 'r', encoding='utf-8') as f:
            basket_data = json.load(f)
            self.lego_baskets = basket_data.get('baskets', {})

        # Load introductions.json
        with open(self.course_dir / 'introductions.json', 'r', encoding='utf-8') as f:
            intro_data = json.load(f)
            self.introductions = intro_data.get('presentations', {})

        print(f"  Loaded {len(self.seed_pairs)} seed pairs")
        print(f"  Loaded {len(self.lego_pairs)} lego seed entries")
        print(f"  Loaded {len(self.lego_baskets)} practice baskets")
        print(f"  Loaded {len(self.introductions)} introduction presentations")

    def tokenize(self, text: str) -> List[str]:
        """Simple tokenization - split on whitespace and punctuation"""
        # Remove punctuation for tokenization
        tokens = re.findall(r'\b\w+\b', text.lower())
        return tokens

    def create_node(self, known_text: str, target_text: str) -> Dict[str, Any]:
        """Create a node object with known/target structure"""
        # Nodes don't have deterministic IDs - they use random UUIDs
        return {
            "id": str(uuid.uuid4()).upper(),
            "known": {
                "text": known_text,
                "tokens": self.tokenize(known_text),
                "lemmas": self.tokenize(known_text)  # Simplified - no real lemmatization
            },
            "target": {
                "text": target_text,
                "tokens": self.tokenize(target_text),
                "lemmas": self.tokenize(target_text)  # Simplified
            }
        }

    def create_introduction_item(self, lego_data: Dict) -> Dict[str, Any]:
        """
        Create an introduction_item from a lego entry

        Lego structure:
          - id: S0001L01
          - type: A or M
          - target: "quiero" (Spanish)
          - known: "I want" (English)
          - new: true/false
        """
        lego_id = lego_data['id']
        known = lego_data['known']
        target = lego_data['target']

        # Create main node
        main_node = self.create_node(known, target)

        # Get presentation text from introductions.json
        presentation = self.introductions.get(lego_id)
        if not presentation:
            # Fallback to generic presentation if not found
            presentation = f"The Spanish for '{known}', is: ... '{target}' ... '{target}'"

        # Get practice basket for this lego if available
        basket = self.lego_baskets.get(lego_id, {})
        practice_phrases = basket.get('practice_phrases', [])

        # Create sub-nodes from practice phrases
        nodes = []
        if practice_phrases:
            # Sample a few practice phrases to create sub-nodes
            for phrase in practice_phrases[:3]:  # Take first 3
                phrase_known = phrase[0]  # English
                phrase_target = phrase[1]  # Spanish
                nodes.append(self.create_node(phrase_known, phrase_target))

        return {
            "id": str(uuid.uuid4()).upper(),
            "node": main_node,
            "nodes": nodes,
            "presentation": presentation
        }

    def create_seed(self, seed_id: str) -> Dict[str, Any]:
        """Create a complete seed entry with all introduction_items"""
        # Get seed pair
        seed_pair = self.seed_pairs.get(seed_id)
        if not seed_pair:
            raise ValueError(f"Seed {seed_id} not found in seed_pairs")

        known_sentence = seed_pair[0]  # English
        target_sentence = seed_pair[1]  # Spanish

        # Get lego data
        lego_data = self.lego_pairs.get(seed_id)
        if not lego_data:
            raise ValueError(f"Seed {seed_id} not found in lego_pairs")

        # Create main seed node
        seed_node = self.create_node(known_sentence, target_sentence)

        # Create introduction items from legos
        introduction_items = []
        for lego in lego_data.get('legos', []):
            intro_item = self.create_introduction_item(lego)
            introduction_items.append(intro_item)

        return {
            "id": str(uuid.uuid4()).upper(),
            "seed_sentence": {
                "canonical": known_sentence
            },
            "node": seed_node,
            "introduction_items": introduction_items
        }

    def extract_tagged_phrases(self, presentation: str) -> List[Tuple[str, str]]:
        """
        Extract tagged phrases from presentation text like {target1}'estoy' means I'm
        Returns list of tuples (tag, phrase)
        """
        if not presentation:
            return []

        # Pattern: {tag}'phrase' or {tag}"phrase"
        # Handles apostrophes correctly by using backreference
        pattern = r'\{(\w+(?:-\w+)?)\}[\s]*([\'\"])(.*?)\2(?=[\s,.;:!?)]|$)'

        matches = re.findall(pattern, presentation)

        # Process matches - tag is in group 1, text is in group 3
        results = []
        for tag, quote, text in matches:
            results.append((tag, text))

        return results

    def create_sample_entry(self, text: str, role: str, duration: float = None) -> Dict[str, Any]:
        """Create a sample entry for the samples dictionary"""
        # Determine language based on role
        if role in ['target1', 'target2']:
            language = self.target_lang
        elif role == 'source':
            language = self.known_lang
        elif role == 'presentation':
            language = self.known_lang
        else:
            language = self.known_lang  # Default to known language

        cadence = "natural"
        sample_id = self.generate_deterministic_uuid(text, language, role, cadence)

        return {
            "duration": duration,
            "id": sample_id,
            "cadence": cadence,
            "role": role
        }

    def collect_samples(self, seeds: List[Dict]) -> Dict[str, List[Dict]]:
        """Collect all unique phrases and create sample entries"""
        samples = {}

        for seed in seeds:
            # Add seed sentence (known)
            known_text = seed['node']['known']['text']
            if known_text not in samples:
                samples[known_text] = [self.create_sample_entry(known_text, "source")]

            # Add seed sentence (target) - two versions
            target_text = seed['node']['target']['text']
            if target_text not in samples:
                samples[target_text] = [
                    self.create_sample_entry(target_text, "target1"),
                    self.create_sample_entry(target_text, "target2")
                ]

            # Add introduction items
            for item in seed.get('introduction_items', []):
                # Known text
                item_known = item['node']['known']['text']
                if item_known not in samples:
                    samples[item_known] = [self.create_sample_entry(item_known, "source")]

                # Target text - two versions
                item_target = item['node']['target']['text']
                if item_target not in samples:
                    samples[item_target] = [
                        self.create_sample_entry(item_target, "target1"),
                        self.create_sample_entry(item_target, "target2")
                    ]

                # Presentation
                presentation = item.get('presentation', '')
                if presentation:
                    # Add the full presentation
                    if presentation not in samples:
                        samples[presentation] = [self.create_sample_entry(presentation, "presentation")]

                    # Extract and add tagged phrases (e.g., {target1}'estoy' means I'm)
                    tagged_phrases = self.extract_tagged_phrases(presentation)
                    for tag, phrase in tagged_phrases:
                        # Only create samples for target language tags
                        if tag in ['target1', 'target2']:
                            if phrase not in samples:
                                # Create both target1 and target2 for consistency
                                samples[phrase] = [
                                    self.create_sample_entry(phrase, "target1"),
                                    self.create_sample_entry(phrase, "target2")
                                ]
                        elif tag == 'source':
                            if phrase not in samples:
                                samples[phrase] = [self.create_sample_entry(phrase, "source")]

                # Sub-nodes
                for node in item.get('nodes', []):
                    node_known = node['known']['text']
                    node_target = node['target']['text']

                    if node_known not in samples:
                        samples[node_known] = [self.create_sample_entry(node_known, "source")]

                    if node_target not in samples:
                        samples[node_target] = [
                            self.create_sample_entry(node_target, "target1"),
                            self.create_sample_entry(node_target, "target2")
                        ]

        return samples

    def load_encouragements(self, italian_course_path: str) -> tuple:
        """Load encouragements from Italian reference course"""
        try:
            with open(italian_course_path, 'r', encoding='utf-8') as f:
                it_course = json.load(f)

            first_slice = it_course['slices'][0]
            pooled = first_slice.get('pooledEncouragements', [])
            ordered = first_slice.get('orderedEncouragements', [])

            print(f"  Loaded {len(pooled)} pooled encouragements")
            print(f"  Loaded {len(ordered)} ordered encouragements")

            return pooled, ordered
        except Exception as e:
            print(f"  WARNING: Could not load encouragements: {e}")
            return [], []

    def transform(self, output_file: str = None, italian_reference: str = None) -> Dict[str, Any]:
        """Transform Spanish course to APML format"""
        print("\nTransforming to APML format...")

        # Create main course structure
        course = {
            "id": "en-es",
            "known": "en",
            "target": "es",
            "version": "3.2.0",
            "status": "alpha",
            "introduction": {
                "id": str(uuid.uuid4()).upper(),
                "cadence": "natural",
                "role": "presentation",
                "duration": None
            },
            "slices": []
        }

        # Load encouragements from Italian reference if provided
        pooled_enc, ordered_enc = [], []
        if italian_reference:
            pooled_enc, ordered_enc = self.load_encouragements(italian_reference)

        # Create a single slice with all seeds
        slice_data = {
            "id": str(uuid.uuid4()).upper(),
            "seeds": [],
            "pooledEncouragements": pooled_enc,
            "orderedEncouragements": ordered_enc,
            "samples": {},
            "version": "3.2.0"
        }

        # Process each seed in order
        seed_ids = sorted(self.seed_pairs.keys())
        print(f"  Processing {len(seed_ids)} seeds...")

        for i, seed_id in enumerate(seed_ids, 1):
            if i % 50 == 0:
                print(f"    Processed {i}/{len(seed_ids)} seeds...")

            try:
                seed_entry = self.create_seed(seed_id)
                slice_data['seeds'].append(seed_entry)
            except Exception as e:
                print(f"    WARNING: Failed to process {seed_id}: {e}")
                continue

        # Collect all samples
        print(f"  Collecting samples from {len(slice_data['seeds'])} seeds...")
        slice_data['samples'] = self.collect_samples(slice_data['seeds'])
        print(f"  Generated {len(slice_data['samples'])} unique sample entries")

        course['slices'].append(slice_data)

        print(f"  Created course with {len(slice_data['seeds'])} seeds")

        # Write output
        if output_file is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = self.course_dir / f"Spanish_for_English_speakers_COURSE_{timestamp}.json"

        print(f"\nWriting output to: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(course, f, ensure_ascii=False, indent=2)

        print("✓ Transformation complete!")

        return course

def main():
    import sys

    if len(sys.argv) < 2:
        print("Usage: python3 transform_spanish_to_apml_format.py <course_directory> [italian_reference] [output_file]")
        print("\nExample:")
        print("  python3 transform_spanish_to_apml_format.py public/vfs/courses/spa_for_eng /path/to/Italian_course.json")
        sys.exit(1)

    course_dir = sys.argv[1]
    italian_ref = sys.argv[2] if len(sys.argv) > 2 else None
    output_file = sys.argv[3] if len(sys.argv) > 3 else None

    transformer = SpanishToAPMLTransformer(course_dir)
    transformer.load_source_files()
    course = transformer.transform(output_file, italian_reference=italian_ref)

    print(f"\n=== SUMMARY ===")
    print(f"Course ID: {course['id']}")
    print(f"Known language: {course['known']}")
    print(f"Target language: {course['target']}")
    print(f"Total slices: {len(course['slices'])}")
    print(f"Total seeds: {sum(len(s['seeds']) for s in course['slices'])}")

if __name__ == '__main__':
    main()
