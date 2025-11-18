#!/usr/bin/env python3
"""
Phase 7: Generate APML Course Manifest

Transforms phase outputs into final APML course format.

Input files (per course):
  - seed_pairs.json (Phase 1)
  - lego_pairs.json (Phase 3)
  - lego_baskets_deduplicated.json (Phase 5)
  - introductions.json (Phase 6)

Output file (APML format):
  - {Target}_for_{Known}_speakers_COURSE_YYYYMMDD_HHMMSS.json

Features:
  - Deterministic UUID generation for all samples
  - Embedded encouragements (language-specific)
  - Complete APML 3.2.0 structure with nodes, samples, presentations
  - ✅ DUAL FORMAT SUPPORT: Handles both v7 (arrays) and v9 (explicit labels)

Format Support:
  - v7 (arrays): ["English", "Spanish"], {known: "...", target: "..."}
  - v9 (explicit): {english: "...", spanish: "..."} with 12-slot practice_phrases
  - Automatically normalizes both formats to internal representation
"""

import json
import uuid
import hashlib
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Tuple

# Encouragements by known language
# Source: SSI methodology - motivational content for learners
ENCOURAGEMENTS_BY_LANGUAGE = {
    "en": {
        "pooled": [
            {"text": "And remember that your brain has got as many neurons as there are stars in the galaxy—your brain is the most complex object in the universe.", "id": "EB874772-22D4-4F3E-814D-0632323CAC33"},
            {"text": "Are you using your new language with other people yet? You've learnt so much, you really should be, and you'll enjoy it more and more when you do.", "id": "AEBE8A59-B987-4686-A853-174B122D67DB"},
            {"text": "By now, you should spend five minutes every day just talking to yourself in your new language—if you do, you'll get dramatically better very quickly.", "id": "583834C3-E830-49C0-9CAD-C0D9E4073DDA"},
            {"text": "Do remember to speak out loud, and if you get a little bored with the easy bits, try doing them in a funny accent.", "id": "BCA69AE9-5EE3-419E-91D6-A3B9A5066ACF"},
            {"text": "Do you remember me telling you how dangerous perfectionism is? Don't try to be perfect, try to be fast, and you'll end up doing much better.", "id": "16AD184D-54A0-471D-8F89-2A5096774930"},
            {"text": "Don't worry if the sentences are just too long sometimes, just say what you can and then listen carefully to the models.", "id": "F827E0F8-474E-473D-BEC2-33FC08F8B3C3"},
            {"text": "If none of the sentences have been too long for a while, we're not pushing you hard enough, and you should try to SKIP ahead, even just for a few minutes.", "id": "C035883D-E519-461A-8581-B012C0816531"},
            {"text": "If some of the sentences feel too easy for you by now, try saying some extra words in the gap—be creative, just keep talking until you hear the first model voice.", "id": "49B682E5-7406-42F2-9C83-8E571F994B52"},
            {"text": "If you're feeling tired, that's a good sign that you're in the important 10% zone, so keep on pushing—your brain can always cope with a little more than you realise.", "id": "E8EC49F6-46B0-411A-852C-65870D378798"},
            {"text": "If you're not making mistakes, that means it's too easy for you—maybe you should try to SKIP ahead!", "id": "D55A5F64-B5BB-4B40-BE2A-81A9A092A6EF"},
            {"text": "It's important to play with language, to make it fun, so don't take yourself too seriously, and try to laugh when anything goes wrong—the more funny it feels, the faster you'll go.", "id": "D2E6D968-A2D1-4353-B582-A19FAF36E2E1"},
            {"text": "It's really important to remember that when you feel incredibly frustrated at not quite getting a word right, that means you're really close to learning it successfully—the frustration is a huge sign of success, so don't lose heart.", "id": "F699CAE1-4D51-416D-A2E7-39475E04EFF8"},
            {"text": "Learning a language is an incredibly good way to keep your brain healthy, by the way—did you know that? This effort you're making right now is going to help keep your brain in superb condition.", "id": "C79B3CBD-95E7-4ABC-9BB1-3AE51470390C"},
            {"text": "Now that you know for certain that you're capable of learning a new language, what's your next language going to be? Each new language becomes more fun.", "id": "B8AE2B5B-7B7F-457B-82E6-1493F7B24C6F"},
            {"text": "Remember that learning comes in layers, so don't worry if you forget a word that you could say before, that's absolutely normal.", "id": "E9829BC7-F77D-4B56-B7EB-B4573ED32654"},
            {"text": "Remember that people with only half a brain can lead a normal life, so your brain can cope with anything we can throw at it. Believe in yourself, or at least believe in your brain.", "id": "1BD0EDF5-F66B-47D9-9F60-519648FAFAAF"},
            {"text": "Remember that you need to be speaking out loud in the gap—even if you can't say the whole sentence, say as many words as you can.", "id": "D79F3498-574D-4233-B5AF-E0B0E1A21615"},
            {"text": "Some people say that languages are like windows—the more you speak, the more of the world you can see. Keep on working, and your new window will get bigger and clearer.", "id": "619F4C50-55BF-4F6B-A418-19B1018DD059"},
            {"text": "The more you think of this as a game, the less painful it will feel and the more fun you'll have.", "id": "E75BA7DB-28E2-4B9E-9162-4E24AEF720CA"},
            {"text": "This is probably the hardest brain exercise in the world, so you're doing wonderfully and you deserve all the language learning success you're going to have.", "id": "EB835DC3-75CA-4DAC-BCC7-80309E46175D"},
            {"text": "When was the last time you made a mistake? I hope it was quite recently, because I really don't want this to get easy for you—I want you to keep pushing yourself into the 10%.", "id": "34267DC2-CE24-478E-ABF9-B3DB63D56695"},
            {"text": "You know how important it is to treat this like a game? The next time you get a long sentence right, give yourself a really nice treat, something you love. You absolutely deserve it.", "id": "FEF97E83-8DE0-411A-9D00-4E0FDF152AD5"},
            {"text": "You never entirely forget any words, they just dip under the surface of your conscious control. Once you hear them again, they'll come back to life for you, so don't worry.", "id": "8BBB96E6-7AF4-44A9-B915-225135C170FD"},
            {"text": "You're doing excellently—yes, I know you want to make fewer mistakes, but the effort you're putting in is what gets the results, so you really are doing excellently.", "id": "08AEAB90-B104-4EE7-9376-988A81D5DE88"},
            {"text": "You're working so hard to learn, and you've come so far, you're a genuine hero. You should be very, very proud of yourself.", "id": "8684FF29-CFBD-4A5C-B8D9-C5EE796113D5"},
            {"text": "You've put so much effort into this to have got this far, I'm really proud of you. Keep going!", "id": "8BD94F75-D158-4C64-B4F5-09F31CE399FC"}
        ],
        "ordered": None  # Loaded from data file
    }
}

def load_encouragements(known_language: str) -> tuple:
    """Load encouragements for a given known language"""
    script_dir = Path(__file__).parent
    data_dir = script_dir / "data"

    pooled = ENCOURAGEMENTS_BY_LANGUAGE.get(known_language, {}).get("pooled", [])

    # Load ordered encouragements from file
    ordered_file = data_dir / f"ordered_encouragements_{known_language}.json"
    ordered = []
    if ordered_file.exists():
        with open(ordered_file, 'r', encoding='utf-8') as f:
            ordered = json.load(f)

    return pooled, ordered

class CourseManifestGenerator:
    def __init__(self, course_dir: str):
        self.course_dir = Path(course_dir)
        self.seed_pairs = {}
        self.lego_pairs = {}
        self.lego_baskets = {}
        self.introductions = {}
        self.known_lang = "en"
        self.target_lang = "es"
        self.source_lang_field = "english"  # For v9 format
        self.target_lang_field = "spanish"  # For v9 format

    def normalize_pair(self, pair_data) -> tuple:
        """
        Normalize pair data to (known, target) tuple

        Handles both formats:
        - v7: [known, target] array
        - v9: {english: "...", spanish: "..."} object

        Returns: (known_text, target_text)
        """
        if isinstance(pair_data, (list, tuple)):
            # v7 format: position-based array
            if len(pair_data) >= 2:
                return (pair_data[0], pair_data[1])
            return ("", "")
        elif isinstance(pair_data, dict):
            # v9 format: explicit labels
            # Try language-specific fields first
            known = pair_data.get(self.source_lang_field) or pair_data.get('known') or ""
            target = pair_data.get(self.target_lang_field) or pair_data.get('target') or ""
            return (known, target)
        else:
            return ("", "")

    def normalize_lego_fields(self, lego: dict) -> tuple:
        """
        Normalize LEGO fields to (known, target) tuple

        Handles both formats:
        - v7: {known: "...", target: "..."}
        - v9: {english: "...", spanish: "..."}

        Returns: (known_text, target_text)
        """
        # Try v9 format first (language-specific fields)
        known = lego.get(self.source_lang_field) or lego.get('known') or ""
        target = lego.get(self.target_lang_field) or lego.get('target') or ""
        return (known, target)

    def generate_deterministic_uuid(self, text: str, language: str, role: str, cadence: str) -> str:
        """
        Generate deterministic UUID using SSi legacy format

        Same text + language + role + cadence = same UUID every time
        Format: XXXXXXXX-6044-YYYY-ZZZZ-XXXXXXXXXXXX
        Where YYYY and ZZZZ are role-specific fixed segments

        Compatible with Kai's JavaScript implementation in phase7-compile-manifest.cjs
        """
        # Role-specific UUID segments (legacy SSi format)
        ROLE_SEGMENTS = {
            'target1': {'seg2': '6044', 'seg3': 'AC07', 'seg4': '8F4E'},
            'target2': {'seg2': '6044', 'seg3': 'E115', 'seg4': '8F4E'},
            'source':  {'seg2': '6044', 'seg3': '36CD', 'seg4': '31D4'},
            'presentation': {'seg2': '9CFE', 'seg3': '2486', 'seg4': '8F4E'}
        }

        if role not in ROLE_SEGMENTS:
            raise ValueError(f"Unknown role: {role}")

        # Create key from all components
        key = f"{text}|{language}|{role}|{cadence}"

        # Generate SHA1 hash
        hash_obj = hashlib.sha1(key.encode('utf-8'))
        hash_hex = hash_obj.hexdigest()

        # Get role-specific segments
        segments = ROLE_SEGMENTS[role]

        # Build UUID with role-specific middle sections
        # seg1 from hash bytes 0-3, seg5 from hash bytes 10-15
        uuid = '-'.join([
            hash_hex[0:8],        # segment 1: first 4 bytes of hash
            segments['seg2'],     # segment 2: role-specific (usually 6044)
            segments['seg3'],     # segment 3: role-specific
            segments['seg4'],     # segment 4: role-specific
            hash_hex[20:32]       # segment 5: last 6 bytes of hash
        ]).upper()

        return uuid

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

        Lego structure (v7):
          - id: S0001L01
          - type: A or M
          - target: "quiero" (Spanish)
          - known: "I want" (English)
          - new: true/false

        Lego structure (v9):
          - id: S0001L01
          - type: A or M
          - spanish: "quiero"
          - english: "I want"
          - new: true/false
        """
        lego_id = lego_data['id']
        known, target = self.normalize_lego_fields(lego_data)

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
            # Create nodes from ALL practice phrases, sorted by length
            # Skip empty phrases (v9 format has 12 pre-allocated slots, may have empties)
            phrases_with_nodes = []
            for phrase in practice_phrases:
                phrase_known, phrase_target = self.normalize_pair(phrase)
                # Skip empty phrases
                if phrase_known.strip() and phrase_target.strip():
                    node = self.create_node(phrase_known, phrase_target)
                    phrases_with_nodes.append((len(phrase_known), node))

            # Sort by length (shortest first)
            phrases_with_nodes.sort(key=lambda x: x[0])
            nodes = [node for _, node in phrases_with_nodes]

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

        # Normalize seed pair (handles both v7 array and v9 object formats)
        known_sentence, target_sentence = self.normalize_pair(seed_pair)

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

        # Add ALL practice phrases from ALL baskets
        # (sub-nodes only has first 3, we need all phrases for TTS)
        print(f"  Adding all practice phrases from baskets...")
        basket_phrases_added = 0
        for basket_id, basket in self.lego_baskets.items():
            practice_phrases = basket.get('practice_phrases', [])
            if isinstance(practice_phrases, list):
                for phrase in practice_phrases:
                    phrase_known, phrase_target = self.normalize_pair(phrase)

                    # Skip empty phrases (v9 format may have empty slots)
                    if not phrase_known.strip() or not phrase_target.strip():
                        continue

                    if phrase_known not in samples:
                        samples[phrase_known] = [self.create_sample_entry(phrase_known, "source")]
                        basket_phrases_added += 1

                    if phrase_target not in samples:
                        samples[phrase_target] = [
                            self.create_sample_entry(phrase_target, "target1"),
                            self.create_sample_entry(phrase_target, "target2")
                        ]
                        basket_phrases_added += 1

        print(f"  Added {basket_phrases_added} unique phrases from practice baskets")

        return samples

    def transform(self, output_file: str = None) -> Dict[str, Any]:
        """Transform course to APML format"""
        print("\nTransforming to APML format...")

        # Create main course structure
        course = {
            "id": f"{self.known_lang}-{self.target_lang}",
            "known": self.known_lang,
            "target": self.target_lang,
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

        # Load encouragements based on known language
        pooled_enc, ordered_enc = load_encouragements(self.known_lang)
        print(f"  Loaded {len(pooled_enc)} pooled encouragements")
        print(f"  Loaded {len(ordered_enc)} ordered encouragements")

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
            # Generate language-aware filename
            lang_names = {
                "es": "Spanish",
                "it": "Italian",
                "fr": "French",
                "de": "German",
                "cmn": "Mandarin",
                "en": "English"
            }
            target_name = lang_names.get(self.target_lang, self.target_lang.upper())
            known_name = lang_names.get(self.known_lang, self.known_lang.upper())
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = self.course_dir / f"{target_name}_for_{known_name}_speakers_COURSE_{timestamp}.json"

        print(f"\nWriting output to: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(course, f, ensure_ascii=False, indent=2)

        print("✓ Transformation complete!")

        return course

def main():
    import sys

    if len(sys.argv) < 2:
        print("Usage: python3 phase7_generate_course_manifest.py <course_directory> [output_file]")
        print("\nExample:")
        print("  python3 phase7_generate_course_manifest.py public/vfs/courses/spa_for_eng")
        print("  python3 phase7_generate_course_manifest.py public/vfs/courses/cmn_for_eng output.json")
        print("\nGenerates final APML course manifest from phase outputs.")
        print("Encouragements are loaded automatically based on the known language.")
        sys.exit(1)

    course_dir = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    generator = CourseManifestGenerator(course_dir)
    generator.load_source_files()
    course = generator.transform(output_file)

    print(f"\n=== SUMMARY ===")
    print(f"Course ID: {course['id']}")
    print(f"Known language: {course['known']}")
    print(f"Target language: {course['target']}")
    print(f"Total slices: {len(course['slices'])}")
    print(f"Total seeds: {sum(len(s['seeds']) for s in course['slices'])}")
    print(f"Total samples: {sum(len(s['samples']) for s in course['slices'])}")

if __name__ == '__main__':
    main()
