import datetime

# Hours after which an unresolved complaint at a given priority gets escalated
# to the next level (0 -> 1 -> 2). Level 2 is treated as fully escalated.
SLA_HOURS = {
    "critical": 4,
    "high": 24,
    "medium": 72,
    "low": 168,
}


def compute_escalation_level(created_at: datetime.datetime, priority: str, status: str) -> int:
    if status in ("resolved",):
        return 0
    hours_open = (datetime.datetime.utcnow() - created_at).total_seconds() / 3600
    sla = SLA_HOURS.get(priority, 72)
    if hours_open >= sla * 2:
        return 2
    if hours_open >= sla:
        return 1
    return 0
