const Course = require('../models/course')
const Category = require('../models/Category')

// Create a new course (Instructor only)
const createCourse = async (req, res) => {
    try {
        const { title, description, content, maxStudents, category, duration } = req.body;

        // Validate that the user is an instructor
        if (req.user.role !== 'instructor') {
            return res.status(403).json({
                code: 403,
                message: 'Only instructors can create courses'
            });
        }

        // Check if required fields are present
        if (!title || !description || !category || !duration) {
            return res.status(400).json({
                code: 400,
                message: 'Title, description, category, and duration are required to create a course'
            });
        }

        // Check if the category exists
        const existingCategory = await Category.findById(category);
        if (!existingCategory) {
            return res.status(400).json({
                code: 400,
                message: 'Invalid category'
            });
        }

        // Check for duplicate course in the same category
        const existingCourse = await Course.findOne({ title, category });
        if (existingCourse) {
            return res.status(400).json({
                code: 400,
                message: 'A course with this title already exists in this category'
            });
        }

        // Create a new course
        const course = new Course({
            title,
            description,
            content: content || '',  // Fallback to empty string if content is not provided
            instructor: req.user._id,
            maxStudents: maxStudents || 5,  // Default to 5 if maxStudents is not provided
            category,
            duration
        });

        // Save the course to the database
        const savedCourse = await course.save();

        // Send back a success response with the created course
        res.status(201).json({
            code: 201,
            message: 'Course created successfully',
            data: savedCourse
        });
    } catch (err) {
        // Handle any server-side errors
        res.status(500).json({
            code: 500,
            message: 'Error creating course',
            error: err.message
        });
    }
};

// Enroll in a course (Student only)
const enrollInCourse = async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ code: 403, message: 'Only students can enroll in courses' });
        }

        const course = await Course.findById(req.params.courseId);
        if (!course) {
            return res.status(404).json({ code: 404, message: 'Course not found' });
        }

        if (course.students.includes(req.user._id.toString())) {
            return res.status(400).json({ code: 400, message: 'You are already enrolled in this course' });
        }

        if (course.students.length >= course.maxStudents) {
            return res.status(400).json({ code: 400, message: 'Course is already full' });
        }

        course.students.push(req.user._id);
        await course.save();

        return res.status(200).json({
            code: 200,
            message: 'Student enrolled successfully',
            data: course
        });
    } catch (error) {
        console.error('Error enrolling in course:', error);
        return res.status(500).json({ code: 500, message: 'Error enrolling in course', error: error.message });
    }
};

// Delete a course
const deleteCourse = async (req, res) => {
    try {
        const courseId = req.params.courseId;

        // Find the course by ID
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({
                code: 404,
                message: 'Course not found'
            });
        }

        // Check if the user is the instructor who created the course
        if (course.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                code: 403,
                message: 'Only the instructor who created the course can delete it'
            });
        }

        // Delete the course
        await Course.findByIdAndDelete(courseId);

        return res.status(200).json({
            code: 200,
            message: 'Course deleted successfully'
        });
    } catch (err) {
        return res.status(500).json({
            code: 500,
            message: 'Error deleting course',
            error: err.message
        });
    }
};

module.exports = {
    createCourse,
    enrollInCourse,
    deleteCourse
}