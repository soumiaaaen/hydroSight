'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type MonthlyUsage = {
  year_month: string;
  total_analyses: number;
  active_users: number;
};

type PlanBreakdown = {
  plan: string;
  count: number;
};

type StatCard = {
  label: string;
  value: string | number;
};

export default function AdminAnalyticsPage() {
  const { locale } = useParams();
  const [monthly, setMonthly] = useState<MonthlyUsage[]>([]);
  const [plans, setPlans] = useState<PlanBreakdown[]>([]);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  useEffect(() => { fetchAnalytics(); }, []);

  async function fetchAnalytics() {
    setLoading(true);

    // Monthly usage aggregated
    const { data: usageData } = await supabase
      .from('usage_monthly')
      .select('year_month, analysis_count')
      .order('year_month', { ascending: true });

    // Aggregate by month
    const monthMap: Record<string, { total: number; users: number }> = {};
    for (const row of usageData || []) {
      if (!monthMap[row.year_month]) monthMap[row.year_month] = { total: 0, users: 0 };
      monthMap[row.year_month].total += row.analysis_count;
      monthMap[row.year_month].users += 1;
    }
    setMonthly(
      Object.entries(monthMap).map(([ym, v]) => ({
        year_month: ym,
        total_analyses: v.total,
        active_users: v.users,
      }))
    );

    // Plan breakdown
    const { data: profileData } = await supabase
      .from('profiles')
      .select('plan');

    const planMap: Record<string, number> = {};
    for (const p of profileData || []) {
      const plan = p.plan || 'free';
      planMap[plan] = (planMap[plan] || 0) + 1;
    }
    setPlans(Object.entries(planMap).map(([plan, count]) => ({ plan, count })));

    // Guest usage today
    const today = new Date().toISOString().slice(0, 10);
    const { data: guestData } = await supabase
      .from('guest_usage')
      .select('analysis_count')
      .eq('day', today);
    const guestTotal = (guestData || []).reduce((s, r) => s + r.analysis_count, 0);

    // Total users
    const totalUsers = (profileData || []).length;
    const totalAnalyses = (usageData || []).reduce((s, r) => s + r.analysis_count, 0);

    setStats([
      { label: 'Total Users', value: totalUsers },
      { label: 'Total Analyses', value: totalAnalyses },
      { label: 'Guest Analyses Today', value: guestTotal },
      { label: 'Active Months', value: Object.keys(monthMap).length },
    ]);

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#04080f] text-white p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${locale}/admin`} className="text-white/40 hover:text-white text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-sky-400">Platform Analytics</h1>
      </div>

      {loading && <p className="text-white/50">Loading analytics...</p>}

      {!loading && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="p-4 rounded-xl border border-white/10 bg-white/5">
                <p className="text-white/40 text-xs mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-sky-400">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Monthly Analyses Chart */}
          <div className="mb-8 p-6 rounded-xl border border-white/10 bg-white/5">
            <h2 className="text-sm font-semibold text-white/50 uppercase mb-4">Monthly Analyses</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year_month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                />
                <Bar dataKey="total_analyses" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Analyses" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Plan Breakdown */}
          <div className="p-6 rounded-xl border border-white/10 bg-white/5">
            <h2 className="text-sm font-semibold text-white/50 uppercase mb-4">Users by Plan</h2>
            <div className="flex flex-wrap gap-4">
              {plans.map((p) => (
                <div key={p.plan} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="capitalize text-white font-medium">{p.plan}</span>
                  <span className="text-sky-400 font-bold text-lg">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}