const express = require('express')
const router = express.Router()
const checkRole = require('../../middleware/roleMiddleware')
const protect = require('../../middleware/authMiddleware')
const { 
    createCategory
} = require('../../controllers/category')

// Example: Only admin can add a category 
router.post('/create', protect, checkRole('admin'), createCategory)

module.exports = router