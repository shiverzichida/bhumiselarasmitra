"use client";

import { useMemo, useState } from "react";
import logoImage from "@/logo-bsm.png";
import styles from "./workspace.module.css";
import { formatCurrency, formatDateLong } from "@/lib/format";
import type { CustomerMaster, InvoiceItemRow, StandaloneInvoice } from "@/lib/types";

interface StandaloneInvoiceProps {
  invoice: StandaloneInvoice;
  setInvoice: React.Dispatch<React.SetStateAction<StandaloneInvoice>>;
  customers: CustomerMaster[];
  setCustomers: React.Dispatch<React.SetStateAction<CustomerMaster[]>>;
  savedInvoices: StandaloneInvoice[];
  onSaveInvoice: () => void;
  onLoadInvoice: (inv: StandaloneInvoice) => void;
  onNewInvoice: () => void;
  onDeleteInvoice: (invNo: string) => void;
}

export function StandaloneInvoiceModule({
  invoice,
  setInvoice,
  customers,
  setCustomers,
  savedInvoices,
  onSaveInvoice,
  onLoadInvoice,
  onNewInvoice,
  onDeleteInvoice,
}: StandaloneInvoiceProps) {
  const [tab, setTab] = useState<"editor" | "preview" | "rekap" | "customers">("editor");

  // Financial calculations
  const subtotal = useMemo(() => {
    return invoice.items.reduce((sum, item) => {
      const q = Number(item.quantity || 0);
      const p = Number(item.unitPrice || 0);
      return sum + q * p;
    }, 0);
  }, [invoice.items]);

  const discount = Number(invoice.discount || 0);
  const afterDiscount = Math.max(0, subtotal - discount);
  const ppnAmount = (afterDiscount * (invoice.ppnRate || 0)) / 100;
  const pphAmount = (afterDiscount * (invoice.pphRate || 0)) / 100;
  const otherAmount = Number(invoice.otherAmount || 0);
  const totalAmount = afterDiscount + ppnAmount - pphAmount + otherAmount;

  function updateField<K extends keyof StandaloneInvoice>(key: K, value: StandaloneInvoice[K]) {
    setInvoice((prev) => ({ ...prev, [key]: value }));
  }

  function handleCustomerSelect(customerId: string) {
    const found = customers.find((c) => c.customerId === customerId);
    if (found) {
      setInvoice((prev) => ({
        ...prev,
        customerId: found.customerId,
        customerName: found.customerName,
        companyName: found.companyName,
        streetAddress: found.streetAddress,
        city: found.city,
        phone: found.phone,
      }));
    } else {
      updateField("customerId", customerId);
    }
  }

  function updateItem(index: number, field: keyof InvoiceItemRow, value: string) {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addItem() {
    setInvoice((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: null, description: "", quantity: "1", unit: "LOT", unitPrice: "0" },
      ],
    }));
  }

  function removeItem(index: number) {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  function printInvoice() {
    window.print();
  }

  return (
    <div className={styles.editorStack}>
      {/* Top Module Sub-Nav & Actions */}
      <div className={styles.editorHeader}>
        <div className={styles.tabsNav} style={{ margin: 0 }}>
          <button
            className={`${styles.tabButton} ${tab === "editor" ? styles.tabActive : ""}`}
            onClick={() => setTab("editor")}
            type="button"
          >
            Invoice Form
          </button>
          <button
            className={`${styles.tabButton} ${tab === "preview" ? styles.tabActive : ""}`}
            onClick={() => setTab("preview")}
            type="button"
          >
            Invoice Preview & Print
          </button>
          <button
            className={`${styles.tabButton} ${tab === "rekap" ? styles.tabActive : ""}`}
            onClick={() => setTab("rekap")}
            type="button"
          >
            Rekap Invoice ({savedInvoices.length})
          </button>
          <button
            className={`${styles.tabButton} ${tab === "customers" ? styles.tabActive : ""}`}
            onClick={() => setTab("customers")}
            type="button"
          >
            Customer Database ({customers.length})
          </button>
        </div>

        <div className={styles.actionGroup}>
          <button className={styles.outlineButton} onClick={onNewInvoice} type="button">
            + New Invoice
          </button>
          <button className={styles.successButton} onClick={onSaveInvoice} type="button">
            Save Invoice
          </button>
          {tab === "preview" && (
            <button className={styles.primaryButton} onClick={printInvoice} type="button">
              🖨️ Print Invoice
            </button>
          )}
        </div>
      </div>

      {tab === "editor" && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Standalone Invoice Editor</h3>
            <p>Sama persis dengan template `Invoice 001` PT. Bhumi Selaras Mitra.</p>
          </div>

          <h4 style={{ color: "#93c5fd", marginBottom: 12 }}>Invoice Header & Metadata</h4>
          <div className={styles.editorGrid}>
            <label className={styles.fieldLabel}>
              <span>Invoice No.</span>
              <input
                value={invoice.invoiceNumber}
                onChange={(e) => updateField("invoiceNumber", e.target.value)}
                placeholder="e.g. INV/054/BSM/INVVII/2025"
              />
            </label>
            <label className={styles.fieldLabel}>
              <span>Date</span>
              <input
                type="date"
                value={invoice.date}
                onChange={(e) => updateField("date", e.target.value)}
              />
            </label>
            <label className={styles.fieldLabel}>
              <span>Due Date</span>
              <input
                type="date"
                value={invoice.dueDate}
                onChange={(e) => updateField("dueDate", e.target.value)}
              />
            </label>
            <label className={styles.fieldLabel}>
              <span>Select Customer ID (Master)</span>
              <select
                value={invoice.customerId}
                onChange={(e) => handleCustomerSelect(e.target.value)}
                style={{
                  background: "#0f172a",
                  color: "#f8fafc",
                  border: "1px solid #334155",
                  padding: "8px 12px",
                  borderRadius: "6px",
                }}
              >
                <option value="">-- Select Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.customerId}>
                    [{c.customerId}] {c.companyName} - {c.customerName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h4 style={{ color: "#93c5fd", margin: "20px 0 12px" }}>Bill To Details</h4>
          <div className={styles.editorGrid}>
            <label className={styles.fieldLabel}>
              <span>Name Mr/Mrs.</span>
              <input
                value={invoice.customerName}
                onChange={(e) => updateField("customerName", e.target.value)}
                placeholder="e.g. Ibu April"
              />
            </label>
            <label className={styles.fieldLabel}>
              <span>Company Name</span>
              <input
                value={invoice.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                placeholder="e.g. PT. Belirang Kalisari"
              />
            </label>
            <label className={styles.fieldLabel} style={{ gridColumn: "span 2" }}>
              <span>Street Address</span>
              <input
                value={invoice.streetAddress}
                onChange={(e) => updateField("streetAddress", e.target.value)}
                placeholder="e.g. Jl Karanggayam I 2A Surabaya 60136 Indonesia"
              />
            </label>
            <label className={styles.fieldLabel}>
              <span>City</span>
              <input
                value={invoice.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder="e.g. Jawa Timur"
              />
            </label>
            <label className={styles.fieldLabel}>
              <span>Phone</span>
              <input
                value={invoice.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="e.g. +62-812-7958-5758"
              />
            </label>
          </div>

          <h4 style={{ color: "#93c5fd", margin: "20px 0 12px" }}>Line Items (Description, Qty, Price)</h4>
          <table className={styles.editableTable}>
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ width: 100 }}>Qty</th>
                <th style={{ width: 100 }}>Unit</th>
                <th style={{ width: 160 }}>Price (Rp)</th>
                <th style={{ width: 160 }}>Amount (Rp)</th>
                <th style={{ width: 80 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => {
                const itemAmount = Number(item.quantity || 0) * Number(item.unitPrice || 0);
                return (
                  <tr key={index}>
                    <td>
                      <input
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        placeholder="Deskripsi barang / jasa ocean freight..."
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        value={item.unit}
                        onChange={(e) => updateItem(index, "unit", e.target.value)}
                        placeholder="e.g. 20GP, LOT"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "bold", color: "#60a5fa" }}>
                      {formatCurrency(itemAmount)}
                    </td>
                    <td>
                      <button
                        className={styles.dangerButton}
                        onClick={() => removeItem(index)}
                        type="button"
                        style={{ padding: "4px 8px" }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button
            className={styles.outlineButton}
            onClick={addItem}
            type="button"
            style={{ marginTop: 12 }}
          >
            + Add Item Row
          </button>

          <h4 style={{ color: "#93c5fd", margin: "24px 0 12px" }}>Financial Calculations & Taxes</h4>
          <div className={styles.editorGrid}>
            <label className={styles.fieldLabel}>
              <span>Subtotal (Auto)</span>
              <input value={formatCurrency(subtotal)} readOnly style={{ background: "#1e293b" }} />
            </label>
            <label className={styles.fieldLabel}>
              <span>Discount (Rp)</span>
              <input
                type="number"
                value={invoice.discount}
                onChange={(e) => updateField("discount", e.target.value)}
              />
            </label>
            <label className={styles.fieldLabel}>
              <span>After Discount (Auto)</span>
              <input value={formatCurrency(afterDiscount)} readOnly style={{ background: "#1e293b" }} />
            </label>
            <label className={styles.fieldLabel}>
              <span>PPN (%) [Default 11%]</span>
              <input
                type="number"
                value={invoice.ppnRate}
                onChange={(e) => updateField("ppnRate", Number(e.target.value))}
              />
              <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                Amount: {formatCurrency(ppnAmount)}
              </span>
            </label>
            <label className={styles.fieldLabel}>
              <span>PPh (%) [Default 2%]</span>
              <input
                type="number"
                value={invoice.pphRate}
                onChange={(e) => updateField("pphRate", Number(e.target.value))}
              />
              <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                Amount: {formatCurrency(pphAmount)}
              </span>
            </label>
            <label className={styles.fieldLabel}>
              <span>Other Charges (Rp)</span>
              <input
                type="number"
                value={invoice.otherAmount}
                onChange={(e) => updateField("otherAmount", e.target.value)}
              />
            </label>
            <label className={styles.fieldLabel} style={{ gridColumn: "span 2" }}>
              <span>GRAND TOTAL (Auto)</span>
              <input
                value={formatCurrency(totalAmount)}
                readOnly
                style={{
                  background: "#1e293b",
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                  color: "#38bdf8",
                }}
              />
            </label>
          </div>

          <h4 style={{ color: "#93c5fd", margin: "24px 0 12px" }}>Payment & Banking Details</h4>
          <div className={styles.editorGrid}>
            <label className={styles.fieldLabel}>
              <span>Bank Code</span>
              <input
                value={invoice.bankCode}
                onChange={(e) => updateField("bankCode", e.target.value)}
              />
            </label>
            <label className={styles.fieldLabel}>
              <span>Bank Name</span>
              <input
                value={invoice.bankName}
                onChange={(e) => updateField("bankName", e.target.value)}
              />
            </label>
            <label className={styles.fieldLabel}>
              <span>Name Account</span>
              <input
                value={invoice.bankAccountName}
                onChange={(e) => updateField("bankAccountName", e.target.value)}
              />
            </label>
            <label className={styles.fieldLabel}>
              <span>Rek Number</span>
              <input
                value={invoice.bankAccountNumber}
                onChange={(e) => updateField("bankAccountNumber", e.target.value)}
              />
            </label>
            <label className={styles.fieldLabel}>
              <span>Signer Name</span>
              <input
                value={invoice.signerName}
                onChange={(e) => updateField("signerName", e.target.value)}
              />
            </label>
          </div>
        </section>
      )}

      {tab === "preview" && (
        <div className={styles.previewWorkspace}>
          <div className={styles.previewPaper}>
            <StandaloneInvoicePrintTemplate
              invoice={invoice}
              subtotal={subtotal}
              discount={discount}
              afterDiscount={afterDiscount}
              ppnAmount={ppnAmount}
              pphAmount={pphAmount}
              otherAmount={otherAmount}
              totalAmount={totalAmount}
            />
          </div>
        </div>
      )}

      {tab === "rekap" && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Rekapitulasi Invoice (Sheet: Rekap Invoice)</h3>
            <p>Daftar lengkap invoice yang telah dibuat dan tersimpan.</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.paperTable} style={{ width: "100%", whiteSpace: "nowrap" }}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Date</th>
                  <th>Invoice No</th>
                  <th>Cust ID</th>
                  <th>Customer Name</th>
                  <th>Company Name</th>
                  <th>Subtotal</th>
                  <th>Discount</th>
                  <th>PPN</th>
                  <th>PPh</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedInvoices.length > 0 ? (
                  savedInvoices.map((inv, index) => {
                    const sub = inv.items.reduce(
                      (s, item) => s + Number(item.quantity || 0) * Number(item.unitPrice || 0),
                      0,
                    );
                    const disc = Number(inv.discount || 0);
                    const aftDisc = Math.max(0, sub - disc);
                    const ppn = (aftDisc * (inv.ppnRate || 0)) / 100;
                    const pph = (aftDisc * (inv.pphRate || 0)) / 100;
                    const tot = aftDisc + ppn - pph + Number(inv.otherAmount || 0);

                    return (
                      <tr key={inv.invoiceNumber + index}>
                        <td>{index + 1}</td>
                        <td>{inv.date}</td>
                        <td>
                          <strong>{inv.invoiceNumber}</strong>
                        </td>
                        <td>{inv.customerId}</td>
                        <td>{inv.customerName}</td>
                        <td>{inv.companyName}</td>
                        <td>{formatCurrency(sub)}</td>
                        <td>{formatCurrency(disc)}</td>
                        <td>{formatCurrency(ppn)}</td>
                        <td>{formatCurrency(pph)}</td>
                        <td style={{ fontWeight: "bold", color: "#38bdf8" }}>{formatCurrency(tot)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className={styles.inlineButton}
                              onClick={() => {
                                onLoadInvoice(inv);
                                setTab("editor");
                              }}
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className={styles.inlineButton}
                              onClick={() => {
                                onLoadInvoice(inv);
                                setTab("preview");
                              }}
                              type="button"
                            >
                              Preview
                            </button>
                            <button
                              className={styles.dangerButton}
                              onClick={() => onDeleteInvoice(inv.invoiceNumber)}
                              type="button"
                              style={{ padding: "2px 6px" }}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>
                      Belum ada Rekap Invoice tersimpan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "customers" && (
        <CustomerMasterManager customers={customers} setCustomers={setCustomers} />
      )}
    </div>
  );
}

export function StandaloneInvoicePrintTemplate({
  invoice,
  subtotal,
  discount,
  afterDiscount,
  ppnAmount,
  pphAmount,
  otherAmount,
  totalAmount,
}: {
  invoice: StandaloneInvoice;
  subtotal: number;
  discount: number;
  afterDiscount: number;
  ppnAmount: number;
  pphAmount: number;
  otherAmount: number;
  totalAmount: number;
}) {
  return (
    <div className="invoice-print-container" style={{ background: "#ffffff", color: "#000000", padding: "24px", fontFamily: "sans-serif" }}>
      {/* Header layout matching sheet 'Invoice 001' */}
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #000", paddingBottom: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <img src={logoImage.src} alt="Bhumi Logo" style={{ height: "60px", objectFit: "contain" }} />
          <div>
            <h2 style={{ margin: 0, color: "#1e3a8a", fontSize: "20px", fontWeight: "bold" }}>
              PT. BHUMI SELARAS MITRA
            </h2>
            <p style={{ margin: "2px 0", fontSize: "11px", color: "#333" }}>
              Menteng Square Office Tower A Lt 2 Unit AK 8, Kel. Kenari, Kec. Senen
            </p>
            <p style={{ margin: "2px 0", fontSize: "11px", color: "#333" }}>
              Kota Adm. Jakarta Pusat, Provinsi DKI Jakarta 10430
            </p>
            <p style={{ margin: "2px 0", fontSize: "11px", color: "#555" }}>
              Phone: +62-811-8627-047 | Email: pt.bhumiselarasmitra@gmail.com
            </p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <h1 style={{ margin: 0, fontSize: "28px", letterSpacing: "2px", color: "#1e3a8a" }}>INVOICE</h1>
          <table style={{ margin: "8px 0 0 auto", fontSize: "11px", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: "bold", paddingRight: "8px", textAlign: "right" }}>DATE :</td>
                <td style={{ textAlign: "left" }}>{invoice.date ? formatDateLong(invoice.date) : "-"}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", paddingRight: "8px", textAlign: "right" }}>INVOICE NO :</td>
                <td style={{ textAlign: "left", fontWeight: "bold" }}>{invoice.invoiceNumber || "-"}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", paddingRight: "8px", textAlign: "right" }}>CUSTOMER ID :</td>
                <td style={{ textAlign: "left" }}>{invoice.customerId || "-"}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", paddingRight: "8px", textAlign: "right" }}>DUE DATE :</td>
                <td style={{ textAlign: "left" }}>{invoice.dueDate ? formatDateLong(invoice.dueDate) : "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* BILL TO */}
      <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "10px 14px", marginBottom: "16px", fontSize: "12px" }}>
        <strong style={{ color: "#1e3a8a", borderBottom: "1px solid #cbd5e1", display: "inline-block", paddingBottom: "2px", marginBottom: "6px" }}>
          BILL TO
        </strong>
        <table style={{ width: "100%", fontSize: "12px", lineHeight: "1.5" }}>
          <tbody>
            <tr>
              <td style={{ width: "120px", color: "#475569" }}>Name Mr/Mrs.</td>
              <td style={{ width: "10px" }}>:</td>
              <td style={{ fontWeight: "bold" }}>{invoice.customerName || "-"}</td>
            </tr>
            <tr>
              <td style={{ color: "#475569" }}>Company Name</td>
              <td>:</td>
              <td style={{ fontWeight: "bold" }}>{invoice.companyName || "-"}</td>
            </tr>
            <tr>
              <td style={{ color: "#475569" }}>Street Address</td>
              <td>:</td>
              <td>{invoice.streetAddress || "-"}</td>
            </tr>
            <tr>
              <td style={{ color: "#475569" }}>City</td>
              <td>:</td>
              <td>{invoice.city || "-"}</td>
            </tr>
            <tr>
              <td style={{ color: "#475569" }}>Phone</td>
              <td>:</td>
              <td>{invoice.phone || "-"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ITEMS TABLE */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: "#1e3a8a", color: "#ffffff" }}>
            <th style={{ padding: "8px", textAlign: "center", border: "1px solid #1e3a8a", width: "40px" }}>NO</th>
            <th style={{ padding: "8px", textAlign: "left", border: "1px solid #1e3a8a" }}>DESCRIPTION</th>
            <th style={{ padding: "8px", textAlign: "center", border: "1px solid #1e3a8a", width: "60px" }}>QTY</th>
            <th style={{ padding: "8px", textAlign: "center", border: "1px solid #1e3a8a", width: "60px" }}>UNIT</th>
            <th style={{ padding: "8px", textAlign: "right", border: "1px solid #1e3a8a", width: "130px" }}>PRICE (Rp)</th>
            <th style={{ padding: "8px", textAlign: "right", border: "1px solid #1e3a8a", width: "140px" }}>AMOUNT (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => {
            const q = Number(item.quantity || 0);
            const p = Number(item.unitPrice || 0);
            const amt = q * p;
            return (
              <tr key={index} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "8px", textAlign: "center", border: "1px solid #cbd5e1" }}>{index + 1}</td>
                <td style={{ padding: "8px", border: "1px solid #cbd5e1" }}>{item.description || "-"}</td>
                <td style={{ padding: "8px", textAlign: "center", border: "1px solid #cbd5e1" }}>{item.quantity}</td>
                <td style={{ padding: "8px", textAlign: "center", border: "1px solid #cbd5e1" }}>{item.unit}</td>
                <td style={{ padding: "8px", textAlign: "right", border: "1px solid #cbd5e1" }}>{formatCurrency(p)}</td>
                <td style={{ padding: "8px", textAlign: "right", border: "1px solid #cbd5e1", fontWeight: "bold" }}>{formatCurrency(amt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* SUMMARY & PAYMENT INFO (Bottom split layout matching sheet Invoice 001) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px", fontSize: "11px" }}>
        {/* Left column: ATTENTION & PAYMENT INFO */}
        <div style={{ border: "1px solid #cbd5e1", padding: "10px", borderRadius: "4px", background: "#fafafa" }}>
          <strong style={{ color: "#1e3a8a", display: "block", marginBottom: "4px" }}>ATTENTION :</strong>
          <p style={{ margin: "2px 0" }}>1. Items that have been purchased cannot be returned.</p>
          <p style={{ margin: "2px 0 6px 0", fontWeight: "bold" }}>2. Payment Information :</p>
          <table style={{ marginLeft: "12px", lineHeight: "1.6" }}>
            <tbody>
              <tr>
                <td style={{ width: "90px" }}>Bank Code</td>
                <td>: {invoice.bankCode || "014"}</td>
              </tr>
              <tr>
                <td>Bank Name</td>
                <td>: {invoice.bankName || "BCA KCU Kramat Jaya"}</td>
              </tr>
              <tr>
                <td>Name Account</td>
                <td>: {invoice.bankAccountName || "BHUMI SELARAS MITRA"}</td>
              </tr>
              <tr>
                <td>Rek Number</td>
                <td style={{ fontWeight: "bold" }}>: {invoice.bankAccountNumber || "414-2485-676"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right column: FINANCIAL TOTALS */}
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <tbody>
              <tr>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #cbd5e1", fontWeight: "bold" }}>Subtotal</td>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #cbd5e1", width: "120px" }}>{formatCurrency(subtotal)}</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #cbd5e1" }}>Discount</td>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #cbd5e1" }}>{formatCurrency(discount)}</td>
              </tr>
              <tr style={{ background: "#f1f5f9" }}>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #cbd5e1", fontWeight: "bold" }}>After Discount</td>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #cbd5e1", fontWeight: "bold" }}>{formatCurrency(afterDiscount)}</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #cbd5e1" }}>PPN {invoice.ppnRate}%</td>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #cbd5e1" }}>{formatCurrency(ppnAmount)}</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #cbd5e1" }}>PPh {invoice.pphRate}%</td>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #cbd5e1" }}>{formatCurrency(pphAmount)}</td>
              </tr>
              {otherAmount > 0 && (
                <tr>
                  <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #cbd5e1" }}>Other</td>
                  <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #cbd5e1" }}>{formatCurrency(otherAmount)}</td>
                </tr>
              )}
              <tr style={{ background: "#1e3a8a", color: "#ffffff", fontWeight: "bold", fontSize: "12px" }}>
                <td style={{ padding: "6px 8px", textAlign: "right", border: "1px solid #1e3a8a" }}>TOTAL</td>
                <td style={{ padding: "6px 8px", textAlign: "right", border: "1px solid #1e3a8a" }}>{formatCurrency(totalAmount)}</td>
              </tr>
            </tbody>
          </table>

          {/* Signature section */}
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <p style={{ margin: "2px 0", fontSize: "11px" }}>Make all checks payable to</p>
            <strong style={{ fontSize: "12px" }}>PT. Bhumi Selaras Mitra</strong>
            <div style={{ height: "45px" }} />
            <strong style={{ textDecoration: "underline", fontSize: "12px" }}>
              ( {invoice.signerName || "Ari Wahyudi"} )
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerMasterManager({
  customers,
  setCustomers,
}: {
  customers: CustomerMaster[];
  setCustomers: React.Dispatch<React.SetStateAction<CustomerMaster[]>>;
}) {
  const [newCust, setNewCust] = useState<Partial<CustomerMaster>>({
    customerId: "",
    customerName: "",
    companyName: "",
    streetAddress: "",
    city: "",
    phone: "",
  });

  function addCustomer() {
    if (!newCust.customerId || !newCust.companyName) {
      alert("Customer ID dan Nama Perusahaan wajib diisi!");
      return;
    }
    const created: CustomerMaster = {
      id: "cust-" + Date.now(),
      customerId: newCust.customerId || "",
      customerName: newCust.customerName || "",
      companyName: newCust.companyName || "",
      streetAddress: newCust.streetAddress || "",
      city: newCust.city || "",
      phone: newCust.phone || "",
    };
    setCustomers((prev) => [...prev, created]);
    setNewCust({
      customerId: "",
      customerName: "",
      companyName: "",
      streetAddress: "",
      city: "",
      phone: "",
    });
  }

  function deleteCustomer(id: string) {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3>Customer Master Database (Sheet: Customer ID)</h3>
        <p>Kelola data daftar pelanggan untuk kemudahan auto-fill invoice.</p>
      </div>

      <h4 style={{ color: "#93c5fd", marginBottom: 12 }}>Tambah Customer Baru</h4>
      <div className={styles.editorGrid}>
        <label className={styles.fieldLabel}>
          <span>Customer ID</span>
          <input
            value={newCust.customerId}
            onChange={(e) => setNewCust((p) => ({ ...p, customerId: e.target.value }))}
            placeholder="e.g. 006"
          />
        </label>
        <label className={styles.fieldLabel}>
          <span>Customer Name</span>
          <input
            value={newCust.customerName}
            onChange={(e) => setNewCust((p) => ({ ...p, customerName: e.target.value }))}
            placeholder="e.g. Ibu Siska"
          />
        </label>
        <label className={styles.fieldLabel}>
          <span>Company Name</span>
          <input
            value={newCust.companyName}
            onChange={(e) => setNewCust((p) => ({ ...p, companyName: e.target.value }))}
            placeholder="e.g. PT. Inti Jaya"
          />
        </label>
        <label className={styles.fieldLabel}>
          <span>Street Address</span>
          <input
            value={newCust.streetAddress}
            onChange={(e) => setNewCust((p) => ({ ...p, streetAddress: e.target.value }))}
          />
        </label>
        <label className={styles.fieldLabel}>
          <span>City</span>
          <input
            value={newCust.city}
            onChange={(e) => setNewCust((p) => ({ ...p, city: e.target.value }))}
          />
        </label>
        <label className={styles.fieldLabel}>
          <span>Phone</span>
          <input
            value={newCust.phone}
            onChange={(e) => setNewCust((p) => ({ ...p, phone: e.target.value }))}
          />
        </label>
      </div>
      <button
        className={styles.successButton}
        onClick={addCustomer}
        type="button"
        style={{ marginTop: 12 }}
      >
        + Save New Customer
      </button>

      <h4 style={{ color: "#93c5fd", margin: "24px 0 12px" }}>List Master Customer</h4>
      <div style={{ overflowX: "auto" }}>
        <table className={styles.paperTable} style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Cust ID</th>
              <th>Customer Name</th>
              <th>Company Name</th>
              <th>Address</th>
              <th>City</th>
              <th>Phone</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.customerId}</strong>
                </td>
                <td>{c.customerName}</td>
                <td>{c.companyName}</td>
                <td>{c.streetAddress}</td>
                <td>{c.city}</td>
                <td>{c.phone}</td>
                <td>
                  <button
                    className={styles.dangerButton}
                    onClick={() => deleteCustomer(c.id)}
                    type="button"
                    style={{ padding: "2px 8px" }}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
