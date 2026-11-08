import React, { useEffect, useState } from 'react';
import { History, X, CheckCircle2, Clock, Calendar, IndianRupee } from 'lucide-react';
import { fetchMemberHistory } from '../api';
import { PaymentRecord } from '../types';

interface MemberHistoryModalProps {
  isOpen: boolean;
  memberId: string | null;
  onClose: () => void;
}

export const MemberHistoryModal: React.FC<MemberHistoryModalProps> = ({
  isOpen,
  memberId,
  onClose,
}) => {
  const [data, setData] = useState<{
    member: { id: string; name: string; amount: number };
    history: PaymentRecord[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !memberId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    fetchMemberHistory(memberId)
      .then((res) => setData(res))
      .catch((err) => setError(err.message || 'Failed to load history'))
      .finally(() => setLoading(false));
  }, [isOpen, memberId]);

  if (!isOpen) return null;

  const paidRecords = data?.history.filter((h) => h.status === 'PAID') || [];
  const totalPaid = paidRecords.reduce((sum, h) => sum + h.amount, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 transform transition-all">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Payment History
              </h3>
              <p className="text-xs text-slate-500">
                {data?.member.name ? `${data.member.name} (${data.member.id})` : 'Loading member...'}
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

        {/* Member Quick Summary */}
        {data && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                Default Monthly Fee
              </span>
              <p className="text-lg font-bold text-slate-800 mt-0.5">
                ₹{data.member.amount}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[11px] text-emerald-600 uppercase font-semibold">
                Lifetime Paid Sum
              </span>
              <p className="text-lg font-bold text-emerald-800 mt-0.5">
                ₹{totalPaid.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        )}

        {/* History List */}
        <div className="mt-5">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Payment Log ({data?.history.length || 0} recorded entries)
          </h4>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Fetching recorded transactions from database...
            </div>
          ) : error ? (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl">
              {error}
            </div>
          ) : data?.history.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
              No historical payment entries recorded yet.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {data?.history.map((record) => {
                const isPaid = record.status === 'PAID';
                return (
                  <div
                    key={record.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                      isPaid
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isPaid ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">
                          {record.month} {record.year}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {record.paymentDate
                            ? `Paid on: ${record.paymentDate}`
                            : 'Status: Unpaid'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`font-bold text-sm ${
                          isPaid ? 'text-emerald-700' : 'text-slate-600'
                        }`}
                      >
                        ₹{record.amount}
                      </div>
                      <span
                        className={`inline-block text-[10px] uppercase font-bold px-1.5 py-0.2 rounded-md ${
                          isPaid
                            ? 'bg-emerald-200/70 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
