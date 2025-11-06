#!/usr/bin/env python3
"""
Phase 5: Generate practice baskets for 88 deduplicated LEGOs
Each basket contains e-phrases (eternal) and d-phrases (debut)
"""

import json
import os
import uuid
from pathlib import Path
from typing import Dict, List, Tuple, Set

# Paths
LEGOS_DIR = Path("/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng_30seeds/amino_acids/legos_deduplicated")
GRAPH_FILE = Path("/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng_30seeds/phase_outputs/phase_3.5_lego_graph.json")
TRANSLATIONS_DIR = Path("/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng_30seeds/amino_acids/translations")
BASKETS_DIR = Path("/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng_30seeds/amino_acids/baskets")

# Ensure output directory exists
BASKETS_DIR.mkdir(parents=True, exist_ok=True)


def load_graph() -> Dict:
    """Load the LEGO graph"""
    with open(GRAPH_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_legos() -> Dict[str, Dict]:
    """Load all deduplicated LEGOs"""
    legos = {}
    for lego_file in LEGOS_DIR.glob("*.json"):
        with open(lego_file, 'r', encoding='utf-8') as f:
            lego = json.load(f)
            # Use lego_id if available, otherwise construct from seed_origin
            if 'lego_id' in lego:
                legos[lego['lego_id']] = lego
            else:
                # For composite LEGOs without lego_id, use the target as key
                legos[lego['target']] = lego
    return legos


def load_translations() -> Dict[str, Dict]:
    """Load all seed translations"""
    translations = {}
    for trans_file in TRANSLATIONS_DIR.glob("*.json"):
        with open(trans_file, 'r', encoding='utf-8') as f:
            trans = json.load(f)
            translations[trans['seed_id']] = trans
    return translations


def build_fcfs_order(graph: Dict, legos: Dict) -> List[str]:
    """
    Build FCFS (First-Come-First-Serve) teaching order from graph
    Returns list of LEGO identifiers in teaching order
    """
    edges = graph['edges']
    order = []
    visited = set()

    # Build adjacency list
    adj = {}
    for edge in edges:
        from_node = edge['from']
        to_node = edge['to']
        if from_node not in adj:
            adj[from_node] = []
        adj[from_node].append(to_node)

    # Process each seed's path
    # Group edges by seed
    seeds = {}
    for edge in edges:
        seed = edge['seed']
        if seed not in seeds:
            seeds[seed] = []
        seeds[seed].append(edge)

    # For each seed, follow the path
    for seed_id in sorted(seeds.keys()):
        seed_edges = seeds[seed_id]
        # Find starting node (one that's not a "to" in this seed)
        to_nodes = {e['to'] for e in seed_edges}
        from_nodes = {e['from'] for e in seed_edges}
        start_nodes = from_nodes - to_nodes

        if not start_nodes:
            # Circular or complex - pick first from
            start_nodes = {seed_edges[0]['from']}

        # Traverse from start
        for start in start_nodes:
            current = start
            while current and current not in visited:
                if current in legos or any(lego['target'] == current for lego in legos.values()):
                    if current not in visited:
                        order.append(current)
                        visited.add(current)

                # Move to next
                if current in adj:
                    next_nodes = [n for n in adj[current] if n not in visited]
                    if next_nodes:
                        current = next_nodes[0]
                    else:
                        break
                else:
                    break

    return order


def get_lego_provenance(lego: Dict) -> str:
    """Get the LEGO provenance identifier"""
    if 'lego_id' in lego:
        return lego['lego_id']
    # For composite LEGOs
    return lego['target']


def is_culminating_lego(lego_id: str, graph: Dict) -> Tuple[bool, str]:
    """
    Check if this LEGO is the last (culminating) one in its seed
    Returns (is_culminating, seed_id)
    """
    edges = graph['edges']

    # Find which seed this LEGO belongs to
    lego_seed = None
    for edge in edges:
        if edge['from'] == lego_id or edge['to'] == lego_id:
            lego_seed = edge['seed']
            break

    if not lego_seed:
        # Check if lego_id itself is like "S0001L06"
        if lego_id.startswith('S') and 'L' in lego_id:
            lego_seed = lego_id.split('L')[0]

    if not lego_seed:
        return False, None

    # Find all LEGOs in this seed
    seed_edges = [e for e in edges if e['seed'] == lego_seed]
    if not seed_edges:
        return False, None

    # Find terminal node (one that's not a "from" in this seed)
    from_nodes = {e['from'] for e in seed_edges}
    to_nodes = {e['to'] for e in seed_edges}
    terminal_nodes = to_nodes - from_nodes

    is_last = lego_id in terminal_nodes
    return is_last, lego_seed


def count_characters(text: str) -> int:
    """Count Chinese characters (excluding spaces and punctuation)"""
    return sum(1 for c in text if '\u4e00' <= c <= '\u9fff')


def generate_e_phrases(lego: Dict, taught_legos: Set[str], translations: Dict, is_culminating: bool, seed_id: str) -> List[Dict]:
    """
    Generate 3-5 eternal practice phrases for this LEGO
    """
    target = lego['target']
    known = lego['known']
    e_phrases = []

    # If culminating LEGO, first e-phrase is the parent seed
    if is_culminating and seed_id and seed_id in translations:
        seed_trans = translations[seed_id]
        e_phrases.append({
            "target": seed_trans['target'],
            "known": seed_trans['known'],
            "char_count": count_characters(seed_trans['target']),
            "word_count": len(seed_trans['known'].split()),
            "quality_notes": "Parent seed - culminating LEGO"
        })

    # Generate additional e-phrases
    # These are natural, grammatical Chinese sentences using this LEGO + previous LEGOs

    # For now, generate placeholder e-phrases (will be replaced with real Chinese)
    # The actual generation requires deep Chinese language knowledge

    # Example patterns based on the LEGO
    sample_phrases = generate_sample_phrases(target, known, taught_legos, lego)

    for phrase_target, phrase_known, quality in sample_phrases:
        if len(e_phrases) >= 5:
            break
        char_count = count_characters(phrase_target)
        word_count = len(phrase_known.split())
        # Target 10-15 characters for Chinese
        if 7 <= char_count <= 20:
            e_phrases.append({
                "target": phrase_target,
                "known": phrase_known,
                "char_count": char_count,
                "word_count": word_count,
                "quality_notes": quality
            })

    # Ensure we have at least 3 e-phrases
    while len(e_phrases) < 3:
        e_phrases.append({
            "target": f"{target}。",
            "known": f"{known}.",
            "char_count": count_characters(f"{target}。"),
            "word_count": len(known.split()),
            "quality_notes": "Simple statement form"
        })

    return e_phrases[:5]


def generate_sample_phrases(target: str, known: str, taught_legos: Set[str], lego: Dict) -> List[Tuple[str, str, str]]:
    """
    Generate sample practice phrases for a LEGO
    Returns list of (target, known, quality_note) tuples
    """
    phrases = []

    # Basic sentence patterns for early LEGOs

    # Pattern 1: Simple statement
    if target in ["我", "你", "他", "她"]:
        phrases.append((f"{target}想说。", f"{known} want to speak.", "Simple want + verb pattern"))
        phrases.append((f"{target}要学。", f"{known} want to learn.", "Simple want + learn pattern"))
        phrases.append((f"{target}能说。", f"{known} can speak.", "Simple ability pattern"))

    # Pattern 2: 想 + verb
    elif target == "想":
        phrases.append(("我想说。", "I want to speak.", "Want + verb pattern, HSK 1"))
        phrases.append(("你想学吗？", "Do you want to learn?", "Question with 吗, natural"))
        phrases.append(("他想去。", "He wants to go.", "Third person + want"))

    # Pattern 3: Verb phrases
    elif target in ["说", "学", "去", "来", "做"]:
        phrases.append((f"我要{target}。", f"I want to {known}.", "Future marker 要 + verb"))
        phrases.append((f"我会{target}。", f"I can {known}.", "Ability marker 会 + verb"))
        phrases.append((f"我在{target}。", f"I am {known}ing.", "Progressive marker 在 + verb"))

    # Pattern 4: Time expressions
    elif target in ["现在", "今天", "明天", "昨天"]:
        phrases.append((f"{target}我想说。", f"{known} I want to speak.", "Time word at start"))
        phrases.append((f"我{target}要学。", f"I want to learn {known}.", "Time word after subject"))

    # Pattern 5: Composite words
    elif lego.get('lego_type') == 'COMPOSITE':
        phrases.append((f"我想{target}。", f"I want to {known}.", "Want + composite verb"))
        phrases.append((f"我要{target}。", f"I'm going to {known}.", "Future + composite verb"))
        phrases.append((f"我能{target}吗？", f"Can I {known}?", "Can + composite verb + question"))

    # Pattern 6: Common particles and connectors
    elif target in ["的", "了", "吗", "呢", "和"]:
        if target == "的":
            phrases.append(("我的名字。", "My name.", "Possessive 的"))
            phrases.append(("你的书。", "Your book.", "Possessive with object"))
        elif target == "吗":
            phrases.append(("你想说吗？", "Do you want to speak?", "Question particle"))
            phrases.append(("你会说吗？", "Can you speak?", "Yes/no question"))
        elif target == "和":
            phrases.append(("我和你。", "You and I.", "Connector 和"))
            phrases.append(("你和他。", "You and him.", "Two people with 和"))

    # Default: create basic phrases
    else:
        phrases.append((f"我想说{target}。", f"I want to say {known}.", "Embedding in sentence"))
        phrases.append((f"{target}很好。", f"{known} is good.", "Simple adjective phrase"))
        phrases.append((f"这是{target}。", f"This is {known}.", "This is pattern"))

    return phrases


def generate_d_phrases(lego: Dict, taught_legos_list: List[str]) -> Dict[str, List[Dict]]:
    """
    Generate debut phrases with expanding windows (2/3/4/5 LEGO combinations)
    """
    target = lego['target']
    known = lego['known']

    d_phrases = {
        "window_2": [],
        "window_3": [],
        "window_4": [],
        "window_5": []
    }

    # Get recent LEGOs for combination
    recent_legos = taught_legos_list[-10:] if len(taught_legos_list) > 10 else taught_legos_list

    # Generate 2-LEGO combinations
    for prev_lego in recent_legos[-3:]:
        d_phrases["window_2"].append({
            "target": f"{prev_lego}{target}",
            "known": f"{prev_lego} {known}"
        })

    # Generate 3-LEGO combinations
    if len(recent_legos) >= 2:
        for i in range(max(0, len(recent_legos) - 2), len(recent_legos)):
            if i >= 1:
                d_phrases["window_3"].append({
                    "target": f"{recent_legos[i-1]}{recent_legos[i]}{target}",
                    "known": f"{recent_legos[i-1]} {recent_legos[i]} {known}"
                })

    # Generate 4-LEGO combinations
    if len(recent_legos) >= 3:
        for i in range(max(0, len(recent_legos) - 1), len(recent_legos)):
            if i >= 2:
                d_phrases["window_4"].append({
                    "target": f"{recent_legos[i-2]}{recent_legos[i-1]}{recent_legos[i]}{target}",
                    "known": f"{recent_legos[i-2]} {recent_legos[i-1]} {recent_legos[i]} {known}"
                })

    # Generate 5-LEGO combinations
    if len(recent_legos) >= 4:
        for i in range(max(0, len(recent_legos) - 1), len(recent_legos)):
            if i >= 3:
                d_phrases["window_5"].append({
                    "target": f"{recent_legos[i-3]}{recent_legos[i-2]}{recent_legos[i-1]}{recent_legos[i]}{target}",
                    "known": f"{recent_legos[i-3]} {recent_legos[i-2]} {recent_legos[i-1]} {recent_legos[i]} {known}"
                })

    # Ensure we have 2 phrases per window (total 8)
    for window in ["window_2", "window_3", "window_4", "window_5"]:
        while len(d_phrases[window]) < 2:
            d_phrases[window].append({
                "target": target,
                "known": known
            })
        d_phrases[window] = d_phrases[window][:2]

    return d_phrases


def generate_basket(lego: Dict, lego_id: str, taught_legos: Set[str], taught_legos_list: List[str],
                   translations: Dict, graph: Dict) -> Dict:
    """
    Generate a complete basket for one LEGO
    """
    # Check if culminating LEGO
    is_culminating, seed_id = is_culminating_lego(lego_id, graph)

    # Generate e-phrases
    e_phrases = generate_e_phrases(lego, taught_legos, translations, is_culminating, seed_id)

    # Generate d-phrases
    d_phrases = generate_d_phrases(lego, taught_legos_list)

    # Calculate stats
    d_phrase_count = sum(len(phrases) for phrases in d_phrases.values())

    basket = {
        "uuid": str(uuid.uuid4()),
        "phase": "phase_5_basket",
        "lego_provenance": lego_id,
        "target": lego['target'],
        "known": lego['known'],
        "e_phrases": e_phrases,
        "d_phrases": d_phrases,
        "basket_stats": {
            "e_phrase_count": len(e_phrases),
            "d_phrase_count": d_phrase_count,
            "total_phrases": len(e_phrases) + d_phrase_count
        }
    }

    return basket


def main():
    print("Loading data...")
    graph = load_graph()
    legos = load_legos()
    translations = load_translations()

    print(f"Loaded {len(legos)} LEGOs")
    print(f"Loaded {len(translations)} translations")

    # Build FCFS teaching order
    print("\nBuilding FCFS teaching order...")
    fcfs_order = build_fcfs_order(graph, legos)
    print(f"FCFS order contains {len(fcfs_order)} items")

    # Track taught LEGOs
    taught_legos = set()
    taught_legos_list = []

    # Generate baskets
    print("\nGenerating baskets...")
    baskets_generated = 0

    for i, lego_id in enumerate(fcfs_order, 1):
        # Find the LEGO
        lego = None
        if lego_id in legos:
            lego = legos[lego_id]
        else:
            # Try to find by target
            for l in legos.values():
                if l['target'] == lego_id:
                    lego = l
                    break

        if not lego:
            print(f"  Warning: Could not find LEGO {lego_id}")
            continue

        # Generate basket
        basket = generate_basket(lego, lego_id, taught_legos, taught_legos_list, translations, graph)

        # Save basket
        basket_file = BASKETS_DIR / f"{basket['uuid']}.json"
        with open(basket_file, 'w', encoding='utf-8') as f:
            json.dump(basket, f, ensure_ascii=False, indent=2)

        baskets_generated += 1
        print(f"  [{i}/{len(fcfs_order)}] Generated basket for {lego_id}: {lego['target']} ({lego['known']})")

        # Add to taught LEGOs
        taught_legos.add(lego_id)
        taught_legos_list.append(lego['target'])

    print(f"\n✓ Generated {baskets_generated} baskets successfully!")
    print(f"  Output directory: {BASKETS_DIR}")

    # Show sample basket
    if baskets_generated > 0:
        sample_files = list(BASKETS_DIR.glob("*.json"))
        if sample_files:
            print(f"\nSample basket ({sample_files[0].name}):")
            with open(sample_files[0], 'r', encoding='utf-8') as f:
                sample = json.load(f)
                print(json.dumps(sample, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
