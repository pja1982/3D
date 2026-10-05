import type { Quote, Order, Filament, Printer, Part } from '../types';
import JSZip from 'jszip';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

const formatHours = (hours: number) => {
  const h = Math.floor(hours || 0);
  const m = Math.round(((hours || 0) - h) * 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

/**
 * Downloads a string as a .md file.
 */
export function downloadMarkdownFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.md') ? filename : `${filename}.md`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies markdown string to clipboard with fallback.
 */
export async function copyMarkdownToClipboard(content: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(content);
      return true;
    }
  } catch (err) {
    console.error('Clipboard write error', err);
  }

  // Fallback
  try {
    const textArea = document.createElement('textarea');
    textArea.value = content;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    return false;
  }
}

/**
 * Generates an Obsidian Markdown document for an individual Catalog Part.
 * Formatted for placement in the 'parts/' directory of an Obsidian Vault.
 */
export function generatePartMarkdown(
  part: Part,
  filaments: Filament[] = [],
  printers: Printer[] = []
): string {
  const cleanName = part.name.replace(/"/g, '\\"');
  let md = `---
type: 3d-print-part
part_id: "${part.id}"
name: "${cleanName}"
filament_grams: ${part.filamentGrams}
print_hours: ${part.printHours}
post_processing_hours: ${part.postProcessingHours}
hardware_cost: ${part.hardwareCost}
tags:
  - 3d-printing
  - parts
  - catalog
  - obsidian-vault
---

# 🧩 ${part.name}

> [!info] Part Specifications
> - **Filament Weight:** **${part.filamentGrams}g**
> - **Estimated Print Time:** **${formatHours(part.printHours)}**
> - **Post-Processing Time:** **${formatHours(part.postProcessingHours)}**
> - **Additional Hardware Cost:** **${formatCurrency(part.hardwareCost)}**
`;

  if (part.description) {
    md += `
## 📝 Description & Functional Details
${part.description}
`;
  }

  if (part.imageUrl) {
    md += `
---

## 📸 Model Visual & Prototype Photo
![${part.name}](${part.imageUrl})
`;
  }

  md += `
---

## ⚙️ Recommended Slicing & Manufacturing Settings
- [ ] **Layer Height:** (e.g. 0.20mm standard / 0.12mm high resolution)
- [ ] **Wall Loops / Shells:** (e.g. 3-4 walls for mechanical durability)
- [ ] **Infill Density & Pattern:** (e.g. 15-25% Gyroid / Grid)
- [ ] **Support Structure:** (e.g. Tree supports, build plate only)
- [ ] **Build Plate Adhesion:** (e.g. Textured PEI plate @ 60°C)
- [ ] **Dimensional Inspection:** Check caliper dimensions against specifications

---

## 🔗 Related Quotes & Production Orders
*Any quote or order linking to \`[[parts/${part.name}]]\` will automatically be tracked in Obsidian's Backlinks panel.*
`;

  return md;
}

/**
 * Generates a master catalog index Markdown note for all Parts.
 */
export function generateAllPartsMarkdown(
  parts: Part[],
  filaments: Filament[] = [],
  printers: Printer[] = []
): string {
  const today = new Date().toISOString().split('T')[0];
  const avgPrintTime = parts.length > 0 
    ? parts.reduce((sum, p) => sum + (p.printHours || 0), 0) / parts.length 
    : 0;
  const avgGrams = parts.length > 0
    ? parts.reduce((sum, p) => sum + (p.filamentGrams || 0), 0) / parts.length
    : 0;

  let md = `---
type: 3d-print-parts-catalog
date: ${today}
total_parts: ${parts.length}
tags:
  - 3d-printing
  - parts
  - catalog-index
  - obsidian-vault
---

# 🧩 3D Print Parts Catalog

*Exported on ${today} for Obsidian Record-Keeping*

> [!summary] Catalog Overview
> - **Total Parts:** ${parts.length}
> - **Average Print Time:** ${formatHours(avgPrintTime)}
> - **Average Weight:** ${avgGrams.toFixed(1)}g

---

## 📋 Parts Directory

| Part Name | Weight | Print Time | Post-Proc | Hardware | Visual |
| :--- | :---: | :---: | :---: | :---: | :---: |
`;

  parts.forEach(part => {
    md += `| [[parts/${part.name}\\|${part.name}]] | ${part.filamentGrams}g | ${formatHours(part.printHours)} | ${formatHours(part.postProcessingHours)} | ${part.hardwareCost > 0 ? formatCurrency(part.hardwareCost) : '-'} | ${part.imageUrl ? '📸 Photo' : '-'} |\n`;
  });

  md += `\n---\n\n## 📝 Detailed Part Records\n\n`;

  parts.forEach(part => {
    md += `\n---\n\n`;
    md += generatePartMarkdown(part, filaments, printers);
  });

  return md;
}

/**
 * Generates an Obsidian Markdown document for an individual Job / Quote.
 * Formats parts to link directly to the Obsidian 'parts/' directory.
 */
export function generateJobMarkdown(quote: Quote, filaments: Filament[], printers: Printer[]): string {
  const dateStr = new Date(quote.createdAt).toISOString().split('T')[0];
  const { costBreakdown, parameters, parts } = quote;

  let md = `---
type: 3d-print-quote
job_number: ${quote.jobNumber}
job_name: "${quote.jobName.replace(/"/g, '\\"')}"
customer: "${quote.customerName.replace(/"/g, '\\"')}"
date: ${dateStr}
status: ${quote.status}
quote_price: ${quote.quotePrice.toFixed(2)}
tags:
  - 3d-printing
  - jobs
  - quotes
  - status/${quote.status.toLowerCase()}
---

# Job #${quote.jobNumber}: ${quote.jobName}

> [!info] Quote Overview
> - **Customer:** [[${quote.customerName}]]
> - **Date Created:** ${dateStr}
> - **Status:** \`${quote.status}\`
> - **Quoted Price:** **${formatCurrency(quote.quotePrice)}**

---

## 📦 Parts & Manufacturing Specifications
`;

  if (parts && parts.length > 0) {
    md += `
| Part Name | Qty | Material / Color | Weight | Printer & Print Time | Post-Proc | Hardware |
| :--- | :---: | :--- | :---: | :--- | :---: | :---: |
`;
    parts.forEach(part => {
      const printer = printers.find(p => p.id === part.printerId);
      const printerLabel = printer ? `${printer.brand} ${printer.name}` : 'Default Printer';
      const printTimeStr = `${formatHours(part.printHours)} (${formatHours(part.printHours * part.quantity)} total)`;
      const postProcStr = `${formatHours(part.postProcessingHours)}`;
      const hwStr = part.hardwareCost > 0 ? formatCurrency(part.hardwareCost) : '-';

      let materialDesc = '';
      if (part.colors && part.colors.length > 1) {
        materialDesc = `🎨 Multi-Color (${part.colors.length}): ` + part.colors.map(c => {
          const fil = filaments.find(f => f.id === c.filamentId);
          return `${fil ? `${fil.brand} ${fil.type}` : 'Filament'}${fil?.colorName ? ` (${fil.colorName})` : ''} [${c.grams}g]`;
        }).join(', ');
      } else {
        const fil = filaments.find(f => f.id === part.filamentId);
        materialDesc = fil ? `${fil.brand} ${fil.type}${fil.colorName ? ` (${fil.colorName})` : ''}` : 'Standard Material';
      }

      // Link part directly into the Obsidian 'parts/' directory
      md += `| [[parts/${part.name}\\|${part.name}]] | ${part.quantity} | ${materialDesc} | ${part.filamentGrams}g (${part.filamentGrams * part.quantity}g) | ${printerLabel} • ${printTimeStr} | ${postProcStr} | ${hwStr} |\n`;
    });

    const partsWithPhotos = parts.filter(p => p.imageUrl);
    if (partsWithPhotos.length > 0) {
      md += `\n### 📸 Part Visuals & Model Photos\n`;
      partsWithPhotos.forEach(p => {
        md += `\n> **Part Link:** [[parts/${p.name}|${p.name}]]\n> ![[parts/${p.name}]]\n> ![${p.name}](${p.imageUrl})\n`;
      });
    }
  } else {
    // Legacy single part
    const fil = filaments.find(f => f.id === parameters.filamentId);
    const printer = printers.find(p => p.id === parameters.printerId);
    md += `
- **Part Link:** [[parts/${quote.jobName}|${quote.jobName}]]
- **Material:** ${fil ? `${fil.brand} ${fil.type}${fil.colorName ? ` (${fil.colorName})` : ''}` : 'N/A'}
- **Filament Weight:** ${parameters.filamentGrams}g
- **Printer:** ${printer ? `${printer.brand} ${printer.name}` : 'N/A'}
- **Print Time:** ${formatHours(parameters.printHours)}
- **Post-Processing Time:** ${formatHours(parameters.postProcessingHours)}
- **Hardware Cost:** ${formatCurrency(parameters.hardwareCost)}
`;
  }

  md += `
---

## 💰 Financial Breakdown

> [!summary] Cost Accounting
> | Cost Category | Amount |
> | :--- | :--- |
> | **Filament Material:** | ${formatCurrency(costBreakdown.filamentCost)} |
> | **Electricity:** | ${formatCurrency(costBreakdown.electricityCost)} |
> | **Labor & Prep:** | ${formatCurrency(costBreakdown.laborCost)} |
> | **Hardware & Consumables:** | ${formatCurrency(costBreakdown.hardwareCost)} |
`;

  if (costBreakdown.printerCost && costBreakdown.printerCost > 0) {
    md += `> | **Printer Depreciation & Maintenance:** | ${formatCurrency(costBreakdown.printerCost)} |\n`;
  }
  if (costBreakdown.multiColorFee && costBreakdown.multiColorFee > 0) {
    md += `> | **Multi-Color Processing Fee:** | ${formatCurrency(costBreakdown.multiColorFee)} |\n`;
  }

  md += `> | **Subtotal:** | **${formatCurrency(costBreakdown.subtotal)}** |
> | **Failure Buffer (${parameters.failureRate}%):** | ${formatCurrency(costBreakdown.costWithFailureRate - costBreakdown.subtotal)} |
> | **Net Profit Margin (${parameters.profitMargin}%):** | ${formatCurrency(costBreakdown.profit)} |
> | **Final Quoted Price:** | **${formatCurrency(quote.quotePrice)}** |

---

## 📋 Quality & Delivery Checklist
- [ ] G-code sliced and verified for support collisions
- [ ] Filament color and spool weight double-checked
- [ ] First layer inspected on build plate
- [ ] Final dimensions verified against drawings/specs
- [ ] Supports removed and part cleaned
- [ ] Protective packaging applied
- [ ] Customer notified with tracking / invoice
`;

  return md;
}

/**
 * Generates an Obsidian Markdown document containing all Saved Jobs & Quotes.
 */
export function generateAllJobsMarkdown(quotes: Quote[], filaments: Filament[], printers: Printer[]): string {
  const today = new Date().toISOString().split('T')[0];
  const totalValue = quotes.reduce((sum, q) => sum + q.quotePrice, 0);

  let md = `---
type: 3d-print-jobs-index
date: ${today}
total_jobs: ${quotes.length}
total_value: ${totalValue.toFixed(2)}
tags:
  - 3d-printing
  - jobs-archive
  - obsidian-vault
---

# 🗂️ 3D Print Saved Jobs & Quotes Archive

*Exported on ${today} for Obsidian Record-Keeping*

> [!summary] Summary Metrics
> - **Total Jobs:** ${quotes.length}
> - **Total Quoted Value:** **${formatCurrency(totalValue)}**
> - **Pending:** ${quotes.filter(q => q.status === 'Pending').length} | **Accepted:** ${quotes.filter(q => q.status === 'Accepted').length} | **Rejected:** ${quotes.filter(q => q.status === 'Rejected').length}

---

## 📑 Jobs Master Index

| Job # | Job Name | Customer | Date | Price | Status |
| :---: | :--- | :--- | :---: | :---: | :---: |
`;

  quotes.forEach(q => {
    const qDate = new Date(q.createdAt).toISOString().split('T')[0];
    md += `| #${q.jobNumber} | [[#Job #${q.jobNumber}: ${q.jobName}\\|${q.jobName}]] | [[${q.customerName}]] | ${qDate} | **${formatCurrency(q.quotePrice)}** | \`${q.status}\` |\n`;
  });

  md += `\n---\n\n## 📝 Detailed Job Records\n\n`;

  quotes.forEach((q) => {
    md += `\n---\n\n`;
    md += generateJobMarkdown(q, filaments, printers);
  });

  return md;
}

/**
 * Generates an Obsidian Markdown document for an individual Order.
 * Links all items to the 'parts/' directory.
 */
export function generateOrderMarkdown(order: Order, quote?: Quote, filaments: Filament[] = [], printers: Printer[] = []): string {
  const dateStr = new Date(order.createdAt).toISOString().split('T')[0];
  const jobName = quote?.jobName || '3D Print Job';
  const customer = quote?.customerName || 'Customer';
  const price = quote?.quotePrice || 0;

  let md = `---
type: 3d-print-order
order_number: ${order.orderNumber}
job_number: ${quote?.jobNumber || ''}
job_name: "${jobName.replace(/"/g, '\\"')}"
customer: "${customer.replace(/"/g, '\\"')}"
date: ${dateStr}
status: ${order.status}
order_price: ${price.toFixed(2)}
tags:
  - 3d-printing
  - orders
  - status/${order.status.toLowerCase().replace(/\s+/g, '-')}
---

# Order #${order.orderNumber}: ${jobName}

> [!tip] Order Status: ${order.status}
> - **Customer:** [[${customer}]]
> - **Order Date:** ${dateStr}
> - **Order Value:** **${formatCurrency(price)}**
> - **Linked Quote:** ${quote ? `[[Job #${quote.jobNumber}: ${quote.jobName}]]` : 'N/A'}

---

## 📦 Items to Fulfill
`;

  if (quote?.parts && quote.parts.length > 0) {
    md += `
| Part Name | Qty | Material | Machine | Print Time | Status |
| :--- | :---: | :--- | :--- | :---: | :---: |
`;
    quote.parts.forEach(part => {
      const printer = printers.find(p => p.id === part.printerId);
      const fil = filaments.find(f => f.id === part.filamentId);
      const matStr = fil ? `${fil.brand} ${fil.type}${fil.colorName ? ` (${fil.colorName})` : ''}` : 'Material';
      const printerLabel = printer ? `${printer.brand} ${printer.name}` : 'Printer';
      // Link part directly into the Obsidian 'parts/' directory
      md += `| [[parts/${part.name}\\|${part.name}]] | ${part.quantity} | ${matStr} | ${printerLabel} | ${formatHours(part.printHours)} | [ ] Complete |\n`;
    });
  } else if (quote) {
    const fil = filaments.find(f => f.id === quote.parameters.filamentId);
    const printer = printers.find(p => p.id === quote.parameters.printerId);
    md += `
- **Part / Model:** [[parts/${quote.jobName}|${quote.jobName}]]
- **Filament:** ${fil ? `${fil.brand} ${fil.type}` : 'Standard'} (${quote.parameters.filamentGrams}g)
- **Printer:** ${printer ? `${printer.brand} ${printer.name}` : 'Standard'}
- **Estimated Print Time:** ${formatHours(quote.parameters.printHours)}
`;
  }

  md += `
---

## 🚚 Fulfillment & Shipping Timeline

- [x] **Order Created:** ${dateStr}
- [${order.status !== 'In Progress' ? 'x' : ' '}] **Bed Scheduled & Sliced**
- [${order.status === 'Completed' || order.status === 'Shipped' ? 'x' : ' '}] **Printing & Post-Processing Completed**${order.completedAt ? ` (${new Date(order.completedAt).toLocaleDateString()})` : ''}
- [${order.status === 'Completed' || order.status === 'Shipped' ? 'x' : ' '}] **Quality Inspected**
- [${order.status === 'Shipped' ? 'x' : ' '}] **Packed & Shipped**
${order.completedImageUrl ? `
---

## 📸 Completed Print Inspection Photo
![Completed 3D Print - Order #${order.orderNumber}](${order.completedImageUrl})
*Visual proof of finished print for Order #${order.orderNumber} (${jobName})*
` : ''}
---

## 💬 Order Notes
*Add customer correspondence, tracking numbers, or special packaging instructions here.*
`;

  return md;
}

/**
 * Generates an Obsidian Markdown document containing all Orders.
 */
export function generateAllOrdersMarkdown(orders: Order[], quotes: Quote[], filaments: Filament[] = [], printers: Printer[] = []): string {
  const today = new Date().toISOString().split('T')[0];
  const totalValue = orders.reduce((sum, o) => {
    const q = quotes.find(quote => quote.id === o.quoteId);
    return sum + (q?.quotePrice || 0);
  }, 0);

  let md = `---
type: 3d-print-orders-index
date: ${today}
total_orders: ${orders.length}
total_value: ${totalValue.toFixed(2)}
tags:
  - 3d-printing
  - orders-archive
  - obsidian-vault
---

# 📦 3D Print Orders Archive

*Exported on ${today} for Obsidian Record-Keeping*

> [!summary] Orders Overview
> - **Total Orders:** ${orders.length}
> - **Total Order Pipeline Value:** **${formatCurrency(totalValue)}**
> - **In Progress:** ${orders.filter(o => o.status === 'In Progress').length} | **Completed:** ${orders.filter(o => o.status === 'Completed').length} | **Shipped:** ${orders.filter(o => o.status === 'Shipped').length}

---

## 📋 Orders Master Table

| Order # | Job Name | Customer | Date | Price | Status | Linked Quote |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
`;

  orders.forEach(order => {
    const quote = quotes.find(q => q.id === order.quoteId);
    const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
    const jobName = quote?.jobName || 'Deleted Quote';
    const customer = quote?.customerName || 'N/A';
    const price = quote?.quotePrice || 0;
    md += `| #${order.orderNumber} | [[#Order #${order.orderNumber}: ${jobName}\\|${jobName}]] | [[${customer}]] | ${orderDate} | **${formatCurrency(price)}** | \`${order.status}\` | ${quote ? `#${quote.jobNumber}` : '-'} |\n`;
  });

  md += `\n---\n\n## 📝 Detailed Order Records\n\n`;

  orders.forEach(order => {
    const quote = quotes.find(q => q.id === order.quoteId);
    md += `\n---\n\n`;
    md += generateOrderMarkdown(order, quote, filaments, printers);
  });

  return md;
}

/**
 * Creates and downloads a complete Obsidian Vault archive (.zip)
 * with the dedicated 'parts/' directory structure, linking quotes and orders seamlessly.
 */
export async function downloadObsidianVaultZip(
  quotes: Quote[],
  orders: Order[],
  parts: Part[],
  filaments: Filament[] = [],
  printers: Printer[] = []
): Promise<void> {
  const zip = new JSZip();
  const today = new Date().toISOString().split('T')[0];

  // 1. 'parts/' directory
  const partsFolder = zip.folder('parts');
  parts.forEach(part => {
    const cleanFileName = (part.name || 'Part').replace(/[^a-zA-Z0-9_-]/g, '_');
    partsFolder?.file(`${cleanFileName}.md`, generatePartMarkdown(part, filaments, printers));
  });
  partsFolder?.file('Catalog_Index.md', generateAllPartsMarkdown(parts, filaments, printers));

  // 2. 'jobs/' directory
  const jobsFolder = zip.folder('jobs');
  quotes.forEach(quote => {
    const cleanJobName = (quote.jobName || 'Job').replace(/[^a-zA-Z0-9_-]/g, '_');
    jobsFolder?.file(`Job_${quote.jobNumber}_${cleanJobName}.md`, generateJobMarkdown(quote, filaments, printers));
  });
  jobsFolder?.file('Jobs_Index.md', generateAllJobsMarkdown(quotes, filaments, printers));

  // 3. 'orders/' directory
  const ordersFolder = zip.folder('orders');
  orders.forEach(order => {
    const quote = quotes.find(q => q.id === order.quoteId);
    const cleanJobName = (quote?.jobName || 'Order').replace(/[^a-zA-Z0-9_-]/g, '_');
    ordersFolder?.file(`Order_${order.orderNumber}_${cleanJobName}.md`, generateOrderMarkdown(order, quote, filaments, printers));
  });
  ordersFolder?.file('Orders_Index.md', generateAllOrdersMarkdown(orders, quotes, filaments, printers));

  // 4. Root Vault Index / Dashboard
  const rootIndex = `---
type: obsidian-vault-dashboard
date: ${today}
tags:
  - 3d-printing
  - dashboard
  - obsidian-vault
---

# 🚀 3D Printing Business Vault Dashboard

Welcome to your 3D printing operation's Obsidian vault. All notes are organized into standard directories with bidirectional links.

> [!summary] Operations Overview
> - **Cataloged Parts:** [[parts/Catalog_Index|${parts.length} Parts]]
> - **Saved Jobs & Quotes:** [[jobs/Jobs_Index|${quotes.length} Jobs]]
> - **Active & Historic Orders:** [[orders/Orders_Index|${orders.length} Orders]]

---

## 📁 Vault Structure
- \`parts/\`: Contains individual manufacturing specs for each cataloged 3D model. Quotes and orders link to \`[[parts/Part Name]]\`.
- \`jobs/\`: Contains detailed quote calculations, materials, machine depreciation, and customer estimates.
- \`orders/\`: Contains fulfillment checklists, status tracking, and finished print verification photos.
`;

  zip.file('Vault_Dashboard.md', rootIndex);

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = `3D_Print_Obsidian_Vault_${today}.zip`;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
