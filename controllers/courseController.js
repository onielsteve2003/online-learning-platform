const Course = require('../models/course')
const Category = require('../models/Category')
const cloudinary = require('../config/cloudinary')

// Create a new course (Instructor only)
const createCourse = async (req, res) => {
    try {
        const { title, description, content, maxStudents, category, duration } = req.body;

        if (req.user.role !== 'instructor') {
            return res.status(403).json({ code: 403, message: 'Only instructors can create courses' });
        }

        if (!title || !description || !category || !duration) {
            return res.status(400).json({ code: 400, message: 'Title, description, category, and duration are required' });
        }

        const existingCategory = await Category.findById(category);
        if (!existingCategory) {
            return res.status(400).json({ code: 400, message: 'Invalid category' });
        }

        const existingCourse = await Course.findOne({ title, category });
        if (existingCourse) {
            return res.status(400).json({ code: 400, message: 'A course with this title already exists in this category' });
        }

        let multimedia = [];

        if (req.files && req.files.length) {
            multimedia = await Promise.all(req.files.map(async file => {
                try {
                    const result = await cloudinary.uploader.upload(file.path, { resource_type: 'auto' });
                    return {
                        url: result.secure_url,
                        type: file.mimetype.startsWith('image/') ? 'image' :
                              file.mimetype.startsWith('video/') ? 'video' :
                              file.mimetype === 'application/pdf' ? 'pdf' :
                              'other'
                    };
                } catch (uploadError) {
                    console.error('File path:', file.path);
                    console.error('File mimetype:', file.mimetype);
                    console.error('Error uploading to Cloudinary:', JSON.stringify(uploadError, null, 2));
                    throw new Error(uploadError.message || 'File upload failed');
                }
            }));
        }

        const course = new Course({
            title,
            description,
            content: content || '',
            instructor: req.user._id,
            maxStudents: maxStudents || 100,
            category,
            duration,
            multimedia
        });

        const savedCourse = await course.save();

        res.status(201).json({ code: 201, message: 'Course created successfully', data: savedCourse });
    } catch (err) {
        console.error('Error creating course:', JSON.stringify(err, null, 2));
        res.status(500).json({
            code: 500,
            message: 'Error creating course',
            error: err.message || JSON.stringify(err)
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

const updateCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, description, content, maxStudents, category, duration } = req.body;

        // Find the course
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                code: 404,
                message: 'Course not found'
            });
        }

        // Check if the user is the instructor
        if (!course.instructor.equals(req.user._id)) {
            return res.status(403).json({
                code: 403,
                message: 'Only the instructor who created the course can update it'
            });
        }

        // Update the course fields
        course.title = title || course.title;
        course.description = description || course.description;
        course.content = content || course.content;
        course.maxStudents = maxStudents !== undefined ? maxStudents : course.maxStudents; // Ensure maxStudents can be updated
        course.category = category || course.category;
        course.duration = duration || course.duration;

        // Handle multimedia uploads if new files are uploaded
        if (req.files && req.files.length) {
            const multimedia = await Promise.all(req.files.map(async file => {
                const result = await cloudinary.uploader.upload(file.path, { resource_type: 'auto' });
                return {
                    url: result.secure_url,
                    type: file.mimetype.startsWith('image/') ? 'image' :
                          file.mimetype.startsWith('video/') ? 'video' :
                          file.mimetype === 'application/pdf' ? 'pdf' :
                          (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.mimetype === 'application/msword') ? 'docx' :
                          'other' // Default type for any other files
                };
            }));
            course.multimedia = multimedia; // Update multimedia
        }

        // Save the updated course
        const updatedCourse = await course.save();

        res.status(200).json({
            code: 200,
            message: 'Course updated successfully',
            data: updatedCourse
        });
    } catch (err) {
        res.status(500).json({
            code: 500,
            message: 'Error updating course',
            error: err.message
        });
    }
};

module.exports = {
    createCourse,
    enrollInCourse,
    deleteCourse,
    updateCourse
}