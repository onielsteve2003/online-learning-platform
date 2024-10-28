const express = require('express')
const router = express.Router()
const checkRole = require('../../middleware/roleMiddleware')
const protect = require('../../middleware/authMiddleware')
const { 
    createCategory,
    deleteCategory,
    getAllCategories
} = require('../../controllers/category')

// Example: Only admin can add a category 
router.post('/create', protect, checkRole('admin'), createCategory)
router.delete('/:categoryId', protect, checkRole('admin'), deleteCategory);
router.get('/', getAllCategories);

module.exports = router