"use client";

import { useMemo } from "react";
import { DonutChart, RadialProgress, COLORS } from "@/components/charts";
import DataTable, { tableStyles } from "@/components/DataTable";
import styles from "@/components/CardGrid.module.css";
import es from "@/app/explore/page.module.css";

export default function TaxBreakdownTab({ summary }) {
  const effectiveTaxRate = (summary.taxes.total_tax / summary.taxes.annual_gross) * 100;

  const taxDistData = useMemo(
    () => summary.tax_breakdown.map((t) => ({ name: t.name, value: t.value })),
    [summary.tax_breakdown]
  );

  const interestData = useMemo(
    () => summary.interest_by_account.map((d) => ({ name: d.name, value: d.monthly_interest })),
    [summary.interest_by_account]
  );

  return (
    <>
      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Annual Gross</h2>
          <p className="big-number">${summary.taxes.annual_gross.toLocaleString()}</p>
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Annual Net</h2>
          <p className="big-number">${summary.taxes.annual_net.toLocaleString()}</p>
        </div>
        <div className={styles.card} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <h2 className={styles.cardTitle}>Effective Rate</h2>
            <p className="big-number">{effectiveTaxRate.toFixed(1)}%</p>
          </div>
          <RadialProgress value={effectiveTaxRate} max={50} color="#111111" size={48} />
        </div>
      </div>

      <div className={es.chartRow}>
        <div className={es.chartContainer}>
          <h2 className={es.chartTitle}>Tax Distribution (Annual)</h2>
          <DonutChart data={taxDistData} height={280} />
        </div>
        <div className={es.chartContainer}>
          <h2 className={es.chartTitle}>Interest by Account</h2>
          <DonutChart data={interestData} height={280} />
        </div>
      </div>

      <div className={es.chartContainer}>
        <h2 className={es.chartTitle}>Interest Cost Detail</h2>
        <DataTable>
          <thead>
            <tr><th>Account</th><th>APR</th><th>Monthly</th><th>Daily</th><th>Annual</th></tr>
          </thead>
          <tbody>
            {summary.interest_by_account.map((d, i) => (
              <tr key={d.name}>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span className={es.colorDot} style={{ background: COLORS[i % COLORS.length] }} />
                    {d.name}
                  </span>
                </td>
                <td>{d.apr}%</td>
                <td className={tableStyles.red}>${d.monthly_interest.toLocaleString()}</td>
                <td>${(d.monthly_interest / 30).toFixed(2)}</td>
                <td>${(d.monthly_interest * 12).toFixed(2)}</td>
              </tr>
            ))}
            <tr className={es.trTotal}>
              <td>Total</td>
              <td></td>
              <td className={tableStyles.red}>${summary.monthly_interest.toLocaleString()}</td>
              <td>${summary.daily_interest.toLocaleString()}</td>
              <td>${(summary.monthly_interest * 12).toFixed(2)}</td>
            </tr>
          </tbody>
        </DataTable>
      </div>
    </>
  );
}
