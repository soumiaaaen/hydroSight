"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import hydrosightLogo from "../public/hydrosight-logo.png";
import PlanBadge from "./PlanBadge";
import type { PlanId } from "@/lib/plans";
import { monthsBetween, PLAN_LIMITS } from "@/lib/plans";

type SidebarProps = {
  activeMode: string;
  setActiveMode: (mode: string) => void;
  zoneSelection: any;
  dateDebut: string;
  setDateDebut: (d: string) => void;
  dateFin: string;
  setDateFin: (d: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  plan: PlanId;
  analysesUsed: number;
  analysesLimit: number;
  isModeAllowed: (modeId: string) => boolean;
  canAnalyzeByPlan: boolean;
  planBlockReason?: string | null;
};

export default function Sidebar({
  activeMode,
  setActiveMode,
  zoneSelection,
  dateDebut,
  setDateDebut,
  dateFin,
  setDateFin,
  onAnalyze,
  isAnalyzing,
  plan,
  analysesUsed,
  analysesLimit,
  isModeAllowed,
  canAnalyzeByPlan,
  planBlockReason,
}: SidebarProps) {
  const t = useTranslations('Sidebar');
  const [logoSrc, setLogoSrc] = useState(hydrosightLogo.src);

  useEffect(() => {
    const source = new window.Image();
    source.src = hydrosightLogo.src;
    source.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = source.width;
      canvas.height = source.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(source, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        if (r < 24 && g < 24 && b < 24) {
          pixels[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setLogoSrc(canvas.toDataURL("image/png"));
    };
  }, []);

  const modes = [
    { id: "point", label: t('point') },
    { id: "bbox", label: t('bbox') },
    { id: "province", label: t('province') },
    { id: "region", label: t('region') },
    { id: "national", label: t('national') },
  ];

  const isValidDate = new Date(dateFin) >= new Date(dateDebut);
  const canAnalyze =
    zoneSelection !== null && isValidDate && !isAnalyzing && canAnalyzeByPlan;

  return (
    <div
      style={{
        width: "280px",
        minWidth: "280px",
        height: "100vh",
        backgroundColor: "var(--panel-bg)",
        borderRight: "1px solid var(--border-color)",
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        overflowY: "auto",
        boxShadow: "4px 0 15px rgba(0,0,0,0.2)",
        zIndex: 10,
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: "4px",
        }}
      >
        <Image
          src={logoSrc}
          alt="HydroSight logo"
          width={210}
          height={92}
          unoptimized
          priority
          style={{
            width: "100%",
            maxWidth: "210px",
            height: "auto",
            objectFit: "contain",
          }}
        />
      </div>

      {plan !== "guest" && (
        <PlanBadge
          plan={plan}
          analysesUsed={analysesUsed}
          analysesLimit={analysesLimit}
          quotaPeriod={PLAN_LIMITS[plan].quotaPeriod}
        />
      )}

      <div>
        <h2
          style={{
            fontSize: "14px",
            fontWeight: "700",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "16px",
          }}
        >
          1. {t('title')}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {modes.map((mode) => {
            const allowed = isModeAllowed(mode.id);
            return (
              <button
                key={mode.id}
                type="button"
                disabled={!allowed}
                title={
                  allowed
                    ? undefined
                    : t('pro_required')
                }
                onClick={() => allowed && setActiveMode(mode.id)}
                style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border:
                    activeMode === mode.id
                      ? "1px solid var(--accent-primary)"
                      : "1px solid var(--border-color)",
                  backgroundColor:
                    activeMode === mode.id ? "rgba(0, 201, 177, 0.1)" : "transparent",
                  color: !allowed
                    ? "var(--text-muted)"
                    : activeMode === mode.id
                      ? "var(--accent-primary)"
                      : "#D1D5DB",
                  cursor: allowed ? "pointer" : "not-allowed",
                  fontWeight: activeMode === mode.id ? "600" : "500",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  opacity: allowed ? 1 : 0.45,
                  boxShadow:
                    activeMode === mode.id ? "0 0 10px rgba(0,201,177,0.1) inset" : "none",
                }}
              >
                {mode.label}
                {!allowed && (
                  <span style={{ fontSize: 10, marginLeft: 6, opacity: 0.8 }}>🔒</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {zoneSelection && (
        <div
          style={{
            padding: "14px",
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {t('active_zone')}
          </p>
          <p
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "var(--foreground)",
              margin: "4px 0 0 0",
            }}
          >
            {zoneSelection.label || zoneSelection.granularite}
          </p>
        </div>
      )}

      <div>
        <h2
          style={{
            fontSize: "14px",
            fontWeight: "700",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "16px",
          }}
        >
          2. {t('period')}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                color: "var(--text-muted)",
                marginBottom: "6px",
                fontWeight: "500",
              }}
            >
              {t('start')}
            </label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                color: "var(--text-muted)",
                marginBottom: "6px",
                fontWeight: "500",
              }}
            >
              {t('end')}
            </label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
          {!isValidDate && (
            <p style={{ color: "#EF4444", fontSize: "12px", margin: 0, fontWeight: "500" }}>
              {t('date_error')}
            </p>
          )}
          {isValidDate && (
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
              {t('duration', { months: monthsBetween(dateDebut, dateFin) })}
            </p>
          )}
        </div>
      </div>

      {planBlockReason && (
        <p
          style={{
            fontSize: 12,
            color: "#f59e0b",
            margin: 0,
            lineHeight: 1.5,
            padding: "10px 12px",
            background: "rgba(245,158,11,0.1)",
            borderRadius: 8,
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          {planBlockReason}{" "}
          <Link href="/pricing" style={{ color: "var(--accent-primary)" }}>
            {t('see_offers')}
          </Link>
        </p>
      )}

      <button
        type="button"
        onClick={onAnalyze}
        disabled={!canAnalyze}
        style={{
          marginTop: "auto",
          padding: "16px",
          background: canAnalyze ? "var(--btn-gradient)" : "var(--border-color)",
          color: canAnalyze ? "var(--btn-text)" : "var(--text-muted)",
          border: "none",
          borderRadius: "10px",
          fontSize: "15px",
          fontWeight: "700",
          cursor: canAnalyze ? "pointer" : "not-allowed",
          transition: "all 0.3s ease",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxShadow: canAnalyze ? "0 4px 15px rgba(0,201,177,0.3)" : "none",
        }}
      >
        {isAnalyzing ? (
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "16px",
                height: "16px",
                border: "2px solid #0B1120",
                borderTop: "2px solid transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            {t('analyzing')}
          </span>
        ) : (
          t('analyze_btn')
        )}
      </button>
    </div>
  );
}
