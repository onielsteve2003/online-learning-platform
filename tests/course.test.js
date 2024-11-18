const mongoose = require('mongoose')
const httpMocks = require('node-mocks-http');
const { 
    createCourse, 
    deleteModuleFromCourse,
    deleteCourse,
    updateCourse,
    getAllCourses,
    getAllModulesInCourse,
    getAllLessonsInCourse,
    getLessonById,
    getModuleById,
    deleteLessonInModule
} = require('../controllers/courseController');
const Course = require('../models/Course');

jest.mock('../models/Course');
jest.mock('../middleware/authMiddleware');

describe('Course Controller - createCourse', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            user: { _id: 'instructorId' },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
    });

    it('should return 409 if course title already exists', async () => {
        req.body.title = 'Existing Course Title';
        Course.findOne.mockResolvedValue({}); // Mock an existing course

        await createCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({ code: 409, message: 'Course title already exists.' });
    });

    it('should create a new course successfully', async () => {
        req.body = {
            title: 'New Course Title',
            description: 'Course Description',
            maxStudents: 50,
            category: 'categoryId',
            duration: '3 weeks',
            modules: [],
            price: 2000,
        };

        Course.findOne.mockResolvedValue(null); // No existing course
        Course.mockImplementation(() => ({
            save: jest.fn().mockResolvedValue(req.body), // Mock save method
        }));

        await createCourse(req, res);

        expect(Course).toHaveBeenCalledWith(expect.objectContaining({
            title: 'New Course Title',
            description: 'Course Description',
            instructor: 'instructorId',
            maxStudents: 50,
            category: 'categoryId',
            duration: '3 weeks',
            modules: [],
            price: 2000,
        }));
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            code: 201,
            message: 'Course created successfully',
            data: req.body,
        });
    });

    it('should handle errors during course creation', async () => {
        req.body = {
            title: 'New Course Title',
            description: 'Course Description',
            category: 'categoryId',
            duration: '3 weeks',
            modules: [],
            price: 2000,
        };

        Course.findOne.mockResolvedValue(null);
        Course.mockImplementation(() => ({
            save: jest.fn().mockRejectedValue(new Error('Database error')),
        }));

        await createCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            code: 500,
            message: 'Error creating course',
            error: 'Database error',
        });
    });
});

describe('Course Controller - deleteModuleFromCourse', () => {
    let req, res, next;

    beforeEach(() => {
        req = httpMocks.createRequest({
            params: {
                courseId: 'courseId',
                moduleId: 'moduleId',
            },
            user: {
                _id: 'instructorId', // Adjust user ID as needed
                role: 'instructor',   // or 'admin' for admin tests
            },
        });
        res = httpMocks.createResponse();
        next = jest.fn();
    });

    it('should return 404 if course does not exist', async () => {
        Course.findById.mockResolvedValue(null); // Mock no course found

        await deleteModuleFromCourse(req, res, next);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({
            code: 404,
            message: 'Course not found',
        });
    });

    it('should return 403 if user is not the instructor or admin', async () => {
        req.user.role = 'student'; // Change role to student

        // Mock a course with the instructor ID not matching
        Course.findById.mockResolvedValue({
            instructor: { toString: () => 'differentInstructorId' },
            modules: [{ _id: 'moduleId' }],
            save: jest.fn(),
        });

        await deleteModuleFromCourse(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(res._getJSONData()).toEqual({
            code: 403,
            message: 'Only the instructor who created the course or an admin can delete modules',
        });
    });

    it('should return 404 if module does not exist', async () => {
        Course.findById.mockResolvedValue({
            instructor: { toString: () => 'instructorId' },
            modules: [],
            save: jest.fn(),
        });

        await deleteModuleFromCourse(req, res, next);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({
            code: 404,
            message: 'Module not found',
        });
    });

    it('should delete a module successfully if the user is the instructor', async () => {
        const mockCourse = {
            instructor: { toString: () => 'instructorId' },
            modules: [{ _id: 'moduleId' }],
            save: jest.fn(),
        };
        
        Course.findById.mockResolvedValue(mockCourse); // Mock finding the course

        await deleteModuleFromCourse(req, res, next);

        expect(mockCourse.modules).toHaveLength(0); // The module should be removed
        expect(mockCourse.save).toHaveBeenCalled(); // Ensure save is called
        expect(res.statusCode).toBe(200);
        expect(res._getJSONData()).toEqual({
            code: 200,
            message: 'Module deleted successfully',
        });
    });

    it('should handle errors during module deletion', async () => {
        const mockCourse = {
            instructor: { toString: () => 'instructorId' },
            modules: [{ _id: 'moduleId' }],
            save: jest.fn().mockRejectedValue(new Error('Database error')),
        };

        Course.findById.mockResolvedValue(mockCourse);

        await deleteModuleFromCourse(req, res, next);

        expect(res.statusCode).toBe(500);
        expect(res._getJSONData()).toEqual({
            code: 500,
            message: 'Error deleting module',
            error: 'Database error',
        });
    });
});

describe('Course Controller - deleteCourse', () => {
    let req, res, next;

    beforeEach(() => {
        req = httpMocks.createRequest({
            params: {
                courseId: 'courseId', // Mock course ID
            },
            user: {
                _id: 'instructorId', // Mock instructor ID
                role: 'instructor',   // Adjust role for testing
            },
        });
        res = httpMocks.createResponse();
        next = jest.fn();
    });

    it('should return 404 if course does not exist', async () => {
        Course.findById.mockResolvedValue(null); // Mock no course found

        await deleteCourse(req, res, next);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({
            code: 404,
            message: 'Course not found',
        });
    });

    it('should return 403 if user is not the instructor or an admin', async () => {
        req.user.role = 'student'; // Change role to student for this test

        // Mock a course with the instructor ID not matching
        Course.findById.mockResolvedValue({
            instructor: { toString: () => 'differentInstructorId' },
        });

        await deleteCourse(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(res._getJSONData()).toEqual({
            code: 403,
            message: 'Unauthorized to delete this course',
        });
    });

    it('should delete a course successfully if the user is the instructor', async () => {
        const mockCourse = {
            instructor: { toString: () => 'instructorId' },
        };

        Course.findById.mockResolvedValue(mockCourse); // Mock finding the course
        Course.findByIdAndDelete.mockResolvedValue(mockCourse); // Mock successful delete

        await deleteCourse(req, res, next);

        expect(Course.findByIdAndDelete).toHaveBeenCalledWith('courseId'); // Ensure delete is called with the correct ID
        expect(res.statusCode).toBe(200);
        expect(res._getJSONData()).toEqual({
            code: 200,
            message: 'Course deleted successfully',
        });
    });

    it('should handle errors during course deletion', async () => {
        const mockCourse = {
            instructor: { toString: () => 'instructorId' },
        };

        Course.findById.mockResolvedValue(mockCourse); // Mock finding the course
        Course.findByIdAndDelete.mockRejectedValue(new Error('Database error')); // Simulate an error during deletion

        await deleteCourse(req, res, next);

        expect(res.statusCode).toBe(500);
        expect(res._getJSONData()).toEqual({
            code: 500,
            message: 'Error deleting course',
            error: 'Database error',
        });
    });
});

describe('Course Controller - updateCourse', () => {
    let req, res, next;

    beforeEach(() => {
        req = httpMocks.createRequest({
            params: {
                courseId: 'courseId', // Mock course ID
            },
            user: {
                _id: 'instructorId', // Mock instructor ID
                role: 'instructor',   // Adjust role for testing
            },
            body: {
                title: 'Updated Course Title',
                description: 'Updated description',
                // Add other fields as needed
            },
        });
        res = httpMocks.createResponse();
        next = jest.fn();
    });

    it('should return 404 if course does not exist', async () => {
        Course.findById.mockResolvedValue(null); // Mock no course found

        await updateCourse(req, res, next);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({
            code: 404,
            message: 'Course not found',
        });
    });

    it('should return 403 if user is not the instructor or an admin', async () => {
        req.user.role = 'student'; // Change role to student for this test

        // Mock a course with the instructor ID not matching
        Course.findById.mockResolvedValue({
            instructor: { toString: () => 'differentInstructorId' },
        });

        await updateCourse(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(res._getJSONData()).toEqual({
            code: 403,
            message: 'Unauthorized to update this course',
        });
    });

    it('should update a course successfully if the user is the instructor', async () => {
        const mockCourse = {
            instructor: { toString: () => 'instructorId' },
            title: 'Original Title',
            description: 'Original description',
            save: jest.fn().mockResolvedValue({ // Return the updated course details
                instructor: { toString: () => 'instructorId' },
                title: 'Updated Course Title',
                description: 'Updated description',
            }),
        };
    
        Course.findById.mockResolvedValue(mockCourse); // Mock finding the course
    
        await updateCourse(req, res, next);
    
        expect(mockCourse.save).toHaveBeenCalled(); // Ensure save is called
        expect(res.statusCode).toBe(200);
        expect(res._getJSONData()).toEqual({
            code: 200,
            message: 'Course updated successfully',
            data: {
                instructor: { toString: expect.any(Function) }, // Match the instructor as a function
                title: 'Updated Course Title',
                description: 'Updated description',
            },
        });
    });    

    it('should handle errors during course update', async () => {
        const mockCourse = {
            instructor: { toString: () => 'instructorId' },
            save: jest.fn().mockRejectedValue(new Error('Database error')), // Simulate an error during save
        };

        Course.findById.mockResolvedValue(mockCourse); // Mock finding the course

        await updateCourse(req, res, next);

        expect(res.statusCode).toBe(500);
        expect(res._getJSONData()).toEqual({
            code: 500,
            message: 'Error updating course',
            error: 'Database error',
        });
    });
});

describe('Course Controller - getAllCourses', () => {
    let req, res, next;

    beforeEach(() => {
        req = httpMocks.createRequest(); // Create a mock request
        res = httpMocks.createResponse(); // Create a mock response
        next = jest.fn(); // Mock next function
    });

    it('should retrieve all courses successfully', async () => {
        // Mock course data
        const mockCourses = [
            {
                _id: 'courseId1',
                title: 'Course 1',
                description: 'Description for Course 1',
                instructor: { name: 'Instructor 1', email: 'instructor1@example.com' },
            },
            {
                _id: 'courseId2',
                title: 'Course 2',
                description: 'Description for Course 2',
                instructor: { name: 'Instructor 2', email: 'instructor2@example.com' },
            },
        ];

        // Mock the behavior of Course.find()
        Course.find.mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockCourses) // Mock populate method
        });

        // Call the function
        await getAllCourses(req, res, next);

        // Assertions
        expect(Course.find).toHaveBeenCalled(); // Ensure find was called
        expect(res.statusCode).toBe(200); // Check the status code
        expect(res._getJSONData()).toEqual({
            code: 200,
            message: 'Courses retrieved successfully',
            data: mockCourses,
        }); // Check the response data
    });

    it('should handle errors during course retrieval', async () => {
        const errorMessage = 'Database error';
        Course.find.mockImplementation(() => {
            throw new Error(errorMessage); // Simulate an error
        });

        await getAllCourses(req, res, next);

        // Assertions
        expect(res.statusCode).toBe(500);
        expect(res._getJSONData()).toEqual({
            code: 500,
            message: 'Error retrieving courses',
            error: errorMessage,
        });
    });
});

describe('Course Controller - getAllModulesInCourse', () => {
    let req, res, next;

    beforeEach(() => {
        req = httpMocks.createRequest({
            params: { courseId: 'courseId' },
            user: { _id: 'userId', role: 'student' }, // You can change role for different tests
        });
        res = httpMocks.createResponse();
        next = jest.fn();
    });

    it('should return 404 if course is not found', async () => {
        Course.findById.mockResolvedValue(null); // Mocking no course found

        await getAllModulesInCourse(req, res, next);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({ code: 404, message: 'Course not found' });
    });

    it('should return 403 if user is not authorized', async () => {
        const mockCourse = {
            _id: 'courseId',
            students: [{ user: { toString: () => 'differentUserId' }, status: 'pending' }],
            modules: [],
        };

        Course.findById.mockResolvedValue(mockCourse); // Mocking course found

        await getAllModulesInCourse(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(res._getJSONData()).toEqual({ code: 403, message: 'Payment required to view modules' });
    });

    it('should return the modules if user is an instructor', async () => {
        req.user.role = 'instructor'; // Change role to instructor
        const mockCourse = {
            _id: 'courseId',
            students: [],
            modules: [{ title: 'Module 1' }, { title: 'Module 2' }],
        };

        Course.findById.mockResolvedValue(mockCourse); // Mocking course found

        await getAllModulesInCourse(req, res, next);

        expect(res.statusCode).toBe(200);
        expect(res._getJSONData()).toEqual({ code: 200, message: 'Modules retrieved', data: mockCourse.modules });
    });

    it('should return the modules if user is a paid student', async () => {
        req.user.role = 'student'; // Set role back to student
        const mockCourse = {
            _id: 'courseId',
            students: [{ user: { toString: () => 'userId' }, status: 'paid' }],
            modules: [{ title: 'Module 1' }, { title: 'Module 2' }],
        };

        Course.findById.mockResolvedValue(mockCourse); // Mocking course found

        await getAllModulesInCourse(req, res, next);

        expect(res.statusCode).toBe(200);
        expect(res._getJSONData()).toEqual({ code: 200, message: 'Modules retrieved', data: mockCourse.modules });
    });

    it('should handle errors during module retrieval', async () => {
        Course.findById.mockRejectedValue(new Error('Database error')); // Simulate error

        await getAllModulesInCourse(req, res, next);

        expect(res.statusCode).toBe(500);
        expect(res._getJSONData()).toEqual({ code: 500, message: 'Error retrieving modules', error: 'Database error' });
    });
});

describe('getAllLessonsInCourse', () => {
    let req, res, next;

    beforeEach(() => {
        req = httpMocks.createRequest({
            params: { courseId: new mongoose.Types.ObjectId().toString() },
            user: { _id: new mongoose.Types.ObjectId().toString(), role: 'student' },
        });
        res = httpMocks.createResponse();
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return 404 if course is not found', async () => {
        // Mock findById to return null
        Course.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(null),
        });

        await getAllLessonsInCourse(req, res, next);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({ code: 404, message: 'Course not found' });
    });

    it('should return 403 if user is not instructor/admin and not a paid student', async () => {
        // Mock a course with a "free" student status
        const courseId = new mongoose.Types.ObjectId().toString();
        const studentId = new mongoose.Types.ObjectId().toString();
        req.params.courseId = courseId;
        req.user = { _id: studentId, role: 'student' };

        const mockCourse = {
            _id: courseId,
            students: [{ user: studentId, status: 'free' }],
            modules: [{ lessons: ['lesson1', 'lesson2'] }],
        };
        Course.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockCourse),
        });

        await getAllLessonsInCourse(req, res);

        expect(res.statusCode).toBe(403);
        expect(res._getJSONData()).toEqual({ code: 403, message: 'Payment required to view modules' });
    });

    it('should return lessons for instructor or paid student', async () => {
        // Mock a course with a "paid" student status
        const courseId = new mongoose.Types.ObjectId().toString();
        const studentId = new mongoose.Types.ObjectId().toString();
        req.params.courseId = courseId;
        req.user = { _id: studentId, role: 'student' };

        const mockCourse = {
            _id: courseId,
            students: [{ user: studentId, status: 'paid' }],
            modules: [{ lessons: ['lesson1', 'lesson2'] }],
        };
        Course.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockCourse),
        });

        await getAllLessonsInCourse(req, res);

        expect(res.statusCode).toBe(200);
        expect(res._getJSONData()).toEqual({
            code: 200,
            message: 'Lessons retrieved',
            data: ['lesson1', 'lesson2'],
        });
    });

    it('should handle errors during course retrieval', async () => {
        const errorMessage = 'Database error';
        Course.findById = jest.fn().mockImplementation(() => ({
            populate: jest.fn().mockRejectedValue(new Error(errorMessage)),
        }));

        await getAllLessonsInCourse(req, res, next);

        expect(res.statusCode).toBe(500);
        expect(res._getJSONData()).toEqual({
            code: 500,
            message: 'Error retrieving lessons',
            error: errorMessage,
        });
    });
});

describe('getLessonById', () => {
    let req, res, next;

    beforeEach(() => {
        req = httpMocks.createRequest({
            params: { courseId: new mongoose.Types.ObjectId().toString(), lessonId: new mongoose.Types.ObjectId().toString() },
            user: { _id: new mongoose.Types.ObjectId().toString(), role: 'student' }, // Default user as a "student"
        });
        res = httpMocks.createResponse();
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return 404 if course is not found', async () => {
        Course.findById.mockReturnValue({
            populate: jest.fn().mockResolvedValue(null),
        });

        await getLessonById(req, res, next);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({ code: 404, message: 'Course not found' });
    });

    it('should return 403 if user is not instructor/admin and not a paid student', async () => {
        const courseId = req.params.courseId;
        const studentId = req.user._id;

        // Mock course with student status as 'free'
        const mockCourse = {
            _id: courseId,
            students: [{ user: studentId, status: 'free' }],
            modules: [{ lessons: [{ _id: req.params.lessonId, title: 'Sample Lesson' }] }],
        };

        Course.findById.mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockCourse),
        });

        await getLessonById(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(res._getJSONData()).toEqual({ code: 403, message: 'Payment required to view lesson' });
    });

    it('should return 404 if lesson is not found in the course', async () => {
        const courseId = req.params.courseId;
        const studentId = req.user._id;

        // Mock course with "paid" student status but no lesson matching `lessonId`
        const mockCourse = {
            _id: courseId,
            students: [{ user: studentId, status: 'paid' }],
            modules: [{ lessons: [{ _id: new mongoose.Types.ObjectId().toString(), title: 'Another Lesson' }] }],
        };

        Course.findById.mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockCourse),
        });

        await getLessonById(req, res, next);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({ code: 404, message: 'Lesson not found' });
    });

    it('should return 200 and the lesson data if the user has access', async () => {
        const courseId = req.params.courseId;
        const studentId = req.user._id;
        const lessonId = req.params.lessonId;

        // Mock course with "paid" student status and matching lesson
        const mockLesson = { _id: lessonId, title: 'Sample Lesson', content: 'Lesson Content' };
        const mockCourse = {
            _id: courseId,
            students: [{ user: studentId, status: 'paid' }],
            modules: [{ lessons: [mockLesson] }],
        };

        Course.findById.mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockCourse),
        });

        await getLessonById(req, res, next);

        expect(res.statusCode).toBe(200);
        expect(res._getJSONData()).toEqual({
            code: 200,
            message: 'Lesson retrieved',
            data: mockLesson,
        });
    });

    it('should handle errors and return 500 if there is an internal server error', async () => {
        const errorMessage = 'Database error';
        
        Course.findById.mockReturnValue({
            populate: jest.fn().mockRejectedValue(new Error(errorMessage)),
        });

        await getLessonById(req, res, next);

        expect(res.statusCode).toBe(500);
        expect(res._getJSONData()).toEqual({
            code: 500,
            message: 'Error retrieving lesson',
            error: errorMessage,
        });
    });
});

describe('getModuleById', () => {
    let req, res, next;

    beforeEach(() => {
        req = httpMocks.createRequest({
            params: { courseId: new mongoose.Types.ObjectId().toString(), moduleId: new mongoose.Types.ObjectId().toString() },
            user: { _id: new mongoose.Types.ObjectId().toString(), role: 'student' }, // Default to student
        });
        res = httpMocks.createResponse();
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return 404 if course is not found', async () => {
        Course.findById.mockReturnValue({
            populate: jest.fn().mockResolvedValue(null),
        });

        await getModuleById(req, res, next);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({ code: 404, message: 'Course not found' });
    });

    it('should return 403 if user is not instructor/admin and not a paid student', async () => {
        const mockCourse = {
            _id: req.params.courseId,
            students: [{ user: req.user._id, status: 'free' }], // User has "free" status
            modules: [{ _id: req.params.moduleId, title: 'Sample Module' }],
        };

        Course.findById.mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockCourse),
        });

        await getModuleById(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(res._getJSONData()).toEqual({ code: 403, message: 'Payment required to view module' });
    });

    it('should return 404 if module is not found in the course', async () => {
        const mockCourse = {
            _id: req.params.courseId,
            students: [{ user: req.user._id, status: 'paid' }], // User has "paid" status
            modules: [{ _id: new mongoose.Types.ObjectId().toString(), title: 'Different Module' }], // Different module ID
        };

        Course.findById.mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockCourse),
        });

        await getModuleById(req, res, next);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({ code: 404, message: 'Module not found' });
    });

    it('should return 200 and the module data if the user has access', async () => {
        const mockModule = { _id: req.params.moduleId, title: 'Sample Module', lessons: [] };
        const mockCourse = {
            _id: req.params.courseId,
            students: [{ user: req.user._id, status: 'paid' }],
            modules: [mockModule],
        };

        Course.findById.mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockCourse),
        });

        await getModuleById(req, res, next);

        expect(res.statusCode).toBe(200);
        expect(res._getJSONData()).toEqual({
            code: 200,
            message: 'Module retrieved successfully',
            data: mockModule,
        });
    });

    it('should handle errors and return 500 if there is an internal server error', async () => {
        const errorMessage = 'Database error';

        Course.findById.mockReturnValue({
            populate: jest.fn().mockRejectedValue(new Error(errorMessage)),
        });

        await getModuleById(req, res, next);

        expect(res.statusCode).toBe(500);
        expect(res._getJSONData()).toEqual({
            code: 500,
            message: 'Error retrieving module',
            error: errorMessage,
        });
    });
});

describe('deleteLessonInModule', () => {
    let req, res, next;

    beforeEach(() => {
        req = httpMocks.createRequest({
            params: {
                courseId: new mongoose.Types.ObjectId().toString(),
                moduleId: new mongoose.Types.ObjectId().toString(),
                lessonId: new mongoose.Types.ObjectId().toString(),
            },
            user: { 
                _id: new mongoose.Types.ObjectId().toString(),
                role: 'instructor',  // Default to instructor for permission checks
            },
        });
        res = httpMocks.createResponse();
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return 404 if course is not found', async () => {
        Course.findById.mockResolvedValue(null); // Simulate course not found

        await deleteLessonInModule(req, res, next);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({
            code: 404,
            message: 'Course not found'
        });
    });

    it('should return 403 if user is neither instructor nor admin', async () => {
        req.user.role = 'student'; // Set user role to student (non-instructor)
        
        // Create a mock course where the instructor is a different user (e.g., instructor1)
        const mockCourse = {
            _id: req.params.courseId,
            instructor: new mongoose.Types.ObjectId().toString(), // Different instructor ID
            modules: [{ _id: req.params.moduleId, lessons: [] }],
        };
    
        // Mock course retrieval - simulate fetching a course with a different instructor
        Course.findById.mockResolvedValue(mockCourse);
        
        await deleteLessonInModule(req, res, next);
    
        // We expect a 403 Forbidden since the student is not allowed to delete the lesson
        expect(res.statusCode).toBe(403); 
        expect(res._getJSONData()).toEqual({
            code: 403,
            message: 'Only the instructor who created the course or an admin can delete a lesson'
        });
    });       

    it('should return 404 if module is not found', async () => {
        const mockCourse = {
            _id: req.params.courseId,
            instructor: req.user._id,
            modules: [], // No modules in the course
        };

        Course.findById.mockResolvedValue(mockCourse); // Mock course retrieval

        await deleteLessonInModule(req, res, next);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({
            code: 404,
            message: 'Module not found'
        });
    });

    it('should return 404 if lesson is not found in the module', async () => {
        const mockCourse = {
            _id: req.params.courseId,
            instructor: req.user._id,
            modules: [{
                _id: req.params.moduleId,
                lessons: [{ _id: new mongoose.Types.ObjectId().toString() }] // Different lesson ID
            }],
        };

        Course.findById.mockResolvedValue(mockCourse); // Mock course retrieval

        await deleteLessonInModule(req, res, next);

        expect(res.statusCode).toBe(404);
        expect(res._getJSONData()).toEqual({
            code: 404,
            message: 'Lesson not found'
        });
    });

    it('should return 200 if lesson is deleted successfully', async () => {
        const lessonId = req.params.lessonId;
        const mockCourse = {
            _id: req.params.courseId,
            instructor: req.user._id,
            modules: [{
                _id: req.params.moduleId,
                lessons: [{ _id: lessonId, title: 'Sample Lesson' }]
            }],
            save: jest.fn().mockResolvedValue(true) // Mock save method to simulate success
        };

        Course.findById.mockResolvedValue(mockCourse); // Mock course retrieval

        await deleteLessonInModule(req, res, next);

        expect(res.statusCode).toBe(200);
        expect(res._getJSONData()).toEqual({
            code: 200,
            message: 'Lesson deleted successfully'
        });
        expect(mockCourse.save).toHaveBeenCalledTimes(1); // Ensure the course was saved after deletion
    });

    it('should handle errors and return 500 if there is an internal server error', async () => {
        const errorMessage = 'Database error';
        Course.findById.mockRejectedValue(new Error(errorMessage)); // Simulate DB error

        await deleteLessonInModule(req, res, next);

        expect(res.statusCode).toBe(500);
        expect(res._getJSONData()).toEqual({
            code: 500,
            message: 'Error deleting lesson',
            error: errorMessage
        });
    });
});
