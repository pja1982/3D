# Quote Totals Arithmetic & Reconciliation Verification Plan

A comprehensive audit and defensive enhancement plan to verify that all line item extensions, parts fabrication subtotals, one-off service fees, and grand totals reconcile with 100% mathematical accuracy across calculation forms, job views, and printable customer quotes/invoices.

---

### User Review & Critical Decisions

> [!NOTE]
> **Audit Finding on Quote #7 (`Stuff` for Shantel):**
> - **Line 1:** 4 × $7.50 = **$30.00**
> - **Line 2:** 4 × $2.00 = **$8.00**
> - **Line 3:** 1 × $0.50 = **$0.50**
> - **Line 4:** 1 × $1.50 = **$1.50**
> - **Line 5:** 1 × $5.00 = **$5.00**
> - **Parts Subtotal:** $30.00 + $8.00 + $0.50 + $1.50 + $5.00 = **$50.00** (Exact match)
> - **One-Off Service Fee (1):** Dick Clicker Model = **+$5.00**
> - **Total Quoted Price:** $50.00 + $5.00 = **$55.00** (Exact match)

- **Confirmed Decision**: Verify and guarantee mathematical parity between itemized line items (`unitPrice × qty`), parts fabrication subtotal, specialized service fees, and grand invoice totals across all quotes.
- **Architectural Safeguard**: Bind `partsSubtotal` in `PrintDocumentModal` directly to `computedParts.grandTotalPrice` (the exact sum of visible table line items) with fallback to `quote.quotePrice`, preventing any potential 1-cent rounding discrepancies between proportional calculations and custom unit overrides.

---

### 1. Overview & Core Concept

- **What It Does**: Ensures that every customer-facing quote, job traveler, and order invoice exhibits transparent, foolproof arithmetic where:
  $$\text{Grand Total} = \sum(\text{Qty}_i \times \text{Unit Price}_i) + \sum(\text{Service Fees}_j)$$
  No hidden charges, phantom rounding drift, or desynchronized subtotals.
- **Target Audience**: 3D print farm operators and fabrication studios quoting custom jobs for retail, commercial, and prototyping clients.
- **Key Value**: Professional credibility. Eliminates customer questions or invoice disputes regarding how line items add up to the final invoice figure.

---

### 2. User Experience & Visual Design

- **Itemized Table Alignment**:
  - Right-aligned currency columns (`Unit Price` and `Amount`) formatted consistently via `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`.
  - Parts fabrication subtotal is explicitly displayed right below the table, matching the line total sum.
- **Service Fees Section**:
  - Itemized rows with description, category badge, and formatted amount.
  - Distinct `One-Off Fees & Services (N): +$X.XX` line item in the financial summary.
- **High-Contrast Total Callout**:
  - Highlighting the final invoiced amount in a bold, prominent dark banner (in dark mode) or high-contrast bordered block (in light/print mode) displaying `Total Quoted Price: $XX.XX`.
- **Multi-Plate Inclusion Indicator**:
  - When multi-plate batching is enabled, explicitly shows `Multi-Plate Production (N Build Plates): Included` to clarify why additional bed setup costs do not inflate the parts subtotal.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct Table Sum Binding for Parts Subtotal**
  - *Chosen Approach*: `partsSubtotal = computedParts.grandTotalPrice > 0 ? computedParts.grandTotalPrice : quote.quotePrice`.
  - *Why*: When users manually override unit prices on specific parts (e.g. setting Part 1 to $7.50 and Part 2 to $2.00), summing the computed row line totals ensures that the subtotal is 100% mathematically faithful to the numbers visible on the client's screen.
  - *Alternatives Considered*: Using only `quote.quotePrice`, which could drift if a single part's custom price was edited after initial quote creation without recalculating the root record.
- **Decision 2: Defensive Rounding & Float Handling**
  - *Chosen Approach*: Currency values are normalized to 2 decimal places using `parseFloat(val.toFixed(2))` during aggregation.
  - *Why*: Avoids IEEE 754 floating-point inaccuracies (e.g. `0.1 + 0.2 = 0.30000000000000004`).

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Quote Object                         │
│  - parts: QuotePartConfig[]                            │
│  - quotePrice: number                                  │
│  - oneOffFees: OneOffFee[]                             │
└───────────────────────────┬────────────────────────────┘
                            │
               calculateJobPartRows(...)
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               Computed Parts Summary                   │
│  - rows: [ { qty, perUnitPrice, lineTotalPrice }, ...] │
│  - grandTotalPrice = ∑ lineTotalPrice                  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               Invoice / Quote Totals                   │
│  1. Parts Subtotal = grandTotalPrice (or quotePrice)   │
│  2. Fees Subtotal  = ∑ oneOffFees.amount               │
│  3. Grand Total    = Parts Subtotal + Fees Subtotal    │
└────────────────────────────────────────────────────────┘
```

#### State & Reconciled Handlers
- **`PrintDocumentModal.tsx`**: Reconciles `partsSubtotal`, `oneOffFeesTotal`, and `grandTotalInvoiced`.
- **`utils/partCostCalculator.ts`**: Ensures `lineTotalPrice = perUnitPrice * qty` for custom unit prices and proportional splits.
- **`App.tsx`**: Synchronizes `quote.quotePrice` and `quote.oneOffFees` to Firestore and local state whenever edits occur.
