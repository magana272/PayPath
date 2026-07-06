"use client";

import cardStyles from "@/components/CardGrid.module.css";
import ds from "@/app/page.module.css";
import sk from "./Skeleton.module.css";

function Bone({ width = "60%", height = 12 }) {
  return <div className={sk.bone} style={{ width, height }} />;
}

export function SummaryCardsSkeleton() {
  return (
    <div className={cardStyles.grid}>
      {[100, 90, 110, 70, 85, 80].map((w, i) => (
        <div key={i} className={cardStyles.card}>
          <Bone width={75} height={9} />
          <div style={{ marginTop: 8 }}>
            <Bone width={w} height={22} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSectionSkeleton({ rows = 3, label = 120 }) {
  return (
    <div className={ds.section}>
      <div className={ds.sectionHeader}>
        <span><Bone width={label} height={10} /></span>
        <span><Bone width={55} height={10} /></span>
      </div>
      <div className={ds.list}>
        {[65, 45, 55, 50, 60].slice(0, rows).map((w, i) => (
          <div key={i} className={ds.listItem}>
            <Bone width={`${w}%`} height={12} />
            <Bone width={70} height={12} />
          </div>
        ))}
        <div className={`${ds.listItem} ${ds.listTotal}`}>
          <Bone width={60} height={12} />
          <Bone width={80} height={12} />
        </div>
      </div>
    </div>
  );
}

export function DebtsSectionSkeleton() {
  return (
    <div className={ds.section}>
      <div className={ds.sectionHeader}>
        <span><Bone width={45} height={10} /></span>
        <span><Bone width={55} height={10} /></span>
      </div>
      <div className={cardStyles.grid} style={{ marginBottom: 6 }}>
        {[90, 65, 105, 50].map((w, i) => (
          <div key={i} className={cardStyles.card}>
            <Bone width={85} height={9} />
            <div style={{ marginTop: 8 }}>
              <Bone width={w} height={22} />
            </div>
          </div>
        ))}
      </div>
      <div className={ds.list}>
        {[70, 55, 60, 50, 65].map((w, i) => (
          <div key={i} className={ds.listItem}>
            <Bone width={`${w}%`} height={12} />
            <Bone width={70} height={12} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <>
      <div className={cardStyles.grid}>
        {[90, 80, 95].map((w, i) => (
          <div key={i} className={cardStyles.card}>
            <Bone width={110} height={9} />
            <div style={{ marginTop: 8 }}>
              <Bone width={w} height={22} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, margin: "20px 0 16px" }}>
        <Bone width={24} height={24} />
        <Bone width={140} height={18} />
        <Bone width={24} height={24} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={`h${i}`} style={{ textAlign: "center", padding: "6px 0" }}>
            <Bone width={24} height={10} />
          </div>
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} style={{ padding: 8, minHeight: 64 }}>
            <Bone width={18} height={14} />
            {i % 5 === 1 && <div style={{ marginTop: 6 }}><Bone width="80%" height={10} /></div>}
            {i % 7 === 3 && <div style={{ marginTop: 6 }}><Bone width="60%" height={10} /></div>}
          </div>
        ))}
      </div>
    </>
  );
}

export function TabContentSkeleton() {
  return (
    <div style={{ padding: "16px 0" }}>
      <div className={cardStyles.grid}>
        {[100, 80, 90, 70].map((w, i) => (
          <div key={i} className={cardStyles.card}>
            <Bone width={85} height={9} />
            <div style={{ marginTop: 8 }}>
              <Bone width={w} height={22} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <Bone width="100%" height={180} />
      </div>
      <div className={ds.list} style={{ marginTop: 16 }}>
        {[60, 50, 65].map((w, i) => (
          <div key={i} className={ds.listItem}>
            <Bone width={`${w}%`} height={12} />
            <Bone width={70} height={12} />
          </div>
        ))}
      </div>
    </div>
  );
}
