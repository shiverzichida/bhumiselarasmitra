<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';

// If database connection failed, return error (except for login action)
if (!$pdo && (!isset($_GET['action']) || $_GET['action'] !== 'login')) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database connection failed: " . $pdo_error,
        "debug_hint" => "Please check your database credentials in config.php and make sure MySQL is running."
    ]);
    exit();
}

// Helper to get client IP
function get_client_ip() {
    $ipaddress = '';
    if (isset($_SERVER['HTTP_CLIENT_IP']))
        $ipaddress = $_SERVER['HTTP_CLIENT_IP'];
    else if(isset($_SERVER['HTTP_X_FORWARDED_FOR']))
        $ipaddress = $_SERVER['HTTP_X_FORWARDED_FOR'];
    else if(isset($_SERVER['HTTP_X_FORWARDED']))
        $ipaddress = $_SERVER['HTTP_X_FORWARDED'];
    else if(isset($_SERVER['HTTP_FORWARDED_FOR']))
        $ipaddress = $_SERVER['HTTP_FORWARDED_FOR'];
    else if(isset($_SERVER['HTTP_FORWARDED']))
        $ipaddress = $_SERVER['HTTP_FORWARDED'];
    else if(isset($_SERVER['REMOTE_ADDR']))
        $ipaddress = $_SERVER['REMOTE_ADDR'];
    else
        $ipaddress = 'UNKNOWN';
    return $ipaddress;
}

// Authentication helper
$is_authenticated = false;
if (isset($_SERVER['PHP_AUTH_USER']) && isset($_SERVER['PHP_AUTH_PW'])) {
    if ($_SERVER['PHP_AUTH_USER'] === 'Nahel' && $_SERVER['PHP_AUTH_PW'] === 'Nahel@26') {
        $is_authenticated = true;
    }
}

// Fallback manual check for Apache CGI stripping headers
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

// Helper to verify share slug updates
function is_share_slug_valid($pdo, $id, $slug) {
    if (empty($id) || empty($slug)) return false;
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM bills_of_lading WHERE id = :id AND share_slug = :slug");
        $stmt->execute(['id' => $id, 'slug' => $slug]);
        return $stmt->fetchColumn() > 0;
    } catch (PDOException $e) {
        return false;
    }
}

// Helper to get the latest custom device label from database history
function get_latest_device_label($pdo, $device_id, $default_label) {
    if (empty($device_id)) return $default_label;
    try {
        $stmt = $pdo->prepare("SELECT device_label FROM history_logs WHERE device_id = :device_id AND device_label IS NOT NULL AND device_label != '' ORDER BY created_at DESC LIMIT 1");
        $stmt->execute(['device_id' => $device_id]);
        $label = $stmt->fetchColumn();
        return $label ? $label : $default_label;
    } catch (PDOException $e) {
        return $default_label;
    }
}

// Handle Autocomplete Recommendations (saved_parties)
if (isset($_GET['action'])) {
    $action = $_GET['action'];
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get_parties') {
        try {
            $stmt = $pdo->query("SELECT * FROM saved_parties ORDER BY name ASC");
            $parties = $stmt->fetchAll();
            echo json_encode(["success" => true, "data" => $parties]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
        }
        exit();
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get_history') {
        if (!$is_authenticated) {
            http_response_code(401);
            echo json_encode(["success" => false, "error" => "Unauthorized"]);
            exit();
        }
        try {
            $stmt = $pdo->query("SELECT * FROM history_logs ORDER BY created_at DESC LIMIT 200");
            $logs = $stmt->fetchAll();
            echo json_encode(["success" => true, "data" => $logs]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
        }
        exit();
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'rename_device') {
        if (!$is_authenticated) {
            http_response_code(401);
            echo json_encode(["success" => false, "error" => "Unauthorized"]);
            exit();
        }
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);
        
        if (!$data || !isset($data['device_id']) || !isset($data['device_label'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid input. Device ID and Device Label are required."]);
            exit();
        }
        
        try {
            $stmt = $pdo->prepare("UPDATE history_logs SET device_label = :device_label WHERE device_id = :device_id");
            $stmt->execute([
                'device_id' => $data['device_id'],
                'device_label' => $data['device_label']
            ]);
            echo json_encode(["success" => true, "message" => "Device renamed successfully."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
        }
        exit();
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);
        
        if (!$data || !isset($data['username']) || !isset($data['password'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Username and password are required."]);
            exit();
        }
        
        if ($data['username'] === 'Nahel' && $data['password'] === 'Nahel@26') {
            echo json_encode(["success" => true, "message" => "Login successful."]);
        } else {
            http_response_code(401);
            echo json_encode(["success" => false, "error" => "Invalid username or password."]);
        }
        exit();
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'save_party') {
        if (!$is_authenticated) {
            http_response_code(401);
            echo json_encode(["success" => false, "error" => "Unauthorized"]);
            exit();
        }
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);
        
        if (!$data || !isset($data['type']) || !isset($data['name']) || !isset($data['address'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid input. Type, name, and address are required."]);
            exit();
        }
        
        try {
            $stmt = $pdo->prepare("INSERT INTO saved_parties (`type`, `name`, `address`) VALUES (:type, :name, :address) 
                ON DUPLICATE KEY UPDATE `address` = :address_update");
            $stmt->execute([
                'type' => $data['type'],
                'name' => $data['name'],
                'address' => $data['address'],
                'address_update' => $data['address']
            ]);
            echo json_encode(["success" => true, "message" => "Party saved successfully."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
        }
        exit();
    }
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['slug'])) {
            // Get single B/L by share_slug - Allowed without auth
            $stmt = $pdo->prepare("SELECT * FROM bills_of_lading WHERE share_slug = :slug");
            $stmt->execute(['slug' => $_GET['slug']]);
            $result = $stmt->fetch();
            
            if ($result) {
                echo json_encode(["success" => true, "data" => $result]);
            } else {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Bill of Lading not found."]);
            }
        } else {
            // All other GET actions (list, single by ID) require authentication
            if (!$is_authenticated) {
                http_response_code(401);
                echo json_encode(["success" => false, "error" => "Unauthorized"]);
                exit();
            }

            if (isset($_GET['id'])) {
                // Get single B/L
                $stmt = $pdo->prepare("SELECT * FROM bills_of_lading WHERE id = :id");
                $stmt->execute(['id' => $_GET['id']]);
                $result = $stmt->fetch();
                
                if ($result) {
                    echo json_encode(["success" => true, "data" => $result]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "Bill of Lading not found."]);
                }
            } else {
                // Get all B/L items
                $stmt = $pdo->query("SELECT * FROM bills_of_lading ORDER BY bl_no DESC");
                $results = $stmt->fetchAll();
                echo json_encode(["success" => true, "data" => $results]);
            }
        }
        break;

    case 'POST':
        // Get JSON body input
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        // Check if it is a valid share update
        $is_share_update = false;
        if ($data && isset($data['id']) && isset($data['share_slug']) && !empty($data['share_slug'])) {
            if (is_share_slug_valid($pdo, $data['id'], $data['share_slug'])) {
                $is_share_update = true;
            }
        }

        if (!$is_authenticated && !$is_share_update) {
            http_response_code(401);
            echo json_encode(["success" => false, "error" => "Unauthorized"]);
            exit();
        }

        if (!$data || !isset($data['bl_no']) || !isset($data['booking_no'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid input data. B/L Number and Booking Number are required."]);
            exit();
        }

        $id = isset($data['id']) && !empty($data['id']) ? $data['id'] : 'id_' . time() . '_' . rand(100, 999);

        // Check if record exists
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM bills_of_lading WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $exists = $stmt->fetchColumn() > 0;

        $fields = [
            'booking_no', 'bl_no', 'shipper', 'consignee', 'notify_party', 'delivery_agent',
            'pre_carriage', 'ocean_vessel', 'voy_no', 'place_of_receipt', 'port_of_loading',
            'port_of_discharge', 'place_of_delivery', 'cargo_containers', 'cargo_quantity',
            'cargo_description', 'cargo_measurement', 'freight_charges', 'revenue_tons',
            'rate', 'per', 'prepaid', 'collect', 'ex_rate', 'prepaid_at', 'payable_at',
            'place_date_issue', 'movement', 'no_of_original', 'signed_on_behalf', 'company_version',
            'share_slug', 'doc_type'
        ];

        $params = ['id' => $id];
        foreach ($fields as $field) {
            $val = isset($data[$field]) ? $data[$field] : '';
            if ($field === 'share_slug' && $val === '') {
                $val = null;
            }
            $params[$field] = $val;
        }

        $changed = [];
        if ($exists) {
            try {
                $stmt_old = $pdo->prepare("SELECT * FROM bills_of_lading WHERE id = :id");
                $stmt_old->execute(['id' => $id]);
                $old_data = $stmt_old->fetch();
                if ($old_data) {
                    foreach ($fields as $field) {
                        $old_val = isset($old_data[$field]) ? $old_data[$field] : '';
                        $new_val = isset($params[$field]) ? $params[$field] : '';
                        $old_val_norm = str_replace("\r\n", "\n", $old_val);
                        $new_val_norm = str_replace("\r\n", "\n", $new_val);
                        
                        if ($old_val_norm !== $new_val_norm) {
                            $changed[$field] = [
                                'old' => $old_val,
                                'new' => $new_val
                            ];
                        }
                    }
                }
            } catch (PDOException $e) {
                // Ignore comparison errors
            }
        }

        if ($exists) {
            // Update
            $sql = "UPDATE bills_of_lading SET ";
            $updates = [];
            foreach ($fields as $field) {
                $updates[] = "`$field` = :$field";
            }
            $sql .= implode(", ", $updates);
            $sql .= ", `last_modified` = CURRENT_TIMESTAMP WHERE id = :id";
            
            try {
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                
                // Log update action if fields actually changed
                if (!empty($changed)) {
                    $stmt_log = $pdo->prepare("INSERT INTO history_logs (bl_id, bl_no, action, changed_fields, ip_address, device_id, device_label) VALUES (:bl_id, :bl_no, :action, :changed_fields, :ip_address, :device_id, :device_label)");
                    $stmt_log->execute([
                        'bl_id' => $id,
                        'bl_no' => $data['bl_no'],
                        'action' => 'update',
                        'changed_fields' => json_encode($changed),
                        'ip_address' => get_client_ip(),
                        'device_id' => isset($data['device_id']) ? $data['device_id'] : null,
                        'device_label' => get_latest_device_label($pdo, isset($data['device_id']) ? $data['device_id'] : null, isset($data['device_label']) ? $data['device_label'] : null)
                    ]);
                }
                
                echo json_encode(["success" => true, "message" => "Bill of Lading updated successfully.", "id" => $id]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Database error during update: " . $e->getMessage()]);
            }
        } else {
            // Insert
            $columns = array_keys($params);
            $colNames = implode(", ", array_map(function($c) { return "`$c`"; }, $columns));
            $colPlaceholders = ":" . implode(", :", $columns);
            
            $sql = "INSERT INTO bills_of_lading ($colNames) VALUES ($colPlaceholders)";
            
            try {
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                
                // Log create/duplicate action
                $is_duplicate = (strpos(strtolower($data['bl_no']), 'copy of') === 0 || strpos(strtolower($data['bl_no']), 'copy ') === 0);
                $stmt_log = $pdo->prepare("INSERT INTO history_logs (bl_id, bl_no, action, changed_fields, ip_address, device_id, device_label) VALUES (:bl_id, :bl_no, :action, :changed_fields, :ip_address, :device_id, :device_label)");
                $stmt_log->execute([
                    'bl_id' => $id,
                    'bl_no' => $data['bl_no'],
                    'action' => $is_duplicate ? 'duplicate' : 'create',
                    'changed_fields' => null,
                    'ip_address' => get_client_ip(),
                    'device_id' => isset($data['device_id']) ? $data['device_id'] : null,
                    'device_label' => get_latest_device_label($pdo, isset($data['device_id']) ? $data['device_id'] : null, isset($data['device_label']) ? $data['device_label'] : null)
                ]);
                
                echo json_encode(["success" => true, "message" => "Bill of Lading created successfully.", "id" => $id]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Database error during insertion: " . $e->getMessage()]);
            }
        }
        break;

    case 'DELETE':
        if (!$is_authenticated) {
            http_response_code(401);
            echo json_encode(["success" => false, "error" => "Unauthorized"]);
            exit();
        }
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "ID parameter is required to delete."]);
            exit();
        }

        try {
            // Get bl_no before deleting for reference in the log
            $stmt_bl = $pdo->prepare("SELECT bl_no FROM bills_of_lading WHERE id = :id");
            $stmt_bl->execute(['id' => $_GET['id']]);
            $bl_no = $stmt_bl->fetchColumn();

            $stmt = $pdo->prepare("DELETE FROM bills_of_lading WHERE id = :id");
            $stmt->execute(['id' => $_GET['id']]);
            
            if ($stmt->rowCount() > 0) {
                // Log delete action
                $stmt_log = $pdo->prepare("INSERT INTO history_logs (bl_id, bl_no, action, changed_fields, ip_address, device_id, device_label) VALUES (:bl_id, :bl_no, :action, :changed_fields, :ip_address, :device_id, :device_label)");
                $stmt_log->execute([
                    'bl_id' => $_GET['id'],
                    'bl_no' => $bl_no ? $bl_no : 'Unknown',
                    'action' => 'delete',
                    'changed_fields' => null,
                    'ip_address' => get_client_ip(),
                    'device_id' => isset($_GET['device_id']) ? $_GET['device_id'] : null,
                    'device_label' => get_latest_device_label($pdo, isset($_GET['device_id']) ? $_GET['device_id'] : null, isset($_GET['device_label']) ? $_GET['device_label'] : null)
                ]);
                echo json_encode(["success" => true, "message" => "Bill of Lading deleted successfully."]);
            } else {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Bill of Lading not found or already deleted."]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Database error during deletion: " . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed."]);
        break;
}
