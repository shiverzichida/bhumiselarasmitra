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

// If database connection failed, return error
if (!$pdo) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database connection failed: " . $pdo_error,
        "debug_hint" => "Please check your database credentials in config.php and make sure MySQL is running."
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

// Protect admin operations (GET details/list and DELETE)
if ($method === 'GET' || $method === 'DELETE') {
    if (!check_auth_request()) {
        http_response_code(401);
        echo json_encode([
            "success" => false, 
            "error" => "Unauthorized access. Please login to the admin panel."
        ]);
        exit();
    }
}
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($method) {
    case 'GET':
        if ($action === 'detail') {
            if (!isset($_GET['id'])) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "ID parameter is required for detail view."]);
                exit();
            }
            
            $id = intval($_GET['id']);
            try {
                // Fetch submission
                $stmt = $pdo->prepare("SELECT * FROM container_submissions WHERE id = :id");
                $stmt->execute(['id' => $id]);
                $submission = $stmt->fetch();
                
                if (!$submission) {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "Submission not found."]);
                    exit();
                }
                
                // Fetch items
                $stmtItems = $pdo->prepare("SELECT * FROM container_submission_items WHERE submission_id = :id");
                $stmtItems->execute(['id' => $id]);
                $items = $stmtItems->fetchAll();
                
                echo json_encode([
                    "success" => true,
                    "data" => [
                        "submission" => $submission,
                        "items" => $items
                    ]
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
            }
        } else {
            // Get all submissions (list view)
            try {
                // Fetch submissions and sub-totals
                $stmt = $pdo->query("
                    SELECT s.*, COUNT(i.id) as total_containers 
                    FROM container_submissions s 
                    LEFT JOIN container_submission_items i ON s.id = i.submission_id 
                    GROUP BY s.id 
                    ORDER BY s.created_at DESC
                ");
                $submissions = $stmt->fetchAll();
                echo json_encode(["success" => true, "data" => $submissions]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
            }
        }
        break;

    case 'POST':
        // Get JSON body input
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (!$data || !isset($data['ref_no'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid input data. Reference/Booking Number is required."]);
            exit();
        }

        try {
            $pdo->beginTransaction();

            // Insert submission
            $stmt = $pdo->prepare("INSERT INTO container_submissions 
                (ref_no, vessel_name_1, voyage_1, etd_1) 
                VALUES (:ref_no, :vessel_name_1, :voyage_1, :etd_1)");
            
            $stmt->execute([
                'ref_no' => $data['ref_no'],
                'vessel_name_1' => isset($data['vessel_name_1']) ? $data['vessel_name_1'] : '',
                'voyage_1' => isset($data['voyage_1']) ? $data['voyage_1'] : '',
                'etd_1' => isset($data['etd_1']) ? $data['etd_1'] : ''
            ]);
            
            $submissionId = $pdo->lastInsertId();

            // Insert items
            if (isset($data['containers']) && is_array($data['containers'])) {
                $stmtItem = $pdo->prepare("INSERT INTO container_submission_items 
                    (submission_id, container_no, seal_no, weight) 
                    VALUES (:submission_id, :container_no, :seal_no, :weight)");
                
                foreach ($data['containers'] as $container) {
                    $stmtItem->execute([
                        'submission_id' => $submissionId,
                        'container_no' => isset($container['container_no']) ? trim($container['container_no']) : '',
                        'seal_no' => isset($container['seal_no']) ? trim($container['seal_no']) : '',
                        'weight' => isset($container['weight']) ? trim($container['weight']) : ''
                    ]);
                }
            }

            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Container data submitted successfully.", "id" => $submissionId]);
        } catch (PDOException $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Database error during insertion: " . $e->getMessage()]);
        }
        break;

    case 'DELETE':
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "ID parameter is required to delete."]);
            exit();
        }

        $id = intval($_GET['id']);
        try {
            $stmt = $pdo->prepare("DELETE FROM container_submissions WHERE id = :id");
            $stmt->execute(['id' => $id]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(["success" => true, "message" => "Container submission deleted successfully."]);
            } else {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Submission not found or already deleted."]);
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
