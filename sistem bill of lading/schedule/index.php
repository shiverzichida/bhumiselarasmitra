<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sailing Schedule Management - PT. Putera Utama Lautan</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body>

    <div class="container">
        
        <!-- Page Header -->
        <header class="page-header">
            <div class="header-title">
                <h1>Sailing Schedule System</h1>
                <p>Track vessel routes, input actual timelines, and cascade scheduling shifts automatically</p>
            </div>
            <div>
                <a href="../index.html" class="btn btn-outline btn-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    Main Dashboard
                </a>
            </div>
        </header>

        <!-- Status Alerts -->
        <div id="alert-box" style="display: none;"></div>

        <!-- Dashboard Action Bar -->
        <div class="dashboard-actions">
            <div>
                <button class="btn btn-primary" onclick="openCreateModal()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Add New Sailing Voyage
                </button>
            </div>
            <div style="display: flex; gap: 12px;">
                <button class="btn btn-outline" onclick="loadSchedules()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                    Refresh List
                </button>
            </div>
        </div>

        <!-- Sailing Schedule Panel -->
        <div class="panel">
            <div class="panel-title">
                <span>Vessels Sailing Schedule Grid</span>
                <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">* Click on any port call cell to input actual times (ATA/ATD)</span>
            </div>
            
            <div class="schedule-table-wrapper">
                <table class="schedule-table">
                    <thead>
                        <tr>
                            <th rowspan="2">Tug</th>
                            <th rowspan="2">Barge</th>
                            <th rowspan="2" class="voy-header">Voy Out</th>
                            <th colspan="6" class="port-header">Outbound Voyage Route Calls</th>
                            <th rowspan="2" class="voy-header">Voy In</th>
                            <th colspan="4" class="port-header">Inbound Voyage Route Calls</th>
                            <th rowspan="2" style="width: 70px;">Actions</th>
                        </tr>
                        <tr>
                            <!-- Outbound Calls -->
                            <th>TPP/TTI</th>
                            <th>PGU</th>
                            <th>BTM</th>
                            <th>KIJ</th>
                            <th>ICA</th>
                            <th>PNK</th>
                            <!-- Inbound Calls -->
                            <th>KIJ</th>
                            <th>BTM</th>
                            <th>PGU</th>
                            <th>BTM</th>
                        </tr>
                    </thead>
                    <tbody id="schedule-rows">
                        <!-- Loaded dynamically -->
                        <tr>
                            <td colspan="15" style="padding: 40px; color: var(--text-muted);">
                                Loading schedule list...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Legend and Info -->
            <div class="legend-container">
                <div class="legend-item">
                    <div class="legend-dot green"></div>
                    <span>Actual Time Entered (ATA / ATD)</span>
                </div>
                <div class="legend-item" style="margin-left: 10px;">
                    <div class="legend-dot blue"></div>
                    <span>Outbound Voyage Leg</span>
                </div>
            </div>
        </div>

    </div>

    <!-- CREATE VOYAGE MODAL -->
    <div id="create-modal" class="modal-overlay" onclick="closeModalOnOverlay(event)">
        <div class="modal-card">
            <div class="modal-header">
                <h3>Add New Sailing Voyage</h3>
                <span class="modal-close" onclick="closeModal('create-modal')">&times;</span>
            </div>
            <form id="create-voyage-form" onsubmit="createVoyage(event)">
                <div class="modal-body">
                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label for="tug">Tug Name *</label>
                            <input type="text" id="tug" required placeholder="e.g. MEGAH 1611">
                        </div>
                        <div class="form-group">
                            <label for="barge">Barge Name *</label>
                            <input type="text" id="barge" required placeholder="e.g. MMSS 2711">
                        </div>
                    </div>
                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 10px;">
                        <div class="form-group">
                            <label for="voyage_out">Voyage Out *</label>
                            <input type="text" id="voyage_out" required placeholder="e.g. 261013S">
                        </div>
                        <div class="form-group">
                            <label for="voyage_in">Voyage In (Inbound)</label>
                            <input type="text" id="voyage_in" placeholder="e.g. 261013N">
                        </div>
                    </div>
                    <div class="form-group" style="margin-top: 10px;">
                        <label for="template">Route Template *</label>
                        <select id="template" required onchange="onTemplateChange()">
                            <option value="standard">Standard Route (BTM - KIJ - ICA - PNK - KIJ - BTM - PGU - BTM)</option>
                            <option value="long">Long Route (TPP - PGU - BTM - KIJ - ICA - PNK - KIJ - BTM - PGU - BTM)</option>
                            <option value="short">Short Route (BTM - PGU - BTM)</option>
                            <option value="custom">Custom (Create from scratch)</option>
                        </select>
                    </div>

                    <!-- ROUTE CALLS CHRONOLOGICAL EDITOR -->
                    <div class="form-group" style="margin-top: 15px;">
                        <label style="display: flex; justify-content: space-between; align-items: center;">
                            <span>Route Port calls & Timing *</span>
                            <button type="button" class="btn btn-outline btn-sm" style="padding: 4px 8px; font-size: 0.75rem; border-radius: var(--radius-sm);" onclick="addRoutePortRow()">+ Add Port Call</button>
                        </label>
                        <div class="route-editor-wrapper" style="max-height: 220px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 8px; background-color: rgba(0,0,0,0.15);">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                                <thead>
                                    <tr style="border-bottom: 1px solid var(--border-color); text-align: left; color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase;">
                                        <th style="padding: 4px;">Port</th>
                                        <th style="padding: 4px; width: 75px;">Leg</th>
                                        <th style="padding: 4px; width: 85px;">Travel (Days)</th>
                                        <th style="padding: 4px; width: 85px;">Stay (Days)</th>
                                        <th style="padding: 4px; width: 35px; text-align: center;">Act</th>
                                    </tr>
                                </thead>
                                <tbody id="route-ports-list">
                                    <!-- Populated dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="form-group" style="margin-top: 10px;">
                        <label for="start_date">Start Date (ETA at First Port) *</label>
                        <input type="date" id="start_date" required>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline" onclick="closeModal('create-modal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Voyage</button>
                </div>
            </form>
        </div>
    </div>

    <!-- UPDATE ACTUAL TIMES MODAL -->
    <div id="actual-modal" class="modal-overlay" onclick="closeModalOnOverlay(event)">
        <div class="modal-card">
            <div class="modal-header">
                <h3>Input Port Call Actual Times</h3>
                <span class="modal-close" onclick="closeModal('actual-modal')">&times;</span>
            </div>
            <form id="actual-times-form" onsubmit="saveActualTimes(event)">
                <input type="hidden" id="update-port-call-id">
                <div class="modal-body">
                    <div style="background-color: rgba(59, 130, 246, 0.08); padding: 14px; border-radius: var(--radius-md); border: 1px solid rgba(59, 130, 246, 0.2); margin-bottom: 20px;">
                        <h4 style="font-size: 0.95rem; margin-bottom: 4px; color: var(--color-primary);" id="update-port-title">Port: KIJ</h4>
                        <p style="font-size: 0.8rem; color: var(--text-secondary);" id="update-port-desc">Vessel: MEGAH 1611 / MMSS 2711 (Voy Out: 261013S)</p>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px; font-size: 0.8rem; color: var(--text-muted);">
                        <div>
                            <span>Current Est. ETA:</span>
                            <strong style="display: block; color: var(--text-secondary); margin-top: 4px;" id="lbl-est-eta">N/A</strong>
                        </div>
                        <div>
                            <span>Current Est. ETD:</span>
                            <strong style="display: block; color: var(--text-secondary); margin-top: 4px;" id="lbl-est-etd">N/A</strong>
                        </div>
                    </div>

                    <div class="form-group" style="margin-top: 15px;">
                        <label for="ata">Actual Time of Arrival (ATA)</label>
                        <input type="datetime-local" id="ata">
                        <p style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">If entered, ETA will match ATA. Subsequent ports will shift by the arrival delay.</p>
                    </div>

                    <div class="form-group" style="margin-top: 15px;">
                        <label for="atd">Actual Time of Departure (ATD)</label>
                        <input type="datetime-local" id="atd">
                        <p style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">If entered, ETD will match ATD. Subsequent ports will shift by the departure delay.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline" onclick="closeModal('actual-modal')">Cancel</button>
                    <button type="submit" class="btn btn-success">Update Timeline</button>
                </div>
            </form>
        </div>
    </div>

    <!-- JavaScript Actions -->
    <script>
        let allSchedules = [];

        document.addEventListener('DOMContentLoaded', () => {
            loadSchedules();
        });

        // Fetch schedules list
        async function loadSchedules() {
            try {
                const response = await fetch('api.php?action=list');
                if (!response.ok) throw new Error('HTTP error');
                
                const result = await response.json();
                if (result.success) {
                    allSchedules = result.data || [];
                    renderSchedules();
                } else {
                    showAlert('error', 'Failed to load list: ' + result.error);
                }
            } catch (error) {
                showAlert('error', 'Database connection failed. Make sure to import schedule_schema.sql.');
            }
        }

        // Map port calls to standard column slot layout
        function mapPortCallsToSlots(portCalls) {
            const slots = {
                out_1: null, // TPP / TTI / BTM (Start)
                out_2: null, // PGU
                out_3: null, // BTM
                out_4: null, // KIJ
                out_5: null, // ICA
                out_6: null, // PNK
                in_1: null,  // KIJ
                in_2: null,  // BTM
                in_3: null,  // PGU
                in_4: null   // BTM (End)
            };
            
            portCalls.forEach(pc => {
                const name = pc.port_name.toUpperCase();
                if (pc.type === 'OUT') {
                    if (name === 'TPP' || name === 'TTI') slots.out_1 = pc;
                    else if (name === 'BTM' && pc.sequence_no === 1) slots.out_1 = pc;
                    else if (name === 'PGU') slots.out_2 = pc;
                    else if (name === 'BTM') slots.out_3 = pc;
                    else if (name === 'KIJ') slots.out_4 = pc;
                    else if (name === 'ICA') slots.out_5 = pc;
                    else if (name === 'PNK') slots.out_6 = pc;
                } else { // IN
                    if (name === 'KIJ') slots.in_1 = pc;
                    else if (name === 'BTM' && (pc.sequence_no === 8 || pc.sequence_no === 6)) slots.in_2 = pc;
                    else if (name === 'PGU') slots.in_3 = pc;
                    else if (name === 'BTM') slots.in_4 = pc;
                }
            });
            
            return slots;
        }

        // Render rows in the schedule table
        function renderSchedules() {
            const tbody = document.getElementById('schedule-rows');
            if (allSchedules.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="15" class="no-schedule">
                            <h3>No Sailing Schedules Registered</h3>
                            <p>Click "Add New Sailing Voyage" to create one.</p>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = allSchedules.map(voy => {
                const slots = mapPortCallsToSlots(voy.port_calls);
                
                return `
                    <tr>
                        <td class="vessel-cell">${escapeHtml(voy.tug)}</td>
                        <td class="vessel-cell">${escapeHtml(voy.barge)}</td>
                        <td class="voy-cell">${escapeHtml(voy.voyage_out)}</td>
                        
                        <!-- Outbound Calls -->
                        ${renderPortCell(slots.out_1)}
                        ${renderPortCell(slots.out_2)}
                        ${renderPortCell(slots.out_3)}
                        ${renderPortCell(slots.out_4)}
                        ${renderPortCell(slots.out_5)}
                        ${renderPortCell(slots.out_6)}
                        
                        <td class="voy-cell">${escapeHtml(voy.voyage_in || '-')}</td>
                        
                        <!-- Inbound Calls -->
                        ${renderPortCell(slots.in_1)}
                        ${renderPortCell(slots.in_2)}
                        ${renderPortCell(slots.in_3)}
                        ${renderPortCell(slots.in_4)}
                        
                        <td style="text-align: center;">
                            <button class="btn btn-danger btn-sm" style="padding: 6px 10px;" onclick="deleteVoyage(${voy.id})" title="Delete Voyage">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Render port cell (ETA/ETD or actual highlights)
        function renderPortCell(pc) {
            if (!pc) {
                return `<td style="color: var(--text-muted); background-color: rgba(0, 0, 0, 0.05);">-</td>`;
            }

            const formatD = (dateStr) => {
                if (!dateStr) return '';
                const date = new Date(dateStr);
                const day = date.getDate();
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const month = months[date.getMonth()];
                return `${day}-${month}`;
            };

            const etaDisplay = pc.ata ? `<span class="actual-highlight">${formatD(pc.ata)}</span>` : formatD(pc.eta);
            const etdDisplay = pc.atd ? `<span class="actual-highlight">${formatD(pc.atd)}</span>` : (pc.etd ? formatD(pc.etd) : 'TBA');

            return `
                <td class="port-cell" onclick="openActualModal(${pc.id})">
                    <div class="date-block">
                        <div class="date-row">
                            <span class="date-label">ETA:</span>
                            <span class="date-val">${etaDisplay}</span>
                        </div>
                        <div class="date-row">
                            <span class="date-label">ETD:</span>
                            <span class="date-val">${etdDisplay}</span>
                        </div>
                    </div>
                </td>
            `;
        }

        // Modals utility
        function openCreateModal() {
            document.getElementById('create-modal').classList.add('active');
            onTemplateChange();
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('active');
        }

        function closeModalOnOverlay(event) {
            if (event.target.classList.contains('modal-overlay')) {
                event.target.classList.remove('active');
            }
        }

        // Open actual time entry modal
        function openActualModal(portCallId) {
            // Find port call details
            let targetPC = null;
            let targetVoy = null;
            
            for (let voy of allSchedules) {
                const found = voy.port_calls.find(c => c.id === portCallId);
                if (found) {
                    targetPC = found;
                    targetVoy = voy;
                    break;
                }
            }

            if (!targetPC) return;

            document.getElementById('update-port-call-id').value = portCallId;
            document.getElementById('update-port-title').textContent = `Port: ${targetPC.port_name} (${targetPC.type === 'OUT' ? 'Outbound Leg' : 'Inbound Leg'})`;
            document.getElementById('update-port-desc').textContent = `Vessel: ${targetVoy.tug} / ${targetVoy.barge} (Voyage Out: ${targetVoy.voyage_out})`;

            document.getElementById('lbl-est-eta').textContent = targetPC.eta ? new Date(targetPC.eta).toLocaleString() : 'N/A';
            document.getElementById('lbl-est-etd').textContent = targetPC.etd ? new Date(targetPC.etd).toLocaleString() : 'N/A';

            // Pre-fill inputs with current actuals (if any) formatted as datetime-local format
            const formatForInput = (dateStr) => {
                if (!dateStr) return '';
                const d = new Date(dateStr);
                const pad = (num) => String(num).padStart(2, '0');
                return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            };

            document.getElementById('ata').value = formatForInput(targetPC.ata);
            document.getElementById('atd').value = formatForInput(targetPC.atd);

            document.getElementById('actual-modal').classList.add('active');
        }

        // Submit new Voyage
        async function createVoyage(event) {
            event.preventDefault();
            
            // Collect dynamic routes from editor
            const rows = document.querySelectorAll('#route-ports-list .route-port-row');
            const customRoutes = [];
            
            rows.forEach(row => {
                const portInput = row.querySelector('.port-name-input');
                const typeSelect = row.querySelector('.port-type-select');
                const travelInput = row.querySelector('.port-travel-input');
                const stayInput = row.querySelector('.port-stay-input');
                
                if (portInput && typeSelect && travelInput && stayInput) {
                    const portName = portInput.value.trim().toUpperCase();
                    const type = typeSelect.value;
                    const travelDays = parseFloat(travelInput.value) || 0;
                    const stayDays = parseFloat(stayInput.value) || 0;
                    
                    if (portName) {
                        customRoutes.push({
                            port_name: portName,
                            type: type,
                            travel_days: travelDays,
                            stay_days: stayDays
                        });
                    }
                }
            });
            
            if (customRoutes.length === 0) {
                showAlert('error', 'Please add at least one port call to the route sequence.');
                return;
            }
            
            const payload = {
                tug: document.getElementById('tug').value.trim(),
                barge: document.getElementById('barge').value.trim(),
                voyage_out: document.getElementById('voyage_out').value.trim(),
                voyage_in: document.getElementById('voyage_in').value.trim(),
                start_date: document.getElementById('start_date').value,
                routes: customRoutes
            };

            try {
                const response = await fetch('api.php?action=create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error('HTTP error');
                const result = await response.json();
                
                if (result.success) {
                    showAlert('success', 'Sailing voyage and chronological port calls created successfully.');
                    closeModal('create-modal');
                    document.getElementById('create-voyage-form').reset();
                    loadSchedules();
                } else {
                    showAlert('error', 'Error creating voyage: ' + result.error);
                }
            } catch (error) {
                showAlert('error', 'Connection failed while submitting data.');
            }
        }

        // Save ATA / ATD inputs
        async function saveActualTimes(event) {
            event.preventDefault();
            
            const pcId = document.getElementById('update-port-call-id').value;
            const ataVal = document.getElementById('ata').value;
            const atdVal = document.getElementById('atd').value;

            // Find current port call
            let currentPC = null;
            for (let voy of allSchedules) {
                const found = voy.port_calls.find(c => c.id == pcId);
                if (found) { currentPC = found; break; }
            }

            if (!currentPC) return;

            // Determine if updating ATA or ATD
            // If they modify both, we will submit two calls or we submit whichever is updated.
            // Let's check which field was updated or has value
            // To make it simple, if ATA is entered and changed from current pc.ata:
            const formatFromInput = (inputVal) => {
                if (!inputVal) return '';
                return inputVal.replace('T', ' ') + ':00';
            };

            const dbAta = formatFromInput(ataVal);
            const dbAtd = formatFromInput(atdVal);

            try {
                // If ATA changed, update ATA first
                if (dbAta && dbAta !== currentPC.ata) {
                    await submitActualUpdate(pcId, 'ata', dbAta);
                }
                
                // If ATD changed, update ATD
                if (dbAtd && dbAtd !== currentPC.atd) {
                    await submitActualUpdate(pcId, 'atd', dbAtd);
                }

                showAlert('success', 'Actual times updated successfully. Subsequent schedule ports cascaded.');
                closeModal('actual-modal');
                loadSchedules();
            } catch (err) {
                showAlert('error', 'Error updating times: ' + err.message);
            }
        }

        async function submitActualUpdate(portCallId, type, value) {
            const response = await fetch('api.php?action=update_actual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    port_call_id: portCallId,
                    actual_type: type,
                    actual_value: value
                })
            });

            if (!response.ok) throw new Error('HTTP network error');
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            return result;
        }

        // Delete Voyage
        function deleteVoyage(id) {
            Swal.fire({
                title: 'Apakah Anda yakin?',
                text: "Jadwal pelayaran kapal dan semua data port calls terkait akan dihapus secara permanen!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#475569',
                confirmButtonText: 'Ya, hapus!',
                cancelButtonText: 'Batal',
                background: '#1e293b',
                color: '#f8fafc',
                iconColor: '#f59e0b',
                backdrop: 'rgba(11, 15, 25, 0.7)'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const response = await fetch(`api.php?action=delete&id=${id}`, {
                            method: 'POST'
                        });

                        if (!response.ok) throw new Error('HTTP error');
                        const resultData = await response.json();

                        if (resultData.success) {
                            Swal.fire({
                                title: 'Terhapus!',
                                text: 'Jadwal pelayaran kapal berhasil dihapus.',
                                icon: 'success',
                                background: '#1e293b',
                                color: '#f8fafc',
                                confirmButtonColor: '#3b82f6'
                            });
                            loadSchedules();
                        } else {
                            Swal.fire({
                                title: 'Gagal!',
                                text: 'Gagal menghapus: ' + resultData.error,
                                icon: 'error',
                                background: '#1e293b',
                                color: '#f8fafc',
                                confirmButtonColor: '#3b82f6'
                            });
                        }
                    } catch (error) {
                        Swal.fire({
                            title: 'Error!',
                            text: 'Terjadi kesalahan koneksi saat menghapus.',
                            icon: 'error',
                            background: '#1e293b',
                            color: '#f8fafc',
                            confirmButtonColor: '#3b82f6'
                        });
                    }
                }
            });
        }

        // Alert helper
        function showAlert(type, message) {
            const alertBox = document.getElementById('alert-box');
            alertBox.className = `alert alert-${type}`;
            alertBox.innerHTML = message;
            alertBox.style.display = 'block';
            
            window.scrollTo({ top: 0, behavior: 'smooth' });

            setTimeout(() => {
                alertBox.style.display = 'none';
            }, 5000);
        }

        // Escape helper
        function escapeHtml(str) {
            if (!str) return '';
            return str
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        // --- Route Template Editor Helpers ---
        const defaultRoutes = {
            standard: [
                { port_name: 'BTM', type: 'OUT', travel_days: 0, stay_days: 1 },
                { port_name: 'KIJ', type: 'OUT', travel_days: 3, stay_days: 1 },
                { port_name: 'ICA', type: 'OUT', travel_days: 2, stay_days: 4 },
                { port_name: 'PNK', type: 'OUT', travel_days: 2, stay_days: 1 },
                { port_name: 'KIJ', type: 'IN', travel_days: 1, stay_days: 1 },
                { port_name: 'BTM', type: 'IN', travel_days: 3, stay_days: 1 },
                { port_name: 'PGU', type: 'IN', travel_days: 1, stay_days: 1 },
                { port_name: 'BTM', type: 'IN', travel_days: 1, stay_days: 0 }
            ],
            long: [
                { port_name: 'TPP', type: 'OUT', travel_days: 0, stay_days: 1 },
                { port_name: 'PGU', type: 'OUT', travel_days: 1, stay_days: 1 },
                { port_name: 'BTM', type: 'OUT', travel_days: 1, stay_days: 1 },
                { port_name: 'KIJ', type: 'OUT', travel_days: 4, stay_days: 1 },
                { port_name: 'ICA', type: 'OUT', travel_days: 2, stay_days: 4 },
                { port_name: 'PNK', type: 'OUT', travel_days: 2, stay_days: 1 },
                { port_name: 'KIJ', type: 'IN', travel_days: 1, stay_days: 1 },
                { port_name: 'BTM', type: 'IN', travel_days: 3, stay_days: 1 },
                { port_name: 'PGU', type: 'IN', travel_days: 1, stay_days: 1 },
                { port_name: 'BTM', type: 'IN', travel_days: 1, stay_days: 0 }
            ],
            short: [
                { port_name: 'BTM', type: 'OUT', travel_days: 0, stay_days: 1 },
                { port_name: 'PGU', type: 'OUT', travel_days: 1, stay_days: 1 },
                { port_name: 'BTM', type: 'IN', travel_days: 1, stay_days: 0 }
            ]
        };

        function onTemplateChange() {
            const templateVal = document.getElementById('template').value;
            const listBody = document.getElementById('route-ports-list');
            listBody.innerHTML = '';

            if (templateVal === 'custom') {
                addRoutePortRow();
                return;
            }

            const ports = defaultRoutes[templateVal] || [];
            ports.forEach(p => {
                addRoutePortRow(p.port_name, p.type, p.travel_days, p.stay_days);
            });
        }

        function addRoutePortRow(portName = '', type = 'OUT', travelDays = 0, stayDays = 0) {
            const listBody = document.getElementById('route-ports-list');
            const tr = document.createElement('tr');
            tr.className = 'route-port-row';
            tr.style.borderBottom = '1px solid var(--border-color)';

            tr.innerHTML = `
                <td style="padding: 6px 4px;">
                    <input type="text" class="port-name-input" required value="${escapeHtml(portName)}" style="width: 100%; padding: 6px 8px; font-size: 0.75rem; text-transform: uppercase;" placeholder="e.g. PNK">
                </td>
                <td style="padding: 6px 4px;">
                    <select class="port-type-select" style="width: 100%; padding: 4px 6px; font-size: 0.75rem;">
                        <option value="OUT" ${type === 'OUT' ? 'selected' : ''}>OUT</option>
                        <option value="IN" ${type === 'IN' ? 'selected' : ''}>IN</option>
                    </select>
                </td>
                <td style="padding: 6px 4px;">
                    <input type="number" class="port-travel-input" required min="0" step="any" value="${travelDays}" style="width: 100%; padding: 6px 8px; font-size: 0.75rem;">
                </td>
                <td style="padding: 6px 4px;">
                    <input type="number" class="port-stay-input" required min="0" step="any" value="${stayDays}" style="width: 100%; padding: 6px 8px; font-size: 0.75rem;">
                </td>
                <td style="padding: 6px 4px; text-align: center; vertical-align: middle;">
                    <button type="button" style="background: transparent; color: var(--color-danger); border: none; font-size: 1.25rem; font-weight: bold; cursor: pointer; padding: 0 4px; line-height: 1;" onclick="removeRoutePortRow(this)" title="Remove Port Call">&times;</button>
                </td>
            `;
            listBody.appendChild(tr);
        }

        function removeRoutePortRow(btn) {
            const row = btn.closest('tr');
            row.remove();
        }
    </script>
</body>
</html>
