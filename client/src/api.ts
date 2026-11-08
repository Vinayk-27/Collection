import { RegisterData, GoogleSheetsStatus, PaymentRecord } from './types';

const API_BASE = '/api';

export async function fetchRegisterData(year: number): Promise<RegisterData> {
  const res = await fetch(`${API_BASE}/register?year=${year}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch register: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchStatus(): Promise<{
  serverTime: string;
  googleSheets: GoogleSheetsStatus;
  localDbStatus: any;
}> {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) {
    throw new Error('Failed to fetch status');
  }
  return res.json();
}

export async function addMember(name: string, amount: number, year: number) {
  const res = await fetch(`${API_BASE}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, amount, year }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add member');
  }
  return res.json();
}

export async function updateMember(id: string, name: string, amount: number, year: number) {
  const res = await fetch(`${API_BASE}/members/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, amount, year }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update member');
  }
  return res.json();
}

export async function deleteMember(id: string, year: number) {
  const res = await fetch(`${API_BASE}/members/${id}?year=${year}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete member');
  }
  return res.json();
}

export async function togglePayment(memberId: string, month: string, year: number, amount?: number) {
  const res = await fetch(`${API_BASE}/payments/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, month, year, amount }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to toggle payment');
  }
  return res.json();
}

export async function fetchMemberHistory(memberId: string): Promise<{
  member: { id: string; name: string; amount: number };
  history: PaymentRecord[];
}> {
  const res = await fetch(`${API_BASE}/members/${memberId}/history`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch member history');
  }
  return res.json();
}

export async function triggerSync(year: number) {
  const res = await fetch(`${API_BASE}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to trigger sync');
  }
  return res.json();
}

export async function testGoogleConnection(config: {
  spreadsheetId?: string;
  appsScriptUrl?: string;
  serviceAccountEmail?: string;
  privateKey?: string;
}) {
  const res = await fetch(`${API_BASE}/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return res.json();
}
