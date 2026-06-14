from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load backend/.env so SUPABASE_JWT_SECRET is available to auth.py
load_dotenv(Path(__file__).resolve().parent / ".env")

from gee.client import initialize_gee
from api.routes import router
from api.subscription import router as subscription_router
from api.guest_routes import router as guest_router
from api.admin_routes import router as admin_router

app = FastAPI(title="GeoAI GEE Backend")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for dev only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

initialize_gee()

app.include_router(router)
app.include_router(subscription_router)
app.include_router(guest_router)
app.include_router(admin_router)

@app.get("/")
def home():
    return {"message": "GeoAI backend running 🚀"}