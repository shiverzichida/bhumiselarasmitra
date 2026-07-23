<?php
require_once __DIR__ . '/../config.php';
try {
    if (isset($pdo)) {
        $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        echo "Tables in DB:\n";
        print_r($tables);
    } else {
        echo "PDO not defined. Connection error: " . ($pdo_error ?? 'unknown');
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
