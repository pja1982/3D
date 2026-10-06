import React, { useState, useEffect } from 'react';
import type { Printer } from '../types';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';
import { calculatePrinterRates } from '../utils/printerRates';

interface PrinterConfigurationPageProps {
  printers: Printer[];
  onAdd: (printer: Omit<Printer, 'id'>) => void;
  onUpdate: (printer: Printer) => void;
  onDelete: (id: string) => void;
}

const emptyPrinter: Omit<Printer, 'id'> = {
  name: '',
  brand: '',
  watts: 200,
  purchaseCost: 500,
  lifespanHours: 3000,
  hourlyDepreciation: 0.17,
  maintenanceCostPerHour: 0.15,
  hourlyUsageFee: 0.50,
  customHourlyRate: false,
};

const PrinterConfigurationPage: React.FC<PrinterConfigurationPageProps> = ({ printers, onAdd, onUpdate, onDelete }) => {
  const [formData, setFormData] = useState<Omit<Printer, 'id'> | Printer>(emptyPrinter);
  const [isEditing, setIsEditing] = useState(false);
  const [isCustomDepreciation, setIsCustomDepreciation] = useState(false);

  useEffect(() => {
    if (isEditing && 'id' in formData && !printers.find(p => p.id === formData.id)) {
      handleCancelEdit();
    }
  }, [printers, isEditing, formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setIsCustomDepreciation(checked);
      setFormData(prev => ({
        ...prev,
        customHourlyRate: checked,
      }));
      return;
    }

    const numValue = parseFloat(value) || 0;

    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: name === 'brand' || name === 'name' ? value : numValue,
      };

      // Auto-compute hourly depreciation if not custom override
      if (!isCustomDepreciation && (name === 'purchaseCost' || name === 'lifespanHours')) {
        const cost = name === 'purchaseCost' ? numValue : (prev.purchaseCost || 0);
        const hours = name === 'lifespanHours' ? numValue : (prev.lifespanHours || 1);
        if (hours > 0) {
          updated.hourlyDepreciation = parseFloat((cost / hours).toFixed(4));
        }
      }

      return updated;
    });
  };

  const handleEdit = (printer: Printer) => {
    setFormData(printer);
    setIsEditing(true);
    setIsCustomDepreciation(Boolean(printer.customHourlyRate));
  };
  
  const handleCancelEdit = () => {
    setFormData(emptyPrinter);
    setIsEditing(false);
    setIsCustomDepreciation(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.brand) return;

    // Ensure hourlyDepreciation is set
    const purchaseCost = formData.purchaseCost ?? 0;
    const lifespanHours = formData.lifespanHours ?? 3000;
    const computedDep = lifespanHours > 0 ? parseFloat((purchaseCost / lifespanHours).toFixed(4)) : 0;
    
    const printerToSave = {
      ...formData,
      hourlyDepreciation: isCustomDepreciation 
        ? (formData.hourlyDepreciation || 0) 
        : computedDep,
      customHourlyRate: isCustomDepreciation,
    };

    if (isEditing && 'id' in printerToSave) {
      onUpdate(printerToSave as Printer);
    } else {
      onAdd(printerToSave);
    }
    handleCancelEdit();
  };

  const handleSaveAsNewFromTemplate = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim() || !formData.brand.trim()) return;

    const baseName = formData.name.trim();
    const newName = baseName.includes('(Copy)') ? baseName : `${baseName} (Copy)`;
    const purchaseCost = formData.purchaseCost ?? 0;
    const lifespanHours = formData.lifespanHours ?? 3000;
    const computedDep = lifespanHours > 0 ? parseFloat((purchaseCost / lifespanHours).toFixed(4)) : 0;

    const { id: _unusedId, ...restData } = formData as any;
    const newPrinterData: Omit<Printer, 'id'> = {
      ...restData,
      name: newName,
      hourlyDepreciation: isCustomDepreciation 
        ? (formData.hourlyDepreciation || 0) 
        : computedDep,
      customHourlyRate: isCustomDepreciation,
    };

    onAdd(newPrinterData);
    handleCancelEdit();
  };

  const handleUseAsTemplate = (printer: Printer) => {
    const baseName = printer.name;
    const newName = baseName.includes('(Copy)') ? baseName : `${baseName} (Copy)`;
    setFormData({
      ...printer,
      name: newName,
    });
    setIsCustomDepreciation(Boolean(printer.customHourlyRate));
    setIsEditing(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const rates = calculatePrinterRates(formData as Printer);
  const samplePrintHours = 8;
  const sampleCost = (rates.totalHourlyRate * samplePrintHours).toFixed(2);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 pb-12">
      {/* Form Section */}
      <div className="lg:col-span-1 bg-slate-800/60 p-6 rounded-2xl shadow-xl border border-slate-700">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-700 pb-2 mb-4">
          {isEditing ? 'Edit Printer' : 'Add New Printer'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div>
            <label htmlFor="brand" className="block text-sm font-medium text-slate-300 mb-1">
              Printer Brand
            </label>
            <input
              type="text"
              id="brand"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              placeholder="e.g. Bambu Lab, Creality, Prusa"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
              Printer Model / Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. X1-Carbon, K1 Max, MK4"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label htmlFor="watts" className="block text-sm font-medium text-slate-300 mb-1">
              Power Consumption (Watts)
            </label>
            <input
              type="number"
              id="watts"
              name="watts"
              value={formData.watts}
              onChange={handleChange}
              min="0"
              step="1"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
            <p className="text-xs text-slate-400 mt-1">Used for electricity cost calculation.</p>
          </div>

          {/* Depreciation & Use Time Section */}
          <div className="pt-4 border-t border-slate-700 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>⏱️ Machine Use Time & Depreciation</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculate depreciation to recoup the printer purchase price over its operating lifespan.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="purchaseCost" className="block text-xs font-medium text-slate-300 mb-1">
                  Purchase Price ($)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    id="purchaseCost"
                    name="purchaseCost"
                    value={formData.purchaseCost ?? ''}
                    onChange={handleChange}
                    min="0"
                    step="10"
                    placeholder="600"
                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 pl-7 pr-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lifespanHours" className="block text-xs font-medium text-slate-300 mb-1">
                  Expected Lifespan (Hrs)
                </label>
                <input
                  type="number"
                  id="lifespanHours"
                  name="lifespanHours"
                  value={formData.lifespanHours ?? ''}
                  onChange={handleChange}
                  min="100"
                  step="100"
                  placeholder="3000"
                  className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Custom Depreciation Rate Override */}
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Hourly Depreciation:</span>
                <span className="text-sm font-mono font-bold text-cyan-300">
                  ${rates.depreciationPerHour.toFixed(2)}/hr
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Formula: ${(formData.purchaseCost || 0).toFixed(0)} ÷ {(formData.lifespanHours || 3000).toLocaleString()} hrs = ${(rates.depreciationPerHour).toFixed(4)}/hr
              </div>

              <div className="pt-1.5 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="customDepreciationToggle"
                  checked={isCustomDepreciation}
                  onChange={(e) => {
                    setIsCustomDepreciation(e.target.checked);
                    setFormData(prev => ({
                      ...prev,
                      customHourlyRate: e.target.checked,
                    }));
                  }}
                  className="rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 w-3.5 h-3.5"
                />
                <label htmlFor="customDepreciationToggle" className="text-xs text-slate-400 cursor-pointer">
                  Override with manual hourly depreciation
                </label>
              </div>

              {isCustomDepreciation && (
                <div className="pt-2">
                  <label htmlFor="hourlyDepreciation" className="block text-xs font-medium text-slate-300 mb-1">
                    Custom Hourly Depreciation ($/hr)
                  </label>
                  <input
                    type="number"
                    id="hourlyDepreciation"
                    name="hourlyDepreciation"
                    value={formData.hourlyDepreciation ?? ''}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.25"
                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-1.5 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              )}
            </div>

            {/* Maintenance & Usage Rates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="maintenanceCostPerHour" className="block text-xs font-medium text-slate-300 mb-1">
                  Maintenance / Wear ($/hr)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    id="maintenanceCostPerHour"
                    name="maintenanceCostPerHour"
                    value={formData.maintenanceCostPerHour ?? ''}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.15"
                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 pl-7 pr-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Nozzles, belts, lube, sheets</p>
              </div>

              <div>
                <label htmlFor="hourlyUsageFee" className="block text-xs font-medium text-slate-300 mb-1">
                  Machine Usage Fee ($/hr)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    id="hourlyUsageFee"
                    name="hourlyUsageFee"
                    value={formData.hourlyUsageFee ?? ''}
                    onChange={handleChange}
                    min="0"
                    step="0.05"
                    placeholder="0.50"
                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 pl-7 pr-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Equipment markup / hour</p>
              </div>
            </div>

            {/* Live Total Rate Banner */}
            <div className="p-3 bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/30 rounded-xl space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-semibold text-cyan-300">Total Printer Hourly Rate:</span>
                <span className="text-lg font-bold font-mono text-cyan-400">
                  ${rates.totalHourlyRate.toFixed(2)}/hr
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  Depr: ${rates.depreciationPerHour.toFixed(2)}
                </span>
                <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  Maint: ${rates.maintenancePerHour.toFixed(2)}
                </span>
                <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  Usage: ${rates.usageFeePerHour.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                💡 A {samplePrintHours}-hour print on this machine adds <strong>${sampleCost}</strong> for printer use & depreciation.
              </p>
            </div>
          </div>

          {/* Form Actions */}
          {isEditing ? (
            <div className="flex flex-col gap-2 pt-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-3 rounded-lg transition-colors shadow text-xs flex items-center justify-center gap-1.5"
                  title="Update the existing printer configuration"
                >
                  <span>🔄 Update Printer</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsNewFromTemplate}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-lg transition-colors shadow text-xs flex items-center justify-center gap-1.5"
                  title="Create a new printer using this printer as a template"
                >
                  <span>📋 Save as New (from Template)</span>
                </button>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1.5 px-3 rounded-lg transition-colors text-xs"
              >
                Cancel Edit
              </button>
            </div>
          ) : (
            <div className="flex gap-3 pt-3">
              <button
                type="submit"
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-4 rounded-lg transition-colors shadow-md text-sm"
              >
                Add Printer
              </button>
              {Boolean(formData.name || formData.brand) && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-2.5 px-4 rounded-lg transition-colors text-xs"
                >
                  Clear Form
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Saved Printers List */}
      <div className="lg:col-span-2 bg-slate-800/60 p-6 rounded-2xl shadow-xl border border-slate-700">
        <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-6">
          <h2 className="text-2xl font-semibold text-cyan-400">Saved Printers</h2>
          <span className="text-xs bg-slate-700 text-slate-300 font-semibold px-2.5 py-1 rounded-full">
            {printers.length} {printers.length === 1 ? 'Printer' : 'Printers'}
          </span>
        </div>

        {printers.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg">You have no saved printers.</p>
            <p className="text-sm mt-1">Use the form on the left to add your first 3D printer.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {printers.map(printer => {
              const pRates = calculatePrinterRates(printer);
              return (
                <div
                  key={printer.id}
                  className="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-all flex flex-col justify-between shadow-md"
                >
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-xs font-semibold uppercase text-cyan-400 tracking-wider">
                          {printer.brand}
                        </span>
                        <h3 className="text-lg font-bold text-slate-100">
                          {printer.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleUseAsTemplate(printer)}
                          className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 transition-colors"
                          title="Use as Template to create new Printer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(printer)}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-cyan-500/30 text-slate-300 hover:text-cyan-300 transition-colors"
                          title="Edit Printer"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(printer.id)}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-500/30 text-slate-300 hover:text-red-300 transition-colors"
                          title="Delete Printer"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Rates & Specifications */}
                    <div className="mt-3 p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/80 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Total Machine Rate:</span>
                        <span className="text-sm font-bold font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                          ${pRates.totalHourlyRate.toFixed(2)} / hr
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 pt-1 text-[11px] text-slate-400 border-t border-slate-800">
                        <div>
                          <span className="block text-[10px] text-slate-500">Depreciation</span>
                          <span className="font-mono text-slate-300">${pRates.depreciationPerHour.toFixed(2)}/h</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-500">Maintenance</span>
                          <span className="font-mono text-slate-300">${pRates.maintenancePerHour.toFixed(2)}/h</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-500">Usage Fee</span>
                          <span className="font-mono text-slate-300">${pRates.usageFeePerHour.toFixed(2)}/h</span>
                        </div>
                      </div>
                    </div>

                    {/* Printer Hardware Specs */}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span className="bg-slate-700/60 px-2 py-0.5 rounded text-slate-300">
                        ⚡ {printer.watts} Watts
                      </span>
                      {printer.purchaseCost !== undefined && (
                        <span className="bg-slate-700/60 px-2 py-0.5 rounded text-slate-300">
                          💵 ${(printer.purchaseCost).toLocaleString()} Price
                        </span>
                      )}
                      {printer.lifespanHours !== undefined && (
                        <span className="bg-slate-700/60 px-2 py-0.5 rounded text-slate-300">
                          ⏳ {(printer.lifespanHours).toLocaleString()}h Lifespan
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PrinterConfigurationPage;
