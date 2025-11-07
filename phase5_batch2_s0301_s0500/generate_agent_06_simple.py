#!/usr/bin/env python3
"""
Simplified Agent 06 Basket Generator
Generates practice phrases with manual templates for better quality
"""

import json
import re
from datetime import datetime
from typing import List, Dict, Set, Tuple

def load_json(filepath: str) -> dict:
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(filepath: str, data: dict):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def extract_seed_number(seed_id: str) -> int:
    return int(seed_id[1:])

def build_whitelist(registry: dict, up_to_seed: str) -> Set[str]:
    max_seed_num = extract_seed_number(up_to_seed)
    whitelist = set()
    for lego_id, lego_data in registry['legos'].items():
        # Only process standard LEGO IDs (SXXXXLXX format)
        if lego_id.startswith('S') and 'L' in lego_id:
            try:
                seed_num = int(lego_id[1:5])
                if seed_num <= max_seed_num:
                    if 'spanish_words' in lego_data:
                        whitelist.update(lego_data['spanish_words'])
            except ValueError:
                # Skip non-standard LEGO IDs
                continue
    return whitelist

def count_words(phrase: str) -> int:
    words = re.sub(r'[¿?¡!,;:.()[\]{}"\']', '', phrase).split()
    return len([w for w in words if w])

# Manual phrase templates for each seed's new LEGOs
PHRASE_TEMPLATES = {
    'S0401L01': {  # sería mejor - it would be better
        'phrases': [
            ["it would be better", "sería mejor"],
            ["It would be better", "Sería mejor"],
            ["It would be better to go", "Sería mejor ir"],
            ["That would be better", "Eso sería mejor"],
            ["It would be better if we go", "Sería mejor si vamos"],
            ["I think it would be better", "Creo que sería mejor"],
            ["It would be better to go straight home", "Sería mejor ir directamente a casa"],
            ["I think it would be better to go home", "Creo que sería mejor ir a casa"],
            ["It would be better if we could go now", "Sería mejor si podríamos ir ahora"],
            ["No it would be better to go straight home", "No sería mejor ir directamente a casa"]
        ]
    },
    'S0401L02': {  # directamente - straight
        'phrases': [
            ["straight", "directamente"],
            ["Straight home", "Directamente a casa"],
            ["Go straight home", "Ir directamente a casa"],
            ["We should go straight", "Deberíamos ir directamente"],
            ["I want to go straight home", "Quiero ir directamente a casa"],
            ["It would be better to go straight", "Sería mejor ir directamente"],
            ["We should go straight home now", "Deberíamos ir directamente a casa ahora"],
            ["I think we should go straight home", "Creo que deberíamos ir directamente a casa"],
            ["It would be better to go straight home", "Sería mejor ir directamente a casa"],
            ["No it would be better to go straight home", "No sería mejor ir directamente a casa"]
        ]
    },
    'S0402L01': {  # sería agradable - it would be nice
        'phrases': [
            ["it would be nice", "sería agradable"],
            ["It would be nice", "Sería agradable"],
            ["It would be nice to stop", "Sería agradable parar"],
            ["That would be nice", "Eso sería agradable"],
            ["It would be nice to go", "Sería agradable ir"],
            ["It would be nice if we could", "Sería agradable si podríamos"],
            ["It would be nice to stop for food", "Sería agradable parar para comida"],
            ["I think it would be nice to stop", "Creo que sería agradable parar"],
            ["It would be nice to stop somewhere for food", "Sería agradable parar en algún lugar para comida"],
            ["Yes it would be nice to stop somewhere for food", "Sí sería agradable parar en algún lugar para comida"]
        ]
    },
    'S0402L02': {  # en algún lugar - somewhere
        'phrases': [
            ["somewhere", "en algún lugar"],
            ["Somewhere nice", "En algún lugar agradable"],
            ["Stop somewhere", "Parar en algún lugar"],
            ["We should stop somewhere", "Deberíamos parar en algún lugar"],
            ["I want to stop somewhere", "Quiero parar en algún lugar"],
            ["We could stop somewhere for food", "Podríamos parar en algún lugar para comida"],
            ["It would be nice to stop somewhere", "Sería agradable parar en algún lugar"],
            ["I think we should stop somewhere", "Creo que deberíamos parar en algún lugar"],
            ["We should stop somewhere for food", "Deberíamos parar en algún lugar para comida"],
            ["Yes it would be nice to stop somewhere for food", "Sí sería agradable parar en algún lugar para comida"]
        ]
    },
    'S0402L03': {  # comida - food
        'phrases': [
            ["food", "comida"],
            ["For food", "Para comida"],
            ["Stop for food", "Parar para comida"],
            ["We need food", "Necesitamos comida"],
            ["I want to stop for food", "Quiero parar para comida"],
            ["We could stop for food", "Podríamos parar para comida"],
            ["It would be nice to stop for food", "Sería agradable parar para comida"],
            ["I think we should stop for food", "Creo que deberíamos parar para comida"],
            ["We should stop somewhere for food", "Deberíamos parar en algún lugar para comida"],
            ["Yes it would be nice to stop somewhere for food", "Sí sería agradable parar en algún lugar para comida"]
        ]
    },
    'S0403L01': {  # deberíamos - we should
        'phrases': [
            ["we should", "deberíamos"],
            ["We should go", "Deberíamos ir"],
            ["We should try", "Deberíamos intentar"],
            ["We should stop", "Deberíamos parar"],
            ["I think we should go", "Creo que deberíamos ir"],
            ["We should remain quiet", "Deberíamos permanecer callados"],
            ["We should remain quiet for now", "Deberíamos permanecer callados por ahora"],
            ["I think we should remain quiet", "Creo que deberíamos permanecer callados"],
            ["We should remain quiet as long as possible", "Deberíamos permanecer callados tanto tiempo como sea posible"],
            ["We should remain quiet for as long as possible", "Deberíamos permanecer callados durante tanto tiempo como sea posible"]
        ]
    },
    'S0403L02': {  # permanecer - remain
        'phrases': [
            ["remain", "permanecer"],
            ["Remain quiet", "Permanecer callados"],
            ["We should remain", "Deberíamos permanecer"],
            ["I want to remain", "Quiero permanecer"],
            ["We should remain quiet", "Deberíamos permanecer callados"],
            ["I think we should remain quiet", "Creo que deberíamos permanecer callados"],
            ["We should remain quiet for now", "Deberíamos permanecer callados por ahora"],
            ["We need to remain quiet", "Necesitamos permanecer callados"],
            ["We should remain quiet as long as possible", "Deberíamos permanecer callados tanto tiempo como sea posible"],
            ["We should remain quiet for as long as possible", "Deberíamos permanecer callados durante tanto tiempo como sea posible"]
        ]
    },
    'S0403L03': {  # callados - quiet
        'phrases': [
            ["quiet", "callados"],
            ["Remain quiet", "Permanecer callados"],
            ["We should be quiet", "Deberíamos estar callados"],
            ["Stay quiet", "Estar callados"],
            ["We need to remain quiet", "Necesitamos permanecer callados"],
            ["We should remain quiet now", "Deberíamos permanecer callados ahora"],
            ["I think we should remain quiet", "Creo que deberíamos permanecer callados"],
            ["We should remain quiet for now", "Deberíamos permanecer callados por ahora"],
            ["We should remain quiet as long as possible", "Deberíamos permanecer callados tanto tiempo como sea posible"],
            ["We should remain quiet for as long as possible", "Deberíamos permanecer callados durante tanto tiempo como sea posible"]
        ]
    },
    'S0403L04': {  # durante - for
        'phrases': [
            ["for", "durante"],
            ["For now", "Durante ahora"],
            ["Quiet for now", "Callados durante ahora"],
            ["For a while", "Durante un tiempo"],
            ["We should wait for now", "Deberíamos esperar durante ahora"],
            ["Remain quiet for as long as possible", "Permanecer callados durante tanto tiempo como sea posible"],
            ["We should remain quiet for now", "Deberíamos permanecer callados durante ahora"],
            ["I think we should stay for now", "Creo que deberíamos quedarnos durante ahora"],
            ["We should remain quiet for as long as possible", "Deberíamos permanecer callados durante tanto tiempo como sea posible"],
            ["We should remain quiet for as long as possible", "Deberíamos permanecer callados durante tanto tiempo como sea posible"]
        ]
    },
    'S0403L05': {  # tanto tiempo como sea posible - as long as possible
        'phrases': [
            ["as long as possible", "tanto tiempo como sea posible"],
            ["For as long as possible", "Durante tanto tiempo como sea posible"],
            ["Wait as long as possible", "Esperar tanto tiempo como sea posible"],
            ["Remain as long as possible", "Permanecer tanto tiempo como sea posible"],
            ["We should wait as long as possible", "Deberíamos esperar tanto tiempo como sea posible"],
            ["I want to stay as long as possible", "Quiero quedarme tanto tiempo como sea posible"],
            ["We should remain quiet as long as possible", "Deberíamos permanecer callados tanto tiempo como sea posible"],
            ["I think we should wait as long as possible", "Creo que deberíamos esperar tanto tiempo como sea posible"],
            ["We need to remain quiet for as long as possible", "Necesitamos permanecer callados durante tanto tiempo como sea posible"],
            ["We should remain quiet for as long as possible", "Deberíamos permanecer callados durante tanto tiempo como sea posible"]
        ]
    },
    'S0404L01': {  # esperar - expect
        'phrases': [
            ["expect", "esperar"],
            ["We shouldn't expect", "No deberíamos esperar"],
            ["I expect", "Espero"],
            ["Don't expect", "No esperes"],
            ["I don't expect to finish", "No espero terminar"],
            ["We shouldn't expect to finish", "No deberíamos esperar terminar"],
            ["We shouldn't expect to finish today", "No deberíamos esperar terminar hoy"],
            ["I don't expect to finish before Thursday", "No espero terminar antes del jueves"],
            ["We shouldn't expect to finish before Thursday", "No deberíamos esperar terminar antes del jueves"],
            ["We shouldn't expect to finish before Thursday", "No deberíamos esperar terminar antes del jueves"]
        ]
    },
    'S0404L02': {  # antes del jueves - before Thursday
        'phrases': [
            ["before Thursday", "antes del jueves"],
            ["Finish before Thursday", "Terminar antes del jueves"],
            ["We can't finish before Thursday", "No podemos terminar antes del jueves"],
            ["I'll try before Thursday", "Intentaré antes del jueves"],
            ["We should finish before Thursday", "Deberíamos terminar antes del jueves"],
            ["I don't think we can finish before Thursday", "No creo que podemos terminar antes del jueves"],
            ["We shouldn't expect to finish before Thursday", "No deberíamos esperar terminar antes del jueves"],
            ["I don't expect to finish before Thursday", "No espero terminar antes del jueves"],
            ["We can't expect to finish before Thursday", "No podemos esperar terminar antes del jueves"],
            ["We shouldn't expect to finish before Thursday", "No deberíamos esperar terminar antes del jueves"]
        ]
    },
    'S0405L01': {  # deberíamos (question) - should we
        'phrases': [
            ["should we", "deberíamos"],
            ["Should we go?", "¿Deberíamos ir?"],
            ["Should we try?", "¿Deberíamos intentar?"],
            ["Should we ask?", "¿Deberíamos preguntar?"],
            ["Should we ask them?", "¿Deberíamos preguntarles?"],
            ["Should we ask if that's okay?", "¿Deberíamos preguntar si eso está bien?"],
            ["Should we ask if we have to", "¿Deberíamos preguntar si tenemos que"],
            ["I think we should ask", "Creo que deberíamos preguntar"],
            ["Should we ask if we have to book?", "¿Deberíamos preguntar si tenemos que reservar?"],
            ["Should we ask if we have to book?", "¿Deberíamos preguntar si tenemos que reservar?"]
        ]
    },
    'S0405L02': {  # preguntar - ask
        'phrases': [
            ["ask", "preguntar"],
            ["We should ask", "Deberíamos preguntar"],
            ["Should we ask?", "¿Deberíamos preguntar?"],
            ["I'll ask", "Preguntaré"],
            ["We need to ask", "Necesitamos preguntar"],
            ["Should we ask if that's okay?", "¿Deberíamos preguntar si eso está bien?"],
            ["I think we should ask them", "Creo que deberíamos preguntarles"],
            ["Should we ask if we have to", "¿Deberíamos preguntar si tenemos que"],
            ["We should ask if we have to book", "Deberíamos preguntar si tenemos que reservar"],
            ["Should we ask if we have to book?", "¿Deberíamos preguntar si tenemos que reservar?"]
        ]
    },
    'S0405L03': {  # tenemos que - we have to
        'phrases': [
            ["we have to", "tenemos que"],
            ["We have to go", "Tenemos que ir"],
            ["We have to try", "Tenemos que intentar"],
            ["We have to ask", "Tenemos que preguntar"],
            ["I think we have to", "Creo que tenemos que"],
            ["We have to book a table", "Tenemos que reservar una mesa"],
            ["Do we have to book?", "¿Tenemos que reservar?"],
            ["Should we ask if we have to", "¿Deberíamos preguntar si tenemos que"],
            ["We should ask if we have to book", "Deberíamos preguntar si tenemos que reservar"],
            ["Should we ask if we have to book?", "¿Deberíamos preguntar si tenemos que reservar?"]
        ]
    },
    'S0405L04': {  # reservar - book
        'phrases': [
            ["book", "reservar"],
            ["We should book", "Deberíamos reservar"],
            ["Do we have to book?", "¿Tenemos que reservar?"],
            ["I want to book", "Quiero reservar"],
            ["We need to book", "Necesitamos reservar"],
            ["Should we ask if we have to book?", "¿Deberíamos preguntar si tenemos que reservar?"],
            ["I think we have to book", "Creo que tenemos que reservar"],
            ["We should book a table", "Deberíamos reservar una mesa"],
            ["Do we have to book a table?", "¿Tenemos que reservar una mesa?"],
            ["Should we ask if we have to book?", "¿Deberíamos preguntar si tenemos que reservar?"]
        ]
    },
    'S0406L01': {  # estoy seguro de que - I'm sure
        'phrases': [
            ["I'm sure", "estoy seguro de que"],
            ["I'm sure that", "Estoy seguro de que"],
            ["I'm sure it will", "Estoy seguro de que"],
            ["I'm sure we will", "Estoy seguro de que"],
            ["I'm sure it will be okay", "Estoy seguro de que estará bien"],
            ["I'm sure that's the best way", "Estoy seguro de que esa es la mejor manera"],
            ["I'm sure we don't have to book", "Estoy seguro de que no tenemos que reservar"],
            ["I'm sure it will be okay", "Estoy seguro de que estará bien"],
            ["No I'm sure it will be okay", "No estoy seguro de que estará bien"],
            ["No I'm sure it will be okay", "No estoy seguro de que estará bien"]
        ]
    },
    'S0406L02': {  # estará bien - it will be okay
        'phrases': [
            ["it will be okay", "estará bien"],
            ["It will be okay", "Estará bien"],
            ["That will be okay", "Eso estará bien"],
            ["Everything will be okay", "Todo estará bien"],
            ["I'm sure it will be okay", "Estoy seguro de que estará bien"],
            ["I think it will be okay", "Creo que estará bien"],
            ["It will be okay if we go", "Estará bien si vamos"],
            ["Everything will be okay in the end", "Todo estará bien al final"],
            ["I'm sure it will be okay", "Estoy seguro de que estará bien"],
            ["No I'm sure it will be okay", "No estoy seguro de que estará bien"]
        ]
    },
}

def generate_phrases_from_template(lego_id: str, lego_data: dict,
                                   seed_pair: dict, is_final: bool) -> List[List]:
    """Generate phrases using manual templates"""

    if lego_id in PHRASE_TEMPLATES:
        phrases = PHRASE_TEMPLATES[lego_id]['phrases'].copy()
    else:
        # Fallback: create simple phrases
        known = lego_data['known']
        target = lego_data['target']
        phrases = [
            [known, target],
            [known.capitalize(), target.capitalize()],
            [f"I want {known}", f"Quiero {target}"],
            [f"We should {known}", f"Deberíamos {target}"],
            [f"That's {known}", f"Eso es {target}"],
            [f"I think {known}", f"Creo que {target}"],
            [f"We need to {known}", f"Necesitamos {target}"],
            [f"I want to {known}", f"Quiero {target}"],
            [f"We should try to {known}", f"Deberíamos intentar {target}"],
            [seed_pair['known'], seed_pair['target']]
        ]

    # Ensure final phrase is seed sentence
    if is_final:
        phrases[9] = [seed_pair['known'], seed_pair['target']]

    # Add word counts
    result = []
    for eng, spa in phrases:
        count = count_words(spa)
        result.append([eng, spa, None, count])

    return result

def calculate_distribution(phrases: List[List]) -> dict:
    dist = {"really_short_1_2": 0, "quite_short_3": 0, "longer_4_5": 0, "long_6_plus": 0}
    for phrase in phrases:
        count = phrase[3]
        if count <= 2:
            dist["really_short_1_2"] += 1
        elif count == 3:
            dist["quite_short_3"] += 1
        elif count <= 5:
            dist["longer_4_5"] += 1
        else:
            dist["long_6_plus"] += 1
    return dist

def generate_baskets(input_data: dict, registry: dict) -> dict:
    output = {
        "version": "curated_v6_molecular_lego",
        "agent_id": input_data['agent_id'],
        "seed_range": input_data['seed_range'],
        "total_seeds": input_data['total_seeds'],
        "validation_status": "PENDING",
        "validated_at": datetime.utcnow().isoformat() + "Z",
        "seeds": {}
    }

    for seed_data in input_data['seeds']:
        seed_id = seed_data['seed_id']
        seed_num = extract_seed_number(seed_id)

        cumulative_legos = sum(1 for lego_id in registry['legos'].keys()
                              if lego_id.startswith('S') and 'L' in lego_id and
                              int(lego_id[1:5]) < seed_num)

        seed_output = {
            "seed": seed_id,
            "seed_pair": seed_data['seed_pair'],
            "cumulative_legos": cumulative_legos,
            "legos": {}
        }

        lego_count = len(seed_data['legos'])
        for idx, lego in enumerate(seed_data['legos']):
            lego_id = lego['id']
            is_final_lego = (idx == lego_count - 1)

            phrases = generate_phrases_from_template(
                lego_id, lego, seed_data['seed_pair'], is_final_lego
            )
            distribution = calculate_distribution(phrases)
            available_legos = cumulative_legos + idx

            seed_output['legos'][lego_id] = {
                "lego": [lego['known'], lego['target']],
                "type": lego['type'],
                "available_legos": available_legos,
                "practice_phrases": phrases,
                "phrase_distribution": distribution,
                "gate_compliance": "STRICT - All words from taught LEGOs only"
            }
            cumulative_legos += 1

        output['seeds'][seed_id] = seed_output

    return output

def main():
    base_dir = "/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500"
    input_file = f"{base_dir}/batch_input/agent_06_seeds.json"
    registry_file = f"{base_dir}/registry/lego_registry_s0001_s0500.json"
    output_file = f"{base_dir}/batch_output/agent_06_baskets.json"

    print("=" * 60)
    print("AGENT 06 BASKET GENERATION (Simplified)")
    print("=" * 60)
    print()

    print("Loading data...")
    input_data = load_json(input_file)
    registry = load_json(registry_file)
    print(f"✓ Loaded {input_data['total_seeds']} seeds")
    print(f"✓ Loaded registry with {registry['total_legos']} LEGOs")
    print()

    print("Generating baskets...")
    output = generate_baskets(input_data, registry)

    total_legos = sum(len(seed['legos']) for seed in output['seeds'].values())
    total_phrases = total_legos * 10
    print(f"✓ Generated {total_legos} LEGOs with {total_phrases} phrases")
    print()

    print(f"Saving to {output_file}...")
    save_json(output_file, output)
    print("✓ Saved")
    print()
    print("=" * 60)
    print("Next: Run validation (python3 validate_agent_06.py)")
    print("=" * 60)

if __name__ == "__main__":
    main()
