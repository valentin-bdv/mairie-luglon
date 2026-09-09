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

# --- Emplacement de l'administration ---------------------------------------
# « /admin » est une adresse devinable : les robots la testent en permanence,
# comme /wp-admin ou /administrator. Ce n'est pas une faille — le mot de passe
# reste la vraie barrière — mais c'est du bruit constant dans les journaux et
# des tentatives automatisées gratuites. Un chemin non deviné les fait taire.
#
# Ce n'est PAS un secret : ne comptez jamais dessus pour protéger quoi que ce
# soit, c'est une commodité, pas une serrure.
#
# Autre option au déploiement : servir l'administration sur un sous-domaine
# (admin.mairie-luglon.fr) plutôt que sur un chemin. L'app d'admin ne parle
# qu'à sa propre API, donc les deux vivent ensemble sur ce sous-domaine et il
# n'y a aucun CORS à configurer — c'est nginx qui route. À savoir : un
# sous-domaine ne cache rien, les journaux de transparence des certificats les
# listent publiquement.
ADMIN_CHEMIN = os.environ.get("BO_ADMIN_CHEMIN", "/gestion").rstrip("/")

# --- Règles d'affichage ----------------------------------------------------
# Combien d'actualités chaque rubrique montre sur le sommaire /actualites/.
# Au-delà, elles ne disparaissent pas : elles restent sur la page de leur
# rubrique, atteignable par « Voir plus ». C'est toute l'automatisation —
# personne ne déplace rien à la main, la limite est une requête.
ACTUALITES_EN_UNE = 5

# Rubriques d'actualités. La clé sert d'URL (/actualites/<clé>/) et est stockée
# en base ; le libellé s'affiche. Ajouter une rubrique ici lui crée sa page,
# son entrée de sommaire et son choix dans le formulaire, sans autre
# modification. En retirer une laisse ses actualités en base sans page pour les
# afficher — les déplacer avant.
RUBRIQUES_ACTUALITES = [
    ("vie-du-village", "Vie du village", "La vie quotidienne de la commune : évènements, animations, rendez-vous."),
    ("travaux", "Travaux", "Chantiers en cours, voirie, réseaux et perturbations à prévoir."),
    ("associations", "Associations", "Ce que proposent les associations luglonnaises."),
]

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
SIGNATURE_PDF = b"%PDF-"
TAILLE_MAX_OCTETS = 20 * 1024 * 1024   # 20 Mo

# Images jointes aux actualités. Mêmes principes : on reconnaît le type sur les
# premiers octets, jamais sur l'extension. Le SVG est volontairement absent —
# c'est un format XML qui peut contenir du script, donc une image qui exécute
# du code chez le visiteur.
MEDIAS = DONNEES / "medias"
SIGNATURES_IMAGE = {
    "image/jpeg": b"\xff\xd8\xff",
    "image/png": b"\x89PNG\r\n\x1a\n",
    "image/gif": b"GIF8",
    "image/webp": b"RIFF",          # + "WEBP" en octets 8-12, vérifié à l'envoi
}
TAILLE_MAX_IMAGE = 8 * 1024 * 1024     # 8 Mo

# --- Authentification ------------------------------------------------------
# Le mot de passe n'est JAMAIS dans le code ni dans le dépôt : il arrive par
# l'environnement, sous forme de condensat produit par `python3 -m backoffice.auth`.
# Voir README. Sans cette variable, l'application refuse de démarrer plutôt que
# de tourner avec un mot de passe par défaut — un back-office ouvert publierait
# n'importe quoi sur le site d'une mairie.
def _condensat():
    """Variable d'environnement en priorité, sinon fichier local de développement.

    En production (OVH), c'est l'environnement du service systemd : rien sur le
    disque, rien dans le dépôt. En développement, retaper un `export` de 120
    caractères à chaque terminal est le genre de friction qui fait abandonner —
    `lancer.sh` écrit donc le CONDENSAT (jamais le mot de passe) dans
    donnees/, qui est ignoré par git.
    """
    depuis_env = os.environ.get("BO_MOT_DE_PASSE_HACHE", "").strip()
    if depuis_env:
        return depuis_env
    fichier = DONNEES / "mot-de-passe.hash"
    if fichier.is_file():
        return fichier.read_text(encoding="utf-8").strip()
    return ""


CONDENSAT_MOT_DE_PASSE = _condensat()

# Durée d'une session avant reconnexion.
SESSION_DUREE_H = 12

COOKIE_NOM = "bo_session"

# Le drapeau `Secure` du cookie n'est PAS une constante : il se déduit du schéma
# de la requête (voir app.py). Posé en dur à True, la connexion échouait en
# http://localhost sans message compréhensible — le serveur répondait « c'est
# bon », le navigateur jetait le cookie, et l'application revenait à l'écran de
# connexion en boucle. C'est le genre de panne qu'on ne diagnostique pas, on
# l'abandonne. Derrière un tunnel ou nginx, le schéma est https et le drapeau
# revient tout seul.
