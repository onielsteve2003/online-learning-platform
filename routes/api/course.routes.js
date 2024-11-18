const express = require('express')
const router = express.Router()
const checkRole = require('../../middleware/roleMiddleware')
const {protect} = require('../../middleware/authMiddleware')
const { 
    createCourse,
    enrollInCourse,
    deleteCourse,
    deleteModuleFromCourse,
    updateCourse,
    getAllCourses,
    getAllModulesInCourse,
    getAllLessonsInCourse,
    getLessonById,
    getModuleById,
    getCourseById,
    deleteLessonInModule
} = require('../../controllers/courseController')
const { upload } = require('../../middleware/multer')

router.post('/create', protect, checkRole('instructor', 'admin'), upload.array('files'), createCourse)
router.post('/:courseId/enroll', protect, enrollInCourse)
router.delete('/:courseId', protect, checkRole('instructor', 'admin'), deleteCourse)
router.put('/:courseId', protect, checkRole('instructor', 'admin'), upload.array('files'), updateCourse);
router.delete('/:courseId/modules/:moduleId', checkRole('instructor', 'admin'), protect, deleteModuleFromCourse);
router.get('/', getAllCourses);
router.get('/:courseId/modules', protect, getAllModulesInCourse);
router.get('/:courseId/lessons', protect, getAllLessonsInCourse);
router.get('/:courseId/lessons/:lessonId', protect, getLessonById);
router.get('/:courseId/modules/:moduleId', protect, getModuleById);
router.get('/:courseId', protect, getCourseById);
router.delete('/:courseId/modules/:moduleId/lessons/:lessonId', protect, checkRole('instructor', 'admin'), deleteLessonInModule);

module.exports = router