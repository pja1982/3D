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
        <InputGroup label="Print Time" id="printHours" value={parameters.printHours} onChange={handleInputChange} unit="hours" />
        <InputGroup label="Electricity Cost" id="electricityCostKwh" value={parameters.electricityCostKwh} onChange={handleInputChange} unit="$ / kWh" />
      </div>

      <div className="space-y-4 p-4 border border-slate-700 rounded-lg">
        <h3 className="text-lg font-medium text-slate-200">Labor & Overheads</h3>
        <InputGroup label="Post-Processing Time" id="postProcessingHours" value={parameters.postProcessingHours} onChange={handleInputChange} unit="hours" />
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
