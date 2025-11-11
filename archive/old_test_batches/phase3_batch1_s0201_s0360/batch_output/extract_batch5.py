#!/usr/bin/env python3
"""
Extract LEGOs from Spanish seeds S0281-S0300 using Phase 3 methodology.
Follows FD (Functionally Deterministic) principles.
"""

import json
from datetime import datetime

def load_registry(registry_path):
    """Load registry and create lookup by target-known pair."""
    with open(registry_path, 'r') as f:
        registry = json.load(f)

    lego_lookup = {}
    for lego_id, lego_data in registry['legos'].items():
        key = (lego_data['target'].lower(), lego_data['known'].lower())
        lego_lookup[key] = {
            'id': lego_id,
            'source_seed': lego_data['source_seed'],
            'type': lego_data['type']
        }
    return lego_lookup

def check_registry(target, known, registry_lookup):
    """Check if a LEGO exists in the registry."""
    key = (target.lower(), known.lower())
    return registry_lookup.get(key)

def extract_legos_s0281():
    """¿Te importa si termino mi café antes de que empieces?
    Do you mind if I finish my coffee before you start?"""
    return [
        {"target": "¿Te importa", "known": "Do you mind", "type": "M"},
        {"target": "si", "known": "if", "type": "A"},
        {"target": "termino", "known": "I finish", "type": "A"},
        {"target": "mi", "known": "my", "type": "A"},
        {"target": "café", "known": "coffee", "type": "A"},
        {"target": "antes de que", "known": "before", "type": "M"},
        {"target": "empieces", "known": "you start", "type": "A"},
    ]

def extract_legos_s0282():
    """No, eso no es un problema.
    No that's not a problem."""
    return [
        {"target": "no", "known": "no", "type": "A"},
        {"target": "eso", "known": "that", "type": "A"},
        {"target": "no es", "known": "'s not", "type": "M"},
        {"target": "un", "known": "a", "type": "A"},
        {"target": "problema", "known": "problem", "type": "A"},
    ]

def extract_legos_s0283():
    """¿Cuáles de tus amigos hablan español?
    Which of your friends speak Spanish?"""
    return [
        {"target": "cuáles", "known": "which", "type": "A"},
        {"target": "de", "known": "of", "type": "A"},
        {"target": "tus", "known": "your", "type": "A"},
        {"target": "amigos", "known": "friends", "type": "A"},
        {"target": "hablan", "known": "speak", "type": "A"},
        {"target": "español", "known": "Spanish", "type": "A"},
    ]

def extract_legos_s0284():
    """¿Conoces a la amiga de mi hermana?
    Do you know my sister's friend?"""
    return [
        {"target": "conoces", "known": "do you know", "type": "M"},
        {"target": "a", "known": "", "type": "A"},  # personal a, no English equivalent
        {"target": "la", "known": "the", "type": "A"},
        {"target": "amiga", "known": "friend", "type": "A"},
        {"target": "de", "known": "of", "type": "A"},
        {"target": "mi", "known": "my", "type": "A"},
        {"target": "hermana", "known": "sister", "type": "A"},
    ]

def extract_legos_s0285():
    """Ella habla español.
    She speaks Spanish."""
    return [
        {"target": "ella", "known": "she", "type": "A"},
        {"target": "habla", "known": "speaks", "type": "A"},
        {"target": "español", "known": "Spanish", "type": "A"},
    ]

def extract_legos_s0286():
    """Personas a las que les gusta hablar español.
    People who like speaking Spanish."""
    return [
        {"target": "personas", "known": "people", "type": "A"},
        {"target": "a las que les gusta", "known": "who like", "type": "M"},
        {"target": "hablar", "known": "speaking", "type": "A"},
        {"target": "español", "known": "Spanish", "type": "A"},
    ]

def extract_legos_s0287():
    """¿Cuántas personas conoces a las que les gusta ver la televisión?
    How many people do you know who like watching television?"""
    return [
        {"target": "cuántas", "known": "how many", "type": "M"},
        {"target": "personas", "known": "people", "type": "A"},
        {"target": "conoces", "known": "do you know", "type": "M"},
        {"target": "a las que les gusta", "known": "who like", "type": "M"},
        {"target": "ver", "known": "watching", "type": "A"},
        {"target": "la televisión", "known": "television", "type": "M"},
    ]

def extract_legos_s0288():
    """A la mayoría de la gente que conozco le gusta ver la televisión.
    Most people I know like watching television."""
    return [
        {"target": "a la mayoría de", "known": "most", "type": "M"},
        {"target": "la gente", "known": "people", "type": "M"},
        {"target": "que", "known": "", "type": "A"},  # relative pronoun absorbed
        {"target": "conozco", "known": "I know", "type": "A"},
        {"target": "le gusta", "known": "like", "type": "M"},
        {"target": "ver", "known": "watching", "type": "A"},
        {"target": "la televisión", "known": "television", "type": "M"},
    ]

def extract_legos_s0289():
    """Me pregunto si ella va a estar allí esta tarde.
    I wonder if she's going to be there this afternoon."""
    return [
        {"target": "me pregunto", "known": "I wonder", "type": "M"},
        {"target": "si", "known": "if", "type": "A"},
        {"target": "ella", "known": "she", "type": "A"},
        {"target": "va a estar", "known": "'s going to be", "type": "M"},
        {"target": "allí", "known": "there", "type": "A"},
        {"target": "esta", "known": "this", "type": "A"},
        {"target": "tarde", "known": "afternoon", "type": "A"},
    ]

def extract_legos_s0290():
    """Me pregunto si él sabe la respuesta.
    I wonder if he knows the answer."""
    return [
        {"target": "me pregunto", "known": "I wonder", "type": "M"},
        {"target": "si", "known": "if", "type": "A"},
        {"target": "él", "known": "he", "type": "A"},
        {"target": "sabe", "known": "knows", "type": "A"},
        {"target": "la", "known": "the", "type": "A"},
        {"target": "respuesta", "known": "answer", "type": "A"},
    ]

def extract_legos_s0291():
    """Espero poder hablar mejor pronto.
    I hope I'll be able to speak better soon."""
    return [
        {"target": "espero", "known": "I hope", "type": "A"},
        {"target": "poder", "known": "I'll be able to", "type": "A"},
        {"target": "hablar", "known": "to speak", "type": "A"},
        {"target": "mejor", "known": "better", "type": "A"},
        {"target": "pronto", "known": "soon", "type": "A"},
    ]

def extract_legos_s0292():
    """Espero que puedas venir a la fiesta.
    I hope you'll be able to come to the party."""
    return [
        {"target": "espero que", "known": "I hope", "type": "M"},
        {"target": "puedas", "known": "you'll be able to", "type": "A"},
        {"target": "venir", "known": "to come", "type": "A"},
        {"target": "a", "known": "to", "type": "A"},
        {"target": "la", "known": "the", "type": "A"},
        {"target": "fiesta", "known": "party", "type": "A"},
    ]

def extract_legos_s0293():
    """Tengo que descubrir dónde va a reunirse conmigo.
    I have to find out where he's going to meet me."""
    return [
        {"target": "tengo que", "known": "I have to", "type": "M"},
        {"target": "descubrir", "known": "find out", "type": "A"},
        {"target": "dónde", "known": "where", "type": "A"},
        {"target": "va a", "known": "'s going to", "type": "M"},
        {"target": "reunirse", "known": "to meet", "type": "M"},
        {"target": "conmigo", "known": "with me", "type": "A"},
    ]

def extract_legos_s0294():
    """No tengo suficiente tiempo para llamarte esta noche.
    I don't have enough time to call you tonight."""
    return [
        {"target": "no tengo", "known": "I don't have", "type": "M"},
        {"target": "suficiente", "known": "enough", "type": "A"},
        {"target": "tiempo", "known": "time", "type": "A"},
        {"target": "para", "known": "to", "type": "A"},
        {"target": "llamarte", "known": "call you", "type": "M"},
        {"target": "esta noche", "known": "tonight", "type": "M"},
    ]

def extract_legos_s0295():
    """No dije que quería terminar en un día.
    I didn't say that I wanted to finish in a day."""
    return [
        {"target": "no dije", "known": "I didn't say", "type": "M"},
        {"target": "que", "known": "that", "type": "A"},
        {"target": "quería", "known": "I wanted", "type": "A"},
        {"target": "terminar", "known": "to finish", "type": "A"},
        {"target": "en", "known": "in", "type": "A"},
        {"target": "un", "known": "a", "type": "A"},
        {"target": "día", "known": "day", "type": "A"},
    ]

def extract_legos_s0296():
    """Dije que necesitaba un poco más de tiempo.
    I said that I needed a little more time."""
    return [
        {"target": "dije", "known": "I said", "type": "A"},
        {"target": "que", "known": "that", "type": "A"},
        {"target": "necesitaba", "known": "I needed", "type": "A"},
        {"target": "un poco más de", "known": "a little more", "type": "M"},
        {"target": "tiempo", "known": "time", "type": "A"},
    ]

def extract_legos_s0297():
    """No conozco a muchas personas que hablan español.
    I don't know many people who speak Spanish."""
    return [
        {"target": "no conozco", "known": "I don't know", "type": "M"},
        {"target": "a", "known": "", "type": "A"},  # personal a
        {"target": "muchas", "known": "many", "type": "A"},
        {"target": "personas", "known": "people", "type": "A"},
        {"target": "que", "known": "who", "type": "A"},
        {"target": "hablan", "known": "speak", "type": "A"},
        {"target": "español", "known": "Spanish", "type": "A"},
    ]

def extract_legos_s0298():
    """No me queda nada que decir.
    I've got nothing left to say."""
    return [
        {"target": "no me queda", "known": "I've got", "type": "M"},
        {"target": "nada", "known": "nothing", "type": "A"},
        {"target": "que", "known": "to", "type": "A"},
        {"target": "decir", "known": "to say", "type": "A"},
    ]

def extract_legos_s0299():
    """Él quiere pagar la mitad.
    He wants to pay half."""
    return [
        {"target": "él", "known": "he", "type": "A"},
        {"target": "quiere", "known": "wants", "type": "A"},
        {"target": "pagar", "known": "to pay", "type": "A"},
        {"target": "la mitad", "known": "half", "type": "M"},
    ]

def extract_legos_s0300():
    """Ella no quiere parecer antipática.
    She doesn't want to seem unfriendly."""
    return [
        {"target": "ella", "known": "she", "type": "A"},
        {"target": "no quiere", "known": "doesn't want", "type": "M"},
        {"target": "parecer", "known": "to seem", "type": "A"},
        {"target": "antipática", "known": "unfriendly", "type": "A"},
    ]

def add_components_to_m_legos(lego):
    """Add components array to M-type LEGOs that need them."""
    if lego['type'] != 'M':
        return lego

    target = lego['target']
    known = lego['known']

    # Define componentization for M-type LEGOs
    components_map = {
        "¿te importa": [["te", "you"], ["importa", "mind"]],
        "antes de que": [["antes", "before"], ["de que", ""]],
        "no es": [["no", "not"], ["es", "is"]],
        "conoces": [["conoce", "know"], ["-s", "you"]],
        "a las que les gusta": [["a las que", "who"], ["les gusta", "like"]],
        "cuántas": [["cuán", "how"], ["-tas", "many"]],
        "la televisión": [["la", "the"], ["televisión", "television"]],
        "a la mayoría de": [["a", ""], ["la mayoría", "most"], ["de", "of"]],
        "la gente": [["la", "the"], ["gente", "people"]],
        "le gusta": [["le", ""], ["gusta", "like"]],
        "me pregunto": [["me", "I"], ["pregunto", "wonder"]],
        "va a estar": [["va a", "'s going to"], ["estar", "be"]],
        "espero que": [["espero", "I hope"], ["que", ""]],
        "tengo que": [["tengo", "I have"], ["que", "to"]],
        "va a": [["va", "'s going"], ["a", "to"]],
        "reunirse": [["reunir", "to meet"], ["-se", ""]],
        "llamarte": [["llamar", "to call"], ["-te", "you"]],
        "un poco más de": [["un poco", "a little"], ["más", "more"], ["de", ""]],
        "no me queda": [["no", ""], ["me", "I've"], ["queda", "got"]],
        "la mitad": [["la", "the"], ["mitad", "half"]],
        "no dije": [["no", "didn't"], ["dije", "I say"]],
        "no tengo": [["no", "don't"], ["tengo", "I have"]],
        "esta noche": [["esta", "this"], ["noche", "night"]],
        "no conozco": [["no", "don't"], ["conozco", "I know"]],
        "no quiere": [["no", "doesn't"], ["quiere", "want"]],
    }

    key = target.lower()
    if key in components_map:
        lego['components'] = components_map[key]

    return lego

def main():
    # Load registry
    print("Loading registry...")
    registry_lookup = load_registry('phase3_batch1_s0201_s0360/registry/lego_registry_s0001_s0200.json')
    print(f"Registry loaded: {len(registry_lookup)} LEGOs")

    # Load batch input
    with open('phase3_batch1_s0201_s0360/batch_input/batch_5.json', 'r') as f:
        batch_input = json.load(f)

    # Extraction functions mapped by seed_id
    extraction_functions = {
        'S0281': extract_legos_s0281,
        'S0282': extract_legos_s0282,
        'S0283': extract_legos_s0283,
        'S0284': extract_legos_s0284,
        'S0285': extract_legos_s0285,
        'S0286': extract_legos_s0286,
        'S0287': extract_legos_s0287,
        'S0288': extract_legos_s0288,
        'S0289': extract_legos_s0289,
        'S0290': extract_legos_s0290,
        'S0291': extract_legos_s0291,
        'S0292': extract_legos_s0292,
        'S0293': extract_legos_s0293,
        'S0294': extract_legos_s0294,
        'S0295': extract_legos_s0295,
        'S0296': extract_legos_s0296,
        'S0297': extract_legos_s0297,
        'S0298': extract_legos_s0298,
        'S0299': extract_legos_s0299,
        'S0300': extract_legos_s0300,
    }

    # Process each seed
    output_seeds = []
    provisional_counter = 1

    for seed_data in batch_input['seeds']:
        seed_id = seed_data['seed_id']
        print(f"\nProcessing {seed_id}...")

        # Extract LEGOs for this seed
        legos_raw = extraction_functions[seed_id]()

        # Process each LEGO
        legos_output = []
        lego_counter = 1

        for lego_raw in legos_raw:
            target = lego_raw['target']
            known = lego_raw['known']
            lego_type = lego_raw['type']

            # Skip empty LEGOs (like personal "a" with no English equivalent)
            if not known:
                lego_counter += 1
                continue

            # Check registry
            registry_match = check_registry(target, known, registry_lookup)

            if registry_match:
                # LEGO exists in registry
                lego_entry = {
                    "id": registry_match['id'],
                    "type": lego_type,
                    "target": target,
                    "known": known,
                    "new": False,
                    "ref": registry_match['source_seed']
                }
                print(f"  Found in registry: {target} = {known} (from {registry_match['source_seed']})")
            else:
                # New LEGO
                lego_entry = {
                    "provisional_id": f"PROV_{seed_id}_{lego_counter:02d}",
                    "type": lego_type,
                    "target": target,
                    "known": known,
                    "new": True
                }

                # Add components for M-type LEGOs
                if lego_type == 'M':
                    lego_entry = add_components_to_m_legos(lego_entry)

                print(f"  New LEGO: {target} = {known}")
                provisional_counter += 1

            legos_output.append(lego_entry)
            lego_counter += 1

        # Add seed to output
        output_seeds.append({
            "seed_id": seed_id,
            "seed_pair": {
                "target": seed_data['target'],
                "known": seed_data['known']
            },
            "legos": legos_output
        })

    # Create output JSON
    output = {
        "batch_id": "batch1_agent5",
        "batch_number": 5,
        "seed_range": "S0281-S0300",
        "extractor": "Agent 5",
        "extracted_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "seeds": output_seeds
    }

    # Write output
    output_path = 'phase3_batch1_s0201_s0360/batch_output/batch_5_output.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Extraction complete!")
    print(f"✓ Output written to: {output_path}")
    print(f"✓ Total seeds processed: {len(output_seeds)}")

    # Statistics
    total_legos = sum(len(seed['legos']) for seed in output_seeds)
    new_legos = sum(1 for seed in output_seeds for lego in seed['legos'] if lego.get('new'))
    existing_legos = total_legos - new_legos

    print(f"✓ Total LEGOs extracted: {total_legos}")
    print(f"  - New LEGOs: {new_legos}")
    print(f"  - Existing LEGOs (from registry): {existing_legos}")

if __name__ == '__main__':
    main()
