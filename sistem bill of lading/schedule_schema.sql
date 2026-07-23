-- =========================================================================
-- SISTEM BILL OF LADING: SAILING SCHEDULE DATABASE SETUP
-- Run this SQL query in phpMyAdmin or your MySQL server to set up the tables.
-- =========================================================================

-- Drop tables if they exist
DROP TABLE IF EXISTS `schedule_port_calls`;
DROP TABLE IF EXISTS `schedule_voyages`;

-- Create Table schedule_voyages
CREATE TABLE `schedule_voyages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tug` VARCHAR(100) NOT NULL,
    `barge` VARCHAR(100) NOT NULL,
    `voyage_out` VARCHAR(50) NOT NULL, -- e.g. 261013S
    `voyage_in` VARCHAR(50) NULL,      -- e.g. 261013N
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Table schedule_port_calls
CREATE TABLE `schedule_port_calls` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `voyage_id` INT NOT NULL,
    `port_name` VARCHAR(50) NOT NULL,  -- e.g. BTM, KIJ, ICA, PNK
    `sequence_no` INT NOT NULL,        -- Ordering index (1, 2, 3...)
    `eta` DATETIME NULL,               -- Estimated Arrival
    `etd` DATETIME NULL,               -- Estimated Departure
    `ata` DATETIME NULL,               -- Actual Arrival
    `atd` DATETIME NULL,               -- Actual Departure
    `type` VARCHAR(10) NOT NULL,       -- 'OUT' or 'IN'
    CONSTRAINT `fk_voyage_id` FOREIGN KEY (`voyage_id`) REFERENCES `schedule_voyages`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
