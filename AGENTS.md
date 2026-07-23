# AGENTS.md — My Finance: Agent Control Guide

This file is for AI agents (like opencode) that need to understand, modify, or interact with this web app.

Agents **do not click buttons or navigate pages**. Instead, they use the REST API directly via HTTP requests. Every user action has an API equivalent.

```
User clicks "Add Expense" button → POST /api/expenses { amount, categoryId, date, notes }
User views dashboard → GET /api/dashboard?month=7&year=2026
```

---

## API Reference (Every Endpoint)

### Dashboard

```
GET /api/dashboard?month=7&year=2026
```

**Response:**
```json
{
  "month": 7, "year": 2026,
  "totalIncome": 5000000,
  "incomeSources": [{ "name": "Salary", "expected": 5000000, "actual": 0 }],
  "totalExpenses": 4268100,
  "surplus": 731900,
  "totalLoanBalance": 107739732,
  "totalLoanPayment": 1510000,
  "financialHealth": "healthy",
  "availableCash": 2400000,
  "startingBalance": 4000000,
  "receivedIncome": 0,
  "pendingIncome": 5000000
}
```

### Transactions (Expenses)

**List transactions for a month:**
```
GET /api/expenses?month=7&year=2026
```

**Response:**
```json
{
  "month": 7, "year": 2026,
  "items": [{ "id": "...", "amount": 150000, "categoryId": "...", "name": "Rice - Market",
    "date": "2026-07-15T00:00:00.000Z", "notes": "Market",
    "category": { "id": "...", "name": "Rice", "icon": "🍚", "color": "#F59E0B" }
  }],
  "totalAmount": 150000
}
```

**Create a transaction (add expense):**
```
POST /api/expenses
Body: {
  "amount": 150000,
  "categoryId": "category-cuid-here",
  "name": "Rice - Market",
  "date": "2026-07-15",
  "notes": "Market",
  "month": 7, "year": 2026
}
```

The `date` field is saved as midnight UTC + current time-of-day offset to produce a unique epoch timestamp (used for dedup).

**Delete a transaction:**
```
DELETE /api/expenses/{transaction-id}
```

### Categories

**List all categories (with transaction count):**
```
GET /api/categories
```

**Response:**
```json
[{ "id": "...", "name": "Rice", "icon": "🍚", "color": "#F59E0B",
  "isPlanBudget": true, "budgetAmount": 200000,
  "_count": { "transactions": 3 }
}]
```

**Create a category:**
```
POST /api/categories
Body: { "name": "Petrol", "icon": "⛽", "color": "#EF4444", "isPlanBudget": true, "budgetAmount": 50000 }
```

**Update a category (icon, color, or plan budget):**
```
PUT /api/categories/{id}
Body: { "name": "Petrol", "icon": "⛽", "color": "#22C55E", "isPlanBudget": false, "budgetAmount": null }
```

UUID is preserved automatically when updating — no need to send it.

**Delete a category (protected: Extra, Income cannot be deleted):**
```
DELETE /api/categories/{id}
```
Returns 403 if the category is "Extra" or "Income". All existing transactions have their `categoryId` set to null.

### Income

**List income sources:**
```
GET /api/income
```

**Create income source:**
```
POST /api/income
Body: { "name": "Salary", "amount": 5000000, "type": "salary" }
```

**Record income for a month:**
```
POST /api/income/{source-id}/record
Body: { "amount": 5000000, "month": 7, "year": 2026 }
```

### Loans

**List all loans:**
```
GET /api/loans
```

**Response:** Each loan includes `currentMonthPaid` (boolean).
```json
[{ "name": "Home Loan", "principal": 109399500, "balance": 107739732,
  "monthlyPayment": 1510000, "termMonths": 144, "interestRate": 13,
  "monthsPaid": 5, "currentMonthPaid": false
}]
```

**Record a loan payment:**
```
POST /api/loans/{id}/pay
Body: { "amount": 1510000 }
```

**Undo the most recent loan payment:**
```
DELETE /api/loans/{id}/pay/undo
```

**Amortization schedule:**
```
GET /api/loans/{id}/amortization
```

### Cash Flow

```
GET /api/cashflow?months=12
```

### Sync (Mobile App Import)

**Full sync (push mobile data → receive server state):**
```
POST /api/sync
Body: {
  "categories": [{ "name": "Rice", "icon": "🍚", "color": "#F59E0B",
    "isPlanBudget": true, "budgetAmount": 200000,
    "uuid": "abc-123", "updatedAt": 1784264094078 }],
  "expenses": [{ "name": "Rice - Market", "amount": 150000, "category": "Rice",
    "date": 1752595200000, "uuid": "def-456", "updatedAt": 1784261312205,
    "note": "Market" }],
  "income": [{ "amount": 5000000, "date": 1752595200000,
    "uuid": "ghi-789", "updatedAt": 1784261250060, "note": "Synced from web" }]
}
```

**Dedup logic:**
- **Categories:** Matched by UUID if available, then by name as fallback. `updatedAt` timestamps compared — the side with the newer timestamp wins.
- **Expenses:** Matched by UUID. Newer `updatedAt` wins. No fallback.
- **Income:** Matched by UUID. Newer `updatedAt` wins. Matches note to IncomeSource name (creates new source if not found). Without UUID, matched by `(amount, month, year)` for same source.

**Response:**
```json
{
  "synced": { "categories": 2, "expenses": 5, "income": 2 },
  "skipped": { "categories": 0, "expenses": 0, "income": 0 },
  "serverData": { "categories": [...], "expenses": [...], "incomes": [...], "month": 7, "year": 2026 }
}
```

### Settings

```
GET /api/settings
PUT /api/settings
Body: { "currency": "MMK", "starting_balance": "4000000" }
```

---

## Common Workflows (API Sequences)

### Workflow 1: Add a daily expense

```
Step 1: GET /api/categories
        → Find the "Rice" category ID

Step 2: GET /api/expenses?month=7&year=2026
        → Check current month's expenses and budget remaining

Step 3: POST /api/expenses
        Body: { categoryId: "rice-id", amount: 150000, date: "2026-07-15", notes: "Market", month: 7, year: 2026 }

Step 4: GET /api/expenses?month=7&year=2026
        → Verify the expense was added (check totalAmount)
```

### Workflow 2: Receive salary and check dashboard

```
Step 1: GET /api/income
        → Find the salary source ID

Step 2: POST /api/income/{salary-id}/record
        Body: { amount: 5000000, month: 7, year: 2026 }

Step 3: GET /api/dashboard?month=7&year=2026
        → Confirm receivedIncome = 5000000, availableCash updated
```

### Workflow 3: Pay home loan

```
Step 1: GET /api/loans
        → Check currentMonthPaid field. If false, it's unpaid.

Step 2: POST /api/loans/{loan-id}/pay
        Body: { amount: 1510000 }

Step 3: GET /api/loans
        → Confirm currentMonthPaid = true, balance decreased

Step 4 (if misclicked): DELETE /api/loans/{loan-id}/pay/undo
```

### Workflow 4: Create a category with budget

```
Step 1: POST /api/categories
        Body: { name: "Petrol", icon: "⛽", color: "#EF4444", isPlanBudget: true, budgetAmount: 50000 }
        → Get the category ID from response

Step 2: GET /api/expenses?month=7&year=2026
        → Petrol now appears in Plan Budget tab (even with 0 transactions)
```

### Workflow 5: Sync mobile app data

```
Step 1: Mobile app sends POST /api/sync
        Body: {
          categories: [...], (with isPlanBudget, budgetAmount, uuid, updatedAt)
          expenses: [{ amount: 150000, category: "Rice", date: 1752595200000, uuid, updatedAt }],
          income: [{ amount: 30000, date: 1784179418029, uuid, updatedAt, note: "From Mom" }]
        }

Step 2: Web processes:
        - Categories: match by UUID → compare updatedAt → newer wins. Also match by name fallback.
        - Expenses: match by UUID → compare updatedAt → newer wins.
        - Income: match by UUID → compare updatedAt → newer wins. Note → IncomeSource name.

Step 3: Response: { synced: {...}, skipped: {...}, serverData: {...} }
        → Mobile replaces local cache with serverData
```

**Note:** Income from mobile goes to a dedicated IncomeSource per note (e.g., "From Mom" creates an "From Mom" source). "Mobile Import" is used as fallback for unnamed income.

---

## Codebase Map

```
prisma/
  schema.prisma          — 8 models (Transaction, Category, IncomeSource, Income, Loan, LoanPayment, Setting)
  seed.ts                — minimal seed (Settings + default Extra/Income categories with fixed UUIDs)
  cleanup.ts             — clears all data EXCEPT loans

src/
  app/
    page.tsx             — Dashboard (income/expenses/surplus/cash available/loans)
    expenses/page.tsx    — Expenses (Plan Budget / Extra tabs, add/delete transactions, budget remaining)
    categories/page.tsx  — Category management (icons, colors, isPlanBudget toggles, budget amount)
    income/page.tsx      — Income sources + receive/record, per-source income list
    loans/page.tsx       — Loans list with This Month status, Pay/Undo
    loans/[id]/page.tsx  — Loan detail, payment history, amortization
    loans/compare/page.tsx— Loan calculator + amortization
    cashflow/page.tsx    — Cash flow projection
    settings/page.tsx    — Currency, starting balance
    api/                 — All REST API routes
  components/
    Sidebar.tsx           — Navigation (7 items: Dashboard, Income, Expenses, Categories, Loans, Cash Flow, Settings)
    ui/                   — Reusable M3 components (Modal, Chip, Card, ConfirmDialog, etc.)
  lib/
    prisma.ts            — Prisma singleton client
    format.ts            — formatMMK(), formatDate(), monthNames
README.md               — End-user guide
AGENTS.md               — This file
```

---

## Development Workflow

### Edit → Build → Restart

```powershell
# 1. Stop the server
$p = (netstat -ano | Select-String "3002" | Select-String "LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1)
if ($p -and $p -ne '0') { Stop-Process -Id $p -Force }

# 2. If schema changed: push to Neon + generate Prisma client
npx prisma db push
npx prisma generate

# 3. Build
npx next build

# 4. Start
cmd /c "start /b cmd /c npm start"
```

### When to stop the server vs not

| Operation | Need to stop server? |
|---|---|
| Edit a page/component | No |
| Edit an API route | No |
| Edit `prisma/schema.prisma` | Yes (needs `prisma generate`) |
| `prisma db push` | Yes (DLL lock) |
| `prisma generate` | Yes (EPERM error if server running) |
| `npm run build` | No |
| `npm start` | Yes (port 3002 must be free) |

---

## Common Gotchas

### 1. EPERM on prisma generate

```
EPERM: ...\query_engine-windows.dll.node.tmpXXXX
```

**Cause:** The running Node server holds a lock on `query_engine-windows.dll.node`. `prisma generate` needs to rename/overwrite this file.

**Fix:** Stop the server first, THEN run `prisma generate`, THEN rebuild and restart.

### 2. .next cache after deleting pages

If you delete a page directory (e.g., `src/app/payments/`), the Next.js type checker still references it from `.next/dev/types/`. The build fails with:

```
Cannot find module '../../../src/app/payments/page.js'
```

**Fix:** `Remove-Item -Recurse -Force .next` then rebuild.

### 3. Neon scale-to-zero timeouts

Neon (PostgreSQL) puts the database to sleep after 5 minutes of inactivity. The first query after sleep takes 3-10 seconds to wake up. The API request may timeout.

**Fix:** Retry with a longer timeout, or make a warmup request first:
```powershell
(Invoke-WebRequest -Uri "http://localhost:3002/api/settings" -UseBasicParsing -TimeoutSec 15).StatusCode
```

If timeout persists longer than 15 seconds, the connection may be broken. Check the Neon dashboard.

### 4. Branch confusion (main vs master)

The `main` branch has the default Next.js scaffold. All the app code is on the `master` branch.

**Fix:** `git checkout master`

### 5. `$pid` is read-only in PowerShell

```
Cannot overwrite variable PID because it is read-only or constant.
```

**Fix:** Use a different variable name like `$p` or `$processId`.

### 6. PM2 is broken

```
connect EPERM \\.\pipe\rpc.sock
```

PM2 has a named pipe issue on this Windows setup. Use direct `npm start` instead:
```powershell
cmd /c "start /b cmd /c npm start"
```

### 7. Google Fonts build failure

```
Failed to fetch `Geist` from Google Fonts.
```

No internet access on this PC. The app has been switched to system fonts (Segoe UI). Do NOT re-add Google Font imports to `layout.tsx` or `globals.css`.

### 8. Type error after schema/model rename

When you rename a Prisma model, ALL files using `prisma.ModelName` must be updated. Use `grep` to find all references:
```powershell
rg "prisma\.oldName" --include "*.ts"
```

After renaming, also delete `.next` and rebuild — the TypeScript validator caches old types.

---

## Database Operations

### Schema changes (safe)
```powershell
npx prisma db push
```
This syncs the schema to Neon without data loss.

### Schema changes (destructive)
```powershell
npx prisma db push --force-reset
```
Drops all tables and recreates them. **ALL DATA IS LOST.** Only use when:
- Schema has incompatible changes
- Database is empty anyway
- User explicitly approves

### Seed data
```powershell
npx prisma db seed
```
Creates: currency setting (MMK), starting_balance setting (0), Extra category (✨, uuid: 00000000-0000-0000-0000-000000000001), Income category (💰, uuid: 00000000-0000-0000-0000-000000000002).

### Reset + seed
```powershell
npx prisma db push --force-reset
npx prisma db seed
```

---

## What NOT to Do

1. **Never force-reset the database without asking the user.** This destroys all data.
2. **Never commit `.env` or database files.** They are in `.gitignore`.
3. **Never edit `.env` during an active session.** The running server reads it at startup.
4. **Never delete files without checking all references** with grep first.
5. **Never add Google Font imports.** They require internet and will break the build.
6. **Never re-add Person, Expense, Payment, or PlanBudget models.** They were deliberately removed. Use Transaction for expenses and Category.isPlanBudget for budgets.
7. **Never reference `prisma.payment`, `prisma.expense`, or `prisma.planBudget`.** These models no longer exist. Use `prisma.transaction` with `type: 'EXPENSE'`.
8. **Never use `deviceId` or `mobileId` for dedup.** They were removed from the schema. Use `uuid` with `@unique` and `updatedAt` timestamp comparison instead.
9. **Never query `Transaction` without a `type` filter** unless you explicitly want both EXPENSE and INCOME records together.

---

## Data Model Summary

### Transaction (replaces both Expense and Payment)
| Field | Type | Notes |
|---|---|---|
| id | String | CUID |
| amount | Float | Always positive |
| type | String | "EXPENSE" or "INCOME" |
| categoryId | String? | FK → Category.id |
| name | String? | Display name (auto-filled from notes if present, otherwise category name) |
| date | DateTime | Transaction date. Web creates with midnight UTC + current time-of-day offset. Mobile uses epoch ms. |
| method | String? | "cash", "bank", "mobile_wallet" |
| notes | String? | User description. Used as display name in the expenses page. |
| month | Int | Extracted from date |
| year | Int | Extracted from date |
| uuid | String? | @unique — device-generated UUID for dedup |
| updatedAt | DateTime | @updatedAt — auto-managed by Prisma for conflict resolution |
| category | Category? | Relation |

### Category
| Field | Type | Notes |
|---|---|---|
| id | String | CUID |
| name | String | UNIQUE |
| icon | String | Emoji |
| color | String | Hex color (mobile-compatible palette) |
| uuid | String? | @unique — device-generated UUID for dedup |
| isPlanBudget | Boolean | true if this category has a monthly budget |
| budgetAmount | Float? | Monthly budget amount (null if no budget) |
| updatedAt | DateTime | @updatedAt |

### IncomeSource
| Field | Type | Notes |
|---|---|---|
| id | String | CUID |
| name | String | "Salary", "Mobile Import", "From Mom", etc. |
| amount | Float | Expected monthly amount |
| type | String | "salary", "freelance", "business", "other" |

### Income
| Field | Type | Notes |
|---|---|---|
| id | String | CUID |
| sourceId | String | FK → IncomeSource.id |
| amount | Float | Received amount |
| month, year | Int | Period of receipt |
| receivedDate | DateTime | When it was received |
| notes | String? | User note (used as IncomeSource name on sync) |
| uuid | String? | @unique — device-generated UUID for dedup |
| updatedAt | DateTime | @updatedAt |
| UNIQUE: | [sourceId, month, year] | One record per source per month |

### Loan
| Field | Type | Notes |
|---|---|---|
| id | String | CUID |
| name | String | "Home Loan" |
| principal | Float | Original loan amount |
| balance | Float | Current remaining balance |
| interestRate | Float | Annual rate (e.g., 13 for 13%) |
| monthlyPayment | Float | Fixed monthly payment |
| termMonths | Int | Total loan term in months |
| startDate | DateTime | Loan origination date |
| totalPaid | Float | Sum of all payments made |
| status | String | "active" or "paid" |

### LoanPayment
| Field | Type | Notes |
|---|---|---|
| id | String | CUID |
| loanId | String | FK → Loan.id |
| amount | Float | Payment amount |
| principalPart | Float | Portion going to principal |
| interestPart | Float | Portion going to interest |
| remainingAfter | Float | Balance after this payment |
| paymentDate | DateTime | When the payment was made |

### Setting
| Field | Type | Notes |
|---|---|---|
| key | String | UNIQUE — "currency", "starting_balance" |
| value | String | e.g., "MMK", "4000000" |
