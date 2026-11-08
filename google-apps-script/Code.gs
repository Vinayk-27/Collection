/**
 * Monthly Payment Register - Google Apps Script (Production Ready)
 * 
 * Features:
 * - Creates & formats Sheet 1 ("Payment Register") with Jan-Dec matrix
 * - Creates & formats Sheet 2 ("Payment Records") with transaction logs
 * - Full Web App API handlers: addMember, updateMember, deleteMember, togglePayment, syncAll, getRegister
 * - Auto-formatting: Frozen header row & member columns, custom widths, and Emerald Green conditional formatting for PAID cells.
 */

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Creates custom menu in Google Sheets UI
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('📋 Payment Register')
      .addItem('🚀 Setup / Reformat All Sheets', 'setupSheets')
      .addItem('📊 Calculate Annual Totals', 'calculateTotals')
      .addItem('✨ Add Sample Members', 'addSampleData')
      .addToUi();
  } catch (e) {
    Logger.log('onOpen error: ' + e.message);
  }
}

function showAlert(title, message) {
  try {
    SpreadsheetApp.getUi().alert(title, message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(title + ': ' + message);
  }
}

/**
 * Helper to format headers
 */
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

/**
 * Ensures both sheets exist with proper headers and widths
 */
function ensureSetup(ss) {
  // 1. Payment Register
  let regSheet = ss.getSheetByName('Payment Register');
  if (!regSheet) {
    regSheet = ss.insertSheet('Payment Register');
  }
  const regHeaders = ['Member ID', 'Name', 'Monthly Amount', ...MONTHS];
  if (regSheet.getLastRow() === 0) {
    regSheet.getRange(1, 1, 1, regHeaders.length).setValues([regHeaders]);
  }
  formatHeader(regSheet, regHeaders.length, '#0f172a');
  regSheet.setFrozenColumns(2);
  regSheet.setColumnWidth(1, 95);  // Member ID
  regSheet.setColumnWidth(2, 180); // Name
  regSheet.setColumnWidth(3, 110); // Monthly Amount
  for (let c = 4; c <= 15; c++) regSheet.setColumnWidth(c, 85);

  // 2. Payment Records
  let recSheet = ss.getSheetByName('Payment Records');
  if (!recSheet) {
    recSheet = ss.insertSheet('Payment Records');
  }
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

/**
 * Manual setup function callable from Apps Script or custom menu
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSetup(ss);
  showAlert('Setup Complete!', 'Both "Payment Register" and "Payment Records" sheets have been created and formatted with headers, frozen panes, and color highlights.');
}

/**
 * Applies green conditional formatting rules to both sheets
 */
function applyConditionalFormatting(regSheet, recSheet) {
  if (!regSheet || !recSheet) return;
  regSheet.clearConditionalFormatRules();
  recSheet.clearConditionalFormatRules();

  // Rule: Highlight PAID cells in green for Register
  const regRange = regSheet.getRange('D2:O500');
  const regPaidRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('PAID')
    .setBackground('#d1fae5')
    .setFontColor('#065f46')
    .setBold(true)
    .setRanges([regRange])
    .build();
  regSheet.setConditionalFormatRules([regPaidRule]);

  // Rule: Payment Records status
  const recStatusRange = recSheet.getRange('F2:F2000');
  const recPaidRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('PAID')
    .setBackground('#d1fae5')
    .setFontColor('#065f46')
    .setBold(true)
    .setRanges([recStatusRange])
    .build();

  const recUnpaidRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('UNPAID')
    .setBackground('#ffedd5')
    .setFontColor('#9a3412')
    .setBold(true)
    .setRanges([recStatusRange])
    .build();

  recSheet.setConditionalFormatRules([recPaidRule, recUnpaidRule]);
}

/**
 * Helper to return standard JSON response
 */
function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Web App GET handler
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'status';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'status') {
      return responseJSON({
        status: 'OK',
        title: ss.getName(),
        sheets: ss.getSheets().map(function(s) { return s.getName(); })
      });
    }

    if (action === 'getRegister') {
      const sheets = ensureSetup(ss);
      const regSheet = sheets.regSheet;
      const recSheet = sheets.recSheet;

      const regValues = regSheet.getDataRange().getValues();
      const recValues = recSheet.getDataRange().getValues();

      const members = [];
      for (let i = 1; i < regValues.length; i++) {
        if (regValues[i][1] && String(regValues[i][1]).trim() !== '') {
          members.push({
            id: String(regValues[i][0]).trim(),
            name: String(regValues[i][1]).trim(),
            amount: parseFloat(regValues[i][2]) || 0
          });
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

      return responseJSON({
        success: true,
        year: parseInt((e.parameter && e.parameter.year) || new Date().getFullYear(), 10),
        members: members,
        records: records
      });
    }

    return responseJSON({ error: 'Unknown action: ' + action });
  } catch (err) {
    return responseJSON({ error: err.message });
  }
}

/**
 * Web App POST handler (Mutations from Web Application)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ error: 'No POST body provided' });
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ensureSetup(ss);
    const regSheet = sheets.regSheet;
    const recSheet = sheets.recSheet;

    // 1. Add Member
    if (action === 'addMember') {
      const id = payload.id;
      const name = payload.name;
      const amount = parseFloat(payload.amount) || 0;

      // Add to Sheet 1: Payment Register
      const newRow = [id, name, amount];
      for (let i = 0; i < 12; i++) {
        newRow.push('₹' + amount);
      }
      regSheet.appendRow(newRow);

      return responseJSON({
        success: true,
        message: 'Member ' + name + ' added to Payment Register sheet'
      });
    }

    // 2. Update Member
    if (action === 'updateMember') {
      const id = payload.id;
      const name = payload.name;
      const amount = parseFloat(payload.amount) || 0;

      const regData = regSheet.getDataRange().getValues();
      for (let i = 1; i < regData.length; i++) {
        if (regData[i][0] == id) {
          regSheet.getRange(i + 1, 2).setValue(name);
          regSheet.getRange(i + 1, 3).setValue(amount);
          break;
        }
      }

      const recData = recSheet.getDataRange().getValues();
      for (let j = 1; j < recData.length; j++) {
        if (recData[j][0] == id) {
          recSheet.getRange(j + 1, 2).setValue(name);
        }
      }

      return responseJSON({ success: true, message: 'Member updated in sheets' });
    }

    // 3. Delete Member
    if (action === 'deleteMember') {
      const id = payload.id;

      const regData = regSheet.getDataRange().getValues();
      for (let i = regData.length - 1; i >= 1; i--) {
        if (regData[i][0] == id) {
          regSheet.deleteRow(i + 1);
        }
      }

      const recData = recSheet.getDataRange().getValues();
      for (let j = recData.length - 1; j >= 1; j--) {
        if (recData[j][0] == id) {
          recSheet.deleteRow(j + 1);
        }
      }

      return responseJSON({ success: true, message: 'Member deleted from sheets' });
    }

    // 4. Toggle Payment Status
    if (action === 'togglePayment') {
      const memberId = payload.memberId;
      const name = payload.name;
      const month = payload.month;
      const year = parseInt(payload.year, 10);
      const amount = parseFloat(payload.amount) || 0;
      const status = payload.status;
      const paymentDate = payload.paymentDate || '';

      // Update Sheet 2: Payment Records
      const recData = recSheet.getDataRange().getValues();
      let foundRow = -1;
      for (let i = 1; i < recData.length; i++) {
        if (recData[i][0] == memberId && recData[i][2] == month && recData[i][3] == year) {
          foundRow = i + 1;
          break;
        }
      }

      if (foundRow > 0) {
        recSheet.getRange(foundRow, 6).setValue(status);
        recSheet.getRange(foundRow, 7).setValue(paymentDate);
        recSheet.getRange(foundRow, 5).setValue(amount);
      } else {
        recSheet.appendRow([memberId, name, month, year, amount, status, paymentDate]);
      }

      // Update Sheet 1: Payment Register cell for the month
      const monthIdx = MONTHS.indexOf(month);
      if (monthIdx !== -1) {
        const colNumber = monthIdx + 4; // Col D is Jan (col 4)
        const regData = regSheet.getDataRange().getValues();
        for (let r = 1; r < regData.length; r++) {
          if (regData[r][0] == memberId) {
            if (status === 'PAID') {
              regSheet.getRange(r + 1, colNumber).setValue('₹' + amount + ' [PAID]');
            } else {
              regSheet.getRange(r + 1, colNumber).setValue('₹' + amount);
            }
            break;
          }
        }
      }

      applyConditionalFormatting(regSheet, recSheet);
      return responseJSON({ success: true, message: 'Payment recorded in sheets' });
    }

    // 5. Full Sync All (Synchronize complete matrix and records)
    if (action === 'syncAll') {
      const members = payload.members || [];
      const records = payload.records || [];
      const activeYear = parseInt(payload.year, 10) || new Date().getFullYear();

      // Clear and rewrite Sheet 1: Payment Register
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
            const rec = records.find(function(r) {
              return r.memberId === m.id && r.month === mon && r.year === activeYear;
            });
            if (rec && rec.status === 'PAID') {
              row.push('₹' + rec.amount + ' [PAID]');
            } else {
              row.push('₹' + m.amount);
            }
          });
          return row;
        });
        regSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      }

      // Clear and rewrite Sheet 2: Payment Records
      recSheet.clear();
      const recHeaders = ['Member ID', 'Name', 'Month', 'Year', 'Amount', 'Status', 'Payment Date'];
      recSheet.getRange(1, 1, 1, recHeaders.length).setValues([recHeaders]);
      formatHeader(recSheet, recHeaders.length, '#1e1b4b');
      recSheet.setColumnWidth(1, 95);
      recSheet.setColumnWidth(2, 180);
      recSheet.setColumnWidth(3, 80);
      recSheet.setColumnWidth(4, 75);
      recSheet.setColumnWidth(5, 90);
      recSheet.setColumnWidth(6, 95);
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

    return responseJSON({ error: 'Action not handled: ' + action });
  } catch (err) {
    return responseJSON({ error: err.message });
  }
}
