"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

type GuestBannerProps = {
  analysesUsed: number;
  analysesLimit: number;
};

export default function GuestBanner({ analysesUsed, analysesLimit }: GuestBannerProps) {
  const t = useTranslations('GuestBanner');
  const remaining = Math.max(0, analysesLimit - analysesUsed);

  return (
    <div
      style={{
    position: "sticky", // Changed from "fixed"
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    flexWrap: "wrap",
    padding: "10px 20px",
    background: "linear-gradient(90deg, rgba(14,165,233,0.15), rgba(99,102,241,0.12))",
    borderBottom: "1px solid rgba(56,189,248,0.25)",
    backdropFilter: "blur(8px)", // Optional: makes it look premium over elements if scrolled
    fontSize: 13,
    color: "#e0f2fe",
  }}>
      <div>
        <strong style={{ color: "#fff" }}>{t('demo_mode')}</strong> — {t('demo_desc')}
      </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link 
          href="/register" 
          style={{ 
            background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
            padding: "4px 12px",
            borderRadius: 6,
            color: "#fff",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 13
          }}
        >
          {t('free_account')}
        </Link>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
          <Link href="/login" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 600 }}>{t('already_registered')}</Link>
        </div>
      </div>
    </div>
  );
}
