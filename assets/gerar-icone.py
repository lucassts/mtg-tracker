#!/usr/bin/env python3
"""
Gera o ícone do app.

A marca é a roda de cores: cinco pontos num pentágono, na ordem branco, azul,
preto, vermelho, verde. É o conceito mais reconhecível de Magic sem usar
nenhum símbolo desenhado pela Wizards, e sobrevive a 48dp — cinco manchas de
cor num anel continuam legíveis onde qualquer desenho fino vira borrão.

O fundo é tinta, e não o creme do app, por dois motivos: contra a parede de
ícones coloridos de uma tela inicial o escuro dá contraste em vez de sumir, e
foi de uma bola clara que este ícone veio. Cada ponto leva um contorno creme,
sem o qual o ponto preto desapareceria no fundo.

Desenha em 4x e reduz com LANCZOS: é o antisserrilhado, sem dependência extra.

    python3 assets/gerar-icone.py assets
"""
import math
import sys

from PIL import Image, ImageDraw

TINTA = (23, 22, 15, 255)
CREME = (247, 246, 242, 255)

# Ordem da roda: branco, azul, preto, vermelho, verde.
CORES = [
    (255, 253, 243, 255),
    (47, 127, 199, 255),
    (38, 34, 27, 255),
    (207, 68, 51, 255),
    (63, 151, 97, 255),
]

ESCALA = 4


def desenhar(lado, frac_anel, frac_ponto, fundo):
    """
    Um pentágono de pontos, branco no topo e a roda no sentido horário.

    Os raios vêm como fração do lado para a marca ser a mesma em qualquer
    tamanho. A distância entre dois pontos vizinhos é 2·R·sen36°, então o anel
    precisa de pelo menos r/0,588 para eles não se encostarem.
    """
    L = lado * ESCALA
    img = Image.new('RGBA', (L, L), fundo)
    d = ImageDraw.Draw(img)

    centro = L / 2
    R = frac_anel * L
    r = frac_ponto * L
    assert 2 * R * math.sin(math.radians(36)) > 2 * r, 'os pontos se encostam'

    contorno = max(1, round(r * 0.085))
    for i, cor in enumerate(CORES):
        ang = math.radians(-90 + i * 72)
        x = centro + R * math.cos(ang)
        y = centro + R * math.sin(ang)
        d.ellipse([x - r, y - r, x + r, y + r], fill=cor,
                  outline=CREME, width=contorno)

    return img.resize((lado, lado), Image.LANCZOS)


def salvar(caminho, img):
    img.save(caminho)
    print(caminho, img.size)


if __name__ == '__main__':
    destino = (sys.argv[1] if len(sys.argv) > 1 else 'assets').rstrip('/')

    # Cheio: o sistema aplica a máscara dele por cima, então a marca pode
    # chegar perto da borda — 0,278 + 0,147 = 0,425 do lado, a partir do centro.
    CHEIO = (0.278, 0.147)

    # Adaptativo: o fundo vem do app.json e o conteúdo precisa caber na zona
    # segura, o círculo central de 66% do lado (0,333 do centro). 0,205 + 0,110
    # dá 0,315, com folga para a máscara de cada fabricante.
    SEGURO = (0.205, 0.110)

    salvar(f'{destino}/icon.png', desenhar(1024, *CHEIO, TINTA))
    salvar(f'{destino}/adaptive-icon.png', desenhar(1024, *SEGURO, (0, 0, 0, 0)))
    salvar(f'{destino}/favicon.png', desenhar(96, *CHEIO, TINTA))
