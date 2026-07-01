"""
My Finance App — Management Script
သုံးလို့ရတဲ့ commands များ:

  1) income <amount>              → လစာ (Salary) record လုပ်မယ် (ဒီလအတွက်)
  2) status <id> paid|unpaid      → expense status ပြောင်းမယ်
  3) add <name> <amount>          → expense အသစ်ထည့်မယ် (ဒီလအတွက်, status=paid)
  4) list                         → ဒီလ (July) expenses စာရင်းပြမယ်
  5) dashboard                    → Dashboard summary ပြမယ်

Example:
  python3 manage.py income 5000000
  python3 manage.py status cmr1ffh9k0007h9ssf2aim2ts paid
  python3 manage.py add "Deepseek API" 10000
"""

import urllib.request
import json
import sys
from datetime import datetime

BASE = "http://dev-tzh.local:3002/api"

now = datetime.now()
month = now.month
year = now.year

def api_get(path):
    r = urllib.request.urlopen(f"{BASE}{path}")
    return json.loads(r.read())

def api_post(path, data):
    body = json.dumps(data).encode("utf-8")
    r = urllib.request.urlopen(
        urllib.request.Request(f"{BASE}{path}", data=body,
        headers={"Content-Type": "application/json"})
    )
    return json.loads(r.read())

def cmd_dashboard():
    d = api_get("/dashboard")
    print(f"📊 Dashboard — {d['month']}/{d['year']}")
    print(f"   Expenses : {d['totalExpenses']:,} MMK")
    print(f"   Paid     : {d['totalPaid']:,}  ({d['paidCount']} items)")
    print(f"   Unpaid   : {d['totalUnpaid']:,}  ({d['unpaidCount']} items)")
    print(f"   Partial  : {d['partialCount']} items")
    print(f"   Progress : {d['paymentProgress']}%")
    print(f"   Loan     : {d['totalLoanBalance']:,} MMK")

def cmd_list():
    d = api_get(f"/expenses?month={month}&year={year}")
    print(f"\n📋 Expenses — {month}/{year} (Total: {d['totalAmount']:,} MMK)")
    print(f"{'ID':>6} {'Name':25s} {'Amount':>10s} {'Status':8s}")
    print("-" * 55)
    for i, item in enumerate(d["items"], 1):
        status_icon = {"paid":"✅","unpaid":"⬜","partial":"⏳"}.get(item["status"], "❓")
        name = item["name"][:25]
        print(f"  {i:<3} {name:<25s} {item['amount']:>10,} {status_icon} {item['status']:8s}  [{item['id'][:8]}..]")

def cmd_income(amount):
    # Get income source
    sources = api_get("/income")
    if not sources.get("sources"):
        print("❌ No income source found (လစာ)")
        return
    source_id = sources["sources"][0]["id"]
    data = {"sourceId": source_id, "amount": float(amount), "month": month, "year": year}
    r = api_post("/income", data)
    print(f"✅ Income recorded: {float(amount):,.0f} MMK")

def cmd_status(expense_id, new_status):
    if new_status not in ("paid", "unpaid", "partial"):
        print("❌ Status must be: paid / unpaid / partial")
        return
    data = {"status": new_status}
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}/expenses/{expense_id}", data=body,
        headers={"Content-Type": "application/json"},
        method="PUT"
    )
    r = urllib.request.urlopen(req)
    print(f"✅ Status updated → {new_status}")

def cmd_add(name, amount, category="Other"):
    data = {
        "name": name,
        "amount": float(amount),
        "category": category,
        "status": "paid",
        "month": month,
        "year": year,
        "isRecurring": False
    }
    r = api_post("/expenses", data)
    print(f"✅ Added: {name} — {float(amount):,.0f} MMK [paid]")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 manage.py dashboard")
        print("  python3 manage.py list")
        print('  python3 manage.py income 5000000')
        print('  python3 manage.py status <expense_id> paid')
        print('  python3 manage.py add "Item Name" 10000')
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "dashboard":
        cmd_dashboard()
    elif cmd == "list":
        cmd_list()
    elif cmd == "income" and len(sys.argv) >= 3:
        cmd_income(sys.argv[2])
    elif cmd == "status" and len(sys.argv) >= 4:
        cmd_status(sys.argv[2], sys.argv[3])
    elif cmd == "add" and len(sys.argv) >= 4:
        cmd_add(sys.argv[2], sys.argv[3])
    else:
        print("❌ Invalid command. See usage above.")
