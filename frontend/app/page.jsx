"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { IconSettings } from "@/components/Icons";
import { api } from "@/lib/api";
import { cache } from "@/lib/cache";
import SummaryCards from "@/components/dashboard/SummaryCards";
import LiquidSection from "@/components/dashboard/LiquidSection";
import ExpensesSection from "@/components/dashboard/ExpensesSection";
import DebtsSection from "@/components/dashboard/DebtsSection";
import { SummaryCardsSkeleton, ListSectionSkeleton, DebtsSectionSkeleton } from "@/components/Skeleton";
import ds from "./page.module.css";
import sk from "@/components/Skeleton.module.css";

export default function Dashboard() {
  const [jobs, setJobs] = useState(() => cache.get("income") || []);
  const [liquid, setLiquid] = useState(() => cache.get("liquid") || []);
  const [expenses, setExpenses] = useState(() => cache.get("expenses") || []);
  const [debts, setDebts] = useState(() => cache.get("debts") || []);
  const [summary, setSummary] = useState(() => cache.get("summary"));
  const [loaded, setLoaded] = useState(() => ({
    income: cache.get("income") != null,
    liquid: cache.get("liquid") != null,
    expenses: cache.get("expenses") != null,
    debts: cache.get("debts") != null,
    summary: cache.get("summary") != null,
  }));

  const loadData = useCallback(() => {
    api.getIncome().then((d) => { setJobs(d); setLoaded((l) => ({ ...l, income: true })); });
    api.getLiquid().then((d) => { setLiquid(d); setLoaded((l) => ({ ...l, liquid: true })); });
    api.getExpenses().then((d) => { setExpenses(d); setLoaded((l) => ({ ...l, expenses: true })); });
    api.getDebts().then((d) => { setDebts(d); setLoaded((l) => ({ ...l, debts: true })); });
    api.getSummary().then((d) => { setSummary(d); setLoaded((l) => ({ ...l, summary: true })); });
  }, []);

  useEffect(loadData, [loadData]);

  useEffect(() => {
    window.addEventListener("paypath:refresh", loadData);
    return () => window.removeEventListener("paypath:refresh", loadData);
  }, [loadData]);

  return (
    <div className="page">
      <div className={ds.pageHeader}>
        <h1>Dashboard</h1>

        <Link
          href="/settings"
          className={ds.settingsIcon}
          aria-label="Settings"
        >
          <IconSettings />
        </Link>
      </div>

      {!loaded.income ? (
        <div className={ds.occupation}>
          <span className={sk.bone} style={{ display: "inline-block", width: 180, height: 11 }} />
        </div>
      ) : jobs.length > 0 ? (
        <div className={ds.occupation}>
          {jobs.map((j) => j.job).join(" / ")}
        </div>
      ) : null}

      {loaded.summary ? (
        <SummaryCards summary={summary} />
      ) : (
        <SummaryCardsSkeleton />
      )}

      {!loaded.liquid ? (
        <ListSectionSkeleton rows={3} label={110} />
      ) : liquid.length > 0 ? (
        <LiquidSection liquid={liquid} />
      ) : null}

      {!loaded.expenses ? (
        <ListSectionSkeleton rows={5} label={70} />
      ) : expenses.length > 0 ? (
        <ExpensesSection expenses={expenses} />
      ) : null}

      {loaded.summary && loaded.debts ? (
        <DebtsSection debts={debts} summary={summary} />
      ) : (
        <DebtsSectionSkeleton />
      )}
    </div>
  );
}