"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { api } from "@/lib/api";
import { emitRefresh } from "@/lib/cache";
import Modal, { modalStyles } from "./Modal";
import ConfirmModal from "./ConfirmModal";
import { IncomeFormFields, INCOME_EMPTY_FORM, buildIncomePayload, OneTimeIncomeFields, ONE_TIME_INCOME_EMPTY_FORM, buildOneTimeIncomePayload } from "@/components/settings/IncomeTab";
import { IconHome, IconSearch, IconPlus, IconCalendar, IconLogout } from "./Icons";
import styles from "./Sidebar.module.css";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/explore", label: "Explore" },
  { href: "/calendar", label: "Calendar" },
];

const EMPTY_BILL = { expense: "", cost: "", due_date: "", frequency: "monthly" };
const EMPTY_PURCHASE = { expense: "", cost: "", date: "" };

const todayStr = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [addCategory, setAddCategory] = useState(null);
  const [billForm, setBillForm] = useState({ ...EMPTY_BILL });
  const [purchaseForm, setPurchaseForm] = useState({ ...EMPTY_PURCHASE });
  const [incomeForm, setIncomeForm] = useState({ ...INCOME_EMPTY_FORM });
  const [incomeMode, setIncomeMode] = useState("recurring");
  const [oneTimeForm, setOneTimeForm] = useState({ ...ONE_TIME_INCOME_EMPTY_FORM, date: todayStr() });
  const [saving, setSaving] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const closeAdd = () => {
    setShowAdd(false);
    setAddCategory(null);
    setBillForm({ ...EMPTY_BILL });
    setPurchaseForm({ ...EMPTY_PURCHASE });
    setIncomeForm({ ...INCOME_EMPTY_FORM });
    setIncomeMode("recurring");
    setOneTimeForm({ ...ONE_TIME_INCOME_EMPTY_FORM, date: todayStr() });
  };

  const handleAddBill = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.addExpense({
        expense: billForm.expense,
        cost: parseFloat(billForm.cost),
        due_date: billForm.due_date ? parseInt(billForm.due_date) : null,
        frequency: billForm.frequency,
      });
      closeAdd();
      emitRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleAddPurchase = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.addExpense({
        expense: purchaseForm.expense,
        cost: parseFloat(purchaseForm.cost),
        frequency: "one-time",
        date: purchaseForm.date || null,
        due_date: null,
      });
      closeAdd();
      emitRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleAddIncome = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.addIncome(buildIncomePayload(incomeForm));
      closeAdd();
      emitRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleAddOneTimeIncome = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.addIncome(buildOneTimeIncomePayload(oneTimeForm));
      closeAdd();
      emitRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <nav className={styles.sidebar}>
        <h2 className={styles.logo}>PayPath</h2>
        <div className={styles.links}>
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.link}${pathname === href ? ` ${styles.active}` : ""}`}
            >
              {label}
            </Link>
          ))}
        </div>
        <button className={styles.addBtnDesktop} onClick={() => setShowAdd(true)}>
          + Add
        </button>
        <div className={styles.mobileNav}>
          <Link href="/" className={`${styles.mobileLink}${pathname === "/" ? ` ${styles.mobileLinkActive}` : ""}`}>
            <IconHome />
            <span>Home</span>
          </Link>
          <Link href="/explore" className={`${styles.mobileLink}${pathname === "/explore" ? ` ${styles.mobileLinkActive}` : ""}`}>
            <IconSearch />
            <span>Explore</span>
          </Link>
          <button className={styles.addBtn} onClick={() => setShowAdd(true)} aria-label="Add item">
            <IconPlus />
          </button>
          <Link href="/calendar" className={`${styles.mobileLink}${pathname === "/calendar" ? ` ${styles.mobileLinkActive}` : ""}`}>
            <IconCalendar />
            <span>Calendar</span>
          </Link>
          <button className={styles.mobileLink} onClick={() => setShowLogout(true)}>
            <IconLogout />
            <span>Logout</span>
          </button>
        </div>
        <button className={styles.logout} onClick={() => setShowLogout(true)}>
          Logout
        </button>
      </nav>

      <Modal isOpen={showAdd} onClose={closeAdd} title={addCategory ? `Add ${addCategory}` : "Add New"}>
        {!addCategory ? (
          <div className={styles.categoryPicker}>
            <button className={styles.categoryBtn} onClick={() => setAddCategory("Bill")}>
              <span className={styles.categoryIcon}>$</span>
              <span className={styles.categoryLabel}>Bill</span>
              <span className={styles.categoryDesc}>Recurring expense</span>
            </button>
            <button className={styles.categoryBtn} onClick={() => setAddCategory("Purchase")}>
              <span className={styles.categoryIcon}>@</span>
              <span className={styles.categoryLabel}>Purchase</span>
              <span className={styles.categoryDesc}>One-time expense</span>
            </button>
            <button className={styles.categoryBtn} onClick={() => setAddCategory("Income")}>
              <span className={styles.categoryIcon}>+</span>
              <span className={styles.categoryLabel}>Income</span>
              <span className={styles.categoryDesc}>Job or pay source</span>
            </button>
          </div>
        ) : addCategory === "Bill" ? (
          <form className={modalStyles.form} onSubmit={handleAddBill}>
            <input placeholder="Bill name" value={billForm.expense} onChange={(e) => setBillForm({ ...billForm, expense: e.target.value })} required />
            <div className={modalStyles.formRow}>
              <input type="number" step="0.01" placeholder="Amount" value={billForm.cost} onChange={(e) => setBillForm({ ...billForm, cost: e.target.value })} required />
              <input type="number" min="1" max="31" placeholder="Due day (1-31)" value={billForm.due_date} onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })} />
            </div>
            <select value={billForm.frequency} onChange={(e) => setBillForm({ ...billForm, frequency: e.target.value })}>
              <option value="monthly">Monthly</option>
              <option value="biweekly">Biweekly</option>
              <option value="weekly">Weekly</option>
              <option value="yearly">Yearly</option>
            </select>
            <button type="submit" className={modalStyles.submit} disabled={saving}>
              {saving ? "Saving..." : "Add Bill"}
            </button>
          </form>
        ) : addCategory === "Purchase" ? (
          <form className={modalStyles.form} onSubmit={handleAddPurchase}>
            <input placeholder="Purchase name" value={purchaseForm.expense} onChange={(e) => setPurchaseForm({ ...purchaseForm, expense: e.target.value })} required />
            <input type="number" step="0.01" placeholder="Amount" value={purchaseForm.cost} onChange={(e) => setPurchaseForm({ ...purchaseForm, cost: e.target.value })} required />
            <input type="date" value={purchaseForm.date} onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })} />
            <button type="submit" className={modalStyles.submit} disabled={saving}>
              {saving ? "Saving..." : "Add Purchase"}
            </button>
          </form>
        ) : (
          <>
            <div className={modalStyles.formRow} style={{ marginBottom: 8 }}>
              <button type="button" className={incomeMode === "recurring" ? modalStyles.submitFlex : modalStyles.btnSecondary} onClick={() => setIncomeMode("recurring")}>
                Job
              </button>
              <button type="button" className={incomeMode === "onetime" ? modalStyles.submitFlex : modalStyles.btnSecondary} onClick={() => setIncomeMode("onetime")}>
                One-time
              </button>
            </div>
            {incomeMode === "recurring" ? (
              <form className={modalStyles.form} onSubmit={handleAddIncome}>
                <IncomeFormFields form={incomeForm} setForm={setIncomeForm} cls={{ row: modalStyles.formRow }} />
                <button type="submit" className={modalStyles.submit} disabled={saving}>
                  {saving ? "Saving..." : "Add Job"}
                </button>
              </form>
            ) : (
              <form className={modalStyles.form} onSubmit={handleAddOneTimeIncome}>
                <OneTimeIncomeFields form={oneTimeForm} setForm={setOneTimeForm} cls={{ row: modalStyles.formRow }} />
                <button type="submit" className={modalStyles.submit} disabled={saving}>
                  {saving ? "Saving..." : "Add Income"}
                </button>
              </form>
            )}
          </>
        )}
      </Modal>

      <ConfirmModal
        isOpen={showLogout}
        onClose={() => setShowLogout(false)}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmLabel="Log Out"
        onConfirm={logout}
      />
    </>
  );
}
