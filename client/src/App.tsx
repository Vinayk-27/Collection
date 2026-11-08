import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchRegisterData,
  fetchStatus,
  addMember,
  updateMember,
  deleteMember,
  togglePayment,
  triggerSync,
} from './api';
import { RegisterData, RegisterMember, MonthName, GoogleSheetsStatus } from './types';
import { Navbar } from './components/Navbar';
import { SummaryCards } from './components/SummaryCards';
import { PaymentRegisterTable } from './components/PaymentRegisterTable';
import { ConfirmationModal } from './components/ConfirmationModal';
import { MemberModal } from './components/MemberModal';
import { MemberHistoryModal } from './components/MemberHistoryModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { exportRegisterToPDF } from './utils/pdfGenerator';
import { AlertCircle, CheckCircle, Info, RefreshCw, X } from 'lucide-react';

const AVAILABLE_YEARS = [2024, 2025, 2026, 2027, 2028];

export const App: React.FC = () => {
  const currentCalendarYear = new Date().getFullYear();
  const [currentYear, setCurrentYear] = useState<number>(
    AVAILABLE_YEARS.includes(currentCalendarYear) ? currentCalendarYear : 2026
  );

  const [registerData, setRegisterData] = useState<RegisterData | null>(null);
  const [sheetsStatus, setSheetsStatus] = useState<GoogleSheetsStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    id: number;
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Modals state
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);
  const [memberModalConfig, setMemberModalConfig] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    member: RegisterMember | null;
  }>({
    isOpen: false,
    mode: 'add',
    member: null,
  });

  const [historyModalMemberId, setHistoryModalMemberId] = useState<string | null>(null);

  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'emerald' | 'amber' | 'rose' | 'slate';
    onConfirm: () => void;
    details?: any;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setNotification({ id: Date.now(), type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // Load register data
  const loadData = useCallback(async (year: number, isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await fetchRegisterData(year);
      setRegisterData(data);
    } catch (err: any) {
      showNotification(err.message || 'Failed to load register data', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Load Google Sheets connection status
  const loadSheetsStatus = useCallback(async () => {
    try {
      const statusRes = await fetchStatus();
      setSheetsStatus(statusRes.googleSheets);
    } catch (e) {
      console.warn('Could not fetch server status:', e);
    }
  }, []);

  useEffect(() => {
    loadData(currentYear);
    loadSheetsStatus();
  }, [currentYear, loadData, loadSheetsStatus]);

  // Handle cell click (Toggle payment confirmation)
  const handleCellClick = (member: RegisterMember, month: MonthName) => {
    const currentCell = member.months[month];
    const isPaid = currentCell.status === 'PAID';

    if (isPaid) {
      setConfirmModalConfig({
        isOpen: true,
        title: 'Reverse Payment Status?',
        message: `Are you sure you want to reverse the payment for ${month} ${currentYear}? This will mark the record as UNPAID and update Google Sheets immediately.`,
        confirmLabel: 'Yes, Mark UNPAID',
        confirmVariant: 'amber',
        details: {
          memberName: member.name,
          month,
          year: currentYear,
          amount: currentCell.amount,
          currentStatus: 'PAID',
        },
        onConfirm: async () => {
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
          try {
            await togglePayment(member.id, month, currentYear);
            showNotification(
              `Payment for ${member.name} (${month} ${currentYear}) reversed to UNPAID.`,
              'info'
            );
            await loadData(currentYear, true);
          } catch (err: any) {
            showNotification(err.message || 'Failed to update payment status', 'error');
          }
        },
      });
    } else {
      setConfirmModalConfig({
        isOpen: true,
        title: 'Confirm Payment Received',
        message: `Confirm that payment of ₹${currentCell.amount} has been received for ${month} ${currentYear}. The cell will turn green and synchronize with Google Sheets.`,
        confirmLabel: 'Confirm PAID',
        confirmVariant: 'emerald',
        details: {
          memberName: member.name,
          month,
          year: currentYear,
          amount: currentCell.amount,
          currentStatus: 'UNPAID',
        },
        onConfirm: async () => {
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
          try {
            await togglePayment(member.id, month, currentYear);
            showNotification(
              `Payment of ₹${currentCell.amount} for ${member.name} (${month} ${currentYear}) marked as PAID!`,
              'success'
            );
            await loadData(currentYear, true);
          } catch (err: any) {
            showNotification(err.message || 'Failed to record payment', 'error');
          }
        },
      });
    }
  };

  // Add / Edit Member Save
  const handleSaveMember = async (name: string, amount: number) => {
    if (memberModalConfig.mode === 'add') {
      const res = await addMember(name, amount, currentYear);
      showNotification(`Added new member: ${name} (₹${amount}/month)`, 'success');
    } else if (memberModalConfig.member) {
      const res = await updateMember(
        memberModalConfig.member.id,
        name,
        amount,
        currentYear
      );
      showNotification(`Updated member details for ${name}`, 'success');
    }
    await loadData(currentYear, true);
  };

  // Delete Member Confirmation
  const handleDeleteMember = (member: RegisterMember) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Member Record?',
      message: `Are you sure you want to delete ${member.name}? All payment records associated with this member will be permanently removed from Google Sheets and the register.`,
      confirmLabel: 'Delete Member',
      confirmVariant: 'rose',
      details: {
        memberName: member.name,
      },
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteMember(member.id, currentYear);
          showNotification(`Member ${member.name} deleted successfully.`, 'info');
          await loadData(currentYear, true);
        } catch (err: any) {
          showNotification(err.message || 'Failed to delete member', 'error');
        }
      },
    });
  };

  // Manual Trigger Sync
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await triggerSync(currentYear);
      showNotification(res.message || 'Synchronized with Google Sheets', 'success');
      await loadData(currentYear, true);
      await loadSheetsStatus();
    } catch (e: any) {
      showNotification(`Sync failed: ${e.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    if (!registerData) return;
    try {
      exportRegisterToPDF(registerData, currentYear);
      showNotification(`PDF for Year ${currentYear} generated and downloaded!`, 'success');
    } catch (e: any) {
      showNotification(`PDF export error: ${e.message}`, 'error');
    }
  };

  // Print Dialog
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800">
      {/* Top Navbar */}
      <Navbar
        currentYear={currentYear}
        availableYears={AVAILABLE_YEARS}
        onYearChange={(year) => setCurrentYear(year)}
        sheetsStatus={sheetsStatus}
        onOpenSheetsModal={() => setSheetsModalOpen(true)}
        onExportPDF={handleExportPDF}
        onPrint={handlePrint}
        isSyncing={isSyncing}
        onManualSync={handleManualSync}
      />

      {/* Print-Only Header Banner */}
      <div className="hidden print-only mb-4 p-4 border-b border-slate-300">
        <h1 className="text-2xl font-bold text-slate-900">
          MONTHLY PAYMENT REGISTER
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Financial / Calendar Year: {currentYear} | Date:{' '}
          {new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}
        </p>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Floating Notification Toast */}
        {notification && (
          <div
            className={`fixed bottom-5 right-5 z-50 max-w-md p-4 rounded-2xl shadow-xl border flex items-center justify-between gap-3 transform transition-all animate-in slide-in-from-bottom-5 duration-200 ${
              notification.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : notification.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : (
                <Info className="w-5 h-5 text-blue-400 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-white/60 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && !registerData ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-500">
              Loading payment register &amp; synchronizing Google Sheets...
            </p>
          </div>
        ) : registerData ? (
          <>
            {/* Dashboard Summary Cards */}
            <section className="no-print">
              <SummaryCards summary={registerData.summary} />
            </section>

            {/* Monthly Payment Register Table */}
            <section>
              <PaymentRegisterTable
                members={registerData.members}
                monthlyBreakdown={registerData.summary.monthlyBreakdown}
                currentYear={currentYear}
                onCellClick={handleCellClick}
                onAddMember={() =>
                  setMemberModalConfig({
                    isOpen: true,
                    mode: 'add',
                    member: null,
                  })
                }
                onEditMember={(m) =>
                  setMemberModalConfig({
                    isOpen: true,
                    mode: 'edit',
                    member: m,
                  })
                }
                onDeleteMember={handleDeleteMember}
                onViewHistory={(m) => setHistoryModalMemberId(m.id)}
              />
            </section>
          </>
        ) : null}
      </main>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmLabel={confirmModalConfig.confirmLabel}
        confirmVariant={confirmModalConfig.confirmVariant}
        details={confirmModalConfig.details}
        onConfirm={confirmModalConfig.onConfirm}
        onCancel={() =>
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))
        }
      />

      {/* Add / Edit Member Modal */}
      <MemberModal
        isOpen={memberModalConfig.isOpen}
        mode={memberModalConfig.mode}
        member={memberModalConfig.member}
        existingNames={registerData?.members.map((m) => m.name) || []}
        onSave={handleSaveMember}
        onClose={() =>
          setMemberModalConfig((prev) => ({ ...prev, isOpen: false }))
        }
      />

      {/* Member History Modal */}
      <MemberHistoryModal
        isOpen={!!historyModalMemberId}
        memberId={historyModalMemberId}
        onClose={() => setHistoryModalMemberId(null)}
      />

      {/* Google Sheets Connection Modal */}
      <GoogleSheetsModal
        isOpen={sheetsModalOpen}
        sheetsStatus={sheetsStatus}
        onClose={() => setSheetsModalOpen(false)}
        onRefresh={() => {
          loadSheetsStatus();
          loadData(currentYear, true);
        }}
        currentYear={currentYear}
      />
    </div>
  );
};
