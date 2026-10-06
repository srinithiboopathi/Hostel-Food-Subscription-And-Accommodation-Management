# Hostel Food & Accommodation Management System
> **Production-Ready Enterprise Full-Stack Web Application (DBMS Term Project)**

A comprehensive, secure, role-based Hostel Food & Accommodation Management System built with **React (Vite + Tailwind CSS)** and a **Node.js / Express REST API** powered by **MySQL 8.0 / 8.4**.

---

## 1. System Architecture

```
                                  ┌────────────────────────────────────────┐
                                  │      React (Vite + Tailwind CSS)       │
                                  │   SPA with Protected & Role Routes     │
                                  └───────────────────┬────────────────────┘
                                                      │
                                          HTTPS / REST JSON API
                                        (JWT Bearer Authorization)
                                                      │
                                                      ▼
                                  ┌────────────────────────────────────────┐
                                  │          Node.js + Express API         │
                                  │   - Security Headers (OWASP compliant) │
                                  │   - JWT Auth & Role Middleware         │
                                  │   - Input Validation & IDOR Guards     │
                                  │   - ACID Database Transactions         │
                                  └───────────────────┬────────────────────┘
                                                      │
                                               mysql2 / Pool
                                            (Parameterized SQL)
                                                      │
                                                      ▼
                                  ┌────────────────────────────────────────┐
                                  │            MySQL Database              │
                                  │   - Normalized 3NF Relational Schema   │
                                  │   - Strict Foreign Key Constraints     │
                                  │   - Row-Level Locks (FOR UPDATE)       │
                                  └────────────────────────────────────────┘
```

---

## 2. Technology Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS, Lucide React Icons, React Router v6, Axios
- **Backend**: Node.js (CommonJS), Express 4, `mysql2/promise` Connection Pool, `jsonwebtoken` (JWT), `bcryptjs`, `express-validator`, `cors`
- **Database**: MySQL 8.0+ Relational DBMS with strict referential integrity and transactional ACID guarantees

---

## 3. Core Modules & User Roles

The application enforces a strict **Role-Based Access Control (RBAC)** architecture across 5 distinct roles:

### 👑 Administrator (`ADMIN`)
- **Master Telemetry Dashboard**: Real-time stats for students, hostel occupancy, mess subscriptions, revenue, and active issues.
- **Student Master Directory**: Create, update, deactivate students with multi-filter search.
- **Hostel & Room Master**: Manage hostel blocks, room types, capacities, base rents, and maintenance states.
- **Executive Reports Center**: Export and inspect consolidated institution-wide telemetry.
- **Broadcast Announcements**: Dispatch system-wide and role-targeted notifications.

### 🛡️ Hostel Warden (`WARDEN`)
- **Warden Operations Dashboard**: Room occupancy metrics, bed vacancies, pending leaves, and active complaints.
- **Room Allocation & Transfers**: Transaction-safe room assignment, dynamic capacity validation, and student check-out.
- **Maintenance & Complaints Desk**: Assign tickets, update statuses, and log resolution remarks.
- **Student Leave Requests**: Approve, reject, or return student outpass and leave requests.
- **Visitor Log Desk**: Record visitor entry, check-out visitors, and audit daily visitor logs.

### 💰 Finance Accountant (`ACCOUNTANT`)
- **Financial Control Dashboard**: Revenue collection totals, today's collection, monthly realization, and pending fee balances.
- **Fee Master & Billing**: Configure recurring fee types (Hostel, Mess, Security Deposit, Maintenance) and generate student fee bills.
- **Payment Collection & Receipts**: Record online/offline payments with automatic receipt generation (`REC-YYYY-XXXXXX`).
- **Overdue Invoices & Balance Tracking**: Dynamic calculation of discounts, net due, and remaining balances.

### 🍽️ Mess Manager (`MESS_MANAGER`)
- **Dining Analytics Dashboard**: Real-time subscriber count, meal trends, and monthly food revenue.
- **Food Plans & Pricing**: Create and manage flexible dining plans (Breakfast, Lunch, Snacks, Dinner).
- **Daily & Weekly Menu**: Schedule dining menus with calorie estimations and special diet tags.
- **Live Meal Attendance**: Log student meal consumption with strict duplicate and active subscription validation.

### 🎓 Student Resident (`STUDENT`)
- **Personal Dashboard**: Room assignment, active food plan, fee balance, and recent meal logs.
- **Profile & ID Badge**: Personal details, guardian contacts, and allocated hostel room.
- **My Accommodation**: View current allocation, roommates, and amenities.
- **My Food & Dining**: View active subscription, weekly menu, and daily meal attendance history.
- **My Fees & Receipts**: View personal fee bills, outstanding balances, and download payment receipts.
- **Complaints & Grievances**: Raise maintenance tickets and track resolution progress.
- **Leave Requests**: Apply for outpass/leave and cancel pending requests.
- **Notification Inbox**: Real-time alert badge, category filtering, and notification preferences.

---

## 4. Database Schema Overview

```
users (id, full_name, email, password_hash, role, phone, status, ...)
  ├── staff (id, user_id, employee_id, designation, department, ...)
  └── students (id, user_id, roll_number, department, course, current_hostel_id, current_room_id, ...)
        ├── room_allocations (id, student_id, room_id, academic_year, status, ...)
        ├── food_subscriptions (id, student_id, plan_id, status, monthly_price, ...)
        ├── meal_attendance (id, student_id, meal_type_id, meal_date, status, ...)
        ├── student_fees (id, student_id, fee_type_id, bill_number, amount_due, amount_paid, status, ...)
        │     └── payments (id, student_fee_id, student_id, receipt_number, amount, transaction_id, ...)
        ├── complaints (id, student_id, room_id, category, title, status, ...)
        ├── leave_requests (id, student_id, leave_type, start_date, end_date, status, ...)
        └── visitors (id, student_id, visitor_name, check_in_time, check_out_time, status, ...)

hostels (id, name, code, type, total_floors, ...)
  └── rooms (id, hostel_id, room_number, floor, room_type, capacity, occupied_count, status, ...)

food_plans (id, name, code, monthly_price, has_breakfast, has_lunch, has_snacks, has_dinner, ...)
meal_types (id, name, start_time, end_time, ...)
food_menu (id, meal_type_id, day_of_week, item_name, ...)
fee_types (id, name, frequency, description, is_active, ...)
notifications (id, user_id, title, message, type, is_read, ...)
notification_preferences (id, user_id, payment_alerts, food_alerts, ...)
```

---

## 5. Quick Start & Installation

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **MySQL Server** (v8.0 or v8.4 running on port 3306)

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure your DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in .env
```

### 2. Database Initialization
```bash
# From the backend directory:
node src/scripts/initDb.js
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env
```

### 4. Running Locally
- **Backend API**:
  ```bash
  cd backend
  npm run dev
  # Running at http://localhost:5000
  ```
- **Frontend SPA**:
  ```bash
  cd frontend
  npm run dev
  # Running at http://localhost:5173
  ```

---

## 6. Test Suites & Verification

Run the comprehensive regression and security suites from the `backend` directory:

```bash
# Step 18: Student Management E2E (18/18)
node src/scripts/testStep18StudentFrontend.js

# Step 19: Accommodation & Room Management (27/27)
node src/scripts/testStep19AccommodationManagement.js

# Step 20: Food & Mess Management (34/34)
node src/scripts/testStep20FoodManagement.js

# Step 21: Payments & Financial Management (46/46)
node src/scripts/testStep21PaymentManagement.js

# Step 22: Admin Dashboard & Reports (50/50)
node src/scripts/testStep22AdminDashboard.js

# Step 23: Notifications & Alerts (44/44)
node src/scripts/testStep23Notifications.js

# Step 24: Security & RBAC Hardening (38/38)
node src/scripts/testStep24Security.js

# Step 25: Final Integration & Deployment Readiness (33/33)
node src/scripts/testStep25FinalSystem.js
```

---

## 7. Production Build & Deployment

### Production Frontend Build
```bash
cd frontend
npm run build
```
Output directory: `frontend/dist/`

### Production Backend Deployment
```bash
cd backend
npm start
```
Environment checklist:
- `NODE_ENV=production`
- `PORT=5000`
- Secure random `JWT_SECRET`
- Restricted `CLIENT_URL` CORS origin
