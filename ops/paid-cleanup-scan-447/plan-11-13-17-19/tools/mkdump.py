#!/usr/bin/env python3
"""Builds the planning dump for plan.py/validate.py/gen.py FROM THE NIGHTLY COPY ONLY (cs #931·AI; it used to overlay
a live per-seed read). ../copy-read.cjs dump -> $CS_SCRATCH/dumps/<course>.json (source "qa-copy"), and
../copy-read.cjs snap -> $CS_SCRATCH/snap/<course>.json for snap.py. No live read of any kind.
usage: python3 -I mkdump.py <course>"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(os.path.dirname(HERE)))
import copykit
course = sys.argv[1]
S = os.environ['CS_SCRATCH']
os.makedirs(f'{S}/dumps', exist_ok=True); os.makedirs(f'{S}/snap', exist_ok=True)
copykit.copy_read('dump', course, f'{S}/dumps/{course}.json')
copykit.copy_read('snap', course, f'{S}/snap/{course}.json')
