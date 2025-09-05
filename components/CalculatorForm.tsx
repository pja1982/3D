import React from 'react';
import type { PrintParameters, Filament, Printer } from '../types';

interface CalculatorFormProps {
  parameters: PrintParameters;
  setParameters: React.Dispatch<React.SetStateAction<PrintParameters>>;
  filaments: Filament[];
  printers: Printer[];
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

const CalculatorForm: React.FC<CalculatorFormProps> = ({ parameters, setParameters, filaments, printers }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParameters(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setParameters(prev => ({ ...prev, [name]: value }));
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
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let minutes = parseInt(e.target.value, 10) || 0;
    if (minutes < 0) minutes = 0;
    if (minutes > 59) minutes = 59;
    const newPrintHours = displayHours + minutes / 60;
    setParameters(prev => ({ ...prev, printHours: newPrintHours }));
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
  };

  const handlePostProcessingMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let minutes = parseInt(e.target.value, 10) || 0;
    if (minutes < 0) minutes = 0;
    if (minutes > 59) minutes = 59;
    const newPostProcessingHours = displayPostProcessingHours + minutes / 60;
    setParameters(prev => ({ ...prev, postProcessingHours: newPostProcessingHours }));
  };


  return (
    <form className="space-y-6">
      <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2">Cost Calculator</h2>
      
      <div className="space-y-4 p-4 border border-slate-700 rounded-lg">
        <h3 className="text-lg font-medium text-slate-200">Material</h3>
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

      <div className="space-y-4 p-4 border border-slate-700 rounded-lg">
        <h3 className="text-lg font-medium text-slate-200">Machine & Time</h3>
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

      <div className="space-y-4 p-4 border border-slate-700 rounded-lg">
        <h3 className="text-lg font-medium text-slate-200">Labor & Overheads</h3>
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

      <div className="space-y-4 p-4 border border-slate-700 rounded-lg">
        <h3 className="text-lg font-medium text-slate-200">Financials</h3>
        <InputGroup label="Failure Rate" id="failureRate" value={parameters.failureRate} onChange={handleInputChange} unit="%" />
        <InputGroup label="Profit Margin" id="profitMargin" value={parameters.profitMargin} onChange={handleInputChange} unit="%" />
      </div>
    </form>
  );
};

export default CalculatorForm;