import json
import os

base_dir = r"c:\Users\dell\geoai-project\geoai-frontend\messages"

def load_json(lang):
    path = os.path.join(base_dir, f"{lang}.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(lang, data):
    path = os.path.join(base_dir, f"{lang}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

fr_updates = {
    "Sidebar": {
        "title": "SÉLECTION DE ZONE 1",
        "point": "Point GPS",
        "bbox": "Bbox",
        "province": "Province",
        "region": "Région",
        "national": "National",
        "period": "PÉRIODE D'ANALYSE",
        "start": "Début",
        "end": "Fin",
        "analyze_btn": "LANCER L'ANALYSE",
        "plan_demo": "PLAN DÉMO",
        "analyses_today": "aujourd'hui",
        "analyses_month": "ce mois",
        "signup": "S'inscrire"
    },
    "GuestBanner": {
        "demo_mode": "Mode démo",
        "demo_desc": "analyses restantes aujourd'hui · point GPS · occupation du sol · 3 mois max",
        "free_account": "Compte gratuit → analyses illimitées",
        "already_registered": "? Déjà inscrit"
    },
    "Map": {
        "legend_water": "STATUT HYDRIQUE",
        "allowed": "Ressources normales",
        "moderated": "Stress modéré",
        "prohibited": "Surexploitation",
        "critical": "Crise sévère",
        "legend_lu": "OCCUPATION DU SOL",
        "forest": "Forêt dense",
        "shrub": "Arbustes",
        "grass": "Lande herbacée",
        "crop": "Terres cultivées",
        "urban": "Zone urbanisée",
        "sparse": "Végétation éparse",
        "water": "Eau permanente",
        "bare": "Sol nu"
    }
}

en_updates = {
    "Sidebar": {
        "title": "ZONE SELECTION 1",
        "point": "GPS Point",
        "bbox": "BBox",
        "province": "Province",
        "region": "Region",
        "national": "National",
        "period": "ANALYSIS PERIOD",
        "start": "Start",
        "end": "End",
        "analyze_btn": "RUN ANALYSIS",
        "plan_demo": "DEMO PLAN",
        "analyses_today": "today",
        "analyses_month": "this month",
        "signup": "Sign up"
    },
    "GuestBanner": {
        "demo_mode": "Demo mode",
        "demo_desc": "analyses remaining today · GPS point · land cover · 3 months max",
        "free_account": "Free account → unlimited analyses",
        "already_registered": "Already registered?"
    },
    "Map": {
        "legend_water": "WATER STATUS",
        "allowed": "Normal resources",
        "moderated": "Moderate stress",
        "prohibited": "Overexploitation",
        "critical": "Severe crisis",
        "legend_lu": "LAND COVER",
        "forest": "Dense forest",
        "shrub": "Shrubs",
        "grass": "Grassland",
        "crop": "Cropland",
        "urban": "Urban zone",
        "sparse": "Sparse vegetation",
        "water": "Permanent water",
        "bare": "Bare soil"
    }
}

ar_updates = {
    "Sidebar": {
        "title": "اختيار المنطقة 1",
        "point": "نقطة GPS",
        "bbox": "مربع التحديد",
        "province": "إقليم",
        "region": "جهة",
        "national": "وطني",
        "period": "فترة التحليل",
        "start": "البداية",
        "end": "النهاية",
        "analyze_btn": "بدء التحليل",
        "plan_demo": "خطة تجريبية",
        "analyses_today": "اليوم",
        "analyses_month": "هذا الشهر",
        "signup": "تسجيل"
    },
    "GuestBanner": {
        "demo_mode": "وضع العرض التوضيحي",
        "demo_desc": "تحليلات متبقية اليوم · نقطة GPS · استخدام الأراضي · 3 أشهر كحد أقصى",
        "free_account": "حساب مجاني ← تحليلات غير محدودة",
        "already_registered": "مسجل بالفعل؟"
    },
    "Map": {
        "legend_water": "حالة المياه",
        "allowed": "موارد طبيعية",
        "moderated": "إجهاد معتدل",
        "prohibited": "استغلال مفرط",
        "critical": "أزمة حادة",
        "legend_lu": "استخدام الأراضي",
        "forest": "غابة كثيفة",
        "shrub": "شجيرات",
        "grass": "أراضي عشبية",
        "crop": "أراضي زراعية",
        "urban": "منطقة حضرية",
        "sparse": "نباتات متناثرة",
        "water": "مياه دائمة",
        "bare": "أرض جرداء"
    }
}

for lang, updates in [("fr", fr_updates), ("en", en_updates), ("ar", ar_updates)]:
    data = load_json(lang)
    data.update(updates)
    save_json(lang, data)
