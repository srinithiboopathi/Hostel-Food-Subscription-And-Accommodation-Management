-- =============================================================================
-- HOSTEL FOOD & ACCOMMODATION MANAGEMENT SYSTEM
-- Production-Ready MySQL Relational Database Schema
-- Designed for: Admin, Warden, Mess Manager, Accountant, Student
-- =============================================================================

CREATE DATABASE IF NOT EXISTS hostel_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hostel_db;

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. USERS & ROLES TABLE
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS visitors;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS fee_payments;
DROP TABLE IF EXISTS student_fee_dues;
DROP TABLE IF EXISTS fee_structures;
DROP TABLE IF EXISTS meal_attendance;
DROP TABLE IF EXISTS mess_menu;
DROP TABLE IF EXISTS room_allocations;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS hostels;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT') NOT NULL DEFAULT 'STUDENT',
    phone VARCHAR(20) NULL,
    avatar_url VARCHAR(255) NULL,
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    last_login_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role),
    INDEX idx_user_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 2. HOSTELS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE hostels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    type ENUM('BOYS', 'GIRLS', 'COED') NOT NULL DEFAULT 'BOYS',
    total_floors INT NOT NULL DEFAULT 1,
    warden_id INT NULL,
    address TEXT NULL,
    contact_phone VARCHAR(20) NULL,
    status ENUM('ACTIVE', 'MAINTENANCE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (warden_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_hostel_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 3. ROOMS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    floor INT NOT NULL DEFAULT 1,
    room_type ENUM('SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_BED', 'DORM') NOT NULL DEFAULT 'DOUBLE',
    capacity INT NOT NULL DEFAULT 2,
    occupied_count INT NOT NULL DEFAULT 0,
    base_rent DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    amenities JSON NULL,
    status ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED') NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE,
    UNIQUE KEY uq_hostel_room (hostel_id, room_number),
    INDEX idx_room_status (status),
    INDEX idx_room_type (room_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 4. STUDENTS TABLE (Extends User)
-- -----------------------------------------------------------------------------
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    roll_number VARCHAR(50) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    course VARCHAR(100) NOT NULL,
    year_of_study INT NOT NULL DEFAULT 1,
    gender ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
    dob DATE NULL,
    blood_group VARCHAR(10) NULL,
    guardian_name VARCHAR(120) NOT NULL,
    guardian_phone VARCHAR(20) NOT NULL,
    guardian_relation VARCHAR(50) NOT NULL DEFAULT 'Parent',
    permanent_address TEXT NOT NULL,
    current_hostel_id INT NULL,
    current_room_id INT NULL,
    admission_date DATE NOT NULL,
    status ENUM('ACTIVE', 'PASSED_OUT', 'SUSPENDED', 'VACATED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (current_hostel_id) REFERENCES hostels(id) ON DELETE SET NULL,
    FOREIGN KEY (current_room_id) REFERENCES rooms(id) ON DELETE SET NULL,
    INDEX idx_student_roll (roll_number),
    INDEX idx_student_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 5. ROOM ALLOCATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE room_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    room_id INT NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    allocated_from DATE NOT NULL,
    allocated_to DATE NULL,
    security_deposit DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status ENUM('ACTIVE', 'TRANSFERRED', 'VACATED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    allocated_by INT NULL,
    vacated_at DATETIME NULL,
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (allocated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_allocation_status (status),
    INDEX idx_allocation_student (student_id),
    INDEX idx_allocation_room (room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 6. MESS MENU TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE mess_menu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    day_of_week ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
    meal_type ENUM('BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    menu_items TEXT NOT NULL,
    special_item VARCHAR(150) NULL,
    calories_est INT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_day_meal (day_of_week, meal_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 7. MEAL ATTENDANCE TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE meal_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    meal_date DATE NOT NULL,
    meal_type ENUM('BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER') NOT NULL,
    status ENUM('PRESENT', 'ABSENT', 'SPECIAL_REQUEST', 'PACKED') NOT NULL DEFAULT 'PRESENT',
    marked_by INT NULL,
    remarks VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uq_student_meal_date (student_id, meal_date, meal_type),
    INDEX idx_meal_date (meal_date),
    INDEX idx_meal_type (meal_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 8. FEE STRUCTURES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE fee_structures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    term_type ENUM('SEMESTER', 'ANNUAL', 'MONTHLY') NOT NULL DEFAULT 'SEMESTER',
    hostel_rent DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    mess_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    maintenance_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    security_deposit DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) GENERATED ALWAYS AS (hostel_rent + mess_fee + maintenance_fee + security_deposit) STORED,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 9. STUDENT FEE DUES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE student_fee_dues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    fee_structure_id INT NOT NULL,
    bill_number VARCHAR(50) NOT NULL UNIQUE,
    term_name VARCHAR(100) NOT NULL,
    amount_due DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED') NOT NULL DEFAULT 'PENDING',
    due_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id) ON DELETE RESTRICT,
    INDEX idx_fee_status (status),
    INDEX idx_fee_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 10. FEE PAYMENTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE fee_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fee_due_id INT NOT NULL,
    student_id INT NOT NULL,
    receipt_number VARCHAR(60) NOT NULL UNIQUE,
    transaction_id VARCHAR(100) NULL,
    payment_method ENUM('UPI', 'CARD', 'NET_BANKING', 'CASH', 'CHEQUE', 'DEMAND_DRAFT') NOT NULL DEFAULT 'UPI',
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_status ENUM('SUCCESS', 'PENDING', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'SUCCESS',
    collected_by INT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fee_due_id) REFERENCES student_fee_dues(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (collected_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_payment_receipt (receipt_number),
    INDEX idx_payment_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 11. COMPLAINTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(40) NOT NULL UNIQUE,
    student_id INT NOT NULL,
    room_id INT NULL,
    category ENUM('ROOM_MAINTENANCE', 'ELECTRICAL', 'PLUMBING', 'MESS_FOOD', 'CLEANLINESS', 'INTERNET', 'SECURITY', 'NOISE', 'OTHER') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    status ENUM('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    assigned_to INT NULL,
    resolution_notes TEXT NULL,
    resolved_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_complaint_status (status),
    INDEX idx_complaint_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 12. LEAVE REQUESTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    leave_type ENUM('HOME_VISIT', 'MEDICAL', 'ACADEMIC_EVENT', 'EMERGENCY', 'OTHER') NOT NULL DEFAULT 'HOME_VISIT',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    destination_address TEXT NOT NULL,
    emergency_contact VARCHAR(20) NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'RETURNED') NOT NULL DEFAULT 'PENDING',
    reviewed_by INT NULL,
    review_remarks TEXT NULL,
    actual_return_time DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_leave_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 13. VISITOR MANAGEMENT TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE visitors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    visitor_name VARCHAR(120) NOT NULL,
    relationship VARCHAR(60) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    id_proof_type ENUM('AADHAAR', 'PAN', 'DRIVING_LICENSE', 'PASSPORT', 'VOTER_ID', 'OTHER') NOT NULL,
    id_proof_number VARCHAR(50) NOT NULL,
    purpose TEXT NOT NULL,
    check_in_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    check_out_time DATETIME NULL,
    status ENUM('INSIDE', 'CHECKED_OUT', 'BLOCKED') NOT NULL DEFAULT 'INSIDE',
    approved_by INT NULL,
    remarks VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_visitor_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 14. NOTIFICATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('SYSTEM', 'FEES', 'LEAVE', 'COMPLAINT', 'MESS', 'ROOM', 'NOTICE') NOT NULL DEFAULT 'NOTICE',
    link VARCHAR(255) NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notification_user (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 15. AUDIT LOGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id INT NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
