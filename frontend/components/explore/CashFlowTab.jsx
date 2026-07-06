"use client";

import { useMemo, useCallback } from "react";
import { GradientArea } from "@/components/charts";
import DataTable, { tableStyles } from "@/components/DataTable";
import styles from "@/components/CardGrid.module.css";
import es from "@/app/explore/page.module.css";

function BillTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #d0d3d9",
      padding: "8px 12px",
      fontSize: 11,
      fontFamily: "var(--font-mono), monospace",
      color: "#131722",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}>
      <div style={{ color: "#8a8e96", marginBottom: 4, fontSize: 10 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
        <span style={{ width: 3, height: 12, background: "#2563eb", display: "inline-block" }} />
        <span style={{ color: "#4a4e57" }}>Balance</span>
        <span style={{ color: "#131722", fontWeight: 600, marginLeft: "auto" }}>
          ${Number(data.balance).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </span>
      </div>
      {data.bills?.map((b, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
          <span style={{ width: 3, height: 12, background: "#c41e1e", display: "inline-block" }} />
          <span style={{ color: "#4a4e57" }}>{b.name}</span>
          <span style={{ color: "#c41e1e", fontWeight: 600, marginLeft: "auto" }}>
            -${Number(b.amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CashFlowTab({ cashflow }) {
  if (!cashflow.length) return <p className="loading">No cash flow data</p>;

  const { cfMin, cfMax, cfChange, cfAvgDaily, daysNegative, daysBelow1k, weeks } = useMemo(() => {
    const min = Math.min(...cashflow.map((d) => d.balance));
    const max = Math.max(...cashflow.map((d) => d.balance));
    const change = cashflow[cashflow.length - 1].balance - cashflow[0].balance;
    const avgDaily = cashflow.length > 1 ? change / (cashflow.length - 1) : 0;
    const negative = cashflow.filter((d) => d.balance < 0).length;
    const below1k = cashflow.filter((d) => d.balance < 1000).length;

    const wks = [];
    for (let i = 0; i < cashflow.length; i += 7) {
      const chunk = cashflow.slice(i, i + 7);
      const wStart = chunk[0].balance;
      const wEnd = chunk[chunk.length - 1].balance;
      const wLow = Math.min(...chunk.map((d) => d.balance));
      const wChange = wEnd - wStart;
      wks.push({ label: `Week ${wks.length + 1}`, start: wStart, end: wEnd, low: wLow, change: wChange });
    }

    return { cfMin: min, cfMax: max, cfChange: change, cfAvgDaily: avgDaily, daysNegative: negative, daysBelow1k: below1k, weeks: wks };
  }, [cashflow]);

  const chartData = useMemo(() => cashflow.map((d) => {
    const [, m, day] = d.date.split("-");
    return { label: `${parseInt(m)}/${parseInt(day)}`, balance: d.balance, bills: d.bills || [] };
  }), [cashflow]);

  const hasBills = chartData.some((d) => d.bills.length > 0);

  const billDotRenderer = useCallback((props) => {
    const { cx, cy, payload } = props;
    if (!payload.bills?.length) return null;
    return <circle cx={cx} cy={cy} r={4} fill="#c41e1e" stroke="#fff" strokeWidth={1.5} />;
  }, []);

  return (
    <>
      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Starting Balance</h2>
          <p className="big-number">${cashflow[0].balance.toLocaleString()}</p>
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Ending Balance</h2>
          <p className="big-number">${cashflow[cashflow.length - 1].balance.toLocaleString()}</p>
        </div>
        <div className={`${styles.card}${cfMin < 0 ? ` ${styles.danger}` : ""}`}>
          <h2 className={styles.cardTitle}>Lowest Point</h2>
          <p className={`big-number ${cfMin < 0 ? "red" : ""}`}>${cfMin.toLocaleString()}</p>
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Highest Point</h2>
          <p className="big-number">${cfMax.toLocaleString()}</p>
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Net Change</h2>
          <p className={`big-number ${cfChange < 0 ? "red" : ""}`}>
            {cfChange >= 0 ? "+" : ""}${cfChange.toLocaleString()}
          </p>
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Avg Daily</h2>
          <p className={`big-number ${cfAvgDaily < 0 ? "red" : ""}`}>
            {cfAvgDaily >= 0 ? "+" : ""}${cfAvgDaily.toFixed(2)}
          </p>
        </div>
      </div>

      {(daysNegative > 0 || daysBelow1k > 0) && (
        <div className={styles.grid}>
          {daysNegative > 0 && (
            <div className={`${styles.card} ${styles.danger}`}>
              <h2 className={styles.cardTitle}>Days Negative</h2>
              <p className="big-number">{daysNegative} of {cashflow.length}</p>
            </div>
          )}
          {daysBelow1k > 0 && (
            <div className={`${styles.card} ${styles.danger}`}>
              <h2 className={styles.cardTitle}>Days Below $1k</h2>
              <p className="big-number">{daysBelow1k} of {cashflow.length}</p>
            </div>
          )}
        </div>
      )}

      <div className={es.chartContainer}>
        <h2 className={es.chartTitle}>Daily Liquid Balance</h2>
        <GradientArea
          data={chartData}
          dataKey="balance" height={400} color="#2563eb"
          referenceLine={1000} referenceLabel="$1k Floor"
          xLabel="Date" yLabel="Balance"
          xInterval={13}
          dotRenderer={billDotRenderer}
          tooltipContent={hasBills ? <BillTooltip /> : undefined}
        />
      </div>

      <div className={es.chartContainer}>
        <h2 className={es.chartTitle}>Weekly Summary</h2>
        <DataTable>
          <thead>
            <tr><th>Week</th><th>Start</th><th>End</th><th>Low</th><th>Change</th></tr>
          </thead>
          <tbody>
            {weeks.map((w, i) => (
              <tr key={i}>
                <td>{w.label}</td>
                <td>${w.start.toLocaleString()}</td>
                <td>${w.end.toLocaleString()}</td>
                <td className={w.low < 0 ? tableStyles.red : ""}>${w.low.toLocaleString()}</td>
                <td style={{ color: w.change >= 0 ? "var(--green)" : "var(--red)" }}>
                  {w.change >= 0 ? "+" : ""}${w.change.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    </>
  );
}
