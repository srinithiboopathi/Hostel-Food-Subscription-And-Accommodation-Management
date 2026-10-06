-- =============================================================================
-- HOSTEL FOOD & ACCOMMODATION MANAGEMENT SYSTEM
-- Seed Data for Development & Demonstration
-- Default Passwords for all accounts: "Password@123"
-- Password Hash below is generated with bcrypt (10 rounds) for "Password@123":
-- $2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey
-- =============================================================================

USE hostel_db;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. USERS
INSERT INTO users (id, full_name, email, password_hash, role, phone, avatar_url, status) VALUES
(1, 'System Administrator', 'admin@hostel.edu', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey', 'ADMIN', '+91 98765 43210', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'ACTIVE'),
(2, 'Dr. Robert Vance (Chief Warden)', 'warden@hostel.edu', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey', 'WARDEN', '+91 98765 43211', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'ACTIVE'),
(3, 'Suresh Sharma (Mess Manager)', 'mess@hostel.edu', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey', 'MESS_MANAGER', '+91 98765 43212', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'ACTIVE'),
(4, 'Meenakshi Iyer (Chief Accountant)', 'accounts@hostel.edu', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey', 'ACCOUNTANT', '+91 98765 43213', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', 'ACTIVE'),
(5, 'Aarav Patel', 'aarav.patel@student.edu', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey', 'STUDENT', '+91 98111 22334', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', 'ACTIVE'),
(6, 'Priya Nair', 'priya.nair@student.edu', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey', 'STUDENT', '+91 98222 33445', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'ACTIVE'),
(7, 'Rohan Deshmukh', 'rohan.d@student.edu', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey', 'STUDENT', '+91 98333 44556', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', 'ACTIVE'),
(8, 'Ananya Sharma', 'ananya.s@student.edu', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekd59SQR4eR5sv9ey', 'STUDENT', '+91 98444 55667', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', 'ACTIVE');

-- 2. HOSTELS
INSERT INTO hostels (id, name, code, type, total_floors, warden_id, address, contact_phone, status) VALUES
(1, 'Aryabhatta Boys Residence', 'ABR-01', 'BOYS', 4, 2, 'North Campus, Engineering Block, Sector 4', '+91 11 2789 0001', 'ACTIVE'),
(2, 'Gargi Girls Residence', 'GGR-02', 'GIRLS', 4, 2, 'South Campus, Medical Block, Sector 6', '+91 11 2789 0002', 'ACTIVE'),
(3, 'Tagore International Hostel', 'TIH-03', 'COED', 3, 2, 'East Campus, International Scholar Wing', '+91 11 2789 0003', 'ACTIVE');

-- 3. ROOMS
INSERT INTO rooms (id, hostel_id, room_number, floor, room_type, capacity, occupied_count, base_rent, amenities, status) VALUES
-- Aryabhatta Boys Hostel (Hostel 1)
(1, 1, '101', 1, 'DOUBLE', 2, 2, 4500.00, '["Air Conditioner", "Attached Washroom", "High-speed Wi-Fi", "Study Desk", "Balcony"]', 'OCCUPIED'),
(2, 1, '102', 1, 'DOUBLE', 2, 1, 4500.00, '["Air Conditioner", "Attached Washroom", "High-speed Wi-Fi", "Study Desk"]', 'AVAILABLE'),
(3, 1, '103', 1, 'SINGLE', 1, 0, 7000.00, '["Air Conditioner", "Single Bed", "Attached Washroom", "Study Lamp", "Mini Refrigerator"]', 'AVAILABLE'),
(4, 1, '201', 2, 'TRIPLE', 3, 0, 3500.00, '["Ceiling Fans", "3x Study Desks", "Spacious Wardrobes", "High-speed Wi-Fi"]', 'AVAILABLE'),
(5, 1, '202', 2, 'DOUBLE', 2, 0, 4500.00, '["Air Conditioner", "Attached Washroom", "Study Desk"]', 'MAINTENANCE'),

-- Gargi Girls Hostel (Hostel 2)
(6, 2, 'G-101', 1, 'DOUBLE', 2, 2, 4800.00, '["Air Conditioner", "Attached Washroom", "High-speed Wi-Fi", "Mirror Vanity"]', 'OCCUPIED'),
(7, 2, 'G-102', 1, 'SINGLE', 1, 0, 7500.00, '["Air Conditioner", "Attached Washroom", "Study Lamp", "Balcony Garden View"]', 'AVAILABLE'),
(8, 2, 'G-201', 2, 'DOUBLE', 2, 0, 4800.00, '["Air Conditioner", "Attached Washroom", "High-speed Wi-Fi"]', 'AVAILABLE');

-- 4. STUDENTS
INSERT INTO students (id, user_id, roll_number, department, course, year_of_study, gender, dob, blood_group, guardian_name, guardian_phone, guardian_relation, permanent_address, current_hostel_id, current_room_id, admission_date, status) VALUES
(1, 5, 'CS2023001', 'Computer Science & Engineering', 'B.Tech CSE', 3, 'MALE', '2003-05-14', 'O+', 'Mahesh Patel', '+91 99887 76655', 'Father', '42, Shanti Nagar, Ahmedabad, Gujarat', 1, 1, '2023-08-01', 'ACTIVE'),
(2, 6, 'CS2023045', 'Computer Science & Engineering', 'B.Tech CSE', 3, 'FEMALE', '2003-11-20', 'B+', 'Radhika Nair', '+91 99887 76656', 'Mother', '12/B, Green Meadows, Kochi, Kerala', 2, 6, '2023-08-01', 'ACTIVE'),
(3, 7, 'EC2024012', 'Electronics & Communication', 'B.Tech ECE', 2, 'MALE', '2004-02-18', 'A+', 'Vikram Deshmukh', '+91 99887 76657', 'Father', '88, Shivneri Marg, Pune, Maharashtra', 1, 1, '2024-08-01', 'ACTIVE'),
(4, 8, 'BT2024089', 'Biotechnology', 'B.Tech Biotech', 2, 'FEMALE', '2004-09-08', 'AB+', 'Sunil Sharma', '+91 99887 76658', 'Father', '104, Royal Palms, Jaipur, Rajasthan', 2, 6, '2024-08-01', 'ACTIVE');

-- 5. ROOM ALLOCATIONS
INSERT INTO room_allocations (id, student_id, room_id, academic_year, allocated_from, allocated_to, security_deposit, status, allocated_by, remarks) VALUES
(1, 1, 1, '2025-2026', '2025-07-01', '2026-06-30', 5000.00, 'ACTIVE', 2, 'Allocated bed A in Room 101'),
(2, 2, 6, '2025-2026', '2025-07-01', '2026-06-30', 5000.00, 'ACTIVE', 2, 'Allocated bed A in Room G-101'),
(3, 3, 1, '2025-2026', '2025-07-01', '2026-06-30', 5000.00, 'ACTIVE', 2, 'Allocated bed B in Room 101'),
(4, 4, 6, '2025-2026', '2025-07-01', '2026-06-30', 5000.00, 'ACTIVE', 2, 'Allocated bed B in Room G-101');

-- 6. MESS MENU
INSERT INTO mess_menu (day_of_week, meal_type, start_time, end_time, menu_items, special_item, calories_est) VALUES
('MONDAY', 'BREAKFAST', '07:30:00', '09:30:00', 'Masala Dosa, Sambar, Coconut Chutney, Boiled Eggs, Tea/Coffee/Milk, Fresh Fruits', 'Filter Coffee', 480),
('MONDAY', 'LUNCH', '12:30:00', '14:30:00', 'Paneer Butter Masala, Dal Tadka, Steamed Basmati Rice, Phulka Roti, Cucumber Raita, Gulab Jamun', 'Paneer Butter Masala', 720),
('MONDAY', 'SNACKS', '17:00:00', '18:15:00', 'Vegetable Samosa, Green Mint Chutney, Biscuits, Hot Masala Tea', 'Crispy Samosa', 310),
('MONDAY', 'DINNER', '19:30:00', '21:30:00', 'Mixed Veg Korma, Yellow Moong Dal, Jeera Rice, Chapati, Green Salad, Fruit Custard', 'Fruit Custard', 640),

('TUESDAY', 'BREAKFAST', '07:30:00', '09:30:00', 'Aloo Paratha, Curd, Pickle, Boiled Sprouts, Tea/Coffee', 'Aloo Paratha with Butter', 520),
('TUESDAY', 'LUNCH', '12:30:00', '14:30:00', 'Rajma Masala, Steamed Rice, Butter Roti, Mixed Vegetable Sabzi, Boondi Raita', 'Punjabi Rajma', 690),
('TUESDAY', 'SNACKS', '17:00:00', '18:15:00', 'Poha with Roasted Peanuts, Sev, Lemon & Ginger Tea', 'Indori Poha', 280),
('TUESDAY', 'DINNER', '19:30:00', '21:30:00', 'Chicken Curry / Shahi Paneer, Dal Makhani, Pulao, Butter Naan, Ice Cream', 'Special Feast Dinner', 810),

('WEDNESDAY', 'BREAKFAST', '07:30:00', '09:30:00', 'Idli, Vada, Sambar, Tomato Chutney, Boiled Eggs, Tea/Coffee', 'Medu Vada', 460),
('WEDNESDAY', 'LUNCH', '12:30:00', '14:30:00', 'Chole Bhature / Chole Rice, Onion Salad, Lemon Pickle, Sweet Lassi', 'Delhi Style Chole', 780),
('WEDNESDAY', 'SNACKS', '17:00:00', '18:15:00', 'Veg Sandwich, Tomato Ketchup, Tea/Coffee', 'Grilled Cheese Sandwich', 320),
('WEDNESDAY', 'DINNER', '19:30:00', '21:30:00', 'Egg Curry / Malai Kofta, Dal Fry, Jeera Rice, Tawa Roti, Kheer', 'Rice Kheer', 690),

('THURSDAY', 'BREAKFAST', '07:30:00', '09:30:00', 'Upma, Coconut Chutney, Cornflakes with Milk, Bananas, Tea/Coffee', 'Rava Upma', 420),
('THURSDAY', 'LUNCH', '12:30:00', '14:30:00', 'Kadhi Pakoda, Jeera Rice, Aloo Gobi Dry, Roti, Salad', 'Rajasthani Kadhi', 650),
('THURSDAY', 'SNACKS', '17:00:00', '18:15:00', 'Bread Pakoda, Mint Chutney, Hot Tea', 'Bread Pakoda', 340),
('THURSDAY', 'DINNER', '19:30:00', '21:30:00', 'Veg Biryani / Hyderabadi Dum Biryani, Mirchi Ka Salan, Raita, Rasgulla', 'Hyderabadi Biryani', 760),

('FRIDAY', 'BREAKFAST', '07:30:00', '09:30:00', 'Poori Bhaji, Suji Halwa, Sprouts, Tea/Coffee', 'Suji Halwa', 540),
('FRIDAY', 'LUNCH', '12:30:00', '14:30:00', 'Veg Kofta Curry, Dal Palak, Steamed Rice, Chapati, Papad, Curd', 'Veg Kofta', 670),
('FRIDAY', 'SNACKS', '17:00:00', '18:15:00', 'Bhel Puri, Masala Chai, Biscuits', 'Bombay Bhel', 260),
('FRIDAY', 'DINNER', '19:30:00', '21:30:00', 'Fish Curry / Mushroom Matar, Dal Tadka, Ghee Rice, Roti, Moong Dal Halwa', 'Moong Dal Halwa', 790),

('SATURDAY', 'BREAKFAST', '07:30:00', '09:30:00', 'Uttapam, Coconut & Tomato Chutney, Omelette / Boiled Eggs, Tea/Coffee', 'Onion Tomato Uttapam', 450),
('SATURDAY', 'LUNCH', '12:30:00', '14:30:00', 'Pav Bhaji, Extra Butter Pav, Masala Rice, Gulab Jamun', 'Mumbai Pav Bhaji', 750),
('SATURDAY', 'SNACKS', '17:00:00', '18:15:00', 'Aloo Tikki Chaat, Masala Chai', 'Aloo Tikki', 310),
('SATURDAY', 'DINNER', '19:30:00', '21:30:00', 'Matar Paneer, Chana Dal, Veg Pulao, Phulka, Fruit Salad', 'Matar Paneer', 660),

('SUNDAY', 'BREAKFAST', '08:00:00', '10:00:00', 'Special Sunday Brunch: Mysore Masala Dosa, Chole Kulche, Juice, Pastries, Coffee', 'Sunday Special Brunch', 590),
('SUNDAY', 'LUNCH', '12:30:00', '15:00:00', 'Chicken Biryani / Shahi Paneer Biryani, Mirchi Ka Salan, Onion Raita, Pastry', 'Dum Biryani Special', 850),
('SUNDAY', 'SNACKS', '17:00:00', '18:15:00', 'Sweet & Spicy Corn Chaat, Tea/Coffee', 'Corn Chaat', 240),
('SUNDAY', 'DINNER', '19:30:00', '21:30:00', 'Light Dinner: Khichdi, Kadhi, Papad, Achar, Ghee, Fruit Salad', 'Comfort Khichdi', 510);

-- 7. FEE STRUCTURES
INSERT INTO fee_structures (id, title, academic_year, term_type, hostel_rent, mess_fee, maintenance_fee, security_deposit, description) VALUES
(1, 'Odd Semester Standard Package (2025-26)', '2025-2026', 'SEMESTER', 27000.00, 18000.00, 3000.00, 5000.00, 'Covers 6 months room accommodation, 4 meals/day mess charges, maintenance & security deposit.'),
(2, 'Even Semester Standard Package (2025-26)', '2025-2026', 'SEMESTER', 27000.00, 18000.00, 3000.00, 0.00, 'Covers second semester hostel and food expenses for enrolled students.');

-- 8. STUDENT FEE DUES
INSERT INTO student_fee_dues (id, student_id, fee_structure_id, bill_number, term_name, amount_due, amount_paid, discount, status, due_date) VALUES
(1, 1, 1, 'BILL-2025-001', 'Fall Semester 2025', 53000.00, 53000.00, 0.00, 'PAID', '2025-08-15'),
(2, 2, 1, 'BILL-2025-002', 'Fall Semester 2025', 53000.00, 30000.00, 0.00, 'PARTIAL', '2025-08-15'),
(3, 3, 1, 'BILL-2025-003', 'Fall Semester 2025', 53000.00, 0.00, 0.00, 'OVERDUE', '2025-08-15'),
(4, 4, 1, 'BILL-2025-004', 'Fall Semester 2025', 53000.00, 53000.00, 0.00, 'PAID', '2025-08-15');

-- 9. FEE PAYMENTS
INSERT INTO fee_payments (id, fee_due_id, student_id, receipt_number, transaction_id, payment_method, amount, payment_date, payment_status, collected_by, notes) VALUES
(1, 1, 1, 'REC-2025-88901', 'TXN_UPI_9948271048', 'UPI', 53000.00, '2025-08-05 11:20:00', 'SUCCESS', 4, 'Full semester fees cleared online'),
(2, 2, 2, 'REC-2025-88902', 'TXN_NB_4482019482', 'NET_BANKING', 30000.00, '2025-08-10 14:45:00', 'SUCCESS', 4, '1st installment paid. Balance due by next month'),
(3, 4, 4, 'REC-2025-88903', 'TXN_CARD_1029384756', 'CARD', 53000.00, '2025-08-12 16:30:00', 'SUCCESS', 4, 'Debit card payment at accounts counter');

-- 10. COMPLAINTS
INSERT INTO complaints (id, ticket_number, student_id, room_id, category, title, description, priority, status, assigned_to, resolution_notes, resolved_at) VALUES
(1, 'TCK-2025-001', 1, 1, 'ELECTRICAL', 'Study Lamp Socket Not Functioning', 'The wall power plug near Desk B in room 101 trips the MCB whenever a laptop charger is connected.', 'HIGH', 'RESOLVED', 2, 'Replaced the faulty switch socket box and verified earth grounding.', '2025-09-10 15:30:00'),
(2, 'TCK-2025-002', 2, 6, 'PLUMBING', 'Low Water Pressure in Shower', 'The hot water geyser connection has very low pressure in the morning between 7 AM and 8:30 AM.', 'MEDIUM', 'IN_PROGRESS', 2, 'Plumber inspected; replacing the inlet valve today.', NULL),
(3, 'TCK-2025-003', 3, 1, 'INTERNET', 'Wi-Fi AP Signal Dropping in 1st Floor Corridor', 'Wi-Fi signal drops frequently in the north corner of the 1st floor during peak evening hours.', 'MEDIUM', 'PENDING', 2, NULL, NULL);

-- 11. LEAVE REQUESTS
INSERT INTO leave_requests (id, student_id, leave_type, start_date, end_date, reason, destination_address, emergency_contact, status, reviewed_by, review_remarks) VALUES
(1, 1, 'HOME_VISIT', '2025-10-02', '2025-10-06', 'Attending family festive celebration at hometown Ahmedabad.', '42, Shanti Nagar, Ahmedabad, Gujarat', '+91 99887 76655', 'APPROVED', 2, 'Approved. Parent contact verified over phone.'),
(2, 2, 'ACADEMIC_EVENT', '2025-10-15', '2025-10-18', 'Representing college at National Smart India Hackathon at IIT Delhi.', 'IIT Delhi Hostel Guest House, Hauz Khas', '+91 99887 76656', 'APPROVED', 2, 'Duty leave granted with permission letter from HOD.'),
(3, 3, 'HOME_VISIT', '2025-10-25', '2025-10-28', 'Sibling wedding ceremony.', '88, Shivneri Marg, Pune, Maharashtra', '+91 99887 76657', 'PENDING', NULL, NULL);

-- 12. VISITORS
INSERT INTO visitors (id, student_id, visitor_name, relationship, phone_number, id_proof_type, id_proof_number, purpose, check_in_time, check_out_time, status, approved_by) VALUES
(1, 1, 'Mahesh Patel', 'Father', '+91 99887 76655', 'AADHAAR', 'XXXX-XXXX-4821', 'Dropping off winter clothes and personal essentials.', '2025-09-20 10:00:00', '2025-09-20 13:30:00', 'CHECKED_OUT', 2),
(2, 2, 'Radhika Nair', 'Mother', '+91 99887 76656', 'AADHAAR', 'XXXX-XXXX-8910', 'Visiting student during weekend visiting hours.', '2025-09-21 11:15:00', '2025-09-21 16:00:00', 'CHECKED_OUT', 2);

-- 13. NOTIFICATIONS
INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
(1, 'System Welcome', 'Welcome to the Hostel Food & Accommodation Management Portal.', 'SYSTEM', FALSE),
(2, 'New Leave Application', 'Student Rohan Deshmukh has submitted a new leave request for approval.', 'LEAVE', FALSE),
(3, 'Weekly Mess Feedback', 'Mess menu update for the upcoming week has been published.', 'MESS', FALSE),
(4, 'Fee Payment Received', 'Fee payment of ₹53,000 recorded for Aarav Patel (Receipt #REC-2025-88901).', 'FEES', TRUE),
(5, 'Room Allocation Confirmed', 'You have been allocated Room 101, Bed A in Aryabhatta Boys Residence.', 'ROOM', TRUE);

SET FOREIGN_KEY_CHECKS = 1;
