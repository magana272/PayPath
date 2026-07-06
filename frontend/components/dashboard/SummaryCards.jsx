"use client";

import styles from "@/components/CardGrid.module.css";

export default function SummaryCards({ summary }) {
  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Monthly Gross</h2>
        <p className="big-number green">${summary.monthly_gross.toLocaleString()}</p>
      </div>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Monthly Net</h2>
        <p className="big-number green">${summary.taxes.monthly_net.toLocaleString()}</p>
      </div>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Monthly Expenses</h2>
        <p className="big-number red">${summary.monthly_expenses.toLocaleString()}</p>
      </div>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Surplus</h2>
        <p className={`big-number ${summary.monthly_surplus >= 0 ? "green" : "red"}`}>${summary.monthly_surplus.toLocaleString()}</p>
      </div>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Total Debt</h2>
        <p className="big-number red">${summary.total_debt.toLocaleString()}</p>
      </div>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Net Worth</h2>
        <p className={`big-number ${summary.net_worth >= 0 ? "green" : "red"}`}>${summary.net_worth.toLocaleString()}</p>
      </div>
    </div>
  );
}
