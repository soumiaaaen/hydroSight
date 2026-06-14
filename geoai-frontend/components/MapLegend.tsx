"use client";

import React from "react";
import { useTranslations } from "next-intl";

type MapLegendProps = {
  activeModule: string; // "gw" | "sw" | "lu"
};

export default function MapLegend({ activeModule }: MapLegendProps) {
  const t = useTranslations('Map');
  return (
    <div
      style={{
        position: "absolute",
        bottom: "30px",
        left: "10px",
        zIndex: 1000,
        background: "rgba(11, 17, 32, 0.92)",
        borderLeft: "3px solid #00C9B1",
        padding: "12px 14px",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "12px",
        color: "#F9FAFB",
        minWidth: "210px",
        pointerEvents: "none",
      }}
    >
      <div style={{ padding: "12px 16px" }}>
        <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.05em", color: "#9ca3af", marginBottom: "8px" }}>
          {t('legend_water')}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[
            { color: "#22c55e", label: `${t('status_allowed')} — ${t('allowed')}` },
            { color: "#f59e0b", label: `${t('status_moderated')} — ${t('moderated')}` },
            { color: "#ef4444", label: `${t('status_prohibited')} — ${t('prohibited')}` },
            { color: "#991b1b", label: `${t('status_critical')} — ${t('critical')}` },
          ].map((st, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", color: "#e5e7eb" }}>{st.label}</span>
              <span style={{ width: "12px", height: "12px", backgroundColor: st.color, borderRadius: "2px", marginLeft: "12px" }} />
            </div>
          ))}
        </div>
      </div>

      {activeModule === "lu" && (
        <>
          <div style={{ height: "1px", backgroundColor: "#374151", margin: "12px 0" }} />
          <div>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "11px", fontWeight: "bold", letterSpacing: "0.5px", color: "#9CA3AF" }}>{t('legend_lu')}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { color: "#22c55e", label: t('forest') },
                { color: "#84cc16", label: t('shrub') },
                { color: "#bef264", label: t('grass') },
                { color: "#eab308", label: t('crop') },
                { color: "#ef4444", label: t('urban') },
                { color: "#d1d5db", label: t('sparse') },
                { color: "#3b82f6", label: t('water') },
                { color: "#9ca3af", label: t('bare') },
              ].map((st, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "12px", height: "12px", backgroundColor: st.color }} />
                  <span>{st.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeModule === "gw" && (
        <>
          <div style={{ height: "1px", backgroundColor: "#374151", margin: "12px 0" }} />
          <div>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "11px", fontWeight: "bold", letterSpacing: "0.5px", color: "#9CA3AF" }}>{t('legend_gw')}</h4>
            <div style={{ background: "linear-gradient(to right, #EF4444, #F9FAFB, #3B82F6)", height: "8px", width: "100%", borderRadius: "4px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginTop: "4px", color: "#D1D5DB" }}>
              <span>{t('gw_deficit')}</span>
              <span>{t('gw_neutral')}</span>
              <span>{t('gw_surplus')}</span>
            </div>
          </div>
        </>
      )}

      {activeModule === "sw" && (
        <>
          <div style={{ height: "1px", backgroundColor: "#374151", margin: "12px 0" }} />
          <div>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "11px", fontWeight: "bold", letterSpacing: "0.5px", color: "#9CA3AF" }}>{t('legend_sw')}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "12px", height: "12px", backgroundColor: "#3B82F6" }} />
                <span>{t('sw_open_water')}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
