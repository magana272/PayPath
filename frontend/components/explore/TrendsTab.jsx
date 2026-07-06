"use client";

import { useMemo } from "react";
import { DonutChart, RadialProgress, COLORS } from "@/components/charts";
import DataTable, { tableStyles } from "@/components/DataTable";
import { FREQ_MULT } from "@/lib/constants";
import cg from "@/components/CardGrid.module.css";
import es from "@/app/explore/page.module.css";

const DEBT_TYPE_LABELS = {
  credit_card: "Credit Card",
  car: "Auto Loan",
  student_loan: "Student Loan",
};

export default function TrendsTab({ debts, summary, liquid, expenses }) {
  const expenseBreakdown = useMemo(() => (expenses || [])
    .map((e) => ({ name: e.expense, value: Math.round((e.cost || 0) * (FREQ_MULT[e.frequency] || 0) * 100) / 100 }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value), [expenses]);
  const totalMonthlyExpense = expenseBreakdown.reduce((s, e) => s + e.value, 0);

  const totalLiquid = (liquid || []).reduce((s, a) => s + a.balance, 0);
  const monthsCovered = summary && summary.monthly_expenses > 0 ? totalLiquid / summary.monthly_expenses : 0;
  const efColor = monthsCovered >= 3 ? COLORS[0] : monthsCovered >= 1 ? "#ca8a04" : COLORS[1];

  const debtComposition = useMemo(() => {
    const byType = {};
    for (const d of debts || []) {
      if (d.balance <= 0) continue;
      const label = DEBT_TYPE_LABELS[d.type] || d.type || "Other";
      byType[label] = (byType[label] || 0) + d.balance;
    }
    return Object.entries(byType)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [debts]);

  const totalDebt = debtComposition.reduce((s, d) => s + d.value, 0);

  return (
    <>
      <div className={cg.grid}>
        <div className={cg.card} style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <RadialProgress value={monthsCovered} max={6} color={efColor} size={72} />
          <div>
            <h3 className={cg.cardTitle}>Emergency Fund</h3>
            <p className="big-number">{monthsCovered.toFixed(1)} mo</p>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace" }}>of expenses covered · target 3–6</span>
          </div>
        </div>
      </div>

      <div className={es.chartContainer}>
        <h2 className={es.chartTitle}>Debt Composition</h2>
      {debtComposition.length > 0 ? (
        <>
          <DonutChart data={debtComposition} height={300} />
          <DataTable>
            <thead>
              <tr><th>Type</th><th>Balance</th><th>Share</th></tr>
            </thead>
            <tbody>
              {debtComposition.map((d, i) => (
                <tr key={d.name}>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span className={es.colorDot} style={{ background: COLORS[i % COLORS.length] }} />
                      {d.name}
                    </span>
                  </td>
                  <td className={tableStyles.red}>${d.value.toLocaleString()}</td>
                  <td>{((d.value / totalDebt) * 100).toFixed(1)}%</td>
                </tr>
              ))}
              <tr className={es.trTotal}>
                <td>Total</td>
                <td className={tableStyles.red}>${totalDebt.toLocaleString()}</td>
                <td>100%</td>
              </tr>
            </tbody>
          </DataTable>
        </>
      ) : (
        <p style={{ color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>No debt to show.</p>
      )}
      </div>

      <div className={es.chartContainer}>
        <h2 className={es.chartTitle}>Expense Breakdown (Monthly)</h2>
        {expenseBreakdown.length > 0 ? (
          <>
            <DonutChart data={expenseBreakdown} height={300} />
            <DataTable>
              <thead>
                <tr><th>Expense</th><th>Monthly</th><th>Share</th></tr>
              </thead>
              <tbody>
                {expenseBreakdown.map((e, i) => (
                  <tr key={e.name}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span className={es.colorDot} style={{ background: COLORS[i % COLORS.length] }} />
                        {e.name}
                      </span>
                    </td>
                    <td className={tableStyles.red}>${e.value.toLocaleString()}</td>
                    <td>{((e.value / totalMonthlyExpense) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className={es.trTotal}>
                  <td>Total</td>
                  <td className={tableStyles.red}>${totalMonthlyExpense.toLocaleString()}</td>
                  <td>100%</td>
                </tr>
              </tbody>
            </DataTable>
          </>
        ) : (
          <p style={{ color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>No expenses to show.</p>
        )}
      </div>
    </>
  );
}
