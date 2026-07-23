-- =========================================================================
-- SISTEM BILL OF LADING: CONTAINER MOVEMENT DATABASE SETUP
-- =========================================================================

-- Create Table movement_voyages
CREATE TABLE IF NOT EXISTS `movement_voyages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `voyage_name` VARCHAR(100) NOT NULL UNIQUE,
    `voyage_date` VARCHAR(50) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Table movement_containers
CREATE TABLE IF NOT EXISTS `movement_containers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `voyage_id` INT NOT NULL,
    `row_no` INT NOT NULL,
    `port` VARCHAR(50) NULL,
    `pol` VARCHAR(50) NULL,
    `mlo` VARCHAR(50) NULL,
    `size` VARCHAR(20) NULL,
    `cntr_num` VARCHAR(50) NULL,
    `shipper_in` VARCHAR(255) NULL,
    `consignee_in` VARCHAR(255) NULL,
    `bl_number` VARCHAR(50) NULL,
    `status_in` VARCHAR(50) NULL,
    `vessel_in` VARCHAR(100) NULL,
    `loaded_in` VARCHAR(50) NULL,
    `discharge` VARCHAR(50) NULL,
    `gate_out` VARCHAR(50) NULL,
    `depot_in` VARCHAR(50) NULL,
    `depot` VARCHAR(100) NULL,
    `condition` VARCHAR(50) NULL,
    `depot_out` VARCHAR(50) NULL,
    `gate_in_cy` VARCHAR(50) NULL,
    `shipper_out` VARCHAR(255) NULL,
    `consignee_out` VARCHAR(255) NULL,
    `status_out` VARCHAR(50) NULL,
    `vessel_out` VARCHAR(100) NULL,
    `loaded_out` VARCHAR(50) NULL,
    `pod` VARCHAR(50) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_movement_voyage_id` FOREIGN KEY (`voyage_id`) REFERENCES `movement_voyages`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
