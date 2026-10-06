import React, { useState, useRef } from 'react';
import type { PrintParameters, Filament, Printer, Part, QuotePartConfig, GeneralSettings } from '../types';
import { calculatePrinterRates } from '../utils/printerRates';
import TrashIcon from './icons/TrashIcon';
import PhotoIcon from './icons/PhotoIcon';
import CameraIcon from './icons/CameraIcon';
import ImageModal from './ImageModal';
import { compressAndFormatImage, isValidImageFile } from '../utils/imageUtils';

interface CalculatorFormProps {
  parameters: PrintParameters;
  setParameters: React.Dispatch<React.SetStateAction<PrintParameters>>;
  filaments: Filament[];
  printers: Printer[];
  parts: Part[];
  onPartSelect: (part: Part | null) => void;
  quoteParts: QuotePartConfig[];
  setQuoteParts: React.Dispatch<React.SetStateAction<QuotePartConfig[]>>;
  activePartId: string;
  setActivePartId: (id: string) => void;
  generalSettings?: GeneralSettings;
}

interface InputGroupProps {
  label: string;
  id: keyof PrintParameters;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  unit?: string;
  step?: number;
  min?: number;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, id, value, onChange, unit, step = 0.01, min = 0 }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
    <div className="flex items-center">
      <input
        type="number"
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        min={min}
        step={step}
        className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
      />
      {unit && <span className="ml-3 text-slate-400 whitespace-nowrap">{unit}</span>}
    </div>
  </div>
);

const CalculatorForm: React.FC<CalculatorFormProps> = ({ 
  parameters, 
  setParameters, 
  filaments, 
  printers, 
  parts, 
  onPartSelect,
  quoteParts,
  setQuoteParts,
  activePartId,
  setActivePartId,
  generalSettings,
}) => {
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const activePartPhotoInputRef = useRef<HTMLInputElement>(null);

  const handleActivePartPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidImageFile(file)) {
      alert('Please choose a valid image file');
      return;
    }

    try {
      const compressed = await compressAndFormatImage(file, { maxWidth: 1000, maxHeight: 1000, quality: 0.82 });
      setQuoteParts(prev => prev.map(p => p.id === activePartId ? { ...p, imageUrl: compressed } : p));
    } catch (err) {
      console.error('Failed to compress quote part photo', err);
      alert('Error processing photo');
    } finally {
      if (activePartPhotoInputRef.current) {
        activePartPhotoInputRef.current.value = '';
      }
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParameters(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    setSelectedPartId('');
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setParameters(prev => ({ ...prev, [name]: value }));
  };

  const handlePartSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const partId = e.target.value;
    setSelectedPartId(partId);
    const part = parts.find(p => p.id === partId);
    onPartSelect(part || null);
  };

  let displayHours = Math.floor(parameters.printHours);
  let displayMinutes = Math.round((parameters.printHours - displayHours) * 60);

  if (displayMinutes === 60) {
    displayHours += 1;
    displayMinutes = 0;
  }

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let hours = parseInt(e.target.value, 10) || 0;
    if (hours < 0) hours = 0;
    const newPrintHours = hours + displayMinutes / 60;
    setParameters(prev => ({ ...prev, printHours: newPrintHours }));
    setSelectedPartId('');
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let minutes = parseInt(e.target.value, 10) || 0;
    if (minutes < 0) minutes = 0;
    if (minutes > 59) minutes = 59;
    const newPrintHours = displayHours + minutes / 60;
    setParameters(prev => ({ ...prev, printHours: newPrintHours }));
    setSelectedPartId('');
  };

  let displayPostHours = Math.floor(parameters.postProcessingHours || 0);
  let displayPostMinutes = Math.round(((parameters.postProcessingHours || 0) - displayPostHours) * 60);

  if (displayPostMinutes === 60) {
    displayPostHours += 1;
    displayPostMinutes = 0;
  }

  const handlePostHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let hours = parseInt(e.target.value, 10) || 0;
    if (hours < 0) hours = 0;
    const newHours = hours + displayPostMinutes / 60;
    setParameters(prev => ({ ...prev, postProcessingHours: parseFloat(newHours.toFixed(4)) }));
    setSelectedPartId('');
  };

  const handlePostMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let minutes = parseInt(e.target.value, 10) || 0;
    if (minutes < 0) minutes = 0;
    if (minutes > 59) minutes = 59;
    const newHours = displayPostHours + minutes / 60;
    setParameters(prev => ({ ...prev, postProcessingHours: parseFloat(newHours.toFixed(4)) }));
    setSelectedPartId('');
  };

  // Find the currently active part
  const activePart = quoteParts.find(p => p.id === activePartId) || quoteParts[0] || {
    id: 'part-1',
    name: 'Part 1',
    quantity: 1,
    filamentGrams: 100,
    filamentId: filaments[0]?.id || null,
    printHours: 5,
    printerId: printers[0]?.id || null,
    postProcessingHours: 0.5,
    hardwareCost: 0,
  };

  const activePartColors = activePart.colors || [];
  const isMultiColor = activePartColors.length > 1;

  // Multi-Color Handlers
  const handleEnableMultiColor = () => {
    setQuoteParts(prev => prev.map(p => {
      if (p.id === activePart.id) {
        const primaryGrams = Math.round((p.filamentGrams || 100) * 0.8) || 80;
        const secondaryGrams = Math.max(10, (p.filamentGrams || 100) - primaryGrams) || 20;
        const firstFilamentId = p.filamentId || filaments[0]?.id || null;
        const secondFilament = filaments.find(f => f.id !== firstFilamentId) || filaments[0];

        const initialColors = [
          {
            id: `color-${Date.now()}-1`,
            filamentId: firstFilamentId,
            grams: primaryGrams,
          },
          {
            id: `color-${Date.now()}-2`,
            filamentId: secondFilament ? secondFilament.id : firstFilamentId,
            grams: secondaryGrams,
          }
        ];
        return {
          ...p,
          colors: initialColors,
          filamentGrams: primaryGrams + secondaryGrams,
          filamentId: firstFilamentId,
        };
      }
      return p;
    }));
  };

  const handleSwitchToSingleColor = () => {
    setQuoteParts(prev => prev.map(p => {
      if (p.id === activePart.id) {
        const primaryColor = p.colors?.[0];
        const filId = primaryColor?.filamentId || p.filamentId || filaments[0]?.id || null;
        const totalGrams = p.colors?.reduce((sum, c) => sum + (c.grams || 0), 0) || p.filamentGrams || 100;
        return {
          ...p,
          colors: undefined,
          filamentId: filId,
          filamentGrams: totalGrams,
        };
      }
      return p;
    }));
  };

  const handleAddColor = () => {
    setQuoteParts(prev => prev.map(p => {
      if (p.id === activePart.id) {
        const existing = p.colors && p.colors.length > 0 
          ? p.colors 
          : [{ id: `color-${Date.now()}-1`, filamentId: p.filamentId || filaments[0]?.id || null, grams: p.filamentGrams || 100 }];

        const usedFilamentIds = new Set(existing.map(c => c.filamentId));
        const unusedFilament = filaments.find(f => !usedFilamentIds.has(f.id)) || filaments[0];

        const newColor = {
          id: `color-${Date.now()}-${existing.length + 1}`,
          filamentId: unusedFilament ? unusedFilament.id : (filaments[0]?.id || null),
          grams: 25,
        };
        const updated = [...existing, newColor];
        const totalGrams = updated.reduce((sum, c) => sum + (c.grams || 0), 0);
        return {
          ...p,
          colors: updated,
          filamentGrams: totalGrams,
        };
      }
      return p;
    }));
  };

  const handleRemoveColor = (colorId: string) => {
    setQuoteParts(prev => prev.map(p => {
      if (p.id === activePart.id) {
        const updated = (p.colors || []).filter(c => c.id !== colorId);
        const totalGrams = updated.reduce((sum, c) => sum + (c.grams || 0), 0);
        const firstFilamentId = updated[0]?.filamentId || p.filamentId;
        return {
          ...p,
          colors: updated.length <= 1 ? undefined : updated,
          filamentGrams: totalGrams,
          filamentId: firstFilamentId,
        };
      }
      return p;
    }));
  };

  const handleColorFilamentChange = (colorId: string, newFilamentId: string) => {
    setQuoteParts(prev => prev.map(p => {
      if (p.id === activePart.id) {
        const updated = (p.colors || []).map(c => c.id === colorId ? { ...c, filamentId: newFilamentId } : c);
        const firstFilamentId = updated[0]?.filamentId || p.filamentId;
        return {
          ...p,
          colors: updated,
          filamentId: firstFilamentId,
        };
      }
      return p;
    }));
  };

  const handleColorGramsChange = (colorId: string, grams: number) => {
    setQuoteParts(prev => prev.map(p => {
      if (p.id === activePart.id) {
        const updated = (p.colors || []).map(c => c.id === colorId ? { ...c, grams } : c);
        const totalGrams = updated.reduce((sum, c) => sum + (c.grams || 0), 0);
        return {
          ...p,
          colors: updated,
          filamentGrams: totalGrams,
        };
      }
      return p;
    }));
  };

  // Calculate multi-color totals for the active part preview
  const totalPartWeight = isMultiColor 
    ? activePartColors.reduce((sum, c) => sum + (c.grams || 0), 0)
    : activePart.filamentGrams;

  const totalPartMaterialCost = isMultiColor
    ? activePartColors.reduce((sum, c) => {
        const fil = filaments.find(f => f.id === c.filamentId);
        return sum + ((c.grams || 0) / 1000) * (fil?.costPerKg || 0);
      }, 0)
    : ((activePart.filamentGrams / 1000) * ((filaments.find(f => f.id === activePart.filamentId)?.costPerKg) || 0));

  const selectedFilament = filaments.find(f => f.id === parameters.filamentId);
  const selectedPrinter = printers.find(p => p.id === parameters.printerId);
  const selectedPrinterRates = calculatePrinterRates(selectedPrinter, generalSettings);
  const isDepreciationActive = generalSettings?.enablePrinterDepreciation !== false;
  const activePartMachineCost = (activePart.printHours || 0) * (isDepreciationActive ? selectedPrinterRates.totalHourlyRate : 0) * (activePart.quantity || 1);

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      {/* Multipart Quote Header & Part Tabs */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-cyan-400 text-base">Quote Parts ({quoteParts.length})</h3>
            <span className="text-xs text-slate-400">Configure each part and material</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const newPartIndex = quoteParts.length + 1;
              const newPart: QuotePartConfig = {
                id: `part-${Date.now()}`,
                name: `Part ${newPartIndex}`,
                quantity: 1,
                filamentGrams: 100,
                filamentId: filaments.length > 0 ? filaments[0].id : null,
                printHours: 5,
                printerId: printers.length > 0 ? printers[0].id : null,
                postProcessingHours: 0.5,
                hardwareCost: 0,
              };
              setQuoteParts(prev => [...prev, newPart]);
              setActivePartId(newPart.id);
            }}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors shadow-sm"
          >
            + Add Another Part
          </button>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {quoteParts.map((part, index) => {
            const filament = filaments.find(f => f.id === part.filamentId);
            const isActive = part.id === activePartId;
            const partHasMultiColor = Boolean(part.colors && part.colors.length > 1);

            return (
              <div 
                key={part.id} 
                onClick={() => setActivePartId(part.id)}
                className={`p-2.5 rounded-lg border transition cursor-pointer flex justify-between items-center ${
                  isActive 
                    ? 'bg-slate-800 border-cyan-500 shadow-md ring-1 ring-cyan-500/50' 
                    : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 hover:border-slate-600'
                }`}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    {part.imageUrl && (
                      <img
                        src={part.imageUrl}
                        alt={part.name}
                        className="w-5 h-5 rounded object-cover border border-slate-600 flex-shrink-0 cursor-pointer hover:border-cyan-400 shadow-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage({ url: part.imageUrl!, title: part.name });
                        }}
                        title="Click to view part photo"
                      />
                    )}
                    <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                    <input
                      type="text"
                      value={part.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setQuoteParts(prev => prev.map(p => p.id === part.id ? { ...p, name: newName } : p));
                      }}
                      className="bg-transparent border-b border-transparent hover:border-slate-500 focus:border-cyan-500 text-slate-100 font-semibold text-sm focus:outline-none focus:ring-0 px-1 py-0.5 w-32 truncate"
                      title="Click to rename"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <span className="text-xs text-slate-400 mt-1 px-1 flex items-center gap-1.5 flex-wrap">
                    {partHasMultiColor && part.colors ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="flex -space-x-1 items-center">
                          {part.colors.map((c, i) => {
                            const fil = filaments.find(f => f.id === c.filamentId);
                            return (
                              <span
                                key={c.id || i}
                                className="inline-block w-2.5 h-2.5 rounded-full border border-slate-700 shadow-xs"
                                style={{ backgroundColor: fil?.colorHex || '#94a3b8' }}
                                title={fil ? `${fil.brand} - ${fil.type} (${c.grams}g)` : `${c.grams}g`}
                              />
                            );
                          })}
                        </span>
                        <span className="text-purple-300 font-semibold">{part.colors.length} Colors</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 truncate">
                        {filament ? (
                          <>
                            {filament.colorHex && (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full border border-slate-500/60 shadow-xs flex-shrink-0"
                                style={{ backgroundColor: filament.colorHex }}
                              />
                            )}
                            <span className="truncate">{filament.type || filament.name}{filament.colorName ? ` (${filament.colorName})` : ''}</span>
                          </>
                        ) : 'No Material'}
                      </span>
                    )}
                    <span>
                      • {part.filamentGrams}g • {(() => {
                        const h = Math.floor(part.printHours || 0);
                        const m = Math.round(((part.printHours || 0) - h) * 60);
                        if (h > 0 && m > 0) return `${h}h ${m}m`;
                        if (h > 0) return `${h}h`;
                        return `${m}m`;
                      })()}
                      {isDepreciationActive && (() => {
                        const pp = printers.find(p => p.id === part.printerId);
                        const pr = calculatePrinterRates(pp, generalSettings);
                        const mc = part.printHours * pr.totalHourlyRate * part.quantity;
                        return mc > 0 ? (
                          <span className="ml-1 text-cyan-400 font-mono text-[11px]" title="Estimated machine use & depreciation">
                            (${mc.toFixed(2)} mach.)
                          </span>
                        ) : null;
                      })()}
                    </span>
                  </span>
                </div>
                
                <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                  {/* Individual Printer Selector for this part */}
                  <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/90 rounded-md border border-slate-700/80 px-2 py-1" title="Assign individual 3D printer for this part">
                    <span className="text-[11px] text-slate-400 font-medium">🖨️</span>
                    <select
                      value={part.printerId || ''}
                      onChange={(e) => {
                        const newPrinterId = e.target.value || null;
                        setQuoteParts(prev => prev.map(p => p.id === part.id ? { ...p, printerId: newPrinterId } : p));
                        if (part.id === activePartId) {
                          setParameters(prev => ({ ...prev, printerId: newPrinterId }));
                        }
                      }}
                      className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none focus:ring-0 max-w-[125px] truncate cursor-pointer"
                      title="Select individual printer for this part"
                    >
                      {printers.length === 0 ? (
                        <option value="" className="bg-slate-800 text-slate-400">No printers</option>
                      ) : (
                        printers.map(printer => (
                          <option key={printer.id} value={printer.id} className="bg-slate-800 text-slate-200">
                            {printer.brand} {printer.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center bg-slate-800/80 rounded-md border border-slate-700 px-1 py-0.5" title="Batch Quantity">
                    <button
                      type="button"
                      onClick={() => {
                        const newQ = Math.max(1, part.quantity - 1);
                        setQuoteParts(prev => prev.map(p => p.id === part.id ? { 
                          ...p, 
                          quantity: newQ,
                          quantityRequired: p.quantityRequired === undefined || p.quantityRequired === p.quantity ? newQ : p.quantityRequired
                        } : p));
                      }}
                      className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded transition text-sm font-bold"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-slate-200 text-xs font-semibold">
                      {part.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newQ = part.quantity + 1;
                        setQuoteParts(prev => prev.map(p => p.id === part.id ? { 
                          ...p, 
                          quantity: newQ,
                          quantityRequired: p.quantityRequired === undefined || p.quantityRequired === p.quantity ? newQ : p.quantityRequired
                        } : p));
                      }}
                      className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded transition text-sm font-bold"
                    >
                      +
                    </button>
                  </div>

                  {/* Duplicate part button */}
                  <button
                    type="button"
                    onClick={() => {
                      const newId = `part-${Date.now()}`;
                      const duplicate: QuotePartConfig = {
                        ...part,
                        id: newId,
                        name: `${part.name} (Copy)`,
                        colors: part.colors ? part.colors.map(c => ({ ...c, id: `color-${Date.now()}-${Math.random()}` })) : undefined,
                      };
                      setQuoteParts(prev => [...prev, duplicate]);
                      setActivePartId(newId);
                    }}
                    className="text-slate-400 hover:text-cyan-400 p-1 transition"
                    title="Duplicate Part"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>

                  {/* Delete part button */}
                  {quoteParts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const remaining = quoteParts.filter(p => p.id !== part.id);
                        setQuoteParts(remaining);
                        if (part.id === activePartId) {
                          setActivePartId(remaining[0].id);
                        }
                      }}
                      className="text-slate-400 hover:text-red-400 p-1 transition"
                      title="Remove Part"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Catalog Load Option */}
      <div>
        <label htmlFor="savedPart" className="block text-sm font-medium text-slate-300 mb-1">Load from Parts Catalog</label>
        <select
            id="savedPart"
            name="savedPart"
            value={selectedPartId}
            onChange={handlePartSelectChange}
            className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
        >
            <option value="">-- Select a saved catalog part --</option>
            {parts.map(part => (
                <option key={part.id} value={part.id}>
                    {part.name}
                </option>
            ))}
        </select>
      </div>

      {/* Active Part Photo Section */}
      <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {activePart.imageUrl ? (
            <div
              className="relative group w-12 h-12 rounded-lg overflow-hidden border border-slate-600 bg-slate-950 flex-shrink-0 cursor-pointer shadow-sm hover:border-cyan-400 transition"
              onClick={() => setPreviewImage({ url: activePart.imageUrl!, title: activePart.name })}
              title="Click to view full photo"
            >
              <img src={activePart.imageUrl} alt={activePart.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <PhotoIcon className="w-4 h-4 text-cyan-300 drop-shadow" />
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-slate-900 border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 flex-shrink-0">
              <PhotoIcon className="w-5 h-5 text-slate-600" />
              <span className="text-[9px] text-slate-500">No photo</span>
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <span>Photo for {activePart.name}</span>
              {activePart.imageUrl && (
                <span className="text-[10px] text-green-400 bg-green-950/40 border border-green-800/40 px-1.5 py-0.5 rounded">
                  Attached
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {activePart.imageUrl ? 'Photo attached from catalog or upload.' : 'Attach 3D render or prototype photo to this part.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={activePartPhotoInputRef}
            onChange={handleActivePartPhotoUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => activePartPhotoInputRef.current?.click()}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-600 transition flex items-center gap-1.5"
          >
            <CameraIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>{activePart.imageUrl ? 'Change Photo' : 'Upload Photo'}</span>
          </button>
          {activePart.imageUrl && (
            <button
              type="button"
              onClick={() => {
                setQuoteParts(prev => prev.map(p => p.id === activePart.id ? { ...p, imageUrl: undefined } : p));
              }}
              className="text-red-400 hover:text-red-300 text-xs px-2 py-1.5 rounded transition"
              title="Remove photo"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Active Part Material & Colors Section */}
      <div className="space-y-4 p-4 border border-slate-700 rounded-lg bg-slate-800/40">
        <div className="border-b border-slate-700 pb-2 flex flex-wrap justify-between items-center gap-2">
          <div>
            <h3 className="text-lg font-medium text-slate-200">
              Material & Colors: <span className="text-cyan-400 font-bold">{activePart.name}</span>
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            {isMultiColor ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                🎨 Multi-Color ({activePartColors.length} Colors)
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
                Single Color
              </span>
            )}
            
            {!isMultiColor ? (
              <button
                type="button"
                onClick={handleEnableMultiColor}
                className="text-xs bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 hover:text-white px-2.5 py-1 rounded-md border border-purple-500/40 transition font-medium flex items-center gap-1 shadow-sm"
              >
                <span>+ Multi-Color</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSwitchToSingleColor}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-2 py-1 rounded-md transition"
              >
                Switch to Single
              </button>
            )}
          </div>
        </div>

        {/* Single Color Mode Form */}
        {!isMultiColor ? (
          <>
            <div>
              <label htmlFor="filamentId" className="block text-sm font-medium text-slate-300 mb-1">Select Filament</label>
              <select
                  id="filamentId"
                  name="filamentId"
                  value={parameters.filamentId || ''}
                  onChange={handleSelectChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
              >
                  {filaments.length === 0 ? (
                    <option disabled value="">No filaments configured</option>
                  ) : (
                    filaments.map(filament => (
                        <option key={filament.id} value={filament.id}>
                            {filament.brand} - {filament.type || filament.name}{filament.colorName ? ` (${filament.colorName})` : ''} (${filament.costPerKg.toFixed(2)}/kg)
                        </option>
                    ))
                  )}
              </select>
              {selectedFilament && (
                <div className="flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded-md bg-slate-800/80 border border-slate-700/80 text-xs">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-500 shadow-xs flex-shrink-0"
                    style={{ backgroundColor: selectedFilament.colorHex || '#3b82f6' }}
                  />
                  <span className="text-slate-300">
                    Type: <strong className="text-slate-100 font-semibold">{selectedFilament.type || selectedFilament.name}</strong>
                    {selectedFilament.colorName && (
                      <span className="text-slate-300 ml-1.5 font-normal">
                        • Color: <strong className="text-slate-100">{selectedFilament.colorName}</strong>
                      </span>
                    )}
                  </span>
                  {selectedFilament.colorHex && (
                    <span className="font-mono text-[11px] text-slate-300 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700 ml-auto">
                      {selectedFilament.colorHex.toUpperCase()}
                    </span>
                  )}
                </div>
              )}
            </div>
            <InputGroup label="Filament Weight" id="filamentGrams" value={parameters.filamentGrams} onChange={handleInputChange} unit="grams" />
          </>
        ) : (
          /* Multi-Color Mode: Individual weights for each color filament */
          <div className="space-y-3">
            <div className="space-y-2.5">
              {activePartColors.map((colorItem, index) => {
                const fil = filaments.find(f => f.id === colorItem.filamentId);
                const itemCost = fil ? ((colorItem.grams || 0) / 1000) * fil.costPerKg : 0;

                return (
                  <div
                    key={colorItem.id}
                    className="p-3 bg-slate-800/80 border border-slate-700/90 rounded-xl space-y-2.5 relative group hover:border-slate-600 transition"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-500 shadow-xs flex-shrink-0"
                          style={{ backgroundColor: fil?.colorHex || '#94a3b8' }}
                        />
                        <span className="text-xs font-semibold text-slate-200">
                          Color #{index + 1} {index === 0 ? '(Primary / Base)' : ''}
                        </span>
                        {fil?.colorName && (
                          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                            ({fil.colorName})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-cyan-400 font-medium">
                          ${itemCost.toFixed(2)}
                        </span>
                        {activePartColors.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveColor(colorItem.id)}
                            className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-700 transition"
                            title="Remove this color"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <select
                          value={colorItem.filamentId || ''}
                          onChange={(e) => handleColorFilamentChange(colorItem.id, e.target.value)}
                          className="w-full bg-slate-700 border border-slate-600 rounded-md py-1.5 px-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          {filaments.map(f => (
                            <option key={f.id} value={f.id}>
                              {f.brand} - {f.type || f.name}{f.colorName ? ` (${f.colorName})` : ''} (${f.costPerKg.toFixed(2)}/kg)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={colorItem.grams}
                          onChange={(e) => handleColorGramsChange(colorItem.id, parseFloat(e.target.value) || 0)}
                          placeholder="Weight (g)"
                          className="w-full bg-slate-700 border border-slate-600 rounded-md py-1.5 px-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 text-right"
                        />
                        <span className="text-xs text-slate-400">g</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-1">
              <button
                type="button"
                onClick={handleAddColor}
                className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-medium py-1.5 px-3 rounded-lg transition flex items-center gap-1.5 shadow-sm"
              >
                <span>+ Add Color Filament</span>
              </button>

              <div className="text-xs text-slate-300 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-3">
                <span>
                  Total Weight: <strong className="text-slate-100 font-semibold">{totalPartWeight}g</strong>
                </span>
                <span className="text-slate-500">|</span>
                <span>
                  Material Cost: <strong className="text-cyan-400 font-mono">${totalPartMaterialCost.toFixed(2)}</strong>
                </span>
              </div>
            </div>

            {/* Complex mode: optional Color Swaps input */}
            {generalSettings?.multiColorPricingMode === 'complex' && (
              <div className="mt-3 p-3 bg-purple-950/20 border border-purple-500/30 rounded-lg">
                <label className="block text-xs font-medium text-purple-200 mb-1">
                  Estimated Color Changes / Swaps (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={activePart.colorChanges || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setQuoteParts(prev => prev.map(p => p.id === activePart.id ? { ...p, colorChanges: val } : p));
                    }}
                    placeholder="e.g. 150 swaps"
                    className="w-full bg-slate-700 border border-purple-500/40 rounded-md py-1.5 px-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                  <span className="text-xs text-slate-400 whitespace-nowrap">swaps</span>
                </div>
                <span className="text-[11px] text-purple-300/80 mt-1 block">
                  Used for per-swap wear & waste calculation (${generalSettings.complexCostPerColorChange ?? 0.05}/swap)
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Part Machine & Time Section */}
      <div className="space-y-4 p-4 border border-slate-700 rounded-lg bg-slate-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700 pb-2 gap-1">
          <h3 className="text-lg font-medium text-slate-200">
            Machine & Print Time: <span className="text-cyan-400 font-semibold">{activePart.name}</span>
          </h3>
          <span className="text-xs text-slate-400">
            Assigned: <strong className="text-cyan-300">{selectedPrinter ? `${selectedPrinter.brand} ${selectedPrinter.name}` : 'Default Printer'}</strong>
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Assign an individual 3D printer for <strong>{activePart.name}</strong>. Machine wear, wattage, and hourly depreciation calculate independently for each part in the quote.
        </p>
         <div>
            <label htmlFor="printerId" className="block text-sm font-medium text-slate-300 mb-1">
              Select 3D Printer for {activePart.name}
            </label>
            <select
                id="printerId"
                name="printerId"
                value={parameters.printerId || ''}
                onChange={handleSelectChange}
                className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
            >
                {printers.length === 0 ? (
                  <option disabled value="">No printers configured</option>
                ) : (
                  printers.map(printer => {
                    const pr = calculatePrinterRates(printer, generalSettings);
                    return (
                      <option key={printer.id} value={printer.id}>
                          {printer.brand} - {printer.name} ({printer.watts}W) • ${pr.totalHourlyRate.toFixed(2)}/hr machine rate
                      </option>
                    );
                  })
                )}
            </select>

            {/* Machine Rate & Depreciation Info Card */}
            {selectedPrinter && (
              <div className="mt-2.5 p-3 bg-slate-900/60 rounded-xl border border-slate-700/80 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                    <span>⏱️ Machine Rate & Depreciation:</span>
                  </span>
                  <span className="font-mono font-bold text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/20">
                    ${selectedPrinterRates.totalHourlyRate.toFixed(2)} / hour
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-1 pt-0.5">
                  <span>
                    Depr: ${selectedPrinterRates.depreciationPerHour.toFixed(2)}/h • Maint & Fee: ${(selectedPrinterRates.maintenancePerHour + selectedPrinterRates.usageFeePerHour).toFixed(2)}/h
                  </span>
                  <span className="text-slate-200 font-mono font-medium">
                    Part Cost: ${activePartMachineCost.toFixed(2)}
                  </span>
                </div>
                {!isDepreciationActive && (
                  <div className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    ⚠️ Machine use time & depreciation is currently turned off in Settings.
                  </div>
                )}
              </div>
            )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Print Time</label>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="flex items-center">
                <input
                  type="number"
                  id="printHours"
                  name="printHours"
                  value={displayHours}
                  onChange={handleHoursChange}
                  min="0"
                  step="1"
                  className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                />
                <span className="ml-2 text-slate-400">hours</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <input
                  type="number"
                  id="printMinutes"
                  name="printMinutes"
                  value={displayMinutes}
                  onChange={handleMinutesChange}
                  min="0"
                  max="59"
                  step="1"
                  className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                />
                <span className="ml-2 text-slate-400">minutes</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Post-Processing Time</label>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="flex items-center">
                <input
                  type="number"
                  id="postProcessingHours"
                  name="postProcessingHours"
                  value={displayPostHours}
                  onChange={handlePostHoursChange}
                  min="0"
                  step="1"
                  className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                />
                <span className="ml-2 text-slate-400">hours</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <input
                  type="number"
                  id="postProcessingMinutes"
                  name="postProcessingMinutes"
                  value={displayPostMinutes}
                  onChange={handlePostMinutesChange}
                  min="0"
                  max="59"
                  step="1"
                  className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                />
                <span className="ml-2 text-slate-400">minutes</span>
              </div>
            </div>
          </div>
        </div>

        <InputGroup label="Hardware & Consumables Cost" id="hardwareCost" value={parameters.hardwareCost} onChange={handleInputChange} unit="$" />

        {/* Quantity and Quantity Required for Active Part */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-700/60">
          <div>
            <label htmlFor="activePartQuantity" className="block text-sm font-medium text-slate-300 mb-1">
              Quantity to Print (Batch Size)
            </label>
            <input
              type="number"
              id="activePartQuantity"
              min="1"
              step="1"
              value={activePart.quantity}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                setQuoteParts(prev => prev.map(p => p.id === activePart.id ? {
                  ...p,
                  quantity: val,
                  quantityRequired: p.quantityRequired === undefined || p.quantityRequired === p.quantity ? val : p.quantityRequired
                } : p));
              }}
              className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Number of copies to produce in this job</span>
          </div>

          <div>
            <label htmlFor="activePartQuantityRequired" className="block text-sm font-medium text-slate-300 mb-1">
              Quantity Required (Order Demand)
            </label>
            <input
              type="number"
              id="activePartQuantityRequired"
              min="1"
              step="1"
              value={activePart.quantityRequired !== undefined ? activePart.quantityRequired : activePart.quantity}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                setQuoteParts(prev => prev.map(p => p.id === activePart.id ? {
                  ...p,
                  quantityRequired: val
                } : p));
              }}
              className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Total customer requirement for fulfillment</span>
          </div>
        </div>
      </div>

      {previewImage && (
        <ImageModal
          isOpen={true}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.url}
          title={`Part: ${previewImage.title}`}
          subtitle="Quote part photo"
        />
      )}
    </form>
  );
};

export default CalculatorForm;
