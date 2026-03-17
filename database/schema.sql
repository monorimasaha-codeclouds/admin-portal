-- Admin Portal Database Schema

CREATE DATABASE IF NOT EXISTS admin_portal;
USE admin_portal;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  address VARCHAR(512) NOT NULL,
  city VARCHAR(255) NOT NULL,
  zip VARCHAR(20) NOT NULL,
  state VARCHAR(255) NOT NULL,
  status ENUM('pending', 'testing', 'completed', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Test Reports table
CREATE TABLE IF NOT EXISTS test_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  report_type ENUM('full', 'seo', 'ssl', 'functional') DEFAULT 'full',
  report_pdf_path VARCHAR(512),
  status ENUM('pending', 'generating', 'completed', 'failed') DEFAULT 'pending',
  issues_json JSON,
  screenshots_json JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Project Links table
CREATE TABLE IF NOT EXISTS project_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  link_type VARCHAR(255) NOT NULL,
  url VARCHAR(512) NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Project Test Cards table
CREATE TABLE IF NOT EXISTS project_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  card_number VARCHAR(50) NOT NULL,
  card_type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  card_month VARCHAR(2) NOT NULL,
  card_year VARCHAR(4) NOT NULL,
  cvv VARCHAR(4) NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
