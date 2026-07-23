new_styles = """
/* ==========================================================================
   SPA INTEGRATION: CONTAINER LIST & MOVEMENT STYLES
   ========================================================================== */

/* Container List Submission Admin Styles */
.no-submissions {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-muted);
    background-color: var(--bg-card);
    border: 1px dashed var(--border-color);
    border-radius: var(--radius-lg);
}

.submission-card {
    background-color: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    margin-bottom: 16px;
    overflow: hidden;
    transition: all 0.2s ease;
}

.submission-card:hover {
    border-color: var(--color-primary);
}

.submission-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 24px;
    cursor: pointer;
    background-color: rgba(0, 0, 0, 0.1);
}

.submission-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.submission-ref {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-primary);
}

.submission-date {
    font-size: 0.8rem;
    color: var(--text-muted);
}

.submission-vessels {
    display: flex;
    gap: 24px;
    margin-top: 6px;
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.vessel-tag {
    background-color: rgba(255, 255, 255, 0.05);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.submission-actions {
    display: flex;
    gap: 12px;
    align-items: center;
}

.submission-details {
    display: none;
    padding: 24px;
    background-color: rgba(0, 0, 0, 0.15);
    border-top: 1px solid var(--border-color);
}

.submission-details.active {
    display: block;
}

.details-grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 24px;
}

.copy-utility-box {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.copy-utility-box h3 {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--text-primary);
}

.copy-preview {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.8rem;
    white-space: pre-wrap;
    background-color: var(--bg-app) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: var(--radius-md);
    padding: 12px;
    max-height: 250px;
    overflow-y: auto;
    color: var(--text-secondary);
    width: 100%;
}

.admin-search-bar {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
}

.admin-search-input {
    flex-grow: 1;
    display: flex;
    align-items: center;
    background-color: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 0 16px;
}

.admin-search-input input {
    background: transparent;
    border: none !important;
    width: 100%;
    padding: 12px 8px;
    color: var(--text-primary);
    outline: none;
}

/* Container Movement Voyages Grid & Dashboard */
.voyages-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
}

.voyage-card {
    background-color: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.2s ease;
}

.voyage-card:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.voyage-meta {
    margin-bottom: 16px;
}

.voyage-name-title {
    font-size: 1.25rem;
    color: var(--color-primary);
    margin-bottom: 6px;
    font-weight: 700;
}

.voyage-details-row {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-top: 4px;
}

.voyage-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(71, 85, 105, 0.5);
    padding-top: 12px;
}

/* Spreadsheet Grid View */
.sheet-editor-container {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 120px);
    overflow: hidden;
}

.editor-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    padding: 12px 20px;
    gap: 16px;
    flex-wrap: wrap;
}

.toolbar-left, .toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
}

.grid-outer-wrapper {
    flex-grow: 1;
    overflow: auto;
    border: 1px solid var(--border-color);
    border-top: none;
    background-color: var(--bg-content);
    position: relative;
}

.grid-table {
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.82rem;
    table-layout: fixed;
    width: max-content;
}

.grid-table th {
    background-color: #1e293b;
    color: var(--text-secondary);
    font-weight: 600;
    border-right: 1px solid var(--border-color);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 10;
    text-align: center;
    padding: 8px 4px;
    white-space: nowrap;
    text-transform: uppercase;
    font-size: 0.72rem;
    letter-spacing: 0.3px;
    user-select: none;
}

/* Column Widths */
.col-action { width: 50px; }
.col-no { width: 45px; }
.col-port { width: 75px; }
.col-pol { width: 75px; }
.col-mlo { width: 65px; }
.col-size { width: 65px; }
.col-cntr { width: 130px; }
.col-shipper { width: 180px; }
.col-consignee { width: 180px; }
.col-bl { width: 140px; }
.col-status { width: 85px; }
.col-vessel { width: 150px; }
.col-date { width: 100px; }
.col-condition { width: 85px; }

.grid-table tr {
    background-color: var(--bg-content);
}

.grid-table tr:hover {
    background-color: rgba(59, 130, 246, 0.05);
}

.grid-table td {
    border-right: 1px solid var(--border-color);
    border-bottom: 1px solid var(--border-color);
    padding: 0;
    height: 32px;
    position: relative;
}

.col-no-cell {
    background-color: rgba(30, 41, 59, 0.5);
    text-align: center;
    font-weight: bold;
    color: var(--text-muted);
    user-select: none;
}

.action-cell {
    text-align: center;
    background-color: rgba(30, 41, 59, 0.3);
}

.grid-cell-input {
    width: 100%;
    height: 100%;
    background-color: transparent !important;
    border: none !important;
    border-radius: 0 !important;
    color: var(--text-primary) !important;
    font-family: inherit;
    font-size: 0.82rem;
    padding: 4px 6px;
    outline: none;
    box-shadow: none !important;
}

.grid-cell-input:focus {
    background-color: rgba(59, 130, 246, 0.1) !important;
    box-shadow: inset 0 0 0 1px var(--color-primary) !important;
}

.drag-overlay {
    display: none;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(11, 15, 25, 0.85);
    border: 2px dashed var(--color-primary);
    align-items: center;
    justify-content: center;
    z-index: 100;
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--color-primary);
}

.btn-row-action {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-sm);
    transition: all 0.2s ease;
}

.btn-row-action:hover {
    color: var(--color-danger);
    background-color: rgba(239, 68, 68, 0.1);
}

.excel-btn-wrapper {
    position: relative;
    overflow: hidden;
    display: inline-block;
}

.excel-btn-wrapper input[type=file] {
    font-size: 100px;
    position: absolute;
    left: 0;
    top: 0;
    opacity: 0;
    cursor: pointer;
}

.grid-footer-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--bg-card);
    border: 1px solid var(--border-color);
    border-top: none;
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    padding: 10px 20px;
    font-size: 0.8rem;
    color: var(--text-secondary);
}
"""

with open("index.css", "a", encoding="utf-8") as f:
    f.write(new_styles)

print("Styles appended successfully!")
