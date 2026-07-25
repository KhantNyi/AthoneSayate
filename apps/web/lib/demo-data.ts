// Sample dataset for the signed-out demo. Never written to Supabase and never
// carried into a real account: signing up starts from the seeded starter data
// in 007_auth.sql instead.
//
// Dates are generated relative to today so the dashboard, month comparison, and
// forecast all have something to show. The forecast needs at least three
// complete prior months to report high confidence, so the history runs back
// four months.
import { addDays, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import type { ExpenseData } from "@athonesayate/shared/supabase-data";
import type { Transaction } from "@athonesayate/shared/types";

const iso = (date: Date) => format(date, "yyyy-MM-dd");

// Deterministic pseudo-random so the demo looks identical on every reload.
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const ACCOUNTS = {
  checking: "d0000000-0000-4000-8000-000000000001",
  cash: "d0000000-0000-4000-8000-000000000002",
  card: "d0000000-0000-4000-8000-000000000003"
};

const CATEGORIES = {
  salary: "d0000000-0000-4000-8000-000000000101",
  housing: "d0000000-0000-4000-8000-000000000102",
  food: "d0000000-0000-4000-8000-000000000103",
  transport: "d0000000-0000-4000-8000-000000000104",
  bills: "d0000000-0000-4000-8000-000000000105",
  entertainment: "d0000000-0000-4000-8000-000000000106",
  savings: "d0000000-0000-4000-8000-000000000107"
};

const SUBCATEGORIES = {
  rent: "d0000000-0000-4000-8000-000000000201",
  meal: "d0000000-0000-4000-8000-000000000202",
  drink: "d0000000-0000-4000-8000-000000000203",
  groceries: "d0000000-0000-4000-8000-000000000204",
  fuel: "d0000000-0000-4000-8000-000000000205",
  taxi: "d0000000-0000-4000-8000-000000000206",
  electricity: "d0000000-0000-4000-8000-000000000207",
  internet: "d0000000-0000-4000-8000-000000000208"
};

const RULES = {
  rent: "d0000000-0000-4000-8000-000000000301",
  internet: "d0000000-0000-4000-8000-000000000302",
  electricity: "d0000000-0000-4000-8000-000000000303"
};

type Spend = {
  categoryId: string;
  subcategoryId?: string;
  merchant: string;
  accountId: string;
  min: number;
  max: number;
  /** Roughly how many times this occurs per month. */
  perMonth: number;
};

const VARIABLE_SPEND: Spend[] = [
  { categoryId: CATEGORIES.food, subcategoryId: SUBCATEGORIES.meal, merchant: "Lunch", accountId: ACCOUNTS.cash, min: 60, max: 180, perMonth: 18 },
  { categoryId: CATEGORIES.food, subcategoryId: SUBCATEGORIES.drink, merchant: "Coffee", accountId: ACCOUNTS.cash, min: 45, max: 95, perMonth: 12 },
  { categoryId: CATEGORIES.food, subcategoryId: SUBCATEGORIES.groceries, merchant: "Supermarket", accountId: ACCOUNTS.card, min: 400, max: 1400, perMonth: 4 },
  { categoryId: CATEGORIES.transport, subcategoryId: SUBCATEGORIES.fuel, merchant: "Petrol station", accountId: ACCOUNTS.card, min: 500, max: 900, perMonth: 2 },
  { categoryId: CATEGORIES.transport, subcategoryId: SUBCATEGORIES.taxi, merchant: "Ride share", accountId: ACCOUNTS.cash, min: 80, max: 260, perMonth: 6 },
  { categoryId: CATEGORIES.entertainment, merchant: "Cinema", accountId: ACCOUNTS.card, min: 220, max: 520, perMonth: 2 },
  { categoryId: CATEGORIES.entertainment, merchant: "Streaming", accountId: ACCOUNTS.card, min: 150, max: 350, perMonth: 1 }
];

function buildTransactions(today: Date): Transaction[] {
  const random = makeRandom(20260726);
  const transactions: Transaction[] = [];
  let counter = 0;
  const nextId = () => `d0000000-0000-4000-9000-${String(++counter).padStart(12, "0")}`;

  // Four complete prior months plus the current month to date.
  for (let monthsAgo = 4; monthsAgo >= 0; monthsAgo -= 1) {
    const monthStart = startOfMonth(subMonths(today, monthsAgo));
    const monthEnd = endOfMonth(monthStart);
    const isCurrentMonth = monthsAgo === 0;
    const lastDay = isCurrentMonth ? today : monthEnd;
    const daysAvailable = Math.max(1, Number(format(lastDay, "d")));

    // Salary on the 25th, or not yet if this month hasn't reached it.
    const salaryDay = addDays(monthStart, 24);
    if (salaryDay <= lastDay) {
      transactions.push({
        id: nextId(),
        accountId: ACCOUNTS.checking,
        categoryId: CATEGORIES.salary,
        type: "income",
        amount: 48000,
        occurredOn: iso(salaryDay),
        merchant: "Monthly salary",
        notes: ""
      });
    }

    // Recurring bills, linked to their rule and cycle.
    const recurring: Array<{ day: number; ruleId: string; categoryId: string; subcategoryId?: string; merchant: string; amount: number }> = [
      { day: 1, ruleId: RULES.rent, categoryId: CATEGORIES.housing, subcategoryId: SUBCATEGORIES.rent, merchant: "Rent", amount: 14000 },
      { day: 6, ruleId: RULES.internet, categoryId: CATEGORIES.bills, subcategoryId: SUBCATEGORIES.internet, merchant: "Internet", amount: 890 },
      { day: 12, ruleId: RULES.electricity, categoryId: CATEGORIES.bills, subcategoryId: SUBCATEGORIES.electricity, merchant: "Electricity", amount: 1450 }
    ];

    recurring.forEach((bill) => {
      const dueOn = addDays(monthStart, bill.day - 1);
      if (dueOn > lastDay) {
        return;
      }
      transactions.push({
        id: nextId(),
        accountId: ACCOUNTS.checking,
        categoryId: bill.categoryId,
        subcategoryId: bill.subcategoryId,
        type: "expense",
        amount: bill.amount + Math.round((random() - 0.5) * (bill.amount * 0.08)),
        occurredOn: iso(dueOn),
        merchant: bill.merchant,
        notes: "",
        isRecurring: true,
        recurringRuleId: bill.ruleId,
        recurringDueOn: iso(dueOn)
      });
    });

    // Day-to-day spending, scaled down for a partial current month.
    VARIABLE_SPEND.forEach((spend) => {
      const scale = isCurrentMonth ? daysAvailable / Number(format(monthEnd, "d")) : 1;
      const occurrences = Math.max(0, Math.round(spend.perMonth * scale));

      for (let index = 0; index < occurrences; index += 1) {
        const day = 1 + Math.floor(random() * daysAvailable);
        transactions.push({
          id: nextId(),
          accountId: spend.accountId,
          categoryId: spend.categoryId,
          subcategoryId: spend.subcategoryId,
          type: "expense",
          amount: Math.round(spend.min + random() * (spend.max - spend.min)),
          occurredOn: iso(addDays(monthStart, day - 1)),
          merchant: spend.merchant,
          notes: ""
        });
      }
    });

    // A monthly transfer into savings.
    const savingsDay = addDays(monthStart, 25);
    if (savingsDay <= lastDay) {
      transactions.push({
        id: nextId(),
        accountId: ACCOUNTS.checking,
        categoryId: CATEGORIES.savings,
        type: "expense",
        amount: 6000,
        occurredOn: iso(savingsDay),
        merchant: "Savings transfer",
        notes: ""
      });
    }
  }

  return transactions.sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));
}

export function demoExpenseData(reference: Date = new Date()): ExpenseData {
  const monthStart = startOfMonth(reference);
  const nextMonthStart = startOfMonth(subMonths(reference, -1));

  return {
    accounts: [
      { id: ACCOUNTS.checking, name: "Everyday Checking", type: "checking", openingBalance: 42000, color: "#3d7485" },
      { id: ACCOUNTS.cash, name: "Cash Wallet", type: "cash", openingBalance: 1800, color: "#c3833d" },
      { id: ACCOUNTS.card, name: "Rewards Card", type: "credit_card", openingBalance: -6200, color: "#bd5b4b" }
    ],
    categories: [
      { id: CATEGORIES.salary, name: "Salary", kind: "income", icon: "briefcase", color: "#5e7c62" },
      { id: CATEGORIES.housing, name: "Housing", kind: "expense", icon: "home", color: "#7d536d", monthlyBudget: 15000 },
      { id: CATEGORIES.food, name: "Food", kind: "expense", icon: "utensils", color: "#c3833d", monthlyBudget: 9000 },
      { id: CATEGORIES.transport, name: "Transport", kind: "expense", icon: "car", color: "#3d7485", monthlyBudget: 4000 },
      { id: CATEGORIES.bills, name: "Bills", kind: "expense", icon: "receipt", color: "#bd5b4b", monthlyBudget: 3500 },
      { id: CATEGORIES.entertainment, name: "Entertainment", kind: "expense", icon: "ticket", color: "#5e7c62", monthlyBudget: 2500 },
      { id: CATEGORIES.savings, name: "Savings", kind: "expense", icon: "piggy-bank", color: "#7d536d", monthlyBudget: 6000 }
    ],
    subcategories: [
      { id: SUBCATEGORIES.rent, categoryId: CATEGORIES.housing, name: "Rent" },
      { id: SUBCATEGORIES.meal, categoryId: CATEGORIES.food, name: "Meal" },
      { id: SUBCATEGORIES.drink, categoryId: CATEGORIES.food, name: "Drink" },
      { id: SUBCATEGORIES.groceries, categoryId: CATEGORIES.food, name: "Groceries" },
      { id: SUBCATEGORIES.fuel, categoryId: CATEGORIES.transport, name: "Fuel" },
      { id: SUBCATEGORIES.taxi, categoryId: CATEGORIES.transport, name: "Taxi" },
      { id: SUBCATEGORIES.electricity, categoryId: CATEGORIES.bills, name: "Electricity" },
      { id: SUBCATEGORIES.internet, categoryId: CATEGORIES.bills, name: "Internet" }
    ],
    transactions: buildTransactions(reference),
    budgets: [
      { id: "d0000000-0000-4000-8000-000000000401", categoryId: CATEGORIES.food, month: iso(monthStart), amount: 9000 },
      { id: "d0000000-0000-4000-8000-000000000402", categoryId: CATEGORIES.transport, month: iso(monthStart), amount: 4000 },
      { id: "d0000000-0000-4000-8000-000000000403", categoryId: CATEGORIES.entertainment, month: iso(monthStart), amount: 2500 }
    ],
    recurringRules: [
      {
        id: RULES.rent,
        accountId: ACCOUNTS.checking,
        categoryId: CATEGORIES.housing,
        subcategoryId: SUBCATEGORIES.rent,
        type: "expense",
        amount: 14000,
        merchant: "Rent",
        frequency: "monthly",
        nextDueOn: iso(nextMonthStart),
        autoCreate: false
      },
      {
        id: RULES.internet,
        accountId: ACCOUNTS.checking,
        categoryId: CATEGORIES.bills,
        subcategoryId: SUBCATEGORIES.internet,
        type: "expense",
        amount: 890,
        merchant: "Internet",
        frequency: "monthly",
        nextDueOn: iso(addDays(nextMonthStart, 5)),
        autoCreate: false
      },
      {
        id: RULES.electricity,
        accountId: ACCOUNTS.checking,
        categoryId: CATEGORIES.bills,
        subcategoryId: SUBCATEGORIES.electricity,
        type: "expense",
        amount: 1450,
        merchant: "Electricity",
        frequency: "monthly",
        nextDueOn: iso(addDays(nextMonthStart, 11)),
        autoCreate: false
      }
    ],
    goals: [
      {
        id: "d0000000-0000-4000-8000-000000000501",
        name: "Emergency fund",
        targetAmount: 120000,
        currentAmount: 74000,
        targetDate: iso(startOfMonth(subMonths(reference, -8))),
        color: "#5e7c62"
      },
      {
        id: "d0000000-0000-4000-8000-000000000502",
        name: "New laptop",
        targetAmount: 45000,
        currentAmount: 18500,
        targetDate: iso(startOfMonth(subMonths(reference, -4))),
        color: "#7d536d"
      }
    ]
  };
}
