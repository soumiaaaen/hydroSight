"""Supabase-backed plan profile and usage tracking (incl. guest demo)."""
from __future__ import annotations

import os
from typing import Any

import httpx

from config.plans import (
    current_utc_day,
    current_year_month,
    get_limits,
    get_quota_limit,
    guest_uuid_from_principal,
    is_guest_principal,
    normalize_plan,
)
from config.roles import USER_ROLE_USER, UserRole, normalize_user_role

# In-memory fallback when Supabase is unavailable (dev)
_guest_usage_memory: dict[tuple[str, str], int] = {}


class SubscriptionService:
    def __init__(self) -> None:
        self.base_url = (os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    @property
    def configured(self) -> bool:
        return bool(self.base_url and self.service_key)

    def _headers(self) -> dict[str, str]:
        return {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def get_user_role(self, user_id: str) -> UserRole:
        if is_guest_principal(user_id):
            return USER_ROLE_USER

        if not self.configured:
            return USER_ROLE_USER

        url = f"{self.base_url}/rest/v1/profiles"
        params = {"id": f"eq.{user_id}", "select": "role"}

        with httpx.Client(timeout=10.0) as client:
            r = client.get(url, headers=self._headers(), params=params)
            r.raise_for_status()
            rows = r.json()

        if not rows:
            return USER_ROLE_USER

        return normalize_user_role(rows[0].get("role"))

    def get_user_plan(self, principal_id: str) -> str:
        if is_guest_principal(principal_id):
            return "guest"

        if not self.configured:
            return "free"

        url = f"{self.base_url}/rest/v1/profiles"
        params = {"id": f"eq.{principal_id}", "select": "plan,plan_expires_at"}

        with httpx.Client(timeout=10.0) as client:
            r = client.get(url, headers=self._headers(), params=params)
            r.raise_for_status()
            rows = r.json()

        if not rows:
            return "free"

        plan = normalize_plan(rows[0].get("plan"))
        expires = rows[0].get("plan_expires_at")
        if expires and plan != "free":
            from datetime import datetime, timezone

            try:
                exp = datetime.fromisoformat(expires.replace("Z", "+00:00"))
                if exp < datetime.now(timezone.utc):
                    return "free"
            except ValueError:
                pass
        return plan

    def get_monthly_usage(self, user_id: str, year_month: str | None = None) -> int:
        if not self.configured:
            return 0

        ym = year_month or current_year_month()
        url = f"{self.base_url}/rest/v1/usage_monthly"
        params = {
            "user_id": f"eq.{user_id}",
            "year_month": f"eq.{ym}",
            "select": "analysis_count",
        }

        with httpx.Client(timeout=10.0) as client:
            r = client.get(url, headers=self._headers(), params=params)
            r.raise_for_status()
            rows = r.json()

        if not rows:
            return 0
        return int(rows[0].get("analysis_count", 0))

    def get_guest_daily_usage(self, guest_uuid: str, day: str | None = None) -> int:
        d = day or current_utc_day()
        key = (guest_uuid, d)

        if not self.configured:
            return _guest_usage_memory.get(key, 0)

        url = f"{self.base_url}/rest/v1/guest_usage"
        params = {
            "guest_id": f"eq.{guest_uuid}",
            "day": f"eq.{d}",
            "select": "analysis_count",
        }

        with httpx.Client(timeout=10.0) as client:
            r = client.get(url, headers=self._headers(), params=params)
            r.raise_for_status()
            rows = r.json()

        if not rows:
            return 0
        return int(rows[0].get("analysis_count", 0))

    def increment_guest_daily_usage(self, guest_uuid: str) -> int:
        d = current_utc_day()
        key = (guest_uuid, d)
        current = self.get_guest_daily_usage(guest_uuid, d)
        new_count = current + 1

        if not self.configured:
            _guest_usage_memory[key] = new_count
            return new_count

        url = f"{self.base_url}/rest/v1/guest_usage"
        headers = {
            **self._headers(),
            "Prefer": "resolution=merge-duplicates,return=representation",
        }
        payload = {
            "guest_id": guest_uuid,
            "day": d,
            "analysis_count": new_count,
        }

        with httpx.Client(timeout=10.0) as client:
            r = client.post(
                url,
                headers=headers,
                params={"on_conflict": "guest_id,day"},
                json=payload,
            )
            r.raise_for_status()

        return new_count

    def get_usage_count(self, principal_id: str) -> int:
        if is_guest_principal(principal_id):
            return self.get_guest_daily_usage(guest_uuid_from_principal(principal_id))
        return self.get_monthly_usage(principal_id)

    def increment_usage(self, principal_id: str) -> int:
        if is_guest_principal(principal_id):
            return self.increment_guest_daily_usage(guest_uuid_from_principal(principal_id))

        if not self.configured:
            print("[increment_usage] NOT CONFIGURED — returning 1 without writing")
            return 1

        ym = current_year_month()
        current = self.get_monthly_usage(principal_id, ym)
        new_count = current + 1
        print(f"[increment_usage] principal={principal_id} ym={ym} current={current} new_count={new_count}")

        url = f"{self.base_url}/rest/v1/usage_monthly"
        headers = {
            **self._headers(),
            "Prefer": "resolution=merge-duplicates,return=representation",
        }
        payload = {
            "user_id": principal_id,
            "year_month": ym,
            "analysis_count": new_count,
        }

        with httpx.Client(timeout=10.0) as client:
            r = client.post(
                url,
                headers=headers,
                params={"on_conflict": "user_id,year_month"},
                json=payload,
            )
            print(f"[increment_usage] response: {r.status_code} {r.text}")
            r.raise_for_status()

        return new_count

    def get_plan_summary(self, principal_id: str) -> dict[str, Any]:
        plan = self.get_user_plan(principal_id)
        limits = get_limits(plan)
        used = self.get_usage_count(principal_id)
        quota_limit = get_quota_limit(limits)

        return {
            "plan": plan,
            "yearMonth": current_year_month(),
            "quotaDay": current_utc_day() if plan == "guest" else None,
            "quotaPeriod": limits.get("quota_period", "month"),
            "analysesUsed": used,
            "analysesLimit": quota_limit,
            "limits": limits,
            "isGuest": plan == "guest",
        }


subscription_service = SubscriptionService()
