#!/bin/sh
# First Light — one command: fonts → events → picture → score + sound → master.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
sh "$HERE/fetch_fonts.sh"
cd "$LIB"
node core/render/events.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers ${WORKERS:-4} --out "$HERE/out/video.mp4"
PYTHONUTF8=1 "$LIB/.venv/bin/python" "$HERE/mix.py"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/../p5-brush.mp4" 24 1
