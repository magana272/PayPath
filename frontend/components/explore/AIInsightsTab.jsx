"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { RadialProgress } from "@/components/charts";
import ai from "./AIInsightsTab.module.css";

const TOPICS = [
  { label: "Debt Payoff Strategy", key: "debt-payoff-strategy", fetcher: () => api.getAIDebtPayoff() },
  { label: "Savings Plan", key: "savings-plan", fetcher: () => api.getAISavingsPlan() },
  { label: "Expense Audit", key: "expense-audit", fetcher: () => api.getAIExpenseAudit() },
  { label: "Income Boost", key: "income-boost", fetcher: () => api.getAIIncomeBoost() },
];

function ChatBox() {
  const [results, setResults] = useState({});
  const [activeKey, setActiveKey] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTopic = async (topic) => {
    if (results[topic.key]) {
      setActiveKey(topic.key);
      return;
    }
    setActiveKey(topic.key);
    setLoading(true);
    try {
      const res = await topic.fetcher();
      setResults((prev) => ({ ...prev, [topic.key]: res }));
    } catch {
      setResults((prev) => ({ ...prev, [topic.key]: { error: "Could not load. Please try again." } }));
    } finally {
      setLoading(false);
    }
  };

  const active = activeKey ? results[activeKey] : null;

  return (
    <div className={ai.chatBox}>
      <div className={ai.chatMessages}>
        {!activeKey && (
          <p className={ai.chatEmpty}>Select a topic to get personalized financial advice.</p>
        )}
        {activeKey && loading && (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div className={ai.loading} style={{ justifyContent: "center" }}>
              <span className={ai.dot} /><span className={ai.dot} /><span className={ai.dot} />
            </div>
            <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>Analyzing...</p>
          </div>
        )}
        {active && !loading && active.error && (
          <p style={{ padding: 20, color: "var(--red)", fontFamily: "var(--font-sans), sans-serif", fontSize: 13 }}>{active.error}</p>
        )}
        {active && !loading && !active.error && (
          <div style={{ padding: 16 }}>
            <div className={ai.sectionLabel} style={{ marginBottom: 12 }}>{TOPICS.find((t) => t.key === activeKey)?.label}</div>
            <p className={ai.sectionText}>{active.summary || active.overview}</p>
            {active.items?.length > 0 && (
              <ul className={ai.list} style={{ marginTop: 12 }}>
                {active.items.map((item, i) => <li key={i}>{typeof item === "string" ? item : item.detail || item.title}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
      <div className={ai.promptButtons}>
        {TOPICS.map((t) => (
          <button
            key={t.key}
            className={`${ai.promptBtn}${activeKey === t.key ? ` ${ai.promptBtnActive}` : ""}`}
            onClick={() => fetchTopic(t)}
            disabled={loading}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AIInsightsTab() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("chat");

  const loadAI = () => {
    setLoading(true);
    setError(null);
    api.getAIInsights()
      .then(setInsights)
      .catch(() => setError("Could not load AI insights. Make sure the backend endpoint is available."))
      .finally(() => setLoading(false));
  };

  return (
    <>
      <div className={ai.subTabs} role="tablist">
        <button className={`${ai.subTab} ${tab === "chat" ? ai.subTabActive : ""}`} onClick={() => setTab("chat")} role="tab" aria-selected={tab === "chat"} tabIndex={tab === "chat" ? 0 : -1}>Chat</button>
        <button className={`${ai.subTab} ${tab === "insights" ? ai.subTabActive : ""}`} onClick={() => setTab("insights")} role="tab" aria-selected={tab === "insights"} tabIndex={tab === "insights" ? 0 : -1}>Insights</button>
      </div>

      {tab === "chat" && <ChatBox />}

      {tab === "insights" && (
        <>
          {!insights && !loading && !error && (
            <div className={ai.promptCard}>
              <p>Get a personalized financial analysis with actionable advice based on your current income, expenses, and debt profile.</p>
              <button className={ai.btn} onClick={loadAI}>Generate Insights</button>
            </div>
          )}

          {loading && (
            <div className={ai.promptCard}>
              <div className={ai.loading}>
                <span className={ai.dot} /><span className={ai.dot} /><span className={ai.dot} />
              </div>
              <p>Analyzing your financial data...</p>
            </div>
          )}

          {error && (
            <div className={ai.promptCard} style={{ borderLeftColor: "var(--red)" }}>
              <p style={{ color: "var(--red)" }}>{error}</p>
              <button className={ai.btn} onClick={loadAI}>Retry</button>
            </div>
          )}

          {insights && !loading && !error && (
            <div className={ai.results}>
              <div className={ai.section}>
                <div className={ai.sectionLabel}>Overview</div>
                <p className={ai.sectionText}>{insights.overview}</p>
              </div>

              <div className={ai.section}>
                <div className={ai.sectionLabel}>Health Score</div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <RadialProgress
                    value={insights.health_score} max={100}
                    color={insights.health_score >= 70 ? "#1a8a5a" : insights.health_score >= 40 ? "#cc7a00" : "#c41e1e"}
                    size={64}
                  />
                  <div>
                    <span className="big-number">{insights.health_score}</span>
                    <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>/100</span>
                  </div>
                </div>
              </div>

              {insights.strengths?.length > 0 && (
                <div className={ai.section}>
                  <div className={ai.sectionLabel}>Strengths</div>
                  <ul className={`${ai.list} ${ai.positive}`}>
                    {insights.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              {insights.warnings?.length > 0 && (
                <div className={ai.section}>
                  <div className={ai.sectionLabel}>Warnings</div>
                  <ul className={`${ai.list} ${ai.negative}`}>
                    {insights.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              {insights.advice?.length > 0 && (
                <div className={ai.section}>
                  <div className={ai.sectionLabel}>Advice</div>
                  <ol className={ai.advice}>
                    {insights.advice.map((a, i) => (
                      <li key={i}>
                        <strong>{a.title}</strong>
                        <p>{a.detail}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {insights.resources?.length > 0 && (
                <div className={ai.section}>
                  <div className={ai.sectionLabel}>Resources</div>
                  <ul className={ai.resources}>
                    {insights.resources.map((r, i) => (
                      <li key={i}>
                        <strong>{r.title}</strong>
                        <span>{r.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button className={ai.btn} onClick={loadAI} style={{ marginTop: 12 }}>Refresh Analysis</button>
            </div>
          )}
        </>
      )}
    </>
  );
}
