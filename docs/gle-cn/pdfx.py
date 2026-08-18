#!/usr/bin/env python3
# Minimal PDF text extractor: no PDF libraries in this sandbox.
# Walks FlateDecode streams, pulls text-showing operators, maps common
# ToUnicode-free encodings by keeping printable bytes plus Latin-1 fadas.
import re, sys, zlib

data = open(sys.argv[1], 'rb').read()
out = []
# every stream object
for m in re.finditer(rb'stream\r?\n', data):
    start = m.end()
    end = data.find(b'endstream', start)
    if end < 0:
        continue
    raw = data[start:end]
    try:
        s = zlib.decompress(raw)
    except Exception:
        continue
    if b'Tj' not in s and b'TJ' not in s:
        continue
    # text-showing operators: (...)Tj  and  [(..) n (..)]TJ
    buf = []
    for tm in re.finditer(rb'\((?:\\.|[^\\()])*\)', s):
        lit = tm.group(0)[1:-1]
        lit = lit.replace(b'\\(', b'(').replace(b'\\)', b')').replace(b'\\\\', b'\\')
        lit = re.sub(rb'\\([0-7]{1,3})', lambda x: bytes([int(x.group(1), 8) & 0xFF]), lit)
        buf.append(lit)
    if buf:
        out.append(b''.join(buf))

txt = b'\n'.join(out).decode('latin-1')
txt = re.sub(r'[ \t]+', ' ', txt)
sys.stdout.write(txt)
