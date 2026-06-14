'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Profile = {
  id: string;
  email: string;
  role: string;
  plan: string;
  created_at: string;
};

export default function AdminUsersPage() {
  const { locale } = useParams();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/users`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      setUsers(json.users || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load users.');
    }
    setLoading(false);
  }

  async function updateRole(userId: string, newRole: string) {
    setUpdating(userId);
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
    if (error) alert('Failed to update role: ' + error.message);
    else await fetchUsers();
    setUpdating(null);
  }

  async function updatePlan(userId: string, newPlan: string) {
    setUpdating(userId);
    const { error } = await supabase
      .from('profiles')
      .update({ plan: newPlan })
      .eq('id', userId);
    if (error) alert('Failed to update plan: ' + error.message);
    else await fetchUsers();
    setUpdating(null);
  }

  return (
    <main className="min-h-screen bg-[#04080f] text-white p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${locale}/admin`} className="text-white/40 hover:text-white text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-sky-400">User Management</h1>
      </div>

      {loading && <p className="text-white/50">Loading users...</p>}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/50 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition">
                  <td className="px-4 py-3 text-white/80">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={updating === u.id}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                      className="bg-white/10 border border-white/10 rounded px-2 py-1 text-white text-xs disabled:opacity-50"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.plan}
                      disabled={updating === u.id}
                      onChange={(e) => updatePlan(u.id, e.target.value)}
                      className="bg-white/10 border border-white/10 rounded px-2 py-1 text-white text-xs disabled:opacity-50"
                    >
                      <option value="free">free</option>
                      <option value="pro">pro</option>
                      <option value="premium">premium</option>
                      <option value="b2b">b2b</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-white/40">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="text-center text-white/30 py-8">No users found.</p>
          )}
        </div>
      )}
    </main>
  );
}