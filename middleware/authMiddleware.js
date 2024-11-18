const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Course = require('../models/course');

// Middleware to protect routes
const protect = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ code: 401, message: 'Token not provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userAcc = await User.findById(decoded.userId);

        if (!userAcc || userAcc.suspended || userAcc.deleted) {
            return res.status(401).json({ code: 401, message: 'Unauthorized user' });
        }

        req.user = userAcc;
        next();
    } catch (err) {
        console.error("JWT Verification Error:", err);
        return res.status(403).json({ code: 403, message: 'Invalid or expired token' });
    }
};

// Middleware to verify course access
const verifyCourseAccess = async (req, res, next) => {
    const { courseId } = req.params;
    const userId = req.user._id;

    try {
        const course = await Course.findById(courseId).populate('students instructor');
        if (!course) return res.status(404).json({ code: 404, message: 'Course not found' });

        if (course.instructor.toString() === userId.toString() || course.students.some(s => s.user.toString() === userId.toString() && s.status === 'paid')) {
            return next();
        }

        return res.status(403).json({ code: 403, message: 'Access denied. Payment required.' });
    } catch (error) {
        res.status(500).json({ code: 500, message: 'Access verification error', error: error.message });
    }
};

module.exports = {
    protect, 
    verifyCourseAccess
};



