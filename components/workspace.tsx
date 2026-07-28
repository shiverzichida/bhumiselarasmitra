"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import logoImage from "@/logo-bsm.png";
import styles from "./workspace.module.css";
import { formatCurrency, formatDateLong, safeFileName } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { mergeWithSample, sampleDraft, sampleStandaloneInvoice, sampleCustomers, STORAGE_KEY, INVOICE_STORAGE_KEY, CUSTOMERS_STORAGE_KEY } from "@/lib/sample-data";
import { mapShipmentToState, mapStateToShipmentPayload } from "@/lib/shipment-mappers";
import type { CargoRow, ContainerRow, CustomerMaster, InvoiceItemRow, ShipmentDraft, ShipmentListItem, StandaloneInvoice } from "@/lib/types";
import { StandaloneInvoiceModule } from "@/components/standalone-invoice";
import { generateSuggestedBLNumber, generateSuggestedSINumber } from "@/lib/number-generator";


type ActiveView = "dashboard" | "editor" | "invoice" | "history";
type EditorTab = "general" | "parties" | "routing" | "cargo" | "preview";
type ActiveDoc = "si" | "bl" | "invoice";

const SAVED_INVOICES_KEY = "bhumi-docs-saved-invoices-list-v1";
const LOCAL_HISTORY_LOGS_KEY = "bhumi_local_history_logs_v1";
const supabase = getSupabaseBrowserClient();
const db = supabase as any;

export function Workspace() {
  const [draft, setDraft] = useState<ShipmentDraft>(sampleDraft);
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [editorTab, setEditorTab] = useState<EditorTab>("general");
  const [activeDoc, setActiveDoc] = useState<ActiveDoc>("si");
  const router = useRouter();
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState("Memeriksa sesi login...");
  const [cloudStatus, setCloudStatus] = useState("Login dulu untuk memuat data dari Supabase.");
  const [cloudShipments, setCloudShipments] = useState<ShipmentListItem[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);

  // Standalone Invoice & Customer States
  const [standaloneInvoice, setStandaloneInvoice] = useState<StandaloneInvoice>(sampleStandaloneInvoice);
  const [customers, setCustomers] = useState<CustomerMaster[]>(sampleCustomers);
  const [savedInvoices, setSavedInvoices] = useState<StandaloneInvoice[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // History Log States
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyPageSize, setHistoryPageSize] = useState(5);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [localHistoryLogs, setLocalHistoryLogs] = useState<ShipmentListItem[]>([]);


  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setDraft(mergeWithSample(JSON.parse(saved) as Partial<ShipmentDraft>));
      } catch {
        setDraft(sampleDraft);
      }
    }

    const savedInv = window.localStorage.getItem(INVOICE_STORAGE_KEY);
    if (savedInv) {
      try {
        setStandaloneInvoice(JSON.parse(savedInv));
      } catch {
        setStandaloneInvoice(sampleStandaloneInvoice);
      }
    }

    const savedCust = window.localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (savedCust) {
      try {
        setCustomers(JSON.parse(savedCust));
      } catch {
        setCustomers(sampleCustomers);
      }
    }

    const savedList = window.localStorage.getItem(SAVED_INVOICES_KEY);
    if (savedList) {
      try {
        setSavedInvoices(JSON.parse(savedList));
      } catch {
        setSavedInvoices([sampleStandaloneInvoice]);
      }
    } else {
      setSavedInvoices([sampleStandaloneInvoice]);
    }

    const savedHistory = window.localStorage.getItem(LOCAL_HISTORY_LOGS_KEY);
    if (savedHistory) {
      try {
        setLocalHistoryLogs(JSON.parse(savedHistory));
      } catch {
        setLocalHistoryLogs([]);
      }
    }

    if (!supabase) {
      setAuthStatus("Supabase belum dikonfigurasi.");
      setCloudStatus("Tambahkan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      router.replace("/login");
      return;
    }


    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setAuthStatus(`Session check failed: ${error.message}`);
        return;
      }
      const email = data.session?.user?.email ?? null;
      setSessionEmail(email);
      setAuthStatus(email ? `Logged in as ${email}` : "Belum login.");
      if (email) {
        void refreshCloudShipments(email);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email ?? null;
      setSessionEmail(email);
      setAuthStatus(email ? `Logged in as ${email}` : "Belum login.");
      if (email) {
        void refreshCloudShipments(email);
      } else {
        setCloudShipments([]);
        setCloudStatus("Login dulu untuk memuat data dari Supabase.");
        router.replace("/login");
      }
    });

    return () => data.subscription.unsubscribe();
  }, [router]);

  const invoiceGrandTotal = useMemo(
    () => draft.invoiceItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0),
    [draft.invoiceItems],
  );

  const statCards = useMemo(() => {
    const total = cloudShipments.length;
    const collectCount = cloudShipments.filter((item) => item.si_number || item.bl_number || item.invoice_number).length;
    const lastIssue = cloudShipments[0]?.issue_date ? formatDateLong(cloudShipments[0].issue_date) : "No data";

    return [
      { label: "Total Shipment", value: String(total), tone: "blue" },
      { label: "Saved Drafts", value: String(collectCount), tone: "green" },
      { label: "Latest Issue", value: lastIssue, tone: "amber" },
    ];
  }, [cloudShipments]);

  const filteredShipments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return cloudShipments;
    return cloudShipments.filter((item) =>
      [item.document_batch, item.si_number, item.bl_number, item.invoice_number]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [cloudShipments, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredShipments.length / pageSize));
  const pagedShipments = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredShipments.slice(start, start + pageSize);
  }, [filteredShipments, currentPage, pageSize, totalPages]);

  function addHistoryLog(item: {
    batch: string;
    si: string;
    bl: string;
    invoice: string;
    changedFields: string;
  }) {
    const newEntry: ShipmentListItem = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      document_batch: item.batch || "Local Batch",
      si_number: item.si || null,
      bl_number: item.bl || null,
      invoice_number: item.invoice || null,
      issue_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_email: sessionEmail ?? "Operator (Local)",
      changed_fields: item.changedFields,
    };

    setLocalHistoryLogs((prev) => {
      const updated = [newEntry, ...prev].slice(0, 100);
      window.localStorage.setItem(LOCAL_HISTORY_LOGS_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  const combinedHistory = useMemo(() => {
    const list: ShipmentListItem[] = [...localHistoryLogs];

    cloudShipments.forEach((item) => {
      if (!list.some((existing) => existing.id === item.id)) {
        list.push({
          ...item,
          user_email: item.user_email || sessionEmail || "Operator (Supabase)",
          changed_fields: item.changed_fields || "Header B/L, Shipper & Consignee, Routing, Cargo Summary",
        });
      }
    });

    return list.sort((a, b) => {
      const timeA = new Date(a.updated_at || a.issue_date || 0).getTime();
      const timeB = new Date(b.updated_at || b.issue_date || 0).getTime();
      return timeB - timeA;
    });
  }, [localHistoryLogs, cloudShipments, sessionEmail]);

  const filteredHistory = useMemo(() => {
    const q = historySearchQuery.trim().toLowerCase();
    if (!q) return combinedHistory;
    return combinedHistory.filter((item) =>
      [
        item.document_batch,
        item.si_number,
        item.bl_number,
        item.invoice_number,
        item.user_email,
        item.changed_fields,
      ]
        .filter(Boolean)
        .some((val) => val!.toLowerCase().includes(q)),
    );
  }, [combinedHistory, historySearchQuery]);

  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / historyPageSize));
  const pagedHistory = useMemo(() => {
    const safePage = Math.min(historyCurrentPage, historyTotalPages);
    const start = (safePage - 1) * historyPageSize;
    return filteredHistory.slice(start, start + historyPageSize);
  }, [filteredHistory, historyCurrentPage, historyPageSize, historyTotalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  useEffect(() => {
    function handleBeforePrint() {
      setIsPrinting(true);
    }

    function handleAfterPrint() {
      setIsPrinting(false);
    }

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  function updateField<K extends keyof ShipmentDraft>(key: K, value: ShipmentDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function getActiveDocLabel(doc: ActiveDoc) {
    return doc === "si" ? "Shipping Instruction" : doc === "bl" ? "Bill of Lading" : "Invoice";
  }

  function printActiveDocument() {
    setIsPrinting(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.print();
      });
    });
  }

  function updateArrayRow<T extends ContainerRow | CargoRow | InvoiceItemRow>(
    key: "containers" | "cargo" | "invoiceItems",
    index: number,
    field: keyof T,
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      [key]: current[key].map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    }));
  }

  function addRow(key: "containers" | "cargo" | "invoiceItems") {
    setDraft((current) => ({
      ...current,
      [key]:
        key === "containers"
          ? [...current.containers, newContainer()]
          : key === "cargo"
            ? [...current.cargo, newCargo()]
            : [...current.invoiceItems, newInvoiceItem()],
    }));
  }

  function removeRow(key: "containers" | "cargo" | "invoiceItems", index: number) {
    setDraft((current) => ({
      ...current,
      [key]: current[key].filter((_, rowIndex) => rowIndex !== index),
    }));
  }

  function saveDraftLocal() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    addHistoryLog({
      batch: draft.documentBatch || "Draft Lokal",
      si: draft.siNumber || "-",
      bl: draft.blNumber || "-",
      invoice: draft.invoiceNumber || "-",
      changedFields: `Draft Disimpan (Shipper: ${draft.shipper ? draft.shipper.slice(0, 18) + "..." : "-"}, Vessel: ${draft.vessel || "-"})`,
    });
    setCloudStatus("Draft saved locally.");
  }

  function handleSaveStandaloneInvoice() {
    window.localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(standaloneInvoice));
    
    // Update or add to savedInvoices list
    setSavedInvoices((prev) => {
      const idx = prev.findIndex((i) => i.invoiceNumber === standaloneInvoice.invoiceNumber);
      let updatedList;
      if (idx >= 0) {
        updatedList = prev.map((item, i) => (i === idx ? standaloneInvoice : item));
      } else {
        updatedList = [standaloneInvoice, ...prev];
      }
      window.localStorage.setItem(SAVED_INVOICES_KEY, JSON.stringify(updatedList));
      return updatedList;
    });

    addHistoryLog({
      batch: "Rekap Invoice",
      si: draft.siNumber || "-",
      bl: draft.blNumber || "-",
      invoice: standaloneInvoice.invoiceNumber || "-",
      changedFields: `Pembaruan Standalone Invoice (${standaloneInvoice.companyName || standaloneInvoice.customerName || "-"})`,
    });

    setCloudStatus(`Invoice ${standaloneInvoice.invoiceNumber} berhasil disimpan.`);
    alert(`Invoice ${standaloneInvoice.invoiceNumber} berhasil disimpan ke Rekap Invoice!`);
  }

  function handleLoadStandaloneInvoice(inv: StandaloneInvoice) {
    setStandaloneInvoice(inv);
    window.localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(inv));
  }

  function handleNewStandaloneInvoice() {
    const nextNo = `INV/${String(savedInvoices.length + 55).padStart(3, "0")}/BSM/INVVII/2026`;
    const newInv: StandaloneInvoice = {
      ...structuredClone(sampleStandaloneInvoice),
      invoiceNumber: nextNo,
      date: new Date().toISOString().split("T")[0],
      dueDate: new Date().toISOString().split("T")[0],
    };
    setStandaloneInvoice(newInv);
    window.localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(newInv));
  }

  function handleSuggestBLNo() {
    const suggested = generateSuggestedBLNumber(cloudShipments.length, draft.issueDate);
    updateField("blNumber", suggested);
  }

  function handleSuggestSINo() {
    const suggested = generateSuggestedSINumber(cloudShipments.length, draft.issueDate);
    updateField("siNumber", suggested);
  }

  function handleDeleteStandaloneInvoice(invNo: string) {
    if (!confirm(`Hapus Invoice ${invNo} dari rekap?`)) return;
    setSavedInvoices((prev) => {
      const filtered = prev.filter((i) => i.invoiceNumber !== invNo);
      window.localStorage.setItem(SAVED_INVOICES_KEY, JSON.stringify(filtered));
      return filtered;
    });
  }

  useEffect(() => {
    window.localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
  }, [customers]);

  function loadSample() {
    setDraft(structuredClone(sampleDraft));
    setActiveView("editor");
    setEditorTab("general");
    setCloudStatus("Sample loaded.");
  }

  function resetDraft() {
    window.localStorage.removeItem(STORAGE_KEY);
    setDraft(structuredClone(sampleDraft));
    setCloudStatus("Draft reset ke sample.");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(draft.documentBatch || "bhumi-docs")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function signOut() {
    if (!supabase) {
      router.replace("/login");
      return;
    }
    await supabase.auth.signOut();
    setAuthStatus("Logged out.");
    router.replace("/login");
  }

  async function refreshCloudShipments(overrideEmail?: string | null) {
    const activeEmail = overrideEmail ?? sessionEmail;
    if (!activeEmail && supabase) return;
    setCloudStatus("Memuat daftar shipment...");
    let { data, error } = await db
      .from("shipments")
      .select("id, document_batch, si_number, bl_number, invoice_number, issue_date, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error && (error.message.includes("JWT") || error.message.includes("jwt"))) {
      try {
        if (supabase) await supabase.auth.refreshSession();
        const retryRes = await db
          .from("shipments")
          .select("id, document_batch, si_number, bl_number, invoice_number, issue_date, updated_at")
          .order("updated_at", { ascending: false })
          .limit(50);
        data = retryRes.data;
        error = retryRes.error;
      } catch {
        // Continue
      }
    }

    if (error) {
      setCloudStatus(`Gagal memuat data: ${error.message}`);
      return;
    }
    setCloudShipments((data ?? []) as ShipmentListItem[]);
    setCloudStatus(`${data?.length ?? 0} shipment tersimpan.`);
  }

  async function saveToCloud() {
    if (!sessionEmail) {
      setCloudStatus("Login dulu sebelum save ke cloud.");
      return;
    }
    setIsBusy(true);
    setCloudStatus("Saving shipment to Supabase...");
    const shipmentPayload = mapStateToShipmentPayload(draft);
    let shipmentId = draft.id;

    try {
      if (shipmentId) {
        const { error } = await db.from("shipments").update(shipmentPayload).eq("id", shipmentId);
        if (error) throw error;
      } else {
        const { data, error } = await db.from("shipments").insert(shipmentPayload).select("id").single();
        if (error) throw error;
        shipmentId = data.id as string;
        setDraft((current) => ({ ...current, id: shipmentId }));
      }

      await replaceChildRows(
        "shipment_containers",
        shipmentId,
        draft.containers.map((row, index) => ({
          shipment_id: shipmentId,
          container_number: row.containerNumber,
          seal_number: row.sealNumber,
          container_type: row.type,
          gross_weight: row.grossWeight,
          net_weight: row.netWeight,
          measurement: row.measurement,
          sort_order: index,
        })),
      );

      await replaceChildRows(
        "shipment_cargo_items",
        shipmentId,
        draft.cargo.map((row, index) => ({
          shipment_id: shipmentId,
          marks: row.marks,
          description: row.description,
          packages: row.packages,
          gross_weight: row.grossWeight,
          net_weight: row.netWeight,
          measurement: row.measurement,
          sort_order: index,
        })),
      );

      await replaceChildRows(
        "invoice_items",
        shipmentId,
        draft.invoiceItems.map((row, index) => ({
          shipment_id: shipmentId,
          description: row.description,
          quantity: Number(row.quantity || 0),
          unit: row.unit,
          unit_price: Number(row.unitPrice || 0),
          sort_order: index,
        })),
      );

      saveDraftLocal();
      addHistoryLog({
        batch: draft.documentBatch || "Cloud Batch",
        si: draft.siNumber || "-",
        bl: draft.blNumber || "-",
        invoice: draft.invoiceNumber || "-",
        changedFields: `Sinkronisasi Cloud Supabase (Batch: ${draft.documentBatch}, B/L: ${draft.blNumber || "-"})`,
      });
      setCloudStatus(`Shipment ${draft.documentBatch} saved to Supabase.`);
      await refreshCloudShipments();
      setActiveView("dashboard");
    } catch (error) {
      setCloudStatus(`Save failed: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function replaceChildRows(table: string, shipmentId: string | null, rows: Record<string, string | number | null>[]) {
    const { error: deleteError } = await db.from(table).delete().eq("shipment_id", shipmentId);
    if (deleteError) throw deleteError;
    if (!rows.length) return;
    const { error: insertError } = await db.from(table).insert(rows);
    if (insertError) throw insertError;
  }

  async function deleteShipmentBatch(shipmentId: string, batchName?: string) {
    if (!confirm(`Apakah Anda yakin ingin menghapus shipment batch ${batchName || shipmentId}?`)) return;

    setIsBusy(true);
    setCloudStatus("Menghapus shipment...");

    try {
      if (supabase) {
        await db.from("shipment_containers").delete().eq("shipment_id", shipmentId);
        await db.from("shipment_cargo_items").delete().eq("shipment_id", shipmentId);
        await db.from("invoice_items").delete().eq("shipment_id", shipmentId);
        const { error } = await db.from("shipments").delete().eq("id", shipmentId);
        if (error) throw error;
      }

      setCloudShipments((prev) => prev.filter((item) => item.id !== shipmentId));
      setLocalHistoryLogs((prev) => prev.filter((item) => item.id !== shipmentId));

      addHistoryLog({
        batch: batchName || shipmentId,
        si: "",
        bl: "",
        invoice: "",
        changedFields: `Hapus Shipment Batch (${batchName || shipmentId})`,
      });

      setCloudStatus(`Shipment ${batchName || shipmentId} berhasil dihapus.`);
    } catch (err) {
      setCloudStatus(`Hapus gagal: ${(err as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function loadShipmentById(shipmentId: string) {
    setCloudStatus("Memuat detail shipment...");
    let [{ data: shipment, error: shipmentError }, { data: containers, error: containersError }, { data: cargoItems, error: cargoError }, { data: invoiceItems, error: invoiceError }] =
      await Promise.all([
        db.from("shipments").select("*").eq("id", shipmentId).single(),
        db.from("shipment_containers").select("*").eq("shipment_id", shipmentId).order("sort_order", { ascending: true }),
        db.from("shipment_cargo_items").select("*").eq("shipment_id", shipmentId).order("sort_order", { ascending: true }),
        db.from("invoice_items").select("*").eq("shipment_id", shipmentId).order("sort_order", { ascending: true }),
      ]);

    let failedError = shipmentError ?? containersError ?? cargoError ?? invoiceError;

    // Retry once if JWT timestamp skew occurs (e.g. JWT issued at future)
    if (failedError && (failedError.message.includes("JWT") || failedError.message.includes("jwt"))) {
      try {
        if (supabase) {
          await supabase.auth.refreshSession();
        }
        const [res1, res2, res3, res4] = await Promise.all([
          db.from("shipments").select("*").eq("id", shipmentId).single(),
          db.from("shipment_containers").select("*").eq("shipment_id", shipmentId).order("sort_order", { ascending: true }),
          db.from("shipment_cargo_items").select("*").eq("shipment_id", shipmentId).order("sort_order", { ascending: true }),
          db.from("invoice_items").select("*").eq("shipment_id", shipmentId).order("sort_order", { ascending: true }),
        ]);
        shipment = res1.data;
        containers = res2.data;
        cargoItems = res3.data;
        invoiceItems = res4.data;
        failedError = res1.error ?? res2.error ?? res3.error ?? res4.error;
      } catch {
        // Continue to error handling if retry also fails
      }
    }

    if (failedError) {
      setCloudStatus(`Load detail failed: ${failedError.message}`);
      return;
    }

    setDraft(
      mapShipmentToState(
        shipment as unknown as Record<string, string | null>,
        (containers ?? []) as Record<string, string | null>[],
        (cargoItems ?? []) as Record<string, string | null>[],
        (invoiceItems ?? []) as Record<string, string | number | null>[],
      ),
    );
    setCloudStatus("Shipment berhasil dimuat.");
    setActiveView("editor");
    setEditorTab("general");
  }

  async function loadLatestCloud() {
    if (!cloudShipments.length) {
      await refreshCloudShipments();
    }
    if (!cloudShipments[0]) {
      setCloudStatus("Belum ada shipment tersimpan.");
      return;
    }
    await loadShipmentById(cloudShipments[0].id);
  }

  return (
    <div className={styles.appShell}>
      {isMobileMenuOpen && (
        <div className={styles.sidebarBackdrop} onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarBrand}>
          <img src={logoImage.src} alt="Bhumi logo" className={styles.sidebarLogoImage} />
          <div className={styles.brandText}>
            <h1>Bhumi Selaras Mitra</h1>
            <span>B/L MANAGEMENT SYSTEM</span>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          <SidebarButton
            active={activeView === "dashboard"}
            onClick={() => {
              setActiveView("dashboard");
              setIsMobileMenuOpen(false);
            }}
            label="Dashboard"
          />
          <SidebarButton
            active={activeView === "editor"}
            onClick={() => {
              setActiveView("editor");
              setEditorTab("general");
              setIsMobileMenuOpen(false);
            }}
            label="Create / Edit B/L"
          />
          <SidebarButton
            active={activeView === "invoice"}
            onClick={() => {
              setActiveView("invoice");
              setIsMobileMenuOpen(false);
            }}
            label="Invoice Management"
          />
          <SidebarButton
            active={activeView === "history"}
            onClick={() => {
              setActiveView("history");
              setIsMobileMenuOpen(false);
            }}
            label="History Logs"
          />
        </nav>

        <div className={styles.sidebarFooter}>
          <p>&copy; 2026 PT. Bhumi Selaras Mitra</p>
          <p>Supabase linked</p>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.topBar}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              className={styles.hamburgerButton}
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle Navigation Menu"
              type="button"
            >
              ☰
            </button>
            <div>
              <h2 className={styles.pageTitle}>
                {activeView === "dashboard"
                  ? "Dashboard"
                  : activeView === "editor"
                    ? "Bill of Lading Editor"
                    : activeView === "invoice"
                      ? "Invoice Management (Spreadsheet Model)"
                      : "History Logs"}
              </h2>
              <p className={styles.pageSubtitle}>
                {activeView === "dashboard"
                  ? "Monitor shipment drafts, status, and cargo document workflow."
                  : activeView === "editor"
                    ? "Create, edit, review, and print B/L and Shipping Instruction."
                    : activeView === "invoice"
                      ? "Kelola Invoice, Rekap Invoice, dan Customer Database terpisah presisi format Excel."
                      : "Quick access to recent cloud shipments stored in Supabase."}
              </p>
            </div>
          </div>
          <div className={styles.topBarRight}>
            <div className={styles.deviceCard}>
              <span className={styles.deviceTag}>DEVICE</span>
              <strong>Bhumi Ops Local</strong>
            </div>
            <div className={styles.userCard}>
              <span className={styles.userAvatar}>BS</span>
              <div>
                <strong>{sessionEmail ?? "Guest"}</strong>
                <p>{sessionEmail ? "Authenticated Operator" : "Login Required"}</p>
              </div>
            </div>
            {sessionEmail && (
              <button className={styles.logoutButton} onClick={() => void signOut()} type="button">
                Logout
              </button>
            )}
          </div>
        </header>

        {activeView === "dashboard" ? (
          <section className={styles.viewSection}>
            <div className={styles.statsRow}>
              {statCards.map((card) => (
                <div key={card.label} className={styles.statCard}>
                  <div className={`${styles.statIcon} ${styles[`tone${capitalize(card.tone)}` as keyof typeof styles]}`}>●</div>
                  <div>
                    <h3>{card.label}</h3>
                    <p>{card.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.actionBar}>
              <div className={styles.searchBox}>
                <span className={styles.searchIcon}>⌕</span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by B/L No., Booking No., batch, or invoice..."
                />
              </div>
              <div className={styles.actionGroup}>
                <label className={styles.pageSizeLabel}>
                  <span>Show</span>
                  <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                  <span>entries</span>
                </label>
              </div>
              <div className={styles.actionGroup}>
                <button className={styles.outlineButton} onClick={loadSample} type="button">
                  Load Sample
                </button>
                <button
                  className={styles.primaryButton}
                  onClick={() => {
                    setActiveView("editor");
                    setEditorTab("general");
                  }}
                  type="button"
                >
                  New Bill of Lading
                </button>
              </div>
              <div className={styles.actionGroup}>
                <button className={styles.outlineButton} onClick={() => void loadLatestCloud()} type="button">
                  Load Latest
                </button>
              </div>
            </div>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h3>Shipment List</h3>
                <p>{cloudStatus}</p>
              </div>
              <div className={styles.listHeader}>
                <span>B/L Number</span>
                <span>SI / Invoice Ref</span>
                <span>Shipment Batch</span>
                <span>Issue Date</span>
                <span>Actions</span>
              </div>
              <div className={styles.listBody}>
                {pagedShipments.length ? (
                  pagedShipments.map((item) => (
                    <div key={item.id} className={styles.listRow}>
                      <span className={styles.listPrimary}>{item.bl_number ?? "-"}</span>
                      <span>{item.si_number ?? "-"} / {item.invoice_number ?? "-"}</span>
                      <span>{item.document_batch ?? "-"}</span>
                      <span>{item.issue_date ? formatDateLong(item.issue_date) : "-"}</span>
                      <div className={styles.rowActions}>
                        <button className={styles.inlineButton} onClick={() => void loadShipmentById(item.id)} type="button">
                          Open
                        </button>
                        <button
                          className={styles.inlineButton}
                          onClick={() => {
                            void loadShipmentById(item.id);
                            setActiveView("editor");
                            setEditorTab("preview");
                          }}
                          type="button"
                        >
                          Preview
                        </button>
                        <button
                          className={styles.inlineButton}
                          onClick={() => void deleteShipmentBatch(item.id, item.document_batch || item.bl_number || item.id)}
                          type="button"
                          style={{ background: "#dc2626", color: "#ffffff", borderColor: "#dc2626" }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>No shipment found yet.</div>
                )}
              </div>
              <div className={styles.paginationBar}>
                <button
                  className={styles.outlineButton}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  type="button"
                  disabled={currentPage <= 1}
                >
                  Prev
                </button>
                <span className={styles.paginationText}>Page {Math.min(currentPage, totalPages)} of {totalPages}</span>
                <button
                  className={styles.outlineButton}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  type="button"
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h3>Session & Cloud Sync</h3>
                {sessionEmail && (
                  <button className={styles.outlineButton} onClick={() => void signOut()} type="button">
                    Logout
                  </button>
                )}
              </div>
              <p className={styles.panelNote}>{authStatus}</p>
              <p className={styles.panelNote}>Login sekarang memakai halaman terpisah di `/login` seperti aplikasi produksi.</p>
            </section>
          </section>
        ) : activeView === "invoice" ? (
          <section className={styles.viewSection}>
            <StandaloneInvoiceModule
              invoice={standaloneInvoice}
              setInvoice={setStandaloneInvoice}
              customers={customers}
              setCustomers={setCustomers}
              savedInvoices={savedInvoices}
              onSaveInvoice={handleSaveStandaloneInvoice}
              onLoadInvoice={handleLoadStandaloneInvoice}
              onNewInvoice={handleNewStandaloneInvoice}
              onDeleteInvoice={handleDeleteStandaloneInvoice}
            />
          </section>
        ) : activeView === "history" ? (
          <section className={styles.viewSection}>
            <section className={styles.panel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <h3 style={{ fontSize: "20px", color: "#f8fafc", margin: "0 0 4px" }}>History Logs & Audit Trail</h3>
                  <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>Daftar lengkap riwayat perubahan data dokumen, operator pengubah, dan waktu pembaruan.</p>
                </div>
                <button className={styles.outlineButton} onClick={() => void refreshCloudShipments()} type="button">
                  🔄 Refresh Data
                </button>
              </div>

              {/* Filter & Search Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px", background: "#1e293b", padding: "12px 16px", borderRadius: "12px", border: "1px solid #334155" }}>
                <div className={styles.searchBox} style={{ maxWidth: "380px" }}>
                  <span className={styles.searchIcon}>⌕</span>
                  <input
                    value={historySearchQuery}
                    onChange={(e) => {
                      setHistorySearchQuery(e.target.value);
                      setHistoryCurrentPage(1);
                    }}
                    placeholder="Cari berdasarkan Batch, B/L, SI, Invoice, atau User..."
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <label className={styles.pageSizeLabel} style={{ color: "#cbd5e1", fontSize: "13px" }}>
                    <span>Tampilkan</span>
                    <select
                      value={historyPageSize}
                      onChange={(e) => {
                        setHistoryPageSize(Number(e.target.value));
                        setHistoryCurrentPage(1);
                      }}
                      style={{ background: "#0f172a", color: "#f8fafc", border: "1px solid #334155", padding: "4px 8px", borderRadius: "6px" }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                    <span>entri</span>
                  </label>
                </div>
              </div>

              {/* History Table */}
              <div style={{ overflowX: "auto", border: "1px solid #334155", borderRadius: "12px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", color: "#f8fafc", fontSize: "14px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#1e293b", borderBottom: "2px solid #334155" }}>
                      <th style={{ padding: "12px 16px", color: "#94a3b8" }}>Batch ID</th>
                      <th style={{ padding: "12px 16px", color: "#94a3b8" }}>Nomor Dokumen</th>
                      <th style={{ padding: "12px 16px", color: "#94a3b8" }}>Data yang Diubah</th>
                      <th style={{ padding: "12px 16px", color: "#94a3b8" }}>User / Pengubah</th>
                      <th style={{ padding: "12px 16px", color: "#94a3b8" }}>Waktu Perubahan</th>
                      <th style={{ padding: "12px 16px", color: "#94a3b8", textAlign: "center" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedHistory.length > 0 ? (
                      pagedHistory.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: "1px solid #1e293b", background: idx % 2 === 0 ? "transparent" : "rgba(30, 41, 59, 0.4)" }}>
                          <td style={{ padding: "12px 16px", fontWeight: "bold", color: "#38bdf8" }}>{item.document_batch ?? item.id}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontSize: "13px" }}>
                              <div><strong>B/L:</strong> {item.bl_number || "-"}</div>
                              <div><strong>SI:</strong> {item.si_number || "-"}</div>
                              <div><strong>INV:</strong> {item.invoice_number || "-"}</div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ display: "inline-block", background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0", padding: "4px 8px", borderRadius: "6px", fontSize: "12px" }}>
                              {item.bl_number ? "Header B/L, Shipper & Consignee, Routing, Cargo Summary" : "Shipment Batch & Document Update"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.3)", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
                              👤 {sessionEmail ?? "Operator (Authenticated)"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", color: "#cbd5e1", fontSize: "13px" }}>
                            {item.issue_date ? formatDateLong(item.issue_date) : item.updated_at ? formatDateLong(item.updated_at) : "Baru saja"}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => void loadShipmentById(item.id)}
                              style={{
                                background: "#2563eb",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "6px 14px",
                                fontSize: "13px",
                                fontWeight: "bold",
                                cursor: "pointer",
                                transition: "background 0.2s",
                              }}
                            >
                              👁️ Load Data
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>
                          Tidak ada data history yang cocok dengan pencarian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginTop: "16px" }}>
                <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                  Menampilkan {filteredHistory.length > 0 ? (historyCurrentPage - 1) * historyPageSize + 1 : 0} - {Math.min(historyCurrentPage * historyPageSize, filteredHistory.length)} dari {filteredHistory.length} data
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    disabled={historyCurrentPage <= 1}
                    onClick={() => setHistoryCurrentPage((prev) => Math.max(1, prev - 1))}
                    className={styles.outlineButton}
                    style={{ opacity: historyCurrentPage <= 1 ? 0.5 : 1, padding: "6px 12px" }}
                  >
                    ◀ Prev
                  </button>
                  <span style={{ display: "flex", alignItems: "center", padding: "0 12px", color: "#f8fafc", fontSize: "13px" }}>
                    Halaman {historyCurrentPage} dari {historyTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={historyCurrentPage >= historyTotalPages}
                    onClick={() => setHistoryCurrentPage((prev) => Math.min(historyTotalPages, prev + 1))}
                    className={styles.outlineButton}
                    style={{ opacity: historyCurrentPage >= historyTotalPages ? 0.5 : 1, padding: "6px 12px" }}
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            </section>
          </section>
        ) : (
          <section className={styles.viewSection}>
            <div className={styles.editorHeader}>
              <button className={styles.outlineButton} onClick={() => setActiveView("dashboard")} type="button">
                Back to Dashboard
              </button>
              <div className={styles.actionGroup}>
                <button className={styles.outlineButton} onClick={loadSample} type="button">
                  Load Sample Data
                </button>
                <button className={styles.outlineButton} onClick={saveDraftLocal} type="button">
                  Save Draft
                </button>
                <button className={styles.successButton} onClick={() => void saveToCloud()} type="button" disabled={isBusy}>
                  Save B/L
                </button>
                <button className={styles.primaryButton} onClick={() => setEditorTab("preview")} type="button">
                  Preview & Print
                </button>
              </div>
            </div>

            <section className={styles.panel}>
              <div className={styles.tabsNav}>
                {[
                  ["general", "General Info"],
                  ["parties", "Parties"],
                  ["routing", "Routing & Vessel"],
                  ["cargo", "Cargo & Containers"],
                  ["preview", "Preview"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={`${styles.tabButton} ${editorTab === value ? styles.tabActive : ""}`}
                    onClick={() => setEditorTab(value as EditorTab)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>


              {editorTab === "general" && (
                <EditorGrid>
                  <Field label="Document batch" value={draft.documentBatch} onChange={(value) => updateField("documentBatch", value)} />
                  <Field label="Shipping instruction no" value={draft.siNumber} onChange={(value) => updateField("siNumber", value)} onSuggest={handleSuggestSINo} />
                  <Field label="Bill of lading no" value={draft.blNumber} onChange={(value) => updateField("blNumber", value)} onSuggest={handleSuggestBLNo} />
                  <Field label="Invoice no" value={draft.invoiceNumber} onChange={(value) => updateField("invoiceNumber", value)} />
                  <Field label="Issue date" type="date" value={draft.issueDate} onChange={(value) => updateField("issueDate", value)} />
                  <Field label="Booking no" value={draft.bookingNumber} onChange={(value) => updateField("bookingNumber", value)} />
                  <SelectField label="Freight term" value={draft.freightTerm} options={["Collect", "Prepaid"]} onChange={(value) => updateField("freightTerm", value)} />
                  <Field label="Trade term" value={draft.tradeTerm} onChange={(value) => updateField("tradeTerm", value)} />
                </EditorGrid>
              )}

              {editorTab === "parties" && (
                <EditorGrid>
                  <Field label="Shipper" multiline value={draft.shipper} onChange={(value) => updateField("shipper", value)} />
                  <Field label="Consignee" multiline value={draft.consignee} onChange={(value) => updateField("consignee", value)} />
                  <Field label="Notify party" multiline value={draft.notifyParty} onChange={(value) => updateField("notifyParty", value)} />
                  <Field label="Carrier / agent" multiline value={draft.carrier} onChange={(value) => updateField("carrier", value)} />
                  <Field label="Attention" value={draft.attention} onChange={(value) => updateField("attention", value)} />
                </EditorGrid>
              )}

              {editorTab === "routing" && (
                <EditorGrid>
                  <Field label="Place of loading" value={draft.placeOfLoading} onChange={(value) => updateField("placeOfLoading", value)} />
                  <Field label="Port of loading" value={draft.portOfLoading} onChange={(value) => updateField("portOfLoading", value)} />
                  <Field label="Port of discharge" value={draft.portOfDischarge} onChange={(value) => updateField("portOfDischarge", value)} />
                  <Field label="Final destination" value={draft.finalDestination} onChange={(value) => updateField("finalDestination", value)} />
                  <Field label="Vessel" value={draft.vessel} onChange={(value) => updateField("vessel", value)} />
                  <Field label="Voyage" value={draft.voyage} onChange={(value) => updateField("voyage", value)} />
                  <Field label="Connecting vessel" value={draft.connectingVessel} onChange={(value) => updateField("connectingVessel", value)} />
                  <Field label="ETD" type="date" value={draft.etd} onChange={(value) => updateField("etd", value)} />
                  <Field label="ETA" type="date" value={draft.eta} onChange={(value) => updateField("eta", value)} />
                  <Field label="Stuffing on" type="date" value={draft.stuffingDate} onChange={(value) => updateField("stuffingDate", value)} />
                  <Field label="Shipped on board" type="date" value={draft.shippedOnBoard} onChange={(value) => updateField("shippedOnBoard", value)} />
                  <Field label="Detention note" value={draft.detentionNote} onChange={(value) => updateField("detentionNote", value)} />
                </EditorGrid>
              )}

              {editorTab === "cargo" && (
                <div className={styles.editorStack}>
                  <EditableTable
                    title="Containers"
                    actionLabel="Add Container"
                    columns={[
                      { key: "containerNumber", label: "Container No." },
                      { key: "sealNumber", label: "Seal No." },
                      { key: "type", label: "Type" },
                      { key: "grossWeight", label: "Gross Weight" },
                      { key: "netWeight", label: "Net Weight" },
                      { key: "measurement", label: "Meas" },
                    ]}
                    rows={draft.containers}
                    onAdd={() => addRow("containers")}
                    onChange={(index, field, value) => updateArrayRow<ContainerRow>("containers", index, field, value)}
                    onDelete={(index) => removeRow("containers", index)}
                  />
                  <EditableTable
                    title="Cargo Summary"
                    actionLabel="Add Cargo"
                    columns={[
                      { key: "marks", label: "Marks" },
                      { key: "description", label: "Description" },
                      { key: "packages", label: "Packages" },
                      { key: "grossWeight", label: "GW" },
                      { key: "netWeight", label: "NW" },
                      { key: "measurement", label: "Meas" },
                    ]}
                    rows={draft.cargo}
                    onAdd={() => addRow("cargo")}
                    onChange={(index, field, value) => updateArrayRow<CargoRow>("cargo", index, field, value)}
                    onDelete={(index) => removeRow("cargo", index)}
                  />
                </div>
              )}

              {editorTab === "preview" && (
                <div className={styles.previewWorkspace}>
                  <div className={styles.previewControls}>
                    {(["si", "bl"] as ActiveDoc[]).map((doc) => (
                      <button
                        key={doc}
                        className={`${styles.tabButton} ${activeDoc === doc ? styles.tabActive : ""}`}
                        onClick={() => setActiveDoc(doc)}
                        type="button"
                      >
                        {doc === "si" ? "Shipping Instruction" : doc === "bl" ? "Bill of Lading" : "Invoice"}
                      </button>
                    ))}
                    <button className={styles.primaryButton} onClick={printActiveDocument} type="button">
                      Print {getActiveDocLabel(activeDoc)}
                    </button>
                  </div>
                  <div className={`${styles.previewPaper} ${isPrinting ? styles.printMode : ""}`} data-doc={activeDoc}>
                    {activeDoc === "si" ? (
                      <ShippingInstructionPreview draft={draft} />
                    ) : activeDoc === "bl" ? (
                      <BillOfLadingPreview draft={draft} />
                    ) : (
                      <InvoicePreview draft={draft} grandTotal={invoiceGrandTotal} />
                    )}
                  </div>
                </div>
              )}
            </section>
          </section>
        )}
      </main>
    </div>
  );
}

function SidebarButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button className={`${styles.navButton} ${active ? styles.navButtonActive : ""}`} onClick={onClick} type="button">
      <span className={styles.navIcon}>◉</span>
      <span className={styles.navText}>{label}</span>
    </button>
  );
}

function EditorGrid({ children }: { children: React.ReactNode }) {
  return <div className={styles.editorGrid}>{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  onSuggest,
  multiline = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSuggest?: () => void;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <label className={styles.fieldLabel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{label}</span>
        {onSuggest && (
          <button
            type="button"
            onClick={onSuggest}
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
        )}
      </div>
      {multiline ? (
        <textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.fieldLabel}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function EditableTable<T extends { id: string | null }>({
  title,
  actionLabel,
  columns,
  rows,
  onAdd,
  onChange,
  onDelete,
}: {
  title: string;
  actionLabel: string;
  columns: { key: keyof T; label: string }[];
  rows: T[];
  onAdd: () => void;
  onChange: (index: number, field: keyof T, value: string) => void;
  onDelete: (index: number) => void;
}) {
  return (
    <section className={styles.tablePanel}>
      <div className={styles.panelHeader}>
        <h3>{title}</h3>
        <button className={styles.outlineButton} onClick={onAdd} type="button">
          {actionLabel}
        </button>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)}>{column.label}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.id ?? "new"}-${index}`}>
                {columns.map((column) => {
                  const value = String(row[column.key] ?? "");
                  return (
                    <td key={String(column.key)}>
                      {value.length > 35 ? (
                        <textarea rows={2} value={value} onChange={(event) => onChange(index, column.key, event.target.value)} />
                      ) : (
                        <input value={value} onChange={(event) => onChange(index, column.key, event.target.value)} />
                      )}
                    </td>
                  );
                })}
                <td>
                  <button className={styles.inlineDanger} onClick={() => onDelete(index)} type="button">
                    Delete
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

function ShippingInstructionPreview({ draft }: { draft: ShipmentDraft }) {
  return (
    <div className={styles.siSheet}>
      <DocumentHeader title="Shipping Instruction" />
      <h1 className={`${styles.paperTitle} ${styles.siTitle}`}>SHIPPING INSTRUCTION</h1>
      <div className={styles.siMetaGrid}>
        <DocBox title="SI No." value={draft.siNumber} />
        <DocBox title="Date" value={formatDateLong(draft.issueDate)} />
        <DocBox title="Booking No." value={draft.bookingNumber} />
        <DocBox title="Stuffing On" value={formatDateLong(draft.stuffingDate)} />
      </div>
      <div className={styles.siPartyGrid}>
        <DocBox title="Shipper" value={draft.shipper} multiline />
        <DocBox title="Consignee" value={draft.consignee} multiline />
        <DocBox title="Notify Party" value={draft.notifyParty} multiline />
      </div>
      <div className={styles.siDetailGrid}>
        <DocBox title="Carrier / Agent" value={draft.carrier} multiline />
        <DocBox title="Freight" value={`${draft.freightTerm} | ${draft.tradeTerm}`} />
        <DocBox title="Place of Loading" value={draft.placeOfLoading} />
        <DocBox title="Port of Loading" value={draft.portOfLoading} />
        <DocBox title="Port of Discharge" value={draft.portOfDischarge} />
        <DocBox title="Final Destination" value={draft.finalDestination} />
        <DocBox title="Vessel / Voyage" value={`${draft.vessel} ${draft.voyage}`} />
        <DocBox title="Connecting Vessel" value={draft.connectingVessel || "-"} />
      </div>
      <PreviewTables draft={draft} compact />
      <div className={styles.paperNote}><strong>Notes:</strong> {draft.detentionNote || "-"}</div>
    </div>
  );
}

function BillOfLadingPreview({ draft }: { draft: ShipmentDraft }) {
  const totalMeasurement = draft.cargo.reduce((sum, item) => sum + Number(item.measurement || 0), 0);
  const totalGrossWeight = draft.cargo.reduce((sum, item) => sum + Number(item.grossWeight || 0), 0);
  const deliveryContact = draft.notifyParty || draft.consignee || "-";

  return (
    <div className={styles.blSheet}>
      <div className={styles.blHeaderRow}>
        <div className={styles.blTitleBlock}>
          <h1 className={styles.blMainTitle}>BILL OF LADING</h1>
          <p className={styles.blMainSubtitle}>FOR COMBINED TRANSPORT SHIPMENT OR PORT TO PORT SHIPMENT</p>
        </div>
        <div className={styles.blHeaderMeta}>Page 1 of 1</div>
      </div>

      <div className={styles.blTopGrid}>
        <div className={styles.blTopLeft}>
          <div className={styles.blRefGrid}>
            <div className={styles.blRefBox}>
              <strong>Booking No.</strong>
              <span>{draft.bookingNumber || "-"}</span>
            </div>
            <div className={styles.blRefBox}>
              <strong>Bill of Lading No.</strong>
              <span>{draft.blNumber || "-"}</span>
            </div>
          </div>

          <BLSectionBox title="Shipper / Exporter (Complete name and address)" value={draft.shipper} />
          <BLSectionBox title="Consignee (not negotiable unless consigned to order)" value={draft.consignee} />
          <BLSectionBox title="Notify Party (Complete name and address)" value={draft.notifyParty} />
        </div>

        <div className={styles.blTopRight}>
          <div className={styles.blCarrierHead}>
            <div className={styles.blCarrierBrand}>
              <img src={logoImage.src} alt="Bhumi logo" className={styles.blCarrierLogo} />
              <div>
                <strong>PT. BHUMI SELARAS MITRA</strong>
                <span>ORIGINAL</span>
              </div>
            </div>
            <div className={styles.blClauseBox}>
              <p>
                RECEIVED by the Carrier the Goods as specified above in apparent good order and condition unless otherwise
                stated, to be transported to such place as agreed authorised or permitted herein and subject to all terms and
                conditions.
              </p>
              <p>
                The particulars given above as stated by the shipper and weight, measure, quality, condition, contents and
                value of the Goods are unknown to the Carrier.
              </p>
              <p>
                In witness whereof one original Bill of Lading has been signed. If required by the Carrier, one original Bill
                of Lading must be surrendered duly endorsed in exchange for the Goods or delivery order.
              </p>
            </div>
          </div>

          <div className={styles.blClauseBox}>
            <p className={styles.blClauseTitle}>JURISDICTION AND LAW CLAUSE</p>
            <p>
              The Contract evidenced by or contained in this Bill of Lading is governed by the law of Indonesia and any claim
              or dispute arising hereunder or in connection herewith shall be determined by the courts in Indonesia and no
              other court.
            </p>
          </div>

          <div className={styles.blClauseBox}>
            <p className={styles.blClauseTitle}>For delivery of goods please apply to:</p>
            <p>{deliveryContact}</p>
          </div>
        </div>
      </div>

      <div className={styles.blRouteHeader}>
        <div className={styles.blRouteCell}><strong>Pre-Carriage</strong><span>-</span></div>
        <div className={styles.blRouteCell}><strong>Ocean Vessel</strong><span>{draft.vessel || "-"}</span></div>
        <div className={styles.blRouteCell}><strong>Voy. no.</strong><span>{draft.voyage || "-"}</span></div>
      </div>

      <div className={styles.blRouteMini}>
        <div className={styles.blRouteCell}><strong>Place of Receipt</strong><span>{draft.placeOfLoading || "-"}</span></div>
        <div className={styles.blRouteCell}><strong>Port of Loading</strong><span>{draft.portOfLoading || "-"}</span></div>
        <div className={styles.blRouteCell}><strong>Port of Discharge</strong><span>{draft.portOfDischarge || "-"}</span></div>
        <div className={styles.blRouteCell}><strong>Place of Delivery</strong><span>{draft.finalDestination || "-"}</span></div>
      </div>

      <table className={styles.paperTable}>
        <colgroup>
          <col className={styles.blColContainer} />
          <col className={styles.blColMarks} />
          <col className={styles.blColPackages} />
          <col className={styles.blColGoods} />
          <col className={styles.blColMeasure} />
          <col className={styles.blColWeight} />
        </colgroup>
        <thead>
          <tr>
            <th>Container No. and Seal No.<br />Marks &amp; Nos.</th>
            <th>Marks &amp; Nos.</th>
            <th>Quantity and Kind Of Packages</th>
            <th>Description of Goods</th>
            <th>Measurement (M3)</th>
            <th>Gross Weight (KGS)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              {draft.containers.map((item, index) => (
                <div key={`${item.containerNumber}-${index}`} className={styles.blCellStack}>
                  {item.containerNumber}/{item.sealNumber}/{item.type}
                </div>
              ))}
            </td>
            <td>
              {draft.cargo.map((item, index) => (
                <div key={`${item.marks}-${index}`} className={styles.blCellStack}>{item.marks}</div>
              ))}
            </td>
            <td>
              {draft.cargo.map((item, index) => (
                <div key={`${item.description}-${index}`} className={styles.blGoodsBlock}>
                  <strong>{item.packages}</strong>
                </div>
              ))}
            </td>
            <td>
              {draft.cargo.map((item, index) => (
                <div key={`${item.description}-goods-${index}`} className={styles.blGoodsBlock}>
                  <div>SHIPPER&apos;S LOAD, COUNT &amp; SEAL.</div>
                  <div>{draft.containers.length || 1} X {draft.containers[0]?.type || "20GP"} FCL SAID TO CONTAIN</div>
                  <div>CY/CY</div>
                  <div>{item.description}</div>
                  <div>FREIGHT {draft.freightTerm.toUpperCase()}</div>
                  <div>SHIPPED ON BOARD</div>
                </div>
              ))}
            </td>
            <td>
              <div className={styles.blCellStack}>{totalMeasurement.toFixed(3)}</div>
            </td>
            <td>
              <div className={styles.blCellStack}>{totalGrossWeight.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className={styles.blFreightGrid}>
        <div className={styles.blFreightHead}>FREIGHT and CHARGES</div>
        <div className={styles.blFreightHead}>Revenue Tons</div>
        <div className={styles.blFreightHead}>Rate</div>
        <div className={styles.blFreightHead}>Per</div>
        <div className={styles.blFreightHead}>Prepaid</div>
        <div className={styles.blFreightHead}>Collect</div>
        <div className={styles.blFreightCell}>Term : FREIGHT {draft.freightTerm.toUpperCase()}</div>
        <div className={styles.blFreightCell}>-</div>
        <div className={styles.blFreightCell}>-</div>
        <div className={styles.blFreightCell}>-</div>
        <div className={styles.blFreightCell}>{draft.freightTerm === "Prepaid" ? "X" : ""}</div>
        <div className={styles.blFreightCell}>{draft.freightTerm === "Collect" ? "X" : ""}</div>
      </div>

      <div className={styles.blFooterGrid}>
        <div className={styles.blFooterCell}>
          <strong>Ex. Rate</strong>
          <span>-</span>
        </div>
        <div className={styles.blFooterCell}>
          <strong>Prepaid at</strong>
          <span>{draft.portOfLoading || "-"}</span>
        </div>
        <div className={styles.blFooterCell}>
          <strong>Payable at</strong>
          <span>{draft.portOfDischarge || "-"}</span>
        </div>
        <div className={styles.blFooterCell}>
          <strong>Place and date of issue</strong>
          <span>{draft.placeOfLoading || "Kijing, Indonesia"} {formatDateLong(draft.issueDate)}</span>
        </div>
        <div className={styles.blFooterCell}>
          <strong>MOVEMENT</strong>
          <span>THREE (3) PT. BHUMI SELARAS MITRA</span>
        </div>
        <div className={styles.blFooterCell}>
          <strong>No. of original B(s)/L</strong>
          <span>THREE (3)</span>
          <div className={styles.blFooterMini}>As Carrier / Agent</div>
        </div>
      </div>
    </div>
  );
}

function InvoicePreview({ draft, grandTotal }: { draft: ShipmentDraft; grandTotal: number }) {
  return (
    <>
      <DocumentHeader title="Invoice" />
      <h1 className={styles.paperTitle}>INVOICE</h1>
      <div className={styles.paperMetaGrid}>
        <DocBox title="Invoice No." value={draft.invoiceNumber} />
        <DocBox title="Date" value={formatDateLong(draft.issueDate)} />
        <DocBox title="Shipment Ref" value={draft.documentBatch} />
        <DocBox title="B/L No." value={draft.blNumber} />
      </div>
      <div className={styles.paperMetaGrid}>
        <DocBox title="Bill To" value={draft.billTo} multiline />
        <DocBox title="Banking" value={`${draft.bankName}\n${draft.bankAccountNumber}\n${draft.bankAccountName}`} multiline />
      </div>
      <table className={styles.paperTable}>
        <thead>
          <tr>
            <th>No</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Unit Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {draft.invoiceItems.map((item, index) => {
            const quantity = Number(item.quantity || 0);
            const unitPrice = Number(item.unitPrice || 0);
            return (
              <tr key={`${item.description}-${index}`}>
                <td>{index + 1}</td>
                <td>{item.description}</td>
                <td>{item.quantity}</td>
                <td>{item.unit}</td>
                <td>{formatCurrency(unitPrice)}</td>
                <td>{formatCurrency(quantity * unitPrice)}</td>
              </tr>
            );
          })}
          <tr>
            <td colSpan={5}><strong>TOTAL</strong></td>
            <td><strong>{formatCurrency(grandTotal)}</strong></td>
          </tr>
        </tbody>
      </table>
      <div className={styles.paperFooterGrid}>
        <DocBox title="Payment Note" value={draft.paymentNote} multiline />
        <div className={styles.signatureCard}>
          <p>{draft.placeOfLoading || "Jakarta"}, {formatDateLong(draft.issueDate)}</p>
          <div className={styles.signatureSpace} />
          <strong>{draft.signerName}</strong>
          <p>{draft.signerTitle}</p>
        </div>
      </div>
    </>
  );
}

function PreviewTables({ draft, compact = false }: { draft: ShipmentDraft; compact?: boolean }) {
  return (
    <>
      <table className={styles.paperTable}>
        <thead>
          <tr>
            <th>Container No.</th>
            <th>Seal No.</th>
            <th>Type</th>
            <th>Gross Weight</th>
            {!compact && <th>Net Weight</th>}
            <th>Measurement</th>
          </tr>
        </thead>
        <tbody>
          {draft.containers.map((item, index) => (
            <tr key={`${item.containerNumber}-${index}`}>
              <td>{item.containerNumber}</td>
              <td>{item.sealNumber}</td>
              <td>{item.type}</td>
              <td>{item.grossWeight}</td>
              {!compact && <td>{item.netWeight}</td>}
              <td>{item.measurement}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className={styles.paperTable}>
        <thead>
          <tr>
            <th>Marks & Number</th>
            <th>Description of Goods</th>
            <th>Packages</th>
            <th>GW</th>
            <th>NW</th>
            <th>Meas</th>
          </tr>
        </thead>
        <tbody>
          {draft.cargo.map((item, index) => (
            <tr key={`${item.marks}-${index}`}>
              <td>{item.marks}</td>
              <td>{item.description}</td>
              <td>{item.packages}</td>
              <td>{item.grossWeight}</td>
              <td>{item.netWeight}</td>
              <td>{item.measurement}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function DocBox({ title, value, multiline = false }: { title: string; value: string; multiline?: boolean }) {
  return (
    <div className={styles.paperBox}>
      <h3>{title}</h3>
      <p style={{ whiteSpace: multiline ? "pre-line" : "normal" }}>{value || "-"}</p>
    </div>
  );
}

function BLSectionBox({ title, value }: { title: string; value: string }) {
  return (
    <div className={styles.blSectionBox}>
      <strong>{title}</strong>
      <p>{value || "-"}</p>
    </div>
  );
}

function DocumentHeader({ title }: { title: string }) {
  return (
    <div className={styles.documentHeader}>
      <div className={styles.documentBrand}>
        <img src={logoImage.src} alt="Bhumi logo" className={styles.documentLogo} />
        <div>
          <strong>PT. Bhumi Selaras Mitra</strong>
          <p>{title} Management Workspace</p>
        </div>
      </div>
    </div>
  );
}

function newContainer(): ContainerRow {
  return { id: null, containerNumber: "", sealNumber: "", type: "20GP", grossWeight: "", netWeight: "", measurement: "" };
}

function newCargo(): CargoRow {
  return { id: null, marks: "", description: "", packages: "", grossWeight: "", netWeight: "", measurement: "" };
}

function newInvoiceItem(): InvoiceItemRow {
  return { id: null, description: "", quantity: "1", unit: "LOT", unitPrice: "0" };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
