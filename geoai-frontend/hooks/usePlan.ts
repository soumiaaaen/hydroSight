"use client";

import { useCallback, useEffect, useState } from "react";
import {
  checkPlanAccess,
  getLimits,
  getQuotaLimit,
  normalizePlan,
  type PlanId,
} from "@/lib/plans";
import { fetchSubscriptionFromApi, type UserSubscription } from "@/services/subscription";
import { supabase } from "@/services/supabaseClient";
import { clearGuestSession } from "@/services/guest";

export function usePlan() {
  const [sub, setSub] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await fetchSubscriptionFromApi();
    setSub(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        clearGuestSession();
      }
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const applyUsageFromResponse = useCallback(
    (usage: { analysesUsed: number; analysesLimit: number }) => {
      setSub((prev) => (prev ? { ...prev, ...usage } : prev));
    },
    []
  );

  const plan: PlanId = sub?.plan ?? "guest";
  const limits = getLimits(plan);
  const analysesUsed = sub?.analysesUsed ?? 0;
  const analysesLimit = sub?.analysesLimit ?? getQuotaLimit(limits);
  const quotaRemaining = Math.max(0, analysesLimit - analysesUsed);
  const isGuest = sub?.isGuest ?? plan === "guest";

  const canAccess = useCallback(
    (input: {
      activeModule: string;
      activeMode: string;
      dateDebut: string;
      dateFin: string;
      bbox?: number[] | null;
      zoneSelection?: any;
      checkQuota?: boolean;
    }) => {
      return checkPlanAccess({
        plan,
        activeModule: input.activeModule,
        activeMode: input.activeMode,
        dateDebut: input.dateDebut,
        dateFin: input.dateFin,
        bbox: input.bbox,
        zoneSelection: input.zoneSelection,
        analysesUsed: input.checkQuota !== false ? analysesUsed : 0,
      });
    },
    [plan, analysesUsed]
  );

  const isModuleAllowed = (moduleId: string) =>
    limits.modules.includes(moduleId as "gw" | "sw" | "lu");

  const isModeAllowed = (modeId: string) => limits.modes.includes(modeId);

  return {
    sub,
    plan,
    limits,
    loading,
    analysesUsed,
    analysesLimit,
    quotaRemaining,
    isGuest,
    refresh,
    applyUsageFromResponse,
    canAccess,
    isModuleAllowed,
    isModeAllowed,
    canExportPdf: limits.pdfExport,
    canExportExcel: limits.excelExport,
  };
}