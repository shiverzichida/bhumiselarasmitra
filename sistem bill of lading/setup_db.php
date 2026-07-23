<?php
/**
 * Setup Database Helper for Sistem Bill of Lading
 * This script automates local MySQL database creation, user setup, and schema import.
 */

require_once 'config.php';

echo "=== SISTEM BILL OF LADING: LOCAL DATABASE SETUP ===\n\n";

// 1. Get MySQL root credentials
$root_user = 'root';
$root_pass = '';

echo "To set up the database, we need to temporarily connect as MySQL root or administrative user.\n";
echo "Default user is 'root' with empty password.\n";
echo "Press Enter to use defaults, or type new values:\n\n";

echo "MySQL Admin Username [$root_user]: ";
$input_user = trim(fgets(STDIN));
if ($input_user !== '') {
    $root_user = $input_user;
}

echo "MySQL Admin Password (hidden/blank by default): ";
// Simple command-line password reader (supports Windows)
if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
    $root_pass = trim(fgets(STDIN));
} else {
    // Unix/Linux hidden input
    readline_callback_handler_install('', function() {});
    $root_pass = '';
    while (true) {
        $key = fgetc(STDIN);
        if ($key === "\n") {
            break;
        }
        $root_pass .= $key;
    }
    readline_callback_handler_restore();
    echo "\n";
}

echo "\nConnecting to MySQL server at " . DB_HOST . ":" . DB_PORT . "...\n";

try {
    // Connect to MySQL server (without selecting database initially)
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo_admin = new PDO($dsn, $root_user, $root_pass, $options);
    echo "✔ Connected successfully as admin!\n\n";
} catch (PDOException $e) {
    echo "❌ Connection failed: " . $e->getMessage() . "\n";
    echo "Please make sure MySQL Server is installed and running on port " . DB_PORT . ".\n";
    exit(1);
}

// 2. Create Database
echo "Creating database `" . DB_NAME . "` if it doesn't exist...\n";
try {
    $pdo_admin->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "✔ Database created or already exists.\n\n";
} catch (PDOException $e) {
    echo "❌ Failed to create database: " . $e->getMessage() . "\n";
    exit(1);
}

// 3. Create User and Grant Privileges (if credentials in config.php differ from root)
if (DB_USER !== $root_user) {
    echo "Creating user `" . DB_USER . "` and granting privileges on `" . DB_NAME . "`...\n";
    try {
        // Create user if not exists (compatible with MySQL 5.7+ and 8.0+)
        $user_exists = $pdo_admin->query("SELECT EXISTS(SELECT 1 FROM mysql.user WHERE user = '" . DB_USER . "')")->fetchColumn();
        
        if (!$user_exists) {
            $pdo_admin->exec("CREATE USER '" . DB_USER . "'@'localhost' IDENTIFIED BY '" . DB_PASS . "'");
            echo "✔ User `" . DB_USER . "` created.\n";
        } else {
            // Update password just in case
            $pdo_admin->exec("ALTER USER '" . DB_USER . "'@'localhost' IDENTIFIED BY '" . DB_PASS . "'");
            echo "✔ User `" . DB_USER . "` already exists. Password updated to match config.php.\n";
        }
        
        // Grant privileges
        $pdo_admin->exec("GRANT ALL PRIVILEGES ON `" . DB_NAME . "`.* TO '" . DB_USER . "'@'localhost'");
        $pdo_admin->exec("FLUSH PRIVILEGES");
        echo "✔ Privileges granted successfully.\n\n";
    } catch (PDOException $e) {
        echo "⚠ Warning while setting up user/privileges: " . $e->getMessage() . "\n";
        echo "We will try to proceed using the admin connection.\n\n";
    }
}

// 4. Import schema from database.sql
$sql_file = 'database.sql';
if (!file_exists($sql_file)) {
    echo "❌ Error: `$sql_file` not found in current directory!\n";
    exit(1);
}

echo "Importing schema from `$sql_file`...\n";
try {
    $sql_content = file_get_contents($sql_file);
    
    // Connect to the specific database using the configured user
    $app_dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    try {
        $pdo_app = new PDO($app_dsn, DB_USER, DB_PASS, $options);
        echo "✔ Connected with application credentials (defined in config.php).\n";
    } catch (PDOException $e) {
        echo "⚠ Could not connect as `" . DB_USER . "`. Falling back to admin user to run migration...\n";
        $pdo_app = new PDO($app_dsn, $root_user, $root_pass, $options);
    }
    
    // Execute SQL content
    // Remove comments and execute statement by statement
    // Simple parser for SQL dump
    $queries = [];
    $query = '';
    $lines = explode("\n", $sql_content);
    foreach ($lines as $line) {
        $line = trim($line);
        // Skip comment lines and empty lines
        if ($line === '' || strpos($line, '--') === 0 || strpos($line, '#') === 0) {
            continue;
        }
        
        $query .= $line . "\n";
        if (substr($line, -1) === ';') {
            $queries[] = $query;
            $query = '';
        }
    }
    
    // Execute queries
    $success_count = 0;
    foreach ($queries as $q) {
        // Skip USE statement if it was already handled or we are fallback
        if (stripos(trim($q), 'USE ') === 0) {
            continue;
        }
        $pdo_app->exec($q);
        $success_count++;
    }
    
    echo "✔ Successfully executed $success_count queries from `$sql_file`.\n\n";
    echo "==================================================\n";
    echo "🎉 DATABASE SETUP COMPLETED SUCCESSFULLY!\n";
    echo "You can now run your local server using:\n";
    echo "php -S localhost:8000\n";
    echo "==================================================\n";
    
} catch (Exception $e) {
    echo "❌ Error importing schema: " . $e->getMessage() . "\n";
    exit(1);
}
