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

export const INVOICE_STORAGE_KEY = "bhumi-docs-invoice-v1";
export const CUSTOMERS_STORAGE_KEY = "bhumi-docs-customers-v1";

export const sampleCustomers: import("./types").CustomerMaster[] = [
  {
    id: "cust-022",
    customerId: "022",
    customerName: "Ibu April",
    companyName: "PT. Belirang Kalisari",
    streetAddress: "Jl Karanggayam I 2A Surabaya 60136 Indonesia",
    city: "Jawa Timur",
    phone: "+62-812-7958-5758",
  },
  {
    id: "cust-001",
    customerId: "001",
    customerName: "Bpk. Hendra",
    companyName: "PT. Belirang Kalisari",
    streetAddress: "Jl Karanggayam I 2A Surabaya 60136 Indonesia",
    city: "Jawa Timur",
    phone: "+62-812-7958-5758",
  },
  {
    id: "cust-002",
    customerId: "002",
    customerName: "Bpk. Rahmat",
    companyName: "PT. Tangguh Birawa Persada",
    streetAddress: "Jl. Raya Industri No. 45",
    city: "Jakarta Barat",
    phone: "+62-811-9988-7766",
  },
  {
    id: "cust-003",
    customerId: "003",
    customerName: "Ibu Siska",
    companyName: "PT. Inti Jaya Elektronik",
    streetAddress: "Kawasan Harco Mangga Dua Lt 3",
    city: "Jakarta Pusat",
    phone: "+62-813-1122-3344",
  },
  {
    id: "cust-004",
    customerId: "004",
    customerName: "Bpk. Agus",
    companyName: "PT. Toko Baru Avo",
    streetAddress: "Jl. Veteran No. 12",
    city: "Surabaya",
    phone: "+62-815-5544-3322",
  },
  {
    id: "cust-005",
    customerId: "005",
    customerName: "Bpk. Budi",
    companyName: "PT. Ones Law Group",
    streetAddress: "Sudirman Central Business District Tbk",
    city: "Jakarta Selatan",
    phone: "+62-812-9900-1122",
  },
];

export const sampleStandaloneInvoice: import("./types").StandaloneInvoice = {
  id: null,
  invoiceNumber: "INV/054/BSM/INVVII/2025",
  date: "2026-07-16",
  dueDate: "2026-07-16",
  customerId: "022",
  customerName: "Ibu April",
  companyName: "PT. Belirang Kalisari",
  streetAddress: "Jl Karanggayam I 2A Surabaya 60136 Indonesia",
  city: "Jawa Timur",
  phone: "+62-812-7958-5758",
  items: [
    {
      id: null,
      description: "Biaya Ocean freight Door - Fio PT. Indah Kiat PRW 5 x 20GP all in",
      quantity: "5",
      unit: "20GP",
      unitPrice: "16250000",
    },
  ],
  discount: "0",
  ppnRate: 11,
  pphRate: 2,
  otherAmount: "0",
  bankCode: "014",
  bankName: "BCA KCU Kramat Jaya",
  bankAccountName: "BHUMI SELARAS MITRA",
  bankAccountNumber: "414-2485-676",
  signerName: "Ari Wahyudi",
};

