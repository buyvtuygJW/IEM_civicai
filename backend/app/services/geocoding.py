"""Converts GPS coordinates into a human-readable locality name using
OpenStreetMap's free Nominatim API (no API key required).

This is what fixes complaints showing "Unspecified" as the area when a
citizen used voice input but didn't explicitly say a locality name — as long
as the browser shared GPS coordinates, we can still resolve a real place name
server-side.

Requires outbound internet access from wherever the backend runs. Fails
silently (returns None) if the request errors or times out, so a flaky
network never breaks complaint submission — the complaint is still saved,
just with an "Unspecified" area as before.
"""
import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"

# Nominatim's usage policy requires a descriptive User-Agent identifying the app.
HEADERS = {"User-Agent": "HindCivicAi-Hackathon-Demo/1.0 (civic complaint routing)"}


def reverse_geocode(lat, lng) -> str | None:
    if lat is None or lng is None:
        return None
    try:
        resp = requests.get(
            NOMINATIM_URL,
            params={"lat": lat, "lon": lng, "format": "json", "zoom": 16, "addressdetails": 1},
            headers=HEADERS,
            timeout=4,
        )
        resp.raise_for_status()
        data = resp.json()
        addr = data.get("address", {})
        area = (
            addr.get("suburb")
            or addr.get("neighbourhood")
            or addr.get("village")
            or addr.get("town")
            or addr.get("city_district")
            or addr.get("city")
        )
        return area
    except Exception:
        return None
