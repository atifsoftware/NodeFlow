-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 24, 2026 at 01:33 AM
-- Server version: 10.3.38-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

--
-- Database: `nodeflow_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT 'Guest',
  `action` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `user_agent` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `activity_logs`
--

INSERT INTO `activity_logs` (`id`, `user_id`, `user_name`, `action`, `description`, `ip_address`, `user_agent`, `created_at`) VALUES
(1, 1, 'System Administrator', 'GENERATE_BACKUP', 'নতুন ডাটাবেজ ব্যাকআপ ফাইল তৈরি করা হয়েছে: backup-nodeflow_db-1780289502168.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-01 04:51:42'),
(2, 1, 'System Administrator', 'GENERATE_BACKUP', 'নতুন ডাটাবেজ ব্যাকআপ ফাইল তৈরি করা হয়েছে: backup-nodeflow_db-1780289508057.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-01 04:51:48'),
(3, 1, 'System Administrator', 'GENERATE_BACKUP', 'নতুন ডাটাবেজ ব্যাকআপ ফাইল তৈরি করা হয়েছে: backup-nodeflow_db-1780289515216.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-01 04:51:55'),
(4, 1, 'System Administrator', 'DELETE_BACKUP', 'ডাটাবেজ ব্যাকআপ ফাইল মুছে ফেলা হয়েছে: backup-nodeflow_db-1780270617171.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-01 05:01:42'),
(5, 1, 'System Administrator', 'DELETE_BACKUP', 'ডাটাবেজ ব্যাকআপ ফাইল মুছে ফেলা হয়েছে: backup-nodeflow_db-1780289502168.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-01 05:01:47'),
(6, 1, 'System Administrator', 'UPDATE_PRODUCT', 'পণ্যের বিবরণ হালনাগাদ করা হয়েছে: Adryl Syrup 100ml (SKU: AD-SYR-100)', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-01 05:01:57'),
(7, 1, 'System Administrator', 'GENERATE_BACKUP', 'নতুন ডাটাবেজ ব্যাকআপ ফাইল তৈরি করা হয়েছে: backup-nodeflow_db-1780290184990.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-06-01 05:03:04'),
(8, 1, 'System Administrator', 'LOGIN', 'ব্যবহারকারী সফলভাবে লগইন করেছেন।', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-01 12:37:14'),
(9, 1, 'System Administrator', 'LOGIN', 'ব্যবহারকারী সফলভাবে লগইন করেছেন (SPA)।', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 21:47:16'),
(10, 1, 'System Administrator', 'LOGIN', 'ব্যবহারকারী সফলভাবে লগইন করেছেন (SPA)।', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 21:53:28'),
(11, 1, 'System Administrator', 'LOGOUT', 'ব্যবহারকারী \'System Administrator\' সফলভাবে লগআউট করেছেন (SPA)।', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 22:02:18'),
(12, 1, 'System Administrator', 'LOGIN', 'ব্যবহারকারী সফলভাবে লগইন করেছেন (SPA)।', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-02 22:02:49'),
(13, 1, 'System Administrator', 'LOGIN', 'ব্যবহারকারী সফলভাবে লগইন করেছেন (SPA)।', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-06-02 22:03:51'),
(14, 1, 'System Administrator', 'LOGOUT', 'ব্যবহারকারী \'System Administrator\' সফলভাবে লগআউট করেছেন (SPA)।', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-02 22:04:04'),
(15, 1, 'System Administrator', 'LOGIN', 'ব্যবহারকারী সফলভাবে লগইন করেছেন (SPA)।', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-02 22:04:32'),
(16, 1, 'System Administrator', 'LOGIN', 'ব্যবহারকারী সফলভাবে লগইন করেছেন (SPA)।', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 22:05:41'),
(17, 1, 'System Administrator', 'LOGIN', 'ব্যবহারকারী সফলভাবে লগইন করেছেন (SPA)।', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 22:05:54'),
(18, 1, 'System Administrator', 'GENERATE_BACKUP', 'নতুন ডাটাবেজ ব্যাকআপ ফাইল তৈরি করা হয়েছে: backup-nodeflow_db-1780441195533.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 22:59:55'),
(19, 1, 'System Administrator', 'GENERATE_BACKUP', 'নতুন ডাটাবেজ ব্যাকআপ ফাইল তৈরি করা হয়েছে: backup-nodeflow_db-1780441205885.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:00:05'),
(20, NULL, 'Guest', 'UPDATE_SETTINGS', 'সিস্টেম ব্র্যান্ড ফাইল আপলোড সম্পন্ন: logo', '127.0.0.1', 'Unknown', '2026-06-02 23:01:34'),
(21, NULL, 'Guest', 'UPDATE_SETTINGS', 'সিস্টেম ব্র্যান্ড ফাইল আপলোড সম্পন্ন: w_logo', '127.0.0.1', 'Unknown', '2026-06-02 23:01:43'),
(22, 1, 'System Administrator', 'GENERATE_BACKUP', 'নতুন ডাটাবেজ ব্যাকআপ ফাইল তৈরি করা হয়েছে: backup-nodeflow_db-1780441334161.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-02 23:02:14'),
(23, 1, 'System Administrator', 'UPDATE_SETTINGS', 'সিস্টেমের সাধারণ সেটিংসসমূহ পরিবর্তন করা হয়েছে।', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:02:25'),
(24, 1, 'System Administrator', 'DELETE_BACKUP', 'ডাটাবেজ ব্যাকআপ ফাইল মুছে ফেলা হয়েছে: backup-nodeflow_db-1780441334161.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:02:58'),
(25, 1, 'System Administrator', 'DELETE_BACKUP', 'ডাটাবেজ ব্যাকআপ ফাইল মুছে ফেলা হয়েছে: backup-nodeflow_db-1780289508057.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:03:00'),
(26, 1, 'System Administrator', 'DELETE_BACKUP', 'ডাটাবেজ ব্যাকআপ ফাইল মুছে ফেলা হয়েছে: backup-nodeflow_db-1780289515216.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:03:02'),
(27, 1, 'System Administrator', 'GENERATE_BACKUP', 'নতুন ডাটাবেজ ব্যাকআপ ফাইল তৈরি করা হয়েছে: backup-nodeflow_db-1780441384208.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:03:04'),
(28, 1, 'System Administrator', 'GENERATE_BACKUP', 'নতুন ডাটাবেজ ব্যাকআপ ফাইল তৈরি করা হয়েছে: backup-nodeflow_db-1780441387918.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:03:07'),
(29, 1, 'System Administrator', 'GENERATE_BACKUP', 'নতুন ডাটাবেজ ব্যাকআপ ফাইল তৈরি করা হয়েছে: backup-nodeflow_db-1780441413936.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:03:33'),
(30, 1, 'System Administrator', 'GENERATE_BACKUP', 'নতুন ডাটাবেজ ব্যাকআপ ফাইল তৈরি করা হয়েছে: backup-nodeflow_db-1780441447292.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:04:07'),
(31, 1, 'System Administrator', 'GENERATE_BACKUP', 'নতুন ডাটাবেজ ব্যাকআপ ফাইল তৈরি করা হয়েছে: backup-nodeflow_db-1780441450568.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:04:10'),
(32, 1, 'System Administrator', 'GENERATE_BACKUP', 'নতুন ডাটাবেজ ব্যাকআপ ফাইল তৈরি করা হয়েছে: backup-nodeflow_db-1780441464680.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:04:24'),
(33, 1, 'System Administrator', 'DELETE_BACKUP', 'ডাটাবেজ ব্যাকআপ ফাইল মুছে ফেলা হয়েছে: backup-nodeflow_db-1780290184990.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:04:29'),
(34, 1, 'System Administrator', 'DELETE_BACKUP', 'ডাটাবেজ ব্যাকআপ ফাইল মুছে ফেলা হয়েছে: backup-nodeflow_db-1780441464680.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:04:32'),
(35, 1, 'System Administrator', 'DELETE_BACKUP', 'ডাটাবেজ ব্যাকআপ ফাইল মুছে ফেলা হয়েছে: backup-nodeflow_db-1780441450568.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:04:40'),
(36, 1, 'System Administrator', 'DELETE_BACKUP', 'ডাটাবেজ ব্যাকআপ ফাইল মুছে ফেলা হয়েছে: backup-nodeflow_db-1780441447292.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:04:42'),
(37, 1, 'System Administrator', 'DELETE_BACKUP', 'ডাটাবেজ ব্যাকআপ ফাইল মুছে ফেলা হয়েছে: backup-nodeflow_db-1780441413936.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:04:44'),
(38, 1, 'System Administrator', 'DELETE_BACKUP', 'ডাটাবেজ ব্যাকআপ ফাইল মুছে ফেলা হয়েছে: backup-nodeflow_db-1780441387918.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:04:46'),
(39, 1, 'System Administrator', 'DELETE_BACKUP', 'ডাটাবেজ ব্যাকআপ ফাইল মুছে ফেলা হয়েছে: backup-nodeflow_db-1780441384208.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:04:48'),
(40, 1, 'System Administrator', 'DELETE_BACKUP', 'ডাটাবেজ ব্যাকআপ ফাইল মুছে ফেলা হয়েছে: backup-nodeflow_db-1780441205885.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:04:50'),
(41, 1, 'System Administrator', 'GENERATE_BACKUP', 'নতুন ডাটাবেজ ব্যাকআপ ফাইল তৈরি করা হয়েছে: backup-nodeflow_db-1780441491537.sql', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:04:51'),
(42, 1, 'System Administrator', 'LOGOUT', 'ব্যবহারকারী \'System Administrator\' সফলভাবে লগআউট করেছেন (SPA)।', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:05:16'),
(43, 1, 'System Administrator', 'LOGIN', 'ব্যবহারকারী সফলভাবে লগইন করেছেন (SPA)।', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:151.0) Gecko/20100101 Firefox/151.0', '2026-06-02 23:05:18'),
(44, 1, 'System Administrator', 'LOGIN', 'ব্যবহারকারী সফলভাবে লগইন করেছেন (SPA)।', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-02 23:54:38');

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE `jobs` (
  `id` bigint(20) NOT NULL,
  `queue` varchar(255) NOT NULL DEFAULT 'default',
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `reserved_at` timestamp NULL DEFAULT NULL,
  `available_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(11) NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` int(11) NOT NULL,
  `module_name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `module_name`, `description`) VALUES
(1, 'Dashboard View', 'সিস্টেমের গ্লোবাল ড্যাশবোর্ড এবং পারফরম্যান্স গ্রাফ দেখা'),
(2, 'Product Inventory (CRUD)', 'ফার্মেসির ওষুধ ও স্টক এন্ট্রি যোগ, এডিট এবং ডিলিট করা'),
(3, 'User Management (CRUD)', 'নতুন স্টাফ যোগ, তাদের অ্যাকাউন্ট স্থগিত বা চিরতরে ডিলিট করা'),
(4, 'Site Settings Management', 'লোগো পরিবর্তন, ম্যানুয়াল মেটাডাটা প্যারামিটার ও লেজার আইডি পরিবর্তন'),
(5, 'API & Token Keys', 'বহিরাগত ইন্টিগ্রেশনের জন্য JWT বা এপিআই সিক্রেট কি জেনারেট করা'),
(6, 'Queues & Logs Worker', 'সিস্টেম লগের রিয়েল-টাইম ট্র্যাকিং এবং কিউ কর্মী পরিচালনা'),
(30, 'Test Module Permission', 'Scope of dynamic module testing');

-- --------------------------------------------------------

--
-- Table structure for table `personal_access_tokens`
--

CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) NOT NULL,
  `tokenable_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `personal_access_tokens`
--

INSERT INTO `personal_access_tokens` (`id`, `tokenable_id`, `name`, `token`, `abilities`, `last_used_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'namadf', '9a7edea89d355e3732dcdf20241a974eda03086d74a256bef33099986432bf3c', '[\"*\"]', NULL, '2026-05-31 05:09:09', '2026-05-31 11:09:09');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `category` varchar(100) NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `name`, `sku`, `category`, `price`, `quantity`, `description`, `expiry_date`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'Napa Extend 665mg', 'NP-EXT-665', 'Tablet', 2.50, 120, 'Paracetamol extended release for long lasting relief.', NULL, '2026-05-31 01:24:06', '2026-05-31 01:24:06', NULL),
(2, 'Fexo 120mg', 'FX-120', 'Tablet', 8.00, 15, 'Fexofenadine Hydrochloride antihistamine allergy control.', NULL, '2026-05-31 01:24:06', '2026-05-31 01:24:06', NULL),
(3, 'Sergel 20mg', 'SR-20', 'Capsule', 7.00, 8, 'Esomeprazole capsule for gastric acidity relief.', NULL, '2026-05-31 01:24:06', '2026-05-31 01:24:06', NULL),
(4, 'Seclo 20mg', 'SC-20', 'Capsule', 6.00, 240, 'Omeprazole capsule for hyperacidity.', NULL, '2026-05-31 01:24:06', '2026-05-31 01:24:06', NULL),
(5, 'Monas 10mg', 'MN-10', 'Tablet', 16.00, 45, 'Montelukast Sodium asthma and wheezing preventative.', NULL, '2026-05-31 01:24:06', '2026-05-31 01:24:06', NULL),
(6, 'Adryl Syrup 100ml', 'AD-SYR-100', 'Syrup', 45.00, 5, 'Diphenhydramine Hydrochloride expectorant cough relief.', NULL, '2026-05-31 01:24:06', '2026-05-31 01:24:06', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `role_key` varchar(50) NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `role_key`, `role_name`, `description`) VALUES
(1, 'admin', 'Admin (সিস্টেম অ্যাডমিন)', 'সিস্টেমের পূর্ণ ক্ষমতা প্রাপ্ত অ্যাক্সেস রোল'),
(2, 'user', 'User (স্টাফ/কর্মকর্তা)', 'স্টাফ বা জেনারেল অপারেটর অ্যাক্সেস রোল'),
(3, 'guest', 'Guest (অতিথি ভিজিটর)', 'শুধুমাত্র রিড-অনলি অ্যাক্সেস রোল'),
(30, 'test-manager', 'Test Principal Manager', 'Temporary testing manager role');

-- --------------------------------------------------------

--
-- Table structure for table `role_permission`
--

CREATE TABLE `role_permission` (
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `role_permission`
--

INSERT INTO `role_permission` (`role_id`, `permission_id`) VALUES
(1, 1),
(1, 2),
(1, 3),
(1, 4),
(1, 5),
(1, 6),
(2, 1),
(2, 2),
(2, 3),
(2, 4),
(2, 5),
(2, 6);

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(255) NOT NULL,
  `setting_value` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `setting_key`, `setting_value`) VALUES
(1, 'site_name', 'NodeFlow ERP'),
(2, 'site_tagline', 'Modern Node.js MVC Framework'),
(3, 'contact_email', 'admin@nodeflow.com'),
(4, 'contact_phone', '০১৭০০০০০০০০'),
(5, 'address', 'Jashore, Bangladesh.'),
(6, 'name', 'NodeFlow'),
(7, 'short_name', 'NF'),
(8, 'mobile', '01721752894'),
(9, 'email', 'shohaghinfo@gmail.com'),
(10, 'web', 'www.atifsoft.com'),
(11, 'cash_ledger_id', ''),
(12, 'sales_ledger_id', ''),
(13, 'purchase_ledger_id', ''),
(14, 'sales_return_ledger_id', ''),
(15, 'purchase_return_ledger_id', ''),
(16, 'logo', '/uploads/brand/brand_1780441294872_326.webp'),
(17, 'w_logo', '/uploads/brand/brand_1780441303345_822.webp'),
(18, 'favicon', '/uploads/brand/brand_1780287613598_645.webp');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'user',
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `status`, `created_at`, `updated_at`) VALUES
(1, 'System Administrator', 'admin@nodeflow.com', '$2a$10$zMyjOJIQYrZ4dUvup3MF1.s5h6IOELGf4DrhBWr8Pp2JU4EtyLIMi', 'admin', 'active', '2026-05-31 01:24:00', '2026-05-31 01:24:00');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `tokenable_id` (`tokenable_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD KEY `idx_products_sku` (`sku`),
  ADD KEY `idx_products_name` (`name`),
  ADD KEY `idx_products_category` (`category`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `role_key` (`role_key`);

--
-- Indexes for table `role_permission`
--
ALTER TABLE `role_permission`
  ADD PRIMARY KEY (`role_id`,`permission_id`),
  ADD KEY `permission_id` (`permission_id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=137;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD CONSTRAINT `personal_access_tokens_ibfk_1` FOREIGN KEY (`tokenable_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `role_permission`
--
ALTER TABLE `role_permission`
  ADD CONSTRAINT `role_permission_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_permission_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE;
COMMIT;
