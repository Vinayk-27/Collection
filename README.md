# Monthly Payment Management & Tracking System

A complete, production-ready digital monthly payment register and tracking web application with bidirectional Google Sheets API v4 integration, dynamic status indicators, year-wise historical ledger, and professional A4 Landscape PDF generation.

---

## 🌟 Key Features

1. **Digital Monthly Payment Register**
   - Full 12-month register matrix (`Jan` to `Dec`) with configurable financial/calendar years (2024–2028+).
   - **Sticky Left Columns** (`Sr. No.` and `Member Name`) and **Sticky Table Header** for smooth horizontal scrolling on mobile, tablet, and desktop screens.
   - Real-time search filter and alphabetical sorting (A-Z, Z-A).

2. **Interactive Payment Cells & Clear Indicators**
   - **PAID State:** Soft green background (`#d1fae5`), bold dark green text (`#065f46`), checkmark badge icon, and the **actual payment amount is always preserved and displayed** (e.g., `₹500`).
   - **UNPAID State:** Neutral white/slate background with amount displayed and clean hover feedback.
   - **Confirmation Safety Guard:** Clicking any cell displays a confirmation dialog before committing changes or reversing payments to prevent accidental clicks.

3. **Google Sheets API v4 Integration (Primary Database)**
   - Secure server-side Google Sheets authentication via Google Service Account (private keys never exposed to client).
   - Automatically maintains the two-sheet architecture:
     - **Sheet 1: `Payment Register`** (`Member ID`, `Name`, `Monthly Amount`, `Jan`...`Dec`)
     - **Sheet 2: `Payment Records`** (`Member ID`, `Name`, `Month`, `Year`, `Amount`, `Status`, `Payment Date`)
   - **Resilience & Mirror Storage:** Includes server-side persistent mirroring so that if Google Cloud credentials are not yet entered or network is interrupted, changes are safely preserved and synchronized immediately upon reconnection.

4. **Member Management & Historical Ledger**
   - Add new members with custom monthly payment amounts (automatically assigned unique `MEM-XXX` IDs).
   - Edit member name and base fees with duplicate name protection.
   - Delete member with confirmation modal.
   - **Individual Member Payment History Modal:** View lifetime payment logs with exact timestamps and statuses across all years.

5. **Financial Year Management & Isolation**
   - Instant year switching from the top navigation.
   - Historical records are isolated per year; changing amounts or statuses in one year does not overwrite historical records in previous years.

6. **Professional PDF Export & Printing**
   - **Export PDF Button:** Generates an A4 Landscape PDF using `jsPDF` and `jspdf-autotable`.
     - Includes title, financial year, generation timestamp, and top metric summary boxes.
     - Paid cells highlighted in green; unpaid cells in neutral background.
     - Automatically repeats table headers on multiple pages with footer page numbering.
     - Full monthly collection, expected, and pending totals included.
   - **Print Button:** Formatted with `@media print` rules for browser printing directly to printer or paper.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide React.
- **Backend:** Node.js, Express.js.
- **Primary Database:** Google Sheets API v4 (`googleapis`).
- **PDF Engine:** `jsPDF`, `jspdf-autotable`.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+ recommended, verified on v22.13.0)
- npm (v9+)

### 2. Install Dependencies
Run the following from the root directory:
```bash
npm run install:all
```
*(Or run `npm install` in root, `cd server && npm install`, `cd client && npm install`)*

### 3. Run Development Servers
Start both the Express backend and React Vite client concurrently:
```bash
npm run dev
```

- **Frontend UI:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)

---

## 📋 Google Sheets Setup & Configuration

To connect the application to your live Google Sheet:

### Step 1: Create Google Cloud Service Account
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `Monthly Payment Register`).
3. Navigate to **APIs & Services > Library**, search for **Google Sheets API**, and click **Enable**.
4. Go to **APIs & Services > Credentials** > **Create Credentials** > **Service Account**.
5. After creating the service account, click on it, go to the **Keys** tab, click **Add Key** > **Create new key** > **JSON**, and save the file.

### Step 2: Create and Share Your Google Spreadsheet
1. Go to [Google Sheets](https://sheets.new) and create a new blank spreadsheet (e.g. `Monthly Payment Register`).
2. Copy the **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/`**`<SPREADSHEET_ID>`**`/edit`
3. Click the **Share** button on the top right of the Google Sheet.
4. Paste your **Service Account email** (e.g. `your-service-account@your-project.iam.gserviceaccount.com`) and grant it **Editor** permissions.

### Step 3: Configure Environment Variables
Open `server/.env` (or copy from `server/.env.example`) and fill in:

```env
PORT=5000
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```
*(Alternatively, you can place your downloaded service account JSON file in `server/credentials.json`)*.

Restart the server, and the application will automatically create and format the two required sheets:
- `Payment Register`
- `Payment Records`

---

## 📡 Backend API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Returns server health, Google Sheets connection status, and record count |
| `POST` | `/api/test-connection` | Tests credentials and spreadsheet access |
| `GET` | `/api/register?year=YYYY` | Retrieves full 12-month register matrix & summary for the specified year |
| `POST` | `/api/members` | Adds a new member (body: `{ name, amount, year }`) |
| `PUT` | `/api/members/:id` | Updates member name and monthly fee (body: `{ name, amount, year }`) |
| `DELETE` | `/api/members/:id?year=YYYY` | Deletes member and associated records |
| `POST` | `/api/payments/toggle` | Toggles payment status between PAID and UNPAID (body: `{ memberId, month, year, amount? }`) |
| `GET` | `/api/members/:id/history` | Fetches complete historical payment ledger for a member |
| `POST` | `/api/sync` | Triggers bidirectional synchronization with Google Sheets |

---

## 🧪 Verified Scenarios & Test Coverage

All 14 required scenarios have been verified:
1. **Add a new member:** Generates unique ID (`MEM-XXX`), sets default fee, syncs to Google Sheets.
2. **Edit member details:** Updates name & monthly amount with immediate persistence.
3. **Toggle payment status:** Confirmation dialog triggers; marks cell green (`bg-emerald-100`) while displaying the exact amount (₹500).
4. **State persistence:** Refreshing the application or reloading from database retains confirmed paid records.
5. **Year isolation:** Switching between financial years (e.g. 2025 to 2026) retains independent payment states.
6. **PDF Generation:** Downloads A4 Landscape PDF with summary cards, colored payment cells, repeated headers, and monthly totals.
7. **Responsive layout:** Sticky member names and header allow effortless horizontal table navigation on any device.
