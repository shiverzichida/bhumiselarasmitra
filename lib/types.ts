export type ContainerRow = {
  id: string | null;
  containerNumber: string;
  sealNumber: string;
  type: string;
  grossWeight: string;
  netWeight: string;
  measurement: string;
};

export type CargoRow = {
  id: string | null;
  marks: string;
  description: string;
  packages: string;
  grossWeight: string;
  netWeight: string;
  measurement: string;
};

export type InvoiceItemRow = {
  id: string | null;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

export type ShipmentDraft = {
  id: string | null;
  documentBatch: string;
  siNumber: string;
  blNumber: string;
  invoiceNumber: string;
  issueDate: string;
  etd: string;
  eta: string;
  shippedOnBoard: string;
  bookingNumber: string;
  freightTerm: string;
  tradeTerm: string;
  placeOfLoading: string;
  portOfLoading: string;
  portOfDischarge: string;
  finalDestination: string;
  vessel: string;
  voyage: string;
  connectingVessel: string;
  stuffingDate: string;
  detentionNote: string;
  shipper: string;
  consignee: string;
  notifyParty: string;
  carrier: string;
  attention: string;
  billTo: string;
  paymentNote: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  signerName: string;
  signerTitle: string;
  containers: ContainerRow[];
  cargo: CargoRow[];
  invoiceItems: InvoiceItemRow[];
};

export type ShipmentListItem = {
  id: string;
  document_batch: string | null;
  si_number: string | null;
  bl_number: string | null;
  invoice_number: string | null;
  issue_date: string | null;
  updated_at?: string | null;
  user_email?: string | null;
  changed_fields?: string | null;
};

export type CustomerMaster = {
  id: string;
  customerId: string;
  customerName: string;
  companyName: string;
  streetAddress: string;
  city: string;
  phone: string;
};

export type StandaloneInvoice = {
  id: string | null;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  companyName: string;
  streetAddress: string;
  city: string;
  phone: string;
  items: InvoiceItemRow[];
  discount: string;
  ppnRate: number; // e.g. 11 for 11%
  pphRate: number; // e.g. 2 for 2%
  otherAmount: string;
  bankCode: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  signerName: string;
};

