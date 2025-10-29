#!/usr/bin/env python3
"""
Manually fix the remaining 34 broken seeds with specific corrections.
"""

import json

def load_data():
    """Load LEGO data."""
    with open('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/lego_pairs.tmp.json', 'r') as f:
        return json.load(f)

def save_data(lego_data):
    """Save LEGO data."""
    output_path = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/lego_pairs.tmp.json'
    with open(output_path, 'w') as f:
        json.dump(lego_data, f, ensure_ascii=False, separators=(',', ':'))
    print(f"Saved to: {output_path}")

def find_seed(lego_data, seed_id):
    """Find a seed entry by ID."""
    for i, seed_entry in enumerate(lego_data['seeds']):
        if seed_entry[0] == seed_id:
            return i, seed_entry
    return None, None

def fix_s0003(lego_data):
    """Fix S0003: como hablar tan frecuentemente como sea posible."""
    idx, seed_entry = find_seed(lego_data, "S0003")
    if idx is None:
        return False

    # Correct decomposition:
    # "como" -> "how"
    # "hablar" -> "to speak"
    # "tan frecuentemente como sea posible" -> "as often as possible"

    lego_data['seeds'][idx][2] = [
        ["S0003L01", "B", "como", "how"],
        ["S0003L02", "B", "hablar", "to speak"],
        ["S0003L03", "C", "tan frecuentemente como sea posible", "as often as possible", [
            ["tan", "as"],
            ["frecuentemente", "often"],
            ["como sea", "as"],
            ["posible", "possible"]
        ]]
    ]
    return True

def fix_s0007(lego_data):
    """Fix S0007: Quiero intentar tan duro como puedo hoy."""
    idx, seed_entry = find_seed(lego_data, "S0007")
    if idx is None:
        return False

    # Correct decomposition:
    lego_data['seeds'][idx][2] = [
        ["S0007L01", "B", "Quiero", "I want"],
        ["S0007L02", "B", "intentar", "to try"],
        ["S0007L03", "C", "tan duro como puedo", "as hard as I can", [
            ["tan", "as"],
            ["duro", "hard"],
            ["como", "as"],
            ["puedo", "I can"]
        ]],
        ["S0007L04", "B", "hoy", "today"]
    ]
    return True

def fix_s0041(lego_data):
    """Fix S0041: Me siento bien, pero estoy empezando a sentirme cansado."""
    idx, seed_entry = find_seed(lego_data, "S0041")
    if idx is None:
        return False

    lego_data['seeds'][idx][2] = [
        ["S0041L01", "C", "Me siento", "I feel", [["Me", "myself"], ["siento", "I feel"]]],
        ["S0041L02", "B", "bien,", "okay,"],
        ["S0041L03", "B", "pero", "but"],
        ["S0041L04", "C", "estoy empezando a", "I'm starting to", [
            ["estoy", "I am"],
            ["empezando", "starting"],
            ["a", "to"]
        ]],
        ["S0041L05", "B", "sentirme", "to feel"],
        ["S0041L06", "B", "cansado", "tired"]
    ]
    return True

def fix_s0064(lego_data):
    """Fix S0064: Aprender español no es fácil pero es divertido."""
    idx, seed_entry = find_seed(lego_data, "S0064")
    if idx is None:
        return False

    lego_data['seeds'][idx][2] = [
        ["S0064L01", "B", "Aprender", "Learning"],
        ["S0064L02", "B", "español", "Spanish"],
        ["S0064L03", "C", "no es", "isn't", [["no", "not"], ["es", "is"]]],
        ["S0064L04", "B", "fácil", "easy"],
        ["S0064L05", "B", "pero", "but"],
        ["S0064L06", "B", "es", "it is"],
        ["S0064L07", "B", "divertido", "fun"]
    ]
    return True

def fix_s0073(lego_data):
    """Fix S0073: Muchas gracias, pero tengo más que aprender."""
    idx, seed_entry = find_seed(lego_data, "S0073")
    if idx is None:
        return False

    lego_data['seeds'][idx][2] = [
        ["S0073L01", "C", "Muchas gracias,", "Thank you very much,", [
            ["Muchas", "very"],
            ["gracias,", "thank you,"]
        ]],
        ["S0073L02", "B", "pero", "but"],
        ["S0073L03", "B", "tengo", "I've got"],
        ["S0073L04", "B", "más", "more"],
        ["S0073L05", "C", "que aprender", "to learn", [["que", "to"], ["aprender", "learn"]]]
    ]
    return True

def fix_s0082(lego_data):
    """Fix S0082: No voy a esperarte. ¿Por qué no?"""
    idx, seed_entry = find_seed(lego_data, "S0082")
    if idx is None:
        return False

    lego_data['seeds'][idx][2] = [
        ["S0082L01", "C", "No voy a", "I'm not going to", [
            ["No", "not"],
            ["voy", "I go"],
            ["a", "to"]
        ]],
        ["S0082L02", "B", "esperarte.", "wait for you."],
        ["S0082L03", "C", "¿Por qué", "Why", [["¿Por", "For"], ["qué", "what"]]],
        ["S0082L04", "B", "no", "not"]
    ]
    return True

def fix_s0086(lego_data):
    """Fix S0086: No era posible, desafortunadamente."""
    idx, seed_entry = find_seed(lego_data, "S0086")
    if idx is None:
        return False

    lego_data['seeds'][idx][2] = [
        ["S0086L01", "C", "No era", "It wasn't", [["No", "not"], ["era", "it was"]]],
        ["S0086L02", "B", "posible,", "possible,"],
        ["S0086L03", "B", "desafortunadamente", "unfortunately"]
    ]
    return True

def fix_s0096(lego_data):
    """Fix S0096: No, no estoy listo todavía, necesito un poco más de tiempo."""
    idx, seed_entry = find_seed(lego_data, "S0096")
    if idx is None:
        return False

    lego_data['seeds'][idx][2] = [
        ["S0096L01", "B", "No,", "No,"],
        ["S0096L02", "C", "no estoy", "I'm not", [["no", "not"], ["estoy", "I am"]]],
        ["S0096L03", "B", "listo", "ready"],
        ["S0096L04", "B", "todavía,", "yet,"],
        ["S0096L05", "B", "necesito", "I need"],
        ["S0096L06", "C", "un poco más de", "a little more", [
            ["un poco", "a little"],
            ["más", "more"],
            ["de", "of"]
        ]],
        ["S0096L07", "B", "tiempo", "time"]
    ]
    return True

def fix_s0106(lego_data):
    """Fix S0106: No necesitamos sentirnos felices, solo necesitamos trabajar duro."""
    idx, seed_entry = find_seed(lego_data, "S0106")
    if idx is None:
        return False

    lego_data['seeds'][idx][2] = [
        ["S0106L01", "C", "No necesitamos", "We don't need", [
            ["No", "not"],
            ["necesitamos", "we need"]
        ]],
        ["S0106L02", "B", "sentirnos", "to feel"],
        ["S0106L03", "B", "felices,", "happy,"],
        ["S0106L04", "B", "solo", "only"],
        ["S0106L05", "B", "necesitamos", "we need"],
        ["S0106L06", "C", "trabajar duro", "to work hard", [
            ["trabajar", "to work"],
            ["duro", "hard"]
        ]]
    ]
    return True

def fix_s0110(lego_data):
    """Fix S0110: Somos amigos, y después de que terminemos me gustaría relajarme."""
    idx, seed_entry = find_seed(lego_data, "S0110")
    if idx is None:
        return False

    lego_data['seeds'][idx][2] = [
        ["S0110L01", "B", "Somos", "We are"],
        ["S0110L02", "B", "amigos,", "friends,"],
        ["S0110L03", "B", "y", "and"],
        ["S0110L04", "C", "después de que", "after", [
            ["después", "after"],
            ["de", "of"],
            ["que", "that"]
        ]],
        ["S0110L05", "B", "terminemos", "we finish"],
        ["S0110L06", "C", "me gustaría", "I'd like", [["me", "me"], ["gustaría", "would like"]]],
        ["S0110L07", "B", "relajarme", "to relax"]
    ]
    return True

# Continue with more fixes...

def get_all_broken_seeds():
    """Return list of all 34 broken seed IDs."""
    return [
        "S0003", "S0007", "S0041", "S0064", "S0073", "S0082", "S0086", "S0096",
        "S0106", "S0110", "S0112", "S0117", "S0130", "S0132", "S0133", "S0141",
        "S0142", "S0143", "S0144", "S0146", "S0147", "S0148", "S0149", "S0151",
        "S0152", "S0154", "S0156", "S0158", "S0160", "S0162", "S0520", "S0390",
        "S0391", "S0642"
    ]

def main():
    print("Loading data...")
    lego_data = load_data()

    # Apply fixes
    fixes = [
        ("S0003", fix_s0003),
        ("S0007", fix_s0007),
        ("S0041", fix_s0041),
        ("S0064", fix_s0064),
        ("S0073", fix_s0073),
        ("S0082", fix_s0082),
        ("S0086", fix_s0086),
        ("S0096", fix_s0096),
        ("S0106", fix_s0106),
        ("S0110", fix_s0110),
    ]

    fixed_count = 0
    for seed_id, fix_func in fixes:
        if fix_func(lego_data):
            print(f"✓ Fixed {seed_id}")
            fixed_count += 1
        else:
            print(f"✗ Could not find {seed_id}")

    # Save
    save_data(lego_data)

    print(f"\nFixed {fixed_count} of 10 seeds (manual fixes)")
    print(f"Remaining seeds need manual review and fixing")

if __name__ == "__main__":
    main()
