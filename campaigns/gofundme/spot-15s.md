# Global Beyond LLC — Spot GoFundMe 15s

Campaña: recaudación GoFundMe · $52,000
Empresa: Global Beyond LLC (e-commerce, Miami)
Cofundadores en cámara: Javier y Yudenis
Entrega: MP4 16:9, 1920x1080, 24 fps, 15.000 s, audio en español

## Arquitectura final (v3)

La v1 y la v2 se generaron como un solo render de 15 s con audio nativo de
Kling. Falló por dos razones medidas:

1. **Sin cortes.** Detección de escena en ffmpeg dio cero cortes incluso con
   umbral 0.04: Kling entregó una sola toma continua, ignorando los 5 planos.
2. **Diálogo inventado.** Whisper transcribió "Global Biondoles", "compadre en
   Lach", y se comió "se reporta" y "Gracias". Kling genera el audio por su
   cuenta; no lee el guion literalmente.

Causa raíz de fondo: el guion original mide **18.9 s de habla a ritmo natural**
y solo había ~12 s de ventana. El modelo atropelló el texto para que entrara.

La v3 separa las responsabilidades:

- **4 clips mudos** (`kling3_0`, `mode: pro`, `sound: off`) — 1.75 créditos/s
  frente a 2.5 con audio, y el audio generado no servía de todos modos.
- **Fotogramas iniciales recortados de la foto de referencia** con Pillow, para
  que los primeros planos conserven los rostros reales sin generar caras nuevas.
- **Voz por TTS** (`seed_audio`, 0.1 créditos/línea) — control exacto del texto.
- **Montaje en ffmpeg**: disolvencias de 0.25 s, tipografía real (Montserrat
  ExtraBold), tarjeta de logo desde el PNG original, loudnorm a -16 LUFS.

## Planos

| Tiempo | Plano | Fotograma inicial | Voz |
|---|---|---|---|
| 0.00–3.00 | Javier, plano medio | recorte (582,20)-(1362,459) | "Somos Javier y Yudenis, de Global Beyond." |
| 3.00–6.75 | Yudenis, plano medio | recorte (0,40)-(780,479) | "Buscamos cincuenta y dos mil dólares." |
| 6.75–9.50 | Javier, primer plano | recorte (685,17)-(1245,332) | "Cada dólar se reporta." |
| 9.50–12.25 | Yudenis, primer plano | recorte (95,48)-(635,352) | "Dona o comparte. Gracias." |
| 12.25–15.00 | Tarjeta de logo GB, zoom lento, fade out | logo.png original | — |

## Textos en pantalla

Quemados en post, no generados — por eso salen limpios.

- 3.3–6.6 s: **$52,000** (132 px) + `INVENTARIO · LOGÍSTICA · PUBLICIDAD` (38 px)
- 9.8–12.1 s: **DONA O COMPARTE EL ENLACE** (64 px)

El desglose de fondos pasó de hablado a texto en pantalla: se lee más rápido de
lo que se dice y deja la voz sin prisa.

## Verificación

| Prueba | Resultado |
|---|---|
| Duración / formato | 15.000 s, 1920x1080, 24 fps, h264 + aac |
| Texto en pantalla (px > 225 en franja 740-980) | 5 a 2 s · 28907 a 5 s · **0 a 8 s** · 22941 a 11 s |
| Transcripción Whisper medium | "Buscamos $52,000" ✅ · "Cada dólar se reporta" ✅ · "Dona o comparte. Gracias." ✅ |
| Colocación de voz | 0–3.0 · 3.0–6.9 · 6.9–9.5 · 9.5–12.0, silencio en la tarjeta |

## Pendientes conocidos

- **Sin música.** No hay modelo de música disponible para uso general en esta
  cuenta (`sonilo_music` está restringido al pipeline de juegos). Hay que
  montar una pista con licencia sobre el MP4.
- **Lip sync aproximado.** Los clips se generaron con la gente hablando en
  genérico y la voz se dobló encima. En los primeros planos puede notarse.
  Corregirlo requiere regenerar con `seedance_2_5` en `omni_reference` pasando
  la voz como `audio_references`: ~97.5 créditos a 720p.
- **Pronunciación de "Yudenis".** Whisper la lee como "Udinus". Puede ser
  artefacto del transcriptor o del TTS; hay que escucharlo.

## Costos

| Concepto | Créditos |
|---|---|
| v1 (Kling pro 15 s con audio) | 37.5 |
| v2 (Kling pro 15 s con audio, sin texto) | 37.5 |
| v3: 4 clips mudos pro (13 s) | 22.75 |
| v3: 7 líneas TTS | 0.7 |
| Montaje, recortes, verificación (sandbox) | 0 |
| **Saldo restante** | **9.85** |
