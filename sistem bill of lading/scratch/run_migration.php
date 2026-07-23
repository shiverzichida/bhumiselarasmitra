<?php
require_once __DIR__ . '/../config.php';

try {
    if (!isset($pdo)) {
        throw new Exception("PDO database connection is not initialized.");
    }
    
    $sql_file = __DIR__ . '/../movement_schema.sql';
    if (!file_exists($sql_file)) {
        throw new Exception("Schema file not found at: $sql_file");
    }
    
    $sql = file_get_contents($sql_file);
    echo "Running migration from movement_schema.sql...\n";
    
    // Split statements by semicolon
    // Note: this simple split works because our schema doesn't have semicolons inside strings
    $queries = array_filter(array_map('trim', explode(';', $sql)));
    
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    foreach ($queries as $query) {
        if ($query !== '') {
            $pdo->exec($query);
            echo "Executed query: " . substr(str_replace("\n", " ", $query), 0, 60) . "...\n";
        }
    }
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    
    echo "Migration completed successfully!\n";
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
