"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo, type CSSProperties } from "react";
import Sidebar from "@/components/Sidebar";
import Charts from "@/components/Charts";
import UpgradeModal from "@/components/UpgradeModal";
import GuestBanner from "@/components/GuestBanner";
import { api } from "@/services/api";
import LogoutButton from "@/components/LogoutButton";
import AdminNavLink from "@/components/AdminNavLink";
import { logoutAndRedirect } from "@/services/auth";
import { usePlan } from "@/hooks/usePlan";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";
import "leaflet/dist/leaflet.css";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        width: "100%",
        background: "var(--background)",
      }}
    />
  ),
});

export default function DashboardPage() {
  const {
    plan,
    loading: planLoading,
    analysesUsed,
    analysesLimit,
    refresh: refreshPlan,
    canAccess,
    isModuleAllowed,
    isModeAllowed,
    canExportPdf,
    canExportExcel,
    limits,
    isGuest,
  } = usePlan();
  const { isLoggedIn } = useAuth();
  const t = useTranslations('Dashboard');
  const tNav = useTranslations('Navigation');
  const tCommon = useTranslations('Common');
  const tMap = useTranslations('Map');
  const tErrors = useTranslations('Errors');

  const [activeModule, setActiveModule] = useState("lu");
  const [activeMode, setActiveMode] = useState("point");
  const [zoneSelection, setZoneSelection] = useState<any>(null);
  const [dateDebut, setDateDebut] = useState("2023-01-01");
  const [dateFin, setDateFin] = useState("2023-12-31");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [resolvedGeojson, setResolvedGeojson] = useState<any>(null);
  const [analyzedParams, setAnalyzedParams] = useState<any>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (planLoading) return;
    if (!isModuleAllowed(activeModule)) {
      setActiveModule(limits.modules[0]);
    }
    if (!isModeAllowed(activeMode)) {
      setActiveMode(limits.modes[0]);
    }
  }, [planLoading, plan, limits, activeModule, activeMode, isModuleAllowed, isModeAllowed]);

  const preAnalyzeCheck = useMemo(() => {
    return canAccess({
      activeModule,
      activeMode,
      dateDebut,
      dateFin,
      bbox: zoneSelection?.bbox,
      zoneSelection,
      checkQuota: true,
    });
  }, [canAccess, activeModule, activeMode, dateDebut, dateFin, zoneSelection]);

  const handleAnalyze = async () => {
    if (!zoneSelection) return;

    const check = canAccess({
      activeModule,
      activeMode: zoneSelection.granularite ?? activeMode,
      dateDebut,
      dateFin,
      bbox: zoneSelection.bbox,
      zoneSelection,
      checkQuota: true,
    });
    if (!check.ok) {
      setUpgradeMessage(tErrors(check.messageKey as any, check.messageParams));
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalyzedParams(null);

    try {
      const resolved = await api.post("/zones/resolve", zoneSelection);
      setResolvedGeojson(resolved.geojson);

      const result = await api.post("/analyse", {
        zoneSelection,
        dateDebut,
        dateFin,
        activeModule,
      });
      setAnalysisResult(result);
      setAnalyzedParams({ zoneSelection, dateDebut, dateFin });
      await refreshPlan();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur s'est produite lors de l'analyse.";
      if (
        message.includes("plan") ||
        message.includes("quota") ||
        message.includes("Module")
      ) {
        setUpgradeMessage(message);
      } else if (
        message.includes("token") ||
        message.includes("Session") ||
        message.includes("401")
      ) {
        alert(`${message}\n\nDéconnectez-vous puis reconnectez-vous.`);
        window.location.href = "/login";
      } else {
        alert(message);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const iconButtonStyle: CSSProperties = {
    padding: "10px",
    borderRadius: "50%",
    border: "1px solid var(--glass-border)",
    background: "var(--glass-bg)",
    backdropFilter: "blur(8px)",
    color: "var(--foreground)",
    cursor: "pointer",
    marginLeft: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: 600,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ALLOWED":
        return "#22c55e";
      case "MODERATED":
        return "#f59e0b";
      case "PROHIBITED":
        return "#ef4444";
      case "CRITICAL":
        return "#991b1b";
      default:
        return "#374151";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "sans-serif",
      }}
    >
      {isGuest && (
        <GuestBanner analysesUsed={analysesUsed} analysesLimit={analysesLimit} />
      )}
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
      <Sidebar
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        zoneSelection={zoneSelection}
        dateDebut={dateDebut}
        setDateDebut={setDateDebut}
        dateFin={dateFin}
        setDateFin={setDateFin}
        onAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
        plan={plan}
        analysesUsed={analysesUsed}
        analysesLimit={analysesLimit}
        isModeAllowed={isModeAllowed}
        canAnalyzeByPlan={preAnalyzeCheck.ok}
        planBlockReason={!preAnalyzeCheck.ok ? tErrors(preAnalyzeCheck.messageKey as any, preAnalyzeCheck.messageParams) : null}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexGrow: 1,
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <div
          style={{
            flexGrow: 1,
            position: "relative",
            minHeight: 0,
            height: "100%",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              display: "flex",
              gap: "10px",
              flexWrap: "nowrap",
              whiteSpace: "nowrap",
              alignItems: "center",
            }}
          >
            {[
              { id: "gw", label: t('gw') },
              { id: "sw", label: t('sw') },
              { id: "lu", label: t('lu') },
            ].map((tab) => {
              const allowed = isModuleAllowed(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={!allowed}
                  title={allowed ? undefined : "Plan Pro requis"}
                  onClick={() => allowed && setActiveModule(tab.id)}
                  style={{
                    padding: "10px 16px",
                    fontSize: "14px",
                    fontWeight: "600",
                    borderRadius: "30px",
                    border: "1px solid",
                    borderColor:
                      activeModule === tab.id ? "var(--accent-primary)" : "var(--glass-border)",
                    background:
                      activeModule === tab.id
                        ? "rgba(0, 201, 177, 0.15)"
                        : "var(--glass-bg)",
                    backdropFilter: "blur(8px)",
                    color: !allowed
                      ? "var(--text-muted)"
                      : activeModule === tab.id
                        ? "var(--accent-primary)"
                        : "var(--text-muted)",
                    cursor: allowed ? "pointer" : "not-allowed",
                    opacity: allowed ? 1 : 0.45,
                    transition: "all 0.3s ease",
                  }}
                >
                  {tab.label}
                  {!allowed && " 🔒"}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              style={iconButtonStyle}
              title={`Passer en mode ${theme === "dark" ? "clair" : "sombre"}`}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            <div style={{ marginLeft: '8px' }}>
              <LanguageSwitcher />
            </div>

            <AdminNavLink
              style={{
                marginLeft: 8,
                textDecoration: "none",
                color: "var(--text-muted)",
                fontSize: 12,
                fontWeight: 600,
                padding: "8px 12px",
                borderRadius: "20px",
                border: "1px solid var(--glass-border)",
                background: "var(--glass-bg)",
              }}
            />

            {isLoggedIn ? (
              <LogoutButton
                onClick={() => logoutAndRedirect()}
                style={{ marginLeft: 8 }}
              />
            ) : (
              <Link
                href="/login"
                title={tNav('login')}
                style={{
                  ...iconButtonStyle,
                  marginLeft: 8,
                  textDecoration: "none",
                  fontSize: 11,
                  fontWeight: 700,
                  width: 40,
                  height: 40,
                  padding: 0,
                }}
              >
                ↪
              </Link>
            )}
          </div>

          {analysisResult?.decision && (
            <div
              style={{
                position: "absolute",
                top: "80px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 1000,
                minWidth: "500px",
                padding: "14px 20px",
                borderRadius: "12px",
                backgroundColor: getStatusColor(analysisResult.decision.status),
                color: "white",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                  }}
                >
                  {t('status')} : {tMap(`status_${analysisResult.decision.status.toLowerCase()}` as any)}
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "14px", opacity: 0.95 }}>
                  {tMap(`rec_${analysisResult.decision.status.toLowerCase()}` as any)}
                </p>
              </div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  backgroundColor: "rgba(0,0,0,0.2)",
                  padding: "6px 16px",
                  borderRadius: "6px",
                }}
              >
                Score: {analysisResult.decision.score ?? "—"}/10
              </div>
            </div>
          )}

          <Map
            activeMode={activeMode}
            setZoneSelection={setZoneSelection}
            analysisStatus={analysisResult?.decision?.status || null}
            resolvedGeojson={resolvedGeojson}
            activeModule={activeModule}
            isGuest={isGuest}
          />
        </div>

        <div
          style={{
            width: "350px",
            minWidth: "350px",
            height: "100%",
            backgroundColor: "var(--panel-bg)",
            borderLeft: "1px solid var(--border-color)",
            padding: "24px 20px",
            overflowY: "auto",
            zIndex: 10,
          }}
        >
          {!analysisResult && !isAnalyzing && (
            <div
              style={{
                display: "flex",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                color: "#9CA3AF",
                padding: "20px",
              }}
            >
              <p style={{ lineHeight: "1.6" }}>
                {t('select_zone')}{" "}
                <strong style={{ color: "var(--foreground)" }}>
                  {activeModule === "gw"
                    ? t('gw').replace('💧 ', '')
                    : activeModule === "sw"
                      ? t('sw').replace('🌊 ', '')
                      : t('lu').replace('🌿 ', '')}
                </strong>
                .
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                alignItems: "center",
                marginTop: "40px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  border: "4px solid var(--border-color)",
                  borderTop: "4px solid var(--accent-primary)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <p style={{ color: "var(--accent-primary)", fontWeight: "600" }}>{t('calc')}</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

            {analysisResult?.decision && analyzedParams && (
              <Charts
              zoneSelection={analyzedParams.zoneSelection}
              dateDebut={analyzedParams.dateDebut}
              dateFin={analyzedParams.dateFin}
              activeModule={activeModule}
              canExportPdf={canExportPdf}
              canExportExcel={canExportExcel}
              onUpgradeRequired={setUpgradeMessage}
            />
          )}
        </div>
      </div>

      {upgradeMessage && (
        <UpgradeModal
          message={upgradeMessage}
          onClose={() => setUpgradeMessage(null)}
          isGuest={isGuest}
        />
      )}
      </div>
    </div>
  );
}
