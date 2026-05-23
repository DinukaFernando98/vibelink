'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users, Flag, BarChart2, LogOut, RefreshCw, Trash2,
  ShieldOff, Shield, Loader2, Activity, Wifi, Clock, AlertTriangle, Mail, CheckCircle, Circle,
  ChevronDown, ChevronRight, Ban, Eye, MessageSquare, Camera,
} from 'lucide-react';
import { REPORT_CATEGORIES } from '@/components/ui/ReportModal';

const API = () => process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const TOKEN_KEY = 'vl_admin_token';

type Tab = 'overview' | 'users' | 'reports' | 'enquiries';

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
  id: string;
  reporter_socket: string; reported_socket: string;
  reporter_user_id: string | null; reported_user_id: string | null;
  reporter_name: string | null; reported_name: string | null; reported_email: string | null;
  category: string; description: string | null;
  screenshot: string | null; chat_log: string | null;
  auto_action: string | null; status: string;
  reviewer_note: string | null; reviewed_at: number | null;
  reported_is_banned: number; risk_score: number;
  reason: string; created_at: number;
}
interface Enquiry {
  id: string; name: string; email: string; subject: string;
  message: string; status: string; created_at: number;
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
  const [token,       setToken]      = useState<string | null>(null);
  const [tab,         setTab]        = useState<Tab>('overview');
  const [stats,       setStats]      = useState<Stats | null>(null);
  const [users,       setUsers]      = useState<DBUser[]>([]);
  const [reportFilter, setReportFilter] = useState<'all'|'pending'|'actioned'|'dismissed'>('pending');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [reports,   setReports]   = useState<Report[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

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

  const loadReports = useCallback(async (status = reportFilter) => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API()}/api/admin/reports?status=${status}&limit=100`, { headers: authHeader() });
      if (r.ok) { const d = await r.json(); setReports(d.reports); }
    } catch { /* ignore */ }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, authHeader, reportFilter]);

  const actionReport = useCallback(async (reportId: string, action: string, note?: string) => {
    await fetch(`${API()}/api/admin/reports/${reportId}/action`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ action, note }),
    });
    loadReports();
  }, [authHeader, loadReports]);

  const loadEnquiries = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API()}/api/admin/enquiries`, { headers: authHeader() });
      if (r.ok) { const d = await r.json(); setEnquiries(d.enquiries); }
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, authHeader]);

  const updateEnquiryStatus = async (id: string, status: string) => {
    await fetch(`${API()}/api/admin/enquiries/${id}/status`, {
      method: 'PATCH', headers: authHeader(), body: JSON.stringify({ status }),
    });
    loadEnquiries();
  };

  useEffect(() => {
    if (!token) return;
    loadStats();
    if (tab === 'users')     loadUsers();
    if (tab === 'reports')   loadReports();
    if (tab === 'enquiries') loadEnquiries();
  }, [token, tab, loadStats, loadUsers, loadReports, loadEnquiries]);

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
        {([['overview', BarChart2, 'Overview'], ['users', Users, 'Users'], ['reports', Flag, 'Reports'], ['enquiries', Mail, 'Enquiries']] as const).map(([id, Icon, label]) => (
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
            {id === 'users'     && stats && <Chip n={stats.totalUsers} />}
            {id === 'reports'   && stats && <Chip n={stats.totalReports} />}
            {id === 'enquiries' && enquiries.filter(e => e.status === 'new').length > 0 && <Chip n={enquiries.filter(e => e.status === 'new').length} />}
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
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-1.5">
                {(['pending','actioned','dismissed','all'] as const).map(f => (
                  <button key={f} onClick={() => { setReportFilter(f); loadReports(f); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${reportFilter === f ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {f === 'pending' && stats && stats.totalReports > 0 && <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{stats.totalReports}</span>}
                  </button>
                ))}
              </div>
              <button onClick={() => loadReports()} className="text-xs text-violet-600 hover:underline cursor-pointer flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />Refresh
              </button>
            </div>

            {loading ? <Spinner /> : reports.length === 0 ? <Empty text="No reports in this category." /> : (
              <div className="flex flex-col gap-3">
                {reports.map(r => {
                  const cat      = REPORT_CATEGORIES.find(c => c.id === r.category) ?? REPORT_CATEGORIES[REPORT_CATEGORIES.length - 1];
                  const isOpen   = expandedReport === r.id;
                  const chatLog  = r.chat_log ? (typeof r.chat_log === 'string' ? JSON.parse(r.chat_log) : r.chat_log) as string[] : [];
                  return (
                    <div key={r.id} className={`bg-white rounded-2xl border overflow-hidden ${r.status === 'pending' ? 'border-orange-200' : r.status === 'actioned' ? 'border-red-200' : 'border-slate-200'}`}>
                      {/* Summary row */}
                      <div className="flex items-start gap-3 p-4">
                        {/* Screenshot thumbnail */}
                        <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                          {r.screenshot
                            ? <img src={r.screenshot} alt="screenshot" className="w-full h-full object-cover cursor-pointer" onClick={() => window.open(r.screenshot!, '_blank')} />
                            : <Camera className="w-5 h-5 text-slate-300" />}
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {/* Category badge */}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cat.bg} ${cat.color}`}>
                              <AlertTriangle className="w-3 h-3" />{cat.label}
                            </span>
                            {/* Status */}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                              r.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                              r.status === 'actioned' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-500'
                            }`}>{r.status}</span>
                            {/* Auto-action badge */}
                            {r.auto_action && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-700 font-semibold">
                                Auto: {r.auto_action.replace(/_/g,' ')}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                            <span><strong className="text-slate-700">Reported:</strong> {r.reported_name ?? r.reported_socket?.slice(0,10) ?? '—'}{r.reported_email ? ` <${r.reported_email}>` : ''}</span>
                            <span><strong className="text-slate-700">Reporter:</strong> {r.reporter_name ?? r.reporter_socket?.slice(0,10) ?? '—'}</span>
                            <span>{fmt(r.created_at)}</span>
                            {r.risk_score > 0 && <span className="text-orange-600 font-semibold">Risk: {r.risk_score}</span>}
                          </div>

                          {r.description && <p className="text-xs text-slate-600 mt-1 italic">&ldquo;{r.description}&rdquo;</p>}
                        </div>

                        {/* Expand toggle */}
                        <button onClick={() => setExpandedReport(isOpen ? null : r.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer shrink-0">
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Expanded detail */}
                      {isOpen && (
                        <div className="border-t border-slate-100 p-4 flex flex-col gap-4">
                          {/* Chat log */}
                          {chatLog.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5" />Chat log ({chatLog.length} messages)
                              </p>
                              <div className="bg-slate-50 rounded-xl p-3 max-h-48 overflow-y-auto flex flex-col gap-1">
                                {chatLog.map((line, i) => (
                                  <p key={i} className={`text-xs ${line.startsWith('[You]') ? 'text-violet-700' : 'text-slate-600'}`}>{line}</p>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Screenshot full */}
                          {r.screenshot && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" />Screenshot at time of report
                              </p>
                              <img src={r.screenshot} alt="report screenshot" className="rounded-xl max-h-64 object-contain border border-slate-200 cursor-pointer" onClick={() => window.open(r.screenshot!, '_blank')} />
                            </div>
                          )}

                          {/* Reviewer note input */}
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Moderator note</p>
                            <textarea
                              rows={2} placeholder="Add an internal note…"
                              value={noteInputs[r.id] ?? r.reviewer_note ?? ''}
                              onChange={e => setNoteInputs(p => ({ ...p, [r.id]: e.target.value }))}
                              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-violet-400 resize-none"
                            />
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2">
                            {r.reported_user_id && !r.reported_is_banned && (
                              <button onClick={() => actionReport(r.id, 'ban', noteInputs[r.id])}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                                <Ban className="w-3.5 h-3.5" />Permanent ban
                              </button>
                            )}
                            {r.reported_user_id && !r.reported_is_banned && (
                              <button onClick={() => actionReport(r.id, 'temp_ban_24h', noteInputs[r.id])}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                                <Clock className="w-3.5 h-3.5" />Ban 24h
                              </button>
                            )}
                            {r.reported_user_id && !!r.reported_is_banned && (
                              <button onClick={() => actionReport(r.id, 'unban', noteInputs[r.id])}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                                <Shield className="w-3.5 h-3.5" />Unban user
                              </button>
                            )}
                            <button onClick={() => actionReport(r.id, 'ignore', noteInputs[r.id])}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                              <CheckCircle className="w-3.5 h-3.5" />Dismiss
                            </button>
                            <button onClick={() => actionReport(r.id, 'false_report', noteInputs[r.id])}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg cursor-pointer transition-colors">
                              False report
                            </button>
                          </div>
                          {r.reviewed_at && <p className="text-[11px] text-slate-400">Reviewed {fmt(r.reviewed_at)}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Enquiries ── */}
        {tab === 'enquiries' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">Contact enquiries</h2>
              <button onClick={loadEnquiries} className="text-xs text-violet-600 hover:underline cursor-pointer">Refresh</button>
            </div>
            {loading
              ? <Spinner />
              : enquiries.length === 0
              ? <Empty text="No enquiries yet." />
              : (
                <div className="flex flex-col gap-3">
                  {enquiries.map((eq) => (
                    <div key={eq.id} className={`bg-white rounded-2xl border p-4 ${eq.status === 'new' ? 'border-violet-200' : 'border-slate-200'}`}>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-slate-800 text-sm">{eq.name}</span>
                            <span className="text-slate-400 text-xs">&lt;{eq.email}&gt;</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700">{eq.subject}</span>
                            {eq.status === 'new'
                              ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700"><Circle className="w-2 h-2 fill-blue-500" />New</span>
                              : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700"><CheckCircle className="w-2.5 h-2.5" />Resolved</span>}
                          </div>
                          <p className="text-xs text-slate-500 mb-2">{fmt(eq.created_at)}</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{eq.message}</p>
                        </div>
                        <button
                          onClick={() => updateEnquiryStatus(eq.id, eq.status === 'new' ? 'resolved' : 'new')}
                          className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer ${eq.status === 'new' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                          {eq.status === 'new' ? 'Mark resolved' : 'Reopen'}
                        </button>
                      </div>
                    </div>
                  ))}
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
