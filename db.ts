import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_8EZLAc3RhrTs@ep-young-mud-atkvyeg2.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
});

export interface ServerTransaction {
  id: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  categoryId?: string | null;
  name?: string | null;
  date: string;
  method?: string | null;
  notes?: string | null;
  month: number;
  year: number;
  uuid?: string | null;
  isDeleted: boolean;
  updatedAt: string;
}

export interface ServerCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  uuid?: string | null;
  isPlanBudget: boolean;
  budgetAmount?: number | null;
  isDeleted: boolean;
  updatedAt: string;
}

export interface ServerIncomeSource {
  id: string;
  name: string;
  amount: number;
  type: 'salary' | 'freelance' | 'business' | 'other';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServerIncome {
  id: string;
  sourceId: string;
  amount: number;
  month: number;
  year: number;
  receivedDate: string;
  notes?: string | null;
  uuid?: string | null;
  isDeleted: boolean;
  updatedAt: string;
  deductionAmount?: number | null;
  deductionNote?: string | null;
  linkedLoanId?: string | null;
  targetMonth?: number | null;
  targetYear?: number | null;
}

export interface ServerLoanPayment {
  id: string;
  loanId: string;
  amount: number;
  principalPart: number;
  interestPart: number;
  remainingAfter: number;
  paymentDate: string;
  notes?: string | null;
  targetMonth?: number | null;
  targetYear?: number | null;
}

export interface ServerLoan {
  id: string;
  name: string;
  type?: 'borrowed' | 'lent'; // 'borrowed' = I owe money, 'lent' = someone owes money to me
  dueDay?: number; // Day of month payment/collection is due (1 - 31)
  lender?: string | null;
  principal: number;
  balance: number;
  interestRate: number;
  monthlyPayment: number;
  termMonths: number;
  startDate: string;
  totalPaid: number;
  status: 'active' | 'paid';
  notes?: string | null;
  updatedAt: string;
  payments: ServerLoanPayment[];
}

export interface Store {
  categories: ServerCategory[];
  incomeSources: ServerIncomeSource[];
  incomes: ServerIncome[];
  transactions: ServerTransaction[];
  loans: ServerLoan[];
  settings: Record<string, string>;
}

export function createInitialSeedStore(): Store {
  const now = new Date().toISOString();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const categories: ServerCategory[] = [
    {
      id: 'cat-extra',
      name: 'Extra',
      icon: '✨',
      color: '#F0C000',
      uuid: '00000000-0000-0000-0000-000000000001',
      isPlanBudget: false,
      budgetAmount: null,
      isDeleted: false,
      updatedAt: now,
    },
    {
      id: 'cat-income',
      name: 'Income',
      icon: '💰',
      color: '#4CAF50',
      uuid: '00000000-0000-0000-0000-000000000002',
      isPlanBudget: false,
      budgetAmount: null,
      isDeleted: false,
      updatedAt: now,
    }
  ];

  const incomeSources: ServerIncomeSource[] = [];
  const incomes: ServerIncome[] = [];
  const transactions: ServerTransaction[] = [];
  const loans: ServerLoan[] = [];

  const settings: Record<string, string> = {
    currency: 'MMK',
    starting_balance: '0',
  };

  return {
    categories,
    incomeSources,
    incomes,
    transactions,
    loans,
    settings,
  };
}

export async function initDb(): Promise<Store> {
  let store = createInitialSeedStore();

  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          icon VARCHAR(255),
          color VARCHAR(255),
          uuid VARCHAR(255),
          is_plan_budget BOOLEAN DEFAULT FALSE,
          budget_amount NUMERIC,
          is_deleted BOOLEAN DEFAULT FALSE,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS income_sources (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          amount NUMERIC NOT NULL,
          type VARCHAR(255),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS incomes (
          id VARCHAR(255) PRIMARY KEY,
          source_id VARCHAR(255),
          amount NUMERIC NOT NULL,
          month INT NOT NULL,
          year INT NOT NULL,
          received_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          uuid VARCHAR(255),
          is_deleted BOOLEAN DEFAULT FALSE,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id VARCHAR(255) PRIMARY KEY,
          amount NUMERIC NOT NULL,
          type VARCHAR(50) DEFAULT 'EXPENSE',
          category_id VARCHAR(255),
          name VARCHAR(255),
          date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          method VARCHAR(100),
          notes TEXT,
          month INT NOT NULL,
          year INT NOT NULL,
          uuid VARCHAR(255),
          is_deleted BOOLEAN DEFAULT FALSE,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS loans (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) DEFAULT 'borrowed',
          lender VARCHAR(255),
          principal NUMERIC NOT NULL,
          balance NUMERIC NOT NULL,
          interest_rate NUMERIC NOT NULL,
          monthly_payment NUMERIC NOT NULL,
          term_months INT NOT NULL,
          start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          total_paid NUMERIC DEFAULT 0,
          status VARCHAR(50) DEFAULT 'active',
          notes TEXT,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS loan_payments (
          id VARCHAR(255) PRIMARY KEY,
          loan_id VARCHAR(255) REFERENCES loans(id) ON DELETE CASCADE,
          amount NUMERIC NOT NULL,
          principal_part NUMERIC NOT NULL,
          interest_part NUMERIC NOT NULL,
          remaining_after NUMERIC NOT NULL,
          payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          notes TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT NOT NULL
        );

        -- Column migrations for pre-existing tables
        ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon VARCHAR(255);
        ALTER TABLE categories ADD COLUMN IF NOT EXISTS color VARCHAR(255);
        ALTER TABLE categories ADD COLUMN IF NOT EXISTS uuid VARCHAR(255);
        ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_plan_budget BOOLEAN DEFAULT FALSE;
        ALTER TABLE categories ADD COLUMN IF NOT EXISTS budget_amount NUMERIC;
        ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
        ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

        ALTER TABLE income_sources ADD COLUMN IF NOT EXISTS type VARCHAR(255);
        ALTER TABLE income_sources ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE income_sources ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE income_sources ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

        ALTER TABLE incomes ADD COLUMN IF NOT EXISTS source_id VARCHAR(255);
        ALTER TABLE incomes ADD COLUMN IF NOT EXISTS amount NUMERIC NOT NULL DEFAULT 0;
        ALTER TABLE incomes ADD COLUMN IF NOT EXISTS month INT NOT NULL DEFAULT 1;
        ALTER TABLE incomes ADD COLUMN IF NOT EXISTS year INT NOT NULL DEFAULT 2026;
        ALTER TABLE incomes ADD COLUMN IF NOT EXISTS received_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE incomes ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE incomes ADD COLUMN IF NOT EXISTS uuid VARCHAR(255);
        ALTER TABLE incomes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
        ALTER TABLE incomes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE incomes ADD COLUMN IF NOT EXISTS deduction_amount NUMERIC DEFAULT 0;
        ALTER TABLE incomes ADD COLUMN IF NOT EXISTS deduction_note TEXT;
        ALTER TABLE incomes ADD COLUMN IF NOT EXISTS linked_loan_id VARCHAR(255);
        ALTER TABLE incomes ADD COLUMN IF NOT EXISTS target_month INT;
        ALTER TABLE incomes ADD COLUMN IF NOT EXISTS target_year INT;

        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount NUMERIC NOT NULL DEFAULT 0;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'EXPENSE';
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_id VARCHAR(255);
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS name VARCHAR(255);
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS method VARCHAR(100);
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS month INT NOT NULL DEFAULT 1;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS year INT NOT NULL DEFAULT 2026;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS uuid VARCHAR(255);
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

        ALTER TABLE loans ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'borrowed';
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS due_day INT DEFAULT 25;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS lender VARCHAR(255);
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS principal NUMERIC NOT NULL DEFAULT 0;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS balance NUMERIC NOT NULL DEFAULT 0;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS interest_rate NUMERIC NOT NULL DEFAULT 0;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS monthly_payment NUMERIC NOT NULL DEFAULT 0;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS term_months INT NOT NULL DEFAULT 12;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS total_paid NUMERIC DEFAULT 0;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE loans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

        ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS loan_id VARCHAR(255);
        ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS amount NUMERIC NOT NULL DEFAULT 0;
        ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS principal_part NUMERIC NOT NULL DEFAULT 0;
        ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS interest_part NUMERIC NOT NULL DEFAULT 0;
        ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS remaining_after NUMERIC NOT NULL DEFAULT 0;
        ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS target_month INT;
        ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS target_year INT;
      `);

      const catCheck = await client.query('SELECT COUNT(*) FROM categories');
      if (parseInt(catCheck.rows[0].count) === 0) {
        console.log('Seeding initial dataset into PostgreSQL database...');
        await seedDatabase(client, store);
      } else {
        console.log('Loading existing data from PostgreSQL database...');
        store = await loadStoreFromDatabase(client);
      }
    } finally {
      client.release();
    }
    console.log('✅ PostgreSQL Neon connection & initialization complete.');
  } catch (err) {
    console.error('⚠️ PostgreSQL connection warning, using in-memory fallback:', err);
  }

  return store;
}

export async function seedDatabase(client: any, store: Store) {
  // Categories
  for (const cat of store.categories) {
    await client.query(
      `INSERT INTO categories (id, name, icon, color, uuid, is_plan_budget, budget_amount, is_deleted, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [cat.id, cat.name, cat.icon, cat.color, cat.uuid, cat.isPlanBudget, cat.budgetAmount, cat.isDeleted, cat.updatedAt]
    );
  }

  // Income Sources
  for (const src of store.incomeSources) {
    await client.query(
      `INSERT INTO income_sources (id, name, amount, type, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [src.id, src.name, src.amount, src.type, src.notes, src.createdAt, src.updatedAt]
    );
  }

  // Incomes
  for (const inc of store.incomes) {
    await client.query(
      `INSERT INTO incomes (id, source_id, amount, month, year, received_date, notes, uuid, is_deleted, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [inc.id, inc.sourceId, inc.amount, inc.month, inc.year, inc.receivedDate, inc.notes, inc.uuid, inc.isDeleted, inc.updatedAt]
    );
  }

  // Transactions
  for (const tx of store.transactions) {
    await client.query(
      `INSERT INTO transactions (id, amount, type, category_id, name, date, method, notes, month, year, uuid, is_deleted, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO NOTHING`,
      [tx.id, tx.amount, tx.type, tx.categoryId, tx.name, tx.date, tx.method, tx.notes, tx.month, tx.year, tx.uuid, tx.isDeleted, tx.updatedAt]
    );
  }

  // Loans
  for (const loan of store.loans) {
    await client.query(
      `INSERT INTO loans (id, name, lender, principal, balance, interest_rate, monthly_payment, term_months, start_date, total_paid, status, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO NOTHING`,
      [loan.id, loan.name, loan.lender, loan.principal, loan.balance, loan.interestRate, loan.monthlyPayment, loan.termMonths, loan.startDate, loan.totalPaid, loan.status, loan.notes, loan.updatedAt]
    );

    for (const pay of loan.payments) {
      await client.query(
        `INSERT INTO loan_payments (id, loan_id, amount, principal_part, interest_part, remaining_after, payment_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [pay.id, pay.loanId, pay.amount, pay.principalPart, pay.interestPart, pay.remainingAfter, pay.paymentDate, pay.notes]
      );
    }
  }

  // Settings
  for (const [key, value] of Object.entries(store.settings)) {
    await client.query(
      `INSERT INTO settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, value]
    );
  }
}

export function toIso(val: any): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? new Date().toISOString() : val.toISOString();
  }
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export async function loadStoreFromDatabase(client: any): Promise<Store> {
  const catRows = (await client.query('SELECT * FROM categories')).rows;
  const srcRows = (await client.query('SELECT * FROM income_sources')).rows;
  const incRows = (await client.query('SELECT * FROM incomes')).rows;
  const txRows = (await client.query('SELECT * FROM transactions ORDER BY date DESC')).rows;
  const loanRows = (await client.query('SELECT * FROM loans')).rows;
  const payRows = (await client.query('SELECT * FROM loan_payments ORDER BY payment_date DESC')).rows;
  const setRows = (await client.query('SELECT * FROM settings')).rows;

  const categories: ServerCategory[] = catRows.map((r: any) => ({
    id: r.id,
    name: r.name,
    icon: r.icon || '📌',
    color: r.color || '#2196F3',
    uuid: r.uuid,
    isPlanBudget: !!r.is_plan_budget,
    budgetAmount: r.budget_amount ? parseFloat(r.budget_amount) : null,
    isDeleted: !!r.is_deleted,
    updatedAt: toIso(r.updated_at),
  }));

  const incomeSources: ServerIncomeSource[] = srcRows.map((r: any) => ({
    id: r.id,
    name: r.name,
    amount: parseFloat(r.amount),
    type: r.type || 'salary',
    notes: r.notes || '',
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  }));

  const incomes: ServerIncome[] = incRows.map((r: any) => ({
    id: r.id,
    sourceId: r.source_id,
    amount: parseFloat(r.amount),
    month: r.month,
    year: r.year,
    receivedDate: toIso(r.received_date),
    notes: r.notes || '',
    uuid: r.uuid,
    isDeleted: !!r.is_deleted,
    updatedAt: toIso(r.updated_at),
    deductionAmount: r.deduction_amount ? parseFloat(r.deduction_amount) : 0,
    deductionNote: r.deduction_note || null,
    linkedLoanId: r.linked_loan_id || null,
    targetMonth: r.target_month ? parseInt(r.target_month) : null,
    targetYear: r.target_year ? parseInt(r.target_year) : null,
  }));

  const transactions: ServerTransaction[] = txRows.map((r: any) => ({
    id: r.id,
    amount: parseFloat(r.amount),
    type: r.type || 'EXPENSE',
    categoryId: r.category_id,
    name: r.name,
    date: toIso(r.date),
    method: r.method,
    notes: r.notes,
    month: r.month,
    year: r.year,
    uuid: r.uuid,
    isDeleted: !!r.is_deleted,
    updatedAt: toIso(r.updated_at),
  }));

  const loans: ServerLoan[] = loanRows.map((r: any) => {
    const loanPays = payRows
      .filter((p: any) => p.loan_id === r.id)
      .map((p: any) => ({
        id: p.id,
        loanId: p.loan_id,
        amount: parseFloat(p.amount),
        principalPart: parseFloat(p.principal_part),
        interestPart: parseFloat(p.interest_part),
        remainingAfter: parseFloat(p.remaining_after),
        paymentDate: toIso(p.payment_date),
        notes: p.notes,
        targetMonth: p.target_month ? parseInt(p.target_month) : null,
        targetYear: p.target_year ? parseInt(p.target_year) : null,
      }));

    return {
      id: r.id,
      name: r.name,
      type: (r.type || 'borrowed') as 'borrowed' | 'lent',
      dueDay: r.due_day ? parseInt(r.due_day) : 25,
      lender: r.lender,
      principal: parseFloat(r.principal),
      balance: parseFloat(r.balance),
      interestRate: parseFloat(r.interest_rate),
      monthlyPayment: parseFloat(r.monthly_payment),
      termMonths: r.term_months,
      startDate: toIso(r.start_date),
      totalPaid: parseFloat(r.total_paid || 0),
      status: r.status,
      notes: r.notes,
      updatedAt: toIso(r.updated_at),
      payments: loanPays,
    };
  });

  const settings: Record<string, string> = {};
  setRows.forEach((r: any) => {
    settings[r.key] = r.value;
  });

  return {
    categories,
    incomeSources,
    incomes,
    transactions,
    loans,
    settings: Object.keys(settings).length > 0 ? settings : { currency: 'MMK', starting_balance: '0' },
  };
}

export async function reloadStoreFromDb(): Promise<Store> {
  const client = await pool.connect();
  try {
    return await loadStoreFromDatabase(client);
  } finally {
    client.release();
  }
}

export async function resetDatabase(): Promise<Store> {
  const newStore = createInitialSeedStore();
  try {
    const client = await pool.connect();
    try {
      await client.query('TRUNCATE loan_payments, loans, transactions, incomes, income_sources, categories, settings RESTART IDENTITY CASCADE');
      await seedDatabase(client, newStore);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error truncating & re-seeding database:', err);
  }
  return newStore;
}

export async function persistTransaction(tx: ServerTransaction) {
  try {
    await pool.query(
      `INSERT INTO transactions (id, amount, type, category_id, name, date, method, notes, month, year, uuid, is_deleted, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         amount = EXCLUDED.amount,
         category_id = EXCLUDED.category_id,
         name = EXCLUDED.name,
         date = EXCLUDED.date,
         method = EXCLUDED.method,
         notes = EXCLUDED.notes,
         month = EXCLUDED.month,
         year = EXCLUDED.year,
         is_deleted = EXCLUDED.is_deleted,
         updated_at = EXCLUDED.updated_at`,
      [tx.id, tx.amount, tx.type, tx.categoryId, tx.name, tx.date, tx.method, tx.notes, tx.month, tx.year, tx.uuid, tx.isDeleted, tx.updatedAt]
    );
  } catch (err) {
    console.error('Failed to persist transaction:', err);
  }
}

export async function persistCategory(cat: ServerCategory) {
  try {
    await pool.query(
      `INSERT INTO categories (id, name, icon, color, uuid, is_plan_budget, budget_amount, is_deleted, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         icon = EXCLUDED.icon,
         color = EXCLUDED.color,
         is_plan_budget = EXCLUDED.is_plan_budget,
         budget_amount = EXCLUDED.budget_amount,
         is_deleted = EXCLUDED.is_deleted,
         updated_at = EXCLUDED.updated_at`,
      [cat.id, cat.name, cat.icon, cat.color, cat.uuid, cat.isPlanBudget, cat.budgetAmount, cat.isDeleted, cat.updatedAt]
    );
  } catch (err) {
    console.error('Failed to persist category:', err);
  }
}

export async function persistIncomeSource(src: ServerIncomeSource) {
  try {
    await pool.query(
      `INSERT INTO income_sources (id, name, amount, type, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         amount = EXCLUDED.amount,
         type = EXCLUDED.type,
         notes = EXCLUDED.notes,
         updated_at = EXCLUDED.updated_at`,
      [src.id, src.name, src.amount, src.type, src.notes, src.createdAt, src.updatedAt]
    );
  } catch (err) {
    console.error('Failed to persist income source:', err);
  }
}

export async function deleteIncomeSourceDb(id: string) {
  try {
    await pool.query('DELETE FROM income_sources WHERE id = $1', [id]);
    await pool.query('UPDATE incomes SET is_deleted = TRUE WHERE source_id = $1', [id]);
  } catch (err) {
    console.error('Failed to delete income source from db:', err);
  }
}

export async function persistIncomeRecord(inc: ServerIncome) {
  try {
    await pool.query(
      `INSERT INTO incomes (id, source_id, amount, month, year, received_date, notes, uuid, is_deleted, updated_at, deduction_amount, deduction_note, linked_loan_id, target_month, target_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET
         amount = EXCLUDED.amount,
         received_date = EXCLUDED.received_date,
         notes = EXCLUDED.notes,
         is_deleted = EXCLUDED.is_deleted,
         updated_at = EXCLUDED.updated_at,
         deduction_amount = EXCLUDED.deduction_amount,
         deduction_note = EXCLUDED.deduction_note,
         linked_loan_id = EXCLUDED.linked_loan_id,
         target_month = EXCLUDED.target_month,
         target_year = EXCLUDED.target_year`,
      [
        inc.id,
        inc.sourceId,
        inc.amount,
        inc.month,
        inc.year,
        inc.receivedDate,
        inc.notes,
        inc.uuid,
        inc.isDeleted,
        inc.updatedAt,
        inc.deductionAmount || 0,
        inc.deductionNote || null,
        inc.linkedLoanId || null,
        inc.targetMonth || null,
        inc.targetYear || null,
      ]
    );
  } catch (err) {
    console.error('Failed to persist income record:', err);
  }
}

export async function persistLoan(loan: ServerLoan) {
  try {
    await pool.query(
      `INSERT INTO loans (id, name, type, due_day, lender, principal, balance, interest_rate, monthly_payment, term_months, start_date, total_paid, status, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         type = EXCLUDED.type,
         due_day = EXCLUDED.due_day,
         lender = EXCLUDED.lender,
         balance = EXCLUDED.balance,
         interest_rate = EXCLUDED.interest_rate,
         monthly_payment = EXCLUDED.monthly_payment,
         total_paid = EXCLUDED.total_paid,
         status = EXCLUDED.status,
         notes = EXCLUDED.notes,
         updated_at = EXCLUDED.updated_at`,
      [loan.id, loan.name, loan.type || 'borrowed', loan.dueDay || 25, loan.lender, loan.principal, loan.balance, loan.interestRate, loan.monthlyPayment, loan.termMonths, loan.startDate, loan.totalPaid, loan.status, loan.notes, loan.updatedAt]
    );
  } catch (err) {
    console.error('Failed to persist loan:', err);
  }
}

export async function deleteLoanDb(id: string) {
  try {
    await pool.query('DELETE FROM loans WHERE id = $1', [id]);
  } catch (err) {
    console.error('Failed to delete loan from db:', err);
  }
}

export async function persistLoanPayment(pay: ServerLoanPayment) {
  try {
    await pool.query(
      `INSERT INTO loan_payments (id, loan_id, amount, principal_part, interest_part, remaining_after, payment_date, notes, target_month, target_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [pay.id, pay.loanId, pay.amount, pay.principalPart, pay.interestPart, pay.remainingAfter, pay.paymentDate, pay.notes, pay.targetMonth || null, pay.targetYear || null]
    );
  } catch (err) {
    console.error('Failed to persist loan payment:', err);
  }
}

export async function deleteLoanPaymentDb(paymentId: string) {
  try {
    await pool.query('DELETE FROM loan_payments WHERE id = $1', [paymentId]);
  } catch (err) {
    console.error('Failed to delete loan payment:', err);
  }
}

export async function persistSetting(key: string, value: string) {
  try {
    await pool.query(
      `INSERT INTO settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, value]
    );
  } catch (err) {
    console.error('Failed to persist setting:', err);
  }
}
