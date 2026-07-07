"use client";

import { useMemo } from "react";
import { VerticalBar, DonutChart } from "@/components/charts";
import DataTable from "@/components/DataTable";
import styles from "@/components/CardGrid.module.css";
import es from "@/app/explore/page.module.css";

export default function PayBreakdownTab({ summary, jobs, payBreakdown }) {
  const totalDailyGross = payBreakdown.reduce((s, j) => s + j.daily, 0);
  const totalWeeklyGross = payBreakdown.reduce((s, j) => s + j.weekly, 0);
  const hourlyEffective = summary.taxes.annual_net / (52 * payBreakdown.reduce((s, j) => {
    const job = jobs.find((jj) => jj.job === j.name);
    return s + (job ? job.hour_per_day * (job.days_per_week || 4) : 0);
  }, 0) || 1);
  const savingsRate = summary.monthly_surplus / summary.taxes.monthly_net * 100;

  const earningsBars = useMemo(() => [
    { dataKey: "daily", name: "Daily", color: "#2563eb" },
    { dataKey: "weekly", name: "Weekly", color: "#1a8a5a" },
    { dataKey: "monthly", name: "Monthly", color: "#e67e22" },
  ], []);

  const payGoesData = useMemo(() => [
    { name: "Taxes", value: Math.round(summary.taxes.total_tax / 12) },
    { name: "Expenses", value: Math.round(summary.monthly_expenses) },
    { name: "Surplus", value: Math.max(0, Math.round(summary.monthly_surplus)) },
  ].filter((d) => d.value > 0), [summary.taxes.total_tax, summary.monthly_expenses, summary.monthly_surplus]);

  return (
    <>
      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Monthly Gross</h2>
          <p className="big-number">${summary.monthly_gross.toLocaleString()}</p>
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Monthly Net</h2>
          <p className="big-number">${summary.taxes.monthly_net.toLocaleString()}</p>
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Annual Gross</h2>
          <p className="big-number">${summary.taxes.annual_gross.toLocaleString()}</p>
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Annual Net</h2>
          <p className="big-number">${summary.taxes.annual_net.toLocaleString()}</p>
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Effective $/hr</h2>
          <p className="big-number">${hourlyEffective.toFixed(2)}</p>
        </div>
        <div className={`${styles.card}${savingsRate >= 0 ? ` ${styles.accent}` : ` ${styles.danger}`}`}>
          <h2 className={styles.cardTitle}>Savings Rate</h2>
          <p className={`big-number ${savingsRate < 0 ? "red" : ""}`}>{savingsRate.toFixed(1)}%</p>
        </div>
      </div>

      {payBreakdown.length > 0 ? (
        <>
          <div className={es.chartContainer}>
            <h2 className={es.chartTitle}>Gross Earnings by Period</h2>
            <VerticalBar
              data={payBreakdown} xKey="name"
              bars={earningsBars}
              height={300}
              yLabel="Earnings"
            />
          </div>

          <div className={es.chartContainer}>
            <h2 className={es.chartTitle}>Income Breakdown by Job</h2>
            <DataTable>
              <thead>
                <tr><th>Job</th><th>$/hr</th><th>Hrs/Day</th><th>Daily</th><th>Weekly</th><th>Monthly</th><th>Annual</th></tr>
              </thead>
              <tbody>
                {jobs.map((j, i) => {
                  const b = payBreakdown[i];
                  return (
                    <tr key={j.id}>
                      <td>{j.job}</td>
                      <td>${j.pay_per_hour}</td>
                      <td>{j.hour_per_day}</td>
                      <td>${b.daily.toLocaleString()}</td>
                      <td>${b.weekly.toLocaleString()}</td>
                      <td>${b.monthly.toLocaleString()}</td>
                      <td>${(b.monthly * 12).toLocaleString()}</td>
                    </tr>
                  );
                })}
                <tr className={es.trTotal}>
                  <td>Total</td>
                  <td></td>
                  <td></td>
                  <td>${totalDailyGross.toLocaleString()}</td>
                  <td>${totalWeeklyGross.toLocaleString()}</td>
                  <td>${summary.monthly_gross.toLocaleString()}</td>
                  <td>${summary.taxes.annual_gross.toLocaleString()}</td>
                </tr>
              </tbody>
            </DataTable>
          </div>

          <div className={es.chartContainer}>
            <h2 className={es.chartTitle}>Where Your Pay Goes</h2>
            <DonutChart data={payGoesData} height={280} />
          </div>
        </>
      ) : (
        <p className="loading">No income data</p>
      )}
    </>
  );
}
