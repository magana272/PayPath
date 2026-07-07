"use client";

import Link from "next/link";
import ds from "@/app/page.module.css";

export default function LiquidSection({ liquid }) {
  const total = liquid.reduce((s, l) => s + l.balance, 0);

  return (
    <div className={ds.section}>
      <div className={ds.sectionHeader}>
        <span>Liquid Accounts</span>
        <Link href="/settings" className={ds.manageLink} aria-label="Manage liquid accounts">Manage →</Link>
      </div>
      <div className={ds.list}>
        {liquid.map((l) => (
          <div key={l.id} className={ds.listItem}>
            <span>{l.bank}</span>
            <span className={ds.listValue}>${l.balance.toLocaleString()}</span>
          </div>
        ))}
        <div className={`${ds.listItem} ${ds.listTotal}`}>
          <span>Total</span>
          <span className={ds.listValue}>${total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
