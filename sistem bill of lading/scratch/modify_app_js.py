import os

app_path = "app.js"

with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Modify switchView(viewName)
target_switch = """    } else if (viewName === 'trucking') {
        const navTruckingBtn = document.getElementById('nav-trucking-btn');
        if (navTruckingBtn) navTruckingBtn.classList.add('active');
        document.getElementById('page-title').textContent = 'Truck Monitoring';
        document.getElementById('page-subtitle').textContent = 'Monitoring transloading kontainer dan lansiran trucking trailer ke CDD';
        loadTruckingList();
    }"""

replacement_switch = """    } else if (viewName === 'trucking') {
        const navTruckingBtn = document.getElementById('nav-trucking-btn');
        if (navTruckingBtn) navTruckingBtn.classList.add('active');
        document.getElementById('page-title').textContent = 'Truck Monitoring';
        document.getElementById('page-subtitle').textContent = 'Monitoring transloading kontainer dan lansiran trucking trailer ke CDD';
        loadTruckingList();
    } else if (viewName === 'container-list') {
        const navBtn = document.getElementById('nav-container-list-btn');
        if (navBtn) navBtn.classList.add('active');
        document.getElementById('page-title').textContent = 'Container Submissions Admin';
        document.getElementById('page-subtitle').textContent = 'Manage and copy container lists received from exporters';
        loadContainerSubmissions();
    } else if (viewName === 'movement-dashboard') {
        const navBtn = document.getElementById('nav-movement-btn');
        if (navBtn) navBtn.classList.add('active');
        document.getElementById('page-title').textContent = 'Container Movement Tracking';
        document.getElementById('page-subtitle').textContent = 'Track, input, and export container movements for each Voyage';
        loadMovementVoyages();
    } else if (viewName === 'movement-editor') {
        document.getElementById('page-title').textContent = 'Voyage Editor';
        document.getElementById('page-subtitle').textContent = 'Spreadsheet Grid Editor';
    }"""

if target_switch in content:
    content = content.replace(target_switch, replacement_switch)
    print("switchView modified successfully!")
else:
    print("Error: switchView target not found!")

# 2. Modify setupEventListeners()
target_listeners = """    const navTruckingBtn = document.getElementById('nav-trucking-btn');
    if (navTruckingBtn) {
        navTruckingBtn.addEventListener('click', () => {
            switchView('trucking');
        });
    }"""

replacement_listeners = """    const navTruckingBtn = document.getElementById('nav-trucking-btn');
    if (navTruckingBtn) {
        navTruckingBtn.addEventListener('click', () => {
            switchView('trucking');
        });
    }

    const navContainerListBtn = document.getElementById('nav-container-list-btn');
    if (navContainerListBtn) {
        navContainerListBtn.addEventListener('click', () => {
            switchView('container-list');
        });
    }

    const navMovementBtn = document.getElementById('nav-movement-btn');
    if (navMovementBtn) {
        navMovementBtn.addEventListener('click', () => {
            switchView('movement-dashboard');
        });
    }"""

if target_listeners in content:
    content = content.replace(target_listeners, replacement_listeners)
    print("setupEventListeners modified successfully!")
else:
    print("Error: setupEventListeners target not found!")

# 3. Append the feature logic at the bottom of the file
feature_logic = """

// ==========================================================================
// SPA INTEGRATION: CONTAINER LIST ADMIN FEATURE LOGIC
// ==========================================================================
let allContainerSubmissions = [];

async function loadContainerSubmissions() {
    const container = document.getElementById('container-submissions-list');
    try {
        const response = await fetch('kontainer/api.php');
        if (!response.ok) throw new Error('HTTP error');
        
        const result = await response.json();
        if (result.success) {
            allContainerSubmissions = result.data || [];
            renderContainerSubmissions(allContainerSubmissions);
        } else {
            container.innerHTML = `<div class="alert alert-error">Error loading: ${escapeHtml(result.error)}</div>`;
        }
    } catch (error) {
        container.innerHTML = `<div class="alert alert-error">Could not connect to database. Make sure you have imported the SQL schema.</div>`;
    }
}

function renderContainerSubmissions(list) {
    const container = document.getElementById('container-submissions-list');
    if (list.length === 0) {
        container.innerHTML = `
            <div class="no-submissions">
                <h3>No Submissions Found</h3>
                <p>When exporters or importers submit container data, it will appear here.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(sub => {
        const formattedDate = new Date(sub.created_at).toLocaleString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const vessel1 = sub.vessel_name_1 ? `${sub.vessel_name_1} V.${sub.voyage_1}` : 'N/A';

        return `
            <div class="submission-card" id="submission-card-${sub.id}">
                <div class="submission-header" onclick="toggleSubmissionDetails(${sub.id})">
                    <div class="submission-meta">
                        <div class="submission-ref">${escapeHtml(sub.ref_no)}</div>
                        <div class="submission-date">Submitted: ${formattedDate}</div>
                        <div class="submission-vessels">
                            <span class="vessel-tag">Vessel: ${escapeHtml(vessel1)}</span>
                        </div>
                    </div>
                    <div class="submission-actions" onclick="event.stopPropagation()">
                        <span class="badge badge-count" style="margin-right:8px;">${sub.total_containers} Containers</span>
                        <button class="btn btn-outline btn-sm" onclick="toggleSubmissionDetails(${sub.id})">
                            View / Copy Details
                        </button>
                        <button class="btn btn-danger btn-sm" style="padding: 8px 10px;" onclick="deleteSubmission(${sub.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </div>
                <div class="submission-details" id="submission-details-${sub.id}">
                    <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                        Loading details...
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function toggleSubmissionDetails(id) {
    const panel = document.getElementById(`submission-details-${id}`);
    const isActive = panel.classList.contains('active');
    
    // Close other details
    document.querySelectorAll('.submission-details').forEach(p => {
        p.classList.remove('active');
    });

    if (!isActive) {
        panel.classList.add('active');
        try {
            const response = await fetch(`kontainer/api.php?action=detail&id=${id}`);
            if (!response.ok) throw new Error('HTTP error');
            
            const result = await response.json();
            if (result.success) {
                const data = result.data;
                const items = data.items || [];
                const sub = data.submission;

                const containerSealStr = items.map(i => `${i.container_no} / ${i.seal_no}`).join('\\n');
                const weightsStr = items.map(i => i.weight).join('\\n');

                let shippedDesc = `SHIPPER'S LOAD, COUNT & SEAL.\\n${items.length}X CONTAINER S.T.C\\n\\n`;
                if (sub.vessel_name_1) {
                    shippedDesc += `SHIPPED ON BOARD : ${sub.vessel_name_1} V.${sub.voyage_1}\\n`;
                    if (sub.etd_1) {
                        shippedDesc += `ETD: ${sub.etd_1}\\n`;
                    }
                }

                panel.innerHTML = `
                    <div class="details-grid">
                        <div>
                            <h3 style="font-size: 1.05rem; margin-bottom: 12px; font-weight: 600;">Submitted Containers List</h3>
                            <div class="container-table-wrapper" style="margin-top: 0; max-height: 400px; overflow-y: auto;">
                                <table class="container-table">
                                    <thead>
                                        <tr>
                                            <th style="width: 50px;">No</th>
                                            <th>Container No.</th>
                                            <th>Seal No.</th>
                                            <th>Weight</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${items.map((item, idx) => `
                                            <tr>
                                                <td style="font-weight: bold; color: var(--text-muted);">${idx + 1}</td>
                                                <td style="font-family: monospace; font-weight: bold; color: var(--color-primary);">${escapeHtml(item.container_no)}</td>
                                                <td style="font-family: monospace; color: var(--text-primary);">${escapeHtml(item.seal_no)}</td>
                                                <td style="font-weight: 500;">${escapeHtml(item.weight)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="copy-utility-box">
                            <h3 style="font-size: 1.05rem; font-weight: 600;">B/L Integration Utility</h3>
                            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px;">Copy these pre-formatted fields and paste them directly into the cargo sections of your B/L editor form.</p>
                            
                            <div class="form-group" style="margin-bottom: 12px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom:4px;">
                                    <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">1. Container & Seal No. Column</label>
                                    <button class="btn btn-outline btn-sm" style="padding: 2px 8px; font-size: 0.7rem;" onclick="copyToClipboard('${id}-copy-containers')">📋 Copy</button>
                                </div>
                                <textarea id="${id}-copy-containers" rows="3" readonly class="copy-preview">${escapeHtml(containerSealStr)}</textarea>
                            </div>

                            <div class="form-group" style="margin-bottom: 12px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom:4px;">
                                    <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">2. Cargo Measurement & Weight Column</label>
                                    <button class="btn btn-outline btn-sm" style="padding: 2px 8px; font-size: 0.7rem;" onclick="copyToClipboard('${id}-copy-weights')">📋 Copy</button>
                                </div>
                                <textarea id="${id}-copy-weights" rows="3" readonly class="copy-preview">${escapeHtml(weightsStr)}</textarea>
                            </div>

                            <div class="form-group" style="margin-bottom: 12px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom:4px;">
                                    <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">3. Vessel & Routing Description of Goods</label>
                                    <button class="btn btn-outline btn-sm" style="padding: 2px 8px; font-size: 0.7rem;" onclick="copyToClipboard('${id}-copy-description')">📋 Copy</button>
                                </div>
                                <textarea id="${id}-copy-description" rows="4" readonly class="copy-preview">${escapeHtml(shippedDesc)}</textarea>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                panel.innerHTML = `<div style="color: var(--color-danger); padding: 10px;">Failed: ${escapeHtml(result.error)}</div>`;
            }
        } catch (error) {
            panel.innerHTML = `<div style="color: var(--color-danger); padding: 10px;">Error loading detail.</div>`;
        }
    }
}

function filterContainerSubmissions() {
    const query = document.getElementById('container-list-search').value.toLowerCase().trim();
    if (!query) {
        renderContainerSubmissions(allContainerSubmissions);
        return;
    }

    const filtered = allContainerSubmissions.filter(sub => {
        const dateStr = new Date(sub.created_at).toLocaleDateString().toLowerCase();
        return (
            (sub.ref_no && sub.ref_no.toLowerCase().includes(query)) ||
            (sub.vessel_name_1 && sub.vessel_name_1.toLowerCase().includes(query)) ||
            (sub.voyage_1 && sub.voyage_1.toLowerCase().includes(query)) ||
            dateStr.includes(query)
        );
    });

    renderContainerSubmissions(filtered);
}

async function deleteSubmission(id) {
    const confirmDel = await Swal.fire({
        title: 'Delete Submission?',
        text: "Are you sure you want to delete this container submission?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--color-danger)',
        confirmButtonText: 'Yes, delete it!'
    });

    if (confirmDel.isConfirmed) {
        try {
            const response = await fetch(`kontainer/api.php?id=${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.success) {
                Swal.fire('Deleted!', 'Submission deleted.', 'success');
                allContainerSubmissions = allContainerSubmissions.filter(sub => sub.id !== id);
                renderContainerSubmissions(allContainerSubmissions);
            } else {
                Swal.fire('Error', result.error, 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Deletion request failed.', 'error');
        }
    }
}

// Global copy utility
window.copyToClipboard = function(elementId) {
    const textarea = document.getElementById(elementId);
    if (!textarea) return;
    textarea.select();
    document.execCommand('copy');
    
    const button = textarea.previousElementSibling.querySelector('button');
    const originalText = button.innerHTML;
    button.innerHTML = '✔ Copied!';
    button.style.color = 'var(--color-success)';
    button.style.borderColor = 'var(--color-success)';
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.style.color = '';
        button.style.borderColor = '';
    }, 2000);
};


// ==========================================================================
// SPA INTEGRATION: CONTAINER MOVEMENT FEATURE LOGIC
// ==========================================================================
let allMovementVoyages = [];
let activeMovementVoyage = null;
let movementGridData = [];
const MOVEMENT_COL_NAMES = [
    'port', 'pol', 'mlo', 'size', 'cntr_num', 'shipper_in', 'consignee_in', 'bl_number',
    'status_in', 'vessel_in', 'loaded_in', 'discharge', 'gate_out', 'depot_in', 'depot',
    'condition', 'depot_out', 'gate_in_cy', 'shipper_out', 'consignee_out', 'status_out',
    'vessel_out', 'loaded_out', 'pod'
];

async function loadMovementVoyages() {
    try {
        const response = await fetch('movement/api.php');
        const result = await response.json();
        if (result.success) {
            allMovementVoyages = result.data || [];
            renderMovementVoyages(allMovementVoyages);
        } else {
            Swal.fire('Error', 'Failed to load voyages: ' + result.error, 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Could not retrieve movement voyages.', 'error');
    }
}

function renderMovementVoyages(list) {
    const container = document.getElementById('voyages-list-container');
    if (list.length === 0) {
        container.innerHTML = `
            <div style="grid-column: span 3; text-align: center; padding: 40px; color: var(--text-muted); background-color: rgba(255,255,255,0.02); border: 1px dashed var(--border-color); border-radius: var(--radius-lg);">
                <h3>No Voyages Found</h3>
                <p style="margin-top: 8px; font-size: 0.9rem;">Click "New Voyage Movement" to create one.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(v => {
        return `
            <div class="voyage-card">
                <div class="voyage-meta">
                    <span class="badge-count">${v.total_containers} Containers</span>
                    <h3 class="voyage-name-title">${escapeHtml(v.voyage_name)}</h3>
                    <div class="voyage-details-row"><i class="fa fa-calendar"></i> Date: ${escapeHtml(v.voyage_date || 'N/A')}</div>
                    <div class="voyage-details-row"><i class="fa fa-clock"></i> Created: ${new Date(v.created_at).toLocaleDateString()}</div>
                </div>
                <div class="voyage-actions">
                    <div>
                        <button class="btn btn-primary btn-sm" onclick="openMovementGridEditor(${v.id})">
                            <i class="fa fa-edit"></i> Edit Grid
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="openEditVoyageModal(${v.id}, '${escapeHtml(v.voyage_name)}', '${escapeHtml(v.voyage_date)}')">
                            Rename
                        </button>
                    </div>
                    <button class="btn btn-danger btn-sm" style="padding: 6px 10px;" onclick="deleteMovementVoyage(${v.id})" title="Delete Voyage">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function filterMovementVoyages() {
    const query = document.getElementById('voyage-search').value.toLowerCase().trim();
    if (!query) {
        renderMovementVoyages(allMovementVoyages);
        return;
    }
    const filtered = allMovementVoyages.filter(v => 
        v.voyage_name.toLowerCase().includes(query) || 
        (v.voyage_date && v.voyage_date.toLowerCase().includes(query))
    );
    renderMovementVoyages(filtered);
}

// Modals Voyage Movement Dashboard
window.openCreateVoyageModal = function() {
    document.getElementById('new-voyage-name').value = '';
    document.getElementById('new-voyage-date').value = '';
    document.getElementById('modal-create-voyage').style.display = 'flex';
};
window.closeCreateVoyageModal = function() {
    document.getElementById('modal-create-voyage').style.display = 'none';
};

window.handleCreateVoyage = async function(e) {
    e.preventDefault();
    const voyage_name = document.getElementById('new-voyage-name').value.trim();
    const voyage_date = document.getElementById('new-voyage-date').value.trim();
    
    try {
        const response = await fetch('movement/api.php?action=create_voyage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voyage_name, voyage_date })
        });
        const result = await response.json();
        if (result.success) {
            closeCreateVoyageModal();
            Swal.fire('Success', 'Voyage created.', 'success');
            loadMovementVoyages();
        } else {
            Swal.fire('Error', result.error, 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Create voyage request failed.', 'error');
    }
};

window.openEditVoyageModal = function(id, name, date) {
    document.getElementById('edit-voyage-id').value = id;
    document.getElementById('edit-voyage-name').value = name;
    document.getElementById('edit-voyage-date').value = date;
    document.getElementById('modal-edit-voyage').style.display = 'flex';
};
window.closeEditVoyageModal = function() {
    document.getElementById('modal-edit-voyage').style.display = 'none';
};

window.handleEditVoyage = async function(e) {
    e.preventDefault();
    const voyageId = document.getElementById('edit-voyage-id').value;
    const voyage_name = document.getElementById('edit-voyage-name').value.trim();
    const voyage_date = document.getElementById('edit-voyage-date').value.trim();

    try {
        const response = await fetch(`movement/api.php?action=save_movement&voyage_id=${voyageId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voyage_name, voyage_date })
        });
        const result = await response.json();
        if (result.success) {
            closeEditVoyageModal();
            Swal.fire('Success', 'Voyage updated.', 'success');
            loadMovementVoyages();
            if (activeMovementVoyage && activeMovementVoyage.id == voyageId) {
                activeMovementVoyage.voyage_name = voyage_name;
                activeMovementVoyage.voyage_date = voyage_date;
                document.getElementById('active-voyage-name').innerText = voyage_name;
                document.getElementById('active-voyage-date-label').innerText = voyage_date ? `(Date: ${voyage_date})` : '';
            }
        } else {
            Swal.fire('Error', result.error, 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Update request failed.', 'error');
    }
};

async function deleteMovementVoyage(id) {
    const confirmDel = await Swal.fire({
        title: 'Are you sure?',
        text: "This will permanently delete this voyage movement and all containers inside it!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--color-danger)',
        confirmButtonText: 'Yes, delete it!'
    });

    if (confirmDel.isConfirmed) {
        try {
            const response = await fetch(`movement/api.php?voyage_id=${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.success) {
                Swal.fire('Deleted!', 'Voyage deleted successfully.', 'success');
                loadMovementVoyages();
            } else {
                Swal.fire('Error', result.error, 'error');
            }
        } catch (e) {
            Swal.fire('Error', 'Request failed.', 'error');
        }
    }
}

// Grid Editor Functions
window.openMovementGridEditor = async function(voyageId) {
    try {
        Swal.fire({
            title: 'Loading grid...',
            didOpen: () => { Swal.showLoading() },
            allowOutsideClick: false
        });

        const response = await fetch(`movement/api.php?action=get_movement&voyage_id=${voyageId}`);
        const result = await response.json();
        
        Swal.close();

        if (result.success) {
            activeMovementVoyage = result.voyage;
            movementGridData = result.containers || [];
            
            document.getElementById('active-voyage-name').innerText = activeMovementVoyage.voyage_name;
            document.getElementById('active-voyage-date-label').innerText = activeMovementVoyage.voyage_date ? `(Date: ${activeMovementVoyage.voyage_date})` : '';
            
            switchView('movement-editor');
            setupMovementDragAndDrop();
            
            renderMovementGrid(movementGridData);
        } else {
            Swal.fire('Error', result.error, 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Failed to retrieve container movement details.', 'error');
    }
};

function renderMovementGrid(dataList) {
    const tbody = document.getElementById('grid-body');
    tbody.innerHTML = '';
    
    // Pre-populate empty rows if empty
    if (dataList.length === 0) {
        for (let i = 0; i < 15; i++) {
            dataList.push({});
        }
    }

    dataList.forEach((row, idx) => {
        tbody.appendChild(createRowElement(idx, row));
    });

    updateGridStats();
}

function createRowElement(index, rowData = {}) {
    const tr = document.createElement('tr');
    tr.dataset.index = index;

    // Checkbox selector
    const tdCheck = document.createElement('td');
    tdCheck.className = 'action-cell';
    tdCheck.innerHTML = `<input type="checkbox" class="row-selector" data-row-idx="${index}" onchange="handleRowSelectChange()">`;
    tr.appendChild(tdCheck);

    // Row No
    const tdNo = document.createElement('td');
    tdNo.className = 'col-no-cell';
    tdNo.innerText = index + 1;
    tr.appendChild(tdNo);

    // Form inputs
    MOVEMENT_COL_NAMES.forEach(col => {
        const td = document.createElement('td');
        const val = rowData[col] !== undefined && rowData[col] !== null ? rowData[col] : '';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'grid-cell-input';
        input.dataset.row = index;
        input.dataset.col = col;
        input.value = val;
        
        input.addEventListener('keydown', handleCellKeyNavigation);
        input.addEventListener('paste', handleCellPaste);
        input.addEventListener('input', updateGridStats);
        
        td.appendChild(input);
        tr.appendChild(td);
    });

    return tr;
}

window.addNewRow = function() {
    const tbody = document.getElementById('grid-body');
    const newIndex = tbody.children.length;
    const newRow = createRowElement(newIndex, {});
    tbody.appendChild(newRow);
    updateGridStats();
    
    const wrapper = document.getElementById('grid-wrapper');
    wrapper.scrollTop = wrapper.scrollHeight;
    
    setTimeout(() => {
        const input = newRow.querySelector('.grid-cell-input');
        if (input) input.focus();
    }, 50);
};

window.clearGrid = function() {
    Swal.fire({
        title: 'Are you sure?',
        text: "This will clear all rows from the editor view. You will need to click 'Save Changes' to save this deletion state.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, clear all!'
    }).then((res) => {
        if (res.isConfirmed) {
            renderMovementGrid([]);
        }
    });
};

// Checkbox select utilities
window.toggleSelectAllRows = function(masterCheckbox) {
    const selectors = document.querySelectorAll('.row-selector');
    selectors.forEach(chk => {
        chk.checked = masterCheckbox.checked;
    });
    handleRowSelectChange();
};

window.handleRowSelectChange = function() {
    const selected = document.querySelectorAll('.row-selector:checked');
    const deleteBtn = document.getElementById('btn-delete-selected');
    if (selected.length > 0) {
        deleteBtn.style.display = 'inline-flex';
        deleteBtn.innerText = `Delete Selected (${selected.length})`;
    } else {
        deleteBtn.style.display = 'none';
    }
};

window.deleteSelectedRows = function() {
    const selected = document.querySelectorAll('.row-selector:checked');
    if (selected.length === 0) return;

    const indicesToDelete = Array.from(selected).map(chk => parseInt(chk.dataset.rowIdx));
    const currentData = getGridData();
    const remainingData = currentData.filter((_, idx) => !indicesToDelete.includes(idx));
    
    renderMovementGrid(remainingData);
    
    document.getElementById('check-all-rows').checked = false;
    handleRowSelectChange();
};

function getGridData() {
    const rows = document.querySelectorAll('#grid-body tr');
    const data = [];
    
    rows.forEach(tr => {
        const rowObj = {};
        let hasValue = false;
        
        MOVEMENT_COL_NAMES.forEach(col => {
            const input = tr.querySelector(`.grid-cell-input[data-col="${col}"]`);
            if (input) {
                const val = input.value.trim();
                rowObj[col] = val;
                if (val !== '') hasValue = true;
            }
        });
        
        if (hasValue) {
            data.push(rowObj);
        }
    });
    
    return data;
}

window.saveMovementData = async function() {
    const containers = getGridData();
    
    Swal.fire({
        title: 'Saving changes...',
        didOpen: () => { Swal.showLoading() },
        allowOutsideClick: false
    });

    try {
        const response = await fetch(`movement/api.php?action=save_movement&voyage_id=${activeMovementVoyage.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ containers })
        });
        const result = await response.json();
        Swal.close();

        if (result.success) {
            Swal.fire('Saved!', 'Container movement details saved.', 'success');
            openMovementGridEditor(activeMovementVoyage.id);
        } else {
            Swal.fire('Error', 'Failed to save: ' + result.error, 'error');
        }
    } catch (err) {
        Swal.close();
        Swal.fire('Error', 'Save request failed.', 'error');
    }
};

// Clipboard and cells key handlers
function handleCellKeyNavigation(e) {
    const input = e.target;
    const currentRow = parseInt(input.dataset.row);
    const currentCol = input.dataset.col;
    const colIndex = MOVEMENT_COL_NAMES.indexOf(currentCol);
    
    let targetInput = null;

    switch (e.key) {
        case 'ArrowUp':
            if (currentRow > 0) {
                targetInput = document.querySelector(`.grid-cell-input[data-row="${currentRow - 1}"][data-col="${currentCol}"]`);
            }
            break;
        case 'ArrowDown':
            targetInput = document.querySelector(`.grid-cell-input[data-row="${currentRow + 1}"][data-col="${currentCol}"]`);
            break;
        case 'ArrowLeft':
            if (input.selectionStart === 0 && colIndex > 0) {
                targetInput = document.querySelector(`.grid-cell-input[data-row="${currentRow}"][data-col="${MOVEMENT_COL_NAMES[colIndex - 1]}"]`);
            }
            break;
        case 'ArrowRight':
            if (input.selectionEnd === input.value.length && colIndex < MOVEMENT_COL_NAMES.length - 1) {
                targetInput = document.querySelector(`.grid-cell-input[data-row="${currentRow}"][data-col="${MOVEMENT_COL_NAMES[colIndex + 1]}"]`);
            }
            break;
        case 'Enter':
            e.preventDefault();
            targetInput = document.querySelector(`.grid-cell-input[data-row="${currentRow + 1}"][data-col="${currentCol}"]`);
            if (!targetInput) {
                addNewRow();
                setTimeout(() => {
                    targetInput = document.querySelector(`.grid-cell-input[data-row="${currentRow + 1}"][data-col="${currentCol}"]`);
                    if (targetInput) targetInput.focus();
                }, 80);
            }
            break;
    }

    if (targetInput) {
        e.preventDefault();
        targetInput.focus();
        targetInput.select();
    }
}

function ensureRowCount(requiredCount) {
    const tbody = document.getElementById('grid-body');
    let currentCount = tbody.children.length;
    while (currentCount < requiredCount) {
        const newRow = createRowElement(currentCount, {});
        tbody.appendChild(newRow);
        currentCount++;
    }
    updateGridStats();
}

function handleCellPaste(e) {
    const pasteData = e.clipboardData.getData('text/plain');
    if (!pasteData) return;

    if (pasteData.includes('\\t') || pasteData.includes('\\n')) {
        e.preventDefault();
        
        const currentInput = e.target;
        const startRow = parseInt(currentInput.dataset.row);
        const startColIdx = MOVEMENT_COL_NAMES.indexOf(currentInput.dataset.col);
        const rows = pasteData.split(/\\r?\\n/);
        
        for (let r = 0; r < rows.length; r++) {
            const rowText = rows[r];
            if (r === rows.length - 1 && rowText.trim() === '') continue;
            
            const cells = rowText.split('\\t');
            const targetRow = startRow + r;
            
            ensureRowCount(targetRow + 1);
            
            for (let c = 0; c < cells.length; c++) {
                const targetColIdx = startColIdx + c;
                if (targetColIdx < MOVEMENT_COL_NAMES.length) {
                    const colName = MOVEMENT_COL_NAMES[targetColIdx];
                    const input = document.querySelector(`.grid-cell-input[data-row="${targetRow}"][data-col="${colName}"]`);
                    if (input) {
                        input.value = cells[c];
                    }
                }
            }
        }
        updateGridStats();
    }
}

// SheetJS Import & Export
window.handleExcelUpload = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    importExcelFile(file);
};

function importExcelFile(file) {
    const reader = new FileReader();
    
    Swal.fire({
        title: 'Parsing Excel file...',
        didOpen: () => { Swal.showLoading() },
        allowOutsideClick: false
    });

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            let headerRowIdx = -1;
            for (let i = 0; i < Math.min(json.length, 15); i++) {
                const r = json[i];
                if (r && (r.includes('Cntr Num') || r.includes('Container No') || r.includes('No') && r.includes('Port'))) {
                    headerRowIdx = i;
                    break;
                }
            }
            
            if (headerRowIdx === -1) {
                headerRowIdx = 4;
            }
            
            const dataRows = json.slice(headerRowIdx + 1);
            const imported = [];
            
            function excelValToString(val) {
                if (val === undefined || val === null) return '';
                
                if (typeof val === 'number' && val > 40000 && val < 50000) {
                    const date = new Date((val - 25569) * 86400 * 1000);
                    const dd = String(date.getDate()).padStart(2, '0');
                    const mm = String(date.getMonth() + 1).padStart(2, '0');
                    const yyyy = date.getFullYear();
                    return `${dd}/${mm}/${yyyy}`;
                }
                return String(val).trim();
            }

            dataRows.forEach(row => {
                if (!row || row.length === 0) return;
                const hasVal = row.some(cell => cell !== undefined && cell !== null && cell !== '');
                if (!hasVal) return;
                
                imported.push({
                    port: excelValToString(row[1]),
                    pol: excelValToString(row[2]),
                    mlo: excelValToString(row[3]),
                    size: excelValToString(row[4]),
                    cntr_num: excelValToString(row[5]),
                    shipper_in: excelValToString(row[6]),
                    consignee_in: excelValToString(row[7]),
                    bl_number: excelValToString(row[8]),
                    status_in: excelValToString(row[9]),
                    vessel_in: excelValToString(row[10]),
                    loaded_in: excelValToString(row[11]),
                    discharge: excelValToString(row[12]),
                    gate_out: excelValToString(row[13]),
                    depot_in: excelValToString(row[14]),
                    depot: excelValToString(row[15]),
                    condition: excelValToString(row[16]),
                    depot_out: excelValToString(row[17]),
                    gate_in_cy: excelValToString(row[18]),
                    shipper_out: excelValToString(row[19]),
                    consignee_out: excelValToString(row[20]),
                    status_out: excelValToString(row[21]),
                    vessel_out: excelValToString(row[22]),
                    loaded_out: excelValToString(row[23]),
                    pod: excelValToString(row[24])
                });
            });

            Swal.close();

            if (imported.length === 0) {
                Swal.fire('Import Warning', 'No container data detected in the sheet.', 'warning');
            } else {
                renderMovementGrid(imported);
                Swal.fire('Imported!', `Loaded ${imported.length} container rows! Click 'Save Changes' to commit to database.`, 'success');
            }

        } catch (err) {
            Swal.close();
            Swal.fire('Error parsing Excel', err.message, 'error');
        }
    };
    
    reader.readAsArrayBuffer(file);
}

window.exportToExcel = function() {
    const list = getGridData();
    if (list.length === 0) {
        Swal.fire('No Data', 'No container data is available to export.', 'info');
        return;
    }

    const sheetData = [];
    sheetData.push(["MOVEMENT CONTAINER PULAU LAUT PNK"]);
    sheetData.push([]);
    sheetData.push([]);
    sheetData.push(["DATE :", "", activeMovementVoyage.voyage_date || '']);
    sheetData.push([
        "No", "Port", "POL", "MLO", "Size", "Cntr Num", "Shipper in", "Consignee in", "B/L Number", 
        "Status", "Vessel", "Loaded", "Discharge", "Gate out", "Depot in", "Depot", "Condition", 
        "Depot out", "Gate in CY", "Shipper out", "Consignee out", "Status", "Vessel", "Loaded", "POD"
    ]);
    sheetData.push([]);

    list.forEach((item, index) => {
        sheetData.push([
            index + 1,
            item.port,
            item.pol,
            item.mlo,
            item.size,
            item.cntr_num,
            item.shipper_in,
            item.consignee_in,
            item.bl_number,
            item.status_in,
            item.vessel_in,
            item.loaded_in,
            item.discharge,
            item.gate_out,
            item.depot_in,
            item.depot,
            item.condition,
            item.depot_out,
            item.gate_in_cy,
            item.shipper_out,
            item.consignee_out,
            item.status_out,
            item.vessel_out,
            item.loaded_out,
            item.pod
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeMovementVoyage.voyage_name);
    
    const wscols = [];
    for (let i = 0; i < 25; i++) {
        wscols.push({ wch: i === 0 ? 6 : i === 5 ? 16 : 14 });
    }
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `${activeMovementVoyage.voyage_name}.xlsx`);
};

// Statistics & filters
window.updateGridStats = function() {
    let total = 0;
    let laden = 0;
    let empty = 0;

    const inputs = document.querySelectorAll('#grid-body tr');
    inputs.forEach(tr => {
        const cntrInput = tr.querySelector('.grid-cell-input[data-col="cntr_num"]');
        const statusInput = tr.querySelector('.grid-cell-input[data-col="status_in"]');
        
        if (cntrInput && cntrInput.value.trim() !== '') {
            total++;
            const statusVal = statusInput ? statusInput.value.trim().toUpperCase() : '';
            if (statusVal.includes('LADEN')) {
                laden++;
            } else if (statusVal.includes('EMPTY') || statusVal === 'MT') {
                empty++;
            } else {
                const statusOutInput = tr.querySelector('.grid-cell-input[data-col="status_out"]');
                const statusOutVal = statusOutInput ? statusOutInput.value.trim().toUpperCase() : '';
                if (statusOutVal.includes('LADEN')) {
                    laden++;
                } else if (statusOutVal.includes('EMPTY') || statusOutVal === 'MT') {
                    empty++;
                }
            }
        }
    });

    document.getElementById('grid-stat-total').innerText = total;
    document.getElementById('grid-stat-laden').innerText = laden;
    document.getElementById('grid-stat-empty').innerText = empty;
};

window.filterGridRows = function() {
    const query = document.getElementById('grid-search').value.toLowerCase().trim();
    const trs = document.querySelectorAll('#grid-body tr');
    
    trs.forEach(tr => {
        if (!query) {
            tr.style.display = '';
            return;
        }
        
        let match = false;
        const inputs = tr.querySelectorAll('.grid-cell-input');
        inputs.forEach(input => {
            if (input.value.toLowerCase().includes(query)) {
                match = true;
            }
        });
        
        tr.style.display = match ? '' : 'none';
    });
};

function setupMovementDragAndDrop() {
    const wrapper = document.getElementById('grid-wrapper');
    const overlay = document.getElementById('drag-overlay');
    if (!wrapper || !overlay) return;
    
    wrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        overlay.style.display = 'flex';
    });

    overlay.addEventListener('dragleave', () => {
        overlay.style.display = 'none';
    });

    overlay.addEventListener('drop', (e) => {
        e.preventDefault();
        overlay.style.display = 'none';
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                importExcelFile(file);
            } else {
                Swal.fire('Invalid File', 'Drop a valid Excel sheet.', 'error');
            }
        }
    });
}
"""

with open(app_path, "a", encoding="utf-8") as f:
    f.write(feature_logic)
print("Event listeners & logic appended successfully!")
