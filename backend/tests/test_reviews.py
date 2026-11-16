"""Avis des patients sur les médecins (RG8) : Omar Bouzid a un rendez-vous terminé avec les médecins 1 et 2."""


def test_liste_avis_et_resume(client, patient):
    r = client.get("/doctors/5/reviews", headers=patient)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 2 and data["summary"]["count"] == 2 and data["summary"]["avg"] == 3.0
    assert data["summary"]["distribution"]["2"] == 1 and data["summary"]["distribution"]["4"] == 1
    assert data["items"][0]["author"] == "Omar B."            # nom abrégé, plus récent en premier
    assert client.get("/doctors/999/reviews", headers=patient).status_code == 404


def test_note_moyenne_dans_la_liste_des_medecins(client, patient):
    karim = next(d for d in client.get("/doctors", params={"search": "karim"}, headers=patient).json()["items"])
    assert karim["rating"] == {"avg": 4.5, "count": 2}


def test_avis_reserve_aux_patients_apres_consultation(client, patient, patient2, doctor):
    assert client.get("/doctors/2/reviews", headers=patient).json()["reviewState"] == "NEEDS_VISIT"
    assert client.post("/doctors/4/reviews", json={"rating": 5}, headers=patient2).status_code == 403   # pas de RDV terminé
    assert client.post("/doctors/1/reviews", json={"rating": 5}, headers=doctor).status_code == 403     # rôle médecin
    assert client.post("/doctors/1/reviews", json={"rating": 5}).status_code == 401
    assert client.post("/doctors/1/reviews", json={"rating": 6}, headers=patient2).status_code == 422   # note 1 à 5
    assert client.post("/doctors/1/reviews", json={"rating": 0}, headers=patient2).status_code == 422


def test_creation_unicite_et_suppression(client, patient, patient2, admin):
    assert client.get("/doctors/1/reviews", headers=patient2).json()["reviewState"] == "CAN_REVIEW"
    r = client.post("/doctors/1/reviews", json={"rating": 5, "comment": "  Très à l'écoute  "}, headers=patient2)
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["comment"] == "Très à l'écoute" and created["author"] == "Omar B." and created["mine"] is True
    assert client.post("/doctors/1/reviews", json={"rating": 1}, headers=patient2).status_code == 409   # un seul avis
    after = client.get("/doctors/1/reviews", headers=patient2).json()
    assert after["reviewState"] == "ALREADY_REVIEWED" and after["total"] == 3
    assert [i["mine"] for i in after["items"]].count(True) == 1

    assert client.delete(f"/reviews/{created['id']}", headers=patient).status_code == 404   # pas son avis
    assert client.delete(f"/reviews/{created['id']}", headers=patient2).status_code == 204
    assert client.get("/doctors/1/reviews", headers=patient2).json()["reviewState"] == "CAN_REVIEW"

    again = client.post("/doctors/2/reviews", json={"rating": 2}, headers=patient2).json()   # sans commentaire
    assert again["comment"] is None
    assert client.delete(f"/reviews/{again['id']}", headers=admin).status_code == 204         # l'admin modère
    assert client.delete(f"/reviews/{again['id']}", headers=admin).status_code == 404
