import React, { useState, useEffect } from 'react';
import type { GeneralSettings } from '../types';

interface GeneralConfigurationPageProps {
  settings: GeneralSettings;
  onSave: (newSettings: GeneralSettings) => void;
}

const GeneralConfigurationPage: React.FC<GeneralConfigurationPageProps> = ({ settings, onSave }) => {
  const [currentSettings, setCurrentSettings] = useState<GeneralSettings>(settings);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentSettings(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(currentSettings);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };
  
  return (
    <div className="mt-8 max-w-2xl mx-auto">
      <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-6">
          General Cost Settings
        </h2>
        <p className="text-slate-400 mb-6 text-sm">
          Set your default cost parameters here. These values will pre-fill the calculator but can be overridden for individual quotes.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="electricityCostKwh" className="block text-sm font-medium text-slate-300 mb-1">Electricity Cost ($ / kWh)</label>
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
            <label htmlFor="laborCostPerHour" className="block text-sm font-medium text-slate-300 mb-1">Labor Cost per Hour ($ / hour)</label>
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
            <label htmlFor="failureRate" className="block text-sm font-medium text-slate-300 mb-1">Default Failure Rate (%)</label>
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
            <label htmlFor="profitMargin" className="block text-sm font-medium text-slate-300 mb-1">Default Profit Margin (%)</label>
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
          <div className="flex justify-end items-center gap-4 pt-2">
            {showSuccess && <span className="text-green-400 text-sm transition-opacity duration-300">Settings saved!</span>}
            <button
              type="submit"
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GeneralConfigurationPage;
