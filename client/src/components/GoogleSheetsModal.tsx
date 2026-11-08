import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  Code2,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { GoogleSheetsStatus } from '../types';
import { testGoogleConnection, triggerSync } from '../api';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  sheetsStatus: GoogleSheetsStatus | null;
  onClose: () => void;
  onRefresh: () => void;
  currentYear: number;
}

const APPS_SCRIPT_SNIPPET = `/**
 * Monthly Payment Register - Google Apps Script (Production Ready)
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('📋 Payment Register')
      .addItem('🚀 Setup / Reformat All Sheets', 'setupSheets')
      .addItem('✨ Add Sample Members', 'addSampleData')
      .addToUi();
  } catch (e) {
    Logger.log(e.message);
  }
}

function formatHeader(sheet, colCount, bgColor) {
  const headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange
    .setBackground(bgColor)
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(10)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 36);
  sheet.setFrozenRows(1);
}

function ensureSetup(ss) {
  let regSheet = ss.getSheetByName('Payment Register') || ss.insertSheet('Payment Register');
  const regHeaders = ['Member ID', 'Name', 'Monthly Amount', ...MONTHS];
  if (regSheet.getLastRow() === 0) {
    regSheet.getRange(1, 1, 1, regHeaders.length).setValues([regHeaders]);
  }
  formatHeader(regSheet, regHeaders.length, '#0f172a');
  regSheet.setFrozenColumns(2);
  regSheet.setColumnWidth(1, 95);
  regSheet.setColumnWidth(2, 180);
  regSheet.setColumnWidth(3, 110);
  for (let c = 4; c <= 15; c++) regSheet.setColumnWidth(c, 85);

  let recSheet = ss.getSheetByName('Payment Records') || ss.insertSheet('Payment Records');
  const recHeaders = ['Member ID', 'Name', 'Month', 'Year', 'Amount', 'Status', 'Payment Date'];
  if (recSheet.getLastRow() === 0) {
    recSheet.getRange(1, 1, 1, recHeaders.length).setValues([recHeaders]);
  }
  formatHeader(recSheet, recHeaders.length, '#1e1b4b');
  recSheet.setColumnWidth(1, 95);
  recSheet.setColumnWidth(2, 180);
  recSheet.setColumnWidth(3, 80);
  recSheet.setColumnWidth(4, 75);
  recSheet.setColumnWidth(5, 90);
  recSheet.setColumnWidth(6, 95);
  recSheet.setColumnWidth(7, 160);

  applyConditionalFormatting(regSheet, recSheet);
  return { regSheet: regSheet, recSheet: recSheet };
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSetup(ss);
  try {
    SpreadsheetApp.getUi().alert('Setup Complete! Created and formatted "Payment Register" and "Payment Records" sheets.');
  } catch (e) {}
}

function applyConditionalFormatting(regSheet, recSheet) {
  if (!regSheet || !recSheet) return;
  regSheet.clearConditionalFormatRules();
  recSheet.clearConditionalFormatRules();

  const regRange = regSheet.getRange('D2:O500');
  const regPaidRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('PAID')
    .setBackground('#d1fae5')
    .setFontColor('#065f46')
    .setBold(true)
    .setRanges([regRange])
    .build();
  regSheet.setConditionalFormatRules([regPaidRule]);

  const recStatusRange = recSheet.getRange('F2:F2000');
  const recPaidRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('PAID')
    .setBackground('#d1fae5')
    .setFontColor('#065f46')
    .setBold(true)
    .setRanges([recStatusRange])
    .build();
  recSheet.setConditionalFormatRules([recPaidRule]);
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'status';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'status') {
      return responseJSON({ status: 'OK', title: ss.getName(), sheets: ss.getSheets().map(function(s) { return s.getName(); }) });
    }

    if (action === 'getRegister') {
      const sheets = ensureSetup(ss);
      const regValues = sheets.regSheet.getDataRange().getValues();
      const recValues = sheets.recSheet.getDataRange().getValues();

      const members = [];
      for (let i = 1; i < regValues.length; i++) {
        if (regValues[i][1] && String(regValues[i][1]).trim() !== '') {
          members.push({ id: String(regValues[i][0]).trim(), name: String(regValues[i][1]).trim(), amount: parseFloat(regValues[i][2]) || 0 });
        }
      }

      const records = [];
      for (let j = 1; j < recValues.length; j++) {
        if (recValues[j][0] && recValues[j][2]) {
          records.push({
            id: recValues[j][0] + '_' + recValues[j][2] + '_' + recValues[j][3],
            memberId: String(recValues[j][0]).trim(),
            name: String(recValues[j][1]).trim(),
            month: String(recValues[j][2]).trim(),
            year: parseInt(recValues[j][3], 10),
            amount: parseFloat(recValues[j][4]) || 0,
            status: String(recValues[j][5]).trim().toUpperCase() === 'PAID' ? 'PAID' : 'UNPAID',
            paymentDate: recValues[j][6] || ''
          });
        }
      }

      return responseJSON({ success: true, members: members, records: records });
    }

    return responseJSON({ error: 'Unknown action: ' + action });
  } catch (err) {
    return responseJSON({ error: err.message });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return responseJSON({ error: 'No POST body' });
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ensureSetup(ss);
    const regSheet = sheets.regSheet;
    const recSheet = sheets.recSheet;

    if (payload.action === 'addMember') {
      const newRow = [payload.id, payload.name, parseFloat(payload.amount) || 0];
      for (let i = 0; i < 12; i++) newRow.push('₹' + payload.amount);
      regSheet.appendRow(newRow);
      return responseJSON({ success: true, message: 'Member added' });
    }

    if (payload.action === 'syncAll') {
      const members = payload.members || [];
      const records = payload.records || [];
      const activeYear = parseInt(payload.year, 10) || new Date().getFullYear();

      regSheet.clear();
      const regHeaders = ['Member ID', 'Name', 'Monthly Amount', ...MONTHS];
      regSheet.getRange(1, 1, 1, regHeaders.length).setValues([regHeaders]);
      formatHeader(regSheet, regHeaders.length, '#0f172a');
      regSheet.setFrozenColumns(2);
      regSheet.setColumnWidth(1, 95);
      regSheet.setColumnWidth(2, 180);
      regSheet.setColumnWidth(3, 110);
      for (let c = 4; c <= 15; c++) regSheet.setColumnWidth(c, 85);

      if (members.length > 0) {
        const rows = members.map(function(m) {
          const row = [m.id, m.name, m.amount];
          MONTHS.forEach(function(mon) {
            const rec = records.find(function(r) { return r.memberId === m.id && r.month === mon && r.year === activeYear; });
            row.push(rec && rec.status === 'PAID' ? '₹' + rec.amount + ' [PAID]' : '₹' + m.amount);
          });
          return row;
        });
        regSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      }

      recSheet.clear();
      const recHeaders = ['Member ID', 'Name', 'Month', 'Year', 'Amount', 'Status', 'Payment Date'];
      recSheet.getRange(1, 1, 1, recHeaders.length).setValues([recHeaders]);
      formatHeader(recSheet, recHeaders.length, '#1e1b4b');
      recSheet.setColumnWidth(1, 95);
      recSheet.setColumnWidth(2, 180);
      recSheet.setColumnWidth(7, 160);

      if (records.length > 0) {
        const recRows = records.map(function(r) {
          return [r.memberId, r.name, r.month, r.year, r.amount, r.status, r.paymentDate || ''];
        });
        recSheet.getRange(2, 1, recRows.length, recRows[0].length).setValues(recRows);
      }

      applyConditionalFormatting(regSheet, recSheet);
      return responseJSON({ success: true, message: 'All sheets synchronized' });
    }

    if (payload.action === 'togglePayment') {
      const recData = recSheet.getDataRange().getValues();
      let foundRow = -1;
      for (let i = 1; i < recData.length; i++) {
        if (recData[i][0] == payload.memberId && recData[i][2] == payload.month && recData[i][3] == payload.year) {
          foundRow = i + 1;
          break;
        }
      }

      if (foundRow > 0) {
        recSheet.getRange(foundRow, 6).setValue(payload.status);
        recSheet.getRange(foundRow, 7).setValue(payload.paymentDate || '');
        if (payload.amount !== undefined) recSheet.getRange(foundRow, 5).setValue(payload.amount);
      } else {
        recSheet.appendRow([payload.memberId, payload.name, payload.month, payload.year, payload.amount, payload.status, payload.paymentDate || '']);
      }

      const monthIdx = MONTHS.indexOf(payload.month);
      if (monthIdx !== -1) {
        const colNumber = monthIdx + 4;
        const regData = regSheet.getDataRange().getValues();
        for (let r = 1; r < regData.length; r++) {
          if (regData[r][0] == payload.memberId) {
            regSheet.getRange(r + 1, colNumber).setValue(payload.status === 'PAID' ? '₹' + payload.amount + ' [PAID]' : '₹' + payload.amount);
            break;
          }
        }
      }

      applyConditionalFormatting(regSheet, recSheet);
      return responseJSON({ success: true, message: 'Payment recorded' });
    }

    return responseJSON({ error: 'Action not handled' });
  } catch (err) {
    return responseJSON({ error: err.message });
  }
}`;

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  sheetsStatus,
  onClose,
  onRefresh,
  currentYear,
}) => {
  const [activeTab, setActiveTab] = useState<'appscript' | 'serviceaccount'>('appscript');
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestNow = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testGoogleConnection({
        spreadsheetId: sheetsStatus?.spreadsheetId || '',
        appsScriptUrl: sheetsStatus?.appsScriptUrl || '',
      });
      setTestResult(res);
      onRefresh();
    } catch (e: any) {
      setTestResult({ connected: false, message: e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      await triggerSync(currentYear);
      onRefresh();
    } catch (e: any) {
      alert(`Sync failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const isConnected = sheetsStatus?.connected;
  const appsScriptUrl = sheetsStatus?.appsScriptUrl;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 transform transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Google Sheets Setup &amp; Synchronization
              </h3>
              <p className="text-xs text-slate-500">
                Auto-create and manage sheets via Google Apps Script Web App
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 mt-4 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('appscript')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'appscript'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-4 h-4 text-emerald-600" />
            <span>Google Apps Script (Web App Configured)</span>
          </button>
          <button
            onClick={() => setActiveTab('serviceaccount')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'serviceaccount'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Google Cloud Service Account</span>
          </button>
        </div>

        {/* Tab 1: Google Apps Script */}
        {activeTab === 'appscript' && (
          <div className="mt-4 space-y-3.5 text-xs">
            {/* Live Web App Status Box */}
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                isConnected
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
              }`}
            >
              {isConnected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">
                    {isConnected
                      ? 'Apps Script Web App Connected'
                      : 'Deployment Update Required'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleForceSync}
                      disabled={syncing}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[11px] shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button
                      onClick={handleTestNow}
                      disabled={testing}
                      className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-lg text-[11px] shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
                      {testing ? 'Testing...' : 'Test Now'}
                    </button>
                  </div>
                </div>

                <p className="mt-1 text-[11.5px] leading-relaxed">
                  {sheetsStatus?.message ||
                    'Web App URL is configured in server environment.'}
                </p>

                {appsScriptUrl && (
                  <div className="mt-2 font-mono text-[10.5px] break-all bg-white/70 p-1.5 rounded border border-slate-200/60 text-slate-700">
                    {appsScriptUrl}
                  </div>
                )}
              </div>
            </div>

            {/* Quick 2-Step Fix Instructions */}
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-amber-950 space-y-1.5">
              <span className="font-bold text-xs flex items-center gap-1.5 text-amber-900">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                Why members did not appear &amp; How to fix in 30 seconds:
              </span>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                The deployed Web App was missing the <code>addMember</code> &amp; <code>syncAll</code> handlers. Updating takes 3 quick steps:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-950 leading-relaxed pl-1 font-medium">
                <li>
                  Click <strong>Copy Script</strong> below and replace everything in your Apps Script <strong>Code.gs</strong> (Save Ctrl+S).
                </li>
                <li>
                  Click <strong>Deploy &gt; Manage deployments</strong> &gt; click the <strong>Pencil ✏️ (Edit)</strong> icon &gt; under Version choose <strong>New version</strong> &gt; click <strong>Deploy</strong>.
                </li>
                <li>
                  Click <strong>Sync Now</strong> above. All existing members and payment records will be immediately written to your Google Sheet!
                </li>
              </ol>
            </div>

            {/* Code Box */}
            <div className="relative">
              <div className="flex items-center justify-between bg-slate-900 text-slate-300 px-3.5 py-2 rounded-t-xl text-[11px] font-mono">
                <span>google-apps-script/Code.gs (Full Production Script)</span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10.5px] font-bold transition-all cursor-pointer shadow-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" /> Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Script
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 bg-slate-950 text-emerald-300 font-mono text-[10.5px] rounded-b-xl overflow-x-auto max-h-48 leading-relaxed">
                {APPS_SCRIPT_SNIPPET}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 2: Service Account */}
        {activeTab === 'serviceaccount' && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700 block mb-1">
                Alternative: Google Cloud Service Account API v4
              </span>
              <p className="text-slate-600 text-[11.5px] leading-relaxed">
                If you prefer Google Cloud IAM service account authentication, configure your service account email and private key in <code className="bg-white px-1 py-0.5 rounded font-mono text-slate-800 border">server/.env</code>.
              </p>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
