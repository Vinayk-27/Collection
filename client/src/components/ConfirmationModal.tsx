import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'emerald' | 'amber' | 'rose' | 'slate';
  onConfirm: () => void;
  onCancel: () => void;
  details?: {
    memberName?: string;
    month?: string;
    year?: number;
    amount?: number;
    currentStatus?: 'PAID' | 'UNPAID';
  };
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'emerald',
  onConfirm,
  onCancel,
  details,
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
    amber: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
    rose: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500',
    slate: 'bg-slate-800 hover:bg-slate-900 text-white focus:ring-slate-500',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 transform transition-all animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                confirmVariant === 'rose'
                  ? 'bg-rose-100 text-rose-600'
                  : confirmVariant === 'amber'
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {confirmVariant === 'rose' ? (
                <AlertCircle className="w-5 h-5" />
              ) : confirmVariant === 'amber' ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-600 leading-relaxed">{message}</p>

        {details && (
          <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
            {details.memberName && (
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Member:</span>
                <span className="text-slate-800 font-semibold">{details.memberName}</span>
              </div>
            )}
            {details.month && details.year && (
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Period:</span>
                <span className="text-slate-800 font-semibold">{details.month} {details.year}</span>
              </div>
            )}
            {details.amount !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Amount:</span>
                <span className="text-slate-800 font-bold text-sm text-emerald-700">₹{details.amount}</span>
              </div>
            )}
            {details.currentStatus && (
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Action:</span>
                <span className={`font-bold uppercase text-[11px] px-2 py-0.5 rounded-full ${
                  details.currentStatus === 'PAID'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {details.currentStatus === 'PAID' ? 'Mark as UNPAID' : 'Mark as PAID'}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer ${variantStyles[confirmVariant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
