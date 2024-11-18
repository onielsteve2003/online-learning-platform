const { verifyCourseAccess } = require('../middleware/authMiddleware');
const Course = require('../models/course');

// Create a new course (Instructor and admin only)
const createCourse = async (req, res) => {
    try {
        const { title, description, maxStudents, category, duration, modules, price } = req.body;

        const existingCourse = await Course.findOne({ title });
        if (existingCourse) return res.status(409).json({ code: 409, message: 'Course title already exists.' });

        const newCourse = new Course({
            title,
            description,
            instructor: req.user._id,
            maxStudents: maxStudents || 100,
            category,
            duration,
            modules,
            price
        });

        const savedCourse = await newCourse.save();
        res.status(201).json({ code: 201, message: 'Course created successfully', data: savedCourse });
    } catch (err) {
        console.error('Error creating course:', err);
        res.status(500).json({ code: 500, message: 'Error creating course', error: err.message });
    }
};

// Enroll in a course (Student only)
const enrollInCourse = async (req, res) => {
    try {
        await verifyCourseAccess(req, res, async () => {
            const { courseId } = req.params;

            const course = await Course.findById(courseId).populate('students.user');
            if (!course) return res.status(404).json({ code: 404, message: 'Course not found' });

            // Check if the user is already enrolled
            const isEnrolled = course.students.some(s => s.user._id.toString() === req.user._id.toString());
            if (isEnrolled) {
                return res.status(400).json({ code: 400, message: 'Already enrolled' });
            }

            // Enroll the user
            course.students.push({ user: req.user._id, status: 'paid' });
            await course.save();

            res.status(200).json({ code: 200, message: 'Enrollment successful', data: course });
        });
    } catch (error) {
        res.status(500).json({ code: 500, message: 'Error enrolling in course', error: error.message });
    }
};

const deleteModuleFromCourse = async (req, res) => {
    try {
        const { courseId, moduleId } = req.params;

        // Find the course by ID
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ code: 404, message: 'Course not found' });
        }

        // Check if the user is the instructor or an admin
        if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ code: 403, message: 'Only the instructor who created the course or an admin can delete modules' });
        }

        // Find the module by ID and remove it
        const moduleIndex = course.modules.findIndex(module => module._id.toString() === moduleId);
        if (moduleIndex === -1) {
            return res.status(404).json({ code: 404, message: 'Module not found' });
        }

        // Remove the module
        course.modules.splice(moduleIndex, 1);
        await course.save();

        return res.status(200).json({ code: 200, message: 'Module deleted successfully' });
    } catch (err) {
        return res.status(500).json({ code: 500, message: 'Error deleting module', error: err.message });
    }
};

// Delete a course
const deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) {
            return res.status(404).json({ code: 404, message: 'Course not found' });
        }

        if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ code: 403, message: 'Unauthorized to delete this course' });
        }

        // Use findByIdAndDelete to remove the course
        await Course.findByIdAndDelete(req.params.courseId);
        
        res.status(200).json({ code: 200, message: 'Course deleted successfully' });
    } catch (err) {
        res.status(500).json({ code: 500, message: 'Error deleting course', error: err.message });
    }
};

const updateCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ code: 404, message: 'Course not found' });

        if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ code: 403, message: 'Unauthorized to update this course' });
        }

        Object.assign(course, req.body);
        const updatedCourse = await course.save();

        res.status(200).json({ code: 200, message: 'Course updated successfully', data: updatedCourse });
    } catch (error) {
        res.status(500).json({ code: 500, message: 'Error updating course', error: error.message });
    }
};

const getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find().populate('instructor', 'name email');
        res.status(200).json({ code: 200, message: 'Courses retrieved successfully', data: courses });
    } catch (err) {
        res.status(500).json({ code: 500, message: 'Error retrieving courses', error: err.message });
    }
};

const getAllModulesInCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({ code: 404, message: 'Course not found' });
        }

        // Check if user is instructor or admin, if not, ensure they are a paid student
        if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
            const enrollment = course.students.find(s => s.user.toString() === req.user._id.toString());
            if (!enrollment || enrollment.status !== 'paid') {
                return res.status(403).json({ code: 403, message: 'Payment required to view modules' });
            }
        }

        res.status(200).json({ code: 200, message: 'Modules retrieved', data: course.modules });
    } catch (err) {
        res.status(500).json({ code: 500, message: 'Error retrieving modules', error: err.message });
    }
};

const getAllLessonsInCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId).populate('modules.lessons');

        if (!course) {
            return res.status(404).json({ code: 404, message: 'Course not found' });
        }

        // Check if user is instructor or admin, if not, ensure they are a paid student
        if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
            const enrollment = course.students.find(s => s.user.toString() === req.user._id.toString());
            if (!enrollment || enrollment.status !== 'paid') {
                return res.status(403).json({ code: 403, message: 'Payment required to view modules' });
            }
        }

        const lessons = course.modules.flatMap(module => module.lessons);
        res.status(200).json({ code: 200, message: 'Lessons retrieved', data: lessons });
    } catch (err) {
        res.status(500).json({ code: 500, message: 'Error retrieving lessons', error: err.message });
    }
};

const getLessonById = async (req, res) => {
    try {
        const { courseId, lessonId } = req.params;
        const course = await Course.findById(courseId).populate('modules.lessons');

        if (!course) {
            return res.status(404).json({ code: 404, message: 'Course not found' });
        }

        // Check if user is instructor or admin, if not, ensure they are a paid student
        if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
            const enrollment = course.students.find(s => s.user.toString() === req.user._id.toString());
            if (!enrollment || enrollment.status !== 'paid') {
                return res.status(403).json({ code: 403, message: 'Payment required to view lesson' });
            }
        }

        const lesson = course.modules.flatMap(module => module.lessons).find(lesson => lesson._id.toString() === lessonId);

        if (!lesson) {
            return res.status(404).json({ code: 404, message: 'Lesson not found' });
        }

        res.status(200).json({ code: 200, message: 'Lesson retrieved', data: lesson });
    } catch (err) {
        res.status(500).json({ code: 500, message: 'Error retrieving lesson', error: err.message });
    }
};

const getModuleById = async (req, res) => {
    try {
        const { courseId, moduleId } = req.params;

        const course = await Course.findById(courseId).populate('modules.lessons');
        if (!course) {
            return res.status(404).json({
                code: 404,
                message: 'Course not found'
            });
        }

        // Check if user is instructor or admin, if not, ensure they are a paid student
        if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
            const enrollment = course.students.find(s => s.user.toString() === req.user._id.toString());
            if (!enrollment || enrollment.status !== 'paid') {
                return res.status(403).json({
                    code: 403,
                    message: 'Payment required to view module'
                });
            }
        }

        const module = course.modules.find(m => m._id.toString() === moduleId);
        if (!module) {
            return res.status(404).json({
                code: 404,
                message: 'Module not found'
            });
        }

        res.status(200).json({
            code: 200,
            message: 'Module retrieved successfully',
            data: module
        });
    } catch (err) {
        res.status(500).json({
            code: 500,
            message: 'Error retrieving module',
            error: err.message
        });
    }
};

const getCourseById = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId).select('title description price modules students');

        if (!course) {
            return res.status(404).json({ code: 404, message: 'Course not found' });
        }

        // Check if user is instructor or admin, if not, ensure they are enrolled and paid
        if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
            const enrollment = course.students.find(s => s.user.toString() === req.user._id.toString());

            if (!enrollment) {
                return res.status(403).json({ code: 403, message: 'Enroll in the course to view content' });
            }

            if (enrollment.status !== 'paid') {
                return res.status(402).json({
                    code: 402,
                    message: 'Payment required to view content',
                    data: { title: course.title, description: course.description, price: course.price }
                });
            }
        }

        res.status(200).json({ code: 200, message: 'Course retrieved', data: course });
    } catch (error) {
        res.status(500).json({ code: 500, message: 'Error fetching course details', error: error.message });
    }
};

const deleteLessonInModule = async (req, res) => {
    try {
        const { courseId, moduleId, lessonId } = req.params;

        // Fetch the course
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                code: 404,
                message: 'Course not found'
            });
        }

        // **Early check for user authorization**
        if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ 
                code: 403, 
                message: 'Only the instructor who created the course or an admin can delete a lesson' 
            });
        }        

        // Fetch the module
        const module = course.modules.find(m => m._id.toString() === moduleId);
        if (!module) {
            return res.status(404).json({
                code: 404,
                message: 'Module not found'
            });
        }

        // Find the lesson within the module
        const lessonIndex = module.lessons.findIndex(l => l._id.toString() === lessonId);
        if (lessonIndex === -1) {
            return res.status(404).json({
                code: 404,
                message: 'Lesson not found'
            });
        }

        // Remove the lesson
        module.lessons.splice(lessonIndex, 1);
        await course.save();

        res.status(200).json({
            code: 200,
            message: 'Lesson deleted successfully'
        });
    } catch (err) {
        res.status(500).json({
            code: 500,
            message: 'Error deleting lesson',
            error: err.message
        });
    }
};

module.exports = {
    createCourse,
    enrollInCourse,
    deleteModuleFromCourse,
    deleteCourse,
    updateCourse,
    getAllCourses,
    getAllModulesInCourse,
    getAllLessonsInCourse,
    getLessonById,
    getModuleById,
    getCourseById,
    deleteLessonInModule
}