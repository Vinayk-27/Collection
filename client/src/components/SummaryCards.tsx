import React from 'react';
import { Users, IndianRupee, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { RegisterSummary } from '../types';

interface SummaryCardsProps {
  summary: RegisterSummary;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  const {
    totalMembers,
    totalExpectedYear,
    totalCollectedYear,
    totalPendingYear,
    year,
  } = summary;

  const collectionPercent =
    totalExpectedYear > 0
      ? Math.round((totalCollectedYear / totalExpectedYear) * 100)
      : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Members */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Members
            </p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {totalMembers}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Active in {year} register
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Expected Amount */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Expected
            </p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1 flex items-center">
              <span className="text-lg mr-0.5 text-slate-500 font-semibold">₹</span>
              {totalExpectedYear.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Full year annual target
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Total Amount Collected */}
        <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-xs flex items-center justify-between hover:border-emerald-300 transition-all bg-gradient-to-br from-white to-emerald-50/30">
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Total Collected
            </p>
            <h3 className="text-2xl font-bold text-emerald-800 mt-1 flex items-center">
              <span className="text-lg mr-0.5 text-emerald-600 font-semibold">₹</span>
              {totalCollectedYear.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              {collectionPercent}% of expected received
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Total Pending Amount */}
        <div className="bg-white rounded-xl p-5 border border-orange-200 shadow-xs flex items-center justify-between hover:border-orange-300 transition-all bg-gradient-to-br from-white to-orange-50/30">
          <div>
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Total Pending
            </p>
            <h3 className="text-2xl font-bold text-orange-800 mt-1 flex items-center">
              <span className="text-lg mr-0.5 text-orange-600 font-semibold">₹</span>
              {totalPendingYear.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-orange-600 font-medium mt-1">
              {100 - collectionPercent}% remaining balance
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Annual Progress Bar */}
      <div className="bg-white rounded-xl px-4 py-3 border border-slate-200/80 shadow-xs flex items-center gap-4">
        <div className="text-xs font-semibold text-slate-600 shrink-0 flex items-center gap-1.5">
          <span>Annual Progress:</span>
          <span className="text-emerald-700 font-bold">{collectionPercent}%</span>
        </div>
        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, collectionPercent))}%` }}
          />
        </div>
        <div className="text-xs text-slate-500 shrink-0">
          ₹{totalCollectedYear.toLocaleString('en-IN')} / ₹{totalExpectedYear.toLocaleString('en-IN')}
        </div>
      </div>
    </div>
  );
};
