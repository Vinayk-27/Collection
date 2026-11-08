import { RegisterData, GoogleSheetsStatus, PaymentRecord, ALL_MONTHS, MonthName, MonthlyBreakdownItem } from './types';

const API_BASE = '/api';
const APPS_SCRIPT_URL =
  (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwFZrSqeLLgadFow9wPvCKCaHNLj7wtlPXGM6D9wkbX9fHDcas_K0r2PUO3Pa2eYVhqFg/exec';

// Helper to calculate summary from matrix
function calculateSummary(matrix: any[], year: number) {
  let totalMembers = matrix.length;
  let totalExpectedYear = 0;
  let totalCollectedYear = 0;
  let totalPendingYear = 0;
  const monthlyBreakdown: Record<MonthName, MonthlyBreakdownItem> = {} as any;

  ALL_MONTHS.forEach((month) => {
    let exp = 0;
    let col = 0;
    let pen = 0;
    matrix.forEach((m) => {
      const cell = m.months[month];
      exp += cell.amount;
      if (cell.status === 'PAID') col += cell.amount;
      else pen += cell.amount;
    });
    monthlyBreakdown[month] = { expected: exp, collected: col, pending: pen };
    totalExpectedYear += exp;
    totalCollectedYear += col;
    totalPendingYear += pen;
  });

  return {
    year,
    totalMembers,
    totalExpectedYear,
    totalCollectedYear,
    totalPendingYear,
    monthlyBreakdown,
  };
}

export async function fetchRegisterData(year: number): Promise<RegisterData> {
  try {
    const res = await fetch(`${API_BASE}/register?year=${year}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log('Local API unavailable, connecting directly to Google Apps Script...');
  }

  // Direct Google Apps Script fallback
  const resp = await fetch(`${APPS_SCRIPT_URL}?action=getRegister&year=${year}`);
  const data = await resp.json();

  const members = data.members || [];
  const records = data.records || [];

  const matrix = members.map((m: any) => {
    const monthsData: any = {};
    ALL_MONTHS.forEach((month) => {
      const rec = records.find(
        (r: any) => r.memberId === m.id && r.month === month && r.year === year
      );
      monthsData[month] = {
        amount: rec ? rec.amount : m.amount,
        status: rec ? rec.status : 'UNPAID',
        paymentDate: rec?.paymentDate || null,
      };
    });
    return {
      id: m.id,
      name: m.name,
      monthlyAmount: m.amount,
      months: monthsData,
    };
  });

  return {
    year,
    members: matrix,
    summary: calculateSummary(matrix, year),
    syncStatus: 'CONNECTED',
    syncError: null,
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function fetchStatus(): Promise<{
  serverTime: string;
  googleSheets: GoogleSheetsStatus;
  localDbStatus: any;
}> {
  try {
    const res = await fetch(`${API_BASE}/status`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // fallback
  }

  try {
    const resp = await fetch(`${APPS_SCRIPT_URL}?action=status`);
    const json = await resp.json();
    return {
      serverTime: new Date().toISOString(),
      googleSheets: {
        connected: json.status === 'OK',
        type: 'APPS_SCRIPT',
        appsScriptUrl: APPS_SCRIPT_URL,
        title: json.title,
        sheets: json.sheets,
        message: `Connected via Google Apps Script to "${json.title}"`,
        configured: true,
      },
      localDbStatus: { syncStatus: 'CONNECTED' },
    };
  } catch (err: any) {
    return {
      serverTime: new Date().toISOString(),
      googleSheets: {
        connected: false,
        message: err.message,
        configured: true,
      },
      localDbStatus: { syncStatus: 'ERROR' },
    };
  }
}

export async function addMember(name: string, amount: number, year: number) {
  try {
    const res = await fetch(`${API_BASE}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, amount, year }),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    // fallback
  }

  const id = `MEM-${String(Date.now()).slice(-3)}`;
  await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'addMember', id, name, amount }),
  });

  return { success: true, member: { id, name, amount } };
}

export async function updateMember(id: string, name: string, amount: number, year: number) {
  try {
    const res = await fetch(`${API_BASE}/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, amount, year }),
    });
    if (res.ok) return await res.json();
  } catch (e) {}

  await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'updateMember', id, name, amount }),
  });
  return { success: true, member: { id, name, amount } };
}

export async function deleteMember(id: string, year: number) {
  try {
    const res = await fetch(`${API_BASE}/members/${id}?year=${year}`, {
      method: 'DELETE',
    });
    if (res.ok) return await res.json();
  } catch (e) {}

  await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'deleteMember', id }),
  });
  return { success: true };
}

export async function togglePayment(memberId: string, month: string, year: number, amount?: number) {
  try {
    const res = await fetch(`${API_BASE}/payments/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, month, year, amount }),
    });
    if (res.ok) return await res.json();
  } catch (e) {}

  const now = new Date();
  const paymentDate = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'togglePayment',
      memberId,
      month,
      year,
      amount: amount || 500,
      status: 'PAID',
      paymentDate,
    }),
  });

  return { success: true };
}

export async function fetchMemberHistory(memberId: string): Promise<{
  member: { id: string; name: string; amount: number };
  history: PaymentRecord[];
}> {
  try {
    const res = await fetch(`${API_BASE}/members/${memberId}/history`);
    if (res.ok) return await res.json();
  } catch (e) {}

  const resp = await fetch(`${APPS_SCRIPT_URL}?action=getRegister`);
  const data = await resp.json();
  const mem = (data.members || []).find((m: any) => m.id === memberId) || { id: memberId, name: 'Member', amount: 500 };
  const history = (data.records || []).filter((r: any) => r.memberId === memberId);
  return { member: mem, history };
}

export async function triggerSync(year: number) {
  try {
    const res = await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year }),
    });
    if (res.ok) return await res.json();
  } catch (e) {}

  const resp = await fetch(`${APPS_SCRIPT_URL}?action=getRegister&year=${year}`);
  const data = await resp.json();
  return { success: true, message: `Loaded ${data.members?.length || 0} members from Google Sheet` };
}

export async function testGoogleConnection(config: {
  spreadsheetId?: string;
  appsScriptUrl?: string;
  serviceAccountEmail?: string;
  privateKey?: string;
}) {
  try {
    const res = await fetch(`${API_BASE}/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) return await res.json();
  } catch (e) {}

  const url = config.appsScriptUrl || APPS_SCRIPT_URL;
  const resp = await fetch(`${url}?action=status`);
  const json = await resp.json();
  return {
    connected: json.status === 'OK',
    title: json.title,
    message: `Connected via Apps Script to "${json.title}"`,
  };
}
