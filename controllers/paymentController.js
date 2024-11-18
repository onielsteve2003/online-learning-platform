const axios = require('axios');
const User = require('../models/User');
const Course = require('../models/Course');
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const initializePayment = async (req, res) => {
    try {
        const { courseId } = req.params;
        const user = req.user; // Assuming user is set in middleware

        if (user.role !== 'student') {
            return res.status(403).json({ code: 403, message: 'Only students can initialize payments' });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ code: 404, message: 'Course not found' });
        }

        const response = await axios.post(
            `${PAYSTACK_BASE_URL}/transaction/initialize`,
            {
                email: user.email,
                amount: Math.round(course.price * 100), // Amount is in kobo
                metadata: { userId: user._id, courseId: course._id },
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const { reference, authorization_url } = response.data.data;

        // Store the transaction reference in user data for future verifications
        await User.findByIdAndUpdate(user._id, {
            $push: {
                purchasedCourses: { course: courseId, paymentStatus: 'pending', reference }
            }
        });

        // Return the authorization URL for the frontend to redirect the user
        res.status(200).json({
            code: 200,
            message: 'Payment initialized',
            data: { reference, authorization_url },
        });
    } catch (error) {
        res.status(500).json({
            code: 500,
            message: 'Error initializing payment',
            error: error.response?.data?.message || error.message,
        });
    }
};

const verifyPayment = async (req, res) => {
    const { reference } = req.body;

    if (!reference) {
        return res.status(400).json({ message: 'Missing transaction reference' });
    }

    try {
        const response = await axios.get(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
        });

        const { status, data } = response.data;

        if (data.status === 'success') {
            const { metadata } = data;
            const { userId, courseId } = metadata;

            const course = await Course.findById(courseId);
            const user = await User.findById(userId);

            if (!course || !user) {
                return res.status(404).json({ message: 'Course or User not found' });
            }

            const userCourse = user.purchasedCourses.find(course => course.course.toString() === courseId && course.reference === reference);
            if (userCourse) {
                userCourse.paymentStatus = 'success';
            } else {
                console.error('User course not found for reference:', reference);
                return res.status(404).json({ message: 'User course not found' });
            }

            // Add user to the course
            const studentIndex = course.students.findIndex(student => student.user.toString() === userId);
            if (studentIndex === -1) {
                course.students.push({ user: userId, status: 'paid' }); // Correct structure
            } else {
                course.students[studentIndex].status = 'paid';
            }

            await user.save();
            await course.save();

            return res.status(200).json({ message: 'Payment verified and records updated' });
        } else if (data.status === 'abandoned') {
            return res.status(400).json({ message: 'Payment was not completed' });
        } else {
            return res.status(400).json({ message: 'Payment verification failed' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error.response ? error.response.data : error.message);
        return res.status(500).json({ message: 'Server error' });
    }
};

// const processRefund = async (req, res) => {
//     try {
//         const { courseId } = req.params;
//         const user = req.user;

//         const course = await Course.findById(courseId);
//         if (!course || !course.allowRefund) {
//             return res.status(403).json({
//                 code: 403,
//                 message: 'Refund not allowed for this course'
//             });
//         }

//         // Check if the user is the instructor
//         if (course.instructor.toString() !== req.user._id.toString()) {
//             return res.status(403).json({ code: 403, message: 'Only an admin can process payments' });
//         }

//         const purchase = user.purchasedCourses.find(p => p.course.toString() === courseId);
//         if (!purchase || purchase.paymentStatus !== 'success') {
//             return res.status(404).json({
//                 code: 404,
//                 message: 'No successful payment found for this course'
//             });
//         }

//         const response = await axios.post(`${PAYSTACK_BASE_URL}/refund`, {
//             transaction: purchase.reference // Assuming reference is stored
//         }, {
//             headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
//         });

//         res.status(200).json({
//             code: 200,
//             message: 'Refund processed successfully',
//             data: response.data.data
//         });
//     } catch (error) {
//         res.status(500).json({
//             code: 500,
//             message: 'Error processing refund',
//             error: error.message
//         });
//     }
// };

module.exports = {
    initializePayment,
    verifyPayment,
    // processRefund
}