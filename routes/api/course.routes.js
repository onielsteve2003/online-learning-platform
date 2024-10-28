const express = require('express')
const router = express.Router()
const checkRole = require('../../middleware/roleMiddleware')
const protect = require('../../middleware/authMiddleware')
const { 
    createCourse,
    enrollInCourse,
    deleteCourse,
    updateCourse,
} = require('../../controllers/courseController')
const { upload } = require('../../middleware/multer')

router.post('/create', protect, checkRole('instructor'), upload.array('files'), createCourse)
router.post('/:courseId/enroll', protect, checkRole('student'), enrollInCourse)
router.delete('/:courseId', protect, checkRole('instructor'), deleteCourse)
router.put('/:courseId', protect, checkRole('instructor'), upload.array('files'), updateCourse);

module.exports = router