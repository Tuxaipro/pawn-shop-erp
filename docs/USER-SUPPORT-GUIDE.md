# Pawn ERP — User Support Guide

**Organization:** Kabilan Pawn Shop  
**Document version:** 1.0  
**Last verified:** 10 June 2026  
**Data source:** `legacy/sql/pawnshop26.sql` (production legacy import)  
**Automated verification:** 34/34 Playwright smoke tests passed (`npm run test:e2e:legacy`)

---

## 1. Introduction

This guide describes every screen in the Pawn ERP web application. It is written for shop staff, supervisors, and support personnel who need to understand **what each page does**, **how to reach it**, and **how to complete common tasks**.

The application replaces the legacy PHP system while preserving your historical data. After import, the database contains real shop records—not test data.

### 1.1 Current data snapshot

| Metric | Count |
|--------|------:|
| Active customers | 5,760 |
| Total pawn loans | 54,487 |
| Open loans | 4,394 |
| Closed loans | 50,093 |
| Overdue open loans | 2,107 |
| Gold open loans | 3,293 |
| Silver open loans | 1,101 |
| Collateral line items | 60,056 |
| Part payments | 1,709 |
| Bank deposits (re-pledge) | 18,363 |

Full machine-readable snapshot: [`docs/legacy-data-snapshot.json`](legacy-data-snapshot.json)

### 1.2 Sign in

| Item | Value |
|------|-------|
| URL | `http://localhost:5174/login` (development) |
| Default admin | `admin@pawn.local` |
| Password | `admin123` |

After sign-in you land on the **Dashboard**. Use the **branch selector** (top toolbar) to work in the correct branch. Use the **language switcher** for English or Tamil.

### 1.3 Navigation

The left sidebar lists all modules. Optional modules (Bank Loans, Auctions, Investments, GL, Notifications) appear only when enabled under **Settings → Application preferences**.

---

## 2. Dashboard

| | |
|---|---|
| **Route** | `/` |
| **Purpose** | Operational overview: today's activity, cash position, stock summary, and quick actions. |
| **Verified** | ✓ Smoke test passed |

### What you see

- **Quick Actions** — shortcuts to New loan, Renewal, Part payment, Close loan, Bank batch, Auction.
- **Today's Operations** — counts for **today only** (selected branch, today's business date):
  - **New customers (today)** — customers registered today in this branch
  - **New loans (today)** — loans with today's loan date
  - **Interest collected (today)** — part payments + interest on closes today (not full redemption principal)
  - **Partial payments** — number of part payments recorded today
  - **Released loans (today)** — loans fully closed today (renewals are not counted)
  - **Expenses (today)** — daily book expense + petty cash entries for today
- **Financial Snapshot** — cash in hand, opening balance, collections, monthly profit.
- **Inventory & Gold Stock** — weights in grams (2 decimal places).
- Alerts for renewals due and overdue loans.

### How to use (step by step)

1. Confirm the correct **branch** is selected in the top toolbar (hidden if you have only one branch).
2. Review **Quick Actions** and use a button to start the task you need.
3. Read **Today's Operations** — each card is today's count only, not lifetime totals.
4. Check **Financial Snapshot** and **Inventory & Gold Stock** for end-of-day context.
5. Click any card or alert to jump to the related screen.

### Tips

- Figures reflect the **selected branch** and **today's date**.
- Interest collected does not include principal when a customer redeems a loan.
- Expenses include petty cash recorded under **Accounts → Daily book** (Petty cash type).

---

## 3. Customers

### 3.1 Customer list

| | |
|---|---|
| **Route** | `/customers` |
| **Purpose** | Search and browse all registered customers. |
| **Verified** | ✓ |

**Actions:** Search by name, open a customer, or click **New Customer**.

**Sample record:** Customer ID **1000** — அமுதா ரங்கன் (mobile on file).

---

### 3.2 New customer

| | |
|---|---|
| **Route** | `/customers/new` |
| **Purpose** | Register a new customer before creating a pawn loan. |
| **Verified** | ✓ |

**Required fields:** Customer ID (auto-suggested), name, father/husband name, address, city, state, PIN, mobile.

**Workflow:** Fill form → Save → you are taken to the customer detail page to add KYC if needed.

---

### 3.3 Customer detail

| | |
|---|---|
| **Route** | `/customers/:id` |
| **Purpose** | View profile, KYC documents, loan history, and activity. |
| **Verified** | ✓ (legacy customer ID 1) |

**Sections:**

- **Profile** — contact and address.
- **KYC & IDs** — identity documents.
- **Loans** — all pawn loans linked to this customer.

**Actions:** Edit customer, open any loan from the list.

---

### 3.4 Edit customer

| | |
|---|---|
| **Route** | `/customers/:id/edit` |
| **Purpose** | Update customer details. |
| **Verified** | Via detail page navigation |

---

## 4. Pawn loans

### 4.1 Loan list

| | |
|---|---|
| **Route** | `/loans` |
| **Purpose** | Search loans by receipt number, customer name, or status. |
| **Verified** | ✓ |

**Filters:** Open, closed, commodity type, date range.

**Sample receipts:** `#1014788` (closed, 2018) · `#92288` (open, Jan 2026).

---

### 4.2 New pawn loan

| | |
|---|---|
| **Route** | `/loans/new` |
| **Purpose** | Create a new pawn against pledged gold or silver items. |
| **Verified** | ✓ |

**Steps:**

1. Select **customer** (search by name or ID).
2. Enter **receipt number** (invoice no.) — must be unique per branch.
3. Choose **commodity** (Gold / Silver), **loan condition**, and **customer type**.
4. Add **collateral items**: sub-category, item type, purity, count, net weight (grams).
5. Enter **loan amount**; amount in words is generated automatically.
6. Confirm **interest rate** (from interest slabs) and **renewal date**.
7. Save, open loan detail, and **print receipt**.
8. If **Loan item QR codes** are enabled (Settings → Application preferences), one QR code is created automatically for this receipt.

---

### 4.3 Loan detail

| | |
|---|---|
| **Route** | `/loans/:id` |
| **Purpose** | Full view of a single pawn: collateral, payments, renewal history, bank deposit status, and receipt QR code. |
| **Verified** | ✓ |

**How to use:**

1. Check the receipt header — receipt number, customer name, and status badge.
2. If QR codes are enabled, **one QR** appears next to the receipt title (not on each collateral line). Scanning shows: customer name, customer ID, mobile, and receipt number.
3. Review the Loan and Customer cards.
4. Check **Interest (as of today)** for amount due on open loans.
5. Review the **Collateral Items** table.
6. Use action icons: Print, Renew, Close, or Part payment.

**Actions:** Edit (open loans only), Close, Print, Bank loan, Part payments.

---

### 4.4 Edit loan

| | |
|---|---|
| **Route** | `/loans/:id/edit` |
| **Purpose** | Correct collateral lines, weights, or header fields on an **open** loan. |
| **Verified** | ✓ (open loan #92288) |

**Note:** Settled/closed loans cannot be edited. Use the loan detail page for read-only history.

---

### 4.5 Close loan

| | |
|---|---|
| **Route** | `/loans/:id/close` |
| **Purpose** | Settle a loan when the customer redeems pledged items. |
| **Verified** | ✓ |

Enter settlement amount, date, and bill options. Security PIN may be required (configured in Settings).

---

### 4.6 Print receipt

| | |
|---|---|
| **Route** | `/loans/:id/print` |
| **Purpose** | Print-friendly pawn receipt for the customer, including QR code when enabled. |
| **Verified** | ✓ |

**How to use:**

1. Open from loan detail → **Print** icon.
2. Review customer copy and company copy on screen.
3. If QR codes are enabled, one QR appears in the receipt header (top right) — one per receipt, not per item line.
4. Press **Ctrl+P** (or the Print button) and choose your printer.
5. Hand the customer copy to the customer; keep the company copy in your files.

Opens without the main sidebar for clean printing.

---

### 4.7 QR codes for loan receipts

| | |
|---|---|
| **Where shown** | Loan detail (next to receipt title), print receipt header, inventory manage panel |
| **Purpose** | Quick identity check at the counter — scan with any phone camera or QR app |
| **Enabled by** | **Settings → Application preferences → Loan item QR codes** (Super Admin) |

**What the QR contains:** Customer name, customer ID, mobile number, and loan receipt number.

**Important:** One QR per **receipt** — not one per collateral item.

**How to use:**

1. Super Admin turns on **Loan item QR codes** and clicks Save (existing open loans are backfilled).
2. After creating a new loan, open loan detail — QR appears next to the receipt number.
3. Staff can scan the QR to verify customer name, ID, mobile, and receipt number at the counter.
4. Print the receipt — QR appears in the header for the customer copy.
5. In **Inventory**, search by receipt number → **Manage** — the same QR appears at the top of the panel.

---

### 5.1 Part payment list

| | |
|---|---|
| **Route** | `/part-payments` |
| **Purpose** | View loans with part-payment history and navigate to record new payments. |
| **Verified** | ✓ |

Legacy data includes **1,709** part-payment records.

---

### 5.2 Record part payment

| | |
|---|---|
| **Route** | `/part-payments/record` |
| **Purpose** | Accept partial interest payment without closing or renewing the loan. |
| **Verified** | ✓ |

**Steps:** Find loan by receipt → enter amount and date → save.

---

## 6. Renewals & defaults

### 6.1 Renewal list

| | |
|---|---|
| **Route** | `/renewals` |
| **Purpose** | Loans approaching or past renewal date; default management. |
| **Verified** | ✓ |

**Legacy context:** 2,107 open loans are past renewal date (overdue).

---

### 6.2 Easy renewal

| | |
|---|---|
| **Route** | `/renewals/record` |
| **Purpose** | Renew an existing loan: new receipt, adjusted principal, interest settlement. |
| **Verified** | ✓ |

Requires security PIN for privileged operations. Creates a linked renewal chain (`old_loan_id` in legacy data).

---

## 7. Bank loans (re-pledge)

*Module must be enabled in Application preferences.*

### 7.1 Bank loan list

| | |
|---|---|
| **Route** | `/bank-loans` |
| **Purpose** | Track loans pledged to banks for liquidity. |
| **Verified** | ✓ |

Legacy import: **18,363** bank deposit records.

---

### 7.2 Record bank deposit

| | |
|---|---|
| **Route** | `/bank-loans/record` |
| **Purpose** | Register a single loan deposited with a bank. |
| **Verified** | ✓ |

Capture bank name, receipt number, deposit and closing dates, amount.

---

### 7.3 Batch bank deposit

| | |
|---|---|
| **Route** | `/bank-loans/batch` |
| **Purpose** | Deposit multiple loans to a bank in one operation. |
| **Verified** | ✓ |

---

## 8. Auctions

| | |
|---|---|
| **Route** | `/auctions` |
| **Purpose** | Manage auction notices and sale of unredeemed pledged items. |
| **Verified** | ✓ |

Used when loans remain unpaid beyond legal notice period. Links to overdue/default loans.

---

## 9. Inventory / Stock check

| | |
|---|---|
| **Route** | `/inventory` |
| **Purpose** | Search pledged collateral by receipt, customer, weight, and status. Assign locker and location for vault items. |
| **Verified** | ✓ |

This screen tracks **live pawn collateral** tied to open loans — not retail sale stock.

### How to use (step by step)

1. Enter search criteria: receipt number, customer name/phone/ID, status, commodity, or weight range.
2. Click **Search**. Status summary chips show counts (Available, Bank pledged, Released, etc.).
3. Click a status chip to filter, or browse the results table.
4. Click **Manage** on a row to open that receipt's collateral list.
5. In the manage panel, see all collateral lines. If QR is enabled, **one QR for the whole receipt** appears at the top.
6. Click **Edit** on an item to set locker number, location, status (lost/damaged/transferred), or notes.
7. The edit form shows which item you are editing (name and weight). Click **Save** or **Cancel** when done.

### Tips

- Search by receipt number or customer details — there is **no QR scan** in the search box.
- Weights display with 2 decimal places (e.g. 8.60 g).
- The QR on the manage panel is the same receipt-level QR shown on loan detail and print.

---

## 10. Daily book & cash

| | |
|---|---|
| **Route** | `/accounts` |
| **Purpose** | Record daily income, expense, and petty cash; view collections from loans; reconcile cash in hand. |
| **Verified** | ✓ |

### How to use (step by step)

1. Open **Accounts** → **Daily book** tab.
2. Select today's date (or the date you are closing).
3. Review summary cards: Opening balance, Cash in hand, Collections, Entries, Closing balance.
4. To add an entry, choose type: **Income**, **Expense**, or **Petty cash**. Enter amount, category, and who recorded it.
5. Click **Save entry** — the entry appears in the Daily ledger below (newest first).
6. **Collections** include part payments and loan close/redemption cash for that day automatically.
7. Open **Cash position** tab to see vault vs counter split and physical cash reconciliation.
8. Use **Transfers** tab (multi-branch shops only) to record cash moved between branches.

### Tips

- Petty cash is recorded on the same Daily book form — there is no separate petty tab.
- Dashboard **Expenses (today)** includes daily book expense + petty cash for today.
- Single-branch shops do not see the Transfers tab.

---

## 11. Investments

| | |
|---|---|
| **Route** | `/investments` |
| **Purpose** | Track shop investments and returns (optional module). |
| **Verified** | ✓ |

---

## 12. General ledger

| | |
|---|---|
| **Route** | `/gl` |
| **Purpose** | Double-entry ledger view for accounting (optional module). |
| **Verified** | ✓ |

---

## 13. Notifications

| | |
|---|---|
| **Route** | `/notifications` |
| **Purpose** | SMS templates and renewal/auction notice management. |
| **Verified** | ✓ |

Templates support placeholders: `{customer_name}`, `{loan_id}`, `{due_date}`, `{amount}`, `{branch_name}`.

---

## 14. Pay advances

| | |
|---|---|
| **Route** | `/pay-advances` |
| **Purpose** | Staff salary advances and recoveries. |
| **Verified** | ✓ |

---

## 15. Reports

| | |
|---|---|
| **Route** | `/reports` |
| **Purpose** | Loan registers, cash summaries, and operational reports. |
| **Verified** | ✓ |

Select report type and date range. Export where available.

---

## 16. Settings

### 16.1 Organization profile

| | |
|---|---|
| **Route** | `/settings/organization` |
| **Purpose** | Shop name, proprietor, address shown on receipts. |
| **Verified** | ✓ |

Current: **Kabilan Pawn Shop** — Prop.: M. Kabilan, M.E.,

---

### 16.2 Branches

| | |
|---|---|
| **Route** | `/settings/branches` |
| **Purpose** | Manage branch codes, addresses, and contact numbers. |
| **Verified** | ✓ |

Primary branch: **MAIN** — Usilampatti.

---

### 16.3 Application preferences

| | |
|---|---|
| **Route** | `/settings/preferences` |
| **Purpose** | Enable optional modules, QR codes, session timeout, and dashboard refresh. |
| **Verified** | ✓ |

**How to use (Super Admin only):**

1. Open **Settings → Application preferences**.
2. Set **Dashboard auto-refresh** interval (minimum 30 seconds).
3. Set **Session timeout** — users are logged out after this many minutes of inactivity.
4. Toggle **Loan item QR codes** — when ON, each receipt gets one QR showing customer name, ID, mobile, and receipt number (loan detail, inventory manage panel, and print).
5. Enable optional modules as needed: Bank Loans, Auctions, Investments, GL, Notifications.
6. Click **Save** — sidebar and features update immediately.
7. When you turn QR codes ON, open loans are backfilled automatically.

---

### 16.4 Security — Users

| | |
|---|---|
| **Route** | `/settings/security/users` |
| **Purpose** | Create and manage system login accounts. |
| **Verified** | ✓ |

---

### 16.5 Security — Roles & permissions

| | |
|---|---|
| **Route** | `/settings/security/roles` |
| **Purpose** | Role-based access matrix per module (view/create/edit/delete). |
| **Verified** | ✓ |

---

### 16.6 Security — Audit log

| | |
|---|---|
| **Route** | `/settings/security/audit` |
| **Purpose** | Timestamped log of sensitive actions (who did what, when). |
| **Verified** | ✓ |

---

## 17. Master data

Access via **Master Data** in the sidebar (below Dashboard).

### 17.1 Commodity categories

| | |
|---|---|
| **Route** | `/masters/categories` |
| **Purpose** | Top-level types: Gold, Silver, etc. |
| **Verified** | ✓ — 5 categories imported |

---

### 17.2 Sub-categories

| | |
|---|---|
| **Route** | `/masters/sub-categories` |
| **Purpose** | Groupings under each commodity (e.g. Ring, Chain, Thali). |
| **Verified** | ✓ — 25 sub-categories |

---

### 17.3 Sub-items

| | |
|---|---|
| **Route** | `/masters/sub-items` |
| **Purpose** | Specific item names used on pawn receipts (Tamil/English). |
| **Verified** | ✓ — 185 items |

---

### 17.4 Interest declarations

| | |
|---|---|
| **Route** | `/masters/interest-declarations` |
| **Purpose** | Interest % slabs by commodity and loan amount range. |
| **Verified** | ✓ |

Rates differ for **general customers** vs **other shop** loans.

---

### 17.5 Employees

| | |
|---|---|
| **Route** | `/masters/employees` |
| **Purpose** | Shop staff master for advances and internal reference. |
| **Verified** | ✓ |

---

## 18. Typical daily workflows

### New customer pawn

```
Customers → New Customer → Save → Loans → New Pawn Loan → Print receipt
```

If QR codes are enabled, the receipt includes a scannable QR with customer name, ID, mobile, and receipt number.

### Verify customer at counter (QR)

```
Loans → search receipt → scan QR on detail page
OR Inventory → search receipt → Manage → scan QR at top of panel
```

### Renewal

```
Dashboard (renewals due) → Renewals → Easy renewal → Enter PIN → New receipt
```

### Interest only

```
Part payments → Record → Select loan → Enter amount
```

### Bank re-pledge

```
Bank loans → Batch deposit → Select loans → Enter bank details
```

---

## 19. Maintenance & testing (technical)

| Task | Command |
|------|---------|
| Reset DB (schema + seed) | `cd pawn-ts && npx prisma db push --force-reset --accept-data-loss && npm run db:seed` |
| Run UI smoke tests | `cd pawn-erp && npm run test:e2e` |

**Prerequisites for tests:** API on port `3002`, frontend on port `5174`.

Legacy smoke tests are **read-only** — they do not create E2E test customers or mutate master data. Workflow tests run only with the standard `test:e2e` command against a seed database.

---

## 20. Troubleshooting

| Issue | Resolution |
|-------|------------|
| Cannot edit a loan | Loan may be closed (`is_settled = 1`). Only open loans are editable. |
| Receipt number already exists | Invoice numbers are unique per branch. Use the next available number. |
| Module missing from sidebar | Enable it under **Settings → Application preferences**. |
| QR code not showing | Enable **Loan item QR codes** under Settings → Application preferences (Super Admin). |
| QR scan in inventory search | QR scan is not available in inventory search — search by receipt number or customer details instead. |
| Session expired | Default idle timeout is 30 minutes. Sign in again. |
| Interest rate not auto-filling | Check **Masters → Interest declarations** for the commodity and amount slab. |
| Tamil text on receipts | Ensure customer and item names were entered in master data; language switcher affects UI only. |
| Dashboard numbers look wrong | **Today's Operations** shows today only — interest excludes redemption principal; released loans exclude renewals. |

---

## 21. Document history

| Date | Change |
|------|--------|
| 10 Jun 2026 | Dashboard today's metrics, receipt QR codes, inventory stock-check workflow, daily book steps |
| 15 Jun 2026 | Initial guide from legacy import + 34 passing smoke tests |

For legacy system behaviour reference, see [`generated/Existing-System.md`](../generated/Existing-System.md).
