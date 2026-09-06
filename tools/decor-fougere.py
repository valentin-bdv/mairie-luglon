#!/usr/bin/env python3
"""
Génère images/decor-fougere.svg : une tuile raccordable verticalement,
dessinée au trait, destinée à servir de MASQUE CSS (mask-image).

    python3 tools/decor-fougere.py images/decor-fougere.svg

CE N'EST PAS UNE ÉTAPE DE BUILD. Le SVG est commité ; le site reste
100% statique et se déploie sans rien exécuter. Ce script est simplement
la SOURCE du dessin : modifier la plante à la main dans 180 chemins SVG
n'est pas praticable, la regénérer d'ici l'est. Voir la section 19 de
styles.css pour la façon dont la tuile est utilisée.

Contraintes :
  - tout est en trait blanc opaque (le masque lit le canal alpha) ;
  - la tige est périodique en y (mêmes x et même tangente en y=0 et y=H) ;
  - tout élément qui pourrait franchir un bord est dessiné 3 fois
    (y-H, y, y+H) : le viewBox rogne, le raccord est invisible.
"""
import math

# H = 1500 et non 900 : à 170px de large (le plafond CSS), une tuile de 900
# unités se répète tous les 651px, soit DEUX FOIS dans un écran de 800px — la
# page Galerie, dont la section fait plusieurs milliers de pixels, se lisait
# alors comme du papier peint. À 1500, la période passe à ~1085px : environ une
# occurrence par écran, et l'œil ne raccroche plus le motif.
W, H = 235.0, 1500.0
out = []          # liste de (d, stroke_width, opacity)


# ---------------------------------------------------------------- utilitaires
def fmt(pts):
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)


def add(pts, sw, op=1.0):
    if len(pts) >= 2:
        ys = [p[1] for p in pts]
        out.append((fmt(pts), sw, op, min(ys), max(ys)))


# ------------------------------------------------------------------- la tige
def stem_x(y):
    return 78 + 23 * math.sin(2 * math.pi * y / H) + 8 * math.sin(4 * math.pi * y / H + 1.1)


def stem_tangent(y):
    dx = (stem_x(y + 0.5) - stem_x(y - 0.5))
    return math.atan2(1.0, dx)          # direction « vers le bas »


def draw_stem():
    n = 130
    pts = [(stem_x(H * i / n), H * i / n) for i in range(n + 1)]
    add(pts, 2.0, 1.0)


# ------------------------------------------------------------------ la fronde
def frond(sx, sy, ang, L, sw=1.5, pin_ratio=0.30, bend=54, pin_ang=57):
    """Fronde pennée : un rachis courbe + deux rangées de pinnules."""
    a0 = math.radians(ang)
    side = 1.0 if math.cos(a0) > 0 else -1.0
    steps = 40
    x, y = sx, sy
    rachis, tans = [], []
    for i in range(steps + 1):
        t = i / steps
        rachis.append((x, y))
        aa = a0 + math.radians(bend) * (t ** 1.35) * side
        tans.append(aa)
        ds = L / steps
        x += math.cos(aa) * ds
        y += math.sin(aa) * ds
    add(rachis, sw, 0.95)

    # profil de longueur des pinnules : max vers le tiers inférieur
    def prof(t):
        return ((t + 0.10) ** 0.40) * ((1.04 - t) ** 0.68)
    kmax = max(prof(i / 100) for i in range(101))

    npin = max(6, int(L / 6.5))
    for i in range(npin):
        t = 0.06 + 0.93 * (i / (npin - 1))
        idx = min(steps, int(t * steps))
        bx, by = rachis[idx]
        aa = tans[idx]
        lp = L * pin_ratio * prof(t) / kmax
        if lp < 2.5:
            continue
        for s in (-1, 1):
            pa = aa + s * math.radians(pin_ang)
            # légère courbure de la pinnule vers la pointe de la fronde
            p = []
            px, py = bx, by
            m = 3
            for k in range(m + 1):
                p.append((px, py))
                ca = pa - s * math.radians(16) * (k / m)
                px += math.cos(ca) * lp / m
                py += math.sin(ca) * lp / m
            add(p, sw * 0.72, 0.70)


# ------------------------------------------------------- la crosse (fiddlehead)
def crosse(sx, sy, ang, L, sw=1.7):
    """Jeune fronde enroulée : hampe droite puis spirale logarithmique."""
    a0 = math.radians(ang)
    steps = 26
    x, y = sx, sy
    hampe = []
    for i in range(steps + 1):
        t = i / steps
        hampe.append((x, y))
        aa = a0 - math.radians(20) * (t ** 1.4) * (1 if math.cos(a0) > 0 else -1)
        x += math.cos(aa) * L / steps
        y += math.sin(aa) * L / steps
    tip_a = aa

    # spirale échantillonnée dans son repère, puis recalée sur la hampe
    r0, b = L * 0.42, 0.20
    raw = []
    n = 78
    for i in range(n + 1):
        th = 3.7 * math.pi * i / n
        r = r0 * math.exp(-b * th)
        raw.append((r * math.cos(th), r * math.sin(th)))
    # tangente initiale de la spirale
    t0 = math.atan2(raw[1][1] - raw[0][1], raw[1][0] - raw[0][0])
    # on l'aligne sur la tangente de la hampe (enroulement vers le haut)
    rot = tip_a - t0
    cr, sr = math.cos(rot), math.sin(rot)
    ox, oy = hampe[-1]
    sp = []
    for rx, ry in raw:
        dx, dy = rx - raw[0][0], ry - raw[0][1]
        sp.append((ox + dx * cr - dy * sr, oy + dx * sr + dy * cr))
    add(hampe + sp, sw, 1.0)

    # quelques pinnules naissantes le long de la hampe
    for k in range(1, 5):
        t = k / 5
        idx = int(t * steps)
        bx, by = hampe[idx]
        aa2 = math.atan2(hampe[idx + 1][1] - by, hampe[idx + 1][0] - bx)
        lp = L * 0.20 * (1 - t * 0.5)
        for s in (-1, 1):
            pa = aa2 + s * math.radians(62)
            add([(bx, by), (bx + math.cos(pa) * lp, by + math.sin(pa) * lp)], sw * 0.6, 0.62)


# ------------------------------------- aiguilles de pin maritime (par paires)
def aiguilles(sx, sy, ang, L, pairs=2, sw=1.2):
    for p in range(pairs):
        base_a = math.radians(ang) + math.radians(-16 + 32 * p / max(1, pairs - 1))
        for s in (-1, 1):
            a = base_a + s * math.radians(6.5)
            pts, x, y = [], sx, sy
            n = 12
            for i in range(n + 1):
                pts.append((x, y))
                # l'aiguille s'infléchit doucement vers le bas
                ca = a + s * math.radians(11) * (i / n) + math.radians(9) * (i / n) ** 2
                x += math.cos(ca) * L / n
                y += math.sin(ca) * L / n
            add(pts, sw, 0.80)


# ------------------------------------------------ pigne de pin (avec épines)
def pigne(sx, sy, S=64, sw=1.3, off=22, rows=5):
    """Pigne pendante, en écailles imbriquées.

    Deux pièges écartés au passage :
      - un ovale lisse cerclé de traits horizontaux fait un cocon ;
      - des épines saillantes tout autour font des PATTES d'insecte.
    Les écailles en quinconce, elles, se lisent au premier coup d'œil, et
    l'aspect piquant vient de la pointe basse et des bords dentelés."""
    cx = sx + off
    top = sy + 15
    add([(sx, sy), (sx + off * 0.55, sy + 8), (cx, top)], sw, 0.9)      # pédoncule

    w = S * 0.60

    def prof(u):
        return ((u + 0.06) ** 0.42) * ((1.05 - u) ** 0.55)
    k = max(prof(i / 200) for i in range(201))

    def hw(u):
        return prof(u) / k * (w / 2)

    # silhouette (la pointe basse est franche, pas arrondie)
    left, right = [], []
    n = 22
    for i in range(n + 1):
        u = 0.92 * i / n
        yy = top + u * S
        left.append((cx - hw(u), yy))
        right.append((cx + hw(u), yy))
    add(left + [(cx, top + S)] + right[::-1], sw, 1.0)

    # écailles : 3 puis 2 par rangée, ce qui les met naturellement en quinconce
    for i in range(rows):
        u0 = 0.04 + 0.86 * i / rows
        u1 = 0.04 + 0.86 * (i + 1) / rows
        yy = top + u0 * S
        h = (u1 - u0) * S * 1.05
        d = hw(u0 + 0.35 * (u1 - u0))
        ns = 3 if i % 2 == 0 else 2
        ew = 2 * d / ns
        for j in range(ns):
            c = cx - d + ew * (j + 0.5)
            arc, m = [], 6
            for q in range(m + 1):
                t = -1 + 2 * q / m
                arc.append((c + t * ew / 2, yy + h * (1 - t * t) ** 0.75))
            add(arc, sw * 0.8, 0.92)


# ============================================================== la composition
draw_stem()

# fronde : (y, angle de départ, longueur) — l'angle est celui du DÉPART,
# la fronde s'arque ensuite de `bend` degrés vers le bas.
# Les éléments qui partent vers la GAUCHE sont placés là où la tige est
# elle-même à droite, sinon ils sortent de la tuile (voir le contrôle de
# débordement en fin de fichier, qui échoue bruyamment si on se trompe).
FRONDES = [
    (90,   -36, 125),
    (390,  214,  56),
    (520,  -30, 134),
    (850,  -38, 112),
    (960,  210,  60),
    (1180, -33, 128),
    (1400, 216,  52),
]
for y, a, L in FRONDES:
    frond(stem_x(y), y, a, L)

crosse(stem_x(195), 195, -54, 42)
crosse(stem_x(730), 730, 234, 38)
crosse(stem_x(1300), 1300, -50, 40)

aiguilles(stem_x(640), 640, 202, 46, pairs=2)
aiguilles(stem_x(1060), 1060, -20, 72, pairs=3)

# UNE SEULE pigne par tuile, volontairement. C'est l'élément le plus
# reconnaissable du dessin : c'est donc lui que l'oeil utilise pour repérer la
# répétition. En mettre deux revient à diviser par deux la période perçue.
pigne(stem_x(250), 250, 66)


# ============================================================ écriture du SVG
def render():
    body = []
    for dy in (-H, 0.0, H):
        g = []
        for d, sw, op, y0, y1 in out:
            # Hors de la tuile une fois décalé : inutile de l'écrire, le
            # viewBox le rognerait entièrement.
            if y1 + dy < 0 or y0 + dy > H:
                continue
            g.append(
                f'<path d="{d}" stroke-width="{sw:.2f}" stroke-opacity="{op:.2f}"/>'
            )
        if not g:
            continue
        if dy:
            body.append(f'<g transform="translate(0 {dy:.0f})">' + "".join(g) + "</g>")
        else:
            body.append("".join(g))
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" '
        f'width="{W:.0f}" height="{H:.0f}">'
        '<g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">'
        + "".join(body)
        + "</g></svg>\n"
    )


# --- Contrôle de débordement -------------------------------------------------
# Un trait qui sort de la tuile est rogné par le viewBox : à l'écran, une
# fronde amputée net. Le contrôle échoue ici plutôt que de le laisser
# découvrir dans le navigateur.
xs = [float(c.split(",")[0]) for d, *_ in out
      for c in d.replace("M", "").replace(" L", " ").split()]
xmin, xmax = min(xs), max(xs)
if xmin < 1.0 or xmax > W - 1.0:
    raise SystemExit(
        f"DEBORDEMENT : x va de {xmin:.1f} a {xmax:.1f}, la tuile fait {W:.0f}. "
        "Raccourcir l'element fautif ou le deplacer la ou la tige est du bon cote."
    )

import sys
print(f"x : {xmin:.1f} -> {xmax:.1f}  (tuile : {W:.0f})")
open(sys.argv[1], "w").write(render())
print(f"{sys.argv[1]} — {len(out)} traits")
