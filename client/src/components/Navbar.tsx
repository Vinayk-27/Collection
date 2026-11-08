import React from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Sliders,
} from 'lucide-react';
import { GoogleSheetsStatus } from '../types';

interface NavbarProps {
  currentYear: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
  sheetsStatus: GoogleSheetsStatus | null;
  onOpenSheetsModal: () => void;
  onExportPDF: () => void;
  onPrint: () => void;
  isSyncing: boolean;
  onManualSync: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentYear,
  availableYears,
  onYearChange,
  sheetsStatus,
  onOpenSheetsModal,
  onExportPDF,
  onPrint,
  isSyncing,
  onManualSync,
}) => {
  const isConnected = sheetsStatus?.connected;
  const isConfigured = sheetsStatus?.configured;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-3">
          {/* Logo & Application Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  Monthly Payment Register
                </h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Live Register
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Digital Payment Tracking &amp; Google Sheets Synchronization
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Financial Year Selector */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 shadow-sm text-sm">
              <Calendar className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
              <label htmlFor="year-select" className="text-xs text-slate-400 mr-1.5 hidden md:inline">
                Financial Year:
              </label>
              <select
                id="year-select"
                value={currentYear}
                onChange={(e) => onYearChange(parseInt(e.target.value, 10))}
                className="bg-transparent font-semibold text-white focus:outline-none cursor-pointer text-sm"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr} className="bg-slate-800 text-white">
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Google Sheets Connection Status Button */}
            <button
              onClick={onOpenSheetsModal}
              title="Click to view Google Sheets Integration & Setup"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isConnected
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50'
                  : isConfigured
                  ? 'bg-amber-950/40 text-amber-300 border-amber-800 hover:bg-amber-900/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700/60'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected
                      ? 'bg-emerald-500'
                      : isConfigured
                      ? 'bg-amber-500'
                      : 'bg-slate-500'
                  }`}
                ></span>
              </span>

              <span className="hidden sm:inline">
                {isConnected
                  ? 'Google Sheets: Connected'
                  : isConfigured
                  ? 'Sheets: Attention Needed'
                  : 'Sheets: Setup Required'}
              </span>
              <span className="sm:hidden">
                {isConnected ? 'Sheets OK' : 'Sheets'}
              </span>
              <Sliders className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {/* Manual Sync Button */}
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              title="Sync with Google Sheets"
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {/* Print Button */}
            <button
              onClick={onPrint}
              title="Print Register"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Print</span>
            </button>

            {/* Export PDF Button */}
            <button
              onClick={onExportPDF}
              title="Download full register as PDF (A4 Landscape with colours)"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-900/30 transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
