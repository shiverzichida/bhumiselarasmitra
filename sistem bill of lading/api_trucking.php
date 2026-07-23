<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';

if (!$pdo) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database connection failed: " . $pdo_error]);
    exit();
}

// ---------------------------------------------------------------
// PUBLIC TOKEN-BASED ENDPOINTS (no login required)
// These must come BEFORE the auth check
// ---------------------------------------------------------------
$action_early = isset($_GET['action']) ? $_GET['action'] : '';

// Helper: fetch job by token
function fetchJobByToken($pdo, $token) {
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
    }
    return $job;
}

if ($action_early === 'get_by_token') {
    $token = isset($_GET['token']) ? trim($_GET['token']) : '';
    if (empty($token)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Token required"]);
        exit();
    }
    $job = fetchJobByToken($pdo, $token);
    if ($job) {
        echo json_encode(["success" => true, "data" => $job]);
    } else {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Job tidak ditemukan. Link mungkin tidak valid."]);
    }
    exit();
}

if ($action_early === 'save_by_token' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = isset($_GET['token']) ? trim($_GET['token']) : '';
    if (empty($token)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Token required"]);
        exit();
    }
    $job = fetchJobByToken($pdo, $token);
    if (!$job) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Job tidak ditemukan."]);
        exit();
    }
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    if (!$data) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Data tidak valid."]);
        exit();
    }
    $id = $job['id'];
    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("UPDATE trucking_jobs SET
            vessel_voyage = :vessel_voyage,
            container_no = :container_no,
            container_size = :container_size,
            commodity = :commodity,
            pic_name = :pic_name,
            company_name = :company_name,
            container_photo = :container_photo,
            origin_address = :origin_address,
            destination_address = :destination_address,
            total_weight = :total_weight
            WHERE id = :id");
        $stmt->execute([
            'vessel_voyage'      => $data['vessel_voyage'] ?? $job['vessel_voyage'],
            'container_no'       => $data['container_no'] ?? $job['container_no'],
            'container_size'     => $data['container_size'] ?? $job['container_size'],
            'commodity'          => $data['commodity'] ?? $job['commodity'],
            'pic_name'           => $data['pic_name'] ?? $job['pic_name'],
            'company_name'       => $data['company_name'] ?? $job['company_name'],
            'container_photo'    => $data['container_photo'] ?? $job['container_photo'],
            'origin_address'     => $data['origin_address'] ?? $job['origin_address'],
            'destination_address'=> $data['destination_address'] ?? $job['destination_address'],
            'total_weight'       => floatval($data['total_weight'] ?? $job['total_weight']),
            'id'                 => $id
        ]);
        // Save containers if provided
        $stmt_del_c = $pdo->prepare("DELETE FROM trucking_containers WHERE job_id = :job_id");
        $stmt_del_c->execute(['job_id' => $id]);
        
        $first_container_no = $job['container_no'];
        $first_container_size = $job['container_size'];
        $first_container_photo = $job['container_photo'];
        $total_calc_weight = 0;
        
        if (isset($data['containers']) && is_array($data['containers']) && count($data['containers']) > 0) {
            $stmt_cont = $pdo->prepare("INSERT INTO trucking_containers (job_id, container_no, container_size, weight, container_photo) VALUES (:job_id, :container_no, :container_size, :weight, :container_photo)");
            foreach ($data['containers'] as $idx => $cont) {
                if (!empty($cont['container_no'])) {
                    $cont_no = strtoupper($cont['container_no']);
                    $cont_sz = $cont['container_size'] ?? '20 GP';
                    $cont_wt = floatval($cont['weight'] ?? 0);
                    $cont_ph = $cont['container_photo'] ?? null;
                    
                    if ($idx === 0) {
                        $first_container_no = $cont_no;
                        $first_container_size = $cont_sz;
                        $first_container_photo = $cont_ph;
                    }
                    $total_calc_weight += $cont_wt;
                    
                    $stmt_cont->execute([
                        'job_id'          => $id,
                        'container_no'    => $cont_no,
                        'container_size'  => $cont_sz,
                        'weight'          => $cont_wt,
                        'container_photo' => $cont_ph
                    ]);
                }
            }
        } else {
            // Fallback: insert the single container from form
            $cont_no = strtoupper($data['container_no'] ?? $job['container_no']);
            $cont_sz = $data['container_size'] ?? $job['container_size'];
            $cont_wt = floatval($data['total_weight'] ?? $job['total_weight']);
            $cont_ph = $data['container_photo'] ?? $job['container_photo'];
            
            $first_container_no = $cont_no;
            $first_container_size = $cont_sz;
            $first_container_photo = $cont_ph;
            $total_calc_weight = $cont_wt;
            
            $stmt_cont = $pdo->prepare("INSERT INTO trucking_containers (job_id, container_no, container_size, weight, container_photo) VALUES (:job_id, :container_no, :container_size, :weight, :container_photo)");
            $stmt_cont->execute([
                'job_id'          => $id,
                'container_no'    => $cont_no,
                'container_size'  => $cont_sz,
                'weight'          => $cont_wt,
                'container_photo' => $cont_ph
            ]);
        }
        
        // Update main job with first container info and calculated total weight
        $stmt_main = $pdo->prepare("UPDATE trucking_jobs SET
            container_no = :container_no,
            container_size = :container_size,
            container_photo = :container_photo,
            total_weight = :total_weight
            WHERE id = :id");
        $stmt_main->execute([
            'container_no'    => $first_container_no,
            'container_size'  => $first_container_size,
            'container_photo' => $first_container_photo,
            'total_weight'    => $total_calc_weight,
            'id'              => $id
        ]);

        $stmt_del = $pdo->prepare("DELETE FROM trucking_allocations WHERE job_id = :job_id");
        $stmt_del->execute(['job_id' => $id]);
        if (isset($data['allocations']) && is_array($data['allocations'])) {
            $stmt_alloc = $pdo->prepare("INSERT INTO trucking_allocations (job_id, plate_no, driver_name, weight, truck_photo) VALUES (:job_id, :plate_no, :driver_name, :weight, :truck_photo)");
            foreach ($data['allocations'] as $alloc) {
                if (!empty($alloc['plate_no']) && !empty($alloc['driver_name']) && isset($alloc['weight'])) {
                    $stmt_alloc->execute([
                        'job_id'      => $id,
                        'plate_no'    => $alloc['plate_no'],
                        'driver_name' => $alloc['driver_name'],
                        'weight'      => floatval($alloc['weight']),
                        'truck_photo' => $alloc['truck_photo'] ?? null
                    ]);
                }
            }
        }
        $pdo->commit();
        echo json_encode(["success" => true, "message" => "Data berhasil disimpan."]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
    exit();
}

// Authentication Check (Matching api.php and api_kas.php)
$is_authenticated = false;
if (isset($_SERVER['PHP_AUTH_USER']) && isset($_SERVER['PHP_AUTH_PW'])) {
    if ($_SERVER['PHP_AUTH_USER'] === 'Nahel' && $_SERVER['PHP_AUTH_PW'] === 'Nahel@26') {
        $is_authenticated = true;
    }
}

if (!$is_authenticated) {
    $headers = getallheaders();
    $auth_header = '';
    if (isset($headers['Authorization'])) {
        $auth_header = $headers['Authorization'];
    } elseif (isset($headers['X-Authorization'])) {
        $auth_header = $headers['X-Authorization'];
    }
    if (!empty($auth_header) && strpos(strtolower($auth_header), 'basic ') === 0) {
        $creds = explode(':', base64_decode(substr($auth_header, 6)), 2);
        if (count($creds) === 2 && $creds[0] === 'Nahel' && $creds[1] === 'Nahel@26') {
            $is_authenticated = true;
        }
    }
}

if (!$is_authenticated) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Unauthorized"]);
    exit();
}

// Auto-Migration Check
try {
    $pdo->query("SELECT 1 FROM `trucking_jobs` LIMIT 1");
    
    // Check if new columns exist, alter table if they don't
    try {
        $pdo->query("SELECT pic_name FROM `trucking_jobs` LIMIT 1");
    } catch (PDOException $col_ex) {
        try {
            $pdo->exec("ALTER TABLE `trucking_jobs` ADD COLUMN `pic_name` VARCHAR(100) NULL AFTER `commodity`, ADD COLUMN `company_name` VARCHAR(100) NULL AFTER `pic_name`;");
        } catch (PDOException $alter_ex) {}
    }
    
    // Check if container_photo column exists, add it if missing
    try {
        $pdo->query("SELECT container_photo FROM `trucking_jobs` LIMIT 1");
    } catch (PDOException $col_ex) {
        try {
            $pdo->exec("ALTER TABLE `trucking_jobs` ADD COLUMN `container_photo` MEDIUMTEXT NULL AFTER `company_name`;");
        } catch (PDOException $alter_ex) {}
    }
    
    // Check if truck_photo column exists in allocations
    try {
        $pdo->query("SELECT truck_photo FROM `trucking_allocations` LIMIT 1");
    } catch (PDOException $col_ex) {
        try {
            $pdo->exec("ALTER TABLE `trucking_allocations` ADD COLUMN `truck_photo` MEDIUMTEXT NULL AFTER `weight`;");
        } catch (PDOException $alter_ex) {}
    }
    
    // Check if origin_address and destination_address columns exist
    try {
        $pdo->query("SELECT origin_address FROM `trucking_jobs` LIMIT 1");
    } catch (PDOException $col_ex) {
        try {
            $pdo->exec("ALTER TABLE `trucking_jobs` ADD COLUMN `origin_address` VARCHAR(255) NULL AFTER `container_photo`, ADD COLUMN `destination_address` VARCHAR(255) NULL AFTER `origin_address`;");
        } catch (PDOException $alter_ex) {}
    }
    
    // Check if access_token column exists
    try {
        $pdo->query("SELECT access_token FROM `trucking_jobs` LIMIT 1");
    } catch (PDOException $col_ex) {
        try {
            $pdo->exec("ALTER TABLE `trucking_jobs` ADD COLUMN `access_token` VARCHAR(32) NULL UNIQUE AFTER `destination_address`;");
            // Generate tokens for existing rows that have none
            $pdo->exec("UPDATE `trucking_jobs` SET access_token = LOWER(HEX(RANDOM_BYTES(16))) WHERE access_token IS NULL;");
        } catch (PDOException $alter_ex) {}
    }

    // Check if trucking_containers table exists, create if not
    try {
        $pdo->query("SELECT 1 FROM `trucking_containers` LIMIT 1");
    } catch (PDOException $ex) {
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS `trucking_containers` (
              `id` INT AUTO_INCREMENT PRIMARY KEY,
              `job_id` INT NOT NULL,
              `container_no` VARCHAR(50) NOT NULL,
              `container_size` VARCHAR(20) NOT NULL,
              `weight` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
              `container_photo` MEDIUMTEXT NULL,
              `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (`job_id`) REFERENCES `trucking_jobs`(`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
        } catch (PDOException $create_ex) {}
    }
} catch (PDOException $e) {
    // Tables don't exist yet, run the schema import
    $schemaFile = 'truck_monitoring_schema.sql';
    if (file_exists($schemaFile)) {
        try {
            $sql = file_get_contents($schemaFile);
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
            $pdo->exec($sql);
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
        } catch (PDOException $ex) {
            // Ignore or log error
        }
    }
}

$action = isset($_GET['action']) ? $_GET['action'] : 'list';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if ($action === 'list') {
        try {
            // Fetch all jobs
            $stmt = $pdo->query("SELECT * FROM trucking_jobs ORDER BY created_at DESC");
            $jobs = $stmt->fetchAll();
            
            // Fetch allocations and containers for each job
            foreach ($jobs as &$job) {
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
            }
            
            echo json_encode(["success" => true, "data" => $jobs]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        exit();
    }
    
    if ($action === 'get') {
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        try {
            $stmt = $pdo->prepare("SELECT * FROM trucking_jobs WHERE id = :id");
            $stmt->execute(['id' => $id]);
            $job = $stmt->fetch();
            
            if ($job) {
                $stmt_alloc = $pdo->prepare("SELECT * FROM trucking_allocations WHERE job_id = :job_id ORDER BY id ASC");
                $stmt_alloc->execute(['job_id' => $id]);
                $job['allocations'] = $stmt_alloc->fetchAll();

                $stmt_cont = $pdo->prepare("SELECT * FROM trucking_containers WHERE job_id = :job_id ORDER BY id ASC");
                $stmt_cont->execute(['job_id' => $id]);
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
                
                echo json_encode(["success" => true, "data" => $job]);
            } else {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Job not found"]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        exit();
    }
    
    if ($action === 'get_vessels_containers') {
        try {
            // Get unique vessels/voyages from bills_of_lading
            $stmt = $pdo->query("SELECT DISTINCT ocean_vessel, voy_no, cargo_containers FROM bills_of_lading ORDER BY ocean_vessel ASC");
            $results = $stmt->fetchAll();
            
            $vessel_voyages = [];
            $containers = [];
            
            foreach ($results as $row) {
                $vessel = trim($row['ocean_vessel']);
                $voy = trim($row['voy_no']);
                if (!empty($vessel)) {
                    $vv = $vessel . (!empty($voy) ? " - " . $voy : "");
                    if (!in_array($vv, $vessel_voyages)) {
                        $vessel_voyages[] = $vv;
                    }
                }
                
                // Parse container numbers
                $cargo = $row['cargo_containers'];
                if (!empty($cargo)) {
                    $lines = explode("\n", $cargo);
                    foreach ($lines as $line) {
                        $line = trim($line);
                        // Standard container format: 4 letters, 7 digits
                        if (preg_match('/([A-Za-z]{4}[0-9]{7})/', $line, $matches)) {
                            $c_no = strtoupper($matches[1]);
                            if (!in_array($c_no, $containers)) {
                                $containers[] = $c_no;
                            }
                        }
                    }
                }
            }
            
            sort($vessel_voyages);
            sort($containers);
            
            echo json_encode([
                "success" => true,
                "vessels" => $vessel_voyages,
                "containers" => $containers
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        exit();
    }
}

if ($method === 'POST' && $action === 'save') {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (!$data || empty($data['vessel_voyage']) || empty($data['container_no']) || empty($data['commodity']) || !isset($data['total_weight'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Required fields missing."]);
        exit();
    }
    
    $id = isset($data['id']) ? intval($data['id']) : 0;
    
    try {
        $pdo->beginTransaction();
        
        if ($id > 0) {
            // Update
            $stmt = $pdo->prepare("UPDATE trucking_jobs SET 
                vessel_voyage = :vessel_voyage,
                commodity = :commodity,
                pic_name = :pic_name,
                company_name = :company_name,
                origin_address = :origin_address,
                destination_address = :destination_address
                WHERE id = :id");
            $stmt->execute([
                'vessel_voyage' => $data['vessel_voyage'],
                'commodity' => $data['commodity'],
                'pic_name' => isset($data['pic_name']) ? $data['pic_name'] : null,
                'company_name' => isset($data['company_name']) ? $data['company_name'] : null,
                'origin_address' => isset($data['origin_address']) ? $data['origin_address'] : null,
                'destination_address' => isset($data['destination_address']) ? $data['destination_address'] : null,
                'id' => $id
            ]);
            
            // Delete old allocations & containers
            $stmt_del = $pdo->prepare("DELETE FROM trucking_allocations WHERE job_id = :job_id");
            $stmt_del->execute(['job_id' => $id]);
            
            $stmt_del_c = $pdo->prepare("DELETE FROM trucking_containers WHERE job_id = :job_id");
            $stmt_del_c->execute(['job_id' => $id]);
        } else {
            // Insert — auto-generate unique access_token
            $access_token = bin2hex(random_bytes(16));
            $stmt = $pdo->prepare("INSERT INTO trucking_jobs 
                (vessel_voyage, commodity, pic_name, company_name, origin_address, destination_address, access_token) 
                VALUES (:vessel_voyage, :commodity, :pic_name, :company_name, :origin_address, :destination_address, :access_token)");
            $stmt->execute([
                'vessel_voyage'       => $data['vessel_voyage'],
                'commodity'           => $data['commodity'],
                'pic_name'            => isset($data['pic_name']) ? $data['pic_name'] : null,
                'company_name'        => isset($data['company_name']) ? $data['company_name'] : null,
                'origin_address'      => isset($data['origin_address']) ? $data['origin_address'] : null,
                'destination_address' => isset($data['destination_address']) ? $data['destination_address'] : null,
                'access_token'        => $access_token
            ]);
            $id = $pdo->lastInsertId();
        }
        
        // Save containers and determine calculated total weight & first container info
        $first_container_no = '';
        $first_container_size = '20 GP';
        $first_container_photo = null;
        $total_calc_weight = 0;
        
        if (isset($data['containers']) && is_array($data['containers']) && count($data['containers']) > 0) {
            $stmt_cont = $pdo->prepare("INSERT INTO trucking_containers (job_id, container_no, container_size, weight, container_photo) VALUES (:job_id, :container_no, :container_size, :weight, :container_photo)");
            foreach ($data['containers'] as $idx => $cont) {
                if (!empty($cont['container_no'])) {
                    $cont_no = strtoupper($cont['container_no']);
                    $cont_sz = $cont['container_size'] ?? '20 GP';
                    $cont_wt = floatval($cont['weight'] ?? 0);
                    $cont_ph = $cont['container_photo'] ?? null;
                    
                    if ($idx === 0) {
                        $first_container_no = $cont_no;
                        $first_container_size = $cont_sz;
                        $first_container_photo = $cont_ph;
                    }
                    $total_calc_weight += $cont_wt;
                    
                    $stmt_cont->execute([
                        'job_id'          => $id,
                        'container_no'    => $cont_no,
                        'container_size'  => $cont_sz,
                        'weight'          => $cont_wt,
                        'container_photo' => $cont_ph
                    ]);
                }
            }
        } else {
            // Fallback for single container request
            $cont_no = strtoupper($data['container_no'] ?? '');
            $cont_sz = $data['container_size'] ?? '20 GP';
            $cont_wt = floatval($data['total_weight'] ?? 0);
            $cont_ph = $data['container_photo'] ?? null;
            
            $first_container_no = $cont_no;
            $first_container_size = $cont_sz;
            $first_container_photo = $cont_ph;
            $total_calc_weight = $cont_wt;
            
            $stmt_cont = $pdo->prepare("INSERT INTO trucking_containers (job_id, container_no, container_size, weight, container_photo) VALUES (:job_id, :container_no, :container_size, :weight, :container_photo)");
            $stmt_cont->execute([
                'job_id'          => $id,
                'container_no'    => $cont_no,
                'container_size'  => $cont_sz,
                'weight'          => $cont_wt,
                'container_photo' => $cont_ph
            ]);
        }
        
        // Write back first container info and calculated total weight to main job table for backward compatibility
        $stmt_main = $pdo->prepare("UPDATE trucking_jobs SET
            container_no = :container_no,
            container_size = :container_size,
            container_photo = :container_photo,
            total_weight = :total_weight
            WHERE id = :id");
        $stmt_main->execute([
            'container_no'    => $first_container_no,
            'container_size'  => $first_container_size,
            'container_photo' => $first_container_photo,
            'total_weight'    => $total_calc_weight,
            'id'              => $id
        ]);
        
        // Insert new allocations
        if (isset($data['allocations']) && is_array($data['allocations'])) {
            $stmt_alloc = $pdo->prepare("INSERT INTO trucking_allocations 
                (job_id, plate_no, driver_name, weight, truck_photo) 
                VALUES (:job_id, :plate_no, :driver_name, :weight, :truck_photo)");
            
            foreach ($data['allocations'] as $alloc) {
                if (!empty($alloc['plate_no']) && !empty($alloc['driver_name']) && isset($alloc['weight'])) {
                    $stmt_alloc->execute([
                        'job_id' => $id,
                        'plate_no' => $alloc['plate_no'],
                        'driver_name' => $alloc['driver_name'],
                        'weight' => floatval($alloc['weight']),
                        'truck_photo' => isset($alloc['truck_photo']) ? $alloc['truck_photo'] : null
                    ]);
                }
            }
        }
        
        $pdo->commit();
        echo json_encode(["success" => true, "message" => "Trucking job saved successfully.", "id" => $id]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
    exit();
}

if ($method === 'DELETE' && $action === 'delete') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    try {
        $stmt = $pdo->prepare("DELETE FROM trucking_jobs WHERE id = :id");
        $stmt->execute(['id' => $id]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(["success" => true, "message" => "Trucking job deleted successfully."]);
        } else {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Job not found."]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
    exit();
}
