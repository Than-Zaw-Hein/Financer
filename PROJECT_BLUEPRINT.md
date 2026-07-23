# My Finance Application - Project Blueprint

## 📌 Executive Overview

**My Finance** is a full-stack personal finance, budget tracking, and loan amortization management platform built with React 18, Vite, Express, and PostgreSQL. It features full dual-mode persistence (PostgreSQL with automatic table creation + in-memory store fallback) and a bi-directional REST synchronization protocol designed to sync data seamlessly with the Android native **My Finance** mobile app.

---

## 🛠️ Tech Stack & Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Data Visualization**: Recharts / Canvas components

### Backend
- **Runtime**: Node.js with TypeScript (`tsx` in dev, `esbuild` bundled CommonJS `dist/server.cjs` in production)
- **Framework**: Express.js
- **Database Engine**: PostgreSQL (`pg` driver) with auto-schema creation and in-memory fallback
- **Sync Protocol**: REST-based JSON sync endpoint (`/api/sync`) with timestamp conflict resolution (`updatedAt`) and soft-deletions using UUIDs

---

## 🗄️ Database Schema & Data Models

### 1. `categories`
| Column | Type | Description |
|---|---|---|
| `id` | VARCHAR(64) PRIMARY KEY | Unique server category ID |
| `name` | VARCHAR(255) | Category display name |
| `icon` | VARCHAR(32) | Category icon or emoji |
| `color` | VARCHAR(32) | Hex color code |
| `uuid` | VARCHAR(128) UNIQUE | Client/Mobile cross-system UUID |
| `is_plan_budget` | BOOLEAN | Whether budget target is set |
| `budget_amount` | NUMERIC(15,2) | Monthly planned budget target |
| `is_deleted` | BOOLEAN | Soft delete flag |
| `updated_at` | TIMESTAMPTZ | ISO timestamp for conflict resolution |

### 2. `income_sources`
| Column | Type | Description |
|---|---|---|
| `id` | VARCHAR(64) PRIMARY KEY | Unique income source ID |
| `name` | VARCHAR(255) | Source name (e.g. Salary, Freelance) |
| `amount` | NUMERIC(15,2) | Expected monthly amount |
| `type` | VARCHAR(64) | Income type category |
| `notes` | TEXT | Description or notes |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Update timestamp |

### 3. `incomes`
| Column | Type | Description |
|---|---|---|
| `id` | VARCHAR(64) PRIMARY KEY | Unique income record ID |
| `source_id` | VARCHAR(64) REFERENCES income_sources | Foreign key to income source |
| `amount` | NUMERIC(15,2) | Actual received amount |
| `month` | INT | Month (1-12) |
| `year` | INT | Year (e.g. 2026) |
| `received_date` | TIMESTAMPTZ | Actual date received |
| `notes` | TEXT | Income notes |
| `uuid` | VARCHAR(128) UNIQUE | Client/Mobile cross-system UUID |
| `is_deleted` | BOOLEAN | Soft delete flag |
| `updated_at` | TIMESTAMPTZ | ISO timestamp for sync |

### 4. `transactions` (Expenses)
| Column | Type | Description |
|---|---|---|
| `id` | VARCHAR(64) PRIMARY KEY | Unique transaction ID |
| `amount` | NUMERIC(15,2) | Expense amount |
| `type` | VARCHAR(32) | Transaction type (`EXPENSE`) |
| `category_id` | VARCHAR(64) | Foreign key to category |
| `name` | VARCHAR(255) | Transaction item description |
| `date` | TIMESTAMPTZ | Transaction date |
| `method` | VARCHAR(64) | Payment method (KPay, Cash, WavePay, Card) |
| `notes` | TEXT | Additional notes |
| `month` | INT | Month (1-12) |
| `year` | INT | Year |
| `uuid` | VARCHAR(128) UNIQUE | Client/Mobile cross-system UUID |
| `is_deleted` | BOOLEAN | Soft delete flag |
| `updated_at` | TIMESTAMPTZ | ISO timestamp for sync |

### 5. `loans`
| Column | Type | Description |
|---|---|---|
| `id` | VARCHAR(64) PRIMARY KEY | Unique loan ID |
| `name` | VARCHAR(255) | Loan name / reference |
| `type` | VARCHAR(50) | Loan direction (`borrowed` = liability, `lent` = asset) |
| `due_day` | INT | Day of month payment/collection is due (1-31, default 25) |
| `lender` | VARCHAR(255) | Lender bank/person or Borrower person |
| `principal` | NUMERIC(15,2) | Original total principal or lent amount |
| `balance` | NUMERIC(15,2) | Current remaining balance |
| `interest_rate` | NUMERIC(5,2) | Annual interest rate percentage |
| `monthly_payment` | NUMERIC(15,2) | Monthly installment or collection amount |
| `term_months` | INT | Loan term duration in months |
| `start_date` | TIMESTAMPTZ | Loan start date |
| `total_paid` | NUMERIC(15,2) | Total principal + interest paid/collected |
| `status` | VARCHAR(32) | Status (`active`, `paid`) |
| `notes` | TEXT | Loan notes |
| `updated_at` | TIMESTAMPTZ | Update timestamp |

### 6. `loan_payments`
| Column | Type | Description |
|---|---|---|
| `id` | VARCHAR(64) PRIMARY KEY | Payment transaction ID |
| `loan_id` | VARCHAR(64) REFERENCES loans | Foreign key to loan |
| `amount` | NUMERIC(15,2) | Total payment amount |
| `principal_part` | NUMERIC(15,2) | Principal breakdown |
| `interest_part` | NUMERIC(15,2) | Interest breakdown |
| `remaining_after` | NUMERIC(15,2) | Balance after payment |
| `payment_date` | TIMESTAMPTZ | Date payment was recorded |
| `notes` | TEXT | Payment notes |

### 7. `settings`
| Column | Type | Description |
|---|---|---|
| `key` | VARCHAR(64) PRIMARY KEY | Setting key (`currency`, `starting_balance`) |
| `value` | TEXT | Setting value string |

---

## 📡 REST API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/dashboard` | `GET` | Financial summary, available cash, overdue alerts, health score |
| `/api/expenses` | `GET`, `POST` | List monthly expenses or record new expense |
| `/api/expenses/:id` | `PUT`, `DELETE` | Update expense or soft-delete expense |
| `/api/categories` | `GET`, `POST` | List categories or create category |
| `/api/categories/:id` | `PUT`, `DELETE` | Update category or soft-delete category |
| `/api/income` | `GET`, `POST` | List income sources/records or create income source |
| `/api/income/:id` | `PUT`, `DELETE` | Update or delete income source |
| `/api/income/:id/record` | `POST` | Record monthly income for a source |
| `/api/loans` | `GET`, `POST` | List loans (borrowed & lent) with due date & overdue status |
| `/api/loans/:id` | `PUT`, `DELETE` | Update loan or delete loan |
| `/api/loans/:id/pay` | `POST` | Record loan payment or collection |
| `/api/loans/:id/pay/undo` | `DELETE` | Revert/undo last loan payment |
| `/api/loans/:id/amortization` | `GET` | Generate full amortization payment schedule |
| `/api/loans/compare` | `GET` | Compare total interest & cost across all loans |
| `/api/cashflow` | `GET` | Monthly cash flow trends & 12-month rolling average metrics |
| `/api/sync` | `GET`, `POST` | Bi-directional mobile sync endpoint |
| `/api/settings` | `GET`, `PUT` | Retrieve or update app settings (currency, starting balance) |
| `/api/seed/reset` | `POST` | Reset data store to initial seed |

---

## 🚨 Overdue Alert Engine & Cash Flow Analysis

### 1. Real-Time Overdue Alert Engine
- **Borrowed Loans (I Owe)**: Triggers an alert when current day of month >= `dueDay` (default 25th) and monthly payment has not been recorded for the active loan.
- **Lent Money (Owed to Me)**: Triggers an alert when collection day is reached and money has not been received for the current month.
- **Over-Budget Categories**: Detects planned budget categories where actual monthly spending exceeds the defined monthly budget target.
- **Unified Banner**: Displays prominent notification banners on the main Dashboard and Loans View with one-click direct action buttons to resolve overdue items.

### 2. 12-Month Rolling Cash Flow Analytics
- **Avg. Monthly Inflow**: Calculates the 12-month rolling income average (`Total Income / 12 months`).
- **Avg. Monthly Burn Rate**: Calculates the 12-month rolling expense average (`Total Expenses / 12 months`).
- **Avg. Monthly Savings**: Calculates net monthly surplus capacity available for reinvestment (`Avg. Inflow - Avg. Burn Rate`).

---

## 📱 Mobile App Sync Protocol

The `/api/sync` endpoint enables offline-first native Android apps to push and pull offline changes safely:
1. **Pull (`GET /api/sync`)**: Client fetches active categories, current month expenses, current month incomes, and deleted item UUIDs.
2. **Push & Sync (`POST /api/sync`)**:
   - Accepts arrays of `categories`, `expenses`, `income`, and soft-deleted UUID lists (`deletedCategoryUuids`, `deletedExpenseUuids`, `deletedIncomeUuids`).
   - Uses **Timestamp Conflict Resolution**: Updates existing records if `mobile.updatedAt >= server.updatedAt`.
   - Returns synced object counts and the updated active datasets.

---

## 🧹 Clean State Policy

All sample/demo mock records (sample expenses, income records, and loans) have been removed from the default initialization seed. The system boots into a clean operational state with zero starting balance and standard essential expense categories.

---

## 🏃 Local Quick Start

Refer to **[SETUP.md](./SETUP.md)** for step-by-step setup details.

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build and start production
npm run build
npm start
```
