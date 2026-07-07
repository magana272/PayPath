"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cache } from "@/lib/cache";
import { emitRefresh } from "@/lib/cache";
import { CalendarSkeleton } from "@/components/Skeleton";
import Modal, { modalStyles } from "@/components/Modal";
import DataTable from "@/components/DataTable";
import cs from "@/components/CardGrid.module.css";
import cal from "./page.module.css";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Calendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(() => cache.get(`calendar-${now.getFullYear()}-${now.getMonth() + 1}`));
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayMode, setDayMode] = useState("view");
  const [billForm, setBillForm] = useState({ expense: "", cost: "", frequency: "monthly" });
  const [addingBill, setAddingBill] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ label: "", amount: "" });
  const [addingIncome, setAddingIncome] = useState(false);
  const [activeEvent, setActiveEvent] = useState(null);
  const [eventAction, setEventAction] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [moveDate, setMoveDate] = useState("");
  const [amountValue, setAmountValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);

  const loadCalendar = useCallback(() => {
    const cached = cache.get(`calendar-${year}-${month}`);
    if (cached) setData(cached);
    api.getCalendar(year, month).then(setData);
  }, [year, month]);

  useEffect(loadCalendar, [loadCalendar]);

  useEffect(() => {
    api.getExpenses().then(setExpenses);
    api.getIncome().then(setIncome);
  }, []);

  useEffect(() => {
    const reload = () => {
      loadCalendar();
      api.getExpenses().then(setExpenses);
      api.getIncome().then(setIncome);
    };
    window.addEventListener("paypath:refresh", reload);
    return () => window.removeEventListener("paypath:refresh", reload);
  }, [loadCalendar]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    setSelectedDay(selectedDay === day ? null : day);
    setDayMode("view");
    setBillForm({ expense: "", cost: "", frequency: "monthly" });
    setIncomeForm({ label: "", amount: "" });
  };

  const handleDayKeyDown = (e, day) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleDayClick(day);
    }
  };

  const handleAddBill = async (e) => {
    e.preventDefault();
    setAddingBill(true);
    try {
      await api.addExpense({
        expense: billForm.expense,
        cost: parseFloat(billForm.cost),
        due_date: selectedDay,
        frequency: billForm.frequency,
      });
      setBillForm({ expense: "", cost: "", frequency: "monthly" });
      setSelectedDay(null);
      setDayMode("view");
      loadCalendar();
      emitRefresh();
    } finally {
      setAddingBill(false);
    }
  };

  const handleAddIncome = async (e) => {
    e.preventDefault();
    setAddingIncome(true);
    try {
      const date = `${year}-${String(month).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
      await api.addIncome({
        job: incomeForm.label,
        pay_type: "salary",
        annual_salary: parseFloat(incomeForm.amount),
        pay_frequency: "one-time",
        date,
      });
      setIncomeForm({ label: "", amount: "" });
      setSelectedDay(null);
      setDayMode("view");
      loadCalendar();
      emitRefresh();
    } finally {
      setAddingIncome(false);
    }
  };

  const findSourceItem = (ev) => {
    if (ev.id) {
      const numId = parseInt(ev.id.split("_")[1], 10);
      if (ev.id.startsWith("i_")) return { type: "income", item: income.find((i) => i.id === numId) };
      if (ev.id.startsWith("e_")) return { type: "expense", item: expenses.find((e) => e.id === numId) };
    }
    if (ev.type === "payday") {
      const match = income.find((i) => i.job === ev.label);
      return match ? { type: "income", item: match } : null;
    }
    const match = expenses.find((e) => e.expense === ev.label && Math.abs(e.cost - ev.amount) < 0.01);
    return match ? { type: "expense", item: match } : null;
  };

  const handleEventClick = (ev, day) => {
    setActiveEvent({ ev, day });
    setEventAction(null);
  };

  const openEdit = () => {
    if (!activeEvent) return;
    const source = findSourceItem(activeEvent.ev);
    if (!source?.item) return;
    if (source.type === "expense") {
      setEditForm({
        expense: source.item.expense,
        cost: source.item.cost,
        due_date: source.item.due_date || "",
        frequency: source.item.frequency,
      });
    } else {
      setEditForm({
        job: source.item.job,
        pay_type: source.item.pay_type || "hourly",
        pay_per_hour: source.item.pay_per_hour ?? "",
        hour_per_day: source.item.hour_per_day ?? "",
        days_per_week: source.item.days_per_week ?? 4,
        annual_salary: source.item.annual_salary ?? "",
        pay_frequency: source.item.pay_frequency || "semi-monthly",
        next_pay_date: source.item.next_pay_date ?? "",
      });
    }
    setEventAction("edit");
  };

  const openMove = () => {
    if (!activeEvent) return;
    const padMonth = String(month).padStart(2, "0");
    const padDay = String(activeEvent.day).padStart(2, "0");
    setMoveDate(`${year}-${padMonth}-${padDay}`);
    setEventAction("move");
  };

  const openAmount = () => {
    if (!activeEvent) return;
    setAmountValue(String(activeEvent.ev.amount ?? ""));
    setEventAction("amount");
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    const source = findSourceItem(activeEvent.ev);
    if (!source?.item) return;
    setSaving(true);
    try {
      if (source.type === "expense") {
        await api.updateExpense(source.item.id, {
          expense: editForm.expense,
          cost: parseFloat(editForm.cost),
          due_date: editForm.due_date ? parseInt(editForm.due_date) : null,
          frequency: editForm.frequency,
        });
      } else {
        const data = {
          job: editForm.job,
          pay_type: editForm.pay_type,
          pay_frequency: editForm.pay_frequency,
          next_pay_date: editForm.next_pay_date || null,
        };
        if (editForm.pay_type === "hourly") {
          data.pay_per_hour = parseFloat(editForm.pay_per_hour);
          data.hour_per_day = parseFloat(editForm.hour_per_day);
          data.days_per_week = editForm.days_per_week ? parseFloat(editForm.days_per_week) : null;
          data.annual_salary = null;
        } else {
          data.annual_salary = parseFloat(editForm.annual_salary);
          data.pay_per_hour = null;
          data.hour_per_day = null;
          data.days_per_week = null;
        }
        await api.updateIncome(source.item.id, data);
      }
      setActiveEvent(null);
      setEventAction(null);
      loadCalendar();
      emitRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleMoveSave = async () => {
    const source = findSourceItem(activeEvent.ev);
    if (!source?.item || !moveDate) return;
    setSaving(true);
    try {
      const padMonth = String(month).padStart(2, "0");
      const padDay = String(activeEvent.day).padStart(2, "0");
      const originalDate = `${year}-${padMonth}-${padDay}`;
      const existing = source.item.exceptions || [];
      const exceptions = [...existing, { original_date: originalDate, new_date: moveDate }];
      if (source.type === "expense") {
        await api.updateExpense(source.item.id, { exceptions });
      } else {
        await api.updateIncome(source.item.id, { exceptions });
      }
      setActiveEvent(null);
      setEventAction(null);
      loadCalendar();
      emitRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleAmountSave = async () => {
    const source = findSourceItem(activeEvent.ev);
    if (!source?.item || source.type !== "income") return;
    const amt = parseFloat(amountValue);
    if (isNaN(amt)) return;
    setSaving(true);
    try {
      const evDate = `${year}-${String(month).padStart(2, "0")}-${String(activeEvent.day).padStart(2, "0")}`;
      const existing = source.item.exceptions || [];
      let found = false;
      const exceptions = existing.map((ex) => {
        if (ex.new_date === evDate || ex.original_date === evDate) {
          found = true;
          return { ...ex, amount: amt };
        }
        return ex;
      });
      if (!found) exceptions.push({ original_date: evDate, new_date: evDate, amount: amt });
      await api.updateIncome(source.item.id, { exceptions });
      setActiveEvent(null);
      setEventAction(null);
      loadCalendar();
      emitRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    const source = findSourceItem(activeEvent.ev);
    if (!source?.item) return;
    setSaving(true);
    try {
      if (source.type === "income") {
        await api.deleteIncome(source.item.id);
      } else {
        await api.deleteExpense(source.item.id);
      }
      setActiveEvent(null);
      setEventAction(null);
      loadCalendar();
      emitRefresh();
    } finally {
      setSaving(false);
    }
  };

  const closeEventModal = () => {
    setActiveEvent(null);
    setEventAction(null);
    setEditForm({});
    setMoveDate("");
    setAmountValue("");
  };

  return (
    <div className="page">
      <h1>Bill Calendar</h1>

      {data && data.events ? (
        <CalendarContent
          data={data}
          year={year}
          month={month}
          selectedDay={selectedDay}
          dayMode={dayMode}
          billForm={billForm}
          addingBill={addingBill}
          setBillForm={setBillForm}
          setDayMode={setDayMode}
          prevMonth={prevMonth}
          nextMonth={nextMonth}
          handleDayClick={handleDayClick}
          handleDayKeyDown={handleDayKeyDown}
          handleAddBill={handleAddBill}
          incomeForm={incomeForm}
          setIncomeForm={setIncomeForm}
          addingIncome={addingIncome}
          handleAddIncome={handleAddIncome}
          setSelectedDay={setSelectedDay}
          onEventClick={handleEventClick}
          activeEvent={activeEvent}
          eventAction={eventAction}
          editForm={editForm}
          setEditForm={setEditForm}
          moveDate={moveDate}
          setMoveDate={setMoveDate}
          saving={saving}
          openEdit={openEdit}
          openMove={openMove}
          openAmount={openAmount}
          amountValue={amountValue}
          setAmountValue={setAmountValue}
          handleEditSave={handleEditSave}
          handleMoveSave={handleMoveSave}
          handleAmountSave={handleAmountSave}
          handleDeleteEvent={handleDeleteEvent}
          closeEventModal={closeEventModal}
          findSourceItem={findSourceItem}
        />
      ) : (
        <CalendarSkeleton />
      )}
    </div>
  );
}

function CalendarContent({
  data, year, month, selectedDay, dayMode, billForm, addingBill, setBillForm, setDayMode,
  prevMonth, nextMonth, handleDayClick, handleDayKeyDown, handleAddBill,
  incomeForm, setIncomeForm, addingIncome, handleAddIncome, setSelectedDay,
  onEventClick, activeEvent, eventAction, editForm, setEditForm, moveDate, setMoveDate,
  saving, openEdit, openMove, openAmount, amountValue, setAmountValue, handleEditSave, handleMoveSave, handleAmountSave, handleDeleteEvent, closeEventModal, findSourceItem,
}) {
  const blanks = data.first_weekday;
  const cells = [];
  for (let i = 0; i < blanks; i++) cells.push({ day: null });
  for (let d = 1; d <= data.days_in_month; d++) cells.push({ day: d, events: (data.events[d] || []).filter((e) => e.amount > 0) });

  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  const incomeCap = isCurrentMonth ? today.getDate() : Infinity;

  const allEvents = Object.values(data.events).flat();
  const totalIncome = Object.entries(data.events)
    .filter(([day]) => Number(day) <= incomeCap)
    .flatMap(([, events]) => events)
    .filter(e => e.type === "payday")
    .reduce((s, e) => s + e.amount, 0);
  const totalBills = allEvents.filter(e => e.type === "bill").reduce((s, e) => s + e.amount, 0);

  const activeSource = activeEvent ? findSourceItem(activeEvent.ev) : null;

  return (
    <>
      <div className={cs.grid}>
        <div className={cs.card}>
          <h2 className={cs.cardTitle}>Income This Month</h2>
          <p className="big-number green">${totalIncome.toLocaleString()}</p>
        </div>
        <div className={cs.card}>
          <h2 className={cs.cardTitle}>Bills Due This Month</h2>
          <p className="big-number red">${totalBills.toFixed(2)}</p>
        </div>
        <div className={`${cs.card} ${cs.accent}`}>
          <h2 className={cs.cardTitle}>Net After Bills</h2>
          <p className={`big-number ${totalIncome - totalBills < 0 ? "red" : ""}`}>
            ${(totalIncome - totalBills).toFixed(2)}
          </p>
        </div>
      </div>

      <div className={cal.calHeader}>
        <button className={cal.calNav} onClick={prevMonth} aria-label="Previous month">&lt;</button>
        <h2 className={cal.calTitle}>{data.month_name} {data.year}</h2>
        <button className={cal.calNav} onClick={nextMonth} aria-label="Next month">&gt;</button>
      </div>

      <div className={cal.calScroll}>
        <div className={cal.calGrid}>
          {WEEKDAYS.map(d => (
            <div key={d} className={cal.calWeekday}>{d}</div>
          ))}

          {cells.map((cell, i) => (
            <div
              key={i}
              className={
                cell.day
                  ? `${cal.calCell}${isCurrentMonth && cell.day === today.getDate() ? ` ${cal.calCellToday}` : ""}${selectedDay === cell.day ? ` ${cal.calCellSelected}` : ""}`
                  : cal.calCellEmpty
              }
              onClick={() => handleDayClick(cell.day)}
              onKeyDown={(e) => handleDayKeyDown(e, cell.day)}
              role={cell.day ? "button" : undefined}
              tabIndex={cell.day ? 0 : -1}
              aria-label={cell.day ? `${data.month_name} ${cell.day}` : undefined}
            >
              {cell.day && (
                <>
                  <span className={`${cal.calDay}${isCurrentMonth && cell.day === today.getDate() ? ` ${cal.calDayToday}` : ""}`}>
                    {cell.day}
                  </span>
                  <div className={cal.calEvents}>
                    {cell.events.map((ev, j) => (
                      <div key={j} className={`${cal.calEvent} ${ev.type === "payday" ? cal.calEventPayday : cal.calEventBill}`}>
                        <span className={cal.calEventLabel}>{ev.label}</span>
                        <span className={cal.calEventAmount}>
                          {ev.type === "payday" ? "+" : "-"}${ev.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={!!selectedDay && !activeEvent} onClose={() => { setSelectedDay(null); setDayMode("view"); }} title={`${data?.month_name} ${selectedDay}`}>
        {selectedDay && (() => {
          const dayEvents = data.events[selectedDay] || [];
          return (
            <>
              <div className={cal.dayDetailList}>
                {dayEvents.length === 0 ? (
                  <p className={cal.dayDetailEmpty}>No events</p>
                ) : (
                  dayEvents.map((ev, i) => (
                    <div
                      key={i}
                      className={`${cal.dayDetailRow} ${cal.dayDetailRowClickable}`}
                      onClick={() => onEventClick(ev, selectedDay)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") onEventClick(ev, selectedDay); }}
                    >
                      <div className={cal.dayDetailLeft}>
                        <span className={`${cal.badge} ${ev.type === "payday" ? cal.badgePayday : cal.badgeBill}`}>
                          {ev.type === "payday" ? "Income" : "Bill"}
                        </span>
                        <span className={cal.dayDetailLabel}>{ev.label}</span>
                      </div>
                      <span className={ev.type === "payday" ? cal.dayDetailAmountIncome : cal.dayDetailAmountBill}>
                        {ev.type === "payday" ? "+" : "-"}${ev.amount.toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className={cal.modeToggleRow}>
                <button
                  onClick={() => setDayMode("view")}
                  className={dayMode === "view" ? cal.modeToggleActive : cal.modeToggle}
                >
                  View
                </button>
                <button
                  onClick={() => setDayMode("add")}
                  className={dayMode === "add" ? cal.modeToggleActive : cal.modeToggle}
                >
                  + Add Bill
                </button>
                <button
                  onClick={() => setDayMode("income")}
                  className={dayMode === "income" ? cal.modeToggleActive : cal.modeToggle}
                >
                  + Add Income
                </button>
              </div>

              {dayMode === "add" && (
                <form className={modalStyles.form} onSubmit={handleAddBill}>
                  <input placeholder="Bill name" value={billForm.expense} onChange={(e) => setBillForm({ ...billForm, expense: e.target.value })} required />
                  <div className={modalStyles.formRow}>
                    <input type="number" step="0.01" placeholder="Cost" value={billForm.cost} onChange={(e) => setBillForm({ ...billForm, cost: e.target.value })} required />
                    <select value={billForm.frequency} onChange={(e) => setBillForm({ ...billForm, frequency: e.target.value })}>
                      <option value="monthly">Monthly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="weekly">Weekly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <button type="submit" className={modalStyles.submit} disabled={addingBill}>
                    {addingBill ? "Saving..." : "Add Bill"}
                  </button>
                </form>
              )}

              {dayMode === "income" && (
                <form className={modalStyles.form} onSubmit={handleAddIncome}>
                  <input placeholder="Income label" value={incomeForm.label} onChange={(e) => setIncomeForm({ ...incomeForm, label: e.target.value })} required />
                  <div className={modalStyles.formRow}>
                    <input type="number" step="0.01" placeholder="Amount" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} required />
                  </div>
                  <button type="submit" className={modalStyles.submit} disabled={addingIncome}>
                    {addingIncome ? "Saving..." : "Add Income"}
                  </button>
                </form>
              )}
            </>
          );
        })()}
      </Modal>

      <Modal isOpen={!!activeEvent && !eventAction} onClose={closeEventModal} title={activeEvent?.ev.label || ""}>
        {activeEvent && (
          <div>
            <div className={cal.dayDetailRow}>
              <div className={cal.dayDetailLeft}>
                <span className={`${cal.badge} ${activeEvent.ev.type === "payday" ? cal.badgePayday : cal.badgeBill}`}>
                  {activeEvent.ev.type === "payday" ? "Income" : "Bill"}
                </span>
                <span className={cal.dayDetailLabel}>{activeEvent.ev.label}</span>
              </div>
              <span className={activeEvent.ev.type === "payday" ? cal.dayDetailAmountIncome : cal.dayDetailAmountBill}>
                {activeEvent.ev.type === "payday" ? "+" : "-"}${activeEvent.ev.amount.toLocaleString()}
              </span>
            </div>
            <div className={modalStyles.actions} style={{ marginTop: 16, flexWrap: "wrap" }}>
              {activeEvent.ev.type === "payday" && (
                <button className={modalStyles.submitFlex} onClick={openAmount} disabled={!activeSource?.item}>
                  Adjust Amount
                </button>
              )}
              <button className={activeEvent.ev.type === "payday" ? modalStyles.btnSecondary : modalStyles.submitFlex} onClick={openEdit} disabled={!activeSource?.item}>
                Edit
              </button>
              <button className={modalStyles.btnSecondary} onClick={openMove} disabled={!activeSource?.item}>
                Move
              </button>
              <button className={modalStyles.btnSecondary} onClick={handleDeleteEvent} disabled={!activeSource?.item || saving}>
                {saving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={eventAction === "edit"} onClose={closeEventModal} title={`Edit — ${activeEvent?.ev.label || ""}`}>
        {activeEvent && activeSource?.type === "expense" && (
          <form className={modalStyles.form} onSubmit={handleEditSave}>
            <input placeholder="Name" value={editForm.expense || ""} onChange={(e) => setEditForm({ ...editForm, expense: e.target.value })} required />
            <div className={modalStyles.formRow}>
              <input type="number" step="0.01" placeholder="Cost" value={editForm.cost || ""} onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })} required />
              <input type="number" min="1" max="31" placeholder="Due day (1-31)" value={editForm.due_date || ""} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} />
            </div>
            <select value={editForm.frequency || "monthly"} onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })}>
              <option value="monthly">Monthly</option>
              <option value="biweekly">Biweekly</option>
              <option value="weekly">Weekly</option>
              <option value="yearly">Yearly</option>
              <option value="one-time">One-time</option>
            </select>
            <button type="submit" className={modalStyles.submit} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </form>
        )}
        {activeEvent && activeSource?.type === "income" && (
          <form className={modalStyles.form} onSubmit={handleEditSave}>
            <input placeholder="Job title" value={editForm.job || ""} onChange={(e) => setEditForm({ ...editForm, job: e.target.value })} required />
            <select value={editForm.pay_type || "hourly"} onChange={(e) => setEditForm({ ...editForm, pay_type: e.target.value })}>
              <option value="hourly">Hourly</option>
              <option value="salary">Salary</option>
            </select>
            {(editForm.pay_type || "hourly") === "hourly" ? (
              <div className={modalStyles.formRow}>
                <input type="number" step="0.01" placeholder="$/hour" value={editForm.pay_per_hour || ""} onChange={(e) => setEditForm({ ...editForm, pay_per_hour: e.target.value })} required />
                <input type="number" step="0.5" placeholder="Hours/day" value={editForm.hour_per_day || ""} onChange={(e) => setEditForm({ ...editForm, hour_per_day: e.target.value })} required />
                <input type="number" step="0.5" min="1" max="7" placeholder="Days/week" value={editForm.days_per_week || ""} onChange={(e) => setEditForm({ ...editForm, days_per_week: e.target.value })} required />
              </div>
            ) : (
              <input type="number" step="0.01" placeholder="Annual salary" value={editForm.annual_salary || ""} onChange={(e) => setEditForm({ ...editForm, annual_salary: e.target.value })} required />
            )}
            <div className={modalStyles.formRow}>
              <select value={editForm.pay_frequency || "semi-monthly"} onChange={(e) => setEditForm({ ...editForm, pay_frequency: e.target.value })}>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="semi-monthly">Semi-Monthly</option>
                <option value="monthly">Monthly</option>
                <option value="one-time">One-time</option>
              </select>
              {(editForm.pay_frequency || "semi-monthly") !== "one-time" && (
                <label className={modalStyles.fieldLabel}>
                  Next payday
                  <input type="date" value={editForm.next_pay_date || ""} onChange={(e) => setEditForm({ ...editForm, next_pay_date: e.target.value })} />
                </label>
              )}
            </div>
            <button type="submit" className={modalStyles.submit} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </form>
        )}
      </Modal>

      <Modal isOpen={eventAction === "move"} onClose={closeEventModal} title={`Move — ${activeEvent?.ev.label || ""}`}>
        {activeEvent && (
          <div>
            <p className={cal.dayDetailEmpty} style={{ marginBottom: 12 }}>
              Move this occurrence to a new date. The rest of the series is unaffected.
            </p>
            <form className={modalStyles.form} onSubmit={(e) => { e.preventDefault(); handleMoveSave(); }}>
              <input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} required />
              <button type="submit" className={modalStyles.submit} disabled={saving || !moveDate}>
                {saving ? "Moving..." : "Move Occurrence"}
              </button>
            </form>
          </div>
        )}
      </Modal>

      <Modal isOpen={eventAction === "amount"} onClose={closeEventModal} title={`Adjust — ${activeEvent?.ev.label || ""}`}>
        {activeEvent && (
          <div>
            <p className={cal.dayDetailEmpty} style={{ marginBottom: 12 }}>
              Set the actual amount earned on {data?.month_name} {activeEvent.day} (e.g. overtime or a short day). Only this occurrence changes.
            </p>
            <form className={modalStyles.form} onSubmit={(e) => { e.preventDefault(); handleAmountSave(); }}>
              <input type="number" step="0.01" placeholder="Actual amount" value={amountValue} onChange={(e) => setAmountValue(e.target.value)} required />
              <button type="submit" className={modalStyles.submit} disabled={saving || amountValue === ""}>
                {saving ? "Saving..." : "Save Amount"}
              </button>
            </form>
          </div>
        )}
      </Modal>

      <div className={cal.billsSection}>
        <h2 className={cal.billsHeading}>All Bills This Month</h2>
        <DataTable>
          <thead>
            <tr><th>Day</th><th>Type</th><th>Description</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {Object.entries(data.events)
              .sort(([a], [b]) => Number(a) - Number(b))
              .flatMap(([day, events]) =>
                events
                  .filter((ev) => ev.amount > 0)
                  .map((ev, i) => (
                  <tr key={`${day}-${i}`}>
                    <td>{day}</td>
                    <td>
                      <span className={`${cal.badge} ${ev.type === "payday" ? cal.badgePayday : cal.badgeBill}`}>
                        {ev.type === "payday" ? "Income" : "Bill"}
                      </span>
                    </td>
                    <td>{ev.label}</td>
                    <td className={ev.type === "payday" ? "green" : "red"}>
                      {ev.type === "payday" ? "+" : "-"}${ev.amount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
          </tbody>
        </DataTable>
      </div>
    </>
  );
}
