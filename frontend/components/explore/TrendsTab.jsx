"use client";

import { useMemo } from "react";
import { GradientArea, DonutChart, RadialProgress, VerticalBar, COLORS } from "@/components/charts";
import DataTable, { tableStyles } from "@/components/DataTable";
import CalendarHeatmap from "@/components/explore/CalendarHeatmap";
import PaydayWaterfall from "@/components/explore/PaydayWaterfall";
import { FREQ_MULT } from "@/lib/constants";
import { simulateAvalanche, downsample } from "@/lib/simulate";
import cg from "@/components/CardGrid.module.css";
import es from "@/app/explore/page.module.css";

const DEBT_TYPE_LABELS = {
  credit_card: "Credit Card",
  car: "Auto Loan",
  student_loan: "Student Loan",
};

export default function TrendsTab({ debts, summary, liquid, expenses, heatmap, paydayFlow }) {
  const expenseBreakdown = useMemo(() => (expenses || [])
    .map((e) => ({ name: e.expense, value: Math.round((e.cost || 0) * (FREQ_MULT[e.frequency] || 0) * 100) / 100 }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value), [expenses]);
  const totalMonthlyExpense = expenseBreakdown.reduce((s, e) => s + e.value, 0);

  const totalLiquid = (liquid || []).reduce((s, a) => s + a.balance, 0);
  const monthsCovered = summary && summary.monthly_expenses > 0 ? totalLiquid / summary.monthly_expenses : 0;
  const efColor = monthsCovered >= 3 ? COLORS[0] : monthsCovered >= 1 ? "#ca8a04" : COLORS[1];

  const interestPrincipal = useMemo(() => {
    const sim = simulateAvalanche(debts, summary?.monthly_surplus || 0, 0);
    return downsample(sim?.history || [], 40);
  }, [debts, summary]);

  const netWorthSeries = useMemo(() => {
    if (!summary) return [];
    const surplus = summary.monthly_surplus || 0;
    const sim = simulateAvalanche(debts, surplus > 0 ? surplus : 0, 0);
    const history = sim?.history || [];
    const horizon = Math.min(Math.max(history.length, 12), 48);
    const base = new Date();
    const fmt = (offset) => new Date(base.getFullYear(), base.getMonth() + offset, 1)
      .toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const series = [{ month: fmt(0), net_worth: Math.round(summary.net_worth || 0) }];
    let nw = summary.net_worth || 0;
    for (let m = 1; m <= horizon; m++) {
      nw += surplus - (history[m - 1]?.monthInterest || 0);
      series.push({ month: fmt(m), net_worth: Math.round(nw) });
    }
    return series;
  }, [debts, summary]);

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
        <h2 className={es.chartTitle}>Net Worth Over Time (Projected)</h2>
        {netWorthSeries.length > 1 ? (
          <GradientArea data={netWorthSeries} dataKey="net_worth" xKey="month" referenceLine={0} referenceLabel="Break-even" height={300} color={COLORS[2]} />
        ) : (
          <p style={{ color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>Not enough data to project net worth.</p>
        )}
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

      <div className={es.chartContainer}>
        <h2 className={es.chartTitle}>Interest vs Principal per Payment</h2>
        {interestPrincipal.length > 0 ? (
          <VerticalBar
            data={interestPrincipal}
            xKey="month"
            xLabel="Month"
            stacked
            bars={[
              { dataKey: "monthInterest", name: "Interest", color: COLORS[1] },
              { dataKey: "monthPrincipal", name: "Principal", color: COLORS[0] },
            ]}
          />
        ) : (
          <p style={{ color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>Add debts and a positive monthly surplus to project the payoff breakdown.</p>
        )}
      </div>

      <div className={es.chartContainer}>
        <h2 className={es.chartTitle}>Cash Flow Heatmap{heatmap ? ` (${heatmap.year})` : ""}</h2>
        {heatmap && Object.keys(heatmap.map).length > 0 ? (
          <>
            <CalendarHeatmap year={heatmap.year} map={heatmap.map} />
            <p style={{ marginTop: 10, fontSize: 10, color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace" }}>Green = income-heavy days · Red = bill-heavy days</p>
          </>
        ) : (
          <p style={{ color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>Loading calendar…</p>
        )}
      </div>

      <div className={es.chartContainer}>
        <h2 className={es.chartTitle}>Pay-Day Cash Flow</h2>
        {paydayFlow && paydayFlow.length > 1 ? (
          <>
            <PaydayWaterfall steps={paydayFlow} />
            <p style={{ marginTop: 10, fontSize: 10, color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace" }}>How one paycheck is consumed by bills before the next payday</p>
          </>
        ) : (
          <p style={{ color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>No paydays this month to chart.</p>
        )}
      </div>
    </>
  );
}
