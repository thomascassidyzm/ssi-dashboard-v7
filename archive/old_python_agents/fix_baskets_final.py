#!/usr/bin/env python3
import json

# Load the baskets file
with open('phase5_batch1_s0101_s0300/batch_output/agent_14_baskets.json', 'r', encoding='utf-8') as f:
    baskets = json.load(f)

print("Fixing GATE violations and final phrase mismatches...")

# Fix S0237L01 - remove the phrase with "hablara" (GATE violation)
# Replace it with a safe phrase
s0237l01_phrases = baskets['seeds']['S0237']['legos']['S0237L01']['practice_phrases']
for i, phrase in enumerate(s0237l01_phrases):
    if 'hablara' in phrase[1].lower():
        print(f"  Fixing S0237L01 phrase {i}: removing 'hablara'")
        s0237l01_phrases[i] = ["He wanted to help", "Quería ayudar", None, 2]

# Fix final phrases to match seed sentences exactly
# The validator checks the LAST phrase of the FINAL LEGO

# S0233L05 is the final LEGO - set last phrase (index 9)
baskets['seeds']['S0233']['legos']['S0233L05']['practice_phrases'][9] = [
    "I know a young woman who knows your sister.",
    "Conozco a una mujer joven que conoce a tu hermana.",
    None,
    5
]
print("  Fixed S0233L05 final phrase")

# S0234L07 is the final LEGO - set last phrase (index 9)
baskets['seeds']['S0234']['legos']['S0234L07']['practice_phrases'][9] = [
    "I met someone last night who works with your brother.",
    "Conocí a alguien anoche que trabaja con tu hermano.",
    None,
    6
]
print("  Fixed S0234L07 final phrase")

# S0235L07 is the final LEGO - set last phrase (index 9)
baskets['seeds']['S0235']['legos']['S0235L07']['practice_phrases'][9] = [
    "I met someone who said that he wanted to tell you something.",
    "Conocí a alguien que dijo que quería decirte algo.",
    None,
    9
]
print("  Fixed S0235L07 final phrase")

# S0236L06 is the final LEGO - set last phrase (index 9)
# Check if it needs fixing
current = baskets['seeds']['S0236']['legos']['S0236L06']['practice_phrases'][9]
expected_spanish = "Conozco a alguien que dijo que iba a intentar ayudar."
if current[1].replace('.', '').lower() != expected_spanish.replace('.', '').lower():
    baskets['seeds']['S0236']['legos']['S0236L06']['practice_phrases'][9] = [
        "I know someone who said that she was going to try to help.",
        "Conozco a alguien que dijo que iba a intentar ayudar.",
        None,
        8
    ]
    print("  Fixed S0236L06 final phrase")
else:
    print("  S0236L06 final phrase already correct")

# S0237L03 is the final LEGO - set last phrase (index 9)
baskets['seeds']['S0237']['legos']['S0237L03']['practice_phrases'][9] = [
    "He wanted me to tell you before the weekend.",
    "Quería que te dijera antes del fin de semana.",
    None,
    6
]
print("  Fixed S0237L03 final phrase")

# S0238L02 is the final LEGO - set last phrase (index 9)
baskets['seeds']['S0238']['legos']['S0238L02']['practice_phrases'][9] = [
    "He wanted you to tell me yesterday.",
    "Quería que me dijeras ayer.",
    None,
    5
]
print("  Fixed S0238L02 final phrase")

# S0239 S0035L01 is the final LEGO - set last phrase (index 9)
baskets['seeds']['S0239']['legos']['S0035L01']['practice_phrases'][9] = [
    "My mother likes to read.",
    "A mi madre le gusta leer.",
    None,
    4
]
print("  Fixed S0239 S0035L01 final phrase")

# S0240L03 is the final LEGO - set last phrase (index 9)
baskets['seeds']['S0240']['legos']['S0240L03']['practice_phrases'][9] = [
    "My father doesn't like to stop talking.",
    "A mi padre no le gusta dejar de hablar.",
    None,
    6
]
print("  Fixed S0240L03 final phrase")

# Save the fixed file
with open('phase5_batch1_s0101_s0300/batch_output/agent_14_baskets.json', 'w', encoding='utf-8') as f:
    json.dump(baskets, f, indent=2, ensure_ascii=False)

print("\n✓ All fixes applied successfully!")
print("✓ File saved to: phase5_batch1_s0101_s0300/batch_output/agent_14_baskets.json")
print("\nRun validation to verify fixes...")
