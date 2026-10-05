import React, { useState, useEffect } from 'react';
import type { GeneralSettings, MultiColorPricingMode, SimpleMultiColorType } from '../types';
import MarkdownIcon from './icons/MarkdownIcon';

interface GeneralConfigurationPageProps {
  settings: GeneralSettings;
  onSave: (newSettings: GeneralSettings) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onExportJobsMarkdown?: () => void;
  onExportOrdersMarkdown?: () => void;
  onExportPartsMarkdown?: () => void;
  onExportVaultZip?: () => void;
}

const GeneralConfigurationPage: React.FC<GeneralConfigurationPageProps> = ({
  settings,
  onSave,
  onExport,
  onImport,
  onExportJobsMarkdown,
  onExportOrdersMarkdown,
  onExportPartsMarkdown,
  onExportVaultZip,
}) => {
  const [currentSettings, setCurrentSettings] = useState<GeneralSettings>(() => ({
    enablePrinterDepreciation: true,
    defaultPrinterHourlyRate: 0.50,
    defaultPrinterLifespanHours: 3000,
    defaultMaintenanceCostPerHour: 0.15,
    defaultHourlyUsageFee: 0.50,
    multiColorPricingMode: 'simple',
    simpleMultiColorType: 'per_additional_color',
    simpleMultiColorFee: 3.00,
    complexSpoolSetupFee: 2.50,
    complexPurgeWastePercent: 15,
    complexCostPerColorChange: 0.05,
    complexHandlingFee: 4.00,
    ...settings,
  }));
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setCurrentSettings(prev => ({
      enablePrinterDepreciation: true,
      defaultPrinterHourlyRate: 0.50,
      defaultPrinterLifespanHours: 3000,
      defaultMaintenanceCostPerHour: 0.15,
      defaultHourlyUsageFee: 0.50,
      multiColorPricingMode: 'simple',
      simpleMultiColorType: 'per_additional_color',
      simpleMultiColorFee: 3.00,
      complexSpoolSetupFee: 2.50,
      complexPurgeWastePercent: 15,
      complexCostPerColorChange: 0.05,
      complexHandlingFee: 4.00,
      ...settings,
    }));
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setCurrentSettings(prev => ({
        ...prev,
        [name]: checked,
      }));
      return;
    }

    setCurrentSettings(prev => ({
      ...prev,
      [name]: type === 'number' ? (parseFloat(value) || 0) : value,
    }));
  };

  const handlePricingModeChange = (mode: MultiColorPricingMode) => {
    setCurrentSettings(prev => ({
      ...prev,
      multiColorPricingMode: mode,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(currentSettings);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  };

  const multiColorMode = currentSettings.multiColorPricingMode || 'simple';
  const isDepreciationEnabled = currentSettings.enablePrinterDepreciation !== false;

  return (
    <div className="mt-8 max-w-3xl mx-auto space-y-8 pb-12">
      {/* General Print Cost Settings */}
      <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-6">
          General Cost & Markup Settings
        </h2>
        <p className="text-slate-400 mb-6 text-sm">
          Set your baseline cost parameters here. These values will pre-fill the calculator and determine default rates across all quotes.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="electricityCostKwh" className="block text-sm font-medium text-slate-300 mb-1">
                Electricity Cost ($ / kWh)
              </label>
              <input
                type="number"
                id="electricityCostKwh"
                name="electricityCostKwh"
                value={currentSettings.electricityCostKwh}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
            <div>
              <label htmlFor="laborCostPerHour" className="block text-sm font-medium text-slate-300 mb-1">
                Labor Cost per Hour ($ / hour)
              </label>
              <input
                type="number"
                id="laborCostPerHour"
                name="laborCostPerHour"
                value={currentSettings.laborCostPerHour}
                onChange={handleChange}
                min="0"
                step="1"
                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
            <div>
              <label htmlFor="failureRate" className="block text-sm font-medium text-slate-300 mb-1">
                Default Failure Rate (%)
              </label>
              <input
                type="number"
                id="failureRate"
                name="failureRate"
                value={currentSettings.failureRate}
                onChange={handleChange}
                min="0"
                step="1"
                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
            <div>
              <label htmlFor="profitMargin" className="block text-sm font-medium text-slate-300 mb-1">
                Default Profit Margin (%)
              </label>
              <input
                type="number"
                id="profitMargin"
                name="profitMargin"
                value={currentSettings.profitMargin}
                onChange={handleChange}
                min="0"
                step="1"
                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
          </div>

          {/* Printer Use Time & Depreciation Settings */}
          <div className="pt-6 border-t border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-cyan-400 flex items-center gap-2">
                  <span>⏱️ Printer Use Time & Depreciation Settings</span>
                </h3>
                <p className="text-slate-400 text-sm mt-0.5">
                  Account for machine wear-and-tear, maintenance, and capital replacement during print hours.
                </p>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-100 text-sm block">
                  Include Printer Use Time & Depreciation in Quotes
                </span>
                <span className="text-xs text-slate-400">
                  When enabled, quotes calculate machine cost based on printer purchase price, operating lifespan, maintenance, and usage fees.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                <input
                  type="checkbox"
                  name="enablePrinterDepreciation"
                  checked={isDepreciationEnabled}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            {isDepreciationEnabled && (
              <div className="bg-slate-900/40 border border-slate-700/80 rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="defaultPrinterHourlyRate" className="block text-sm font-medium text-slate-300 mb-1">
                      Fallback Machine Hourly Rate ($ / hr)
                    </label>
                    <input
                      type="number"
                      id="defaultPrinterHourlyRate"
                      name="defaultPrinterHourlyRate"
                      value={currentSettings.defaultPrinterHourlyRate ?? 0.50}
                      onChange={handleChange}
                      min="0"
                      step="0.05"
                      className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <span className="text-xs text-slate-400 mt-1 block">
                      Used when a printer does not have custom depreciation or purchase cost configured.
                    </span>
                  </div>

                  <div>
                    <label htmlFor="defaultPrinterLifespanHours" className="block text-sm font-medium text-slate-300 mb-1">
                      Default Expected Lifespan (Print Hours)
                    </label>
                    <input
                      type="number"
                      id="defaultPrinterLifespanHours"
                      name="defaultPrinterLifespanHours"
                      value={currentSettings.defaultPrinterLifespanHours ?? 3000}
                      onChange={handleChange}
                      min="100"
                      step="500"
                      className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <span className="text-xs text-slate-400 mt-1 block">
                      Default lifespan suggestion for new printers added to the system (typically 2,000–5,000 hrs).
                    </span>
                  </div>

                  <div>
                    <label htmlFor="defaultMaintenanceCostPerHour" className="block text-sm font-medium text-slate-300 mb-1">
                      Default Maintenance Cost ($ / hr)
                    </label>
                    <input
                      type="number"
                      id="defaultMaintenanceCostPerHour"
                      name="defaultMaintenanceCostPerHour"
                      value={currentSettings.defaultMaintenanceCostPerHour ?? 0.15}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <span className="text-xs text-slate-400 mt-1 block">
                      Routine replacement parts (nozzles, PTFE tubes, heatbeds, belts, grease).
                    </span>
                  </div>

                  <div>
                    <label htmlFor="defaultHourlyUsageFee" className="block text-sm font-medium text-slate-300 mb-1">
                      Default Machine Usage Fee ($ / hr)
                    </label>
                    <input
                      type="number"
                      id="defaultHourlyUsageFee"
                      name="defaultHourlyUsageFee"
                      value={currentSettings.defaultHourlyUsageFee ?? 0.50}
                      onChange={handleChange}
                      min="0"
                      step="0.05"
                      className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <span className="text-xs text-slate-400 mt-1 block">
                      Machine allocation & runtime charge per hour of print bed occupancy.
                    </span>
                  </div>
                </div>

                <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700 text-xs text-slate-300 space-y-1.5">
                  <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                    <span>💡 How Depreciation & Machine Time are Calculated:</span>
                  </div>
                  <p>
                    <strong>1. Hourly Depreciation Rate:</strong> <em>Purchase Cost ÷ Expected Lifespan Hours</em> (e.g. $600 ÷ 3,000 hrs = $0.20/hr).
                  </p>
                  <p>
                    <strong>2. Total Printer Hourly Rate:</strong> <em>Depreciation ($/hr) + Maintenance ($/hr) + Machine Usage Fee ($/hr)</em>.
                  </p>
                  <p>
                    <strong>3. Quote Cost:</strong> <em>Print Hours × Printer Hourly Rate × Part Quantity</em>.
                  </p>
                  <p className="text-slate-400 pt-1 border-t border-slate-700/60">
                    Each printer can also specify its own exact purchase price, lifespan, and hourly rate under the <strong>Printers</strong> tab.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Multi-Color Print Extra Fee Settings */}
          <div className="pt-6 border-t border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold text-cyan-400 flex items-center gap-2">
                <span>🎨 Multi-Color Prints Extra Fees</span>
              </h3>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Configure how extra fees, purge waste, and spool changes are billed when a job uses multiple color filaments.
            </p>

            {/* Pricing Mode Selector */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900/60 rounded-xl border border-slate-700 mb-6">
              <button
                type="button"
                onClick={() => handlePricingModeChange('none')}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  multiColorMode === 'none'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                No Extra Fee
              </button>
              <button
                type="button"
                onClick={() => handlePricingModeChange('simple')}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  multiColorMode === 'simple'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Simple Option
              </button>
              <button
                type="button"
                onClick={() => handlePricingModeChange('complex')}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  multiColorMode === 'complex'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Complex Option
              </button>
            </div>

            {/* Simple Option Form */}
            {multiColorMode === 'simple' && (
              <div className="bg-slate-900/40 border border-cyan-500/30 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-cyan-300 text-sm uppercase tracking-wider">
                    Simple Multi-Color Pricing
                  </h4>
                  <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    Recommended for straightforward pricing
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="simpleMultiColorType" className="block text-sm font-medium text-slate-300 mb-1">
                      Fee Calculation Method
                    </label>
                    <select
                      id="simpleMultiColorType"
                      name="simpleMultiColorType"
                      value={currentSettings.simpleMultiColorType || 'per_additional_color'}
                      onChange={handleChange}
                      className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="per_additional_color">Fee per Additional Color (beyond 1st)</option>
                      <option value="flat_per_part">Flat Extra Fee per Multi-Color Part</option>
                      <option value="percentage">Percentage Surcharge on Filament Cost (%)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="simpleMultiColorFee" className="block text-sm font-medium text-slate-300 mb-1">
                      {currentSettings.simpleMultiColorType === 'percentage'
                        ? 'Surcharge Rate (%)'
                        : currentSettings.simpleMultiColorType === 'flat_per_part'
                        ? 'Flat Multi-Color Fee ($)'
                        : 'Fee per Extra Color ($)'}
                    </label>
                    <input
                      type="number"
                      id="simpleMultiColorFee"
                      name="simpleMultiColorFee"
                      value={currentSettings.simpleMultiColorFee ?? 3.00}
                      onChange={handleChange}
                      min="0"
                      step={currentSettings.simpleMultiColorType === 'percentage' ? '1' : '0.50'}
                      className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      required
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-400 bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
                  {currentSettings.simpleMultiColorType === 'per_additional_color' && (
                    <>
                      💡 <strong>Example:</strong> A 4-color print has 3 additional colors. At ${Number(currentSettings.simpleMultiColorFee ?? 3).toFixed(2)} each, an extra fee of <strong>${(3 * Number(currentSettings.simpleMultiColorFee ?? 3)).toFixed(2)}</strong> is added.
                    </>
                  )}
                  {currentSettings.simpleMultiColorType === 'flat_per_part' && (
                    <>
                      💡 <strong>Example:</strong> Any print using 2 or more filament colors receives a fixed flat surcharge of <strong>${Number(currentSettings.simpleMultiColorFee ?? 5).toFixed(2)}</strong>.
                    </>
                  )}
                  {currentSettings.simpleMultiColorType === 'percentage' && (
                    <>
                      💡 <strong>Example:</strong> Adds a <strong>{currentSettings.simpleMultiColorFee ?? 15}%</strong> surcharge on top of the calculated filament material cost to cover color switching overhead.
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Complex Option Form */}
            {multiColorMode === 'complex' && (
              <div className="bg-slate-900/40 border border-purple-500/30 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-purple-300 text-sm uppercase tracking-wider">
                    Complex Multi-Color Pricing (AMS / Multi-Material)
                  </h4>
                  <span className="text-xs text-purple-300/80 bg-purple-900/30 px-2 py-0.5 rounded border border-purple-700/40">
                    Detailed Purge, Spool & Swap Accounting
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="complexSpoolSetupFee" className="block text-sm font-medium text-slate-300 mb-1">
                      Spool Setup Fee ($ per color spool)
                    </label>
                    <input
                      type="number"
                      id="complexSpoolSetupFee"
                      name="complexSpoolSetupFee"
                      value={currentSettings.complexSpoolSetupFee ?? 2.50}
                      onChange={handleChange}
                      min="0"
                      step="0.50"
                      className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-xs text-slate-400 mt-0.5 block">Fee for loading, drying, and slotting each spool</span>
                  </div>

                  <div>
                    <label htmlFor="complexPurgeWastePercent" className="block text-sm font-medium text-slate-300 mb-1">
                      Purge Tower / Waste Buffer (% of filament cost)
                    </label>
                    <input
                      type="number"
                      id="complexPurgeWastePercent"
                      name="complexPurgeWastePercent"
                      value={currentSettings.complexPurgeWastePercent ?? 15}
                      onChange={handleChange}
                      min="0"
                      step="1"
                      className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-xs text-slate-400 mt-0.5 block">Accounts for purge blocks, poop chute & flush volumes</span>
                  </div>

                  <div>
                    <label htmlFor="complexCostPerColorChange" className="block text-sm font-medium text-slate-300 mb-1">
                      Cost per Color Swap / Change ($)
                    </label>
                    <input
                      type="number"
                      id="complexCostPerColorChange"
                      name="complexCostPerColorChange"
                      value={currentSettings.complexCostPerColorChange ?? 0.05}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-xs text-slate-400 mt-0.5 block">Billed per filament change cycle during print</span>
                  </div>

                  <div>
                    <label htmlFor="complexHandlingFee" className="block text-sm font-medium text-slate-300 mb-1">
                      Multi-Color Handling / Labor Fee ($)
                    </label>
                    <input
                      type="number"
                      id="complexHandlingFee"
                      name="complexHandlingFee"
                      value={currentSettings.complexHandlingFee ?? 4.00}
                      onChange={handleChange}
                      min="0"
                      step="0.50"
                      className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-xs text-slate-400 mt-0.5 block">Extra prep, slicing inspection, and waste clearing</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
                  ⚙️ <strong>Complex Formula:</strong> Total Multi-Color Fee = <em>(Colors × Spool Setup) + (Material Cost × Purge %) + (Swaps × Cost/Swap) + Handling Fee</em>.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-700">
            {showSuccess && <span className="text-green-400 text-sm font-medium transition-opacity duration-300">Settings saved successfully!</span>}
            <button
              type="submit"
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-md"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
      
      {/* Backup and Restore */}
      <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-6">
          Data Management
        </h2>
        <p className="text-slate-400 mb-6 text-sm">
          Backup all your data to a JSON file, or restore it from a previous backup. This will overwrite existing data.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onExport}
            className="flex-1 text-center bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Export All Data (JSON)
          </button>
          
          <label className="flex-1 text-center bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer">
            Import Data from JSON
            <input
              type="file"
              className="hidden"
              accept=".json,application/json"
              onChange={handleFileChange}
            />
          </label>
        </div>
      </div>

      {/* Obsidian Markdown Export for Record-Keeping */}
      <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-600 pb-2">
          <MarkdownIcon className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-semibold text-purple-400">
            Obsidian Markdown Export
          </h2>
        </div>
        <p className="text-slate-400 text-sm">
          Export your 3D printing jobs, orders, and parts catalog formatted as rich Markdown notes complete with YAML frontmatter, wiki-links to the <code className="text-purple-300 font-mono bg-purple-950/60 px-1 py-0.5 rounded">parts/</code> directory, callouts, and checklists ready to open in Obsidian or any Markdown note-taking app.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {onExportJobsMarkdown && (
            <button
              onClick={onExportJobsMarkdown}
              className="flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-600 text-white font-semibold py-2.5 px-3 rounded-lg transition-colors shadow-sm text-xs"
              title="Export all saved jobs as an Obsidian-ready Markdown note (.md)"
            >
              <MarkdownIcon className="w-4 h-4" />
              <span>Export Jobs (.md)</span>
            </button>
          )}
          {onExportOrdersMarkdown && (
            <button
              onClick={onExportOrdersMarkdown}
              className="flex items-center justify-center gap-2 bg-purple-800 hover:bg-purple-700 text-white font-semibold py-2.5 px-3 rounded-lg transition-colors shadow-sm text-xs"
              title="Export all active orders as an Obsidian-ready Markdown note (.md)"
            >
              <MarkdownIcon className="w-4 h-4" />
              <span>Export Orders (.md)</span>
            </button>
          )}
          {onExportPartsMarkdown && (
            <button
              onClick={onExportPartsMarkdown}
              className="flex items-center justify-center gap-2 bg-purple-900 hover:bg-purple-800 text-purple-200 border border-purple-700 hover:text-white font-semibold py-2.5 px-3 rounded-lg transition-colors shadow-sm text-xs"
              title="Export all parts catalog models into the Obsidian parts/ directory (.md)"
            >
              <MarkdownIcon className="w-4 h-4" />
              <span>Export Parts (.md)</span>
            </button>
          )}
          {onExportVaultZip && (
            <button
              onClick={onExportVaultZip}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-bold py-2.5 px-3 rounded-lg transition-all shadow-md text-xs ring-1 ring-purple-400/40"
              title="Download entire interconnected Obsidian vault (.zip) with parts/, jobs/, and orders/ folders"
            >
              <span>📦 Download Vault (.zip)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneralConfigurationPage;
