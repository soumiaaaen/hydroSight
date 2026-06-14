export type PlanId = "guest" | "free" | "pro" | "premium" | "contract";

export type QuotaPeriod = "day" | "month";

export type PlanLimits = {
  label: string;
  priceMonthly: number | null;
  priceLabel: string;
  modules: ("gw" | "sw" | "lu")[];
  modes: string[];
  maxBBoxKm2: number | null;
  maxMonthsRange: number | null;
  analysesPerMonth: number;
  analysesPerDay?: number;
  quotaPeriod: QuotaPeriod;
  pdfExport: boolean;
  excelExport: boolean;
  whiteLabel: boolean;
  maxRegions: number | null;
  maxProvinces: number | null;
};

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  guest: {
    label: "Démo",
    priceMonthly: 0,
    priceLabel: "Sans compte",
    modules: ["lu"],
    modes: ["point", "region", "province"],
    maxBBoxKm2: 0,
    maxMonthsRange: 3,
    analysesPerMonth: 0,
    analysesPerDay: 999999,
    quotaPeriod: "day",
    pdfExport: false,
    excelExport: false,
    whiteLabel: false,
    maxRegions: 1,
    maxProvinces: 1,
  },
  free: {
    label: "Free",
    priceMonthly: 0,
    priceLabel: "Gratuit",
    modules: ["lu"],
    modes: ["point"],
    maxBBoxKm2: 0,
    maxMonthsRange: 6,
    analysesPerMonth: 10,
    quotaPeriod: "month",
    pdfExport: false,
    excelExport: false,
    whiteLabel: false,
    maxRegions: 1,
    maxProvinces: 1,
  },
  pro: {
    label: "Pro",
    priceMonthly: 39,
    priceLabel: "39 €/mois",
    modules: ["gw", "sw", "lu"],
    modes: ["point", "bbox", "province"],
    maxBBoxKm2: null,
    maxMonthsRange: 36,
    analysesPerMonth: 100,
    quotaPeriod: "month",
    pdfExport: true,
    excelExport: true,
    whiteLabel: false,
    maxRegions: null,
    maxProvinces: null,
  },
  premium: {
    label: "Premium",
    priceMonthly: 129,
    priceLabel: "129 €/mois",
    modules: ["gw", "sw", "lu"],
    modes: ["point", "bbox", "province", "region", "national"],
    maxMonthsRange: null,
    maxBBoxKm2: null,
    analysesPerMonth: 500,
    quotaPeriod: "month",
    pdfExport: true,
    excelExport: true,
    whiteLabel: true,
    maxRegions: null,
    maxProvinces: null,
  },
  contract: {
    label: "Contrat (B2B)",
    priceMonthly: null,
    priceLabel: "Sur devis",
    modules: ["gw", "sw", "lu"],
    modes: ["point", "bbox", "province", "region", "national"],
    maxMonthsRange: null,
    maxBBoxKm2: null,
    analysesPerMonth: 999999,
    quotaPeriod: "month",
    pdfExport: true,
    excelExport: true,
    whiteLabel: true,
    maxRegions: null,
    maxProvinces: null,
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro", "premium", "contract"];

export function normalizePlan(plan: string | null | undefined): PlanId {
  if (plan === "guest" || plan === "pro" || plan === "premium" || plan === "contract") return plan;
  return "free";
}

export function isGuestPlan(plan: string | null | undefined): boolean {
  return plan === "guest";
}

export function getQuotaLimit(limits: PlanLimits): number {
  if (limits.quotaPeriod === "day" && limits.analysesPerDay != null) {
    return limits.analysesPerDay;
  }
  return limits.analysesPerMonth;
}

export function getQuotaLabel(plan: PlanId): string {
  const limits = PLAN_LIMITS[plan];
  if (limits.quotaPeriod === "day") {
    return `${limits.analysesPerDay ?? 0} / jour`;
  }
  return `${limits.analysesPerMonth} / mois`;
}

export function getLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[normalizePlan(plan)];
}

export function monthsBetween(dateDebut: string, dateFin: string): number {
  const start = new Date(dateDebut);
  const end = new Date(dateFin);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1
  );
}

export function bboxAreaKm2(bbox: number[]): number | null {
  if (!bbox || bbox.length !== 4) return null;
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const latMid = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const widthKm = Math.abs(maxLon - minLon) * 111.32 * Math.cos(latMid);
  const heightKm = Math.abs(maxLat - minLat) * 110.574;
  return widthKm * heightKm;
}

export type PlanCheckInput = {
  plan: string | null | undefined;
  activeModule: string;
  activeMode: string;
  dateDebut: string;
  dateFin: string;
  bbox?: number[] | null;
  analysesUsed: number;
  zoneSelection?: any;
};

// Return keys instead of hardcoded strings
export function checkPlanAccess(input: PlanCheckInput): { ok: true } | { ok: false; messageKey: string; messageParams?: any } {
  const limits = getLimits(input.plan);

  if (!limits.modules.includes(input.activeModule as "gw" | "sw" | "lu")) {
    return {
      ok: false,
      messageKey: "ERR_MODULE_NOT_INCLUDED",
      messageParams: { plan: limits.label }
    };
  }

  if (!limits.modes.includes(input.activeMode)) {
    return {
      ok: false,
      messageKey: "ERR_MODE_NOT_INCLUDED",
      messageParams: { mode: input.activeMode, plan: limits.label }
    };
  }

  // Guest specific validation rules
  if (input.plan === "guest") {
    if (input.activeMode === "region" && input.zoneSelection?.code !== "Tadla-Azilal" && input.zoneSelection?.code !== "Tadla Azilal" && input.zoneSelection?.code !== "Tadla - Azilal") {
      return {
        ok: false,
        messageKey: "ERR_GUEST_REGION"
      };
    }
    if (input.activeMode === "province" && input.zoneSelection?.code !== "Béni Mellal") {
      return {
        ok: false,
        messageKey: "ERR_GUEST_PROVINCE"
      };
    }
    // Note: For 'point', the UI (Map.tsx) restricts clicks to 10 specific coordinates.
    // If backend validation is needed, add point coord checks here.
  }

  if (limits.maxMonthsRange != null) {
    const months = monthsBetween(input.dateDebut, input.dateFin);
    if (months > limits.maxMonthsRange) {
      return {
        ok: false,
        messageKey: "ERR_MAX_MONTHS",
        messageParams: { max: limits.maxMonthsRange, plan: limits.label }
      };
    }
  }

  if (input.activeMode === "bbox") {
    if (limits.maxBBoxKm2 === 0) {
      return {
        ok: false,
        messageKey: "ERR_BBOX_GUEST"
      };
    }
    if (limits.maxBBoxKm2 != null && input.bbox) {
      const area = bboxAreaKm2(input.bbox);
      if (area != null && area > limits.maxBBoxKm2) {
        return {
          ok: false,
          messageKey: "ERR_BBOX_TOO_LARGE",
          messageParams: { area: area.toFixed(1), max: limits.maxBBoxKm2 }
        };
      }
    }
  }

  const quotaLimit = getQuotaLimit(limits);
  if (input.analysesUsed >= quotaLimit) {
    return {
      ok: false,
      messageKey: input.plan === "guest" ? "ERR_QUOTA_GUEST" : "ERR_QUOTA_USER",
      messageParams: { limit: quotaLimit }
    };
  }

  return { ok: true };
}

export function currentUtcDay(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
