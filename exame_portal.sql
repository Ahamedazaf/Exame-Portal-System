-- ============================================================
--  EXAME PORTAL — Complete Database SQL File (v2 - Fixed)
--  
--  IMPORTANT: இந்த SQL file import செய்த பிறகு,
--  passwords சரியாக set ஆக:
--  node scripts/init-db.js --reset-passwords
--  run செய்யவும்
--
--  phpMyAdmin → Import → exame_portal.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `exame_portal`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `exame_portal`;

-- ── Tables ────────────────────────────────────────────────────

DROP TABLE IF EXISTS `results`;
DROP TABLE IF EXISTS `questions`;
DROP TABLE IF EXISTS `exams`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `classes`;

CREATE TABLE `classes` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(255) NOT NULL,
  `status`     ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(255) NOT NULL,
  `email`      VARCHAR(255) NOT NULL,
  `password`   VARCHAR(255) NOT NULL,
  `role`       ENUM('teacher','student') NOT NULL DEFAULT 'student',
  `status`     ENUM('active','blocked')  NOT NULL DEFAULT 'active',
  `class_id`      INT          NULL,
  `google_id`     VARCHAR(255) NULL,
  `auth_provider` ENUM('local','google') NOT NULL DEFAULT 'local',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email` (`email`),
  KEY `idx_role`     (`role`),
  KEY `idx_class_id` (`class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `exams` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `title`        VARCHAR(255) NOT NULL,
  `class_id`     INT          NOT NULL,
  `instructions` TEXT         NULL,
  `status`       ENUM('draft','published','closed') NOT NULL DEFAULT 'draft',
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_class_id` (`class_id`),
  KEY `idx_status`   (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `questions` (
  `id`         INT      NOT NULL AUTO_INCREMENT,
  `exam_id`    INT      NOT NULL,
  `text`       TEXT     NOT NULL,
  `options`    JSON     NOT NULL,
  `correct`    TINYINT  NOT NULL DEFAULT 0,
  `marks`      INT      NOT NULL DEFAULT 10,
  `timer`      INT      NOT NULL DEFAULT 30,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_exam_id` (`exam_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `results` (
  `id`           INT      NOT NULL AUTO_INCREMENT,
  `student_id`   INT      NOT NULL,
  `exam_id`      INT      NOT NULL,
  `score`        INT      NOT NULL DEFAULT 0,
  `total_marks`  INT      NOT NULL DEFAULT 0,
  `correct`      INT      NOT NULL DEFAULT 0,
  `wrong`        INT      NOT NULL DEFAULT 0,
  `answers`      JSON     NULL,
  `completed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_exam` (`student_id`, `exam_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_exam_id`    (`exam_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ── Demo Data ─────────────────────────────────────────────────

INSERT INTO `classes` (`name`, `status`) VALUES
('Computer Science Batch 01',   'active'),
('Computer Science Batch 02',   'active'),
('Diploma Web Development B01', 'active');

-- NOTE: Passwords are plain text here — run init-db.js to hash them properly
-- OR use the app's register page to create accounts
-- Temporary plain passwords (will NOT work until hashed by init-db.js):
INSERT INTO `users` (`name`, `email`, `password`, `role`, `status`, `class_id`) VALUES
('Admin Teacher', 'teacher@exame.com', 'NEEDS_HASH', 'teacher', 'active', NULL),
('Arun Kumar',    'arun@student.com',  'NEEDS_HASH', 'student', 'active', 1),
('Priya Devi',    'priya@student.com', 'NEEDS_HASH', 'student', 'active', 1);

INSERT INTO `exams` (`title`, `class_id`, `instructions`, `status`) VALUES
('JavaScript Basics Test',  1, 'Read each question carefully. You have a timer per question.', 'published'),
('HTML & CSS Fundamentals', 3, 'Answer all MCQ questions carefully.', 'draft');

INSERT INTO `questions` (`exam_id`, `text`, `options`, `correct`, `marks`, `timer`) VALUES
(1, 'What does HTML stand for?',
 '["Hyper Text Markup Language","High Tech Modern Language","Hyper Transfer Markup Logic","Home Tool Markup Language"]',
 0, 10, 30),
(1, 'Which keyword declares a variable in JavaScript?',
 '["var","int","string","declare"]',
 0, 10, 30),
(1, 'What is the output of: console.log(typeof null)?',
 '["\\"object\\"","\\"null\\"","\\"undefined\\"","\\"string\\""]',
 0, 10, 45),
(2, 'Which tag creates a hyperlink in HTML?',
 '["<a>","<link>","<href>","<url>"]',
 0, 10, 30),
(2, 'What does CSS stand for?',
 '["Cascading Style Sheets","Creative Style Syntax","Computer Style Sheets","Colorful Style Syntax"]',
 0, 10, 30);
