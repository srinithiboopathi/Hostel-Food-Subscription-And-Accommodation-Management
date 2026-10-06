# Hostel Management System - Backend API & Authentication Guide

Base URL: `http://localhost:5000`  
Database: `hostel_management` (MySQL)  
Authentication: **JWT (JSON Web Token) with Bcrypt Hashing**

---

## 🔐 Available User Roles

1. `ADMIN` — System Administrator (Full system access & user management)
2. `WARDEN` — Hostel Warden (Hostel blocks, room allocations, leave approvals, complaints)
3. `MESS_MANAGER` — Mess & Dining Incharge (Weekly meal menu planning, meal attendance)
4. `ACCOUNTANT` — Accounts Officer (Fee structures, student billing, payment receipts)
5. `STUDENT` — Resident Student (Room allocation view, meal logs, fee payments, grievances, leave passes)

---

## 🔑 Development Login Credentials

> **NOTE:** These credentials are for local development and testing only. Do not use in production.

| Role | Name | Email Address | Password |
| :--- | :--- | :--- | :--- |
| **ADMIN** | System Administrator | `admin@hostel.local` *(or `admin@hostel.edu`)* | `Admin@123` |
| **WARDEN** | Prof. Robert Vance | `warden@hostel.local` *(or `warden@hostel.edu`)* | `Warden@123` |
| **MESS_MANAGER** | Suresh Kumar Sharma | `mess@hostel.local` *(or `mess@hostel.edu`)* | `Mess@123` |
| **ACCOUNTANT** | Meenakshi Sundaram Iyer | `accountant@hostel.local` *(or `accounts@hostel.edu`)* | `Accountant@123` |
| **STUDENT** | Aarav Patel | `student@hostel.local` *(or `aarav.patel@student.edu`)* | `Student@123` |

---

## 📡 Authentication API Endpoints

### 1. User Login
* **Method & Route**: `POST /api/auth/login`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
```json
{
  "email": "admin@hostel.local",
  "password": "Admin@123"
}
```
* **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "System Administrator",
      "email": "admin@hostel.local",
      "role": "ADMIN",
      "phone": "+91 98765 43210",
      "avatarUrl": null
    }
  }
}
```

---

### 2. Get Current Authenticated Profile
* **Method & Route**: `GET /api/auth/me`
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": 1,
    "name": "System Administrator",
    "email": "admin@hostel.local",
    "role": "ADMIN",
    "phone": "+91 98765 43210",
    "avatarUrl": null,
    "status": "ACTIVE",
    "createdAt": "2026-09-28T14:40:00.000Z",
    "lastLoginAt": "2026-09-28T15:05:00.000Z"
  }
}
```

---

### 3. Role Protected Endpoints (Testing)
* `GET /api/auth/admin-only` — Requires `ADMIN` role.
* `GET /api/auth/warden-only` — Requires `WARDEN` role.

---

## 🛡️ HTTP Error Codes Standard

* `200 OK` — Successful authentication or profile retrieval.
* `400 Bad Request` — Validation failure (missing email or empty password).
* `401 Unauthorized` — Invalid email/password or missing/expired JWT token.
* `403 Forbidden` — Authenticated user lacks required role for the resource.
* `404 Not Found` — Resource or route not found.
* `500 Internal Server Error` — Server exception (database internals sanitized).
