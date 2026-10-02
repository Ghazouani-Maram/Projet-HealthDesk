from datetime import date, timedelta

PDF = b"%PDF-1.4\n%contenu de test\n"


def next_monday():
    d = date.today() + timedelta(days=7)
    while d.isoweekday() != 1:
        d += timedelta(days=1)
    return d


def test_login_ok_et_mauvais_mot_de_passe(client):
    assert client.post("/auth/login", json={"email": "admin@demo.tn", "password": "Admin123!"}).status_code == 200
    r = client.post("/auth/login", json={"email": "admin@demo.tn", "password": "faux"})
    assert r.status_code == 401


def test_inscription_puis_connexion(client):
    body = {"name": "Nouveau Patient", "email": "Nouveau@Test.TN", "password": "motdepasse1"}
    assert client.post("/auth/register", json=body).status_code == 201
    assert client.post("/auth/register", json=body).status_code == 409  # email déjà pris
    r = client.post("/auth/login", json={"email": "nouveau@test.tn", "password": "motdepasse1"})
    assert r.status_code == 200 and r.json()["user"]["role"] == "PATIENT"


def test_droits_par_role(client, admin, patient):
    assert client.get("/users").status_code == 401                       # pas de jeton
    assert client.get("/users", headers=patient).status_code == 403      # patient interdit
    assert client.get("/stats", headers=patient).status_code == 403
    assert client.get("/users", headers=admin).status_code == 200


def test_liste_paginee_et_recherche(client, patient):
    r = client.get("/doctors", params={"page": 1, "size": 2}, headers=patient)
    assert r.status_code == 200 and len(r.json()["items"]) == 2 and r.json()["total"] == 5
    r = client.get("/doctors", params={"search": "karim"}, headers=patient)
    assert [d["name"] for d in r.json()["items"]] == ["Dr Karim Trabelsi"]


def test_reservation_et_double_reservation(client, patient, patient2):
    day = next_monday().isoformat()
    slots = client.get("/doctors/1/slots", params={"date": day}, headers=patient).json()
    assert "09:00" in slots and "12:00" not in slots
    body = {"doctorId": 1, "startsAt": f"{day}T09:00:00", "reason": "Consultation de test"}
    assert client.post("/appointments", json=body, headers=patient).status_code == 201
    assert client.post("/appointments", json=body, headers=patient2).status_code == 409  # RG1
    assert "09:00" not in client.get("/doctors/1/slots", params={"date": day}, headers=patient).json()


def test_reservation_hors_creneau_ou_passee(client, patient):
    day = next_monday().isoformat()
    base = {"doctorId": 1, "reason": "Test"}
    assert client.post("/appointments", json={**base, "startsAt": f"{day}T12:30:00"}, headers=patient).status_code == 409
    assert client.post("/appointments", json={**base, "startsAt": "2020-01-06T09:00:00"}, headers=patient).status_code == 422


def test_statuts_et_visibilite(client, patient, patient2, doctor):
    mine = client.get("/appointments", headers=patient).json()["items"]
    assert mine and all(a["patient"]["name"] == "Yasmine Khelifi" for a in mine)  # RG4
    pending = next(a for a in mine if a["status"] == "PENDING" and a["doctor"]["id"] == 1)
    assert client.patch(f"/appointments/{pending['id']}/status", json={"status": "CONFIRMED"}, headers=patient).status_code == 403
    assert client.patch(f"/appointments/{pending['id']}/status", json={"status": "CONFIRMED"}, headers=patient2).status_code == 404
    assert client.patch(f"/appointments/{pending['id']}/status", json={"status": "CONFIRMED"}, headers=doctor).status_code == 200
    assert client.patch(f"/appointments/{pending['id']}/status", json={"status": "PENDING"}, headers=doctor).status_code == 409
    assert client.patch(f"/appointments/{pending['id']}/status", json={"status": "DONE"}, headers=doctor).status_code == 200


def test_documents(client, patient, patient2, admin):
    ok = client.post("/documents", data={"title": "Analyse"}, files={"file": ("a.pdf", PDF, "application/pdf")}, headers=patient)
    assert ok.status_code == 201, ok.text
    doc_id = ok.json()["id"]
    fake = client.post("/documents", data={"title": "Faux"}, files={"file": ("x.pdf", b"pas un pdf", "application/pdf")}, headers=patient)
    assert fake.status_code == 415                                        # signature vérifiée
    assert client.get(f"/documents/{doc_id}/file", headers=patient).content == PDF
    assert client.get(f"/documents/{doc_id}/file", headers=patient2).status_code == 403   # RG4
    assert client.get("/documents", headers=patient2).json()["total"] == 0
    assert client.delete(f"/documents/{doc_id}", headers=patient2).status_code == 403
    assert client.delete(f"/documents/{doc_id}", headers=admin).status_code == 204


def test_crud_specialite_et_suppression_refusee(client, admin):
    r = client.post("/specialties", json={"name": "Neurologie", "description": ""}, headers=admin)
    assert r.status_code == 201
    sid = r.json()["id"]
    assert client.put(f"/specialties/{sid}", json={"name": "Neurologie clinique"}, headers=admin).status_code == 200
    assert client.delete(f"/specialties/1", headers=admin).status_code == 409   # médecins rattachés (RG7)
    assert client.delete(f"/specialties/{sid}", headers=admin).status_code == 204


def test_tableau_de_bord(client, admin):
    s = client.get("/stats", headers=admin).json()
    assert s["doctors"] == 5 and set(s["byStatus"]) == {"PENDING", "CONFIRMED", "CANCELLED", "DONE"}
    assert s["topSpecialties"]
