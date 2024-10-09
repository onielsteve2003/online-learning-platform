const express = require('express')
const router = express.Router()
const checkRole = require('../../middleware/roleMiddleware')
const protect = require('../../middleware/authMiddleware')
const { 
    createCourse,
    enrollInCourse,
    deleteCourse
} = require('../../controllers/courseController')

// Example: Only instructors can create a course 
router.post('/create', protect, checkRole('instructor'), createCourse)
router.post('/:id/enroll', protect, checkRole('student'), enrollInCourse)
router.delete('/:id', protect, checkRole('admin'), deleteCourse)

module.exports = router