#!/bin/sh
# The demo's two OFL fonts are not in git (see CREDITS): fetch them from github.com/google/fonts.
set -e
cd "$(dirname "$0")/fonts"
get() { [ -s "$2" ] || curl -sSL --fail -o "$2" "https://github.com/google/fonts/raw/main/$1"; }
get 'ofl/caveat/Caveat%5Bwght%5D.ttf' 'Caveat[wght].ttf'
get 'ofl/cormorantgaramond/CormorantGaramond-Italic%5Bwght%5D.ttf' 'CormorantGaramond-Italic[wght].ttf'
echo "fonts ok"
