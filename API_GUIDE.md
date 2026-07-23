# 🤖 Web API Guide for AI Agents & External Integrations

This guide details how external AI agents, automated scripts, or client applications can interact with the **My Finance Application Web API**.

---

## 📡 Base URL & Protocol

- **Base URL**: `http://localhost:3000/api` (or your deployed server domain)
- **Protocol**: HTTP/1.1 or HTTP/2 over TLS
- **Content-Type**: `application/json`
- **Data Format**: Standard JSON across all endpoints

---

## 🎯 Quick Reference Table

| Category | Endpoint | Method | Purpose |
|---|---|---|---|
| **Overview** | `/api/dashboard` | `GET` | Retrieve overall balance, overdue alerts & financial health |
| **Expenses** | `/api/expenses` | `GET` | Fetch list of expenses (supports optional `month` & `year` query) |
| **Expenses** | `/api/expenses` | `POST` | Record a new expense transaction |
| **Expenses** | `/api/expenses/:id` | `PUT` | Edit an existing expense transaction |
| **Expenses** | `/api/expenses/:id` | `DELETE` | Delete (soft-delete) an expense |
| **Categories** | `/api/categories` | `GET` | List expense categories & budget allocations |
| **Categories** | `/api/categories` | `POST` | Create a new budget category |
| **Income** | `/api/income` | `GET` | Fetch income sources and monthly logs |
| **Income** | `/api/income` | `POST` | Create a new income stream |
| **Income** | `/api/income/:id/record` | `POST` | Record monthly received income |
| **Loans** | `/api/loans` | `GET` | List loans (`borrowed` & `lent`) with due dates & overdue flags |
| **Loans** | `/api/loans` | `POST` | Add a new loan or receivable entry |
| **Loans** | `/api/loans/:id/pay` | `POST` | Make a loan payment or collect lent money |
| **Loans** | `/api/loans/:id/pay/undo` | `DELETE` | Undo the last recorded loan payment |
| **Loans** | `/api/loans/:id/amortization` | `GET` | Generate amortization schedule for a loan |
| **Cash Flow** | `/api/cashflow` | `GET` | 12-month historical trends & rolling average metrics |
| **Sync** | `/api/sync` | `GET` / `POST` | Bi-directional state sync endpoint |

---

## 📋 Endpoint Details & Request Specs

### 1. Dashboard Overview
`GET /api/dashboard`

**Response Example:**
```json
{
  "totalIncome": 500000,
  "totalExpense": 150000,
  "surplus": 350000,
  "netBalance": 1200000,
  "savingsRate": 70,
  "totalLoanBalance": 200000,
  "totalLentBalance": 50000,
  "overdueCount": 2,
  "overdueLoansCount": 1,
  "overdueLoansAmount": 15000,
  "overdueLentCount": 1,
  "overdueLentAmount": 10000,
  "overbudgetCategoriesCount": 0,
  "financialHealth": {
    "status": "Healthy",
    "score": 88
  }
}
```

---

### 2. Expenses Management

#### Create Expense
`POST /api/expenses`

**Request Body:**
```json
{
  "amount": 25000,
  "categoryId": "cat-food",
  "date": "2026-07-22",
  "description": "Team lunch at cafe",
  "isRecurring": false,
  "isNeed": true
}
```

#### Fetch Expenses
`GET /api/expenses?month=7&year=2026`

**Response Example:**
```json
{
  "transactions": [
    {
      "id": "tx-1721678900",
      "amount": 25000,
      "categoryId": "cat-food",
      "categoryName": "Food & Dining",
      "date": "2026-07-22T00:00:00.000Z",
      "description": "Team lunch at cafe",
      "isNeed": true
    }
  ],
  "totalSpent": 25000
}
```

---

### 3. Loans & Lending Engine

#### Add Loan / Receivable
`POST /api/loans`

**Request Body:**
```json
{
  "name": "KBZ Bank Housing Loan",
  "type": "borrowed",
  "dueDay": 25,
  "lender": "KBZ Bank",
  "principal": 5000000,
  "balance": 4200000,
  "interestRate": 13,
  "monthlyPayment": 120000,
  "termMonths": 60,
  "startDate": "2024-01-01",
  "notes": "Mortgage payment"
}
```

> **Note on `type`**:
> - `"borrowed"`: Liability (Money you owe to someone/institution)
> - `"lent"`: Asset (Money someone owes to you)

#### Pay Loan / Collect Lent Money
`POST /api/loans/:id/pay`

**Request Body:**
```json
{
  "amount": 120000,
  "note": "July installment payment"
}
```

---

### 4. Cash Flow & Rolling Analytics
`GET /api/cashflow`

**Response Example:**
```json
{
  "monthlyData": [
    {
      "month": "Jan 2026",
      "income": 500000,
      "expenses": 120000,
      "savings": 380000
    }
  ],
  "avgMonthlyIncome": 500000,
  "avgMonthlyExpenses": 120000,
  "avgMonthlySavings": 380000
}
```

---

## 🐍 Python Integration Example for AI Agents

```python
import requests

BASE_URL = "http://localhost:3000/api"

def get_financial_summary():
    response = requests.get(f"{BASE_URL}/dashboard")
    if response.status_code == 200:
        data = response.json()
        print(f"Net Balance: {data['netBalance']} MMK")
        print(f"Overdue Items: {data['overdueCount']}")
        print(f"Health Score: {data['financialHealth']['score']}/100 ({data['financialHealth']['status']})")
        return data
    else:
        print("Failed to fetch dashboard:", response.status_code)

def record_expense(amount, category_id, description):
    payload = {
        "amount": amount,
        "categoryId": category_id,
        "description": description,
        "isNeed": True
    }
    response = requests.post(f"{BASE_URL}/expenses", json=payload)
    return response.json()

if __name__ == "__main__":
    get_financial_summary()
```

---

## ⚡ TypeScript / Node.js Integration Example

```typescript
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

async function fetchOverdueAlerts() {
  const res = await axios.get(`${API_BASE}/dashboard`);
  const { overdueCount, overdueLoansCount, overdueLentCount, overdueLoansAmount } = res.data;
  
  if (overdueCount > 0) {
    console.warn(`🚨 Alert: ${overdueCount} overdue actions required!`);
    console.warn(`Loans overdue: ${overdueLoansCount} (${overdueLoansAmount} MMK)`);
  } else {
    console.log('✅ No overdue actions required.');
  }
}

fetchOverdueAlerts();
```

---

## 🔄 Agent Data Synchronization (`/api/sync`)

If another agent maintains an offline or local copy of financial state, it can perform a full state query or payload replace:

- `GET /api/sync`: Downloads complete dataset (`expenses`, `categories`, `incomeSources`, `loans`, `settings`).
- `POST /api/sync`: Uploads updated full payload to reconcile state across agents.
