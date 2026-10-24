import React, { useState, useEffect } from 'react';
import type { GeneralSettings, MultiColorPricingMode, SimpleMultiColorType } from '../types';
import MarkdownIcon from './icons/MarkdownIcon';
import { APP_VERSION, APP_RELEASE_DATE, APP_CODENAME } from '../constants/version';

interface GeneralConfigurationPageProps {
  settings: GeneralSettings;
  onSave: (newSettings: GeneralSettings) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onExportJobsMarkdown?: () => void;
  onExportOrdersMarkdown?: () => void;
  onExportInvoicesMarkdown?: () => void;
  onExportPartsMarkdown?: () => void;
  onExportVaultZip?: () => void;
  onOpenChangeLogModal?: () => void;
}

const GeneralConfigurationPage: React.FC<GeneralConfigurationPageProps> = ({
  settings,
  onSave,
  onExport,
  onImport,
  onExportJobsMarkdown,
  onExportOrdersMarkdown,
  onExportInvoicesMarkdown,
  onExportPartsMarkdown,
  onExportVaultZip,
  onOpenChangeLogModal,
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
    defaultMultiColorBatchMode: 'single_batch_per_bed',
    enableMaterialDifficultyRates: true,
    materialFailureRates: {
      tpu: 15,
      abs: 18,
      nylon: 20,
      pc: 20,
      carbon: 12,
      standard: 5,
    },
    studioName: '3D Printing Studio',
    studioTagline: 'Custom Additive Manufacturing & Rapid Prototyping',
    studioEmail: 'quotes@3dprintstudio.com',
    studioPhone: '(555) 019-3820',
    studioAddress: '123 Maker Way, Suite 4B',
    studioWebsite: 'www.3dprintstudio.com',
    studioTerms: 'Quotation valid for 30 days. Custom 3D fabricated parts are made to order. 50% deposit required for fabrication to begin.',
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
      defaultMultiColorBatchMode: 'single_batch_per_bed',
      enableMaterialDifficultyRates: true,
      materialFailureRates: {
        tpu: 15,
        abs: 18,
        nylon: 20,
        pc: 20,
        carbon: 12,
        standard: 5,
      },
      studioName: prev.studioName || '3D Printing Studio',
      studioTagline: prev.studioTagline || 'Custom Additive Manufacturing & Rapid Prototyping',
      studioEmail: prev.studioEmail || 'quotes@3dprintstudio.com',
      studioPhone: prev.studioPhone || '(555) 019-3820',
      studioAddress: prev.studioAddress || '123 Maker Way, Suite 4B',
      studioWebsite: prev.studioWebsite || 'www.3dprintstudio.com',
      studioTerms: prev.studioTerms || 'Quotation valid for 30 days. Custom 3D fabricated parts are made to order. 50% deposit required for fabrication to begin.',
      ...settings,
    }));
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Business & Invoice Branding Profile */}
        <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700 space-y-6">
          <div className="border-b border-slate-600 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-2xl font-semibold text-cyan-400 flex items-center gap-2">
                <span>🏢 Business & Invoice Branding Profile</span>
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Customize your studio name, contact info, address, and invoice notes. These will appear on all printed Customer Quotes, Invoices, and Job Checklists.
              </p>
            </div>
            <span className="self-start sm:self-auto text-xs bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 px-3 py-1 rounded-full font-medium whitespace-nowrap">
              Appears on All PDF & Printouts
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="studioName" className="block text-sm font-medium text-slate-300 mb-1">
                Business / Studio Name
              </label>
              <input
                type="text"
                id="studioName"
                name="studioName"
                value={currentSettings.studioName || ''}
                onChange={handleChange}
                placeholder="e.g. Apex 3D Fabrication Studio"
                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label htmlFor="studioTagline" className="block text-sm font-medium text-slate-300 mb-1">
                Tagline / Business Subtitle
              </label>
              <input
                type="text"
                id="studioTagline"
                name="studioTagline"
                value={currentSettings.studioTagline || ''}
                onChange={handleChange}
                placeholder="e.g. Custom Additive Manufacturing & Rapid Prototyping"
                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="studioAddress" className="block text-sm font-medium text-slate-300 mb-1">
                Shop Address / Location
              </label>
              <input
                type="text"
                id="studioAddress"
                name="studioAddress"
                value={currentSettings.studioAddress || ''}
                onChange={handleChange}
                placeholder="e.g. 123 Maker Way, Suite 4B, Austin, TX 78701"
                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <span className="text-xs text-slate-400 mt-1 block">Street address, suite/bay number, city, state and zip code for customer invoices</span>
            </div>

            <div>
              <label htmlFor="studioPhone" className="block text-sm font-medium text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                id="studioPhone"
                name="studioPhone"
                value={currentSettings.studioPhone || ''}
                onChange={handleChange}
                placeholder="e.g. (555) 019-3820"
                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label htmlFor="studioEmail" className="block text-sm font-medium text-slate-300 mb-1">
                Business Contact Email
              </label>
              <input
                type="email"
                id="studioEmail"
                name="studioEmail"
                value={currentSettings.studioEmail || ''}
                onChange={handleChange}
                placeholder="e.g. quotes@3dprintstudio.com"
                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="studioWebsite" className="block text-sm font-medium text-slate-300 mb-1">
                Website / Portfolio Link
              </label>
              <input
                type="text"
                id="studioWebsite"
                name="studioWebsite"
                value={currentSettings.studioWebsite || ''}
                onChange={handleChange}
                placeholder="e.g. www.3dprintstudio.com"
                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="studioTerms" className="block text-sm font-medium text-slate-300 mb-1">
                Default Quote & Invoice Terms / Conditions
              </label>
              <textarea
                id="studioTerms"
                name="studioTerms"
                rows={3}
                value={currentSettings.studioTerms || ''}
                onChange={handleChange}
                placeholder="e.g. Quotation valid for 30 days. Custom 3D fabricated parts are made to order. 50% deposit required for fabrication to begin."
                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 leading-relaxed text-sm"
              />
              <span className="text-xs text-slate-400 mt-1 block">Displayed on customer-facing quotes and invoices above payment instructions</span>
            </div>
          </div>

          {/* Interactive Live Document Header Preview */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span>📄 Live Print & Invoice Header Preview</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-normal">
                  Standard White Paper
                </span>
              </span>
              <span className="text-[11px] text-cyan-400 font-medium">Updates live as you type</span>
            </div>
            
            <div className="bg-white text-slate-900 p-5 rounded-lg border border-slate-300 shadow-sm font-sans select-none">
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
                    {currentSettings.studioName || '3D Printing Studio'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {currentSettings.studioTagline || 'Custom Additive Manufacturing & Rapid Prototyping'}
                  </p>
                  <div className="text-[11px] text-slate-600 pt-1 space-y-0.5">
                    {currentSettings.studioAddress ? (
                      <div>{currentSettings.studioAddress}</div>
                    ) : (
                      <div className="text-slate-400 italic">No shop address specified</div>
                    )}
                    <div className="flex flex-wrap gap-x-3 text-[10px] sm:text-[11px] text-slate-700">
                      {currentSettings.studioPhone && <span>Tel: {currentSettings.studioPhone}</span>}
                      {currentSettings.studioEmail && <span>Email: {currentSettings.studioEmail}</span>}
                      {currentSettings.studioWebsite && <span>Web: {currentSettings.studioWebsite}</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block bg-slate-900 text-white font-black text-[11px] uppercase px-2.5 py-1 rounded tracking-wider">
                    3D PRINT QUOTE
                  </span>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">
                    <div>Ref #: <strong className="text-slate-900">#1024</strong></div>
                    <div>Valid: 30 Days</div>
                  </div>
                </div>
              </div>
              {currentSettings.studioTerms && (
                <div className="mt-2.5 pt-2 text-[10px] text-slate-500 border-t border-dashed border-slate-200">
                  <strong className="text-slate-700">Terms:</strong> {currentSettings.studioTerms}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end items-center gap-4 pt-2">
            {showSuccess && <span className="text-green-400 text-sm font-medium transition-opacity duration-300">Settings saved successfully!</span>}
            <button
              type="submit"
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-5 rounded-lg transition-colors shadow-md text-sm"
            >
              Save Business Profile
            </button>
          </div>
        </div>

        {/* General Print Cost Settings */}
        <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
          <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-6">
            General Cost & Markup Settings
          </h2>
          <p className="text-slate-400 mb-6 text-sm">
            Set your baseline cost parameters here. These values will pre-fill the calculator and determine default rates across all quotes.
          </p>
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

            {/* Default Bed Batching Option for Multi-Color */}
            {multiColorMode !== 'none' && (
              <div className="mt-5 pt-4 border-t border-slate-700/70">
                <label className="block text-sm font-semibold text-slate-200 mb-1 flex items-center gap-2">
                  <span>🖨️ Multi-Color Bed Batching Strategy</span>
                  <span className="text-[11px] bg-cyan-950 text-cyan-300 border border-cyan-800/50 px-2 py-0.5 rounded-full font-normal">
                    Recommended
                  </span>
                </label>
                <p className="text-xs text-slate-400 mb-3">
                  When a print job includes multiple parts or multiple copies, should the multi-color fee be added once for all parts that fit on the same bed, or billed separately per part copy?
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentSettings(prev => ({ ...prev, defaultMultiColorBatchMode: 'single_batch_per_bed' }))}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      (currentSettings.defaultMultiColorBatchMode || 'single_batch_per_bed') === 'single_batch_per_bed'
                        ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/50'
                        : 'bg-slate-900/40 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        <span>📦 Single Batch per Bed</span>
                      </span>
                      {(currentSettings.defaultMultiColorBatchMode || 'single_batch_per_bed') === 'single_batch_per_bed' && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      )}
                    </div>
                    <span className="text-xs text-slate-300 leading-relaxed">
                      Only adds the multicolor fee <strong>once per bed run</strong> when parts fit on one build plate. Slices color changes together for the whole plate.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentSettings(prev => ({ ...prev, defaultMultiColorBatchMode: 'per_copy' }))}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      currentSettings.defaultMultiColorBatchMode === 'per_copy'
                        ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/50'
                        : 'bg-slate-900/40 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        <span>📑 Per Part / Copy</span>
                      </span>
                      {currentSettings.defaultMultiColorBatchMode === 'per_copy' && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      )}
                    </div>
                    <span className="text-xs text-slate-300 leading-relaxed">
                      Multiplies the multicolor fee by each part or copy. Suitable if each item is printed in an independent print run on a clear bed.
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Technical Material Failure Rate Section */}
          <div className="pt-6 border-t border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-amber-400 flex items-center gap-2">
                  <span>⚡ Material Difficulty & Technical Failure Rates</span>
                  <span className="text-xs bg-amber-950 text-amber-300 border border-amber-600/40 px-2 py-0.5 rounded-full font-medium">
                    TPU & ABS Protection
                  </span>
                </h3>
                <p className="text-slate-400 text-sm mt-0.5">
                  Protect profit margins by charging higher failure buffers on materials with higher print failure, warping, or clogging risks.
                </p>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-100 text-sm block">
                  Auto-charge Higher Failure Rate for Difficult Filaments (TPU, ABS, Nylon, PC)
                </span>
                <span className="text-xs text-slate-400">
                  When enabled, quotes using technical filaments automatically apply their respective failure rate buffer instead of the default {currentSettings.failureRate}%.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                <input
                  type="checkbox"
                  name="enableMaterialDifficultyRates"
                  checked={currentSettings.enableMaterialDifficultyRates !== false}
                  onChange={(e) => setCurrentSettings(prev => ({ ...prev, enableMaterialDifficultyRates: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {currentSettings.enableMaterialDifficultyRates !== false && (
              <div className="bg-slate-900/40 p-4 rounded-xl border border-amber-500/30 space-y-4">
                <div className="text-xs text-amber-200/90 bg-amber-950/40 p-3 rounded-lg border border-amber-500/30 leading-relaxed">
                  💡 <strong>Why Technical Failure Buffers?</strong> Flexible filaments (TPU) prone to extruder bunching and stringing, as well as high-temperature engineering plastics (ABS/ASA, Nylon, PC) prone to thermal warping and layer splitting, experience failure rates of 15%–20%. Applying this risk buffer guarantees your business does not absorb the cost of aborted prints.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* TPU / Flexible */}
                  <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                        <span>TPU / TPE (Flexibles)</span>
                      </label>
                      <span className="text-[10px] text-cyan-300 bg-cyan-950 px-1.5 py-0.2 rounded font-semibold border border-cyan-800">
                        Jamming Risk
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={currentSettings.materialFailureRates?.tpu ?? 15}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setCurrentSettings(prev => ({
                            ...prev,
                            materialFailureRates: { ...prev.materialFailureRates, tpu: val },
                          }));
                        }}
                        className="w-full bg-slate-700 border border-slate-600 rounded p-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <span className="text-xs text-slate-400 font-mono">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Recommended: 15%</span>
                  </div>

                  {/* ABS / ASA */}
                  <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
                        <span>ABS / ASA (Engineering)</span>
                      </label>
                      <span className="text-[10px] text-orange-300 bg-orange-950 px-1.5 py-0.2 rounded font-semibold border border-orange-800">
                        Warping Risk
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={currentSettings.materialFailureRates?.abs ?? 18}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setCurrentSettings(prev => ({
                            ...prev,
                            materialFailureRates: { ...prev.materialFailureRates, abs: val },
                          }));
                        }}
                        className="w-full bg-slate-700 border border-slate-600 rounded p-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <span className="text-xs text-slate-400 font-mono">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Recommended: 18%</span>
                  </div>

                  {/* Nylon / PA */}
                  <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                        <span>Nylon / PA (Polyamide)</span>
                      </label>
                      <span className="text-[10px] text-purple-300 bg-purple-950 px-1.5 py-0.2 rounded font-semibold border border-purple-800">
                        Moisture Risk
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={currentSettings.materialFailureRates?.nylon ?? 20}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setCurrentSettings(prev => ({
                            ...prev,
                            materialFailureRates: { ...prev.materialFailureRates, nylon: val },
                          }));
                        }}
                        className="w-full bg-slate-700 border border-slate-600 rounded p-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <span className="text-xs text-slate-400 font-mono">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Recommended: 20%</span>
                  </div>

                  {/* Polycarbonate (PC) */}
                  <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                        <span>Polycarbonate (PC)</span>
                      </label>
                      <span className="text-[10px] text-blue-300 bg-blue-950 px-1.5 py-0.2 rounded font-semibold border border-blue-800">
                        Adhesion Risk
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={currentSettings.materialFailureRates?.pc ?? 20}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setCurrentSettings(prev => ({
                            ...prev,
                            materialFailureRates: { ...prev.materialFailureRates, pc: val },
                          }));
                        }}
                        className="w-full bg-slate-700 border border-slate-600 rounded p-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <span className="text-xs text-slate-400 font-mono">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Recommended: 20%</span>
                  </div>

                  {/* Carbon Fiber / Composites */}
                  <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                        <span>Carbon / Glass Fiber (CF)</span>
                      </label>
                      <span className="text-[10px] text-emerald-300 bg-emerald-950 px-1.5 py-0.2 rounded font-semibold border border-emerald-800">
                        Clogging Risk
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={currentSettings.materialFailureRates?.carbon ?? 12}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setCurrentSettings(prev => ({
                            ...prev,
                            materialFailureRates: { ...prev.materialFailureRates, carbon: val },
                          }));
                        }}
                        className="w-full bg-slate-700 border border-slate-600 rounded p-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <span className="text-xs text-slate-400 font-mono">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Recommended: 12%</span>
                  </div>

                  {/* Standard Base Materials (PLA, PETG) */}
                  <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                        <span>PLA / PETG (Standard)</span>
                      </label>
                      <span className="text-[10px] text-slate-300 bg-slate-900 px-1.5 py-0.2 rounded font-semibold border border-slate-700">
                        Base Rate
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={currentSettings.failureRate}
                        onChange={handleChange}
                        name="failureRate"
                        className="w-full bg-slate-700 border border-slate-600 rounded p-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <span className="text-xs text-slate-400 font-mono">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Global Base Rate</span>
                  </div>
                </div>
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
        </div>
      </form>
      
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
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
          {onExportInvoicesMarkdown && (
            <button
              onClick={onExportInvoicesMarkdown}
              className="flex items-center justify-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-white font-semibold py-2.5 px-3 rounded-lg transition-colors shadow-sm text-xs"
              title="Export all client invoices with line items linked to parts/ (.md)"
            >
              <span className="text-sm">🧾</span>
              <span>Export Invoices (.md)</span>
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
              title="Download entire interconnected Obsidian vault (.zip) with parts/, jobs/, orders/, and invoices/ folders"
            >
              <span>📦 Download Vault (.zip)</span>
            </button>
          )}
        </div>
      </div>

      {/* About & Release Version History Card */}
      <div className="bg-slate-800/60 p-6 rounded-2xl shadow-lg border border-slate-700/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-xl shadow-xs">
              🏷️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100">About & Version History</h3>
                <span className="font-mono text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/50 px-2 py-0.5 rounded-full">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Released {APP_RELEASE_DATE} &bull; Codename: <strong className="text-slate-200">{APP_CODENAME}</strong>
              </p>
            </div>
          </div>

          {onOpenChangeLogModal && (
            <button
              type="button"
              onClick={onOpenChangeLogModal}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-3.5 rounded-xl transition-all shadow-md text-xs flex items-center gap-2 cursor-pointer"
            >
              <span>📜 View Full Change Log</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5 font-medium">Current Build:</span>
            <span className="text-cyan-300 font-mono font-bold text-sm">v{APP_VERSION}</span>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5 font-medium">Release Date:</span>
            <span className="text-slate-200 font-medium text-sm">{APP_RELEASE_DATE}</span>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5 font-medium">Changelog Entries:</span>
            <span className="text-emerald-400 font-bold text-sm">7 Releases Documented</span>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          The 3D Print Cost &amp; Quote Tracker provides precision pricing, multi-part manufacturing quotes, equipment depreciation budgeting, digital scale inventory tracking, and seamless Obsidian markdown / Google Sheets integration.
        </p>
      </div>
    </div>
  );
};

export default GeneralConfigurationPage;
