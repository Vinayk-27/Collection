import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  UserPlus,
  Edit2,
  Trash2,
  History,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';
import { RegisterMember, ALL_MONTHS, MonthName, MonthlyBreakdownItem } from '../types';

interface PaymentRegisterTableProps {
  members: RegisterMember[];
  monthlyBreakdown: Record<MonthName, MonthlyBreakdownItem>;
  currentYear: number;
  onCellClick: (member: RegisterMember, month: MonthName) => void;
  onAddMember: () => void;
  onEditMember: (member: RegisterMember) => void;
  onDeleteMember: (member: RegisterMember) => void;
  onViewHistory: (member: RegisterMember) => void;
}

type SortOrder = 'default' | 'asc' | 'desc';

export const PaymentRegisterTable: React.FC<PaymentRegisterTableProps> = ({
  members,
  monthlyBreakdown,
  currentYear,
  onCellClick,
  onAddMember,
  onEditMember,
  onDeleteMember,
  onViewHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('default');

  // Filter and sort members
  const filteredAndSortedMembers = useMemo(() => {
    let result = members.filter((m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    if (sortOrder === 'asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    }

    return result;
  }, [members, searchQuery, sortOrder]);

  const toggleSort = () => {
    if (sortOrder === 'default') setSortOrder('asc');
    else if (sortOrder === 'asc') setSortOrder('desc');
    else setSortOrder('default');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Controls Header: Search, Sort, Add Member */}
      <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/60 no-print">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search member by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 placeholder-slate-400 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Alphabetical Sort Button */}
          <button
            onClick={toggleSort}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              sortOrder !== 'default'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
            title="Sort alphabetically"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {sortOrder === 'default'
                ? 'Sort Name'
                : sortOrder === 'asc'
                ? 'Name A-Z'
                : 'Name Z-A'}
            </span>
          </button>
        </div>

        {/* Right side: Add Member */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAddMember}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Table Section with Sticky Horizontal & Vertical Headers */}
      <div className="payment-table-container overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] relative">
        <table className="payment-table w-full border-collapse text-left min-w-[1250px]">
          {/* Table Header */}
          <thead className="bg-slate-900 text-white sticky top-0 z-20 shadow-sm text-xs uppercase tracking-wider">
            <tr>
              <th className="py-3 px-3 text-center font-bold w-14 border-r border-slate-800 bg-slate-900 sticky left-0 z-20">
                Sr.
              </th>
              <th className="py-3 px-4 font-bold border-r border-slate-800 bg-slate-900 sticky left-14 z-20 min-w-[200px]">
                Member Name
              </th>
              <th className="py-3 px-3 text-center font-bold border-r border-slate-800 bg-slate-900 w-24">
                Fee
              </th>

              {/* 12 Months Columns */}
              {ALL_MONTHS.map((month) => (
                <th
                  key={month}
                  className="py-3 px-2 text-center font-bold border-r border-slate-800 min-w-[76px]"
                >
                  {month}
                </th>
              ))}

              {/* Actions Column */}
              <th className="py-3 px-3 text-center font-bold min-w-[110px] no-print">
                Actions
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
            {filteredAndSortedMembers.length === 0 ? (
              <tr>
                <td
                  colSpan={16}
                  className="py-12 text-center text-slate-500 font-medium bg-slate-50"
                >
                  {searchQuery
                    ? `No members found matching "${searchQuery}".`
                    : 'No members registered yet. Click "Add Member" to create one.'}
                </td>
              </tr>
            ) : (
              filteredAndSortedMembers.map((member, index) => (
                <tr
                  key={member.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  {/* Sr. No. (Sticky Left Column 1) */}
                  <td className="py-2.5 px-3 text-center font-semibold text-slate-500 bg-white group-hover:bg-slate-50 border-r border-slate-200 sticky left-0 z-10">
                    {index + 1}
                  </td>

                  {/* Member Name (Sticky Left Column 2) */}
                  <td className="py-2.5 px-4 font-bold text-slate-800 bg-white group-hover:bg-slate-50 border-r border-slate-200 sticky left-14 z-10">
                    <div className="flex items-center justify-between">
                      <span className="truncate pr-2">{member.name}</span>
                      <span className="text-[10px] font-normal text-slate-400 font-mono">
                        {member.id}
                      </span>
                    </div>
                  </td>

                  {/* Monthly Base Fee */}
                  <td className="py-2.5 px-3 text-center font-semibold text-slate-600 bg-slate-50/80 border-r border-slate-200">
                    ₹{member.monthlyAmount}
                  </td>

                  {/* 12 Monthly Payment Cells */}
                  {ALL_MONTHS.map((month) => {
                    const cell = member.months[month];
                    const isPaid = cell.status === 'PAID';

                    return (
                      <td
                        key={month}
                        onClick={() => onCellClick(member, month)}
                        title={`Click to toggle ${month} ${currentYear} payment status (${isPaid ? 'Mark UNPAID' : 'Mark PAID'})`}
                        className={`py-2 px-1.5 text-center border-r border-slate-200 cursor-pointer select-none transition-all duration-150 ${
                          isPaid
                            ? 'payment-cell-paid bg-emerald-100/90 hover:bg-emerald-200/90 text-emerald-900 font-bold border-emerald-300'
                            : 'payment-cell-unpaid bg-white hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center py-0.5">
                          {/* Amount Display - ALWAYS shown! */}
                          <div className="flex items-center gap-1 font-bold text-xs sm:text-sm">
                            {isPaid && (
                              <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-600 text-white shrink-0 shadow-xs">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                            )}
                            <span>₹{cell.amount}</span>
                          </div>

                          {/* Subtle Status Label */}
                          <span
                            className={`text-[9px] uppercase tracking-wider font-semibold ${
                              isPaid ? 'text-emerald-700' : 'text-slate-400 opacity-60'
                            }`}
                          >
                            {isPaid ? 'Paid' : 'Unpaid'}
                          </span>
                        </div>
                      </td>
                    );
                  })}

                  {/* Actions Column */}
                  <td className="py-2.5 px-3 text-center no-print border-l border-slate-200">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onViewHistory(member)}
                        title="View Payment History"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditMember(member)}
                        title="Edit Member"
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteMember(member)}
                        title="Delete Member"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* Table Footer: Summary Rows for Expected, Collected, Pending */}
          <tfoot className="border-t-2 border-slate-300 font-bold text-xs bg-slate-50 sticky bottom-0 z-20 shadow-md">
            {/* Total Expected Row */}
            <tr className="border-b border-slate-200 bg-slate-100/80">
              <td
                colSpan={3}
                className="py-2.5 px-4 text-left font-bold text-slate-700 bg-slate-100 sticky left-0 z-20 border-r border-slate-300"
              >
                Total Expected (₹)
              </td>
              {ALL_MONTHS.map((month) => (
                <td
                  key={`exp-${month}`}
                  className="py-2.5 px-2 text-center text-slate-800 border-r border-slate-200 font-semibold"
                >
                  ₹{monthlyBreakdown[month]?.expected.toLocaleString('en-IN') || 0}
                </td>
              ))}
              <td className="no-print"></td>
            </tr>

            {/* Total Collected Row (Green) */}
            <tr className="border-b border-slate-200 bg-emerald-50">
              <td
                colSpan={3}
                className="py-2.5 px-4 text-left font-bold text-emerald-800 bg-emerald-50 sticky left-0 z-20 border-r border-emerald-200"
              >
                Total Collected (₹)
              </td>
              {ALL_MONTHS.map((month) => (
                <td
                  key={`col-${month}`}
                  className="py-2.5 px-2 text-center text-emerald-700 border-r border-emerald-200 font-bold"
                >
                  ₹{monthlyBreakdown[month]?.collected.toLocaleString('en-IN') || 0}
                </td>
              ))}
              <td className="no-print"></td>
            </tr>

            {/* Total Pending Row (Orange) */}
            <tr className="bg-orange-50/70">
              <td
                colSpan={3}
                className="py-2.5 px-4 text-left font-bold text-orange-800 bg-orange-50 sticky left-0 z-20 border-r border-orange-200"
              >
                Total Pending (₹)
              </td>
              {ALL_MONTHS.map((month) => (
                <td
                  key={`pen-${month}`}
                  className="py-2.5 px-2 text-center text-orange-700 border-r border-orange-200 font-bold"
                >
                  ₹{monthlyBreakdown[month]?.pending.toLocaleString('en-IN') || 0}
                </td>
              ))}
              <td className="no-print"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer Helper Note */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 no-print">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
          <span>Green cells denote confirmed <strong>PAID</strong> status.</span>
          <span className="inline-block w-3 h-3 rounded-full bg-white border border-slate-300 ml-2"></span>
          <span>White cells denote <strong>UNPAID</strong> / Pending.</span>
        </div>
        <div className="text-slate-400">
          Tip: Click any monthly cell to toggle payment status with instant confirmation.
        </div>
      </div>
    </div>
  );
};
