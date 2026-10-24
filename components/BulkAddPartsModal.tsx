import React, { useState, useMemo } from 'react';
import type { Part, Filament, Printer } from '../types';
import CubeIcon from './icons/CubeIcon';
import XIcon from './icons/XIcon';

interface BulkAddPartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  filaments: Filament[];
  printers: Printer[];
  onAddParts: (selected: Array<{ part: Part; quantity: number }>) => void;
}

export const BulkAddPartsModal: React.FC<BulkAddPartsModalProps> = ({
  isOpen,
  onClose,
  parts,
  filaments,
  onAddParts,
}) => {
  const [selectedMap, setSelectedMap] = useState<Record<string, { selected: boolean; quantity: number }>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize or reset when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const initial: Record<string, { selected: boolean; quantity: number }> = {};
      parts.forEach(p => {
        initial[p.id] = { selected: false, quantity: 1 };
      });
      setSelectedMap(initial);
      setSearchQuery('');
    }
  }, [isOpen, parts]);

  const filteredParts = useMemo(() => {
    if (!searchQuery.trim()) return parts;
    const q = searchQuery.toLowerCase();
    return parts.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.description && p.description.toLowerCase().includes(q))
    );
  }, [parts, searchQuery]);

  const selectedItems = useMemo(() => {
    return Object.entries(selectedMap)
      .map(([id, val]): { part: Part; quantity: number } | null => {
        const entry = val as { selected: boolean; quantity: number } | undefined;
        if (!entry || !entry.selected || entry.quantity <= 0) return null;
        const part = parts.find(p => p.id === id);
        return part ? { part, quantity: entry.quantity } : null;
      })
      .filter((item): item is { part: Part; quantity: number } => item !== null);
  }, [selectedMap, parts]);

  const summary = useMemo(() => {
    let totalQty = 0;
    let totalGrams = 0;
    let totalHours = 0;

    selectedItems.forEach(({ part, quantity }) => {
      totalQty += quantity;
      totalGrams += (part.filamentGrams || 0) * quantity;
      totalHours += (part.printHours || 0) * quantity;
    });

    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    const timeFormatted = hours > 0 && minutes > 0 
      ? `${hours}h ${minutes}m` 
      : hours > 0 
        ? `${hours}h` 
        : `${minutes}m`;

    return {
      partCount: selectedItems.length,
      totalQty,
      totalGrams,
      timeFormatted,
    };
  }, [selectedItems]);

  if (!isOpen) return null;

  const handleToggleSelect = (partId: string) => {
    setSelectedMap(prev => {
      const current = prev[partId] || { selected: false, quantity: 1 };
      return {
        ...prev,
        [partId]: {
          selected: !current.selected,
          quantity: current.quantity > 0 ? current.quantity : 1,
        },
      };
    });
  };

  const handleQuantityChange = (partId: string, qty: number) => {
    const validQty = Math.max(1, Math.min(999, qty || 1));
    setSelectedMap(prev => {
      const current = prev[partId] || { selected: true, quantity: 1 };
      return {
        ...prev,
        [partId]: {
          selected: true, // auto select if quantity changed
          quantity: validQty,
        },
      };
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedMap(prev => {
      const next = { ...prev };
      filteredParts.forEach(p => {
        const cur = next[p.id] || { quantity: 1 };
        next[p.id] = { selected: true, quantity: cur.quantity > 0 ? cur.quantity : 1 };
      });
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelectedMap(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        next[k] = { ...next[k], selected: false };
      });
      return next;
    });
  };

  const handleConfirm = () => {
    if (selectedItems.length === 0) return;
    onAddParts(selectedItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-700/80 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
              <CubeIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Bulk Add Parts to Quote</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {parts.length} in library
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Select multiple parts from your catalog to add them all into your active quote with their base filaments.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Close"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Selection Filter Bar */}
        <div className="p-3 sm:px-5 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parts by name or description..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1.5 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium transition border border-slate-700"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition border border-slate-700"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Parts List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 divide-y divide-slate-800/60">
          {filteredParts.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <span className="text-3xl block mb-2">📦</span>
              <p className="text-sm font-medium text-slate-300">
                {parts.length === 0 ? 'No saved parts in your library yet' : 'No parts match your search'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {parts.length === 0 
                  ? 'Add parts in the Parts section to build your reusable catalog.' 
                  : 'Try adjusting your search terms.'}
              </p>
            </div>
          ) : (
            filteredParts.map(part => {
              const state = selectedMap[part.id] || { selected: false, quantity: 1 };
              const isSelected = state.selected;
              const hasColors = Boolean(part.colors && part.colors.length > 1);
              const baseFilament = filaments.find(f => f.id === part.filamentId) || 
                (part.colors?.[0] ? filaments.find(f => f.id === part.colors?.[0]?.filamentId) : null) ||
                filaments[0];

              const partHours = Math.floor(part.printHours || 0);
              const partMins = Math.round(((part.printHours || 0) - partHours) * 60);
              const timeStr = partHours > 0 && partMins > 0 
                ? `${partHours}h ${partMins}m` 
                : partHours > 0 ? `${partHours}h` : `${partMins}m`;

              return (
                <div
                  key={part.id}
                  onClick={() => handleToggleSelect(part.id)}
                  className={`pt-2.5 first:pt-0 p-3 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/40 shadow-sm'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 hover:border-slate-600'
                  }`}
                >
                  {/* Left: Checkbox & Info */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(part.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 sm:mt-0 w-4 h-4 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />

                    {part.imageUrl ? (
                      <img
                        src={part.imageUrl}
                        alt={part.name}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-700 flex-shrink-0 bg-slate-900"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 flex-shrink-0">
                        <CubeIcon className="w-5 h-5 text-slate-500" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-100 truncate">
                          {part.name}
                        </span>
                        {typeof part.customUnitPrice === 'number' && part.customUnitPrice > 0 && (
                          <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/70 border border-amber-600/40 px-1.5 py-0.2 rounded">
                            ${part.customUnitPrice.toFixed(2)}/ea
                          </span>
                        )}
                      </div>

                      {part.description && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {part.description}
                        </p>
                      )}

                      {/* Specs and Material Pill */}
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                        <span className="font-mono text-slate-300 font-medium">{part.filamentGrams}g</span>
                        <span>•</span>
                        <span className="font-mono text-slate-300 font-medium">{timeStr}</span>
                        <span>•</span>
                        {hasColors ? (
                          <span className="inline-flex items-center gap-1 text-purple-300 font-semibold bg-purple-950/50 px-1.5 py-0.2 rounded border border-purple-800/40">
                            <span>🎨 {part.colors!.length} Colors</span>
                          </span>
                        ) : baseFilament ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-300">
                            {baseFilament.colorHex && (
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-slate-600 inline-block shadow-xs flex-shrink-0"
                                style={{ backgroundColor: baseFilament.colorHex }}
                              />
                            )}
                            <span className="truncate max-w-[130px] font-medium">
                              {baseFilament.brand} {baseFilament.type}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-500">Default Material</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quantity Stepper */}
                  <div 
                    className="flex items-center gap-2 self-end sm:self-center pl-7 sm:pl-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-xs text-slate-400 font-medium">Qty:</span>
                    <div className="flex items-center border border-slate-700 bg-slate-900 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(part.id, state.quantity - 1)}
                        className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-bold"
                        title="Decrease"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={state.quantity}
                        onChange={(e) => handleQuantityChange(part.id, parseInt(e.target.value, 10))}
                        className="w-12 bg-transparent text-center text-xs font-mono font-bold text-slate-100 py-1 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(part.id, state.quantity + 1)}
                        className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-bold"
                        title="Increase"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Summary & Confirm Button */}
        <div className="p-4 sm:px-6 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-300 text-center sm:text-left">
            {selectedItems.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-cyan-400">
                  {summary.partCount} {summary.partCount === 1 ? 'part' : 'parts'} ({summary.totalQty} total units)
                </span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-slate-300">~{summary.totalGrams}g filament</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-slate-300">~{summary.timeFormatted} print time</span>
              </div>
            ) : (
              <span className="text-slate-500">No parts selected yet</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedItems.length === 0}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Add {selectedItems.length > 0 ? `${summary.totalQty} Units` : 'Parts'} to Quote</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkAddPartsModal;
