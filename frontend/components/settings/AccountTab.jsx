"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Modal from "@/components/Modal";
import { PROTECTED_EMAIL } from "@/lib/constants";
import ss from "@/app/settings/page.module.css";

export default function AccountTab() {
  const { user, deleteAccount } = useAuth();
  const isProtected = user?.email === PROTECTED_EMAIL;
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className={ss.sectionBar}>
        <span className={ss.sectionTitle}>Profile</span>
      </div>

      <div className={ss.profileRow}>
        <span className={ss.profileLabel}>Name</span>
        <span className={ss.profileValue}>{user?.name}</span>
      </div>
      <div className={ss.profileRow}>
        <span className={ss.profileLabel}>Email</span>
        <span className={ss.profileValue}>{user?.email}</span>
      </div>

      <div className={ss.dangerZone}>
        <div className={ss.dangerTitle}>Danger Zone</div>
        <p className={ss.dangerText}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        {isProtected ? (
          <>
            <button className={ss.dangerBtn} disabled>
              Delete Account
            </button>
            <p className={ss.dangerText}>The demo account can&apos;t be deleted.</p>
          </>
        ) : (
          <button className={ss.dangerBtn} onClick={() => setShowConfirm(true)}>
            Delete Account
          </button>
        )}
      </div>

      <Modal isOpen={showConfirm} onClose={() => { setShowConfirm(false); setConfirmText(""); }} title="Delete Account">
        <p className={ss.confirmText}>
          Type <strong>DELETE</strong> to confirm account deletion.
        </p>
        <input
          className={ss.dangerInput}
          placeholder="Type DELETE"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />
        <button
          className={ss.dangerBtn}
          disabled={confirmText !== "DELETE" || deleting}
          onClick={handleDelete}
        >
          {deleting ? "Deleting..." : "Permanently Delete"}
        </button>
      </Modal>
    </>
  );
}
