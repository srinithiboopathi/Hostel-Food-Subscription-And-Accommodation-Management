-- =============================================================================
-- HOSTEL FOOD & ACCOMMODATION MANAGEMENT SYSTEM
-- Database: hostel_management
-- Architecture: 3NF Relational Database Schema
-- Standard: MySQL 8.0+ / MariaDB 10.4+ Compatible
-- =============================================================================

CREATE DATABASE IF NOT EXISTS hostel_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hostel_management;

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE (Base authentication entity for all user roles)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT') NOT NULL,
    phone VARCHAR(20) NULL,
    avatar_url VARCHAR(255) NULL,
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    last_login_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 2. STAFF TABLE (Extends User for Wardens, Mess Managers, Accountants, Admins)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS staff;
CREATE TABLE staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    staff_code VARCHAR(50) NOT NULL UNIQUE,
    designation VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    joining_date DATE NOT NULL,
    salary DECIMAL(10, 2) NULL CHECK (salary >= 0),
    emergency_contact VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_staff_code (staff_code),
    INDEX idx_staff_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 3. HOSTELS TABLE
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS hostels;
CREATE TABLE hostels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    type ENUM('BOYS', 'GIRLS', 'COED') NOT NULL DEFAULT 'BOYS',
    total_floors INT NOT NULL DEFAULT 1 CHECK (total_floors > 0),
    warden_id INT NULL,
    address TEXT NULL,
    contact_phone VARCHAR(20) NULL,
    status ENUM('ACTIVE', 'MAINTENANCE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (warden_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_hostels_warden (warden_id),
    INDEX idx_hostels_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 4. ROOMS TABLE
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS rooms;
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    floor INT NOT NULL DEFAULT 1 CHECK (floor >= 0),
    room_type ENUM('SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_BED', 'DORM') NOT NULL DEFAULT 'DOUBLE',
    capacity INT NOT NULL DEFAULT 2 CHECK (capacity > 0),
    occupied_count INT NOT NULL DEFAULT 0 CHECK (occupied_count >= 0 AND occupied_count <= capacity),
    base_rent DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (base_rent >= 0),
    amenities JSON NULL,
    status ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED') NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE,
    UNIQUE KEY uq_hostel_room (hostel_id, room_number),
    INDEX idx_rooms_hostel (hostel_id),
    INDEX idx_rooms_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 5. STUDENTS TABLE (Extends User for Student Residents)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS students;
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    roll_number VARCHAR(50) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    course VARCHAR(100) NOT NULL,
    year_of_study INT NOT NULL DEFAULT 1 CHECK (year_of_study BETWEEN 1 AND 5),
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
    INDEX idx_students_roll (roll_number),
    INDEX idx_students_user (user_id),
    INDEX idx_students_hostel (current_hostel_id),
    INDEX idx_students_room (current_room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 6. ROOM ALLOCATIONS TABLE
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS room_allocations;
CREATE TABLE room_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    room_id INT NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    allocated_from DATE NOT NULL,
    allocated_to DATE NULL,
    security_deposit DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (security_deposit >= 0),
    status ENUM('ACTIVE', 'TRANSFERRED', 'VACATED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    allocated_by INT NULL,
    vacated_at DATETIME NULL,
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (allocated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_allocations_student (student_id),
    INDEX idx_allocations_room (room_id),
    INDEX idx_allocations_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 7. MEAL TYPES TABLE (Breakfast, Lunch, Snacks, Dinner with Serving Windows)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS meal_types;
CREATE TABLE meal_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 8. FOOD MENU TABLE (Weekly Rotating Dining Plan)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS food_menu;
CREATE TABLE food_menu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meal_type_id INT NOT NULL,
    day_of_week ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
    items_description TEXT NOT NULL,
    special_item VARCHAR(150) NULL,
    calories_est INT NULL CHECK (calories_est > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (meal_type_id) REFERENCES meal_types(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_day_mealtype (day_of_week, meal_type_id),
    INDEX idx_food_menu_mealtype (meal_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 9. MEAL ATTENDANCE TABLE (Daily Mess Resident Check-in Logs)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS meal_attendance;
CREATE TABLE meal_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    food_menu_id INT NULL,
    meal_type_id INT NOT NULL,
    meal_date DATE NOT NULL,
    status ENUM('PRESENT', 'ABSENT', 'SPECIAL_REQUEST', 'PACKED') NOT NULL DEFAULT 'PRESENT',
    marked_by INT NULL,
    remarks VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (food_menu_id) REFERENCES food_menu(id) ON DELETE SET NULL,
    FOREIGN KEY (meal_type_id) REFERENCES meal_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uq_student_meal_date (student_id, meal_date, meal_type_id),
    INDEX idx_meal_att_student (student_id),
    INDEX idx_meal_att_date (meal_date),
    INDEX idx_meal_att_mealtype (meal_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 10. FEE TYPES TABLE (Tuition, Rent, Mess, Maintenance, Security Deposit)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS fee_types;
CREATE TABLE fee_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    frequency ENUM('MONTHLY', 'SEMESTER', 'ANNUAL', 'ONE_TIME') NOT NULL DEFAULT 'SEMESTER',
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 11. STUDENT FEES TABLE (Student Invoices & Dues)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS student_fees;
CREATE TABLE student_fees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    fee_type_id INT NOT NULL,
    bill_number VARCHAR(50) NOT NULL UNIQUE,
    academic_year VARCHAR(20) NOT NULL,
    term_name VARCHAR(100) NOT NULL,
    amount_due DECIMAL(10, 2) NOT NULL CHECK (amount_due >= 0),
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    due_date DATE NOT NULL,
    status ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (fee_type_id) REFERENCES fee_types(id) ON DELETE RESTRICT,
    INDEX idx_student_fees_student (student_id),
    INDEX idx_student_fees_feetype (fee_type_id),
    INDEX idx_student_fees_status (status),
    INDEX idx_student_fees_due (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 12. PAYMENTS TABLE (Payment Transactions & Receipts)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_fee_id INT NOT NULL,
    student_id INT NOT NULL,
    receipt_number VARCHAR(60) NOT NULL UNIQUE,
    transaction_id VARCHAR(100) NULL,
    payment_method ENUM('UPI', 'CARD', 'NET_BANKING', 'CASH', 'CHEQUE', 'DEMAND_DRAFT') NOT NULL DEFAULT 'UPI',
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_status ENUM('SUCCESS', 'PENDING', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'SUCCESS',
    collected_by INT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_fee_id) REFERENCES student_fees(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (collected_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_payments_receipt (receipt_number),
    INDEX idx_payments_student (student_id),
    INDEX idx_payments_fee (student_fee_id),
    INDEX idx_payments_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 13. COMPLAINTS TABLE (Grievance Tickets)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS complaints;
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_complaints_student (student_id),
    INDEX idx_complaints_room (room_id),
    INDEX idx_complaints_status (status),
    INDEX idx_complaints_assigned (assigned_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 14. COMPLAINT UPDATES TABLE (Ticket History & Communication Trail)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS complaint_updates;
CREATE TABLE complaint_updates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL,
    updated_by INT NOT NULL,
    status_from ENUM('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED') NULL,
    status_to ENUM('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED') NOT NULL,
    remarks TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_comp_updates_complaint (complaint_id),
    INDEX idx_comp_updates_user (updated_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 15. LEAVE REQUESTS TABLE (Out-Pass & Night Out Permissions)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS leave_requests;
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
    INDEX idx_leave_student (student_id),
    INDEX idx_leave_status (status),
    INDEX idx_leave_reviewed (reviewed_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 16. VISITORS TABLE (Campus Security Gate Registry)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS visitors;
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
    INDEX idx_visitors_student (student_id),
    INDEX idx_visitors_status (status),
    INDEX idx_visitors_approved (approved_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 17. NOTIFICATIONS TABLE (User Alerts & System Broadcasts)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS notifications;
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
    INDEX idx_notifications_user (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
