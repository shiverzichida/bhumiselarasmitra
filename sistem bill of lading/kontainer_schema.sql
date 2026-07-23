-- =========================================================================
-- SISTEM BILL OF LADING: CONTAINER SUBMISSION DATABASE UPDATE
-- Run this SQL query in phpMyAdmin or your MySQL server to update the database.
-- =========================================================================

-- Drop tables if they exist
DROP TABLE IF EXISTS `container_submission_items`;
DROP TABLE IF EXISTS `container_submissions`;

-- Create Table container_submissions
CREATE TABLE IF NOT EXISTS `container_submissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ref_no` VARCHAR(255) NOT NULL, -- e.g. SIMKO 25802 / 4700024531-7 / SI. 56768
    `vessel_name_1` VARCHAR(150) NULL,
    `voyage_1` VARCHAR(50) NULL,
    `etd_1` VARCHAR(50) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Table container_submission_items
CREATE TABLE IF NOT EXISTS `container_submission_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `submission_id` INT NOT NULL,
    `container_no` VARCHAR(100) NOT NULL,
    `seal_no` VARCHAR(100) NOT NULL,
    `weight` VARCHAR(100) NOT NULL,
    CONSTRAINT `fk_submission_id` FOREIGN KEY (`submission_id`) REFERENCES `container_submissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
