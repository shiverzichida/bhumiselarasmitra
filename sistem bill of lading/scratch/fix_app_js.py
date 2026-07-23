import os

app_path = "app.js"

with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace switchView cases
target_switch = """    } else if (viewName === 'trucking') {
        const navTruckingBtn = document.getElementById('nav-trucking-btn');
        if (navTruckingBtn) navTruckingBtn.classList.add('active');
        document.getElementById('page-title').textContent = 'Truck Monitoring';
        document.getElementById('page-subtitle').textContent = 'Monitoring transloading kontainer dan lansiran trucking trailer ke CDD';
        loadTruckingList();
    }
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
    }
}"""

# Normalise carriage returns to make sure it matches
content_norm = content.replace('\r\n', '\n')
target_switch_norm = target_switch.replace('\r\n', '\n')
replacement_switch_norm = replacement_switch.replace('\r\n', '\n')

if target_switch_norm in content_norm:
    content_norm = content_norm.replace(target_switch_norm, replacement_switch_norm)
    print("switchView replaced successfully in memory.")
else:
    # Try finding without trailing brace
    target_switch_alt = target_switch_norm[:-2]
    replacement_switch_alt = replacement_switch_norm[:-2]
    if target_switch_alt in content_norm:
        content_norm = content_norm.replace(target_switch_alt, replacement_switch_alt)
        print("switchView (alt) replaced successfully in memory.")
    else:
        print("Error: switchView target not found!")

# 2. Replace setupEventListeners click handlers
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

target_listeners_norm = target_listeners.replace('\r\n', '\n')
replacement_listeners_norm = replacement_listeners.replace('\r\n', '\n')

if target_listeners_norm in content_norm:
    content_norm = content_norm.replace(target_listeners_norm, replacement_listeners_norm)
    print("setupEventListeners replaced successfully in memory.")
else:
    print("Error: setupEventListeners target not found!")

# Write back to file with native carriage returns if needed
with open(app_path, "w", encoding="utf-8") as f:
    f.write(content_norm.replace('\n', '\r\n'))

print("File written back successfully!")
