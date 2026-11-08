import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { CONFIG } from './config.js';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Creates authenticated Google Sheets client using Service Account credentials
 */
export function getSheetsClient() {
  let auth = null;

  // Option 1: File path to service account credentials JSON
  if (CONFIG.CREDENTIALS_FILE && fs.existsSync(CONFIG.CREDENTIALS_FILE)) {
    auth = new google.auth.GoogleAuth({
      keyFile: CONFIG.CREDENTIALS_FILE,
      scopes: SCOPES,
    });
  } 
  // Option 2: Default credentials.json in server root if present
  else if (fs.existsSync(path.resolve(process.cwd(), 'credentials.json'))) {
    auth = new google.auth.GoogleAuth({
      keyFile: path.resolve(process.cwd(), 'credentials.json'),
      scopes: SCOPES,
    });
  }
  // Option 3: Inline credentials via environment variables
  else if (CONFIG.SERVICE_ACCOUNT_EMAIL && CONFIG.PRIVATE_KEY) {
    auth = new google.auth.JWT({
      email: CONFIG.SERVICE_ACCOUNT_EMAIL,
      key: CONFIG.PRIVATE_KEY,
      scopes: SCOPES,
    });
  }

  if (!auth) {
    return null;
  }

  return google.sheets({ version: 'v4', auth });
}

/**
 * Test connection to Google Sheets and inspect structure
 */
export async function testConnection(customConfig = null) {
  const appsScriptUrl = customConfig?.appsScriptUrl || CONFIG.APPS_SCRIPT_URL;

  // Test Google Apps Script Web App if provided
  if (appsScriptUrl) {
    try {
      const resp = await fetch(`${appsScriptUrl}?action=status`, { redirect: 'follow' });
      const text = await resp.text();
      
      try {
        const json = JSON.parse(text);
        return {
          connected: true,
          type: 'APPS_SCRIPT',
          appsScriptUrl,
          title: json.title || 'Google Spreadsheet (Apps Script)',
          sheets: json.sheets || ['Payment Register', 'Payment Records'],
          message: `Connected via Google Apps Script to "${json.title || 'Spreadsheet'}"`,
          configured: true,
        };
      } catch (jsonErr) {
        if (text.includes('Script function not found: doGet')) {
          return {
            connected: false,
            type: 'APPS_SCRIPT',
            appsScriptUrl,
            message: 'Apps Script reachable, but doGet is missing from deployed version. In Apps Script, click Deploy > Manage deployments > Edit (pencil) > Version: "New version" > Deploy.',
            configured: true,
          };
        }
        return {
          connected: false,
          type: 'APPS_SCRIPT',
          appsScriptUrl,
          message: `Apps Script returned non-JSON response. Please check deployment access is set to "Anyone".`,
          configured: true,
        };
      }
    } catch (e) {
      return {
        connected: false,
        type: 'APPS_SCRIPT',
        appsScriptUrl,
        message: `Failed to reach Google Apps Script: ${e.message}`,
        configured: true,
      };
    }
  }

  const spreadsheetId = customConfig?.spreadsheetId || CONFIG.SPREADSHEET_ID;

  if (!spreadsheetId) {
    return {
      connected: false,
      message: 'No Google Spreadsheet ID or Apps Script URL configured.',
      configured: false,
    };
  }

  let client = null;
  if (customConfig?.serviceAccountEmail && customConfig?.privateKey) {
    const auth = new google.auth.JWT({
      email: customConfig.serviceAccountEmail,
      key: customConfig.privateKey.replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });
    client = google.sheets({ version: 'v4', auth });
  } else {
    client = getSheetsClient();
  }

  if (!client) {
    return {
      connected: false,
      message: 'Google service account credentials missing or invalid.',
      configured: false,
      spreadsheetId,
    };
  }

  try {
    const res = await client.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title,sheets.properties.title',
    });

    const sheetTitles = (res.data.sheets || []).map((s) => s.properties.title);
    return {
      connected: true,
      title: res.data.properties.title,
      sheets: sheetTitles,
      spreadsheetId,
      message: `Successfully connected to "${res.data.properties.title}"`,
      configured: true,
    };
  } catch (err) {
    let message = err.message || 'Unknown error connecting to Google Sheets';
    if (err.code === 403 || err.code === 404) {
      message = `Cannot access spreadsheet (${err.code}). Please ensure the Google Sheet is shared with edit access to your Service Account email, and the ID is correct.`;
    }
    return {
      connected: false,
      error: message,
      code: err.code,
      message,
      configured: true,
      spreadsheetId,
    };
  }
}

/**
 * Ensure required sheets and headers exist
 */
export async function ensureSheetStructure(sheetsClient, spreadsheetId) {
  if (!sheetsClient || !spreadsheetId) return;

  const res = await sheetsClient.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties',
  });

  const existingSheets = res.data.sheets.map((s) => s.properties.title);
  const requests = [];

  if (!existingSheets.includes('Payment Register')) {
    requests.push({
      addSheet: {
        properties: {
          title: 'Payment Register',
          gridProperties: { rowCount: 100, columnCount: 16 },
        },
      },
    });
  }

  if (!existingSheets.includes('Payment Records')) {
    requests.push({
      addSheet: {
        properties: {
          title: 'Payment Records',
          gridProperties: { rowCount: 500, columnCount: 10 },
        },
      },
    });
  }

  if (requests.length > 0) {
    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  // Ensure headers for Payment Register
  const registerHeader = [
    'Member ID',
    'Name',
    'Monthly Amount',
    ...MONTHS,
  ];

  const regHeaderCheck = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range: "'Payment Register'!A1:O1",
  });

  if (!regHeaderCheck.data.values || regHeaderCheck.data.values.length === 0) {
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: "'Payment Register'!A1:O1",
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [registerHeader],
      },
    });
  }

  // Ensure headers for Payment Records
  const recordsHeader = [
    'Member ID',
    'Name',
    'Month',
    'Year',
    'Amount',
    'Status',
    'Payment Date',
  ];

  const recHeaderCheck = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range: "'Payment Records'!A1:G1",
  });

  if (!recHeaderCheck.data.values || recHeaderCheck.data.values.length === 0) {
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: "'Payment Records'!A1:G1",
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [recordsHeader],
      },
    });
  }
}

/**
 * Fetch all members and payment records from Google Sheets
 */
export async function fetchAllFromSheets(sheetsClient, spreadsheetId) {
  if (!sheetsClient || !spreadsheetId) return null;

  await ensureSheetStructure(sheetsClient, spreadsheetId);

  // Read Sheet 1: Payment Register
  const regRes = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range: "'Payment Register'!A2:O",
  });

  const members = [];
  if (regRes.data.values) {
    regRes.data.values.forEach((row, index) => {
      const id = row[0] || `MEM-${String(index + 1).padStart(3, '0')}`;
      const name = row[1] || '';
      const amount = parseFloat(row[2]) || 0;
      if (name.trim()) {
        members.push({
          id: id.trim(),
          name: name.trim(),
          amount: amount,
          rowNumber: index + 2, // 1-based index in sheet
        });
      }
    });
  }

  // Read Sheet 2: Payment Records
  const recRes = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range: "'Payment Records'!A2:G",
  });

  const records = [];
  if (recRes.data.values) {
    recRes.data.values.forEach((row, index) => {
      if (row[0] && row[2] && row[3]) {
        records.push({
          id: `${row[0]}_${row[2]}_${row[3]}`, // memberId_month_year
          memberId: (row[0] || '').trim(),
          name: (row[1] || '').trim(),
          month: (row[2] || '').trim(),
          year: parseInt(row[3], 10) || new Date().getFullYear(),
          amount: parseFloat(row[4]) || 0,
          status: ((row[5] || 'UNPAID').trim().toUpperCase() === 'PAID') ? 'PAID' : 'UNPAID',
          paymentDate: row[6] || '',
          rowNumber: index + 2,
        });
      }
    });
  }

  return { members, records };
}

/**
 * Sync entire dataset to Google Sheets (e.g. after adding/editing/deleting)
 */
export async function syncAllToSheets(sheetsClient, spreadsheetId, members, records, activeYear) {
  if (!sheetsClient || !spreadsheetId) return;

  await ensureSheetStructure(sheetsClient, spreadsheetId);

  // 1. Prepare Payment Register data
  // Headers: Member ID | Name | Monthly Amount | Jan..Dec
  const registerRows = members.map((member) => {
    const row = [member.id, member.name, member.amount];
    MONTHS.forEach((month) => {
      const rec = records.find(
        (r) => r.memberId === member.id && r.month === month && r.year === activeYear
      );
      if (rec && rec.status === 'PAID') {
        row.push(`₹${rec.amount} [PAID]`);
      } else {
        row.push(`₹${member.amount}`);
      }
    });
    return row;
  });

  // Clear existing data rows in Payment Register
  await sheetsClient.spreadsheets.values.clear({
    spreadsheetId,
    range: "'Payment Register'!A2:O500",
  });

  if (registerRows.length > 0) {
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: `'Payment Register'!A2:O${registerRows.length + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: registerRows,
      },
    });
  }

  // 2. Prepare Payment Records data
  // Headers: Member ID | Name | Month | Year | Amount | Status | Payment Date
  const recordsRows = records.map((r) => [
    r.memberId,
    r.name,
    r.month,
    r.year,
    r.amount,
    r.status,
    r.paymentDate || '',
  ]);

  await sheetsClient.spreadsheets.values.clear({
    spreadsheetId,
    range: "'Payment Records'!A2:G2000",
  });

  if (recordsRows.length > 0) {
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: `'Payment Records'!A2:G${recordsRows.length + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: recordsRows,
      },
    });
  }
}

/**
 * Record a single payment status change in Google Sheets
 */
export async function updatePaymentRecordInSheet(sheetsClient, spreadsheetId, record, allMembers, allRecords) {
  if (!sheetsClient || !spreadsheetId) return;

  // For atomic and robust Google Sheets sync, we can update or append to Payment Records
  await syncAllToSheets(sheetsClient, spreadsheetId, allMembers, allRecords, record.year);
}
