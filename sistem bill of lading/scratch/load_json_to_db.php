<?php
require_once __DIR__ . '/../config.php';

try {
    if (!isset($pdo)) {
        throw new Exception("PDO database connection not initialized.");
    }

    $json_file = __DIR__ . '/movement_data.json';
    if (!file_exists($json_file)) {
        throw new Exception("JSON data file not found at: $json_file");
    }

    $json_content = file_get_contents($json_file);
    $data = json_decode($json_content, true);

    if (!is_array($data)) {
        throw new Exception("Failed to decode JSON data.");
    }

    echo "Seeding database from JSON data...\n";

    $pdo->beginTransaction();

    // Clear existing movement voyages (which will cascade delete containers)
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("TRUNCATE TABLE movement_containers;");
    // Can't TRUNCATE tables with foreign keys sometimes, so DELETE is safer
    $pdo->exec("DELETE FROM movement_voyages;");
    $pdo->exec("ALTER TABLE movement_voyages AUTO_INCREMENT = 1;");
    $pdo->exec("ALTER TABLE movement_containers AUTO_INCREMENT = 1;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    $stmtVoy = $pdo->prepare("INSERT INTO movement_voyages (voyage_name, voyage_date) VALUES (:name, :date)");
    
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

    foreach ($data as $vData) {
        $voyageName = $vData['voyage_name'];
        $voyageDate = $vData['voyage_date'];
        
        $stmtVoy->execute(['name' => $voyageName, 'date' => $voyageDate]);
        $voyageId = $pdo->lastInsertId();
        
        echo "Inserted voyage '$voyageName' (ID: $voyageId)\n";

        $containers = $vData['containers'];
        foreach ($containers as $index => $row) {
            $stmtIns->execute([
                'voyage_id' => $voyageId,
                'row_no' => $index + 1,
                'port' => $row['port'],
                'pol' => $row['pol'],
                'mlo' => $row['mlo'],
                'size' => $row['size'],
                'cntr_num' => $row['cntr_num'],
                'shipper_in' => $row['shipper_in'],
                'consignee_in' => $row['consignee_in'],
                'bl_number' => $row['bl_number'],
                'status_in' => $row['status_in'],
                'vessel_in' => $row['vessel_in'],
                'loaded_in' => $row['loaded_in'],
                'discharge' => $row['discharge'],
                'gate_out' => $row['gate_out'],
                'depot_in' => $row['depot_in'],
                'depot' => $row['depot'],
                'condition' => $row['condition'],
                'depot_out' => $row['depot_out'],
                'gate_in_cy' => $row['gate_in_cy'],
                'shipper_out' => $row['shipper_out'],
                'consignee_out' => $row['consignee_out'],
                'status_out' => $row['status_out'],
                'vessel_out' => $row['vessel_out'],
                'loaded_out' => $row['loaded_out'],
                'pod' => $row['pod']
            ]);
        }
        echo "  - Inserted " . count($containers) . " container rows.\n";
    }

    $pdo->commit();
    echo "Database seeding completed successfully!\n";

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "Seeding failed: " . $e->getMessage() . "\n";
}
