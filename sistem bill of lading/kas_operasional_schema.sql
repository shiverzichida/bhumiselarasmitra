-- =========================================================================
-- CREATE TABLE kas_operasional
-- =========================================================================

CREATE TABLE IF NOT EXISTS `kas_operasional` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tgl_cetak` DATETIME NULL,
    `no_proforma` VARCHAR(50) NULL,
    `kode_bayar` VARCHAR(50) NULL,
    `kapal` VARCHAR(100) NULL,
    `nama_tertagih` VARCHAR(150) NULL,
    `keterangan` VARCHAR(200) NULL,
    `keterangan_tambahan` VARCHAR(255) NULL,
    `no_count` VARCHAR(255) NULL,
    `valuta` VARCHAR(10) DEFAULT 'IDR',
    `debit` DECIMAL(15,2) DEFAULT 0.00,
    `kredit` DECIMAL(15,2) DEFAULT 0.00,
    `total_petikemas` INT DEFAULT 0,
    `sub_total` DECIMAL(15,2) DEFAULT 0.00,
    `ppn` DECIMAL(15,2) DEFAULT 0.00,
    `materai` DECIMAL(15,2) DEFAULT 0.00,
    `grand_total` DECIMAL(15,2) DEFAULT 0.00,
    `items_json` TEXT NULL,          -- JSON string storing detailed invoice activity rows
    `containers_json` TEXT NULL,     -- JSON string storing detailed petikemas rows
    `file_path` VARCHAR(255) NULL,    -- Path to uploaded file (PDF/JPG/PNG)
    `is_ho` TINYINT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `last_modified` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
