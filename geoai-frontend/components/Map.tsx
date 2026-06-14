"use client";

import { MapContainer, TileLayer, useMapEvents, useMap, GeoJSON, CircleMarker, Tooltip } from "react-leaflet";
import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { useTranslations } from "next-intl";
import MapLegend from "./MapLegend";
import { getApiBaseUrl } from "@/lib/apiBase";

const API_BASE = getApiBaseUrl();

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} — ${path}`);
  }
  return res.json();
}

/* 🌍 Land use labels */
const landClasses: Record<number, string> = {
  10: "Forest 🌳",
  20: "Shrubland 🌿",
  30: "Grassland 🌱",
  40: "Cropland 🌾",
  50: "Urban 🏙️",
  60: "Bare land 🏜️",
  70: "Snow ❄️",
  80: "Water 🌊",
};

const GUEST_MARKERS = [
  { lat: 35.7595, lon: -5.8340, label: "Point Démo (Tanger)" },
  { lat: 34.6814, lon: -1.9086, label: "Point Démo (Oujda)" },
  { lat: 34.0209, lon: -6.8416, label: "Point Démo (Rabat)" },
  { lat: 33.5731, lon: -7.5898, label: "Point Démo (Casablanca)" },
  { lat: 34.0331, lon: -5.0003, label: "Point Démo (Fès)" },
  { lat: 32.3373, lon: -6.3498, label: "Point Démo (Béni Mellal)" },
  { lat: 31.6295, lon: -7.9811, label: "Point Démo (Marrakech)" },
  { lat: 30.4278, lon: -9.5981, label: "Point Démo (Agadir)" },
  { lat: 31.9314, lon: -4.4244, label: "Point Démo (Errachidia)" },
  { lat: 27.1253, lon: -13.1625, label: "Point Démo (Laayoune)" },
];

function ClickHandler({ setInfo, activeModule, activeMode, setZoneSelection, isGuest }: any) {
  useMapEvents({
    click(e) {
      if (activeMode === "point") {
        if (isGuest) {
          // Block clicking on map for point selection in demo mode
          return;
        }
        setZoneSelection({
          granularite: "point",
          lat: e.latlng.lat,
          lon: e.latlng.lng,
          label: `Point (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`,
        });
        return;
      }

      if (activeMode !== "point" && activeMode !== "bbox" && activeMode !== "province" && activeMode !== "region" && activeMode !== "national") {
        // Handle info clicks
        const endpoint =
          activeModule === "lu"
            ? `${API_BASE}/landcover-point`
            : `${API_BASE}/ndvi`;

        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: e.latlng.lat,
            lon: e.latlng.lng,
          }),
        })
          .then(res => res.json())
          .then(data => {
            if (activeModule !== "lu") {
              setInfo({
                type: "ndvi",
                lat: e.latlng.lat,
                lon: e.latlng.lng,
                value: data.ndvi ?? "No data",
              });
            } else {
              const code = data.landcover;
              setInfo({
                type: "landuse",
                lat: e.latlng.lat,
                lon: e.latlng.lng,
                value: code ?? "No data",
                label: landClasses[code] || "Unknown",
              });
            }
          })
          .catch(err => console.error("CLICK ERROR:", err));
      }
    },
  });
  return null;
}

function DrawControl({ activeMode, setZoneSelection }: any) {
  const map = useMap();
  const drawControlRef = useRef<any>(null);
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());

  useEffect(() => {
    map.addLayer(drawnItemsRef.current);
    return () => {
      map.removeLayer(drawnItemsRef.current);
    };
  }, [map]);

  useEffect(() => {
    if (activeMode === "bbox") {
      const drawControl = new L.Control.Draw({
        draw: {
          polyline: false,
          polygon: false,
          circle: false,
          marker: false,
          circlemarker: false,
          rectangle: true,
        },
        edit: {
          featureGroup: drawnItemsRef.current,
        },
      });
      map.addControl(drawControl);
      drawControlRef.current = drawControl;

      const onDrawCreated = (e: any) => {
        drawnItemsRef.current.clearLayers();
        const layer = e.layer;
        drawnItemsRef.current.addLayer(layer);
        const bounds = layer.getBounds();
        setZoneSelection({
          granularite: "bbox",
          bbox: [
            bounds.getWest(),
            bounds.getSouth(),
            bounds.getEast(),
            bounds.getNorth(),
          ],
          label: `BBox (${bounds.getWest().toFixed(2)}, ${bounds.getSouth().toFixed(2)}, ...)`,
        });
      };

      map.on(L.Draw.Event.CREATED, onDrawCreated);

      return () => {
        map.removeControl(drawControl);
        map.off(L.Draw.Event.CREATED, onDrawCreated);
      };
    } else {
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
        drawControlRef.current = null;
      }
      drawnItemsRef.current.clearLayers();
    }
  }, [map, activeMode, setZoneSelection]);

  return null;
}

type MapProps = {
  activeMode: string;
  setZoneSelection: (zone: any) => void;
  analysisStatus: string | null;
  resolvedGeojson: any | null;
  activeModule: string;
  isGuest?: boolean;
};

export default function Map({ activeMode, setZoneSelection, analysisStatus, resolvedGeojson, activeModule, isGuest }: MapProps) {
  const t = useTranslations('Map');
  const [info, setInfo] = useState<any>(null);

  const [ndviUrl, setNdviUrl] = useState<string | null>(null);
  const [landUseUrl, setLandUseUrl] = useState<string | null>(null);
  const [gwsaUrl, setGwsaUrl] = useState<string | null>(null);
  const [waterExtentUrl, setWaterExtentUrl] = useState<string | null>(null);

  const [provincesGeojson, setProvincesGeojson] = useState<any>(null);
  const [regionsGeojson, setRegionsGeojson] = useState<any>(null);

  /* 🌿 NDVI map */
  useEffect(() => {
    fetchJson("/ndvi-map")
      .then((data: { tile_url?: string }) => setNdviUrl(data.tile_url ?? null))
      .catch((err) =>
        console.warn(
          `NDVI overlay unavailable (${API_BASE}). Start the FastAPI backend.`,
          err
        )
      );
  }, []);

  /* 🏙️ Land use map */
  useEffect(() => {
    fetchJson("/landcover-map")
      .then((data: { tile_url?: string }) => setLandUseUrl(data.tile_url ?? null))
      .catch((err) =>
        console.warn(
          `Land cover overlay unavailable (${API_BASE}). Start the FastAPI backend.`,
          err
        )
      );
  }, []);

  /* 💧 GWSA map */
  useEffect(() => {
    fetchJson("/gwsa-map")
      .then((data: { tile_url?: string }) => setGwsaUrl(data.tile_url ?? null))
      .catch((err) => console.warn("GWSA overlay unavailable:", err));
  }, []);

  /* 🌊 Water extent map */
  useEffect(() => {
    fetchJson("/water-extent-map")
      .then((data: { tile_url?: string }) => setWaterExtentUrl(data.tile_url ?? null))
      .catch((err) => console.warn("Water extent overlay unavailable:", err));
  }, []);

  /* Load Provinces & Regions */
  useEffect(() => {
    if (activeMode === "province" && !provincesGeojson) {
      fetchJson("/zones/provinces")
        .then((data) => setProvincesGeojson(data))
        .catch((err) => console.error("Provinces load failed:", err));
    }
    if (activeMode === "region" && !regionsGeojson) {
      fetchJson("/zones/regions")
        .then((data) => setRegionsGeojson(data))
        .catch((err) => console.error("Regions load failed:", err));
    }
    
    if (activeMode === "national") {
       setZoneSelection({
         granularite: "national",
         label: "Tout le Maroc",
       });
    }
  }, [activeMode]);

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "ALLOWED": return "#22c55e"; // green
      case "MODERATED": return "#f59e0b"; // yellow/orange
      case "PROHIBITED": return "#ef4444"; // red
      case "CRITICAL": return "#991b1b"; // dark red
      default: return "#3b82f6"; // default blue
    }
  };

  const onProvinceClick = (feature: any) => {
    if (activeMode === "province") {
      let name = feature.properties.ADM2_NAME;
      if (name === "Administrative unit not available" || !name) {
        name = feature.properties.ADM1_NAME;
      }
      setZoneSelection({
        granularite: "province",
        code: name,
        label: name,
      });
    }
  };

  const onRegionClick = (feature: any) => {
    if (activeMode === "region") {
      setZoneSelection({
        granularite: "region",
        code: feature.properties.ADM1_NAME,
        label: feature.properties.ADM1_NAME,
      });
    }
  };

  const [mapMounted, setMapMounted] = useState(false);
  const mapRootId = "hydrosight-leaflet-root";

  useEffect(() => {
    setMapMounted(true);
    return () => {
      setMapMounted(false);
      const el = document.getElementById(mapRootId);
      if (el) {
        el.innerHTML = "";
        delete (el as HTMLElement & { _leaflet_id?: number })._leaflet_id;
      }
    };
  }, []);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        position: "relative",
        minHeight: 0,
      }}
    >
      <div id={mapRootId} style={{ height: "100%", width: "100%" }}>
        {mapMounted && (
      <MapContainer
        key="hydrosight-main-map"
        center={[31.7917, -7.0926]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {activeModule === "lu" && ndviUrl && <TileLayer url={ndviUrl} />}
        {activeModule === "lu" && landUseUrl && <TileLayer url={landUseUrl} />}
        
        {activeModule === "gw" && gwsaUrl && <TileLayer url={gwsaUrl} />}
        {activeModule === "sw" && waterExtentUrl && <TileLayer url={waterExtentUrl} />}

        <ClickHandler setInfo={setInfo} activeModule={activeModule} activeMode={activeMode} setZoneSelection={setZoneSelection} isGuest={isGuest} />
        
        {isGuest && activeMode === "point" && GUEST_MARKERS.map((pt, i) => (
          <CircleMarker
            key={i}
            center={[pt.lat, pt.lon]}
            radius={8}
            pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 0.6 }}
            eventHandlers={{
              click: () => {
                setZoneSelection({
                  granularite: "point",
                  lat: pt.lat,
                  lon: pt.lon,
                  label: pt.label,
                });
              }
            }}
          />
        ))}

        <DrawControl activeMode={activeMode} setZoneSelection={setZoneSelection} />

        {activeMode === "province" && provincesGeojson && (
          <GeoJSON
            data={provincesGeojson}
            style={(feature: any) => {
              let isAllowedGuest = false;
              if (isGuest) {
                let name = feature.properties.ADM2_NAME;
                if (name === "Administrative unit not available" || !name) {
                  name = feature.properties.ADM1_NAME;
                }
                if (name === "Béni Mellal") isAllowedGuest = true;
              }
              return {
                color: isAllowedGuest ? "#22c55e" : "#6b7280",
                weight: isAllowedGuest ? 2 : 1,
                fillOpacity: isAllowedGuest ? 0.25 : 0.2
              };
            }}
            onEachFeature={(feature, layer) => {
              layer.on({
                click: () => onProvinceClick(feature),
                mouseover: (e) => {
                   const l = e.target;
                   let isAllowedGuest = false;
                   if (isGuest) {
                     let name = feature.properties.ADM2_NAME;
                     if (name === "Administrative unit not available" || !name) {
                       name = feature.properties.ADM1_NAME;
                     }
                     if (name === "Béni Mellal") isAllowedGuest = true;
                   }
                   l.setStyle({ weight: 2, color: isAllowedGuest ? '#16a34a' : '#3b82f6', fillOpacity: 0.5 });
                },
                mouseout: (e) => {
                   const l = e.target;
                   let isAllowedGuest = false;
                   if (isGuest) {
                     let name = feature.properties.ADM2_NAME;
                     if (name === "Administrative unit not available" || !name) {
                       name = feature.properties.ADM1_NAME;
                     }
                     if (name === "Béni Mellal") isAllowedGuest = true;
                   }
                   l.setStyle({ weight: isAllowedGuest ? 2 : 1, color: isAllowedGuest ? '#22c55e' : '#6b7280', fillOpacity: isAllowedGuest ? 0.25 : 0.2 });
                }
              });
            }}
          />
        )}

        {activeMode === "region" && regionsGeojson && (
          <GeoJSON
            data={regionsGeojson}
            style={(feature: any) => {
              let name = feature.properties.ADM1_NAME;
              let isAllowedGuest = isGuest && (name === "Tadla-Azilal" || name === "Tadla Azilal" || name === "Tadla - Azilal");
              return {
                color: isAllowedGuest ? "#22c55e" : "#4b5563",
                weight: isAllowedGuest ? 3 : 2,
                fillOpacity: isAllowedGuest ? 0.25 : 0.1
              };
            }}
            onEachFeature={(feature, layer) => {
              layer.on({
                click: () => onRegionClick(feature),
                mouseover: (e) => {
                   const l = e.target;
                   let name = feature.properties.ADM1_NAME;
                   let isAllowedGuest = isGuest && (name === "Tadla-Azilal" || name === "Tadla Azilal" || name === "Tadla - Azilal");
                   l.setStyle({ weight: 3, color: isAllowedGuest ? '#16a34a' : '#3b82f6', fillOpacity: 0.4 });
                },
                mouseout: (e) => {
                   const l = e.target;
                   let name = feature.properties.ADM1_NAME;
                   let isAllowedGuest = isGuest && (name === "Tadla-Azilal" || name === "Tadla Azilal" || name === "Tadla - Azilal");
                   l.setStyle({ weight: isAllowedGuest ? 3 : 2, color: isAllowedGuest ? '#22c55e' : '#4b5563', fillOpacity: isAllowedGuest ? 0.25 : 0.1 });
                }
              });
            }}
          />
        )}

        {resolvedGeojson && (
           <GeoJSON 
             key={JSON.stringify(resolvedGeojson) + (analysisStatus || "")}
             data={resolvedGeojson} 
             style={{ 
               color: getStatusColor(analysisStatus), 
               weight: 3, 
               fillOpacity: 0.4,
               fillColor: getStatusColor(analysisStatus)
             }} 
           />
        )}
      </MapContainer>
        )}
      </div>

      <MapLegend activeModule={activeModule} />

      {info && activeMode !== "point" && activeMode !== "bbox" && activeMode !== "province" && activeMode !== "region" && activeMode !== "national" && (
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "white",
            padding: 10,
            borderRadius: 8,
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
            zIndex: 1000
          }}
        >
          {info.type === "ndvi" ? (
            <>
              <b>NDVI</b><br />
              Lat: {info.lat.toFixed(4)}<br />
              Lon: {info.lon.toFixed(4)}<br />
              Value: {info.value}
            </>
          ) : (
            <>
              <b>Land Use</b><br />
              Lat: {info.lat.toFixed(4)}<br />
              Lon: {info.lon.toFixed(4)}<br />
              Class: {info.label}<br />
              Code: {info.value}
            </>
          )}
        </div>
      )}
    </div>
  );
}