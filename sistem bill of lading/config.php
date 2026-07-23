<?php
// Prevent direct access to configuration file
if (basename($_SERVER['PHP_SELF']) === 'config.php') {
    http_response_code(403);
    die('Forbidden: Direct access is not allowed.');
}

// Database Configuration
$host = 'localhost';
$port = '3306';
$dbname = 'lint2571_pllpul';
$user = 'lint2571_pllpul';
$pass = 'pllpul2026@';

// Detect local environment
$is_local = false;
if (isset($_SERVER['HTTP_HOST']) && ($_SERVER['HTTP_HOST'] === 'localhost' || $_SERVER['HTTP_HOST'] === '127.0.0.1' || strpos($_SERVER['HTTP_HOST'], 'localhost:') === 0)) {
    $is_local = true;
}

if ($is_local) {
    // Try connecting with root / blank password first (common local setup like XAMPP, WampServer)
    $user = 'root';
    $pass = '';
}

define('DB_HOST', $host);
define('DB_PORT', $port);
define('DB_NAME', $dbname);
define('DB_USER', $user);
define('DB_PASS', $pass);

try {
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    $pdo_error = null;
} catch (PDOException $e) {
    // If it's local and database doesn't exist, try creating it automatically
    if ($is_local && ($e->getCode() == 1049 || strpos($e->getMessage(), 'Unknown database') !== false)) {
        try {
            // Connect without database
            $temp_dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=utf8mb4";
            $temp_pdo = new PDO($temp_dsn, DB_USER, DB_PASS, $options);
            $temp_pdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            
            // Reconnect
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            $pdo_error = null;
            
            // Import schemas if database was just created
            foreach (['database.sql', 'kas_operasional_schema.sql', 'truck_monitoring_schema.sql', 'kontainer_schema.sql', 'schedule_schema.sql'] as $schema_file) {
                if (file_exists($schema_file)) {
                    $sql = file_get_contents($schema_file);
                    if (!empty($sql)) {
                        try {
                            $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
                            
                            // Split queries by semicolon to execute one by one
                            $queries = array_filter(array_map('trim', explode(';', $sql)));
                            foreach ($queries as $query) {
                                if ($query !== '') {
                                    $pdo->exec($query);
                                }
                            }
                            
                            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
                        } catch (PDOException $im_ex) {
                            // Ignored or logged
                        }
                    }
                }
            }
        } catch (PDOException $ex) {
            $pdo = null;
            $pdo_error = $ex->getMessage();
        }
    } else {
        $pdo = null;
        $pdo_error = $e->getMessage();
    }
}
