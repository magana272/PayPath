"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Modal, { modalStyles } from "@/components/Modal";
import ViewModal from "@/components/ViewModal";
import DataTable, { tableStyles } from "@/components/DataTable";
import { IconEye, IconPencil } from "@/components/Icons";
import ss from "@/app/settings/page.module.css";

const EMPTY_FORM = { job: "", pay_type: "hourly", pay_per_hour: "", hour_per_day: "", days_per_week: "", annual_salary: "", pay_frequency: "semi-monthly", next_pay_date: "" };

function buildPayload(form) {
  const data = { job: form.job, pay_type: form.pay_type, pay_frequency: form.pay_frequency, next_pay_date: form.next_pay_date || null };
  if (form.pay_type === "hourly") {
    data.pay_per_hour = parseFloat(form.pay_per_hour);
    data.hour_per_day = parseFloat(form.hour_per_day);
    data.days_per_week = form.days_per_week ? parseFloat(form.days_per_week) : null;
    data.annual_salary = null;
  } else {
    data.annual_salary = parseFloat(form.annual_salary);
    data.pay_per_hour = null;
    data.hour_per_day = null;
    data.days_per_week = null;
  }
  return data;
}

function IncomeFormFields({ form, setForm, cls }) {
  const inputCls = cls?.input || "";
  const selectCls = cls?.select || "";
  const rowCls = cls?.row || "";
  return (
    <>
      <input className={inputCls} placeholder="Job title" value={form.job} onChange={(e) => setForm({ ...form, job: e.target.value })} required />
      <select className={selectCls} value={form.pay_type} onChange={(e) => setForm({ ...form, pay_type: e.target.value })}>
        <option value="hourly">Hourly</option>
        <option value="salary">Salary</option>
      </select>
      {form.pay_type === "hourly" ? (
        <div className={rowCls}>
          <input className={inputCls} type="number" step="0.01" placeholder="$/hour" value={form.pay_per_hour} onChange={(e) => setForm({ ...form, pay_per_hour: e.target.value })} required />
          <input className={inputCls} type="number" step="0.5" placeholder="Hours/day" value={form.hour_per_day} onChange={(e) => setForm({ ...form, hour_per_day: e.target.value })} required />
          <input className={inputCls} type="number" step="0.5" min="1" max="7" placeholder="Days/week" value={form.days_per_week} onChange={(e) => setForm({ ...form, days_per_week: e.target.value })} required />
        </div>
      ) : (
        <input className={inputCls} type="number" step="0.01" placeholder="Annual salary" value={form.annual_salary} onChange={(e) => setForm({ ...form, annual_salary: e.target.value })} required />
      )}
      <div className={rowCls}>
        <select className={selectCls} value={form.pay_frequency} onChange={(e) => setForm({ ...form, pay_frequency: e.target.value })}>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly</option>
          <option value="semi-monthly">Semi-Monthly</option>
          <option value="monthly">Monthly</option>
        </select>
        {form.pay_frequency !== "one-time" && (
          <label className={modalStyles.fieldLabel}>
            Next payday
            <input className={inputCls} type="date" value={form.next_pay_date || ""} onChange={(e) => setForm({ ...form, next_pay_date: e.target.value })} />
          </label>
        )}
      </div>
    </>
  );
}

const ONE_TIME_INCOME_EMPTY_FORM = { source: "", amount: "", date: "" };

function buildOneTimeIncomePayload(form) {
  return {
    job: form.source,
    pay_type: "salary",
    annual_salary: parseFloat(form.amount),
    pay_frequency: "one-time",
    date: form.date || null,
  };
}

function OneTimeIncomeFields({ form, setForm, cls }) {
  const inputCls = cls?.input || "";
  const rowCls = cls?.row || "";
  return (
    <>
      <input className={inputCls} placeholder="Source (e.g. Sold couch, Client payment)" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} required />
      <div className={rowCls}>
        <input className={inputCls} type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <input className={inputCls} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
      </div>
    </>
  );
}

export { IncomeFormFields, OneTimeIncomeFields, EMPTY_FORM as INCOME_EMPTY_FORM, ONE_TIME_INCOME_EMPTY_FORM, buildPayload as buildIncomePayload, buildOneTimeIncomePayload };

export default function IncomeTab({ jobs, onReload }) {
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM });
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.addIncome(buildPayload(addForm));
      setAddForm({ ...EMPTY_FORM });
      setShowAdd(false);
      onReload();
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (j) => {
    setEditing(j);
    setEditForm({
      job: j.job,
      pay_type: j.pay_type || "hourly",
      pay_per_hour: j.pay_per_hour ?? "",
      hour_per_day: j.hour_per_day ?? "",
      days_per_week: j.days_per_week ?? 4,
      annual_salary: j.annual_salary ?? "",
      pay_frequency: j.pay_frequency || "semi-monthly",
      next_pay_date: j.next_pay_date ?? "",
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateIncome(editing.id, buildPayload(editForm));
      setEditing(null);
      onReload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.deleteIncome(viewing.id);
      setViewing(null);
      onReload();
    } finally {
      setSaving(false);
    }
  };

  const viewFields = viewing ? [
    { label: "Job", value: viewing.job },
    { label: "Pay Type", value: viewing.pay_type || "hourly", capitalize: true },
    ...((viewing.pay_type || "hourly") === "hourly"
      ? [{ label: "Pay/Hour", value: `$${viewing.pay_per_hour}/hr` }, { label: "Hours/Day", value: `${viewing.hour_per_day} hrs` }, { label: "Days/Week", value: `${viewing.days_per_week ?? 4} days` }]
      : [{ label: "Annual Salary", value: `$${(viewing.annual_salary || 0).toLocaleString()}` }]),
    { label: "Pay Frequency", value: viewing.pay_frequency || "semi-monthly", capitalize: true },
    ...(viewing.next_pay_date
      ? [{ label: "Next Payday", value: viewing.next_pay_date }]
      : viewing.pay_day ? [{ label: "Pay Day", value: `Day ${viewing.pay_day}` }] : []),
  ] : [];

  return (
    <>
      <div className={ss.sectionBar}>
        <span className={ss.sectionTitle}>Jobs & Income</span>
        <button className={ss.addBtn} onClick={() => setShowAdd(true)}>+ Add Job</button>
      </div>
      <DataTable>
        <thead>
          <tr><th>Job</th><th>Type</th><th>Pay</th><th>Frequency</th><th></th></tr>
        </thead>
        <tbody>
          {jobs.filter((j) => j.pay_frequency !== "one-time").map((j) => (
            <tr key={j.id}>
              <td>{j.job}</td>
              <td className={ss.tdMetaCaps}>{j.pay_type || "hourly"}</td>
              <td>{(j.pay_type || "hourly") === "salary" ? `$${(j.annual_salary || 0).toLocaleString()}/yr` : `$${j.pay_per_hour}/hr`}</td>
              <td className={ss.tdMeta}>{j.pay_frequency || "semi-monthly"}</td>
              <td>
                <div className={tableStyles.actions}>
                  <button className={tableStyles.iconBtn} onClick={() => setViewing(j)} title="View" aria-label="View">
                    <IconEye />
                  </button>
                  <button className={tableStyles.iconBtn} onClick={() => openEdit(j)} title="Edit" aria-label="Edit">
                    <IconPencil />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Job">
        <form className={modalStyles.form} onSubmit={handleAdd}>
          <IncomeFormFields form={addForm} setForm={setAddForm} cls={{ row: modalStyles.formRow }} />
          <button type="submit" className={modalStyles.submit} disabled={saving}>{saving ? "Saving..." : "Add Job"}</button>
        </form>
      </Modal>

      {/* View Modal */}
      <ViewModal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing?.job || ""} fields={viewFields} onEdit={() => { openEdit(viewing); setViewing(null); }} onDelete={handleDelete} />

      {/* Edit Modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Job">
        {editing && (
          <form className={modalStyles.form} onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <IncomeFormFields form={editForm} setForm={setEditForm} cls={{ row: modalStyles.formRow }} />
            <button type="submit" className={modalStyles.submit} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          </form>
        )}
      </Modal>
    </>
  );
}
