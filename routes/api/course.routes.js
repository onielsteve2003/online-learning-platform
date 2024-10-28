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
router.post('/:courseId/enroll', protect, checkRole('student'), enrollInCourse)
router.delete('/:courseId', protect, checkRole('instructor'), deleteCourse)

module.exports = router