import { getSession } from './auth';

const API = () => process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

function authHeaders(): HeadersInit {
  const s = getSession();
  return {
    'Content-Type': 'application/json',
    ...(s ? { Authorization: `Bearer ${s.sessionToken}` } : {}),
  };
}

export interface Friend {
  id: string;
  name: string;
  profilePhoto?: string | null;
  is_active: number;
  last_seen?: number | null;
  isOnline: boolean;
  countryCode?: string | null;
  countryName?: string | null;
}

export interface FriendRequest {
  id: string;
  createdAt: number;
  from: { id: string; name: string; profilePhoto?: string | null };
}

export interface DirectMessage {
  id: string;
  from_id: string;
  to_id: string;
  content: string;
  created_at: number;
}

export async function apiFriends(): Promise<Friend[]> {
  const res = await fetch(`${API()}/api/friends`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load friends');
  return data.friends;
}

export async function apiFriendRequests(): Promise<FriendRequest[]> {
  const res = await fetch(`${API()}/api/friends/requests`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load requests');
  return data.requests;
}

export async function apiRespondToRequest(id: string, accept: boolean): Promise<void> {
  const res = await fetch(`${API()}/api/friends/requests/${id}/respond`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ accept }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to respond');
}

export async function apiCheckFriend(userId: string): Promise<boolean> {
  const res = await fetch(`${API()}/api/friends/check/${userId}`, { headers: authHeaders() });
  if (!res.ok) return false;
  const data = await res.json();
  return data.isFriend === true;
}

export async function apiUnfriend(friendId: string): Promise<void> {
  const res = await fetch(`${API()}/api/friends/${friendId}`, {
    method: 'DELETE', headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to unfriend');
}

export async function apiFriendMessages(friendId: string): Promise<DirectMessage[]> {
  const res = await fetch(`${API()}/api/friends/${friendId}/messages`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load messages');
  return data.messages;
}

export async function apiToggleActiveStatus(isActive: boolean): Promise<void> {
  const res = await fetch(`${API()}/api/users/me/active-status`, {
    method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ isActive }),
  });
  if (!res.ok) throw new Error('Failed to update active status');
}
