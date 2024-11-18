const axios = require('axios');
const { initializePayment, verifyPayment } = require('../controllers/paymentController');
const User = require('../models/User');
const Course = require('../models/Course');

jest.mock('axios');
jest.mock('../models/User');
jest.mock('../models/Course');

describe('Payment Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {},
            user: {},
            body: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
    });

    describe('initializePayment', () => {
        it('should return 403 if user is not a student', async () => {
            req.user.role = 'instructor';
            req.params.courseId = 'courseId';

            await initializePayment(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ code: 403, message: 'Only students can initialize payments' });
        });

        it('should return 404 if course is not found', async () => {
            req.user.role = 'student';
            req.params.courseId = 'courseId';
            User.findByIdAndUpdate.mockResolvedValue();
            Course.findById.mockResolvedValue(null);

            await initializePayment(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ code: 404, message: 'Course not found' });
        });

        it('should initialize payment successfully', async () => {
            req.user.role = 'student';
            req.user.email = 'test@example.com';
            req.params.courseId = 'courseId';
            req.user._id = 'userId';

            const mockCourse = { price: 10000, _id: 'courseId' };
            Course.findById.mockResolvedValue(mockCourse);
            axios.post.mockResolvedValue({ data: { data: { reference: 'tx123', authorization_url: 'http://paystack.com/redirect' } } });
            User.findByIdAndUpdate.mockResolvedValue();

            await initializePayment(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                code: 200,
                message: 'Payment initialized',
                data: { reference: 'tx123', authorization_url: 'http://paystack.com/redirect' },
            });
        });

        it('should handle error during payment initialization', async () => {
            req.user.role = 'student';
            req.params.courseId = 'courseId';
            Course.findById.mockResolvedValue({ price: 10000 });
            axios.post.mockRejectedValue(new Error('Some error'));

            await initializePayment(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                code: 500,
                message: 'Error initializing payment',
                error: 'Some error',
            });
        });
    });

    describe('verifyPayment', () => {
        it('should return 400 if reference is missing', async () => {
            await verifyPayment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Missing transaction reference' });
        });

        it('should return 404 if course or user is not found', async () => {
            req.body.reference = 'tx123';
            axios.get.mockResolvedValue({ data: { data: { status: 'success', metadata: { userId: 'userId', courseId: 'courseId' } } } });
            Course.findById.mockResolvedValue(null);

            await verifyPayment(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Course or User not found' });
        });

        it('should verify payment successfully', async () => {
            req.body.reference = 'tx123';
            axios.get.mockResolvedValue({
                data: {
                    data: {
                        status: 'success',
                        metadata: { userId: 'userId', courseId: 'courseId' }
                    }
                }
            });

            const mockUser = {
                _id: 'userId',
                purchasedCourses: [{ course: 'courseId', paymentStatus: 'pending', reference: 'tx123' }],
                save: jest.fn(),
            };
            User.findById.mockResolvedValue(mockUser);

            const mockCourse = {
                _id: 'courseId',
                students: [],
                save: jest.fn(),
            };
            Course.findById.mockResolvedValue(mockCourse);

            await verifyPayment(req, res);

            expect(mockUser.save).toHaveBeenCalled();
            expect(mockCourse.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Payment verified and records updated' });
        });

        it('should handle errors during payment verification', async () => {
            req.body.reference = 'tx123';
            axios.get.mockResolvedValue({ data: { data: { status: 'failed' } } });

            await verifyPayment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Payment verification failed' });
        });
    });
});
