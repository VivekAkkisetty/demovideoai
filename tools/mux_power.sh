#!/usr/bin/env bash
# frames_power/f%05d.jpg + build/power/mix.wav -> out/switch-on-light-ela-vastundi.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
ffmpeg -y -v error -framerate 30 -i frames_power/f%05d.jpg -i build/power/mix.wav \
  -c:v libx264 -preset medium -crf 21 -maxrate 14M -bufsize 28M -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -c:a aac -b:a 192k -ar 44100 -shortest -t 45 out/switch-on-light-ela-vastundi.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of default=nw=1 out/switch-on-light-ela-vastundi.mp4
