# Back-office

Petite application d'administration pour le site : publier des actualités,
déposer des PDF, supprimer les uns et les autres. Base SQLite, aucune
dépendance lourde, aucune brique à administrer.

Elle sert **aussi le site** : c'est une seule application FastAPI qui rend trois
pages, expose l'API du back-office, et sert les fichiers statiques du reste du
site. Même origine partout — c'est ce qui évite le CORS, garde la politique de
sécurité du site inchangée, et permet au cookie de session de fonctionner sans
configuration.

## Ce qui est piloté depuis l'administration

| Zone publique | Source |
|---|---|
| `/actualites/` | base — les **5** plus proches dans le temps, en grand |
| `/actualites/autres/` | base — toutes les suivantes, automatiquement |
| `/mairie/arretes-et-publications/` | base — arrêtés municipaux, préfectoraux, bulletins |

Le reste du site (21 pages) est inchangé : ce sont toujours des fichiers HTML,
servis tels quels. Seules les zones qui bougent entre deux visites du
secrétariat ont été converties.

**La bascule vers « Autres actualités » est automatique.** Personne ne déplace
rien : au-delà de `ACTUALITES_EN_UNE`, les actualités les plus lointaines
sortent seules de la page principale. C'est une requête, pas un rangement.

## Démarrer

```sh
./backoffice/lancer.sh
```

C'est tout. Le script crée l'environnement Python s'il manque, installe les
dépendances au besoin, demande un mot de passe à la première exécution, puis
démarre le serveur.

- Site : `http://localhost:8000/mairie-luglon/`
- Administration : `http://localhost:8000/mairie-luglon/gestion/`
- Autre port : `PORT=9000 ./backoffice/lancer.sh`

Le chemin de l'administration est réglable (`BO_ADMIN_CHEMIN`, `/gestion` par
défaut). Il ne vaut pas `/admin` parce que cette adresse-là est testée en
permanence par les robots — c'est du bruit en moins, pas une serrure : ne
comptez jamais dessus, le mot de passe reste la seule vraie barrière.

À la première utilisation seulement, il demande un mot de passe. Seul son
**condensat** est enregistré, **en base**, donc il est retenu d'un lancement à
l'autre. Pour en changer : `python3 -m backoffice.auth`.

Sans mot de passe configuré, l'application **refuse de démarrer**. C'est
volontaire : un back-office qui publie sur le site d'une mairie ne tourne pas
avec un mot de passe par défaut, même « le temps des tests ».

### À la main, si vous préférez

```sh
python3 -m venv .venv
.venv/bin/pip install fastapi uvicorn jinja2 python-multipart
.venv/bin/python -m backoffice.auth          # enregistre le condensat en base
.venv/bin/python -m uvicorn backoffice.app:app --port 8000
```

En production, `BO_MOT_DE_PASSE_HACHE` dans l'environnement du service prend le
pas sur la base : c'est ce qui permet d'imposer le mot de passe depuis la
configuration systemd sans dépendre du contenu de la base. Attention aux
guillemets **simples** — le condensat contient des `$`, que le shell
développerait entre guillemets doubles.

## Depuis un téléphone

```sh
cloudflared tunnel --url http://localhost:8000
```

Le tunnel donne une URL publique en HTTPS. L'application ne sait pas d'où elle
est servie et n'a pas à le savoir : toutes ses URL sont relatives. Attention, le
TLS se termine chez Cloudflare, qui voit donc passer le mot de passe — avec un
mot de passe de test, pas celui du client.

## Installer l'application chez le client

Ouvrir `.../admin/` dans Chrome ou Edge, puis « Installer ». Elle obtient une
icône sur le bureau, une entrée dans la barre des tâches et sa propre fenêtre,
sans barre d'adresse. Sur macOS, Safari propose « Ajouter au Dock ».

L'installation exige HTTPS : elle fonctionne derrière le tunnel et sur OVH,
jamais sur `http://localhost` en réseau local.

## Reproduire chez un autre client

Tout ce qui est propre à Luglon tient dans **`config.py`** : nom du site, URL
canonique, préfixe d'URL, nombre d'actualités en une, rubriques de documents.
Aucun autre module Python ne contient de nom de commune — si vous en trouvez
un, c'est une fuite à corriger.

Les **gabarits de `templates/`** sont, eux, forcément spécifiques : ce sont les
pages du client. Pour un autre client on les remplace. Chercher à les rendre
génériques reviendrait à écrire un moteur de gabarits maison, c'est-à-dire le
CMS qu'on cherche précisément à ne pas écrire.

`_layout.html` a été **extrait d'une page réelle du site** plutôt que retapé.
C'est la bonne méthode pour un nouveau client : partir d'une de ses pages,
remplacer le contenu par `{% block contenu %}`, le titre et le canonical par des
blocs, et les URL en dur par `{{ p }}`.

## Passage sur OVH

```sh
export BO_PREFIXE_URL=""        # le site est à la racine du domaine
export BO_DONNEES=/var/lib/mairie-luglon
export BO_MOT_DE_PASSE_HACHE='...'
```

En production, le condensat vient de l'environnement du service systemd, pas du
fichier local : rien de sensible sur le disque du serveur, et `lancer.sh` ne
sert pas. Le drapeau `Secure` du cookie se déduit du schéma de la requête —
derrière nginx en HTTPS il s'active tout seul, il n'y a rien à régler.

nginx devant (TLS Let's Encrypt, fichiers statiques et PDF servis directement),
uvicorn derrière sous systemd pour qu'il redémarre au boot et après un plantage.

Ne pas oublier de retirer le préfixe `/mairie-luglon/` du HTML statique **et de
`styles.css`** — voir `CLAUDE.md`, cette étape a déjà été oubliée une fois.

## Formulaire de contact : ce qu'il faut fournir

Le formulaire fonctionne déjà (contrôles, anti-robots, enregistrement en base).
Il ne manque que **de quoi envoyer le courriel**. Cinq variables :

```sh
export BO_SMTP_SERVEUR='ssl0.ovh.net'        # serveur d'envoi du fournisseur
export BO_SMTP_PORT=587                       # 587 (STARTTLS) ou 465 (+ BO_SMTP_SSL=1)
export BO_SMTP_UTILISATEUR='site@mairie-luglon.fr'
export BO_SMTP_MOT_DE_PASSE='…'               # guillemets SIMPLES
export BO_SMTP_EXPEDITEUR='site@mairie-luglon.fr'
# facultatif, accueil@mairie-luglon.fr par défaut :
export BO_CONTACT_DESTINATAIRE='accueil@mairie-luglon.fr'
```

**L'expéditeur n'est pas le visiteur, et ce n'est pas un détail.** Le courriel
part avec `From: site@mairie-luglon.fr` et `Reply-To: <adresse du visiteur>`.
Mettre l'adresse du visiteur en `From` reviendrait à usurper son fournisseur :
SPF et DKIM échoueraient, DMARC ferait rejeter le message, et la mairie ne
recevrait rien — sans qu'aucune erreur ne remonte à qui a écrit.

**Deux enregistrements DNS conditionnent l'arrivée en boîte de réception**, et
ce n'est pas du code :

- **SPF** — autoriser le serveur d'envoi à émettre pour `mairie-luglon.fr`.
- **DKIM** — la clé publique fournie par l'hébergeur de messagerie.

Sans eux, le message part mais atterrit en indésirable. Le fournisseur de la
boîte les documente ; si la messagerie est déjà chez lui, ils existent
peut-être déjà et il suffit d'y ajouter le serveur d'envoi.

**Rien ne se perd si l'envoi échoue.** Le message est enregistré en base
*avant* la tentative, avec un indicateur `envoye` et le motif de l'échec. Le
visiteur reçoit un message honnête — jamais « message envoyé » alors que rien
n'est parti.

**Relais local plutôt que fournisseur** : si le VPS fait tourner un Postfix,
`BO_SMTP_SERVEUR=localhost`, `BO_SMTP_PORT=25`, `BO_SMTP_TLS=0`, sans
identifiants. Ne mettez `BO_SMTP_TLS=0` que dans ce cas : vers un serveur
distant, le mot de passe circulerait en clair.

## Sauvegardes

C'est le point qu'on oublie, et le seul qui compte vraiment.

Le code est dans git, il est reproductible. `donnees/backoffice.sqlite3` et
`donnees/documents/` ne le sont pas : ce sont les actualités et les arrêtés de
la commune. Une copie nocturne **ailleurs que sur le serveur**, sinon un disque
perdu efface des documents officiels.

## Ce que l'application ne fait pas, volontairement

- **Pas de mode hors ligne.** Un outil qui écrit sur un serveur ne peut pas
  fonctionner sans réseau sans inventer de la résolution de conflits. Sans
  connexion, l'application le dit et n'essaie pas de faire semblant.
- **Pas de gestion d'utilisateurs.** Un seul mot de passe, pour un secrétariat
  d'une personne. Ajouter des comptes serait du code à maintenir pour un besoin
  qui n'existe pas.
- **Pas de modification, seulement publier et supprimer.** Corriger une coquille
  se fait en supprimant puis republiant. Un formulaire d'édition doublerait la
  surface de l'application pour un geste rare.
- **Pas de PDF autre que PDF.** Le type est vérifié sur les **octets** du
  fichier, pas sur son extension : le dépôt de fichiers est la surface la plus
  exposée d'une application de ce genre.
