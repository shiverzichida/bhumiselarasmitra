import type { ShipmentDraft } from "./types";

export const STORAGE_KEY = "bhumi-docs-draft-v3";

export const sampleDraft: ShipmentDraft = {
  id: null,
  documentBatch: "BSM/EXPORT/VII/2026/038",
  siNumber: "38/BSM/SI/VII/26",
  blNumber: "BSMKIJ250723001",
  invoiceNumber: "01/VII/INV/2026",
  issueDate: "2026-07-23",
  etd: "2026-07-24",
  eta: "2026-08-07",
  shippedOnBoard: "2026-07-24",
  bookingNumber: "MAX-JKT-0118100165",
  freightTerm: "Collect",
  tradeTerm: "FOB",
  placeOfLoading: "Kijing, Pontianak",
  portOfLoading: "Tanjung Priok, Jakarta, Indonesia",
  portOfDischarge: "Jebel Ali, Dubai, UAE",
  finalDestination: "Dubai, UAE",
  vessel: "WGM 256T",
  voyage: "031N",
  connectingVessel: "UMM SALAL V.010W",
  stuffingDate: "2026-07-23",
  detentionNote: "14 days free time detention at destination",
  shipper: [
    "PT Bhumi Selaras Mitra",
    "Menteng Square Office Tower A Lt 2 Unit AK 8",
    "Kel. Kenari, Kec. Senen, Jakarta Pusat, DKI Jakarta 10430",
    "Phone: +62-815-6322-1999 | Email: pt.bhumiselarasmitra@gmail.com",
  ].join("\n"),
  consignee: [
    "PT. Kebun Gum",
    "GMO Warehouse, Ds Balai Sepuak, Kec Belitang Hulu",
    "Kab. Sekadau, Kalimantan Barat",
  ].join("\n"),
  notifyParty: [
    "Pro Global Logistics LLC",
    "P.O. BOX 117568",
    "Dubai (U.A.E)",
    "Tel: +971 4351 5599 ext: 107",
  ].join("\n"),
  carrier: [
    "PT Milenia Armada Ekspres",
    "As agent for Milenia Shipping Agencies PTE LTD as carrier",
    "Attention: Pak Habibi",
  ].join("\n"),
  attention: "Pak Habibi",
  billTo: [
    "Vice Presiden SDM Umum",
    "PT Jasa Armada Indonesia Tbk",
    "Jakarta",
  ].join("\n"),
  paymentNote: "Pembayaran harap ditransfer ke rekening berikut maksimal 14 hari setelah invoice diterima.",
  bankName: "BCA",
  bankAccountNumber: "414-2485676",
  bankAccountName: "CV. Bhumi Selaras Mitra",
  signerName: "Ari Wahyudi",
  signerTitle: "Director",
  containers: [
    {
      id: null,
      containerNumber: "TLLU2444063",
      sealNumber: "HLB4623981",
      type: "20GP",
      grossWeight: "25,000 KGS",
      netWeight: "24,500 KGS",
      measurement: "28.10 CBM",
    },
    {
      id: null,
      containerNumber: "TLLU2444064",
      sealNumber: "HLB4623982",
      type: "20GP",
      grossWeight: "25,000 KGS",
      netWeight: "24,500 KGS",
      measurement: "28.10 CBM",
    },
  ],
  cargo: [
    {
      id: null,
      marks: "BSM / KIJING / DUBAI",
      description: "NPK 13-6-27-4-0.65B",
      packages: "500 BAGS",
      grossWeight: "50,000 KGS",
      netWeight: "49,000 KGS",
      measurement: "56.20 CBM",
    },
  ],
  invoiceItems: [
    { id: null, description: "Freight handling and export documentation", quantity: "1", unit: "LOT", unitPrice: "12000000" },
    { id: null, description: "Port coordination and trucking support", quantity: "1", unit: "LOT", unitPrice: "8500000" },
    { id: null, description: "Container sealing and stuffing supervision", quantity: "2", unit: "JOB", unitPrice: "4250000" },
  ],
};

export function mergeWithSample(value?: Partial<ShipmentDraft> | null): ShipmentDraft {
  return {
    ...structuredClone(sampleDraft),
    ...value,
    containers: value?.containers?.length ? value.containers : structuredClone(sampleDraft.containers),
    cargo: value?.cargo?.length ? value.cargo : structuredClone(sampleDraft.cargo),
    invoiceItems: value?.invoiceItems?.length ? value.invoiceItems : structuredClone(sampleDraft.invoiceItems),
  };
}
