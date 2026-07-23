<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Submit Container Data - PT. Putera Utama Lautan</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <div class="container">
        
        <!-- Page Header -->
        <header class="page-header">
            <div class="header-title">
                <h1>Container Data Input</h1>
                <p>PT. Putera Utama Lautan - Port Operations Portal</p>
            </div>
            <div>
                <a href="admin.php" class="btn btn-outline btn-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    Admin Area
                </a>
            </div>
        </header>

        <!-- Status Alerts -->
        <div id="alert-box" style="display: none;"></div>

        <form id="container-form" onsubmit="submitForm(event)">
            
            <!-- Reference Details -->
            <div class="panel">
                <div class="panel-title">1. Booking / Shipping Instruction Reference</div>
                <div class="form-grid">
                    <div class="form-group span-2">
                        <label for="ref_no">Reference / Booking / SI Number *</label>
                        <input type="text" id="ref_no" required placeholder="e.g. SIMKO 25802 / 4700024531-7 / SI. 56768">
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Enter the SI number, Booking reference, or title matching your shipment.</p>
                    </div>
                </div>
            </div>

            <!-- Vessel Leg Info -->
            <div class="panel">
                <div class="panel-title">2. Routing & Vessel Information</div>
                
                <h3 style="font-size: 0.95rem; color: var(--color-primary); margin-bottom: 12px; font-weight: 600;">Vessel & Voyage Details</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="vessel_name_1">Vessel Name</label>
                        <input type="text" id="vessel_name_1" placeholder="e.g. INDO SUKSES 51">
                    </div>
                    <div class="form-group">
                        <label for="voyage_1">Voyage</label>
                        <input type="text" id="voyage_1" placeholder="e.g. 098W">
                    </div>
                    <div class="form-group span-2">
                        <label for="etd_1">ETD (Estimated Time of Departure)</label>
                        <input type="text" id="etd_1" placeholder="e.g. 23 DEC 2023">
                    </div>
                </div>
            </div>

            <!-- Spreadsheet Parsing Tool (Excel Parser) -->
            <div class="panel">
                <div class="panel-title">3. Container Details</div>
                
                <div class="excel-parser-box">
                    <div class="excel-parser-header">
                        <h4>Paste from Excel / Spreadsheet</h4>
                        <button type="button" class="btn btn-outline btn-sm" style="padding: 4px 10px; font-size: 0.75rem;" onclick="parseExcelData()">⚡ Parse & Add Rows</button>
                    </div>
                    <p class="excel-parser-help">Copy rows from Excel containing columns (Container No, Seal No, Weight) and paste them below. Our system will automatically read and add them.</p>
                    <textarea id="excel-paste" rows="4" style="width: 100%; font-family: monospace; font-size: 0.85rem;" placeholder="Paste columns here...&#10;TRHU2318725	SGAE79939	TARE: 2180KGS&#10;KKTU7985175	SGAF36391	TARE: 2220KGS"></textarea>
                </div>

                <!-- Container Grid Table -->
                <div class="container-table-wrapper">
                    <table class="container-table">
                        <thead>
                            <tr>
                                <th style="width: 60px; text-align: center;">No</th>
                                <th>Container Number *</th>
                                <th>Seal Number *</th>
                                <th>Weight (e.g. TARE: 2200KGS) *</th>
                                <th style="width: 80px; text-align: center;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="container-rows">
                            <!-- Dynamic rows will be inserted here -->
                        </tbody>
                    </table>
                </div>

                <div class="table-actions">
                    <button type="button" class="btn btn-outline btn-sm" onclick="addRow()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Add Manual Row
                    </button>
                    <button type="button" class="btn btn-outline btn-sm btn-danger" style="background-color: transparent; border-color: rgba(239, 68, 68, 0.4); color: var(--color-danger);" onclick="clearAllRows()">
                        Clear All Rows
                    </button>
                </div>
            </div>

            <!-- Submit Button Bar -->
            <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
                <button type="submit" class="btn btn-success" style="padding: 14px 32px; font-size: 1.05rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    Submit Data
                </button>
            </div>

        </form>

    </div>

    <!-- JavaScript Actions -->
    <script>
        let rowCount = 0;

        // Add initial row on load
        document.addEventListener('DOMContentLoaded', () => {
            addRow();
        });

        // Add a new row to the table
        function addRow(containerNo = '', sealNo = '', weight = '') {
            rowCount++;
            const tbody = document.getElementById('container-rows');
            
            const tr = document.createElement('tr');
            tr.id = `row-${rowCount}`;
            
            tr.innerHTML = `
                <td style="text-align: center; font-weight: 600; color: var(--text-muted);" class="row-num"></td>
                <td>
                    <input type="text" class="container-no-input" required placeholder="e.g. TRHU2318725" value="${containerNo}">
                </td>
                <td>
                    <input type="text" class="seal-no-input" required placeholder="e.g. SGAE79939" value="${sealNo}">
                </td>
                <td>
                    <input type="text" class="weight-input" required placeholder="e.g. TARE: 2180KGS" value="${weight}">
                </td>
                <td style="text-align: center;">
                    <button type="button" class="btn-remove-row" onclick="removeRow(${rowCount})" title="Remove Row">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
            updateRowNumbers();
        }

        // Remove a row
        function removeRow(id) {
            const row = document.getElementById(`row-${id}`);
            if (row) {
                row.remove();
                updateRowNumbers();
            }
        }

        // Update row counter numbers in the table
        function updateRowNumbers() {
            const rows = document.querySelectorAll('#container-rows tr');
            rows.forEach((row, index) => {
                row.querySelector('.row-num').textContent = index + 1;
            });
            
            // If table is empty, add one empty row automatically
            if (rows.length === 0) {
                addRow();
            }
        }

        // Clear all table rows
        function clearAllRows() {
            if (confirm("Are you sure you want to clear all entered rows?")) {
                document.getElementById('container-rows').innerHTML = '';
                addRow();
            }
        }

        // Parse pasted Excel text
        function parseExcelData() {
            const pasteData = document.getElementById('excel-paste').value;
            if (!pasteData.trim()) {
                showAlert('error', 'Please paste Excel columns into the textarea first.');
                return;
            }

            const lines = pasteData.split(/\r?\n/);
            let addedCount = 0;
            
            // Get all rows to check if we only have the single default empty row
            const existingRows = document.querySelectorAll('#container-rows tr');
            let clearDefault = false;
            
            if (existingRows.length === 1) {
                const cInput = existingRows[0].querySelector('.container-no-input').value;
                const sInput = existingRows[0].querySelector('.seal-no-input').value;
                const wInput = existingRows[0].querySelector('.weight-input').value;
                if (!cInput && !sInput && !wInput) {
                    clearDefault = true;
                }
            }

            if (clearDefault) {
                document.getElementById('container-rows').innerHTML = '';
            }

            lines.forEach(line => {
                if (!line.trim()) return;

                // Excel pastes tab-separated values. Fall back to comma or semicolon.
                let cols = line.split('\t');
                if (cols.length < 2) {
                    cols = line.split(/[,;]+/);
                }

                cols = cols.map(c => c.trim()).filter(c => c !== '');
                if (cols.length === 0) return;

                // Check if the first column is a row index (e.g. 1, 2, 3) and there are more columns
                if (/^\d+$/.test(cols[0]) && cols.length > 1) {
                    cols.shift(); // Remove the index column
                }

                const containerNo = cols[0] || '';
                const sealNo = cols[1] || '';
                const weight = cols[2] || '';

                if (containerNo || sealNo || weight) {
                    addRow(containerNo, sealNo, weight);
                    addedCount++;
                }
            });

            document.getElementById('excel-paste').value = '';
            updateRowNumbers();
            
            if (addedCount > 0) {
                showAlert('success', `Successfully parsed and added ${addedCount} container rows!`);
            } else {
                showAlert('error', 'Failed to parse any valid container data. Check your format.');
            }
        }

        // Alert helper
        function showAlert(type, message) {
            const alertBox = document.getElementById('alert-box');
            alertBox.className = `alert alert-${type}`;
            alertBox.innerHTML = message;
            alertBox.style.display = 'block';
            
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Auto-hide after 5 seconds if success
            if (type === 'success') {
                setTimeout(() => {
                    alertBox.style.display = 'none';
                }, 5000);
            }
        }

        // Submit form data
        async function submitForm(event) {
            event.preventDefault();
            
            const refNo = document.getElementById('ref_no').value.trim();
            const vesselName1 = document.getElementById('vessel_name_1').value.trim();
            const voyage1 = document.getElementById('voyage_1').value.trim();
            const etd1 = document.getElementById('etd_1').value.trim();

            const rows = document.querySelectorAll('#container-rows tr');
            const containers = [];

            let hasEmptyField = false;

            rows.forEach(row => {
                const containerNo = row.querySelector('.container-no-input').value.trim();
                const sealNo = row.querySelector('.seal-no-input').value.trim();
                const weight = row.querySelector('.weight-input').value.trim();

                if (containerNo || sealNo || weight) {
                    if (!containerNo || !sealNo || !weight) {
                        hasEmptyField = true;
                    } else {
                        containers.push({
                            container_no: containerNo,
                            seal_no: sealNo,
                            weight: weight
                        });
                    }
                }
            });

            if (hasEmptyField) {
                showAlert('error', 'Please complete all fields (Container, Seal, and Weight) for every row, or remove incomplete rows.');
                return;
            }

            if (containers.length === 0) {
                showAlert('error', 'Please enter at least one container row.');
                return;
            }

            const payload = {
                ref_no: refNo,
                vessel_name_1: vesselName1,
                voyage_1: voyage1,
                etd_1: etd1,
                containers: containers
            };

            try {
                const response = await fetch('api.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`HTTP Error! Status: ${response.status}`);
                }

                const result = await response.json();
                if (result.success) {
                    showAlert('success', '<strong>Success!</strong> Your container data has been submitted. The port administrator will access it shortly.');
                    
                    // Reset form fields
                    document.getElementById('container-form').reset();
                    document.getElementById('container-rows').innerHTML = '';
                    addRow();
                } else {
                    showAlert('error', 'Failed to save: ' + result.error);
                }
            } catch (error) {
                console.error('Submission error:', error);
                showAlert('error', 'A connection error occurred. Make sure the database is up-to-date.');
            }
        }
    </script>
</body>
</html>
