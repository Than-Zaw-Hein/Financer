# My Finance — User Guide

Personal finance management app for MMK (Myanmar Kyat). Track income, expenses, budgets, and loans with a clean Material Design 3 interface.

---

## Core Concepts

### The Envelope Method

Every category (Food, Housing, Family, etc.) has a **Plan Budget** — like putting cash in an envelope at the start of the month. When you spend, the remaining budget decreases.

```
🍚 Rice     Budget: 200,000    Spent: 150,000    Remaining: 50,000
```

If you overspend, remaining turns negative (red). Don't worry — it just means you need to adjust next month.

### Plan Budget vs Extra

| Type | What it is | Example |
|---|---|---|
| **Plan Budget** | Regular monthly spending (category has a budget) | Rice budget 200,000 |
| **Extra** | One-time or unexpected (no budget set) | Hotpot outing 100,000 |

### Salary Timing Reality

Your salary arrives between the 25th and 30th/31st. But expenses start from the 1st. The **Cash Available Now** card on the Dashboard shows what you can actually spend right now:

```
Cash Available Now         2,400,000 Ks
(Balance + Received Income - Paid Expenses)
```

---

## Dashboard

The first page you see. Everything at a glance.

| Card | What it tells you |
|---|---|
| **Cash Available Now** | Your real liquid cash right now. Starting balance + income received this month − total expenses this month. |
| **Income** | Total income for this month (expected or actual). |
| **Expenses** | Total spent this month so far. |
| **Surplus** | Income − Expenses. Green = good. Red = overspending. |
| **Income Sources** | Each source with expected and actual received amounts. |
| **Loan Summary** | Total balance + monthly payment across all loans. |

Click **←** or **→** to view past or future months.

---

## Income

Start here. Add your salary source first.

### Add an Income Source

The app is pre-configured with the following income sources (automatically created during setup):

- **Salary (လစာ)** — 5,000,000 Ks

To manage income sources:
1. Click **+ Add Source** to create a new income source (e.g., freelance, rental)
2. Click **Receive** to mark this month's income as received
3. Click **Record** to enter income for a specific past month or custom amount

### Monthly Workflow

1. Between the 25th and 30th, your salary arrives
2. Open **Income** page
3. Click **Receive** next to your salary source — it's recorded instantly
4. The Dashboard now shows it as "Received ✓"

---

## Expenses

The main day-to-day page. Two tabs:

### Plan Budget Tab

Shows categories that have a budget for this month. Each category shows:

- Icon + name
- Total spent
- Budget vs remaining (red if over budget)
- Individual transactions

Categories with budgets but **no transactions yet** also appear (shows "No transactions yet"). This is useful for seeing where you haven't spent yet.

### Extra Tab

Shows one-time expenses not tied to any budget. These are the "unexpected" spending.

### Adding a Transaction

1. Click **+ Add**
2. Select a **Category** (from the list, excluding "Income")
3. The **Amount** auto-fills from the budget (for budgeted categories)
4. Enter the actual **Date**
5. Add a **Note** to describe what it was (e.g., "Market" or "Pyay")
6. Click **Save**

The note becomes the transaction name in the list, making it easy to distinguish different purchases:
```
🍚 Rice                   250,000 Ks
  Market · 200,000        15/07/2026    Del
  Pyay · 50,000           10/07/2026    Del
  Budget: 200,000 · Remaining: -50,000
```

### Budget Remaining (in Add Form)

When you select a category with a budget, the form shows a live preview:

```
Budget: 200,000 Ks · Spent: 150,000 Ks · Remaining: 50,000 Ks
```

As you adjust the amount, remaining updates in real-time. If you go over budget, the background turns red.

---

## Categories

Think of these as your labeled envelopes. The web app comes with two default categories:

| Category | Icon | Color | Purpose |
|---|---|---|---|
| **Extra** | ✨ | #F0C000 | Fallback when a category is deleted |
| **Income** | 💰 | #4CAF50 | Reserved for income tracking (hidden from expense category picker) |

### Creating a Category

1. Click **Categories** in the sidebar
2. Click **+ Add Category**
3. Enter a **Name** (e.g., "Rice", "Housing", "Petrol")
4. Pick an **Icon** (81 emojis to choose from — scroll the grid)
5. Pick a **Color** (12 presets — tap to select)
6. Toggle **Set monthly budget** and enter an amount
7. Click **Save**

The new category now appears in:
- The Expenses page (with its icon and color)
- The Plan Budget tab (if you set a budget)
- The category dropdown in the Add Expense form

### Editing a Category

Click **Edit** next to any category. The form pre-fills with current values. If a budget exists for this month, it's pre-filled too.

### Deleting a Category

Click **Del** next to any category. A confirmation dialog appears.

> **Protected:** The **Extra** and **Income** categories cannot be deleted. They are system defaults.

When you delete a category, all associated transactions lose their category link (they become uncategorized). The category is permanently removed.

---

## Loans

Track your home loan or other loans with full amortization.

### Adding a Loan

1. Click **Loans** in the sidebar
2. Click **+ Add Loan**
3. Fill in details: Name, Lender, Principal, Balance, Interest Rate, Monthly Payment, Term (months), Start Date
4. Click **Save**

### This Month Payment Status

Each loan card shows:

```
This Month (Jul 2026)         1,510,000 Ks
[Paid ✓]                       [Undo Pay]
```

- **Paid** (green): Payment has been recorded this month
- **Unpaid** (red): Not yet paid this month

### Pay This Month

Click **Pay This Month** to instantly record a payment using the loan's standard monthly payment. The app automatically calculates principal vs interest.

### Undo Pay

Accidentally clicked Pay? Click **Undo** to reverse the most recent payment and restore the balance.

### Loan Detail Page

Click a loan's name to see:
- Full loan details (lender, principal, balance, rate, monthly, term, total paid)
- Payment History (last 10 payments with principal/interest breakdown)
- Record a custom payment amount
- Amortization Schedule (show/hide)

### Loan Calculator

Enter the amount you want to borrow, interest rate, and term to see your monthly payment, total interest, and total payment. The amortization schedule shows the full breakdown.

---

## Cash Flow

Shows the projected balance over the next 12 months based on:
- Starting balance (from Settings)
- Monthly income (from Income Sources)
- Monthly expenses + loan payments

Use this to plan ahead and see if you'll run short in any month.

---

## Settings

| Setting | Description |
|---|---|
| **Currency** | Display currency symbol (default: MMK) |
| **Starting Balance** | Your current cash on hand. This is the starting point for the Dashboard's "Cash Available Now" and Cash Flow projections. Update this whenever your actual cash position changes significantly. |

---

## Mobile Sync (Android)

If you use the **ExpendMemo** Android app, you can sync data between phone and web.

### Setup

1. Open the ExpendMemo app on your phone
2. Go to **Settings → Export to Web**
3. Enter the web app's URL: `http://192.168.1.9:3002`
4. Tap **Test Connection** — should show "Connected"
5. Tap **Sync Now** — your phone's expenses are sent to the web app

### What Gets Synced

| Data | Direction | Details |
|---|---|---|
| Categories (with icons & colors) | Mobile → Web | Upserted by name |
| Expenses (transactions) | Mobile → Web | New entries only (deduped) |
| Income records | Mobile → Web | Merged into income sources |
| Mobile push → Web pull | One-way | Mobile is input, web is archive |

### Periodic Sync

Enable **Use Server When Online** to auto-sync every 15 minutes when your phone is on the same Wi-Fi as the PC.

---

## Monthly Workflow (Recommended)

Here's a sample monthly routine:

### 1st–5th
- Open the app on the 1st
- Check **Plan Budget** tab — see all categories with budgets
- The new month starts fresh: budgets are reset, no transactions yet

### 25th–30th (Salary Day)
- Open **Income** page
- Click **Receive** next to your salary source
- Dashboard updates: Cash Available Now increases, Pending income zeroes

### Anytime (Daily Expenses)
- Open **Expenses** → **+ Add**
- Select category, enter amount, add a note
- The budget remaining updates live
- Repeat for every purchase

### Loan Payment (28th)
- Open **Loans**
- Your home loan shows "Unpaid" (red)
- Click **Pay This Month**

### End of Month Review
- Check **Dashboard** — was the month healthy or overspent?
- Check **Plan Budget** tab — which categories exceeded budget?
- Adjust budgets for next month via **Categories**

---

## FAQ

**Q: What happens at the start of a new month?**
A: The expenses page resets to the new month. Last month's data is preserved — just navigate back via the ← → arrows.

**Q: How do I record partial payments on a budget?**
A: You don't — just add each transaction as it happens. The budget remaining updates automatically. Each Rice purchase of 150,000 reduces the Rice budget remaining.

**Q: What does "Remaining: -50,000" mean?**
A: You've spent 50,000 more than the budget for that category. The red color is a warning — not an error. Consider adjusting the budget or reducing spending.

**Q: Can I use the app offline?**
A: The web app requires a connection to the Neon PostgreSQL database (cloud). The mobile app works fully offline — sync when on Wi-Fi.

**Q: I accidentally deleted something. Can I undo?**
A: For expenses: No. But you can re-add it. For loan payments: Yes, use **Undo Pay** on the loan card.

---

## Technical Reference

### Prerequisites
- Node.js v26+
- npm (comes with Node.js)

### Quick Start (Development)
```bash
git clone https://github.com/Than-Zaw-Hein/Financer.git
cd Financer
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Database Reset
```bash
npx prisma db push --force-reset
npx prisma db seed
```

### API Endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/dashboard` | Dashboard summary |
| GET/POST | `/api/income` | List/Create income sources |
| POST | `/api/income/[id]/record` | Record income for a month |
| GET/POST | `/api/expenses` | List/Create transactions |
| PUT/DELETE | `/api/expenses/[id]` | Edit/Delete a transaction |
| GET/POST | `/api/categories` | List/Create categories |
| PUT/DELETE | `/api/categories/[id]` | Edit/Delete a category |
| GET/POST | `/api/budgets` | List/Create plan budgets |
| DELETE | `/api/budgets/[id]` | Delete a budget |
| GET/POST | `/api/loans` | List/Create loans |
| POST | `/api/loans/[id]/pay` | Record a loan payment |
| DELETE | `/api/loans/[id]/pay/undo` | Undo last payment |
| GET | `/api/cashflow` | Cash flow projection |
| GET/PUT | `/api/settings` | App settings |
| GET | `/api/sync` | Full data export |
| POST | `/api/sync` | Sync mobile data |

### Tech Stack
- Next.js 16 (App Router)
- Prisma ORM + Neon PostgreSQL
- Tailwind CSS v4 + Material Design 3
- SWR for data fetching
