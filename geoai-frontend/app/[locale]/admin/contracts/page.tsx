'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Contract = {
  id: string;
  user_id: string;
  type: string;
  status: string;
  plan: string;
  starts_at: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10',
  active: 'text-green-400 bg-green-400/10',
  expired: 'text-white/30 bg-white/5',
  cancelled: 'text-red-400 bg-red-400/10',
};

export default function AdminContractsPage() {
  const { locale } = useParams();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    user_id: '', type: 'b2b', plan: 'pro',
    starts_at: '', expires_at: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  useEffect(() => { fetchContracts(); }, []);

  async function fetchContracts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setContracts(data || []);
    setLoading(false);
  }

  async function createContract() {
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const payload = {
      ...form,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      notes: form.notes || null,
      created_by: session?.user.id,
    };
    const { error } = await supabase.from('contracts').insert(payload);
    if (error) alert('Error: ' + error.message);
    else {
      setShowForm(false);
      setForm({ user_id: '', type: 'b2b', plan: 'pro', starts_at: '', expires_at: '', notes: '' });
      await fetchContracts();
    }
    setSubmitting(false);
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from('contracts').update({ status }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else await fetchContracts();
  }

  return (
    <main className="min-h-screen bg-[#04080f] text-white p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/admin`} className="text-white/40 hover:text-white text-sm">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-sky-400">Contracts</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-sky-500 hover:bg-sky-400 rounded text-sm font-medium transition"
        >
          + New Contract
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 p-6 rounded-xl border border-white/10 bg-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/50 mb-1 block">User ID *</label>
            <input
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              placeholder="uuid of the user"
              className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 text-sm text-white">
              <option value="b2b">B2B</option>
              <option value="b2c">B2C</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Plan</label>
            <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}
              className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 text-sm text-white">
              <option value="pro">Pro</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Starts At</label>
            <input type="date" value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Expires At</label>
            <input type="date" value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Notes</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-white/10 border border-white/10 rounded px-3 py-2 text-sm text-white" />
          </div>
          <div className="md:col-span-2 flex gap-3">
            <button onClick={createContract} disabled={submitting || !form.user_id}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 rounded text-sm font-medium disabled:opacity-50 transition">
              {submitting ? 'Creating...' : 'Create Contract'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-white/50">Loading contracts...</p>}

      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/50 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">User ID</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Expires</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition">
                  <td className="px-4 py-3 text-white/50 font-mono text-xs">{c.user_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 uppercase text-xs font-semibold">{c.type}</td>
                  <td className="px-4 py-3 capitalize">{c.plan}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.status}
                      onChange={(e) => updateStatus(c.id, e.target.value)}
                      className="bg-white/10 border border-white/10 rounded px-2 py-1 text-white text-xs"
                    >
                      <option value="pending">pending</option>
                      <option value="active">active</option>
                      <option value="expired">expired</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {contracts.length === 0 && (
            <p className="text-center text-white/30 py-8">No contracts yet.</p>
          )}
        </div>
      )}
    </main>
  );
}