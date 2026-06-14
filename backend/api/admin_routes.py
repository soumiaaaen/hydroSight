from fastapi import APIRouter, Depends

from api.auth import get_user_id, require_admin
from services.subscription_service import subscription_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/me")
def get_my_role(user_id: str = Depends(get_user_id)):
    return {
        "userId": user_id,
        "role": subscription_service.get_user_role(user_id),
    }


@router.get("/users")
def list_users(_admin_id: str = Depends(require_admin)):
    if not subscription_service.configured:
        return {"users": []}

    import httpx

    # Fetch profiles
    profiles_url = f"{subscription_service.base_url}/rest/v1/profiles"
    params = {
        # Removed contract_type — column was dropped in migration 005
        "select": "id,plan,role,organization_id,created_at",
        "order": "created_at.desc",
    }

    # Fetch auth users to get emails (requires service role key)
    auth_url = f"{subscription_service.base_url}/auth/v1/admin/users"
    auth_params = {"per_page": 1000, "page": 1}

    with httpx.Client(timeout=10.0) as client:
        profiles_resp = client.get(
            profiles_url,
            headers=subscription_service._headers(),
            params=params,
        )
        profiles_resp.raise_for_status()
        profiles = profiles_resp.json()

        auth_resp = client.get(
            auth_url,
            headers=subscription_service._headers(),
            params=auth_params,
        )
        auth_resp.raise_for_status()
        auth_data = auth_resp.json()

    # Build id → email map from auth users
    auth_users = auth_data.get("users", auth_data) if isinstance(auth_data, dict) else auth_data
    email_map: dict = {u["id"]: u.get("email", "") for u in auth_users}

    # Merge email into each profile
    for profile in profiles:
        profile["email"] = email_map.get(profile["id"], "")

    return {"users": profiles}


@router.get("/contracts")
def list_contracts(_admin_id: str = Depends(require_admin)):
    if not subscription_service.configured:
        return {"contracts": []}

    import httpx

    url = f"{subscription_service.base_url}/rest/v1/contracts"
    params = {
        "select": "id,user_id,organization_id,type,status,plan,starts_at,expires_at,notes,created_at",
        "order": "created_at.desc",
    }

    with httpx.Client(timeout=10.0) as client:
        response = client.get(
            url,
            headers=subscription_service._headers(),
            params=params,
        )
        response.raise_for_status()
        contracts = response.json()

    return {"contracts": contracts}


@router.patch("/contracts/{contract_id}/status")
def update_contract_status(
    contract_id: str,
    body: dict,
    _admin_id: str = Depends(require_admin),
):
    if not subscription_service.configured:
        return {"ok": False}

    import httpx

    status = body.get("status")
    if status not in ("pending", "active", "expired", "cancelled"):
        return {"ok": False, "error": "Invalid status"}

    url = f"{subscription_service.base_url}/rest/v1/contracts"
    params = {"id": f"eq.{contract_id}"}

    with httpx.Client(timeout=10.0) as client:
        response = client.patch(
            url,
            headers=subscription_service._headers(),
            params=params,
            json={"status": status},
        )
        response.raise_for_status()

    return {"ok": True}


@router.get("/analytics")
def get_analytics(_admin_id: str = Depends(require_admin)):
    if not subscription_service.configured:
        return {}

    import httpx
    from config.plans import current_utc_day

    headers = subscription_service._headers()
    base = subscription_service.base_url

    with httpx.Client(timeout=10.0) as client:
        # Total users & plan breakdown
        profiles_r = client.get(
            f"{base}/rest/v1/profiles",
            headers=headers,
            params={"select": "plan,role"},
        )
        profiles_r.raise_for_status()
        profiles = profiles_r.json()

        # Monthly usage
        usage_r = client.get(
            f"{base}/rest/v1/usage_monthly",
            headers=headers,
            params={"select": "user_id,year_month,analysis_count", "order": "year_month.asc"},
        )
        usage_r.raise_for_status()
        usage = usage_r.json()

        # Guest usage today
        guest_r = client.get(
            f"{base}/rest/v1/guest_usage",
            headers=headers,
            params={"day": f"eq.{current_utc_day()}", "select": "analysis_count"},
        )
        guest_r.raise_for_status()
        guest = guest_r.json()

    plan_counts: dict[str, int] = {}
    for p in profiles:
        plan = p.get("plan") or "free"
        plan_counts[plan] = plan_counts.get(plan, 0) + 1

    month_map: dict[str, dict] = {}
    for row in usage:
        ym = row["year_month"]
        if ym not in month_map:
            month_map[ym] = {"total_analyses": 0, "active_users": 0}
        month_map[ym]["total_analyses"] += row["analysis_count"]
        month_map[ym]["active_users"] += 1

    guest_total = sum(g["analysis_count"] for g in guest)

    return {
        "total_users": len(profiles),
        "total_analyses": sum(r["analysis_count"] for r in usage),
        "guest_analyses_today": guest_total,
        "plan_breakdown": plan_counts,
        "monthly_usage": [
            {"year_month": ym, **v} for ym, v in month_map.items()
        ],
    }