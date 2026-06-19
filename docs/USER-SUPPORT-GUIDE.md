# Pawn ERP — User Support Guide

**Organization:** Kabilan Pawn Shop  
**Document version:** 1.0  
**Last verified:** 15 June 2026  
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
| **Purpose** | Operational overview: open loans, renewals due, cash position, and quick actions. |
| **Verified** | ✓ Smoke test passed |

### What you see

- KPI cards: open loans, amounts disbursed, renewals due, overdue counts.
- Charts: loan trends, commodity mix, branch performance.
- Quick actions: New loan, Renew, Part payment, Close loan, Bank batch, Auction.

### Common tasks

1. Review overdue and renewal-due counts at the start of the day.
2. Click a KPI card or quick action to jump to the relevant module.
3. Supervisors use role-based sections (cashier vs manager views).

### Tips

- Figures reflect the **selected branch** in the toolbar.
- Large legacy history may take a moment to load on first visit.

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
4. Add **collateral items**: sub-category, item type, purity, count, net weight.
5. Enter **loan amount**; amount in words is generated automatically.
6. Confirm **interest rate** (from interest slabs) and **renewal date**.
7. Save and print receipt.

---

### 4.3 Loan detail

| | |
|---|---|
| **Route** | `/loans/:id` |
| **Purpose** | Full view of a single pawn: collateral, payments, renewal history, bank deposit status. |
| **Verified** | ✓ |

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
| **Purpose** | Print-friendly pawn receipt for the customer. |
| **Verified** | ✓ |

Opens without the main sidebar for clean printing.

---

## 5. Part payment (interest)

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

## 9. Inventory

| | |
|---|---|
| **Route** | `/inventory` |
| **Purpose** | Product items held for retail sale (e.g. silver articles from auctions or purchases). |
| **Verified** | ✓ |

Distinct from live pawn collateral (which is tied to open loans).

---

## 10. Daily book & cash

| | |
|---|---|
| **Route** | `/accounts` |
| **Purpose** | Daily income and expense ledger; vault and counter cash reconciliation. |
| **Verified** | ✓ |

Record shop-level cash movements not tied to a single loan transaction.

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
| **Purpose** | Enable/disable optional modules, session timeout, receipt defaults. |
| **Verified** | ✓ |

Toggle: Bank Loans, Auctions, Investments, GL, Notifications.

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
| Session expired | Default idle timeout is 30 minutes. Sign in again. |
| Interest rate not auto-filling | Check **Masters → Interest declarations** for the commodity and amount slab. |
| Tamil text on receipts | Ensure customer and item names were entered in master data; language switcher affects UI only. |

---

## 21. Document history

| Date | Change |
|------|--------|
| 15 Jun 2026 | Initial guide from legacy import + 34 passing smoke tests |

For legacy system behaviour reference, see [`generated/Existing-System.md`](../generated/Existing-System.md).
