"""
contenu.py — Assainissement du HTML saisi dans l'éditeur, et extraits.

POURQUOI CE FICHIER EXISTE. L'éditeur du back-office produit du HTML, et ce
HTML est réinjecté tel quel dans les pages publiques. Sans filtre, une balise
`<script>` collée dans le champ — volontairement, ou par un copier-coller depuis
un document Word vérolé, ou par quelqu'un ayant obtenu le mot de passe —
s'exécuterait chez tous les visiteurs de la commune. C'est du XSS persistant, la
variété la plus grave.

LA MÉTHODE : ON RECONSTRUIT, ON NE NETTOIE PAS. On ne cherche pas à détecter ce
qui est dangereux pour le retirer — cette approche perd toujours, parce qu'elle
suppose connaître à l'avance toutes les formes d'attaque. On analyse le document
et on RÉÉMET uniquement ce qui figure dans une liste blanche : tout ce qui n'y
est pas n'est simplement jamais écrit. Une balise inconnue ne « passe » pas, elle
n'existe pas dans la sortie.

DEUXIÈME PROPRIÉTÉ : pas de couleur ni de taille libres. L'éditeur pose des
CLASSES (`ta-center`, `co-alerte`), jamais des styles en ligne. Deux bénéfices —
l'assainissement se réduit à une liste de noms de classes, ce qui est vérifiable
d'un coup d'œil, et la charte graphique du site reste tenue par styles.css plutôt
que par les choix successifs de la personne qui publie.
"""

import html
import re
from html.parser import HTMLParser


# Balises autorisées, et pour chacune les attributs admis. Tout le reste est
# jeté — la balise comme l'attribut.
BALISES = {
    "p": set(),
    "br": set(),
    "strong": set(),
    "em": set(),
    "u": set(),
    "s": set(),
    "h3": set(),
    "h4": set(),
    "ul": set(),
    "ol": set(),
    "li": set(),
    "blockquote": set(),
    "a": {"href"},
    "img": {"src", "alt"},
    "figure": set(),
    "figcaption": set(),
}

# Balises sans fermeture.
ORPHELINES = {"br", "img"}

# Classes autorisées, posées par la barre d'outils de l'éditeur. Les noms
# correspondent à des règles de styles.css : le rendu appartient au site, pas
# au contenu.
CLASSES = {
    "ta-left", "ta-center", "ta-right",
    "co-marine", "co-discret", "co-alerte",
}

# Où une image a le droit de pointer. Uniquement nos propres médias : une image
# distante ferait fuiter l'adresse IP du visiteur vers un serveur tiers, et
# permettrait à ce tiers de savoir qui consulte quelle page de la mairie.
PREFIXES_IMAGE = ("/medias/",)

# Schémas de lien admis. `javascript:` est évidemment exclu — c'est la façon la
# plus directe d'exécuter du code depuis un simple lien.
SCHEMAS_LIEN = ("http://", "https://", "mailto:", "tel:")

# Balises dont il faut jeter AUSSI LE CONTENU, pas seulement la balise. Une
# balise ordinaire non autorisée laisse passer son texte, ce qui est le bon
# comportement : `<div>Bonjour</div>` doit rendre « Bonjour ». Mais le corps
# d'un <script> n'est pas du texte à lire — laissé passer, « alert(1) »
# s'afficherait en clair au milieu de l'actualité.
CONTENU_JETE = {"script", "style", "template", "iframe", "object", "embed", "noscript"}


class _Assainisseur(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.morceaux = []
        self.pile = []
        self.muet = 0        # profondeur dans une balise à contenu jeté

    # --- attributs ---------------------------------------------------------

    def _classes(self, valeur):
        gardees = [c for c in (valeur or "").split() if c in CLASSES]
        return " ".join(gardees)

    def _lien(self, valeur):
        v = (valeur or "").strip()
        if v.startswith("/") and not v.startswith("//"):
            return v            # lien interne au site
        return v if v.lower().startswith(SCHEMAS_LIEN) else ""

    def _image(self, valeur):
        v = (valeur or "").strip()
        return v if any(v.startswith(p) for p in PREFIXES_IMAGE) else ""

    def _attributs(self, balise, attrs):
        admis = BALISES[balise]
        sortie = []
        for nom, valeur in attrs:
            nom = (nom or "").lower()
            if nom == "class":
                classes = self._classes(valeur)
                if classes:
                    sortie.append(f'class="{html.escape(classes, quote=True)}"')
            elif nom in admis:
                if nom == "href":
                    valeur = self._lien(valeur)
                elif nom == "src":
                    valeur = self._image(valeur)
                if valeur:
                    sortie.append(f'{nom}="{html.escape(valeur, quote=True)}"')
        return (" " + " ".join(sortie)) if sortie else ""

    # --- analyse -----------------------------------------------------------

    def _emettre(self, balise, attrs):
        """Rend la balise, ou rien si un attribut indispensable a été refusé.

        Une image dont la source est rejetée ne doit pas laisser un `<img>` nu :
        ça ne sert à rien et ça laisse un trou dans la mise en page.
        """
        rendus = self._attributs(balise, attrs)
        if balise == "img" and 'src="' not in rendus:
            return None
        return f"<{balise}{rendus}>"

    def handle_starttag(self, balise, attrs):
        if balise in CONTENU_JETE:
            self.muet += 1
            return
        if self.muet or balise not in BALISES:
            return
        rendu = self._emettre(balise, attrs)
        if rendu is None:
            return
        self.morceaux.append(rendu)
        if balise not in ORPHELINES:
            self.pile.append(balise)

    def handle_startendtag(self, balise, attrs):
        if self.muet or balise in CONTENU_JETE or balise not in BALISES:
            return
        rendu = self._emettre(balise, attrs)
        if rendu is not None:
            self.morceaux.append(rendu)

    def handle_endtag(self, balise):
        if balise in CONTENU_JETE:
            self.muet = max(0, self.muet - 1)
            return
        if self.muet or balise not in BALISES or balise in ORPHELINES:
            return
        # On ne ferme que si la balise est réellement ouverte : un `</div>`
        # égaré ne doit pas refermer autre chose.
        if balise in self.pile:
            while self.pile:
                ouverte = self.pile.pop()
                self.morceaux.append(f"</{ouverte}>")
                if ouverte == balise:
                    break

    def handle_data(self, texte):
        if self.muet:
            return
        self.morceaux.append(html.escape(texte, quote=False))

    # Commentaires, doctype et instructions de traitement : ignorés. Un
    # commentaire conditionnel peut cacher du balisage exécutable.
    def handle_comment(self, data):
        pass

    def handle_decl(self, decl):
        pass

    def handle_pi(self, data):
        pass

    def resultat(self):
        # Refermer ce qui est resté ouvert, sinon le HTML injecté dans la page
        # déborderait sur la mise en page qui suit.
        while self.pile:
            self.morceaux.append(f"</{self.pile.pop()}>")
        return "".join(self.morceaux)


def assainir(brut: str) -> str:
    """Renvoie une version du HTML ne contenant que ce qui est autorisé."""
    if not brut:
        return ""
    a = _Assainisseur()
    a.feed(brut)
    a.close()
    sortie = a.resultat()
    # Paragraphes vides laissés par l'éditeur quand on efface une ligne.
    sortie = re.sub(r"<p>(\s|&nbsp;|<br>)*</p>", "", sortie)
    return sortie.strip()


def extrait(html_assaini: str, taille: int = 180) -> str:
    """Texte brut, sans balise, pour les cartes du sommaire.

    Les cartes doivent rester courtes et régulières : elles ne peuvent pas
    porter le texte riche ni les images, qui vivent sur la page de rubrique.
    On coupe sur un espace pour ne pas tronquer un mot en deux.
    """
    texte = re.sub(r"<[^>]+>", " ", html_assaini or "")
    texte = html.unescape(texte)
    texte = re.sub(r"\s+", " ", texte).strip()
    if len(texte) <= taille:
        return texte
    coupe = texte[:taille].rsplit(" ", 1)[0]
    return coupe + "…"
