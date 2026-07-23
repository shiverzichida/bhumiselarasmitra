import os

index_path = "index.html"

with open(index_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_views = """
            <!-- VIEW: CONTAINER SUBMISSIONS LIST -->
            <section id="view-container-list" class="content-view">
                <div class="panel">
                    <div class="panel-title">Container Submissions Admin</div>
                    <div class="admin-search-bar">
                        <div class="admin-search-input">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); margin-right: 8px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input type="text" id="container-list-search" placeholder="Search by Booking / SI Reference, Vessel or Date..." oninput="filterContainerSubmissions()">
                        </div>
                        <button class="btn btn-outline" onclick="loadContainerSubmissions()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                            Refresh
                        </button>
                    </div>

                    <div id="container-submissions-list">
                        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                            Loading submissions...
                        </div>
                    </div>
                </div>
            </section>

            <!-- VIEW: CONTAINER MOVEMENT DASHBOARD -->
            <section id="view-movement-dashboard" class="content-view">
                <div class="panel">
                    <div class="panel-title" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                        <span>Voyages Movement Tracking</span>
                        <button class="btn btn-primary btn-sm" onclick="openCreateVoyageModal()">
                            <i class="fa fa-plus"></i> New Voyage Movement
                        </button>
                    </div>
                    <div class="admin-search-bar" style="margin-bottom: 20px;">
                        <div class="admin-search-input">
                            <i class="fa fa-search" style="color: var(--text-muted); margin-right: 8px;"></i>
                            <input type="text" id="voyage-search" placeholder="Search voyage movements..." oninput="filterMovementVoyages()">
                        </div>
                    </div>
                    <div id="voyages-list-container" class="voyages-grid">
                        <div style="grid-column: span 3; text-align: center; padding: 40px; color: var(--text-secondary);">
                            <div class="spinner"></div> Loading voyages...
                        </div>
                    </div>
                </div>
            </section>

            <!-- VIEW: CONTAINER MOVEMENT EDITOR -->
            <section id="view-movement-editor" class="content-view">
                <div class="sheet-editor-container">
                    <div class="editor-toolbar" style="margin-bottom: 0; border-bottom: none;">
                        <div class="toolbar-left" style="flex-wrap: wrap;">
                            <button class="btn btn-outline btn-sm" onclick="switchView('movement-dashboard')">
                                <i class="fa fa-arrow-left"></i> Back
                            </button>
                            <h3 id="active-voyage-name" style="font-size: 1.1rem; color: var(--color-primary); margin: 0 8px;">Voyage Editor</h3>
                            <span id="active-voyage-date-label" style="font-size: 0.8rem; color: var(--text-secondary); margin-right: 12px;"></span>
                            <button class="btn btn-success btn-sm" onclick="saveMovementData()">
                                <i class="fa fa-save"></i> Save Changes
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="addNewRow()">
                                <i class="fa fa-plus"></i> Add Row
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="deleteSelectedRows()" id="btn-delete-selected" style="display: none; color: var(--color-danger); border-color: var(--color-danger);">
                                <i class="fa fa-minus"></i> Delete Selected
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="clearGrid()" style="color: var(--color-danger); border-color: rgba(239,68,68,0.3);">
                                <i class="fa fa-trash"></i> Clear All
                            </button>
                        </div>
                        <div class="toolbar-right">
                            <div class="excel-btn-wrapper">
                                <button class="btn btn-primary btn-sm" style="background-color: #15803d; border-color: #15803d;">
                                    <i class="fa fa-file-excel"></i> Import Excel
                                </button>
                                <input type="file" id="excel-file-input" accept=".xlsx, .xls" onchange="handleExcelUpload(event)">
                            </div>
                            <button class="btn btn-outline btn-sm" onclick="exportToExcel()" style="color: #60a5fa; border-color: #60a5fa;">
                                <i class="fa fa-download"></i> Download Excel
                            </button>
                            <div class="search-box">
                                <i class="fa fa-filter" style="color: var(--text-muted); margin-right: 8px; font-size: 0.75rem;"></i>
                                <input type="text" id="grid-search" placeholder="Filter rows in grid..." oninput="filterGridRows()">
                            </div>
                        </div>
                    </div>

                    <!-- Spreadsheet Table -->
                    <div class="grid-outer-wrapper" id="grid-wrapper">
                        <div id="drag-overlay" class="drag-overlay">
                            <i class="fa fa-cloud-upload-alt" style="margin-right: 12px;"></i> Drop Excel file here to parse!
                        </div>
                        <table class="grid-table">
                            <thead>
                                <tr>
                                    <th class="col-action"><input type="checkbox" id="check-all-rows" onchange="toggleSelectAllRows(this)"></th>
                                    <th class="col-no">No</th>
                                    <th class="col-port">Port</th>
                                    <th class="col-pol">POL</th>
                                    <th class="col-mlo">MLO</th>
                                    <th class="col-size">Size</th>
                                    <th class="col-cntr">Cntr Num</th>
                                    <th class="col-shipper">Shipper In</th>
                                    <th class="col-consignee">Consignee In</th>
                                    <th class="col-bl">B/L Number</th>
                                    <th class="col-status">Status In</th>
                                    <th class="col-vessel">Vessel In</th>
                                    <th class="col-date">Loaded In</th>
                                    <th class="col-date">Discharge</th>
                                    <th class="col-date">Gate Out</th>
                                    <th class="col-date">Depot In</th>
                                    <th class="col-vessel">Depot</th>
                                    <th class="col-condition">Condition</th>
                                    <th class="col-date">Depot Out</th>
                                    <th class="col-date">Gate In CY</th>
                                    <th class="col-shipper">Shipper Out</th>
                                    <th class="col-consignee">Consignee Out</th>
                                    <th class="col-status">Status Out</th>
                                    <th class="col-vessel">Vessel Out</th>
                                    <th class="col-date">Loaded Out</th>
                                    <th class="col-port">POD</th>
                                </tr>
                            </thead>
                            <tbody id="grid-body">
                                <!-- Loaded dynamically -->
                            </tbody>
                        </table>
                    </div>

                    <div class="grid-footer-summary">
                        <div>
                            <span>Total Rows: <strong id="grid-stat-total">0</strong></span>
                            <span style="margin-left: 20px;">Laden: <strong id="grid-stat-laden">0</strong></span>
                            <span style="margin-left: 20px;">Empty: <strong id="grid-stat-empty">0</strong></span>
                        </div>
                        <div>
                            <i class="fa fa-info-circle"></i> Tip: You can copy cells in Excel and paste directly (Ctrl+V) into any grid input!
                        </div>
                    </div>
                </div>
            </section>
"""

new_modals = """
    <!-- MOVEMENT: CREATE VOYAGE MODAL -->
    <div id="modal-create-voyage" class="modal-overlay" style="display: none;">
        <div class="modal-card">
            <div class="modal-header">
                <h3>New Voyage Movement</h3>
                <button class="modal-close" type="button" onclick="closeCreateVoyageModal()">&times;</button>
            </div>
            <form id="form-create-voyage" onsubmit="handleCreateVoyage(event)">
                <div class="form-group">
                    <label for="new-voyage-name">Voyage Name *</label>
                    <input type="text" id="new-voyage-name" required placeholder="e.g. Movement V.031N">
                </div>
                <div class="form-group">
                    <label for="new-voyage-date">Date / Year</label>
                    <input type="text" id="new-voyage-date" placeholder="e.g. 13/07/2026">
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
                    <button type="button" class="btn btn-outline" onclick="closeCreateVoyageModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Voyage</button>
                </div>
            </form>
        </div>
    </div>

    <!-- MOVEMENT: EDIT VOYAGE MODAL -->
    <div id="modal-edit-voyage" class="modal-overlay" style="display: none;">
        <div class="modal-card">
            <div class="modal-header">
                <h3>Rename Voyage Movement</h3>
                <button class="modal-close" type="button" onclick="closeEditVoyageModal()">&times;</button>
            </div>
            <form id="form-edit-voyage" onsubmit="handleEditVoyage(event)">
                <input type="hidden" id="edit-voyage-id">
                <div class="form-group">
                    <label for="edit-voyage-name">Voyage Name *</label>
                    <input type="text" id="edit-voyage-name" required placeholder="e.g. Movement V.031N">
                </div>
                <div class="form-group">
                    <label for="edit-voyage-date">Date / Year</label>
                    <input type="text" id="edit-voyage-date" placeholder="e.g. 13/07/2026">
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
                    <button type="button" class="btn btn-outline" onclick="closeEditVoyageModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Voyage</button>
                </div>
            </form>
        </div>
    </div>
"""

# Find insertion indexes
view_insert_idx = -1
modal_insert_idx = -1

for i, line in enumerate(lines):
    # View insert index: right after </section> of view-trucking (which ends at line 1038 in the original structure, wait, it might be slightly different now after sidebar edits)
    if 'id="view-trucking"' in line:
        # find the next </section> tag
        for j in range(i, len(lines)):
            if '</section>' in lines[j]:
                view_insert_idx = j + 1
                break
    
    if '<!-- Script imports -->' in line:
        modal_insert_idx = i

print(f"view_insert_idx: {view_insert_idx}, modal_insert_idx: {modal_insert_idx}")

if view_insert_idx != -1 and modal_insert_idx != -1:
    # Perform insertions (modals first because it's further down, so it doesn't affect view_insert_idx line index)
    lines.insert(modal_insert_idx, new_modals)
    lines.insert(view_insert_idx, new_views)
    
    with open(index_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("Views and Modals inserted successfully!")
else:
    print("Error finding insertion spots!")
