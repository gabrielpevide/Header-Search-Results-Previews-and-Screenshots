#!/bin/zsh
# Check rendered PNGs before upload: exact size, no alpha, RGB.
# usage: check.sh WIDTHxHEIGHT file.png [file.png ...]
# Exit code 1 if any file fails.
set -u
want=$1; shift
w=${want%x*}; h=${want#*x}
fail=0
for f in "$@"; do
  info=$(sips -g pixelWidth -g pixelHeight -g hasAlpha -g space "$f" 2>/dev/null)
  pw=$(echo "$info" | awk '/pixelWidth/{print $2}')
  ph=$(echo "$info" | awk '/pixelHeight/{print $2}')
  alpha=$(echo "$info" | awk '/hasAlpha/{print $2}')
  space=$(echo "$info" | awk '/space/{print $2}')
  problems=()
  [[ "$pw" == "$w" && "$ph" == "$h" ]] || problems+=("size ${pw}x${ph}, want ${w}x${h}")
  [[ "$alpha" == "no" ]] || problems+=("has alpha")
  [[ "$space" == "RGB" ]] || problems+=("color space $space")
  if (( ${#problems} )); then
    echo "FAIL $f: ${(j:; :)problems}"; fail=1
  else
    echo "ok   $f (${pw}x${ph}, RGB, no alpha)"
  fi
done
exit $fail
