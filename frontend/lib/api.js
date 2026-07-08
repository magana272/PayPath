import { getToken, clearToken } from "./auth";
import { cache } from "./cache";

const BASE = process.env.NEXT_PUBLIC_API_URL;

function authHeaders(extra = {}) {
  const headers = { ...extra };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function authFetch(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: authHeaders(opts.headers),
  });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const text = (await res.text().catch(() => "")).trim();
    if (res.status === 403 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("paypath:demo-blocked"));
    }
    throw new Error(text || `API error: ${res.status}`);
  }
  return res.json();
}

function mutate(method, path, data) {
  return authFetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

function cached(key, fetcher) {
  return fetcher().then(data => {
    cache.set(key, data);
    return data;
  });
}

export const api = {
  login: (email, password) =>
    fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Login failed");
      }
      return res.json();
    }),

  register: (email, password, name) =>
    fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Registration failed");
      }
      return res.json();
    }),

  logout: () => { cache.invalidate(); return authFetch("/auth/logout", { method: "POST" }); },
  getMe: () => authFetch("/auth/me"),
  deleteAccount: () => { cache.invalidate(); return authFetch("/auth/me", { method: "DELETE" }); },

  getDashboard: () => authFetch("/bundle/dashboard"),
  getExplore: () => authFetch("/bundle/explore"),
  getSettings: () => authFetch("/bundle/settings"),

  getSummary: () => cached("summary", () => authFetch("/summary")),
  getExpenses: () => cached("expenses", () => authFetch("/expenses")),
  getDebts: () => cached("debts", () => authFetch("/debts")),
  getIncome: () => cached("income", () => authFetch("/income")),
  getLiquid: () => cached("liquid", () => authFetch("/liquid")),
  getPayoff: () => cached("payoff", () => authFetch("/payoff")),
  getScenarios: () => cached("scenarios", () => authFetch("/scenarios")),
  getCashflow: (days = 90) => cached(`cashflow-${days}`, () => authFetch(`/cashflow?days=${days}`)),
  getCalendar: (year, month) => cached(`calendar-${year}-${month}`, () =>
    authFetch(`/calendar?year=${year}&month=${month}`).then(raw => {
      const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      const firstDay = new Date(year, month - 1, 1);
      const firstWeekday = (firstDay.getDay() + 6) % 7; // Mon=0
      const daysInMonth = new Date(year, month, 0).getDate();
      const events = {};
      for (const [dateStr, evts] of Object.entries(raw)) {
        const day = parseInt(dateStr.split("-")[2], 10);
        events[day] = evts;
      }
      return { events, first_weekday: firstWeekday, days_in_month: daysInMonth, month_name: MONTH_NAMES[month - 1], year };
    })
  ),
  getAIStatus: () => authFetch("/ai/status"),
  getAIInsights: () => authFetch("/ai/insights"),
  getAIDebtPayoff: () => authFetch("/ai/debt-payoff-strategy"),
  getAISavingsPlan: () => authFetch("/ai/savings-plan"),
  getAIExpenseAudit: () => authFetch("/ai/expense-audit"),
  getAIIncomeBoost: () => authFetch("/ai/income-boost"),

  addExpense: (data) => mutate("POST", "/expenses", data).then(r => { cache.invalidate("expenses", "summary", "calendar*"); return r; }),
  updateExpense: (id, data) => mutate("PUT", `/expenses/${id}`, data).then(r => { cache.invalidate("expenses", "summary", "calendar*"); return r; }),
  deleteExpense: (id) => authFetch(`/expenses/${id}`, { method: "DELETE" }).then(r => { cache.invalidate("expenses", "summary", "calendar*"); return r; }),

  addDebt: (data) => mutate("POST", "/debts", data).then(r => { cache.invalidate("debts", "summary", "payoff", "scenarios"); return r; }),
  updateDebt: (id, data) => mutate("PUT", `/debts/${id}`, data).then(r => { cache.invalidate("debts", "summary", "payoff", "scenarios"); return r; }),
  deleteDebt: (id) => authFetch(`/debts/${id}`, { method: "DELETE" }).then(r => { cache.invalidate("debts", "summary", "payoff", "scenarios"); return r; }),

  addIncome: (data) => mutate("POST", "/income", data).then(r => { cache.invalidate("income", "summary", "calendar*"); return r; }),
  updateIncome: (id, data) => mutate("PUT", `/income/${id}`, data).then(r => { cache.invalidate("income", "summary", "calendar*"); return r; }),
  deleteIncome: (id) => authFetch(`/income/${id}`, { method: "DELETE" }).then(r => { cache.invalidate("income", "summary", "calendar*"); return r; }),

  addLiquid: (data) => mutate("POST", "/liquid", data).then(r => { cache.invalidate("liquid", "summary"); return r; }),
  updateLiquid: (id, data) => mutate("PUT", `/liquid/${id}`, data).then(r => { cache.invalidate("liquid", "summary"); return r; }),
};