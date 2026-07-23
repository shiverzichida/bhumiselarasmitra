-- PT. Putera Utama Lautan - Bill of Lading System Database Dump
-- Generated on 2026-06-24 09:38:57

DROP TABLE IF EXISTS `bills_of_lading`;
CREATE TABLE `bills_of_lading` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `booking_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bl_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `shipper` text COLLATE utf8mb4_unicode_ci,
  `consignee` text COLLATE utf8mb4_unicode_ci,
  `notify_party` text COLLATE utf8mb4_unicode_ci,
  `delivery_agent` text COLLATE utf8mb4_unicode_ci,
  `pre_carriage` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ocean_vessel` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voy_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `place_of_receipt` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `port_of_loading` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `port_of_discharge` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `place_of_delivery` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cargo_containers` text COLLATE utf8mb4_unicode_ci,
  `cargo_quantity` text COLLATE utf8mb4_unicode_ci,
  `cargo_description` text COLLATE utf8mb4_unicode_ci,
  `cargo_measurement` text COLLATE utf8mb4_unicode_ci,
  `freight_charges` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `revenue_tons` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rate` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `per` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prepaid` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collect` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ex_rate` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prepaid_at` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payable_at` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `place_date_issue` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `movement` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `no_of_original` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signed_on_behalf` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_version` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'PT. Putera Utama Lautan',
  `share_slug` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_modified` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `share_slug` (`share_slug`),
  KEY `idx_bl_no` (`bl_no`),
  KEY `idx_booking_no` (`booking_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `bills_of_lading`
INSERT INTO `bills_of_lading` (`id`, `booking_no`, `bl_no`, `shipper`, `consignee`, `notify_party`, `delivery_agent`, `pre_carriage`, `ocean_vessel`, `voy_no`, `place_of_receipt`, `port_of_loading`, `port_of_discharge`, `place_of_delivery`, `cargo_containers`, `cargo_quantity`, `cargo_description`, `cargo_measurement`, `freight_charges`, `revenue_tons`, `rate`, `per`, `prepaid`, `collect`, `ex_rate`, `prepaid_at`, `payable_at`, `place_date_issue`, `movement`, `no_of_original`, `signed_on_behalf`, `company_version`, `share_slug`, `last_modified`) VALUES ('id_1782189858063_629', 'PU26060013', 'PNKPGU26060159', 'PT. UNICOCO INDUSTRIES INDONESIA\nJL. RAYA PONTIANAK SINGKAWANG/DUSUN MANDALA\nRT/RW.001/001, DESA MANDALOK , KEC SUNGAI KUNYIT\nKAB MEMPAWAH 78371 KALIMANTAN BARAT\nON BEHALF OF AGRIM PTE LTD', 'MEWAHOLEO INDUSTRIES SDN BHD\nPLO 283 & PLO 518 JALAN BESI SATU, PASIR GUDANG INDUSTRIAL\nESTATE, 81700 PASIR GUDANG, JOHOR DARUL TAKZIM, MALAYSIA', 'MEWAHOLEO INDUSTRIES SDN BHD\nPLO 283 & PLO 518 JALAN BESI SATU, PASIR GUDANG INDUSTRIAL\nESTATE, 81700 PASIR GUDANG, JOHOR DARUL TAKZIM, MALAYSIA', 'MERRICK LOGISTICS (M) SDN BHD\n8-02 MOLEK 1/31 , TAMAN MOLEK\n81100 JOHOR BAHRU MALAYSIA\nTEL : +07-3570929 FAX :', '', 'MMSS 2711', '261013N', 'KIJING, INDONESIA', 'KIJING, INDONESIA', 'PASIR GUDANG, MALAYSIA', 'PASIR GUDANG, MALAYSIA', 'JHSU2674421/P174421\nJHSU2675963/P174422\n\nLOT NO : 004CCNO062026/09\nLOT NO : 004CCNO062026/10\nMPCCNO : 309416C', '2 FLEXI BAGS', '2 X 20 GP CONTAINER\n2 FLEXI BAGS (42.00 NET) IN 2X20\' FCL\nCRUDE COCONUT OIL\nBULK IN FLEXI BAGS\nFLEXI BAGS :\nFLEXI BAGS :\n\nHS CODE: 1513.11.90\n\n14 DAYS FREE TIME DEMURRAGE & DETENTION AT DESTINATION', '0,00 M3\n42.500,00 KGS', 'FREIGHT COLLECT', '', '', '', '', '', '', '', '', 'KIJING, INDONESIA 22-Jun-2026', '', 'THREE(3)', 'PT. PUTERA UTAMA LAUTAN', 'PT. Putera Utama Lautan', NULL, '2026-06-23 16:35:57');
INSERT INTO `bills_of_lading` (`id`, `booking_no`, `bl_no`, `shipper`, `consignee`, `notify_party`, `delivery_agent`, `pre_carriage`, `ocean_vessel`, `voy_no`, `place_of_receipt`, `port_of_loading`, `port_of_discharge`, `place_of_delivery`, `cargo_containers`, `cargo_quantity`, `cargo_description`, `cargo_measurement`, `freight_charges`, `revenue_tons`, `rate`, `per`, `prepaid`, `collect`, `ex_rate`, `prepaid_at`, `payable_at`, `place_date_issue`, `movement`, `no_of_original`, `signed_on_behalf`, `company_version`, `share_slug`, `last_modified`) VALUES ('id_1782272502044_974', 'PU26060007', 'PNKPGU26060157', 'PT. INDONESIA CHEMICAL ALUMINA\nGD. ANEKA TAMBANG JL. TB SIMATUPANG NO.1 TANJUNG BARAT, TANJUNG BARAT, JAGAKARSA,', 'TO THE ORDER OF WOORI BANK SEOUL\n-', 'KG CHEMICAL CORPORATION\n92, TONGIL-RO, JUNGU-GU, SEOUL,REP. OF KOREA', 'MERRICK LOGISTICS (M) SDN BHD\n8-02 MOLEK 1/31 , TAMAN MOLEK\n81100 JOHOR BAHRU MALAYSIA\nTEL : +07-3570929 FAX :', '', 'BG.MMSS 2711', '261013N', 'SANGGAU, INDONESIA', 'SANGGAU, INDONESIA', 'BUSAN, (EX PUSAN), KOREA, REPUBLIC OF', 'BUSAN, (EX PUSAN), KOREA, REPUBLIC OF', 'EGSU2128091\nEITU3320022\nEGSU3636142\nEGSU3923219\nEGSU3333871\nEGSU3520018\nEMCU6174075\nEGSU2104762\nEGHU3501694\nEGSU2570420\nEGSU2002971\nEGSU2553357\nEGSU2220356\nEGSU3666276\nEGSU2206907\nEGSU3756282\nEGHU3327005\nEGHU3490413\nBEAU2517432\nCAIU6085809\nEGSU3547106\nEGSU3219745\nEGSU2209866\nEGHU3301926\nEMCU6119859\nEGSU3425242\nEGSU3722174\nEGSU3715869\nEITU3360637\nEGSU2104886\nEGSU2042212\nEGSU3842570\nEGSU3821222\nEGSU3767013', '680 BAGS\n340 PALLETS', 'SHIPPER\'S LOAD, COUNT & SEAL.\n34X20\'GP CONTAINER S.T.C\n\n\nALUMINIUM HYDROXIDE (680 JUMBO BAG @1100 KG\n\nFREIGHT PREPAID\nSHIPPED ON BOARD : BG.MMSS 2711 V.261013N\nSANGGAU 24 JUNE 2026', '0.00 M3\n\n74,800.00 KGS', '', '', '', '', '', '', '', '', 'PONTIANAK', 'SANGGAU, INDONESIA   24-Jun-2026', '', 'THREE(3)', 'PT. PUTERA UTAMA LAUTAN', 'PT. Putera Utama Lautan', 'm1nuQnIySNcF', '2026-06-24 14:58:20');
INSERT INTO `bills_of_lading` (`id`, `booking_no`, `bl_no`, `shipper`, `consignee`, `notify_party`, `delivery_agent`, `pre_carriage`, `ocean_vessel`, `voy_no`, `place_of_receipt`, `port_of_loading`, `port_of_discharge`, `place_of_delivery`, `cargo_containers`, `cargo_quantity`, `cargo_description`, `cargo_measurement`, `freight_charges`, `revenue_tons`, `rate`, `per`, `prepaid`, `collect`, `ex_rate`, `prepaid_at`, `payable_at`, `place_date_issue`, `movement`, `no_of_original`, `signed_on_behalf`, `company_version`, `share_slug`, `last_modified`) VALUES ('id_1782274276210_346', 'PU26060005', 'PNKPGU26060142', 'PT. BORNEO ALLUMINA INDONESIA\nGEDUNG ANEKA TAMBANG LANTAI 2\nJALAN T.B. SIMATUPANG, NOMOR 1\nLINGKAR SELATAN , TANJUNG BARAT, JAGAKARSA,\n12530 JAKARTA SELATAN INDONESIA', 'SEE SEN CHEMICAL BHD\nPLO 276, JALAN PEKELILING, PASIR GUDANG INDUSTRIAL ESTATE\n81700 PASIR GUDANG JOHOR DARUL TAKZIM, MALAYSIA', 'SAME AS CONSIGNEE\nSAME AS CONSIGNEE', 'MERRICK LOGISTICS (M) SDN BHD\n8-02 MOLEK 1/31 , TAMAN MOLEK\n81100 JOHOR BAHRU MALAYSIA\nTEL : +07-3570929 FAX :', '', 'BG.MMSS 2711', '261013N', 'PONTIANAK, INDONESIA', 'PONTIANAK, INDONESIA', 'PASIR GUDANG, MALAYSIA', 'PASIR GUDANG, MALAYSIA', 'CRSU1247943/P174411/20GP\nDRYU2551746/P174424/20GP\nCRSU1249904/P174425/20GP\nJHSU2662483/P174413/20GP\nIRNU3689495/P174420/20GP\nJHSU2635488/P174419/20GP\nEMCU6054418/P174418/20GP\nGESU2997529/P174414/20GP\nCRSU1213239/P174418/20GP\nCRSU1250090/P174417/20GP\nIMTU3030140/P174415/20GP\nGESU2581022/P174416/20GP', '264 BAGS\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n', 'SHIPPER\'S LOAD, COUNT & SEAL.\n12X20GP FCL SAID TO CONTAIN\nCY/CY\nALUMINIUM HYDROXIDE\nHS CODE : 281830\nFREIGHT COLLECT\nSHIPPED ON BOARD', '264,00 M3\n\n265.200,00 KGS', 'Term : FREIGHT COLLECT', '', '', '', '', '', '', '', '', 'KIJING, INDONESIA   20-Jun-2026 ', '', 'THREE(3)  PT. PUTERA UTAMA LAUTAN', 'PT. PUTERA UTAMA LAUTAN', 'PT. Putera Utama Lautan', 'UxUE97kvlVz5', '2026-06-24 16:24:15');

DROP TABLE IF EXISTS `saved_parties`;
CREATE TABLE `saved_parties` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_party` (`type`,`name`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table `saved_parties`
INSERT INTO `saved_parties` (`id`, `type`, `name`, `address`, `created_at`) VALUES ('1', 'shipper', 'PT. PUTERA UTAMA LAUTAN (JAMBI)', 'JL. JENDRAL SUDIRMAN KOMPLEK TRANSMART\nRUKO BLOK D36 RT.32, KEL TAMBAK SARI\nKEC. JAMBI SELATAN\n36122 JAMBI INDONESIA', '2026-06-07 22:50:22');
INSERT INTO `saved_parties` (`id`, `type`, `name`, `address`, `created_at`) VALUES ('2', 'consignee', 'PT. PUTERA UTAMA LAUTAN (PONTIANAK)', 'JL. KEMAKMURAN GG. KELUARGA 2\nNO. 12A KEC. PONTIANAK KOTA, KOTA PONTIANAK\nKALIMANTAN BARAT\n78113 PONTIANAK INDONESIA', '2026-06-07 22:50:22');
INSERT INTO `saved_parties` (`id`, `type`, `name`, `address`, `created_at`) VALUES ('3', 'notify', 'SAME AS CONSIGNEE', 'SAME AS CONSIGNEE', '2026-06-07 22:50:22');
INSERT INTO `saved_parties` (`id`, `type`, `name`, `address`, `created_at`) VALUES ('4', 'shipper', 'TEST EXPORTER', 'TEST ADDR', '2026-06-07 23:35:18');
INSERT INTO `saved_parties` (`id`, `type`, `name`, `address`, `created_at`) VALUES ('5', 'shipper', 'PT. UNICOCO INDUSTRIES INDONESIA', 'JL. RAYA PONTIANAK SINGKAWANG/DUSUN MANDALA\nRT/RW.001/001, DESA MANDALOK , KEC SUNGAI KUNYIT\nKAB MEMPAWAH 78371 KALIMANTAN BARAT\nON BEHALF OF AGRIM PTE LTD', '2026-06-23 11:39:58');
INSERT INTO `saved_parties` (`id`, `type`, `name`, `address`, `created_at`) VALUES ('6', 'consignee', 'MEWAHOLEO INDUSTRIES SDN BHD', 'PLO 283 & PLO 518 JALAN BESI SATU, PASIR GUDANG INDUSTRIAL\nESTATE, 81700 PASIR GUDANG, JOHOR DARUL TAKZIM, MALAYSIA', '2026-06-23 11:40:00');
INSERT INTO `saved_parties` (`id`, `type`, `name`, `address`, `created_at`) VALUES ('7', 'notify', 'MEWAHOLEO INDUSTRIES SDN BHD', 'PLO 283 & PLO 518 JALAN BESI SATU, PASIR GUDANG INDUSTRIAL\nESTATE, 81700 PASIR GUDANG, JOHOR DARUL TAKZIM, MALAYSIA', '2026-06-23 11:40:13');
INSERT INTO `saved_parties` (`id`, `type`, `name`, `address`, `created_at`) VALUES ('9', 'shipper', 'PT. INDONESIA CHEMICAL ALUMINA', 'GD. ANEKA TAMBANG JL. TB SIMATUPANG NO.1 TANJUNG BARAT, TANJUNG BARAT, JAGAKARSA,', '2026-06-24 10:34:34');
INSERT INTO `saved_parties` (`id`, `type`, `name`, `address`, `created_at`) VALUES ('10', 'consignee', 'TO THE ORDER OF WOORI BANK SEOUL', '-', '2026-06-24 10:35:10');
INSERT INTO `saved_parties` (`id`, `type`, `name`, `address`, `created_at`) VALUES ('11', 'notify', 'KG CHEMICAL CORPORATION', '92, TONGIL-RO, JUNGU-GU, SEOUL,REP. OF KOREA', '2026-06-24 10:35:22');
INSERT INTO `saved_parties` (`id`, `type`, `name`, `address`, `created_at`) VALUES ('12', 'shipper', 'PT. BORNEO ALLUMINA INDONESIA', 'GEDUNG ANEKA TAMBANG LANTAI 2\nJALAN T.B. SIMATUPANG, NOMOR 1\nLINGKAR SELATAN , TANJUNG BARAT, JAGAKARSA,\n12530 JAKARTA SELATAN INDONESIA', '2026-06-24 11:08:18');
INSERT INTO `saved_parties` (`id`, `type`, `name`, `address`, `created_at`) VALUES ('13', 'consignee', 'SEE SEN CHEMICAL BHD', 'PLO 276, JALAN PEKELILING, PASIR GUDANG INDUSTRIAL ESTATE\n81700 PASIR GUDANG JOHOR DARUL TAKZIM, MALAYSIA', '2026-06-24 11:08:35');
INSERT INTO `saved_parties` (`id`, `type`, `name`, `address`, `created_at`) VALUES ('14', 'notify', 'ARGO SHIPPING SDN BHD', 'NO 17-01, JALAN KOTA 3, TAMAN CAHAYA KOTA PUTERI, 81750\nJOHOR BAHRU, JOHOR, MALAYSIA', '2026-06-24 11:08:56');

