"""
courriel.py — Envoi des messages du formulaire de contact vers la mairie.

CE QUI DÉCIDE DE TOUT : les réglages SMTP dans l'environnement. Sans eux,
`configure()` est faux et l'application n'essaie pas d'envoyer — elle enregistre
quand même le message en base, et le formulaire dit honnêtement à la personne
que son message n'est pas parti. On ne prétend jamais avoir transmis.

DEUX RÈGLES D'EN-TÊTE, ET ELLES NE SONT PAS COSMÉTIQUES
-------------------------------------------------------
1. Le `From:` est TOUJOURS une adresse du domaine que ce serveur est autorisé à
   utiliser. Jamais celle du visiteur. Mettre `From: jean.dupont@gmail.com`
   revient à usurper Gmail : les vérifications SPF et DKIM échouent, DMARC fait
   rejeter le message, et la mairie ne reçoit rien — sans qu'aucune erreur ne
   remonte au visiteur.
2. Le `Reply-To:` porte l'adresse du visiteur. C'est ce qui permet au
   secrétariat de répondre d'un simple « Répondre », sans recopier l'adresse.

Sans SPF et DKIM correctement publiés pour le domaine d'envoi, le message part
mais atterrit en indésirable. C'est une configuration DNS, pas du code : voir
backoffice/README.md.
"""

import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, parseaddr


# --- Réglages, tous dans l'environnement -----------------------------------
# Aucun identifiant dans le dépôt, jamais. Sur OVH, ils viennent de l'unité
# systemd ; en développement, d'un fichier .env non versionné qu'on source.
SERVEUR = os.environ.get("BO_SMTP_SERVEUR", "")
PORT = int(os.environ.get("BO_SMTP_PORT", "587"))
UTILISATEUR = os.environ.get("BO_SMTP_UTILISATEUR", "")
MOT_DE_PASSE = os.environ.get("BO_SMTP_MOT_DE_PASSE", "")

# Adresse d'expédition : celle pour laquelle le serveur SMTP est autorisé.
EXPEDITEUR = os.environ.get("BO_SMTP_EXPEDITEUR", "")
# Boîte qui reçoit les messages du formulaire.
DESTINATAIRE = os.environ.get("BO_CONTACT_DESTINATAIRE", "accueil@mairie-luglon.fr")

# STARTTLS (port 587) par défaut ; SSL direct (port 465) si BO_SMTP_SSL=1.
SSL_DIRECT = os.environ.get("BO_SMTP_SSL", "0") == "1"

# BO_SMTP_TLS=0 désactive le chiffrement. À N'UTILISER QUE pour un relais qui
# tourne sur la machine elle-même (Postfix sur localhost:25) : la connexion ne
# quitte alors pas le serveur. Vers un serveur distant, c'est le mot de passe
# et le contenu des messages qui circuleraient en clair.
TLS = os.environ.get("BO_SMTP_TLS", "1") != "0"


def configure() -> bool:
    return bool(SERVEUR and EXPEDITEUR)


def _entete_sur_une_ligne(valeur: str) -> str:
    """Neutralise les retours à la ligne d'une valeur destinée à un en-tête.

    Un « \\n » glissé dans le nom ou le sujet permettrait d'injecter un en-tête
    entier — un `Bcc:` vers l'expéditeur, par exemple, transformant le
    formulaire de la mairie en relais d'envoi. `EmailMessage` refuse déjà les
    en-têtes multilignes, mais on nettoie en amont plutôt que de compter sur
    une exception à l'exécution.
    """
    return " ".join(str(valeur or "").splitlines()).strip()


def envoyer_message_contact(m: dict, libelle_sujet: str):
    """Transmet un message du formulaire. Lève en cas d'échec.

    L'appelant décide quoi faire de l'échec ; ici on ne l'avale pas, sinon le
    visiteur verrait « message envoyé » alors que rien n'est parti.
    """
    if not configure():
        raise RuntimeError("Aucun serveur d'envoi configuré.")

    _, adresse_visiteur = parseaddr(m["email"])
    nom = _entete_sur_une_ligne(m["nom"])

    msg = EmailMessage()
    msg["Subject"] = _entete_sur_une_ligne(f"[Site] {libelle_sujet} — {nom}")
    # Voir l'en-tête du fichier : l'expéditeur est le site, pas le visiteur.
    msg["From"] = formataddr((f"Site de la Mairie de Luglon", EXPEDITEUR))
    msg["To"] = DESTINATAIRE
    if adresse_visiteur:
        msg["Reply-To"] = formataddr((nom, adresse_visiteur))

    msg.set_content(
        f"Message reçu depuis le formulaire de contact du site.\n"
        f"\n"
        f"Nom       : {nom}\n"
        f"E-mail    : {adresse_visiteur}\n"
        f"Téléphone : {m.get('telephone') or '—'}\n"
        f"Sujet     : {libelle_sujet}\n"
        f"\n"
        f"----------------------------------------------------------\n"
        f"{m['message']}\n"
        f"----------------------------------------------------------\n"
        f"\n"
        f"Répondez directement à ce message : la réponse partira vers\n"
        f"l'adresse du demandeur.\n"
    )

    contexte = ssl.create_default_context()
    if SSL_DIRECT:
        with smtplib.SMTP_SSL(SERVEUR, PORT, context=contexte, timeout=20) as s:
            if UTILISATEUR:
                s.login(UTILISATEUR, MOT_DE_PASSE)
            s.send_message(msg)
    else:
        with smtplib.SMTP(SERVEUR, PORT, timeout=20) as s:
            if TLS:
                s.starttls(context=contexte)
            if UTILISATEUR:
                s.login(UTILISATEUR, MOT_DE_PASSE)
            s.send_message(msg)
