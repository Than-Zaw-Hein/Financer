export interface Transaction {
  id: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  categoryId?: string | null;
  name?: string | null;
  date: string; // ISO String
  method?: string | null; // e.g. "cash", "kpay", "wave", "aya", "bank"
  notes?: string | null;
  month: number; // 1 - 12
  year: number;
  uuid?: string | null;
  isDeleted: boolean;
  updatedAt: string;
  category?: Category | null;
}

export interface Category {
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

export interface IncomeSource {
  id: string;
  name: string;
  amount: number; // expected monthly amount
  type: 'salary' | 'freelance' | 'business' | 'other';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  incomes?: Income[];
}

export interface Income {
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
  source?: IncomeSource;

  // Early payout & Linked Direct Loan/Bill Deduction fields
  deductionAmount?: number | null;
  deductionNote?: string | null;
  linkedLoanId?: string | null;
  targetMonth?: number | null;
  targetYear?: number | null;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number; // monthly payment
  principalPart: number;
  interestPart: number;
  remainingAfter: number;
  paymentDate: string;
  notes?: string | null;
  targetMonth?: number | null;
  targetYear?: number | null;
}

export interface Loan {
  id: string;
  name: string;
  type?: 'borrowed' | 'lent'; // 'borrowed' = I owe money, 'lent' = someone owes money to me
  dueDay?: number; // Day of month payment is due (1-31)
  lender?: string | null;
  principal: number;
  balance: number;
  interestRate: number; // annual % (e.g., 13)
  monthlyPayment: number;
  termMonths: number;
  startDate: string;
  totalPaid: number;
  status: 'active' | 'paid';
  notes?: string | null;
  updatedAt: string;
  payments?: LoanPayment[];
  loanPayments?: LoanPayment[];
  
  // Computed client fields
  currentMonthPaid?: boolean;
  isOverdue?: boolean;
  progress?: number; // 0 - 100%
  remainingMonths?: number;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  surplus: number;
  availableCash: number;
  startingBalance: number;
  receivedIncome: number;
  pendingIncome: number;
  incomeSources: IncomeSource[];
  totalLoanBalance: number;
  totalLoanPayment: number;
  totalLentBalance?: number;
  totalLentReceivable?: number;
  overdueCount?: number;
  overdueLoansCount?: number;
  overdueLoansAmount?: number;
  overdueLentCount?: number;
  overdueLentAmount?: number;
  overbudgetCategoriesCount?: number;
  totalPlanBudget?: number;
  totalPlanSpent?: number;
  financialHealth: {
    status: 'Healthy' | 'Moderate' | 'Warning' | 'Critical';
    score: number; // 0 - 100
    savingsRate: number; // %
    debtToIncomeRatio: number; // %
    emergencyMonths: number; // number of months covered
    message: string;
  };
  totalDeductions?: number;
  borrowedPayments?: number;
  lentCollected?: number;
  netTakeHome?: number;
}

export interface CashFlowMonth {
  month: number;
  year: number;
  monthName: string;
  income: number;
  expenses: number;
  surplus: number;
  cumulativeCash: number;
}

export interface SyncPayload {
  categories?: {
    name: string;
    icon?: string;
    color?: string;
    isPlanBudget?: boolean;
    budgetAmount?: number;
    uuid: string;
    updatedAt: number | string;
  }[];
  expenses?: {
    name?: string;
    amount: number;
    category?: string;
    date: number | string;
    method?: string;
    note?: string;
    uuid: string;
    updatedAt: number | string;
  }[];
  income?: {
    amount: number;
    date: number | string;
    uuid: string;
    updatedAt: number | string;
    note?: string;
  }[];
  deletedExpenseUuids?: string[];
  deletedCategoryUuids?: string[];
  deletedIncomeUuids?: string[];
}

export interface SyncResponse {
  synced: {
    categories: number;
    expenses: number;
    income: number;
  };
  skipped: {
    categories: number;
    expenses: number;
    income: number;
  };
  serverData: {
    categories: Category[];
    expenses: Transaction[];
    incomes: Income[];
    month: number;
    year: number;
    deletedUuids: {
      categories: string[];
      expenses: string[];
      incomes: string[];
    };
  };
}
