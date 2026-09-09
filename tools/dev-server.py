#!/usr/bin/env python3
"""
dev-server.py — Serveur de DÉVELOPPEMENT : le site + une API, à la même adresse.

CE N'EST PAS LE BACKEND DE PRODUCTION, et ce n'est pas non plus une étape de
build : le site reste 100 % statique et GitHub Pages continue de le servir tel
quel. Ce fichier existe pour une seule chose — pouvoir tester depuis un
téléphone, via un tunnel, un formulaire réellement branché sur un serveur,
alors que GitHub Pages n'exécute rien.

Ce qu'il reproduit du montage final (OVH) :

  * UNE SEULE application sert les fichiers statiques ET l'API. C'est ce qui
    rend le `fetch` de même origine, donc sans CORS, et compatible avec la CSP
    du site telle qu'elle est (`connect-src 'self'`). Un backend sur un autre
    domaine obligerait à rouvrir cette politique sur les 26 pages.
  * Le site est monté sous /mairie-luglon/, pas à la racine : tous les liens
    internes portent ce préfixe (voir CLAUDE.md). Servir à la racine ferait
    tomber chaque lien en 404.

Ce qu'il ne fait PAS, volontairement : pas de base de données, pas d'envoi de
mail, pas d'authentification. Les demandes sont ajoutées à un fichier JSONL
local. C'est un point de branchement pour vérifier le câblage de bout en bout,
pas une implémentation à mettre en ligne.

--- Utilisation -------------------------------------------------------------

    python3 -m venv .venv && . .venv/bin/activate
    pip install fastapi uvicorn
    python3 tools/dev-server.py

Puis, dans config.js, passer API_BASE à '/api' pour que le formulaire poste
ici. NE PAS COMMITER cette valeur : GitHub Pages n'a pas d'API, le formulaire
y échouerait au lieu de retomber en mode démonstration.

Pour y accéder depuis un téléphone (le tunnel meurt avec la commande) :

    cloudflared tunnel --url http://localhost:8000

-----------------------------------------------------------------------------
"""

import json
import pathlib
import datetime

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
import uvicorn

RACINE = pathlib.Path(__file__).resolve().parent.parent
JOURNAL = RACINE / "demandes-dev.jsonl"   # ignoré par git, voir .gitignore

app = FastAPI(title="Mairie de Luglon — serveur de développement")


@app.post("/api/reservation")
async def reservation(request: Request):
    """Reçoit une demande du formulaire et l'ajoute au journal local.

    Le vrai backend fera autre chose (mail au secrétariat, enregistrement),
    mais il gardera ce contrat : POST JSON, réponse 200 en cas de succès —
    c'est tout ce que script.js observe.
    """
    demande = await request.json()
    demande["_recu_le"] = datetime.datetime.now().isoformat(timespec="seconds")

    with JOURNAL.open("a", encoding="utf-8") as f:
        f.write(json.dumps(demande, ensure_ascii=False) + "\n")

    print(f"  demande reçue : {demande.get('name')} — {demande.get('dates')}")
    return {"ok": True}


# Monté en DERNIER : un StaticFiles attrape tout ce qui commence par son
# préfixe, y compris ce qui aurait dû aller à une route déclarée après lui.
app.mount("/mairie-luglon", StaticFiles(directory=RACINE, html=True))


if __name__ == "__main__":
    print(f"  site  : http://localhost:8000/mairie-luglon/")
    print(f"  api   : POST http://localhost:8000/api/reservation")
    print(f"  reçus : {JOURNAL}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
