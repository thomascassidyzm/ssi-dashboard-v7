#!/usr/bin/env python3
"""cs #699·AI — D2: flag eng_for_jpn practice rows whose JAPANESE prompt does not say what the ENGLISH answer says.
Reads a Popty course dump (run.cjs read → $CS_SCRATCH/live/eng_for_jpn.json; no DB), sends 60 pairs per `claude --print
--model haiku` call (Claude CLI, never the SDK), 8 in parallel, and writes every flag to d2/flags.jsonl. High recall on purpose:
every flag is then judged by hand. Usage: classify.py <dump.json> <out.jsonl> [--from-seed N]"""
import json, os, subprocess, sys, concurrent.futures as cf
dump, out = sys.argv[1], sys.argv[2]
d = json.load(open(dump))
rows = [p for p in d['phrases'] if p['phrase_role'] in ('build', 'use')]
done = set()
if os.path.exists(out):
    for l in open(out):
        try: done.add(json.loads(l)['batch'])
        except Exception: pass
PROMPT = """You check an English course for Japanese speakers. Each line is: ID | JAPANESE PROMPT | ENGLISH ANSWER.
The learner hears the Japanese and must say the English. Flag a line ONLY if a Japanese speaker hearing the prompt could
NOT know what English to say, i.e. the Japanese:
 - says something different (different verb, person, tense meaning, extra or missing clause, different object/time word), or
 - is only a fragment/LEGO of a longer English sentence, or
 - is garbled (words dumped in English order with commas or a dash, unnatural tacked-on pieces), or
 - is a statement where the English is a question (or a question where the English is a statement).
Do NOT flag: articles/plurals, dropped pronouns (Japanese omits I/you), politeness level, natural loose wording that still
clearly means the same, small natural paraphrase. Answer ONLY with JSON lines, one per flagged line:
{"id":"<ID>","why":"<6-12 words>"}
If nothing is wrong, answer exactly: NONE
"""
batches = [rows[i:i+60] for i in range(0, len(rows), 60)]
env = {k: v for k, v in os.environ.items() if k != 'CLAUDECODE'}
def run(i):
    if i in done: return i, None
    text = PROMPT + '\n' + '\n'.join(f"{p['id'].split(':')[1]} | {p['known_text']} | {p['target_text']}" for p in batches[i])
    try:
        r = subprocess.run(['/home/tomcassidy/.local/bin/claude', '--print', '--model', 'haiku'], input=text, capture_output=True, text=True, timeout=300, env=env)
        return i, r.stdout
    except Exception as e:
        return i, 'ERROR ' + str(e)
with cf.ThreadPoolExecutor(8) as ex, open(out, 'a') as f:
    for i, res in ex.map(run, range(len(batches))):
        if res is None: continue
        flags = []
        for l in res.splitlines():
            l = l.strip()
            if l.startswith('{'):
                try: flags.append(json.loads(l))
                except Exception: pass
        f.write(json.dumps({'batch': i, 'flags': flags, 'raw_err': res[:200] if res.startswith('ERROR') else None}, ensure_ascii=False) + '\n'); f.flush()
        print(i, len(flags), flush=True)
