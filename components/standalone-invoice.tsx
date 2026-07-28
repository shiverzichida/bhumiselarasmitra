"use client";

import { useMemo, useState } from "react";
import logoImage from "@/logo-bsm.png";
import ttdSignImage from "@/ttd bsm sign.png";
import styles from "./workspace.module.css";
import { formatCurrency, formatDateLong } from "@/lib/format";
import type { CustomerMaster, InvoiceItemRow, StandaloneInvoice } from "@/lib/types";
import { generateSuggestedInvoiceNumber } from "@/lib/number-generator";

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
  const [tab, setTab] = useState<"rekap" | "editor" | "preview" | "customers">("rekap");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [includeSignature, setIncludeSignature] = useState(true);

  // Financial calculations for current invoice
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

  // Filtered invoices for Rekap List
  const filteredInvoices = useMemo(() => {
    return savedInvoices.filter((inv) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.companyName.toLowerCase().includes(q) ||
        inv.customerId.toLowerCase().includes(q);

      const matchMonth = !filterMonth || (inv.date && inv.date.startsWith(filterMonth));
      return matchSearch && matchMonth;
    });
  }, [savedInvoices, searchQuery, filterMonth]);

  // Financial metrics for Rekap Summary Cards
  const rekapMetrics = useMemo(() => {
    const totalCount = filteredInvoices.length;
    const totalRevenue = filteredInvoices.reduce((sum, inv) => {
      const sub = inv.items.reduce((s, item) => s + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
      const disc = Number(inv.discount || 0);
      const aftDisc = Math.max(0, sub - disc);
      const ppn = (aftDisc * (inv.ppnRate || 0)) / 100;
      const pph = (aftDisc * (inv.pphRate || 0)) / 100;
      return sum + (aftDisc + ppn - pph + Number(inv.otherAmount || 0));
    }, 0);

    const avgRevenue = totalCount > 0 ? totalRevenue / totalCount : 0;
    return { totalCount, totalRevenue, avgRevenue };
  }, [filteredInvoices]);

  function updateField<K extends keyof StandaloneInvoice>(key: K, value: StandaloneInvoice[K]) {
    setInvoice((prev) => ({ ...prev, [key]: value }));
  }

  function handleSuggestInvoiceNo() {
    const suggested = generateSuggestedInvoiceNumber(savedInvoices.length, invoice.date);
    updateField("invoiceNumber", suggested);
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
    const prevTitle = document.title;
    if (invoice.invoiceNumber) {
      document.title = invoice.invoiceNumber;
    }
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  }

  function handleCreateNew() {
    onNewInvoice();
    setTab("editor");
  }

  return (
    <div className={styles.editorStack}>
      {/* Top Module Sub-Nav & Actions */}
      <div className={styles.editorHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", width: "100%", boxSizing: "border-box", marginBottom: "18px" }}>
        <div className={styles.tabsNav} style={{ margin: 0, flexWrap: "wrap", gap: "8px" }}>
          <button
            className={`${styles.tabButton} ${tab === "rekap" ? styles.tabActive : ""}`}
            onClick={() => setTab("rekap")}
            type="button"
          >
            Invoice List & Rekap ({savedInvoices.length})
          </button>
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
            className={`${styles.tabButton} ${tab === "customers" ? styles.tabActive : ""}`}
            onClick={() => setTab("customers")}
            type="button"
          >
            Customer Database ({customers.length})
          </button>
        </div>

        <div className={styles.actionGroup} style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button className={styles.primaryButton} onClick={handleCreateNew} type="button" style={{ whiteSpace: "nowrap" }}>
            + Create New Invoice
          </button>
          {tab === "editor" && (
            <button className={styles.successButton} onClick={onSaveInvoice} type="button" style={{ whiteSpace: "nowrap" }}>
              Save Invoice
            </button>
          )}
          {tab === "preview" && (
            <button className={styles.primaryButton} onClick={printInvoice} type="button" style={{ whiteSpace: "nowrap" }}>
              🖨️ Print Invoice
            </button>
          )}
        </div>
      </div>

      {tab === "editor" && (
        <section className={styles.panel}>
          <div className={styles.panelHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3>Standalone Invoice Editor</h3>
              <p>Sama persis dengan template `Invoice 001` PT. Bhumi Selaras Mitra.</p>
            </div>
            <button
              className={styles.outlineButton}
              onClick={() => setTab("rekap")}
              type="button"
            >
              ← Back to Invoice List
            </button>
          </div>

          <h4 style={{ color: "#93c5fd", marginBottom: 12 }}>Invoice Header & Metadata</h4>
          <div className={styles.editorGrid}>
            <label className={styles.fieldLabel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Invoice No.</span>
                <button
                  type="button"
                  onClick={handleSuggestInvoiceNo}
                  style={{
                    background: "rgba(59, 130, 246, 0.2)",
                    color: "#93c5fd",
                    border: "1px solid #3b82f6",
                    borderRadius: "4px",
                    padding: "2px 8px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  🪄 Auto Suggest
                </button>
              </div>
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
          <div className={styles.previewControls} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e293b", padding: "12px 16px", borderRadius: "10px", border: "1px solid #334155", flexWrap: "wrap", gap: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "#f8fafc", fontSize: "14px", cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={includeSignature}
                onChange={(e) => setIncludeSignature(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "#2563eb", cursor: "pointer" }}
              />
              <span><strong>Sertakan Tanda Tangan Digital Resmi</strong> (PT. Bhumi Selaras Mitra)</span>
            </label>
            <button className={styles.primaryButton} onClick={printInvoice} type="button">
              🖨️ Print / Cetak PDF
            </button>
          </div>

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
              includeSignature={includeSignature}
            />
          </div>
        </div>
      )}

      {tab === "rekap" && (
        <section className={styles.panel}>
          {/* Rekap Header & Metrics */}
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "20px", color: "#f8fafc", margin: "0 0 4px" }}>Rekapitulasi Invoice (Sheet: Rekap Invoice)</h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>Daftar lengkap invoice yang telah dibuat dan tersimpan.</p>
          </div>

          {/* Stat Summary Cards */}
          <div className={styles.statsRow} style={{ marginBottom: "24px" }}>
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.toneBlue}`}>●</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 4px" }}>Total Nilai Tagihan</h3>
                <p style={{ color: "#38bdf8", fontSize: "18px", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>{formatCurrency(rekapMetrics.totalRevenue)}</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.toneGreen}`}>●</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 4px" }}>Invoice Terbit</h3>
                <p style={{ color: "#4ade80", fontSize: "18px", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>{rekapMetrics.totalCount} Dokumen</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.toneAmber}`}>●</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 4px" }}>Rata-rata Nilai Invoice</h3>
                <p style={{ color: "#fbbf24", fontSize: "18px", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>{formatCurrency(rekapMetrics.avgRevenue)}</p>
              </div>
            </div>
          </div>

          {/* Search Bar & Filters */}
          <div className={styles.actionBar} style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", width: "100%" }}>
            <div className={styles.searchBox} style={{ flex: "1 1 280px", maxWidth: "450px" }}>
              <span className={styles.searchIcon}>⌕</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari berdasarkan No Invoice, Nama Customer, Perusahaan..."
              />
            </div>
            <div className={styles.actionGroup} style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#cbd5e1", fontSize: "13px", whiteSpace: "nowrap" }}>
                <span>Filter Bulan:</span>
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  style={{
                    background: "#0f172a",
                    color: "#f8fafc",
                    border: "1px solid #334155",
                    padding: "8px 12px",
                    borderRadius: "6px",
                  }}
                />
              </label>
              {(searchQuery || filterMonth) && (
                <button
                  className={styles.outlineButton}
                  onClick={() => {
                    setSearchQuery("");
                    setFilterMonth("");
                  }}
                  type="button"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* Invoices Table */}
          <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid #334155" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap", fontSize: "14px", color: "#f8fafc" }}>
              <thead>
                <tr style={{ background: "#1e293b", color: "#f8fafc", textAlign: "left", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "14px 16px", borderBottom: "2px solid #334155" }}>No</th>
                  <th style={{ padding: "14px 16px", borderBottom: "2px solid #334155" }}>Date</th>
                  <th style={{ padding: "14px 16px", borderBottom: "2px solid #334155" }}>Invoice No</th>
                  <th style={{ padding: "14px 16px", borderBottom: "2px solid #334155" }}>Customer Name</th>
                  <th style={{ padding: "14px 16px", borderBottom: "2px solid #334155" }}>Company Name</th>
                  <th style={{ padding: "14px 16px", borderBottom: "2px solid #334155", textAlign: "right" }}>Total Amount</th>
                  <th style={{ padding: "14px 16px", borderBottom: "2px solid #334155", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map((inv, index) => {
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
                      <tr key={inv.invoiceNumber + index} style={{ background: index % 2 === 0 ? "#0f172a" : "#1e293b" }}>
                        <td style={{ padding: "14px 16px", borderBottom: "1px solid #334155", color: "#94a3b8" }}>{index + 1}</td>
                        <td style={{ padding: "14px 16px", borderBottom: "1px solid #334155", color: "#cbd5e1" }}>{inv.date}</td>
                        <td style={{ padding: "14px 16px", borderBottom: "1px solid #334155" }}>
                          <strong style={{ color: "#60a5fa" }}>{inv.invoiceNumber}</strong>
                        </td>
                        <td style={{ padding: "14px 16px", borderBottom: "1px solid #334155", color: "#ffffff", fontWeight: "600" }}>{inv.customerName}</td>
                        <td style={{ padding: "14px 16px", borderBottom: "1px solid #334155", color: "#e2e8f0" }}>{inv.companyName}</td>
                        <td style={{ padding: "14px 16px", borderBottom: "1px solid #334155", textAlign: "right", fontWeight: "bold", color: "#38bdf8", fontSize: "15px" }}>
                          {formatCurrency(tot)}
                        </td>
                        <td style={{ padding: "14px 16px", borderBottom: "1px solid #334155", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button
                              style={{
                                background: "#2563eb",
                                color: "#ffffff",
                                border: 0,
                                borderRadius: "8px",
                                padding: "8px 14px",
                                fontWeight: "600",
                                fontSize: "13px",
                                cursor: "pointer",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                              }}
                              onClick={() => {
                                onLoadInvoice(inv);
                                setTab("editor");
                              }}
                              type="button"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              style={{
                                background: "#0284c7",
                                color: "#ffffff",
                                border: 0,
                                borderRadius: "8px",
                                padding: "8px 14px",
                                fontWeight: "600",
                                fontSize: "13px",
                                cursor: "pointer",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                              }}
                              onClick={() => {
                                onLoadInvoice(inv);
                                setTab("preview");
                              }}
                              type="button"
                            >
                              👁️ Preview
                            </button>
                            <button
                              style={{
                                background: "#dc2626",
                                color: "#ffffff",
                                border: 0,
                                borderRadius: "8px",
                                padding: "8px 12px",
                                fontWeight: "600",
                                fontSize: "13px",
                                cursor: "pointer",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                              }}
                              onClick={() => onDeleteInvoice(inv.invoiceNumber)}
                              type="button"
                            >
                              🗑️ Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} style={{ textAlign: "center", padding: 32, color: "#94a3b8", fontSize: "15px" }}>
                      Tidak ada Invoice yang sesuai dengan kriteria pencarian.
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
  includeSignature = true,
}: {
  invoice: StandaloneInvoice;
  subtotal: number;
  discount: number;
  afterDiscount: number;
  ppnAmount: number;
  pphAmount: number;
  otherAmount: number;
  totalAmount: number;
  includeSignature?: boolean;
}) {
  return (
    <div
      className={styles.invoicePrintContainer}
      style={{
        background: "#ffffff",
        color: "#000000",
        padding: "16px",
        fontFamily: "Arial, sans-serif",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Header layout matching sheet 'Invoice 001' */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "12px",
          borderBottom: "2px solid #000000",
          paddingBottom: "10px",
          marginBottom: "14px",
          alignItems: "flex-start",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <img src={logoImage.src} alt="Bhumi Logo" style={{ height: "55px", objectFit: "contain" }} />
          <div>
            <h2 style={{ margin: 0, color: "#000000", fontSize: "18px", fontWeight: "bold" }}>
              PT. BHUMI SELARAS MITRA
            </h2>
            <p style={{ margin: "2px 0", fontSize: "10px", color: "#000000", fontWeight: "bold" }}>
              Menteng Square Office Tower A Lt 2 Unit AK 8, Kel. Kenari, Kec. Senen
            </p>
            <p style={{ margin: "2px 0", fontSize: "10px", color: "#000000", fontWeight: "bold" }}>
              Kota Adm. Jakarta Pusat, Provinsi DKI Jakarta 10430
            </p>
            <p style={{ margin: "2px 0", fontSize: "10px", color: "#000000", fontWeight: "bold" }}>
              Phone: +62-811-8627-047 | Email: pt.bhumiselarasmitra@gmail.com
            </p>
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: "190px" }}>
          <h1 style={{ margin: 0, fontSize: "24px", letterSpacing: "1px", color: "#000000", fontWeight: "bold" }}>INVOICE</h1>
          <table style={{ margin: "4px 0 0 auto", fontSize: "10px", borderCollapse: "collapse", lineHeight: "1.3", color: "#000000" }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: "bold", paddingRight: "6px", textAlign: "right", color: "#000000" }}>DATE :</td>
                <td style={{ textAlign: "left", color: "#000000", fontWeight: "bold" }}>{invoice.date ? formatDateLong(invoice.date) : "-"}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", paddingRight: "6px", textAlign: "right", color: "#000000" }}>INVOICE NO :</td>
                <td style={{ textAlign: "left", fontWeight: "bold", fontSize: "10px", wordBreak: "break-all", color: "#000000" }}>
                  {invoice.invoiceNumber || "-"}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", paddingRight: "6px", textAlign: "right", color: "#000000" }}>CUSTOMER ID :</td>
                <td style={{ textAlign: "left", color: "#000000", fontWeight: "bold" }}>{invoice.customerId || "-"}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", paddingRight: "6px", textAlign: "right", color: "#000000" }}>DUE DATE :</td>
                <td style={{ textAlign: "left", color: "#000000", fontWeight: "bold" }}>{invoice.dueDate ? formatDateLong(invoice.dueDate) : "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* BILL TO */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #000000",
          borderRadius: "4px",
          padding: "8px 12px",
          marginBottom: "14px",
          fontSize: "11px",
          boxSizing: "border-box",
          color: "#000000",
        }}
      >
        <strong
          style={{
            color: "#000000",
            borderBottom: "1.5px solid #000000",
            display: "inline-block",
            paddingBottom: "2px",
            marginBottom: "4px",
            fontWeight: "bold",
          }}
        >
          BILL TO
        </strong>
        <table style={{ width: "100%", fontSize: "11px", lineHeight: "1.4", color: "#000000" }}>
          <tbody>
            <tr>
              <td style={{ width: "110px", color: "#000000", fontWeight: "bold" }}>Name Mr/Mrs.</td>
              <td style={{ width: "10px", color: "#000000", fontWeight: "bold" }}>:</td>
              <td style={{ fontWeight: "bold", color: "#000000" }}>{invoice.customerName || "-"}</td>
            </tr>
            <tr>
              <td style={{ color: "#000000", fontWeight: "bold" }}>Company Name</td>
              <td style={{ color: "#000000", fontWeight: "bold" }}>:</td>
              <td style={{ fontWeight: "bold", color: "#000000" }}>{invoice.companyName || "-"}</td>
            </tr>
            <tr>
              <td style={{ color: "#000000", fontWeight: "bold" }}>Street Address</td>
              <td style={{ color: "#000000", fontWeight: "bold" }}>:</td>
              <td style={{ color: "#000000", fontWeight: "bold" }}>{invoice.streetAddress || "-"}</td>
            </tr>
            <tr>
              <td style={{ color: "#000000", fontWeight: "bold" }}>City</td>
              <td style={{ color: "#000000", fontWeight: "bold" }}>:</td>
              <td style={{ color: "#000000", fontWeight: "bold" }}>{invoice.city || "-"}</td>
            </tr>
            <tr>
              <td style={{ color: "#000000", fontWeight: "bold" }}>Phone</td>
              <td style={{ color: "#000000", fontWeight: "bold" }}>:</td>
              <td style={{ color: "#000000", fontWeight: "bold" }}>{invoice.phone || "-"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ITEMS TABLE */}
      <table
        style={{
          width: "100%",
          tableLayout: "fixed",
          borderCollapse: "collapse",
          marginBottom: "14px",
          fontSize: "10px",
          boxSizing: "border-box",
          color: "#000000",
        }}
      >
        <thead>
          <tr style={{ background: "#ffffff", color: "#000000", borderBottom: "2px solid #000000" }}>
            <th style={{ padding: "6px 4px", textAlign: "center", border: "1px solid #000000", width: "6%", color: "#000000", fontWeight: "bold" }}>NO</th>
            <th style={{ padding: "6px 6px", textAlign: "left", border: "1px solid #000000", width: "44%", color: "#000000", fontWeight: "bold" }}>DESCRIPTION</th>
            <th style={{ padding: "6px 4px", textAlign: "center", border: "1px solid #000000", width: "8%", color: "#000000", fontWeight: "bold" }}>QTY</th>
            <th style={{ padding: "6px 4px", textAlign: "center", border: "1px solid #000000", width: "8%", color: "#000000", fontWeight: "bold" }}>UNIT</th>
            <th style={{ padding: "6px 6px", textAlign: "right", border: "1px solid #000000", width: "17%", color: "#000000", fontWeight: "bold" }}>PRICE (Rp)</th>
            <th style={{ padding: "6px 6px", textAlign: "right", border: "1px solid #000000", width: "17%", color: "#000000", fontWeight: "bold" }}>AMOUNT (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => {
            const q = Number(item.quantity || 0);
            const p = Number(item.unitPrice || 0);
            const amt = q * p;
            return (
              <tr key={index} style={{ borderBottom: "1px solid #000000", color: "#000000" }}>
                <td style={{ padding: "6px 4px", textAlign: "center", border: "1px solid #000000", color: "#000000", fontWeight: "bold" }}>{index + 1}</td>
                <td style={{ padding: "6px 6px", border: "1px solid #000000", wordBreak: "break-word", color: "#000000", fontWeight: "bold" }}>{item.description || "-"}</td>
                <td style={{ padding: "6px 4px", textAlign: "center", border: "1px solid #000000", color: "#000000", fontWeight: "bold" }}>{item.quantity}</td>
                <td style={{ padding: "6px 4px", textAlign: "center", border: "1px solid #000000", color: "#000000", fontWeight: "bold" }}>{item.unit}</td>
                <td style={{ padding: "6px 6px", textAlign: "right", border: "1px solid #000000", color: "#000000", fontWeight: "bold" }}>{formatCurrency(p)}</td>
                <td style={{ padding: "6px 6px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#000000" }}>{formatCurrency(amt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* SUMMARY & PAYMENT INFO */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px", fontSize: "11px", color: "#000000" }}>
        {/* Left column: ATTENTION & PAYMENT INFO */}
        <div style={{ border: "1px solid #000000", padding: "10px", borderRadius: "4px", background: "#ffffff", color: "#000000" }}>
          <strong style={{ color: "#000000", display: "block", marginBottom: "4px", fontWeight: "bold" }}>ATTENTION :</strong>
          <p style={{ margin: "2px 0", color: "#000000", fontWeight: "bold" }}>1. Items that have been purchased cannot be returned.</p>
          <p style={{ margin: "2px 0 6px 0", fontWeight: "bold", color: "#000000" }}>2. Payment Information :</p>
          <table style={{ marginLeft: "12px", lineHeight: "1.6", color: "#000000" }}>
            <tbody>
              <tr>
                <td style={{ width: "90px", color: "#000000", fontWeight: "bold" }}>Bank Code</td>
                <td style={{ color: "#000000", fontWeight: "bold" }}>: {invoice.bankCode || "014"}</td>
              </tr>
              <tr>
                <td style={{ color: "#000000", fontWeight: "bold" }}>Bank Name</td>
                <td style={{ color: "#000000", fontWeight: "bold" }}>: {invoice.bankName || "BCA KCU Kramat Jaya"}</td>
              </tr>
              <tr>
                <td style={{ color: "#000000", fontWeight: "bold" }}>Name Account</td>
                <td style={{ color: "#000000", fontWeight: "bold" }}>: {invoice.bankAccountName || "BHUMI SELARAS MITRA"}</td>
              </tr>
              <tr>
                <td style={{ color: "#000000", fontWeight: "bold" }}>Rek Number</td>
                <td style={{ fontWeight: "bold", color: "#000000" }}>: {invoice.bankAccountNumber || "414-2485-676"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right column: FINANCIAL TOTALS */}
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", color: "#000000" }}>
            <tbody>
              <tr>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#000000" }}>Subtotal</td>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #000000", width: "120px", fontWeight: "bold", color: "#000000" }}>{formatCurrency(subtotal)}</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#000000" }}>Discount</td>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#000000" }}>{formatCurrency(discount)}</td>
              </tr>
              <tr style={{ background: "#ffffff" }}>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#000000" }}>After Discount</td>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#000000" }}>{formatCurrency(afterDiscount)}</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#000000" }}>PPN {invoice.ppnRate}%</td>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#000000" }}>{formatCurrency(ppnAmount)}</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#000000" }}>PPh {invoice.pphRate}%</td>
                <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#000000" }}>{formatCurrency(pphAmount)}</td>
              </tr>
              {otherAmount > 0 && (
                <tr>
                  <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#000000" }}>Other</td>
                  <td style={{ padding: "4px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#000000" }}>{formatCurrency(otherAmount)}</td>
                </tr>
              )}
              <tr style={{ background: "#ffffff", color: "#000000", fontWeight: "bold", fontSize: "12px" }}>
                <td style={{ padding: "6px 8px", textAlign: "right", border: "2px solid #000000", color: "#000000", fontWeight: "bold" }}>TOTAL</td>
                <td style={{ padding: "6px 8px", textAlign: "right", border: "2px solid #000000", color: "#000000", fontWeight: "bold" }}>{formatCurrency(totalAmount)}</td>
              </tr>
            </tbody>
          </table>

          {/* Signature section with conditional digital signature image */}
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <p style={{ margin: "2px 0", fontSize: "10px" }}>Make all checks payable to</p>
            <strong style={{ fontSize: "11px" }}>PT. Bhumi Selaras Mitra</strong>
            
            <div style={{ height: "65px", display: "flex", justifyContent: "center", alignItems: "center", margin: "4px 0" }}>
              {includeSignature ? (
                <img
                  src={ttdSignImage.src}
                  alt="Digital Signature"
                  style={{ height: "60px", objectFit: "contain" }}
                />
              ) : (
                <div style={{ height: "60px" }} />
              )}
            </div>

            <strong style={{ textDecoration: "underline", fontSize: "11px" }}>
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

      <h4 style={{ color: "#93c5fd", margin: "28px 0 14px", fontSize: "16px" }}>List Master Customer</h4>
      <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid #334155" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap", fontSize: "14px", color: "#f8fafc" }}>
          <thead>
            <tr style={{ background: "#1e293b", color: "#f8fafc", textAlign: "left", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <th style={{ padding: "14px 16px", borderBottom: "2px solid #334155" }}>Cust ID</th>
              <th style={{ padding: "14px 16px", borderBottom: "2px solid #334155" }}>Customer Name</th>
              <th style={{ padding: "14px 16px", borderBottom: "2px solid #334155" }}>Company Name</th>
              <th style={{ padding: "14px 16px", borderBottom: "2px solid #334155" }}>Address</th>
              <th style={{ padding: "14px 16px", borderBottom: "2px solid #334155" }}>City</th>
              <th style={{ padding: "14px 16px", borderBottom: "2px solid #334155" }}>Phone</th>
              <th style={{ padding: "14px 16px", borderBottom: "2px solid #334155", textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, index) => (
              <tr key={c.id} style={{ background: index % 2 === 0 ? "#0f172a" : "#1e293b" }}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid #334155" }}>
                  <strong style={{ color: "#38bdf8" }}>{c.customerId}</strong>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid #334155", color: "#ffffff", fontWeight: "600" }}>{c.customerName}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid #334155", color: "#e2e8f0" }}>{c.companyName}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid #334155", color: "#cbd5e1" }}>{c.streetAddress}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid #334155", color: "#cbd5e1" }}>{c.city}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid #334155", color: "#cbd5e1" }}>{c.phone}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid #334155", textAlign: "center" }}>
                  <button
                    style={{
                      background: "#dc2626",
                      color: "#ffffff",
                      border: 0,
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontWeight: "600",
                      fontSize: "13px",
                      cursor: "pointer",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    }}
                    onClick={() => deleteCustomer(c.id)}
                    type="button"
                  >
                    🗑️ Hapus
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
