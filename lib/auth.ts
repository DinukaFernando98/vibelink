const SESSION_KEY = 'vl_session';
const API = () => process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  dob: string;
  profilePhoto?: string | null;
  sessionToken: string;
}

export function getSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as UserSession) : null;
  } catch { return null; }
}

export function saveSession(session: UserSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// ── API calls ──────────────────────────────────────────────────────────────────

export async function apiRegister(payload: {
  name: string; email: string; dob: string; password: string; profilePhoto?: string | null;
}): Promise<UserSession> {
  const res = await fetch(`${API()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  const session: UserSession = { ...data.user, sessionToken: data.sessionToken };
  saveSession(session);
  return session;
}

export async function apiLogin(email: string, password: string): Promise<UserSession> {
  const res = await fetch(`${API()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  const session: UserSession = { ...data.user, sessionToken: data.sessionToken };
  saveSession(session);
  return session;
}
