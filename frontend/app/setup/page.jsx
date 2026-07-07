"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { IncomeFormFields, INCOME_EMPTY_FORM, buildIncomePayload } from "@/components/settings/IncomeTab";
import styles from "./setup.module.css";

const STEPS = [
  { id: "income", label: "Income" },
  { id: "liquid", label: "Accounts" },
  { id: "expenses", label: "Expenses" },
  { id: "debts", label: "Debts", optional: true },
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [jobs, setJobs] = useState([]);
  const [jobForm, setJobForm] = useState({ ...INCOME_EMPTY_FORM });

  const [expenses, setExpenses] = useState([]);
  const [expenseForm, setExpenseForm] = useState({ expense: "", cost: "", due_date: "", frequency: "monthly" });

  const [debts, setDebts] = useState([]);
  const [debtForm, setDebtForm] = useState({ bank: "", type: "credit_card", name: "", apy: "", balance: "" });

  const [liquidForm, setLiquidForm] = useState({ bank: "", balance: "" });
  const [newLiquid, setNewLiquid] = useState([]);

  const addLiquidAccount = (e) => {
    e.preventDefault();
    setNewLiquid([...newLiquid, { ...liquidForm, _id: Date.now() }]);
    setLiquidForm({ bank: "", balance: "" });
  };

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addJob = (e) => {
    e.preventDefault();
    setJobs([...jobs, { ...jobForm, _id: Date.now() }]);
    setJobForm({ ...INCOME_EMPTY_FORM });
  };

  const addExpense = (e) => {
    e.preventDefault();
    setExpenses([...expenses, { ...expenseForm, _id: Date.now() }]);
    setExpenseForm({ expense: "", cost: "", due_date: "", frequency: "monthly" });
  };

  const addDebt = (e) => {
    e.preventDefault();
    setDebts([...debts, { ...debtForm, _id: Date.now() }]);
    setDebtForm({ bank: "", type: "credit_card", name: "", apy: "", balance: "" });
  };

  const finish = async () => {
    setSaving(true);
    setError("");
    const calls = [
      ...jobs.map((j) => () =>
        api.addIncome(buildIncomePayload(j))
      ),
      ...expenses.map((e) => () =>
        api.addExpense({ expense: e.expense, cost: parseFloat(e.cost), due_date: e.due_date ? parseInt(e.due_date) : null, frequency: e.frequency })
      ),
      ...debts.map((d) => () =>
        api.addDebt({ bank: d.bank, type: d.type, name: d.name, apy: parseFloat(d.apy), balance: parseFloat(d.balance) })
      ),
      ...newLiquid.map((a) => () =>
        api.addLiquid({ bank: a.bank, balance: parseFloat(a.balance) })
      ),
    ];
    let failed = 0;
    let lastError = "";
    for (const call of calls) {
      try {
        await call();
      } catch (err) {
        failed++;
        lastError = err?.message || "Unknown error";
      }
    }
    if (failed > 0) {
      setError(`${failed} item(s) failed to save: ${lastError}`);
      setSaving(false);
      return;
    }
    router.push("/");
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  const canFinishEarly = STEPS[step].optional;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.logo}>PayPath</span>
          <span className={styles.headerSub}>Account Setup</span>
        </div>

        {/* Step bar */}
        <div className={styles.stepBar}>
          {STEPS.map((s, i) => (
            <div key={s.id} className={styles.stepItem}>
              <div className={`${styles.stepDot} ${i < step ? styles.stepDone : i === step ? styles.stepActive : ""}`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`${styles.stepLabel} ${i === step ? styles.stepLabelActive : ""}`}>{s.label}</span>
              {i < STEPS.length - 1 && <div className={`${styles.stepLine} ${i < step ? styles.stepLineDone : ""}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className={styles.stepBody}>
          {STEPS[step].id === "income" && (
            <>
              <h2 className={styles.stepTitle}>Add Income Sources</h2>
              <p className={styles.stepDesc}>Add your jobs — hourly or salaried.</p>
              <form className={styles.form} onSubmit={addJob}>
                <IncomeFormFields form={jobForm} setForm={setJobForm} cls={{ input: styles.input, select: styles.select, row: styles.row }} />
                <button type="submit" className={styles.addBtn}>+ Add</button>
              </form>
              {jobs.length > 0 && (
                <ul className={styles.list}>
                  {jobs.map((j) => (
                    <li key={j._id} className={styles.listItem}>
                      <span>
                        {j.job} — {j.pay_type === "salary"
                          ? `$${Number(j.annual_salary).toLocaleString()}/yr`
                          : `$${j.pay_per_hour}/hr · ${j.hour_per_day} hrs/day`}
                      </span>
                      <button className={styles.removeBtn} onClick={() => setJobs(jobs.filter((x) => x._id !== j._id))}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {STEPS[step].id === "expenses" && (
            <>
              <h2 className={styles.stepTitle}>Add Expenses</h2>
              <p className={styles.stepDesc}>Rent, subscriptions, bills, etc.</p>
              <form className={styles.form} onSubmit={addExpense}>
                <input className={styles.input} placeholder="Expense name" value={expenseForm.expense} onChange={(e) => setExpenseForm({ ...expenseForm, expense: e.target.value })} required />
                <div className={styles.row}>
                  <input className={styles.input} type="number" step="0.01" placeholder="Cost" value={expenseForm.cost} onChange={(e) => setExpenseForm({ ...expenseForm, cost: e.target.value })} required />
                  <input className={styles.input} type="number" min="1" max="31" placeholder="Due day (1-31)" value={expenseForm.due_date} onChange={(e) => setExpenseForm({ ...expenseForm, due_date: e.target.value })} />
                </div>
                <select className={styles.select} value={expenseForm.frequency} onChange={(e) => setExpenseForm({ ...expenseForm, frequency: e.target.value })}>
                  <option value="monthly">Monthly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <button type="submit" className={styles.addBtn}>+ Add</button>
              </form>
              {expenses.length > 0 && (
                <ul className={styles.list}>
                  {expenses.map((e) => (
                    <li key={e._id} className={styles.listItem}>
                      <span>{e.expense} — ${e.cost} · {e.frequency}</span>
                      <button className={styles.removeBtn} onClick={() => setExpenses(expenses.filter((x) => x._id !== e._id))}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {STEPS[step].id === "debts" && (
            <>
              <h2 className={styles.stepTitle}>Add Debts</h2>
              <p className={styles.stepDesc}>Credit cards, loans, etc.</p>
              <p className={styles.stepDesc}>Optional — you can skip this.</p>
              <form className={styles.form} onSubmit={addDebt}>
                <div className={styles.row}>
                  <input className={styles.input} placeholder="Bank" value={debtForm.bank} onChange={(e) => setDebtForm({ ...debtForm, bank: e.target.value })} required />
                  <select className={styles.select} value={debtForm.type} onChange={(e) => setDebtForm({ ...debtForm, type: e.target.value })}>
                    <option value="credit_card">Credit Card</option>
                    <option value="car">Auto Loan</option>
                    <option value="student_loan">Student Loan</option>
                  </select>
                </div>
                <input className={styles.input} placeholder="Account name" value={debtForm.name} onChange={(e) => setDebtForm({ ...debtForm, name: e.target.value })} required />
                <div className={styles.row}>
                  <input className={styles.input} type="number" step="0.01" placeholder="APR %" value={debtForm.apy} onChange={(e) => setDebtForm({ ...debtForm, apy: e.target.value })} required />
                  <input className={styles.input} type="number" step="0.01" placeholder="Balance" value={debtForm.balance} onChange={(e) => setDebtForm({ ...debtForm, balance: e.target.value })} required />
                </div>
                <button type="submit" className={styles.addBtn}>+ Add</button>
              </form>
              {debts.length > 0 && (
                <ul className={styles.list}>
                  {debts.map((d) => (
                    <li key={d._id} className={styles.listItem}>
                      <span>{d.name} ({d.bank}) — ${d.balance} · {d.apy}% APR</span>
                      <button className={styles.removeBtn} onClick={() => setDebts(debts.filter((x) => x._id !== d._id))}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {STEPS[step].id === "liquid" && (
            <>
              <h2 className={styles.stepTitle}>What&apos;s in your account right now?</h2>
              <p className={styles.stepDesc}>Enter today&apos;s balance for checking, savings, or cash. PayPath uses this to show what you can spend until your next payday.</p>
              <form className={styles.form} onSubmit={addLiquidAccount}>
                <div className={styles.row}>
                  <input className={styles.input} placeholder="Bank name" value={liquidForm.bank} onChange={(e) => setLiquidForm({ ...liquidForm, bank: e.target.value })} required />
                  <input className={styles.input} type="number" step="0.01" placeholder="Balance" value={liquidForm.balance} onChange={(e) => setLiquidForm({ ...liquidForm, balance: e.target.value })} required />
                </div>
                <button type="submit" className={styles.addBtn}>+ Add</button>
              </form>
              {newLiquid.length > 0 && (
                <ul className={styles.list}>
                  {newLiquid.map((a) => (
                    <li key={a._id} className={styles.listItem}>
                      <span>{a.bank} — ${a.balance}</span>
                      <button className={styles.removeBtn} onClick={() => setNewLiquid(newLiquid.filter((x) => x._id !== a._id))}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

        </div>

        {error && <p className={styles.error}>{error}</p>}

        {/* Navigation */}
        <div className={styles.nav}>
          <button className={styles.navBack} onClick={prev} disabled={step === 0}>← Back</button>
          <button className={styles.navSkip} onClick={() => router.push("/")}>Skip for now</button>
          {canFinishEarly && step < STEPS.length - 1 && (
            <button className={styles.navBack} onClick={finish} disabled={saving}>
              {saving ? "Saving..." : "Finish"}
            </button>
          )}
          <button className={styles.navNext} onClick={next} disabled={saving}>
            {step < STEPS.length - 1 ? "Next →" : (saving ? "Saving..." : "Complete")}
          </button>
        </div>
      </div>
    </div>
  );
}
