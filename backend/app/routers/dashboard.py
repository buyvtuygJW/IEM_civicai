import datetime
from collections import Counter, defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..services import escalation
from ..services.auth import require_role

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db), _gov: models.User = Depends(require_role("government"))):
    complaints = db.query(models.Complaint).all()

    total = len(complaints)
    resolved = [c for c in complaints if c.status == "resolved"]
    pending = [c for c in complaints if c.status != "resolved"]
    escalated = [
        c for c in complaints
        if c.status != "resolved" and escalation.compute_escalation_level(c.created_at, c.priority, c.status) >= 1
    ]

    # Hotspots: area x category counts
    hotspot_counter = Counter((c.area or "Unspecified", c.category) for c in complaints)
    hotspots = [
        {"area": area, "category": category, "count": count}
        for (area, category), count in hotspot_counter.most_common(10)
    ]

    # Category distribution
    category_counter = Counter(c.category for c in complaints)
    category_distribution = [{"category": k, "count": v} for k, v in category_counter.most_common()]

    # Avg resolution time (hours), only for resolved complaints with resolved_at set
    res_times = []
    for c in resolved:
        if c.resolved_at:
            res_times.append((c.resolved_at - c.created_at).total_seconds() / 3600)
    avg_resolution_hours = round(sum(res_times) / len(res_times), 1) if res_times else None

    # Resolution time trend by day (last 14 days), average hours-to-resolve for
    # complaints resolved that day
    trend_map = defaultdict(list)
    for c in resolved:
        if c.resolved_at:
            day = c.resolved_at.date().isoformat()
            trend_map[day].append((c.resolved_at - c.created_at).total_seconds() / 3600)
    resolution_trend = [
        {"date": day, "avg_hours": round(sum(hrs) / len(hrs), 1)}
        for day, hrs in sorted(trend_map.items())
    ][-14:]

    # New complaints per day (last 14 days) -> geographic/volume trend
    volume_map = defaultdict(int)
    for c in complaints:
        day = c.created_at.date().isoformat()
        volume_map[day] += 1
    volume_trend = [{"date": day, "count": count} for day, count in sorted(volume_map.items())][-14:]

    # Scheme adoption / interest from eligibility checks
    checks = db.query(models.EligibilityCheck).all()
    scheme_counter = Counter(c.scheme_name for c in checks if c.matched)
    scheme_adoption = [{"scheme": name, "interested_citizens": count}
                        for name, count in scheme_counter.most_common(10)]

    # Priority breakdown
    priority_counter = Counter(c.priority for c in complaints)
    priority_breakdown = [{"priority": k, "count": v} for k, v in priority_counter.items()]

    return {
        "total_complaints": total,
        "resolved_count": len(resolved),
        "pending_count": len(pending),
        "escalated_count": len(escalated),
        "avg_resolution_hours": avg_resolution_hours,
        "hotspots": hotspots,
        "category_distribution": category_distribution,
        "resolution_trend": resolution_trend,
        "volume_trend": volume_trend,
        "scheme_adoption": scheme_adoption,
        "priority_breakdown": priority_breakdown,
        "total_eligibility_checks": len(checks),
    }
