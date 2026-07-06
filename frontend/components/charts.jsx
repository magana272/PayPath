"use client";

import { memo } from "react";
import {
  ResponsiveContainer,
  AreaChart, Area, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, Label,
} from "recharts";

const COLORS = [
  "#1a8a5a", "#c41e1e", "#2563eb", "#e67e22", "#8b5cf6",
  "#0891b2", "#d946ef", "#ca8a04", "#111111",
];

const axisStyle = {
  fontSize: 10,
  fontFamily: "var(--font-mono), monospace",
  fill: "#8a8e96",
};

const gridStyle = { stroke: "#e3e5ea", strokeDasharray: "none" };

const labelStyle = {
  fontSize: 9,
  fontFamily: "var(--font-mono), monospace",
  fill: "#8a8e96",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

function ChartTooltip({ active, payload, label, prefix = "$", formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #d0d3d9",
      padding: "8px 12px",
      fontSize: 11,
      fontFamily: "var(--font-mono), monospace",
      color: "#131722",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}>
      <div style={{ color: "#8a8e96", marginBottom: 4, fontSize: 10 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
          <span style={{ width: 3, height: 12, background: p.color, display: "inline-block" }} />
          <span style={{ color: "#4a4e57" }}>{p.name}</span>
          <span style={{ color: "#131722", fontWeight: 600, marginLeft: "auto" }}>
            {formatter ? formatter(p.value) : `${prefix}${Number(p.value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
          </span>
        </div>
      ))}
    </div>
  );
}

export const GradientArea = memo(function GradientArea({ data, dataKey, xKey = "label", height = 300, color = COLORS[0], referenceLine, referenceLabel, xLabel, yLabel, xInterval, dotRenderer, tooltipContent, noFill }) {
  const gradientId = `grad-${dataKey}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: xLabel ? 24 : 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridStyle} />
        <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={{ stroke: "#d0d3d9" }} interval={xInterval}>
          {xLabel && <Label value={xLabel} position="insideBottom" offset={-16} style={labelStyle} />}
        </XAxis>
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`}>
          {yLabel && <Label value={yLabel} angle={-90} position="insideLeft" offset={4} style={labelStyle} />}
        </YAxis>
        <Tooltip content={tooltipContent || <ChartTooltip />} />
        {referenceLine != null && (
          <ReferenceLine y={referenceLine} stroke="#f23645" strokeDasharray="4 3" strokeWidth={1} label={{ value: referenceLabel, fill: "#f23645", fontSize: 10, fontFamily: "var(--font-mono)" }} />
        )}
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} fill={noFill ? "none" : `url(#${gradientId})`} dot={dotRenderer || false} activeDot={{ r: 3, fill: color, stroke: "#fff", strokeWidth: 1 }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
});

export const StackedArea = memo(function StackedArea({ data, keys, xKey = "month", height = 400, xLabel, yLabel, lines, dualAxis, rightYLabel }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 24, right: dualAxis ? 12 : 12, left: 4, bottom: xLabel ? 24 : 4 }}>
        <defs>
          {keys.map((key, i) => (
            <linearGradient key={key} id={`stack-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.2} />
              <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...gridStyle} />
        <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={{ stroke: "#d0d3d9" }}>
          {xLabel && <Label value={xLabel} position="insideBottom" offset={-16} style={labelStyle} />}
        </XAxis>
        <YAxis yAxisId={dualAxis ? "left" : undefined} tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`}>
          {yLabel && <Label value={yLabel} angle={-90} position="insideLeft" offset={4} style={labelStyle} />}
        </YAxis>
        {dualAxis && (
          <YAxis yAxisId="right" orientation="right" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`}>
            {rightYLabel && <Label value={rightYLabel} angle={90} position="insideRight" offset={4} style={labelStyle} />}
          </YAxis>
        )}
        <Tooltip content={<ChartTooltip />} />
        <Legend verticalAlign="top" iconType="line" iconSize={12} wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#8a8e96", paddingBottom: 8 }} />
        {keys.map((key, i) => (
          <Area key={key} yAxisId={dualAxis ? "left" : undefined} type="linear" dataKey={key} stackId="1" stroke={COLORS[i % COLORS.length]} strokeWidth={1} fill={`url(#stack-${i})`} dot={false} isAnimationActive={false} />
        ))}
        {lines?.map((l) => (
          <Line key={l.dataKey} yAxisId={dualAxis ? "right" : undefined} type="linear" dataKey={l.dataKey} name={l.name} stroke={l.color} strokeWidth={l.width || 2} dot={false} isAnimationActive={false} strokeDasharray={l.dashed ? "6 3" : undefined} legendType="none" />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
});

export const VerticalBar = memo(function VerticalBar({ data, bars, height = 300, xKey = "label", xLabel, yLabel, stacked }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: xLabel ? 24 : 4 }} barGap={2}>
        <CartesianGrid {...gridStyle} vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={{ stroke: "#d0d3d9" }}>
          {xLabel && <Label value={xLabel} position="insideBottom" offset={-16} style={labelStyle} />}
        </XAxis>
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`}>
          {yLabel && <Label value={yLabel} angle={-90} position="insideLeft" offset={4} style={labelStyle} />}
        </YAxis>
        <Tooltip content={<ChartTooltip />} />
        {bars.length > 1 && <Legend iconType="line" iconSize={12} wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#8a8e96", paddingTop: 8 }} />}
        {bars.map((b, i) => (
          <Bar key={b.dataKey} dataKey={b.dataKey} name={b.name || b.dataKey} fill={b.color || COLORS[i]} radius={0} maxBarSize={40} stackId={stacked ? "a" : undefined} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
});

export const DonutChart = memo(function DonutChart({ data, height = 300, valueKey = "value", nameKey = "name" }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} cx="50%" cy="50%" innerRadius="50%" outerRadius="78%" paddingAngle={1} strokeWidth={0}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="line" iconSize={12} wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#8a8e96" }} />
      </PieChart>
    </ResponsiveContainer>
  );
});

export function RadialProgress({ value, max, label, color = COLORS[0], size = 80 }) {
  const pct = Math.min(Math.abs(value) / max, 1);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const center = size / 2;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#e3e5ea" strokeWidth={3} />
        <circle cx={center} cy={center} r={radius} fill="none" stroke={color} strokeWidth={3} strokeLinecap="butt" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      {label && <span style={{ fontSize: 9, color: "#8a8e96", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>}
    </div>
  );
}

export { COLORS };
