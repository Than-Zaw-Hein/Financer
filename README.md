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
| Production | PM2 (24/7 process manager) |

## What You Need

- **Node.js** v26+
- **npm** (bundled with Node.js)
- **PM2** — install globally: `npm install -g pm2`

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
Remove-Item -Recurse -Force .next
npx prisma generate
```

Then rebuild:

```bash
npm run build
```

## How to Run (Production)

After building:

```bash
npm start
```

Runs on **http://localhost:3002** (bound to `0.0.0.0` for LAN access).

---

## How to Deploy (24/7 with PM2)

### First-time Setup

```bash
pm2 start ecosystem.config.js
pm2 save
```

### Auto-start on Boot (Windows)

Open **PowerShell as Administrator** and run:

```powershell
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c pm2 resurrect" -WorkingDirectory "C:\Users\thanz\OneDrive\Desktop\Development\Financer-webapp"
$trigger = New-ScheduledTaskTrigger -AtLogon -User "thanz"
$principal = New-ScheduledTaskPrincipal -UserId "thanz" -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName "PM2-MyFinance" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force
```

> **Note:** Update the `-User` and `-WorkingDirectory` values to match your machine.

### After Deploying Updates

```bash
npm run build
pm2 restart my-finance
```

### Manual Auto-start (without Task Scheduler)

If Task Scheduler isn't available, run this after every reboot:

```bash
pm2 resurrect
```

---

## How to Update (Pull Latest Code)

```bash
git pull
npm install
npm run build
pm2 restart my-finance
```

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

3. Access from other devices: `http://<your-ip>:3002`

---

## PM2 Commands Reference

| Command | What it does |
|---|---|
| `pm2 status` | Check if the app is running |
| `pm2 logs my-finance` | Watch live logs |
| `pm2 logs my-finance --lines 50` | Last 50 log lines |
| `pm2 restart my-finance` | Restart the app |
| `pm2 stop my-finance` | Stop the app |
| `pm2 start my-finance` | Start a stopped app |
| `pm2 delete my-finance` | Remove app from PM2 |
| `pm2 resurrect` | Restore all saved processes |
| `pm2 save` | Save current process list |
| `pm2 monit` | Real-time CPU/memory dashboard |

---

## Database Management

| Command | What it does |
|---|---|
| `npx prisma db seed` | Seed with sample data |
| `npx prisma migrate dev --name <name>` | Create a new migration |
| `npx prisma studio` | Open visual database browser |
| `npx tsx prisma/cleanup.ts` | Clear all data EXCEPT loans |
| `npx tsx prisma/set-balance.ts` | Set starting balance for cash flow |

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
│   │   ├── api/               # 17 API routes
│   │   ├── cashflow/          # Cash flow tracker page
│   │   ├── expenses/          # Expenses list + detail pages
│   │   ├── income/            # Income sources + recording
│   │   ├── loans/             # Loans list, detail, compare
│   │   ├── payments/          # Payment records
│   │   ├── people/            # People/contacts
│   │   ├── settings/          # App settings
│   │   ├── globals.css        # M3 design tokens
│   │   ├── layout.tsx         # Root layout + sidebar
│   │   └── page.tsx           # Dashboard
│   ├── components/
│   │   ├── Sidebar.tsx        # M3 NavigationRail
│   │   └── ui/                # 9 shared components (Modal, Card, Chip, etc.)
│   └── lib/
│       ├── prisma.ts          # Prisma singleton
│       └── format.ts          # MMK currency formatter
├── ecosystem.config.js        # PM2 production config
├── startup.bat                # Emergency startup helper
├── package.json
└── .env
```

## API Routes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard` | Dashboard summary |
| GET/POST | `/api/income` | List/Create income sources |
| GET/PUT/DELETE | `/api/income/[id]` | Single income source |
| POST | `/api/income/[id]/record` | Record monthly income |
| GET/POST | `/api/expenses` | List/Create expenses |
| GET/PUT/DELETE | `/api/expenses/[id]` | Single expense |
| GET/POST | `/api/people` | List/Create people |
| GET/PUT/DELETE | `/api/people/[id]` | Single person |
| GET/POST | `/api/payments` | List/Create payments |
| GET/PUT/DELETE | `/api/payments/[id]` | Single payment |
| GET/POST | `/api/loans` | List/Create loans |
| GET/PUT/DELETE | `/api/loans/[id]` | Single loan |
| POST | `/api/loans/[id]/pay` | Make a loan payment |
| GET | `/api/loans/[id]/amortization` | Amortization schedule |
| GET | `/api/loans/compare` | Fixed-payment comparison |
| GET | `/api/cashflow` | Cash flow analysis |
| GET/PUT | `/api/settings` | App settings |

## Features

- **Dashboard** — Monthly overview with totals and charts
- **Expenses** — Grouped by recurring (monthly) and extra (one-time), with Quick Pay
- **Income** — Track multiple income sources with monthly recording
- **People** — Contact management with balance tracking
- **Payments** — Record payments linked to expenses and people
- **Loans** — Loan management with amortization schedules and comparison
- **Cash Flow** — Running balance with starting balance from settings
- **Settings** — Currency, starting balance, default income
- **Dark Mode** — Full M3 dark theme support
- **Mobile Responsive** — NavigationRail collapses on small screens
