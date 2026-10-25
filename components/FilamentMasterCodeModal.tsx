import React, { useState, useEffect } from 'react';
import {
  MASTER_CODE_BRANDS,
  MASTER_CODE_POLYMERS,
  MASTER_CODE_EFFECTS,
  UNIVERSAL_SPECTRUM_COLORS,
  SPECTRUM_FAMILIES,
  COMMON_SOLID_COLORS,
  decodeMasterCode,
  buildMasterCode5,
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
  const [codeFormat, setCodeFormat] = useState<'5-char' | '4-char'>('5-char');
  const [brandDigit, setBrandDigit] = useState<string>('0');
  const [polymerDigit, setPolymerDigit] = useState<string>('0');
  
  // 5-Char Spectrum State
  const [effectCode, setEffectCode] = useState<string>('S');
  const [spectrumId, setSpectrumId] = useState<string>('32'); // Default Black
  const [selectedFamily, setSelectedFamily] = useState<string>('Dark Neutrals');

  // 4-Char Legacy State
  const [modifierType, setModifierType] = useState<'specialty' | 'solid'>('solid');
  const [specialtyPrefix, setSpecialtyPrefix] = useState<string>('G');
  const [specialtyIndex, setSpecialtyIndex] = useState<number>(1);
  const [solidIndex, setSolidIndex] = useState<string>('01');
  
  const [autoFillDetails, setAutoFillDetails] = useState<boolean>(true);

  // Parse initial code on open
  useEffect(() => {
    if (isOpen) {
      const clean = (initialCode || '').trim().toUpperCase();
      if (clean.length === 5) {
        setCodeFormat('5-char');
        setBrandDigit(clean[0] in MASTER_CODE_BRANDS ? clean[0] : '0');
        setPolymerDigit(clean[1] in MASTER_CODE_POLYMERS ? clean[1] : '0');
        setEffectCode(clean[2] in MASTER_CODE_EFFECTS ? clean[2] : 'S');
        const d4d5 = clean.slice(3);
        const matchedSpectrum = UNIVERSAL_SPECTRUM_COLORS.find(s => s.id === d4d5);
        if (matchedSpectrum) {
          setSpectrumId(matchedSpectrum.id);
          setSelectedFamily(matchedSpectrum.family);
        } else {
          setSpectrumId(d4d5);
        }
      } else if (clean.length === 4) {
        setCodeFormat('4-char');
        setBrandDigit(clean[0] in MASTER_CODE_BRANDS ? clean[0] : '0');
        setPolymerDigit(clean[1] in MASTER_CODE_POLYMERS ? clean[1] : '0');
        const d3 = clean[2];
        const d4 = clean[3];

        if (d3 in MASTER_CODE_EFFECTS && d3 !== 'S') {
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

  // Active generated code based on selected mode
  const currentCode = codeFormat === '5-char'
    ? buildMasterCode5(brandDigit, polymerDigit, effectCode, spectrumId)
    : buildMasterCode(
        brandDigit,
        polymerDigit,
        modifierType === 'specialty' ? `${specialtyPrefix}${specialtyIndex}` : solidIndex.padStart(2, '0')
      );

  const decoded = decodeMasterCode(currentCode);

  const handleConfirm = () => {
    onApplyCode(currentCode, autoFillDetails);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                Filament Master Code Builder
              </h3>
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setCodeFormat('5-char')}
                  className={`px-2.5 py-0.5 rounded font-bold transition ${
                    codeFormat === '5-char'
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  5-Char Spectrum (v0.2)
                </button>
                <button
                  type="button"
                  onClick={() => setCodeFormat('4-char')}
                  className={`px-2.5 py-0.5 rounded font-bold transition ${
                    codeFormat === '4-char'
                      ? 'bg-purple-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  4-Char Sequential (v0.1)
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {codeFormat === '5-char'
                ? 'Standardized 5-character format: [Brand][Polymer][Effect][Universal Spectrum ID 01-32]. Unified colors across all brands.'
                : 'Legacy 4-character format: [Brand][Polymer][Sequential 01-99 or Specialty G1-W9].'}
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
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Result:</span>
            <div className="flex items-center gap-1 font-mono text-2xl font-black text-white bg-slate-900 px-3.5 py-1.5 rounded-xl border border-cyan-500/50 shadow-inner">
              <span className="text-cyan-400" title={`Digit 1 (Brand): ${decoded.brandName}`}>{currentCode[0]}</span>
              <span className="text-purple-400" title={`Digit 2 (Polymer): ${decoded.polymerName}`}>{currentCode[1]}</span>
              {codeFormat === '5-char' ? (
                <>
                  <span className="text-amber-400" title={`Digit 3 (Effect): ${decoded.effectLabel || currentCode[2]}`}>{currentCode[2]}</span>
                  <span className="text-emerald-400" title={`Digits 4-5 (Spectrum ID): #${currentCode.slice(3)} (${decoded.colorName})`}>{currentCode.slice(3)}</span>
                </>
              ) : (
                <span className="text-amber-400" title={`Digits 3-4 (Modifier): ${decoded.specialtyLabel || decoded.colorName || currentCode.slice(2)}`}>{currentCode.slice(2)}</span>
              )}
            </div>
            {decoded.spectrumColor && (
              <span
                className="w-5 h-5 rounded-full border border-slate-600 shadow-md ml-1"
                style={{ backgroundColor: decoded.spectrumColor.hex }}
                title={`Spectrum Color: ${decoded.spectrumColor.name} (${decoded.spectrumColor.hex})`}
              />
            )}
          </div>

          <div className="text-xs text-slate-300 text-center sm:text-right">
            <div className="font-semibold text-cyan-300">{decoded.summary}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              {codeFormat === '5-char'
                ? `[1: ${MASTER_CODE_BRANDS[brandDigit]?.short}] [2: ${MASTER_CODE_POLYMERS[polymerDigit]?.short}] [3: ${MASTER_CODE_EFFECTS[effectCode]?.label?.split(' ')[0]}] [4-5: #${spectrumId} ${decoded.colorName}]`
                : `[Brand: ${currentCode[0]}] [Polymer: ${currentCode[1]}] [Index: ${currentCode.slice(2)}]`}
            </div>
          </div>
        </div>

        {/* Builder Interactive Controls */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* 1. Digit 1: Brand */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between">
              <span>Digit 1: Brand Manufacturer</span>
              <span className="text-[11px] font-mono text-slate-400">Selected: {brandDigit} ({MASTER_CODE_BRANDS[brandDigit]?.name})</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {Object.entries(MASTER_CODE_BRANDS).map(([code, b]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setBrandDigit(code)}
                  className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex items-center gap-2 ${
                    brandDigit === code
                      ? 'bg-cyan-950/70 border-cyan-500 text-cyan-100 ring-1 ring-cyan-500/50'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-mono font-bold text-xs w-5 h-5 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0">
                    {code}
                  </span>
                  <span className="text-xs font-semibold truncate">{b.short}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Digit 2: Base Polymer */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center justify-between">
              <span>Digit 2: Base Polymer & Primary Finish</span>
              <span className="text-[11px] font-mono text-slate-400">Selected: {polymerDigit} ({MASTER_CODE_POLYMERS[polymerDigit]?.name})</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(MASTER_CODE_POLYMERS).map(([code, p]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setPolymerDigit(code)}
                  className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex items-center gap-2 ${
                    polymerDigit === code
                      ? 'bg-purple-950/70 border-purple-500 text-purple-100 ring-1 ring-purple-500/50'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-mono font-bold text-xs w-5 h-5 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center text-purple-400 shrink-0">
                    {code}
                  </span>
                  <span className="text-xs font-semibold truncate">{p.short}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. FORMAT SPECIFIC SELECTION */}
          {codeFormat === '5-char' ? (
            <>
              {/* Digit 3: Visual Effect */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                  <span>Digit 3: Visual Effect & Finish</span>
                  <span className="text-[11px] font-mono text-slate-400">Selected: {effectCode} ({MASTER_CODE_EFFECTS[effectCode]?.label})</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {Object.entries(MASTER_CODE_EFFECTS).map(([code, eff]) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setEffectCode(code)}
                      className={`p-2 rounded-xl text-left border transition cursor-pointer flex items-center gap-2 ${
                        effectCode === code
                          ? 'bg-amber-950/70 border-amber-500 text-amber-100 ring-1 ring-amber-500/50'
                          : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="font-mono font-bold text-xs w-5 h-5 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0">
                        {code}
                      </span>
                      <span className="text-xs font-semibold truncate">{eff.label.split('/')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Digits 4-5: Universal Spectrum Color ID (01-32) */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <span>Digits 4–5: Universal Spectrum Colour ID (`01`–`32`)</span>
                    <span className="text-[10px] font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                      Standardized across all brands
                    </span>
                  </label>
                  <div className="text-xs font-mono text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    ID #{spectrumId}: {UNIVERSAL_SPECTRUM_COLORS.find(s => s.id === spectrumId)?.name}
                  </div>
                </div>

                {/* Family Filter Tabs */}
                <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedFamily('all')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                      selectedFamily === 'all'
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All (32)
                  </button>
                  {SPECTRUM_FAMILIES.map(fam => {
                    const famColors = UNIVERSAL_SPECTRUM_COLORS.filter(s => s.family === fam);
                    const isSelected = selectedFamily === fam;
                    return (
                      <button
                        key={fam}
                        type="button"
                        onClick={() => setSelectedFamily(fam)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full border border-slate-600"
                          style={{ backgroundColor: famColors[0]?.hex }}
                        />
                        <span>{fam}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Spectrum Color Swatches Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-800 rounded-xl bg-slate-950/40">
                  {UNIVERSAL_SPECTRUM_COLORS
                    .filter(spec => selectedFamily === 'all' || spec.family === selectedFamily)
                    .map(spec => (
                      <button
                        key={spec.id}
                        type="button"
                        onClick={() => setSpectrumId(spec.id)}
                        className={`p-2 rounded-xl text-left border transition cursor-pointer flex items-center gap-2.5 ${
                          spectrumId === spec.id
                            ? 'bg-emerald-950/80 border-emerald-400 text-white ring-1 ring-emerald-400/50 shadow-sm'
                            : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-full border border-slate-500 shrink-0 shadow-xs"
                          style={{ backgroundColor: spec.hex }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-emerald-400">
                              {spec.id}
                            </span>
                            <span className="text-xs font-semibold truncate text-slate-200">
                              {spec.name}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate capitalize">
                            {spec.family} • {spec.variation}
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </>
          ) : (
            /* 4-CHAR LEGACY BUILDER */
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 w-fit">
                <button
                  type="button"
                  onClick={() => setModifierType('solid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    modifierType === 'solid'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Standard Solid (01–99)
                </button>
                <button
                  type="button"
                  onClick={() => setModifierType('specialty')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    modifierType === 'specialty'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Specialty Effect (G, R, T, D, L, W, C, X)
                </button>
              </div>

              {modifierType === 'specialty' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-1">
                      Prefix Letter
                    </label>
                    <select
                      value={specialtyPrefix}
                      onChange={(e) => setSpecialtyPrefix(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      {Object.entries(MASTER_CODE_EFFECTS).filter(([k]) => k !== 'S').map(([k, s]) => (
                        <option key={k} value={k}>
                          {k} - {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-1">
                      Index Number (1–9)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={9}
                      value={specialtyIndex}
                      onChange={(e) => setSpecialtyIndex(Math.min(9, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-1.5">
                    Solid Color Index (01–99)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    {COMMON_SOLID_COLORS.map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setSolidIndex(c.code)}
                        className={`p-2 rounded-xl text-left border flex items-center gap-2 text-xs ${
                          solidIndex === c.code
                            ? 'bg-amber-950/80 border-amber-500 text-white'
                            : 'bg-slate-800/40 border-slate-700 text-slate-300'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-600" style={{ backgroundColor: c.hex }} />
                        <span className="font-mono font-bold">{c.code}</span>
                        <span className="truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    maxLength={2}
                    value={solidIndex}
                    onChange={(e) => setSolidIndex(e.target.value.replace(/\D/g, ''))}
                    placeholder="Custom 01-99"
                    className="w-full max-w-xs bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white font-mono"
                  />
                </div>
              )}
            </div>
          )}

          {/* Auto-fill details checkbox */}
          <div className="pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoFillDetails}
                onChange={(e) => setAutoFillDetails(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 bg-slate-950 border-slate-700 focus:ring-cyan-500/20"
              />
              <span>
                Auto-sync Spool attributes (Brand: <strong>{decoded.brandName}</strong>, Material: <strong>{decoded.polymerName}</strong>
                {decoded.colorName ? `, Color: ${decoded.colorName}` : ''})
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs sm:text-sm shadow-lg shadow-cyan-950/50 transition cursor-pointer"
            >
              <span>Apply Master Code</span>
              <span className="font-mono bg-slate-950/20 px-1.5 py-0.5 rounded font-black">
                #{currentCode}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default FilamentMasterCodeModal;
