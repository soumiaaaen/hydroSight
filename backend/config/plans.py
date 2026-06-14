"""Plan limits — keep in sync with geoai-frontend/lib/plans.ts"""
from __future__ import annotations

import math
from datetime import datetime
from typing import Any

PlanId = str

PLAN_LIMITS: dict[str, dict[str, Any]] = {
    "guest": {
        "label": "Démo",
        "modules": ["lu"],
        "modes": ["point", "region", "province"],
        "max_bbox_km2": 0,
        "max_months_range": 3,
        "analyses_per_month": 0,
        "analyses_per_day": 999999,
        "quota_period": "day",
        "pdf_export": False,
        "excel_export": False,
        "max_regions": 1,
        "max_provinces": 1,
    },
    "free": {
        "label": "Free",
        "modules": ["lu"],
        "modes": ["point"],
        "max_bbox_km2": 0,
        "max_months_range": 6,
        "analyses_per_month": 10,
        "quota_period": "month",
        "pdf_export": False,
        "excel_export": False,
        "max_regions": 1,
        "max_provinces": 1,
    },
    "pro": {
        "label": "Pro",
        "modules": ["gw", "sw", "lu"],
        "modes": ["point", "bbox", "province"],
        "max_bbox_km2": None,
        "max_months_range": 36,
        "analyses_per_month": 100,
        "quota_period": "month",
        "pdf_export": True,
        "excel_export": True,
        "max_regions": None,
        "max_provinces": None,
    },
    "premium": {
        "label": "Premium",
        "modules": ["gw", "sw", "lu"],
        "modes": ["point", "bbox", "province", "region", "national"],
        "max_bbox_km2": None,
        "max_months_range": None,
        "analyses_per_month": 500,
        "quota_period": "month",
        "pdf_export": True,
        "excel_export": True,
        "max_regions": None,
        "max_provinces": None,
    },
    "contract": {
        "label": "Contrat (B2B)",
        "modules": ["gw", "sw", "lu"],
        "modes": ["point", "bbox", "province", "region", "national"],
        "max_bbox_km2": None,
        "max_months_range": None,
        "analyses_per_month": 999999,
        "quota_period": "month",
        "pdf_export": True,
        "excel_export": True,
        "max_regions": None,
        "max_provinces": None,
    },
}


def normalize_plan(plan: str | None) -> PlanId:
    if plan in ("guest", "pro", "premium", "contract"):
        return plan
    return "free"


def is_guest_principal(principal_id: str) -> bool:
    return principal_id.startswith("guest:")


def guest_uuid_from_principal(principal_id: str) -> str:
    return principal_id.removeprefix("guest:")


def get_limits(plan: str | None) -> dict[str, Any]:
    return PLAN_LIMITS[normalize_plan(plan)]


def get_quota_limit(limits: dict[str, Any]) -> int:
    if limits.get("quota_period") == "day":
        return int(limits.get("analyses_per_day") or 0)
    return int(limits["analyses_per_month"])


def months_between(date_debut: str, date_fin: str) -> int:
    start = datetime.strptime(date_debut, "%Y-%m-%d")
    end = datetime.strptime(date_fin, "%Y-%m-%d")
    return (end.year - start.year) * 12 + (end.month - start.month) + 1


def bbox_area_km2(bbox: list[float] | None) -> float | None:
    if not bbox or len(bbox) != 4:
        return None
    min_lon, min_lat, max_lon, max_lat = bbox
    lat_mid = math.radians((min_lat + max_lat) / 2)
    width_km = abs(max_lon - min_lon) * 111.32 * math.cos(lat_mid)
    height_km = abs(max_lat - min_lat) * 110.574
    return width_km * height_km


def current_year_month() -> str:
    now = datetime.utcnow()
    return f"{now.year}-{now.month:02d}"


def current_utc_day() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


class PlanViolation(Exception):
    def __init__(self, message: str, status_code: int = 403):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def validate_plan_access(
    plan: str | None,
    *,
    active_module: str | None,
    granularite: str,
    date_debut: str | None = None,
    date_fin: str | None = None,
    bbox: list[float] | None,
    analyses_used: int,
    check_quota: bool = True,
) -> None:
    limits = get_limits(plan)

    if active_module and active_module not in limits["modules"]:
        raise PlanViolation(
            f"Module '{active_module}' not included in {limits['label']} plan.",
            403,
        )

    if granularite not in limits["modes"]:
        raise PlanViolation(
            f"Zone mode '{granularite}' requires a higher plan than {limits['label']}.",
            403,
        )

    max_months = limits["max_months_range"]
    if max_months is not None and date_debut and date_fin:
        try:
            if months_between(date_debut, date_fin) > max_months:
                raise PlanViolation(
                    f"Date range exceeds {max_months} months on {limits['label']} plan.",
                    403,
                )
        except ValueError as e:
            raise PlanViolation("Invalid date format. Use YYYY-MM-DD.", 400) from e

    if granularite == "bbox":
        max_bbox = limits["max_bbox_km2"]
        if max_bbox == 0:
            raise PlanViolation(
                "Bbox mode requires a free account. Sign up to continue.",
                403,
            )
        if max_bbox is not None and bbox:
            area = bbox_area_km2(bbox)
            if area is not None and area > max_bbox:
                raise PlanViolation(
                    f"Bbox area {area:.1f} km² exceeds {max_bbox} km² limit on Free plan.",
                    403,
                )

    quota_limit = get_quota_limit(limits)
    if check_quota and analyses_used >= quota_limit:
        period = "today" if limits.get("quota_period") == "day" else "this month"
        raise PlanViolation(
            f"Analysis quota reached ({quota_limit} {period}).",
            402,
        )
