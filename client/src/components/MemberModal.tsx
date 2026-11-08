import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, X, IndianRupee } from 'lucide-react';
import { RegisterMember } from '../types';

interface MemberModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  member?: RegisterMember | null;
  existingNames: string[];
  onSave: (name: string, amount: number) => Promise<void>;
  onClose: () => void;
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  mode,
  member,
  existingNames,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('500');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member && mode === 'edit') {
      setName(member.name);
      setAmount(member.monthlyAmount.toString());
    } else {
      setName('');
      setAmount('500');
    }
    setError(null);
  }, [member, mode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Member name is required.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setError('Please enter a valid monthly amount (0 or positive).');
      return;
    }

    // Check duplicate name
    const isDuplicate = existingNames.some(
      (n) =>
        n.toLowerCase() === cleanName.toLowerCase() &&
        (mode === 'add' || n.toLowerCase() !== member?.name.toLowerCase())
    );

    if (isDuplicate) {
      setError(`A member with the name "${cleanName}" already exists.`);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await onSave(cleanName, numAmount);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 transform transition-all">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              {mode === 'add' ? (
                <UserPlus className="w-5 h-5" />
              ) : (
                <UserCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {mode === 'add' ? 'Add New Member' : 'Edit Member Details'}
              </h3>
              <p className="text-xs text-slate-500">
                {mode === 'add'
                  ? 'Create member and sync to Google Sheets register'
                  : `Update info for ${member?.name}`}
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Member Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-800 placeholder-slate-400"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Default Monthly Payment Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="50"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-800 font-semibold"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Assigned monthly fee for upcoming months in the register.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving...' : mode === 'add' ? 'Add Member' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
