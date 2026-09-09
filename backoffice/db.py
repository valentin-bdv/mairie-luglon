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
    rubrique        TEXT NOT NULL,   -- une clé de config.RUBRIQUES_ACTUALITES
    date_evenement  TEXT NOT NULL,   -- AAAA-MM-JJ ; pilote le badge À venir/Terminé
    lieu            TEXT NOT NULL DEFAULT '',
    contenu         TEXT NOT NULL,   -- HTML DÉJÀ ASSAINI (voir contenu.py)
    extrait         TEXT NOT NULL DEFAULT '',  -- texte brut, pour les cartes du sommaire
    lien_url        TEXT NOT NULL DEFAULT '',  -- « En savoir plus » externe, souvent vide
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

-- Les rubriques vivent en base, pas dans le code : le secrétariat doit pouvoir
-- en créer, en renommer et en supprimer sans intervention. config.py ne fournit
-- plus que le jeu de DÉPART, semé au premier démarrage — ce qui reste ce qu'il
-- faut modifier pour installer chez un autre client.
CREATE TABLE IF NOT EXISTS rubriques_actualites (
    cle         TEXT PRIMARY KEY,     -- sert d'URL : /actualites/<cle>/
    libelle     TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    ordre       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rubriques_documents (
    cle         TEXT PRIMARY KEY,
    libelle     TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    ordre       INTEGER NOT NULL DEFAULT 0
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
    """Crée le schéma s'il manque, et rattrape les schémas anciens.

    `CREATE TABLE IF NOT EXISTS` ne touche PAS une table déjà créée avec
    d'autres colonnes. Sans le rattrapage ci-dessous, une base d'hier reste
    intacte sur le disque mais devient illisible par le code d'aujourd'hui : les
    actualités sont toujours là, et pourtant le site les affiche comme si elles
    n'existaient pas. C'est arrivé une fois, et « mes données ont disparu » est
    la pire chose qu'un outil puisse faire croire à quelqu'un.

    Il n'y a pas de système de migration versionné pour autant : à ce volume,
    ce serait plus de code à maintenir que de lignes à protéger. On répare les
    écarts connus, un par un, et on les documente ici.
    """
    config.DEPOTS.mkdir(parents=True, exist_ok=True)
    config.MEDIAS.mkdir(parents=True, exist_ok=True)
    with connexion() as conn:
        conn.executescript(SCHEMA)
        _rattraper_schema(conn)
        _semer_rubriques(conn)


def _rattraper_schema(conn):
    """Renomme les colonnes de l'ancien schéma d'actualités.

    Avant les rubriques, la table portait `categorie` (texte libre) et `texte`
    (sans mise en forme). Elle porte maintenant `rubrique` (une clé) et
    `contenu` (du HTML assaini), plus `extrait`. On récupère les lignes plutôt
    que de demander à quelqu'un de retaper ses actualités.
    """
    colonnes = {r["name"] for r in conn.execute("PRAGMA table_info(actualites)")}
    if "categorie" not in colonnes and "texte" not in colonnes:
        return          # schéma déjà à jour, cas normal

    if "rubrique" not in colonnes:
        conn.execute("ALTER TABLE actualites ADD COLUMN rubrique TEXT NOT NULL DEFAULT ''")
    if "contenu" not in colonnes:
        conn.execute("ALTER TABLE actualites ADD COLUMN contenu TEXT NOT NULL DEFAULT ''")
    if "extrait" not in colonnes:
        conn.execute("ALTER TABLE actualites ADD COLUMN extrait TEXT NOT NULL DEFAULT ''")

    # L'ancienne « catégorie » était du texte libre : elle ne correspond à
    # aucune clé de rubrique. On range tout dans la première rubrique déclarée
    # plutôt que d'inventer une correspondance — le secrétariat déplacera, et au
    # moins les actualités réapparaissent.
    defaut = config.RUBRIQUES_ACTUALITES[0][0]
    conn.execute("UPDATE actualites SET rubrique = ? WHERE rubrique = ''", (defaut,))

    if "texte" in colonnes:
        # L'ancien texte était brut : on l'enveloppe dans un paragraphe pour
        # qu'il s'affiche correctement dans le nouveau rendu HTML.
        conn.execute(
            "UPDATE actualites SET contenu = '<p>' || replace(replace(texte, '&', '&amp;'), '<', '&lt;') || '</p>' "
            "WHERE contenu = '' AND texte <> ''")
        conn.execute("UPDATE actualites SET extrait = substr(texte, 1, 180) WHERE extrait = ''")

    print("  base : ancien schéma d'actualités rattrapé, les lignes sont conservées")


def _semer_rubriques(conn):
    """Sème les rubriques de config.py, une seule fois.

    On ne sème QUE si la table est vide. Sinon, une rubrique supprimée par le
    secrétariat réapparaîtrait au redémarrage suivant — le genre de « bug »
    qu'on met des heures à comprendre parce qu'il ne se manifeste qu'après un
    redéploiement.
    """
    for table, source in (("rubriques_actualites", config.RUBRIQUES_ACTUALITES),
                          ("rubriques_documents", config.RUBRIQUES_DOCUMENTS)):
        vide = conn.execute(f"SELECT COUNT(*) AS n FROM {table}").fetchone()["n"] == 0
        if not vide:
            continue
        for i, (cle, libelle, description) in enumerate(source):
            conn.execute(
                f"INSERT INTO {table} (cle, libelle, description, ordre) VALUES (?, ?, ?, ?)",
                (cle, libelle, description, i))


# --- Rubriques -------------------------------------------------------------
# Deux familles (actualités, documents) au comportement identique : mêmes
# opérations, mêmes contraintes. Un seul jeu de fonctions paramétré par la
# table, plutôt que deux jeux jumeaux qui divergeront.

_TABLES_RUBRIQUES = {
    "actualites": ("rubriques_actualites", "actualites"),
    "documents": ("rubriques_documents", "documents"),
}


def rubriques(famille):
    table, _ = _TABLES_RUBRIQUES[famille]
    with connexion() as conn:
        return [dict(r) for r in conn.execute(
            f"SELECT * FROM {table} ORDER BY ordre, libelle")]


def rubrique(famille, cle):
    table, _ = _TABLES_RUBRIQUES[famille]
    with connexion() as conn:
        r = conn.execute(f"SELECT * FROM {table} WHERE cle = ?", (cle,)).fetchone()
        return dict(r) if r else None


def ajouter_rubrique(famille, cle, libelle, description):
    table, _ = _TABLES_RUBRIQUES[famille]
    with connexion() as conn:
        rang = conn.execute(f"SELECT COALESCE(MAX(ordre), -1) + 1 AS n FROM {table}").fetchone()["n"]
        conn.execute(
            f"INSERT INTO {table} (cle, libelle, description, ordre) VALUES (?, ?, ?, ?)",
            (cle, libelle, description, rang))


def modifier_rubrique(famille, cle, libelle, description):
    """Le libellé et la description changent ; LA CLÉ NON.

    La clé est l'URL de la page (/actualites/vie-du-village/) : la renommer
    casserait tous les liens déjà partagés, imprimés dans un bulletin ou
    référencés par un moteur de recherche. Renommer « Travaux » en « Voirie »
    change le titre affiché, pas l'adresse.
    """
    table, _ = _TABLES_RUBRIQUES[famille]
    with connexion() as conn:
        conn.execute(f"UPDATE {table} SET libelle = ?, description = ? WHERE cle = ?",
                     (libelle, description, cle))


def compter_dans_rubrique(famille, cle):
    _, table_contenu = _TABLES_RUBRIQUES[famille]
    with connexion() as conn:
        return conn.execute(
            f"SELECT COUNT(*) AS n FROM {table_contenu} WHERE rubrique = ?", (cle,)).fetchone()["n"]


def supprimer_rubrique(famille, cle):
    """Refuse de supprimer une rubrique qui contient encore quelque chose.

    Sans ce garde-fou, des actualités resteraient en base sans page pour les
    afficher : invisibles sur le site, invisibles dans l'administration, et
    pourtant présentes. Mieux vaut un refus explicite qu'un contenu fantôme.
    """
    if compter_dans_rubrique(famille, cle):
        raise ValueError("Cette rubrique contient encore des éléments : "
                         "déplacez-les ou supprimez-les d'abord.")
    table, _ = _TABLES_RUBRIQUES[famille]
    with connexion() as conn:
        conn.execute(f"DELETE FROM {table} WHERE cle = ?", (cle,))


def _maintenant():
    return datetime.datetime.now().isoformat(timespec="seconds")


# --- Actualités ------------------------------------------------------------
#
# L'ORDRE EST CELUI DE LA DATE D'ÉVÈNEMENT, décroissante — pas celui de
# publication. Une actualité saisie aujourd'hui à propos d'une réunion de l'an
# dernier ne doit pas passer devant la fête du mois prochain. C'est aussi ce qui
# rend la bascule vers « autres actualités » compréhensible pour le visiteur :
# la page principale montre ce qui vient, l'archive montre ce qui est passé.

def actualites(rubrique=None, limite=None):
    sql = "SELECT * FROM actualites"
    params = []
    if rubrique:
        sql += " WHERE rubrique = ?"
        params.append(rubrique)
    sql += " ORDER BY date_evenement DESC, id DESC"
    if limite is not None:
        sql += " LIMIT ?"
        params.append(limite)
    with connexion() as conn:
        return [dict(r) for r in conn.execute(sql, params)]


def compter_actualites(rubrique=None):
    sql = "SELECT COUNT(*) AS n FROM actualites"
    params = []
    if rubrique:
        sql += " WHERE rubrique = ?"
        params.append(rubrique)
    with connexion() as conn:
        return conn.execute(sql, params).fetchone()["n"]


def ajouter_actualite(données):
    with connexion() as conn:
        cur = conn.execute(
            """INSERT INTO actualites
               (titre, rubrique, date_evenement, lieu, contenu, extrait, lien_url, publie_le)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (données["titre"], données["rubrique"], données["date_evenement"],
             données.get("lieu", ""), données["contenu"], données.get("extrait", ""),
             données.get("lien_url", ""), _maintenant()))
        return cur.lastrowid


def actualite(id_):
    with connexion() as conn:
        r = conn.execute("SELECT * FROM actualites WHERE id = ?", (id_,)).fetchone()
        return dict(r) if r else None


def modifier_actualite(id_, données):
    with connexion() as conn:
        conn.execute(
            """UPDATE actualites SET titre = ?, rubrique = ?, date_evenement = ?,
                                     lieu = ?, contenu = ?, extrait = ?, lien_url = ?
               WHERE id = ?""",
            (données["titre"], données["rubrique"], données["date_evenement"],
             données.get("lieu", ""), données["contenu"], données.get("extrait", ""),
             données.get("lien_url", ""), id_))


def supprimer_actualite(id_):
    """Retire la ligne. Les images qu'elle contenait restent sur le disque.

    C'est délibéré : rien ne dit qu'une image n'est pas réutilisée dans une
    autre actualité, et les traquer demanderait d'analyser le HTML de toutes les
    lignes à chaque suppression. Quelques fichiers orphelins sur un disque
    coûtent moins cher qu'une image qui disparaît d'un article encore publié.
    """
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


def modifier_document(id_, données):
    """Le titre, la rubrique et la date changent ; le FICHIER non.

    Remplacer le fichier reviendrait à publier un autre document sous la même
    entrée, sans trace du changement. Pour cela : supprimer et redéposer.
    """
    with connexion() as conn:
        conn.execute(
            "UPDATE documents SET titre = ?, rubrique = ?, date_document = ? WHERE id = ?",
            (données["titre"], données["rubrique"], données["date_document"], id_))


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
