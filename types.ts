

export interface Filament {
  id: string;
  name: string;
  brand: string;
  costPerKg: number;
}

export interface Printer {
  id: string;
  name: string;
  brand: string;
  watts: number;
}

export interface Part {
  id: string;
  name: string;
  description: string;
  filamentGrams: number;
  printHours: number;
  postProcessingHours: number;
  hardwareCost: number;
}

export interface GeneralSettings {
  electricityCostKwh: number;
  laborCostPerHour: number;
  failureRate: number;
  profitMargin: number;
}

export interface PrintParameters {
  filamentGrams: number;
  filamentId: string | null;
  printHours: number;
  printerId: string | null;
  electricityCostKwh: number;
  postProcessingHours: number;
  laborCostPerHour: number;
  failureRate: number;
  profitMargin: number;
  hardwareCost: number;
}

export interface CostBreakdown {
  filamentCost: number;
  electricityCost: number;
  laborCost: number;
  hardwareCost: number;
  subtotal: number;
  costWithFailureRate: number;
  profit: number;
}

export interface QuotePartConfig {
  id: string;
  name: string;
  quantity: number;
  filamentGrams: number;
  filamentId: string | null;
  printHours: number;
  printerId: string | null;
  postProcessingHours: number;
  hardwareCost: number;
}

// Fix: Add QuoteStatus enum as it is used in QuoteList.tsx but was not exported from types.ts.
// FIX: Correctly export the QuoteStatus enum and remove the circular import.
export enum QuoteStatus {
  Pending = 'Pending',
  Accepted = 'Accepted',
  Rejected = 'Rejected',
}

// Fix: Add Quote interface as it is used in QuoteList.tsx but was not exported from types.ts.
export interface Quote {
  id: string;
  jobNumber: number;
  jobName: string;
  customerName: string;
  createdAt: string;
  quotePrice: number;
  status: QuoteStatus;
  parameters: PrintParameters;
  costBreakdown: CostBreakdown;
  parts?: QuotePartConfig[];
}

export enum OrderStatus {
  InProgress = 'In Progress',
  Completed = 'Completed',
  Shipped = 'Shipped',
  Cancelled = 'Cancelled',
}

export interface Order {
  id: string;
  orderNumber: number;
  quoteId: string;
  createdAt: string;
  status: OrderStatus;
}


export interface AppData {
  filaments: Filament[];
  printers: Printer[];
  parts: Part[];
  orders: Order[];
  generalSettings: GeneralSettings;
  quotes: Quote[];
}