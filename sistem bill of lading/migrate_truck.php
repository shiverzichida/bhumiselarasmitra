<?php
require_once 'config.php';

$sqlFile = 'truck_monitoring_schema.sql';
if (!file_exists($sqlFile)) {
    die(json_encode(["success" => false, "error" => "Schema file not found!"]));
}

$sql = file_get_contents($sqlFile);

try {
    // Try config connection first
    if ($pdo) {
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
        $pdo->exec($sql);
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
        echo json_encode(["success" => true, "message" => "Database tables for truck monitoring created successfully using config credentials."]);
        exit();
    }
} catch (PDOException $e) {
    // Ignore and try fallback
}

// Fallback to local root connection
try {
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    // Try root with empty password
    $pdo_root = new PDO($dsn, 'root', '', $options);
    $pdo_root->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo_root->exec($sql);
    $pdo_root->exec("SET FOREIGN_KEY_CHECKS = 1;");
    echo json_encode(["success" => true, "message" => "Database tables for truck monitoring created successfully using root fallback."]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "error" => "Connection failed with config and root fallback: " . $e->getMessage()]);
}
