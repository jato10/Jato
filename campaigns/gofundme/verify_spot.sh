#!/usr/bin/env bash
# Verifica el spot montado sin necesidad de verlo: formato, presencia y ausencia
# de texto en pantalla, y transcripcion del audio.
set -euo pipefail
IN=${1:-spot_v3.mp4}

echo "=== FORMATO ==="
ffprobe -v error -show_entries format=duration \
  -show_entries stream=width,height,codec_name,r_frame_rate \
  -of default=noprint_wrappers=1 "$IN"

echo "=== TEXTO EN PANTALLA (pixeles claros en la franja y=740..980) ==="
# Debe haber texto a los 5 s y 11 s, y CERO a los 2 s y 8 s.
python3 - "$IN" <<'PY'
import subprocess, io, sys
import numpy as np
from PIL import Image
src = sys.argv[1]
for t in [2.0, 5.0, 8.0, 11.0, 13.5]:
    p = subprocess.run(
        ['ffmpeg','-nostdin','-v','error','-ss',str(t),'-i',src,
         '-frames:v','1','-f','image2pipe','-vcodec','png','-'],
        capture_output=True)
    a = np.asarray(Image.open(io.BytesIO(p.stdout)).convert('L'), dtype=float)[740:980, :]
    print(f'  t={t:5.1f}s  pixeles>225: {int((a > 225).sum()):6d}')
PY

echo "=== TRANSCRIPCION DEL AUDIO ==="
ffmpeg -nostdin -v error -i "$IN" -vn -ac 1 -ar 16000 fin.wav -y
python3 - <<'PY' 2>/dev/null
from faster_whisper import WhisperModel
m = WhisperModel('medium', device='cpu', compute_type='int8')
segs, _ = m.transcribe('fin.wav', language='es')
for s in segs:
    print(f'  [{s.start:5.2f}-{s.end:5.2f}] {s.text.strip()}')
PY

echo "=== CORTES DE ESCENA ==="
# Con disolvencias de 0.25 s el detector no marca nada: es lo esperado.
# Un corte duro si apareceria aqui.
ffmpeg -nostdin -v error -i "$IN" -filter:v "select='gt(scene,0.15)',showinfo" \
  -f null - 2>&1 | grep -o 'pts_time:[0-9.]*' | sed 's/pts_time:/  corte /' || echo "  (ninguno)"
