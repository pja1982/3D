import React, { useState, useMemo, useCallback } from 'react';
import { PrintParameters, CostBreakdown, Filament, Printer, GeneralSettings, Quote, QuoteStatus, AppData, Part, Order, OrderStatus, QuotePartConfig } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import Header from './components/Header';
import CalculatorForm from './components/CalculatorForm';
import CostBreakdownDisplay from './components/CostBreakdownDisplay';
import Nav from './components/Nav';
import ConfigurationPage from './components/ConfigurationPage';
import PrinterConfigurationPage from './components/PrinterConfigurationPage';
import GeneralConfigurationPage from './components/GeneralConfigurationPage';
import JobsPage from './components/JobsPage';
import PartsPage from './components/PartsPage';
import OrdersPage from './components/OrdersPage';

type View = 'calculator' | 'jobs' | 'orders' | 'parts' | 'filaments' | 'printers' | 'settings';

const DEFAULT_FILAMENTS: Filament[] = [
  { id: 'pla-default', name: 'Standard PLA', brand: 'Generic', costPerKg: 20 },
  { id: 'petg-default', name: 'Standard PETG', brand: 'Generic', costPerKg: 25 },
  { id: 'abs-default', name: 'Standard ABS', brand: 'Generic', costPerKg: 22 },
];

const DEFAULT_PRINTERS: Printer[] = [
  { id: 'creality-k1-default', name: 'K1', brand: 'Creality', watts: 350 },
  { id: 'anycubic-k3-combo-default', name: 'K3 Combo', brand: 'Anycubic', watts: 150 },
];

const DEFAULT_SETTINGS: GeneralSettings = {
  electricityCostKwh: 0.32,
  laborCostPerHour: 25,
  failureRate: 5,
  profitMargin: 30,
};

const DEFAULT_APP_DATA: AppData = {
  filaments: DEFAULT_FILAMENTS,
  printers: DEFAULT_PRINTERS,
  generalSettings: DEFAULT_SETTINGS,
  quotes: [],
  parts: [],
  orders: [],
};


function App() {
  const [view, setView] = useState<View>('calculator');
  const [appData, setAppData] = useLocalStorage<AppData>('appData', DEFAULT_APP_DATA);
  const { filaments, printers, generalSettings, quotes, parts, orders } = appData;

  const [quoteParts, setQuoteParts] = useState<QuotePartConfig[]>(() => {
    const initialFilamentId = filaments.length > 0 ? filaments[0].id : null;
    const initialPrinterId = printers.length > 0 ? printers[0].id : null;
    return [
      {
        id: 'part-1',
        name: 'Part 1',
        quantity: 1,
        filamentGrams: 100,
        filamentId: initialFilamentId,
        printHours: 5,
        printerId: initialPrinterId,
        postProcessingHours: 0.5,
        hardwareCost: 0,
      }
    ];
  });
  const [activePartId, setActivePartId] = useState<string>('part-1');

  const activePart = useMemo(() => {
    return quoteParts.find(p => p.id === activePartId) || quoteParts[0] || {
      id: 'part-1',
      name: 'Part 1',
      quantity: 1,
      filamentGrams: 100,
      filamentId: filaments.length > 0 ? filaments[0].id : null,
      printHours: 5,
      printerId: printers.length > 0 ? printers[0].id : null,
      postProcessingHours: 0.5,
      hardwareCost: 0,
    };
  }, [quoteParts, activePartId, filaments, printers]);

  const parameters = useMemo<PrintParameters>(() => {
    return {
      filamentGrams: activePart.filamentGrams,
      filamentId: activePart.filamentId,
      printHours: activePart.printHours,
      printerId: activePart.printerId,
      postProcessingHours: activePart.postProcessingHours,
      hardwareCost: activePart.hardwareCost,
      ...generalSettings,
    };
  }, [activePart, generalSettings]);

  const setParameters = useCallback((value: React.SetStateAction<PrintParameters>) => {
    setQuoteParts(prev => {
      return prev.map(p => {
        if (p.id === activePartId) {
          const currentParams: PrintParameters = {
            filamentGrams: p.filamentGrams,
            filamentId: p.filamentId,
            printHours: p.printHours,
            printerId: p.printerId,
            postProcessingHours: p.postProcessingHours,
            hardwareCost: p.hardwareCost,
            ...generalSettings,
          };
          const nextParams = typeof value === 'function' ? value(currentParams) : value;
          return {
            ...p,
            filamentGrams: nextParams.filamentGrams,
            filamentId: nextParams.filamentId,
            printHours: nextParams.printHours,
            printerId: nextParams.printerId,
            postProcessingHours: nextParams.postProcessingHours,
            hardwareCost: nextParams.hardwareCost,
          };
        }
        return p;
      });
    });
  }, [activePartId, generalSettings]);

  const partsBreakdowns = useMemo(() => {
    return quoteParts.map(part => {
      const filament = filaments.find(f => f.id === part.filamentId) || null;
      const printer = printers.find(p => p.id === part.printerId) || null;

      const costPerKg = filament?.costPerKg || 0;
      const printerWatts = printer?.watts || 0;

      const filamentCost = (part.filamentGrams / 1000) * costPerKg * part.quantity;
      const electricityCost = (part.printHours * (printerWatts / 1000)) * generalSettings.electricityCostKwh * part.quantity;
      const laborCost = part.postProcessingHours * generalSettings.laborCostPerHour * part.quantity;
      const hardwareCost = part.hardwareCost * part.quantity;
      
      const subtotal = filamentCost + electricityCost + laborCost + hardwareCost;

      return {
        partId: part.id,
        filamentCost,
        electricityCost,
        laborCost,
        hardwareCost,
        subtotal,
      };
    });
  }, [quoteParts, filaments, printers, generalSettings]);

  const costBreakdown = useMemo<CostBreakdown & { quotePrice: number }>(() => {
    let filamentCost = 0;
    let electricityCost = 0;
    let laborCost = 0;
    let hardwareCost = 0;
    let subtotal = 0;

    partsBreakdowns.forEach(pb => {
      filamentCost += pb.filamentCost;
      electricityCost += pb.electricityCost;
      laborCost += pb.laborCost;
      hardwareCost += pb.hardwareCost;
      subtotal += pb.subtotal;
    });

    const costWithFailureRate = subtotal / (1 - (generalSettings.failureRate / 100));
    const profit = costWithFailureRate * (generalSettings.profitMargin / 100);
    const quotePrice = parseFloat((costWithFailureRate + profit).toFixed(2));

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
  }, [partsBreakdowns, generalSettings]);

  const nextJobNumber = useMemo(() => {
    if (quotes.length === 0) {
      return 1;
    }
    const maxJobNumber = quotes.reduce((max, q) => Math.max(max, q.jobNumber), 0);
    return maxJobNumber + 1;
  }, [quotes]);

  const nextOrderNumber = useMemo(() => {
    if (orders.length === 0) {
      return 1001;
    }
    const maxOrderNumber = orders.reduce((max, o) => Math.max(max, o.orderNumber), 0);
    return maxOrderNumber + 1;
  }, [orders]);


  // Quote Handlers
  const handleSaveQuote = useCallback((jobName: string, customerName: string, jobNumber: number, finalQuotePrice: number, params: PrintParameters, breakdown: CostBreakdown) => {
    if (quotes.some(q => q.jobNumber === jobNumber)) {
      alert(`Job number ${jobNumber} already exists. Please choose a unique job number.`);
      return;
    }
    const newQuote: Quote = {
      id: new Date().toISOString(),
      jobNumber,
      jobName,
      customerName,
      createdAt: new Date().toISOString(),
      quotePrice: finalQuotePrice,
      status: QuoteStatus.Pending,
      parameters: params,
      costBreakdown: breakdown,
      parts: quoteParts,
    };
    setAppData(prev => ({ ...prev, quotes: [...prev.quotes, newQuote].sort((a, b) => b.jobNumber - a.jobNumber) }));
    
    // Reset quote parts
    setQuoteParts([
      {
        id: 'part-1',
        name: 'Part 1',
        quantity: 1,
        filamentGrams: 100,
        filamentId: filaments.length > 0 ? filaments[0].id : null,
        printHours: 5,
        printerId: printers.length > 0 ? printers[0].id : null,
        postProcessingHours: 0.5,
        hardwareCost: 0,
      }
    ]);
    setActivePartId('part-1');
    setView('jobs');
  }, [quotes, quoteParts, filaments, printers, setAppData]);

  const handleDeleteQuote = (id: string) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this quote? This will also delete any associated order."
    );
    if (isConfirmed) {
      setAppData(prev => ({ 
        ...prev, 
        quotes: prev.quotes.filter(q => q.id !== id),
        orders: prev.orders.filter(o => o.quoteId !== id)
      }));
    }
  };

  const handleUpdateQuoteStatus = (id: string, status: QuoteStatus) => {
    setAppData(prev => ({ ...prev, quotes: prev.quotes.map(q => (q.id === id ? { ...q, status } : q)) }));
  };

  // Part Handlers
  const handleAddPart = (part: Omit<Part, 'id'>) => {
    const newPart = { ...part, id: new Date().toISOString() };
    setAppData(prev => ({ ...prev, parts: [...prev.parts, newPart] }));
  };
  const handleUpdatePart = (updatedPart: Part) => {
    setAppData(prev => ({ ...prev, parts: prev.parts.map(p => p.id === updatedPart.id ? updatedPart : p) }));
  };
  const handleDeletePart = (id: string) => {
    setAppData(prev => ({ ...prev, parts: prev.parts.filter(p => p.id !== id) }));
  };
  const handlePartSelect = useCallback((part: Part | null) => {
      if (part) {
          setQuoteParts(prev => prev.map(p => {
              if (p.id === activePartId) {
                  return {
                      ...p,
                      name: part.name,
                      filamentGrams: part.filamentGrams,
                      printHours: part.printHours,
                      postProcessingHours: part.postProcessingHours,
                      hardwareCost: part.hardwareCost,
                  };
              }
              return p;
          }));
      }
  }, [activePartId]);

  // Order Handlers
  const handleCreateOrder = (quoteId: string) => {
    const newOrder: Order = {
      id: new Date().toISOString(),
      quoteId,
      orderNumber: nextOrderNumber,
      createdAt: new Date().toISOString(),
      status: OrderStatus.InProgress,
    };
    setAppData(prev => ({ ...prev, orders: [...prev.orders, newOrder].sort((a,b) => b.orderNumber - a.orderNumber) }));
    setView('orders');
  };
  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    setAppData(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId ? { ...o, status } : o)
    }));
  };
  const handleDeleteOrder = (orderId: string) => {
    setAppData(prev => ({ ...prev, orders: prev.orders.filter(o => o.id !== orderId) }));
  };

  // Filament Handlers
  const handleAddFilament = (filament: Omit<Filament, 'id'>) => {
    const newFilament = { ...filament, id: new Date().toISOString() };
    setAppData(prev => ({ ...prev, filaments: [...prev.filaments, newFilament] }));
  };
  const handleUpdateFilament = (updatedFilament: Filament) => {
    setAppData(prev => ({ ...prev, filaments: prev.filaments.map(m => m.id === updatedFilament.id ? updatedFilament : m) }));
  };
  const handleDeleteFilament = (id: string) => {
    const newFilaments = filaments.filter(m => m.id !== id);
    setAppData(prev => ({ ...prev, filaments: newFilaments }));
    if (parameters.filamentId === id) {
      setParameters(p => ({ ...p, filamentId: newFilaments.length > 0 ? newFilaments[0].id : null }));
    }
  };

  // Printer Handlers
  const handleAddPrinter = (printer: Omit<Printer, 'id'>) => {
    const newPrinter = { ...printer, id: new Date().toISOString() };
    setAppData(prev => ({ ...prev, printers: [...prev.printers, newPrinter] }));
  };
  const handleUpdatePrinter = (updatedPrinter: Printer) => {
    setAppData(prev => ({ ...prev, printers: prev.printers.map(p => p.id === updatedPrinter.id ? updatedPrinter : p) }));
  };
  const handleDeletePrinter = (id: string) => {
    const newPrinters = printers.filter(p => p.id !== id);
    setAppData(prev => ({ ...prev, printers: newPrinters }));
    if (parameters.printerId === id) {
      setParameters(p => ({ ...p, printerId: newPrinters.length > 0 ? newPrinters[0].id : null }));
    }
  };

  // Settings Handler
  const handleSaveSettings = (newSettings: GeneralSettings) => {
    setAppData(prev => ({ ...prev, generalSettings: newSettings }));
    setParameters(p => ({
      ...p,
      electricityCostKwh: newSettings.electricityCostKwh,
      laborCostPerHour: newSettings.laborCostPerHour,
      failureRate: newSettings.failureRate,
      profitMargin: newSettings.profitMargin,
    }));
  };
  
  // Data Management Handlers
  const handleExportData = useCallback(() => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(appData, null, 2)
    )}`;
    const link = document.createElement("a");
    const today = new Date().toISOString().split('T')[0];
    link.href = jsonString;
    link.download = `3d_print_tracker_backup_${today}.json`;
    link.click();
  }, [appData]);

  const handleImportData = useCallback((file: File) => {
    if (!file) {
      alert("No file selected.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== 'string') {
        alert("Could not read file.");
        return;
      }
      try {
        const importedData = JSON.parse(text) as AppData;

        const isValid = 
          importedData &&
          typeof importedData === 'object' &&
          !Array.isArray(importedData) &&
          Array.isArray(importedData.filaments) &&
          Array.isArray(importedData.printers) &&
          Array.isArray(importedData.quotes) &&
          Array.isArray(importedData.parts) &&
          Array.isArray(importedData.orders) &&
          importedData.generalSettings &&
          typeof importedData.generalSettings === 'object' &&
          !Array.isArray(importedData.generalSettings);

        if (!isValid) {
          throw new Error("Invalid data structure. The file must be a JSON object containing arrays for 'filaments', 'printers', 'quotes', 'parts', 'orders' and an object for 'generalSettings'.");
        }
        
        const isConfirmed = window.confirm(
          "Are you sure you want to import this data? This will overwrite all existing jobs, filaments, printers, and settings."
        );

        if (isConfirmed) {
          setAppData(importedData);

          // After import, reset the calculator state to use the new data as defaults.
          setParameters({
            filamentGrams: 100,
            filamentId: importedData.filaments.length > 0 ? importedData.filaments[0].id : null,
            printHours: 5,
            printerId: importedData.printers.length > 0 ? importedData.printers[0].id : null,
            postProcessingHours: 0.5,
            hardwareCost: 0,
            ...importedData.generalSettings,
          });
          
          alert("Data imported successfully!");
          setView('calculator');
        }
      } catch (error) {
        console.error("Failed to import data:", error);
        alert(`Failed to import data. Please check the file format.\nError: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    reader.onerror = () => {
        alert("Error reading file.");
    };
    reader.readAsText(file);
  }, [setAppData, setParameters, setView]);


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
                parts={parts}
                onPartSelect={handlePartSelect}
                quoteParts={quoteParts}
                setQuoteParts={setQuoteParts}
                activePartId={activePartId}
                setActivePartId={setActivePartId}
              />
            </div>
            <div className="lg:col-span-3">
              <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
                <CostBreakdownDisplay
                  parameters={parameters}
                  costBreakdown={costBreakdown}
                  quotePrice={costBreakdown.quotePrice}
                  onSaveQuote={handleSaveQuote}
                  nextJobNumber={nextJobNumber}
                />
              </div>
            </div>
          </main>
        );
      case 'jobs':
        return (
          <JobsPage 
            quotes={quotes}
            filaments={filaments}
            printers={printers}
            orders={orders}
            onDelete={handleDeleteQuote}
            onUpdateStatus={handleUpdateQuoteStatus}
            onCreateOrder={handleCreateOrder}
          />
        );
      case 'orders':
        return (
          <OrdersPage
            orders={orders}
            quotes={quotes}
            onDelete={handleDeleteOrder}
            onUpdateStatus={handleUpdateOrderStatus}
          />
        );
       case 'parts':
        return (
          <PartsPage 
            parts={parts}
            onAdd={handleAddPart}
            onUpdate={handleUpdatePart}
            onDelete={handleDeletePart}
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
            onExport={handleExportData}
            onImport={handleImportData}
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