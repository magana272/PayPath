"use client";

import styles from "@/components/CardGrid.module.css";

const money = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = (n) => `${n < 0 ? "-" : ""}$${money(Math.abs(n))}`;

export default function PaydayHero({ summary }) {
  const np = summary?.next_payday;
  if (!np) return null;

  const [y, m, d] = np.date.split("-").map(Number);
  const dateText = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const daysText = np.days_until === 0 ? "today" : np.days_until === 1 ? "tomorrow" : `in ${np.days_until} days`;
  const leaves = summary.total_liquid - np.bills_due;

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>In Your Accounts</h2>
        <p className="big-number">${money(summary.total_liquid)}</p>
      </div>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Next Payday · {dateText}</h2>
        <p className="big-number green">+${money(np.amount)}</p>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>
          {daysText}{np.label ? ` · ${np.label}` : ""} · per paycheck
        </span>
      </div>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Bills Before Payday: ${money(np.bills_due)}</h2>
        <p className={`big-number ${leaves < 0 ? "red" : "green"}`}>{signed(leaves)}</p>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono), monospace" }}>
          left to spend until payday
        </span>
      </div>
    </div>
  );
}
