import React, { useState, useEffect } from 'react';
import {
  MASTER_CODE_BRANDS,
  MASTER_CODE_POLYMERS,
  MASTER_CODE_SPECIALTIES,
  COMMON_SOLID_COLORS,
  decodeMasterCode,
  buildMasterCode,
} from '../utils/filamentMasterCode';
import XIcon from './icons/XIcon';

interface FilamentMasterCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
  onApplyCode: (code: string, autoFillAttributes?: boolean) => void;
}

export const FilamentMasterCodeModal: React.FC<FilamentMasterCodeModalProps> = ({
  isOpen,
  onClose,
  initialCode = '',
  onApplyCode,
}) => {
  const [brandDigit, setBrandDigit] = useState<string>('0');
  const [polymerDigit, setPolymerDigit] = useState<string>('0');
  const [modifierType, setModifierType] = useState<'specialty' | 'solid'>('specialty');
  const [specialtyPrefix, setSpecialtyPrefix] = useState<string>('G');
  const [specialtyIndex, setSpecialtyIndex] = useState<number>(1);
  const [solidIndex, setSolidIndex] = useState<string>('01');
  const [autoFillDetails, setAutoFillDetails] = useState<boolean>(true);

  // Parse initial code on open
  useEffect(() => {
    if (isOpen) {
      const clean = (initialCode || '').trim().toUpperCase();
      if (clean.length === 4) {
        setBrandDigit(clean[0] in MASTER_CODE_BRANDS ? clean[0] : '0');
        setPolymerDigit(clean[1] in MASTER_CODE_POLYMERS ? clean[1] : '0');
        const d3 = clean[2];
        const d4 = clean[3];

        if (d3 in MASTER_CODE_SPECIALTIES) {
          setModifierType('specialty');
          setSpecialtyPrefix(d3);
          const parsedIdx = parseInt(d4, 10);
          setSpecialtyIndex(!isNaN(parsedIdx) && parsedIdx >= 1 && parsedIdx <= 9 ? parsedIdx : 1);
        } else {
          setModifierType('solid');
          setSolidIndex(clean.slice(2));
        }
      }
    }
  }, [isOpen, initialCode]);

  if (!isOpen) return null;

  const currentSuffix = modifierType === 'specialty' 
    ? `${specialtyPrefix}${specialtyIndex}` 
    : solidIndex.padStart(2, '0');

  const currentCode = buildMasterCode(brandDigit, polymerDigit, currentSuffix);
  const decoded = decodeMasterCode(currentCode);

  const handleConfirm = () => {
    onApplyCode(currentCode, autoFillDetails);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>Filament Master Code Builder</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                v0.1 Standard
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Structured 4-character identifier for workshop inventory, spools, and print traveler tracking.
            </p>
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

        {/* Live Code Banner */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Result:</span>
            <div className="flex items-center gap-1 font-mono text-2xl font-black text-white bg-slate-900 px-3 py-1.5 rounded-xl border border-cyan-500/50 shadow-inner">
              <span className="text-cyan-400" title={`Digit 1 (Brand): ${decoded.brandName}`}>{currentCode[0]}</span>
              <span className="text-purple-400" title={`Digit 2 (Polymer): ${decoded.polymerName}`}>{currentCode[1]}</span>
              <span className="text-amber-400" title={`Digits 3-4 (Modifier): ${decoded.specialtyLabel || decoded.colorName || currentSuffix}`}>{currentCode.slice(2)}</span>
            </div>
          </div>

          <div className="text-xs text-slate-300 text-center sm:text-right">
            <div className="font-semibold text-cyan-300">{decoded.summary}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              [Brand: {currentCode[0]}] [Polymer: {currentCode[1]}] [Index: {currentCode.slice(2)}]
            </div>
          </div>
        </div>

        {/* Builder Interactive Sections */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* 1. Digit 1: Brand */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between">
              <span>Digit 1: Brand Manufacturer</span>
              <span className="text-[11px] font-mono text-slate-400">Selected: {brandDigit} ({MASTER_CODE_BRANDS[brandDigit]?.name})</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(MASTER_CODE_BRANDS).map(([code, b]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setBrandDigit(code)}
                  className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex items-center gap-2.5 ${
                    brandDigit === code
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-100 ring-1 ring-cyan-500/50'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                  }`}
                >
                  <span className="font-mono font-bold text-xs w-5 h-5 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0">
                    {code}
                  </span>
                  <span className="text-xs font-semibold truncate">{b.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Digit 2: Base Polymer & Primary Finish */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center justify-between">
              <span>Digit 2: Base Polymer & Primary Finish</span>
              <span className="text-[11px] font-mono text-slate-400">Selected: {polymerDigit} ({MASTER_CODE_POLYMERS[polymerDigit]?.short})</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(MASTER_CODE_POLYMERS).map(([code, p]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setPolymerDigit(code)}
                  className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex items-center gap-2.5 ${
                    polymerDigit === code
                      ? 'bg-purple-950/60 border-purple-500 text-purple-100 ring-1 ring-purple-500/50'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                  }`}
                >
                  <span className="font-mono font-bold text-xs w-5 h-5 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center text-purple-400 shrink-0">
                    {code}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold block truncate">{p.short}</span>
                    <span className="text-[10px] text-slate-400 truncate block">{p.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Digits 3 & 4: Colour Index or Specialty Modifier */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Digits 3 & 4: Colour / Specialty Modifier
              </label>
              <div className="inline-flex rounded-lg p-0.5 bg-slate-950 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setModifierType('specialty')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                    modifierType === 'specialty'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Specialty Modifiers (G, R, T, D, L, W, C)
                </button>
                <button
                  type="button"
                  onClick={() => setModifierType('solid')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                    modifierType === 'solid'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Solid Colours (01–99)
                </button>
              </div>
            </div>

            {modifierType === 'specialty' ? (
              <div className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(MASTER_CODE_SPECIALTIES).map(([prefix, spec]) => (
                    <button
                      key={prefix}
                      type="button"
                      onClick={() => setSpecialtyPrefix(prefix)}
                      className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex items-center gap-2.5 ${
                        specialtyPrefix === prefix
                          ? 'bg-amber-950/60 border-amber-500 text-amber-100 ring-1 ring-amber-500/50'
                          : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="font-mono font-black text-xs w-6 h-6 rounded-md bg-slate-950 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0">
                        {prefix}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold block truncate">{spec.label}</span>
                        <span className="text-[10px] text-slate-400 truncate block">{spec.example}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Variant digit (1-9) */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400 font-medium">Variant Digit (1–9):</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSpecialtyIndex(num)}
                        className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition cursor-pointer border ${
                          specialtyIndex === num
                            ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-xs'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-medium">Solid Colour Code (01–99):</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={solidIndex}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setSolidIndex(val);
                    }}
                    placeholder="01"
                    className="w-16 bg-slate-900 border border-amber-500/60 rounded-lg py-1 px-2.5 text-center font-mono font-bold text-sm text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-xs text-slate-500">Enter any two-digit color number</span>
                </div>

                {/* Common Swatches */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                  {COMMON_SOLID_COLORS.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setSolidIndex(c.code)}
                      className={`p-1.5 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                        solidIndex === c.code
                          ? 'bg-amber-950/50 border-amber-500/80 text-amber-200'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0 shadow-xs"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="font-mono text-[10px] text-slate-400">{c.code}</span>
                      <span className="text-xs truncate">{c.name.split('/')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoFillDetails}
              onChange={(e) => setAutoFillDetails(e.target.checked)}
              className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500"
            />
            <span>Auto-fill Brand & Material from Master Code</span>
          </label>

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
              className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Apply Master Code #{currentCode}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilamentMasterCodeModal;
