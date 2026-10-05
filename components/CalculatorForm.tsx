import React, { useState } from 'react';
import type { PrintParameters, Filament, Printer, Part, QuotePartConfig } from '../types';
import TrashIcon from './icons/TrashIcon';

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
  setActivePartId
}) => {
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParameters(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    setSelectedPartId(''); // Clear selected part if user manually changes a value
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

  let displayPostProcessingHours = Math.floor(parameters.postProcessingHours);
  let displayPostProcessingMinutes = Math.round((parameters.postProcessingHours - displayPostProcessingHours) * 60);

  if (displayPostProcessingMinutes === 60) {
    displayPostProcessingHours += 1;
    displayPostProcessingMinutes = 0;
  }

  const handlePostProcessingHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let hours = parseInt(e.target.value, 10) || 0;
    if (hours < 0) hours = 0;
    const newPostProcessingHours = hours + displayPostProcessingMinutes / 60;
    setParameters(prev => ({ ...prev, postProcessingHours: newPostProcessingHours }));
    setSelectedPartId('');
  };

  const handlePostProcessingMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let minutes = parseInt(e.target.value, 10) || 0;
    if (minutes < 0) minutes = 0;
    if (minutes > 59) minutes = 59;
    const newPostProcessingHours = displayPostProcessingHours + minutes / 60;
    setParameters(prev => ({ ...prev, postProcessingHours: newPostProcessingHours }));
    setSelectedPartId('');
  };

  const activePart = quoteParts.find(p => p.id === activePartId) || quoteParts[0];

  const calculatePartPrice = (part: QuotePartConfig) => {
    const filament = filaments.find(f => f.id === part.filamentId);
    const printer = printers.find(p => p.id === part.printerId);

    const costPerKg = filament?.costPerKg || 0;
    const printerWatts = printer?.watts || 0;

    const filamentCost = (part.filamentGrams / 1000) * costPerKg;
    const electricityCost = (part.printHours * (printerWatts / 1000)) * parameters.electricityCostKwh;
    const laborCost = part.postProcessingHours * parameters.laborCostPerHour;
    const hardwareCost = part.hardwareCost;

    const subtotal = filamentCost + electricityCost + laborCost + hardwareCost;
    const costWithFailureRate = subtotal / (1 - (parameters.failureRate / 100));
    const profit = costWithFailureRate * (parameters.profitMargin / 100);
    
    return (costWithFailureRate + profit) * part.quantity;
  };

  return (
    <form className="space-y-6">
      <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2">Cost Calculator</h2>
      
      {/* Parts in this Quote Section */}
      <div className="space-y-3 p-4 border border-slate-700 rounded-xl bg-slate-800/25">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-lg font-semibold text-slate-200">Parts in this Quote</h3>
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-700 text-slate-300">
            {quoteParts.length} {quoteParts.length === 1 ? 'part' : 'parts'}
          </span>
        </div>
        
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {quoteParts.map(part => {
            const filament = filaments.find(f => f.id === part.filamentId);
            const isActive = part.id === activePartId;
            const partPrice = calculatePartPrice(part);
            
            return (
              <div
                key={part.id}
                onClick={() => setActivePartId(part.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isActive 
                    ? 'bg-slate-700/60 border-cyan-500 shadow-md shadow-cyan-500/5' 
                    : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center">
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
                  <span className="text-xs text-slate-400 mt-1 px-1">
                    {filament ? `${filament.name}` : 'No Material'} • {part.filamentGrams}g • {part.printHours.toFixed(1)}h
                  </span>
                </div>
                
                <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                  {/* Quantity controls */}
                  <div className="flex items-center bg-slate-800/80 rounded-md border border-slate-700 px-1 py-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setQuoteParts(prev => prev.map(p => p.id === part.id ? { ...p, quantity: Math.max(1, p.quantity - 1) } : p));
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
                        setQuoteParts(prev => prev.map(p => p.id === part.id ? { ...p, quantity: p.quantity + 1 } : p));
                      }}
                      className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded transition text-sm font-bold"
                    >
                      +
                    </button>
                  </div>
                  
                  {/* Part Price */}
                  <div className="text-right min-w-[65px]">
                    <span className="text-cyan-400 font-mono text-sm font-bold">
                      ${partPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const newId = 'part-' + Date.now() + Math.floor(Math.random() * 1000);
                        const duplicate: QuotePartConfig = {
                          ...part,
                          id: newId,
                          name: `${part.name} (Copy)`,
                        };
                        setQuoteParts(prev => [...prev, duplicate]);
                        setActivePartId(newId);
                      }}
                      className="p-1 text-slate-400 hover:text-cyan-400 rounded transition"
                      title="Duplicate part"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                    </button>
                    
                    {quoteParts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuoteParts(prev => prev.filter(p => p.id !== part.id));
                          if (activePartId === part.id) {
                            const remaining = quoteParts.filter(p => p.id !== part.id);
                            setActivePartId(remaining[0].id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-400 rounded transition"
                        title="Delete part"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            const newId = 'part-' + Date.now() + Math.floor(Math.random() * 1000);
            const newPart: QuotePartConfig = {
              ...activePart,
              id: newId,
              name: `Part ${quoteParts.length + 1}`,
              quantity: 1,
            };
            setQuoteParts(prev => [...prev, newPart]);
            setActivePartId(newId);
          }}
          className="w-full py-2 px-4 rounded-lg bg-slate-800/60 border border-dashed border-slate-700 hover:border-cyan-500/50 hover:bg-slate-700/40 text-cyan-400/90 hover:text-cyan-400 font-medium transition flex items-center justify-center gap-2 text-xs"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Part to Quote
        </button>
      </div>

       <div className="space-y-2 p-4 border border-slate-700 rounded-lg bg-slate-800">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-slate-200">Load Saved Part Catalog Item</h3>
          <span className="text-xs text-slate-400">Load template into active part</span>
        </div>
        <select
            id="partId"
            name="partId"
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

      <div className="space-y-4 p-4 border border-slate-700 rounded-lg bg-slate-800/40">
        <h3 className="text-lg font-medium text-slate-200 border-b border-slate-700 pb-1 flex justify-between items-center">
          <span>Active Part Material: <span className="text-cyan-400 font-bold">{activePart.name}</span></span>
        </h3>
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
                          {filament.brand} - {filament.name} (${filament.costPerKg.toFixed(2)}/kg)
                      </option>
                  ))
                )}
            </select>
        </div>
        <InputGroup label="Filament Weight" id="filamentGrams" value={parameters.filamentGrams} onChange={handleInputChange} unit="grams" />
      </div>

      <div className="space-y-4 p-4 border border-slate-700 rounded-lg bg-slate-800/40">
        <h3 className="text-lg font-medium text-slate-200 border-b border-slate-700 pb-1">Active Part Machine & Time</h3>
         <div>
            <label htmlFor="printerId" className="block text-sm font-medium text-slate-300 mb-1">Select Printer</label>
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
                  printers.map(printer => (
                      <option key={printer.id} value={printer.id}>
                          {printer.brand} - {printer.name} ({printer.watts}W)
                      </option>
                  ))
                )}
            </select>
        </div>
        <div>
          <label htmlFor="printHours" className="block text-sm font-medium text-slate-300 mb-1">Print Time</label>
          <div className="flex items-center gap-4">
            <div className="flex items-center w-1/2">
              <input
                type="number"
                id="printHours"
                name="printHours"
                value={displayHours}
                onChange={handleHoursChange}
                min="0"
                className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                aria-label="Print time in hours"
              />
              <span className="ml-3 text-slate-400 whitespace-nowrap">hr</span>
            </div>
            <div className="flex items-center w-1/2">
              <input
                type="number"
                id="printMinutes"
                name="printMinutes"
                value={displayMinutes}
                onChange={handleMinutesChange}
                min="0"
                max="59"
                className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                aria-label="Print time in minutes"
              />
              <span className="ml-3 text-slate-400 whitespace-nowrap">min</span>
            </div>
          </div>
        </div>
        <InputGroup label="Electricity Cost" id="electricityCostKwh" value={parameters.electricityCostKwh} onChange={handleInputChange} unit="$ / kWh" />
      </div>

      <div className="space-y-4 p-4 border border-slate-700 rounded-lg bg-slate-800/40">
        <h3 className="text-lg font-medium text-slate-200 border-b border-slate-700 pb-1">Active Part Labor & Overheads</h3>
        <div>
          <label htmlFor="postProcessingHours" className="block text-sm font-medium text-slate-300 mb-1">Post-Processing Time</label>
          <div className="flex items-center gap-4">
            <div className="flex items-center w-1/2">
              <input
                type="number"
                id="postProcessingHours"
                name="postProcessingHours"
                value={displayPostProcessingHours}
                onChange={handlePostProcessingHoursChange}
                min="0"
                className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                aria-label="Post-processing time in hours"
              />
              <span className="ml-3 text-slate-400 whitespace-nowrap">hr</span>
            </div>
            <div className="flex items-center w-1/2">
              <input
                type="number"
                id="postProcessingMinutes"
                name="postProcessingMinutes"
                value={displayPostProcessingMinutes}
                onChange={handlePostProcessingMinutesChange}
                min="0"
                max="59"
                className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                aria-label="Post-processing time in minutes"
              />
              <span className="ml-3 text-slate-400 whitespace-nowrap">min</span>
            </div>
          </div>
        </div>
        <InputGroup label="Labor Cost per Hour" id="laborCostPerHour" value={parameters.laborCostPerHour} onChange={handleInputChange} unit="$ / hour" />
        <InputGroup label="Hardware Parts Cost" id="hardwareCost" value={parameters.hardwareCost} onChange={handleInputChange} unit="$" step={1}/>
      </div>

      <div className="space-y-4 p-4 border border-slate-700 rounded-lg bg-slate-800/40">
        <h3 className="text-lg font-medium text-slate-200 border-b border-slate-700 pb-1">Financials (Applies to Whole Quote)</h3>
        <InputGroup label="Failure Rate" id="failureRate" value={parameters.failureRate} onChange={handleInputChange} unit="%" />
        <InputGroup label="Profit Margin" id="profitMargin" value={parameters.profitMargin} onChange={handleInputChange} unit="%" />
      </div>
    </form>
  );
};

export default CalculatorForm;