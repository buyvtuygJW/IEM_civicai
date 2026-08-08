"""Run this once after first install to populate HindCivicAi with realistic demo
data so the Government Dashboard has something to show immediately:

    python seed_demo_data.py
"""
import datetime
import random

from app.database import SessionLocal, Base, engine
from app import models
from app.services.auth import hash_password

Base.metadata.create_all(bind=engine)

AREAS = [
    ("Sector 12, Rohini", 28.7180, 77.1170),
    ("Andheri West", 19.1364, 72.8296),
    ("Koramangala", 12.9352, 77.6245),
    ("Salt Lake Sector V", 22.5726, 88.4310),
    ("Banjara Hills", 17.4126, 78.4482),
    ("Civil Lines", 25.4484, 81.8500),
]

CATEGORY_SAMPLES = [
    ("streetlight", "Electricity Department", "Street light not working near the main market.", "high"),
    ("water_supply", "Water Board", "No water supply for the last 3 days.", "critical"),
    ("garbage", "Municipal Sanitation Department", "Garbage not collected for over a week.", "medium"),
    ("road_pothole", "Public Works Department (PWD)", "Large pothole causing accidents on the main road.", "high"),
    ("drainage", "Sanitation Department", "Drain overflowing onto the street.", "high"),
    ("electricity", "Electricity Department", "Frequent power cuts every evening.", "medium"),
    ("stray_animals", "Animal Control Department", "Pack of stray dogs near the school gate.", "low"),
    ("noise_pollution", "Pollution Control Board", "Loudspeaker noise late at night.", "low"),
    ("traffic", "Traffic Police Department", "Traffic signal not working at busy intersection.", "medium"),
]

STATUSES = ["submitted", "in_progress", "resolved", "resolved", "in_progress"]

SCHEME_NAMES = [
    "PM-KISAN Samman Nidhi", "Ayushman Bharat (PM-JAY)", "Pradhan Mantri Awas Yojana",
    "National Social Assistance Programme - Old Age Pension", "Pradhan Mantri Ujjwala Yojana",
    "Pradhan Mantri MUDRA Yojana",
]


def seed():
    db = SessionLocal()
    try:
        if db.query(models.User).count() == 0:
            db.add(models.User(
                name="Aditi Sharma", email="citizen@demo.in",
                hashed_password=hash_password("demo1234"), role="citizen",
            ))
            db.add(models.User(
                name="Rajesh Kumar", email="official@demo.in",
                hashed_password=hash_password("demo1234"), role="government",
                department="Electricity Department",
            ))
            db.commit()
            print("Seeded demo accounts: citizen@demo.in / official@demo.in (password: demo1234)")

        if db.query(models.Complaint).count() > 0:
            print("Demo complaints already present, skipping.")
            return

        now = datetime.datetime.utcnow()
        for i in range(60):
            area_name, lat, lng = random.choice(AREAS)
            category, dept, desc, priority = random.choice(CATEGORY_SAMPLES)
            created_days_ago = random.randint(0, 20)
            created_at = now - datetime.timedelta(days=created_days_ago, hours=random.randint(0, 23))
            status = random.choice(STATUSES)

            complaint = models.Complaint(
                description=desc,
                original_text=desc,
                language="en",
                category=category,
                department=dept,
                priority=priority,
                area=area_name,
                latitude=lat + random.uniform(-0.01, 0.01),
                longitude=lng + random.uniform(-0.01, 0.01),
                status=status,
                created_at=created_at,
                updated_at=created_at,
            )
            if status == "resolved":
                resolve_hours = {"critical": 3, "high": 20, "medium": 50, "low": 90}[priority]
                complaint.resolved_at = created_at + datetime.timedelta(
                    hours=random.randint(1, resolve_hours)
                )
            db.add(complaint)

        for _ in range(80):
            db.add(models.EligibilityCheck(
                scheme_id="demo", scheme_name=random.choice(SCHEME_NAMES),
                matched=random.random() > 0.3, state=random.choice(
                    ["Delhi", "Maharashtra", "Karnataka", "West Bengal", "Telangana", "Uttar Pradesh"]
                ),
            ))

        db.commit()
        print("Seeded 60 demo complaints and 80 eligibility checks.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
