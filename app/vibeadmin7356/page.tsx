'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users, Flag, BarChart2, LogOut, RefreshCw, Trash2,
  ShieldOff, Shield, Loader2, Activity, Wifi, Clock, AlertTriangle,
} from 'lucide-react';

const API = () => process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const TOKEN_KEY = 'vl_admin_token';

type Tab = 'overview' | 'users' | 'reports';

interface Stats {
  totalUsers: number; totalReports: number; bannedUsers: number;
  activeConnections: number; activeRooms: number;
  textQueue: number; videoQueue: number; uptime: number;
}
interface DBUser {
  id: string; name: string; email: string; dob: string;
  created_at: number; last_seen: number | null; is_banned: number;
}
interface Report {
  id: string; reporter_socket: string; reported_socket: string;
  reason: string; created_at: number;
}

function fmt(ms: number | null) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString();
}
function fmtUptime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function AdminDashboard() {
  const [token,   setToken]   = useState<string | null>(null);
  const [tab,     setTab]     = useState<Tab>('overview');
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [users,   setUsers]   = useState<DBUser[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Login form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  const authHeader = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API()}/api/admin/stats`, { headers: authHeader() });
      if (r.ok) setStats(await r.json());
    } catch { /* ignore */ }
  }, [token, authHeader]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API()}/api/admin/users?limit=100`, { headers: authHeader() });
      if (r.ok) { const d = await r.json(); setUsers(d.users); }
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, authHeader]);

  const loadReports = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API()}/api/admin/reports`, { headers: authHeader() });
      if (r.ok) { const d = await r.json(); setReports(d.reports); }
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, authHeader]);

  useEffect(() => {
    if (!token) return;
    loadStats();
    if (tab === 'users')   loadUsers();
    if (tab === 'reports') loadReports();
  }, [token, tab, loadStats, loadUsers, loadReports]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr('');
    setLoginLoading(true);
    try {
      const r = await fetch(`${API()}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (!r.ok) { setLoginErr(d.error || 'Invalid credentials'); return; }
      sessionStorage.setItem(TOKEN_KEY, d.token);
      setToken(d.token);
    } catch {
      setLoginErr('Could not reach server.');
    } finally {
      setLoginLoading(false);
    }
  };

  const banUser = async (id: string, banned: boolean) => {
    await fetch(`${API()}/api/admin/users/${id}/ban`, {
      method: 'PATCH', headers: authHeader(), body: JSON.stringify({ banned }),
    });
    loadUsers();
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user permanently?')) return;
    await fetch(`${API()}/api/admin/users/${id}`, { method: 'DELETE', headers: authHeader() });
    loadUsers();
  };

  // ── Login screen ─────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">VibeLink Admin</p>
              <p className="text-xs text-slate-400">Restricted access</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="Username" autoComplete="username"
              className={inp}
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" autoComplete="current-password"
              className={inp}
            />
            {loginErr && <p className="text-xs text-red-500">{loginErr}</p>}
            <button
              type="submit" disabled={loginLoading}
              className="h-10 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition-colors"
            >
              {loginLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">VibeLink Admin</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadStats(); tab === 'users' && loadUsers(); tab === 'reports' && loadReports(); }}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { sessionStorage.removeItem(TOKEN_KEY); setToken(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-6 pt-4 flex gap-1 border-b border-slate-200 bg-white">
        {([['overview', BarChart2, 'Overview'], ['users', Users, 'Users'], ['reports', Flag, 'Reports']] as const).map(([id, Icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-px',
              tab === id
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === 'users'   && stats && <Chip n={stats.totalUsers} />}
            {id === 'reports' && stats && <Chip n={stats.totalReports} />}
          </button>
        ))}
      </div>

      <main className="p-6 max-w-6xl mx-auto">

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-4">Live overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <StatCard icon={<Users className="w-5 h-5 text-violet-500" />}    label="Total users"    value={stats?.totalUsers ?? '—'} />
              <StatCard icon={<Wifi className="w-5 h-5 text-green-500" />}      label="Online now"     value={stats?.activeConnections ?? '—'} />
              <StatCard icon={<Activity className="w-5 h-5 text-blue-500" />}   label="Active rooms"   value={stats?.activeRooms ?? '—'} />
              <StatCard icon={<Flag className="w-5 h-5 text-red-500" />}        label="Reports"        value={stats?.totalReports ?? '—'} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={<ShieldOff className="w-5 h-5 text-orange-400" />} label="Banned users"  value={stats?.bannedUsers ?? '—'} />
              <StatCard icon={<Users className="w-5 h-5 text-slate-400" />}      label="Text queue"    value={stats?.textQueue ?? '—'} />
              <StatCard icon={<Users className="w-5 h-5 text-slate-400" />}      label="Video queue"   value={stats?.videoQueue ?? '—'} />
              <StatCard icon={<Clock className="w-5 h-5 text-slate-400" />}      label="Uptime"        value={stats ? fmtUptime(stats.uptime) : '—'} />
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {tab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">Registered users</h2>
              <button onClick={loadUsers} className="text-xs text-violet-600 hover:underline cursor-pointer">Refresh</button>
            </div>
            {loading
              ? <Spinner />
              : users.length === 0
              ? <Empty text="No users yet." />
              : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          {['Name', 'Email', 'DOB', 'Joined', 'Last seen', 'Status', 'Actions'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.map((u) => (
                          <tr key={u.id} className={u.is_banned ? 'bg-red-50' : 'hover:bg-slate-50'}>
                            <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{u.name}</td>
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{u.email}</td>
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{u.dob}</td>
                            <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmt(u.created_at)}</td>
                            <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmt(u.last_seen)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.is_banned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {u.is_banned ? 'Banned' : 'Active'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => banUser(u.id, !u.is_banned)}
                                  title={u.is_banned ? 'Unban' : 'Ban'}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-orange-500 transition-colors cursor-pointer"
                                >
                                  {u.is_banned ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => deleteUser(u.id)}
                                  title="Delete"
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }
          </div>
        )}

        {/* ── Reports ── */}
        {tab === 'reports' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">User reports</h2>
              <button onClick={loadReports} className="text-xs text-violet-600 hover:underline cursor-pointer">Refresh</button>
            </div>
            {loading
              ? <Spinner />
              : reports.length === 0
              ? <Empty text="No reports yet." />
              : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          {['Reporter socket', 'Reported socket', 'Reason', 'Date'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reports.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.reporter_socket.slice(0,12)}…</td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.reported_socket.slice(0,12)}…</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                                <AlertTriangle className="w-3 h-3" />
                                {r.reason}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmt(r.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }
          </div>
        )}

      </main>
    </div>
  );
}

// ── Small UI helpers ───────────────────────────────────────────────────────────
const inp = 'h-10 w-full px-3 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors';

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-slate-500 font-medium">{label}</span></div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Chip({ n }: { n: number }) {
  return <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 rounded-full">{n}</span>;
}

function Spinner() {
  return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="text-center py-12 text-sm text-slate-400">{text}</div>;
}
