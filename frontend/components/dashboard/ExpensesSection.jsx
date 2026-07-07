"use client";

import { useState } from "react";
import Link from "next/link";
import { FREQ_MULT } from "@/lib/constants";
import ds from "@/app/page.module.css";

export default function ExpensesSection({ expenses }) {
  const [expanded, setExpanded] = useState(false);
  const totalExpenses = expenses.reduce((sum, e) => {
    return sum + e.cost * (FREQ_MULT[e.frequency] || 1);
  }, 0);

  const visible = expanded ? expenses : expenses.slice(0, 5);

  return (
    <div className={ds.section}>
      <div className={ds.sectionHeader}>
        <span>Expenses</span>
        <Link href="/settings?tab=expenses" className={ds.manageLink} aria-label="Manage expenses">Manage →</Link>
      </div>
      <div className={ds.list}>
        {visible.map((e) => (
          <div key={e.id} className={ds.listItem}>
            <span>{e.expense}</span>
            <span className={ds.listValue}>${e.cost.toFixed(2)}<span className={ds.freq}>/{e.frequency}</span></span>
          </div>
        ))}
        {expenses.length > 5 && (
          <div className={ds.listItem}>
            <button className={ds.expandBtn} onClick={() => setExpanded(!expanded)}>
              {expanded ? "Show Less" : `Show All (${expenses.length})`}
            </button>
          </div>
        )}
        <div className={`${ds.listItem} ${ds.listTotal}`}>
          <span>Monthly Total</span>
          <span className={ds.listValue}>${totalExpenses.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
