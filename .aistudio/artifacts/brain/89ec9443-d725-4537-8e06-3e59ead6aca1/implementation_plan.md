# Multi-Color Build Plate Rate Separation, Per-Job Overrides & Per-Model Print Time on Quotes

Comprehensive implementation plan to separate "one color per build plate" pricing from AMS multi-material pricing, provide independent job-level overrides for each multicolor printing mode, and explicitly display per-model print times on quotes and invoices.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Key confirmations based on your preferences:
> 1. **Settings Configuration with Per-Job Overrides**: Default rates for both **Multicolor AMS Printing** (purge/swap/spool fees) and **Different Build Plates** (one color per plate handling fee) are maintained in General Settings, with a live override field in the Quote Calculator for each mode.
> 2. **Clean Separation of Rates**: Printing one color per build plate will strictly be charged at its own plate rate (e.g. $/plate or custom job total), with zero purge waste, zero color swap fees, and no AMS surcharges applied.
> 3. **Per-Model Print Time Display**: Every quote and invoice will prominently state the exact print time for an individual model (e.g., `⏱️ 2h 30m / model`), along with batch totals when quantity > 1 (e.g., `10h total for 4 units`).

---

## 1. Overview & Core Concept

### What This Delivers
1. **Dedicated Rate Engine for Single-Color Build Plates**:
   - **AMS Multi-Color Printing**: Charged for complex filament swaps, purge tower waste, and multi-spool slotting.
   - **Different Build Plates (One Color Per Plate)**: Printed plate-by-plate in solid colors. Charged solely at a distinct plate handling/setup rate (e.g., default $2.50/plate, customizable in Settings). Zero purge tower buffer and zero AMS swap fees are incurred.
2. **Per-Job Override Controls**:
   - In the Quote Calculator, whichever multicolor mode is selected (AMS Single Bed, Different Build Plates, or Per-Copy), an interactive override card allows entering a custom rate or total fee for that specific job, with an instant "Reset to Default" button.
3. **Per-Model Print Time Visibility on Quotes**:
   - Customer quotes, invoices, workshop travelers, and parts summary tables will display individual model print times (e.g. `⏱️ 1h 45m per model`), avoiding ambiguity for clients and workshop operators when evaluating multi-piece orders.

---

## 2. User Experience & Visual Design

### 2.1 Multi-Color Mode & Override Controls (Quote Calculator)
- When a job contains multi-color parts, the Multi-Color Production strategy card presents the choices with distinct rate tags:
  - **Single Bed AMS Batch**: `[AMS Swaps + Purge Waste]` — displays standard AMS calculation.
  - **Different Build Plates**: `[1 Color / Plate • Zero Purge]` — displays distinct plate rate calculation.
- Right below the selected mode, an **"⚡ Job Rate Override"** expandable badge allows typing a custom dollar amount for that specific job (e.g., `$3.00 / plate` or custom total fee). If overridden, an amber badge (`⚡ Custom Job Rate Applied`) appears with a one-click `Reset` action.

### 2.2 Settings Configuration (General Settings)
- The **🎨 Multi-Color Prints Extra Fees** section in Settings will clearly distinguish the two workflows:
  - **AMS / Toolhead Multi-Material Section**: Spool setup fee, purge tower waste %, and cost per color swap.
  - **Different Build Plates Section**: Dedicated default handling/prep fee per build plate (e.g. `$2.50 / plate`), with a clear explanation of how it differs from AMS co-extrusion.

### 2.3 Per-Model Print Time Display on Quotes & Invoices
- **Customer Quote & Invoice Tables (`PrintDocumentModal.tsx`)**:
  - In the part description block, for single-quantity parts:
    `⚖️ 120g • ⏱️ 3h 15m print time`
  - For multi-quantity parts (e.g., Qty = 4):
    `⚖️ 120g • ⏱️ 3h 15m per model (13h total for 4 models)`
- **Workshop Job Traveler & Fabrication Checklists**:
  - Displays `⏱️ Per Model: 3h 15m` and `⏱️ Total Batch: 13h 00m` so operators can plan individual plate runs accurately.
- **Quote Parts Breakdown Tables (`JobPartsTable.tsx` & `CostBreakdownDisplay.tsx`)**:
  - Clean badge indicator showing unit print time and total line duration.

---

## 3. Key Product Decisions & Trade-Offs

| Decision | Selected Approach | Rationale |
| :--- | :--- | :--- |
| **Separation of Rates** | Plate-by-plate prints calculate fee *strictly* via build plate setup fee ($/plate or override), bypassing all AMS swap/purge calculations. | Matches real workshop fabrication: swapping plates between single-color prints wastes no filament in purge towers and has zero color-change toolhead wear. |
| **Job Overrides** | Stored directly in `quote.parameters` as `multiColorFeeOverride` (or rate per plate override). | Ensures each quote retains its agreed custom pricing even if global settings are changed later. |
| **Print Time Hierarchy** | Explicitly label both "Per Model" and "Total" whenever quantity > 1. | Eliminates client confusion where a 10-hour total on a 5-pack might be misinterpreted as 10 hours for a single unit. |

---

## 4. Technical Architecture & Data Strategy

### 4.1 System Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          General Settings                              │
│  - AMS Rates: Spool Setup, Purge %, Cost/Swap, Handling Fee            │
│  - Different Plates Rate: defaultDifferentPlatesRate ($/plate)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Defaults
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Quote Calculator (Per-Job)                         │
│  ┌───────────────────────────────┐  ┌────────────────────────────────┐ │
│  │ Mode: Single Bed AMS          │  │ Mode: Different Build Plates   │ │
│  │ • Standard AMS Calculation    │  │ • Plate Rate × Plate Count     │ │
│  │ • ⚡ Job Override ($)         │  │ • ⚡ Job Override ($ or $/plt) │ │
│  └───────────────────────────────┘  └────────────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Resolved Pricing & Print Times
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Quotes, Invoices & Views                        │
│  - Line Item: Part Name & Color Specs                                  │
│  - Specs: Weight • ⏱️ Print Time per Model (and Total for Batch)       │
│  - Fee: Labeled specifically as "AMS Multi-Color" or "Multi-Plate"     │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.2 State & Schema Enhancements

1. **`types.ts`**:
   - In `GeneralSettings`:
     - `differentPlatesHandlingFee`: default handling fee per build plate ($/plate).
     - `simpleMultiColorFee`, `complexSpoolSetupFee`, etc. (existing AMS defaults).
   - In `PrintParameters` & `CostBreakdown`:
     - `multiColorFeeOverride?: number`: custom override fee for the active multicolor mode on this job.
     - `differentPlatesRateOverride?: number`: custom per-plate rate override for this job.
2. **`App.tsx` & Calculation Engine (`calculateJobPartRows`)**:
   - When `multiColorBatchMode === 'different_plates'`:
     - Calculate base plate fee using `differentPlatesRateOverride` (if set) or `differentPlatesHandlingFee * bedCount`.
     - Completely isolate from AMS swap/purge calculations.
   - When `multiColorFeeOverride` is provided for either mode, respect the user's manual override directly.
3. **`PrintDocumentModal.tsx`, `JobPartsTable.tsx`, `markdownExport.ts`**:
   - Format print hours as:
     - `unitPrintHours = part.printHours`
     - `totalPrintHours = part.printHours * qty`
     - When `qty > 1`: `⏱️ ${formatHours(unitPrintHours)} / model (${formatHours(totalPrintHours)} total)`
     - When `qty === 1`: `⏱️ ${formatHours(unitPrintHours)}`
