# My Finance Application - Local Setup & Development Guide

This guide provides instructions to clone, configure, and run the **My Finance** application locally on your computer.

---

## 📋 Prerequisites

Before running the app locally, ensure you have the following installed on your computer:

1. **Node.js**: Version 18.x or 20.x or higher ([Download Node.js](https://nodejs.org/))
2. **npm** (comes with Node.js) or **pnpm** / **bun**
3. **PostgreSQL** (Optional): A local PostgreSQL instance or a free cloud instance (e.g. [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com)).
   *Note: If `DATABASE_URL` is not provided, the application will automatically fall back to an in-memory database store.*

---

## 🚀 Quick Start Guide

### 1. Clone the Repository

Open your terminal or command prompt and clone the repository:

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_FOLDER>
```

### 2. Install Dependencies

Install all required npm packages:

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Open `.env` in your code editor and configure your database and optional API keys:

```env
# Optional: Required if using Gemini AI features
GEMINI_API_KEY=""

# PostgreSQL Connection String
# Local PostgreSQL example:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/myfinancedb"

# Cloud PostgreSQL example (e.g., Neon or Supabase):
# DATABASE_URL="postgresql://user:password@ep-sample-12345.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

---

## 🗄️ Database Setup (PostgreSQL)

If you are using a local PostgreSQL database:

1. Start your local PostgreSQL service.
2. Create a database named `myfinancedb`:
   ```sql
   CREATE DATABASE myfinancedb;
   ```
3. Update the `DATABASE_URL` in `.env` with your local username, password, and database name.
4. When you start the application (`npm run dev`), the server will automatically detect the database and create or update all required tables (`categories`, `income_sources`, `incomes`, `transactions`, `loans` with `type` & `due_day`, `loan_payments`, `settings`) without needing manual SQL migrations.

---

## 🏃 Running the Application

### Development Mode

Run the Express server and Vite development server together:

```bash
npm run dev
```

The application will start at:
👉 **`http://localhost:3000`**

### Production Mode

Build the bundled server and client static files, then start the production Node server:

```bash
# 1. Build client and bundled server
npm run build

# 2. Start production server
npm start
```

---

## 📱 Mobile App Synchronization API

The server includes full REST endpoints to synchronize with the **Android My Finance Mobile App**:

- **`GET /api/sync`**: Fetches active categories, expenses, incomes, and deleted UUIDs for the current month.
- **`POST /api/sync`**: Accepts offline mobile updates (expenses, categories, incomes, deletions) and syncs changes bi-directionally using timestamp conflict resolution.

---

## 🧹 Data Clean State

Demo data has been removed from the initialization seed. Upon first startup with a clean database, the system initializes with:
- Default standard categories (*Extra*, *Income*, *Food & Dining*, *Utilities & Bills*, *Transportation*)
- Zero starting balance
- Empty expenses, incomes, and loans list ready for real transaction entry.

---

## ✨ Key Features & Capabilities

- **Unified Dashboard**: Live net cash position, monthly income vs expenses summary, and financial health score (0-100).
- **🚨 Overdue Alert System**:
  - Automatically flags borrowed loans or lent collections that have passed their monthly due day (e.g., 25th of the month) without a recorded payment.
  - Highlights over-budget category spending in real-time.
- **Loans & Lending Management**:
  - **Borrowed (I Owe)** vs **Lent (Owed to Me)** direction tracking.
  - Custom monthly due day (1-31) and interest calculation.
  - Amortization schedule calculator and payment undo capability.
- **Cash Flow Analytics**:
  - 12-month rolling income average (**Avg. Monthly Inflow**), expense average (**Avg. Monthly Burn Rate**), and net savings capacity.
- **Bi-directional Mobile Sync Protocol**: Real-time sync with native Android mobile apps via `/api/sync`.

---

## 📜 Available Scripts

- `npm run dev` – Starts the development server with hot reloads on port 3000.
- `npm run build` – Bundles the React Vite frontend and esbuild server into `dist/`.
- `npm start` – Runs the production server from `dist/server.cjs`.
- `npm run lint` – Runs TypeScript type-checking.
