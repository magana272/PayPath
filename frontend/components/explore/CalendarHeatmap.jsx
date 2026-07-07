"use client";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function cellColor(net, maxAbs) {
  if (!net) return "#e3e5ea";
  const t = Math.min(Math.abs(net) / (maxAbs || 1), 1);
  const alpha = 0.25 + 0.75 * t;
  return net > 0 ? `rgba(26,138,90,${alpha})` : `rgba(196,30,30,${alpha})`;
}

export default function CalendarHeatmap({ year, map }) {
  const first = new Date(year, 0, 1);
  const firstWeekday = (first.getDay() + 6) % 7;
  const totalDays = Math.round((new Date(year, 11, 31) - first) / 86400000) + 1;

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  let maxAbs = 0;
  for (let d = 0; d < totalDays; d++) {
    const date = new Date(year, 0, 1 + d);
    const key = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const net = map[key] || 0;
    if (Math.abs(net) > maxAbs) maxAbs = Math.abs(net);
    cells.push({ key, net, month: date.getMonth() });
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  let shownMonth = -1;
  const weekLabels = weeks.map((week) => {
    const firstReal = week.find((c) => c);
    if (firstReal && firstReal.month !== shownMonth) {
      shownMonth = firstReal.month;
      return MONTH_LABELS[firstReal.month];
    }
    return "";
  });

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div style={{ display: "flex", gap: 3, minWidth: "min-content" }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ height: 10, fontSize: 8, fontFamily: "var(--font-mono), monospace", color: "#8a8e96" }}>
              {weekLabels[wi]}
            </span>
            {Array.from({ length: 7 }, (_, di) => {
              const cell = week[di];
              if (!cell) return <div key={di} style={{ width: 12, height: 12 }} />;
              return (
                <div
                  key={di}
                  title={`${cell.key}: ${cell.net >= 0 ? "+" : "-"}$${Math.abs(Math.round(cell.net)).toLocaleString()}`}
                  style={{ width: 12, height: 12, background: cellColor(cell.net, maxAbs), borderRadius: 2 }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
