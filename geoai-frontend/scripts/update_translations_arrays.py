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
    "inv_cards": [
        {"title": "10× Plus Rapide", "desc": "Les études terrain prennent des semaines. GeoAI livre les mêmes infos en moins de 3s."},
        {"title": "Réduction des Coûts", "desc": "Remplacez les infrastructures coûteuses par l'intelligence satellitaire."},
        {"title": "ROI Basé sur la Donnée", "desc": "Les clients rapportent une amélioration de 15-30% des rendements."}
    ],
    "feat_cards": [
        {"title": "Suivi de la Végétation", "desc": "Calcul NDVI en temps réel. Détectez la santé et le stress de la végétation."},
        {"title": "Occupation du Sol", "desc": "Classification automatique par IA des forêts, cultures, zones urbaines, eau."},
        {"title": "Analyse de l'Eau", "desc": "Suivi de l'étendue de l'eau et des indicateurs de sécheresse."},
        {"title": "Carte Interactive", "desc": "Carte Leaflet avec sélection de points, zones et provinces."},
        {"title": "Séries Temporelles", "desc": "Suivi temporel sur des périodes personnalisées avec graphiques."},
        {"title": "Sécurité Entreprise", "desc": "Authentification JWT et contrôle d'accès basé sur les rôles."}
    ],
    "work_cards": [
        {"title": "Sélectionnez votre zone", "desc": "Choisissez une coordonnée, dessinez une zone ou sélectionnez une province."},
        {"title": "Lancez l'analyse", "desc": "Choisissez l'indicateur et déclenchez le calcul Google Earth Engine."},
        {"title": "Agissez sur les résultats", "desc": "Recevez des résultats visuels, des graphiques et des interprétations IA."}
    ],
    "use_cards": [
        {"title": "Agriculture", "desc": "Suivez la santé des cultures pour optimiser les rendements."},
        {"title": "Ressources en Eau", "desc": "Gérez l'étendue des eaux de surface et la sécheresse."},
        {"title": "Gouvernement", "desc": "Soutien décisionnel pour la régulation de l'utilisation des terres."},
        {"title": "Recherche", "desc": "Ensembles de données pour la science du climat."},
        {"title": "ONG Conservation", "desc": "Détectez la déforestation en temps quasi réel."},
        {"title": "Investissement", "desc": "Surveillez l'impact environnemental pour les portefeuilles ESG."}
    ],
    "tech_cards": [
        {"label": "Frontend", "items": ["Next.js 14", "React + TypeScript", "Tailwind CSS", "Leaflet", "API REST"]},
        {"label": "Backend", "items": ["FastAPI (Python)", "Google Earth Engine", "Services NDVI", "API de zone", "Sécurité JWT"]},
        {"label": "Données", "items": ["Images Sentinel-2", "Résolution 10m", "Revisite 5 jours", "Contrôle d'accès", "Couches GeoJSON"]}
    ],
    "faqs": [
        {"q": "Quelles données utilisez-vous ?", "a": "Sentinel-2 via Google Earth Engine, résolution 10m."},
        {"q": "Quelles échelles géographiques ?", "a": "D'un point unique à l'échelle nationale."},
        {"q": "Comment fonctionne l'IA ?", "a": "FastAPI + GEE calculent en temps réel et renvoient les résultats."},
        {"q": "Ai-je besoin d'un compte ?", "a": "Non, une démo est disponible. Un compte gratuit débloque plus d'analyses."},
        {"q": "Faites-vous des séries temporelles ?", "a": "Oui, vous pouvez suivre n'importe quel indicateur dans le temps."}
    ]
}

en_updates = {
    "inv_cards": [
        {"title": "10× Faster Than Manual", "desc": "Traditional field surveys take weeks. GeoAI delivers in under 3 seconds."},
        {"title": "Reduce Operational Costs", "desc": "Replace expensive on-site monitoring with satellite intelligence."},
        {"title": "Data-Driven ROI", "desc": "Clients report 15–30% yield improvement."}
    ],
    "feat_cards": [
        {"title": "Vegetation Monitoring", "desc": "Real-time NDVI computation. Detect vegetation health and stress."},
        {"title": "Land Use Classification", "desc": "AI-powered automatic classification into forest, crops, urban, water."},
        {"title": "Water Analysis", "desc": "Monitor water extent changes and drought indicators."},
        {"title": "Interactive Map", "desc": "Leaflet-based map with point, bbox, and province selection."},
        {"title": "Time Series Analysis", "desc": "Temporal monitoring over custom date ranges with interactive charts."},
        {"title": "Enterprise Security", "desc": "JWT-based authentication with role-based access control."}
    ],
    "work_cards": [
        {"title": "Select Your Zone", "desc": "Pick a coordinate, draw a bbox, or select a province."},
        {"title": "Run Analysis", "desc": "Choose your indicator and trigger Google Earth Engine computation."},
        {"title": "Act on Insights", "desc": "Receive visualized results, charts, and AI interpretation."}
    ],
    "use_cards": [
        {"title": "Agriculture & Farming", "desc": "Track crop health to optimize yield and reduce waste."},
        {"title": "Water Resource Management", "desc": "Monitor surface water extent and drought indicators."},
        {"title": "Government & Policy", "desc": "Decision support for land use and ESG reporting."},
        {"title": "Research & Academia", "desc": "Time series datasets for climate science and ecology."},
        {"title": "Conservation NGOs", "desc": "Detect deforestation and habitat change in near real-time."},
        {"title": "Sustainable Investment", "desc": "Monitor environmental impact for ESG portfolios."}
    ],
    "tech_cards": [
        {"label": "Frontend", "items": ["Next.js 14", "React + TypeScript", "Tailwind CSS", "Leaflet", "REST API"]},
        {"label": "Backend", "items": ["FastAPI (Python)", "Google Earth Engine", "NDVI services", "Zone API", "JWT security"]},
        {"label": "Data & Security", "items": ["Sentinel-2 imagery", "10m resolution", "5-day revisit", "Role-based access", "GeoJSON layers"]}
    ],
    "faqs": [
        {"q": "What satellite data does GeoAI use?", "a": "Sentinel-2 imagery via Google Earth Engine, updated every 5 days."},
        {"q": "What geographic scales are supported?", "a": "From a single point to national scale."},
        {"q": "How is the AI analysis performed?", "a": "Backend computes indices and classifications in real time."},
        {"q": "Do I need an account?", "a": "No, try the demo without signing up. A free account unlocks more."},
        {"q": "Can I run time series analysis?", "a": "Absolutely. Monitor indicators over custom periods."}
    ]
}

ar_updates = {
    "inv_cards": [
        {"title": "أسرع 10 مرات", "desc": "الاستطلاعات الميدانية تستغرق أسابيع. تقدم GeoAI النتائج في أقل من 3 ثوانٍ."},
        {"title": "تقليل تكاليف التشغيل", "desc": "استبدل المراقبة الميدانية المكلفة بذكاء الأقمار الصناعية."},
        {"title": "عائد استثمار مدعوم بالبيانات", "desc": "يبلغ العملاء عن تحسن في العائد بنسبة 15-30٪."}
    ],
    "feat_cards": [
        {"title": "مراقبة الغطاء النباتي", "desc": "حساب NDVI في الوقت الفعلي. اكتشف صحة النباتات والإجهاد."},
        {"title": "تصنيف استخدام الأراضي", "desc": "تصنيف آلي بالذكاء الاصطناعي للغابات والمحاصيل والمناطق الحضرية والمياه."},
        {"title": "تحليل المياه", "desc": "مراقبة تغيرات امتداد المياه ومؤشرات الجفاف."},
        {"title": "خريطة تفاعلية", "desc": "خريطة Leaflet مع اختيار النقاط والمناطق والمقاطعات."},
        {"title": "تحليل السلاسل الزمنية", "desc": "مراقبة زمنية عبر نطاقات تاريخ مخصصة مع رسوم بيانية تفاعلية."},
        {"title": "أمان المؤسسات", "desc": "مصادقة JWT مع التحكم في الوصول القائم على الأدوار."}
    ],
    "work_cards": [
        {"title": "حدد منطقتك", "desc": "اختر إحداثية، ارسم منطقة، أو اختر مقاطعة."},
        {"title": "قم بتشغيل التحليل", "desc": "اختر المؤشر وقم بتشغيل حساب Google Earth Engine."},
        {"title": "تصرف بناءً على الرؤى", "desc": "احصل على نتائج مرئية ورسوم بيانية وتفسير بالذكاء الاصطناعي."}
    ],
    "use_cards": [
        {"title": "الزراعة", "desc": "تتبع صحة المحاصيل لتحسين الغلة وتقليل الهدر."},
        {"title": "إدارة الموارد المائية", "desc": "مراقبة امتداد المياه السطحية ومؤشرات الجفاف."},
        {"title": "الحكومة والسياسة", "desc": "دعم اتخاذ القرار لاستخدام الأراضي وتقارير ESG."},
        {"title": "البحث الأكاديمي", "desc": "مجموعات بيانات السلاسل الزمنية لعلوم المناخ والبيئة."},
        {"title": "المنظمات غير الحكومية للحفظ", "desc": "اكتشف إزالة الغابات وتغير الموائل في الوقت الفعلي تقريبًا."},
        {"title": "الاستثمار المستدام", "desc": "مراقبة التأثير البيئي لمحافظ ESG."}
    ],
    "tech_cards": [
        {"label": "الواجهة الأمامية", "items": ["Next.js 14", "React + TypeScript", "Tailwind CSS", "Leaflet", "REST API"]},
        {"label": "الخلفية", "items": ["FastAPI (Python)", "Google Earth Engine", "خدمات NDVI", "Zone API", "أمان JWT"]},
        {"label": "البيانات والأمان", "items": ["صور Sentinel-2", "دقة 10 أمتار", "زيارة كل 5 أيام", "وصول قائم على الأدوار", "طبقات GeoJSON"]}
    ],
    "faqs": [
        {"q": "ما هي بيانات الأقمار الصناعية التي تستخدمها GeoAI؟", "a": "صور Sentinel-2 عبر Google Earth Engine."},
        {"q": "ما هي المقاييس الجغرافية المدعومة؟", "a": "من نقطة واحدة إلى النطاق الوطني."},
        {"q": "كيف يتم إجراء تحليل الذكاء الاصطناعي؟", "a": "تقوم الخلفية بحساب المؤشرات والتصنيفات في الوقت الفعلي."},
        {"q": "هل أحتاج إلى حساب؟", "a": "لا، جرب العرض التوضيحي بدون تسجيل. يفتح الحساب المجاني المزيد."},
        {"q": "هل يمكنني إجراء تحليل السلاسل الزمنية؟", "a": "بالتأكيد. راقب المؤشرات عبر فترات مخصصة."}
    ]
}

for lang, updates in [("fr", fr_updates), ("en", en_updates), ("ar", ar_updates)]:
    data = load_json(lang)
    data["Landing"].update(updates)
    save_json(lang, data)
