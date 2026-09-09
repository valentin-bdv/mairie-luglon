"""
config.py — TOUT ce qui est propre à un client tient dans ce fichier.

C'est le seul module à relire pour installer ce back-office chez quelqu'un
d'autre. Les autres (`db.py`, `auth.py`, `app.py`) ne contiennent aucun nom de
commune, aucune URL, aucune rubrique en dur : ils lisent d'ici. Si vous trouvez
« Luglon » ailleurs que dans ce fichier et dans `templates/`, c'est une fuite à
corriger, pas une fatalité.

Les gabarits de `templates/` sont, eux, forcément spécifiques : ce sont les
pages du client. Pour un autre client on les remplace, on ne les paramètre pas —
essayer de rendre une mise en page « générique » produit un moteur de gabarits
maison, ce qui est exactement le CMS qu'on cherche à ne pas écrire.
"""

import os
import pathlib

# --- Emplacements ----------------------------------------------------------
# RACINE_SITE est le dossier qui contient index.html, styles.css, images/… du
# site statique. Ici le back-office vit dans un sous-dossier du site, d'où le
# `.parent`. Sur un déploiement où les deux sont séparés, mettre un chemin
# absolu.
BASE = pathlib.Path(__file__).resolve().parent
RACINE_SITE = BASE.parent

# Base SQLite et fichiers déposés par le client. Hors du dépôt git : ce sont
# des données, elles ne se versionnent pas et ne se régénèrent pas non plus —
# ce sont elles qu'il faut sauvegarder, pas le code (voir README).
DONNEES = pathlib.Path(os.environ.get("BO_DONNEES", BASE / "donnees"))
BASE_SQLITE = DONNEES / "backoffice.sqlite3"
DEPOTS = DONNEES / "documents"

# --- Identité du site ------------------------------------------------------
SITE_NOM = "Mairie de Luglon"
SITE_URL = "https://mairie-luglon.fr"   # sert aux <link rel="canonical">

# Préfixe d'URL sous lequel le site est servi.
#   "/mairie-luglon" pendant le développement et sur GitHub Pages, où le site
#                    vit dans un sous-dossier (voir CLAUDE.md) ;
#   ""               une fois à la racine d'un vrai domaine, sur OVH.
# Toutes les URL des gabarits passent par cette variable : c'est ce qui permet
# de basculer sans toucher au HTML.
PREFIXE_URL = os.environ.get("BO_PREFIXE_URL", "/mairie-luglon")

# --- Règles d'affichage ----------------------------------------------------
# Combien d'actualités restent « en une » sur /actualites/. Au-delà, elles
# basculent automatiquement vers /actualites/autres/ — c'est toute
# l'automatisation : personne n'a à déplacer quoi que ce soit à la main, la
# limite est une requête, pas un rangement.
ACTUALITES_EN_UNE = 5

# Rubriques de documents, dans l'ordre d'affichage sur la page publique.
# La clé est stockée en base ; changer un libellé est sans risque, changer une
# clé demande une migration des lignes existantes.
RUBRIQUES = [
    ("arrete-municipal", "Arrêtés municipaux"),
    ("arrete-prefectoral", "Arrêtés préfectoraux"),
    ("bulletin", "Bulletins municipaux"),
]

# --- Dépôt de fichiers -----------------------------------------------------
# PDF uniquement, et vérifié sur les octets du fichier, pas sur son extension :
# un envoi utilisateur est la surface la plus exposée de l'application.
EXTENSIONS_AUTORISEES = {".pdf"}
SIGNATURE_PDF = b"%PDF-"
TAILLE_MAX_OCTETS = 20 * 1024 * 1024   # 20 Mo

# --- Authentification ------------------------------------------------------
# Le mot de passe n'est JAMAIS dans le code ni dans le dépôt : il arrive par
# l'environnement, sous forme de condensat produit par `python3 -m backoffice.auth`.
# Voir README. Sans cette variable, l'application refuse de démarrer plutôt que
# de tourner avec un mot de passe par défaut — un back-office ouvert publierait
# n'importe quoi sur le site d'une mairie.
CONDENSAT_MOT_DE_PASSE = os.environ.get("BO_MOT_DE_PASSE_HACHE", "")

# Durée d'une session avant reconnexion.
SESSION_DUREE_H = 12

# Cookie de session. `secure=True` impose HTTPS : vrai derrière un tunnel
# Cloudflare comme derrière nginx, faux en http://localhost — d'où la variable.
COOKIE_NOM = "bo_session"
COOKIE_SECURE = os.environ.get("BO_COOKIE_SECURE", "1") != "0"
