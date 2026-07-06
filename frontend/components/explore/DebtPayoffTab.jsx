"use client";

import { useMemo, useDeferredValue, useState } from "react";
import { simulateAvalanche, downsample, calcMinPayment } from "@/lib/simulate";
import { GradientArea, StackedArea } from "@/components/charts";
import DataTable, { tableStyles } from "@/components/DataTable";
import styles from "@/components/CardGrid.module.css";
import es from "@/app/explore/page.module.css";

export default function DebtPayoffTab({ payoff: initialPayoff, scenarios, debts, extraPayment = 0, onExtraPaymentChange, stickyOffset = 0 }) {
  const baseBudget = initialPayoff?.budget || 0;
  const sliderMax = Math.max(2000, Math.round(baseBudget * 3 / 50) * 50);

  const totalMinPayments = useMemo(
    () => debts?.reduce((sum, d) => sum + calcMinPayment(d.balance, d.apy, d.type), 0) || 0,
    [debts]
  );

  const deferredExtra = useDeferredValue(extraPayment);

  const simulated = useMemo(() => {
    if (!debts?.length || baseBudget <= 0) return null;
    return simulateAvalanche(debts, baseBudget, deferredExtra);
  }, [deferredExtra, debts, baseBudget]);

  const payoff = simulated || initialPayoff;

  const hasHistory = payoff?.history?.length > 0;
  const negativeBudget = payoff && payoff.budget < 0;

  const debtNames = useMemo(
    () => initialPayoff?.history?.length
      ? Object.keys(initialPayoff.history[0]).filter((k) => k !== "month" && k !== "total" && k !== "interest")
      : [],
    [initialPayoff]
  );

  const chartHistory = useMemo(() => downsample(payoff?.history, 48), [payoff]);

  const hasInterest = chartHistory?.[0]?.interest != null;

  const interestLine = hasInterest
    ? [{ dataKey: "interest", name: "Cumulative Interest", color: "#c41e1e", width: 2.5, dashed: true }]
    : undefined;

  const totalDebtData = useMemo(
    () => chartHistory?.map((h) => ({ label: h.month, total: h.total })) ?? [],
    [chartHistory]
  );

  const didConverge = payoff?.months < 480;

  const savedMonths = initialPayoff?.months && payoff?.months && didConverge
    ? initialPayoff.months - payoff.months
    : 0;

  const minSim = useMemo(
    () => (debts?.length && totalMinPayments > 0 ? simulateAvalanche(debts, totalMinPayments, 0) : null),
    [debts, totalMinPayments]
  );

  const payoffSchedule = useMemo(() => {
    if (!payoff?.history?.length || !debts?.length) return [];
    return [...debts].sort((a, b) => b.apy - a.apy).map((d, i) => {
      let month = null;
      for (const row of payoff.history) {
        if ((row[d.name] ?? 0) <= 0.01) { month = row.month; break; }
      }
      return { order: i + 1, name: d.name, apy: d.apy, balance: d.balance, month };
    });
  }, [payoff, debts]);

  const fmtMonths = (m) => m == null ? "—" : m >= 12 ? `${Math.floor(m / 12)}y ${m % 12}m` : `${m}mo`;

  const stickyTop = { top: stickyOffset };

  const [balanceExpanded, setBalanceExpanded] = useState(false);
  const [totalDebtExpanded, setTotalDebtExpanded] = useState(true);

  return (
    <>
      {payoff && (
        <div className={styles.grid}>
          <div className={`${styles.card}${negativeBudget ? ` ${styles.danger}` : ""}`}>
            <h3 className={styles.cardTitle}>Monthly Budget</h3>
            <p className="big-number">
              {negativeBudget ? "−" : ""}${Math.abs(payoff.budget).toLocaleString()}
              {extraPayment > 0 && (
                <span style={{ fontSize: 12, color: "var(--green)", marginLeft: 6 }}>+${extraPayment}</span>
              )}
            </p>
          </div>
          {hasHistory && didConverge ? (
            <div className={`${styles.card} ${styles.accent}`}>
              <h3 className={styles.cardTitle}>Debt-Free In</h3>
              <p className="big-number">
                {Math.floor(payoff.months / 12)}y {payoff.months % 12}m
                {savedMonths > 0 && (
                  <span style={{ fontSize: 11, color: "var(--green)", marginLeft: 6 }}>
                    ({savedMonths}mo faster)
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className={`${styles.card} ${styles.danger}`}>
              <h3 className={styles.cardTitle}>Debt-Free In</h3>
              <p className="big-number">40y+</p>
            </div>
          )}
          {totalMinPayments > 0 && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Min Payments</h3>
              <p className="big-number">${Math.round(totalMinPayments).toLocaleString()}/mo</p>
            </div>
          )}
          {didConverge && payoff.total_interest > 0 && (
            <div className={`${styles.card} ${styles.danger}`}>
              <h3 className={styles.cardTitle}>Total Interest</h3>
              <p className="big-number">${payoff.total_interest.toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

      {scenarios.length > 0 && (
        <div className={es.chartContainer}>
          <h2 className={es.chartTitle}>Hourly Rate Needed by Payoff Target</h2>
          <GradientArea
            data={scenarios.map((s) => ({ label: `${s.months}mo`, rate: s.hourly_rate }))}
            dataKey="rate"
            height={240}
            color="#111"
            xLabel="Payoff Target"
            yLabel="Hourly Rate"
            noFill
          />
        </div>
      )}

      {payoff && !negativeBudget && debts?.length > 0 && (
        <div className={es.stickySection} style={{ ...stickyTop, zIndex: 41 }}>
          <h2 className={es.chartTitle}>Extra Monthly Payment</h2>
          <div className={es.sliderRow}>
            <input
              type="range"
              min="0"
              max={sliderMax}
              step="25"
              value={extraPayment}
              onChange={(e) => onExtraPaymentChange(Number(e.target.value))}
              className={es.sliderInput}
            />
            <span className={es.sliderLabel} style={{ color: extraPayment > 0 ? "var(--green)" : "var(--text-muted)" }}>
              +${extraPayment.toLocaleString()}
            </span>
          </div>
          <div className={es.sliderRange}>
            <span>$0</span>
            <span>${sliderMax.toLocaleString()}</span>
          </div>
        </div>
      )}

      {negativeBudget && (
        <div className={`${styles.card} ${styles.danger}`} style={{ marginBottom: 6 }}>
          <p>Expenses exceed income by <strong>${Math.abs(payoff.budget).toLocaleString()}/mo</strong>. No payoff plan available.</p>
        </div>
      )}

      {hasHistory && (
        <>
          <div
            className={`${es.chartContainer} ${es.chartDropdown}`}
            onClick={() => setBalanceExpanded((v) => !v)}
          >
            <h2 className={`${es.chartTitle} ${es.chartToggle}`}>
              Balance Over Time (Avalanche) <span className={es.expandIcon}>{balanceExpanded ? "−" : "+"}</span>
            </h2>
          </div>

          {balanceExpanded && (
            <div className={es.chartContainer}>
              <StackedArea data={chartHistory} keys={debtNames} xKey="month" height={380} xLabel="Month" yLabel="Balance" lines={interestLine} dualAxis={hasInterest} rightYLabel="Cumulative Interest" />
              {hasInterest && (
                <div className={es.interestLegend}>
                  <span className={es.interestLegendLine} />
                  <span>Cumulative Interest (right axis)</span>
                </div>
              )}
            </div>
          )}

          <div className={`${es.chartContainer} ${es.chartDropdown}`} onClick={() => setTotalDebtExpanded((v) => !v)}>
            <h2 className={`${es.chartTitle} ${es.chartToggle}`}>
              Total Debt Over Time <span className={es.expandIcon}>{totalDebtExpanded ? "−" : "+"}</span>
            </h2>
          </div>
          {totalDebtExpanded && (
            <div className={es.chartContainer}>
              <GradientArea data={totalDebtData} dataKey="total" height={280} color="#c41e1e" xLabel="Month" yLabel="Total Owed" noFill />
            </div>
          )}

          {payoffSchedule.length > 0 && (
            <div className={es.chartContainer}>
              <h2 className={es.chartTitle}>Payoff Schedule (Avalanche Order)</h2>
              <DataTable>
                <thead>
                  <tr><th>#</th><th>Debt</th><th>APR</th><th>Balance</th><th>Paid Off</th></tr>
                </thead>
                <tbody>
                  {payoffSchedule.map((d) => (
                    <tr key={d.name}>
                      <td>{d.order}</td>
                      <td>{d.name}</td>
                      <td>{d.apy}%</td>
                      <td className={tableStyles.red}>${Math.round(d.balance).toLocaleString()}</td>
                      <td>{fmtMonths(d.month)}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          )}

          {minSim && (
            <div className={es.chartContainer}>
              <h2 className={es.chartTitle}>Minimums vs. Your Plan</h2>
              <div className={styles.grid}>
                <div className={`${styles.card} ${styles.danger}`}>
                  <h3 className={styles.cardTitle}>Paying Minimums Only</h3>
                  <p className="big-number">{minSim.months < 480 ? `${Math.floor(minSim.months / 12)}y ${minSim.months % 12}m` : "40y+"}</p>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>${Math.round(minSim.total_interest).toLocaleString()} interest</span>
                </div>
                <div className={`${styles.card} ${styles.accent}`}>
                  <h3 className={styles.cardTitle}>Your Plan</h3>
                  <p className="big-number">{didConverge ? `${Math.floor(payoff.months / 12)}y ${payoff.months % 12}m` : "40y+"}</p>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>${Math.round(payoff.total_interest).toLocaleString()} interest</span>
                </div>
                {didConverge && minSim.months < 480 && (
                  <div className={styles.card}>
                    <h3 className={styles.cardTitle}>You Save</h3>
                    <p className="big-number green">{minSim.months - payoff.months}mo</p>
                    <span style={{ fontSize: 11, color: "var(--green)", fontFamily: "var(--font-mono), monospace" }}>${Math.round(minSim.total_interest - payoff.total_interest).toLocaleString()} interest</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

    </>
  );
}
