"use client";

import Link from "next/link";
import type { PlanId } from "@/lib/plans";
import { PLAN_LIMITS } from "@/lib/plans";

type PlanBadgeProps = {
  plan: PlanId;
  analysesUsed: number;
  analysesLimit: number;
  quotaPeriod?: "day" | "month";
};

const PLAN_COLORS: Record<PlanId, string> = {
  guest: "#f59e0b",
  free: "#9ca3af",
  pro: "#38bdf8",
  premium: "#c084fc",
};

export default function PlanBadge({
  plan,
  analysesUsed,
  analysesLimit,
  quotaPeriod = "month",
}: PlanBadgeProps) {
  const pct = analysesLimit > 0 ? Math.min(100, (analysesUsed / analysesLimit) * 100) : 0;

  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: "10px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--border-color)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: PLAN_COLORS[plan],
          }}
        >
          Plan {PLAN_LIMITS[plan].label}
        </span>
        {plan === "guest" ? (
          <Link
            href="/register"
            style={{
              fontSize: 11,
              color: "var(--accent-primary)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            S&apos;inscrire
          </Link>
        ) : plan !== "premium" ? (
          <Link
            href="/pricing"
            style={{
              fontSize: 11,
              color: "var(--accent-primary)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Tarifs
          </Link>
        ) : null}
      </div>
      {plan !== "guest" && (
        <>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
            Analyses : {analysesUsed} / {analysesLimit}
            {quotaPeriod === "day" ? " (aujourd'hui)" : ""}
          </div>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: "var(--border-color)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: pct >= 90 ? "#ef4444" : "var(--accent-primary)",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
