"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  Suspense,
  lazy,
} from "react";

import { api } from "@/lib/api";
import { cache } from "@/lib/cache";
import TabBar from "@/components/TabBar";
import { TabContentSkeleton } from "@/components/Skeleton";
import es from "./page.module.css";

const DebtPayoffTab = lazy(() =>
  import("@/components/explore/DebtPayoffTab")
);

const CashFlowTab = lazy(() =>
  import("@/components/explore/CashFlowTab")
);

const PayBreakdownTab = lazy(() =>
  import("@/components/explore/PayBreakdownTab")
);

const TaxBreakdownTab = lazy(() =>
  import("@/components/explore/TaxBreakdownTab")
);

const AIInsightsTab = lazy(() =>
  import("@/components/explore/AIInsightsTab")
);

const TrendsTab = lazy(() =>
  import("@/components/explore/TrendsTab")
);

const TABS = [
  { id: "payoff", label: "Debt Payoff Plan" },
  { id: "cashflow", label: "Cash Flow (90 Days)" },
  { id: "pay", label: "Pay Breakdown" },
  { id: "tax", label: "Tax Breakdown" },
  { id: "trends", label: "Trends" },
  { id: "ai", label: "PayPath AI" },
];

function TabPanel({ active, children }) {
  return (
    <div className={active ? es.tabFadeIn : undefined} style={active ? undefined : { display: "none" }}>
      {children}
    </div>
  );
}

function LoadingFallback() {
  return <TabContentSkeleton />;
}

export default function Explore() {
  const [tab, setTab] = useState("payoff");
  const [summary, setSummary] = useState(() => cache.get("summary"));
  const [payoff, setPayoff] = useState(() => cache.get("payoff"));
  const [scenarios, setScenarios] = useState(() => cache.get("scenarios") || []);
  const [debts, setDebts] = useState(() => cache.get("debts") || []);
  const [cashflow, setCashflow] = useState(() => cache.get("cashflow-90"));
  const [jobs, setJobs] = useState(() => cache.get("income"));
  const [extraPayment, setExtraPayment] = useState(0);
  const [stickyOffset, setStickyOffset] = useState(0);

  const loaded = useRef({});
  const headerRef = useRef(null);
  const [visited, setVisited] = useState({ payoff: true });

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const measure = () => {
      const cs = getComputedStyle(el);
      const h  = parseFloat(cs.height) || 0;
      const pt = parseFloat(cs.paddingTop) || 0;
      const pb = parseFloat(cs.paddingBottom) || 0;
      const bt = parseFloat(cs.borderTopWidth) || 0;
      const bb = parseFloat(cs.borderBottomWidth) || 0;
      setStickyOffset(Math.ceil(bt + pt + h + pb + bb));
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el, { box: "border-box" });
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  const loadData = useCallback(() => {
    api.getSummary().then(setSummary);
    api.getPayoff().then(setPayoff);
    api.getScenarios().then(setScenarios);
    api.getDebts().then(setDebts);
    api.getCashflow(90).then(setCashflow);
    loaded.current.payoff = true;
    loaded.current.cashflow = true;
  }, []);

  useEffect(loadData, [loadData]);

  useEffect(() => {
    window.addEventListener("paypath:refresh", loadData);
    return () => window.removeEventListener("paypath:refresh", loadData);
  }, [loadData]);

  useEffect(() => {
    setVisited((v) => ({ ...v, [tab]: true }));

    if ((tab === "pay" || tab === "tax") && !loaded.current.jobs) {
      loaded.current.jobs = true;
      api.getIncome().then(setJobs);
    }
  }, [tab]);

  const payBreakdown = useMemo(() => (jobs || []).map((j) => {
    const regular = Math.min(j.hour_per_day, 8);
    const ot = Math.max(j.hour_per_day - 8, 0);
    const dailyGross = regular * j.pay_per_hour + ot * j.pay_per_hour * 1.5;
    return {
      name: j.job,
      daily: Math.round(dailyGross),
      weekly: Math.round(dailyGross * 4),
      monthly: Math.round((dailyGross * 4 * 52) / 12),
    };
  }), [jobs]);

  return (
    <div className="page">
      <h1>Explore</h1>

      <div className={es.stickyHeader} ref={headerRef}>
        <TabBar
          tabs={TABS}
          activeTab={tab}
          onTabChange={(t) => { setTab(t); window.scrollTo(0, 0); }}
          className={es.tabsMargin}
        />
      </div>

      <TabPanel active={tab === "payoff"}>
        <Suspense fallback={<LoadingFallback />}>
          {payoff ? (
            <DebtPayoffTab
              payoff={payoff}
              scenarios={scenarios}
              debts={debts}
              extraPayment={extraPayment}
              onExtraPaymentChange={setExtraPayment}
              stickyOffset={stickyOffset}
              active={tab === "payoff"}
            />
          ) : (
            <LoadingFallback />
          )}
        </Suspense>
      </TabPanel>

      {visited.cashflow && (
        <TabPanel active={tab === "cashflow"}>
          <Suspense fallback={<LoadingFallback />}>
            {cashflow ? (
              <CashFlowTab cashflow={cashflow} />
            ) : (
              <LoadingFallback />
            )}
          </Suspense>
        </TabPanel>
      )}

      {visited.pay && (
        <TabPanel active={tab === "pay"}>
          <Suspense fallback={<LoadingFallback />}>
            {jobs && summary ? (
              <PayBreakdownTab
                summary={summary}
                jobs={jobs}
                payBreakdown={payBreakdown}
              />
            ) : (
              <LoadingFallback />
            )}
          </Suspense>
        </TabPanel>
      )}

      {visited.tax && (
        <TabPanel active={tab === "tax"}>
          <Suspense fallback={<LoadingFallback />}>
            {summary ? (
              <TaxBreakdownTab summary={summary} />
            ) : (
              <LoadingFallback />
            )}
          </Suspense>
        </TabPanel>
      )}

      {visited.trends && (
        <TabPanel active={tab === "trends"}>
          <Suspense fallback={<LoadingFallback />}>
            <TrendsTab debts={debts} />
          </Suspense>
        </TabPanel>
      )}

      {visited.ai && (
        <TabPanel active={tab === "ai"}>
          <Suspense fallback={<LoadingFallback />}>
            <AIInsightsTab />
          </Suspense>
        </TabPanel>
      )}
    </div>
  );
}
