<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config.php';

session_start();

// Self-healing database initialization
if ($pdo) {
    try {
        // Check if movement_voyages table exists
        $result = $pdo->query("SHOW TABLES LIKE 'movement_voyages'")->fetchAll();
        if (empty($result)) {
            // Run migration automatically
            $schemaFile = __DIR__ . '/../movement_schema.sql';
            if (file_exists($schemaFile)) {
                $sql = file_get_contents($schemaFile);
                $queries = array_filter(array_map('trim', explode(';', $sql)));
                $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
                foreach ($queries as $query) {
                    if ($query !== '') {
                        $pdo->exec($query);
                    }
                }
                $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
            }
        }
    } catch (Exception $e) {
        // Silently ignore or let the API report connection error later
    }
} else {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database connection failed: " . ($pdo_error ?? 'Unknown error')
    ]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

// Helper to check authentication (supports Session and Basic Auth)
function check_auth_request() {
    if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
        return true;
    }
    if (isset($_SERVER['PHP_AUTH_USER']) && isset($_SERVER['PHP_AUTH_PW'])) {
        if (strtolower($_SERVER['PHP_AUTH_USER']) === 'nahel' && $_SERVER['PHP_AUTH_PW'] === 'Nahel@26') {
            return true;
        }
    }
    $auth_header = '';
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $auth_header = $headers['Authorization'];
        } elseif (isset($headers['X-Authorization'])) {
            $auth_header = $headers['X-Authorization'];
        }
    }
    if (empty($auth_header) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
    }
    if (!empty($auth_header) && strpos(strtolower($auth_header), 'basic ') === 0) {
        $creds = explode(':', base64_decode(substr($auth_header, 6)), 2);
        if (count($creds) === 2 && strtolower($creds[0]) === 'nahel' && $creds[1] === 'Nahel@26') {
            return true;
        }
    }
    return false;
}

// Protect API access with the same session/basic-auth as the container admin panel
if ($method === 'GET' || $method === 'POST' || $method === 'DELETE') {
    // If it's a request to check auth or login, don't block
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    if ($action !== 'check_auth' && $action !== 'login') {
        if (!check_auth_request()) {
            http_response_code(401);
            echo json_encode([
                "success" => false,
                "error" => "Unauthorized access. Please login."
            ]);
            exit();
        }
    }
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($method) {
    case 'GET':
        if ($action === 'check_auth') {
            $isLoggedIn = isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
            echo json_encode(["success" => true, "logged_in" => $isLoggedIn]);
            exit();
        }

        if ($action === 'get_movement') {
            if (!isset($_GET['voyage_id'])) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Voyage ID is required."]);
                exit();
            }
            $voyageId = intval($_GET['voyage_id']);
            try {
                // Fetch voyage details
                $stmt = $pdo->prepare("SELECT * FROM movement_voyages WHERE id = :id");
                $stmt->execute(['id' => $voyageId]);
                $voyage = $stmt->fetch();

                if (!$voyage) {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "Voyage not found."]);
                    exit();
                }

                // Fetch containers
                $stmtItems = $pdo->prepare("SELECT * FROM movement_containers WHERE voyage_id = :voyage_id ORDER BY row_no ASC");
                $stmtItems->execute(['voyage_id' => $voyageId]);
                $containers = $stmtItems->fetchAll();

                echo json_encode([
                    "success" => true,
                    "voyage" => $voyage,
                    "containers" => $containers
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
            }
        } else {
            // Default: List Voyages
            try {
                $stmt = $pdo->query("
                    SELECT v.*, COUNT(c.id) as total_containers 
                    FROM movement_voyages v 
                    LEFT JOIN movement_containers c ON v.id = c.voyage_id 
                    GROUP BY v.id 
                    ORDER BY v.created_at DESC
                ");
                $voyages = $stmt->fetchAll();
                echo json_encode(["success" => true, "data" => $voyages]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
            }
        }
        break;

    case 'POST':
        if ($action === 'login') {
            $json = file_get_contents('php://input');
            $data = json_decode($json, true);
            $username = isset($data['username']) ? trim($data['username']) : '';
            $password = isset($data['password']) ? $data['password'] : '';

            if (strtolower($username) === 'nahel' && $password === 'Nahel@26') {
                $_SESSION['admin_logged_in'] = true;
                echo json_encode(["success" => true, "message" => "Logged in successfully."]);
            } else {
                http_response_code(401);
                echo json_encode(["success" => false, "error" => "Incorrect username or password."]);
            }
            exit();
        }

        if ($action === 'create_voyage') {
            $json = file_get_contents('php://input');
            $data = json_decode($json, true);

            $voyageName = isset($data['voyage_name']) ? trim($data['voyage_name']) : '';
            $voyageDate = isset($data['voyage_date']) ? trim($data['voyage_date']) : '';

            if (empty($voyageName)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Voyage name is required."]);
                exit();
            }

            try {
                // Check if exists
                $stmtCheck = $pdo->prepare("SELECT id FROM movement_voyages WHERE voyage_name = :name");
                $stmtCheck->execute(['name' => $voyageName]);
                if ($stmtCheck->fetch()) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "error" => "Voyage name already exists."]);
                    exit();
                }

                $stmt = $pdo->prepare("INSERT INTO movement_voyages (voyage_name, voyage_date) VALUES (:name, :date)");
                $stmt->execute(['name' => $voyageName, 'date' => $voyageDate]);
                $voyageId = $pdo->lastInsertId();

                echo json_encode([
                    "success" => true,
                    "message" => "Voyage created successfully.",
                    "id" => $voyageId
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
            }
            exit();
        }

        if ($action === 'save_movement') {
            if (!isset($_GET['voyage_id'])) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Voyage ID is required."]);
                exit();
            }
            $voyageId = intval($_GET['voyage_id']);

            $json = file_get_contents('php://input');
            $payload = json_decode($json, true);

            if (!is_array($payload)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Invalid payload data."]);
                exit();
            }

            $containers = isset($payload['containers']) ? $payload['containers'] : [];
            $voyageDate = isset($payload['voyage_date']) ? trim($payload['voyage_date']) : null;
            $voyageName = isset($payload['voyage_name']) ? trim($payload['voyage_name']) : null;

            try {
                $pdo->beginTransaction();

                // 1. Update voyage date and name if provided
                if ($voyageDate !== null || $voyageName !== null) {
                    $updateFields = [];
                    $params = ['id' => $voyageId];
                    if ($voyageDate !== null) {
                        $updateFields[] = "voyage_date = :voyage_date";
                        $params['voyage_date'] = $voyageDate;
                    }
                    if ($voyageName !== null && $voyageName !== '') {
                        $updateFields[] = "voyage_name = :voyage_name";
                        $params['voyage_name'] = $voyageName;
                    }

                    if (!empty($updateFields)) {
                        $sql = "UPDATE movement_voyages SET " . implode(", ", $updateFields) . " WHERE id = :id";
                        $stmtUpdate = $pdo->prepare($sql);
                        $stmtUpdate->execute($params);
                    }
                }

                // 2. Delete existing container rows for this voyage
                $stmtDel = $pdo->prepare("DELETE FROM movement_containers WHERE voyage_id = :voyage_id");
                $stmtDel->execute(['voyage_id' => $voyageId]);

                // 3. Insert new container rows
                if (!empty($containers)) {
                    $sqlIns = "INSERT INTO movement_containers (
                        voyage_id, row_no, port, pol, mlo, size, cntr_num, shipper_in, consignee_in, 
                        bl_number, status_in, vessel_in, loaded_in, discharge, gate_out, depot_in, 
                        depot, `condition`, depot_out, gate_in_cy, shipper_out, consignee_out, 
                        status_out, vessel_out, loaded_out, pod
                    ) VALUES (
                        :voyage_id, :row_no, :port, :pol, :mlo, :size, :cntr_num, :shipper_in, :consignee_in, 
                        :bl_number, :status_in, :vessel_in, :loaded_in, :discharge, :gate_out, :depot_in, 
                        :depot, :condition, :depot_out, :gate_in_cy, :shipper_out, :consignee_out, 
                        :status_out, :vessel_out, :loaded_out, :pod
                    )";

                    $stmtIns = $pdo->prepare($sqlIns);

                    foreach ($containers as $index => $row) {
                        $stmtIns->execute([
                            'voyage_id' => $voyageId,
                            'row_no' => $index + 1,
                            'port' => $row['port'] ?? '',
                            'pol' => $row['pol'] ?? '',
                            'mlo' => $row['mlo'] ?? '',
                            'size' => $row['size'] ?? '',
                            'cntr_num' => $row['cntr_num'] ?? '',
                            'shipper_in' => $row['shipper_in'] ?? '',
                            'consignee_in' => $row['consignee_in'] ?? '',
                            'bl_number' => $row['bl_number'] ?? '',
                            'status_in' => $row['status_in'] ?? '',
                            'vessel_in' => $row['vessel_in'] ?? '',
                            'loaded_in' => $row['loaded_in'] ?? '',
                            'discharge' => $row['discharge'] ?? '',
                            'gate_out' => $row['gate_out'] ?? '',
                            'depot_in' => $row['depot_in'] ?? '',
                            'depot' => $row['depot'] ?? '',
                            'condition' => $row['condition'] ?? '',
                            'depot_out' => $row['depot_out'] ?? '',
                            'gate_in_cy' => $row['gate_in_cy'] ?? '',
                            'shipper_out' => $row['shipper_out'] ?? '',
                            'consignee_out' => $row['consignee_out'] ?? '',
                            'status_out' => $row['status_out'] ?? '',
                            'vessel_out' => $row['vessel_out'] ?? '',
                            'loaded_out' => $row['loaded_out'] ?? '',
                            'pod' => $row['pod'] ?? ''
                        ]);
                    }
                }

                $pdo->commit();
                echo json_encode(["success" => true, "message" => "Movement data saved successfully."]);
            } catch (PDOException $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Database error during save: " . $e->getMessage()]);
            }
            exit();
        }
        break;

    case 'DELETE':
        if (!isset($_GET['voyage_id'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Voyage ID is required."]);
            exit();
        }

        $voyageId = intval($_GET['voyage_id']);
        try {
            $stmt = $pdo->prepare("DELETE FROM movement_voyages WHERE id = :id");
            $stmt->execute(['id' => $voyageId]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(["success" => true, "message" => "Voyage deleted successfully."]);
            } else {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Voyage not found or already deleted."]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Database error during delete: " . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed."]);
        break;
}
