<?php
// truck_access.php – Public edit page (no login required)
// Access via: truck_access.php?token=<access_token>
require_once 'config.php';

$token = isset($_GET['token']) ? trim($_GET['token']) : '';
$job = null;
$error = '';

if (empty($token)) {
    $error = 'Link tidak valid. Token tidak ditemukan.';
} else {
    try {
        $stmt = $pdo->prepare("SELECT * FROM trucking_jobs WHERE access_token = :token");
        $stmt->execute(['token' => $token]);
        $job = $stmt->fetch();
        if ($job) {
            $stmt_alloc = $pdo->prepare("SELECT * FROM trucking_allocations WHERE job_id = :job_id ORDER BY id ASC");
            $stmt_alloc->execute(['job_id' => $job['id']]);
            $job['allocations'] = $stmt_alloc->fetchAll();
            
            $stmt_cont = $pdo->prepare("SELECT * FROM trucking_containers WHERE job_id = :job_id ORDER BY id ASC");
            $stmt_cont->execute(['job_id' => $job['id']]);
            $conts = $stmt_cont->fetchAll();
            if (count($conts) > 0) {
                $job['containers'] = $conts;
            } else {
                $job['containers'] = [
                    [
                        'id' => 0,
                        'job_id' => $job['id'],
                        'container_no' => $job['container_no'],
                        'container_size' => $job['container_size'],
                        'weight' => $job['total_weight'],
                        'container_photo' => $job['container_photo']
                    ]
                ];
            }
        } else {
            $error = 'Job tidak ditemukan. Link mungkin sudah tidak berlaku.';
        }
    } catch (PDOException $e) {
        $error = 'Gagal memuat data: ' . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <title>Edit Job Lansir – PT. Putera Utama Lautan</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
            --bg: #0f172a;
            --bg-card: #1e293b;
            --bg-input: #0f172a;
            --border: rgba(255,255,255,0.08);
            --text: #f1f5f9;
            --text-muted: #94a3b8;
            --primary: #6366f1;
            --primary-hover: #4f46e5;
            --success: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
            --radius: 10px;
        }
        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            padding: 16px;
        }
        .header {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 16px 20px;
            background: var(--bg-card);
            border-radius: var(--radius);
            border: 1px solid var(--border);
            margin-bottom: 20px;
        }
        .header-logo {
            width: 42px; height: 42px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Outfit', sans-serif;
            font-weight: 800; font-size: 0.9rem; color: white;
            flex-shrink: 0;
        }
        .header-title { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1rem; }
        .header-sub { font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; }
        .badge-access {
            margin-left: auto;
            background: rgba(16,185,129,0.15);
            color: #10b981;
            border: 1px solid rgba(16,185,129,0.3);
            padding: 4px 12px;
            border-radius: 50px;
            font-size: 0.72rem;
            font-weight: 600;
            white-space: nowrap;
        }
        .card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 20px;
            margin-bottom: 16px;
        }
        .card-title {
            font-family: 'Outfit', sans-serif;
            font-weight: 700;
            font-size: 1rem;
            color: var(--primary);
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
        }
        @media (max-width: 600px) {
            .form-grid { grid-template-columns: 1fr; }
            .form-grid.three { grid-template-columns: 1fr; }
        }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group.full { grid-column: 1 / -1; }
        label {
            font-size: 0.78rem;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        input[type="text"], input[type="number"], select {
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text);
            padding: 10px 14px;
            font-size: 0.9rem;
            font-family: 'Inter', sans-serif;
            width: 100%;
            transition: border-color 0.2s;
        }
        input:focus, select:focus {
            outline: none;
            border-color: var(--primary);
        }
        select option { background: #1e293b; }

        /* Container dynamic rows */
        .cont-header {
            display: grid;
            grid-template-columns: 1.2fr 1.2fr 0.8fr 1.2fr auto;
            gap: 8px;
            padding: 8px 12px;
            background: rgba(16,185,129,0.08);
            border-radius: 8px;
            margin-bottom: 8px;
        }
        .cont-header span { font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
        .cont-row {
            display: grid;
            grid-template-columns: 1.2fr 1.2fr 0.8fr 1.2fr auto;
            gap: 8px;
            margin-bottom: 12px;
            align-items: center;
        }
        .container-photo-zone {
            border: 2px dashed var(--border);
            border-radius: 8px;
            height: 52px;
            cursor: pointer;
            color: var(--text-muted);
            font-size: 0.68rem;
            display: flex; align-items: center; justify-content: center;
            position: relative;
            overflow: hidden;
            transition: border-color 0.2s, background 0.2s;
            text-align: center;
        }
        .container-photo-zone.paste-target {
            border-color: var(--success);
            background: rgba(16,185,129,0.07);
            box-shadow: 0 0 0 2px rgba(16,185,129,0.25);
        }
        .container-photo-zone img { width:100%; height:100%; object-fit:cover; position:absolute; inset:0; }
        @media (max-width: 600px) {
            .cont-header { display: none; }
            .cont-row {
                grid-template-columns: 1fr 1fr;
                background: rgba(255,255,255,0.02);
                border: 1px solid var(--border);
                border-radius: 8px;
                padding: 10px;
                row-gap: 10px;
            }
            .cont-row .container-photo-zone { grid-column: 1 / -1; height: 70px; }
            .cont-row .btn-remove-cont { grid-column: 1 / -1; }
        }

        /* Allocation rows */
        .alloc-header {
            display: grid;
            grid-template-columns: 1fr 1fr 90px 120px auto;
            gap: 8px;
            padding: 8px 12px;
            background: rgba(99,102,241,0.08);
            border-radius: 8px;
            margin-bottom: 8px;
        }
        .alloc-header span { font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
        .alloc-row {
            display: grid;
            grid-template-columns: 1fr 1fr 90px 120px auto;
            gap: 8px;
            margin-bottom: 12px;
            align-items: center;
        }
        .truck-photo-zone {
            border: 2px dashed var(--border);
            border-radius: 8px;
            height: 52px;
            cursor: pointer;
            color: var(--text-muted);
            font-size: 0.68rem;
            display: flex; align-items: center; justify-content: center;
            position: relative;
            overflow: hidden;
            transition: border-color 0.2s, background 0.2s;
            text-align: center;
        }
        .truck-photo-zone.paste-target {
            border-color: var(--primary);
            background: rgba(99,102,241,0.07);
            box-shadow: 0 0 0 2px rgba(99,102,241,0.25);
        }
        .truck-photo-zone img { width:100%; height:100%; object-fit:cover; position:absolute; inset:0; }
        @media (max-width: 600px) {
            .alloc-header { display: none; }
            .alloc-row {
                grid-template-columns: 1fr 1fr;
                background: rgba(255,255,255,0.02);
                border: 1px solid var(--border);
                border-radius: 8px;
                padding: 10px;
                row-gap: 10px;
            }
            .alloc-row .truck-photo-zone { grid-column: 1 / -1; height: 70px; }
            .alloc-row .btn-remove-alloc { grid-column: 1 / -1; }
        }
        .btn {
            display: inline-flex; align-items: center; justify-content: center;
            gap: 6px; padding: 10px 18px; border: none; border-radius: 8px;
            font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.875rem;
            cursor: pointer; transition: all 0.2s;
        }
        .btn-primary { background: var(--primary); color: white; }
        .btn-primary:hover { background: var(--primary-hover); }
        .btn-success { background: var(--success); color: white; }
        .btn-success:hover { background: #059669; }
        .btn-danger { background: var(--danger); color: white; }
        .btn-danger:hover { background: #dc2626; }
        .btn-ghost {
            background: rgba(255,255,255,0.05);
            color: var(--text-muted);
            border: 1px solid var(--border);
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.09); }
        .btn-sm { padding: 6px 10px; font-size: 0.78rem; }
        .btn-full { width: 100%; }

        .error-page {
            text-align: center;
            padding: 60px 20px;
        }
        .error-page i { font-size: 3rem; color: var(--danger); margin-bottom: 16px; }
        .error-page h2 { font-family: 'Outfit', sans-serif; font-size: 1.4rem; margin-bottom: 8px; }
        .error-page p { color: var(--text-muted); font-size: 0.9rem; }
        .save-bar {
            position: sticky;
            bottom: 0;
            background: var(--bg-card);
            border-top: 1px solid var(--border);
            padding: 14px 20px;
            display: flex;
            gap: 12px;
            align-items: center;
            margin: 0 -16px -16px;
            z-index: 100;
        }
        .save-bar .status { flex: 1; font-size: 0.82rem; color: var(--text-muted); }
    </style>
</head>
<body>

<div class="header">
    <div class="header-logo">PUL</div>
    <div>
        <div class="header-title">PT. Putera Utama Lautan</div>
        <div class="header-sub">Edit Job Monitoring Trucking</div>
    </div>
    <span class="badge-access"><i class="fas fa-link" style="margin-right:4px;"></i>Link Akses</span>
</div>

<?php if ($error): ?>
<div class="card error-page">
    <i class="fas fa-exclamation-triangle"></i>
    <h2>Link Tidak Valid</h2>
    <p><?= htmlspecialchars($error) ?></p>
</div>
<?php else: ?>

<form id="access-form">
    <input type="hidden" id="job-id" value="<?= $job['id'] ?>">

    <!-- Info Utama -->
    <div class="card">
        <div class="card-title"><i class="fas fa-info-circle"></i> Info Utama Job</div>
        <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
            <div class="form-group">
                <label>Vessel / Voyage *</label>
                <input type="text" id="f-vessel" required value="<?= htmlspecialchars($job['vessel_voyage']) ?>">
            </div>
            <div class="form-group">
                <label>Komoditas / Cargo *</label>
                <input type="text" id="f-commodity" required value="<?= htmlspecialchars($job['commodity']) ?>">
            </div>
            <div class="form-group">
                <label>Nama PIC *</label>
                <input type="text" id="f-pic" required value="<?= htmlspecialchars($job['pic_name'] ?? '') ?>">
            </div>
            <div class="form-group">
                <label>Perusahaan *</label>
                <input type="text" id="f-company" required value="<?= htmlspecialchars($job['company_name'] ?? '') ?>">
            </div>
            <div class="form-group">
                <label><i class="fas fa-map-marker-alt" style="color:#10b981;"></i> Alamat Asal</label>
                <input type="text" id="f-origin" value="<?= htmlspecialchars($job['origin_address'] ?? '') ?>" placeholder="Pelabuhan / Gudang asal">
            </div>
            <div class="form-group">
                <label><i class="fas fa-map-marker-alt" style="color:#ef4444;"></i> Alamat Tujuan</label>
                <input type="text" id="f-destination" value="<?= htmlspecialchars($job['destination_address'] ?? '') ?>" placeholder="Gudang / Lokasi tujuan">
            </div>
            <div class="form-group">
                <label>Total Berat Gabungan (kg)</label>
                <input type="number" id="f-weight" readonly style="background-color: rgba(255,255,255,0.05); cursor: not-allowed;" value="<?= (int)$job['total_weight'] ?>">
            </div>
        </div>
    </div>

    <!-- Daftar Kontainer -->
    <div class="card">
        <div class="card-title" style="justify-content: space-between;">
            <span><i class="fas fa-ship"></i> Daftar Kontainer</span>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-add-container">
                <i class="fas fa-plus"></i> Tambah Kontainer
            </button>
        </div>
        <div class="cont-header">
            <span>No. Container</span><span>Ukuran</span><span>Berat (kg)</span><span>Foto Trailer</span><span></span>
        </div>
        <div id="container-body">
            <?php foreach ($job['containers'] as $idx => $cont): ?>
            <div class="cont-row" data-idx="<?= $idx ?>">
                <input type="text" class="c-no" placeholder="Contoh: SEGU1234567" style="text-transform: uppercase;" value="<?= htmlspecialchars($cont['container_no']) ?>">
                <select class="c-size">
                    <?php
                    $sizes = ['20 GP','40 HC','20 RF','40 RF','40 GP','45 HC','20 OT','40 OT','20 FR','40 FR'];
                    foreach ($sizes as $s) {
                        $sel = ($cont['container_size'] === $s) ? 'selected' : '';
                        echo "<option value=\"$s\" $sel>$s</option>";
                    }
                    ?>
                </select>
                <input type="number" class="c-weight" placeholder="25000" min="1" step="1" value="<?= (int)$cont['weight'] ?>">
                <div class="container-photo-zone" title="Klik atau aktifkan lalu Ctrl+V">
                    <?php if (!empty($cont['container_photo'])): ?>
                    <img src="<?= $cont['container_photo'] ?>" alt="Container Photo">
                    <?php else: ?>
                    <span><i class="fas fa-camera"></i><br>Foto Trailer</span>
                    <?php endif; ?>
                </div>
                <input type="hidden" class="c-photo" value="<?= !empty($cont['container_photo']) ? htmlspecialchars($cont['container_photo']) : '' ?>">
                <button type="button" class="btn btn-danger btn-sm btn-remove-cont"><i class="fas fa-times"></i></button>
            </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Alokasi Truck -->
    <div class="card">
        <div class="card-title" style="justify-content: space-between;">
            <span><i class="fas fa-truck"></i> Alokasi Truck CDD</span>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-add-truck">
                <i class="fas fa-plus"></i> Tambah Truck
            </button>
        </div>
        <div class="alloc-header">
            <span>No. Plat</span><span>Nama Driver</span><span>Beban (kg)</span><span>Foto Truck</span><span></span>
        </div>
        <div id="alloc-body">
            <?php foreach ($job['allocations'] as $idx => $alloc): ?>
            <div class="alloc-row" data-idx="<?= $idx ?>">
                <input type="text" class="a-plate" placeholder="KB 1234 XX" style="text-transform: uppercase;" value="<?= htmlspecialchars($alloc['plate_no']) ?>">
                <input type="text" class="a-driver" placeholder="Nama Driver" value="<?= htmlspecialchars($alloc['driver_name']) ?>">
                <input type="number" class="a-weight" placeholder="0" step="1" value="<?= (int)$alloc['weight'] ?>">
                <div class="truck-photo-zone" title="Klik atau aktifkan lalu Ctrl+V">
                    <?php if (!empty($alloc['truck_photo'])): ?>
                    <img src="<?= $alloc['truck_photo'] ?>" alt="Truck Photo">
                    <?php else: ?>
                    <span><i class="fas fa-camera"></i><br>Foto Truck</span>
                    <?php endif; ?>
                </div>
                <input type="hidden" class="a-photo" value="<?= !empty($alloc['truck_photo']) ? htmlspecialchars($alloc['truck_photo']) : '' ?>">
                <button type="button" class="btn btn-danger btn-sm btn-remove-alloc"><i class="fas fa-times"></i></button>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</form>

<div class="save-bar">
    <span class="status" id="save-status">Siap menyimpan...</span>
    <button type="button" class="btn btn-success" id="btn-save">
        <i class="fas fa-save"></i> Simpan Perubahan
    </button>
</div>

<script>
const TOKEN = '<?= htmlspecialchars($token) ?>';
const API = 'api_trucking.php';

let activePhotoZone = null; // tracking active paste zone element

// Recalculate combined weight
function calculateTotalWeight() {
    let total = 0;
    document.querySelectorAll('#container-body .c-weight').forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    document.getElementById('f-weight').value = total;
}

// Bind photo zone click + paste helper
function bindPhotoZone(zone, hiddenInput, type) {
    zone.addEventListener('click', () => {
        document.querySelectorAll('.container-photo-zone, .truck-photo-zone').forEach(z => z.classList.remove('paste-target'));
        zone.classList.add('paste-target');
        activePhotoZone = { zone, hiddenInput };

        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = e => compressAndSet(e.target.files[0], zone, hiddenInput);
        inp.click();
    });
}

function compressAndSet(file, zone, hiddenInput) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const max = 800;
            let w = img.width, h = img.height;
            if (w > max) { h = Math.round(h * max / w); w = max; }
            if (h > max) { w = Math.round(w * max / h); h = max; }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
            hiddenInput.value = dataUrl;
            zone.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">`;
            zone.classList.remove('paste-target');
            if (activePhotoZone && activePhotoZone.zone === zone) activePhotoZone = null;
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

// Global paste router
document.addEventListener('paste', e => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            if (activePhotoZone) {
                compressAndSet(item.getAsFile(), activePhotoZone.zone, activePhotoZone.hiddenInput);
            }
            break;
        }
    }
});

// Dynamic Container Actions
document.getElementById('btn-add-container').addEventListener('click', () => {
    const body = document.getElementById('container-body');
    const row = document.createElement('div');
    row.className = 'cont-row';
    row.innerHTML = `
        <input type="text" class="c-no" placeholder="Contoh: SEGU1234567" style="text-transform: uppercase;">
        <select class="c-size">
            <option value="20 GP">20 GP</option>
            <option value="40 HC" selected>40 HC</option>
            <option value="20 RF">20 RF</option>
            <option value="40 RF">40 RF</option>
            <option value="40 GP">40 GP</option>
            <option value="45 HC">45 HC</option>
            <option value="20 OT">20 OT</option>
            <option value="40 OT">40 OT</option>
            <option value="20 FR">20 FR</option>
            <option value="40 FR">40 FR</option>
        </select>
        <input type="number" class="c-weight" placeholder="25000" min="1" step="1" value="0">
        <div class="container-photo-zone" title="Klik atau aktifkan lalu Ctrl+V">
            <span><i class="fas fa-camera"></i><br>Foto Trailer</span>
        </div>
        <input type="hidden" class="c-photo" value="">
        <button type="button" class="btn btn-danger btn-sm btn-remove-cont"><i class="fas fa-times"></i></button>
    `;
    body.appendChild(row);
    
    // Bind uppercase
    row.querySelector('.c-no').addEventListener('input', e => {
        e.target.value = e.target.value.toUpperCase();
    });
    
    // Bind weight change listener
    row.querySelector('.c-weight').addEventListener('input', calculateTotalWeight);
    
    // Bind remove
    row.querySelector('.btn-remove-cont').addEventListener('click', () => {
        row.remove();
        calculateTotalWeight();
    });

    bindPhotoZone(row.querySelector('.container-photo-zone'), row.querySelector('.c-photo'), 'container');
    calculateTotalWeight();

    // Auto-focus and scroll new container row into view
    const firstInput = row.querySelector('input');
    if (firstInput) {
        firstInput.focus();
        firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});

// Dynamic Truck Actions
document.getElementById('btn-add-truck').addEventListener('click', () => {
    const body = document.getElementById('alloc-body');
    const row = document.createElement('div');
    row.className = 'alloc-row';
    row.innerHTML = `
        <input type="text" class="a-plate" placeholder="KB 1234 XX" style="text-transform: uppercase;">
        <input type="text" class="a-driver" placeholder="Nama Driver">
        <input type="number" class="a-weight" placeholder="0" step="1" value="0">
        <div class="truck-photo-zone" title="Klik atau aktifkan lalu Ctrl+V">
            <span><i class="fas fa-camera"></i><br>Foto Truck</span>
        </div>
        <input type="hidden" class="a-photo" value="">
        <button type="button" class="btn btn-danger btn-sm btn-remove-alloc"><i class="fas fa-times"></i></button>
    `;
    body.appendChild(row);
    
    row.querySelector('.a-plate').addEventListener('input', e => {
        e.target.value = e.target.value.toUpperCase();
    });

    row.querySelector('.btn-remove-alloc').addEventListener('click', () => row.remove());
    bindPhotoZone(row.querySelector('.truck-photo-zone'), row.querySelector('.a-photo'), 'truck');

    // Auto-focus and scroll new truck row into view
    const firstInput = row.querySelector('input');
    if (firstInput) {
        firstInput.focus();
        firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});

// Bind existing container rows
document.querySelectorAll('#container-body .cont-row').forEach(row => {
    row.querySelector('.c-no').addEventListener('input', e => {
        e.target.value = e.target.value.toUpperCase();
    });
    row.querySelector('.c-weight').addEventListener('input', calculateTotalWeight);
    row.querySelector('.btn-remove-cont').addEventListener('click', () => {
        row.remove();
        calculateTotalWeight();
    });
    bindPhotoZone(row.querySelector('.container-photo-zone'), row.querySelector('.c-photo'), 'container');
});

// Bind existing truck rows
document.querySelectorAll('#alloc-body .alloc-row').forEach(row => {
    row.querySelector('.a-plate').addEventListener('input', e => {
        e.target.value = e.target.value.toUpperCase();
    });
    row.querySelector('.btn-remove-alloc').addEventListener('click', () => row.remove());
    bindPhotoZone(row.querySelector('.truck-photo-zone'), row.querySelector('.a-photo'), 'truck');
});

// Save Handler
document.getElementById('btn-save').addEventListener('click', async () => {
    const status = document.getElementById('save-status');
    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    status.textContent = 'Menyimpan...';

    // Gather containers
    const containers = [];
    let totalContainerWeight = 0;
    let hasEmptyContainers = false;
    document.querySelectorAll('#container-body .cont-row').forEach(row => {
        const contNo = row.querySelector('.c-no').value.trim().toUpperCase();
        const contSize = row.querySelector('.c-size').value;
        const contWeight = parseFloat(row.querySelector('.c-weight').value) || 0;
        const contPhoto = row.querySelector('.c-photo').value;
        if (contNo && contWeight > 0) {
            containers.push({ container_no: contNo, container_size: contSize, weight: contWeight, container_photo: contPhoto || null });
            totalContainerWeight += contWeight;
        } else {
            hasEmptyContainers = true;
        }
    });

    if (containers.length === 0 || hasEmptyContainers) {
        Swal.fire('Error', 'Harap isi nomor kontainer dan berat kontainer dengan benar.', 'error');
        btn.disabled = false;
        status.textContent = 'Gagal menyimpan.';
        return;
    }

    // Gather allocations
    const allocations = [];
    let totalTruckWeight = 0;
    let hasEmptyFields = false;
    document.querySelectorAll('#alloc-body .alloc-row').forEach(row => {
        const plate = row.querySelector('.a-plate').value.trim().toUpperCase();
        const driver = row.querySelector('.a-driver').value.trim();
        const weight = parseFloat(row.querySelector('.a-weight').value) || 0;
        const photo = row.querySelector('.a-photo').value;
        if (plate && driver && weight > 0) {
            allocations.push({ plate_no: plate, driver_name: driver, weight, truck_photo: photo || null });
            totalTruckWeight += weight;
        } else {
            hasEmptyFields = true;
        }
    });

    if (allocations.length === 0 || hasEmptyFields) {
        Swal.fire('Error', 'Harap isi plat nomor, driver, dan beban truck alokasi dengan benar.', 'error');
        btn.disabled = false;
        status.textContent = 'Gagal menyimpan.';
        return;
    }

    // Validate balance warning
    const diff = Math.abs(totalTruckWeight - totalContainerWeight);
    if (diff > 0.01) {
        const confirmResult = await Swal.fire({
            title: 'Konfirmasi Alokasi Muatan',
            text: `Total alokasi muatan truck (${totalTruckWeight.toLocaleString('id-ID')} kg) tidak sama dengan total berat kontainer (${totalContainerWeight.toLocaleString('id-ID')} kg). Apakah Anda ingin tetap melanjutkan?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, Tetap Simpan',
            cancelButtonText: 'Batal'
        });
        
        if (!confirmResult.isConfirmed) {
            btn.disabled = false;
            status.textContent = 'Siap menyimpan...';
            return;
        }
    }

    const payload = {
        vessel_voyage:       document.getElementById('f-vessel').value.trim(),
        commodity:           document.getElementById('f-commodity').value.trim(),
        pic_name:            document.getElementById('f-pic').value.trim(),
        company_name:        document.getElementById('f-company').value.trim(),
        origin_address:      document.getElementById('f-origin').value.trim(),
        destination_address: document.getElementById('f-destination').value.trim(),
        total_weight:        totalContainerWeight,
        containers,
        allocations
    };

    try {
        const res = await fetch(`${API}?action=save_by_token&token=${TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
            status.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;margin-right:4px;"></i> Tersimpan!';
            Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Data job lansir berhasil disimpan.', timer: 2000, showConfirmButton: false });
        } else {
            status.textContent = 'Gagal: ' + json.error;
            Swal.fire({ icon: 'error', title: 'Gagal menyimpan', text: json.error });
        }
    } catch(e) {
        status.textContent = 'Error koneksi.';
        Swal.fire({ icon: 'error', title: 'Error', text: e.message });
    }
    btn.disabled = false;
});
</script>

<?php endif; ?>
</body>
</html>
