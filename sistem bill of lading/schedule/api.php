<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config.php';

if (!$pdo) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database connection failed."]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($method) {
    case 'GET':
        if ($action === 'list') {
            try {
                // Fetch voyages
                $stmt = $pdo->query("SELECT * FROM schedule_voyages ORDER BY created_at DESC");
                $voyages = $stmt->fetchAll();
                
                $result = [];
                foreach ($voyages as $voyage) {
                    // Fetch port calls for this voyage
                    $stmtCalls = $pdo->prepare("SELECT * FROM schedule_port_calls WHERE voyage_id = :voyage_id ORDER BY sequence_no ASC");
                    $stmtCalls->execute(['voyage_id' => $voyage['id']]);
                    $portCalls = $stmtCalls->fetchAll();
                    
                    $voyage['port_calls'] = $portCalls;
                    $result[] = $voyage;
                }
                
                echo json_encode(["success" => true, "data" => $result]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
            }
        }
        break;

    case 'POST':
        if ($action === 'create') {
            $json = file_get_contents('php://input');
            $data = json_decode($json, true);
            
            if (!$data || !isset($data['tug']) || !isset($data['barge']) || !isset($data['voyage_out']) || !isset($data['start_date'])) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Tug, Barge, Voyage Out, and Start Date are required."]);
                exit();
            }
            
            $tug = trim($data['tug']);
            $barge = trim($data['barge']);
            $voyageOut = trim($data['voyage_out']);
            $voyageIn = isset($data['voyage_in']) ? trim($data['voyage_in']) : '';
            $startDate = trim($data['start_date']); // e.g. "2026-06-08" or "2026-06-08 08:00:00"
            
            $routes = [];
            if (isset($data['routes']) && is_array($data['routes'])) {
                foreach ($data['routes'] as $r) {
                    if (isset($r['port_name']) && !empty(trim($r['port_name']))) {
                        $routes[] = [
                            'port_name' => trim(strtoupper($r['port_name'])),
                            'type' => (isset($r['type']) && strtoupper(trim($r['type'])) === 'IN') ? 'IN' : 'OUT',
                            'travel_days' => isset($r['travel_days']) ? floatval($r['travel_days']) : 0.0,
                            'stay_days' => isset($r['stay_days']) ? floatval($r['stay_days']) : 0.0
                        ];
                    }
                }
            } else {
                $template = isset($data['template']) ? $data['template'] : 'standard';
                // Define default route templates
                // travel_days: days from departure of previous port to arrival of current port
                // stay_days: days spent in this port
                if ($template === 'standard') {
                    $routes = [
                        ['port_name' => 'BTM', 'type' => 'OUT', 'travel_days' => 0, 'stay_days' => 1],
                        ['port_name' => 'KIJ', 'type' => 'OUT', 'travel_days' => 3, 'stay_days' => 1],
                        ['port_name' => 'ICA', 'type' => 'OUT', 'travel_days' => 2, 'stay_days' => 4],
                        ['port_name' => 'PNK', 'type' => 'OUT', 'travel_days' => 2, 'stay_days' => 1],
                        ['port_name' => 'KIJ', 'type' => 'IN', 'travel_days' => 1, 'stay_days' => 1],
                        ['port_name' => 'BTM', 'type' => 'IN', 'travel_days' => 3, 'stay_days' => 1],
                        ['port_name' => 'PGU', 'type' => 'IN', 'travel_days' => 1, 'stay_days' => 1],
                        ['port_name' => 'BTM', 'type' => 'IN', 'travel_days' => 1, 'stay_days' => 0]
                    ];
                } else if ($template === 'long') {
                    $routes = [
                        ['port_name' => 'TPP', 'type' => 'OUT', 'travel_days' => 0, 'stay_days' => 1],
                        ['port_name' => 'PGU', 'type' => 'OUT', 'travel_days' => 1, 'stay_days' => 1],
                        ['port_name' => 'BTM', 'type' => 'OUT', 'travel_days' => 1, 'stay_days' => 1],
                        ['port_name' => 'KIJ', 'type' => 'OUT', 'travel_days' => 4, 'stay_days' => 1],
                        ['port_name' => 'ICA', 'type' => 'OUT', 'travel_days' => 2, 'stay_days' => 4],
                        ['port_name' => 'PNK', 'type' => 'OUT', 'travel_days' => 2, 'stay_days' => 1],
                        ['port_name' => 'KIJ', 'type' => 'IN', 'travel_days' => 1, 'stay_days' => 1],
                        ['port_name' => 'BTM', 'type' => 'IN', 'travel_days' => 3, 'stay_days' => 1],
                        ['port_name' => 'PGU', 'type' => 'IN', 'travel_days' => 1, 'stay_days' => 1],
                        ['port_name' => 'BTM', 'type' => 'IN', 'travel_days' => 1, 'stay_days' => 0]
                    ];
                } else { // short
                    $routes = [
                        ['port_name' => 'BTM', 'type' => 'OUT', 'travel_days' => 0, 'stay_days' => 1],
                        ['port_name' => 'PGU', 'type' => 'OUT', 'travel_days' => 1, 'stay_days' => 1],
                        ['port_name' => 'BTM', 'type' => 'IN', 'travel_days' => 1, 'stay_days' => 0]
                    ];
                }
            }
            
            try {
                $pdo->beginTransaction();
                
                // Insert Voyage
                $stmt = $pdo->prepare("INSERT INTO schedule_voyages (tug, barge, voyage_out, voyage_in) VALUES (:tug, :barge, :voyage_out, :voyage_in)");
                $stmt->execute([
                    'tug' => $tug,
                    'barge' => $barge,
                    'voyage_out' => $voyageOut,
                    'voyage_in' => $voyageIn
                ]);
                $voyageId = $pdo->lastInsertId();
                
                // Generate port calls times
                $currentDate = new DateTime($startDate);
                $seq = 1;
                
                $stmtCall = $pdo->prepare("INSERT INTO schedule_port_calls (voyage_id, port_name, sequence_no, eta, etd, type) VALUES (:voyage_id, :port_name, :sequence_no, :eta, :etd, :type)");
                
                foreach ($routes as $route) {
                    // Add travel time
                    if ($route['travel_days'] > 0) {
                        $currentDate->modify("+" . ($route['travel_days'] * 24) . " hours");
                    }
                    $eta = $currentDate->format('Y-m-d H:i:s');
                    
                    // Add stay time
                    if ($route['stay_days'] > 0) {
                        $currentDate->modify("+" . ($route['stay_days'] * 24) . " hours");
                        $etd = $currentDate->format('Y-m-d H:i:s');
                    } else {
                        $etd = null;
                    }
                    
                    $stmtCall->execute([
                        'voyage_id' => $voyageId,
                        'port_name' => $route['port_name'],
                        'sequence_no' => $seq++,
                        'eta' => $eta,
                        'etd' => $etd,
                        'type' => $route['type']
                    ]);
                }
                
                $pdo->commit();
                echo json_encode(["success" => true, "message" => "Schedule voyage created successfully.", "id" => $voyageId]);
            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
            }
        }
        
        else if ($action === 'update_actual') {
            $json = file_get_contents('php://input');
            $data = json_decode($json, true);
            
            if (!$data || !isset($data['port_call_id']) || !isset($data['actual_type']) || !isset($data['actual_value'])) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Port call ID, actual type (ata/atd), and actual value are required."]);
                exit();
            }
            
            $portCallId = intval($data['port_call_id']);
            $actualType = strtolower(trim($data['actual_type'])); // 'ata' or 'atd'
            $actualValue = trim($data['actual_value']); // Datetime string, or empty/null
            
            if ($actualType !== 'ata' && $actualType !== 'atd') {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Invalid actual type. Must be 'ata' or 'atd'."]);
                exit();
            }
            
            try {
                $pdo->beginTransaction();
                
                // Fetch the updated port call
                $stmtPC = $pdo->prepare("SELECT pc.*, v.tug, v.barge 
                    FROM schedule_port_calls pc 
                    JOIN schedule_voyages v ON pc.voyage_id = v.id 
                    WHERE pc.id = :id");
                $stmtPC->execute(['id' => $portCallId]);
                $portCall = $stmtPC->fetch();
                
                if (!$portCall) {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "Port call not found."]);
                    exit();
                }
                
                // Original estimate to compute delta
                $originalTimeStr = ($actualType === 'ata') ? $portCall['eta'] : $portCall['etd'];
                
                if (!$originalTimeStr) {
                    // Fall back to the other date if this one is null (e.g. final port might not have ETD, but has ETA)
                    $originalTimeStr = ($actualType === 'ata') ? $portCall['etd'] : $portCall['eta'];
                }
                
                $originalTime = new DateTime($originalTimeStr);
                $newActualTime = new DateTime($actualValue);
                
                // Calculate difference in seconds
                $deltaSeconds = $newActualTime->getTimestamp() - $originalTime->getTimestamp();
                
                // 1. Update the actual and estimated times of the target port call
                if ($actualType === 'ata') {
                    $stmtUpdate = $pdo->prepare("UPDATE schedule_port_calls SET ata = :ata, eta = :eta WHERE id = :id");
                    $stmtUpdate->execute([
                        'ata' => $actualValue,
                        'eta' => $actualValue,
                        'id' => $portCallId
                    ]);
                    
                    // Also shift this port's ETD if there is no ATD yet
                    if (!$portCall['atd'] && $portCall['etd']) {
                        $etdTime = new DateTime($portCall['etd']);
                        $etdTime->modify("+$deltaSeconds seconds");
                        $stmtUpdateEtd = $pdo->prepare("UPDATE schedule_port_calls SET etd = :etd WHERE id = :id");
                        $stmtUpdateEtd->execute([
                            'etd' => $etdTime->format('Y-m-d H:i:s'),
                            'id' => $portCallId
                        ]);
                    }
                } else {
                    $stmtUpdate = $pdo->prepare("UPDATE schedule_port_calls SET atd = :atd, etd = :etd WHERE id = :id");
                    $stmtUpdate->execute([
                        'atd' => $actualValue,
                        'etd' => $actualValue,
                        'id' => $portCallId
                    ]);
                }
                
                // 2. Cascade shift to all future port calls of the SAME Tug & Barge combination
                // Get all voyages of this vessel
                $stmtVoyages = $pdo->prepare("SELECT id FROM schedule_voyages WHERE tug = :tug AND barge = :barge");
                $stmtVoyages->execute([
                    'tug' => $portCall['tug'],
                    'barge' => $portCall['barge']
                ]);
                $voyageIds = $stmtVoyages->fetchAll(PDO::FETCH_COLUMN);
                
                if (!empty($voyageIds)) {
                    $inQuery = implode(',', array_map('intval', $voyageIds));
                    
                    // Fetch all port calls across all voyages of this vessel
                    $stmtAllPC = $pdo->query("SELECT * FROM schedule_port_calls WHERE voyage_id IN ($inQuery) ORDER BY eta ASC, sequence_no ASC");
                    $allPortCalls = $stmtAllPC->fetchAll();
                    
                    // Find position of current port call
                    $startIndex = -1;
                    foreach ($allPortCalls as $index => $pc) {
                        if (intval($pc['id']) === $portCallId) {
                            $startIndex = $index;
                            break;
                        }
                    }
                    
                    // Shift all subsequent port calls in chronological order
                    if ($startIndex !== -1 && $deltaSeconds !== 0) {
                        $stmtShiftPC = $pdo->prepare("UPDATE schedule_port_calls SET eta = :eta, etd = :etd WHERE id = :id");
                        
                        for ($i = $startIndex + 1; $i < count($allPortCalls); $i++) {
                            $futurePC = $allPortCalls[$i];
                            
                            $newEta = $futurePC['eta'];
                            $newEtd = $futurePC['etd'];
                            
                            // Shift ETA only if actual arrival (ATA) has NOT been entered
                            if (!$futurePC['ata'] && $futurePC['eta']) {
                                $etaTime = new DateTime($futurePC['eta']);
                                $etaTime->modify("+$deltaSeconds seconds");
                                $newEta = $etaTime->format('Y-m-d H:i:s');
                            }
                            
                            // Shift ETD only if actual departure (ATD) has NOT been entered
                            if (!$futurePC['atd'] && $futurePC['etd']) {
                                $etdTime = new DateTime($futurePC['etd']);
                                $etdTime->modify("+$deltaSeconds seconds");
                                $newEtd = $etdTime->format('Y-m-d H:i:s');
                            }
                            
                            // Perform update if changes occurred
                            if ($newEta !== $futurePC['eta'] || $newEtd !== $futurePC['etd']) {
                                $stmtShiftPC->execute([
                                    'eta' => $newEta,
                                    'etd' => $newEtd,
                                    'id' => $futurePC['id']
                                ]);
                            }
                        }
                    }
                }
                
                $pdo->commit();
                echo json_encode(["success" => true, "message" => "Port call updated and date shift cascaded successfully."]);
            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
            }
        }
        
        else if ($action === 'delete') {
            $json = file_get_contents('php://input');
            $data = json_decode($json, true);
            
            $voyageId = null;
            if (isset($data['id'])) {
                $voyageId = intval($data['id']);
            } else if (isset($_GET['id'])) {
                $voyageId = intval($_GET['id']);
            }
            
            if (!$voyageId) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Voyage ID is required to delete."]);
                exit();
            }
            
            try {
                $pdo->beginTransaction();
                
                // Delete associated port calls first to ensure clean delete even if foreign key cascade is missing/disabled
                $stmtCalls = $pdo->prepare("DELETE FROM schedule_port_calls WHERE voyage_id = :voyage_id");
                $stmtCalls->execute(['voyage_id' => $voyageId]);
                
                // Delete the voyage
                $stmt = $pdo->prepare("DELETE FROM schedule_voyages WHERE id = :id");
                $stmt->execute(['id' => $voyageId]);
                
                $pdo->commit();
                
                echo json_encode(["success" => true, "message" => "Schedule voyage deleted successfully."]);
            } catch (PDOException $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
            }
        }
        break;
        
    case 'DELETE':
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Voyage ID is required to delete."]);
            exit();
        }
        
        $voyageId = intval($_GET['id']);
        try {
            $pdo->beginTransaction();
            
            // Delete associated port calls first to ensure clean delete even if foreign key cascade is missing/disabled
            $stmtCalls = $pdo->prepare("DELETE FROM schedule_port_calls WHERE voyage_id = :voyage_id");
            $stmtCalls->execute(['voyage_id' => $voyageId]);
            
            // Delete the voyage
            $stmt = $pdo->prepare("DELETE FROM schedule_voyages WHERE id = :id");
            $stmt->execute(['id' => $voyageId]);
            
            $pdo->commit();
            
            echo json_encode(["success" => true, "message" => "Schedule voyage deleted successfully."]);
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Database error: " . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed."]);
        break;
}
