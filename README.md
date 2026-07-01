# My Finance

Personal finance management app — track income, expenses, people, payments, and loans with Material Design 3 UI.

**Currency:** MMK (Myanmar Kyat) | **Language:** English + Myanmar

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | SQLite via Prisma ORM |
| Styling | Tailwind CSS v4 + Material Design 3 tokens |
| Data Fetching | SWR |
| Production | Node.js via `npm start` (PM2 unavailable on this Windows setup) |

## What You Need

- **Node.js** v26+
- **npm** (bundled with Node.js)

## Quick Start

### 1. Clone

```bash
git clone https://github.com/Than-Zaw-Hein/Financer.git
cd Financer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment

Create `.env` in the project root:

```
DATABASE_URL="file:./dev.db"
```

### 4. Database Setup

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

This creates the SQLite database with 27 sample expenses, 5 people, and a home loan for Than Zaw Hein.

### 5. Run (Development)

```bash
npm run dev
```

Open **http://localhost:3002**

---

## How to Build

```bash
npm run build
```

This creates an optimized production build in `.next/`.

## How to Clear Cache

```bash
npm run build
```

To force a clean rebuild delete the `.next` folder first:

```bash
Remove-Item -Recurse -Force .next
npx prisma generate
npm run build
```

## How to Run (Production)

After building:

```bash
npm start
```

Runs on **http://localhost:3002** (bound to `0.0.0.0` for LAN access).

---

## How to Deploy (24/7)

### Direct Production Mode

```bash
npm run build
npm start
```

Keep the terminal window open. The app stays live on port 3002.

### Auto-start on Boot (Windows)

Press `Win + R`, type `shell:startup`, press Enter. Copy `startup.bat` from the project folder into the Startup folder. The app will start automatically when you log in.

> The `startup.bat` file runs `npm start` from the project directory.

---

## How to Update (Pull Latest Code)

```bash
git pull
npm install
npm run build
```

Then restart the server (Ctrl+C the old one, then `npm start` again).

---

## Firewall & Network

For LAN access from other devices (phone, tablet):

1. Ensure your Windows network profile is **Private**:
   ```powershell
   Get-NetConnectionProfile | select Name, NetworkCategory
   ```

2. Allow port 3002 through Windows Firewall (run as Administrator):
   ```powershell
   New-NetFirewallRule -DisplayName "My Finance (3002)" -Direction Inbound -Protocol TCP -LocalPort 3002 -Action Allow
   ```

3. Access from other devices on the same network: `http://192.168.1.9:3002` (or `http://Dev-TZH.local:3002` via mDNS)

---

## Features

### Dashboard
- **Cash Available Now** — Shows real liquid cash: `startingBalance + receivedIncome - paidExpenses`. Also shows pending (expected but not yet received) income.
- **Summary Cards** — Income, Expenses, Surplus, Remaining Cash for the selected month.
- **Expense Progress** — Progress bar showing % paid, with paid/unpaid/partial counts.
- **Income Sources** — Lists each source with expected and actual amounts.
- **Loan Summary** — Total balance across all loans and combined monthly payment.
- **Financial Health** — Auto-calculated health status (healthy / warning / critical).
- Month navigation (prev/next) with all data updating accordingly.

### Expenses
- **Tabs** — Segmented M3 tabs to switch between **Recurring** (monthly) and **Extra** (one-time) expenses, each with item count.
- **Status Sorting** — Within each category group, items are sorted: unpaid → partial → paid.
- **Date Display** — Each item shows its due date (e.g., `Due: 28 Jun`) or created date. Person name shown after date.
- **Paid / Remaining** — Each item displays how much has been paid and how much remains.
- **Quick Pay** — One-click payment recording directly from the expenses list.
- **Status Cycle** — Click the status circle to cycle: unpaid → partial → paid.
- **Category Grouping** — Items grouped by category (Family, Groceries, Housing, etc.) with per-category totals.
- **Status Filter** — Filter by All / Paid / Unpaid / Partial via M3 chips.

### Income
- **Multiple Sources** — Track salary, freelance, business, and other income sources.
- **"Receive" Button** — One-click button per source to mark the current month's income as received. Shows "Received ✓" when already done.
- **Record History** — Detailed recording with month/year/amount. Use "Record" button for custom amounts or past months.
- **Total Monthly Income** — Card showing combined expected income from all sources.

### People
- **Contact Management** — Track people with name, nickname, relation, and notes.
- **Balance Tracking** — To Pay / Paid / Remaining cards per person for the selected month.
- **Quick Pay** — Record a payment to a person directly from the person's card.
- **Person Detail** — Click a person to see full payment history and balance details.

### Payments
- **Date + Category Grouping** — Payments grouped first by date then by expense category within each date.
- **Payment History** — Each payment shows expense name, person, method, and amount. M3 card layout.
- **Filter Modal** — Filter by date (exact day) and/or category. Active filter count badge on the Filter button.
- **Month Navigation** — Browse payments by month/year.
- **Inline Expense Creation** — Create a new expense directly from the payment recording form.

### Loans
- **"This Month" Payment Status** — Each loan card shows whether the current month's payment is **Paid** (green badge) or **Unpaid** (red badge).
- **"Pay This Month" Button** — One-click button to record the standard monthly payment immediately (uses the loan's `monthlyPayment` amount).
- **"Undo Pay" Button** — Accidentally paid? Click Undo to reverse the most recent payment (restores balance).
- **Loan Detail Page** — Shows full loan info, editable fields, payment history (last 10), and record-payment input.
- **Amortization Schedule** — Collapsible schedule responsive for mobile (hides Interest column on small screens, larger text and padding for readability).
- **Loan Comparison** — Compare multiple loans side-by-side with fixed monthly payment amounts.
- **Progress Bar** — Visual progress toward full repayment.
- **Summary Cards** — Total balance and total monthly payment across all loans.

### Cash Flow
- **Daily Running Balance** — Shows each day's transactions and the resulting balance.
- **Starting Balance** — Uses `starting_balance` from Settings as the initial value.
- **Income Timing Awareness** — Income contribution to the running balance is based on received date, not expected date.
- **Loan Payment Exclusion** — Already-paid loan payments are excluded from current month's expense total.

### Settings
- **Currency** — Set display currency (default: MMK).
- **Starting Balance** — Set the opening cash balance used by Cash Flow and Dashboard.
- **Default Income** — Set default income source for recording.

### Other
- **Dark Mode** — Full M3 dark theme support (follows system preference).
- **Mobile Responsive** — Sidebar collapses with hamburger toggle on small screens.
- **M3 Design System** — 4 tonal palettes (primary, secondary, tertiary, error), typography scale, shape tokens, elevation shadows.

---

## Database Management

| Command | What it does |
|---|---|
| `npx prisma db seed` | Seed with sample data (27 expenses, 5 people, 1 home loan) |
| `npx prisma migrate dev --name <name>` | Create a new migration |
| `npx prisma studio` | Open visual database browser at http://localhost:5555 |
| `npx tsx prisma/cleanup.ts` | Clear ALL data EXCEPT loans and loan payments (preserves home loan records) |
| `npx tsx prisma/set-balance.ts` | Set or update the `starting_balance` setting used by Cash Flow and Dashboard |

---

## Cash Flow Strategy

### How Salary Timing Works

Your salary arrives between the **25th and 30th/31st** of each month, but expenses are due from the **1st** onward. This creates a cash flow gap.

**The "Cash Available Now" card on the Dashboard helps you manage this:**

```
Cash Available Now      2,400,000 Ks
(Starting 4M + Received 0 - Paid 1.6M)
Expected This Month     5,000,000 Ks (Pending: 5,000,000)
```

- **Available Cash** = what you can actually spend right now
- **Expected Income** = total income including what hasn't arrived yet
- **Pending** = expected but not yet received

### Practical Approach: Buffer Method

1. Save a buffer of ~1 month's salary (5,000,000 MMK) from your surplus
2. Early in the month: spend from the buffer
3. When salary arrives (25th–31st): refill the buffer
4. Over time, your surplus grows the buffer automatically

Your monthly surplus is ~741,900 MMK → in ~7 months you'll have a full month's buffer.

### App's Role

- **Income page**: Mark salary as "Received ✓" when it arrives (one click)
- **Dashboard**: "Cash Available Now" updates in real-time as you receive income
- **Cash Flow page**: See the exact day your balance changes

---

## Project Structure

```
Financer-webapp/
├── prisma/
│   ├── schema.prisma          # 8 models (Expense, Income, Person, Payment, Loan, etc.)
│   ├── seed.ts                # Initial seed data
│   ├── cleanup.ts             # Clear data while preserving loans
│   └── set-balance.ts         # Set starting_balance setting
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── cashflow/      # GET — cash flow analysis
│   │   │   ├── dashboard/     # GET — summary with cash available
│   │   │   ├── expenses/      # GET/POST — list/create; [id] edit/delete
│   │   │   ├── income/        # GET/POST — list/create sources; [id] edit/delete/record
│   │   │   ├── loans/         # GET/POST — list/create; [id] edit/delete/pay/undo/amortization; compare
│   │   │   ├── payments/      # GET/POST — list/create; [id] edit/delete
│   │   │   ├── people/        # GET/POST — list/create; [id] edit/delete
│   │   │   └── settings/      # GET/PUT — app settings
│   │   ├── cashflow/          # Cash flow tracker page
│   │   ├── expenses/          # Expenses list + detail
│   │   ├── income/            # Income sources + receive button
│   │   ├── loans/             # Loans list, detail, compare
│   │   ├── payments/          # Payments grouped by date/category
│   │   ├── people/            # People/contacts list + detail
│   │   ├── settings/          # App settings page
│   │   ├── globals.css        # M3 design tokens (4 palettes, typography, elevations)
│   │   ├── layout.tsx         # Root layout with Sidebar
│   │   └── page.tsx           # Dashboard with Cash Available Now card
│   ├── components/
│   │   ├── Sidebar.tsx        # M3 NavigationRail (responsive)
│   │   └── ui/                # 9 shared M3 components
│   └── lib/
│       ├── prisma.ts          # Prisma singleton
│       └── format.ts          # MMK currency formatter
├── ecosystem.config.js        # PM2 config (broken on Windows — use npm start instead)
├── startup.bat                # Auto-start on boot helper
├── package.json
└── .env
```

## API Routes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard` | Dashboard summary including income, expenses, loans, cash available |
| GET/POST | `/api/income` | List all / Create income source |
| GET/PUT/DELETE | `/api/income/[id]` | Single income source |
| POST | `/api/income/[id]/record` | Record/receive income for a month |
| GET/POST | `/api/expenses` | List (month/year) / Create expense |
| GET/PUT/DELETE | `/api/expenses/[id]` | Single expense (status update, edit, delete) |
| GET/POST | `/api/people` | List / Create person |
| GET/PUT/DELETE | `/api/people/[id]` | Single person |
| GET/POST | `/api/payments` | List (month/year) / Create payment |
| GET/PUT/DELETE | `/api/payments/[id]` | Single payment |
| GET/POST | `/api/loans` | List (with monthsPaid, progress, currentMonthPaid) / Create loan |
| GET/PUT/DELETE | `/api/loans/[id]` | Single loan (edit, delete) |
| POST | `/api/loans/[id]/pay` | Record a loan payment (auto-calculates principal/interest) |
| DELETE | `/api/loans/[id]/pay/undo` | Undo the most recent loan payment |
| GET | `/api/loans/[id]/amortization` | Full amortization schedule (144 months) |
| GET | `/api/loans/compare` | Compare multiple loans with fixed monthly payment |
| GET | `/api/cashflow` | Daily cash flow with running balance |
| GET/PUT | `/api/settings` | Read/update app settings |

## PM2 Reference (Optional)

PM2 is installed globally but currently **broken on this Windows setup** due to a named pipe permission issue (`EPERM \\.\pipe\rpc.sock`). Use `npm start` instead.

| Command | What it does |
|---|---|
| `pm2 status` | Check if the app is running |
| `pm2 logs my-finance` | Watch live logs |
| `pm2 restart my-finance` | Restart the app |
| `pm2 stop my-finance` | Stop the app |
| `pm2 delete my-finance` | Remove app from PM2 |

To fix PM2 (requires reboot or reinstall): `npm uninstall -g pm2 && npm install -g pm2`
