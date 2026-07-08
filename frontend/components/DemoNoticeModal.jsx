"use client";

import { useEffect, useState } from "react";
import Modal, { modalStyles } from "./Modal";

export default function DemoNoticeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("paypath:demo-blocked", show);
    return () => window.removeEventListener("paypath:demo-blocked", show);
  }, []);

  return (
    <Modal isOpen={open} onClose={() => setOpen(false)} title="Demo Account">
      <p className={modalStyles.message}>
        This is a demo account, so adding, editing, and deleting are disabled.
        Feel free to explore — the data stays as-is.
      </p>
      <button className={modalStyles.submit} onClick={() => setOpen(false)}>Got it</button>
    </Modal>
  );
}