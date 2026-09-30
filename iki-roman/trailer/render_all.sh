#!/bin/bash
# Renders all 9 trailer variants (16x9/9x16/1x1 x TR/EN/DE):
#   1. placeholder music (music_dark.py)  2. SRT subtitles (make_srt.py)
#   3. silent H.264 video per variant via capture2.js (two renders in parallel), muxed with the music by ffmpeg
#   4. storyboard stills for 16x9 TR and 9x16 TR at every scene mark   5. metadata report -> out/render_report.txt
# Env: JOBS (parallel renders, default 2), FORMATS, LANGS, FFMPEG (path), NODE (path).
set -euo pipefail
cd "$(dirname "$0")"
NODE=${NODE:-/opt/node22/bin/node}
FFMPEG=${FFMPEG:-$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())" 2>/dev/null || echo ffmpeg)}
export FFMPEG NODE
JOBS=${JOBS:-2}
FORMATS=${FORMATS:-"16x9 9x16 1x1"}
LANGS=${LANGS:-"tr en de"}
mkdir -p out/storyboard out/tmp
T0=$(date +%s)

echo "== 1/5 music (generated placeholder)"
[ -f music_60.wav ] || python3 music_dark.py --dur 60 --knocks 1.0,1.8,2.6,34.0,34.8,35.6 --impact 47.0 --end 53.0 --out music_60.wav
[ -f music_30.wav ] || python3 music_dark.py --dur 30 --knocks 0.7,1.3,1.9,17.0,17.6,18.2 --impact 23.0 --end 26.0 --out music_30.wav

echo "== 2/5 subtitles"
python3 make_srt.py

echo "== 3/5 videos ($JOBS in parallel)"
dur_of() { case $1 in 16x9) echo 60;; *) echo 30;; esac; }
render() {
  local fmt=$1 lang=$2 dur; dur=$(dur_of "$1")
  local name="Iki_Roman_Fragman_${fmt}_${dur}s_${2^^}"
  local silent="out/tmp/${name}_silent.mp4"
  local final="out/${name}.mp4"
  local t0; t0=$(date +%s)
  if $NODE capture2.js --page engine2.html --format "$fmt" --lang "$lang" --out "$silent" --fps 30 > "out/tmp/${name}.log" 2>&1 &&
     $FFMPEG -y -loglevel error -i "$silent" -i "music_${dur}.wav" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart "$final"; then
    rm -f "$silent"; echo "   ok   $final ($(( $(date +%s) - t0 )) s)"
  else
    echo "   FAIL $final (see out/tmp/${name}.log)"; return 1
  fi
}
running=0; failed=0
for fmt in $FORMATS; do for lang in $LANGS; do
  render "$fmt" "$lang" &
  running=$((running + 1))
  if [ "$running" -ge "$JOBS" ]; then wait -n || failed=$((failed + 1)); running=$((running - 1)); fi
done; done
while [ "$running" -gt 0 ]; do wait -n || failed=$((failed + 1)); running=$((running - 1)); done

echo "== 4/5 storyboard stills"
$NODE capture2.js --page engine2.html --format 16x9 --lang tr --stills 2,5,9,14,18,23,28,30,33,38,43,47,50,56 | grep -v '^still' || true
$NODE capture2.js --page engine2.html --format 9x16 --lang tr --stills 2,5,9,13,17,20,23,25,28 | grep -v '^still' || true

echo "== 5/5 report -> out/render_report.txt"
python3 - "$FFMPEG" <<'EOF' | tee out/render_report.txt
import glob, os, re, subprocess, sys, datetime
FF = sys.argv[1]
EXP = {'16x9': (1920, 1080, 60), '9x16': (1080, 1920, 30), '1x1': (1080, 1080, 30)}
print(f'İki Roman trailer render report  ({datetime.datetime.now():%Y-%m-%d %H:%M})  ffmpeg: {FF}')
print(f"{'file':44s} {'size':>8s}  {'res':>9s}  {'fps':>4s}  {'dur':>6s}  {'video':>5s}  {'audio':>17s}  check")
ok_all = True
for f in sorted(glob.glob('out/Iki_Roman_Fragman_*.mp4')):
    info = subprocess.run([FF, '-hide_banner', '-i', f], capture_output=True, text=True).stderr
    dur = re.search(r'Duration: (\d+):(\d+):([\d.]+)', info); dur = int(dur[1]) * 3600 + int(dur[2]) * 60 + float(dur[3]) if dur else -1
    v = re.search(r'Video: (\w+).*?, (\d+)x(\d+).*?, ([\d.]+) fps', info); a = re.search(r'Audio: (\w+).*?, (\d+) Hz.*?, (\d+) kb/s', info)
    fmt = re.search(r'Fragman_(\w+?)_\d+s', f)[1]; ew, eh, ed = EXP[fmt]
    checks = [v and v[1] == 'h264', v and (int(v[2]), int(v[3])) == (ew, eh), v and abs(float(v[4]) - 30) < .01, abs(dur - ed) <= .2, a and a[1] == 'aac']
    ok = all(bool(c) for c in checks); ok_all &= ok
    print(f"{os.path.basename(f):44s} {os.path.getsize(f)/1e6:6.1f}MB  {v[2]+'x'+v[3] if v else '?':>9s}  {v[4] if v else '?':>4s}  {dur:6.2f}  {v[1] if v else '?':>5s}  {(a[1]+' '+a[2]+'Hz '+a[3]+'k') if a else '?':>17s}  {'PASS' if ok else 'FAIL'}")
srt = sorted(glob.glob('out/*.srt')); print(f'\nSRT files: {len(srt)}  stills: {len(glob.glob("out/storyboard/*.jpg"))}')
print('ALL PASS' if ok_all else 'SOME CHECKS FAILED')
EOF
echo "total $(( $(date +%s) - T0 )) s, failed renders: $failed"
[ "$failed" -eq 0 ]
