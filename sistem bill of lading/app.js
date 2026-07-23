// ==========================================================================

// GLOBAL FETCH INTERCEPTOR FOR AUTHENTICATION

// ==========================================================================

(function() {

    const originalFetch = window.fetch;

    window.fetch = function(url, options = {}) {

        const urlStr = url.toString();

        const isApiCall = urlStr.includes('api.php');

        const isShareSlugCall = urlStr.includes('slug=') || urlStr.includes('action=get_parties');

        

        if (isApiCall && !isShareSlugCall) {

            const username = sessionStorage.getItem('auth_user');

            const password = sessionStorage.getItem('auth_pass');

            

            if (username && password) {

                options.headers = options.headers || {};

                const authVal = 'Basic ' + btoa(username + ':' + password);

                

                if (options.headers instanceof Headers) {

                    options.headers.set('Authorization', authVal);

                    options.headers.set('X-Authorization', authVal);

                } else if (Array.isArray(options.headers)) {

                    const hasAuth = options.headers.some(h => h[0].toLowerCase() === 'authorization');

                    if (!hasAuth) {

                        options.headers.push(['Authorization', authVal]);

                    }

                    const hasXAuth = options.headers.some(h => h[0].toLowerCase() === 'x-authorization');

                    if (!hasXAuth) {

                        options.headers.push(['X-Authorization', authVal]);

                    }

                } else {

                    options.headers['Authorization'] = authVal;

                    options.headers['X-Authorization'] = authVal;

                }

            }

        }

        return originalFetch(url, options);

    };

})();



// ==========================================================================

// STATE MANAGEMENT & CONSTANTS

// ==========================================================================

let billsOfLading = [];

let activeView = 'dashboard';

let savedParties = [];

let currentPage = 1;

let itemsPerPage = 5;

let isSharedMode = false;

let currentShareSlug = '';

let currentHoveredElement = null;



// Cargo Manifest Specific State Variables

let currentManifestPol = '';

let currentManifestPod = '';

let currentManifestVoyageData = null;



// Default Jambi Shipper Address

const DEFAULT_SHIPPER = `PT. PUTERA UTAMA LAUTAN (JAMBI)

JL. JENDRAL SUDIRMAN KOMPLEK TRANSMART

RUKO BLOK D36 RT.32, KEL TAMBAK SARI

KEC. JAMBI SELATAN

36122 JAMBI INDONESIA`;



// Default Pontianak Consignee Address

const DEFAULT_CONSIGNEE = `PT. PUTERA UTAMA LAUTAN (PONTIANAK)

JL. KEMAKMURAN GG. KELUARGA 2

NO. 12A KEC. PONTIANAK KOTA, KOTA PONTIANAK

KALIMANTAN BARAT

78113 PONTIANAK INDONESIA`;



const SAMPLE_CONTAINERS = `CRSU1213239/20GP

CRSU1247943/20GP

CRSU1249904/20GP

CRSU1250090/20GP

DRYU2551746/20GP

EMCU6054418/20GP

GESU2581022/20GP

GESU2997529/20GP

IMTU3030140/20GP

IRNU3689495/20GP

JHSU2635488/20GP

JHSU2662483/20GP

JHSU2674421/20GP

JHSU2675963/20GP

JHSU2676553/20GP

JHSU2678767/20GP

KGSU2143785/20GP

SCZU7992954/20GP

SEGU1664092/20GP

WHLU0292686/20GP`;



// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {

    setupEventListeners();

    setupKasEventListeners();

    setupTruckingEventListeners();

    updateTime();

    initDevice();



    // Detect Shared Mode

    const urlParams = new URLSearchParams(window.location.search);

    const shareSlug = urlParams.get('share');

    if (shareSlug) {

        isSharedMode = true;

        currentShareSlug = shareSlug;

        

        // Apply Shared Mode UI adjustments

        document.body.classList.add('shared-mode');

        

        // Hide sidebar & mobile toggle

        const sidebar = document.querySelector('.sidebar');

        if (sidebar) sidebar.style.display = 'none';

        const mobileToggle = document.getElementById('mobile-sidebar-toggle');

        if (mobileToggle) mobileToggle.style.display = 'none';

        

        // Hide dashboard controls in editor

        const backBtn = document.getElementById('btn-back-to-dashboard');

        if (backBtn) backBtn.style.display = 'none';

        const loadSampleBtn = document.getElementById('btn-load-sample');

        if (loadSampleBtn) loadSampleBtn.style.display = 'none';

        const shareBtn = document.getElementById('btn-share-bl');

        if (shareBtn) shareBtn.style.display = 'none';

        

        // Hide signature checkbox

        const sigChk = document.getElementById('print-signature-chk');

        if (sigChk) {

            const container = sigChk.closest('.checkbox-container');

            if (container) container.style.display = 'none';

        }

        

        // Hide General Info tab

        const generalTabBtn = document.querySelector('[data-tab="tab-general"]');

        if (generalTabBtn) generalTabBtn.style.display = 'none';



        // Disable general info fields that guests shouldn't change

        const generalFields = ['bl_no', 'booking_no', 'company_version', 'doc_type', 'clause_text', 'delivery_agent'];

        generalFields.forEach(fId => {

            const el = document.getElementById(fId);

            if (el) el.disabled = true;

        });

        

        // Load the shared B/L draft and recommendations

        await loadSharedBL(shareSlug);

        await loadSavedParties();

    } else {

        // Authenticate standard pages

        const username = sessionStorage.getItem('auth_user');

        const password = sessionStorage.getItem('auth_pass');

        if (username && password) {

            document.getElementById('login-overlay').style.display = 'none';

            await loadBLData();

            await loadSavedParties();

        } else {

            document.getElementById('login-overlay').style.display = 'flex';

        }

    }



    // Initialize interactive preview editing components

    initInteractivePreview();



    // Setup Login Form Handler (Server-side Authentication)

    const loginForm = document.getElementById('login-form');

    if (loginForm) {

        loginForm.addEventListener('submit', async (e) => {

            e.preventDefault();

            const user = document.getElementById('login-username').value.trim();

            const pass = document.getElementById('login-password').value;

            

            try {

                const response = await fetch('api.php?action=login', {

                    method: 'POST',

                    headers: {

                        'Content-Type': 'application/json'

                    },

                    body: JSON.stringify({ username: user, password: pass })

                });

                

                const result = await response.json();

                if (result.success) {

                    sessionStorage.setItem('auth_user', user);

                    sessionStorage.setItem('auth_pass', pass);

                    document.getElementById('login-overlay').style.display = 'none';

                    

                    // Load data after successful login

                    await loadBLData();

                    await loadSavedParties();

                } else {

                    showLoginError();

                }

            } catch (err) {

                console.error("Login request failed:", err);

                showLoginError();

            }

        });

    }



    function showLoginError() {

        const errorEl = document.getElementById('login-error-msg');

        if (errorEl) {

            errorEl.style.display = 'block';

            setTimeout(() => {

                errorEl.style.display = 'none';

            }, 3000);

        }

    }



    setInterval(updateTime, 60000);

});



// Update current local time in sidebar

function updateTime() {

    const timeSpan = document.getElementById('current-time');

    if (timeSpan) {

        const now = new Date();

        const options = { hour: '2-digit', minute: '2-digit', hour12: false };

        timeSpan.textContent = now.toLocaleTimeString('en-US', options);

    }

}



// Initialize device tracking information

function initDevice() {

    let deviceId = localStorage.getItem('device_id');

    if (!deviceId) {

        deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();

        localStorage.setItem('device_id', deviceId);

    }

    

    let deviceLabel = localStorage.getItem('device_label');

    if (!deviceLabel) {

        deviceLabel = 'Device ' + deviceId.substring(4, 9).toUpperCase();

        localStorage.setItem('device_label', deviceLabel);

    }

    

    // Update UI

    const lblDeviceName = document.getElementById('lbl-device-name');

    if (lblDeviceName) {

        lblDeviceName.textContent = deviceLabel;

    }

    

    // Setup Rename listener

    const btnEditDevice = document.getElementById('btn-edit-device-label');

    if (btnEditDevice) {

        btnEditDevice.addEventListener('click', () => {

            const currentLabel = localStorage.getItem('device_label');

            const newLabel = prompt('Beri nama/label untuk perangkat ini:', currentLabel);

            if (newLabel !== null && newLabel.trim() !== '') {

                localStorage.setItem('device_label', newLabel.trim());

                if (lblDeviceName) {

                    lblDeviceName.textContent = newLabel.trim();

                }

            }

        });

    }

}



// Load data from MySQL database via api.php

async function loadBLData() {

    try {

        const response = await fetch('api.php');

        if (response.status === 401) {

            sessionStorage.removeItem('auth_user');

            sessionStorage.removeItem('auth_pass');

            document.getElementById('login-overlay').style.display = 'flex';

            return;

        }

        if (!response.ok) {

            throw new Error(`HTTP error! status: ${response.status}`);

        }

        const result = await response.json();

        if (result.success) {

            billsOfLading = result.data || [];

        } else {

            console.error("Database error:", result.error);

            billsOfLading = [];

        }

    } catch (e) {

        console.error("Failed to load data from server. Falling back to local storage:", e);

        const stored = localStorage.getItem('pulaulaut_bls');

        if (stored) {

            try {

                billsOfLading = JSON.parse(stored);

            } catch (err) {

                billsOfLading = [];

            }

        } else {

            billsOfLading = [];

        }

    }

    updateDashboardStats();

    renderBLList();

}



// Backup data to LocalStorage for safety / offline fallback

function saveBLDataLocally() {

    localStorage.setItem('pulaulaut_bls', JSON.stringify(billsOfLading));

    updateDashboardStats();

}



// Update Dashboard Statistics Cards

function updateDashboardStats() {

    const totalCount = document.getElementById('stat-total-count');

    const prepaidCount = document.getElementById('stat-prepaid-count');

    const polCount = document.getElementById('stat-pol-count');



    if (totalCount) totalCount.textContent = billsOfLading.length;

    

    if (prepaidCount) {

        const prepaids = billsOfLading.filter(bl => 

            bl.freight_charges && bl.freight_charges.toUpperCase().includes('PREPAID')

        ).length;

        prepaidCount.textContent = prepaids;

    }



    if (polCount) {

        // Find unique ports of loading

        const ports = [...new Set(billsOfLading.map(bl => bl.port_of_loading).filter(Boolean))];

        polCount.textContent = ports.length;

    }

}



// ==========================================================================

// NAVIGATION & VIEWS

// ==========================================================================

function switchView(viewName) {

    activeView = viewName;

    

    // Toggle active classes on sections

    document.querySelectorAll('.content-view').forEach(view => {

        view.classList.remove('active');

    });

    document.getElementById(`view-${viewName}`).classList.add('active');



    // Toggle active classes on sidebar nav buttons

    document.querySelectorAll('.nav-btn').forEach(btn => {

        btn.classList.remove('active');

    });

    

    if (viewName === 'dashboard') {

        document.getElementById('nav-dashboard-btn').classList.add('active');

        document.getElementById('page-title').textContent = 'Dashboard';

        document.getElementById('page-subtitle').textContent = 'Manage and print your cargo bills of lading';

        renderBLList();

    } else if (viewName === 'editor') {

        document.getElementById('nav-create-btn').classList.add('active');

        const isEdit = document.getElementById('form-bl-id').value !== '';

        document.getElementById('page-title').textContent = isEdit ? 'Edit Bill of Lading' : 'Create Bill of Lading';

        document.getElementById('page-subtitle').textContent = isEdit ? 'Modify existing document details' : 'Draft a new cargo manifest';

    } else if (viewName === 'preview') {

        document.getElementById('page-title').textContent = 'Print Preview';

        document.getElementById('page-subtitle').textContent = 'Review A4 layout prior to PDF creation';

    } else if (viewName === 'history') {

        document.getElementById('nav-history-btn').classList.add('active');

        document.getElementById('page-title').textContent = 'Audit Trail / History Logs';

        document.getElementById('page-subtitle').textContent = 'Track and view changes made to the database';

        loadHistoryLogs();

    } else if (viewName === 'manifest') {

        const navManifestBtn = document.getElementById('nav-manifest-btn');

        if (navManifestBtn) navManifestBtn.classList.add('active');

        document.getElementById('page-title').textContent = 'Cargo Manifest';

        document.getElementById('page-subtitle').textContent = 'Generate and view manifest reports by voyage';

        loadManifestVoyages();

    } else if (viewName === 'container-manifest') {

        const navContainerManifestBtn = document.getElementById('nav-container-manifest-btn');

        if (navContainerManifestBtn) navContainerManifestBtn.classList.add('active');

        document.getElementById('page-title').textContent = 'Container Manifest';

        document.getElementById('page-subtitle').textContent = 'Lihat dan ekspor daftar kontainer berdasarkan voyage';

        loadContainerManifestVoyages();

        renderContainerManifestTable();

    } else if (viewName === 'kas') {

        const navKasBtn = document.getElementById('nav-kas-btn');

        if (navKasBtn) navKasBtn.classList.add('active');

        document.getElementById('page-title').textContent = 'Kas Operasional';

        document.getElementById('page-subtitle').textContent = 'Catat, unggah, dan kelola pengeluaran kas operasional pelabuhan';

        loadKasList();

    } else if (viewName === 'trucking') {

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

    }

}



// ==========================================================================

// EVENT LISTENERS Setup

// ==========================================================================

function setupEventListeners() {

    // Sidebar nav click handlers

    document.getElementById('nav-dashboard-btn').addEventListener('click', () => {

        switchView('dashboard');

    });

    

    document.getElementById('nav-create-btn').addEventListener('click', () => {

        resetForm();

        switchView('editor');

    });



    document.getElementById('nav-history-btn').addEventListener('click', () => {

        switchView('history');

    });



    const navManifestBtn = document.getElementById('nav-manifest-btn');

    if (navManifestBtn) {

        navManifestBtn.addEventListener('click', () => {

            switchView('manifest');

        });

    }



    const navKasBtn = document.getElementById('nav-kas-btn');

    if (navKasBtn) {

        navKasBtn.addEventListener('click', () => {

            switchView('kas');

        });

    }



    const navTruckingBtn = document.getElementById('nav-trucking-btn');

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

    }



    const navContainerManifestBtn = document.getElementById('nav-container-manifest-btn');

    if (navContainerManifestBtn) {

        navContainerManifestBtn.addEventListener('click', () => {

            switchView('container-manifest');

        });

    }



    const containerManifestVoyageSelect = document.getElementById('container-manifest-voyage-select');

    if (containerManifestVoyageSelect) {

        containerManifestVoyageSelect.addEventListener('change', () => {

            renderContainerManifestTable();

        });

    }



    const btnExportExcelContainerManifest = document.getElementById('btn-export-excel-container-manifest');

    if (btnExportExcelContainerManifest) {

        btnExportExcelContainerManifest.addEventListener('click', () => {

            exportContainerManifestToExcel();

        });

    }



    // Voyage select change handler

    const manifestVoyageSelect = document.getElementById('manifest-voyage-select');

    const polContainer = document.getElementById('manifest-pol-container');

    const podContainer = document.getElementById('manifest-pod-container');

    const polSelect = document.getElementById('manifest-pol-select');

    const podSelect = document.getElementById('manifest-pod-select');



    if (manifestVoyageSelect) {

        manifestVoyageSelect.addEventListener('change', (e) => {

            const selectedVal = e.target.value;

            if (!selectedVal) {

                currentManifestVoyageData = null;

                currentManifestPol = '';

                currentManifestPod = '';

                if (polContainer) polContainer.style.display = 'none';

                if (podContainer) podContainer.style.display = 'none';

                renderManifestPreview(null);

                return;

            }

            const parts = selectedVal.split(' | VOY: ');

            const vessel = parts[0];

            const voyNo = parts[1];

            

            const filteredBLs = billsOfLading.filter(bl => 

                (bl.ocean_vessel || '').trim() === vessel && 

                (bl.voy_no || '').trim() === voyNo

            );

            

            currentManifestVoyageData = { vessel, voyNo, bls: filteredBLs };

            const firstBL = filteredBLs[0];

            

            // Set default values from the first BL of the voyage

            currentManifestPol = firstBL ? (firstBL.port_of_loading || 'N/A') : 'N/A';

            currentManifestPod = firstBL ? (firstBL.port_of_discharge || 'N/A') : 'N/A';



            // Populate POL options:

            // Gather all unique port_of_loading from the entire database + current voyage BLs

            if (polSelect) {

                const uniquePols = new Set();

                if (currentManifestPol) uniquePols.add(currentManifestPol);

                filteredBLs.forEach(bl => {

                    if (bl.port_of_loading) uniquePols.add(bl.port_of_loading);

                });

                billsOfLading.forEach(bl => {

                    if (bl.port_of_loading) uniquePols.add(bl.port_of_loading);

                });

                

                polSelect.innerHTML = '';

                uniquePols.forEach(polVal => {

                    const opt = document.createElement('option');

                    opt.value = polVal;

                    opt.textContent = polVal;

                    polSelect.appendChild(opt);

                });

                

                polSelect.value = currentManifestPol;

                if (polContainer) polContainer.style.display = 'flex';

            }



            // Populate POD options:

            // Gather all unique port_of_discharge from the entire database + current voyage BLs

            if (podSelect) {

                const uniquePods = new Set();

                if (currentManifestPod) uniquePods.add(currentManifestPod);

                filteredBLs.forEach(bl => {

                    if (bl.port_of_discharge) uniquePods.add(bl.port_of_discharge);

                });

                billsOfLading.forEach(bl => {

                    if (bl.port_of_discharge) uniquePods.add(bl.port_of_discharge);

                });

                

                podSelect.innerHTML = '';

                uniquePods.forEach(podVal => {

                    const opt = document.createElement('option');

                    opt.value = podVal;

                    opt.textContent = podVal;

                    podSelect.appendChild(opt);

                });

                

                podSelect.value = currentManifestPod;

                if (podContainer) podContainer.style.display = 'flex';

            }

            

            renderManifestPreview(currentManifestVoyageData);

        });

    }



    // Handlers for POL/POD dropdown selections

    if (polSelect) {

        polSelect.addEventListener('change', (e) => {

            currentManifestPol = e.target.value;

            if (currentManifestVoyageData) {

                renderManifestPreview(currentManifestVoyageData);

            }

        });

    }

    if (podSelect) {

        podSelect.addEventListener('change', (e) => {

            currentManifestPod = e.target.value;

            if (currentManifestVoyageData) {

                renderManifestPreview(currentManifestVoyageData);

            }

        });

    }



    // Print manifest button handler

    const btnPrintManifest = document.getElementById('btn-print-manifest');

    if (btnPrintManifest) {

        btnPrintManifest.addEventListener('click', () => {

            printManifest();

        });

    }



    // Mobile sidebar toggle handler

    const mobileToggle = document.getElementById('mobile-sidebar-toggle');

    const sidebar = document.querySelector('.sidebar');

    const overlay = document.getElementById('sidebar-overlay');

    

    if (mobileToggle && sidebar && overlay) {

        const toggleSidebar = () => {

            sidebar.classList.toggle('sidebar-open');

            overlay.classList.toggle('active');

        };

        

        const closeSidebar = () => {

            sidebar.classList.remove('sidebar-open');

            overlay.classList.remove('active');

        };

        

        mobileToggle.addEventListener('click', toggleSidebar);

        overlay.addEventListener('click', closeSidebar);

        

        // Also close sidebar on navigation item clicks

        document.querySelectorAll('.nav-btn').forEach(btn => {

            btn.addEventListener('click', closeSidebar);

        });

    }



    document.getElementById('btn-create-new').addEventListener('click', () => {

        resetForm();

        switchView('editor');

    });



    // Back Buttons

    document.getElementById('btn-back-to-dashboard').addEventListener('click', () => {

        switchView('dashboard');

    });

    

    document.getElementById('btn-preview-back').addEventListener('click', () => {

        switchView('editor');

    });



    // Form tab clicks

    document.querySelectorAll('.tab-btn').forEach(btn => {

        btn.addEventListener('click', (e) => {

            document.querySelectorAll('.tab-btn').forEach(tb => tb.classList.remove('active'));

            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

            

            btn.classList.add('active');

            const targetId = btn.getAttribute('data-tab');

            document.getElementById(targetId).classList.add('active');

        });

    });



    // Save B/L Action

    document.getElementById('btn-save-bl').addEventListener('click', (e) => {

        e.preventDefault();

        saveBLForm();

    });



    // Share Draft Action

    const shareBtn = document.getElementById('btn-share-bl');

    if (shareBtn) {

        shareBtn.addEventListener('click', (e) => {

            e.preventDefault();

            shareDraft();

        });

    }



    // Load Sample Button

    document.getElementById('btn-load-sample').addEventListener('click', () => {

        loadSampleData();

    });



    // Generate Cargo Text Button

    document.getElementById('btn-build-cargo').addEventListener('click', () => {

        generateCargoGrid();

    });



    // Preview & Print from Editor

    document.getElementById('btn-preview-print').addEventListener('click', () => {

        if (validateForm()) {

            buildPrintPreview();

            switchView('preview');

        }

    });



    // Trigger Print

    document.getElementById('btn-trigger-print').addEventListener('click', () => {

        triggerBrowserPrint();

    });



    // Search bar filter keyup

    document.getElementById('search-input').addEventListener('input', () => {

        currentPage = 1;

        renderBLList();

    });



    // Company version change handler

    const companySelect = document.getElementById('company_version');

    if (companySelect) {

        companySelect.addEventListener('change', (e) => {

            const company = e.target.value;

            const signedOnBehalfInput = document.getElementById('signed_on_behalf');

            if (signedOnBehalfInput) {

                if (company === 'PT. Putera Utama Lautan') {

                    signedOnBehalfInput.value = 'PT. PUTERA UTAMA LAUTAN';

                } else if (company === 'PT. Putera Utama Lautan') {

                    signedOnBehalfInput.value = 'PT. PUTERA UTAMA LAUTAN';

                }

            }

            updateLogoStatusText();

        });

    }



    // PDF Import button handlers

    const btnImportPdf = document.getElementById('btn-import-pdf');

    const importPdfInput = document.getElementById('import-pdf-input');

    if (btnImportPdf && importPdfInput) {

        btnImportPdf.addEventListener('click', () => {

            importPdfInput.click();

        });

        importPdfInput.addEventListener('change', handlePDFImport);

    }



    // Page size select change handler

    const pageSizeSelect = document.getElementById('page-size-select');

    if (pageSizeSelect) {

        pageSizeSelect.addEventListener('change', (e) => {

            itemsPerPage = parseInt(e.target.value, 10);

            currentPage = 1;

            renderBLList();

        });

    }



    // Refresh history logs listener

    const refreshHistoryBtn = document.getElementById('btn-refresh-history');

    if (refreshHistoryBtn) {

        refreshHistoryBtn.addEventListener('click', () => {

            loadHistoryLogs();

        });

    }

}



// ==========================================================================

// FORM UTILITIES & VALIDATION

// ==========================================================================

function resetForm() {

    document.getElementById('form-bl-id').value = '';

    document.getElementById('bl-form').reset();

    

    // Set some defaults

    document.getElementById('company_version').value = 'PT. Putera Utama Lautan';

    document.getElementById('clause_text').value = `"The Contract evidenced by or contained in this bill of lading is governed by the law of Indonesia and any claim or dispute arising hereunder or in connection herewith shall be determined by the courts in Indonesia and no other court."`;

    document.getElementById('no_of_original').value = 'THREE(3)';

    document.getElementById('signed_on_behalf').value = 'PT. PUTERA UTAMA LAUTAN';

    

    // Trigger input events to evaluate save buttons state (hide them)

    const fields = ['shipper_name', 'shipper_address', 'consignee_name', 'consignee_address', 'notify_name', 'notify_address'];

    fields.forEach(fId => {

        const el = document.getElementById(fId);

        if (el) el.dispatchEvent(new Event('input'));

    });



    // Reset logo status

    updateLogoStatusText();



    // Switch to first tab

    document.querySelectorAll('.tab-btn')[0].click();

}



function validateForm() {

    const form = document.getElementById('bl-form');

    if (!form.checkValidity()) {

        form.reportValidity();

        

        // Find which tab has the first invalid field

        const invalidField = form.querySelector(':invalid');

        if (invalidField) {

            const tabContent = invalidField.closest('.tab-content');

            if (tabContent) {

                const tabId = tabContent.id;

                const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);

                if (tabBtn) tabBtn.click();

            }

        }

        return false;

    }

    return true;

}



// ==========================================================================

// QUICK FILL HELPERS

// ==========================================================================

window.quickFillShipper = function() {

    const company = document.getElementById('company_version').value;

    const nameInput = document.getElementById('shipper_name');

    const addressTextarea = document.getElementById('shipper_address');

    

    if (nameInput && addressTextarea) {

        if (company === 'PT. Putera Utama Lautan') {

            nameInput.value = 'PT. PUTERA UTAMA LAUTAN (JAMBI)';

        } else {

            nameInput.value = 'PT. PUTERA UTAMA LAUTAN (JAMBI)';

        }

        addressTextarea.value = `JL. JENDRAL SUDIRMAN KOMPLEK TRANSMART

RUKO BLOK D36 RT.32, KEL TAMBAK SARI

KEC. JAMBI SELATAN

36122 JAMBI INDONESIA`;

        

        nameInput.dispatchEvent(new Event('input'));

        addressTextarea.dispatchEvent(new Event('input'));

    }

};



window.quickFillConsignee = function() {

    const company = document.getElementById('company_version').value;

    const nameInput = document.getElementById('consignee_name');

    const addressTextarea = document.getElementById('consignee_address');

    

    if (nameInput && addressTextarea) {

        if (company === 'PT. Putera Utama Lautan') {

            nameInput.value = 'PT. PUTERA UTAMA LAUTAN (PONTIANAK)';

        } else {

            nameInput.value = 'PT. PUTERA UTAMA LAUTAN (PONTIANAK)';

        }

        addressTextarea.value = `JL. KEMAKMURAN GG. KELUARGA 2

NO. 12A KEC. PONTIANAK KOTA, KOTA PONTIANAK

KALIMANTAN BARAT

78113 PONTIANAK INDONESIA`;

        

        nameInput.dispatchEvent(new Event('input'));

        addressTextarea.dispatchEvent(new Event('input'));

    }

    

    const notifyNameInput = document.getElementById('notify_name');

    const notifyAddressTextarea = document.getElementById('notify_address');

    if (notifyNameInput && notifyAddressTextarea) {

        notifyNameInput.value = "SAME AS CONSIGNEE";

        notifyAddressTextarea.value = "SAME AS CONSIGNEE";

        notifyNameInput.dispatchEvent(new Event('input'));

        notifyAddressTextarea.dispatchEvent(new Event('input'));

    }

};



window.setCurrentPlaceDate = function() {

    const now = new Date();

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    

    // Format: 27-May-2026 8:41:03

    const day = String(now.getDate()).padStart(2, '0');

    const month = months[now.getMonth()];

    const year = now.getFullYear();

    const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS

    

    document.getElementById('place_date_issue').value = `JAMBI, INDONESIA   ${day}-${month}-${year} ${timeStr}`;

};



// Paste list of containers and compile into form text columns

function generateCargoGrid() {

    const containerStr = document.getElementById('builder-containers').value.trim();

    if (!containerStr) {

        alert("Please paste some container numbers first!");

        return;

    }



    // Split containers by lines or commas

    const containers = containerStr.split(/[\n,]+/).map(c => c.trim()).filter(Boolean);

    const count = containers.length;

    if (count === 0) return;



    // Fill left column

    document.getElementById('cargo_containers').value = containers.join('\n');



    // Fill middle column (Quantity)

    document.getElementById('cargo_quantity').value = `\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n`; // push blank rows or leave empty



    // Fill Description column

    const sizeGP = containerStr.includes('40GP') ? "40'GP" : "20'GP";

    const shipVessel = document.getElementById('ocean_vessel').value || 'MMSS 2711';

    const voyNo = document.getElementById('voy_no').value || '261012N';

    const pol = (document.getElementById('port_of_loading').value || 'JAMBI, INDONESIA').split(',')[0];

    

    const now = new Date();

    const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

    const dateFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;



    const descStr = `SHIPPER'S LOAD, COUNT & SEAL.

${count}X${sizeGP} CONTAINER S.T.C



EMPTY CONTAINER



FREIGHT PREPAID

SHIPPED ON BOARD : ${shipVessel} V.${voyNo}

${pol} ${dateFormatted}`;



    document.getElementById('cargo_description').value = descStr;



    // Fill Right column weights

    const estWeight = count * 2200; // e.g. 2,200 KG average dry empty

    const weightFormatted = estWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    

    document.getElementById('cargo_measurement').value = `0.00 M3\n\n${weightFormatted} KGS`;

}



function loadSampleData() {

    document.getElementById('booking_no').value = 'JL26050212';

    document.getElementById('bl_no').value = 'DJBPNK26050203';

    

    // Set company to PT. Putera Utama Lautan for sample

    document.getElementById('company_version').value = 'PT. Putera Utama Lautan';

    document.getElementById('company_version').dispatchEvent(new Event('change'));



    // Split and assign sample values

    const splitDefault = (str) => {

        const idx = str.indexOf('\n');

        return {

            name: str.substring(0, idx).trim(),

            address: str.substring(idx + 1).trim()

        };

    };



    const sParts = splitDefault(DEFAULT_SHIPPER);

    document.getElementById('shipper_name').value = sParts.name;

    document.getElementById('shipper_address').value = sParts.address;



    const cParts = splitDefault(DEFAULT_CONSIGNEE);

    document.getElementById('consignee_name').value = cParts.name;

    document.getElementById('consignee_address').value = cParts.address;



    document.getElementById('notify_name').value = 'SAME AS CONSIGNEE';

    document.getElementById('notify_address').value = 'SAME AS CONSIGNEE';



    // Trigger input events

    const fields = ['shipper_name', 'shipper_address', 'consignee_name', 'consignee_address', 'notify_name', 'notify_address'];

    fields.forEach(fId => {

        const el = document.getElementById(fId);

        if (el) el.dispatchEvent(new Event('input'));

    });



    document.getElementById('delivery_agent').value = '';

    

    document.getElementById('pre_carriage').value = '';

    document.getElementById('ocean_vessel').value = 'MMSS 2711';

    document.getElementById('voy_no').value = '261012N';

    document.getElementById('place_of_receipt').value = 'JAMBI, INDONESIA';

    document.getElementById('port_of_loading').value = 'JAMBI, INDONESIA';

    document.getElementById('port_of_discharge').value = 'PONTIANAK, INDONESIA';

    document.getElementById('place_of_delivery').value = 'PONTIANAK, INDONESIA';

    

    document.getElementById('builder-containers').value = SAMPLE_CONTAINERS;

    

    document.getElementById('cargo_containers').value = SAMPLE_CONTAINERS;

    document.getElementById('cargo_quantity').value = '';

    document.getElementById('cargo_description').value = `SHIPPER'S LOAD, COUNT & SEAL.

20X20'GP CONTAINER S.T.C



EMPTY CONTAINER



FREIGHT PREPAID

SHIPPED ON BOARD : MMSS2711 V.261012N

JAMBI, INDONESIA 26 MAY 2026`;

    document.getElementById('cargo_measurement').value = `0.00 M3\n\n44,000.00 KGS`;



    document.getElementById('freight_charges').value = 'Term : FREIGHT PREPAID';

    document.getElementById('revenue_tons').value = '';

    document.getElementById('rate').value = '';

    document.getElementById('per').value = '';

    document.getElementById('prepaid').value = '';

    document.getElementById('collect').value = '';

    document.getElementById('ex_rate').value = '';

    document.getElementById('prepaid_at').value = '';

    document.getElementById('payable_at').value = '';

    document.getElementById('place_date_issue').value = 'JAMBI, INDONESIA   27-May-2026 8:41:03';

    document.getElementById('movement').value = 'MOVEMENT';

    document.getElementById('no_of_original').value = 'THREE(3)';

    document.getElementById('signed_on_behalf').value = 'PT. PUTERA UTAMA LAUTAN';

}



// ==========================================================================

// CRUD OPERATIONS

// ==========================================================================

async function saveBLForm(silent = false) {

    if (!validateForm()) return false;



    const blId = document.getElementById('form-bl-id').value;

    const generatedId = blId || 'id_' + Date.now() + '_' + Math.floor(Math.random() * 900 + 100);

    

    // Combine Name and Address for database persistence

    const shipperVal = document.getElementById('shipper_name').value.trim() + '\n' + document.getElementById('shipper_address').value.trim();

    const consigneeVal = document.getElementById('consignee_name').value.trim() + '\n' + document.getElementById('consignee_address').value.trim();

    const notifyVal = document.getElementById('notify_name').value.trim() + '\n' + document.getElementById('notify_address').value.trim();



    const shareSlugVal = document.getElementById('form-share-slug').value.trim();



    const blObj = {

        id: generatedId,

        doc_type: document.getElementById('doc_type').value,

        booking_no: document.getElementById('booking_no').value,

        bl_no: document.getElementById('bl_no').value,

        shipper: shipperVal,

        consignee: consigneeVal,

        notify_party: notifyVal,

        delivery_agent: document.getElementById('delivery_agent').value,

        pre_carriage: document.getElementById('pre_carriage').value,

        ocean_vessel: document.getElementById('ocean_vessel').value,

        voy_no: document.getElementById('voy_no').value,

        place_of_receipt: document.getElementById('place_of_receipt').value,

        port_of_loading: document.getElementById('port_of_loading').value,

        port_of_discharge: document.getElementById('port_of_discharge').value,

        place_of_delivery: document.getElementById('place_of_delivery').value,

        cargo_containers: document.getElementById('cargo_containers').value,

        cargo_quantity: document.getElementById('cargo_quantity').value,

        cargo_description: document.getElementById('cargo_description').value,

        cargo_measurement: document.getElementById('cargo_measurement').value,

        freight_charges: document.getElementById('freight_charges').value,

        revenue_tons: document.getElementById('revenue_tons').value,

        rate: document.getElementById('rate').value,

        per: document.getElementById('per').value,

        prepaid: document.getElementById('prepaid').value,

        collect: document.getElementById('collect').value,

        ex_rate: document.getElementById('ex_rate').value,

        prepaid_at: document.getElementById('prepaid_at').value,

        payable_at: document.getElementById('payable_at').value,

        place_date_issue: document.getElementById('place_date_issue').value,

        movement: document.getElementById('movement').value,

        no_of_original: document.getElementById('no_of_original').value,

        signed_on_behalf: document.getElementById('signed_on_behalf').value,

        company_version: document.getElementById('company_version').value,

        share_slug: shareSlugVal,

        created_at: blId ? (billsOfLading.find(b => b.id === blId)?.created_at || new Date().toISOString()) : new Date().toISOString(),

        last_modified: new Date().toISOString(),

        device_id: localStorage.getItem('device_id'),

        device_label: localStorage.getItem('device_label')

    };



    try {

        const response = await fetch('api.php', {

            method: 'POST',

            headers: {

                'Content-Type': 'application/json'

            },

            body: JSON.stringify(blObj)

        });

        

        if (!response.ok) {

            throw new Error(`HTTP error! status: ${response.status}`);

        }

        

        const result = await response.json();

        if (result.success) {

            if (!blId) {

                document.getElementById('form-bl-id').value = generatedId;

                blObj.id = generatedId;

            }



            if (!silent) {

                Swal.fire({

                    icon: blId ? 'success' : 'success',

                    title: blId ? 'Bill of Lading updated successfully!' : 'Bill of Lading created successfully!',

                    toast: true,

                    position: 'top-end',

                    timer: 3000,

                    showConfirmButton: false

                });

            }

            

            const idx = billsOfLading.findIndex(bl => bl.id === generatedId);

            if (idx !== -1) {

                billsOfLading[idx] = blObj;

            } else {

                billsOfLading.push(blObj);

            }

            saveBLDataLocally();

        

            if (isSharedMode) {

                // If in shared mode, don't redirect or reload all

            } else {

                await loadBLData();

                // Stay on the editor view after saving; do not redirect to dashboard

            }

            if (!silent) {

                // Stay on editor view after saving (do not redirect to dashboard)

            }

            return true;

        } else {

            alert("Database Error: " + result.error);

            return false;

        }

    } catch (e) {

        console.error("Failed to save to server. Saving locally instead:", e);

        Swal.fire({

            icon: 'warning',

            title: 'Saved locally (offline mode)',

            toast: true,

            position: 'top-end',

            timer: 3000,

            showConfirmButton: false

        });

        if (!blId) {

            document.getElementById('form-bl-id').value = generatedId;

            blObj.id = generatedId;

        }

        const idx = billsOfLading.findIndex(bl => bl.id === generatedId);

        if (idx !== -1) {

            billsOfLading[idx] = blObj;

        } else {

            billsOfLading.push(blObj);

        }

        saveBLDataLocally();

        if (!silent) {

            alert(blId ? "Updated locally (offline mode)." : "Saved locally (offline mode).");

            if (!isSharedMode) {

                renderBLList();

                switchView('dashboard');

            }

        }

        return true;

    }

}



function populateFormFromBL(bl) {

    // Helper to split name and address

    const splitParty = (str) => {

        if (!str) return { name: '', address: '' };

        const idx = str.indexOf('\n');

        if (idx === -1) return { name: str.trim(), address: '' };

        return {

            name: str.substring(0, idx).trim(),

            address: str.substring(idx + 1).trim()

        };

    };



    document.getElementById('form-bl-id').value = bl.id || '';

    document.getElementById('form-share-slug').value = bl.share_slug || '';

    

    // Load document type

    const docTypeSelect = document.getElementById('doc_type');

    if (docTypeSelect) {

        docTypeSelect.value = bl.doc_type || 'BILL OF LADING';

    }

    

    document.getElementById('booking_no').value = bl.booking_no || '';

    document.getElementById('bl_no').value = bl.bl_no || '';

    

    // Load company version

    const companySelect = document.getElementById('company_version');

    if (companySelect) {

        companySelect.value = bl.company_version || 'PT. Putera Utama Lautan';

        // Trigger change event to load defaults / logo status

        companySelect.dispatchEvent(new Event('change'));

    }



    // Split and load parties

    const shipperParts = splitParty(bl.shipper);

    document.getElementById('shipper_name').value = shipperParts.name;

    document.getElementById('shipper_address').value = shipperParts.address;



    const consigneeParts = splitParty(bl.consignee);

    document.getElementById('consignee_name').value = consigneeParts.name;

    document.getElementById('consignee_address').value = consigneeParts.address;



    const notifyParts = splitParty(bl.notify_party);

    document.getElementById('notify_name').value = notifyParts.name;

    document.getElementById('notify_address').value = notifyParts.address;



    document.getElementById('delivery_agent').value = bl.delivery_agent || '';

    

    document.getElementById('pre_carriage').value = bl.pre_carriage || '';

    document.getElementById('ocean_vessel').value = bl.ocean_vessel || '';

    document.getElementById('voy_no').value = bl.voy_no || '';

    document.getElementById('place_of_receipt').value = bl.place_of_receipt || '';

    document.getElementById('port_of_loading').value = bl.port_of_loading || '';

    document.getElementById('port_of_discharge').value = bl.port_of_discharge || '';

    document.getElementById('place_of_delivery').value = bl.place_of_delivery || '';

    

    document.getElementById('cargo_containers').value = bl.cargo_containers || '';

    document.getElementById('cargo_quantity').value = bl.cargo_quantity || '';

    document.getElementById('cargo_description').value = bl.cargo_description || '';

    document.getElementById('cargo_measurement').value = bl.cargo_measurement || '';

    

    document.getElementById('freight_charges').value = bl.freight_charges || '';

    document.getElementById('revenue_tons').value = bl.revenue_tons || '';

    document.getElementById('rate').value = bl.rate || '';

    document.getElementById('per').value = bl.per || '';

    document.getElementById('prepaid').value = bl.prepaid || '';

    document.getElementById('collect').value = bl.collect || '';

    document.getElementById('ex_rate').value = bl.ex_rate || '';

    document.getElementById('prepaid_at').value = bl.prepaid_at || '';

    document.getElementById('payable_at').value = bl.payable_at || '';

    document.getElementById('place_date_issue').value = bl.place_date_issue || '';

    document.getElementById('movement').value = bl.movement || '';

    document.getElementById('no_of_original').value = bl.no_of_original || '';

    document.getElementById('signed_on_behalf').value = bl.signed_on_behalf || '';



    // Trigger input events to evaluate save buttons state

    const fields = ['shipper_name', 'shipper_address', 'consignee_name', 'consignee_address', 'notify_name', 'notify_address'];

    fields.forEach(fId => {

        const el = document.getElementById(fId);

        if (el) el.dispatchEvent(new Event('input'));

    });

}



window.editBL = function(id) {

    const bl = billsOfLading.find(b => b.id === id);

    if (!bl) return;

    populateFormFromBL(bl);

    switchView('editor');

};



function getBaseNumber(number) {

    if (!number) return '';

    return number.replace(/^(Copy\s+of\s+|Copy\s+\d+\s+of\s+)/i, '').trim();

}



function generateNextCopyName(baseNumber, isBooking = false) {

    let index = 1;

    while (true) {

        let candidate = '';

        if (index === 1) {

            candidate = 'Copy of ' + baseNumber;

        } else {

            candidate = `Copy ${index} of ` + baseNumber;

        }

        

        const exists = billsOfLading.some(bl => {

            const val = isBooking ? bl.booking_no : bl.bl_no;

            return val && val.toLowerCase() === candidate.toLowerCase();

        });

        

        if (!exists) {

            return candidate;

        }

        index++;

    }

}



window.duplicateBL = async function(id) {

    const bl = billsOfLading.find(b => b.id === id);

    if (!bl) return;



    const baseBLNo = getBaseNumber(bl.bl_no);

    const baseBookingNo = getBaseNumber(bl.booking_no);

    

    const newBLNo = generateNextCopyName(baseBLNo, false);

    const newBookingNo = generateNextCopyName(baseBookingNo, true);



    const newId = 'id_' + Date.now() + '_' + Math.floor(Math.random() * 900 + 100);

    const copyObj = {

        ...bl,

        id: newId,

        bl_no: newBLNo,

        booking_no: newBookingNo,

        share_slug: null,

        created_at: new Date().toISOString(),

        last_modified: new Date().toISOString(),

        device_id: localStorage.getItem('device_id'),

        device_label: localStorage.getItem('device_label')

    };



    try {

        const response = await fetch('api.php', {

            method: 'POST',

            headers: {

                'Content-Type': 'application/json'

            },

            body: JSON.stringify(copyObj)

        });

        

        if (!response.ok) {

            throw new Error(`HTTP error! status: ${response.status}`);

        }

        

        const result = await response.json();

        if (result.success) {

            alert("Bill of Lading duplicated successfully!");

            billsOfLading.push(copyObj);

            saveBLDataLocally();

            await loadBLData();

        } else {

            alert("Database Error: " + result.error);

        }

    } catch (e) {

        console.error("Failed to duplicate on server. Duplicating locally instead:", e);

        billsOfLading.push(copyObj);

        saveBLDataLocally();

        renderBLList();

        alert("Duplicated locally (offline mode).");

    }

};



window.deleteBL = async function(id) {

    if (confirm("Are you sure you want to delete this Bill of Lading?")) {

        try {

            const devId = encodeURIComponent(localStorage.getItem('device_id') || '');

            const devLabel = encodeURIComponent(localStorage.getItem('device_label') || '');

            const response = await fetch(`api.php?id=${encodeURIComponent(id)}&device_id=${devId}&device_label=${devLabel}`, {

                method: 'DELETE'

            });

            

            if (!response.ok) {

                throw new Error(`HTTP error! status: ${response.status}`);

            }

            

            const result = await response.json();

            if (result.success) {

                alert("Bill of Lading deleted successfully!");

                billsOfLading = billsOfLading.filter(b => b.id !== id);

                saveBLDataLocally();

                await loadBLData();

            } else {

                alert("Database Error: " + result.error);

            }

        } catch (e) {

            console.error("Failed to delete on server. Deleting locally instead:", e);

            billsOfLading = billsOfLading.filter(b => b.id !== id);

            saveBLDataLocally();

            renderBLList();

            alert("Deleted locally (offline mode).");

        }

    }

};



// ==========================================================================

// RENDERING LIST & DASHBOARD

// ==========================================================================

function renderBLList() {

    const listContainer = document.getElementById('bl-list-items');

    if (!listContainer) return;



    const searchQuery = document.getElementById('search-input').value.toLowerCase();

    

    // Filter list

    const filtered = billsOfLading.filter(bl => {

        return (

            (bl.bl_no && bl.bl_no.toLowerCase().includes(searchQuery)) ||

            (bl.booking_no && bl.booking_no.toLowerCase().includes(searchQuery)) ||

            (bl.company_version && bl.company_version.toLowerCase().includes(searchQuery)) ||

            (bl.shipper && bl.shipper.toLowerCase().includes(searchQuery)) ||

            (bl.consignee && bl.consignee.toLowerCase().includes(searchQuery))

        );

    });



    if (filtered.length === 0) {

        listContainer.innerHTML = `

            <div class="no-data-msg">

                <p>${billsOfLading.length === 0 ? 'No Bill of Lading found. Click "New Bill of Lading" to create one.' : 'No search results match your criteria.'}</p>

            </div>

        `;

        renderPagination(0);

        return;

    }



    // Sort list by B/L number descending

    filtered.sort((a, b) => {

        const blA = a.bl_no || '';

        const blB = b.bl_no || '';

        return blB.localeCompare(blA, undefined, { numeric: true, sensitivity: 'base' });

    });



    // Pagination slicing

    const totalItems = filtered.length;

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (currentPage > totalPages && totalPages > 0) {

        currentPage = totalPages;

    }

    const startIndex = (currentPage - 1) * itemsPerPage;

    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

    const pageItems = filtered.slice(startIndex, endIndex);



    listContainer.innerHTML = '';

    pageItems.forEach(bl => {

        const item = document.createElement('div');

        item.className = 'bl-row-item';

        

        // Extract names for cleaner list display

        const shipperName = bl.shipper ? bl.shipper.split('\n')[0] : '';

        const consigneeName = bl.consignee ? bl.consignee.split('\n')[0] : '';

        const dateStr = bl.place_date_issue ? bl.place_date_issue.replace(/^[A-Za-z\s,]+/g, '').trim() : '';



        item.innerHTML = `

            <span class="bl-no">${escapeHTML(bl.bl_no)}</span>

            <span class="text-truncate" title="${escapeHTML(bl.consignee)}">${escapeHTML(consigneeName)}</span>

            <span class="text-truncate" title="${escapeHTML(bl.shipper)}">${escapeHTML(shipperName)}</span>

            <span>${escapeHTML(bl.port_of_discharge)}</span>

            <span>${escapeHTML(dateStr || 'N/A')}</span>

            <div class="actions">

                <button onclick="editBL('${bl.id}')" class="action-icon-btn" title="Edit">

                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>

                </button>

                <button onclick="printBLDirect('${bl.id}')" class="action-icon-btn" title="Print/PDF">

                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>

                </button>

                <button onclick="duplicateBL('${bl.id}')" class="action-icon-btn" title="Duplicate">

                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>

                </button>

                <button onclick="deleteBL('${bl.id}')" class="action-icon-btn btn-delete" title="Delete">

                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>

                </button>

            </div>

        `;

        listContainer.appendChild(item);

    });



    renderPagination(totalItems);

}



function renderPagination(totalItems) {

    const pagContainer = document.getElementById('pagination-controls');

    if (!pagContainer) return;



    if (totalItems === 0) {

        pagContainer.innerHTML = '';

        pagContainer.style.display = 'none';

        return;

    }



    pagContainer.style.display = 'flex';

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const startIndex = (currentPage - 1) * itemsPerPage;

    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);



    let html = `

        <div class="pagination-info">

            Showing <span>${startIndex + 1}</span> to <span>${endIndex}</span> of <span>${totalItems}</span> entries

        </div>

        <div class="pagination-buttons">

            <button class="pagination-btn" id="pagination-prev" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>

    `;



    for (let i = 1; i <= totalPages; i++) {

        html += `

            <button class="pagination-btn page-num-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>

        `;

    }



    html += `

            <button class="pagination-btn" id="pagination-next" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>

        </div>

    `;



    pagContainer.innerHTML = html;



    // Attach listeners

    const prevBtn = document.getElementById('pagination-prev');

    if (prevBtn) {

        prevBtn.addEventListener('click', () => {

            if (currentPage > 1) {

                currentPage--;

                renderBLList();

            }

        });

    }



    const nextBtn = document.getElementById('pagination-next');

    if (nextBtn) {

        nextBtn.addEventListener('click', () => {

            if (currentPage < totalPages) {

                currentPage++;

                renderBLList();

            }

        });

    }



    pagContainer.querySelectorAll('.page-num-btn').forEach(btn => {

        btn.addEventListener('click', (e) => {

            currentPage = parseInt(e.currentTarget.getAttribute('data-page'), 10);

            renderBLList();

        });

    });

}



// Utility function to print directly from dashboard row

window.printBLDirect = function(id) {

    const bl = billsOfLading.find(b => b.id === id);

    if (!bl) return;

    

    // Temporarily fill form with this B/L's data to generate printout

    editBL(id);

    buildPrintPreview();

    switchView('preview');

};



function escapeHTML(str) {

    if (!str) return '';

    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

}



// ==========================================================================

// PRINT LAYOUT BUILDER & BINDING

// ==========================================================================

function buildPrintPreview() {

    const docContainer = document.getElementById('preview-document');

    if (!docContainer) return;

    

    // Clear the document container

    docContainer.innerHTML = '';



    const templateContainer = document.getElementById('print-layout-template');

    if (!templateContainer) return;



    // Get the separate templates

    const page1Template = templateContainer.querySelector('.page-1');

    const page2Template = templateContainer.querySelector('.page-2');



    if (!page1Template) return;



    // Split container data by newlines

    const containersVal = document.getElementById('cargo_containers').value.trim();

    const containerLines = containersVal ? containersVal.split('\n').map(l => l.trim()).filter(Boolean) : [];



    // Paginate containers: 30 lines per page

    const linesPerPage = 30;

    const totalFrontPages = Math.ceil(containerLines.length / linesPerPage) || 1;



    const fields = [

        'doc_type', 'booking_no', 'bl_no', 'shipper', 'consignee', 'notify_party', 'delivery_agent',

        'pre_carriage', 'ocean_vessel', 'voy_no', 'place_of_receipt', 'port_of_loading',

        'port_of_discharge', 'place_of_delivery', 'cargo_containers', 'cargo_quantity',

        'cargo_description', 'cargo_measurement', 'freight_charges', 'revenue_tons',

        'rate', 'per', 'prepaid', 'collect', 'ex_rate', 'prepaid_at', 'payable_at',

        'place_date_issue', 'movement', 'no_of_original', 'signed_on_behalf', 'clause_text'

    ];



    // Read all values from form once

    const formValues = {};

    fields.forEach(field => {

        if (field === 'shipper') {

            formValues[field] = document.getElementById('shipper_name').value.trim() + '\n' + document.getElementById('shipper_address').value.trim();

        } else if (field === 'consignee') {

            formValues[field] = document.getElementById('consignee_name').value.trim() + '\n' + document.getElementById('consignee_address').value.trim();

        } else if (field === 'notify_party') {

            formValues[field] = document.getElementById('notify_name').value.trim() + '\n' + document.getElementById('notify_address').value.trim();

        } else {

            const el = document.getElementById(field);

            formValues[field] = el ? el.value : '';

        }

    });



    const companyVersion = document.getElementById('company_version').value;

    let logoSrc = 'logo.jpg';

    if (companyVersion === 'PT. Putera Utama Lautan') {

        logoSrc = localStorage.getItem('logo_pll') || 'logo.jpg';

    } else if (companyVersion === 'PT. Putera Utama Lautan') {

        logoSrc = localStorage.getItem('logo_pul') || 'logo pul.png';

    }



    const copyType = document.getElementById('print-copy-type') ? document.getElementById('print-copy-type').value : 'ORIGINAL';

    const showSignature = !isSharedMode && document.getElementById('print-signature-chk') ? document.getElementById('print-signature-chk').checked : false;



    // Define the list of copies to print

    let copiesToPrint = [];

    if (copyType === '3_OBL_3_NN') {

        copiesToPrint = [

            { header: 'ORIGINAL', watermark: 'FIRST ORIGINAL' },

            { header: 'ORIGINAL', watermark: 'SECOND ORIGINAL' },

            { header: 'ORIGINAL', watermark: 'THIRD ORIGINAL' },

            { header: 'COPY NON-NEGOTIABLE', watermark: null },

            { header: 'COPY NON-NEGOTIABLE', watermark: null },

            { header: 'COPY NON-NEGOTIABLE', watermark: null }

        ];

    } else {

        copiesToPrint = [

            { header: copyType, watermark: null }

        ];

    }



    copiesToPrint.forEach((copyConfig, copyIndex) => {

        // Build front pages for this copy

        for (let p = 1; p <= totalFrontPages; p++) {

            // Clone the page-1 template node

            const pageClone = page1Template.cloneNode(true);



            // Update the page number text (usually in .bl-title-right span)

            const pageNumSpan = pageClone.querySelector('.bl-title-right span');

            if (pageNumSpan) {

                pageNumSpan.textContent = `Page ${p} of ${totalFrontPages}`;

            }



            // Fill elements in pageClone

            fields.forEach(field => {

                // Only include full BL data on the first page. Subsequent pages should only show container lines and related cargo details.

                if (p > 1 && !['cargo_containers', 'cargo_quantity', 'cargo_description', 'cargo_measurement'].includes(field)) {

                    return; // Skip non-container fields on later pages

                }



                let val = formValues[field] || '';



                // Handle page-specific column exclusions

                if (field === 'cargo_containers') {

                    const pageLines = containerLines.slice((p - 1) * linesPerPage, p * linesPerPage);

                    val = pageLines.join('\n');

                } else if (field === 'cargo_quantity' || field === 'cargo_description' || field === 'cargo_measurement') {

                    // Only print general cargo details on Page 1

                    if (p > 1) {

                        val = '';

                    }

                }



                const printElem = pageClone.querySelector(`#p-${field}`);

                if (printElem) {

                    if (field === 'shipper' || field === 'consignee' || field === 'notify_party') {

                        const lines = val.split('\n');

                        const name = lines[0] || '';

                        const address = lines.slice(1).join('\n');

                        printElem.innerHTML = `<strong>${escapeHTML(name)}</strong><br>${escapeHTML(address)}`;

                    } else {

                        printElem.textContent = val;

                    }



                    // Add contenteditable and data-field-id if it's editable

                    const editableFields = [

                        'shipper', 'consignee', 'notify_party', 'delivery_agent',

                        'pre_carriage', 'ocean_vessel', 'voy_no', 'place_of_receipt', 'port_of_loading',

                        'port_of_discharge', 'place_of_delivery', 'cargo_containers', 'cargo_quantity',

                        'cargo_description', 'cargo_measurement', 'freight_charges', 'revenue_tons',

                        'rate', 'per', 'prepaid', 'collect', 'ex_rate', 'prepaid_at', 'payable_at',

                        'place_date_issue', 'movement', 'no_of_original', 'signed_on_behalf'

                    ];

                    if (editableFields.includes(field)) {

                        if (isSharedMode && field === 'delivery_agent') {

                            // Skip making delivery_agent editable in shared mode

                        } else {

                            printElem.setAttribute('contenteditable', 'true');

                            printElem.setAttribute('data-field-id', field);

                            printElem.classList.add('editable-preview-field');

                        }

                    }

                }

            });



            // Set company name and logo

            const printCompanyName = pageClone.querySelector('#p-company_name');

            if (printCompanyName) {

                printCompanyName.textContent = companyVersion.toUpperCase();

            }



            const printOriginal = pageClone.querySelector('.bl-original');

            if (printOriginal) {

                printOriginal.textContent = copyConfig.header;

            }



            const sigImg = pageClone.querySelector('#p-signature-img');

            if (sigImg) {

                sigImg.style.display = showSignature ? 'block' : 'none';

            }



            const companyHeader = pageClone.querySelector('.bl-company-header');

            if (companyHeader) {

                companyHeader.classList.remove('company-pul', 'company-pll');

                if (companyVersion === 'PT. Putera Utama Lautan') {

                    companyHeader.classList.add('company-pul');

                } else {

                    companyHeader.classList.add('company-pll');

                }

            }



            const printLogo = pageClone.querySelector('#p-logo');

            if (printLogo) {

                printLogo.src = logoSrc;

            }



            // Set watermark if present (only on page 1 of the B/L)

            if (p === 1 && copyConfig.watermark) {

                const watermarkDiv = document.createElement('div');

                watermarkDiv.className = 'bl-watermark';

                watermarkDiv.textContent = copyConfig.watermark;

                pageClone.appendChild(watermarkDiv);

            }



            // Append page to the preview container

            docContainer.appendChild(pageClone);



            // For pages beyond the first, keep only the title section, container rows, and footer with signature box

            if (p > 1) {

                // Save references before clearing

                const titleSection = pageClone.querySelector('.bl-title-section');

                const containerElem = pageClone.querySelector('#p-cargo_containers');

                

                // Replicate the footer row containing the signature box and stamp

                const footerRow = pageClone.querySelector('.signature-box')?.closest('.bl-row');

                const clonedFooterRow = footerRow ? footerRow.cloneNode(true) : null;

                

                // Get the outer border (we'll reuse it for consistent styling)

                const outerBorder = pageClone.querySelector('.bl-outer-border');

                if (outerBorder) {

                    outerBorder.innerHTML = '';

                    

                    // Re-add title section

                    if (titleSection) {

                        outerBorder.appendChild(titleSection);

                    }

                    

                    // Create a simple container-only table

                    if (containerElem) {

                        // Add the table header row for context

                        const tableHeader = document.createElement('div');

                        tableHeader.className = 'bl-table-header flex-row border-bottom border-top';

                        tableHeader.innerHTML = `

                            <div class="col-containers border-right text-center">Container No. and Seal No.<br>Marks & Nos.</div>

                            <div class="col-packages border-right text-center">Quantity and<br>Kind Of Packges</div>

                            <div class="col-desc border-right text-center">Description of Goods</div>

                            <div class="col-measure text-center">Measurement (M3)<br>Gross Weight (KGS)</div>

                        `;

                        outerBorder.appendChild(tableHeader);

                        

                        // Add the container data body

                        const tableBody = document.createElement('div');

                        tableBody.className = 'bl-table-body flex-row';

                        tableBody.style.minHeight = 'auto';

                        

                        // Re-create all 4 columns but only containers has data

                        containerElem.style.fontSize = '7.5pt';

                        tableBody.innerHTML = `

                            <div class="col-packages border-right text-pre-wrap text-center"></div>

                            <div class="col-desc border-right text-pre-wrap"></div>

                            <div class="col-measure text-pre-wrap text-right"></div>

                        `;

                        tableBody.insertBefore(containerElem, tableBody.firstChild);

                        outerBorder.appendChild(tableBody);

                    }



                    // Re-add cloned footer row with signature box at the bottom

                    if (clonedFooterRow) {

                        clonedFooterRow.classList.add('border-top');

                        outerBorder.appendChild(clonedFooterRow);

                    }

                }

            }

        }



        // Clone and append static page-2 (Terms and conditions) if it exists for this copy

        if (page2Template) {

            const page2Clone = page2Template.cloneNode(true);

            page2Clone.className = 'bl-page page-2 page-break-before';

            const includePage2 = document.getElementById('print-page2-chk').checked;

            page2Clone.style.display = includePage2 ? 'block' : 'none';

            docContainer.appendChild(page2Clone);

        }

    });

}



// Checkbox change handler in preview mode

document.getElementById('print-page2-chk').addEventListener('change', (e) => {

    const page2s = document.querySelectorAll('#preview-document .page-2');

    page2s.forEach(page2 => {

        page2.style.display = e.target.checked ? 'block' : 'none';

    });

});



// Copy type change handler in preview mode

document.getElementById('print-copy-type').addEventListener('change', (e) => {

    buildPrintPreview();

});



// Signature change handler in preview mode

document.getElementById('print-signature-chk').addEventListener('change', (e) => {

    const showSig = e.target.checked;

    const sigElems = document.querySelectorAll('#preview-document .signature-image');

    sigElems.forEach(el => {

        el.style.display = showSig ? 'block' : 'none';

    });

});



// Trigger OS standard printer dialog

function triggerBrowserPrint() {

    // Check page 2 state before printing

    const includePage2 = document.getElementById('print-page2-chk').checked;

    

    // Add page-2 class to control print stylesheets via custom body class if needed

    if (!includePage2) {

        document.body.classList.add('hide-page2-print');

        // Let's also hide it directly via CSS inline to guarantee

        const p2 = document.querySelector('#preview-document .page-2');

        if (p2) p2.style.setProperty('display', 'none', 'important');

    } else {

        document.body.classList.remove('hide-page2-print');

        const p2 = document.querySelector('#preview-document .page-2');

        if (p2) p2.style.removeProperty('display');

    }



    // Capture original document title

    const originalTitle = document.title;



    // Retrieve values for the print filename

    const blNo = (document.getElementById('bl_no')?.value || '').trim();

    const shipperName = (document.getElementById('shipper_name')?.value || '').trim();

    const consigneeName = (document.getElementById('consignee_name')?.value || '').trim();

    

    const containersVal = (document.getElementById('cargo_containers')?.value || '').trim();

    const containerLines = containersVal ? containersVal.split('\n').map(l => l.trim()).filter(Boolean) : [];

    const containerCount = containerLines.length;



    // Build the dynamic file name parts

    const filenameParts = [];

    if (blNo) filenameParts.push(blNo);

    if (shipperName) filenameParts.push(shipperName);

    if (consigneeName) filenameParts.push(consigneeName);

    filenameParts.push(containerCount);



    // Join and sanitize characters that are invalid in file names

    let printFilename = filenameParts.join(' ').replace(/[\\/:*?"<>|]/g, '');



    // Set document title to the customized format

    document.title = printFilename;



    // Call standard browser printing

    window.print();



    // Restore the original document title after the print dialog closes

    setTimeout(() => {

        document.title = originalTitle;

    }, 500);

}



// ==========================================================================

// AUTOCOMPLETE & RECOMMENDATIONS SYSTEM

// ==========================================================================



// Load saved parties from DB/API

async function loadSavedParties() {

    try {

        const response = await fetch('api.php?action=get_parties');

        if (response.status === 401) {

            sessionStorage.removeItem('auth_user');

            sessionStorage.removeItem('auth_pass');

            document.getElementById('login-overlay').style.display = 'flex';

            return;

        }

        if (!response.ok) throw new Error("HTTP error " + response.status);

        const result = await response.json();

        if (result.success) {

            savedParties = result.data || [];

        } else {

            console.error("Failed to load saved parties:", result.error);

        }

    } catch (e) {

        console.error("Error loading saved parties:", e);

        // Fallback to local storage or defaults if offline

        const local = localStorage.getItem('pulaulaut_saved_parties');

        if (local) {

            savedParties = JSON.parse(local);

        } else {

            // Seed defaults (note: we store address without the name header now, 

            // since we handle name separately)

            savedParties = [

                { 

                    type: 'shipper', 

                    name: 'PT. PUTERA UTAMA LAUTAN (JAMBI)', 

                    address: `JL. JENDRAL SUDIRMAN KOMPLEK TRANSMART\nRUKO BLOK D36 RT.32, KEL TAMBAK SARI\nKEC. JAMBI SELATAN\n36122 JAMBI INDONESIA` 

                },

                { 

                    type: 'consignee', 

                    name: 'PT. PUTERA UTAMA LAUTAN (PONTIANAK)', 

                    address: `JL. KEMAKMURAN GG. KELUARGA 2\nNO. 12A KEC. PONTIANAK KOTA, KOTA PONTIANAK\nKALIMANTAN BARAT\n78113 PONTIANAK INDONESIA` 

                },

                { 

                    type: 'notify', 

                    name: 'SAME AS CONSIGNEE', 

                    address: 'SAME AS CONSIGNEE' 

                }

            ];

        }

    }

    setupAutocomplete();

    setupLogoUpload();

    updateLogoStatusText();

}



// Setup autocomplete events for shipper, consignee, and notify_party

function setupAutocomplete() {

    const fieldsConfig = [

        { type: 'shipper', nameInputId: 'shipper_name', addressTextareaId: 'shipper_address', dropdownId: 'shipper_dropdown', saveBtnId: 'btn-save-shipper-party' },

        { type: 'consignee', nameInputId: 'consignee_name', addressTextareaId: 'consignee_address', dropdownId: 'consignee_dropdown', saveBtnId: 'btn-save-consignee-party' },

        { type: 'notify', nameInputId: 'notify_name', addressTextareaId: 'notify_address', dropdownId: 'notify_party_dropdown', saveBtnId: 'btn-save-notify-party' }

    ];



    fieldsConfig.forEach(cfg => {

        const nameInput = document.getElementById(cfg.nameInputId);

        const dropdown = document.getElementById(cfg.dropdownId);

        const addressTextarea = document.getElementById(cfg.addressTextareaId);

        const saveBtn = document.getElementById(cfg.saveBtnId);



        if (!nameInput || !dropdown || !addressTextarea) return;



        // Render matching suggestions

        const renderSuggestions = (query = '') => {

            const normalizedQuery = query.toLowerCase().trim();

            const matches = savedParties.filter(p => 

                p.type === cfg.type && 

                p.name.toLowerCase().includes(normalizedQuery)

            );



            if (matches.length === 0) {

                dropdown.innerHTML = '<div class="suggest-item" style="cursor: default; color: var(--text-muted);">No recommendations found. Type to add new.</div>';

            } else {

                dropdown.innerHTML = '';

                matches.forEach(match => {

                    const item = document.createElement('div');

                    item.className = 'suggest-item';

                    item.innerHTML = `

                        <span class="suggest-item-name">${escapeHTML(match.name)}</span>

                        <span class="suggest-item-address">${escapeHTML(match.address.replace(/\n/g, ' '))}</span>

                    `;

                    item.addEventListener('click', () => {

                        nameInput.value = match.name;

                        addressTextarea.value = match.address;

                        dropdown.classList.remove('show');

                        

                        // Trigger input events to evaluate save button state

                        nameInput.dispatchEvent(new Event('input'));

                        addressTextarea.dispatchEvent(new Event('input'));

                    });

                    dropdown.appendChild(item);

                });

            }

            dropdown.classList.add('show');

        };



        // Input search events

        nameInput.addEventListener('input', (e) => {

            renderSuggestions(e.target.value);

            evaluateSaveButton();

        });



        nameInput.addEventListener('focus', () => {

            renderSuggestions(nameInput.value);

        });



        addressTextarea.addEventListener('input', () => {

            evaluateSaveButton();

        });



        // Check for saving new recommendations

        const evaluateSaveButton = () => {

            const currentName = nameInput.value.trim();

            const currentAddress = addressTextarea.value.trim();

            

            if (!currentName || !currentAddress) {

                if (saveBtn) saveBtn.classList.add('hidden');

                return;

            }



            // Check if there is an exact match in our saved list with exactly the same type, name, and address

            const exactMatch = savedParties.find(p => 

                p.type === cfg.type && 

                p.name.toLowerCase() === currentName.toLowerCase() &&

                p.address.trim().replace(/\r/g, '') === currentAddress.replace(/\r/g, '')

            );



            if (!exactMatch && saveBtn) {

                saveBtn.classList.remove('hidden');

            } else {

                if (saveBtn) saveBtn.classList.add('hidden');

            }

        };



        // Trigger on load

        evaluateSaveButton();

    });



    // Close dropdowns on outside click

    document.addEventListener('click', (e) => {

        fieldsConfig.forEach(cfg => {

            const nameInput = document.getElementById(cfg.nameInputId);

            const dropdown = document.getElementById(cfg.dropdownId);

            if (nameInput && dropdown && !nameInput.contains(e.target) && !dropdown.contains(e.target)) {

                dropdown.classList.remove('show');

            }

        });

    });

}



// Save a party to the database

window.saveCurrentParty = async function(type) {

    let nameInputId = '';

    let addressTextareaId = '';

    let saveBtnId = '';

    

    if (type === 'shipper') {

        nameInputId = 'shipper_name';

        addressTextareaId = 'shipper_address';

        saveBtnId = 'btn-save-shipper-party';

    } else if (type === 'consignee') {

        nameInputId = 'consignee_name';

        addressTextareaId = 'consignee_address';

        saveBtnId = 'btn-save-consignee-party';

    } else if (type === 'notify') {

        nameInputId = 'notify_name';

        addressTextareaId = 'notify_address';

        saveBtnId = 'btn-save-notify-party';

    }



    const nameInput = document.getElementById(nameInputId);

    const addressTextarea = document.getElementById(addressTextareaId);

    const saveBtn = document.getElementById(saveBtnId);

    

    if (!nameInput || !addressTextarea) return;



    const name = nameInput.value.trim();

    const address = addressTextarea.value.trim();



    if (!name || !address) {

        alert("Please enter both Name and Address to save a recommendation!");

        return;

    }



    const partyObj = {

        type: type,

        name: name,

        address: address

    };



    try {

        const response = await fetch('api.php?action=save_party', {

            method: 'POST',

            headers: {

                'Content-Type': 'application/json'

            },

            body: JSON.stringify(partyObj)

        });



        if (!response.ok) throw new Error("HTTP error " + response.status);

        const result = await response.json();

        

        if (result.success) {

            alert(`"${name}" successfully saved to ${type} recommendations!`);

            // Update local state

            const existingIdx = savedParties.findIndex(p => p.type === type && p.name.toLowerCase() === name.toLowerCase());

            if (existingIdx !== -1) {

                savedParties[existingIdx] = partyObj;

            } else {

                savedParties.push(partyObj);

            }

            // Save offline backup

            localStorage.setItem('pulaulaut_saved_parties', JSON.stringify(savedParties));

            if (saveBtn) saveBtn.classList.add('hidden');

        } else {

            alert("Database Error: " + result.error);

        }

    } catch (e) {

        console.error("Failed to save recommendation to server. Saving locally:", e);

        // Fallback save locally

        const existingIdx = savedParties.findIndex(p => p.type === type && p.name.toLowerCase() === name.toLowerCase());

        if (existingIdx !== -1) {

            savedParties[existingIdx] = partyObj;

        } else {

            savedParties.push(partyObj);

        }

        localStorage.setItem('pulaulaut_saved_parties', JSON.stringify(savedParties));

        if (saveBtn) saveBtn.classList.add('hidden');

        alert(`Saved "${name}" locally (offline mode).`);

    }

};



// ==========================================================================

// MULTI-COMPANY LOGO UPLOAD & CONFIG

// ==========================================================================



// Setup Logo Upload event handler

function setupLogoUpload() {

    const logoUploadInput = document.getElementById('logo_upload');

    if (!logoUploadInput) return;



    logoUploadInput.addEventListener('change', (e) => {

        const file = e.target.files[0];

        if (!file) return;



        if (!file.type.startsWith('image/')) {

            alert('Please upload an image file!');

            return;

        }



        const reader = new FileReader();

        reader.onload = (event) => {

            const base64String = event.target.result;

            const company = document.getElementById('company_version').value;



            if (company === 'PT. Putera Utama Lautan') {

                localStorage.setItem('logo_pll', base64String);

            } else if (company === 'PT. Putera Utama Lautan') {

                localStorage.setItem('logo_pul', base64String);

            }



            updateLogoStatusText();

            alert('Logo successfully updated for ' + company + '!');

        };

        reader.readAsDataURL(file);

    });

}



// Reset Company Logo to default

window.resetCompanyLogo = function() {

    const company = document.getElementById('company_version').value;

    if (confirm('Are you sure you want to reset the logo for ' + company + ' to default?')) {

        if (company === 'PT. Putera Utama Lautan') {

            localStorage.removeItem('logo_pll');

        } else if (company === 'PT. Putera Utama Lautan') {

            localStorage.removeItem('logo_pul');

        }

        updateLogoStatusText();

        alert('Logo reset to default.');

    }

};



// Update logo status text on the UI

function updateLogoStatusText() {

    const company = document.getElementById('company_version').value;

    const statusMsg = document.getElementById('logo_status_msg');

    if (!statusMsg) return;



    let customLogo = null;

    if (company === 'PT. Putera Utama Lautan') {

        customLogo = localStorage.getItem('logo_pll');

    } else if (company === 'PT. Putera Utama Lautan') {

        customLogo = localStorage.getItem('logo_pul');

    }



    if (customLogo) {

        statusMsg.textContent = 'Custom logo active';

        statusMsg.style.color = 'var(--color-success)';

    } else {

        statusMsg.textContent = 'Default logo active';

        statusMsg.style.color = 'var(--text-muted)';

    }

}



// ==========================================================================

// B/L PDF IMPORT & CLIENT-SIDE PARSING

// ==========================================================================



async function handlePDFImport(event) {

    const file = event.target.files[0];

    if (!file) return;



    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {

        alert("Please select a valid PDF file.");

        return;

    }



    console.log("Importing PDF:", file.name);



    try {

        const arrayBuffer = await file.arrayBuffer();



        // Load PDF using PDF.js

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

        const pdf = await loadingTask.promise;



        if (pdf.numPages < 1) {

            throw new Error("The PDF file has no pages.");

        }



        // Extract text from the first page

        const page = await pdf.getPage(1);

        const textContent = await page.getTextContent();

        const items = textContent.items;



        // Reconstruct layout using stream order grouping with X-gap splitting

        const threshold = 5;

        const lineGroups = [];

        let currentLineItems = [];



        for (let item of items) {

            if (currentLineItems.length === 0) {

                currentLineItems.push(item);

            } else {

                const lastItem = currentLineItems[currentLineItems.length - 1];

                const verticalClose = Math.abs(item.transform[5] - lastItem.transform[5]) < threshold;

                // If item is on the right side (horizontal gap > 150), don't group them in the same column

                const horizontalClose = item.transform[4] > lastItem.transform[4] ? 

                    (item.transform[4] - lastItem.transform[4]) < 150 : true;



                if (verticalClose && horizontalClose) {

                    currentLineItems.push(item);

                } else {

                    currentLineItems.sort((a, b) => a.transform[4] - b.transform[4]);

                    lineGroups.push([...currentLineItems]);

                    currentLineItems = [item];

                }

            }

        }

        if (currentLineItems.length > 0) {

            currentLineItems.sort((a, b) => a.transform[4] - b.transform[4]);

            lineGroups.push(currentLineItems);

        }



        const parsedLines = [];

        for (let group of lineGroups) {

            const lineStr = group.map(item => item.str).join(' ').trim();

            if (lineStr) {

                parsedLines.push(lineStr);

            }

        }



        const fullText = parsedLines.join('\n');

        console.log("Extracted raw text from PDF.js:\n", fullText);



        const parsedData = parseImportedPDFText(fullText);

        populateFormWithParsedData(parsedData);



        event.target.value = '';

        switchView('editor');



    } catch (error) {

        console.error("Failed to parse PDF B/L:", error);

        alert("Failed to parse the PDF file. Please ensure it is a valid text-selectable PDF B/L. Error: " + error.message);

        event.target.value = '';

    }

}



function parseImportedPDFText(text) {

    // Split lines and clean them

    let lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    

    // Filter out page numbers to avoid positioning noise

    const cleanLines = lines.filter(l => !/page\s+\d+/i.test(l));

    

    const data = {};



    // 1. Find Booking No and BL No line

    // It's usually the line after "apply to:" or containing booking/BL numbers

    let bookingBLLineIdx = -1;

    for (let i = 0; i < cleanLines.length; i++) {

        if (cleanLines[i].toLowerCase().includes('apply to:')) {

            if (i + 1 < cleanLines.length) {

                bookingBLLineIdx = i + 1;

                break;

            }

        }

    }



    if (bookingBLLineIdx === -1) {

        for (let i = 0; i < cleanLines.length; i++) {

            if (/^[A-Z0-9]+\s+[A-Z0-9]+$/.test(cleanLines[i]) && cleanLines[i].includes(' ')) {

                bookingBLLineIdx = i;

                break;

            }

        }

    }



    if (bookingBLLineIdx !== -1) {

        const parts = cleanLines[bookingBLLineIdx].split(/\s+/);

        if (parts.length >= 2) {

            data.booking_no = parts[0];

            data.bl_no = parts[1];

        }

    }



    // 2. Find table header index in cleanLines

    let tableHeaderIdx = -1;

    for (let i = 0; i < cleanLines.length; i++) {

        const uppercase = cleanLines[i].toUpperCase();

        if (uppercase.includes('DESCRIPTION OF GOODS') || 

            (uppercase.includes('MEASUREMENT') && uppercase.includes('KIND OF PACKGES')) || 

            (uppercase.includes('CONTAINER NO.') && uppercase.includes('DESCRIPTION'))) {

            tableHeaderIdx = i;

            break;

        }

    }



    let routingIdx = -1;

    if (tableHeaderIdx !== -1) {

        // Vessel / Voyage line is H - 1

        const vesselLine = cleanLines[tableHeaderIdx - 1];

        if (vesselLine) {

            const vParts = vesselLine.split(/\s+/);

            if (vParts.length >= 2) {

                data.voy_no = vParts[vParts.length - 1];

                data.ocean_vessel = vParts.slice(0, vParts.length - 1).join(' ');

            }

        }



        // Routing Lines are H - 3 (Receipt) and H - 2 (Loading, Discharge, Delivery)

        routingIdx = tableHeaderIdx - 3;

        if (routingIdx > bookingBLLineIdx) {

            const receiptLine = cleanLines[tableHeaderIdx - 3];

            const otherPortsLine = cleanLines[tableHeaderIdx - 2];

            const routeLine = receiptLine + ' ' + otherPortsLine;

            

            // Regex to extract places. Usually "CITY, COUNTRY" or "CITY, STATE"

            const matches = routeLine.match(/([^,]+,\s*[A-Z\s]+?)(?=\s+[A-Z]{3,}|\s*$)/g) || routeLine.match(/([^,]+,\s*[A-Z]+)/g);

            if (matches && matches.length >= 4) {

                data.place_of_receipt = matches[0] ? matches[0].trim() : '';

                data.port_of_loading = matches[1] ? matches[1].trim() : '';

                data.port_of_discharge = matches[2] ? matches[2].trim() : '';

                data.place_of_delivery = matches[3] ? matches[3].trim() : '';

            } else {

                // Fallback split by double spaces

                const parts = routeLine.split(/  +/);

                data.place_of_receipt = parts[0] || '';

                data.port_of_loading = parts[1] || '';

                data.port_of_discharge = parts[2] || '';

                data.place_of_delivery = parts[3] || '';

            }

        }

    }



    // 3. Parties (between bookingBLLineIdx + 1 and routingIdx - 1)

    if (bookingBLLineIdx !== -1 && routingIdx !== -1 && routingIdx > bookingBLLineIdx) {

        const partyLines = cleanLines.slice(bookingBLLineIdx + 1, routingIdx);

        

        const isCompanyName = (str) => {

            const uppercase = str.toUpperCase();

            return uppercase.includes('BHD') || 

                   uppercase.includes('SDN') || 

                   uppercase.startsWith('PT.') || 

                   uppercase.includes(' PT ') ||

                   uppercase.includes('PTE') || 

                   uppercase.includes('LTD') || 

                   uppercase.includes('INC') || 

                   uppercase.includes('CORP') || 

                   uppercase.includes('CO.') || 

                   uppercase.includes('LOGISTICS') || 

                   uppercase.includes('SHIPPING') || 

                   uppercase.includes('CHEMICAL') || 

                   uppercase.includes('LINE');

        };



        const companyIndices = [];

        for (let i = 0; i < partyLines.length; i++) {

            if (isCompanyName(partyLines[i])) {

                companyIndices.push(i);

            }

        }



        if (companyIndices.length >= 4) {

            const c0 = companyIndices[0]; 

            const c1 = companyIndices[1]; 

            const c2 = companyIndices[2]; 

            const c3 = companyIndices[3]; 

            

            data.shipper_name = partyLines[c0];

            

            // Look for country name to split shipper/consignee addresses

            const countries = [

                'INDONESIA', 'MALAYSIA', 'SINGAPORE', 'CHINA', 'VIETNAM', 'THAILAND', 'PHILIPPINES', 

                'JAPAN', 'KOREA', 'TAIWAN', 'INDIA', 'USA', 'UNITED STATES', 'AUSTRALIA', 'UK', 

                'UNITED KINGDOM', 'GERMANY', 'FRANCE', 'NETHERLANDS', 'BELGIUM', 'ITALY', 'SPAIN', 

                'PORTUGAL', 'SWITZERLAND', 'SWEDEN', 'NORWAY', 'FINLAND', 'DENMARK', 'CANADA', 

                'MEXICO', 'BRAZIL', 'ARGENTINA', 'CHILE', 'COLOMBIA', 'PERU', 'EGYPT', 'SOUTH AFRICA', 

                'UAE', 'SAUDI ARABIA', 'TURKEY', 'RUSSIA', 'NEW ZEALAND', 'HONG KONG', 'BANGLADESH', 

                'PAKISTAN', 'SRI LANKA'

            ];

            

            let countryLineIdx = c0 + 1;

            for (let idx = c0 + 1; idx < c1; idx++) {

                const uppercase = partyLines[idx].toUpperCase();

                const hasCountry = countries.some(country => uppercase.includes(country));

                if (hasCountry) {

                    countryLineIdx = idx;

                    break;

                }

            }

            

            const shipperAddrLines = partyLines.slice(c0 + 1, countryLineIdx + 1);

            const consigneeAddrLines = partyLines.slice(countryLineIdx + 1, c1);

            

            data.shipper_address = shipperAddrLines.join('\n');

            data.consignee_name = partyLines[c1];

            data.consignee_address = consigneeAddrLines.join('\n');

            

            data.notify_name = partyLines[c2];

            const middleLines = partyLines.slice(c2 + 1, c3);

            const notifyLines = [];

            const deliveryLines = [];

            for (let j = 0; j < middleLines.length; j++) {

                const line = middleLines[j];

                const uppercase = line.toUpperCase();

                if (uppercase.includes('TEL :') || uppercase.includes('FAX :') || uppercase.includes('DELIVERY') || j >= 2) {

                    deliveryLines.push(line);

                } else {

                    notifyLines.push(line);

                }

            }

            data.notify_address = notifyLines.join('\n');

            data.delivery_agent = partyLines[c3] + '\n' + deliveryLines.join('\n');

        }

    }



    // 4. Cargo details (after tableHeaderIdx)

    let cargoEndIdx = -1;

    if (tableHeaderIdx !== -1) {

        for (let i = tableHeaderIdx + 1; i < cleanLines.length; i++) {

            const uppercase = cleanLines[i].toUpperCase();

            if (uppercase.includes('COLLECTPREPAID') || 

                uppercase.includes('FREIGHT AND CHARGES') || 

                uppercase.includes('REVENUE TONS') || 

                uppercase.includes('TERM :')) {

                cargoEndIdx = i;

                break;

            }

        }



        if (cargoEndIdx !== -1) {

            const cargoLines = cleanLines.slice(tableHeaderIdx + 1, cargoEndIdx);

            const containerList = [];

            const descriptionList = [];

            let quantity = '';

            let measurement = '';

            let weight = '';



            for (let line of cargoLines) {

                const uppercase = line.toUpperCase();

                

                if (/^[A-Z]{4}\d+/.test(line)) {

                    containerList.push(line);

                } 

                else if (/\d+\s+BAGS|\d+X\d+/.test(uppercase)) {

                    if (uppercase.includes('M3')) {

                        const match = line.match(/^([^\d]*\d+\s+[A-Z]+)\s+(.*M3.*)$/i);

                        if (match) {

                            quantity = match[1].trim();

                            measurement = match[2].trim();

                        } else {

                            const parts = line.split(/  +/);

                            quantity = parts[0] || '';

                            measurement = parts[1] || '';

                        }

                    } else {

                        quantity = line;

                    }

                } 

                else if (uppercase.includes('KGS') || uppercase.includes('GS') || uppercase.includes('KILOGRAMS')) {

                    weight = line;

                }

                else {

                    if (!uppercase.includes('PAGE') && !uppercase.includes('MEASUREMENT')) {

                        descriptionList.push(line);

                    }

                }

            }



            data.cargo_containers = containerList.join('\n');

            data.cargo_quantity = quantity;

            data.cargo_description = descriptionList.join('\n');

            data.cargo_measurement = measurement + '\n\n' + weight;

        }

    }



    // 5. Freight & issue details (after cargoEndIdx)

    if (cargoEndIdx !== -1) {

        for (let i = cargoEndIdx; i < cleanLines.length; i++) {

            const line = cleanLines[i];

            if (line.includes('Term :') || line.includes('FREIGHT PREPAID') || line.includes('FREIGHT COLLECT')) {

                data.freight_charges = line;

            }

            if (line.includes('THREE(3)') || line.includes('ORIGINAL') || line.includes('TWO(2)')) {

                data.no_of_original = line;

            }

            if (line.startsWith('PT. PUTERA UTAMA LAUTAN') || line.startsWith('PT. PUTERA UTAMA LAUTAN')) {

                data.signed_on_behalf = line;

            }

        }



        let dateIssueIdx = -1;

        for (let i = cargoEndIdx; i < cleanLines.length; i++) {

            if (/\d{2}-[A-Za-z]{3}-\d{4}/.test(cleanLines[i])) {

                dateIssueIdx = i;

                break;

            }

        }



        if (dateIssueIdx !== -1) {

            const dateStr = cleanLines[dateIssueIdx];

            let placeStr = '';

            if (dateIssueIdx - 1 >= 0 && cleanLines[dateIssueIdx - 1].includes('INDONESIA')) {

                placeStr = cleanLines[dateIssueIdx - 1];

            }

            data.place_date_issue = placeStr + '   ' + dateStr;

        }

    }



    return data;

}



function populateFormWithParsedData(data) {

    resetForm();

    

    if (data.booking_no) document.getElementById('booking_no').value = data.booking_no;

    if (data.bl_no) document.getElementById('bl_no').value = data.bl_no;

    

    let companyVersion = 'PT. Putera Utama Lautan';

    if (data.signed_on_behalf) {

        if (data.signed_on_behalf.toUpperCase().includes('PUTERA UTAMA LAUTAN')) {

            companyVersion = 'PT. Putera Utama Lautan';

        }

    } else if (data.bl_no) {

        if (data.bl_no.toUpperCase().startsWith('PUL')) {

            companyVersion = 'PT. Putera Utama Lautan';

        }

    }

    

    const companySelect = document.getElementById('company_version');

    if (companySelect) {

        companySelect.value = companyVersion;

        companySelect.dispatchEvent(new Event('change'));

    }

    

    if (data.shipper_name) document.getElementById('shipper_name').value = data.shipper_name;

    if (data.shipper_address) document.getElementById('shipper_address').value = data.shipper_address;

    

    if (data.consignee_name) document.getElementById('consignee_name').value = data.consignee_name;

    if (data.consignee_address) document.getElementById('consignee_address').value = data.consignee_address;

    

    if (data.notify_name) document.getElementById('notify_name').value = data.notify_name;

    if (data.notify_address) document.getElementById('notify_address').value = data.notify_address;

    

    if (data.delivery_agent) document.getElementById('delivery_agent').value = data.delivery_agent;

    

    if (data.pre_carriage) document.getElementById('pre_carriage').value = data.pre_carriage;

    if (data.ocean_vessel) document.getElementById('ocean_vessel').value = data.ocean_vessel;

    if (data.voy_no) document.getElementById('voy_no').value = data.voy_no;

    

    if (data.place_of_receipt) document.getElementById('place_of_receipt').value = data.place_of_receipt;

    if (data.port_of_loading) document.getElementById('port_of_loading').value = data.port_of_loading;

    if (data.port_of_discharge) document.getElementById('port_of_discharge').value = data.port_of_discharge;

    if (data.place_of_delivery) document.getElementById('place_of_delivery').value = data.place_of_delivery;

    

    if (data.cargo_containers) {

        document.getElementById('cargo_containers').value = data.cargo_containers;

        document.getElementById('builder-containers').value = data.cargo_containers;

    }

    if (data.cargo_quantity) document.getElementById('cargo_quantity').value = data.cargo_quantity;

    if (data.cargo_description) document.getElementById('cargo_description').value = data.cargo_description;

    if (data.cargo_measurement) document.getElementById('cargo_measurement').value = data.cargo_measurement;

    

    if (data.freight_charges) document.getElementById('freight_charges').value = data.freight_charges;

    if (data.revenue_tons) document.getElementById('revenue_tons').value = data.revenue_tons;

    if (data.rate) document.getElementById('rate').value = data.rate;

    if (data.per) document.getElementById('per').value = data.per;

    if (data.prepaid) document.getElementById('prepaid').value = data.prepaid;

    if (data.collect) document.getElementById('collect').value = data.collect;

    if (data.ex_rate) document.getElementById('ex_rate').value = data.ex_rate;

    if (data.prepaid_at) document.getElementById('prepaid_at').value = data.prepaid_at;

    if (data.payable_at) document.getElementById('payable_at').value = data.payable_at;

    if (data.place_date_issue) document.getElementById('place_date_issue').value = data.place_date_issue;

    if (data.movement) document.getElementById('movement').value = data.movement;

    if (data.no_of_original) document.getElementById('no_of_original').value = data.no_of_original;

    

    if (data.signed_on_behalf) {

        document.getElementById('signed_on_behalf').value = data.signed_on_behalf;

    } else {

        if (companyVersion === 'PT. Putera Utama Lautan') {

            document.getElementById('signed_on_behalf').value = 'PT. PUTERA UTAMA LAUTAN';

        } else {

            document.getElementById('signed_on_behalf').value = 'PT. PUTERA UTAMA LAUTAN';

        }

    }

    

    const fields = ['shipper_name', 'shipper_address', 'consignee_name', 'consignee_address', 'notify_name', 'notify_address'];

    fields.forEach(fId => {

        const el = document.getElementById(fId);

        if (el) el.dispatchEvent(new Event('input'));

    });

}



// ==========================================================================

// B/L SHARING & INTERACTIVE PREVIEW SYSTEM

// ==========================================================================



async function loadSharedBL(slug) {

    try {

        const response = await fetch(`api.php?slug=${encodeURIComponent(slug)}`);

        if (!response.ok) {

            throw new Error(`HTTP error! status: ${response.status}`);

        }

        const result = await response.json();

        if (result.success && result.data) {

            const bl = result.data;

            billsOfLading = [bl]; // Store shared B/L as the only loaded record

            

            // Populate form inputs

            populateFormFromBL(bl);

            

            // Build print preview and switch directly to preview view

            buildPrintPreview();

            switchView('preview');

        } else {

            document.body.innerHTML = `

                <div style="background-color: #0b0f19; color: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Inter', sans-serif; padding: 20px;">

                    <div style="background-color: #1e293b; padding: 40px; border-radius: 8px; border: 1px solid #475569; max-width: 500px; width: 100%; text-align: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">

                        <h2 style="font-family: 'Outfit', sans-serif; margin-bottom: 16px; color: #ef4444;">Draft Not Found</h2>

                        <p style="color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">The shared Bill of Lading draft you are trying to access does not exist, or the sharing link is invalid.</p>

                        <span style="color: #64748b;">PT. Putera Utama Lautan B/L Management System</span>

                    </div>

                </div>

            `;

        }

    } catch (e) {

        console.error("Failed to load shared B/L:", e);

        alert("Failed to load shared draft from the server.");

    }

}



async function shareDraft() {

    let slug = document.getElementById('form-share-slug').value.trim();

    if (!slug) {

        // Generate a unique 12-char alphanumeric slug

        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

        let generatedSlug = '';

        for (let i = 0; i < 12; i++) {

            generatedSlug += chars.charAt(Math.floor(Math.random() * chars.length));

        }

        document.getElementById('form-share-slug').value = generatedSlug;

        slug = generatedSlug;

    }



    // Save B/L form silently so database gets updated

    const saveSuccess = await saveBLForm(true);

    if (!saveSuccess) {

        // Reset slug on failure to avoid saving inconsistent slug state

        document.getElementById('form-share-slug').value = '';

        return;

    }



    // Construct share url

    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${slug}`;

    

    // Copy to clipboard

    try {

        await navigator.clipboard.writeText(shareUrl);

        alert(`Share link generated and copied to clipboard:\n${shareUrl}`);

    } catch (err) {

        // Fallback prompt

        prompt("Copy this share link:", shareUrl);

    }

}



function initInteractivePreview() {

    const previewDoc = document.getElementById('preview-document');

    if (!previewDoc) return;



    // Handle blur / focusout for contenteditable fields

    previewDoc.addEventListener('focusout', (e) => {

        const fieldId = e.target.getAttribute('data-field-id');

        if (!fieldId) return;



        handlePreviewFieldBlur(e.target, fieldId);

    });



    // Handle mouseover to show edit-in-form button

    previewDoc.addEventListener('mouseover', (e) => {

        const editableField = e.target.closest('.editable-preview-field');

        if (!editableField) return;



        currentHoveredElement = editableField;

        showFloatingEditBtn(editableField);

    });



    // Handle mouseout to hide edit-in-form button

    previewDoc.addEventListener('mouseout', (e) => {

        const editableField = e.target.closest('.editable-preview-field');

        if (!editableField) return;



        const relatedTarget = e.relatedTarget;

        if (relatedTarget && (relatedTarget.closest('.floating-edit-btn') || relatedTarget.closest('.editable-preview-field') === editableField)) {

            return;

        }



        hideFloatingEditBtn();

    });



    // Handle floating edit button hover and click

    const floatBtn = document.getElementById('floating-edit-btn');

    if (floatBtn) {

        floatBtn.addEventListener('mouseover', () => {

            floatBtn.style.display = 'flex';

        });



        floatBtn.addEventListener('mouseout', (e) => {

            const relatedTarget = e.relatedTarget;

            if (relatedTarget && relatedTarget.closest('.editable-preview-field') === currentHoveredElement) {

                return;

            }

            hideFloatingEditBtn();

        });



        floatBtn.addEventListener('click', () => {

            const targetField = floatBtn.getAttribute('data-target-field');

            if (targetField) {

                goToEditorField(targetField);

                hideFloatingEditBtn();

            }

        });

    }

}



function handlePreviewFieldBlur(element, fieldId) {

    const text = element.innerText.trim();

    

    // Handle split for Parties

    if (fieldId === 'shipper' || fieldId === 'consignee' || fieldId === 'notify_party') {

        const lines = text.split('\n').map(l => l.trim());

        const name = lines[0] || '';

        const address = lines.slice(1).join('\n').trim();

        

        let formFieldPrefix = fieldId;

        if (fieldId === 'notify_party') formFieldPrefix = 'notify';



        const nameInput = document.getElementById(`${formFieldPrefix}_name`);

        const addressTextarea = document.getElementById(`${formFieldPrefix}_address`);

        

        if (nameInput) {

            nameInput.value = name;

            nameInput.dispatchEvent(new Event('input'));

        }

        if (addressTextarea) {

            addressTextarea.value = address;

            addressTextarea.dispatchEvent(new Event('input'));

        }

    } else if (fieldId === 'cargo_containers') {

        // Concatenate containers across multiple pages if paginated

        const containersElements = document.querySelectorAll('#preview-document .editable-preview-field[data-field-id="cargo_containers"]');

        const allContainers = Array.from(containersElements).map(el => el.innerText.trim()).filter(Boolean).join('\n');

        const inputEl = document.getElementById('cargo_containers');

        if (inputEl) {

            inputEl.value = allContainers;

            inputEl.dispatchEvent(new Event('input'));

        }

    } else {

        const inputEl = document.getElementById(fieldId);

        if (inputEl) {

            inputEl.value = text;

            inputEl.dispatchEvent(new Event('input'));

        }

    }



    // Silently rebuild print preview to sync and paginate changes correctly

    buildPrintPreview();

}



function showFloatingEditBtn(element) {

    const btn = document.getElementById('floating-edit-btn');

    if (!btn) return;



    const fieldId = element.getAttribute('data-field-id');

    btn.setAttribute('data-target-field', fieldId);



    // Show button to measure width correctly

    btn.style.display = 'flex';

    btn.style.opacity = '1';



    const rect = element.getBoundingClientRect();

    

    // Align button to the top right inside of the hovered element

    let leftPos = rect.right + window.scrollX - btn.offsetWidth - 8;

    let topPos = rect.top + window.scrollY + 8;



    // Boundary check: ensure it doesn't overflow to the left of the element

    if (leftPos < rect.left + window.scrollX) {

        leftPos = rect.left + window.scrollX + 8;

    }



    btn.style.left = `${leftPos}px`;

    btn.style.top = `${topPos}px`;

}



function hideFloatingEditBtn() {

    const btn = document.getElementById('floating-edit-btn');

    if (btn) {

        btn.style.display = 'none';

    }

}



function goToEditorField(fieldId) {

    const mapping = {

        'shipper': { tab: 'tab-parties', inputId: 'shipper_name' },

        'consignee': { tab: 'tab-parties', inputId: 'consignee_name' },

        'notify_party': { tab: 'tab-parties', inputId: 'notify_name' },

        'delivery_agent': { tab: 'tab-parties', inputId: 'delivery_agent' },

        'pre_carriage': { tab: 'tab-routing', inputId: 'pre_carriage' },

        'ocean_vessel': { tab: 'tab-routing', inputId: 'ocean_vessel' },

        'voy_no': { tab: 'tab-routing', inputId: 'voy_no' },

        'place_of_receipt': { tab: 'tab-routing', inputId: 'place_of_receipt' },

        'port_of_loading': { tab: 'tab-routing', inputId: 'port_of_loading' },

        'port_of_discharge': { tab: 'tab-routing', inputId: 'port_of_discharge' },

        'place_of_delivery': { tab: 'tab-routing', inputId: 'place_of_delivery' },

        'cargo_containers': { tab: 'tab-cargo', inputId: 'cargo_containers' },

        'cargo_quantity': { tab: 'tab-cargo', inputId: 'cargo_quantity' },

        'cargo_description': { tab: 'tab-cargo', inputId: 'cargo_description' },

        'cargo_measurement': { tab: 'tab-cargo', inputId: 'cargo_measurement' },

        'freight_charges': { tab: 'tab-freight', inputId: 'freight_charges' },

        'revenue_tons': { tab: 'tab-freight', inputId: 'revenue_tons' },

        'rate': { tab: 'tab-freight', inputId: 'rate' },

        'per': { tab: 'tab-freight', inputId: 'per' },

        'prepaid': { tab: 'tab-freight', inputId: 'prepaid' },

        'collect': { tab: 'tab-freight', inputId: 'collect' },

        'ex_rate': { tab: 'tab-freight', inputId: 'ex_rate' },

        'prepaid_at': { tab: 'tab-freight', inputId: 'prepaid_at' },

        'payable_at': { tab: 'tab-freight', inputId: 'payable_at' },

        'place_date_issue': { tab: 'tab-freight', inputId: 'place_date_issue' },

        'movement': { tab: 'tab-freight', inputId: 'movement' },

        'no_of_original': { tab: 'tab-freight', inputId: 'no_of_original' },

        'signed_on_behalf': { tab: 'tab-freight', inputId: 'signed_on_behalf' }

    };



    const map = mapping[fieldId];

    if (map) {

        // Switch to editor view

        switchView('editor');

        

        // Click corresponding tab

        const tabBtn = document.querySelector(`.tab-btn[data-tab="${map.tab}"]`);

        if (tabBtn) tabBtn.click();

        

        // Focus and scroll to target input field

        const inputEl = document.getElementById(map.inputId);

        if (inputEl) {

            setTimeout(() => {

                inputEl.focus();

                inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

            }, 100);

        }

    }

}



async function loadHistoryLogs() {

    const itemsContainer = document.getElementById('history-log-items');

    if (!itemsContainer) return;

    

    itemsContainer.innerHTML = '<tr><td colspan="6" class="loading-logs-msg">Loading logs from server...</td></tr>';

    

    try {

        const response = await fetch('api.php?action=get_history');

        if (response.status === 401) {

            sessionStorage.removeItem('auth_user');

            sessionStorage.removeItem('auth_pass');

            document.getElementById('login-overlay').style.display = 'flex';

            return;

        }

        if (!response.ok) throw new Error("HTTP error " + response.status);

        const result = await response.json();

        

        if (result.success) {

            const logs = result.data || [];

            if (logs.length === 0) {

                itemsContainer.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">No history logs found in the database.</td></tr>';

                return;

            }

            

            itemsContainer.innerHTML = '';

            logs.forEach(log => {

                const row = document.createElement('tr');

                

                // Format timestamp

                const date = new Date(log.created_at);

                const formattedDate = date.toLocaleString('en-US', { 

                    day: '2-digit', 

                    month: 'short', 

                    year: 'numeric',

                    hour: '2-digit',

                    minute: '2-digit',

                    second: '2-digit',

                    hour12: false 

                });

                

                // Action badge class

                const actionClass = log.action.toLowerCase();

                

                // Has details?

                const hasDetails = log.changed_fields && log.changed_fields !== '[]' && log.changed_fields !== '{}';

                let detailsBtn = '';

                if (hasDetails) {

                    detailsBtn = `

                        <button class="btn-details-toggle" data-log-id="${log.id}">

                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>

                            Show Details

                        </button>

                    `;

                } else {

                    detailsBtn = '<span style="color: var(--text-muted); font-size: 0.8rem;">None</span>';

                }

                

                let deviceCell = '';

                if (!isSharedMode && log.device_id) {

                    deviceCell = `

                        <td class="device-log-cell" data-device-id="${escapeHTML(log.device_id)}" data-current-label="${escapeHTML(log.device_label || '')}" style="cursor: pointer; position: relative;" title="Click to rename this device globally">

                            <span style="border-bottom: 1px dashed var(--color-primary); font-weight: 500;">${escapeHTML(log.device_label || '-')}</span>

                            <span style="font-size: 0.7rem; opacity: 0.6; margin-left: 4px;">✏️</span>

                        </td>

                    `;

                } else {

                    deviceCell = `

                        <td style="color: var(--text-primary); font-weight: 500;">${escapeHTML(log.device_label || '-')}</td>

                    `;

                }



                row.innerHTML = `

                    <td style="font-weight: 600; color: var(--color-primary);">${escapeHTML(log.bl_no)}</td>

                    <td><span class="history-badge ${actionClass}">${escapeHTML(log.action)}</span></td>

                    ${deviceCell}

                    <td style="font-family: monospace; font-size: 0.8rem; color: var(--text-secondary);">${escapeHTML(log.ip_address)}</td>

                    <td style="color: var(--text-secondary);">${escapeHTML(formattedDate)}</td>

                    <td style="text-align: right;">${detailsBtn}</td>

                `;

                

                itemsContainer.appendChild(row);

                

                // If has details, append a hidden details row

                if (hasDetails) {

                    const detailsRow = document.createElement('tr');

                    detailsRow.className = 'details-row';

                    detailsRow.id = `details-row-${log.id}`;

                    detailsRow.style.display = 'none';

                    

                    // Compile difference details

                    let diffHtml = '<div class="history-details-content"><ul class="history-details-list">';

                    try {

                        const changes = JSON.parse(log.changed_fields);

                        for (let field in changes) {

                            const oldVal = changes[field].old || '';

                            const newVal = changes[field].new || '';

                            

                            // Format field name nicely

                            const fieldNameFormatted = field.replace(/_/g, ' ');

                            

                            diffHtml += `

                                <li>

                                    <span class="history-details-field">${escapeHTML(fieldNameFormatted)}</span>

                                    <div class="history-details-diff">

                                        <span class="old-val">${escapeHTML(oldVal || '[Empty]')}</span>

                                        <span class="arrow">➔</span>

                                        <span class="new-val">${escapeHTML(newVal || '[Empty]')}</span>

                                    </div>

                                </li>

                            `;

                        }

                    } catch (parseErr) {

                        diffHtml += `<li><span style="color: var(--color-danger);">Failed to parse details: ${escapeHTML(parseErr.message)}</span></li>`;

                    }

                    diffHtml += '</ul></div>';

                    

                    detailsRow.innerHTML = `

                        <td colspan="6">${diffHtml}</td>

                    `;

                    

                    itemsContainer.appendChild(detailsRow);

                }

            });

            

            // Attach details togglers event listeners

            itemsContainer.querySelectorAll('.btn-details-toggle').forEach(btn => {

                btn.addEventListener('click', (e) => {

                    const logId = btn.getAttribute('data-log-id');

                    const detailsRow = document.getElementById(`details-row-${logId}`);

                    if (detailsRow) {

                        if (detailsRow.style.display === 'none') {

                           detailsRow.style.display = 'table-row';

                           btn.innerHTML = `

                               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>

                               Hide Details

                           `;

                        } else {

                           detailsRow.style.display = 'none';

                           btn.innerHTML = `

                               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>

                               Show Details

                           `;

                        }

                    }

                });

            });

            

            // Attach rename device listeners

            if (!isSharedMode) {

                itemsContainer.querySelectorAll('.device-log-cell').forEach(cell => {

                    cell.addEventListener('click', async (e) => {

                        e.stopPropagation(); // Avoid triggering any row click events if added later

                        const deviceId = cell.getAttribute('data-device-id');

                        const currentLabel = cell.getAttribute('data-current-label') || 'Unknown Device';

                        

                        const newLabel = prompt(`Ubah nama untuk Perangkat (ID: ${deviceId}) di semua riwayat:`, currentLabel);

                        if (newLabel !== null && newLabel.trim() !== '') {

                            const trimmedLabel = newLabel.trim();

                            

                            try {

                                const response = await fetch('api.php?action=rename_device', {

                                    method: 'POST',

                                    headers: {

                                        'Content-Type': 'application/json'

                                    },

                                    body: JSON.stringify({ device_id: deviceId, device_label: trimmedLabel })

                                });

                                

                                const result = await response.json();

                                if (result.success) {

                                    // Refresh logs to show updated labels

                                    await loadHistoryLogs();

                                    

                                    // If the device renamed is the current device, also update local storage & header

                                    if (deviceId === localStorage.getItem('device_id')) {

                                        localStorage.setItem('device_label', trimmedLabel);

                                        const lblDeviceName = document.getElementById('lbl-device-name');

                                        if (lblDeviceName) lblDeviceName.textContent = trimmedLabel;

                                    }

                                } else {

                                    alert("Gagal mengubah nama perangkat: " + result.error);

                                }

                            } catch (err) {

                                console.error("Rename request failed:", err);

                                alert("Gagal menghubungi server untuk mengubah nama perangkat.");

                            }

                        }

                    });

                });

            }

            

        } else {

            itemsContainer.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-danger); padding: 24px;">Failed to load logs: ${escapeHTML(result.error)}</td></tr>`;

        }

    } catch (err) {

        console.error("Error loading history logs:", err);

        itemsContainer.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-danger); padding: 24px;">Failed to connect to backend server. History is only available in online mode.</td></tr>';

    }

}



// ==========================================================================

// CARGO MANIFEST FUNCTIONS

// ==========================================================================

function loadManifestVoyages() {

    const selectEl = document.getElementById('manifest-voyage-select');

    if (!selectEl) return;

    

    const currentVal = selectEl.value;

    

    selectEl.innerHTML = '<option value="">-- Choose Voyage --</option>';

    

    const voyagesMap = new Map();

    billsOfLading.forEach(bl => {

        const vessel = (bl.ocean_vessel || '').trim();

        const voyNo = (bl.voy_no || '').trim();

        

        if (vessel && voyNo) {

            const key = `${vessel} | VOY: ${voyNo}`;

            voyagesMap.set(key, { vessel, voyNo });

        }

    });

    

    const sortedKeys = Array.from(voyagesMap.keys()).sort();

    

    sortedKeys.forEach(key => {

        const option = document.createElement('option');

        option.value = key;

        option.textContent = key;

        selectEl.appendChild(option);

    });

    

    if (currentVal && voyagesMap.has(currentVal)) {

        selectEl.value = currentVal;

    } else {

        renderManifestPreview(null);

    }

}



function renderManifestPreview(voyageData) {

    const container = document.getElementById('manifest-preview-content');

    if (!container) return;

    

    if (!voyageData || voyageData.bls.length === 0) {

        container.innerHTML = `

            <div class="no-data-msg" style="background-color: white; color: var(--text-secondary); width: 297mm; height: 210mm; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md); box-shadow: var(--shadow-md);">

                <p>Please select a voyage to generate the Cargo Manifest.</p>

            </div>

        `;

        return;

    }

    

    const { vessel, voyNo, bls } = voyageData;

    const firstBL = bls[0];

    const printDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

    

    let depDate = '04-Jun-2026';

    const issueDateStr = firstBL.place_date_issue || '';

    const dateMatch = issueDateStr.match(/\d{1,2}-[A-Za-z]+-\d{4}/);

    if (dateMatch) {

        depDate = dateMatch[0];

    }

    

    const pol = currentManifestPol || firstBL.port_of_loading || 'N/A';

    const pod = currentManifestPod || firstBL.port_of_discharge || 'N/A';

    const nationality = 'INDONESIA';



    // PAGINATION LOGIC: Max 30 containers per page

    const maxContainersPerPage = 30;

    const pages = [];

    let currentPageContainers = [];

    let currentPageRows = [];



    bls.forEach(bl => {

        // Force page break between B/Ls: if current page has any rows from previous B/L, push and clear

        if (currentPageRows.length > 0) {

            pages.push(currentPageRows);

            currentPageRows = [];

            currentPageContainers = [];

        }



        const containerLines = (bl.cargo_containers || '').split('\n').map(l => l.trim()).filter(Boolean);

        

        if (containerLines.length === 0) {

            containerLines.push('');

        }

        

        let containerIndex = 0;

        let isFirstChunkForThisBL = true;

        

        while (containerIndex < containerLines.length) {

            const spaceLeft = maxContainersPerPage - currentPageContainers.length;

            

            if (spaceLeft <= 0) {

                pages.push(currentPageRows);

                currentPageRows = [];

                currentPageContainers = [];

            }

            

            const spaceLeftAfterClear = maxContainersPerPage - currentPageContainers.length;

            const chunkLength = Math.min(spaceLeftAfterClear, containerLines.length - containerIndex);

            const chunkLines = containerLines.slice(containerIndex, containerIndex + chunkLength);

            

            currentPageRows.push({

                bl: bl,

                isContinuation: !isFirstChunkForThisBL,

                containerLines: chunkLines,

                showMetadata: isFirstChunkForThisBL

            });

            

            chunkLines.forEach(line => {

                currentPageContainers.push(line);

            });

            

            containerIndex += chunkLength;

            isFirstChunkForThisBL = false;

        }

    });



    if (currentPageRows.length > 0) {

        pages.push(currentPageRows);

    }

    

    let finalHtml = '';

    const totalPages = pages.length;



    pages.forEach((pageRows, pageIndex) => {

        let rowsHtml = '';

        pageRows.forEach(row => {

            const bl = row.bl;

            

            let partyHtml = '';

            let blNoHtml = '';

            let descHtml = '';

            let measureHtml = '';

            

            if (row.showMetadata) {

                const shipperLines = (bl.shipper || '').split('\n');

                const shipperName = shipperLines[0] || '';

                const shipperAddress = shipperLines.slice(1).join('\n');

                

                const consigneeLines = (bl.consignee || '').split('\n');

                const consigneeName = consigneeLines[0] || '';

                const consigneeAddress = consigneeLines.slice(1).join('\n');

                

                const notifyLines = (bl.notify_party || '').split('\n');

                const notifyName = notifyLines[0] || '';

                const notifyAddress = notifyLines.slice(1).join('\n');

                

                partyHtml = `

                    <strong>(S) ${escapeHTML(shipperName)}</strong><br>

                    ${escapeHTML(shipperAddress).replace(/\n/g, '<br>')}<br><br>

                    <strong>(C) ${escapeHTML(consigneeName)}</strong><br>

                    ${escapeHTML(consigneeAddress).replace(/\n/g, '<br>')}<br><br>

                    <strong>(N) ${escapeHTML(notifyName)}</strong><br>

                    ${escapeHTML(notifyAddress).replace(/\n/g, '<br>')}

                `;

                

                blNoHtml = `text-bold">${escapeHTML(bl.bl_no)}`;

                

                const descParts = [];

                if (bl.cargo_quantity) descParts.push(bl.cargo_quantity.trim());

                if (bl.movement) descParts.push(bl.movement.trim());

                if (bl.cargo_description) descParts.push(bl.cargo_description.trim());

                if (bl.freight_charges) descParts.push(bl.freight_charges.trim());

                descHtml = descParts.filter(p => p !== '').map(p => escapeHTML(p).replace(/\n/g, '<br>')).join('<br><br>');

                

                measureHtml = escapeHTML(bl.cargo_measurement || '').replace(/\n/g, '<br>');

            } else {

                partyHtml = ``;

                blNoHtml = `text-bold">${escapeHTML(bl.bl_no)}`;

                descHtml = ``;

                measureHtml = ``;

            }

            

            const containersHtml = row.containerLines.map(line => escapeHTML(line)).join('<br>');

            

            rowsHtml += `

                <tr>

                    <td class="col-m-parties">${partyHtml}</td>

                    <td class="col-m-blno ${blNoHtml}</td>

                    <td class="col-m-marks">${containersHtml}</td>

                    <td class="col-m-desc">${descHtml}</td>

                    <td class="col-m-weight text-right">${measureHtml}</td>

                </tr>

            `;

        });

        

        let companyToDisplay = firstBL.company_version || 'PT Putera Utama Lautan';

        if (companyToDisplay === 'PT. Putera Utama Lautan') {

            companyToDisplay = 'PT Putera Utama Lautan';

        }

        

        finalHtml += `

            <div class="manifest-page">

                <div class="manifest-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">

                    <div class="manifest-company-info" style="font-weight: bold; font-size: 11pt; text-transform: uppercase;">

                        ${escapeHTML(companyToDisplay)}

                    </div>

                    <div class="manifest-title-container" style="text-align: center; flex-grow: 1;">

                        <h2 style="font-size: 18pt; font-weight: 900; margin: 0; letter-spacing: 1px;">CARGO MANIFEST</h2>

                    </div>

                    <div class="manifest-meta-info" style="font-size: 7.5pt; text-align: right; font-weight: bold;">

                        PRINT DATE : <span class="m-print-date-sync" contenteditable="true">${escapeHTML(printDate)}</span> &nbsp; PAGE : Page ${pageIndex + 1} of ${totalPages}

                    </div>

                </div>

                

                <table class="manifest-details-table" style="width: 100%; border-top: 1.5px solid black; border-bottom: 1.5px solid black; padding: 6px 0; margin-bottom: 15px; font-size: 7.5pt; font-family: monospace;">

                    <tr>

                        <td style="width: 33%; padding: 3px 0;">

                            <strong>VESSEL</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span class="m-vessel-sync" contenteditable="true">${escapeHTML(vessel)}</span>

                        </td>

                        <td style="width: 33%; padding: 3px 0;">

                            <strong>DEPARTURE DATE</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span class="m-departure-date-sync" contenteditable="true">${escapeHTML(depDate)}</span>

                        </td>

                        <td style="width: 33%; padding: 3px 0;">

                            <strong>PORT OF LOADING</strong> &nbsp;&nbsp;&nbsp;: <span class="m-pol-sync" contenteditable="true">${escapeHTML(pol)}</span>

                        </td>

                    </tr>

                    <tr>

                        <td style="padding: 3px 0;">

                            <strong>VOY NO</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span class="m-voy-no-sync" contenteditable="true">${escapeHTML(voyNo)}</span>

                        </td>

                        <td style="padding: 3px 0;">

                            <strong>NATIONALITY OF VESSEL</strong> : <span class="m-nationality-sync" contenteditable="true">${escapeHTML(nationality)}</span>

                        </td>

                        <td style="padding: 3px 0;">

                            <strong>PORT OF DISCHARGE</strong> : <span class="m-pod-sync" contenteditable="true">${escapeHTML(pod)}</span>

                        </td>

                    </tr>

                </table>

                

                <table class="manifest-table">

                    <thead>

                        <tr>

                            <th class="col-m-parties">(S) SHIPPER / (C) CONSIGNEE<br>(N) NOTIFY PARTY</th>

                            <th class="col-m-blno">BL NO.</th>

                            <th class="col-m-marks">MARKS & NUMBERS</th>

                            <th class="col-m-desc">NO. OF PACKAGES / DESCRIPTION OF GOODS</th>

                            <th class="col-m-weight text-right">GROSS WEIGHT<br>/ MEASUREMENT</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${rowsHtml}

                    </tbody>

                </table>

            </div>

        `;

    });

    

    container.innerHTML = finalHtml;



    // Setup real-time sync for contenteditable fields across pages

    const syncFields = [

        { selector: '.m-print-date-sync', event: 'input' },

        { selector: '.m-vessel-sync', event: 'input' },

        { selector: '.m-departure-date-sync', event: 'input' },

        { selector: '.m-pol-sync', event: 'input' },

        { selector: '.m-voy-no-sync', event: 'input' },

        { selector: '.m-nationality-sync', event: 'input' },

        { selector: '.m-pod-sync', event: 'input' }

    ];

    

    syncFields.forEach(field => {

        container.querySelectorAll(field.selector).forEach(el => {

            el.addEventListener(field.event, (e) => {

                const newValue = e.target.textContent;

                container.querySelectorAll(field.selector).forEach(otherEl => {

                    if (otherEl !== e.target) {

                        otherEl.textContent = newValue;

                    }

                });

                

                // Keep the dropdown and global state in sync if they edit it inline

                if (field.selector === '.m-pol-sync') {

                    currentManifestPol = newValue;

                    const polSelect = document.getElementById('manifest-pol-select');

                    if (polSelect) {

                        if ([...polSelect.options].some(opt => opt.value === newValue)) {

                            polSelect.value = newValue;

                        } else {

                            const opt = new Option(newValue, newValue);

                            polSelect.add(opt);

                            polSelect.value = newValue;

                        }

                    }

                } else if (field.selector === '.m-pod-sync') {

                    currentManifestPod = newValue;

                    const podSelect = document.getElementById('manifest-pod-select');

                    if (podSelect) {

                        if ([...podSelect.options].some(opt => opt.value === newValue)) {

                            podSelect.value = newValue;

                        } else {

                            const opt = new Option(newValue, newValue);

                            podSelect.add(opt);

                            podSelect.value = newValue;

                        }

                    }

                }

            });

        });

    });

}



function printManifest() {

    document.body.classList.add('manifest-print-active');

    const originalTitle = document.title;

    

    const vessel = (document.querySelector('.m-vessel-sync')?.textContent || '').trim();

    const voy = (document.querySelector('.m-voy-no-sync')?.textContent || '').trim();

    if (vessel && voy) {

        document.title = `Manifest - ${vessel} - VOY ${voy}`.replace(/[\\/:*?"<>|]/g, '');

    }

    

    window.print();

    

    setTimeout(() => {

        document.body.classList.remove('manifest-print-active');

        document.title = originalTitle;

    }, 500);

}



// ==========================================================================

// KAS OPERASIONAL MODULE IMPLEMENTATION

// ==========================================================================

let kasDataList = [];

let kasCurrentPage = 1;

let kasPageSize = 10;

let kasSearchQuery = '';



// Load list of kas operasional records from the backend

function loadKasList() {

    const tableBody = document.getElementById('kas-table-body');

    if (!tableBody) return;

    

    tableBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">Memuat data kas operasional...</td></tr>';

    

    fetch('api_kas.php', {

        headers: {

            'Authorization': 'Basic ' + btoa('Nahel:Nahel@26')

        }

    })

    .then(res => {

        if (!res.ok) throw new Error('Unauthorized or Server Error');

        return res.json();

    })

    .then(response => {

        if (response.success) {

            kasDataList = response.data || [];

            renderKasTable();

            updateKasStats();

        } else {

            tableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">Gagal memuat data: ${response.error}</td></tr>`;

        }

    })

    .catch(err => {

        console.error('Error fetching kas data:', err);

        tableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">Gagal memuat data: ${err.message}</td></tr>`;

    });

}



// Calculate and render stats in view-kas cards

function updateKasStats() {

    const totalAmountEl = document.getElementById('stat-kas-total-amount');

    const totalCountEl = document.getElementById('stat-kas-total-count');

    const totalContainersEl = document.getElementById('stat-kas-total-containers');



    if (!totalAmountEl || !totalCountEl || !totalContainersEl) return;



    let totalAmount = 0;

    let totalCount = kasDataList.length;

    let totalContainers = 0;



    kasDataList.forEach(row => {

        totalAmount += parseFloat(row.grand_total) || 0;

        totalContainers += parseInt(row.total_petikemas) || 0;

    });



    totalAmountEl.textContent = 'Rp ' + totalAmount.toLocaleString('id-ID');

    totalCountEl.textContent = totalCount;

    totalContainersEl.textContent = totalContainers + ' Box';

}



// Render dynamic paginated table rows

function renderKasTable() {

    const tableBody = document.getElementById('kas-table-body');

    if (!tableBody) return;



    // 1. Sort chronologically ascending for correct ledger calculations

    kasDataList.sort((a, b) => {

        const dateA = a.tgl_cetak ? new Date(a.tgl_cetak) : new Date(0);

        const dateB = b.tgl_cetak ? new Date(b.tgl_cetak) : new Date(0);

        return dateA - dateB;

    });



    // 2. Compute dynamic cumulative balances

    let cumulativeSaldo = 0;

    kasDataList.forEach(row => {

        const debit = parseFloat(row.debit) || 0;

        const kredit = parseFloat(row.kredit) || 0;

        const isHO = parseInt(row.is_ho) === 1;



        if (isHO) {

            row.calculated_saldo = null;

        } else {

            cumulativeSaldo = cumulativeSaldo + debit - kredit;

            row.calculated_saldo = cumulativeSaldo;

        }

    });



    // 3. Filter data

    let filteredData = kasDataList.filter(row => {

        const query = kasSearchQuery.toLowerCase();

        return (row.no_proforma || '').toLowerCase().includes(query) ||

               (row.kapal || '').toLowerCase().includes(query) ||

               (row.nama_tertagih || '').toLowerCase().includes(query) ||

               (row.keterangan || '').toLowerCase().includes(query) ||

               (row.no_count || '').toLowerCase().includes(query) ||

               (row.keterangan_tambahan || '').toLowerCase().includes(query);

    });



    const totalRecords = filteredData.length;

    

    // Pagination slicing

    const totalPages = Math.ceil(totalRecords / kasPageSize) || 1;

    if (kasCurrentPage > totalPages) kasCurrentPage = totalPages;

    

    const startIndex = (kasCurrentPage - 1) * kasPageSize;

    const endIndex = Math.min(startIndex + kasPageSize, totalRecords);

    

    const paginatedData = filteredData.slice(startIndex, endIndex);



    if (paginatedData.length === 0) {

        tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Tidak ada data kas operasional ditemukan.</td></tr>';

        document.getElementById('kas-pagination-info').textContent = 'Menampilkan 0 - 0 dari 0 data';

        document.getElementById('kas-pagination-buttons').innerHTML = '';

        return;

    }



    let html = '';

    paginatedData.forEach((row) => {

        const fileIcon = row.file_path 

            ? `<a href="${row.file_path}" target="_blank" title="Lihat Lampiran" style="color: var(--text-link); margin-left: 6px; display: inline-flex; align-items: center; vertical-align: middle;">

                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>

               </a>` 

            : '';



        const formattedDate = row.tgl_cetak 

            ? new Date(row.tgl_cetak).toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric'})

            : '-';



        const debitFormatted = parseFloat(row.debit) > 0

            ? parseFloat(row.debit).toLocaleString('id-ID', {minimumFractionDigits: 0, maximumFractionDigits: 0})

            : '';

            

        const kreditFormatted = parseFloat(row.kredit) > 0

            ? parseFloat(row.kredit).toLocaleString('id-ID', {minimumFractionDigits: 0, maximumFractionDigits: 0})

            : '';



        const saldoFormatted = row.calculated_saldo !== null

            ? parseFloat(row.calculated_saldo).toLocaleString('id-ID', {minimumFractionDigits: 0, maximumFractionDigits: 0})

            : '-';



        const invoiceDisplay = (row.no_proforma ? `<strong>${escapeHTML(row.no_proforma)}</strong>` : '-') + fileIcon;



        // Determine what to display in Grand Total column: Credit (payment) or Green Debit (deposit/top-up)

        let totalDisplay = '-';

        if (parseFloat(row.kredit) > 0) {

            totalDisplay = 'Rp ' + kreditFormatted;

        } else if (parseFloat(row.debit) > 0) {

            totalDisplay = `<span style="color: var(--color-success); font-weight: 600;">+Rp ${debitFormatted}</span>`;

        }



        html += `

            <tr>

                <td>${formattedDate}</td>

                <td>${invoiceDisplay}</td>

                <td>${escapeHTML(row.keterangan || '-')}</td>

                <td><span style="font-size:0.85rem; color:var(--text-secondary); font-family:monospace;">${escapeHTML(row.no_count || '-')}</span></td>

                <td class="text-right" style="font-weight: 500;">${totalDisplay}</td>

                <td class="text-right" style="font-weight: 700; color: var(--text-link);">${saldoFormatted !== '-' ? 'Rp ' + saldoFormatted : '-'}</td>

                <td class="text-center no-print">

                    <div style="display: flex; gap: 6px; justify-content: center;">

                        <button class="btn btn-secondary btn-sm" onclick="editKas(${row.id})" style="padding: 2px 6px; font-size: 0.75rem;">Edit</button>

                        <button class="btn btn-danger btn-sm" onclick="deleteKas(${row.id})" style="padding: 2px 6px; font-size: 0.75rem;">Hapus</button>

                    </div>

                </td>

            </tr>

        `;

    });



    tableBody.innerHTML = html;

    

    // Update pagination footer info

    document.getElementById('kas-pagination-info').textContent = `Menampilkan ${startIndex + 1} - ${endIndex} dari ${totalRecords} data`;



    // Render pagination buttons

    let pageHtml = '';

    // Back button

    pageHtml += `<button class="pagination-btn" ${kasCurrentPage === 1 ? 'disabled' : ''} onclick="changeKasPage(${kasCurrentPage - 1})">Sebelumnya</button>`;

    

    // Page indexes

    for (let i = 1; i <= totalPages; i++) {

        if (i === 1 || i === totalPages || (i >= kasCurrentPage - 1 && i <= kasCurrentPage + 1)) {

            pageHtml += `<button class="pagination-btn ${i === kasCurrentPage ? 'active' : ''}" onclick="changeKasPage(${i})" style="${i === kasCurrentPage ? 'background-color: var(--color-primary); color: white;' : ''}">${i}</button>`;

        } else if (i === kasCurrentPage - 2 || i === kasCurrentPage + 2) {

            pageHtml += '<span class="text-muted" style="padding: 0 4px;">...</span>';

        }

    }

    

    // Next button

    pageHtml += `<button class="pagination-btn" ${kasCurrentPage === totalPages ? 'disabled' : ''} onclick="changeKasPage(${kasCurrentPage + 1})">Berikutnya</button>`;

    

    document.getElementById('kas-pagination-buttons').innerHTML = pageHtml;

}



function changeKasPage(page) {

    kasCurrentPage = page;

    renderKasTable();

}



// Open / Close Modals

function openKasUploadModal() {

    document.getElementById('kas-upload-modal').style.display = 'flex';

    document.getElementById('kas-upload-progress').style.display = 'none';

    document.getElementById('kas-dropzone').style.display = 'block';

    document.getElementById('kas-file-input').value = '';

}



function closeKasUploadModal() {

    document.getElementById('kas-upload-modal').style.display = 'none';

}



function openKasEditorModal(title = 'Input Data Kas Operasional') {

    document.getElementById('kas-modal-title').textContent = title;

    document.getElementById('kas-editor-modal').style.display = 'flex';

}



function closeKasEditorModal() {

    document.getElementById('kas-editor-modal').style.display = 'none';

}



// Reset form values and rows

function resetKasEditorForm() {

    document.getElementById('kas-id').value = '0';

    document.getElementById('kas-file-path').value = '';

    document.getElementById('kas-no-proforma').value = '';

    document.getElementById('kas-tgl-cetak').value = '';

    document.getElementById('kas-kode-bayar').value = '';

    document.getElementById('kas-kapal').value = '';

    document.getElementById('kas-nama-tertagih').value = '';

    document.getElementById('kas-keterangan').value = '';

    document.getElementById('kas-no-count').value = '';

    document.getElementById('kas-debit').value = 0;

    document.getElementById('kas-kredit').value = 0;

    document.getElementById('kas-keterangan-tambahan').value = '';

    document.getElementById('kas-is-ho').checked = false;

    

    document.getElementById('kas-editor-items-body').innerHTML = '';

    document.getElementById('kas-editor-containers-body').innerHTML = '';

    

    document.getElementById('kas-total-petikemas').value = 0;

    document.getElementById('kas-sub-total').value = 0;

    document.getElementById('kas-ppn').value = 0;

    document.getElementById('kas-ppn').dataset.manuallyEdited = 'false';

    document.getElementById('kas-materai').value = 0;

    document.getElementById('kas-grand-total').value = 0;

    

    document.getElementById('ocr-alert-info').style.display = 'none';

}



// Add dynamic rows in form editor

function addKasItemRow(item = null) {

    const tbody = document.getElementById('kas-editor-items-body');

    const row = document.createElement('tr');

    

    const activity = item ? item.aktifitas : '';

    const sts = item ? item.sts : '20/DRY/E';

    const box = item ? item.box : 1;

    const itm = item ? item.itm : 1;

    const tarif = item ? item.tarif : 0;

    const total = item ? item.total : 0;



    row.innerHTML = `

        <td><input type="text" class="item-aktifitas" value="${escapeHTML(activity)}" placeholder="Contoh: LIFT OFF" required></td>

        <td><input type="text" class="item-sts" value="${escapeHTML(sts)}" placeholder="Contoh: 20/DRY/E"></td>

        <td><input type="number" class="item-box" value="${box}" min="0" style="text-align: center;"></td>

        <td><input type="number" class="item-itm" value="${itm}" min="0" style="text-align: center;"></td>

        <td><input type="number" class="item-tarif" value="${tarif}" min="0" style="text-align: right;"></td>

        <td><input type="number" class="item-total" value="${total}" min="0" style="text-align: right;"></td>

        <td class="text-center"><button type="button" class="btn-close-modal" style="color:var(--color-danger); font-size:1.2rem; padding:0 6px;" onclick="this.closest('tr').remove(); calculateKasTotals();">×</button></td>

    `;

    tbody.appendChild(row);

    

    // Register recalculation events on inputs

    row.querySelectorAll('input').forEach(input => {

        input.addEventListener('input', () => {

            if (input.classList.contains('item-box') || input.classList.contains('item-tarif') || input.classList.contains('item-itm')) {

                const boxVal = parseInt(row.querySelector('.item-box').value) || 0;

                const tarifVal = parseFloat(row.querySelector('.item-tarif').value) || 0;

                const itmVal = parseInt(row.querySelector('.item-itm').value) || 0;

                // Total = box * tarif (or item * tarif if box is 0)

                const multiplier = boxVal > 0 ? boxVal : itmVal;

                row.querySelector('.item-total').value = multiplier * tarifVal;

            }

            calculateKasTotals();

        });

    });

    

    calculateKasTotals();

}



function addKasContainerRow(container = null) {

    const tbody = document.getElementById('kas-editor-containers-body');

    const row = document.createElement('tr');

    

    const containerNo = container ? container.no_petikemas : '';

    const sts = container ? container.sts : '20/DRY/E';

    const estimasi = container ? container.estimasi : '';

    const total = container ? container.total : 0;



    row.innerHTML = `

        <td><input type="text" class="container-no" value="${escapeHTML(containerNo)}" placeholder="Contoh: JTEU1132322" required></td>

        <td><input type="text" class="container-sts" value="${escapeHTML(sts)}" placeholder="Contoh: 20/DRY/E"></td>

        <td><input type="date" class="container-estimasi" value="${estimasi}"></td>

        <td><input type="number" class="container-total" value="${total}" min="0" style="text-align: right;"></td>

        <td class="text-center"><button type="button" class="btn-close-modal" style="color:var(--color-danger); font-size:1.2rem; padding:0 6px;" onclick="this.closest('tr').remove(); calculateKasTotals();">×</button></td>

    `;

    tbody.appendChild(row);



    row.querySelectorAll('input').forEach(input => {

        input.addEventListener('input', calculateKasTotals);

    });



    calculateKasTotals();

}



// Totals calculation logic

function calculateKasTotals() {

    // 1. Calculate items sum for Sub-total

    const itemRows = document.querySelectorAll('#kas-editor-items-body tr');

    let subTotal = 0;

    itemRows.forEach(row => {

        subTotal += parseFloat(row.querySelector('.item-total').value) || 0;

    });



    // 2. Count containers

    const containerRows = document.querySelectorAll('#kas-editor-containers-body tr');

    const totalBox = containerRows.length;

    document.getElementById('kas-total-petikemas').value = totalBox;



    document.getElementById('kas-sub-total').value = subTotal;

    

    // Automatically estimate PPN (11% of sub-total)

    const ppnInput = document.getElementById('kas-ppn');

    const materaiVal = parseFloat(document.getElementById('kas-materai').value) || 0;

    

    // If PPN was not edited manually yet, auto-calc

    if (ppnInput.dataset.manuallyEdited !== 'true') {

        const calculatedPpn = Math.round(subTotal * 0.11);

        ppnInput.value = calculatedPpn;

    }

    

    const ppnVal = parseFloat(ppnInput.value) || 0;

    const grandTotalVal = subTotal + ppnVal + materaiVal;

    document.getElementById('kas-grand-total').value = grandTotalVal;



    // Automatically set Kredit to match Grand Total if it is an invoice payment (grandTotalVal > 0)

    if (grandTotalVal > 0) {

        document.getElementById('kas-kredit').value = grandTotalVal;

        document.getElementById('kas-debit').value = 0;

    }



    // Auto update container list text input in form if list changed

    const validContainers = [];

    containerRows.forEach(row => {

        const no = row.querySelector('.container-no').value.trim();

        if (no && no !== 'ADMIN_NOTA') {

            validContainers.push(no);

        }

    });

    if (validContainers.length > 0) {

        document.getElementById('kas-no-count').value = validContainers.join(', ');

    }

}



// Edit handler

function editKas(id) {

    resetKasEditorForm();

    

    fetch(`api_kas.php?action=get&id=${id}`, {

        headers: {

            'Authorization': 'Basic ' + btoa('Nahel:Nahel@26')

        }

    })

    .then(res => res.json())

    .then(response => {

        if (response.success) {

            const data = response.data;

            document.getElementById('kas-id').value = data.id;

            document.getElementById('kas-file-path').value = data.file_path || '';

            document.getElementById('kas-no-proforma').value = data.no_proforma || '';

            

            if (data.tgl_cetak) {

                const dt = new Date(data.tgl_cetak);

                const localStr = dt.getFullYear() + '-' + 

                    String(dt.getMonth() + 1).padStart(2, '0') + '-' + 

                    String(dt.getDate()).padStart(2, '0') + 'T' + 

                    String(dt.getHours()).padStart(2, '0') + ':' + 

                    String(dt.getMinutes()).padStart(2, '0');

                document.getElementById('kas-tgl-cetak').value = localStr;

            }

            

            document.getElementById('kas-kode-bayar').value = data.kode_bayar || '';

            document.getElementById('kas-kapal').value = data.kapal || '';

            document.getElementById('kas-nama-tertagih').value = data.nama_tertagih || '';

            document.getElementById('kas-keterangan').value = data.keterangan || '';

            document.getElementById('kas-no-count').value = data.no_count || '';

            document.getElementById('kas-debit').value = data.debit || 0;

            document.getElementById('kas-kredit').value = data.kredit || 0;

            document.getElementById('kas-keterangan-tambahan').value = data.keterangan_tambahan || '';

            document.getElementById('kas-is-ho').checked = parseInt(data.is_ho) === 1;

            

            // Populate items table

            if (data.items && data.items.length > 0) {

                data.items.forEach(item => addKasItemRow(item));

            }

            

            // Populate containers table

            if (data.containers && data.containers.length > 0) {

                data.containers.forEach(c => addKasContainerRow(c));

            }

            

            document.getElementById('kas-sub-total').value = data.sub_total;

            document.getElementById('kas-ppn').value = data.ppn;

            document.getElementById('kas-ppn').dataset.manuallyEdited = 'true';

            document.getElementById('kas-materai').value = data.materai;

            document.getElementById('kas-grand-total').value = data.grand_total;

            document.getElementById('kas-total-petikemas').value = data.total_petikemas;



            openKasEditorModal('Edit Data Kas Operasional');

        } else {

            Swal.fire('Gagal', response.error, 'error');

        }

    })

    .catch(err => {

        Swal.fire('Error', err.message, 'error');

    });

}



// Delete handler

function deleteKas(id) {

    Swal.fire({

        title: 'Apakah Anda yakin?',

        text: 'Data kas operasional dan berkas lampirannya akan dihapus permanen!',

        icon: 'warning',

        showCancelButton: true,

        confirmButtonColor: 'var(--color-danger)',

        cancelButtonColor: 'var(--border-color)',

        confirmButtonText: 'Ya, Hapus!',

        cancelButtonText: 'Batal'

    }).then(result => {

        if (result.isConfirmed) {

            fetch(`api_kas.php?id=${id}`, {

                method: 'DELETE',

                headers: {

                    'Authorization': 'Basic ' + btoa('Nahel:Nahel@26')

                }

            })

            .then(res => res.json())

            .then(response => {

                if (response.success) {

                    Swal.fire('Terhapus!', 'Data kas operasional berhasil dihapus.', 'success');

                    loadKasList();

                } else {

                    Swal.fire('Gagal', response.error, 'error');

                }

            })

            .catch(err => {

                Swal.fire('Error', err.message, 'error');

            });

        }

    });

}



// Upload & OCR Dropzone handlers

function handleKasUpload(file) {

    const progressEl = document.getElementById('kas-upload-progress');

    const dropzoneEl = document.getElementById('kas-dropzone');

    const progressBar = document.getElementById('kas-progress-bar');

    const statusText = document.getElementById('kas-progress-status');



    dropzoneEl.style.display = 'none';

    progressEl.style.display = 'block';

    progressBar.style.width = '10%';

    statusText.textContent = 'Mengunggah berkas ke server...';



    const formData = new FormData();

    formData.append('file', file);



    const xhr = new XMLHttpRequest();

    xhr.open('POST', 'api_kas.php?action=upload', true);

    xhr.setRequestHeader('Authorization', 'Basic ' + btoa('Nahel:Nahel@26'));



    // Progress updates

    xhr.upload.onprogress = (e) => {

        if (e.lengthComputable) {

            const pct = Math.round((e.loaded / e.total) * 40); // 0% - 40% upload

            progressBar.style.width = pct + '%';

        }

    };



    xhr.onload = () => {

        progressBar.style.width = '70%';

        statusText.textContent = 'Membaca tulisan gambar (Proses OCR.space)...';



        if (xhr.status === 200) {

            progressBar.style.width = '100%';

            statusText.textContent = 'Selesai membaca berkas!';



            setTimeout(() => {

                try {

                    const response = JSON.parse(xhr.responseText);

                    if (response.success) {

                        closeKasUploadModal();

                        

                        // Prefill data editor form

                        resetKasEditorForm();

                        

                        const data = response.data;

                        document.getElementById('kas-file-path').value = data.file_path || '';

                        document.getElementById('kas-no-proforma').value = data.no_proforma || '';

                        

                        if (data.tgl_cetak) {

                            const dt = new Date(data.tgl_cetak);

                            const localStr = dt.getFullYear() + '-' + 

                                String(dt.getMonth() + 1).padStart(2, '0') + '-' + 

                                String(dt.getDate()).padStart(2, '0') + 'T' + 

                                String(dt.getHours()).padStart(2, '0') + ':' + 

                                String(dt.getMinutes()).padStart(2, '0');

                            document.getElementById('kas-tgl-cetak').value = localStr;

                        }

                        

                        document.getElementById('kas-kode-bayar').value = data.kode_bayar || '';

                        document.getElementById('kas-kapal').value = data.kapal || '';

                        document.getElementById('kas-nama-tertagih').value = data.nama_tertagih || '';

                        document.getElementById('kas-keterangan').value = data.keterangan || '';

                        document.getElementById('kas-no-count').value = data.no_count || '';

                        document.getElementById('kas-debit').value = data.debit || 0;

                        document.getElementById('kas-kredit').value = data.kredit || 0;

                        document.getElementById('kas-keterangan-tambahan').value = data.keterangan_tambahan || '';

                        document.getElementById('kas-is-ho').checked = parseInt(data.is_ho) === 1;

                        

                        // Populate tables

                        if (data.items && data.items.length > 0) {

                            data.items.forEach(item => addKasItemRow(item));

                        } else {

                            addKasItemRow();

                        }

                        

                        if (data.containers && data.containers.length > 0) {

                            data.containers.forEach(c => addKasContainerRow(c));

                        } else {

                            addKasContainerRow();

                        }

                        

                        document.getElementById('kas-sub-total').value = data.sub_total || 0;

                        document.getElementById('kas-ppn').value = data.ppn || 0;

                        document.getElementById('kas-materai').value = data.materai || 0;

                        document.getElementById('kas-grand-total').value = data.grand_total || 0;

                        document.getElementById('kas-total-petikemas').value = data.total_petikemas || 0;



                        // Show OCR alert

                        document.getElementById('ocr-alert-info').style.display = 'block';



                        openKasEditorModal('Verifikasi Data Ekstraksi Proforma');

                    } else {

                        closeKasUploadModal();

                        Swal.fire({

                            title: 'Peringatan OCR',

                            text: 'Berkas berhasil diunggah namun OCR gagal membaca teks: ' + response.error + '. Buka formulir input manual saja?',

                            icon: 'warning',

                            showCancelButton: true,

                            confirmButtonText: 'Ya, Input Manual',

                            cancelButtonText: 'Batal'

                        }).then(res => {

                            if (res.isConfirmed) {

                                resetKasEditorForm();

                                document.getElementById('kas-file-path').value = response.file_path || '';

                                addKasItemRow();

                                addKasContainerRow();

                                openKasEditorModal();

                            }

                        });

                    }

                } catch (ex) {

                    closeKasUploadModal();

                    Swal.fire('Error Parsing JSON', ex.message, 'error');

                }

            }, 300);

        } else {

            closeKasUploadModal();

            Swal.fire('Gagal Mengunggah', 'Gagal memproses berkas di server. Status code: ' + xhr.status, 'error');

        }

    };



    xhr.onerror = () => {

        closeKasUploadModal();

        Swal.fire('Error Jaringan', 'Terjadi kesalahan koneksi saat mengunggah berkas.', 'error');

    };



    xhr.send(formData);

}



// Client-side Excel Exporter matching the exact layout requested by the user

function exportKasToExcel() {

    if (kasDataList.length === 0) {

        Swal.fire('Info', 'Tidak ada data kas operasional yang tersedia untuk diekspor.', 'info');

        return;

    }



    // Sort chronologically ascending for correct ledger calculations in Excel

    kasDataList.sort((a, b) => {

        const dateA = a.tgl_cetak ? new Date(a.tgl_cetak) : new Date(0);

        const dateB = b.tgl_cetak ? new Date(b.tgl_cetak) : new Date(0);

        return dateA - dateB;

    });



    const workbookData = [];

    

    // Row 1: Empty

    workbookData.push([null, null, null, null, null, null]);

    

    // Row 2: UPDATE : [Current Date]

    const currentDateStr = new Date().toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric'});

    workbookData.push(["UPDATE :", null, currentDateStr, null, null, null]);

    

    // Row 3: TAHUN [Year]

    const currentYear = new Date().getFullYear();

    workbookData.push(["TAHUN " + currentYear, null, null, null, null, null]);

    

    // Row 4: Table Headers

    workbookData.push([

        "TANGGAL", 

        "NO PROFORMA", 

        "KETERANGAN PEMBAYARAN UNTUK APA", 

        "NOMOR KONTAINER", 

        "GRAND TOTAL", 

        "SALDO"

    ]);



    // Row 5: Empty separator

    workbookData.push([null, null, null, null, null, null]);



    // Row 6 is index 5 in workbookData. So first data row starts at excel row 6.

    let lastNonHoRowExcelIndex = null;

    

    kasDataList.forEach((row, index) => {

        const excelRowIndex = 6 + index;

        

        const dateStr = row.tgl_cetak 

            ? new Date(row.tgl_cetak).toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric'})

            : '';

            

        const isHO = parseInt(row.is_ho) === 1;

        const debit = parseFloat(row.debit) || 0;

        const kredit = parseFloat(row.kredit) || 0;

        

        // Net transaction amount: cash outflow is positive (kredit), cash inflow is negative (-debit)

        let amount = null;

        if (kredit > 0) {

            amount = kredit;

        } else if (debit > 0) {

            amount = -debit;

        }



        let saldoFormula = null;

        if (isHO) {

            saldoFormula = null;

            // For HO payments, show kredit amount but keep it positive

            amount = kredit > 0 ? kredit : null;

        } else {

            if (lastNonHoRowExcelIndex === null) {

                // First non-HO row: = -E[current] (converts negative debit to positive starting balance)

                saldoFormula = { f: `-E${excelRowIndex}` };

            } else {

                // Subsequent non-HO rows: =F[lastNonHo]-E[current] (subtracts kredit, adds debit)

                saldoFormula = { f: `F${lastNonHoRowExcelIndex}-E${excelRowIndex}` };

            }

            lastNonHoRowExcelIndex = excelRowIndex;

        }



        workbookData.push([

            dateStr,

            row.no_proforma || null,

            row.keterangan || null,

            row.no_count || null,

            amount,

            saldoFormula

        ]);

    });



    const worksheet = XLSX.utils.aoa_to_sheet(workbookData);

    

    // Style column widths

    worksheet['!cols'] = [

        { wch: 14 }, // TANGGAL

        { wch: 18 }, // NO PROFORMA

        { wch: 50 }, // KETERANGAN PEMBAYARAN UNTUK APA

        { wch: 30 }, // NOMOR KONTAINER

        { wch: 16 }, // GRAND TOTAL

        { wch: 16 }  // SALDO

    ];



    // Apply number formats

    const range = XLSX.utils.decode_range(worksheet['!ref']);

    for (let R = 5; R <= range.e.r; ++R) {

        // GRAND TOTAL (Col index 4, which is E)

        const cell_gt = worksheet[XLSX.utils.encode_cell({r: R, c: 4})];

        if (cell_gt && cell_gt.v !== null) cell_gt.z = '#,##0';

        

        // SALDO (Col index 5, which is F)

        const cell_saldo = worksheet[XLSX.utils.encode_cell({r: R, c: 5})];

        if (cell_saldo) {

            cell_saldo.z = '#,##0';

        }

    }



    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Kas Operasional");



    const dateStr = new Date().toISOString().slice(0, 10);

    XLSX.writeFile(workbook, `Kas_Operasional_Receiving_Delivery_${dateStr}.xlsx`);

    Swal.fire('Berhasil', 'Berkas Excel berhasil diunduh.', 'success');

}



// Set up all events related to Kas Operasional

function setupKasEventListeners() {

    const btnUpload = document.getElementById('btn-upload-proforma');

    if (btnUpload) {

        btnUpload.addEventListener('click', openKasUploadModal);

    }



    const btnCreateManual = document.getElementById('btn-create-manual-kas');

    if (btnCreateManual) {

        btnCreateManual.addEventListener('click', () => {

            resetKasEditorForm();

            addKasItemRow();

            addKasContainerRow();

            openKasEditorModal('Input Data Kas Operasional');

        });

    }



    const btnExportExcel = document.getElementById('btn-export-excel-kas');

    if (btnExportExcel) {

        btnExportExcel.addEventListener('click', exportKasToExcel);

    }



    const searchInput = document.getElementById('kas-search-input');

    if (searchInput) {

        searchInput.addEventListener('input', (e) => {

            kasSearchQuery = e.target.value;

            kasCurrentPage = 1;

            renderKasTable();

        });

    }



    const pageSizeSelect = document.getElementById('kas-page-size-select');

    if (pageSizeSelect) {

        pageSizeSelect.addEventListener('change', (e) => {

            kasPageSize = parseInt(e.target.value) || 10;

            kasCurrentPage = 1;

            renderKasTable();

        });

    }



    const btnAddItem = document.getElementById('btn-add-kas-item');

    if (btnAddItem) {

        btnAddItem.addEventListener('click', () => addKasItemRow());

    }



    const btnAddContainer = document.getElementById('btn-add-kas-container');

    if (btnAddContainer) {

        btnAddContainer.addEventListener('click', () => addKasContainerRow());

    }



    const ppnInput = document.getElementById('kas-ppn');

    if (ppnInput) {

        ppnInput.addEventListener('input', () => {

            ppnInput.dataset.manuallyEdited = 'true';

            calculateKasTotals();

        });

    }



    const materaiInput = document.getElementById('kas-materai');

    if (materaiInput) {

        materaiInput.addEventListener('input', calculateKasTotals);

    }



    const dropzone = document.getElementById('kas-dropzone');

    const fileInput = document.getElementById('kas-file-input');



    if (dropzone && fileInput) {

        dropzone.addEventListener('click', () => fileInput.click());



        fileInput.addEventListener('change', (e) => {

            if (e.target.files.length > 0) {

                handleKasUpload(e.target.files[0]);

            }

        });



        dropzone.addEventListener('dragover', (e) => {

            e.preventDefault();

            dropzone.classList.add('dragover');

        });



        dropzone.addEventListener('dragleave', () => {

            dropzone.classList.remove('dragover');

        });



        dropzone.addEventListener('drop', (e) => {

            e.preventDefault();

            dropzone.classList.remove('dragover');

            if (e.dataTransfer.files.length > 0) {

                handleKasUpload(e.dataTransfer.files[0]);

            }

        });

    }



    const editorForm = document.getElementById('kas-editor-form');

    if (editorForm) {

        editorForm.addEventListener('submit', (e) => {

            e.preventDefault();

            saveKasForm();

        });

    }

}



// Save or update Kas record to MySQL

function saveKasForm() {

    const id = parseInt(document.getElementById('kas-id').value) || 0;

    

    const items = [];

    document.querySelectorAll('#kas-editor-items-body tr').forEach(row => {

        const name = row.querySelector('.item-aktifitas').value.trim();

        if (name) {

            items.push({

                aktifitas: name,

                sts: row.querySelector('.item-sts').value.trim(),

                box: parseInt(row.querySelector('.item-box').value) || 0,

                itm: parseInt(row.querySelector('.item-itm').value) || 0,

                tarif: parseFloat(row.querySelector('.item-tarif').value) || 0,

                total: parseFloat(row.querySelector('.item-total').value) || 0

            });

        }

    });



    const containers = [];

    document.querySelectorAll('#kas-editor-containers-body tr').forEach(row => {

        const no = row.querySelector('.container-no').value.trim();

        if (no) {

            containers.push({

                no_petikemas: no,

                sts: row.querySelector('.container-sts').value.trim(),

                estimasi: row.querySelector('.container-estimasi').value || null,

                total: parseFloat(row.querySelector('.container-total').value) || 0

            });

        }

    });



    const localTglCetak = document.getElementById('kas-tgl-cetak').value;

    let tglCetakDb = null;

    if (localTglCetak) {

        const dt = new Date(localTglCetak);

        tglCetakDb = dt.getFullYear() + '-' +

            String(dt.getMonth() + 1).padStart(2, '0') + '-' +

            String(dt.getDate()).padStart(2, '0') + ' ' +

            String(dt.getHours()).padStart(2, '0') + ':' +

            String(dt.getMinutes()).padStart(2, '0') + ':00';

    }



    const payload = {

        id: id,

        file_path: document.getElementById('kas-file-path').value,

        no_proforma: document.getElementById('kas-no-proforma').value.trim(),

        tgl_cetak: tglCetakDb,

        kode_bayar: document.getElementById('kas-kode-bayar').value.trim(),

        kapal: document.getElementById('kas-kapal').value.trim(),

        nama_tertagih: document.getElementById('kas-nama-tertagih').value.trim(),

        keterangan: document.getElementById('kas-keterangan').value.trim(),

        keterangan_tambahan: document.getElementById('kas-keterangan-tambahan').value.trim(),

        no_count: document.getElementById('kas-no-count').value.trim(),

        valuta: 'IDR',

        debit: parseFloat(document.getElementById('kas-debit').value) || 0.00,

        kredit: parseFloat(document.getElementById('kas-kredit').value) || 0.00,

        total_petikemas: parseInt(document.getElementById('kas-total-petikemas').value) || 0,

        sub_total: parseFloat(document.getElementById('kas-sub-total').value) || 0,

        ppn: parseFloat(document.getElementById('kas-ppn').value) || 0,

        materai: parseFloat(document.getElementById('kas-materai').value) || 0,

        grand_total: parseFloat(document.getElementById('kas-grand-total').value) || 0,

        is_ho: document.getElementById('kas-is-ho').checked ? 1 : 0,

        items: items,

        containers: containers

    };



    fetch('api_kas.php', {

        method: 'POST',

        headers: {

            'Content-Type': 'application/json',

            'Authorization': 'Basic ' + btoa('Nahel:Nahel@26')

        },

        body: JSON.stringify(payload)

    })

    .then(res => res.json())

    .then(response => {

        if (response.success) {

            closeKasEditorModal();

            Swal.fire('Berhasil', response.message, 'success');

            loadKasList();

        } else {

            Swal.fire('Gagal Menyimpan', response.error, 'error');

        }

    })

    .catch(err => {

        Swal.fire('Error', err.message, 'error');

    });

}



// ==========================================================================

// CONTAINER MANIFEST FUNCTIONS

// ==========================================================================

function loadContainerManifestVoyages() {

    const selectEl = document.getElementById('container-manifest-voyage-select');

    if (!selectEl) return;

    

    const currentVal = selectEl.value;

    selectEl.innerHTML = '<option value="">-- Choose Voyage --</option>';

    

    const voyagesMap = new Map();

    billsOfLading.forEach(bl => {

        const vessel = (bl.ocean_vessel || '').trim();

        const voyNo = (bl.voy_no || '').trim();

        

        if (vessel && voyNo) {

            const key = `${vessel} | VOY: ${voyNo}`;

            voyagesMap.set(key, { vessel, voyNo });

        }

    });

    

    const sortedKeys = Array.from(voyagesMap.keys()).sort();

    sortedKeys.forEach(key => {

        const opt = document.createElement('option');

        opt.value = key;

        opt.textContent = key;

        selectEl.appendChild(opt);

    });

    

    if (currentVal && voyagesMap.has(currentVal)) {

        selectEl.value = currentVal;

    }

}



function renderContainerManifestTable() {

    const selectEl = document.getElementById('container-manifest-voyage-select');

    const tableBody = document.getElementById('container-manifest-table-body');

    const btnExport = document.getElementById('btn-export-excel-container-manifest');

    

    if (!selectEl || !tableBody) return;

    

    const selectedVal = selectEl.value;

    if (!selectedVal) {

        tableBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">Silakan pilih Vessel Voyage terlebih dahulu.</td></tr>';

        if (btnExport) btnExport.disabled = true;

        return;

    }

    

    const parts = selectedVal.split(' | VOY: ');

    const vessel = parts[0];

    const voyNo = parts[1];

    

    const filteredBLs = billsOfLading.filter(bl => 

        (bl.ocean_vessel || '').trim() === vessel && 

        (bl.voy_no || '').trim() === voyNo

    );

    

    let html = '';

    let rowNum = 1;

    

    filteredBLs.forEach(bl => {

        const baseBookingNo = (bl.booking_no || '-').replace(/-\d+$/, '');

        const containerLines = (bl.cargo_containers || '').split('\n').map(l => l.trim()).filter(Boolean);

        

        // Extract only standard container number format: 4 letters + 7 digits (e.g. JHSU2674421)

        const matchedContainers = [];

        containerLines.forEach(line => {

            const match = line.match(/([A-Za-z]{4}[0-9]{7})/);

            if (match) {

                matchedContainers.push(match[1].toUpperCase());

            }

        });

        

        if (matchedContainers.length === 0) {

            html += `

                <tr>

                    <td>${rowNum++}</td>

                    <td><strong>${escapeHTML(bl.booking_no)}</strong></td>

                    <td class="text-muted">-</td>

                </tr>

            `;

        } else {

            matchedContainers.forEach((containerNo, idx) => {

                const formattedBooking = `${baseBookingNo}-${String(idx + 1).padStart(3, '0')}`;

                html += `

                    <tr>

                        <td>${rowNum++}</td>

                        <td><strong>${escapeHTML(formattedBooking)}</strong></td>

                        <td>${escapeHTML(containerNo)}</td>

                    </tr>

                `;

            });

        }

    });

    

    tableBody.innerHTML = html;

    if (btnExport) btnExport.disabled = false;

}



function exportContainerManifestToExcel() {

    const selectEl = document.getElementById('container-manifest-voyage-select');

    if (!selectEl || !selectEl.value) return;

    

    const selectedVal = selectEl.value;

    const parts = selectedVal.split(' | VOY: ');

    const vessel = parts[0];

    const voyNo = parts[1];

    

    const filteredBLs = billsOfLading.filter(bl => 

        (bl.ocean_vessel || '').trim() === vessel && 

        (bl.voy_no || '').trim() === voyNo

    );

    

    const workbookData = [];

    workbookData.push(["PT. PUTERA UTAMA LAUTAN / PT. PUTERA UTAMA LAUTAN"]);

    workbookData.push(["CONTAINER MANIFEST REPORT"]);

    workbookData.push(["Vessel / Voyage: " + selectedVal]);

    workbookData.push(["Tanggal Cetak: " + new Date().toLocaleString('id-ID')]);

    workbookData.push([]);

    

    workbookData.push([

        "No",

        "Nomor Booking",

        "Nomor Kontainer"

    ]);

    

    let rowNum = 1;

    filteredBLs.forEach(bl => {

        const baseBookingNo = (bl.booking_no || '-').replace(/-\d+$/, '');

        const containerLines = (bl.cargo_containers || '').split('\n').map(l => l.trim()).filter(Boolean);

        

        // Extract only standard container number format: 4 letters + 7 digits (e.g. JHSU2674421)

        const matchedContainers = [];

        containerLines.forEach(line => {

            const match = line.match(/([A-Za-z]{4}[0-9]{7})/);

            if (match) {

                matchedContainers.push(match[1].toUpperCase());

            }

        });

        

        if (matchedContainers.length === 0) {

            workbookData.push([

                rowNum++,

                bl.booking_no,

                "-"

            ]);

        } else {

            matchedContainers.forEach((containerNo, idx) => {

                const formattedBooking = `${baseBookingNo}-${String(idx + 1).padStart(3, '0')}`;

                workbookData.push([

                    rowNum++,

                    formattedBooking,

                    containerNo

                ]);

            });

        }

    });

    

    const worksheet = XLSX.utils.aoa_to_sheet(workbookData);

    

    worksheet['!cols'] = [

        { wch: 8 },

        { wch: 25 },

        { wch: 30 }

    ];

    

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Container Manifest");

    

    const fileDate = new Date().toISOString().slice(0, 10);

    const filename = `Container_Manifest_${vessel.replace(/\s+/g, '_')}_VOY_${voyNo}_${fileDate}.xlsx`;

    XLSX.writeFile(workbook, filename);

    Swal.fire('Berhasil', 'Container Manifest Excel berhasil diekspor.', 'success');

}



// ==========================================================================

// TRUCK MONITORING MODULE (TRANSLOADING & LANSER WORKFLOW)

// ==========================================================================

let truckingJobs = [];

let truckingSearchQuery = "";



// Helper to format weight without redundant trailing decimal zeros (e.g. 25.00 -> 25)

function formatThousands(num) {

    // Guaranteed cross-browser thousands formatting using dot as separator (Indonesian format)

    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

}



function formatWeight(val) {

    const num = parseFloat(val);

    if (isNaN(num)) return '0';

    return formatThousands(num);

}



// Helper to format text input to thousands standard

function formatInputThousands(input) {

    let cursor = input.selectionStart;

    let originalLen = input.value.length;

    let val = input.value.replace(/\D/g, "");

    if (val) {

        let num = parseInt(val, 10);

        let formatted = formatThousands(num);

        input.value = formatted;

        let newLen = formatted.length;

        let diff = newLen - originalLen;

        input.setSelectionRange(cursor + diff, cursor + diff);

    } else {

        input.value = "";

    }

}



// Helper to parse a thousands-formatted number (id-ID uses '.' as separator)

function parseFormattedNumber(str) {

    if (!str) return 0;

    // Remove all dots (thousands separator for id-ID), then parse

    return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0;

}



// 1. Setup Event Listeners for Trucking

function setupTruckingEventListeners() {

    // "Tambah Job Lansir" Button

    const btnCreate = document.getElementById('btn-create-truck-job');

    if (btnCreate) {

        btnCreate.addEventListener('click', () => {

            showTruckingEditor();

        });

    }



    // Search Input

    const searchInput = document.getElementById('truck-search-input');

    if (searchInput) {

        searchInput.addEventListener('input', (e) => {

            truckingSearchQuery = e.target.value;

            renderTruckingTable();

        });

    }



    // Add Truck Row in Editor

    const btnAddTruck = document.getElementById('btn-add-truck-row');

    if (btnAddTruck) {

        btnAddTruck.addEventListener('click', () => {

            addTruckAllocationRow();

        });

    }



    // Add Container Row in Editor

    const btnAddContainer = document.getElementById('btn-add-container-row');

    if (btnAddContainer) {

        btnAddContainer.addEventListener('click', () => {

            addContainerAllocationRow();

        });

    }



    // Close Editor Modal (Close button 'x')

    const btnCloseEditor = document.getElementById('btn-close-truck-editor');

    if (btnCloseEditor) {

        btnCloseEditor.addEventListener('click', () => {

            document.getElementById('truck-editor-modal').style.display = 'none';

        });

    }



    // Cancel Editor Modal (Batal button)

    const btnCancelEditor = document.getElementById('btn-cancel-truck-editor');

    if (btnCancelEditor) {

        btnCancelEditor.addEventListener('click', () => {

            document.getElementById('truck-editor-modal').style.display = 'none';

        });

    }



    // Close Preview Modal (Close button 'x')

    const btnClosePreview = document.getElementById('btn-close-truck-preview');

    if (btnClosePreview) {

        btnClosePreview.addEventListener('click', () => {

            document.getElementById('truck-preview-modal').style.display = 'none';

        });

    }



    // Cancel Preview Modal (Tutup button)

    const btnCancelPreview = document.getElementById('btn-cancel-truck-preview');

    if (btnCancelPreview) {

        btnCancelPreview.addEventListener('click', () => {

            document.getElementById('truck-preview-modal').style.display = 'none';

        });

    }



    // Total Weight input change triggers live calculation

    const totalWeightInput = document.getElementById('truck-total-weight');

    if (totalWeightInput) {

        totalWeightInput.addEventListener('input', updateWeightValidationStatus);

    }



    // Save Truck Job form submit

    const editorForm = document.getElementById('truck-editor-form');

    if (editorForm) {

        editorForm.addEventListener('submit', (e) => {

            e.preventDefault();

            saveTruckingJob();

        });

    }



    // Download PDF Button inside Preview

    const btnDownloadPdf = document.getElementById('btn-download-truck-pdf');

    if (btnDownloadPdf) {

        btnDownloadPdf.addEventListener('click', downloadTransloadingPDF);

    }



    // Click on overlay background to close modals

    const editorModal = document.getElementById('truck-editor-modal');

    if (editorModal) {

        editorModal.addEventListener('click', (e) => {

            if (e.target === editorModal) {

                editorModal.style.display = 'none';

            }

        });

    }



    const previewModal = document.getElementById('truck-preview-modal');

    if (previewModal) {

        previewModal.addEventListener('click', (e) => {

            if (e.target === previewModal) {

                previewModal.style.display = 'none';

            }

        });

    }

    // Auto-fill Perusahaan based on Nama PIC: if PIC is "a", Perusahaan is "PT A".

    const picInput = document.getElementById('truck-pic-name');

    const companyInput = document.getElementById('truck-company-name');

    if (picInput && companyInput) {

        picInput.addEventListener('input', (e) => {

            const val = e.target.value.trim();

            if (val.toLowerCase() === 'a') {

                companyInput.value = 'PT A';

            } else if (val) {

                // Prepend 'PT ' if not already present

                if (!companyInput.value || companyInput.value.startsWith('PT ')) {

                    companyInput.value = 'PT ' + val.toUpperCase();

                }

            } else {

                companyInput.value = '';

            }

        });

    }



    // SVG resize/redraw listener when window resizes

    window.addEventListener('resize', () => {

        if (previewModal && previewModal.style.display !== 'none') {

            const activeJobId = previewModal.dataset.activeJobId;

            if (activeJobId) {

                const job = truckingJobs.find(j => j.id == activeJobId);

                if (job) drawDiagramConnections();

            }

        }

    });



    // Legacy container photo elements removed from editor form



    // Image viewer close listener

    const btnCloseImageViewer = document.getElementById('btn-close-image-viewer');

    const imageViewerModal = document.getElementById('image-viewer-modal');

    if (btnCloseImageViewer && imageViewerModal) {

        btnCloseImageViewer.addEventListener('click', () => {

            imageViewerModal.style.display = 'none';

        });

        imageViewerModal.addEventListener('click', (e) => {

            if (e.target === imageViewerModal) {

                imageViewerModal.style.display = 'none';

            }

        });

    }



    // Listen to global Ctrl+V paste event when editor modal is active

    window.removeEventListener('paste', handleGlobalPaste);

    window.addEventListener('paste', handleGlobalPaste);

}



// Global active paste target state

let activePasteTarget = 'container';



function setActivePasteTarget(target) {

    // Remove active outline class from all targets

    document.querySelectorAll('.photo-paste-zone').forEach(el => el.classList.remove('active-target'));

    

    activePasteTarget = target;

    

    if (target === 'container') {

        const el = document.getElementById('truck-container-photo-preview');

        if (el) el.classList.add('active-target');

    } else if (target && target.nodeType) {

        target.classList.add('active-target');

    }

}



// Global paste event handler

function handleGlobalPaste(e) {

    const editorModal = document.getElementById('truck-editor-modal');

    if (!editorModal || editorModal.style.display === 'none') return;

    

    const items = (e.clipboardData || e.originalEvent.clipboardData).items;

    for (let item of items) {

        if (item.type.indexOf('image') !== -1) {

            const file = item.getAsFile();

            if (file) {

                compressImage(file, (dataUrl) => {

                    handlePastedImage(dataUrl);

                });

            }

            e.preventDefault();

            break;

        }

    }

}



// Store pasted image into active target

function handlePastedImage(dataUrl) {

    if (activePasteTarget && activePasteTarget.nodeType) {

        const previewDiv = activePasteTarget;

        const tr = previewDiv.closest('tr');

        if (tr) {

            const base64Input = tr.querySelector('.container-alloc-photo-base64, .truck-alloc-photo-base64');

            if (base64Input) {

                base64Input.value = dataUrl;

                previewDiv.innerHTML = `<img src="${dataUrl}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" onclick="viewFullImage('${dataUrl}')">`;

            }

        }

    }

}



// Helper to compress uploaded images locally to keep database size small (~50KB-100KB)

function compressImage(file, callback) {

    const reader = new FileReader();

    reader.onload = (e) => {

        const img = new Image();

        img.onload = () => {

            const canvas = document.createElement('canvas');

            let width = img.width;

            let height = img.height;

            const maxDim = 800; // max size

            if (width > maxDim || height > maxDim) {

                if (width > height) {

                    height = Math.round((height * maxDim) / width);

                    width = maxDim;

                } else {

                    width = Math.round((width * maxDim) / height);

                    height = maxDim;

                }

            }

            canvas.width = width;

            canvas.height = height;

            const ctx = canvas.getContext('2d');

            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality JPEG

            callback(dataUrl);

        };

        img.src = e.target.result;

    };

    reader.readAsDataURL(file);

}



// Helper to open full size image overlay

function viewFullImage(src) {

    const modal = document.getElementById('image-viewer-modal');

    const img = document.getElementById('image-viewer-img');

    if (modal && img) {

        img.src = src;

        modal.style.display = 'flex';

    }

}



// 2. Fetch and Load list of jobs

async function loadTruckingList() {

    try {

        const response = await fetch('api_trucking.php?action=list', {

            headers: {

                'Authorization': 'Basic ' + btoa('Nahel:Nahel@26')

            }

        });

        const res = await response.json();

        

        if (res.success) {

            truckingJobs = res.data;

            localStorage.setItem('pulaulaut_trucking_jobs', JSON.stringify(truckingJobs));

            updateTruckingStats();

            renderTruckingTable();

        } else {

            throw new Error(res.error || 'Server error');

        }

    } catch (e) {

        console.warn("Error loading trucking list, falling back to LocalStorage:", e);

        const stored = localStorage.getItem('pulaulaut_trucking_jobs');

        if (stored) {

            try {

                truckingJobs = JSON.parse(stored);

            } catch (err) {

                truckingJobs = [];

            }

        } else {

            // Seed mock data for demo / local offline mode

            truckingJobs = [

                {

                    id: 101,

                    vessel_voyage: "MV. MERATUS KAPUAS - VOY 2304",

                    container_no: "MRTU2981324",

                    container_size: "20 GP",

                    commodity: "Pupuk NPK",

                    total_weight: 25.00,

                    allocations: [

                        { plate_no: "KB 9021 AA", driver_name: "Budi Santoso", weight: 8.50 },

                        { plate_no: "KB 8910 BB", driver_name: "Edi Wijaya", weight: 8.50 },

                        { plate_no: "KB 7721 CC", driver_name: "Heri Prasetyo", weight: 8.00 }

                    ]

                },

                {

                    id: 102,

                    vessel_voyage: "MV. TANTO HORIZON - VOY 892",

                    container_no: "TNOU8821932",

                    container_size: "40 HC",

                    commodity: "Beras Cianjur",

                    total_weight: 27.50,

                    allocations: [

                        { plate_no: "KB 9931 DD", driver_name: "Yanto", weight: 10.00 },

                        { plate_no: "KB 8122 EE", driver_name: "Rudi", weight: 9.50 },

                        { plate_no: "KB 7634 FF", driver_name: "Joko", weight: 8.00 }

                    ]

                }

            ];

            localStorage.setItem('pulaulaut_trucking_jobs', JSON.stringify(truckingJobs));

        }

        updateTruckingStats();

        renderTruckingTable();

    }

}



// 3. Render Stats Cards

function updateTruckingStats() {

    const totalJobs = truckingJobs.length;

    

    // Count boxes (total unique container numbers across all jobs and sub-containers)

    const uniqueContainers = new Set();

    truckingJobs.forEach(j => {

        if (j.containers && j.containers.length > 0) {

            j.containers.forEach(c => {

                if (c.container_no) {

                    uniqueContainers.add(c.container_no.trim().toUpperCase());

                }

            });

        } else if (j.container_no) {

            uniqueContainers.add(j.container_no.trim().toUpperCase());

        }

    });

    const totalBoxes = uniqueContainers.size;

    

    // Sum total weight

    const totalWeight = truckingJobs.reduce((sum, j) => sum + parseFloat(j.total_weight || 0), 0);

    

    document.getElementById('stat-truck-total-jobs').textContent = totalJobs;

    document.getElementById('stat-truck-total-containers').textContent = totalBoxes + ' Box';

    document.getElementById('stat-truck-total-weight').textContent = formatWeight(totalWeight) + ' kg';

}



// 4. Render Data Table

// Helper to duplicate a trucking job

function duplicateTruckingJob(job) {

    const copy = JSON.parse(JSON.stringify(job));

    copy.id = 0; // Set as new job

    if (copy.containers && copy.containers.length > 0) {

        copy.containers[0].container_no = (copy.containers[0].container_no || "") + " - COPY";

        copy.container_no = copy.containers[0].container_no;

    } else {

        copy.container_no = (copy.container_no || "") + " - COPY";

    }

    showTruckingEditor(copy);

}



function renderTruckingTable() {

    const tbody = document.getElementById('truck-table-body');

    if (!tbody) return;

    

    tbody.innerHTML = "";

    

    const query = truckingSearchQuery.trim().toLowerCase();

    const filteredJobs = truckingJobs.filter(job => {

        const matchesContainer = (job.container_no || '').toLowerCase().includes(query) || 

            (job.containers && job.containers.some(c => (c.container_no || '').toLowerCase().includes(query)));

        return (

            (job.vessel_voyage || '').toLowerCase().includes(query) ||

            matchesContainer ||

            (job.commodity || '').toLowerCase().includes(query)

        );

    });

    

    if (filteredJobs.length === 0) {

        tbody.innerHTML = `

            <tr>

                <td colspan="9" class="text-center text-muted py-4">Tidak ada data job monitoring trucking.</td>

            </tr>

        `;

        return;

    }

    

    filteredJobs.forEach(job => {

        const tr = document.createElement('tr');

        

        // Count allocations

        const totalAllocations = job.allocations ? job.allocations.length : 0;

        

        // Formatted containers list for list view

        const containerNames = job.containers && job.containers.length > 0 ? job.containers.map(c => c.container_no).join(', ') : job.container_no;

        const containerSizes = job.containers && job.containers.length > 0 ? [...new Set(job.containers.map(c => c.container_size))].join(', ') : job.container_size;

        

        tr.innerHTML = `

            <td style="font-weight: 600; color: var(--text-primary);">${escapeHTML(job.vessel_voyage)}</td>

            <td style="font-family: monospace; font-weight: 700; color: var(--color-primary);" title="${escapeHTML(containerNames)}">${escapeHTML(containerNames)}</td>

            <td><span class="badge" style="background-color: rgba(255,255,255,0.05); color: var(--text-secondary);" title="${escapeHTML(containerSizes)}">${escapeHTML(containerSizes)}</span></td>

            <td>${escapeHTML(job.commodity)}</td>

            <td>${escapeHTML(job.pic_name || '-')}</td>

            <td>${escapeHTML(job.company_name || '-')}</td>

            <td class="text-right" style="font-weight: 700;">${formatWeight(job.total_weight)} kg</td>

            <td><span class="badge ${totalAllocations > 0 ? 'badge-weight-valid' : 'badge-weight-over'}">${totalAllocations} Truck CDD</span></td>

            <td class="text-center no-print">

                <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">

                    <button class="btn btn-primary btn-sm btn-preview-diagram" data-id="${job.id}" title="Ilustrasi" style="padding: 4px 8px; display: inline-flex; align-items: center; justify-content: center;">

                        <i class="fas fa-eye" style="font-size: 0.85rem;"></i>

                    </button>

                    <button class="btn btn-sm btn-copy-link" data-id="${job.id}" title="Copy Link Akses" style="padding: 4px 8px; background-color: #0ea5e9; border: none; color: white; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer;">

                        <i class="fas fa-link" style="font-size: 0.85rem;"></i>

                    </button>

                    <button class="btn btn-success btn-sm btn-duplicate-truck" data-id="${job.id}" title="Duplikat" style="padding: 4px 8px; background-color: #10b981; border-color: #10b981; color: white; display: inline-flex; align-items: center; justify-content: center;">

                        <i class="fas fa-copy" style="font-size: 0.85rem;"></i>

                    </button>

                    <button class="btn btn-warning btn-sm btn-edit-truck" data-id="${job.id}" title="Edit" style="padding: 4px 8px; background-color: #f59e0b; border-color: #f59e0b; color: white; display: inline-flex; align-items: center; justify-content: center;">

                        <i class="fas fa-edit" style="font-size: 0.85rem;"></i>

                    </button>

                    <button class="btn btn-danger btn-sm btn-delete-truck" data-id="${job.id}" title="Hapus" style="padding: 4px 8px; display: inline-flex; align-items: center; justify-content: center;">

                        <i class="fas fa-trash-alt" style="font-size: 0.85rem;"></i>

                    </button>

                </div>

            </td>

        `;

        

        // Bind action buttons

        tr.querySelector('.btn-preview-diagram').addEventListener('click', () => {

            showTransloadingPreview(job);

        });

        

        tr.querySelector('.btn-copy-link').addEventListener('click', () => {

            if (!job.access_token) {

                Swal.fire({ icon: 'warning', title: 'Belum ada token', text: 'Simpan ulang job ini dulu agar token link-nya terbuat.', confirmButtonColor: '#6366f1' });

                return;

            }

            const url = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '') + 'truck_access.php?token=' + job.access_token;

            navigator.clipboard.writeText(url).then(() => {

                Swal.fire({ icon: 'success', title: 'Link Disalin!', html: `<div style="word-break:break-all; font-size:0.82rem; color:#64748b; margin-top:6px;">${url}</div>`, confirmButtonColor: '#6366f1', timer: 3000, showConfirmButton: false });

            }).catch(() => {

                prompt('Salin link ini:', url);

            });

        });

        

        tr.querySelector('.btn-duplicate-truck').addEventListener('click', () => {

            duplicateTruckingJob(job);

        });

        

        tr.querySelector('.btn-edit-truck').addEventListener('click', () => {

            showTruckingEditor(job);

        });

        

        tr.querySelector('.btn-delete-truck').addEventListener('click', () => {

            deleteTruckingJob(job.id);

        });

        

        tbody.appendChild(tr);

    });

}



// 5. Autocomplete Dropdown loader for Editor

async function loadAutocompleteDatalists() {

    try {

        const response = await fetch('api_trucking.php?action=get_vessels_containers', {

            headers: {

                'Authorization': 'Basic ' + btoa('Nahel:Nahel@26')

            }

        });

        const res = await response.json();

        

        if (res.success) {

            // Load Vessels

            const vesselDatalist = document.getElementById('vessels-datalist');

            if (vesselDatalist) {

                vesselDatalist.innerHTML = "";

                res.vessels.forEach(v => {

                    const opt = document.createElement('option');

                    opt.value = v;

                    vesselDatalist.appendChild(opt);

                });

            }

            

            // Load Containers

            const containerDatalist = document.getElementById('containers-datalist');

            if (containerDatalist) {

                containerDatalist.innerHTML = "";

                res.containers.forEach(c => {

                    const opt = document.createElement('option');

                    opt.value = c;

                    containerDatalist.appendChild(opt);

                });

            }

        }

    } catch (e) {

        console.error("Error loading autocomplete datalists: ", e);

    }

}



// 6. Open Editor Modal (New or Edit mode)

async function showTruckingEditor(job = null) {

    // Clear datalists first and load autocomplete values

    await loadAutocompleteDatalists();

    

    const modal = document.getElementById('truck-editor-modal');

    const title = document.getElementById('truck-editor-title');

    const form = document.getElementById('truck-editor-form');

    

    // Clear form inputs

    form.reset();

    document.getElementById('truck-job-id').value = "0";

    document.getElementById('truck-pic-name').value = "";

    document.getElementById('truck-company-name').value = "";

    document.getElementById('truck-origin-address').value = "";

    document.getElementById('truck-destination-address').value = "";

    document.getElementById('container-alloc-rows').innerHTML = "";

    document.getElementById('truck-allocations-body').innerHTML = "";

    

    // Set default paste target to null or none initially

    setActivePasteTarget(null);

    

    if (job) {

        // Edit Mode

        title.textContent = "Edit Job Monitoring Trucking";

        document.getElementById('truck-job-id').value = job.id;

        document.getElementById('truck-vessel-voyage').value = job.vessel_voyage;

        document.getElementById('truck-commodity').value = job.commodity;

        document.getElementById('truck-pic-name').value = job.pic_name || "";

        document.getElementById('truck-company-name').value = job.company_name || "";

        document.getElementById('truck-origin-address').value = job.origin_address || "";

        document.getElementById('truck-destination-address').value = job.destination_address || "";

        

        // Add existing containers

        if (job.containers && job.containers.length > 0) {

            job.containers.forEach(cont => {

                addContainerAllocationRow(cont);

            });

        } else {

            addContainerAllocationRow();

        }

        

        document.getElementById('truck-total-weight').value = formatThousands(Math.round(parseFloat(job.total_weight || 0)));

        

        // Add existing allocations

        if (job.allocations && job.allocations.length > 0) {

            job.allocations.forEach(alloc => {

                addTruckAllocationRow(alloc);

            });

        } else {

            addTruckAllocationRow();

        }

    } else {

        // Create Mode

        title.textContent = "Tambah Job Monitoring Trucking";

        

        // Add 1 default empty container row

        addContainerAllocationRow();

        

        // Add 1 default empty truck row

        addTruckAllocationRow();

    }

    

    modal.style.display = 'flex';

    updateWeightValidationStatus();

}



function calculateTotalContainerWeight() {

    let total = 0;

    document.querySelectorAll('#container-alloc-rows .container-alloc-weight').forEach(input => {

        const rawVal = input.value.replace(/\./g, '');

        total += parseFloat(rawVal) || 0;

    });

    const totalWeightInput = document.getElementById('truck-total-weight');

    if (totalWeightInput) {

        totalWeightInput.value = formatThousands(Math.round(total));

    }

    updateWeightValidationStatus();

}



function addContainerAllocationRow(cont = null) {

    const tbody = document.getElementById('container-alloc-rows');

    if (!tbody) return;

    

    const tr = document.createElement('tr');

    

    const containerNoVal = cont ? cont.container_no : "";

    const containerSizeVal = cont ? cont.container_size : "20 GP";

    const weightFormatted = cont ? formatThousands(Math.round(parseFloat(cont.weight))) : "";

    const photoVal = cont ? (cont.container_photo || "") : "";

    

    tr.innerHTML = `

        <td>

            <input type="text" class="container-alloc-no" required placeholder="Contoh: SEGU1234567" value="${escapeHTML(containerNoVal)}" style="text-transform: uppercase;" list="containers-datalist">

        </td>

        <td>

            <select class="container-alloc-size" required>

                <option value="20 GP" ${containerSizeVal === '20 GP' ? 'selected' : ''}>20 GP</option>

                <option value="40 HC" ${containerSizeVal === '40 HC' ? 'selected' : ''}>40 HC</option>

                <option value="20 RF" ${containerSizeVal === '20 RF' ? 'selected' : ''}>20 RF</option>

                <option value="40 RF" ${containerSizeVal === '40 RF' ? 'selected' : ''}>40 RF</option>

                <option value="40 GP" ${containerSizeVal === '40 GP' ? 'selected' : ''}>40 GP</option>

                <option value="45 HC" ${containerSizeVal === '45 HC' ? 'selected' : ''}>45 HC</option>

                <option value="20 OT" ${containerSizeVal === '20 OT' ? 'selected' : ''}>20 OT</option>

                <option value="40 OT" ${containerSizeVal === '40 OT' ? 'selected' : ''}>40 OT</option>

                <option value="20 FR" ${containerSizeVal === '20 FR' ? 'selected' : ''}>20 FR</option>

                <option value="40 FR" ${containerSizeVal === '40 FR' ? 'selected' : ''}>40 FR</option>

            </select>

        </td>

        <td>

            <input type="text" class="container-alloc-weight" required placeholder="25.000" value="${weightFormatted}">

        </td>

        <td>

            <div style="display: flex; gap: 8px; align-items: center;">

                <input type="file" class="container-alloc-photo-file" accept="image/*" style="font-size: 0.75rem; width: 130px;">

                <input type="hidden" class="container-alloc-photo-base64" value="${photoVal}">

                <div class="container-alloc-photo-preview photo-paste-zone" style="width: 60px; height: 35px; background: rgba(0,0,0,0.2); border: 2px dashed var(--border-color); border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 0.55rem; color: var(--text-muted); cursor: pointer; text-align: center;" title="Klik untuk mengaktifkan tempel (Paste Ctrl+V)">

                    ${photoVal ? `<img src="${photoVal}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" onclick="viewFullImage('${photoVal}')">` : 'Paste'}

                </div>

            </div>

        </td>

        <td class="text-center">

            <button type="button" class="btn btn-danger btn-sm btn-remove-container-row" style="padding: 4px 8px;">×</button>

        </td>

    `;

    

    // Recalculate total container weight on input

    const weightInput = tr.querySelector('.container-alloc-weight');

    weightInput.addEventListener('input', (e) => {

        formatInputThousands(e.target);

        calculateTotalContainerWeight();

    });

    

    // Auto uppercase container no

    tr.querySelector('.container-alloc-no').addEventListener('input', (e) => {

        e.target.value = e.target.value.toUpperCase();

    });

    

    // Photo file input listener

    const fileInput = tr.querySelector('.container-alloc-photo-file');

    const base64Input = tr.querySelector('.container-alloc-photo-base64');

    const previewDiv = tr.querySelector('.container-alloc-photo-preview');

    

    fileInput.addEventListener('change', (e) => {

        const file = e.target.files[0];

        if (file) {

            compressImage(file, (dataUrl) => {

                base64Input.value = dataUrl;

                previewDiv.innerHTML = `<img src="${dataUrl}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" onclick="viewFullImage('${dataUrl}')">`;

            });

        } else {

            base64Input.value = "";

            previewDiv.innerHTML = "Paste";

        }

    });



    // Click on row preview thumbnail to set it as active paste target

    previewDiv.addEventListener('click', () => {

        setActivePasteTarget(previewDiv);

    });

    

    // Delete row event

    tr.querySelector('.btn-remove-container-row').addEventListener('click', () => {

        tr.remove();

        calculateTotalContainerWeight();

    });

    tbody.appendChild(tr);

    calculateTotalContainerWeight();

    

    // Auto-scroll table container to bottom

    const tableContainer = tbody.closest('.table-container');

    if (tableContainer) {

        tableContainer.scrollTop = tableContainer.scrollHeight;

    }

    // Auto-focus the first input of the new row

    const firstInput = tr.querySelector('input');

    if (firstInput) {

        firstInput.focus();

    }

}





// 7. Add allocation row in editor table

function addTruckAllocationRow(alloc = null) {

    const tbody = document.getElementById('truck-allocations-body');

    if (!tbody) return;

    

    const tr = document.createElement('tr');

    

    const plateVal = alloc ? alloc.plate_no : "";

    const driverVal = alloc ? alloc.driver_name : "";

    const weightFormatted = alloc ? formatThousands(Math.round(parseFloat(alloc.weight))) : "";

    const photoVal = alloc ? (alloc.truck_photo || "") : "";

    

    tr.innerHTML = `

        <td><input type="text" class="truck-alloc-plate" required placeholder="Contoh: KB 1234 XX" value="${escapeHTML(plateVal)}" style="text-transform: uppercase;"></td>

        <td><input type="text" class="truck-alloc-driver" required placeholder="Nama Driver" value="${escapeHTML(driverVal)}"></td>

        <td><input type="text" class="truck-alloc-weight" required placeholder="10.000" value="${weightFormatted}"></td>

        <td>

            <div style="display: flex; gap: 8px; align-items: center;">

                <input type="file" class="truck-alloc-photo-file" accept="image/*" style="font-size: 0.75rem; width: 130px;">

                <input type="hidden" class="truck-alloc-photo-base64" value="${photoVal}">

                <div class="truck-alloc-photo-preview photo-paste-zone" style="width: 60px; height: 35px; background: rgba(0,0,0,0.2); border: 2px dashed var(--border-color); border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 0.55rem; color: var(--text-muted); cursor: pointer; text-align: center;" title="Klik untuk mengaktifkan tempel (Paste Ctrl+V)">

                    ${photoVal ? `<img src="${photoVal}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" onclick="viewFullImage('${photoVal}')">` : 'Paste'}

                </div>

            </div>

        </td>

        <td class="text-center">

            <button type="button" class="btn btn-danger btn-sm btn-remove-alloc-row" style="padding: 4px 8px;">×</button>

        </td>

    `;

    

    // Live validation recalculation trigger

    const truckWeightInput = tr.querySelector('.truck-alloc-weight');

    truckWeightInput.addEventListener('input', (e) => {

        formatInputThousands(e.target);

        updateWeightValidationStatus();

    });

    

    // Auto uppercase plate no

    tr.querySelector('.truck-alloc-plate').addEventListener('input', (e) => {

        e.target.value = e.target.value.toUpperCase();

    });

    

    // Photo file input listener

    const fileInput = tr.querySelector('.truck-alloc-photo-file');

    const base64Input = tr.querySelector('.truck-alloc-photo-base64');

    const previewDiv = tr.querySelector('.truck-alloc-photo-preview');

    

    fileInput.addEventListener('change', (e) => {

        const file = e.target.files[0];

        if (file) {

            compressImage(file, (dataUrl) => {

                base64Input.value = dataUrl;

                previewDiv.innerHTML = `<img src="${dataUrl}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" onclick="viewFullImage('${dataUrl}')">`;

            });

        } else {

            base64Input.value = "";

            previewDiv.innerHTML = "Paste";

        }

    });



    // Click on row preview thumbnail to set it as active paste target

    previewDiv.addEventListener('click', () => {

        setActivePasteTarget(previewDiv);

    });

    

    // Delete row event

    tr.querySelector('.btn-remove-alloc-row').addEventListener('click', () => {

        tr.remove();

        updateWeightValidationStatus();

    });

    

    tbody.appendChild(tr);

    updateWeightValidationStatus();

    

    // Auto-scroll table container to bottom

    const tableContainer = tbody.closest('.table-container');

    if (tableContainer) {

        tableContainer.scrollTop = tableContainer.scrollHeight;

    }

    // Auto-focus the first input of the new row

    const firstInput = tr.querySelector('input');

    if (firstInput) {

        firstInput.focus();

    }

}



// 8. Sum allocated weights and validate

function updateWeightValidationStatus() {

    const totalWeight = parseFormattedNumber(document.getElementById('truck-total-weight').value);

    

    // Sum weights of all rows

    let allocatedWeight = 0;

    document.querySelectorAll('.truck-alloc-weight').forEach(input => {

        allocatedWeight += parseFormattedNumber(input.value);

    });

    

    const badge = document.getElementById('truck-weight-status-badge');

    const icon = document.getElementById('truck-weight-status-icon');

    const text = document.getElementById('truck-weight-status-text');

    

    if (!badge || !text) return;

    

    // Clear old status classes

    badge.className = "";

    

    if (totalWeight <= 0) {

        badge.classList.add('badge-weight-under');

        icon.textContent = "ℹ";

        text.textContent = `Tentukan total berat kontainer terlebih dahulu.`;

        return;

    }

    

    // Compare

    const diff = Math.abs(allocatedWeight - totalWeight);

    const threshold = 0.001; // Float margin

    

    if (diff <= threshold) {

        // Balanced

        badge.classList.add('badge-weight-valid');

        icon.textContent = "✔";

        text.textContent = `Total alokasi muatan pas: ${formatWeight(allocatedWeight)} dari ${formatWeight(totalWeight)} kg`;

    } else if (allocatedWeight < totalWeight) {

        // Under allocated

        badge.classList.add('badge-weight-under');

        icon.textContent = "⚠";

        text.textContent = `Total alokasi muatan kurang: ${formatWeight(allocatedWeight)} dari ${formatWeight(totalWeight)} kg (Tersisa ${formatWeight(totalWeight - allocatedWeight)} kg)`;

    } else {

        // Over allocated

        badge.classList.add('badge-weight-over');

        icon.textContent = "❌";

        text.textContent = `Total alokasi muatan berlebih: ${formatWeight(allocatedWeight)} dari ${formatWeight(totalWeight)} kg (Kelebihan ${formatWeight(allocatedWeight - totalWeight)} kg)`;

    }

}



// 9. Save or edit record to database

async function saveTruckingJob() {

    const id = parseInt(document.getElementById('truck-job-id').value) || 0;

    

    const vesselVal = document.getElementById('truck-vessel-voyage').value.trim();

    const commodityVal = document.getElementById('truck-commodity').value.trim();

    const picVal = document.getElementById('truck-pic-name').value.trim();

    const companyVal = document.getElementById('truck-company-name').value.trim();

    const originVal = document.getElementById('truck-origin-address').value.trim();

    const destinationVal = document.getElementById('truck-destination-address').value.trim();

    

    // Gather containers

    const containers = [];

    let totalWeightVal = 0;

    let hasEmptyContainers = false;

    

    const containerRows = document.querySelectorAll('#container-alloc-rows tr');

    containerRows.forEach(row => {

        const contNo = row.querySelector('.container-alloc-no').value.trim().toUpperCase();

        const contSize = row.querySelector('.container-alloc-size').value;

        const contWeight = parseFormattedNumber(row.querySelector('.container-alloc-weight').value);

        const contPhoto = row.querySelector('.container-alloc-photo-base64').value;

        

        if (!contNo || contWeight <= 0) {

            hasEmptyContainers = true;

        }

        

        containers.push({

            container_no: contNo,

            container_size: contSize,

            weight: contWeight,

            container_photo: contPhoto

        });

        totalWeightVal += contWeight;

    });

    

    if (hasEmptyContainers || containers.length === 0) {

        Swal.fire('Error', 'Harap isi nomor kontainer dan berat kontainer dengan benar.', 'error');

        return;

    }

    

    // Gather allocations

    const allocations = [];

    let allocatedWeight = 0;

    

    const rows = document.querySelectorAll('#truck-allocations-body tr');

    let hasEmptyFields = false;

    

    rows.forEach(row => {

        const plate = row.querySelector('.truck-alloc-plate').value.trim().toUpperCase();

        const driver = row.querySelector('.truck-alloc-driver').value.trim();

        const weight = parseFormattedNumber(row.querySelector('.truck-alloc-weight').value);

        const photo = row.querySelector('.truck-alloc-photo-base64').value;

        

        if (!plate || !driver || weight <= 0) {

            hasEmptyFields = true;

        }

        

        allocations.push({

            plate_no: plate,

            driver_name: driver,

            weight: weight,

            truck_photo: photo

        });

        

        allocatedWeight += weight;

    });

    

    if (hasEmptyFields) {

        Swal.fire('Error', 'Harap isi plat nomor, nama driver, dan beban muatan truck alokasi dengan benar.', 'error');

        return;

    }

    

    // Validate balance warning

    const diff = Math.abs(allocatedWeight - totalWeightVal);

    if (diff > 0.01) {

        const confirmResult = await Swal.fire({

            title: 'Konfirmasi Alokasi Muatan',

            text: `Total alokasi muatan truck (${formatWeight(allocatedWeight)} kg) tidak sama dengan total berat kontainer (${formatWeight(totalWeightVal)} kg). Apakah Anda ingin tetap melanjutkan penyimpanan?`,

            icon: 'warning',

            showCancelButton: true,

            confirmButtonColor: '#3085d6',

            cancelButtonColor: '#d33',

            confirmButtonText: 'Ya, Tetap Simpan',

            cancelButtonText: 'Batal'

        });

        

        if (!confirmResult.isConfirmed) return;

    }

    

    // Set fallback container fields for old browsers/data compatibility

    const firstCont = containers[0] || { container_no: '', container_size: '20 GP', container_photo: '' };

    const payload = {

        id: id,

        vessel_voyage: vesselVal,

        container_no: firstCont.container_no,

        container_size: firstCont.container_size,

        container_photo: firstCont.container_photo,

        commodity: commodityVal,

        pic_name: picVal,

        company_name: companyVal,

        origin_address: originVal,

        destination_address: destinationVal,

        total_weight: totalWeightVal,

        containers: containers,

        allocations: allocations

    };

    

    try {

        const response = await fetch('api_trucking.php?action=save', {

            method: 'POST',

            headers: {

                'Content-Type': 'application/json',

                'Authorization': 'Basic ' + btoa('Nahel:Nahel@26')

            },

            body: JSON.stringify(payload)

        });

        

        const res = await response.json();

        

        if (res.success) {

            Swal.fire('Berhasil', 'Job monitoring trucking berhasil disimpan.', 'success');

            document.getElementById('truck-editor-modal').style.display = 'none';

            loadTruckingList();

        } else {

            throw new Error(res.error || 'Server error');

        }

    } catch (e) {

        console.warn("Failed to save to server database, saving to LocalStorage fallback:", e);

        if (id > 0) {

            const idx = truckingJobs.findIndex(j => j.id == id);

            if (idx !== -1) {

                payload.containers = containers;

                payload.allocations = allocations; 

                truckingJobs[idx] = payload;

            }

        } else {

            payload.id = Date.now(); 

            payload.containers = containers;

            payload.allocations = allocations;

            truckingJobs.push(payload);

        }

        localStorage.setItem('pulaulaut_trucking_jobs', JSON.stringify(truckingJobs));

        Swal.fire('Berhasil (Cadangan)', 'Data disimpan ke penyimpanan browser (Local Storage) karena database offline.', 'success');

        document.getElementById('truck-editor-modal').style.display = 'none';

        updateTruckingStats();

        renderTruckingTable();

    }

}



// 10. Delete job from list

async function deleteTruckingJob(id) {

    const confirmResult = await Swal.fire({

        title: 'Hapus Data Job?',

        text: 'Apakah Anda yakin ingin menghapus data job monitoring trucking ini beserta semua alokasi truck-nya?',

        icon: 'warning',

        showCancelButton: true,

        confirmButtonColor: '#d33',

        cancelButtonColor: '#3085d6',

        confirmButtonText: 'Ya, Hapus!',

        cancelButtonText: 'Batal'

    });

    

    if (confirmResult.isConfirmed) {

        try {

            const response = await fetch(`api_trucking.php?action=delete&id=${id}`, {

                method: 'DELETE',

                headers: {

                    'Authorization': 'Basic ' + btoa('Nahel:Nahel@26')

                }

            });

            const res = await response.json();

            

            if (res.success) {

                Swal.fire('Berhasil', 'Job trucking berhasil dihapus.', 'success');

                loadTruckingList();

            } else {

                throw new Error(res.error || 'Server error');

            }

        } catch (e) {

            console.warn("Failed to delete from server, removing from LocalStorage fallback:", e);

            truckingJobs = truckingJobs.filter(j => j.id != id);

            localStorage.setItem('pulaulaut_trucking_jobs', JSON.stringify(truckingJobs));

            Swal.fire('Berhasil', 'Job trucking dihapus dari penyimpanan browser.', 'success');

            updateTruckingStats();

            renderTruckingTable();

        }

    }

}



// Color helper for multi-container

function getContainerColor(idx) {

    const colors = [

        '#2563eb', // blue

        '#059669', // emerald green

        '#d97706', // amber

        '#7c3aed', // violet

        '#db2777', // pink

        '#0891b2', // cyan

        '#ea580c'  // orange

    ];

    return colors[idx % colors.length];

}



function adjustColorBrightness(hex, percent) {

    let R = parseInt(hex.substring(1, 3), 16);

    let G = parseInt(hex.substring(3, 5), 16);

    let B = parseInt(hex.substring(5, 7), 16);



    R = parseInt(R * (100 + percent) / 100);

    G = parseInt(G * (100 + percent) / 100);

    B = parseInt(B * (100 + percent) / 100);



    R = (R < 255) ? R : 255;

    G = (G < 255) ? G : 255;

    B = (B < 255) ? B : 255;



    R = (R > 0) ? R : 0;

    G = (G > 0) ? G : 0;

    B = (B > 0) ? B : 0;



    const rHex = R.toString(16).padStart(2, '0');

    const gHex = G.toString(16).padStart(2, '0');

    const bHex = B.toString(16).padStart(2, '0');



    return `#${rHex}${gHex}${bHex}`;

}



function calculateFIFOAllocation(containers, allocations) {

    const links = [];

    

    // Create copy of container weights

    const contWeights = containers.map((c, i) => ({

        index: i,

        no: c.container_no,

        remaining: parseFloat(c.weight) || 0

    }));

    

    // Create copy of truck weights

    const truckWeights = allocations.map((a, i) => ({

        index: i,

        plate: a.plate_no,

        remaining: parseFloat(a.weight) || 0

    }));

    

    let contIdx = 0;

    let truckIdx = 0;

    

    while (contIdx < contWeights.length && truckIdx < truckWeights.length) {

        const c = contWeights[contIdx];

        const t = truckWeights[truckIdx];

        

        if (c.remaining <= 0) {

            contIdx++;

            continue;

        }

        if (t.remaining <= 0) {

            truckIdx++;

            continue;

        }

        

        const allocated = Math.min(c.remaining, t.remaining);

        

        links.push({

            containerIdx: c.index,

            truckIdx: t.index,

            weight: allocated

        });

        

        c.remaining -= allocated;

        t.remaining -= allocated;

    }

    

    return links;

}



// 11. Render transloading visualization flow diagram

function showTransloadingPreview(job) {

    const modal = document.getElementById('truck-preview-modal');

    modal.dataset.activeJobId = job.id;

    window.activePreviewJob = job; // Store globally for SVG drawer

    

    // Date string

    document.getElementById('truck-preview-date').textContent = 'Tanggal Cetak: ' + new Date().toLocaleString('id-ID', {

        day: 'numeric',

        month: 'long',

        year: 'numeric',

        hour: '2-digit',

        minute: '2-digit'

    });

    

    // Joint Containers details

    const containerNames = job.containers ? job.containers.map(c => c.container_no).join(', ') : job.container_no;

    const containerSizes = job.containers ? [...new Set(job.containers.map(c => c.container_size))].join(', ') : job.container_size;

    

    document.getElementById('lbl-preview-vessel').textContent = job.vessel_voyage;

    document.getElementById('lbl-preview-container').textContent = containerNames;

    document.getElementById('lbl-preview-size').textContent = containerSizes;

    document.getElementById('lbl-preview-pic').textContent = job.pic_name || '-';

    document.getElementById('lbl-preview-commodity').textContent = job.commodity;

    document.getElementById('lbl-preview-company').textContent = job.company_name || '-';

    document.getElementById('lbl-preview-weight').textContent = formatWeight(job.total_weight) + ' kg';

    document.getElementById('lbl-preview-origin').textContent = job.origin_address || '-';

    document.getElementById('lbl-preview-destination').textContent = job.destination_address || '-';

    

    // Route banner

    const routeBanner = document.getElementById('lbl-preview-route-banner');

    const originTxt = job.origin_address || '';

    const destTxt = job.destination_address || '';

    if (originTxt || destTxt) {

        document.getElementById('lbl-preview-route-origin').textContent = originTxt || '(asal tidak diisi)';

        document.getElementById('lbl-preview-route-destination').textContent = destTxt || '(tujuan tidak diisi)';

        routeBanner.style.display = 'flex';

    } else {

        routeBanner.style.display = 'none';

    }

    

    const numTrucks = job.allocations ? job.allocations.length : 0;

    document.getElementById('lbl-preview-trucks').textContent = numTrucks + ' Unit CDD';

    

    // Render illustration elements

    const diagram = document.getElementById('truck-illustration-diagram');

    diagram.innerHTML = "";

    

    // Left Containers Column

    const containersCol = document.createElement('div');

    containersCol.className = 'containers-list-column';

    containersCol.style.display = 'flex';

    containersCol.style.flexDirection = 'column';

    containersCol.style.gap = '16px';

    containersCol.style.zIndex = '10';

    

    const contsList = job.containers && job.containers.length > 0 ? job.containers : [

        { container_no: job.container_no, container_size: job.container_size, weight: job.total_weight, container_photo: job.container_photo }

    ];

    

    contsList.forEach((cont, idx) => {

        const containerDiv = document.createElement('div');

        containerDiv.className = 'truck-node-container';

        containerDiv.dataset.index = idx;

        

        const strokeColor = getContainerColor(idx);

        const bgGrad = `linear-gradient(135deg, ${adjustColorBrightness(strokeColor, -30)} 0%, ${strokeColor} 100%)`;

        containerDiv.setAttribute('style', `background: ${bgGrad} !important; border: 2px solid ${adjustColorBrightness(strokeColor, 15)} !important; width: 220px !important; margin-bottom: 0 !important;`);

        

        containerDiv.innerHTML = `

            <div class="container-stripes"></div>

            <div class="container-badge" style="background-color: #ffffff; color: ${strokeColor};">${escapeHTML(cont.container_size)}</div>

            <div style="font-family: monospace; font-size: 1.05rem; font-weight: 800; margin-bottom: 6px; letter-spacing: 0.5px;">${escapeHTML(cont.container_no)}</div>

            <div style="font-size: 0.8rem; opacity: 0.95; font-weight: 500; text-align: center; margin-bottom: 8px;">${escapeHTML(job.commodity)}</div>

            <div style="font-size: 1.1rem; font-weight: 800; background-color: rgba(0,0,0,0.2); padding: 4px 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">${formatWeight(cont.weight)} kg</div>

            ${cont.container_photo ? `

                <div style="margin-top: 10px; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden; width: 100px; height: 60px; margin-left: auto; margin-right: auto;" onclick="viewFullImage('${cont.container_photo}')">

                    <img src="${cont.container_photo}" style="width: 100%; height: 100%; object-fit: cover;" title="Klik untuk memperbesar">

                </div>

            ` : ''}

        `;

        containersCol.appendChild(containerDiv);

    });

    

    // Right Trucks Column

    const trucksCol = document.createElement('div');

    trucksCol.className = 'trucks-list-column';

    

    if (job.allocations && job.allocations.length > 0) {

        job.allocations.forEach(alloc => {

            const truckCard = document.createElement('div');

            truckCard.className = 'truck-card-node';

            truckCard.setAttribute('style', "width: 290px !important; height: 110px !important; padding: 0 !important; background: url('truck roda 6.png') no-repeat center !important; background-size: contain !important; border: none !important; box-shadow: none !important; display: flex !important; align-items: center !important; justify-content: flex-start !important; position: relative;");

            

            truckCard.innerHTML = `

                <div style="background: white; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; width: 175px; height: 80px; margin-left: 10px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: center; gap: 4px; z-index: 2;">

                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">

                        <div class="truck-plate-badge" style="margin: 0; padding: 2px 4px; font-size: 0.65rem; white-space: nowrap;">${escapeHTML(alloc.plate_no)}</div>

                        <div class="truck-load-badge" style="font-size: 0.7rem; padding: 2px 4px; white-space: nowrap; color: #15803d; background-color: #dcfce7; border: 1px solid #bbf7d0; font-weight: 700;">${formatWeight(alloc.weight)} kg</div>

                    </div>

                    <div class="truck-driver-info" style="margin: 0;">

                        <p class="truck-driver-name" style="font-size: 0.75rem; margin: 0; font-weight: 700; color: #1e293b; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(alloc.driver_name)}</p>

                        <p class="truck-driver-role" style="font-size: 0.6rem; margin: 0; color: #64748b;">Driver CDD</p>

                    </div>

                </div>

                

                ${alloc.truck_photo ? `

                    <div style="position: absolute; bottom: 8px; right: 8px; cursor: pointer; border: 2px solid white; border-radius: 4px; overflow: hidden; width: 40px; height: 28px; z-index: 3; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" onclick="viewFullImage('${alloc.truck_photo}')" title="Klik untuk memperbesar foto asli">

                        <img src="${alloc.truck_photo}" style="width: 100%; height: 100%; object-fit: cover;">

                    </div>

                ` : ''}

            `;

            trucksCol.appendChild(truckCard);

        });

    } else {

        trucksCol.innerHTML = `<div style="color: #64748b; font-style: italic;">Belum ada alokasi truck.</div>`;

    }

    

    diagram.appendChild(containersCol);

    diagram.appendChild(trucksCol);

    

    // Open modal

    modal.style.display = 'flex';

    

    // Wait for DOM to adjust and draw SVG lines

    setTimeout(() => {

        drawDiagramConnections();

    }, 120);

}



// 12. Draw SVG quadratic curved paths connecting nodes

function drawDiagramConnections() {

    const diagram = document.getElementById('truck-illustration-diagram');

    if (!diagram) return;

    

    const job = window.activePreviewJob;

    if (!job) return;

    

    const containerNodes = diagram.querySelectorAll('.truck-node-container');

    const truckCards = diagram.querySelectorAll('.truck-card-node');

    

    if (containerNodes.length === 0 || truckCards.length === 0) return;

    

    // Clear old SVG

    let svg = diagram.querySelector('.diagram-arrows-svg');

    if (svg) svg.remove();

    

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    svg.setAttribute('class', 'diagram-arrows-svg');

    svg.setAttribute('style', 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5;');

    

    // Marker defs for arrow-heads

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    svg.appendChild(defs);

    

    const diagRect = diagram.getBoundingClientRect();

    

    // Run matching algorithm to get connection links

    const contsList = job.containers && job.containers.length > 0 ? job.containers : [

        { container_no: job.container_no, container_size: job.container_size, weight: job.total_weight, container_photo: job.container_photo }

    ];

    const links = calculateFIFOAllocation(contsList, job.allocations || []);

    

    links.forEach(link => {

        const cNode = containerNodes[link.containerIdx];

        const tNode = truckCards[link.truckIdx];

        

        if (!cNode || !tNode) return;

        

        const cRect = cNode.getBoundingClientRect();

        const tRect = tNode.getBoundingClientRect();

        

        // Right-center edge coordinates of the container box

        const x1 = cRect.right - diagRect.left;

        const y1 = cRect.top + (cRect.height / 2) - diagRect.top;

        

        // Left-center edge coordinates of the truck card

        const x2 = tRect.left - diagRect.left - 5;

        const y2 = tRect.top + (tRect.height / 2) - diagRect.top;

        

        const strokeColor = getContainerColor(link.containerIdx);

        

        // Create matching dynamic arrow-head marker

        const markerId = `arrow-head-${link.containerIdx}`;

        if (!defs.querySelector(`#${markerId}`)) {

            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');

            marker.setAttribute('id', markerId);

            marker.setAttribute('viewBox', '0 0 10 10');

            marker.setAttribute('refX', '7');

            marker.setAttribute('refY', '5');

            marker.setAttribute('markerWidth', '6');

            marker.setAttribute('markerHeight', '6');

            marker.setAttribute('orient', 'auto-start-reverse');

            

            const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

            arrowPath.setAttribute('d', 'M 0 1 L 10 5 L 0 9 z');

            arrowPath.setAttribute('fill', strokeColor);

            

            marker.appendChild(arrowPath);

            defs.appendChild(marker);

        }

        

        // Draw Cubic Bezier S-Curve

        const cx1 = x1 + (x2 - x1) * 0.4;

        const cy1 = y1;

        const cx2 = x1 + (x2 - x1) * 0.6;

        const cy2 = y2;

        

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        path.setAttribute('d', `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`);

        path.setAttribute('stroke', strokeColor);

        path.setAttribute('stroke-width', '3');

        path.setAttribute('fill', 'none');

        path.setAttribute('marker-end', `url(#${markerId})`);

        path.setAttribute('stroke-dasharray', '6 4');

        

        svg.appendChild(path);

        

        // Midpoint calculation for Bezier curve (t=0.5)

        const mx = 0.125 * x1 + 0.375 * cx1 + 0.375 * cx2 + 0.125 * x2;

        const my = 0.125 * y1 + 0.375 * cy1 + 0.375 * cy2 + 0.125 * y2;

        

        // Create pill badge group

        const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        

        const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');

        textEl.setAttribute('x', mx);

        textEl.setAttribute('y', my + 3.5);

        textEl.setAttribute('text-anchor', 'middle');

        textEl.setAttribute('fill', '#ffffff');

        textEl.setAttribute('style', 'font-size: 0.65rem; font-weight: bold; font-family: Outfit, sans-serif;');

        textEl.textContent = formatWeight(link.weight) + ' kg';

        

        const labelLen = textEl.textContent.length;

        const rectW = labelLen * 6.0 + 8;

        const rectH = 15;

        

        const rectEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

        rectEl.setAttribute('x', mx - (rectW / 2));

        rectEl.setAttribute('y', my - (rectH / 2));

        rectEl.setAttribute('width', rectW);

        rectEl.setAttribute('height', rectH);

        rectEl.setAttribute('rx', '7.5');

        rectEl.setAttribute('ry', '7.5');

        rectEl.setAttribute('fill', strokeColor);

        rectEl.setAttribute('stroke', '#ffffff');

        rectEl.setAttribute('stroke-width', '1.2');

        

        labelGroup.appendChild(rectEl);

        labelGroup.appendChild(textEl);

        svg.appendChild(labelGroup);

    });

    

    diagram.appendChild(svg);

}



// 13. PDF download exporter using html2pdf

function downloadTransloadingPDF() {

    const element = document.getElementById('truck-print-area');

    if (!element) return;

    

    const containerNo = document.getElementById('lbl-preview-container').textContent || 'TRANSLOADING';

    

    // Temporarily add page-break-inside: avoid to diagram and each truck node

    const diagram = document.getElementById('truck-illustration-diagram');

    const originalDiagramStyle = diagram.getAttribute('style') || '';

    diagram.style.pageBreakInside = 'avoid';

    diagram.style.breakInside = 'avoid';

    

    const truckNodes = element.querySelectorAll('.truck-node-dump, .truck-node-container');

    truckNodes.forEach(n => {

        n.style.pageBreakInside = 'avoid';

        n.style.breakInside = 'avoid';

    });

    

    // Measure element dimension in pixels dynamically

    const widthPx = element.offsetWidth || 1120;

    const heightPx = element.offsetHeight || 800;

    

    // Convert to mm (1 px = 0.264583 mm)

    // Add safety margins to prevent cropping issues

    const widthMm = (widthPx * 0.264583) + 20; 

    const heightMm = (heightPx * 0.264583) + 25; 

    

    const opt = {

        margin:       10,

        filename:     `Laporan_Transloading_${containerNo}.pdf`,

        image:        { type: 'jpeg', quality: 0.98 },

        html2canvas:  { scale: 2, useCORS: true, logging: false, allowTaint: true },

        jsPDF:        { unit: 'mm', format: [widthMm, heightMm], orientation: widthMm > heightMm ? 'l' : 'p' },

        pagebreak:    { mode: 'avoid-all' }

    };

    

    html2pdf().set(opt).from(element).save().then(() => {

        // Restore original styles

        diagram.setAttribute('style', originalDiagramStyle);

        truckNodes.forEach(n => {

            n.style.pageBreakInside = '';

            n.style.breakInside = '';

        });

    });

}









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

            container.innerHTML = `<div class="alert alert-error">Error loading: ${escapeHTML(result.error)}</div>`;

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

                        <div class="submission-ref">${escapeHTML(sub.ref_no)}</div>

                        <div class="submission-date">Submitted: ${formattedDate}</div>

                        <div class="submission-vessels">

                            <span class="vessel-tag">Vessel: ${escapeHTML(vessel1)}</span>

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



                const containerSealStr = items.map(i => `${i.container_no} / ${i.seal_no}`).join('\n');

                const weightsStr = items.map(i => i.weight).join('\n');



                let shippedDesc = `SHIPPER'S LOAD, COUNT & SEAL.\n${items.length}X CONTAINER S.T.C\n\n`;

                if (sub.vessel_name_1) {

                    shippedDesc += `SHIPPED ON BOARD : ${sub.vessel_name_1} V.${sub.voyage_1}\n`;

                    if (sub.etd_1) {

                        shippedDesc += `ETD: ${sub.etd_1}\n`;

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

                                                <td style="font-family: monospace; font-weight: bold; color: var(--color-primary);">${escapeHTML(item.container_no)}</td>

                                                <td style="font-family: monospace; color: var(--text-primary);">${escapeHTML(item.seal_no)}</td>

                                                <td style="font-weight: 500;">${escapeHTML(item.weight)}</td>

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

                                <textarea id="${id}-copy-containers" rows="3" readonly class="copy-preview">${escapeHTML(containerSealStr)}</textarea>

                            </div>



                            <div class="form-group" style="margin-bottom: 12px;">

                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom:4px;">

                                    <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">2. Cargo Measurement & Weight Column</label>

                                    <button class="btn btn-outline btn-sm" style="padding: 2px 8px; font-size: 0.7rem;" onclick="copyToClipboard('${id}-copy-weights')">📋 Copy</button>

                                </div>

                                <textarea id="${id}-copy-weights" rows="3" readonly class="copy-preview">${escapeHTML(weightsStr)}</textarea>

                            </div>



                            <div class="form-group" style="margin-bottom: 12px;">

                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom:4px;">

                                    <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">3. Vessel & Routing Description of Goods</label>

                                    <button class="btn btn-outline btn-sm" style="padding: 2px 8px; font-size: 0.7rem;" onclick="copyToClipboard('${id}-copy-description')">📋 Copy</button>

                                </div>

                                <textarea id="${id}-copy-description" rows="4" readonly class="copy-preview">${escapeHTML(shippedDesc)}</textarea>

                            </div>

                        </div>

                    </div>

                `;

            } else {

                panel.innerHTML = `<div style="color: var(--color-danger); padding: 10px;">Failed: ${escapeHTML(result.error)}</div>`;

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

                    <h3 class="voyage-name-title">${escapeHTML(v.voyage_name)}</h3>

                    <div class="voyage-details-row"><i class="fa fa-calendar"></i> Date: ${escapeHTML(v.voyage_date || 'N/A')}</div>

                    <div class="voyage-details-row"><i class="fa fa-clock"></i> Created: ${new Date(v.created_at).toLocaleDateString()}</div>

                </div>

                <div class="voyage-actions">

                    <div>

                        <button class="btn btn-primary btn-sm" onclick="openMovementGridEditor(${v.id})">

                            <i class="fa fa-edit"></i> Edit Grid

                        </button>

                        <button class="btn btn-outline btn-sm" onclick="openEditVoyageModal(${v.id}, '${escapeHTML(v.voyage_name)}', '${escapeHTML(v.voyage_date)}')">

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



    if (pasteData.includes('\t') || pasteData.includes('\n')) {

        e.preventDefault();

        

        const currentInput = e.target;

        const startRow = parseInt(currentInput.dataset.row);

        const startColIdx = MOVEMENT_COL_NAMES.indexOf(currentInput.dataset.col);

        const rows = pasteData.split(/\r?\n/);

        

        for (let r = 0; r < rows.length; r++) {

            const rowText = rows[r];

            if (r === rows.length - 1 && rowText.trim() === '') continue;

            

            const cells = rowText.split('\t');

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

