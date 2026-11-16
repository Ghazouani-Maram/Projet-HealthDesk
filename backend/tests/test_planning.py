def test_le_medecin_voit_les_coordonnees_du_patient_dans_son_planning(client, doctor):
    items = client.get("/appointments", params={"size": 100}, headers=doctor).json()["items"]
    assert items and all(a["doctor"]["id"] == 1 for a in items)               # RG5 : uniquement ses rendez-vous
    omar = next(a["patient"] for a in items if a["patient"]["name"] == "Omar Bouzid")
    assert omar["phone"] == "20 111 002" and omar["birthDate"] == "1985-09-30"


def test_creneaux_libres_visibles_par_le_medecin(client, doctor):
    from datetime import date, timedelta
    day = date.today() + timedelta(days=14)
    while day.isoweekday() > 5:
        day += timedelta(days=1)
    r = client.get("/doctors/1/slots", params={"date": day.isoformat()}, headers=doctor)
    assert r.status_code == 200 and "09:00" in r.json()
