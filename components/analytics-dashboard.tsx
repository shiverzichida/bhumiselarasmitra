import styles from "./workspace.module.css";
import { formatCurrency } from "@/lib/format";
import type { ShipmentListItem, StandaloneInvoice } from "@/lib/types";

export function AnalyticsDashboard({ shipments, invoices, archivedCount }: { shipments: ShipmentListItem[]; invoices: StandaloneInvoice[]; archivedCount: number }) {
  const revenue = invoices.reduce((total, invoice) => total + invoice.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0), 0);
  const months = new Map<string, number>();
  shipments.forEach((item) => { const month = item.issue_date?.slice(0, 7) || "Tanpa tanggal"; months.set(month, (months.get(month) || 0) + 1); });
  const max = Math.max(1, ...months.values());
  return <section className={styles.viewSection}>
    <div className={styles.statsRow}>
      {[{label:"Shipment Aktif",value:shipments.length},{label:"Shipment Arsip",value:archivedCount},{label:"Invoice Cloud",value:invoices.length},{label:"Nilai Invoice",value:formatCurrency(revenue)}].map(card => <div className={styles.statCard} key={card.label}><div><h3>{card.label}</h3><p>{card.value}</p></div></div>)}
    </div>
    <section className={styles.panel}><div className={styles.panelHeader}><h3>Volume Shipment per Bulan</h3></div>
      <div style={{display:"grid",gap:12}}>{[...months.entries()].sort().map(([month,count]) => <div key={month} style={{display:"grid",gridTemplateColumns:"110px 1fr 40px",gap:12,alignItems:"center"}}><strong>{month}</strong><div style={{height:14,background:"#1e293b",borderRadius:8,overflow:"hidden"}}><div style={{width:`${count/max*100}%`,height:"100%",background:"linear-gradient(90deg,#2563eb,#38bdf8)"}} /></div><span>{count}</span></div>)}</div>
    </section>
  </section>;
}
