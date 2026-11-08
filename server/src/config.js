import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory or root directory
const serverEnvPath = path.resolve(__dirname, '../.env');
const rootEnvPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

export const CONFIG = {
  PORT: process.env.PORT || 5000,
  SPREADSHEET_ID: process.env.GOOGLE_SPREADSHEET_ID || '',
  APPS_SCRIPT_URL: process.env.GOOGLE_APPS_SCRIPT_URL || '',
  SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  // Clean up private key if formatted with escaped newlines
  PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY
    ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : '',
  CREDENTIALS_FILE: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  DATA_DIR: process.env.VERCEL ? '/tmp/data' : path.resolve(__dirname, '../data'),
  DB_FILE: process.env.VERCEL ? '/tmp/data/db.json' : path.resolve(__dirname, '../data/db.json'),
};
