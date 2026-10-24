import React, { useState } from 'react';
import type { Order, Quote, Filament, Printer } from '../types';
import { OrderStatus } from '../types';
import { 
  MILESTONES, 
  MilestoneKey, 
  getOrderMilestoneRows, 
  getOrderMilestoneStats 
} from '../utils/orderMilestones';
import ClipboardCheckIcon from './icons/ClipboardCheckIcon';

interface OrderMilestonesTrackerProps {
  order: Order;
  quote: Quote;
  filaments?: Filament[];
  printers?: Printer[];
  onUpdateMilestones?: (orderId: string, milestones: Record<string, Partial<Record<string, boolean>>>) => void;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
}

const OrderMilestonesTracker: React.FC<OrderMilestonesTrackerProps> = ({
  order,
  quote,
  filaments = [],
  printers = [],
  onUpdateMilestones,
  onUpdateStatus,
}) => {
  const [grouping, setGrouping] = useState<'per_unit' | 'per_line_item'>('per_unit');

  const rows = getOrderMilestoneRows(quote, filaments, printers, grouping);
  const stats = getOrderMilestoneStats(order, quote, filaments, printers);
  const currentMilestones = order.milestones || {};

  const handleToggle = (rowId: string, key: MilestoneKey) => {
    if (!onUpdateMilestones) return;
    const unitState = currentMilestones[rowId] || {};
    const updated = {
      ...currentMilestones,
      [rowId]: {
        ...unitState,
        [key]: !unitState[key],
      },
    };
    onUpdateMilestones(order.id, updated);
  };

  const handleToggleAllForRow = (rowId: string) => {
    if (!onUpdateMilestones) return;
    const unitState = currentMilestones[rowId] || {};
    const isRowAllChecked = MILESTONES.every(m => unitState[m.key]);

    const updatedUnitState: Partial<Record<MilestoneKey, boolean>> = {};
    MILESTONES.forEach(m => {
      updatedUnitState[m.key] = !isRowAllChecked;
    });

    const updated = {
      ...currentMilestones,
      [rowId]: updatedUnitState,
    };
    onUpdateMilestones(order.id, updated);
  };

  const handleToggleColumn = (key: MilestoneKey) => {
    if (!onUpdateMilestones || rows.length === 0) return;
    const isColumnAllChecked = rows.every(r => currentMilestones[r.id]?.[key]);
    const nextState = !isColumnAllChecked;

    const updated = { ...currentMilestones };
    rows.forEach(r => {
      updated[r.id] = {
        ...(updated[r.id] || {}),
        [key]: nextState,
      };
    });
    onUpdateMilestones(order.id, updated);
  };

  const handleCheckAllOrder = () => {
    if (!onUpdateMilestones) return;
    const updated: Record<string, Partial<Record<MilestoneKey, boolean>>> = {};
    rows.forEach(r => {
      const unitState: Partial<Record<MilestoneKey, boolean>> = {};
      MILESTONES.forEach(m => {
        unitState[m.key] = true;
      });
      updated[r.id] = unitState;
    });
    onUpdateMilestones(order.id, updated);
  };

  const handleResetOrder = () => {
    if (!onUpdateMilestones) return;
    if (stats.completedSteps > 0 && !window.confirm('Reset all milestone progress for this order?')) {
      return;
    }
    const updated: Record<string, Partial<Record<MilestoneKey, boolean>>> = {};
    rows.forEach(r => {
      updated[r.id] = {};
    });
    onUpdateMilestones(order.id, updated);
  };

  const isCompletedStatus = order.status === OrderStatus.Completed;

  return (
    <div className="space-y-4">
      {/* Header & Overall Progress */}
      <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-700/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <ClipboardCheckIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <span>Fabrication & Quality Milestones Tracker</span>
                <span className="text-[11px] font-mono text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-800/60">
                  {stats.completedSteps} / {stats.totalSteps} steps ({stats.percent}%)
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Keep track of each print checkpoint digitally. Checkmarks synchronize across devices and pre-fill printed workshop checklists.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg p-0.5 bg-slate-900 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setGrouping('per_unit')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  grouping === 'per_unit'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Display one row per required print unit"
              >
                1 Line / Unit ({rows.length})
              </button>
              <button
                type="button"
                onClick={() => setGrouping('per_line_item')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  grouping === 'per_line_item'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Group prints by part model"
              >
                By Model
              </button>
            </div>

            <button
              type="button"
              onClick={handleCheckAllOrder}
              disabled={stats.isAllCompleted}
              className="text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none px-2.5 py-1 rounded-md border border-slate-700 transition"
              title="Mark all milestones complete for all parts"
            >
              Check All
            </button>
            <button
              type="button"
              onClick={handleResetOrder}
              disabled={stats.completedSteps === 0}
              className="text-[11px] font-medium text-slate-400 hover:text-red-300 bg-slate-850 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none px-2 py-1 rounded-md border border-slate-700 transition"
              title="Clear all checked checkpoints"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/60">
            <div
              className={`h-full transition-all duration-300 ${
                stats.isAllCompleted
                  ? 'bg-gradient-to-r from-purple-500 to-green-400'
                  : 'bg-gradient-to-r from-purple-600 to-cyan-500'
              }`}
              style={{ width: `${stats.percent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10.5px] text-slate-400">
            <span>
              {stats.completedUnits} of {stats.totalUnits} {stats.totalUnits === 1 ? 'part copy' : 'part copies'} fully completed
            </span>
            <span>{stats.percent}% Ready</span>
          </div>
        </div>

        {/* All Milestones Completed Celebration Banner */}
        {stats.isAllCompleted && (
          <div className="p-3 bg-green-950/40 border border-green-500/50 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs text-green-200">
            <div className="flex items-center gap-2">
              <span className="text-base">🎉</span>
              <div>
                <strong>All 8 fabrication & quality milestones are completed!</strong>
                <p className="text-[11px] text-green-300/80">
                  Parts have passed slicing, printing, post-processing, and inspection.
                </p>
              </div>
            </div>

            {!isCompletedStatus && onUpdateStatus && (
              <button
                type="button"
                onClick={() => onUpdateStatus(order.id, OrderStatus.Completed)}
                className="bg-green-600 hover:bg-green-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-md transition-transform active:scale-95"
              >
                ✓ Mark Order as Completed
              </button>
            )}
          </div>
        )}
      </div>

      {/* Interactive Milestones Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-900/60 shadow-md">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800/90 text-slate-300 text-[11px] uppercase tracking-wider border-b border-slate-700">
              <th className="py-2.5 px-3 text-center w-10">#</th>
              <th className="py-2.5 px-3 font-semibold min-w-[140px]">Print / Model</th>
              <th className="py-2.5 px-3 font-semibold min-w-[110px]">Material / Color</th>
              {MILESTONES.map(m => {
                const checkedCount = rows.filter(r => currentMilestones[r.id]?.[m.key]).length;
                const isColumnAllChecked = rows.length > 0 && checkedCount === rows.length;
                const isPartiallyChecked = checkedCount > 0 && !isColumnAllChecked;

                return (
                  <th 
                    key={m.key} 
                    className="py-1 px-1 text-center font-semibold w-20 leading-tight select-none align-top"
                    title={`${m.label}: ${m.description} — Click to ${isColumnAllChecked ? 'uncheck all' : 'check all'} ${rows.length} units`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleColumn(m.key)}
                      className={`w-full group flex flex-col items-center justify-center p-1.5 rounded-lg transition cursor-pointer border ${
                        isColumnAllChecked 
                          ? 'bg-purple-950/70 hover:bg-purple-900 border-purple-600/60 text-purple-200' 
                          : isPartiallyChecked 
                            ? 'bg-slate-850 hover:bg-purple-950/40 border-slate-700 hover:border-purple-500/50 text-slate-200' 
                            : 'bg-transparent hover:bg-slate-800/80 border-transparent hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <span 
                          className={`w-3.5 h-3.5 rounded-xs flex items-center justify-center border text-[9px] font-bold transition ${
                            isColumnAllChecked 
                              ? 'bg-purple-600 border-purple-500 text-white shadow-xs' 
                              : isPartiallyChecked 
                                ? 'bg-purple-950 border-purple-400 text-purple-300' 
                                : 'border-slate-500 bg-slate-900 text-transparent group-hover:border-purple-400'
                          }`}
                        >
                          {isColumnAllChecked ? '✓' : isPartiallyChecked ? '–' : ''}
                        </span>
                        <span className={`text-[9.5px] font-mono ${
                          isColumnAllChecked ? 'text-purple-300 font-bold' : isPartiallyChecked ? 'text-purple-400' : 'text-slate-500 group-hover:text-slate-300'
                        }`}>
                          {checkedCount}/{rows.length}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold leading-tight text-center">
                        {m.label}
                      </span>
                    </button>
                  </th>
                );
              })}
              <th className="py-2.5 px-2 text-center w-16 font-semibold align-middle">Row</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((row) => {
              const unitState = currentMilestones[row.id] || {};
              const rowCompletedCount = MILESTONES.filter(m => unitState[m.key]).length;
              const isRowFullyChecked = rowCompletedCount === MILESTONES.length;

              return (
                <tr 
                  key={row.id} 
                  className={`transition-colors ${
                    isRowFullyChecked 
                      ? 'bg-purple-950/20 hover:bg-purple-950/30' 
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* # */}
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                    {row.unitIndex}
                  </td>

                  {/* Part Name */}
                  <td className="py-2.5 px-3 font-semibold text-slate-100">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{row.partName}</span>
                      <span className="text-[10px] font-bold text-purple-300 bg-purple-950/80 border border-purple-800/70 px-1.5 py-0.2 rounded">
                        {row.unitLabel}
                      </span>
                    </div>
                  </td>

                  {/* Material */}
                  <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                    {row.materialLabel}
                  </td>

                  {/* Checkboxes for each milestone */}
                  {MILESTONES.map(m => {
                    const isChecked = !!unitState[m.key];

                    return (
                      <td key={m.key} className="py-2 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(row.id, m.key)}
                          title={`${m.label}: ${m.description} (${isChecked ? 'Completed' : 'Click to mark complete'})`}
                          aria-label={`${row.partName} ${m.label} milestone`}
                          className={`w-6 h-6 mx-auto rounded border transition flex items-center justify-center cursor-pointer ${
                            isChecked
                              ? 'bg-purple-600 border-purple-400 text-white font-bold shadow-sm shadow-purple-900/50 scale-105'
                              : 'bg-slate-800/80 border-slate-600 text-transparent hover:border-purple-400 hover:bg-slate-700'
                          }`}
                        >
                          <span className="text-xs font-black leading-none">✓</span>
                        </button>
                      </td>
                    );
                  })}

                  {/* Quick Row Action Toggle */}
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleAllForRow(row.id)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded transition ${
                        isRowFullyChecked
                          ? 'bg-purple-900/60 text-purple-200 border border-purple-700/60 hover:bg-purple-800/60'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                      }`}
                      title={isRowFullyChecked ? 'Uncheck all 8 for this print' : 'Mark all 8 complete for this print'}
                    >
                      {rowCompletedCount}/8
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderMilestonesTracker;
