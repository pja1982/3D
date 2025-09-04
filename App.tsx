import React, { useState, useMemo, useCallback } from 'react';
import { PrintParameters, CostBreakdown, Filament, Printer, GeneralSettings, Quote, QuoteStatus } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import Header from './components/Header';
import CalculatorForm from './components/CalculatorForm';
import CostBreakdownDisplay from './components/CostBreakdownDisplay';
import Nav from './components/Nav';
import ConfigurationPage from './components/ConfigurationPage';
import PrinterConfigurationPage from './components/PrinterConfigurationPage';
import GeneralConfigurationPage from './components/GeneralConfigurationPage';
import JobsPage from './components/JobsPage';

type View = 'calculator' | 'jobs' | 'filaments' | 'printers' | 'settings';

const DEFAULT_FILAMENTS: Filament[] = [
  { id: 'pla-default', name: 'Standard PLA', brand: 'Generic', costPerKg: 20 },
  { id: 'petg-default', name: 'Standard PETG', brand: 'Generic', costPerKg: 25 },
  { id: 'abs-default', name: 'Standard ABS', brand: 'Generic', costPerKg: 22 },
];

const DEFAULT_PRINTERS: Printer[] = [
  { id: 'ender3-default', name: 'Ender 3', brand: 'Creality', watts: 150 },
  { id: 'prusa-mk3s-default', name: 'MK3S+', brand: 'Prusa', watts: 120 },
];

const DEFAULT_SETTINGS: GeneralSettings = {
  electricityCostKwh: 0.15,
  laborCostPerHour: 25,
  failureRate: 5,
  profitMargin: 30,
};

function App() {
  const [view, setView] = useState<View>('calculator');
  const [filaments, setFilaments] = useLocalStorage<Filament[]>('filaments', DEFAULT_FILAMENTS);
  const [printers, setPrinters] = useLocalStorage<Printer[]>('printers', DEFAULT_PRINTERS);
  const [generalSettings, setGeneralSettings] = useLocalStorage<GeneralSettings>('generalSettings', DEFAULT_SETTINGS);
  const [quotes, setQuotes] = useLocalStorage<Quote[]>('quotes', []);
  
  const initialParameters: PrintParameters = {
    filamentGrams: 100,
    filamentId: filaments.length > 0 ? filaments[0].id : null,
    printHours: 5,
    printerId: printers.length > 0 ? printers[0].id : null,
    postProcessingHours: 0.5,
    hardwareCost: 0,
    ...generalSettings,
  };

  const [parameters, setParameters] = useState<PrintParameters>(initialParameters);

  const selectedFilament = useMemo(() => {
    return filaments.find(f => f.id === parameters.filamentId) || null;
  }, [filaments, parameters.filamentId]);
  
  const selectedPrinter = useMemo(() => {
    return printers.find(p => p.id === parameters.printerId) || null;
  }, [printers, parameters.printerId]);

  const costBreakdown = useMemo<CostBreakdown & { quotePrice: number }>(() => {
    const costPerKg = selectedFilament?.costPerKg || 0;
    const printerWatts = selectedPrinter?.watts || 0;

    const filamentCost = (parameters.filamentGrams / 1000) * costPerKg;
    const electricityCost = (parameters.printHours * (printerWatts / 1000)) * parameters.electricityCostKwh;
    const laborCost = parameters.postProcessingHours * parameters.laborCostPerHour;
    const hardwareCost = parameters.hardwareCost;
    
    const subtotal = filamentCost + electricityCost + laborCost + hardwareCost;
    const costWithFailureRate = subtotal / (1 - (parameters.failureRate / 100));
    const profit = costWithFailureRate * (parameters.profitMargin / 100);
    const quotePrice = costWithFailureRate + profit;

    return {
      filamentCost,
      electricityCost,
      laborCost,
      hardwareCost,
      subtotal,
      costWithFailureRate,
      profit,
      quotePrice,
    };
  }, [parameters, selectedFilament, selectedPrinter]);

  // Quote Handlers
  const handleSaveQuote = useCallback((jobName: string, customerName: string, finalQuotePrice: number) => {
    const maxJobNumber = quotes.reduce((max, q) => Math.max(max, q.jobNumber), 0);
    const newQuote: Quote = {
      id: new Date().toISOString(),
      jobNumber: maxJobNumber + 1,
      jobName,
      customerName,
      createdAt: new Date().toISOString(),
      quotePrice: finalQuotePrice,
      status: QuoteStatus.Pending,
    };
    setQuotes(prev => [...prev, newQuote].sort((a, b) => b.jobNumber - a.jobNumber));
    setView('jobs');
  }, [quotes, setQuotes]);

  const handleDeleteQuote = (id: string) => {
    setQuotes(prev => prev.filter(q => q.id !== id));
  };

  const handleUpdateQuoteStatus = (id: string, status: QuoteStatus) => {
    setQuotes(prev => prev.map(q => (q.id === id ? { ...q, status } : q)));
  };


  // Filament Handlers
  const handleAddFilament = (filament: Omit<Filament, 'id'>) => {
    const newFilament = { ...filament, id: new Date().toISOString() };
    setFilaments(prev => [...prev, newFilament]);
  };
  const handleUpdateFilament = (updatedFilament: Filament) => {
    setFilaments(prev => prev.map(m => m.id === updatedFilament.id ? updatedFilament : m));
  };
  const handleDeleteFilament = (id: string) => {
    setFilaments(prev => prev.filter(m => m.id !== id));
    if (parameters.filamentId === id) {
      setParameters(p => ({ ...p, filamentId: filaments.length > 1 ? filaments.find(m => m.id !== id)?.id || null : null }));
    }
  };

  // Printer Handlers
  const handleAddPrinter = (printer: Omit<Printer, 'id'>) => {
    const newPrinter = { ...printer, id: new Date().toISOString() };
    setPrinters(prev => [...prev, newPrinter]);
  };
  const handleUpdatePrinter = (updatedPrinter: Printer) => {
    setPrinters(prev => prev.map(p => p.id === updatedPrinter.id ? updatedPrinter : p));
  };
  const handleDeletePrinter = (id: string) => {
    setPrinters(prev => prev.filter(p => p.id !== id));
    if (parameters.printerId === id) {
      setParameters(p => ({ ...p, printerId: printers.length > 1 ? printers.find(p => p.id !== id)?.id || null : null }));
    }
  };

  // Settings Handler
  const handleSaveSettings = (newSettings: GeneralSettings) => {
    setGeneralSettings(newSettings);
    // Update current calculator parameters with new defaults if they haven't been changed
    setParameters(p => ({
      ...p,
      electricityCostKwh: newSettings.electricityCostKwh,
      laborCostPerHour: newSettings.laborCostPerHour,
      failureRate: newSettings.failureRate,
      profitMargin: newSettings.profitMargin,
    }));
  };

  const renderContent = () => {
    switch(view) {
      case 'calculator':
        return (
          <main className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-8">
            <div className="lg:col-span-2 bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
              <CalculatorForm 
                parameters={parameters} 
                setParameters={setParameters}
                filaments={filaments}
                printers={printers}
              />
            </div>
            <div className="lg:col-span-3">
              <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
                <CostBreakdownDisplay
                  costBreakdown={costBreakdown}
                  quotePrice={costBreakdown.quotePrice}
                  onSaveQuote={handleSaveQuote}
                />
              </div>
            </div>
          </main>
        );
      case 'jobs':
        return (
          <JobsPage 
            quotes={quotes}
            onDelete={handleDeleteQuote}
            onUpdateStatus={handleUpdateQuoteStatus}
          />
        );
      case 'filaments':
        return (
          <ConfigurationPage 
            filaments={filaments}
            onAdd={handleAddFilament}
            onUpdate={handleUpdateFilament}
            onDelete={handleDeleteFilament}
          />
        );
      case 'printers':
        return (
           <PrinterConfigurationPage
            printers={printers}
            onAdd={handleAddPrinter}
            onUpdate={handleUpdatePrinter}
            onDelete={handleDeletePrinter}
          />
        );
      case 'settings':
        return (
          <GeneralConfigurationPage 
            settings={generalSettings}
            onSave={handleSaveSettings}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Header />
        <Nav currentView={view} onViewChange={setView} />
        {renderContent()}
      </div>
    </div>
  );
}

export default App;