"use client";
import { useState } from "react";
import styles from "./workspace.module.css";
import type { MasterDataItem } from "@/lib/types";

export function MasterDataPanel({items,onAdd,onDelete}:{items:MasterDataItem[];onAdd:(item:Omit<MasterDataItem,"id">)=>Promise<void>;onDelete:(id:string)=>Promise<void>}) {
  const [category,setCategory]=useState<MasterDataItem["category"]>("consignee"); const [label,setLabel]=useState(""); const [value,setValue]=useState("");
  return <section className={styles.panel}><div className={styles.panelHeader}><div><h3>Master Data & Autocomplete</h3><p className={styles.panelNote}>Data ini muncul sebagai pilihan otomatis di editor B/L.</p></div></div>
    <div className={styles.editorGrid}><label className={styles.fieldLabel}><span>Kategori</span><select value={category} onChange={e=>setCategory(e.target.value as MasterDataItem["category"])}>{["shipper","consignee","notify_party","carrier","port","vessel","charge"].map(x=><option key={x}>{x}</option>)}</select></label><label className={styles.fieldLabel}><span>Nama singkat</span><input value={label} onChange={e=>setLabel(e.target.value)} /></label><label className={styles.fieldLabel}><span>Nilai / alamat lengkap</span><textarea rows={3} value={value} onChange={e=>setValue(e.target.value)} /></label></div>
    <button className={styles.primaryButton} type="button" onClick={async()=>{if(!label.trim()||!value.trim())return;await onAdd({category,label,value});setLabel("");setValue("");}}>Tambah Master Data</button>
    <div style={{display:"grid",gap:8,marginTop:16}}>{items.map(item=><div key={item.id} style={{display:"flex",justifyContent:"space-between",gap:12,padding:10,border:"1px solid #334155",borderRadius:8}}><div><strong>{item.label}</strong><small style={{display:"block",color:"#94a3b8"}}>{item.category} · {item.value.split("\n")[0]}</small></div><button className={styles.outlineButton} onClick={()=>void onDelete(item.id)} type="button">Hapus</button></div>)}</div>
  </section>;
}
