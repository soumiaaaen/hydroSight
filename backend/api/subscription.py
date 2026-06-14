from fastapi import APIRouter, Depends

from api.auth import get_principal_id
from services.subscription_service import subscription_service

router = APIRouter(prefix="/subscription", tags=["subscription"])


@router.get("/me")
def get_my_subscription(principal_id: str = Depends(get_principal_id)):
    summary = subscription_service.get_plan_summary(principal_id)
    if not principal_id.startswith("guest:"):
        summary["role"] = subscription_service.get_user_role(principal_id)
    return summary
