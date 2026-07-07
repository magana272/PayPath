"use client";

export default function PaydayWaterfall({ steps }) {
  if (!steps?.length) return null;
  const max = Math.max(steps[0].value, 1);

  let running = 0;
  const rows = steps.map((s) => {
    let start, end, color;
    if (s.type === "income") {
      start = 0; end = s.value; running = s.value; color = "rgba(26,138,90,0.85)";
    } else if (s.type === "net") {
      start = 0; end = s.value; color = "rgba(37,99,235,0.85)";
    } else {
      end = running; running += s.value; start = running; color = "rgba(196,30,30,0.85)";
    }
    const lo = Math.max(Math.min(start, end), 0);
    const hi = Math.max(Math.max(start, end), 0);
    return {
      name: s.name,
      value: s.value,
      left: (lo / max) * 100,
      width: Math.max(((hi - lo) / max) * 100, 0.5),
      color,
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono), monospace", fontSize: 11 }}>
          <span style={{ width: 130, textAlign: "right", color: "#4a4e57", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
          <div style={{ position: "relative", flex: 1, height: 18, background: "#f4f5f7" }}>
            <div style={{ position: "absolute", left: `${r.left}%`, width: `${r.width}%`, top: 0, bottom: 0, background: r.color }} />
          </div>
          <span style={{ width: 84, textAlign: "right", color: r.value >= 0 ? "#1a8a5a" : "#c41e1e" }}>
            {r.value >= 0 ? "+" : "-"}${Math.abs(r.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
