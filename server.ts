import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  initDb,
  resetDatabase,
  persistTransaction,
  persistCategory,
  persistIncomeSource,
  deleteIncomeSourceDb,
  persistIncomeRecord,
  persistLoan,
  deleteLoanDb,
  persistLoanPayment,
  deleteLoanPaymentDb,
  persistSetting,
  toIso,
  ServerTransaction,
  ServerCategory,
  ServerIncomeSource,
  ServerIncome,
  ServerLoanPayment,
  ServerLoan,
  Store,
  createInitialSeedStore,
  reloadStoreFromDb,
} from './db';

function safeDateObj(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

function getActiveTrackedMonths(selectedMonth: number, selectedYear: number): Set<string> {
  const activeMonths = new Set<string>();
  
  // Always include the currently selected view month/year as active
  activeMonths.add(`${selectedMonth}-${selectedYear}`);
  
  store.incomes.forEach((i) => {
    if (!i.isDeleted) {
      activeMonths.add(`${i.month}-${i.year}`);
    }
  });

  store.transactions.forEach((t) => {
    if (!t.isDeleted) {
      activeMonths.add(`${t.month}-${t.year}`);
    }
  });

  return activeMonths;
}

const app = express();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;

app.use(express.json());

app.use('/api', async (req: Request, res: Response, next) => {
  try {
    store = await reloadStoreFromDb();
  } catch (err) {
    console.error('Failed to reload store from database:', err);
  }
  next();
});

let store: Store = createInitialSeedStore();

// REST API ROUTES

// 0. Health / Base URL Verification Endpoints (for mobile client base URL validation)
const checkHealthHandler = (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    success: true,
    message: 'Base URL connection successful',
    app: 'My Finance Tracker',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
};

app.get('/api/check-base-url', checkHealthHandler);
app.get('/api/health', checkHealthHandler);
app.get('/api/ping', checkHealthHandler);
app.get('/api/check', checkHealthHandler);

// 1. Dashboard
app.get('/api/dashboard', (req: Request, res: Response) => {
  const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year as string) || new Date().getFullYear();

  // Helper to filter incomes by target budget month/year
  const getIncomesForMonth = (m: number, y: number) => {
    return store.incomes.filter((i) => {
      if (i.isDeleted) return false;
      if (i.targetMonth !== null && i.targetMonth !== undefined) {
        return i.targetMonth === m && (i.targetYear ?? y) === y;
      }
      return i.month === m && i.year === y;
    });
  };

  // Helper to check if a loan payment targets a specific budget month/year
  const isPaymentForMonth = (p: ServerLoanPayment, m: number, y: number) => {
    if (p.targetMonth !== null && p.targetMonth !== undefined) {
      return p.targetMonth === m && (p.targetYear ?? y) === y;
    }
    const pDate = safeDateObj(p.paymentDate);
    return pDate.getMonth() + 1 === m && pDate.getFullYear() === y;
  };

  const activeTransactions = store.transactions.filter(
    (t) => !t.isDeleted && t.month === month && t.year === year && t.type === 'EXPENSE'
  );
  const totalExpenses = activeTransactions.reduce((acc, t) => acc + t.amount, 0);

  const activeIncomes = getIncomesForMonth(month, year);
  const receivedIncome = activeIncomes.reduce((acc, i) => acc + i.amount, 0);
  const totalDeductions = activeIncomes.reduce((acc, i) => acc + (i.deductionAmount || 0), 0);
  const netTakeHome = Math.max(0, receivedIncome - totalDeductions);

  const totalExpectedIncome = store.incomeSources.reduce((acc, s) => acc + s.amount, 0);
  const pendingIncome = Math.max(0, totalExpectedIncome - receivedIncome);
  const totalIncome = Math.max(totalExpectedIncome, receivedIncome);

  const activeBorrowedLoans = store.loans.filter((l) => l.status === 'active' && (l.type === 'borrowed' || !l.type));
  const activeLentLoans = store.loans.filter((l) => l.status === 'active' && l.type === 'lent');

  // Borrowed loan payments made targeting this month
  const borrowedPayments = store.loans
    .filter((l) => l.type === 'borrowed' || !l.type)
    .reduce((sum, l) => {
      const payForMonth = (l.payments || [])
        .filter((p) => isPaymentForMonth(p, month, year))
        .reduce((s, p) => s + p.amount, 0);
      return sum + payForMonth;
    }, 0);

  // Lent collections targeting this month
  const lentCollected = store.loans
    .filter((l) => l.type === 'lent')
    .reduce((sum, l) => {
      const collectForMonth = (l.payments || [])
        .filter((p) => isPaymentForMonth(p, month, year))
        .reduce((s, p) => s + p.amount, 0);
      return sum + collectForMonth;
    }, 0);

  // Net Monthly Surplus accounts for cash income received + collections minus expenses and loan payments
  const surplus = receivedIncome + lentCollected - totalExpenses - borrowedPayments;

  // Calculate true running available cash over all time
  const startingBalance = parseFloat(store.settings.starting_balance || '0');
  
  const allIncomes = store.incomes.filter((i) => !i.isDeleted);
  const totalAllTimeIncome = allIncomes.reduce((sum, i) => sum + i.amount, 0);

  const allTransactions = store.transactions.filter((t) => !t.isDeleted && t.type === 'EXPENSE');
  const totalAllTimeExpenses = allTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Exclude payments made in untracked months to prevent negative balances from historical entries
  const trackedMonths = getActiveTrackedMonths(month, year);

  const allBorrowedPayments = store.loans
    .filter((l) => l.type === 'borrowed' || !l.type)
    .reduce((sum, l) => {
      const pays = (l.payments || [])
        .filter((p) => {
          if (p.targetMonth !== null && p.targetMonth !== undefined) {
            const ty = p.targetYear ?? year;
            return trackedMonths.has(`${p.targetMonth}-${ty}`);
          }
          const pDate = safeDateObj(p.paymentDate);
          return trackedMonths.has(`${pDate.getMonth() + 1}-${pDate.getFullYear()}`);
        })
        .reduce((s, p) => s + p.amount, 0);
      return sum + pays;
    }, 0);

  const allLentCollections = store.loans
    .filter((l) => l.type === 'lent')
    .reduce((sum, l) => {
      const pays = (l.payments || [])
        .filter((p) => {
          if (p.targetMonth !== null && p.targetMonth !== undefined) {
            const ty = p.targetYear ?? year;
            return trackedMonths.has(`${p.targetMonth}-${ty}`);
          }
          const pDate = safeDateObj(p.paymentDate);
          return trackedMonths.has(`${pDate.getMonth() + 1}-${pDate.getFullYear()}`);
        })
        .reduce((s, p) => s + p.amount, 0);
      return sum + pays;
    }, 0);

  const availableCash = startingBalance + totalAllTimeIncome + allLentCollections - totalAllTimeExpenses - allBorrowedPayments;

  const totalLoanBalance = activeBorrowedLoans.reduce((acc, l) => acc + l.balance, 0);
  const totalLoanPayment = activeBorrowedLoans.reduce((acc, l) => acc + l.monthlyPayment, 0);

  const totalLentBalance = activeLentLoans.reduce((acc, l) => acc + l.balance, 0);
  const totalLentReceivable = activeLentLoans.reduce((acc, l) => acc + l.monthlyPayment, 0);

  // Calculate Overdue Items
  const now = new Date();
  const todayDay = now.getDate();

  const overdueBorrowedList = activeBorrowedLoans.filter((l) => {
    const paidThisMonth = (l.payments || []).some((p) => isPaymentForMonth(p, month, year));
    const dueDay = l.dueDay || 25;
    return !paidThisMonth && todayDay >= dueDay;
  });

  const overdueLentList = activeLentLoans.filter((l) => {
    const paidThisMonth = (l.payments || []).some((p) => isPaymentForMonth(p, month, year));
    const dueDay = l.dueDay || 25;
    return !paidThisMonth && todayDay >= dueDay;
  });

  const overdueLoansCount = overdueBorrowedList.length;
  const overdueLoansAmount = overdueBorrowedList.reduce((sum, l) => sum + l.monthlyPayment, 0);

  const overdueLentCount = overdueLentList.length;
  const overdueLentAmount = overdueLentList.reduce((sum, l) => sum + l.monthlyPayment, 0);

  const planBudgetCategories = store.categories.filter((cat) => cat.isPlanBudget && cat.budgetAmount);
  const totalPlanBudget = planBudgetCategories.reduce((sum, cat) => sum + (cat.budgetAmount || 0), 0);
  const totalPlanSpent = activeTransactions
    .filter((tx) => {
      const cat = store.categories.find((c) => c.id === tx.categoryId);
      return cat && cat.isPlanBudget;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  const overbudgetCategoriesCount = planBudgetCategories.filter((cat) => {
    const spent = activeTransactions
      .filter((tx) => tx.categoryId === cat.id)
      .reduce((acc, tx) => acc + tx.amount, 0);
    return spent > (cat.budgetAmount || 0);
  }).length;

  const overdueCount = overdueLoansCount + overdueLentCount + overbudgetCategoriesCount;

  // Calculate Financial Health Score (0-100)
  const denominatorIncome = receivedIncome > 0 ? receivedIncome : (totalIncome > 0 ? totalIncome : 1);
  const savingsRate = denominatorIncome > 0 ? (surplus / denominatorIncome) * 100 : 0;
  const debtToIncomeRatio = denominatorIncome > 0 ? ((totalLoanPayment + totalDeductions) / denominatorIncome) * 100 : 0;
  const emergencyMonths = totalExpenses > 0 ? availableCash / totalExpenses : 0;

  let score = 50;
  if (savingsRate >= 30) score += 20;
  else if (savingsRate >= 15) score += 10;
  else if (savingsRate < 0) score -= 20;

  if (debtToIncomeRatio < 25) score += 20;
  else if (debtToIncomeRatio > 40) score -= 15;

  if (emergencyMonths >= 6) score += 10;
  else if (emergencyMonths >= 3) score += 5;

  score = Math.min(100, Math.max(10, Math.round(score)));

  let healthStatus: 'Healthy' | 'Moderate' | 'Warning' | 'Critical' = 'Healthy';
  let message = 'Your financial health is strong with positive cash flow surplus.';

  if (score < 40) {
    healthStatus = 'Critical';
    message = 'Expenses exceed income or high loan debt ratio. Review spending.';
  } else if (score < 65) {
    healthStatus = 'Warning';
    message = 'Fair surplus, but keep an eye on discretionary spending.';
  } else if (score < 80) {
    healthStatus = 'Moderate';
    message = 'Good cash flow, debt payments are within manageable limits.';
  }

  const sourcesWithIncomes = store.incomeSources.map((source) => {
    const rec = activeIncomes.find((i) => i.sourceId === source.id);
    return {
      ...source,
      incomes: rec ? [rec] : [],
    };
  });

  res.json({
    totalIncome,
    totalExpenses,
    surplus,
    availableCash,
    startingBalance,
    receivedIncome,
    pendingIncome,
    incomeSources: sourcesWithIncomes,
    totalLoanBalance,
    totalLoanPayment,
    totalLentBalance,
    totalLentReceivable,
    overdueCount,
    overdueLoansCount,
    overdueLoansAmount,
    overdueLentCount,
    overdueLentAmount,
    overbudgetCategoriesCount,
    totalPlanBudget,
    totalPlanSpent,
    financialHealth: {
      status: healthStatus,
      score,
      savingsRate: Math.round(savingsRate),
      debtToIncomeRatio: Math.round(debtToIncomeRatio),
      emergencyMonths: parseFloat(emergencyMonths.toFixed(1)),
      message,
    },
    totalDeductions,
    borrowedPayments,
    lentCollected,
    netTakeHome,
  });
});

// 2. Expenses (Transactions)
app.get('/api/expenses', (req: Request, res: Response) => {
  const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const type = (req.query.type as string) || 'EXPENSE';

  const items = store.transactions
    .filter((t) => !t.isDeleted && t.month === month && t.year === year && t.type === type)
    .map((t) => ({
      ...t,
      category: store.categories.find((c) => c.id === t.categoryId) || null,
    }));

  res.json(items);
});

app.post('/api/expenses', async (req: Request, res: Response) => {
  const { amount, categoryId, name, date, method, notes, month, year } = req.body;
  const nowISO = new Date().toISOString();
  const dt = safeDateObj(date);

  const newTx: ServerTransaction = {
    id: `tx-${Date.now()}`,
    amount: parseFloat(amount) || 0,
    type: 'EXPENSE',
    categoryId: categoryId || null,
    name: name || 'Expense',
    date: dt.toISOString(),
    method: method || 'cash',
    notes: notes || '',
    month: month || dt.getMonth() + 1,
    year: year || dt.getFullYear(),
    uuid: req.body.uuid || `tx-uuid-${Date.now()}`,
    isDeleted: false,
    updatedAt: nowISO,
  };

  store.transactions.unshift(newTx);
  await persistTransaction(newTx);

  res.status(201).json({
    ...newTx,
    category: store.categories.find((c) => c.id === newTx.categoryId) || null,
  });
});

app.put('/api/expenses/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = store.transactions.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  const { amount, categoryId, name, date, method, notes, month, year } = req.body;
  const nowISO = new Date().toISOString();

  store.transactions[index] = {
    ...store.transactions[index],
    amount: amount !== undefined ? parseFloat(amount) : store.transactions[index].amount,
    categoryId: categoryId !== undefined ? categoryId : store.transactions[index].categoryId,
    name: name !== undefined ? name : store.transactions[index].name,
    date: date ? toIso(date) : store.transactions[index].date,
    method: method !== undefined ? method : store.transactions[index].method,
    notes: notes !== undefined ? notes : store.transactions[index].notes,
    month: month !== undefined ? parseInt(month) : store.transactions[index].month,
    year: year !== undefined ? parseInt(year) : store.transactions[index].year,
    updatedAt: nowISO,
  };

  await persistTransaction(store.transactions[index]);

  res.json({
    ...store.transactions[index],
    category: store.categories.find((c) => c.id === store.transactions[index].categoryId) || null,
  });
});

app.delete('/api/expenses/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const tx = store.transactions.find((t) => t.id === id);

  if (!tx) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  tx.isDeleted = true;
  tx.updatedAt = new Date().toISOString();
  await persistTransaction(tx);

  res.json({ message: 'Transaction soft deleted', id });
});

// 3. Categories
app.get('/api/categories', (req: Request, res: Response) => {
  const activeCategories = store.categories.filter((c) => !c.isDeleted);
  res.json(activeCategories);
});

app.post('/api/categories', async (req: Request, res: Response) => {
  const { name, icon, color, isPlanBudget, budgetAmount } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const newCat: ServerCategory = {
    id: `cat-${Date.now()}`,
    name,
    icon: icon || '📌',
    color: color || '#2196F3',
    uuid: req.body.uuid || `cat-uuid-${Date.now()}`,
    isPlanBudget: !!isPlanBudget,
    budgetAmount: isPlanBudget ? parseFloat(budgetAmount) || 0 : null,
    isDeleted: false,
    updatedAt: new Date().toISOString(),
  };

  store.categories.push(newCat);
  await persistCategory(newCat);

  res.status(201).json(newCat);
});

app.put('/api/categories/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = store.categories.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const { name, icon, color, isPlanBudget, budgetAmount } = req.body;

  store.categories[index] = {
    ...store.categories[index],
    name: name !== undefined ? name : store.categories[index].name,
    icon: icon !== undefined ? icon : store.categories[index].icon,
    color: color !== undefined ? color : store.categories[index].color,
    isPlanBudget: isPlanBudget !== undefined ? !!isPlanBudget : store.categories[index].isPlanBudget,
    budgetAmount: isPlanBudget ? (budgetAmount !== undefined ? parseFloat(budgetAmount) : store.categories[index].budgetAmount) : null,
    updatedAt: new Date().toISOString(),
  };

  await persistCategory(store.categories[index]);

  res.json(store.categories[index]);
});

app.delete('/api/categories/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const category = store.categories.find((c) => c.id === id);

  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  if (category.name === 'Extra' || category.name === 'Income' || category.id === 'cat-extra' || category.id === 'cat-income') {
    return res.status(403).json({ error: 'Protected default category cannot be deleted' });
  }

  category.isDeleted = true;
  category.updatedAt = new Date().toISOString();
  await persistCategory(category);

  store.transactions.forEach((t) => {
    if (t.categoryId === id) {
      t.categoryId = null;
      persistTransaction(t);
    }
  });

  res.json({ message: 'Category deleted', id });
});

// 4. Income
app.get('/api/income', (req: Request, res: Response) => {
  const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year as string) || new Date().getFullYear();

  const activeIncomes = store.incomes.filter((i) => !i.isDeleted && i.month === month && i.year === year);

  const sourcesWithRecords = store.incomeSources.map((s) => {
    const rec = activeIncomes.find((i) => i.sourceId === s.id);
    return {
      ...s,
      currentIncome: rec || null,
    };
  });

  res.json({
    sources: sourcesWithRecords,
    recordedIncomes: activeIncomes,
  });
});

app.post('/api/income', async (req: Request, res: Response) => {
  const { name, amount, type, notes } = req.body;

  if (!name || !amount) {
    return res.status(400).json({ error: 'Name and amount are required' });
  }

  const nowISO = new Date().toISOString();
  const newSource: ServerIncomeSource = {
    id: `inc-src-${Date.now()}`,
    name,
    amount: parseFloat(amount),
    type: type || 'salary',
    notes: notes || '',
    createdAt: nowISO,
    updatedAt: nowISO,
  };

  store.incomeSources.push(newSource);
  await persistIncomeSource(newSource);

  res.status(201).json(newSource);
});

app.post('/api/income/:id/record', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    amount,
    month,
    year,
    notes,
    receivedDate,
    targetMonth,
    targetYear,
    deductionAmount,
    deductionNote,
    linkedLoanId,
  } = req.body;

  const source = store.incomeSources.find((s) => s.id === id);
  if (!source) {
    return res.status(404).json({ error: 'Income source not found' });
  }

  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();
  const dateStr = receivedDate || new Date().toISOString();
  const nowISO = new Date().toISOString();

  const parsedAmount = parseFloat(amount) || source.amount;
  const parsedDeduction = parseFloat(deductionAmount) || 0;

  // Perform automatic linked loan payment if specified
  if (linkedLoanId && parsedDeduction > 0) {
    const loan = store.loans.find((l) => l.id === linkedLoanId);
    if (loan) {
      const payAmount = parsedDeduction;
      const principalPart = Math.min(payAmount, loan.balance);
      const interestPart = Math.max(0, payAmount - principalPart);
      loan.balance = Math.max(0, loan.balance - principalPart);
      loan.totalPaid = (loan.totalPaid || 0) + payAmount;
      loan.updatedAt = nowISO;
      if (loan.balance <= 0) {
        loan.status = 'paid';
      }

      const paymentRecord: ServerLoanPayment = {
        id: `pay-${Date.now()}`,
        loanId: loan.id,
        amount: payAmount,
        principalPart,
        interestPart,
        remainingAfter: loan.balance,
        paymentDate: dateStr,
        notes: deductionNote || `Direct deduction from ${source.name}`,
        targetMonth: targetMonth ? parseInt(targetMonth) : null,
        targetYear: targetYear ? parseInt(targetYear) : null,
      };

      if (!loan.payments) loan.payments = [];
      loan.payments.unshift(paymentRecord);
      await persistLoan(loan);
      await persistLoanPayment(paymentRecord);
    }
  }

  let existing = store.incomes.find((i) => !i.isDeleted && i.sourceId === id && i.month === m && i.year === y);

  if (existing) {
    existing.amount = parsedAmount;
    existing.notes = notes || existing.notes;
    existing.updatedAt = nowISO;
    existing.receivedDate = dateStr;
    existing.deductionAmount = parsedDeduction;
    existing.deductionNote = deductionNote || null;
    existing.linkedLoanId = linkedLoanId || null;
    existing.targetMonth = targetMonth ? parseInt(targetMonth) : null;
    existing.targetYear = targetYear ? parseInt(targetYear) : null;

    await persistIncomeRecord(existing);
    return res.json(existing);
  }

  const newRecord: ServerIncome = {
    id: `inc-${Date.now()}`,
    sourceId: id,
    amount: parsedAmount,
    month: m,
    year: y,
    receivedDate: dateStr,
    notes: notes || `Recorded for ${source.name}`,
    uuid: `inc-uuid-${Date.now()}`,
    isDeleted: false,
    updatedAt: nowISO,
    deductionAmount: parsedDeduction,
    deductionNote: deductionNote || null,
    linkedLoanId: linkedLoanId || null,
    targetMonth: targetMonth ? parseInt(targetMonth) : null,
    targetYear: targetYear ? parseInt(targetYear) : null,
  };

  store.incomes.push(newRecord);
  await persistIncomeRecord(newRecord);

  res.status(201).json(newRecord);
});

app.put('/api/income/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = store.incomeSources.findIndex((s) => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Income source not found' });
  }

  const { name, amount, type, notes } = req.body;
  const nowISO = new Date().toISOString();

  store.incomeSources[index] = {
    ...store.incomeSources[index],
    name: name !== undefined ? name : store.incomeSources[index].name,
    amount: amount !== undefined ? parseFloat(amount) : store.incomeSources[index].amount,
    type: type !== undefined ? type : store.incomeSources[index].type,
    notes: notes !== undefined ? notes : store.incomeSources[index].notes,
    updatedAt: nowISO,
  };

  await persistIncomeSource(store.incomeSources[index]);

  res.json(store.incomeSources[index]);
});

app.delete('/api/income/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = store.incomeSources.findIndex((s) => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Income source not found' });
  }

  store.incomeSources.splice(index, 1);
  store.incomes.forEach((i) => {
    if (i.sourceId === id) {
      i.isDeleted = true;
      i.updatedAt = new Date().toISOString();
      persistIncomeRecord(i);
    }
  });

  await deleteIncomeSourceDb(id);

  res.json({ message: 'Income source deleted', id });
});

// 5. Loans & Amortization
app.get('/api/loans', (req: Request, res: Response) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const todayDay = now.getDate();

  const formattedLoans = store.loans.map((loan) => {
    const paidThisMonth = (loan.payments || []).some((p) => {
      const pDate = safeDateObj(p.paymentDate);
      return pDate.getMonth() + 1 === currentMonth && pDate.getFullYear() === currentYear;
    });

    const startDay = safeDateObj(loan.startDate).getDate() || 25;
    const dueDay = loan.dueDay || Math.min(28, startDay);
    const isOverdue = loan.status === 'active' && loan.balance > 0 && !paidThisMonth && todayDay >= dueDay;

    const progress = Math.min(100, Math.round((loan.totalPaid / (loan.principal || 1)) * 100));
    const estimatedMonthsRemaining = loan.monthlyPayment > 0 ? Math.ceil(loan.balance / loan.monthlyPayment) : 0;

    return {
      ...loan,
      dueDay,
      currentMonthPaid: paidThisMonth,
      isOverdue,
      progress,
      remainingMonths: estimatedMonthsRemaining,
    };
  });

  res.json(formattedLoans);
});

app.post('/api/loans', async (req: Request, res: Response) => {
  const { name, type, dueDay, lender, principal, balance, interestRate, monthlyPayment, termMonths, startDate, notes } = req.body;

  if (!name || !principal || !monthlyPayment) {
    return res.status(400).json({ error: 'Name, principal, and monthly payment are required' });
  }

  const p = parseFloat(principal);
  const nowISO = new Date().toISOString();
  const startIso = startDate ? toIso(startDate) : nowISO;
  const calculatedDueDay = dueDay ? parseInt(dueDay) : (safeDateObj(startIso).getDate() || 25);

  const newLoan: ServerLoan = {
    id: `loan-${Date.now()}`,
    name,
    type: type === 'lent' ? 'lent' : 'borrowed',
    dueDay: calculatedDueDay,
    lender: lender || '',
    principal: p,
    balance: balance !== undefined ? parseFloat(balance) : p,
    interestRate: parseFloat(interestRate) || 0,
    monthlyPayment: parseFloat(monthlyPayment),
    termMonths: parseInt(termMonths) || 12,
    startDate: startIso,
    totalPaid: 0,
    status: 'active',
    notes: notes || '',
    updatedAt: nowISO,
    payments: [],
  };

  store.loans.push(newLoan);
  await persistLoan(newLoan);

  res.status(201).json(newLoan);
});

app.put('/api/loans/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const loan = store.loans.find((l) => l.id === id);

  if (!loan) {
    return res.status(404).json({ error: 'Loan not found' });
  }

  const { name, type, dueDay, lender, balance, interestRate, monthlyPayment, status, notes } = req.body;

  if (name !== undefined) loan.name = name;
  if (type !== undefined) loan.type = type === 'lent' ? 'lent' : 'borrowed';
  if (dueDay !== undefined) loan.dueDay = parseInt(dueDay) || 25;
  if (lender !== undefined) loan.lender = lender;
  if (balance !== undefined) loan.balance = parseFloat(balance);
  if (interestRate !== undefined) loan.interestRate = parseFloat(interestRate);
  if (monthlyPayment !== undefined) loan.monthlyPayment = parseFloat(monthlyPayment);
  if (status !== undefined) loan.status = status;
  if (notes !== undefined) loan.notes = notes;
  loan.updatedAt = new Date().toISOString();

  await persistLoan(loan);

  res.json(loan);
});

app.delete('/api/loans/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = store.loans.findIndex((l) => l.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Loan not found' });
  }

  store.loans.splice(index, 1);
  await deleteLoanDb(id);

  res.json({ message: 'Loan deleted', id });
});

app.post('/api/loans/:id/pay', async (req: Request, res: Response) => {
  const { id } = req.params;
  const loan = store.loans.find((l) => l.id === id);

  if (!loan) {
    return res.status(404).json({ error: 'Loan not found' });
  }

  const payAmount = req.body.amount ? parseFloat(req.body.amount) : loan.monthlyPayment;
  const monthlyRate = loan.interestRate / 100 / 12;
  const interestPart = Math.round(loan.balance * monthlyRate);
  const principalPart = Math.max(0, payAmount - interestPart);
  const newBalance = Math.max(0, loan.balance - principalPart);

  const targetMonthRaw = req.body.targetMonth;
  const targetYearRaw = req.body.targetYear;
  const targetMonth = targetMonthRaw ? parseInt(targetMonthRaw) : null;
  const targetYear = targetYearRaw ? parseInt(targetYearRaw) : null;

  const paymentRecord: ServerLoanPayment = {
    id: `pay-${Date.now()}`,
    loanId: id,
    amount: payAmount,
    principalPart,
    interestPart,
    remainingAfter: newBalance,
    paymentDate: new Date().toISOString(),
    notes: req.body.notes || 'Monthly Loan Amortization Payment',
    targetMonth,
    targetYear,
  };

  loan.balance = newBalance;
  loan.totalPaid += payAmount;
  if (newBalance <= 0) {
    loan.status = 'paid';
  }
  loan.updatedAt = new Date().toISOString();
  loan.payments.unshift(paymentRecord);

  await persistLoan(loan);
  await persistLoanPayment(paymentRecord);

  res.json({ loan, payment: paymentRecord });
});

app.delete('/api/loans/:id/pay/undo', async (req: Request, res: Response) => {
  const { id } = req.params;
  const loan = store.loans.find((l) => l.id === id);

  if (!loan || loan.payments.length === 0) {
    return res.status(400).json({ error: 'No payments found to undo' });
  }

  const lastPayment = loan.payments.shift()!;
  loan.balance += lastPayment.principalPart;
  loan.totalPaid = Math.max(0, loan.totalPaid - lastPayment.amount);
  if (loan.balance > 0) {
    loan.status = 'active';
  }
  loan.updatedAt = new Date().toISOString();

  await deleteLoanPaymentDb(lastPayment.id);
  await persistLoan(loan);

  res.json({ message: 'Payment undone', loan });
});

app.get('/api/loans/:id/amortization', (req: Request, res: Response) => {
  const { id } = req.params;
  const loan = store.loans.find((l) => l.id === id);

  if (!loan) {
    return res.status(404).json({ error: 'Loan not found' });
  }

  let tempBalance = loan.principal;
  const monthlyRate = loan.interestRate / 100 / 12;
  const schedule = [];
  let currentMonth = safeDateObj(loan.startDate);

  for (let m = 1; m <= loan.termMonths && tempBalance > 0; m++) {
    const interest = Math.round(tempBalance * monthlyRate);
    const principal = Math.min(tempBalance, loan.monthlyPayment - interest);
    tempBalance = Math.max(0, tempBalance - principal);

    schedule.push({
      monthNumber: m,
      date: currentMonth.toISOString(),
      payment: loan.monthlyPayment,
      principalPart: principal,
      interestPart: interest,
      remainingBalance: tempBalance,
    });

    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }

  res.json({ loan, schedule });
});

app.get('/api/loans/compare', (req: Request, res: Response) => {
  const comparisons = store.loans.map((loan) => {
    const totalPayments = loan.monthlyPayment * loan.termMonths;
    const totalInterest = totalPayments - loan.principal;
    return {
      id: loan.id,
      name: loan.name,
      lender: loan.lender,
      principal: loan.principal,
      interestRate: loan.interestRate,
      monthlyPayment: loan.monthlyPayment,
      totalInterest,
      totalCost: totalPayments,
    };
  });

  res.json(comparisons);
});

// 6. Cash Flow Trends
app.get('/api/cashflow', (req: Request, res: Response) => {
  const requestedMonths = parseInt(req.query.months as string) || 12;
  const monthsData = [];
  const currentDate = new Date();
  let cumulative = parseFloat(store.settings.starting_balance || '0');

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const isPaymentForMonth = (p: ServerLoanPayment, m: number, y: number) => {
    if (p.targetMonth !== null && p.targetMonth !== undefined) {
      return p.targetMonth === m && (p.targetYear ?? y) === y;
    }
    const pDate = safeDateObj(p.paymentDate);
    return pDate.getMonth() + 1 === m && pDate.getFullYear() === y;
  };

  const trackedMonths = getActiveTrackedMonths(currentDate.getMonth() + 1, currentDate.getFullYear());

  for (let i = requestedMonths - 1; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();

    const isThisMonthTracked = trackedMonths.has(`${m}-${y}`);

    const monthlyInc = store.incomes
      .filter((inc) => {
        if (inc.isDeleted) return false;
        if (inc.targetMonth !== null && inc.targetMonth !== undefined) {
          return inc.targetMonth === m && (inc.targetYear ?? y) === y;
        }
        return inc.month === m && inc.year === y;
      })
      .reduce((sum, inc) => sum + inc.amount, 0);

    const monthlyExp = store.transactions
      .filter((tx) => !tx.isDeleted && tx.type === 'EXPENSE' && tx.month === m && tx.year === y)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const borrowedPayments = !isThisMonthTracked ? 0 : store.loans
      .filter((l) => l.type === 'borrowed' || !l.type)
      .reduce((sum, l) => {
        const payForMonth = (l.payments || [])
          .filter((p) => isPaymentForMonth(p, m, y))
          .reduce((s, p) => s + p.amount, 0);
        return sum + payForMonth;
      }, 0);

    const lentCollected = !isThisMonthTracked ? 0 : store.loans
      .filter((l) => l.type === 'lent')
      .reduce((sum, l) => {
        const collectForMonth = (l.payments || [])
          .filter((p) => isPaymentForMonth(p, m, y))
          .reduce((s, p) => s + p.amount, 0);
        return sum + collectForMonth;
      }, 0);

    const surplus = monthlyInc + lentCollected - monthlyExp - borrowedPayments;
    cumulative += surplus;

    monthsData.push({
      month: m,
      year: y,
      monthName: `${monthNames[m - 1]} ${y}`,
      income: monthlyInc,
      expenses: monthlyExp + (isThisMonthTracked ? borrowedPayments : 0),
      surplus,
      cumulativeCash: cumulative,
    });
  }

  res.json(monthsData);
});

// 7. Sync Protocol (Mobile Push & Pull)
app.get('/api/sync', (req: Request, res: Response) => {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const activeCategories = store.categories.filter((c) => !c.isDeleted);
  const activeExpenses = store.transactions.filter((t) => !t.isDeleted && t.month === currentMonth && t.year === currentYear);
  const activeIncomes = store.incomes.filter((i) => !i.isDeleted && i.month === currentMonth && i.year === currentYear);

  res.json({
    categories: activeCategories,
    expenses: activeExpenses,
    incomes: activeIncomes,
    month: currentMonth,
    year: currentYear,
    deletedUuids: {
      categories: store.categories.filter((c) => c.isDeleted && c.uuid).map((c) => c.uuid!),
      expenses: store.transactions.filter((t) => t.isDeleted && t.uuid).map((t) => t.uuid!),
      incomes: store.incomes.filter((i) => i.isDeleted && i.uuid).map((i) => i.uuid!),
    },
  });
});

app.post('/api/sync', async (req: Request, res: Response) => {
  const { categories, expenses, income, deletedExpenseUuids, deletedCategoryUuids, deletedIncomeUuids } = req.body;

  let syncedCategories = 0;
  let syncedExpenses = 0;
  let syncedIncome = 0;

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  if (Array.isArray(deletedCategoryUuids)) {
    deletedCategoryUuids.forEach((uuid: string) => {
      const target = store.categories.find((c) => c.uuid === uuid);
      if (target) {
        target.isDeleted = true;
        target.updatedAt = new Date().toISOString();
        persistCategory(target);
      }
    });
  }

  if (Array.isArray(deletedExpenseUuids)) {
    deletedExpenseUuids.forEach((uuid: string) => {
      const target = store.transactions.find((t) => t.uuid === uuid);
      if (target) {
        target.isDeleted = true;
        target.updatedAt = new Date().toISOString();
        persistTransaction(target);
      }
    });
  }

  if (Array.isArray(deletedIncomeUuids)) {
    deletedIncomeUuids.forEach((uuid: string) => {
      const target = store.incomes.find((i) => i.uuid === uuid);
      if (target) {
        target.isDeleted = true;
        target.updatedAt = new Date().toISOString();
        persistIncomeRecord(target);
      }
    });
  }

  if (Array.isArray(categories)) {
    for (const cat of categories) {
      const existing = store.categories.find((c) => c.uuid === cat.uuid || c.name.toLowerCase() === cat.name.toLowerCase());
      const mobileTime = typeof cat.updatedAt === 'number' ? cat.updatedAt : new Date(cat.updatedAt || 0).getTime();

      if (existing) {
        const serverTime = new Date(existing.updatedAt).getTime();
        if (mobileTime >= serverTime) {
          existing.name = cat.name || existing.name;
          if (cat.icon) existing.icon = cat.icon;
          if (cat.color) existing.color = cat.color;
          if (cat.isPlanBudget !== undefined) existing.isPlanBudget = cat.isPlanBudget;
          if (cat.budgetAmount !== undefined) existing.budgetAmount = cat.budgetAmount;
          existing.updatedAt = new Date(mobileTime).toISOString();
          syncedCategories++;
          await persistCategory(existing);
        }
      } else {
        const newCat: ServerCategory = {
          id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: cat.name,
          icon: cat.icon || '📌',
          color: cat.color || '#2196F3',
          uuid: cat.uuid,
          isPlanBudget: !!cat.isPlanBudget,
          budgetAmount: cat.budgetAmount || null,
          isDeleted: false,
          updatedAt: new Date(mobileTime || Date.now()).toISOString(),
        };
        store.categories.push(newCat);
        syncedCategories++;
        await persistCategory(newCat);
      }
    }
  }

  if (Array.isArray(expenses)) {
    for (const exp of expenses) {
      const existing = store.transactions.find((t) => t.uuid === exp.uuid);
      const mobileTime = typeof exp.updatedAt === 'number' ? exp.updatedAt : new Date(exp.updatedAt || 0).getTime();
      const expDate = safeDateObj(exp.date);

      let catId: string | null = null;
      if (exp.category) {
        const matchCat = store.categories.find((c) => c.name.toLowerCase() === exp.category!.toLowerCase());
        if (matchCat) catId = matchCat.id;
      }

      if (existing) {
        const serverTime = new Date(existing.updatedAt).getTime();
        if (mobileTime >= serverTime) {
          existing.amount = exp.amount;
          existing.name = exp.name || existing.name;
          if (catId) existing.categoryId = catId;
          existing.date = expDate.toISOString();
          existing.method = exp.method || existing.method;
          existing.notes = exp.note || existing.notes;
          existing.updatedAt = new Date(mobileTime).toISOString();
          syncedExpenses++;
          await persistTransaction(existing);
        }
      } else {
        const newTx: ServerTransaction = {
          id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          amount: exp.amount,
          type: 'EXPENSE',
          categoryId: catId || 'cat-extra',
          name: exp.name || exp.category || 'Mobile Imported Expense',
          date: expDate.toISOString(),
          method: exp.method || 'cash',
          notes: exp.note || 'Synced from Android app',
          month: expDate.getMonth() + 1,
          year: expDate.getFullYear(),
          uuid: exp.uuid,
          isDeleted: false,
          updatedAt: new Date(mobileTime || Date.now()).toISOString(),
        };
        store.transactions.unshift(newTx);
        syncedExpenses++;
        await persistTransaction(newTx);
      }
    }
  }

  if (Array.isArray(income)) {
    for (const inc of income) {
      const existing = store.incomes.find((i) => i.uuid === inc.uuid);
      const mobileTime = typeof inc.updatedAt === 'number' ? inc.updatedAt : new Date(inc.updatedAt || 0).getTime();
      const incDate = safeDateObj(inc.date);

      const sourceName = inc.note || 'Mobile Import';
      let src = store.incomeSources.find((s) => s.name.toLowerCase() === sourceName.toLowerCase());
      if (!src) {
        src = {
          id: `inc-src-${Date.now()}`,
          name: sourceName,
          amount: inc.amount,
          type: 'salary',
          notes: 'Auto-created from Mobile Sync',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        store.incomeSources.push(src);
        await persistIncomeSource(src);
      }

      if (existing) {
        const serverTime = new Date(existing.updatedAt).getTime();
        if (mobileTime >= serverTime) {
          existing.amount = inc.amount;
          existing.receivedDate = incDate.toISOString();
          existing.updatedAt = new Date(mobileTime).toISOString();
          syncedIncome++;
          await persistIncomeRecord(existing);
        }
      } else {
        const newIncomeRecord: ServerIncome = {
          id: `inc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          sourceId: src.id,
          amount: inc.amount,
          month: incDate.getMonth() + 1,
          year: incDate.getFullYear(),
          receivedDate: incDate.toISOString(),
          notes: inc.note || 'Mobile Income Import',
          uuid: inc.uuid,
          isDeleted: false,
          updatedAt: new Date(mobileTime || Date.now()).toISOString(),
        };
        store.incomes.push(newIncomeRecord);
        syncedIncome++;
        await persistIncomeRecord(newIncomeRecord);
      }
    }
  }

  const activeCategories = store.categories.filter((c) => !c.isDeleted);
  const activeExpenses = store.transactions.filter((t) => !t.isDeleted && t.month === currentMonth && t.year === currentYear);
  const activeIncomes = store.incomes.filter((i) => !i.isDeleted && i.month === currentMonth && i.year === currentYear);

  res.json({
    synced: {
      categories: syncedCategories,
      expenses: syncedExpenses,
      income: syncedIncome,
    },
    skipped: {
      categories: 0,
      expenses: 0,
      income: 0,
    },
    serverData: {
      categories: activeCategories,
      expenses: activeExpenses.map((t) => ({
        ...t,
        category: store.categories.find((c) => c.id === t.categoryId) || null,
      })),
      incomes: activeIncomes,
      month: currentMonth,
      year: currentYear,
      deletedUuids: {
        categories: store.categories.filter((c) => c.isDeleted && c.uuid).map((c) => c.uuid!),
        expenses: store.transactions.filter((t) => t.isDeleted && t.uuid).map((t) => t.uuid!),
        incomes: store.incomes.filter((i) => i.isDeleted && i.uuid).map((i) => i.uuid!),
      },
    },
  });
});

// 8. Settings
app.get('/api/settings', (req: Request, res: Response) => {
  res.json(store.settings);
});

app.put('/api/settings', async (req: Request, res: Response) => {
  const { currency, starting_balance } = req.body;

  if (currency !== undefined) {
    store.settings.currency = currency;
    await persistSetting('currency', currency);
  }
  if (starting_balance !== undefined) {
    store.settings.starting_balance = starting_balance.toString();
    await persistSetting('starting_balance', starting_balance.toString());
  }

  res.json(store.settings);
});

// 9. Reset / Seed
app.post('/api/seed/reset', async (req: Request, res: Response) => {
  store = await resetDatabase();
  res.json({ message: 'Database reset to default Myanmar Kyat initial seed data' });
});

// Vite Middleware for development / static serving for production
async function startServer() {
  // Initialize PostgreSQL DB connection and seed/load dataset
  store = await initDb();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`My Finance Server running on http://localhost:${PORT}`);
  });
}

startServer();
