const STORAGE_KEY = "bhumi-docs-draft-v2";
const SUPABASE_URL = "https://ocpjomvbjtlowvnmzglm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zbODHZCExUR6gUffH-btWg_Zi2IWl56";

const sampleState = {
  id: null,
  documentBatch: "BSM/EXPORT/VII/2026/038",
  siNumber: "38/BSM/SI/VII/26",
  blNumber: "BSMKIJ250722001",
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
    { id: null, containerNumber: "TLLU2444063", sealNumber: "HLB4623981", type: "20GP", grossWeight: "25,000 KGS", netWeight: "24,500 KGS", measurement: "28.10 CBM" },
    { id: null, containerNumber: "TLLU2444064", sealNumber: "HLB4623982", type: "20GP", grossWeight: "25,000 KGS", netWeight: "24,500 KGS", measurement: "28.10 CBM" },
  ],
  cargo: [
    { id: null, marks: "BSM / KIJING / DUBAI", description: "NPK 13-6-27-4-0.65B", packages: "500 BAGS", grossWeight: "50,000 KGS", netWeight: "49,000 KGS", measurement: "56.20 CBM" },
  ],
  invoiceItems: [
    { id: null, description: "Freight handling and export documentation", quantity: "1", unit: "LOT", unitPrice: "12000000" },
    { id: null, description: "Port coordination and trucking support", quantity: "1", unit: "LOT", unitPrice: "8500000" },
    { id: null, description: "Container sealing and stuffing supervision", quantity: "2", unit: "JOB", unitPrice: "4250000" },
  ],
};

const state = loadState();
let activeTab = "si";
let session = null;
let cloudShipments = [];

const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const form = document.getElementById("docForm");
const tabGroup = document.getElementById("tabGroup");
const containerTarget = document.getElementById("containersTable");
const cargoTarget = document.getElementById("cargoTable");
const invoiceItemsTarget = document.getElementById("invoiceItemsTable");
const authStatus = document.getElementById("authStatus");
const cloudStatus = document.getElementById("cloudStatus");
const cloudList = document.getElementById("cloudList");
const authEmailInput = document.getElementById("authEmail");
const authPasswordInput = document.getElementById("authPassword");

hydrateForm();
renderTables();
renderDocuments();
bindEvents();
initializeSupabase();

function bindEvents() {
  form.addEventListener("input", onFormChange);
  tabGroup.addEventListener("click", onTabClick);
  document.getElementById("loadSampleBtn").addEventListener("click", loadSample);
  document.getElementById("saveDraftBtn").addEventListener("click", saveDraft);
  document.getElementById("saveCloudBtn").addEventListener("click", saveToCloud);
  document.getElementById("loadCloudBtn").addEventListener("click", loadLatestCloud);
  document.getElementById("resetBtn").addEventListener("click", resetDraft);
  document.getElementById("exportBtn").addEventListener("click", exportJson);
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("addContainerBtn").addEventListener("click", () => addRow("containers", newContainer()));
  document.getElementById("addCargoBtn").addEventListener("click", () => addRow("cargo", newCargo()));
  document.getElementById("addInvoiceItemBtn").addEventListener("click", () => addRow("invoiceItems", newInvoiceItem()));
  document.getElementById("loginBtn").addEventListener("click", signIn);
  document.getElementById("registerBtn").addEventListener("click", signUpDemoUser);
  document.getElementById("logoutBtn").addEventListener("click", signOutUser);
  document.getElementById("refreshCloudBtn").addEventListener("click", refreshCloudShipments);
}

function loadState() {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(sampleState);
  try {
    return mergeWithSample(JSON.parse(saved));
  } catch {
    return structuredClone(sampleState);
  }
}

function mergeWithSample(value) {
  return {
    ...structuredClone(sampleState),
    ...value,
    containers: value?.containers?.length ? value.containers : structuredClone(sampleState.containers),
    cargo: value?.cargo?.length ? value.cargo : structuredClone(sampleState.cargo),
    invoiceItems: value?.invoiceItems?.length ? value.invoiceItems : structuredClone(sampleState.invoiceItems),
  };
}

function hydrateForm() {
  for (const element of form.elements) {
    if (!element.name) continue;
    element.value = state[element.name] ?? "";
  }
}

function onFormChange(event) {
  const { name, value } = event.target;
  if (!name) return;
  state[name] = value;
  renderDocuments();
}

function onTabClick(event) {
  const button = event.target.closest("[data-tab]");
  if (!button) return;
  activeTab = button.dataset.tab;
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === activeTab));
  document.querySelectorAll(".doc-preview").forEach((panel) => panel.classList.toggle("is-active", panel.id === `preview-${activeTab}`));
}

function loadSample() {
  Object.assign(state, structuredClone(sampleState));
  hydrateForm();
  renderTables();
  renderDocuments();
}

function saveDraft() {
  syncStateFromForm();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  setCloudStatus("Draft saved locally.");
}

async function saveToCloud() {
  if (!supabaseClient) {
    setCloudStatus("Supabase client gagal dimuat.");
    return;
  }
  if (!session) {
    setCloudStatus("Login dulu sebelum save ke cloud.");
    return;
  }

  syncStateFromForm();
  setCloudStatus("Saving shipment to Supabase...");

  try {
    const shipmentPayload = mapStateToShipmentPayload();
    let shipmentId = state.id;

    if (shipmentId) {
      const { error } = await supabaseClient.from("shipments").update(shipmentPayload).eq("id", shipmentId);
      if (error) throw error;
    } else {
      const { data, error } = await supabaseClient.from("shipments").insert(shipmentPayload).select("id").single();
      if (error) throw error;
      shipmentId = data.id;
      state.id = shipmentId;
    }

    await replaceChildRows("shipment_containers", shipmentId, state.containers.map((row, index) => ({
      shipment_id: shipmentId,
      container_number: row.containerNumber,
      seal_number: row.sealNumber,
      container_type: row.type,
      gross_weight: row.grossWeight,
      net_weight: row.netWeight,
      measurement: row.measurement,
      sort_order: index,
    })));

    await replaceChildRows("shipment_cargo_items", shipmentId, state.cargo.map((row, index) => ({
      shipment_id: shipmentId,
      marks: row.marks,
      description: row.description,
      packages: row.packages,
      gross_weight: row.grossWeight,
      net_weight: row.netWeight,
      measurement: row.measurement,
      sort_order: index,
    })));

    await replaceChildRows("invoice_items", shipmentId, state.invoiceItems.map((row, index) => ({
      shipment_id: shipmentId,
      description: row.description,
      quantity: Number(row.quantity || 0),
      unit: row.unit,
      unit_price: Number(row.unitPrice || 0),
      sort_order: index,
    })));

    saveDraft();
    setCloudStatus(`Shipment ${state.documentBatch} saved to Supabase.`);
    await refreshCloudShipments();
  } catch (error) {
    setCloudStatus(`Save failed: ${error.message}`);
  }
}

async function replaceChildRows(table, shipmentId, rows) {
  const { error: deleteError } = await supabaseClient.from(table).delete().eq("shipment_id", shipmentId);
  if (deleteError) throw deleteError;
  if (!rows.length) return;
  const { error: insertError } = await supabaseClient.from(table).insert(rows);
  if (insertError) throw insertError;
}

async function loadLatestCloud() {
  if (!cloudShipments.length) {
    await refreshCloudShipments();
  }
  if (!cloudShipments.length) {
    setCloudStatus("Belum ada shipment di cloud.");
    return;
  }
  await loadShipmentById(cloudShipments[0].id);
}

function resetDraft() {
  window.localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, structuredClone(sampleState));
  hydrateForm();
  renderTables();
  renderDocuments();
  setCloudStatus("State reset ke sample.");
}

function exportJson() {
  syncStateFromForm();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(state.documentBatch || "bhumi-docs")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function syncStateFromForm() {
  for (const element of form.elements) {
    if (!element.name) continue;
    state[element.name] = element.value;
  }
}

function addRow(key, row) {
  state[key].push(row);
  renderTables();
  renderDocuments();
}

function removeRow(key, index) {
  state[key].splice(index, 1);
  renderTables();
  renderDocuments();
}

function renderTables() {
  renderArrayTable(containerTarget, "containers", state.containers, [
    { key: "containerNumber", label: "Container No." },
    { key: "sealNumber", label: "Seal No." },
    { key: "type", label: "Type" },
    { key: "grossWeight", label: "Gross Weight" },
    { key: "netWeight", label: "Net Weight" },
    { key: "measurement", label: "Meas" },
  ]);

  renderArrayTable(cargoTarget, "cargo", state.cargo, [
    { key: "marks", label: "Marks" },
    { key: "description", label: "Description" },
    { key: "packages", label: "Packages" },
    { key: "grossWeight", label: "GW" },
    { key: "netWeight", label: "NW" },
    { key: "measurement", label: "Meas" },
  ], true);

  renderArrayTable(invoiceItemsTarget, "invoiceItems", state.invoiceItems, [
    { key: "description", label: "Description" },
    { key: "quantity", label: "Qty" },
    { key: "unit", label: "Unit" },
    { key: "unitPrice", label: "Unit Price" },
  ], true);
}

function renderArrayTable(target, key, rows, columns, useTextarea = false) {
  const header = columns.map((column) => `<th>${column.label}</th>`).join("");
  const body = rows
    .map((row, index) => {
      const cells = columns
        .map((column) => {
          const value = row[column.key] ?? "";
          const input = useTextarea && value.length > 35
            ? `<textarea data-array="${key}" data-index="${index}" data-field="${column.key}" rows="2">${escapeHtml(value)}</textarea>`
            : `<input data-array="${key}" data-index="${index}" data-field="${column.key}" value="${escapeAttr(value)}" />`;
          return `<td>${input}</td>`;
        })
        .join("");
      return `<tr>${cells}<td><button class="danger-link" type="button" data-remove="${key}" data-index="${index}">Delete</button></td></tr>`;
    })
    .join("");

  target.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>${header}<th></th></tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;

  target.querySelectorAll("[data-array]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const el = event.target;
      const arrayKey = el.dataset.array;
      const index = Number(el.dataset.index);
      const field = el.dataset.field;
      state[arrayKey][index][field] = el.value;
      renderDocuments();
    });
  });

  target.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => removeRow(button.dataset.remove, Number(button.dataset.index)));
  });
}

function renderDocuments() {
  document.getElementById("preview-si").innerHTML = renderShippingInstruction();
  document.getElementById("preview-bl").innerHTML = renderBillOfLading();
  document.getElementById("preview-invoice").innerHTML = renderInvoice();
}

function renderShippingInstruction() {
  const cargoRows = state.cargo
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.marks)}</td>
          <td>${escapeHtml(item.description)}</td>
          <td>${escapeHtml(item.packages)}</td>
          <td>${escapeHtml(item.grossWeight)}</td>
          <td>${escapeHtml(item.netWeight)}</td>
          <td>${escapeHtml(item.measurement)}</td>
        </tr>
      `,
    )
    .join("");

  const containerRows = state.containers
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.containerNumber)}</td>
          <td>${escapeHtml(item.sealNumber)}</td>
          <td>${escapeHtml(item.type)}</td>
          <td>${escapeHtml(item.grossWeight)}</td>
          <td>${escapeHtml(item.netWeight)}</td>
          <td>${escapeHtml(item.measurement)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <h1 class="doc-title">SHIPPING INSTRUCTION</h1>
    <div class="meta-grid">
      <div class="doc-box"><h3>SI No.</h3><p>${escapeHtml(state.siNumber)}</p></div>
      <div class="doc-box"><h3>Date</h3><p>${formatDateLong(state.issueDate)}</p></div>
      <div class="doc-box"><h3>Booking No.</h3><p>${escapeHtml(state.bookingNumber)}</p></div>
      <div class="doc-box"><h3>Stuffing On</h3><p>${formatDateLong(state.stuffingDate)}</p></div>
    </div>
    <div class="party-grid">
      <div class="doc-box"><h3>Shipper</h3><p>${nl2br(state.shipper)}</p></div>
      <div class="doc-box"><h3>Consignee</h3><p>${nl2br(state.consignee)}</p></div>
      <div class="doc-box"><h3>Notify Party</h3><p>${nl2br(state.notifyParty)}</p></div>
    </div>
    <div class="meta-grid">
      <div class="doc-box"><h3>Carrier / Agent</h3><p>${nl2br(state.carrier)}</p></div>
      <div class="doc-box"><h3>Freight</h3><p>${escapeHtml(state.freightTerm)} | ${escapeHtml(state.tradeTerm)}</p></div>
      <div class="doc-box"><h3>Place of Loading</h3><p>${escapeHtml(state.placeOfLoading)}</p></div>
      <div class="doc-box"><h3>Port of Loading</h3><p>${escapeHtml(state.portOfLoading)}</p></div>
      <div class="doc-box"><h3>Port of Discharge</h3><p>${escapeHtml(state.portOfDischarge)}</p></div>
      <div class="doc-box"><h3>Final Destination</h3><p>${escapeHtml(state.finalDestination)}</p></div>
      <div class="doc-box"><h3>Vessel / Voyage</h3><p>${escapeHtml(state.vessel)} ${escapeHtml(state.voyage)}</p></div>
      <div class="doc-box"><h3>Connecting Vessel</h3><p>${escapeHtml(state.connectingVessel || "-")}</p></div>
    </div>
    <table class="doc-table">
      <thead>
        <tr>
          <th>Container No.</th>
          <th>Seal No.</th>
          <th>Type</th>
          <th>GW</th>
          <th>NW</th>
          <th>Meas</th>
        </tr>
      </thead>
      <tbody>${containerRows}</tbody>
    </table>
    <table class="doc-table">
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
      <tbody>${cargoRows}</tbody>
    </table>
    <div class="note">
      <strong>Notes:</strong> ${escapeHtml(state.detentionNote || "-")}
    </div>
    <div class="signature-row">
      <div class="summary-card">
        <h3>Schedule</h3>
        <p>ETD: ${formatDateLong(state.etd)}</p>
        <p>ETA: ${formatDateLong(state.eta)}</p>
        <p>Attention: ${escapeHtml(state.attention || "-")}</p>
      </div>
      <div class="signature-block">
        <p>${escapeHtml(state.placeOfLoading || "Jakarta")}, ${formatDateLong(state.issueDate)}</p>
        <div class="signature-space"></div>
        <strong>${escapeHtml(state.signerName)}</strong>
        <p class="muted">${escapeHtml(state.signerTitle)}</p>
      </div>
    </div>
  `;
}

function renderBillOfLading() {
  const cargoLines = state.cargo
    .map((item) => `${item.packages} ${item.description}`)
    .join("<br />");

  const containerRows = state.containers
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.containerNumber)}</td>
          <td>${escapeHtml(item.sealNumber)}</td>
          <td>${escapeHtml(item.type)}</td>
          <td>${escapeHtml(item.grossWeight)}</td>
          <td>${escapeHtml(item.measurement)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <h1 class="doc-title">BILL OF LADING</h1>
    <div class="meta-grid">
      <div class="doc-box"><h3>B/L No.</h3><p>${escapeHtml(state.blNumber)}</p></div>
      <div class="doc-box"><h3>Shipped On Board</h3><p>${formatDateLong(state.shippedOnBoard)}</p></div>
      <div class="doc-box"><h3>Booking No.</h3><p>${escapeHtml(state.bookingNumber)}</p></div>
      <div class="doc-box"><h3>Freight</h3><p>${escapeHtml(state.freightTerm)}</p></div>
    </div>
    <div class="party-grid">
      <div class="doc-box"><h3>Shipper</h3><p>${nl2br(state.shipper)}</p></div>
      <div class="doc-box"><h3>Consignee</h3><p>${nl2br(state.consignee)}</p></div>
      <div class="doc-box"><h3>Notify Party</h3><p>${nl2br(state.notifyParty)}</p></div>
    </div>
    <div class="stats-grid">
      <div class="doc-box"><h3>Place of Receipt</h3><p>${escapeHtml(state.placeOfLoading)}</p></div>
      <div class="doc-box"><h3>Port of Loading</h3><p>${escapeHtml(state.portOfLoading)}</p></div>
      <div class="doc-box"><h3>Port of Discharge</h3><p>${escapeHtml(state.portOfDischarge)}</p></div>
      <div class="doc-box"><h3>Final Destination</h3><p>${escapeHtml(state.finalDestination)}</p></div>
      <div class="doc-box"><h3>Vessel / Voyage</h3><p>${escapeHtml(state.vessel)} ${escapeHtml(state.voyage)}</p></div>
      <div class="doc-box"><h3>Connecting Vessel</h3><p>${escapeHtml(state.connectingVessel || "-")}</p></div>
      <div class="doc-box"><h3>Trade Term</h3><p>${escapeHtml(state.tradeTerm || "-")}</p></div>
      <div class="doc-box"><h3>Issue Date</h3><p>${formatDateLong(state.issueDate)}</p></div>
    </div>
    <table class="doc-table">
      <thead>
        <tr>
          <th>Container No.</th>
          <th>Seal No.</th>
          <th>Type</th>
          <th>Gross Weight</th>
          <th>Measurement</th>
        </tr>
      </thead>
      <tbody>${containerRows}</tbody>
    </table>
    <div class="summary-row">
      <div class="summary-card">
        <h3>Particulars Furnished By Shipper</h3>
        <p>${cargoLines || "-"}</p>
      </div>
      <div class="summary-card">
        <h3>Marks & Numbers</h3>
        <p>${state.cargo.map((item) => escapeHtml(item.marks)).join("<br />") || "-"}</p>
      </div>
    </div>
    <div class="note">
      <strong>Carrier remark:</strong> Shipper's load, count and sealed. CY/CY. ${escapeHtml(state.detentionNote || "")}
    </div>
  `;
}

function renderInvoice() {
  const rows = state.invoiceItems
    .map((item, index) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const total = quantity * unitPrice;
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.description)}</td>
          <td>${escapeHtml(item.quantity)}</td>
          <td>${escapeHtml(item.unit)}</td>
          <td>${formatCurrency(unitPrice)}</td>
          <td>${formatCurrency(total)}</td>
        </tr>
      `;
    })
    .join("");

  const grandTotal = state.invoiceItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);

  return `
    <h1 class="doc-title">INVOICE</h1>
    <div class="meta-grid">
      <div class="doc-box"><h3>Invoice No.</h3><p>${escapeHtml(state.invoiceNumber)}</p></div>
      <div class="doc-box"><h3>Date</h3><p>${formatDateLong(state.issueDate)}</p></div>
      <div class="doc-box"><h3>Shipment Ref</h3><p>${escapeHtml(state.documentBatch)}</p></div>
      <div class="doc-box"><h3>B/L No.</h3><p>${escapeHtml(state.blNumber)}</p></div>
    </div>
    <div class="meta-grid">
      <div class="doc-box"><h3>Bill To</h3><p>${nl2br(state.billTo)}</p></div>
      <div class="doc-box"><h3>Banking</h3><p>${escapeHtml(state.bankName)}<br />${escapeHtml(state.bankAccountNumber)}<br />${escapeHtml(state.bankAccountName)}</p></div>
    </div>
    <table class="doc-table">
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
        ${rows}
        <tr class="total-row">
          <td colspan="5">TOTAL</td>
          <td>${formatCurrency(grandTotal)}</td>
        </tr>
      </tbody>
    </table>
    <div class="invoice-footer">
      <div class="summary-card">
        <h3>Payment Note</h3>
        <p>${nl2br(state.paymentNote)}</p>
      </div>
      <div class="signature-block">
        <p>${escapeHtml(state.placeOfLoading || "Jakarta")}, ${formatDateLong(state.issueDate)}</p>
        <div class="signature-space"></div>
        <strong>${escapeHtml(state.signerName)}</strong>
        <p class="muted">${escapeHtml(state.signerTitle)}</p>
      </div>
    </div>
  `;
}

async function initializeSupabase() {
  if (!supabaseClient) {
    setAuthStatus("Supabase client library tidak termuat.");
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    setAuthStatus(`Session check failed: ${error.message}`);
    return;
  }
  session = data.session;
  updateAuthUi();

  supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
    session = nextSession;
    updateAuthUi();
  });
}

async function signIn() {
  if (!supabaseClient) return;
  setAuthStatus("Signing in...");
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: authEmailInput.value.trim(),
    password: authPasswordInput.value,
  });
  if (error) {
    setAuthStatus(`Login gagal: ${error.message}`);
    return;
  }
  setAuthStatus(`Login berhasil untuk ${authEmailInput.value.trim()}.`);
  await refreshCloudShipments();
}

async function signUpDemoUser() {
  if (!supabaseClient) return;
  setAuthStatus("Registering demo user...");
  const { data, error } = await supabaseClient.auth.signUp({
    email: authEmailInput.value.trim(),
    password: authPasswordInput.value,
  });
  if (error) {
    setAuthStatus(`Register gagal: ${error.message}`);
    return;
  }
  if (data.user && !data.session) {
    setAuthStatus(`User dibuat, tapi perlu verifikasi email untuk ${authEmailInput.value.trim()}.`);
    return;
  }
  setAuthStatus(`Demo user siap dipakai: ${authEmailInput.value.trim()}`);
  await refreshCloudShipments();
}

async function signOutUser() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  setAuthStatus("Logged out.");
  setCloudStatus("Session ditutup.");
}

function updateAuthUi() {
  if (session?.user?.email) {
    setAuthStatus(`Active session: ${session.user.email}`);
    refreshCloudShipments();
  } else {
    setAuthStatus("Belum login.");
    cloudShipments = [];
    renderCloudList();
    setCloudStatus("Login dulu untuk memuat data dari Supabase.");
  }
}

async function refreshCloudShipments() {
  if (!supabaseClient || !session) return;
  setCloudStatus("Loading shipments from cloud...");

  const { data, error } = await supabaseClient
    .from("shipments")
    .select("id, document_batch, si_number, bl_number, invoice_number, issue_date, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    setCloudStatus(`Load cloud failed: ${error.message}`);
    return;
  }

  cloudShipments = data ?? [];
  renderCloudList();
  setCloudStatus(`${cloudShipments.length} shipment loaded from Supabase.`);
}

function renderCloudList() {
  if (!cloudShipments.length) {
    cloudList.innerHTML = "";
    return;
  }
  cloudList.innerHTML = cloudShipments
    .map(
      (item) => `
        <div class="cloud-item">
          <div>
            <strong>${escapeHtml(item.document_batch || item.si_number || item.invoice_number || item.id)}</strong>
            <p>SI: ${escapeHtml(item.si_number || "-")} | BL: ${escapeHtml(item.bl_number || "-")} | Invoice: ${escapeHtml(item.invoice_number || "-")}</p>
            <p>Issue date: ${escapeHtml(item.issue_date || "-")}</p>
          </div>
          <button class="btn btn-secondary" type="button" data-cloud-load="${item.id}">Load</button>
        </div>
      `,
    )
    .join("");

  cloudList.querySelectorAll("[data-cloud-load]").forEach((button) => {
    button.addEventListener("click", () => loadShipmentById(button.dataset.cloudLoad));
  });
}

async function loadShipmentById(shipmentId) {
  if (!supabaseClient || !session) return;
  setCloudStatus("Loading shipment detail...");

  const [{ data: shipment, error: shipmentError }, { data: containers, error: containersError }, { data: cargoItems, error: cargoError }, { data: invoiceItems, error: invoiceError }] = await Promise.all([
    supabaseClient.from("shipments").select("*").eq("id", shipmentId).single(),
    supabaseClient.from("shipment_containers").select("*").eq("shipment_id", shipmentId).order("sort_order", { ascending: true }),
    supabaseClient.from("shipment_cargo_items").select("*").eq("shipment_id", shipmentId).order("sort_order", { ascending: true }),
    supabaseClient.from("invoice_items").select("*").eq("shipment_id", shipmentId).order("sort_order", { ascending: true }),
  ]);

  if (shipmentError || containersError || cargoError || invoiceError) {
    setCloudStatus(`Load detail failed: ${(shipmentError || containersError || cargoError || invoiceError).message}`);
    return;
  }

  Object.assign(state, mapShipmentToState(shipment, containers ?? [], cargoItems ?? [], invoiceItems ?? []));
  hydrateForm();
  renderTables();
  renderDocuments();
  saveDraft();
  setCloudStatus(`Shipment ${state.documentBatch} loaded from cloud.`);
}

function mapStateToShipmentPayload() {
  return {
    document_batch: state.documentBatch,
    si_number: state.siNumber,
    bl_number: state.blNumber,
    invoice_number: state.invoiceNumber,
    issue_date: state.issueDate || null,
    etd: state.etd || null,
    eta: state.eta || null,
    shipped_on_board: state.shippedOnBoard || null,
    stuffing_date: state.stuffingDate || null,
    booking_number: state.bookingNumber,
    freight_term: state.freightTerm,
    trade_term: state.tradeTerm,
    place_of_loading: state.placeOfLoading,
    port_of_loading: state.portOfLoading,
    port_of_discharge: state.portOfDischarge,
    final_destination: state.finalDestination,
    vessel: state.vessel,
    voyage: state.voyage,
    connecting_vessel: state.connectingVessel,
    detention_note: state.detentionNote,
    shipper: state.shipper,
    consignee: state.consignee,
    notify_party: state.notifyParty,
    carrier: state.carrier,
    attention: state.attention,
    bill_to: state.billTo,
    payment_note: state.paymentNote,
    bank_name: state.bankName,
    bank_account_number: state.bankAccountNumber,
    bank_account_name: state.bankAccountName,
    signer_name: state.signerName,
    signer_title: state.signerTitle,
  };
}

function mapShipmentToState(shipment, containers, cargoItems, invoiceItems) {
  return mergeWithSample({
    id: shipment.id,
    documentBatch: shipment.document_batch,
    siNumber: shipment.si_number,
    blNumber: shipment.bl_number,
    invoiceNumber: shipment.invoice_number,
    issueDate: shipment.issue_date,
    etd: shipment.etd,
    eta: shipment.eta,
    shippedOnBoard: shipment.shipped_on_board,
    stuffingDate: shipment.stuffing_date,
    bookingNumber: shipment.booking_number,
    freightTerm: shipment.freight_term,
    tradeTerm: shipment.trade_term,
    placeOfLoading: shipment.place_of_loading,
    portOfLoading: shipment.port_of_loading,
    portOfDischarge: shipment.port_of_discharge,
    finalDestination: shipment.final_destination,
    vessel: shipment.vessel,
    voyage: shipment.voyage,
    connectingVessel: shipment.connecting_vessel,
    detentionNote: shipment.detention_note,
    shipper: shipment.shipper,
    consignee: shipment.consignee,
    notifyParty: shipment.notify_party,
    carrier: shipment.carrier,
    attention: shipment.attention,
    billTo: shipment.bill_to,
    paymentNote: shipment.payment_note,
    bankName: shipment.bank_name,
    bankAccountNumber: shipment.bank_account_number,
    bankAccountName: shipment.bank_account_name,
    signerName: shipment.signer_name,
    signerTitle: shipment.signer_title,
    containers: containers.map((row) => ({
      id: row.id,
      containerNumber: row.container_number,
      sealNumber: row.seal_number,
      type: row.container_type,
      grossWeight: row.gross_weight,
      netWeight: row.net_weight,
      measurement: row.measurement,
    })),
    cargo: cargoItems.map((row) => ({
      id: row.id,
      marks: row.marks,
      description: row.description,
      packages: row.packages,
      grossWeight: row.gross_weight,
      netWeight: row.net_weight,
      measurement: row.measurement,
    })),
    invoiceItems: invoiceItems.map((row) => ({
      id: row.id,
      description: row.description,
      quantity: String(row.quantity ?? 0),
      unit: row.unit,
      unitPrice: String(row.unit_price ?? 0),
    })),
  });
}

function newContainer() {
  return { id: null, containerNumber: "", sealNumber: "", type: "20GP", grossWeight: "", netWeight: "", measurement: "" };
}

function newCargo() {
  return { id: null, marks: "", description: "", packages: "", grossWeight: "", netWeight: "", measurement: "" };
}

function newInvoiceItem() {
  return { id: null, description: "", quantity: "1", unit: "LOT", unitPrice: "0" };
}

function setAuthStatus(message) {
  authStatus.textContent = message;
}

function setCloudStatus(message) {
  cloudStatus.textContent = message;
}

function formatDateLong(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

function nl2br(text) {
  return escapeHtml(text || "-").replace(/\n/g, "<br />");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

function safeFileName(value) {
  return value.replace(/[^\w.-]+/g, "-");
}
