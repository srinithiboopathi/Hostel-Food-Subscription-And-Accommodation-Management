const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const healthRoutes = require('./healthRoutes');
const studentRoutes = require('./studentRoutes');
const hostelRoutes = require('./hostelRoutes');
const roomRoutes = require('./roomRoutes');
const allocationRoutes = require('./allocationRoutes');
const menuRoutes = require('./menuRoutes');
const mealRoutes = require('./mealRoutes');
const feeRoutes = require('./feeRoutes');
const paymentRoutes = require('./paymentRoutes');
const complaintRoutes = require('./complaintRoutes');
const leaveRoutes = require('./leaveRoutes');
const visitorRoutes = require('./visitorRoutes');
const notificationRoutes = require('./notificationRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const reportRoutes = require('./reportRoutes');

const foodSubscriptionRoutes = require('./foodSubscriptionRoutes');

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/students', studentRoutes);
router.use('/hostels', hostelRoutes);
router.use('/rooms', roomRoutes);
router.use('/allocations', allocationRoutes);
router.use('/food', foodSubscriptionRoutes);
router.use('/menu', menuRoutes);
router.use('/meals', mealRoutes);
router.use('/fees', feeRoutes);
router.use('/payments', paymentRoutes);
router.use('/complaints', complaintRoutes);
router.use('/leaves', leaveRoutes);
router.use('/visitors', visitorRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;

