#!/usr/bin/env bash
# Monta el spot de 15 s de Global Beyond LLC a partir de 4 clips mudos,
# 4 lineas de voz TTS y el PNG del logo.
#
# Se ejecuta en el sandbox de Higgsfield (sandbox_exec), que trae ffmpeg,
# python3 con Pillow y la fuente Montserrat ya instalada.
#
#   bash build_spot.sh            -> spot_v3.mp4
set -euo pipefail

# --- Fuentes -----------------------------------------------------------------
GEN=https://d8j0ntlcm91z4.cloudfront.net/user_3HQsgJxBtOtHQXVeuJzDVi67aEw
MEDIA=https://d2ol7oe51mr4n9.cloudfront.net/user_3HQsgJxBtOtHQXVeuJzDVi67aEw

CLIP1=$GEN/hf_20260828_175807_fd966a41-5b36-4d0f-b345-45745b5a5cd4.mp4  # Javier medio, 3 s
CLIP2=$GEN/hf_20260828_175807_f3c789fa-947d-4eb0-833d-d8eea8d3bd3a.mp4  # Yudenis medio, 4 s
CLIP3=$GEN/hf_20260828_175807_51743f90-a9f8-4403-9d21-ae4479758bb2.mp4  # Javier cerca, 3 s
CLIP4=$GEN/hf_20260828_175807_002bc1a2-8c0e-4ec4-b2c9-e6855a586102.mp4  # Yudenis cerca, 3 s
LOGO=$MEDIA/ae643bd4-a4fc-43d8-95b7-719acfe9e182.png

VOZ1=$GEN/hf_20260828_175845_4683ce44-dbc4-4af0-ace2-93ab1aef594e.wav  # "Somos Javier y Yudenis, de Global Beyond."
VOZ2=$GEN/hf_20260828_175845_7280407f-5c7e-4e3d-b90a-1615ba7378ec.wav  # "Buscamos cincuenta y dos mil dolares."
VOZ3=$GEN/hf_20260828_174921_d9fe3dd6-da82-4e16-8e50-54a0a0a47198.wav  # "Cada dolar se reporta."
VOZ4=$GEN/hf_20260828_175845_acb9adac-f71f-45ed-b49d-a0fc2af65ca1.wav  # "Dona o comparte. Gracias."

FONT=/usr/share/fonts/truetype/higgsfield/Montserrat-ExtraBold.ttf
OUT=${1:-spot_v3.mp4}

# --- Descarga ----------------------------------------------------------------
curl -sS -f -o c1.mp4 "$CLIP1"; curl -sS -f -o c2.mp4 "$CLIP2"
curl -sS -f -o c3.mp4 "$CLIP3"; curl -sS -f -o c4.mp4 "$CLIP4"
curl -sS -f -o logo.png "$LOGO"
curl -sS -f -o v1.wav "$VOZ1"; curl -sS -f -o v2.wav "$VOZ2"
curl -sS -f -o v3.wav "$VOZ3"; curl -sS -f -o v4.wav "$VOZ4"

# --- Recorta el silencio de cada linea de voz --------------------------------
# El TTS deja cabeza y cola de silencio; sin quitarlas la voz no cae donde toca.
TRIM="silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,\
silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,\
afade=t=in:st=0:d=0.05"
for i in 1 2 3 4; do
  ffmpeg -nostdin -v error -i "v$i.wav" -af "$TRIM" "t$i.wav" -y
done

# --- Textos en pantalla ------------------------------------------------------
# Van en archivo, no inline: evita escapar '$' y las comas de "$52,000".
printf '$52,000'                                            > t_amount.txt
printf 'INVENTARIO  \xc2\xb7  LOG\xc3\x8dSTICA  \xc2\xb7  PUBLICIDAD' > t_use.txt
printf 'DONA O COMPARTE EL ENLACE'                          > t_cta.txt

# Rampas de opacidad: 0.3 s de entrada, 0.3 s de salida.
fade_alpha() { # $1=entra $2=sale
  local a=$1 b=$2
  echo "if(lt(t,$a),0,if(lt(t,$a+0.30),(t-$a)/0.30,if(lt(t,$b-0.30),1,if(lt(t,$b),($b-t)/0.30,0))))"
}
FA=$(fade_alpha 3.30 6.60)   # $52,000
FB=$(fade_alpha 3.60 6.60)   # desglose (entra 0.3 s despues, escalonado)
FC=$(fade_alpha 9.80 12.10)  # llamada a la accion

# --- Montaje -----------------------------------------------------------------
# Linea de tiempo (disolvencias de 0.25 s, cada corte solapa el anterior):
#   0.00-3.00  Javier medio      voz 1 en 0.10
#   2.75-6.75  Yudenis medio     voz 2 en 3.10   + $52,000 y desglose
#   6.50-9.50  Javier cerca      voz 3 en 6.80
#   9.25-12.25 Yudenis cerca     voz 4 en 9.60   + llamada a la accion
#  12.00-15.00 Tarjeta de logo   sin voz, zoom lento, fundido a negro
# Offset de cada xfade = duracion acumulada - 0.25.
ffmpeg -nostdin -v error -stats \
  -t 3 -i c1.mp4  -t 4 -i c2.mp4  -t 3 -i c3.mp4  -t 3 -i c4.mp4 \
  -loop 1 -t 3 -i logo.png \
  -i t1.wav -i t2.wav -i t3.wav -i t4.wav \
  -filter_complex "\
[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=24,setsar=1,format=yuv420p[v0];\
[1:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=24,setsar=1,format=yuv420p[v1];\
[2:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=24,setsar=1,format=yuv420p[v2];\
[3:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=24,setsar=1,format=yuv420p[v3];\
[4:v]scale=1920:-2,crop=1920:1080,fps=24,setsar=1,\
zoompan=z='min(1.06,1+0.02*on/24)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=24,\
format=yuv420p[v4];\
[v0][v1]xfade=transition=fade:duration=0.25:offset=2.75[x1];\
[x1][v2]xfade=transition=fade:duration=0.25:offset=6.50[x2];\
[x2][v3]xfade=transition=fade:duration=0.25:offset=9.25[x3];\
[x3][v4]xfade=transition=fade:duration=0.25:offset=12.00[x4];\
[x4]drawtext=fontfile='$FONT':textfile=t_amount.txt:fontcolor=0xE8ECEF:fontsize=132:\
x=(w-tw)/2:y=760:shadowcolor=0x000000AA:shadowx=3:shadowy=3:alpha='$FA',\
drawtext=fontfile='$FONT':textfile=t_use.txt:fontcolor=0xC3CBD2:fontsize=38:\
x=(w-tw)/2:y=920:shadowcolor=0x000000AA:shadowx=2:shadowy=2:alpha='$FB',\
drawtext=fontfile='$FONT':textfile=t_cta.txt:fontcolor=0xE8ECEF:fontsize=64:\
x=(w-tw)/2:y=860:shadowcolor=0x000000AA:shadowx=3:shadowy=3:alpha='$FC',\
fade=t=out:st=14.55:d=0.45[vout];\
[5:a]adelay=100:all=1[a1];[6:a]adelay=3100:all=1[a2];\
[7:a]adelay=6800:all=1[a3];[8:a]adelay=9600:all=1[a4];\
[a1][a2][a3][a4]amix=inputs=4:duration=longest:normalize=0,\
loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=0:15,afade=t=out:st=14.6:d=0.4[aout]" \
  -map "[vout]" -map "[aout]" -t 15 -r 24 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart \
  "$OUT" -y

ffprobe -v error -show_entries format=duration \
  -show_entries stream=width,height,codec_name,r_frame_rate \
  -of default=noprint_wrappers=1 "$OUT"
