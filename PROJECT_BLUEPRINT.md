# My Finance — Full Project Blueprint

A complete personal finance management app for MMK (Myanmar Kyat). Track income, expenses, budgets, and loans.

**Stack:**
- **Web:** Next.js 16 (App Router) + Prisma ORM + Neon PostgreSQL + Tailwind CSS v4 + SWR
- **Mobile:** Kotlin + Jetpack Compose + Room + Hilt + Retrofit
- **Sync:** REST API with UUID-based dedup + `updatedAt` timestamp conflict resolution

---

## 1. Architecture

```
                    ┌─────────────────────┐
                    │   Mobile (Android)   │
                    │   Kotlin + Compose   │
                    │   Room (SQLite)      │
                    └─────────┬────────────┘
                              │ POST /api/sync
                              │ (JSON + UUIDs)
                              ▼
┌────────────────────────────────────────────┐
│            Web (Next.js 16)                │
│  Pages: Dashboard, Expenses, Income,       │
│         Categories, Loans, Cash Flow,      │
│         Settings                           │
│  API: 19 REST endpoints                    │
│  DB: Prisma → Neon PostgreSQL             │
└────────────────────────────────────────────┘
```

### Data Flow

```
Mobile creates expense → saved to Room (SQLite) with uuid + updatedAt
                      → next sync sends POST /api/sync
                      → web dedupes by uuid, compares updatedAt
                      → web saves to Neon PostgreSQL
                      → web returns serverData (full current state)
                      → mobile replaces local cache with serverData
```

---

## 2. Database Schema

### 2a. Transaction (replaces both Expense + Payment)

```prisma
model Transaction {
  id         String    @id @default(cuid())
  amount     Float
  type       String    @default("EXPENSE")  // "EXPENSE" | "INCOME"
  categoryId String?
  name       String?                        // display name
  date       DateTime  @default(now())       // epoch ms (mobile) or midnight+offset (web)
  method     String?   @default("cash")
  notes      String?
  month      Int
  year       Int
  uuid       String?   @unique               // device-generated UUID for dedup
  isDeleted  Boolean   @default(false)       // soft delete tombstone
  updatedAt  DateTime  @updatedAt            // conflict resolution

  category   Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  @@map("transactions")
}
```

### 2b. Category

```prisma
model Category {
  id           String       @id @default(cuid())
  name         String       @unique
  icon         String       @default("📌")
  color        String       @default("#2196F3")
  uuid         String?      @unique
  isPlanBudget Boolean      @default(false)
  budgetAmount Float?
  isDeleted    Boolean      @default(false)
  transactions Transaction[]
  updatedAt    DateTime     @updatedAt
}
```

Budget is stored ON the Category model (not a separate PlanBudget table). When a category has `isPlanBudget = true` and a `budgetAmount`, it appears in the Plan Budget tab on the Expenses page.

### 2c. IncomeSource

```prisma
model IncomeSource {
  id        String   @id @default(cuid())
  name      String   // "Salary", "Mobile Import", "From Mom", etc.
  amount    Float    // expected monthly amount
  type      String   @default("salary")  // salary, freelance, business, other
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  incomes   Income[]
}
```

### 2d. Income

```prisma
model Income {
  id           String   @id @default(cuid())
  sourceId     String
  amount       Float
  month        Int
  year         Int
  receivedDate DateTime @default(now())
  notes        String?
  uuid         String?  @unique
  isDeleted    Boolean  @default(false)
  updatedAt    DateTime @updatedAt

  source       IncomeSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)

  @@unique([sourceId, month, year])
}
```

### 2e. Loan

```prisma
model Loan {
  id             String        @id @default(cuid())
  name           String
  lender         String?
  principal      Float
  balance        Float
  interestRate   Float         // annual % (e.g., 13 for 13%)
  monthlyPayment Float
  termMonths     Int
  startDate      DateTime
  totalPaid      Float         @default(0)
  status         String        @default("active")  // "active" | "paid"
  notes          String?

  loanPayments   LoanPayment[]
  updatedAt      DateTime      @updatedAt
}
```

### 2f. LoanPayment

```prisma
model LoanPayment {
  id             String   @id @default(cuid())
  loanId         String
  amount         Float     // monthlyPayment (fixed: 1,510,000)
  principalPart  Float     // calculated: amount - interestPart
  interestPart   Float     // calculated: balance × (rate/12)
  remainingAfter Float     // balance after this payment
  paymentDate    DateTime
  notes          String?

  loan           Loan     @relation(fields: [loanId], references: [id], onDelete: Cascade)
}
```

### 2g. Setting

```prisma
model Setting {
  id    String @id @default(cuid())
  key   String @unique  // "currency", "starting_balance"
  value String
}
```

---

## 3. API Reference

### 3a. Dashboard

```
GET /api/dashboard?month=7&year=2026
```
Returns: `totalIncome, totalExpenses, surplus, availableCash, startingBalance, receivedIncome, pendingIncome, incomeSources, totalLoanBalance, totalLoanPayment, financialHealth`

### 3b. Transactions (Expenses)

```
GET  /api/expenses?month=7&year=2026&type=EXPENSE
POST /api/expenses  { amount, categoryId, name?, date?, notes?, month?, year? }
PUT  /api/expenses/{id}  { amount, categoryId, name, date, method, notes, month, year }
DELETE /api/expenses/{id}  → soft-delete (sets isDeleted: true)
```

### 3c. Categories

```
GET  /api/categories
POST /api/categories  { name, icon, color, isPlanBudget?, budgetAmount? }
PUT  /api/categories/{id}  { name, icon, color, isPlanBudget?, budgetAmount? }
DELETE /api/categories/{id}  → soft-delete (sets isDeleted: true, nullifies transaction.categoryId)
```
- Protected: "Extra" and "Income" categories cannot be deleted (returns 403).

### 3d. Income

```
GET  /api/income
POST /api/income  { name, amount, type }
POST /api/income/{id}/record  { amount, month, year }
PUT  /api/income/{id}  { name, amount, type }
DELETE /api/income/{id}  → deletes IncomeSource
```

### 3e. Loans

```
GET  /api/loans     (includes currentMonthPaid, progress, remainingMonths)
POST /api/loans     { name, lender?, principal, balance?, interestRate, monthlyPayment, termMonths, startDate }
PUT  /api/loans/{id}
DELETE /api/loans/{id}
POST /api/loans/{id}/pay  { amount? }
DELETE /api/loans/{id}/pay/undo
GET  /api/loans/{id}/amortization
GET  /api/loans/compare
```

### 3f. Cash Flow

```
GET /api/cashflow?months=12
```

### 3g. Sync (Mobile Import)

```
GET  /api/sync  (returns full current month state)
POST /api/sync  (push mobile data, return serverData)
```

**POST body:**
```json
{
  "categories": [{"name": "Rice", "icon": "🍚", "color": "#F59E0B", "isPlanBudget": true, "budgetAmount": 200000, "uuid": "abc", "updatedAt": 1784264094078}],
  "expenses": [{"name": "Rice", "amount": 150000, "category": "Rice", "date": 1752595200000, "uuid": "def", "updatedAt": 1784261312205}],
  "income": [{"amount": 5000000, "date": 1752595200000, "uuid": "ghi", "updatedAt": 1784261250060, "note": "Salary"}],
  "deletedExpenseUuids": ["abc-123"],
  "deletedCategoryUuids": ["def-456"],
  "deletedIncomeUuids": ["ghi-789"]
}
```

**POST response:**
```json
{
  "synced": {"categories": 2, "expenses": 5, "income": 1},
  "skipped": {"categories": 0, "expenses": 0, "income": 0},
  "serverData": {
    "categories": [...],
    "expenses": [...],
    "incomes": [...],
    "month": 7, "year": 2026,
    "deletedUuids": {
      "categories": ["abc-123"],
      "expenses": ["def-456"],
      "incomes": ["ghi-789"]
    }
  }
}
```

### 3h. Settings

```
GET  /api/settings
PUT  /api/settings  { "currency": "MMK", "starting_balance": "4000000" }
```

---

## 4. Sync Protocol (Critical)

### Conflict Resolution

Every syncable entity has two fields:
- `uuid: String? @unique` — generated once per entity, never changes
- `updatedAt: DateTime @updatedAt` — auto-managed by Prisma

**Rule: The side with the newer `updatedAt` wins.**

```
Mobile: uuid="abc", updatedAt=10:30, amount=5000
Web:    uuid="abc", updatedAt=10:15, amount=3000

→ Mobile (10:30) is newer → web updates to amount=5000 ✅
```

### Deletion Handling

**Web deletes → Mobile:**
1. Web sets `isDeleted: true` (never hard deletes)
2. Sync response includes `deletedUuids` array
3. Mobile sees UUID in `deletedUuids` → deletes local record

**Mobile deletes → Web:**
1. Mobile stores UUID in `pending_deletions` table
2. Sync request includes `deletedExpenseUuids` etc.
3. Web sets `isDeleted: true` for those UUIDs
4. Response includes UUID in `deletedUuids` → mobile clears from pending

### UUID Lifecycle

- Generated ONCE when the entity is created (by mobile or web)
- Never changes (no reassignment)
- Used for all future conflict resolution
- Web preserves existing UUID when updating by name (fallback path)

### Timestamp Handling

- Mobile sends `updatedAt: Long` (epoch ms)
- Web returns `updatedAt: String` (ISO date)
- `updateLocalCache()` parses ISO date to epoch ms when storing locally
- After one sync cycle, all local timestamps are server-aligned

---

## 5. Mobile Implementation

### Room Entities

Each entity has standard fields plus:
- `uuid: String = UUID.randomUUID().toString()` — generated on creation
- `updatedAt: Long = System.currentTimeMillis()` — for conflict resolution

### Colors (Mobile → Web)

Mobile stores colors as `Long` (ARGB). Web expects hex strings. Conversion:

```kotlin
fun Long.toHexColor(): String {
    val cleaned = this and 0x00FFFFFF
    return "#%06X".format(cleaned)
}

fun parseHexColor(hex: String): Long {
    val clean = hex.removePrefix("#")
    return (0xFF000000 or clean.toLong(16))
}
```

### Shared Color Palette (12 colors)

```kotlin
listOf(
    Color(0xFFFFE0B2), Color(0xFFC8E6C9), Color(0xFF4CAF50), Color(0xFFFF5722),
    Color(0xFFFF8A65), Color(0xFF009688), Color(0xFF2196F3), Color(0xFF673AB7),
    Color(0xFF8BC34A), Color(0xFF03A9F4), Color(0xFF9C27B0), Color(0xFF37474F),
)
```

### SyncRepository.sync() Flow

```
1. Collect pending deletions from Room (pending_deletions table)
2. Collect local data (categories, expenses, income)
3. Map to DTOs with uuid + updatedAt
4. POST /api/sync
5. On success: clear pending_deletions
6. Call updateLocalCache(serverData)
```

### updateLocalCache(serverData) Flow

```
1. Process deletedUuids → delete local records by UUID
2. For each server category:
   - If UUID exists locally, compare updatedAt → update if server newer
   - If UUID doesn't exist locally → insert
3. For each server expense:
   - Same pattern
4. For each server income:
   - Same pattern
```

---

## 6. Business Logic

### Plan Budget Tracking

Budget is on the Category model itself. The Expenses page shows:
- **Plan Budget tab:** categories with `isPlanBudget = true` (even with 0 transactions)
- **Extra tab:** categories without budget that have transactions

**Remaining calculation:** `remaining = budgetAmount - sum(transactions in category for month)`

**Auto-populate:** When selecting a category with a budget in the Add Expense form, the amount auto-fills with the budget amount.

### Loan Amortization

```
monthlyInterest = balance × (annualRate / 12)
principalPart = monthlyPayment - monthlyInterest
newBalance = balance - principalPart
```

Fixed at 1,510,000 MMK/month. Remaining balance tracked in `Loan.balance`.

### Dashboard Cash Calculation

```
availableCash = startingBalance + receivedIncome - totalExpenses
```

`startingBalance` is a Setting (stored value, updated manually when real cash changes).

### Income Source Matching (Sync)

Mobile sends income with a `note` field. The web:
1. Uses `note` as `IncomeSource.name` (creates if not exists)
2. Records the income under that source
3. Empty note → "Mobile Import" source

---

## 7. Web Frontend (Pages)

| Page | Path | Route Type |
|---|---|---|
| Dashboard | `/` | Static |
| Expenses | `/expenses` | Static (client) |
| Income | `/income` | Static (client) |
| Categories | `/categories` | Static (client) |
| Loans | `/loans` | Static (client) |
| Loan Detail | `/loans/[id]` | Dynamic |
| Loan Compare | `/loans/compare` | Static (client) |
| Cash Flow | `/cashflow` | Static (client) |
| Settings | `/settings` | Static (client) |

**Sidebar:** 7 items — Dashboard, Income, Expenses, Categories, Loans, Cash Flow, Settings

### M3 Design Tokens

4 tonal palettes (primary blue #3867a0, secondary teal, tertiary green, error red). Typography scale (14 levels from display-large to label-small). Elevation shadows (3 levels). Shape tokens (xs-xl). Dark mode (CSS prefers-color-scheme).

---

## 8. Development Setup

```bash
# Web
git clone https://github.com/Than-Zaw-Hein/Financer.git
cd Financer
npm install
# Create .env: DATABASE_URL="postgresql://..."
npx prisma db push --accept-data-loss
npx prisma db seed
npm run dev    # → http://localhost:3002

# Mobile (Android Studio)
# Open the ExpendMemo project
# Build.gradle dependencies already include Retrofit, Room, Hilt
# Add MOBILE_PROMPTS.md code to existing project
```

### Key Configs

- Port: **3002** (bound to 0.0.0.0 for LAN access)
- Font: **Segoe UI** (no Google Fonts — no internet during build)
- PM2: **Broken** on Windows (use `npm start` directly)
- Database: **Neon PostgreSQL** (scale-to-zero — cold start takes ~3-10s)

---

## 9. Common Gotchas

| Issue | Fix |
|---|---|
| `EPERM` on `prisma generate` | Stop the server first (locks DLL) |
| Build fails after deleting pages | `Remove-Item -Recurse -Force .next; npx next build` |
| Neon timeout on first request | Use `-TimeoutSec 15` or make a warmup request first |
| Google Fonts build failure | Replace with system fonts (Segoe UI) — no internet during build |
| PM2 `EPERM \\.\pipe\rpc.sock` | Use `cmd /c "start /b cmd /c npm start"` instead |
| `$pid` is read-only in PowerShell | Use `$p` instead |
| Branch confusion | Code is on `master`, not `main` |

---

## 10. Files That Were Removed

| Removed File | Reason |
|---|---|
| `prisma/seed-demo.ts` | Contained personal data (Than Zaw Hein's expenses) |
| `src/app/payments/page.tsx` | Merged into Transaction model |
| `src/app/people/page.tsx` | Person concept removed (not in mobile) |
| `src/app/api/payments/` | Merged into Transaction API |
| `src/app/api/people/` | Person concept removed |
| `prisma/schema/PlanBudget` | Budget moved to Category.isPlanBudget + budgetAmount |
| `prisma/schema/Person` | Removed |
| `prisma/schema/PersonBalance` | Removed |
| `prisma/schema/Expense` | Merged into Transaction |

---

## 11. Default Seed Data

```ts
// prisma/seed.ts creates:
Setting: { key: "currency", value: "MMK" }
Setting: { key: "starting_balance", value: "0" }
Category: { name: "Extra", icon: "✨", color: "#F0C000", uuid: "00000000-0000-0000-0000-000000000001" }
Category: { name: "Income", icon: "💰", color: "#4CAF50", uuid: "00000000-0000-0000-0000-000000000002" }
```

These two fixed UUIDs are used by both web and mobile to prevent duplicate default categories across sync.
