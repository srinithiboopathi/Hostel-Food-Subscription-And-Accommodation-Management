-- =============================================================================
-- HOSTEL FOOD & ACCOMMODATION MANAGEMENT SYSTEM
-- Database: hostel_management
-- Sample Data Script with Realistic Indian College Records
-- Default Password for all accounts: "Password@123"
-- Bcrypt Hash for "Password@123": $2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey
-- =============================================================================

USE hostel_management;

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. USERS
-- -----------------------------------------------------------------------------
INSERT INTO users (id, full_name, email, password_hash, role, phone, avatar_url, status) VALUES
(1, 'Dr. Arvind Swaminathan', 'admin@hostel.edu', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey', 'ADMIN', '+91 98765 43210', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'ACTIVE'),
(2, 'Prof. Robert Vance', 'warden@hostel.edu', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey', 'WARDEN', '+91 98765 43211', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'ACTIVE'),
(3, 'Suresh Kumar Sharma', 'mess@hostel.edu', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey', 'MESS_MANAGER', '+91 98765 43212', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'ACTIVE'),
(4, 'Meenakshi Sundaram Iyer', 'accounts@hostel.edu', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey', 'ACCOUNTANT', '+91 98765 43213', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', 'ACTIVE'),
(5, 'Aarav Patel', 'aarav.patel@student.edu', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey', 'STUDENT', '+91 98111 22334', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', 'ACTIVE'),
(6, 'Priya Nair', 'priya.nair@student.edu', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey', 'STUDENT', '+91 98222 33445', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'ACTIVE'),
(7, 'Rohan Deshmukh', 'rohan.d@student.edu', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey', 'STUDENT', '+91 98333 44556', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', 'ACTIVE'),
(8, 'Ananya Sharma', 'ananya.s@student.edu', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey', 'STUDENT', '+91 98444 55667', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', 'ACTIVE');

-- -----------------------------------------------------------------------------
-- 2. STAFF
-- -----------------------------------------------------------------------------
INSERT INTO staff (id, user_id, staff_code, designation, department, joining_date, salary, emergency_contact) VALUES
(1, 1, 'STF-ADM-001', 'Hostel Director & System Administrator', 'Hostel Administration', '2020-06-01', 95000.00, '+91 98765 00001'),
(2, 2, 'STF-WRD-002', 'Chief Hostel Warden', 'Student Welfare & Security', '2021-07-15', 78000.00, '+91 98765 00002'),
(3, 3, 'STF-MSS-003', 'Head Mess Incharge & Food Quality Officer', 'Catering & Hospitality', '2022-01-10', 55000.00, '+91 98765 00003'),
(4, 4, 'STF-ACC-004', 'Senior Accounts & Billing Officer', 'Finance & Accounts', '2021-03-20', 62000.00, '+91 98765 00004');

-- -----------------------------------------------------------------------------
-- 3. HOSTELS
-- -----------------------------------------------------------------------------
INSERT INTO hostels (id, name, code, type, total_floors, warden_id, address, contact_phone, status) VALUES
(1, 'Aryabhatta Boys Residence', 'ABR-01', 'BOYS', 4, 2, 'North Campus, Engineering Complex, Knowledge City', '+91 11 2789 0001', 'ACTIVE'),
(2, 'Gargi Girls Residence', 'GGR-02', 'GIRLS', 4, 2, 'South Campus, Medical & Life Sciences Complex', '+91 11 2789 0002', 'ACTIVE'),
(3, 'Tagore International Scholar Residence', 'TIR-03', 'COED', 3, 2, 'East Campus, Post-Graduate & Research Scholar Wing', '+91 11 2789 0003', 'ACTIVE');

-- -----------------------------------------------------------------------------
-- 4. ROOMS
-- -----------------------------------------------------------------------------
INSERT INTO rooms (id, hostel_id, room_number, floor, room_type, capacity, occupied_count, base_rent, amenities, status) VALUES
-- Aryabhatta Boys Hostel
(1, 1, '101', 1, 'DOUBLE', 2, 2, 4500.00, '["Air Conditioner", "Attached Washroom", "Study Desks", "High-speed Wi-Fi"]', 'OCCUPIED'),
(2, 1, '102', 1, 'DOUBLE', 2, 0, 4500.00, '["Air Conditioner", "Attached Washroom", "Study Desks", "High-speed Wi-Fi"]', 'AVAILABLE'),
(3, 1, '103', 1, 'SINGLE', 1, 0, 7000.00, '["Air Conditioner", "Attached Washroom", "Balcony", "Mini Fridge"]', 'AVAILABLE'),
(4, 1, '201', 2, 'TRIPLE', 3, 0, 3500.00, '["Ceiling Fans", "3x Study Desks", "High-speed Wi-Fi"]', 'AVAILABLE'),
-- Gargi Girls Hostel
(5, 2, 'G-101', 1, 'DOUBLE', 2, 2, 4800.00, '["Air Conditioner", "Attached Washroom", "High-speed Wi-Fi", "Vanity Mirror"]', 'OCCUPIED'),
(6, 2, 'G-102', 1, 'SINGLE', 1, 0, 7500.00, '["Air Conditioner", "Attached Washroom", "Balcony Garden View"]', 'AVAILABLE'),
(7, 2, 'G-201', 2, 'DOUBLE', 2, 0, 4800.00, '["Air Conditioner", "Attached Washroom", "Study Desks"]', 'AVAILABLE');

-- -----------------------------------------------------------------------------
-- 5. STUDENTS
-- -----------------------------------------------------------------------------
INSERT INTO students (id, user_id, roll_number, department, course, year_of_study, gender, dob, blood_group, guardian_name, guardian_phone, guardian_relation, permanent_address, current_hostel_id, current_room_id, admission_date, status) VALUES
(1, 5, 'CS2023001', 'Computer Science & Engineering', 'B.Tech CSE', 3, 'MALE', '2003-05-14', 'O+', 'Mahesh Patel', '+91 99887 76655', 'Father', '42, Shanti Nagar, Ahmedabad, Gujarat', 1, 1, '2023-08-01', 'ACTIVE'),
(2, 6, 'CS2023045', 'Computer Science & Engineering', 'B.Tech CSE', 3, 'FEMALE', '2003-11-20', 'B+', 'Radhika Nair', '+91 99887 76656', 'Mother', '12/B, Green Meadows, Kochi, Kerala', 2, 5, '2023-08-01', 'ACTIVE'),
(3, 7, 'EC2024012', 'Electronics & Communication', 'B.Tech ECE', 2, 'MALE', '2004-02-18', 'A+', 'Vikram Deshmukh', '+91 99887 76657', 'Father', '88, Shivneri Marg, Pune, Maharashtra', 1, 1, '2024-08-01', 'ACTIVE'),
(4, 8, 'BT2024089', 'Biotechnology', 'B.Tech Biotech', 2, 'FEMALE', '2004-09-08', 'AB+', 'Sunil Sharma', '+91 99887 76658', 'Father', '104, Royal Palms, Jaipur, Rajasthan', 2, 5, '2024-08-01', 'ACTIVE');

-- -----------------------------------------------------------------------------
-- 6. ROOM ALLOCATIONS
-- -----------------------------------------------------------------------------
INSERT INTO room_allocations (id, student_id, room_id, academic_year, allocated_from, allocated_to, security_deposit, status, allocated_by, remarks) VALUES
(1, 1, 1, '2025-2026', '2025-07-01', '2026-06-30', 5000.00, 'ACTIVE', 2, 'Allocated Bed A in Room 101'),
(2, 2, 5, '2025-2026', '2025-07-01', '2026-06-30', 5000.00, 'ACTIVE', 2, 'Allocated Bed A in Room G-101'),
(3, 3, 1, '2025-2026', '2025-07-01', '2026-06-30', 5000.00, 'ACTIVE', 2, 'Allocated Bed B in Room 101'),
(4, 4, 5, '2025-2026', '2025-07-01', '2026-06-30', 5000.00, 'ACTIVE', 2, 'Allocated Bed B in Room G-101');

-- -----------------------------------------------------------------------------
-- 7. MEAL TYPES
-- -----------------------------------------------------------------------------
INSERT INTO meal_types (id, name, start_time, end_time, is_active) VALUES
(1, 'BREAKFAST', '07:30:00', '09:30:00', TRUE),
(2, 'LUNCH', '12:30:00', '14:30:00', TRUE),
(3, 'SNACKS', '17:00:00', '18:15:00', TRUE),
(4, 'DINNER', '19:30:00', '21:30:00', TRUE);

-- -----------------------------------------------------------------------------
-- 8. FOOD MENU
-- -----------------------------------------------------------------------------
INSERT INTO food_menu (id, meal_type_id, day_of_week, items_description, special_item, calories_est, is_active) VALUES
-- Monday
(1, 1, 'MONDAY', 'Masala Dosa, Sambar, Coconut Chutney, Boiled Eggs, Tea/Coffee/Milk, Fresh Bananas', 'Filter Coffee', 480, TRUE),
(2, 2, 'MONDAY', 'Paneer Butter Masala, Dal Tadka, Steamed Basmati Rice, Phulka Roti, Cucumber Raita, Gulab Jamun', 'Paneer Butter Masala', 720, TRUE),
(3, 3, 'MONDAY', 'Vegetable Samosa, Green Mint Chutney, Biscuits, Hot Masala Tea', 'Crispy Samosa', 310, TRUE),
(4, 4, 'MONDAY', 'Mixed Veg Korma, Yellow Moong Dal, Jeera Rice, Chapati, Green Salad, Fruit Custard', 'Fruit Custard', 640, TRUE),
-- Tuesday
(5, 1, 'TUESDAY', 'Aloo Paratha with White Butter, Curd, Pickle, Boiled Sprouts, Tea/Coffee', 'Aloo Paratha', 520, TRUE),
(6, 2, 'TUESDAY', 'Punjabi Rajma Masala, Steamed Rice, Butter Roti, Aloo Gobi Dry, Boondi Raita', 'Punjabi Rajma', 690, TRUE),
(7, 3, 'TUESDAY', 'Indori Poha with Peanuts, Sev, Lemon & Ginger Tea', 'Indori Poha', 280, TRUE),
(8, 4, 'TUESDAY', 'Shahi Paneer / Butter Chicken, Dal Makhani, Veg Pulao, Butter Naan, Ice Cream', 'Special Feast Dinner', 810, TRUE),
-- Wednesday
(9, 1, 'WEDNESDAY', 'Steamed Idli, Medu Vada, Sambar, Tomato Chutney, Boiled Eggs, Tea/Coffee', 'Medu Vada', 460, TRUE),
(10, 2, 'WEDNESDAY', 'Chole Bhature / Chole Rice, Onion Ring Salad, Lemon Pickle, Sweet Lassi', 'Delhi Chole Bhature', 780, TRUE),
(11, 3, 'WEDNESDAY', 'Grilled Veg Cheese Sandwich, Tomato Ketchup, Tea/Coffee', 'Grilled Cheese Sandwich', 320, TRUE),
(12, 4, 'WEDNESDAY', 'Malai Kofta / Egg Curry, Dal Fry, Jeera Rice, Tawa Roti, Rice Kheer', 'Rice Kheer', 690, TRUE),
-- Thursday
(13, 1, 'THURSDAY', 'Rava Upma with Coconut Chutney, Cornflakes with Milk, Bananas, Tea/Coffee', 'Rava Upma', 420, TRUE),
(14, 2, 'THURSDAY', 'Rajasthani Kadhi Pakoda, Jeera Rice, Aloo Bhindi Dry, Roti, Salad, Papad', 'Rajasthani Kadhi', 650, TRUE),
(15, 3, 'THURSDAY', 'Bread Pakoda with Mint Chutney, Hot Masala Tea', 'Crispy Bread Pakoda', 340, TRUE),
(16, 4, 'THURSDAY', 'Hyderabadi Dum Biryani, Mirchi Ka Salan, Onion Raita, Rasgulla', 'Hyderabadi Dum Biryani', 760, TRUE),
-- Friday
(17, 1, 'FRIDAY', 'Poori Bhaji, Suji Halwa, Sprouts, Tea/Coffee', 'Suji Halwa', 540, TRUE),
(18, 2, 'FRIDAY', 'Veg Kofta Curry, Dal Palak, Steamed Rice, Chapati, Roasted Papad, Curd', 'Veg Kofta', 670, TRUE),
(19, 3, 'FRIDAY', 'Bombay Bhel Puri, Masala Chai, Biscuits', 'Bombay Bhel', 260, TRUE),
(20, 4, 'FRIDAY', 'Mushroom Matar / Fish Curry, Dal Tadka, Ghee Rice, Roti, Moong Dal Halwa', 'Moong Dal Halwa', 790, TRUE),
-- Saturday
(21, 1, 'SATURDAY', 'Onion Tomato Uttapam, Coconut & Tomato Chutney, Omelette / Boiled Eggs, Tea/Coffee', 'Uttapam', 450, TRUE),
(22, 2, 'SATURDAY', 'Mumbai Pav Bhaji with Extra Butter Pav, Masala Rice, Gulab Jamun', 'Mumbai Pav Bhaji', 750, TRUE),
(23, 3, 'SATURDAY', 'Aloo Tikki Chaat with Curd & Saunth, Masala Chai', 'Aloo Tikki Chaat', 310, TRUE),
(24, 4, 'SATURDAY', 'Matar Paneer, Chana Dal, Veg Pulao, Phulka, Fresh Fruit Salad', 'Matar Paneer', 660, TRUE),
-- Sunday
(25, 1, 'SUNDAY', 'Sunday Special Brunch: Mysore Masala Dosa, Chole Kulche, Fresh Juice, Pastries, Filter Coffee', 'Sunday Brunch', 590, TRUE),
(26, 2, 'SUNDAY', 'Shahi Paneer Dum Biryani / Chicken Dum Biryani, Mirchi Ka Salan, Burani Raita, Pastry', 'Dum Biryani Special', 850, TRUE),
(27, 3, 'SUNDAY', 'Sweet & Spicy Corn Chaat, Tea/Coffee', 'Corn Chaat', 240, TRUE),
(28, 4, 'SUNDAY', 'Light Sunday Supper: Moong Dal Khichdi, Gujarati Kadhi, Roasted Papad, Pickle, Desi Ghee', 'Comfort Khichdi', 510, TRUE);

-- -----------------------------------------------------------------------------
-- 9. MEAL ATTENDANCE
-- -----------------------------------------------------------------------------
INSERT INTO meal_attendance (id, student_id, food_menu_id, meal_type_id, meal_date, status, marked_by, remarks) VALUES
(1, 1, 1, 1, CURDATE(), 'PRESENT', 3, 'Regular breakfast attended'),
(2, 1, 2, 2, CURDATE(), 'PRESENT', 3, 'Regular lunch attended'),
(3, 2, 1, 1, CURDATE(), 'PRESENT', 3, 'Regular breakfast attended'),
(4, 3, 1, 1, CURDATE(), 'PRESENT', 3, 'Regular breakfast attended'),
(5, 4, 1, 1, CURDATE(), 'ABSENT', 3, 'Sick leave recorded');

-- -----------------------------------------------------------------------------
-- 10. FEE TYPES
-- -----------------------------------------------------------------------------
INSERT INTO fee_types (id, name, frequency, description, is_active) VALUES
(1, 'HOSTEL_RENT', 'SEMESTER', 'Covers 6 months room accommodation, electricity and high-speed Wi-Fi', TRUE),
(2, 'MESS_CHARGES', 'SEMESTER', 'Covers 4 daily meals (Breakfast, Lunch, Snacks, Dinner) in the dining mess', TRUE),
(3, 'MAINTENANCE_FEE', 'SEMESTER', 'Hostel infrastructure, security, housekeeping, and generator backup', TRUE),
(4, 'SECURITY_DEPOSIT', 'ONE_TIME', 'Refundable caution deposit collected at the time of hostel admission', TRUE);

-- -----------------------------------------------------------------------------
-- 11. STUDENT FEES
-- -----------------------------------------------------------------------------
INSERT INTO student_fees (id, student_id, fee_type_id, bill_number, academic_year, term_name, amount_due, amount_paid, discount, due_date, status) VALUES
(1, 1, 1, 'BILL-2025-HR-001', '2025-2026', 'Fall Semester 2025 - Room Rent', 27000.00, 27000.00, 0.00, '2025-08-15', 'PAID'),
(2, 1, 2, 'BILL-2025-MC-001', '2025-2026', 'Fall Semester 2025 - Mess Fee', 18000.00, 18000.00, 0.00, '2025-08-15', 'PAID'),
(3, 2, 1, 'BILL-2025-HR-002', '2025-2026', 'Fall Semester 2025 - Room Rent', 28800.00, 28800.00, 0.00, '2025-08-15', 'PAID'),
(4, 2, 2, 'BILL-2025-MC-002', '2025-2026', 'Fall Semester 2025 - Mess Fee', 18000.00, 9000.00, 0.00, '2025-08-15', 'PARTIAL'),
(5, 3, 1, 'BILL-2025-HR-003', '2025-2026', 'Fall Semester 2025 - Room Rent', 27000.00, 0.00, 0.00, '2025-08-15', 'OVERDUE');

-- -----------------------------------------------------------------------------
-- 12. PAYMENTS
-- -----------------------------------------------------------------------------
INSERT INTO payments (id, student_fee_id, student_id, receipt_number, transaction_id, payment_method, amount, payment_date, payment_status, collected_by, notes) VALUES
(1, 1, 1, 'REC-2025-90101', 'TXN_UPI_9948271048', 'UPI', 27000.00, '2025-08-05 11:20:00', 'SUCCESS', 4, 'Full hostel rent cleared online via UPI'),
(2, 2, 1, 'REC-2025-90102', 'TXN_UPI_9948271049', 'UPI', 18000.00, '2025-08-05 11:22:00', 'SUCCESS', 4, 'Mess advance fee paid online'),
(3, 3, 2, 'REC-2025-90103', 'TXN_NB_4482019482', 'NET_BANKING', 28800.00, '2025-08-10 14:45:00', 'SUCCESS', 4, 'Online Net Banking payment'),
(4, 4, 2, 'REC-2025-90104', 'TXN_UPI_7719283019', 'UPI', 9000.00, '2025-08-10 15:00:00', 'SUCCESS', 4, '1st installment paid');

-- -----------------------------------------------------------------------------
-- 13. COMPLAINTS
-- -----------------------------------------------------------------------------
INSERT INTO complaints (id, ticket_number, student_id, room_id, category, title, description, priority, status, assigned_to) VALUES
(1, 'TCK-2025-001', 1, 1, 'ELECTRICAL', 'Study Lamp Socket Near Desk B Tripping', 'Power plug socket trips MCB whenever laptop charger is connected.', 'HIGH', 'RESOLVED', 2),
(2, 'TCK-2025-002', 2, 5, 'PLUMBING', 'Low Hot Water Pressure in Morning', 'Shower geyser hot water inlet valve has very low flow between 7 AM and 8:30 AM.', 'MEDIUM', 'IN_PROGRESS', 2),
(3, 'TCK-2025-003', 3, 1, 'INTERNET', 'Wi-Fi AP Signal Dropping in 1st Floor', 'Wi-Fi disconnects frequently during evening study hours.', 'MEDIUM', 'PENDING', 2);

-- -----------------------------------------------------------------------------
-- 14. COMPLAINT UPDATES
-- -----------------------------------------------------------------------------
INSERT INTO complaint_updates (id, complaint_id, updated_by, status_from, status_to, remarks) VALUES
(1, 1, 2, 'PENDING', 'IN_PROGRESS', 'Assigned to electrician Mr. Ramakant for inspection.'),
(2, 1, 2, 'IN_PROGRESS', 'RESOLVED', 'Electrician replaced the faulty MCB switch and grounded socket box.'),
(3, 2, 2, 'PENDING', 'IN_PROGRESS', 'Plumber inspected; replacement valve ordered.');

-- -----------------------------------------------------------------------------
-- 15. LEAVE REQUESTS
-- -----------------------------------------------------------------------------
INSERT INTO leave_requests (id, student_id, leave_type, start_date, end_date, reason, destination_address, emergency_contact, status, reviewed_by, review_remarks) VALUES
(1, 1, 'HOME_VISIT', '2025-10-02', '2025-10-06', 'Attending Diwali family festival at Ahmedabad.', '42, Shanti Nagar, Ahmedabad, Gujarat', '+91 99887 76655', 'APPROVED', 2, 'Approved. Parent consent verified via SMS.'),
(2, 2, 'ACADEMIC_EVENT', '2025-10-15', '2025-10-18', 'Representing institute in Smart India Hackathon at IIT Delhi.', 'IIT Delhi Guest House, Hauz Khas, New Delhi', '+91 99887 76656', 'APPROVED', 2, 'Duty leave granted with HOD recommendation letter.'),
(3, 3, 'HOME_VISIT', '2025-10-25', '2025-10-28', 'Sibling wedding ceremony.', '88, Shivneri Marg, Pune, Maharashtra', '+91 99887 76657', 'PENDING', NULL, NULL);

-- -----------------------------------------------------------------------------
-- 16. VISITORS
-- -----------------------------------------------------------------------------
INSERT INTO visitors (id, student_id, visitor_name, relationship, phone_number, id_proof_type, id_proof_number, purpose, check_in_time, check_out_time, status, approved_by, remarks) VALUES
(1, 1, 'Mahesh Patel', 'Father', '+91 99887 76655', 'AADHAAR', 'XXXX-XXXX-4821', 'Handing over winter essentials and home snacks.', '2025-09-20 10:00:00', '2025-09-20 13:30:00', 'CHECKED_OUT', 2, 'Allowed in hostel visiting lounge.'),
(2, 2, 'Radhika Nair', 'Mother', '+91 99887 76656', 'AADHAAR', 'XXXX-XXXX-8910', 'Weekend parent visitation.', '2025-09-21 11:15:00', '2025-09-21 16:00:00', 'CHECKED_OUT', 2, 'Cleared gate pass.');

-- -----------------------------------------------------------------------------
-- 17. NOTIFICATIONS
-- -----------------------------------------------------------------------------
INSERT INTO notifications (id, user_id, title, message, type, is_read) VALUES
(1, 1, 'System Initialized', 'Hostel Management Relational Database is active with 17 normalized entities.', 'SYSTEM', FALSE),
(2, 2, 'New Leave Application', 'Student Rohan Deshmukh (EC2024012) submitted a home visit leave request.', 'LEAVE', FALSE),
(3, 3, 'Mess Menu Schedule Active', 'Weekly rotating meal cycle is active for dining hall.', 'MESS', FALSE),
(4, 5, 'Room Allocation Confirmed', 'You are allocated Room 101, Bed A in Aryabhatta Boys Residence.', 'ROOM', TRUE),
(5, 5, 'Fee Payment Verified', 'Payment of ₹27,000 for Fall Semester Room Rent received (Receipt: REC-2025-90101).', 'FEES', TRUE);

SET FOREIGN_KEY_CHECKS = 1;
