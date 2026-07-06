"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Modal, { modalStyles } from "@/components/Modal";
import ViewModal from "@/components/ViewModal";
import DataTable, { tableStyles } from "@/components/DataTable";
import { IconEye, IconPencil } from "@/components/Icons";
import ss from "@/app/settings/page.module.css";
import cs from "@/components/CardGrid.module.css";

export default function DebtsTab({ debts, onReload }) {
  const [showAdd, setShowAdd] = useState(false);
  const [debtForm, setDebtForm] = useState({ bank: "", type: "credit_card", name: "", apy: "", balance: "" });
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.addDebt({ ...debtForm, apy: parseFloat(debtForm.apy), balance: parseFloat(debtForm.balance) });
      setDebtForm({ bank: "", type: "credit_card", name: "", apy: "", balance: "" });
      setShowAdd(false);
      onReload();
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (d) => {
    setEditing(d);
    setEditForm({ bank: d.bank, type: d.type, name: d.name, apy: d.apy, balance: d.balance });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateDebt(editing.id, { bank: editForm.bank, type: editForm.type, name: editForm.name, apy: parseFloat(editForm.apy), balance: parseFloat(editForm.balance) });
      setEditing(null);
      onReload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.deleteDebt(viewing.id);
      setViewing(null);
      onReload();
    } finally {
      setSaving(false);
    }
  };

  const viewFields = viewing ? [
    { label: "Name", value: viewing.name },
    { label: "Bank", value: viewing.bank },
    { label: "Type", value: viewing.type },
    { label: "APR", value: `${viewing.apy}%` },
    { label: "Balance", value: `$${viewing.balance.toLocaleString()}` },
  ] : [];

  return (
    <>
      <div className={ss.sectionBar}>
        <span className={ss.sectionTitle}>Debts</span>
        <button className={ss.addBtn} onClick={() => setShowAdd(true)}>+ Add Debt</button>
      </div>

      <div className={cs.grid}>
        <div className={cs.card}>
          <h2 className={cs.cardTitle}>Total Owed</h2>
          <p className="big-number red">${totalDebt.toLocaleString()}</p>
        </div>
        <div className={cs.card}>
          <h2 className={cs.cardTitle}>Accounts</h2>
          <p className="big-number">{debts.length}</p>
        </div>
      </div>

      <DataTable>
        <thead>
          <tr><th>Name</th><th>Bank</th><th>APR</th><th>Balance</th><th></th></tr>
        </thead>
        <tbody>
          {debts.map((d) => (
            <tr key={d.id}>
              <td className={ss.tdTruncate}>{d.name}</td>
              <td>{d.bank}</td>
              <td>{d.apy}%</td>
              <td>${d.balance.toLocaleString()}</td>
              <td>
                <div className={tableStyles.actions}>
                  <button className={tableStyles.iconBtn} onClick={() => setViewing(d)} title="View" aria-label="View">
                    <IconEye />
                  </button>
                  <button className={tableStyles.iconBtn} onClick={() => openEdit(d)} title="Edit" aria-label="Edit">
                    <IconPencil />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      {/* View Modal */}
      <ViewModal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || ""} fields={viewFields} onEdit={() => { openEdit(viewing); setViewing(null); }} onDelete={handleDelete} />

      {/* Edit Modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={`Edit — ${editing?.name || ""}`}>
        {editing && (
          <form className={modalStyles.form} onSubmit={handleSave}>
            <div className={modalStyles.formRow}>
              <input placeholder="Bank" value={editForm.bank} onChange={(e) => setEditForm({ ...editForm, bank: e.target.value })} required />
              <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                <option value="credit_card">Credit Card</option>
                <option value="car">Auto Loan</option>
                <option value="student_loan">Student Loan</option>
              </select>
            </div>
            <input placeholder="Account name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            <div className={modalStyles.formRow}>
              <input type="number" step="0.01" placeholder="APR %" value={editForm.apy} onChange={(e) => setEditForm({ ...editForm, apy: e.target.value })} required />
              <input type="number" step="0.01" placeholder="Balance" value={editForm.balance} onChange={(e) => setEditForm({ ...editForm, balance: e.target.value })} required />
            </div>
            <button type="submit" className={modalStyles.submit} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          </form>
        )}
      </Modal>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Debt">
        <form className={modalStyles.form} onSubmit={handleAdd}>
          <div className={modalStyles.formRow}>
            <input placeholder="Bank" value={debtForm.bank} onChange={(e) => setDebtForm({ ...debtForm, bank: e.target.value })} required />
            <select value={debtForm.type} onChange={(e) => setDebtForm({ ...debtForm, type: e.target.value })}>
              <option value="credit_card">Credit Card</option>
              <option value="car">Auto Loan</option>
              <option value="student_loan">Student Loan</option>
            </select>
          </div>
          <input placeholder="Account name" value={debtForm.name} onChange={(e) => setDebtForm({ ...debtForm, name: e.target.value })} required />
          <div className={modalStyles.formRow}>
            <input type="number" step="0.01" placeholder="APR %" value={debtForm.apy} onChange={(e) => setDebtForm({ ...debtForm, apy: e.target.value })} required />
            <input type="number" step="0.01" placeholder="Balance" value={debtForm.balance} onChange={(e) => setDebtForm({ ...debtForm, balance: e.target.value })} required />
          </div>
          <button type="submit" className={modalStyles.submit} disabled={saving}>{saving ? "Saving..." : "Add Debt"}</button>
        </form>
      </Modal>
    </>
  );
}
