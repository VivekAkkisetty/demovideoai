#!/usr/bin/env bash
# frames/f%05d.jpg + build/mix.wav -> out/bill-law-ela-avtundi.mp4 (H.264 1080x1920 30fps, AAC)
set -euo pipefail
cd "$(dirname "$0")/.."
ffmpeg -y -v error -framerate 30 -i frames/f%05d.jpg -i build/mix.wav \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -c:a aac -b:a 192k -ar 44100 -shortest -t 45 out/bill-law-ela-avtundi.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of default=nw=1 out/bill-law-ela-avtundi.mp4
