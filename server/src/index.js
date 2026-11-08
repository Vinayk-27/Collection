import express from 'express';
import cors from 'cors';
import { CONFIG } from './config.js';
import { storage } from './storage.js';
import { testConnection } from './googleSheets.js';

const app = express();

app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

/**
 * Health check & Google Sheets status
 */
app.get('/api/status', async (req, res) => {
  try {
    const conn = await testConnection();
    res.json({
      serverTime: new Date().toISOString(),
      googleSheets: conn,
      localDbStatus: {
        totalMembers: storage.getMembers().length,
        totalRecords: storage.getRecords().length,
        lastSyncedAt: storage.data.lastSyncedAt,
        syncStatus: storage.data.syncStatus,
        syncError: storage.data.syncError,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Test Google Sheets configuration
 */
app.post('/api/test-connection', async (req, res) => {
  try {
    const { spreadsheetId, serviceAccountEmail, privateKey, appsScriptUrl } = req.body;
    const result = await testConnection({
      spreadsheetId,
      serviceAccountEmail,
      privateKey,
      appsScriptUrl,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Trigger manual sync with Google Sheets
 */
app.post('/api/sync', async (req, res) => {
  try {
    const year = parseInt(req.body.year || new Date().getFullYear(), 10);
    const result = await storage.syncWithGoogleSheets(year);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get Payment Register for a given year
 */
app.get('/api/register', async (req, res) => {
  try {
    const year = parseInt(req.query.year || new Date().getFullYear(), 10);
    const data = storage.getRegisterForYear(year);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Add a new member
 */
app.post('/api/members', async (req, res) => {
  try {
    const { name, amount, year } = req.body;
    const activeYear = parseInt(year || new Date().getFullYear(), 10);
    const newMember = await storage.addMember(name, amount, activeYear);
    res.status(201).json({
      success: true,
      member: newMember,
      message: `Member ${newMember.name} added successfully`,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Update existing member
 */
app.put('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, amount, year } = req.body;
    const activeYear = parseInt(year || new Date().getFullYear(), 10);
    const updated = await storage.updateMember(id, name, amount, activeYear);
    res.json({
      success: true,
      member: updated,
      message: `Member ${updated.name} updated successfully`,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Delete a member
 */
app.delete('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const activeYear = parseInt(req.query.year || new Date().getFullYear(), 10);
    const deleted = await storage.deleteMember(id, activeYear);
    res.json({
      success: true,
      member: deleted,
      message: `Member ${deleted.name} deleted successfully`,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Toggle payment status
 */
app.post('/api/payments/toggle', async (req, res) => {
  try {
    const { memberId, month, year, amount } = req.body;
    if (!memberId || !month || !year) {
      return res.status(400).json({ error: 'memberId, month, and year are required' });
    }

    const record = await storage.togglePayment(memberId, month, year, amount);
    res.json({
      success: true,
      record,
      message: `Payment for ${month} ${year} marked as ${record.status}`,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Individual member payment history
 */
app.get('/api/members/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const data = storage.getMemberHistory(id);
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Export app for Vercel serverless functions
export default app;

// Listen only when running locally (not in Vercel serverless environment)
if (!process.env.VERCEL) {
  const port = CONFIG.PORT;
  app.listen(port, async () => {
    console.log(`Server listening on port ${port}`);
    console.log(`Configured Spreadsheet ID: ${CONFIG.SPREADSHEET_ID || '(none)'}`);
    console.log(`Configured Apps Script URL: ${CONFIG.APPS_SCRIPT_URL || '(none)'}`);
    
    if (CONFIG.APPS_SCRIPT_URL || CONFIG.SPREADSHEET_ID) {
      console.log('Attempting initial Google Sheets sync...');
      const syncRes = await storage.syncWithGoogleSheets(new Date().getFullYear());
      console.log('Google Sheets sync result:', syncRes);
    } else {
      console.log('Starting in local mirrored storage mode. Google Sheets can be configured anytime.');
    }
  });
}
