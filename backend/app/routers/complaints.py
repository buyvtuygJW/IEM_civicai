import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas, models
from ..database import get_db
from ..services import classifier, escalation, geocoding, place_resolver
from ..services.auth import get_current_user_optional, require_role

router = APIRouter(prefix="/api/complaints", tags=["complaints"])


def _serialize(c: models.Complaint) -> dict:
    level = escalation.compute_escalation_level(c.created_at, c.priority, c.status)
    status = c.status
    if level >= 1 and status not in ("resolved",):
        status = "escalated"
    return {
        "id": c.id,
        "citizen_id": c.citizen_id,
        "description": c.description,
        "category": c.category,
        "department": c.department,
        "priority": c.priority,
        "area": c.area,
        "latitude": c.latitude,
        "longitude": c.longitude,
        "status": status,
        "escalation_level": level,
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat(),
    }


def _resolve_area(payload_area: Optional[str], raw_text: str,
                   lat: Optional[float], lng: Optional[float]) -> str:
    """Picks the best available area name and canonicalizes it through the
    shared India gazetteer so complaints group consistently (e.g. "bengaluru",
    "Bangalore" and "blr" all become "Bengaluru, Karnataka").

    Order: an explicit area (typed or from the voice parser) → a place named in
    the complaint text itself → reverse-geocoded GPS coordinates → 'Unspecified'.
    A non-empty area we can't recognise is kept verbatim rather than dropped."""
    candidate = (payload_area or "").strip()
    resolved = place_resolver.resolve(candidate) if candidate else place_resolver.extract_from_text(raw_text)
    if resolved:
        return resolved["display"]
    if candidate:
        return candidate
    if lat is not None and lng is not None:
        geocoded = geocoding.reverse_geocode(lat, lng)
        if geocoded:
            return geocoded
    return "Unspecified"


@router.post("")
def create_complaint(
    payload: schemas.ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_optional),
):
    raw_text = payload.description or payload.transcript or ""
    if not raw_text.strip():
        raise HTTPException(400, "description or transcript is required")

    classified = classifier.classify_complaint(raw_text)
    description_en = classified.get("description_en", raw_text)

    area = _resolve_area(payload.area, raw_text, payload.latitude, payload.longitude)

    complaint = models.Complaint(
        citizen_id=current_user.id if current_user and current_user.role == "citizen" else None,
        description=description_en,
        original_text=raw_text,
        language=payload.language or "en",
        category=classified["category"],
        department=classified["department"],
        priority=classified["priority"],
        area=area,
        latitude=payload.latitude,
        longitude=payload.longitude,
        reporter_name=payload.reporter_name or (current_user.name if current_user else None),
        reporter_contact=payload.reporter_contact or (current_user.email if current_user else None),
        photo_data_url=payload.photo_data_url,
        status="submitted",
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    db.add(models.StatusLog(complaint_id=complaint.id, status="submitted",
                             note="Complaint received and auto-classified by AI."))
    db.commit()

    return _serialize(complaint)


@router.get("")
def list_complaints(
    status_filter: Optional[str] = None,
    category: Optional[str] = None,
    area: Optional[str] = None,
    db: Session = Depends(get_db),
    _gov: models.User = Depends(require_role("government")),
):
    """Full complaint list — government accounts only. Citizens use /mine."""
    query = db.query(models.Complaint)
    if category:
        query = query.filter(models.Complaint.category == category)
    if area:
        query = query.filter(models.Complaint.area == area)
    complaints = query.order_by(models.Complaint.created_at.desc()).all()
    results = [_serialize(c) for c in complaints]
    if status_filter:
        results = [r for r in results if r["status"] == status_filter]
    return results


@router.get("/mine")
def my_complaints(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_optional),
):
    """Complaints filed by the logged-in citizen. Requires login (unlike
    guest complaint filing) since there's no other way to know which
    complaints belong to you."""
    if not current_user:
        raise HTTPException(401, "Log in to see your filed complaints.")
    complaints = (
        db.query(models.Complaint)
        .filter(models.Complaint.citizen_id == current_user.id)
        .order_by(models.Complaint.created_at.desc())
        .all()
    )
    return [_serialize(c) for c in complaints]


@router.get("/{complaint_id}")
def get_complaint(complaint_id: str, db: Session = Depends(get_db)):
    """Look up a single complaint by its case number — kept public (no login
    required) so anyone can track a complaint the way they'd track a parcel,
    by ID, without exposing the full list."""
    c = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(404, "Complaint not found")
    data = _serialize(c)
    data["logs"] = [
        {"status": log.status, "note": log.note, "timestamp": log.timestamp.isoformat()}
        for log in sorted(c.logs, key=lambda l: l.timestamp)
    ]
    return data


@router.patch("/{complaint_id}/status")
def update_status(
    complaint_id: str,
    payload: schemas.StatusUpdate,
    db: Session = Depends(get_db),
    gov_user: models.User = Depends(require_role("government")),
):
    """Marking a complaint in_progress/resolved is government-only — citizens
    can file and track, but only the responsible authority can update status."""
    c = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(404, "Complaint not found")
    c.status = payload.status
    if payload.status == "resolved":
        c.resolved_at = datetime.datetime.utcnow()
    db.add(models.StatusLog(
        complaint_id=c.id, status=payload.status,
        note=payload.note or f"Updated by {gov_user.name} ({gov_user.department or gov_user.role}).",
    ))
    db.commit()
    db.refresh(c)
    return _serialize(c)
