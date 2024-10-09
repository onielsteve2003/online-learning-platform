const Course = require('../models/course')

// Create a new course (Instructor only)
const createCourse = async(req, res) => {
    try {
        const {title, description, content, maxStudents = 5} = req.body

        // Validate that the user is an instructor
        if (req.user.role !== 'instructor') {
            return res.status(403).json({
                code: 403,
                message: 'Only instructors can create courses'
            })
        }

        // Create a new course with the instructor as the creator
        const course = new Course({
            title,
            description,
            content,
            // req.user is the authenticated user
            instructor: req.user._id,
            maxStudents: maxStudents || 5
        })

        await course.save()

        res.status(201).json({
            code: 201,
            message: 'Course created successfully',
            data: course
        })
    } catch (err) {
        res.status(500).json({
            code: 500,
            message: 'Error creating course',
            error: err.message
        })
    }
}

// Enroll in a course (Student only)
const enrollInCourse = async(req, res) => {
    try {
        const courseId = req.params.courseId

        // Validate that the user is a student
        if (req.user.role !== 'student') {
            return res.status(403).json({
                code: 403,
                message: 'Only students can enroll in courses'
            })
        }

        // Find the course by ID
        const course = await Course.findById(courseId)

        if(!course) {
            return res.status(404).json({
                code: 404,
                message: 'Course not found'
            })
        }

        // Check if the course is already full
        if(course.students.length >= course.maxStudents){ 
            return res.status(400).json({
                code: 400,
                message: 'Course is already full'
            })
        }

        // Check if the student is already enrolled
        if(course.students.includes(req.user.id)){ 
            return res.status(400).json({
                code: 400,
                message: 'You are already enrolled in this course'
            })
        }

        // Enroll the student in the course
        course.students.push(req.user.id)
        await course.save()

        res.status(200).json({
            code: 200,
            message: 'Student enrolled successfully',
            data: course
        })
    } catch (err) {
        res.status(500).json({
            code: 500,
            message: 'Error enrolling in course',
            error: err.message
        })
    }
}

// Delete a course
const deleteCourse = async(req, res) => {
    try {
        const courseId = req.params.courseId

        // Find the course ID
        const course = await Course.findById(courseId)

        if(!course) {
            return res.status(404).json({
                code: 404,
                message: 'Course not found'
            })
        }

        // Check if the user is an admin or the instructor who created the course
        if(req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
            return res.status(403).json({
                code: 403,
                message: 'Only admins or the instructor can delete courses'
            })
        }

        // Delete the course
        await Course.findByIdAndDelete(courseId)

        return res.status(200).json({
            code: 200,
            message: 'Course deleted successfully'
        })
    } catch (err) {
        return res.status(500).json({
            code: 500,
            message: 'Error deleting course',
            error: err.message
        })
    }
}

module.exports = {
    createCourse,
    enrollInCourse,
    deleteCourse
}