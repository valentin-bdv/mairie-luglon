"""
app.py — Le serveur : pages publiques rendues, API du back-office, site statique.

UNE SEULE APPLICATION SERT TOUT. Le site, l'API de réservation et le back-office
partagent la même origine. Ce n'est pas de la commodité : c'est ce qui permet au
cookie de session de fonctionner sans configuration, à la politique de sécurité
du site (`connect-src 'self'`) de rester la même dans tous les environnements, et
à `API_BASE` de rester un chemin relatif (voir config.js du site). Un
back-office sur un autre domaine imposerait du CORS, une seconde politique et un
second certificat, pour aucun bénéfice.

CE QUI EST RENDU PAR LE SERVEUR, ET CE QUI RESTE UN FICHIER
Trois pages seulement sortent d'ici : les deux pages d'actualités et la page
arrêtés et publications. Les vingt et une autres restent les fichiers HTML
qu'elles ont toujours été, servies telles quelles par le montage statique de fin
de fichier. C'est délibéré : seules ces trois pages portent du contenu qui bouge
entre deux visites du secrétariat, et convertir les autres en gabarits
multiplierait le travail sans rien rendre de plus modifiable.

Le contenu part donc dans le HTML, pas en JavaScript. C'est une contrainte du
dépôt, pas un choix d'ici : les pages doivent rester lisibles par un moteur de
recherche et par un visiteur sans JS (voir le commentaire d'events.js).

CONSÉQUENCE À CONNAÎTRE : sur GitHub Pages, ces trois URL retombent sur les
fichiers statiques du dépôt, qui montrent le contenu de démonstration. C'est le
même « théâtre » que le formulaire de réservation — acceptable tant que GitHub
Pages est l'aperçu de développement et non le site livré.
"""

import datetime
import sys
import mimetypes
import pathlib
import re
import secrets
import urllib.parse

from fastapi import FastAPI, Request, Response, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from . import config, db, auth, contenu

app = FastAPI(title=f"{config.SITE_NOM} — site et back-office")
gabarits = Jinja2Templates(directory=str(config.BASE / "templates"))

P = config.PREFIXE_URL.rstrip("/")   # '' ou '/mairie-luglon'
# Chemin de l'administration, réglable (voir config.ADMIN_CHEMIN). Toutes les
# routes et le cookie en dépendent : rien ne doit écrire "/admin" en dur.
A = P + config.ADMIN_CHEMIN


@app.on_event("startup")
def demarrage():
    db.initialiser()
    if not config.CONDENSAT_MOT_DE_PASSE:
        # Refus de démarrer plutôt qu'un back-office ouvert : celui-ci publie
        # sur le site d'une mairie, un mot de passe par défaut n'est pas une
        # option acceptable même « le temps des tests ».
        #
        # Message écrit à la main sur la sortie d'erreur AVANT de lever :
        # uvicorn enrobe l'exception dans une trace d'une douzaine de lignes où
        # la cause se perd, et un démarrage qui échoue de façon illisible est un
        # démarrage qu'on abandonne.
        print(
            "\n"
            "  Aucun mot de passe d'administration n'est configuré.\n"
            "\n"
            "  Le plus simple :   ./backoffice/lancer.sh\n"
            "  À la main      :   python3 -m backoffice.auth\n"
            "                     puis exporter BO_MOT_DE_PASSE_HACHE\n",
            file=sys.stderr)
        raise RuntimeError("Mot de passe d'administration non configuré.")


# ---------------------------------------------------------------------------
# Contexte commun aux gabarits publics
# ---------------------------------------------------------------------------

MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
           "août", "septembre", "octobre", "novembre", "décembre"]


def date_fr(iso: str, jour: bool = False) -> str:
    """« Juillet 2027 », ou « 10 juillet 2027 » avec jour=True.

    Écrit à la main plutôt qu'avec `locale` : le formatage par locale dépend des
    paquets de langue installés sur la machine, ce qui donne un site en anglais
    sur un serveur fraîchement provisionné — une panne invisible en
    développement et visible en production.
    """
    try:
        a, m, j = (int(x) for x in iso.split("-"))
    except (ValueError, AttributeError):
        return iso
    mois = MOIS_FR[m - 1]
    return f"{j} {mois} {a}" if jour else f"{mois.capitalize()} {a}"


def contexte(request, **extra):
    chemin = request.url.path

    def courant(cible: str) -> str:
        """Marque l'onglet et l'entrée de sous-menu correspondant à la page.

        Le site statique pose `aria-current` à la main dans chacun de ses
        fichiers ; ici les pages partagent un gabarit, donc c'est calculé. Sans
        cette fonction, toutes les pages rendues afficheraient l'onglet de celle
        qui a servi de modèle au gabarit.
        """
        page = chemin[len(P):] if P and chemin.startswith(P) else chemin
        if page == cible:
            return ' aria-current="page"'
        if cible != "/" and page.startswith(cible):
            return ' aria-current="true"'
        return ""

    base = {
        "request": request,
        "p": P,
        "site_nom": config.SITE_NOM,
        "site_url": config.SITE_URL,
        "courant": courant,
        "date_fr": date_fr,
    }
    base.update(extra)
    return base


def _badge(date_evenement: str) -> str:
    """« À venir » ou « Terminé », calculé côté serveur.

    events.js fait déjà ce calcul dans le navigateur pour les cartes statiques.
    On le refait ici pour que le badge soit juste dans le HTML envoyé, sans
    attendre le JS — un visiteur sans JavaScript, ou un moteur de recherche,
    doit voir la bonne mention. Les deux calculs coexistent sans se gêner : le
    script recalcule et retrouve la même valeur.
    """
    aujourdhui = datetime.date.today().isoformat()
    return "avenir" if date_evenement >= aujourdhui else "passe"


# ---------------------------------------------------------------------------
# Pages publiques rendues
# ---------------------------------------------------------------------------

@app.get(P + "/actualites/", response_class=HTMLResponse)
def page_actualites(request: Request):
    """Sommaire : les ACTUALITES_EN_UNE plus récentes DE CHAQUE RUBRIQUE.

    C'est là toute l'automatisation. Personne ne déplace jamais une actualité :
    publier la sixième d'une rubrique pousse mécaniquement la dernière hors du
    sommaire, où elle reste accessible sur la page de sa rubrique. La limite est
    une requête, pas un rangement.

    Les cartes du sommaire portent l'EXTRAIT, jamais le contenu riche : elles
    doivent rester courtes et de hauteur régulière. Le texte mis en forme et les
    images vivent sur la page de rubrique.
    """
    sections = []
    for cle, libelle, description in config.RUBRIQUES_ACTUALITES:
        recentes = db.actualites(rubrique=cle, limite=config.ACTUALITES_EN_UNE)
        sections.append({
            "cle": cle,
            "libelle": libelle,
            "description": description,
            "actualites": recentes,
            "reste": max(0, db.compter_actualites(cle) - len(recentes)),
        })
    return gabarits.TemplateResponse("actualites.html", contexte(
        request, sections=sections, badge=_badge))


@app.get(P + "/actualites/{cle}/", response_class=HTMLResponse)
def page_rubrique(request: Request, cle: str):
    """Une rubrique, ses actualités EN ENTIER.

    Contrairement au sommaire, on rend ici le contenu mis en forme et les
    images. C'est la conséquence du choix de structure : il n'y a pas de page
    par actualité, donc c'est la page de rubrique qui porte le détail.
    """
    rubrique = next((r for r in config.RUBRIQUES_ACTUALITES if r[0] == cle), None)
    if rubrique is None:
        raise HTTPException(404)
    return gabarits.TemplateResponse("rubrique.html", contexte(
        request, cle=cle, libelle=rubrique[1], description=rubrique[2],
        actualites=db.actualites(rubrique=cle), badge=_badge))


# Deux chemins pour la même image, volontairement. Les URL stockées dans le
# contenu des actualités s'écrivent SANS le préfixe du site (« /medias/x.jpg ») :
# c'est ce qui leur permet de survivre au passage de /mairie-luglon/ à la racine
# d'un vrai domaine, où le préfixe disparaît. Comme le site est servi sous un
# préfixe en développement, on répond aussi à la forme préfixée.
@app.get("/medias/{fichier}")
@app.get(P + "/medias/{fichier}")
def servir_media(fichier: str):
    """Image jointe à une actualité. Toujours `inline` : c'est une illustration."""
    if not re.fullmatch(r"[0-9a-f]{32}\.(jpg|png|gif|webp)", fichier):
        raise HTTPException(404)
    chemin = config.MEDIAS / fichier
    if not chemin.is_file():
        raise HTTPException(404)
    types = {"jpg": "image/jpeg", "png": "image/png",
             "gif": "image/gif", "webp": "image/webp"}
    return FileResponse(
        chemin, media_type=types[fichier.rsplit(".", 1)[1]],
        headers={"X-Content-Type-Options": "nosniff"})


@app.get(P + "/mairie/arretes-et-publications/", response_class=HTMLResponse)
def page_arretes(request: Request):
    par_rubrique = [
        (cle, libelle, db.documents(cle))
        for cle, libelle in config.RUBRIQUES
    ]
    return gabarits.TemplateResponse("arretes.html", contexte(
        request, par_rubrique=par_rubrique))


def _entete_nom(nom: str, telecharger: bool) -> str:
    """Fabrique un Content-Disposition sûr.

    `nom` vient de ce que le secrétariat a envoyé comme fichier : il peut
    contenir des accents, et surtout un guillemet ou un retour à la ligne, qui
    permettraient d'injecter un en-tête HTTP entier. D'où le nettoyage, plus la
    forme `filename*` de la RFC 5987 pour que les accents survivent quand même.
    """
    sans_danger = "".join(c for c in nom if c.isprintable() and c not in '"\\') or "document.pdf"
    ascii_seul = sans_danger.encode("ascii", "ignore").decode() or "document.pdf"
    disposition = "attachment" if telecharger else "inline"
    return (f'{disposition}; filename="{ascii_seul}"; '
            f"filename*=UTF-8''{urllib.parse.quote(sans_danger)}")


@app.get(P + "/documents/{fichier}")
def servir_document(fichier: str, telecharger: int = 0):
    """Sert un PDF déposé par le secrétariat.

    PAR DÉFAUT LE PDF S'OUVRE DANS LE LECTEUR DU NAVIGATEUR (`inline`), il ne se
    télécharge pas. Quasiment personne n'arrive sur cette page pour archiver un
    arrêté : on vient le lire. Un fichier qui part dans le dossier
    « Téléchargements » sans qu'on l'ait demandé est une petite agression, et
    oblige à aller le chercher pour faire ce qu'on voulait faire tout de suite.
    Le téléchargement reste possible, mais sur demande explicite —
    `?telecharger=1`, branché sur un lien à part dans la liste.

    `fichier` vient de la base, jamais de l'utilisateur, mais on revalide sa
    forme quand même : c'est la dernière barrière avant une lecture disque, et
    elle coûte une ligne. Le nom sur le disque est un identifiant fabriqué à
    l'envoi ; le nom d'origine ne sert qu'à l'affichage et au téléchargement.
    """
    if not re.fullmatch(r"[0-9a-f]{32}\.pdf", fichier):
        raise HTTPException(404)
    chemin = config.DEPOTS / fichier
    if not chemin.is_file():
        raise HTTPException(404)
    ligne = next((d for d in db.documents() if d["fichier"] == fichier), None)
    nom = ligne["nom_affiche"] if ligne else fichier
    return FileResponse(
        chemin, media_type="application/pdf",
        # `filename=` n'est PAS utilisé ici : il force `attachment`, donc le
        # téléchargement automatique. On compose l'en-tête nous-mêmes.
        headers={
            "Content-Disposition": _entete_nom(nom, bool(telecharger)),
            # nosniff : même avec un contrôle des octets à l'envoi, on interdit
            # au navigateur de deviner un autre type que celui annoncé.
            "X-Content-Type-Options": "nosniff",
        })


# ---------------------------------------------------------------------------
# API du site public : la demande de réservation de salle
# ---------------------------------------------------------------------------

@app.post(P.replace("/mairie-luglon", "") + "/api/reservation")
async def reservation(request: Request):
    """Reçoit une demande du formulaire de réservation.

    Le contrat observé par script.js est minimal : POST JSON, 200 en cas de
    succès. Ce qu'on en fait ensuite (mail au secrétariat, enregistrement) reste
    à décider ; en attendant, la demande est tracée dans le journal du service
    pour que rien ne se perde silencieusement pendant les essais.
    """
    demande = await request.json()
    print("  demande de réservation :", demande.get("name"), demande.get("dates"))
    return {"ok": True}


# ---------------------------------------------------------------------------
# Back-office : la PWA et son API
# ---------------------------------------------------------------------------

def _exige_session(request: Request):
    if not auth.session_valide(request.cookies.get(config.COOKIE_NOM, "")):
        raise HTTPException(401, "Session expirée")


@app.get(A, response_class=HTMLResponse)
def admin_sans_slash():
    # Le `scope` du manifeste est « …/admin/ » : sans la barre finale,
    # l'application installée se retrouve hors de son propre périmètre et
    # s'ouvre dans le navigateur au lieu de sa fenêtre.
    return RedirectResponse(A + "/")


@app.get(A + "/", response_class=HTMLResponse)
def admin(request: Request):
    return gabarits.TemplateResponse("admin.html", contexte(
        request, rubriques=config.RUBRIQUES,
        rubriques_actualites=config.RUBRIQUES_ACTUALITES,
        en_une=config.ACTUALITES_EN_UNE))


@app.get(A + "/sw.js")
def service_worker():
    """Servi depuis /admin/ et NON /admin/static/.

    Le périmètre d'un service worker ne peut pas remonter au-dessus de son
    propre chemin : à /admin/static/sw.js il ne contrôlerait que /admin/static/,
    et l'application ne serait pas installable. Même raison pour le manifeste
    juste en dessous — ses `start_url` et `scope` se résolvent relativement à
    l'URL où il est servi.
    """
    return FileResponse(config.BASE / "static" / "sw.js",
                        media_type="application/javascript")


@app.get(A + "/manifest.webmanifest")
def manifeste():
    return FileResponse(config.BASE / "static" / "manifest.webmanifest",
                        media_type="application/manifest+json")


@app.post(A + "/api/connexion")
async def connexion(request: Request, response: Response):
    corps = await request.json()
    if not auth.verifier_mot_de_passe(corps.get("mot_de_passe", "")):
        # Message volontairement identique quelle que soit la cause : ne pas
        # renseigner l'attaquant sur ce qui a échoué.
        raise HTTPException(401, "Mot de passe incorrect")
    jeton = auth.ouvrir_session()
    reponse = JSONResponse({"ok": True})
    reponse.set_cookie(
        config.COOKIE_NOM, jeton,
        httponly=True,          # illisible en JavaScript, donc involable par XSS
        # Déduit du schéma réel : https derrière un tunnel ou nginx, http en
        # local. Posé en dur à True, le navigateur jetait silencieusement le
        # cookie en http://localhost et l'application rebouclait sur l'écran de
        # connexion sans jamais dire pourquoi.
        secure=(request.url.scheme == "https"),
        samesite="lax",         # bloque l'envoi depuis un site tiers
        max_age=config.SESSION_DUREE_H * 3600,
        path=A + "/")
    return reponse


@app.post(A + "/api/deconnexion")
def deconnexion(request: Request):
    auth.fermer_session(request.cookies.get(config.COOKIE_NOM, ""))
    reponse = JSONResponse({"ok": True})
    reponse.delete_cookie(config.COOKIE_NOM, path=A + "/")
    return reponse


@app.get(A + "/api/etat")
def etat(request: Request):
    """Ce que la PWA affiche à l'ouverture : suis-je connecté, et que
    contient le site ?"""
    if not auth.session_valide(request.cookies.get(config.COOKIE_NOM, "")):
        return {"connecte": False}
    toutes = db.actualites()
    return {
        "connecte": True,
        "en_une": config.ACTUALITES_EN_UNE,
        "actualites": toutes,
        "documents": db.documents(),
    }


@app.post(A + "/api/actualites")
async def creer_actualite(request: Request):
    _exige_session(request)
    corps = await request.json()

    for champ in ("titre", "rubrique", "date_evenement"):
        if not str(corps.get(champ, "")).strip():
            raise HTTPException(400, f"Le champ « {champ} » est obligatoire.")
    if corps["rubrique"] not in {r[0] for r in config.RUBRIQUES_ACTUALITES}:
        raise HTTPException(400, "Rubrique inconnue.")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", corps["date_evenement"]):
        raise HTTPException(400, "Date attendue au format AAAA-MM-JJ.")

    # ASSAINISSEMENT CÔTÉ SERVEUR, TOUJOURS. L'éditeur du navigateur ne produit
    # que du balisage autorisé, mais rien n'oblige un client à passer par lui :
    # cette route accepte du JSON, et n'importe qui muni du mot de passe peut y
    # poster ce qu'il veut. Le filtre est ici, pas dans l'interface.
    html_propre = contenu.assainir(corps.get("contenu", ""))
    if not contenu.extrait(html_propre):
        raise HTTPException(400, "Le texte de l'actualité est vide.")

    lien = (corps.get("lien_url") or "").strip()
    if lien and not lien.startswith(("https://", "http://")):
        # Sans ce contrôle, un « javascript:… » collé dans le champ deviendrait
        # un lien exécutable sur la page publique.
        raise HTTPException(400, "Le lien doit commencer par https://")

    return {"ok": True, "id": db.ajouter_actualite({
        "titre": corps["titre"].strip(),
        "rubrique": corps["rubrique"],
        "date_evenement": corps["date_evenement"],
        "lieu": (corps.get("lieu") or "").strip(),
        "contenu": html_propre,
        "extrait": contenu.extrait(html_propre),
        "lien_url": lien,
    })}


@app.post(A + "/api/medias")
async def deposer_media(request: Request, fichier: UploadFile = File(...)):
    """Reçoit une image et renvoie son URL, que l'éditeur insère dans le texte.

    Le SVG est refusé : c'est du XML qui peut contenir du script, donc une
    « image » capable d'exécuter du code chez le visiteur. Les formats acceptés
    sont reconnus sur leurs premiers octets, jamais sur l'extension du nom.
    """
    _exige_session(request)
    octets = await fichier.read()
    if len(octets) > config.TAILLE_MAX_IMAGE:
        raise HTTPException(400, "Image trop lourde (8 Mo maximum).")

    extension = None
    for type_mime, signature in config.SIGNATURES_IMAGE.items():
        if octets.startswith(signature):
            if type_mime == "image/webp" and octets[8:12] != b"WEBP":
                continue          # RIFF sans WEBP : autre chose (audio WAV…)
            extension = {"image/jpeg": "jpg", "image/png": "png",
                         "image/gif": "gif", "image/webp": "webp"}[type_mime]
            break
    if extension is None:
        raise HTTPException(400, "Format non reconnu : JPEG, PNG, GIF ou WebP.")

    nom = secrets.token_hex(16) + "." + extension
    (config.MEDIAS / nom).write_bytes(octets)
    # SANS le préfixe du site : cette URL part dans le contenu de l'actualité,
    # donc en base, donc elle doit rester juste le jour où le site quitte
    # /mairie-luglon/ pour la racine d'un domaine. Voir servir_media().
    return {"ok": True, "url": f"/medias/{nom}"}


@app.delete(A + "/api/actualites/{id_}")
def effacer_actualite(request: Request, id_: int):
    _exige_session(request)
    db.supprimer_actualite(id_)
    return {"ok": True}


@app.post(A + "/api/documents")
async def deposer_document(
    request: Request,
    titre: str = Form(...),
    rubrique: str = Form(...),
    date_document: str = Form(...),
    fichier: UploadFile = File(...),
):
    _exige_session(request)

    if rubrique not in dict(config.RUBRIQUES):
        raise HTTPException(400, "Rubrique inconnue.")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_document):
        raise HTTPException(400, "Date attendue au format AAAA-MM-JJ.")

    contenu = await fichier.read()
    if len(contenu) > config.TAILLE_MAX_OCTETS:
        raise HTTPException(400, "Fichier trop volumineux (20 Mo maximum).")
    # On regarde les OCTETS, pas l'extension : renommer un exécutable en .pdf
    # est la première chose que tente quiconque cherche à déposer autre chose.
    if not contenu.startswith(config.SIGNATURE_PDF):
        raise HTTPException(400, "Seuls les fichiers PDF sont acceptés.")

    # Nom fabriqué : le nom d'origine ne touche jamais le disque, ce qui écarte
    # d'un coup la traversée de répertoire (« ../../ ») et les collisions.
    nom_disque = secrets.token_hex(16) + ".pdf"
    (config.DEPOTS / nom_disque).write_bytes(contenu)

    id_ = db.ajouter_document({
        "titre": titre.strip(),
        "rubrique": rubrique,
        "date_document": date_document,
        "fichier": nom_disque,
        "nom_affiche": pathlib.Path(fichier.filename or "document.pdf").name,
        "taille_octets": len(contenu),
    })
    return {"ok": True, "id": id_}


@app.delete(A + "/api/documents/{id_}")
def effacer_document(request: Request, id_: int):
    _exige_session(request)
    db.supprimer_document(id_)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Fichiers : les ressources de la PWA, puis le site statique
#
# ORDRE CRITIQUE : un montage StaticFiles avale tout ce qui commence par son
# préfixe, y compris les routes déclarées APRÈS lui. Le site couvre « / » (ou
# « /mairie-luglon »), donc il vient en dernier, sous peine de rendre muettes
# toutes les routes ci-dessus.
# ---------------------------------------------------------------------------

app.mount(A + "/static", StaticFiles(directory=str(config.BASE / "static")))
app.mount(P or "/", StaticFiles(directory=str(config.RACINE_SITE), html=True))
