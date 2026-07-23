<?php
require_once __DIR__ . '/../config.php';

try {
    $voyages = $pdo->query("SELECT * FROM movement_voyages")->fetchAll();
    echo "Voyages count: " . count($voyages) . "\n";
    foreach ($voyages as $v) {
        $cnt = $pdo->query("SELECT COUNT(*) FROM movement_containers WHERE voyage_id = " . $v['id'])->fetchColumn();
        echo " - Voyage: " . $v['voyage_name'] . " (ID: " . $v['id'] . ") has " . $cnt . " containers.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
