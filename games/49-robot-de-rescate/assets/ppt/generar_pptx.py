# -*- coding: utf-8 -*-
"""Genera la presentación del Robot de Rescate (49) con el estilo de la
plantilla Mision17: cabecera turquesa + título Arial Black + tarjetas."""
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from PIL import Image

ASSETS = '/home/user/robot-de-rescate/games/49-robot-de-rescate/assets/ppt'
SHOTS = '/home/user/ppt_build'
OUT = '/home/user/robot-de-rescate/games/49-robot-de-rescate/assets/ppt/Robot_de_Rescate_Mision49.pptx'

# ---- Paleta de la plantilla de referencia ----
DARK   = RGBColor(0x00, 0x60, 0x64)   # turquesa profundo (portada)
LIGHT  = RGBColor(0xDF, 0xF7, 0xF9)   # fondo claro de contenido
WHITE  = RGBColor(0xFF, 0xFF, 0xFF)
CYAN   = RGBColor(0x00, 0xBC, 0xD5)   # kicker
TEAL   = RGBColor(0x00, 0x80, 0x8C)   # subtítulo / cuerpo
CREAM  = RGBColor(0xFB, 0xF6, 0xE6)   # fondo de ilustraciones
ORANGE = RGBColor(0xF4, 0x6B, 0x2C)
RED    = RGBColor(0xE0, 0x3E, 0x36)
GREEN  = RGBColor(0x3E, 0xA8, 0x4F)
YELLOW = RGBColor(0xF2, 0xB6, 0x1E)
INK    = RGBColor(0x27, 0x32, 0x38)
GREY   = RGBColor(0x5E, 0x77, 0x7C)

TITLE_FONT = 'Arial Black'
BODY_FONT  = 'Verdana'      # equivalente disponible de DejaVuSans
MONO_FONT  = 'Consolas'

W, H = 13.333, 7.5     # 16:9 pulgadas
prs = Presentation()
prs.slide_width = Inches(W)
prs.slide_height = Inches(H)
BLANK = prs.slide_layouts[6]

def slide(bg=LIGHT):
    s = prs.slides.add_slide(BLANK)
    r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(W), Inches(H))
    r.fill.solid(); r.fill.fore_color.rgb = bg; r.line.fill.background()
    r.shadow.inherit = False
    return s

def rect(s, x, y, w, h, fill=WHITE, line=None, lw=1.25, radius=None, shadow=False):
    shp = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,
                             Inches(x), Inches(y), Inches(w), Inches(h))
    if radius:
        shp.adjustments[0] = radius
    if fill is None:
        shp.fill.background()
    else:
        shp.fill.solid(); shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line; shp.line.width = Pt(lw)
    shp.shadow.inherit = shadow
    if shp.has_text_frame:
        shp.text_frame.word_wrap = True
    return shp

def text(s, x, y, w, h, content, size=14, color=TEAL, font=BODY_FONT,
         bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=1.0,
         space_after=4, italic=False):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    if isinstance(content, str):
        content = [content]
    for i, para in enumerate(content):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = spacing
        p.space_after = Pt(space_after)
        # soporta **negrita** dentro del párrafo
        chunks = para.split('**')
        for j, ch in enumerate(chunks):
            if not ch:
                continue
            r = p.add_run(); r.text = ch
            r.font.size = Pt(size); r.font.name = font
            r.font.color.rgb = color
            r.font.bold = bold or (j % 2 == 1)
            r.font.italic = italic
    return tb

def header(s, kicker, title, sub=None, dark=False, subw=10.6):
    kc = CYAN if dark else ORANGE
    tc = WHITE if dark else DARK
    sc = RGBColor(0xB8, 0xE8, 0xEE) if dark else TEAL
    text(s, 1.0, 0.62, 9.0, 0.32, kicker, size=13.5, color=kc, font=TITLE_FONT)
    text(s, 1.0, 0.96, 11.3, 0.85, title, size=34, color=tc, font=TITLE_FONT, spacing=0.92)
    if sub:
        text(s, 1.0, 1.86, subw, 0.86, sub, size=15.5, color=sc, spacing=1.15)
    return 2.78 if sub else 2.2

def card(s, x, y, w, h, accent, title, body, tsize=15.5, bsize=12.5,
         bar=0.075, fill=WHITE, tcolor=DARK, bcolor=TEAL):
    rect(s, x, y, w, h, fill=fill, radius=0.10, shadow=False)
    rect(s, x + 0.13, y + 0.16, bar, h - 0.32, fill=accent, radius=0.45)
    text(s, x + 0.42, y + 0.16, w - 0.62, 0.34, title, size=tsize, color=tcolor, font=TITLE_FONT)
    text(s, x + 0.42, y + 0.52, w - 0.64, h - 0.62, body, size=bsize, color=bcolor, spacing=1.12)

def pill(s, x, y, w, h, label, fill, color=WHITE, size=11.5, font=TITLE_FONT):
    p = rect(s, x, y, w, h, fill=fill, radius=0.45)
    tf = p.text_frame
    tf.margin_left = tf.margin_right = Inches(0.06)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    para = tf.paragraphs[0]; para.alignment = PP_ALIGN.CENTER
    r = para.add_run(); r.text = label
    r.font.size = Pt(size); r.font.bold = True; r.font.name = font; r.font.color.rgb = color
    return p

def picture(s, path, x, y, w=None, h=None, frame=True, framecolor=CREAM, line=CREAM):
    img = Image.open(path); iw, ih = img.size
    if w and not h: h = w * ih / iw
    elif h and not w: w = h * iw / ih
    if frame:
        pad = 0.10
        rect(s, x - pad, y - pad, w + 2 * pad, h + 2 * pad, fill=framecolor, radius=0.07)
    return s.shapes.add_picture(path, Inches(x), Inches(y), Inches(w), Inches(h))

def code(s, x, y, w, h, lines, size=10.5, title=None, fill=INK):
    rect(s, x, y, w, h, fill=fill, radius=0.06)
    if title:
        text(s, x + 0.28, y + 0.18, w - 0.5, 0.26, title, size=10.5, color=CYAN, font=MONO_FONT, bold=True)
        yy = y + 0.55
    else:
        yy = y + 0.26
    tb = s.shapes.add_textbox(Inches(x + 0.28), Inches(yy), Inches(w - 0.5), Inches(h - (yy - y) - 0.2))
    tf = tb.text_frame; tf.word_wrap = False
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.line_spacing = 1.16
        for ch in ln.split('\x00'):
            r = p.add_run(); r.text = ch
            r.font.size = Pt(size); r.font.name = MONO_FONT
            r.font.color.rgb = RGBColor(0xE8, 0xF4, 0xF5)
    return tb

def footer(s, n, dark=False):
    text(s, 1.0, H - 0.52, 8.0, 0.28,
         'Robot de rescate · Actividad 49 · Arduino + sensor ultrasónico',
         size=9.5, color=RGBColor(0x7F, 0xB9, 0xC0) if dark else RGBColor(0x8F, 0xAB, 0xB0))
    text(s, W - 1.6, H - 0.52, 0.6, 0.28, str(n), size=9.5,
         color=RGBColor(0x7F, 0xB9, 0xC0) if dark else RGBColor(0x8F, 0xAB, 0xB0),
         align=PP_ALIGN.RIGHT, bold=True)

# ======================================================================
# 1 · PORTADA
# ======================================================================
s = slide(DARK)
text(s, 0.95, 1.55, 6.6, 0.36, 'MISIÓN 49', size=15, color=CYAN, font=TITLE_FONT)
text(s, 0.95, 1.95, 7.0, 0.72, 'Robot de rescate', size=36, color=WHITE,
     font=TITLE_FONT, spacing=0.95)
text(s, 0.95, 2.66, 7.0, 0.70, 'con sensor ultrasónico', size=29, color=WHITE,
     font=TITLE_FONT, spacing=0.95)
text(s, 0.95, 3.66, 5.9, 1.9,
     ['Rescata al gatito, esquiva los obstáculos y llévalo a la veterinaria.',
      'Arduino UNO + HC-SR04 + L298N.'],
     size=15.5, color=RGBColor(0xC9, 0xEC, 0xF0), spacing=1.2, space_after=10)
rect(s, 0.95, 5.62, 1.55, 0.05, fill=CYAN)
text(s, 0.95, 5.82, 6.4, 0.3, 'Una misión, un sensor y un gatito.', size=12.5,
     color=RGBColor(0x9F, 0xD6, 0xDD))
picture(s, os.path.join(ASSETS, 'portada.png'), 7.62, 1.28, w=4.85, framecolor=CREAM)

# ======================================================================
# 2 · QUÉ ES EL JUEGO
# ======================================================================
s = slide(); footer(s, 1)
y0 = header(s, 'EL JUEGO', '¿Qué es el robot de rescate?',
            'Un videojuego que simula un robot móvil real: el mismo sensor que mediría '
            'distancias en el patio es aquí el que te avisa de los obstáculos.')
picture(s, os.path.join(SHOTS, 'g1-inicio.png'), 1.0, 2.95, w=6.6)
text(s, 1.0, 6.5, 6.6, 0.3, 'El robot, el gatito (junto a su árbol) y el sensor con su cono de ±18°.',
     size=10.5, color=GREY, italic=True)
card(s, 8.0, 2.85, 4.33, 1.15, CYAN, 'Objetivo', 'Encontrar al gatito, subirlo al robot y entregarlo en la veterinaria.', tsize=14, bsize=11.5)
card(s, 8.0, 4.12, 4.33, 1.15, ORANGE, 'Cambio de rol', 'No solo miras datos: aquí los datos mueven un vehículo y deciden si chocas.', tsize=14, bsize=11.5)
card(s, 8.0, 5.39, 4.33, 1.15, GREEN, 'Aprendizaje', 'Sensores, pines, PWM, control de motores y lógica de estados.', tsize=14, bsize=11.5)

# ======================================================================
# 3 · LA MISIÓN
# ======================================================================
s = slide(); footer(s, 2)
header(s, 'LA MISIÓN', 'Tres etapas, un gatito',
       'El mapa mide 4200 × 3200 unidades: unos 17 m × 13 m a escala real (2,5 px = 1 cm).')
picture(s, os.path.join(ASSETS, 'mision.png'), 1.0, 2.85, w=7.0)
xs, ys = 8.45, 2.90
stages = [
    (CYAN,   '1 · RESCATE',  'Llega al árbol, pulsa E y recoge al gatito.'),
    (YELLOW, '2 · TRANSPORTE', 'Llévalo sin volcar: la velocidad rápida lo hace caer.'),
    (GREEN,  '3 · ENTREGA',  'Entra en la zona de la veterinaria para completar la misión.'),
]
for i, (col, t, b) in enumerate(stages):
    yy = ys + i * 1.30
    rect(s, xs, yy, 3.9, 1.12, fill=WHITE, radius=0.09)
    rect(s, xs, yy, 0.115, 1.12, fill=col)
    text(s, xs + 0.30, yy + 0.15, 3.4, 0.28, t, size=13, color=DARK, font=TITLE_FONT)
    text(s, xs + 0.30, yy + 0.50, 3.4, 0.5, b, size=11, color=TEAL, spacing=1.1)
text(s, xs, 6.80, 3.9, 0.3, 'Si llegas sin el gatito, la misión no cuenta.',
     size=10.5, color=RED, bold=True)

# ======================================================================
# 4 · OBSTÁCULOS Y PELIGROS
# ======================================================================
s = slide(); footer(s, 3)
header(s, 'OBSTÁCULOS', 'Lo que te frena (y lo que te muerde)',
       'Todo lo sólido detiene al robot y resta vida; los perros además te persiguen.')
picture(s, os.path.join(ASSETS, 'obstaculos.png'), 1.0, 2.82, w=6.55)
items = [
    (GREEN,  'Árboles, rocas y bancas', 'Chocar resta 30 % de vida y baja el techo de estabilidad.'),
    (ORANGE, 'Cajas y barreras', 'Bloquean el paso y también la vista de los perros.'),
    (RED,    'Dos perros guardianes', 'Uno al inicio y otro antes de la veterinaria; ladran y muerden.'),
    (CYAN,   'Túneles y zonas', 'El taller repara; la zona de entrega es la meta.'),
]
for i, (col, t, b) in enumerate(items):
    yy = 2.80 + i * 1.02
    rect(s, 8.05, yy, 4.28, 0.92, fill=WHITE, radius=0.10)
    rect(s, 8.18, yy + 0.13, 0.075, 0.66, fill=col, radius=0.45)
    text(s, 8.45, yy + 0.13, 3.7, 0.26, t, size=12.5, color=DARK, font=TITLE_FONT)
    text(s, 8.45, yy + 0.44, 3.72, 0.42, b, size=10.5, color=TEAL, spacing=1.05)
text(s, 1.0, 6.55, 6.55, 0.3, 'El perro ladra, se alerta y persigue: hay que esconderse.',
     size=10.5, color=GREY, italic=True)

# ======================================================================
# 5 · EL PERRO Y LA LÍNEA DE VISIÓN
# ======================================================================
s = slide(); footer(s, 4)
header(s, 'IA SENCILLA', 'El perro solo te ve si hay línea de visión',
       'Distancia + cono de visión + comprobación de obstáculos en medio: si hay un árbol, no te ve.')
picture(s, os.path.join(ASSETS, 'linea-de-vision.png'), 1.0, 2.80, w=6.2)
text(s, 1.0, 6.05, 6.2, 0.5, 'Estados del perro: patrulla → alerta → persecución → vuelve a la caseta.',
     size=10.5, color=GREY, italic=True)
code(s, 7.7, 2.76, 4.65, 3.35, [
    '\x00// 1 · ¿está lo bastante cerca?',
    '\x00d = hypot(rx-dx, ry-dy);',
    '\x00if (d > 780) return false;',
    '',
    '\x00// 2 · ¿dentro del cono de visión?',
    '\x00a = atan2(ry-dy, rx-dx);',
    '\x00if (|a - perro.a| > 0.94) return false;',
    '',
    '\x00// 3 · ¿hay algo en medio?',
    '\x00for (p of linea(dog, robot))',
    '\x00  if (solido(p)) return false;',
    '\x00return true;   // te vio',
], size=10.0, title='sensesRobot()  · lógica del juego')
card(s, 7.7, 6.16, 4.65, 0.82, CYAN, 'Truco', 'Solo lo sólido tapa: el camino y la hierba no.', tsize=11, bsize=9.2)

# ======================================================================
# 6 · EL SENSOR ULTRASÓNICO
# ======================================================================
s = slide(); footer(s, 5)
header(s, 'EL SENSOR', 'HC-SR04: medir con sonido',
       'Emite un pulso de 40 kHz, espera el eco y calcula: distancia = tiempo × 0,0343 / 2.')
picture(s, os.path.join(ASSETS, 'hc-sr04.png'), 1.0, 2.80, w=6.3)
specs = [
    (CYAN,   'Alcance', '2 cm a 400 cm (en el juego 2 a 200 cm).'),
    (GREEN,  'Precisión', '±3 mm; en el juego, umbrales de 20 y 50 cm.'),
    (YELLOW, 'Campo de visión', '±15° reales; ±18° en la simulación.'),
    (ORANGE, 'Tiempo', 'Una lectura nueva cada 60 ms.'),
]
for i, (col, t, b) in enumerate(specs):
    yy = 2.80 + i * 1.03
    rect(s, 7.75, yy, 4.58, 0.92, fill=WHITE, radius=0.10)
    rect(s, 7.88, yy + 0.13, 0.075, 0.66, fill=col, radius=0.45)
    text(s, 8.15, yy + 0.13, 4.0, 0.26, t, size=12.5, color=DARK, font=TITLE_FONT)
    text(s, 8.15, yy + 0.44, 4.02, 0.42, b, size=10.5, color=TEAL, spacing=1.05)

# ======================================================================
# 6b · CÓMO SIMULA EL JUEGO AL SENSOR
# ======================================================================
s = slide(); footer(s, 6)
header(s, 'DEL JUEGO AL HARDWARE', 'Los mismos números, dos mundos',
       'El juego no adivina: barre 7 rayos dentro del cono de ±18° y calcula dónde choca el primero. '
       'Es el equivalente al tiempo de eco del HC-SR04.')
picture(s, os.path.join(SHOTS, 'g2-sensor.png'), 1.0, 2.86, w=6.3)
text(s, 1.0, 6.50, 6.3, 0.3, 'El cono del sensor en el juego: 7 rayos, alcance de 200 cm.',
     size=10.5, color=GREY, italic=True)
rows6 = [
    (CYAN,   '200 cm', 'Alcance máximo', 'El pulso deja de esperar: se informa "sin obstáculo".'),
    (GREEN,  '50 cm', 'Umbral despejado', 'A partir de aquí el robot va tranquilo.'),
    (YELLOW, '20 cm', 'Umbral cercano', 'Empieza a frenar y a buscar hueco.'),
    (RED,    '2 cm', 'Distancia mínima', 'Tope del sensor: por debajo no hay lectura fiable.'),
]
for i, (col, val, t, b) in enumerate(rows6):
    yy = 2.90 + i * 1.16
    rect(s, 7.65, yy, 4.7, 1.02, fill=WHITE, radius=0.10)
    rect(s, 7.65, yy, 0.115, 1.02, fill=col)
    text(s, 7.92, yy + 0.14, 1.05, 0.3, val, size=13, color=col, font=MONO_FONT, bold=True)
    text(s, 9.05, yy + 0.12, 3.1, 0.28, t, size=12, color=DARK, font=TITLE_FONT)
    text(s, 7.92, yy + 0.52, 4.2, 0.44, b, size=10, color=TEAL, spacing=1.05)

# ======================================================================
# 7 · SENSORES Y PINES
# ======================================================================
s = slide(); footer(s, 7)
header(s, 'PINES DEL ARDUINO', 'Qué va en cada pin',
       'Cuatro pines digitales, dos analógicos, PWM para las ruedas y alimentación común.')
picture(s, os.path.join(ASSETS, 'arduino-pines.png'), 0.95, 2.72, w=5.35)
text(s, 0.95, 6.18, 5.35, 0.3, 'D = digital · A = analógico · PWM = ancho de pulso',
     size=9.5, color=GREY, italic=True)
rows = [
    ('D9',  'HC-SR04 · Trig', 'Salida digital', 'Dispara el pulso de 10 µs.'),
    ('D10', 'HC-SR04 · Echo', 'Entrada digital', 'Mide cuánto dura el eco de vuelta.'),
    ('D2',  'Sensor de borde', 'Entrada digital', 'Avisa si hay un escalón o caída.'),
    ('D5-D8', 'L298N · IN1-IN4', 'Salida digital', 'Sentido de giro de cada rueda.'),
    ('D3, D11', 'L298N · ENA/ENB', 'Salida PWM', 'Regula la velocidad: 0 a 255.'),
    ('A0',  'Batería', 'Entrada analógica', 'Lee el voltaje: vida del robot.'),
    ('A1',  'Bandeja del gatito', 'Entrada analógica', 'Detecta si el gatito va encima.'),
]
yy = 2.72
for i, (pin, sig, kind, desc) in enumerate(rows):
    fill = WHITE if i % 2 == 0 else RGBColor(0xF1, 0xFB, 0xFC)
    rect(s, 6.55, yy, 5.78, 0.575, fill=fill, radius=0.04)
    pill(s, 6.70, yy + 0.145, 0.80, 0.30, pin, DARK, size=8.6)
    text(s, 7.62, yy + 0.10, 4.55, 0.26, sig, size=11.5, color=DARK, font=TITLE_FONT)
    text(s, 7.62, yy + 0.335, 4.6, 0.22, kind + ' · ' + desc, size=9, color=TEAL)
    yy += 0.60

# ======================================================================
# 8 · ANALÓGICO VS DIGITAL
# ======================================================================
s = slide(); footer(s, 8)
header(s, 'SEÑALES', 'Digital o analógico: no es lo mismo',
       'El mundo real es continuo; el Arduino solo entiende números. La diferencia está en cómo los lee.')
card(s, 1.0, 2.85, 5.5, 1.9, CYAN, 'Digital (0 o 1)',
     'Solo dos estados: HIGH (5 V) o LOW (0 V). Sirve para disparar, saber si hay un obstáculo cerca o girar una rueda.', tsize=15, bsize=12)
card(s, 1.0, 4.95, 5.5, 1.9, GREEN, 'Analógico (0 a 1023)',
     'Un conversor interno lee voltajes de 0 a 5 V en 1024 niveles. Sirve para medir batería o peso, no para decidir "sí o no".', tsize=15, bsize=12)
card(s, 6.95, 2.85, 5.38, 1.9, ORANGE, 'PWM: digital que parece analógico',
     'Encendiendo y apagando muy rápido (490 Hz) se obtiene una velocidad intermedia. analogWrite(pin, 0..255) controla las ruedas.', tsize=15, bsize=12)
rect(s, 6.95, 4.95, 5.38, 1.9, fill=WHITE, radius=0.05)
text(s, 7.25, 5.12, 4.8, 0.3, 'En este robot', size=13, color=DARK, font=TITLE_FONT)
for i, ln in enumerate(['• El HC-SR04 es digital (tiempo de pulso).',
                        '• Los sensores de borde y el golpe son digitales.',
                        '• La batería y la bandeja usan A0 y A1.',
                        '• Las ruedas giran con PWM en ENA y ENB.']):
    text(s, 7.25, 5.52 + i * 0.31, 4.9, 0.28, ln, size=10.5, color=TEAL)

# ======================================================================
# 9 · CABLEADO
# ======================================================================
s = slide(); footer(s, 9)
header(s, 'MANOS A LA OBRA', 'El cableado completo',
       'Cinco bloques y una regla de oro: la batería alimenta los motores, el Arduino solo da las órdenes.')
picture(s, os.path.join(ASSETS, 'conexiones.png'), 1.0, 2.80, w=7.15)
tips = [
    (RED,    'GND común', 'Todas las tierras deben unirse: si no, las señales no tienen referencia.'),
    (YELLOW, 'Trig y Echo', 'Trig a D9, Echo a D10. Echo llega a 5 V, así que no necesita divisor.'),
    (GREEN,  'Motores aparte', 'Los motores consumen picos de corriente: nunca desde el pin de 5 V.'),
    (CYAN,   'PWM', 'ENA en D3 y ENB en D11 para regular la velocidad.'),
]
for i, (col, t, b) in enumerate(tips):
    yy = 2.80 + i * 1.03
    rect(s, 8.45, yy, 3.9, 0.92, fill=WHITE, radius=0.10)
    rect(s, 8.58, yy + 0.13, 0.075, 0.66, fill=col, radius=0.45)
    text(s, 8.85, yy + 0.13, 3.35, 0.26, t, size=12, color=DARK, font=TITLE_FONT)
    text(s, 8.85, yy + 0.44, 3.35, 0.44, b, size=9.8, color=TEAL, spacing=1.03)
text(s, 1.0, 6.62, 7.2, 0.3, 'Alimentación: 4 pilas AA (6 V) al L298N; el Arduino por USB o VIN.',
     size=10.5, color=GREY, italic=True)

# ======================================================================
# 10 · PROGRAMA: LEER EL SENSOR
# ======================================================================
s = slide(); footer(s, 10)
header(s, 'EL PROGRAMA · 1 DE 3', 'Leer el sensor ultrasónico',
       'Trig dispara, Echo cronometra. La distancia sale de la velocidad del sonido.')
code(s, 1.0, 2.78, 7.05, 3.85, [
    '\x00const int TRIG = 9;',
    '\x00const int ECHO = 10;',
    '',
    '\x00long medirCm() {',
    '\x00  digitalWrite(TRIG, LOW);',
    '\x00  delayMicroseconds(2);',
    '\x00  digitalWrite(TRIG, HIGH);',
    '\x00  delayMicroseconds(10);',
    '\x00  digitalWrite(TRIG, LOW);',
    '',
    '\x00  long t = pulseIn(ECHO, HIGH, 25000);',
    '\x00  if (t == 0) return 999;      // sin eco',
    '\x00  return t * 0.0343 / 2;       // ida y vuelta',
    '\x00}',
], size=10.6, title='lectura_sensor.ino')
card(s, 8.35, 2.80, 4.0, 1.35, CYAN, 'delayMicroseconds(10)',
     'Un pulso de 10 µs son 8 ciclos de 40 kHz. Así se emite la ráfaga.', tsize=13, bsize=10.5)
card(s, 8.35, 4.32, 4.0, 1.35, ORANGE, 'pulseIn()',
     'Devuelve los microsegundos que Echo se queda en HIGH; 25 ms de espera máxima.', tsize=13, bsize=10.5)
card(s, 8.35, 5.84, 4.0, 1.30, GREEN, '0,0343 cm/µs',
     'Velocidad del sonido en el aire. Se divide por 2 porque el eco va y vuelve.', tsize=13, bsize=10.5)

# ======================================================================
# 11 · PROGRAMA: DECIDIR
# ======================================================================
s = slide(); footer(s, 11)
header(s, 'EL PROGRAMA · 2 DE 3', 'Convertir la distancia en decisiones',
       'Los mismos umbrales del juego: más de 50 cm despejado, entre 20 y 50 cerca, menos de 20 peligro.')
code(s, 1.0, 2.78, 7.05, 3.62, [
    '\x00void loop() {',
    '\x00  int cm = medirCm();',
    '',
    '\x00  if (cm < 20) {',
    '\x00    frenar();          // peligro',
    '\x00    tone(BUZZER, 880);',
    '\x00  } else if (cm < 50) {',
    '\x00    girar(40);         // cerca',
    '\x00  } else {',
    '\x00    avanzar(180);      // despejado',
    '\x00  }',
    '\x00  delay(60);           // una lectura cada 60 ms',
    '\x00}',
], size=11, title='decidir.ino')
states = [
    (GREEN,  '> 50 cm', 'Despejado', 'Avanza a velocidad normal y acelera si hace falta.'),
    (YELLOW, '20-50 cm', 'Cercano', 'Reduce la velocidad y empieza a girar para esquivar.'),
    (RED,    '< 20 cm', 'Peligro', 'Frena, suena el aviso y cuenta un choque si toca.'),
]
for i, (col, rng, t, b) in enumerate(states):
    yy = 2.80 + i * 1.25
    rect(s, 8.35, yy, 4.0, 1.12, fill=WHITE, radius=0.10)
    rect(s, 8.35, yy, 0.115, 1.12, fill=col)
    text(s, 8.62, yy + 0.13, 1.5, 0.24, rng, size=10.5, color=col, font=MONO_FONT, bold=True)
    text(s, 10.1, yy + 0.11, 2.2, 0.26, t, size=12, color=DARK, font=TITLE_FONT)
    text(s, 8.62, yy + 0.50, 3.6, 0.5, b, size=10, color=TEAL, spacing=1.05)
text(s, 1.0, 6.55, 7.05, 0.3, 'Con mucha luz de sol el eco falla: se descarta la lectura 0 y se reintenta.',
     size=10.5, color=GREY, italic=True)

# ======================================================================
# 12 · PROGRAMA: MOTORES
# ======================================================================
s = slide(); footer(s, 12)
header(s, 'EL PROGRAMA · 3 DE 3', 'Mover las dos ruedas',
       'Cada rueda tiene dos pines de sentido y uno de velocidad. Cambiar uno de los dos la hace girar al revés.')
code(s, 1.0, 2.78, 6.95, 3.9, [
    '\x00const int IN1=5, IN2=6, IN3=7, IN4=8;',
    '\x00const int ENA=3, ENB=11;',
    '',
    '\x00void avanzar(int v) {',
    '\x00  digitalWrite(IN1,HIGH); digitalWrite(IN2,LOW);',
    '\x00  digitalWrite(IN3,HIGH); digitalWrite(IN4,LOW);',
    '\x00  analogWrite(ENA, v);  analogWrite(ENB, v);',
    '\x00}',
    '',
    '\x00void girar(int v) {',
    '\x00  digitalWrite(IN1,HIGH); digitalWrite(IN2,LOW);',
    '\x00  digitalWrite(IN3,LOW);  digitalWrite(IN4,HIGH);',
    '\x00  analogWrite(ENA, v);  analogWrite(ENB, v);',
    '\x00}',
], size=10.8, title='motores.ino')
card(s, 8.2, 2.78, 4.15, 1.2, CYAN, 'Sentido', 'IN1/IN2 invierten la rueda izquierda; IN3/IN4 la derecha.', tsize=13, bsize=10.5)
card(s, 8.2, 4.18, 4.15, 1.2, ORANGE, 'Velocidad', 'analogWrite(0-255) regula la potencia con PWM.', tsize=13, bsize=10.5)
card(s, 8.2, 5.55, 4.15, 1.05, RED, 'Nunca los dos HIGH', 'IN1 e IN2 a la vez frenan en seco y calientan el motor.', tsize=12.5, bsize=10)

# ======================================================================
# 13 · EL TALLER
# ======================================================================
s = slide(); footer(s, 13)
header(s, 'REPARACIÓN', 'El taller: volver al 100 %',
       'Chocar resta 30 % de vida; tras tres choques el techo de estabilidad baja a 30 %.')
picture(s, os.path.join(SHOTS, 'g4-taller.png'), 1.0, 2.80, w=6.55)
card(s, 7.95, 2.80, 4.38, 1.25, GREEN, 'Cómo reparar',
     'Entra en el círculo amarillo y espera: recupera 28 % por segundo.', tsize=14, bsize=11)
card(s, 7.95, 4.20, 4.38, 1.25, RED, 'Coste del choque',
     'Cada impacto quita 30 % de vida y 30 % del techo de estabilidad.', tsize=14, bsize=11)
card(s, 7.95, 5.60, 4.38, 1.25, CYAN, 'Por qué importa',
     'Con el techo al 30 % el gatito cae mucho antes: hay que reparar.', tsize=14, bsize=11)

# ======================================================================
# 14 · ESTABILIDAD
# ======================================================================
s = slide(); footer(s, 14)
header(s, 'TRANSPORTE', 'La estabilidad y el gatito que cae',
       'Ir rápido con el gatito encima acumula inestabilidad: 2,5 s de tolerancia y el gatito salta.')
picture(s, os.path.join(ASSETS, 'estabilidad.png'), 1.0, 2.78, w=6.15)
card(s, 7.6, 2.78, 4.7, 1.12, GREEN, 'Velocidad normal', 'La inestabilidad baja sola: 34 % por segundo.', tsize=13, bsize=10.5)
card(s, 7.6, 4.02, 4.7, 1.12, ORANGE, 'Velocidad rápida', 'Sube la inestabilidad; a partir del 30 % avisa.', tsize=13, bsize=10.5)
card(s, 7.6, 5.26, 4.7, 1.12, RED, 'Al 100 %', 'El gatito cae, corre asustado y hay que volver a por él.', tsize=13, bsize=10.5)
text(s, 7.6, 6.55, 4.7, 0.3, 'La tolerancia se ajusta con ?tolerancia= en la URL.',
     size=10, color=GREY, italic=True)

# ======================================================================
# 15 · CONTROLES
# ======================================================================
s = slide(); footer(s, 15)
header(s, 'CONTROLES', 'Cómo se juega',
       'Teclado en el computador, botones en el celular: el mismo robot, dos formas de mandar.')
picture(s, os.path.join(ASSETS, 'control.png'), 9.35, 2.35, h=4.35)
keys = [('W / ↑', 'Avanzar'), ('S / ↓', 'Retroceder'),
        ('A D / ← →', 'Girar'), ('ESPACIO', 'Frenar'),
        ('SHIFT', 'Velocidad rápida'), ('E', 'Recoger / soltar gatito'),
        ('P', 'Pausa')]
for i, (k, v) in enumerate(keys):
    col = i % 2
    row = i // 2
    x = 1.0 + col * 4.0
    y = 2.85 + row * 0.95
    rect(s, x, y, 3.7, 0.78, fill=WHITE, radius=0.12)
    pill(s, x + 0.18, y + 0.17, 1.25, 0.44, k, DARK, size=10)
    text(s, x + 1.6, y + 0.24, 1.95, 0.3, v, size=11, color=TEAL)
text(s, 1.0, 6.55, 7.9, 0.3, 'En el celular, la cruceta táctil y los botones FRENO / VEL / E.',
     size=10.5, color=GREY, italic=True)

# ======================================================================
# 16 · CÓMO ESTÁ HECHO
# ======================================================================
s = slide(); footer(s, 16)
header(s, 'POR DENTRO', 'Cómo está construido el juego',
       'Once módulos independientes en JavaScript y un paso fijo de 1/120 s: la física no depende de los FPS.')
mods = [
    ('config.js', 'Todos los valores: velocidades, umbrales, tolerancia.'),
    ('level.js', 'Mapa, obstáculos, taller, casetas y zonas.'),
    ('physics.js', 'Colisiones, sensor por barrido y línea de visión.'),
    ('dog.js', 'Patrulla, alerta, persecución y mordisco.'),
    ('game.js', 'Estados, salud, estabilidad, entrega y puntaje.'),
    ('render.js / world.js', 'Cámara, terreno, sprites y minimapa.'),
]
for i, (m, d) in enumerate(mods):
    col = i % 2; row = i // 2
    x = 1.0 + col * 6.15; y = 2.80 + row * 1.12
    rect(s, x, y, 5.85, 0.98, fill=WHITE, radius=0.10)
    rect(s, x + 0.13, y + 0.15, 0.075, 0.68, fill=CYAN if i % 2 == 0 else GREEN, radius=0.45)
    text(s, x + 0.40, y + 0.13, 2.15, 0.26, m, size=10.5, color=DARK, font=MONO_FONT, bold=True)
    text(s, x + 0.40, y + 0.44, 5.2, 0.44, d, size=10.2, color=TEAL, spacing=1.05)
text(s, 1.0, 6.30, 11.4, 0.3, '68 pruebas automáticas comprueban el sensor, el perro, la estabilidad, el taller y la línea de visión.',
     size=10.5, color=GREY, italic=True)

# ======================================================================
# 17 · PROBLEMAS COMUNES
# ======================================================================
s = slide(); footer(s, 17)
header(s, 'PROBLEMAS COMUNES', 'Si algo no funciona',
       'Casi todos los fallos del sensor son de alimentación, de pines cruzados o de tiempo de espera.')
probs = [
    (RED,    'Siempre 999 o 0', 'Echo mal conectado o sin GND común. Comprueba D9 y D10.'),
    (ORANGE, 'Medidas locas', 'Objetos blandos o en diagonal devuelven mal el eco: promedia tres lecturas.'),
    (YELLOW, 'El robot reinicia', 'Los motores roban corriente: aliméntalos con la batería, no con el Arduino.'),
    (CYAN,   'Gira solo', 'Un IN del L298N suelto: revisa las cuatro señales.'),
]
for i, (col, t, b) in enumerate(probs):
    col_i = i % 2; row = i // 2
    x = 1.0 + col_i * 6.15; y = 2.85 + row * 1.65
    rect(s, x, y, 5.85, 1.35, fill=WHITE, radius=0.09)
    rect(s, x + 0.15, y + 0.18, 0.085, 1.0, fill=col, radius=0.45)
    text(s, x + 0.48, y + 0.20, 5.0, 0.3, t, size=14, color=DARK, font=TITLE_FONT)
    text(s, x + 0.48, y + 0.62, 5.05, 0.62, b, size=11, color=TEAL, spacing=1.1)

# ======================================================================
# 18 · RETO
# ======================================================================
s = slide(); footer(s, 18)
header(s, 'RETO', 'Mejoras sobre la base',
       'El robot ya funciona. Estas ideas lo convierten en un vehículo de verdad.')
retos = [
    ('Ruedas con encoder', 'Cuenta los pulsos y mide la distancia recorrida en centímetros reales.'),
    ('Tres sensores', 'Dos HC-SR04 a los lados y uno al frente para mapear el contorno.'),
    ('Servo con la cámara', 'Un SG90 girando el sensor: barrido de 180° como en la misión 17.'),
    ('Bluetooth', 'Módulo HC-05 para controlarlo desde el celular, como el servo por WiFi.'),
]
for i, (t, b) in enumerate(retos):
    y = 2.85 + i * 1.12
    rect(s, 1.0, y, 11.3, 0.98, fill=WHITE, radius=0.10)
    rect(s, 1.0, y, 0.115, 0.98, fill=[CYAN, GREEN, YELLOW, ORANGE][i])
    text(s, 1.38, y + 0.13, 3.5, 0.28, t, size=13, color=DARK, font=TITLE_FONT)
    text(s, 1.38, y + 0.47, 10.5, 0.4, b, size=11, color=TEAL)

# ======================================================================
# 19 · CIERRE
# ======================================================================
s = slide(DARK)
text(s, 0.95, 1.30, 7.4, 0.36, 'PARA RECORDAR', size=14, color=CYAN, font=TITLE_FONT)
text(s, 0.95, 1.72, 7.6, 0.66, 'Un sensor, cuatro decisiones', size=30, color=WHITE, font=TITLE_FONT, spacing=0.95)
rec = [
    'El HC-SR04 es digital: mide el tiempo del eco.',
    'Los pines analógicos leen niveles; los digitales, estados.',
    'El PWM convierte 0-255 en velocidad de rueda.',
    'La línea de visión evita que el perro te vea tras un árbol.',
    'Reparar el robot es parte de la estrategia, no un extra.',
]
for i, r in enumerate(rec):
    text(s, 0.95, 2.72 + i * 0.62, 7.3, 0.45, '—  ' + r, size=12.5,
         color=RGBColor(0xC9, 0xEC, 0xF0), spacing=1.0)
picture(s, os.path.join(ASSETS, 'mascota.png'), 8.62, 1.62, w=3.95, framecolor=CREAM)
text(s, 0.95, 5.85, 7.3, 0.3, 'Actividad 49 · Robot de rescate',
     size=11, color=RGBColor(0x9F, 0xD6, 0xDD))

# ======================================================================
# 20 · PORTADA FINAL
# ======================================================================
s = slide(LIGHT)
text(s, 0.95, 2.15, 10.0, 0.36, 'ACTIVIDAD 49 · ROBÓTICA', size=14, color=ORANGE, font=TITLE_FONT)
text(s, 0.95, 2.55, 11.2, 1.2, '¡Misión completada!', size=46, color=DARK, font=TITLE_FONT)
text(s, 0.95, 3.85, 8.2, 0.9, 'El gatito ya está en la veterinaria. Ahora construye el robot de verdad.',
     size=17, color=TEAL, spacing=1.15)
pills = [('Sensor ultrasónico', CYAN), ('Arduino UNO', GREEN), ('PWM y motores', ORANGE), ('68 pruebas', YELLOW)]
x = 0.95
for label, col in pills:
    pill(s, x, 5.05, 2.55, 0.55, label, col, size=11)
    x += 2.75
text(s, 0.95, 6.35, 10.0, 0.3, 'migulopez.github.io/robot-de-rescate', size=11.5, color=GREY, font=MONO_FONT)

prs.save(OUT)
print('guardado', OUT, len(prs.slides.__iter__.__self__._sldIdLst), 'diapositivas')
