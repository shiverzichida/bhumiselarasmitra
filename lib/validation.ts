import type { ShipmentDraft } from "./types";

export type ValidationIssue = { level: "error" | "warning"; field: string; message: string };

export function validateShipment(draft: ShipmentDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!draft.documentBatch.trim()) issues.push({ level: "error", field: "documentBatch", message: "Document batch wajib diisi." });
  if (!draft.blNumber.trim()) issues.push({ level: "error", field: "blNumber", message: "Nomor B/L wajib diisi." });
  if (!draft.shipper.trim()) issues.push({ level: "error", field: "shipper", message: "Shipper wajib diisi." });
  if (!draft.consignee.trim()) issues.push({ level: "error", field: "consignee", message: "Consignee wajib diisi." });
  if (draft.etd && draft.eta && draft.eta < draft.etd) issues.push({ level: "error", field: "eta", message: "ETA tidak boleh lebih awal dari ETD." });
  if (!draft.portOfLoading.trim()) issues.push({ level: "warning", field: "portOfLoading", message: "Port of loading belum diisi." });
  if (!draft.portOfDischarge.trim()) issues.push({ level: "warning", field: "portOfDischarge", message: "Port of discharge belum diisi." });
  const containers = draft.containers.map((row) => row.containerNumber.trim().toUpperCase()).filter(Boolean);
  if (new Set(containers).size !== containers.length) issues.push({ level: "error", field: "containers", message: "Nomor container duplikat ditemukan." });
  if (!draft.containers.length) issues.push({ level: "warning", field: "containers", message: "Shipment belum memiliki container." });
  return issues;
}
