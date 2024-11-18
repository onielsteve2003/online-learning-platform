const express = require('express');
const router = express.Router();
const { 
    initializePayment, 
    verifyPayment, 
    // processRefund 
} = require('../../controllers/paymentController');

const {protect} = require('../../middleware/authMiddleware')
const checkRole = require('../../middleware/roleMiddleware')

// Initialize Payment
router.post('/courses/:courseId/initialize-payment', protect, checkRole('student'), initializePayment);

// Verify Payment
router.post('/verify-payment', verifyPayment); // Redirected from Paystack

// Process Refund
// router.post('/courses/:courseId/refund', protect, checkRole('admin'), processRefund);

module.exports = router;
