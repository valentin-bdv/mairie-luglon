"""
db.py — Schéma SQLite et accès aux données. Aucune logique HTTP ici.

POURQUOI SQLITE ET PAS POSTGRES : un seul rédacteur (le secrétariat), quelques
centaines de lignes, aucune concurrence réelle. SQLite est un fichier — pas de
processus à surveiller, pas de mot de passe de base, pas de port ouvert, et la
sauvegarde est une copie. Postgres ajouterait de l'exploitation sans rien
apporter à cette échelle.

Le schéma est créé au démarrage s'il n'existe pas (`initialiser`). Il n'y a pas
de système de migration : à ce volume, une modification de schéma se fait à la
main sur un fichier sauvegardé au préalable. En introduire un serait plus de
code à maintenir que de lignes en base.
"""

import sqlite3
import datetime

from . import config


SCHEMA = """
CREATE TABLE IF NOT EXISTS actualites (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    titre           TEXT NOT NULL,
    categorie       TEXT NOT NULL,   -- s'affiche dans .event-card__tag
    date_evenement  TEXT NOT NULL,   -- AAAA-MM-JJ ; pilote le badge À venir/Terminé
    lieu            TEXT NOT NULL DEFAULT '',
    texte           TEXT NOT NULL,
    meta            TEXT NOT NULL DEFAULT '',  -- petite ligne sous le texte
    lien_url        TEXT NOT NULL DEFAULT '',  -- « En savoir plus », vide si aucun
    publie_le       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    titre           TEXT NOT NULL,
    rubrique        TEXT NOT NULL,   -- une clé de config.RUBRIQUES
    date_document   TEXT NOT NULL,   -- AAAA-MM-JJ
    fichier         TEXT NOT NULL,   -- nom sur disque, généré, jamais celui de l'envoi
    nom_affiche     TEXT NOT NULL,   -- nom d'origine, pour le téléchargement
    taille_octets   INTEGER NOT NULL,
    publie_le       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    jeton       TEXT PRIMARY KEY,
    expire_le   TEXT NOT NULL
);
"""


def connexion():
    config.DONNEES.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(config.BASE_SQLITE)
    conn.row_factory = sqlite3.Row
    # Les clés étrangères ne servent pas encore, mais l'oubli de ce PRAGMA est
    # le piège classique de SQLite le jour où on en ajoute une.
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def initialiser():
    config.DEPOTS.mkdir(parents=True, exist_ok=True)
    with connexion() as conn:
        conn.executescript(SCHEMA)


def _maintenant():
    return datetime.datetime.now().isoformat(timespec="seconds")


# --- Actualités ------------------------------------------------------------
#
# L'ORDRE EST CELUI DE LA DATE D'ÉVÈNEMENT, décroissante — pas celui de
# publication. Une actualité saisie aujourd'hui à propos d'une réunion de l'an
# dernier ne doit pas passer devant la fête du mois prochain. C'est aussi ce qui
# rend la bascule vers « autres actualités » compréhensible pour le visiteur :
# la page principale montre ce qui vient, l'archive montre ce qui est passé.

def actualites(limite=None, decalage=0):
    sql = "SELECT * FROM actualites ORDER BY date_evenement DESC, id DESC"
    params = []
    if limite is not None:
        sql += " LIMIT ? OFFSET ?"
        params = [limite, decalage]
    with connexion() as conn:
        return [dict(r) for r in conn.execute(sql, params)]


def compter_actualites():
    with connexion() as conn:
        return conn.execute("SELECT COUNT(*) AS n FROM actualites").fetchone()["n"]


def ajouter_actualite(données):
    with connexion() as conn:
        cur = conn.execute(
            """INSERT INTO actualites
               (titre, categorie, date_evenement, lieu, texte, meta, lien_url, publie_le)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (données["titre"], données["categorie"], données["date_evenement"],
             données.get("lieu", ""), données["texte"], données.get("meta", ""),
             données.get("lien_url", ""), _maintenant()))
        return cur.lastrowid


def supprimer_actualite(id_):
    with connexion() as conn:
        conn.execute("DELETE FROM actualites WHERE id = ?", (id_,))


# --- Documents -------------------------------------------------------------

def documents(rubrique=None):
    sql = "SELECT * FROM documents"
    params = []
    if rubrique:
        sql += " WHERE rubrique = ?"
        params = [rubrique]
    sql += " ORDER BY date_document DESC, id DESC"
    with connexion() as conn:
        return [dict(r) for r in conn.execute(sql, params)]


def document(id_):
    with connexion() as conn:
        r = conn.execute("SELECT * FROM documents WHERE id = ?", (id_,)).fetchone()
        return dict(r) if r else None


def ajouter_document(données):
    with connexion() as conn:
        cur = conn.execute(
            """INSERT INTO documents
               (titre, rubrique, date_document, fichier, nom_affiche, taille_octets, publie_le)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (données["titre"], données["rubrique"], données["date_document"],
             données["fichier"], données["nom_affiche"], données["taille_octets"],
             _maintenant()))
        return cur.lastrowid


def supprimer_document(id_):
    """Retire la ligne ET le fichier. L'ordre compte : on efface le disque en
    dernier, pour qu'une interruption laisse un fichier orphelin (inoffensif)
    plutôt qu'une ligne pointant vers un fichier absent (page cassée)."""
    doc = document(id_)
    if not doc:
        return
    with connexion() as conn:
        conn.execute("DELETE FROM documents WHERE id = ?", (id_,))
    chemin = config.DEPOTS / doc["fichier"]
    chemin.unlink(missing_ok=True)
