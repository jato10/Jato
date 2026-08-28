#!/usr/bin/env python3
"""Recorta los fotogramas iniciales de cada plano desde la foto de referencia.

Los primeros planos se sacan recortando la foto real de los cofundadores en vez
de generar caras nuevas: asi Kling parte de los rostros verdaderos.
Cada recorte se fuerza a 16:9 y se sube a 1920x1080 con Lanczos.
"""
import sys
from PIL import Image

# (nombre, centro_x, centro_y, ancho) en pixeles de la foto original (1362x768)
SHOTS = [
    ("frame_javier_medio.png",   975, 240, 780),
    ("frame_yudenis_medio.png",  370, 260, 780),
    ("frame_javier_cerca.png",   965, 175, 560),
    ("frame_yudenis_cerca.png",  365, 200, 540),
]


def crop(im, name, cx, cy, w):
    W, H = im.size
    h = int(round(w * 9 / 16))
    x = max(0, min(W - w, int(cx - w / 2)))
    y = max(0, min(H - h, int(cy - h / 2)))
    im.crop((x, y, x + w, y + h)).resize((1920, 1080), Image.LANCZOS).save(name)
    print(f"{name}  recorte=({x},{y})-({x + w},{y + h})")


def main(src="ref.jpg"):
    im = Image.open(src).convert("RGB")
    print(f"referencia {src} {im.size}")
    for args in SHOTS:
        crop(im, *args)


if __name__ == "__main__":
    main(*sys.argv[1:])
