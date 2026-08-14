import styles from "./workspace.module.css";

const updates = [
  ["14 Agustus 2026", "Productivity Suite", "Invoice dan customer tersimpan di cloud, autosave aman, archive/restore, clone shipment, master data, validasi dokumen, dan dashboard analitik."],
  ["13 Agustus 2026", "Multi-device Safety", "Penyimpanan shipment atomik, deteksi konflik antar perangkat, pencegahan B/L duplikat, dan audit trail server-side."],
  ["27 Juli 2026", "Audit Trail", "History log terpadu, pencarian, pagination, dan identitas operator."],
];

export function SystemUpdates() { return <section className={styles.viewSection}><section className={styles.panel}><div className={styles.panelHeader}><div><h3>Update Sistem</h3><p className={styles.panelNote}>Catatan perubahan fitur yang sudah tersedia untuk operator.</p></div></div><div style={{display:"grid",gap:14}}>{updates.map(([date,title,body]) => <article key={date+title} style={{padding:18,border:"1px solid #334155",borderRadius:12,background:"#0f172a"}}><span style={{color:"#38bdf8",fontSize:12,fontWeight:700}}>{date}</span><h4 style={{margin:"6px 0",fontSize:18}}>{title}</h4><p style={{margin:0,color:"#cbd5e1",lineHeight:1.6}}>{body}</p></article>)}</div></section></section>; }
