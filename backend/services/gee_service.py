import ee
import time
import json
import concurrent.futures
from functools import lru_cache

try:
    import redis as redis_lib
except ImportError:
    redis_lib = None  # type: ignore


class GEEService:

    # ─────────────────────────────────────────────────────────────────────────
    # CLASS-LEVEL CACHES
    # ─────────────────────────────────────────────────────────────────────────

    # GWSA long-term reference mean — computed once per unique zone, never expires
    _gwsa_ref_cache: dict = {}

    # Redis client — shared across all calls
    # Falls back gracefully if Redis is not running
    try:
        if redis_lib is None:
            raise RuntimeError("redis package not installed")
        _redis = redis_lib.Redis(host="localhost", port=6379, decode_responses=True)
        _redis.ping()  # confirm connection at import time
    except Exception:
        _redis = None

    _ANALYSIS_TTL: int = 3600  # cache TTL in seconds (1 hour)

    # ─────────────────────────────────────────────────────────────────────────
    # INTERNAL HELPERS
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _zone_key(zone) -> str:
        try:
            info = zone.getInfo()
            return json.dumps({
                "type": info.get("type"),
                "coordinates": info.get("coordinates"),
            }, sort_keys=True)
        except Exception:
            return "global_fallback"

    @staticmethod
    def _simplify(geometry, max_error: int = 1000):
        """
        Simplify complex geometries (national borders, large provinces) before
        passing them to GEE operations. Fewer vertices → faster server-side
        processing. max_error is in metres; 1000 m is imperceptible at
        province/national scale.
        """
        try:
            return geometry.simplify(maxError=max_error)
        except Exception:
            return geometry

    @staticmethod
    def _cache_get(key: str) -> dict | None:
        """
        Read from Redis if available, otherwise return None.
        If Redis is down, silently falls through to a fresh GEE computation.
        """
        if GEEService._redis is None:
            return None
        try:
            raw = GEEService._redis.get(key)
            return json.loads(raw) if raw else None
        except Exception:
            return None

    @staticmethod
    def _cache_set(key: str, value: dict) -> None:
        """
        Write to Redis if available. Silent no-op if Redis is down.
        TTL = _ANALYSIS_TTL seconds.
        """
        if GEEService._redis is None:
            return
        try:
            GEEService._redis.setex(key, GEEService._ANALYSIS_TTL, json.dumps(value))
        except Exception:
            pass

    @staticmethod
    def _get_gwsa_ref_mean(zone) -> float | None:
        """
        Long-term GRACE reference mean (2004–2023) for a zone.
        Cached in _gwsa_ref_cache — the expensive EE call only ever runs once
        per unique zone for the lifetime of the process.
        """
        key = GEEService._zone_key(zone)
        if key in GEEService._gwsa_ref_cache:
            return GEEService._gwsa_ref_cache[key]
        try:
            ref = (
                ee.ImageCollection("NASA/GRACE/MASS_GRIDS_V04/MASCON_CRI")
                .filterDate("2004-01-01", "2023-12-31")
                .mean()
                .select("lwe_thickness")
                .reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=zone,
                    scale=5000,
                    maxPixels=1e9,
                    bestEffort=True,
                )
                .get("lwe_thickness")
                .getInfo()
            )
            GEEService._gwsa_ref_cache[key] = ref
            return ref
        except Exception as e:
            print(f"Error computing GWSA reference mean: {e}")
            return None

    # ─────────────────────────────────────────────────────────────────────────
    # GEOMETRY HELPERS
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def get_morocco_geometry():
        """Full Morocco geometry including Western Sahara."""
        return (
            ee.FeatureCollection("FAO/GAUL/2015/level0")
            .filter(
                ee.Filter.Or(
                    ee.Filter.eq("ADM0_NAME", "Morocco"),
                    ee.Filter.eq("ADM0_NAME", "Western Sahara"),
                )
            )
            .geometry()
        )

    @staticmethod
    def get_morocco_country_codes():
        """ADM0_CODE values for Morocco and Western Sahara."""
        return (
            ee.FeatureCollection("FAO/GAUL/2015/level0")
            .filter(
                ee.Filter.Or(
                    ee.Filter.eq("ADM0_NAME", "Morocco"),
                    ee.Filter.eq("ADM0_NAME", "Western Sahara"),
                )
            )
            .aggregate_array("ADM0_CODE")
            .getInfo()
        )

    @staticmethod
    def get_provinces_geojson():
        try:
            codes = GEEService.get_morocco_country_codes()
            return (
                ee.FeatureCollection("FAO/GAUL/2015/level2")
                .filter(ee.Filter.inList("ADM0_CODE", codes))
                .select(["ADM0_NAME", "ADM1_NAME", "ADM2_NAME"])
                .getInfo()
            )
        except Exception as e:
            print(f"Error in get_provinces_geojson: {e}")
            return None

    @staticmethod
    def get_regions_geojson():
        try:
            codes = GEEService.get_morocco_country_codes()
            return (
                ee.FeatureCollection("FAO/GAUL/2015/level1")
                .filter(ee.Filter.inList("ADM0_CODE", codes))
                .select(["ADM0_NAME", "ADM1_NAME"])
                .getInfo()
            )
        except Exception as e:
            print(f"Error in get_regions_geojson: {e}")
            return None

    @staticmethod
    def get_province_geometry(province_name: str):
        try:
            codes = GEEService.get_morocco_country_codes()
            return (
                ee.FeatureCollection("FAO/GAUL/2015/level2")
                .filter(ee.Filter.inList("ADM0_CODE", codes))
                .filter(ee.Filter.eq("ADM2_NAME", province_name))
                .geometry()
            )
        except Exception as e:
            print(f"Error in get_province_geometry: {e}")
            return None

    @staticmethod
    def get_region_geometry(region_name: str):
        try:
            codes = GEEService.get_morocco_country_codes()
            return (
                ee.FeatureCollection("FAO/GAUL/2015/level1")
                .filter(ee.Filter.inList("ADM0_CODE", codes))
                .filter(ee.Filter.eq("ADM1_NAME", region_name))
                .geometry()
            )
        except Exception as e:
            print(f"Error in get_region_geometry: {e}")
            return None

    # ─────────────────────────────────────────────────────────────────────────
    # TILE MAP ENDPOINTS  (lru_cache → instant on repeated calls)
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def get_ndvi(lat, lon, scale=30):
        """NDVI value at a single point (most recent Sentinel-2 image)."""
        try:
            point = ee.Geometry.Point([lon, lat])
            image = (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterBounds(point)
                .sort("system:time_start", False)
                .first()
            )
            ndvi = image.normalizedDifference(["B8", "B4"]).rename("NDVI")
            return (
                ndvi.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=point,
                    scale=scale,
                    bestEffort=True,
                )
                .get("NDVI")
                .getInfo()
            )
        except Exception as e:
            print(f"Error in get_ndvi: {e}")
            return None

    @staticmethod
    @lru_cache(maxsize=4)
    def get_ndvi_map():
        """Tile URL for NDVI map over Morocco (2024 median). Cached."""
        try:
            region = GEEService.get_morocco_geometry()
            ndvi = (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterBounds(region)
                .filterDate("2024-01-01", "2024-12-31")
                .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
                .select(["B4", "B8"])
                .median()
                .clip(region)
                .normalizedDifference(["B8", "B4"])
                .rename("NDVI")
            )
            vis = ndvi.visualize(min=0, max=1, palette=["#8B0000", "#FFFF00", "#00FF00"])
            map_id = vis.getMapId()
            return {
                "mapid": map_id["mapid"],
                "token": map_id["token"],
                "tile_url": map_id["tile_fetcher"].url_format,
            }
        except Exception as e:
            print(f"Error in get_ndvi_map: {e}")
            return None

    @staticmethod
    @lru_cache(maxsize=4)
    def get_landcover_map():
        """Tile URL for ESA WorldCover land use map over Morocco. Cached."""
        try:
            region = GEEService.get_morocco_geometry()
            image = ee.Image("ESA/WorldCover/v200/2021").select("Map").clip(region)
            vis_params = {
                "min": 10,
                "max": 100,
                "palette": [
                    "006400", "ffbb22", "ffff4c", "f096ff",
                    "fa0000", "b4b4b4", "f0f0f0", "0064c8",
                ],
            }
            map_id = image.getMapId(vis_params)
            return {
                "mapid": map_id["mapid"],
                "token": map_id["token"],
                "tile_url": map_id["tile_fetcher"].url_format,
            }
        except Exception as e:
            print(f"Error in get_landcover_map: {e}")
            return None

    @staticmethod
    @lru_cache(maxsize=4)
    def get_gwsa_map():
        """Tile URL for GRACE GWSA map over Morocco. Cached."""
        try:
            region = GEEService.get_morocco_geometry()
            anomaly = (
                ee.ImageCollection("NASA/GRACE/MASS_GRIDS_V04/MASCON_CRI")
                .select("lwe_thickness")
                .sort("system:time_start", False)
                .first()
                .clip(region)
            )
            map_id = anomaly.getMapId(
                {"min": -20, "max": 20, "palette": ["EF4444", "F9FAFB", "3B82F6"]}
            )
            return {
                "mapid": map_id["mapid"],
                "token": map_id["token"],
                "tile_url": map_id["tile_fetcher"].url_format,
            }
        except Exception as e:
            print(f"Error in get_gwsa_map: {e}")
            return None

    @staticmethod
    @lru_cache(maxsize=4)
    def get_water_extent_map():
        """Tile URL for Water extent map over Morocco (JRC). Cached."""
        try:
            region = GEEService.get_morocco_geometry()
            water_mask = (
                ee.Image("JRC/GSW1_4/GlobalSurfaceWater")
                .select("occurrence")
                .clip(region)
                .gt(0)
                .selfMask()
            )
            map_id = water_mask.getMapId({"min": 1, "max": 1, "palette": ["3B82F6"]})
            return {
                "mapid": map_id["mapid"],
                "token": map_id["token"],
                "tile_url": map_id["tile_fetcher"].url_format,
            }
        except Exception as e:
            print(f"Error in get_water_extent_map: {e}")
            return None

    # ─────────────────────────────────────────────────────────────────────────
    # ANALYSIS — MAIN ORCHESTRATOR
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def run_analysis(zone_geometry, date_debut: str, date_fin: str) -> dict:
        """
        Computes all 5 environmental indicators and returns the decision result.

        Optimisations applied:
        ┌──────────────────────────────────────────────────────────────────┐
        │ 1. Redis cache (1 h TTL) — survives restarts, shared across     │
        │    workers. Falls back silently if Redis is not running.        │
        │ 2. Single .getInfo() — all 5 reductions in one HTTP request.   │
        │    GEE parallelises independent branches server-side.           │
        │ 3. Geometry simplification — fewer vertices, faster spatial op. │
        │ 4. GWSA reference mean cached in memory across calls.           │
        │ 5. .select() before .median() — only 3 S2 bands loaded.        │
        │ 6. bestEffort=True everywhere — no silent None on large zones.  │
        └──────────────────────────────────────────────────────────────────┘
        """
        # ── 1. Check Redis cache ──────────────────────────────────────────────
        zone_key  = GEEService._zone_key(zone_geometry)
        cache_key = f"hydrosight:analysis:{zone_key}:{date_debut}:{date_fin}"
        cached    = GEEService._cache_get(cache_key)
        if cached:
            return cached

        # ── 2. Simplify geometry ──────────────────────────────────────────────
        zone = GEEService._simplify(zone_geometry)

        try:
            if zone.type().getInfo() == "Point":
                zone = zone.buffer(500)  # 500m radius → pixels exist at scale=100
        except Exception:
            pass

        # ── 3. Prime GWSA cache (no-op if already cached) ────────────────────
        ref_mean = GEEService._get_gwsa_ref_mean(zone)

        # ── 4. Build all EE image objects — fully lazy, zero network calls ───

        # CHIRPS: total precipitation over the period
        chirps_img = (
            ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
            .filterDate(date_debut, date_fin)
            .sum()
            .select("precipitation")
        )

        # MODIS MOD16A2: total evapotranspiration over the period
        et_img = (
            ee.ImageCollection("MODIS/061/MOD16A2")
            .filterDate(date_debut, date_fin)
            .select("ET")
            .sum()
        )

        # GRACE MASCON: current period mean groundwater storage
        grace_img = (
            ee.ImageCollection("NASA/GRACE/MASS_GRIDS_V04/MASCON_CRI")
            .filterDate(date_debut, date_fin)
            .mean()
            .select("lwe_thickness")
        )

        # Sentinel-2: only load B3/B4/B8 (the 3 bands needed for NDVI + NDWI).
        # Cuts S2 data volume to ~23% of the full 13-band collection.
        s2_median = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(zone)
            .filterDate(date_debut, date_fin)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
            .select(["B3", "B4", "B8"])
            .median()
        )
        s2_combined = (
            s2_median.normalizedDifference(["B8", "B4"]).rename("NDVI")
            .addBands(s2_median.normalizedDifference(["B3", "B8"]).rename("NDWI"))
        )

        # Sentinel-1 SAR: water extent (VV < -16 dB → water pixel)
        s1_water = (
            ee.ImageCollection("COPERNICUS/S1_GRD")
            .filterBounds(zone)
            .filterDate(date_debut, date_fin)
            .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
            .filter(ee.Filter.eq("instrumentMode", "IW"))
            .filter(ee.Filter.eq("orbitProperties_pass", "DESCENDING"))
            .select("VV")
            .median()
            .lt(-16)
            .rename("water")
            .multiply(ee.Image.pixelArea())
        )

        # ── 5. Build reductions — still lazy, no network calls yet ───────────
        precip_val = chirps_img.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=zone, scale=5000, maxPixels=1e9, bestEffort=True,
        ).get("precipitation")

        et_val = et_img.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=zone, scale=500, maxPixels=1e9, bestEffort=True,
        ).get("ET")

        grace_val = grace_img.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=zone, scale=5000, maxPixels=1e9, bestEffort=True,
        ).get("lwe_thickness")

        s2_dict = s2_combined.reduceRegion(
            reducer=ee.Reducer.median(),
            geometry=zone, scale=100, maxPixels=1e9, bestEffort=True,
        )

        water_val = s1_water.reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=zone, scale=100, maxPixels=1e9, bestEffort=True,
        ).get("water")

        # ── 6. SINGLE .getInfo() — one HTTP request to GEE ───────────────────
        # GEE evaluates all 5 branches in parallel on its servers and returns
        # everything in one response.
        try:
            raw = ee.Dictionary({
                "precip":          precip_val,
                "et_raw":          et_val,
                "gwsa_current":    grace_val,
                "ndvi":            s2_dict.get("NDVI"),
                "ndwi":            s2_dict.get("NDWI"),
                "water_area_sqm":  water_val,
            }).getInfo()
        except Exception as e:
            print(f"Error in run_analysis .getInfo(): {e}")
            raw = {}

        # ── 7. Post-process raw values ────────────────────────────────────────
        precip           = round(raw.get("precip") or 0.0, 2)
        et_raw_val       = raw.get("et_raw")
        et               = round(et_raw_val * 0.1, 2) if et_raw_val is not None else 0.0
        gwsa_current     = raw.get("gwsa_current")
        gwsa             = round(gwsa_current - ref_mean, 3) if (gwsa_current is not None and ref_mean is not None) else 0.0
        ndvi             = round(raw.get("ndvi") or 0.0, 4)
        ndwi             = round(raw.get("ndwi") or 0.0, 4)
        water_sqm        = raw.get("water_area_sqm")
        water_extent_km2 = round(water_sqm / 1e6, 2) if water_sqm is not None else 0.0

        climate_water_balance = round(precip - et, 2)

        # ── 8. Multi-criteria scoring ─────────────────────────────────────────
        score = 0

        if gwsa < -15:
            score += 3
        elif gwsa < -5:
            score += 2

        if climate_water_balance < 0:
            score += 2
        elif climate_water_balance < 50:
            score += 1

        if ndvi > 0.6 and ndwi > 0.3:
            score += 2
        elif ndvi > 0.4:
            score += 1

        if water_extent_km2 < 50:
            score += 1

        # ── 9. Classification ─────────────────────────────────────────────────
        if score >= 7:
            status         = "CRITICAL"
            recommendation = "Crise hydrique sévère. Arrêt immédiat obligatoire."
        elif score >= 5:
            status         = "PROHIBITED"
            recommendation = "Surexploitation détectée. Nouveaux forages interdits."
        elif score >= 3:
            status         = "MODERATED"
            recommendation = "Stress modéré détecté. Quotas d'irrigation recommandés."
        else:
            status         = "ALLOWED"
            recommendation = "Ressources en bon état. Utilisation normale autorisée."

        result = {
            "groundwater": {
                "gwsa":                  gwsa,
                "precipitation":         precip,
                "et":                    et,
                "climate_water_balance": climate_water_balance,
            },
            "surface_water": {"water_extent_km2": water_extent_km2},
            "land_use":      {"ndvi": ndvi, "ndwi": ndwi},
            "decision": {
                "score":          score,
                "status":         status,
                "recommendation": recommendation,
            },
        }

        # ── 10. Store in Redis ────────────────────────────────────────────────
        GEEService._cache_set(cache_key, result)
        return result

    # ─────────────────────────────────────────────────────────────────────────
    # TIME SERIES
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _timeseries_chirps_server_side(zone, date_debut: str, date_fin: str) -> list:
        """
        CHIRPS monthly precipitation — ALL months in ONE .getInfo() call.
        Uses server-side ee.List.map() to build a FeatureCollection of monthly
        sums, then retrieves everything at once.
        """
        start   = ee.Date(date_debut)
        n       = int(ee.Date(date_fin).difference(start, "month").ceil().getInfo())
        offsets = ee.List.sequence(0, n - 1)

        def monthly_feature(offset):
            offset = ee.Number(offset)
            d1     = start.advance(offset, "month")
            d2     = d1.advance(1, "month")
            val    = (
                ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
                .filterDate(d1, d2)
                .sum()
                .select("precipitation")
                .reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=zone, scale=5000,
                    maxPixels=1e9, bestEffort=True,
                )
                .get("precipitation")
            )
            return ee.Feature(None, {"date": d1.format("YYYY-MM"), "value": val})

        raw    = ee.FeatureCollection(offsets.map(monthly_feature)).getInfo()
        result = []
        for f in raw.get("features", []):
            p = f.get("properties", {})
            if p.get("value") is not None:
                result.append({"date": p["date"], "value": round(p["value"], 2)})
        return sorted(result, key=lambda x: x["date"])

    @staticmethod
    def _timeseries_grace_server_side(zone, date_debut: str, date_fin: str) -> list:
        """
        GRACE monthly anomaly — ALL months in ONE .getInfo() call.
        Reference mean (cached) is passed as an ee.Number into the server-side
        map function so the anomaly subtraction happens inside GEE, not Python.
        """
        ref_mean = GEEService._get_gwsa_ref_mean(zone)
        ref_ee   = ee.Number(ref_mean if ref_mean is not None else 0.0)

        start   = ee.Date(date_debut)
        n       = int(ee.Date(date_fin).difference(start, "month").ceil().getInfo())
        offsets = ee.List.sequence(0, n - 1)

        def monthly_feature(offset):
            offset  = ee.Number(offset)
            d1      = start.advance(offset, "month")
            d2      = d1.advance(1, "month")
            raw_val = (
                ee.ImageCollection("NASA/GRACE/MASS_GRIDS_V04/MASCON_CRI")
                .filterDate(d1, d2)
                .mean()
                .select("lwe_thickness")
                .reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=zone, scale=5000,
                    maxPixels=1e9, bestEffort=True,
                )
                .get("lwe_thickness")
            )
            anomaly = ee.Number(raw_val).subtract(ref_ee)
            return ee.Feature(None, {"date": d1.format("YYYY-MM"), "value": anomaly})

        raw    = ee.FeatureCollection(offsets.map(monthly_feature)).getInfo()
        result = []
        for f in raw.get("features", []):
            p = f.get("properties", {})
            if p.get("value") is not None:
                result.append({"date": p["date"], "value": round(p["value"], 3)})
        return sorted(result, key=lambda x: x["date"])

    @staticmethod
    def _timeseries_ndvi_parallel(zone, date_debut: str, date_fin: str) -> list:
        """
        NDVI monthly series — parallel ThreadPoolExecutor.
        Sentinel-2 monthly composites are too heavy for server-side ee.List.map()
        on large zones (GEE memory limits), so we keep client-side parallelism
        with one thread per month.
        Only B4 + B8 are loaded per image (NDVI only needs these two bands).
        """
        start = ee.Date(date_debut)
        n     = int(ee.Date(date_fin).difference(start, "month").ceil().getInfo())

        def fetch_month(i: int):
            d1    = ee.Date(date_debut).advance(i, "month")
            d2    = d1.advance(1, "month")
            label = d1.format("YYYY-MM").getInfo()
            try:
                val = (
                    ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                    .filterBounds(zone)
                    .filterDate(d1, d2)
                    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
                    .select(["B4", "B8"])
                    .median()
                    .normalizedDifference(["B8", "B4"])
                    .rename("NDVI")
                    .reduceRegion(
                        reducer=ee.Reducer.median(),
                        geometry=zone, scale=100,
                        maxPixels=1e9, bestEffort=True,
                    )
                    .get("NDVI")
                    .getInfo()
                )
                return (i, label, round(val, 4) if val is not None else None)
            except Exception as e:
                print(f"Error NDVI month {i}: {e}")
                return (i, label, None)

        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
            futures = {ex.submit(fetch_month, i): i for i in range(n)}
            for future in concurrent.futures.as_completed(futures):
                results.append(future.result())

        results.sort(key=lambda x: x[0])
        return [
            {"date": label, "value": val}
            for (_, label, val) in results
            if val is not None
        ]

    @staticmethod
    def get_timeseries(
        zone_geometry, date_debut: str, date_fin: str, dataset: str
    ) -> list:
        """
        Returns monthly time series for a given dataset.

        dataset = "chirps" → single .getInfo() via server-side ee.List.map()
        dataset = "grace"  → single .getInfo() via server-side ee.List.map()
        dataset = "ndvi"   → parallel ThreadPoolExecutor (S2 too heavy for
                             server-side map on large zones)

        Returns: [{ "date": "YYYY-MM", "value": float }, ...]
        """
        zone = GEEService._simplify(zone_geometry)
        try:
            if dataset == "chirps":
                return GEEService._timeseries_chirps_server_side(zone, date_debut, date_fin)
            elif dataset == "grace":
                return GEEService._timeseries_grace_server_side(zone, date_debut, date_fin)
            elif dataset == "ndvi":
                return GEEService._timeseries_ndvi_parallel(zone, date_debut, date_fin)
            else:
                print(f"Unknown dataset: {dataset}")
                return []
        except Exception as e:
            print(f"Error in get_timeseries ({dataset}): {e}")
            return []