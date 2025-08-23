-- Create database if not exists
CREATE DATABASE IF NOT EXISTS ibanking_db;
USE ibanking_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    tuition_amount DECIMAL(15, 2) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    academic_year VARCHAR(20) NOT NULL,
    semester INT NOT NULL,
    due_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student_id (student_id),
    INDEX idx_is_paid (is_paid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_code VARCHAR(50) UNIQUE NOT NULL,
    payer_id INT NOT NULL,
    student_id VARCHAR(20) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    status ENUM('pending', 'otp_sent', 'otp_verified', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (payer_id) REFERENCES users(id),
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    INDEX idx_transaction_code (transaction_code),
    INDEX idx_payer_id (payer_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id INT NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    email VARCHAR(100) NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_otp_code (otp_code),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transaction history table
CREATE TABLE IF NOT EXISTS transaction_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    transaction_id INT,
    transaction_type ENUM('payment', 'deposit', 'withdrawal', 'transfer') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    balance_before DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    description TEXT,
    status ENUM('success', 'failed', 'pending') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    INDEX idx_user_id (user_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transaction locks table (for concurrency control)
CREATE TABLE IF NOT EXISTS transaction_locks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    resource_type ENUM('user_account', 'student_tuition') NOT NULL,
    resource_id VARCHAR(50) NOT NULL,
    transaction_id INT NOT NULL,
    locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    UNIQUE KEY unique_lock (resource_type, resource_id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data for testing

-- Insert test users (password is '123456' hashed with bcrypt)
INSERT INTO users (username, password_hash, full_name, phone, email, balance) VALUES
('johndoe', '$2b$10$STQPLLrUX8zr8YdXlMSdxOIJ2WMBZqjlxMhDKinP6y1xPhzbw0jua', 'John Doe', '0901234567', 'john.doe@email.com', 50000000.00),
('williamma', '$2b$10$STQPLLrUX8zr8YdXlMSdxOIJ2WMBZqjlxMhDKinP6y1xPhzbw0jua', 'William Ma', '0901234567', 'cuongcfvipss5@gmail.com', 50000000.00),
('mqcuong', '$2b$10$STQPLLrUX8zr8YdXlMSdxOIJ2WMBZqjlxMhDKinP6y1xPhzbw0jua', 'Cuong Ma', '0901234567', 'mqcuong1603@gmail.com', 50000000.00),
('janedoe', '$2b$10$STQPLLrUX8zr8YdXlMSdxOIJ2WMBZqjlxMhDKinP6y1xPhzbw0jua', 'Jane Doe', '0907654321', 'jane.doe@email.com', 30000000.00),
('testuser', '$2b$10$STQPLLrUX8zr8YdXlMSdxOIJ2WMBZqjlxMhDKinP6y1xPhzbw0jua', 'Test User', '0909999999', 'test.user@email.com', 100000000.00);

-- Insert test students
INSERT INTO students (student_id, full_name, tuition_amount, is_paid, academic_year, semester, due_date) VALUES
('51900001', 'Nguyen Van A', 15000000.00, FALSE, '2024-2025', 1, '2025-01-31'),
('51900002', 'Tran Thi B', 12000000.00, FALSE, '2024-2025', 1, '2025-01-31'),
('51900003', 'Le Van C', 18000000.00, FALSE, '2024-2025', 1, '2025-01-31'),
('51900004', 'Pham Thi D', 15000000.00, TRUE, '2024-2025', 1, '2025-01-31'),
('51900005', 'Hoang Van E', 20000000.00, FALSE, '2024-2025', 1, '2025-01-31');

-- Create stored procedure for cleaning expired locks
DELIMITER //
CREATE PROCEDURE clean_expired_locks()
BEGIN
    DELETE FROM transaction_locks WHERE expires_at < NOW();
END //
DELIMITER ;

-- Create event to run cleanup every 5 minutes
CREATE EVENT IF NOT EXISTS clean_expired_locks_event
ON SCHEDULE EVERY 5 MINUTE
DO CALL clean_expired_locks();