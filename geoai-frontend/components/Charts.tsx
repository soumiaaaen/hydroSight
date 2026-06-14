"use client";

import React, { useState } from "react";
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from "recharts";
import { exportFullExcel, exportFullPdf } from "../services/reportExport";
import { useTranslations } from "next-intl";

const getMockData = (t: any) => {
  const MONTHS = t.raw('months') || ["Jan","Fév","Mar","Avr","Mai","Jui","Jul","Aoû","Sep","Oct","Nov","Déc"];
  return {
    MONTHS,
    status: "MODERATED", score: 3,
    gw: {
      storageAnomaly: -8.4, rechargeRate: -50.26, trend: "baisse", precip: 187.3,
      tsGWSA:    [-6.2,-7.1,-5.8,-6.9,-8.1,-9.4,-10.2,-11.0,-9.7,-8.4,-7.6,-8.4],
      tsRecharge:[12.3,-8.1,24.6,-15.2,-42.8,-89.4,-112.1,-98.7,-67.3,-12.4,8.7,-50.3]
    },
    sw: {
      waterExtent:342.7, barrageLevel:38.2, precip:23.4, waterOccurrence:12.3,
      tsExtent:  [420,398,445,412,380,342,298,276,310,355,378,342],
      tsPrecip:  [42,38,31,18,8,2,0,1,12,24,36,23]
    },
    lu: {
      ndvi:0.34, ndwi:0.09, irrigationArea:1240, croplandArea:8320,
      breakdown:[
        {name: t('lu_bare'),   value:187000, color:"#fae6a0"},
        {name: t('lu_crop'),   value:83200,  color:"#fa0000"},
        {name: t('lu_sparse'), value:95000,  color:"#0096a0"},
        {name: t('lu_shrub'),  value:64000,  color:"#ffbb22"},
        {name: t('lu_forest'), value:42300,  color:"#006400"},
        {name: t('lu_grass'),  value:28000,  color:"#f096ff"},
        {name: t('lu_urban'),  value:12100,  color:"#b4b4b4"},
        {name: t('lu_water'),  value:3420,   color:"#0064c8"}
      ],
      tsNDVI: [0.18,0.22,0.31,0.41,0.48,0.38,0.28,0.24,0.29,0.35,0.32,0.34],
      tsNDWI: [0.14,0.16,0.18,0.21,0.15,0.09,0.05,0.04,0.07,0.10,0.12,0.09]
    },
    scoring: {gw:2, sw:1, lu:0, total:3}
  };
};

function MetricCard({ title, value, color, source }: any) {
  return (
    <div style={{ background: "var(--glass-bg)", border: "1px solid var(--border-color)", borderTop: `3px solid ${color}`, padding: "14px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", transition: "transform 0.2s" }}>
      <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600" }}>{title}</div>
      <div style={{ fontSize: "20px", fontWeight: "700", color, margin: "8px 0 4px 0", textShadow: `0 0 10px ${color}40`, letterSpacing: "-0.5px" }}>{value}</div>
      <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Source: {source}</div>
    </div>
  );
}

type ChartProps = {
  zoneSelection: any;
  dateDebut: string;
  dateFin: string;
  activeModule: string;
  canExportPdf?: boolean;
  canExportExcel?: boolean;
  onUpgradeRequired?: (message: string) => void;
};

export default function Charts({
  zoneSelection,
  dateDebut,
  dateFin,
  activeModule,
  canExportPdf = false,
  canExportExcel = false,
  onUpgradeRequired,
}: ChartProps) {
  const t = useTranslations('Charts');
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const mockData = getMockData(t);
  const { MONTHS, gw, sw, lu, scoring, status, score } = mockData;

  const gwsaData = MONTHS.map((m: string, i: number) => ({ month: m, value: gw.tsGWSA[i] }));
  const rechargeData = MONTHS.map((m: string, i: number) => ({ month: m, value: gw.tsRecharge[i] }));
  const extentData = MONTHS.map((m: string, i: number) => ({ month: m, value: sw.tsExtent[i] }));
  const precipData = MONTHS.map((m: string, i: number) => ({ month: m, value: sw.tsPrecip[i] }));
  const ndviData = MONTHS.map((m: string, i: number) => ({ month: m, value: lu.tsNDVI[i] }));
  const ndwiData = MONTHS.map((m: string, i: number) => ({ month: m, value: lu.tsNDWI[i] }));

  const buildReportData = () => ({
    generatedAt: new Date().toLocaleString(),
    zoneSelection,
    dateDebut,
    dateFin,
    status: status,
    score: score,
    gw: gw,
    sw: sw,
    lu: lu,
    scoring: scoring,
    months: MONTHS,
  });

  const handleExportPDF = async () => {
    if (!canExportPdf) {
      onUpgradeRequired?.(t('err_pdf_pro'));
      return;
    }
    setExportingPDF(true);
    try {
      await exportFullPdf(buildReportData());
      alert(t('succ_pdf'));
    } catch {
      alert(t('err_pdf'));
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportExcel = () => {
    if (!canExportExcel) {
      onUpgradeRequired?.(t('err_excel_pro'));
      return;
    }
    setExportingExcel(true);
    try {
      exportFullExcel(buildReportData());
      alert(t('succ_excel'));
    } catch {
      alert(t('err_excel'));
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* TAB CONTENT: GW */}
      {activeModule === "gw" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", animation: "fadeIn 200ms ease-in" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <MetricCard title={t('gw_anomaly')} value="-8.4 cm" color="#F59E0B" source="GRACE/NASA" />
            <MetricCard title={t('gw_balance')} value="-50.3 mm" color="#EF4444" source="GLDAS" />
            <MetricCard title={t('gw_trend')} value={t('trend_down')} color="#EF4444" source="GRACE/NASA" />
            <MetricCard title={t('gw_precip')} value="187.3 mm" color="#F59E0B" source="CHIRPS" />
          </div>

          <div>
            <h4 style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>{t('gw_chart_anomaly')}</h4>
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer>
                <AreaChart data={gwsaData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: "var(--text-muted)" }} width={30} />
                  <Tooltip contentStyle={{ background: "var(--panel-bg)", border: "1px solid var(--border-color)", borderRadius: "8px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }} itemStyle={{ fontWeight: "600" }} />
                  <ReferenceLine y={0} stroke="white" strokeOpacity={0.4} strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="value" stroke="#00C9B1" fill="#00C9B1" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>{t('gw_chart_balance')}</h4>
            <div style={{ width: "100%", height: 160 }}>
              <ResponsiveContainer>
                <BarChart data={rechargeData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} width={30} />
                  <Tooltip contentStyle={{ background: "var(--panel-bg)", border: "1px solid var(--border-color)", borderRadius: "8px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }} itemStyle={{ fontWeight: "600" }} />
                  <Bar dataKey="value">
                    {rechargeData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.value > 0 ? "#10B981" : "#EF4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SW */}
      {activeModule === "sw" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", animation: "fadeIn 200ms ease-in" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <MetricCard title={t('sw_extent')} value="342.7 km²" color="#F59E0B" source="Sentinel-1" />
            <MetricCard title={t('sw_dam')} value="38.2 %" color="#F59E0B" source="JRC Water" />
            <MetricCard title={t('sw_precip')} value="23.4 mm" color="#EF4444" source="CHIRPS" />
            <MetricCard title={t('sw_perm')} value="12.3 %" color="#F59E0B" source="JRC" />
          </div>

          <div>
            <h4 style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>{t('sw_chart_extent')}</h4>
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer>
                <LineChart data={extentData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} width={35} />
                  <Tooltip contentStyle={{ background: "var(--panel-bg)", border: "1px solid var(--border-color)", borderRadius: "8px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }} itemStyle={{ fontWeight: "600" }} />
                  <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>{t('sw_chart_precip')}</h4>
            <div style={{ width: "100%", height: 160 }}>
              <ResponsiveContainer>
                <BarChart data={precipData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} width={30} />
                  <Tooltip contentStyle={{ background: "var(--panel-bg)", border: "1px solid var(--border-color)", borderRadius: "8px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }} itemStyle={{ fontWeight: "600" }} />
                  <Bar dataKey="value" fill="#60A5FA" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: LU */}
      {activeModule === "lu" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", animation: "fadeIn 200ms ease-in" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <MetricCard title={t('lu_ndvi')} value="0.34" color="#F59E0B" source="Sentinel-2" />
            <MetricCard title={t('lu_ndwi')} value="0.09" color="#F59E0B" source="Sentinel-2" />
            <MetricCard title={t('lu_irrigation')} value="1 240 km²" color="#EF4444" source="ESA" />
            <MetricCard title={t('lu_agri')} value="8 320 km²" color="#F59E0B" source="ESA" />
          </div>

          <div>
            <h4 style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>{t('lu_chart_breakdown')}</h4>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart layout="vertical" data={lu.breakdown} margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <Tooltip contentStyle={{ background: "var(--panel-bg)", border: "1px solid var(--border-color)", borderRadius: "8px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }} itemStyle={{ fontWeight: "600" }} />
                  <Bar dataKey="value">
                    {lu.breakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>{t('lu_chart_ndvi')}</h4>
            <div style={{ width: "100%", height: 160 }}>
              <ResponsiveContainer>
                <LineChart data={ndviData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: "var(--text-muted)" }} width={30} />
                  <ReferenceLine y={0.4} stroke="#F59E0B" strokeDasharray="3 3" />
                  <ReferenceLine y={0.6} stroke="#EF4444" strokeDasharray="3 3" />
                  <Tooltip contentStyle={{ background: "var(--panel-bg)", border: "1px solid var(--border-color)", borderRadius: "8px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }} itemStyle={{ fontWeight: "600" }} />
                  <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>{t('lu_chart_ndwi')}</h4>
            <div style={{ width: "100%", height: 160 }}>
              <ResponsiveContainer>
                <LineChart data={ndwiData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} width={30} />
                  <ReferenceLine y={0.3} stroke="#F59E0B" strokeDasharray="3 3" />
                  <Tooltip contentStyle={{ background: "var(--panel-bg)", border: "1px solid var(--border-color)", borderRadius: "8px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }} itemStyle={{ fontWeight: "600" }} />
                  <Line type="monotone" dataKey="value" stroke="#60A5FA" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SCORING BREAKDOWN */}
      <div style={{ background: "var(--glass-bg)", border: "1px solid var(--border-color)", padding: "20px", borderRadius: "10px", marginTop: "10px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "700", color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t('score_title')}</h4>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
              <span>{t('score_gw')}</span>
              <span>+2 pts</span>
            </div>
            <div style={{ width: "100%", height: "4px", backgroundColor: "#374151", borderRadius: "2px" }}>
              <div style={{ width: `${(2/4)*100}%`, height: "100%", backgroundColor: "#00C9B1", borderRadius: "2px" }} />
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
              <span>{t('score_sw')}</span>
              <span>+1 pts</span>
            </div>
            <div style={{ width: "100%", height: "4px", backgroundColor: "#374151", borderRadius: "2px" }}>
              <div style={{ width: `${(1/4)*100}%`, height: "100%", backgroundColor: "#00C9B1", borderRadius: "2px" }} />
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
              <span>{t('score_lu')}</span>
              <span>+0 pts</span>
            </div>
            <div style={{ width: "100%", height: "4px", backgroundColor: "#374151", borderRadius: "2px" }}>
              <div style={{ width: `${(0/2)*100}%`, height: "100%", backgroundColor: "#00C9B1", borderRadius: "2px" }} />
            </div>
          </div>
        </div>
        
        <div style={{ borderTop: "1px solid #374151", marginTop: "12px", paddingTop: "12px", display: "flex", justifyContent: "space-between", color: "var(--foreground)", fontWeight: "bold", fontSize: "14px" }}>
          <span>{t('score_total')}</span>
          <span>3 / 10</span>
        </div>
      </div>

      {/* EXPORT BUTTONS */}
      <div style={{ display: "flex", gap: "10px", marginTop: "10px", paddingBottom: "20px" }}>
        <button
          type="button"
          onClick={handleExportPDF}
          disabled={exportingPDF || exportingExcel}
          title={canExportPdf ? undefined : "Plan Pro requis"}
          style={{
            flex: 1, padding: "8px", background: "transparent", border: "1px solid #00C9B1", color: canExportPdf ? "#00C9B1" : "var(--text-muted)", borderRadius: "4px", fontSize: "13px", fontWeight: "bold", cursor: exportingPDF || exportingExcel ? "not-allowed" : "pointer", transition: "all 0.2s", opacity: exportingPDF || exportingExcel ? 0.65 : canExportPdf ? 1 : 0.5
          }}
          onMouseOver={(e) => {
            if (!(exportingPDF || exportingExcel)) {
              e.currentTarget.style.backgroundColor = "#00C9B1";
              e.currentTarget.style.color = "white";
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#00C9B1";
          }}
        >
          {exportingPDF ? t('btn_gen') : canExportPdf ? t('btn_export_pdf') : t('btn_pdf_pro')}
        </button>
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={exportingPDF || exportingExcel}
          title={canExportExcel ? undefined : "Plan Pro requis"}
          style={{
            flex: 1, padding: "8px", background: "transparent", border: "1px solid #00C9B1", color: canExportExcel ? "#00C9B1" : "var(--text-muted)", borderRadius: "4px", fontSize: "13px", fontWeight: "bold", cursor: exportingPDF || exportingExcel ? "not-allowed" : "pointer", transition: "all 0.2s", opacity: exportingPDF || exportingExcel ? 0.65 : canExportExcel ? 1 : 0.5
          }}
          onMouseOver={(e) => {
            if (!(exportingPDF || exportingExcel)) {
              e.currentTarget.style.backgroundColor = "#00C9B1";
              e.currentTarget.style.color = "white";
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#00C9B1";
          }}
        >
          {exportingExcel ? t('btn_gen') : canExportExcel ? t('btn_export_excel') : t('btn_excel_pro')}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
