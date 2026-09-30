#!/usr/bin/env python3
"""Writes SRT subtitle files (the on-screen lines with their times) for every trailer variant.

The texts and timings come from config/<lang>.js (the same files engine2.html uses), loaded through Node.
Output: out/Iki_Roman_Fragman_<format>_<dur>s_<LANG>.srt   (16x9 -> 60 s cut, 9x16 and 1x1 -> 30 s cut)

Usage: python3 make_srt.py [--out out] [--formats 16x9,9x16,1x1] [--langs tr,en,de]
"""
import argparse
import json
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = os.environ.get('NODE', '/opt/node22/bin/node')
FORMATS = {'16x9': '60', '9x16': '30', '1x1': '30'}


def load_cfg(lang):
    js = f"console.log(JSON.stringify(require({json.dumps(os.path.join(HERE, 'config', lang + '.js'))})))"
    return json.loads(subprocess.check_output([NODE, '-e', js]))


def ts(s):
    ms = int(round(s * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); sec, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{sec:02d},{ms:03d}'


def cues(cfg, cut):
    """[(start, end, text)] in on-screen order."""
    T, C = cfg['text'], cfg['cuts'][cut]
    dur = C['dur']
    out = []
    q = C['question']; out.append((q[0], q[1], T['question']))
    for key in ('by', 'sa'):
        blk, lines, items = C[key], T[key]['lines'], C[key]['lines']
        for i, (idx, a, b) in enumerate(items):
            # stacked lines stay on screen together; the cue for a line runs until the next one appears
            end = b if blk['mode'] == 'replace' or i == len(items) - 1 else min(b, items[i + 1][1])
            out.append((a, end, lines[idx]))
        tt, tc = blk['title'], T[key]
        card = tc['title'] + ('\n' + tc['subtitle'] if tc['subtitle'] else '') + '\n' + tc['author']
        out.append((tt[0], tt[1], card))
    for idx, a, b in C['shared']['lines']:
        out.append((a, b, T['shared']['lines'][idx]))
    F = C['fist']; tg, cl = F['tagline'], F['claim']
    out.append((tg[0], cl[0], T['tagline']))
    out.append((cl[0], cl[1], T['tagline'] + '\n' + T['claim']))
    E = C['end']
    out.append((E['cta'], min(dur, E['fadeOut'] + 0.6), T['cta'] + '  ·  ' + T['handle']))
    return [(a, b, s) for a, b, s in out if b > a]


def write_srt(path, cs):
    with open(path, 'w', encoding='utf-8') as f:
        for n, (a, b, text) in enumerate(cs, 1):
            f.write(f'{n}\n{ts(a)} --> {ts(b)}\n{text}\n\n')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', default=os.path.join(HERE, 'out'))
    ap.add_argument('--formats', default=','.join(FORMATS))
    ap.add_argument('--langs', default='tr,en,de')
    A = ap.parse_args()
    os.makedirs(A.out, exist_ok=True)
    for lang in A.langs.split(','):
        cfg = load_cfg(lang)
        for fmt in A.formats.split(','):
            cut = FORMATS[fmt]
            path = os.path.join(A.out, f'Iki_Roman_Fragman_{fmt}_{cut}s_{lang.upper()}.srt')
            cs = cues(cfg, cut); write_srt(path, cs)
            print(f'{os.path.relpath(path, HERE)}: {len(cs)} cues')
