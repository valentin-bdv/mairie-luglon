"""
auth.py — Mot de passe et sessions.

DEUX PROPRIÉTÉS À NE PAS PERDRE :

1. L'application installée chez le client ne détient AUCUN secret. Elle envoie
   un mot de passe une fois, elle reçoit un cookie de session. Il n'y a ni jeton
   OVH, ni clé d'API, ni identifiant de dépôt dans la PWA — même en fouillant
   les fichiers de l'app installée, on ne trouve rien d'exploitable ailleurs.
   C'est la raison pour laquelle un back-office impose un serveur : les clés
   restent côté serveur, jamais sur le poste du client.

2. Le mot de passe n'est jamais stocké en clair, ni dans le code, ni dans le
   dépôt, ni en base. Seul son condensat vit dans l'environnement.

PBKDF2-HMAC-SHA256, de la bibliothèque standard : aucune dépendance à
installer, et c'est une fonction conçue pour les mots de passe — lente par
construction — contrairement à un SHA-256 nu qui se casse au dictionnaire.

Pourquoi pas scrypt, pourtant meilleur ? Parce qu'il n'est présent que si le
Python a été compilé avec un OpenSSL récent : `hashlib.scrypt` n'existe pas sur
le Python livré avec macOS, par exemple. Un back-office qui refuse de démarrer
selon la machine n'est pas acceptable, et PBKDF2 avec un nombre d'itérations
élevé reste parfaitement défendable pour un mot de passe unique tapé deux fois
par semaine.

Le condensat est rangé DANS LA BASE, comme le reste des données : même
sauvegarde, rien de plus à retrouver. Une variable d'environnement
(BO_MOT_DE_PASSE_HACHE) le remplace quand elle existe, pour qu'un serveur puisse
imposer le mot de passe depuis la configuration de son service.

Pour définir ou changer le mot de passe :

    python3 -m backoffice.auth
"""

import base64
import hashlib
import hmac
import os
import secrets
import datetime

from . import config, db


# Coût volontairement élevé : on authentifie une personne deux fois par semaine,
# pas mille requêtes par seconde. 600 000 itérations est la recommandation OWASP
# pour PBKDF2-HMAC-SHA256 ; le nombre est stocké DANS le condensat, pour pouvoir
# l'augmenter plus tard sans invalider les mots de passe déjà en place.
_ITERATIONS = 600_000


def _derive(mot_de_passe: str, sel: bytes, iterations: int) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", mot_de_passe.encode(), sel, iterations)


def fabriquer_condensat(mot_de_passe: str) -> str:
    sel = os.urandom(16)
    brut = _derive(mot_de_passe, sel, _ITERATIONS)
    return "$".join(["pbkdf2-sha256", str(_ITERATIONS),
                     base64.b64encode(sel).decode(),
                     base64.b64encode(brut).decode()])


CLE_REGLAGE = "mot_de_passe"


def condensat() -> str:
    """Le condensat en vigueur : variable d'environnement, sinon base.

    LU À CHAQUE APPEL, jamais mémorisé à l'import. Une constante figée au
    démarrage obligeait à redémarrer le service après un changement de mot de
    passe — et pire, laissait croire que le changement n'avait pas pris.

    L'environnement garde la priorité : sur un serveur, on veut pouvoir imposer
    un mot de passe depuis la configuration du service sans dépendre de ce que
    contient la base.
    """
    depuis_env = os.environ.get("BO_MOT_DE_PASSE_HACHE", "").strip()
    return depuis_env or db.reglage(CLE_REGLAGE)


def definir_mot_de_passe(mot_de_passe: str):
    """Enregistre le condensat en base. Le mot de passe lui-même n'y entre pas."""
    db.definir_reglage(CLE_REGLAGE, fabriquer_condensat(mot_de_passe))


def mot_de_passe_configure() -> bool:
    return bool(condensat())


def verifier_mot_de_passe(mot_de_passe: str) -> bool:
    c = condensat()
    if not c or c.count("$") != 3:
        return False
    _, iterations, sel_b64, attendu_b64 = c.split("$")
    try:
        sel = base64.b64decode(sel_b64)
        attendu = base64.b64decode(attendu_b64)
        iterations = int(iterations)
    except (ValueError, Exception):
        return False
    calcule = _derive(mot_de_passe, sel, iterations)
    # compare_digest et non « == » : une comparaison naïve s'interrompt au
    # premier octet différent et laisse mesurer où elle s'arrête.
    return hmac.compare_digest(calcule, attendu)


# --- Sessions --------------------------------------------------------------
# Stockées en base plutôt que dans un cookie signé : ça évite une dépendance de
# plus, et surtout ça rend la déconnexion réelle (un jeton supprimé ne vaut
# plus rien, alors qu'un cookie signé reste valable jusqu'à son expiration même
# après un « se déconnecter »).

def ouvrir_session() -> str:
    jeton = secrets.token_urlsafe(32)
    expire = datetime.datetime.now() + datetime.timedelta(hours=config.SESSION_DUREE_H)
    with db.connexion() as conn:
        conn.execute("INSERT INTO sessions (jeton, expire_le) VALUES (?, ?)",
                     (jeton, expire.isoformat(timespec="seconds")))
    return jeton


def session_valide(jeton: str) -> bool:
    if not jeton:
        return False
    maintenant = datetime.datetime.now().isoformat(timespec="seconds")
    with db.connexion() as conn:
        # Ménage opportuniste : pas de tâche planifiée à surveiller pour si peu.
        conn.execute("DELETE FROM sessions WHERE expire_le < ?", (maintenant,))
        ligne = conn.execute("SELECT 1 FROM sessions WHERE jeton = ?", (jeton,)).fetchone()
    return ligne is not None


def fermer_session(jeton: str):
    if not jeton:
        return
    with db.connexion() as conn:
        conn.execute("DELETE FROM sessions WHERE jeton = ?", (jeton,))


if __name__ == "__main__":
    import getpass

    db.initialiser()
    if mot_de_passe_configure():
        print("  Un mot de passe est déjà configuré. Le nouveau le remplacera.")

    mdp = getpass.getpass("  Mot de passe du back-office : ")
    if len(mdp) < 12:
        raise SystemExit("\n  Trop court : 12 caractères minimum. Ce mot de passe "
                         "protège la publication sur le site d'une mairie.")
    if mdp != getpass.getpass("  Confirmation : "):
        raise SystemExit("\n  Les deux saisies diffèrent.")

    definir_mot_de_passe(mdp)
    print("\n  Mot de passe enregistré en base. Il est retenu d'un lancement à l'autre.")
