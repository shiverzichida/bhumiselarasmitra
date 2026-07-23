-- Table: trucking_jobs
CREATE TABLE IF NOT EXISTS `trucking_jobs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `vessel_voyage` VARCHAR(255) NOT NULL,
  `container_no` VARCHAR(50) NOT NULL,
  `container_size` VARCHAR(20) NOT NULL,
  `commodity` VARCHAR(255) NOT NULL,
  `pic_name` VARCHAR(100) NULL,
  `company_name` VARCHAR(100) NULL,
  `container_photo` MEDIUMTEXT NULL,
  `total_weight` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_modified` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: trucking_allocations
CREATE TABLE IF NOT EXISTS `trucking_allocations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `job_id` INT NOT NULL,
  `plate_no` VARCHAR(50) NOT NULL,
  `driver_name` VARCHAR(150) NOT NULL,
  `weight` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `truck_photo` MEDIUMTEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`job_id`) REFERENCES `trucking_jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
