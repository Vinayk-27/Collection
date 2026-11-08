import fs from 'fs';
import path from 'path';
import { CONFIG } from './config.js';
import {
  getSheetsClient,
  fetchAllFromSheets,
  syncAllToSheets,
  MONTHS,
} from './googleSheets.js';

// Initial seed members if database is fresh
const INITIAL_MEMBERS = [
  { id: 'MEM-001', name: 'Rahul Sharma', amount: 500 },
  { id: 'MEM-002', name: 'Amit Verma', amount: 500 },
  { id: 'MEM-003', name: 'Priya Patel', amount: 750 },
  { id: 'MEM-004', name: 'Sneha Kulkarni', amount: 500 },
  { id: 'MEM-005', name: 'Vikram Singh', amount: 1000 },
];

const INITIAL_RECORDS = [
  {
    id: 'MEM-002_Feb_2026',
    memberId: 'MEM-002',
    name: 'Amit Verma',
    month: 'Feb',
    year: 2026,
    amount: 500,
    status: 'PAID',
    paymentDate: '2026-02-05 14:20',
  },
  {
    id: 'MEM-002_May_2026',
    memberId: 'MEM-002',
    name: 'Amit Verma',
    month: 'May',
    year: 2026,
    amount: 500,
    status: 'PAID',
    paymentDate: '2026-05-10 11:15',
  },
  {
    id: 'MEM-001_Jan_2026',
    memberId: 'MEM-001',
    name: 'Rahul Sharma',
    month: 'Jan',
    year: 2026,
    amount: 500,
    status: 'PAID',
    paymentDate: '2026-01-08 09:30',
  },
];

class StorageManager {
  constructor() {
    this.dbPath = CONFIG.DB_FILE;
    this.data = {
      members: [],
      records: [],
      lastSyncedAt: null,
      syncStatus: 'INITIALIZING',
      syncError: null,
    };
    this.initLocalDb();
  }

  initLocalDb() {
    if (!fs.existsSync(CONFIG.DATA_DIR)) {
      fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.members || this.data.members.length === 0) {
          this.data.members = INITIAL_MEMBERS;
          this.data.records = INITIAL_RECORDS;
          this.saveLocalDb();
        }
      } catch (e) {
        console.error('Error reading local db, re-initializing:', e);
        this.data = {
          members: INITIAL_MEMBERS,
          records: INITIAL_RECORDS,
          lastSyncedAt: null,
          syncStatus: 'LOCAL_ONLY',
          syncError: null,
        };
        this.saveLocalDb();
      }
    } else {
      this.data = {
        members: INITIAL_MEMBERS,
        records: INITIAL_RECORDS,
        lastSyncedAt: null,
        syncStatus: 'LOCAL_ONLY',
        syncError: null,
      };
      this.saveLocalDb();
    }
  }

  saveLocalDb() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write to local db:', e);
    }
  }

  /**
   * Sync with Google Sheets: Pull first if sheet has records, else push local seed
   */
  async syncWithGoogleSheets(activeYear = new Date().getFullYear()) {
    // If Google Apps Script Web App URL is configured
    if (CONFIG.APPS_SCRIPT_URL) {
      try {
        const url = `${CONFIG.APPS_SCRIPT_URL}?action=getRegister&year=${activeYear}`;
        const resp = await fetch(url);
        const json = await resp.json();
        if (json && json.members && json.members.length > 0) {
          this.data.members = json.members;
          this.data.records = json.records || [];
          this.data.lastSyncedAt = new Date().toISOString();
          this.data.syncStatus = 'CONNECTED';
          this.data.syncError = null;
          this.saveLocalDb();
          return { success: true, status: 'CONNECTED', message: 'Loaded data via Google Apps Script' };
        } else if (this.data.members && this.data.members.length > 0) {
          // Sheet is currently empty, push all local members to Google Sheet
          console.log('Sheet is empty, pushing local members to Apps Script...');
          await this.pushToSheets(activeYear);
          return { success: true, status: 'CONNECTED', message: 'Pushed all members and records to Google Sheet' };
        }
      } catch (err) {
        console.warn('Apps Script sync failed, falling back:', err.message);
      }
    }

    const sheetsClient = getSheetsClient();
    const spreadsheetId = CONFIG.SPREADSHEET_ID;

    if (!sheetsClient || !spreadsheetId) {
      if (CONFIG.APPS_SCRIPT_URL) {
        this.data.syncStatus = 'CONNECTED';
        return { success: true, status: 'CONNECTED', message: 'Apps Script Web App active' };
      }
      this.data.syncStatus = 'NOT_CONFIGURED';
      this.data.syncError = 'Google Sheets credentials or Apps Script URL not configured in server environment.';
      return { success: false, status: this.data.syncStatus, message: this.data.syncError };
    }

    try {
      const remote = await fetchAllFromSheets(sheetsClient, spreadsheetId);
      if (remote && remote.members.length > 0) {
        // Sheet has data, update local store from Google Sheets
        this.data.members = remote.members;
        this.data.records = remote.records;
        this.data.lastSyncedAt = new Date().toISOString();
        this.data.syncStatus = 'CONNECTED';
        this.data.syncError = null;
        this.saveLocalDb();
        return { success: true, status: 'CONNECTED', message: 'Loaded latest data from Google Sheets' };
      } else {
        // Sheet is empty or just initialized, push current data to Google Sheets
        await syncAllToSheets(sheetsClient, spreadsheetId, this.data.members, this.data.records, activeYear);
        this.data.lastSyncedAt = new Date().toISOString();
        this.data.syncStatus = 'CONNECTED';
        this.data.syncError = null;
        this.saveLocalDb();
        return { success: true, status: 'CONNECTED', message: 'Synchronized local register to Google Sheets' };
      }
    } catch (err) {
      console.error('Google Sheets sync error:', err.message);
      this.data.syncStatus = 'ERROR';
      this.data.syncError = err.message;
      return { success: false, status: 'ERROR', message: err.message };
    }
  }

  /**
   * Push changes to Google Sheets asynchronously
   */
  async pushToSheets(activeYear = new Date().getFullYear()) {
    if (CONFIG.APPS_SCRIPT_URL) {
      try {
        console.log(`Pushing to Apps Script (syncAll) for ${this.data.members.length} members, year ${activeYear}...`);
        const resp = await fetch(CONFIG.APPS_SCRIPT_URL, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'syncAll',
            year: activeYear,
            members: this.data.members,
            records: this.data.records,
          }),
        });
        const resText = await resp.text();
        console.log('Apps Script sync response:', resText);
        this.data.lastSyncedAt = new Date().toISOString();
        this.data.syncStatus = 'CONNECTED';
        this.data.syncError = null;
      } catch (err) {
        console.warn('Failed to push to Apps Script:', err.message);
        this.data.syncStatus = 'ERROR';
        this.data.syncError = err.message;
      }
    }

    const sheetsClient = getSheetsClient();
    const spreadsheetId = CONFIG.SPREADSHEET_ID;

    if (!sheetsClient || !spreadsheetId) {
      if (!CONFIG.APPS_SCRIPT_URL) {
        this.data.syncStatus = 'NOT_CONFIGURED';
      }
      return;
    }

    try {
      await syncAllToSheets(sheetsClient, spreadsheetId, this.data.members, this.data.records, activeYear);
      this.data.lastSyncedAt = new Date().toISOString();
      this.data.syncStatus = 'CONNECTED';
      this.data.syncError = null;
      this.saveLocalDb();
    } catch (err) {
      console.error('Failed to push to Google Sheets:', err.message);
      this.data.syncStatus = 'ERROR';
      this.data.syncError = err.message;
      this.saveLocalDb();
    }
  }

  getMembers() {
    return this.data.members;
  }

  getRecords() {
    return this.data.records;
  }

  getRegisterForYear(year) {
    const y = parseInt(year, 10);
    const members = [...this.data.members];
    const records = this.data.records.filter((r) => r.year === y);

    // Build the register matrix
    const matrix = members.map((m) => {
      const monthsData = {};
      MONTHS.forEach((month) => {
        const rec = records.find((r) => r.memberId === m.id && r.month === month);
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
      year: y,
      members: matrix,
      summary: this.calculateSummary(matrix, y),
      syncStatus: this.data.syncStatus,
      syncError: this.data.syncError,
      lastSyncedAt: this.data.lastSyncedAt,
    };
  }

  calculateSummary(matrix, year) {
    const totalMembers = matrix.length;
    let totalExpectedYear = 0;
    let totalCollectedYear = 0;
    let totalPendingYear = 0;

    const monthlyBreakdown = {};
    MONTHS.forEach((month) => {
      let expectedMonth = 0;
      let collectedMonth = 0;
      let pendingMonth = 0;

      matrix.forEach((m) => {
        const cell = m.months[month];
        const amt = cell.amount;
        expectedMonth += amt;
        if (cell.status === 'PAID') {
          collectedMonth += amt;
        } else {
          pendingMonth += amt;
        }
      });

      monthlyBreakdown[month] = {
        expected: expectedMonth,
        collected: collectedMonth,
        pending: pendingMonth,
      };

      totalExpectedYear += expectedMonth;
      totalCollectedYear += collectedMonth;
      totalPendingYear += pendingMonth;
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

  async addMember(name, amount, activeYear) {
    const cleanName = (name || '').trim();
    if (!cleanName) {
      throw new Error('Member name is required');
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      throw new Error('Valid positive monthly amount is required');
    }

    // Check duplicate name
    const existing = this.data.members.find(
      (m) => m.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) {
      throw new Error(`A member named "${cleanName}" already exists.`);
    }

    // Generate unique ID
    let maxId = 0;
    this.data.members.forEach((m) => {
      const match = m.id.match(/\d+/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (val > maxId) maxId = val;
      }
    });
    const newId = `MEM-${String(maxId + 1).padStart(3, '0')}`;

    const newMember = {
      id: newId,
      name: cleanName,
      amount: numAmount,
    };

    this.data.members.push(newMember);
    this.saveLocalDb();
    await this.pushToSheets(activeYear);

    return newMember;
  }

  async updateMember(id, name, amount, activeYear) {
    const member = this.data.members.find((m) => m.id === id);
    if (!member) {
      throw new Error(`Member with ID ${id} not found`);
    }

    const cleanName = (name || '').trim();
    if (!cleanName) {
      throw new Error('Member name cannot be empty');
    }

    // Check duplicate name for other members
    const dup = this.data.members.find(
      (m) => m.id !== id && m.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (dup) {
      throw new Error(`Another member is already named "${cleanName}"`);
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      throw new Error('Amount must be a non-negative number');
    }

    member.name = cleanName;
    member.amount = numAmount;

    // Update member name in payment records as well
    this.data.records.forEach((r) => {
      if (r.memberId === id) {
        r.name = cleanName;
      }
    });

    this.saveLocalDb();
    await this.pushToSheets(activeYear);

    return member;
  }

  async deleteMember(id, activeYear) {
    const index = this.data.members.findIndex((m) => m.id === id);
    if (index === -1) {
      throw new Error(`Member with ID ${id} not found`);
    }

    const removed = this.data.members.splice(index, 1)[0];
    // Remove related records
    this.data.records = this.data.records.filter((r) => r.memberId !== id);

    this.saveLocalDb();
    await this.pushToSheets(activeYear);

    return removed;
  }

  async togglePayment(memberId, month, year, customAmount = null) {
    const member = this.data.members.find((m) => m.id === memberId);
    if (!member) {
      throw new Error(`Member ${memberId} not found`);
    }

    if (!MONTHS.includes(month)) {
      throw new Error(`Invalid month: ${month}`);
    }

    const y = parseInt(year, 10);
    const recordId = `${memberId}_${month}_${y}`;
    let recordIndex = this.data.records.findIndex(
      (r) => r.memberId === memberId && r.month === month && r.year === y
    );

    const now = new Date();
    const formattedDate = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let updatedRecord = null;

    if (recordIndex >= 0) {
      const existing = this.data.records[recordIndex];
      const newStatus = existing.status === 'PAID' ? 'UNPAID' : 'PAID';
      existing.status = newStatus;
      existing.paymentDate = newStatus === 'PAID' ? formattedDate : null;
      if (customAmount !== null) {
        existing.amount = parseFloat(customAmount);
      }
      updatedRecord = existing;
    } else {
      // Create new record with status PAID
      const amt = customAmount !== null ? parseFloat(customAmount) : member.amount;
      updatedRecord = {
        id: recordId,
        memberId,
        name: member.name,
        month,
        year: y,
        amount: amt,
        status: 'PAID',
        paymentDate: formattedDate,
      };
      this.data.records.push(updatedRecord);
    }

    this.saveLocalDb();
    await this.pushToSheets(y);

    return updatedRecord;
  }

  getMemberHistory(memberId) {
    const member = this.data.members.find((m) => m.id === memberId);
    if (!member) {
      throw new Error(`Member ${memberId} not found`);
    }

    const history = this.data.records
      .filter((r) => r.memberId === memberId)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month);
      });

    return {
      member,
      history,
    };
  }
}

export const storage = new StorageManager();
