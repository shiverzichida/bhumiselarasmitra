-- =========================================================================
-- DATABASE SETUP INSTRUCTIONS FOR cPANEL / SHARED HOSTING:
-- 1. Do NOT run the CREATE DATABASE query below on shared hosting. 
--    Instead, create your database and database user via "MySQL Database Wizard" in cPanel.
-- 2. Select your newly created database in phpMyAdmin, then import this SQL file.
-- 3. You can comment out or delete the lines "CREATE DATABASE..." and "USE..." below.
-- =========================================================================

-- Create Database if not exists (you can run this inside your local MySQL environment)
CREATE DATABASE IF NOT EXISTS `lint2571_pllpul` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `lint2571_pllpul`;

-- Drop table if exists
DROP TABLE IF EXISTS `bills_of_lading`;

-- Create Table bills_of_lading
CREATE TABLE `bills_of_lading` (
    `id` VARCHAR(50) NOT NULL,
    `booking_no` VARCHAR(50) NOT NULL,
    `bl_no` VARCHAR(50) NOT NULL,
    `shipper` TEXT NULL,
    `consignee` TEXT NULL,
    `notify_party` TEXT NULL,
    `delivery_agent` TEXT NULL,
    `pre_carriage` VARCHAR(100) NULL,
    `ocean_vessel` VARCHAR(100) NULL,
    `voy_no` VARCHAR(50) NULL,
    `place_of_receipt` VARCHAR(150) NULL,
    `port_of_loading` VARCHAR(150) NULL,
    `port_of_discharge` VARCHAR(150) NULL,
    `place_of_delivery` VARCHAR(150) NULL,
    `cargo_containers` TEXT NULL,
    `cargo_quantity` TEXT NULL,
    `cargo_description` TEXT NULL,
    `cargo_measurement` TEXT NULL,
    `freight_charges` VARCHAR(150) NULL,
    `revenue_tons` VARCHAR(50) NULL,
    `rate` VARCHAR(50) NULL,
    `per` VARCHAR(50) NULL,
    `prepaid` VARCHAR(50) NULL,
    `collect` VARCHAR(50) NULL,
    `ex_rate` VARCHAR(50) NULL,
    `prepaid_at` VARCHAR(100) NULL,
    `payable_at` VARCHAR(100) NULL,
    `place_date_issue` VARCHAR(150) NULL,
    `movement` VARCHAR(50) NULL,
    `no_of_original` VARCHAR(50) NULL,
    `signed_on_behalf` VARCHAR(150) NULL,
    `company_version` VARCHAR(100) DEFAULT 'PT. Putera Utama Lautan',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `last_modified` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_bl_no` (`bl_no`),
    INDEX `idx_booking_no` (`booking_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- CREATE TABLE saved_parties & SEED DATA
-- =========================================================================

CREATE TABLE IF NOT EXISTS `saved_parties` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `type` VARCHAR(50) NOT NULL, -- 'shipper', 'consignee', 'notify'
    `name` VARCHAR(150) NOT NULL,
    `address` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_party` (`type`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default values if empty
INSERT IGNORE INTO `saved_parties` (`type`, `name`, `address`) VALUES
('shipper', 'PT. PUTERA UTAMA LAUTAN (JAMBI)', 'JL. JENDRAL SUDIRMAN KOMPLEK TRANSMART\nRUKO BLOK D36 RT.32, KEL TAMBAK SARI\nKEC. JAMBI SELATAN\n36122 JAMBI INDONESIA'),
('consignee', 'PT. PUTERA UTAMA LAUTAN (PONTIANAK)', 'JL. KEMAKMURAN GG. KELUARGA 2\nNO. 12A KEC. PONTIANAK KOTA, KOTA PONTIANAK\nKALIMANTAN BARAT\n78113 PONTIANAK INDONESIA'),
('notify', 'SAME AS CONSIGNEE', 'SAME AS CONSIGNEE');

-- =========================================================================
-- CREATE TABLE history_logs
-- =========================================================================

CREATE TABLE IF NOT EXISTS `history_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `bl_id` VARCHAR(50) NOT NULL,
    `bl_no` VARCHAR(50) NOT NULL,
    `action` VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete', 'duplicate'
    `changed_fields` TEXT NULL, -- JSON formatted changes
    `ip_address` VARCHAR(45) NOT NULL,
    `device_id` VARCHAR(50) NULL,
    `device_label` VARCHAR(100) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

