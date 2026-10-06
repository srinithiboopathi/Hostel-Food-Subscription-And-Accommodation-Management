# Hostel Food & Accommodation Management System - Database Setup Guide

Database Name: `hostel_management`  
Architecture: **3NF Relational Schema (17 Tables)**  
DBMS Supported: **MySQL 8.0+ / MariaDB 10.4+**

---

## 📋 Entity Inventory (17 Tables)

1. `users` — Base authentication entity for all user personas (`ADMIN`, `WARDEN`, `MESS_MANAGER`, `ACCOUNTANT`, `STUDENT`).
2. `staff` — Employee profiles for wardens, mess managers, and accountants.
3. `hostels` — Hostel buildings/blocks (`BOYS`, `GIRLS`, `COED`) and warden references.
4. `rooms` — Room inventory with floor, capacities, occupancy counts, base rent, and amenities.
5. `students` — Enrolled student residents with roll number, department, year, and guardian details.
6. `room_allocations` — Bed allocation records with date ranges and security deposits.
7. `meal_types` — Dining meal definitions (`BREAKFAST`, `LUNCH`, `SNACKS`, `DINNER`) with serving windows.
8. `food_menu` — 7-day recurring dining menu with calorie estimations and special items.
9. `meal_attendance` — Daily dining check-ins and meal logs per student.
10. `fee_types` — Fee definitions (`HOSTEL_RENT`, `MESS_CHARGES`, `MAINTENANCE_FEE`, `SECURITY_DEPOSIT`).
11. `student_fees` — Generated fee bills with due dates, amounts due, and statuses.
12. `payments` — Transaction records with receipt numbers, modes (`UPI`, `CARD`, `NET_BANKING`, `CASH`), and verification flags.
13. `complaints` — Grievance tickets categorized by electrical, plumbing, mess food, internet, etc.
14. `complaint_updates` — Audit trail of ticket status transitions and technician notes.
15. `leave_requests` — Gate pass out-station and home visit leave approval workflow.
16. `visitors` — Campus gate security visitor log with ID proof and check-in/out timestamps.
17. `notifications` — Broadcast alerts and personal notifications for each user.

---

## 🛠️ Step-by-Step Setup Instructions

### Prerequisites
* MySQL Server (or XAMPP with MySQL running on port `3306`)
* Node.js v18+ (optional for automated setup script)

---

### Method 1: Using MySQL CLI / phpMyAdmin

#### 1. Open MySQL Terminal / Shell
```bash
mysql -u root -p
```

#### 2. Execute `schema.sql`
```sql
SOURCE /path/to/hostel-management/database/schema.sql;
```

#### 3. Execute `sample_data.sql`
```sql
SOURCE /path/to/hostel-management/database/sample_data.sql;
```

---

### Method 2: One-Line PowerShell / Command Line Setup

```powershell
mysql -u root -e "SOURCE c:/Users/asus/OneDrive/Desktop/DBMS/hostel-management/database/schema.sql; SOURCE c:/Users/asus/OneDrive/Desktop/DBMS/hostel-management/database/sample_data.sql;"
```

---

## 🔍 Verification Queries

### 1. Verify All 17 Tables Exist
```sql
USE hostel_management;
SHOW TABLES;
```

### 2. Verify Active Room Allocations with Capacity Checks
```sql
SELECT 
    s.roll_number, u.full_name AS student_name, h.name AS hostel,
    r.room_number, r.room_type, r.capacity, r.occupied_count,
    ra.status AS allocation_status, ra.security_deposit
FROM room_allocations ra
JOIN students s ON ra.student_id = s.id
JOIN users u ON s.user_id = u.id
JOIN rooms r ON ra.room_id = r.id
JOIN hostels h ON r.hostel_id = h.id
WHERE ra.status = 'ACTIVE';
```

### 3. Verify Meal Attendance & Food Menu
```sql
SELECT 
    s.roll_number, u.full_name, mt.name AS meal_type, fm.special_item,
    ma.meal_date, ma.status AS attendance_status
FROM meal_attendance ma
JOIN students s ON ma.student_id = s.id
JOIN users u ON s.user_id = u.id
JOIN meal_types mt ON ma.meal_type_id = mt.id
LEFT JOIN food_menu fm ON ma.food_menu_id = fm.id;
```

### 4. Verify Student Fees & Receipts
```sql
SELECT 
    s.roll_number, ft.name AS fee_type, sf.bill_number,
    sf.amount_due, sf.amount_paid, sf.status AS fee_status,
    p.receipt_number, p.payment_method, p.payment_status
FROM student_fees sf
JOIN students s ON sf.student_id = s.id
JOIN fee_types ft ON sf.fee_type_id = ft.id
LEFT JOIN payments p ON sf.id = p.student_fee_id;
```

### 5. Verify Complaints & Maintenance Updates Trail
```sql
SELECT 
    c.ticket_number, c.category, c.title, c.priority, c.status AS ticket_status,
    cu.status_to, cu.remarks AS audit_note
FROM complaints c
LEFT JOIN complaint_updates cu ON c.id = cu.complaint_id;
```

---

## 👥 Default Seeded Demo Personas (Password: `Password@123`)

| Role | Name | Email / Identifier | Description |
| :--- | :--- | :--- | :--- |
| **ADMIN** | Dr. Arvind Swaminathan | `admin@hostel.edu` | Full administrative control |
| **WARDEN** | Prof. Robert Vance | `warden@hostel.edu` | Hostels, rooms, leaves, complaints |
| **MESS_MANAGER** | Suresh Kumar Sharma | `mess@hostel.edu` | Weekly dining menu & attendance |
| **ACCOUNTANT** | Meenakshi Sundaram Iyer | `accounts@hostel.edu` | Invoices, dues & payments |
| **STUDENT** | Aarav Patel | `aarav.patel@student.edu` / `CS2023001` | Resident student in Room 101 |
