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

### Execution Steps
```powershell
mysql -u root -e "SOURCE c:/Users/asus/OneDrive/Desktop/DBMS/hostel-management/database/schema.sql; SOURCE c:/Users/asus/OneDrive/Desktop/DBMS/hostel-management/database/sample_data.sql;"
```
