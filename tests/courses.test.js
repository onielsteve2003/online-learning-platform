const { createCourse, enrollInCourse, deleteCourse, updateCourse  } = require('../controllers/courseController');
const Course = require('../models/course');
const Category = require('../models/Category');
const cloudinary = require('../config/cloudinary');

// Mock the Course and Category models
jest.mock('../models/course');
jest.mock('../models/Category');
jest.mock('../config/cloudinary', () => ({
    uploader: {
        upload: jest.fn()
    }
}));

describe('createCourse Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            user: {
                _id: 'user_id',  // Mock user ID
                role: 'instructor'
            },
            files: [] // Initialize files as an empty array
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();  // Clear any mocks to avoid interference
    });

    it('should return 403 if user is not an instructor', async () => {
        req.user.role = 'student';  // Mock a student role

        await createCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            code: 403,
            message: 'Only instructors can create courses'
        });
    });

    it('should return 400 if required fields are missing', async () => {
        req.body = { title: 'Course Title' };  // Missing description, category, and duration

        await createCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            code: 400,
            message: 'Title, description, category, and duration are required'
        });
    });

    it('should return 400 if category is invalid', async () => {
        req.body = {
            title: 'Course Title',
            description: 'Course Description',
            category: 'invalid_category_id',
            duration: '4 weeks'
        };

        Category.findById.mockResolvedValueOnce(null);  // Mock category not found

        await createCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            code: 400,
            message: 'Invalid category'
        });
    });

    it('should create a course if all required fields are valid', async () => {
        req.body = {
            title: 'Course Title',
            description: 'Course Description',
            category: 'valid_category_id',
            duration: '4 weeks',
            content: 'Course Content',
            maxStudents: 10
        };

        // Mock valid category
        Category.findById.mockResolvedValueOnce({ _id: 'valid_category_id' });

        // Mock successful file upload
        cloudinary.uploader.upload.mockResolvedValueOnce({ secure_url: 'http://example.com/image.jpg' });

        // Mock successful save
        Course.mockImplementation(() => ({
            save: jest.fn().mockResolvedValueOnce({
                _id: 'course_id',
                title: 'Course Title',
                description: 'Course Description',
                content: 'Course Content',
                instructor: req.user._id,
                maxStudents: 10,
                category: 'valid_category_id',
                duration: '4 weeks',
                multimedia: [{ url: 'http://example.com/image.jpg', type: 'image' }]
            })
        }));

        // Simulate file uploads
        req.files = [
            { path: 'path/to/image.jpg', mimetype: 'image/jpeg' }
        ];

        await createCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            code: 201,
            message: 'Course created successfully',
            data: {
                _id: 'course_id',
                title: 'Course Title',
                description: 'Course Description',
                content: 'Course Content',
                instructor: req.user._id,
                maxStudents: 10,
                category: 'valid_category_id',
                duration: '4 weeks',
                multimedia: [{ url: 'http://example.com/image.jpg', type: 'image' }]
            }
        });
    });

    it('should return 500 if there is a server error', async () => {
        req.body = {
            title: 'Course Title',
            description: 'Course Description',
            category: 'valid_category_id',
            duration: '4 weeks'
        };

        // Simulate a server error
        Category.findById.mockRejectedValueOnce(new Error('Database Error'));

        await createCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            code: 500,
            message: 'Error creating course',
            error: 'Database Error'
        });
    });
});

describe('enrollInCourse Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { courseId: 'course_id' },
            user: {
                _id: 'student_id',  // Mock student ID
                role: 'student'
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();  // Clear any mocks to avoid interference
    });

    it('should return 403 if user is not a student', async () => {
        req.user.role = 'instructor';  // Mock an instructor role

        await enrollInCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            code: 403,
            message: 'Only students can enroll in courses'
        });
    });

    it('should return 404 if course is not found', async () => {
        Course.findById.mockResolvedValueOnce(null);  // Mock course not found

        await enrollInCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            code: 404,
            message: 'Course not found'
        });
    });

    it('should return 400 if course is already full', async () => {
        const mockCourse = {
            _id: 'course_id',
            students: ['student_1', 'student_2'],
            maxStudents: 2,
            save: jest.fn()
        };

        Course.findById.mockResolvedValueOnce(mockCourse);  // Mock the course found

        await enrollInCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            code: 400,
            message: 'Course is already full'
        });
    });

    it('should return 400 if student is already enrolled', async () => {
        const mockCourse = {
            _id: 'course_id',
            students: ['student_id'],  // Mock student already enrolled
            maxStudents: 30,
            save: jest.fn()
        };

        Course.findById.mockResolvedValueOnce(mockCourse);  // Mock the course found

        await enrollInCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            code: 400,
            message: 'You are already enrolled in this course',
        });
    });

    it('should enroll a student in the course successfully', async () => {
        const mockCourse = {
            _id: 'course_id',
            students: [],  // No students enrolled yet
            maxStudents: 10,
            save: jest.fn().mockResolvedValueOnce(true)  // Mock successful save
        };

        Course.findById.mockResolvedValueOnce(mockCourse);  // Mock the course found

        await enrollInCourse(req, res);

        expect(mockCourse.students).toContain('student_id');  // Check if the student was added
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            code: 200,
            message: 'Student enrolled successfully',
            data: mockCourse
        });
    });

    it('should return 500 if there is a server error', async () => {
        const mockCourse = {
            _id: 'course_id',
            students: [],
            maxStudents: 10,
            save: jest.fn().mockRejectedValueOnce(new Error('Database Error'))  // Simulate a save error
        };

        Course.findById.mockResolvedValueOnce(mockCourse);  // Mock the course found

        await enrollInCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            code: 500,
            message: 'Error enrolling in course',
            error: 'Database Error'
        });
    });
});

describe('deleteCourse Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { courseId: 'course_id' },
            user: {
                _id: 'instructor_id',  // Default ID, mock as instructor
                role: 'instructor'  // Default role as instructor
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        Course.findById = jest.fn();
        Course.findByIdAndDelete = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return 404 if course is not found', async () => {
        Course.findById.mockResolvedValueOnce(null);

        await deleteCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            code: 404,
            message: 'Course not found'
        });
    });

    it('should return 403 if the user is not the instructor who created the course', async () => {
        const mockCourse = { _id: 'course_id', instructor: 'other_instructor_id' };
        Course.findById.mockResolvedValueOnce(mockCourse);

        await deleteCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            code: 403,
            message: 'Only the instructor who created the course can delete it'
        });
    });

    it('should delete the course successfully if the user is the instructor who created it', async () => {
        const mockCourse = { _id: 'course_id', instructor: 'instructor_id' };

        Course.findById.mockResolvedValueOnce(mockCourse);
        Course.findByIdAndDelete.mockResolvedValueOnce(mockCourse);

        await deleteCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            code: 200,
            message: 'Course deleted successfully'
        });
    });

    it('should return 500 if there is a server error', async () => {
        const mockCourse = { _id: 'course_id', instructor: 'instructor_id' };
        Course.findById.mockResolvedValueOnce(mockCourse);
        Course.findByIdAndDelete.mockRejectedValueOnce(new Error('Database Error'));

        await deleteCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            code: 500,
            message: 'Error deleting course',
            error: 'Database Error'
        });
    });
});

describe('updateCourse Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { courseId: 'course_id' }, // Mock course ID
            body: {},
            user: {
                _id: 'user_id',  // Mock user ID
                role: 'instructor'
            },
            files: [] // Initialize files as an empty array
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();  // Clear any mocks to avoid interference
    });

    it('should return 404 if course is not found', async () => {
        Course.findById.mockResolvedValueOnce(null); // Mock course not found

        await updateCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            code: 404,
            message: 'Course not found'
        });
    });

    it('should return 403 if user is not the instructor', async () => {
        const course = { instructor: { equals: jest.fn().mockReturnValue(false) } }; // Mock a course with a different instructor
        Course.findById.mockResolvedValueOnce(course);

        await updateCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            code: 403,
            message: 'Only the instructor who created the course can update it'
        });
    });

    it('should update course fields successfully', async () => {
        const course = {
            title: 'Old Title',
            description: 'Old Description',
            content: 'Old Content',
            maxStudents: 5,
            category: 'valid_category_id',
            duration: '3 weeks',
            instructor: { equals: jest.fn().mockReturnValue(true) },
            save: jest.fn().mockResolvedValueOnce({ 
                title: 'New Title', 
                description: 'New Description',
                content: 'New Content',
                maxStudents: 10,
                category: 'valid_category_id',
                duration: '4 weeks'
            })
        };

        Course.findById.mockResolvedValueOnce(course); // Mock existing course

        // Update the request body
        req.body = {
            title: 'New Title',
            description: 'New Description',
            maxStudents: 10,
            duration: '4 weeks',
            content: 'New Content'
        };

        await updateCourse(req, res);

        expect(course.title).toBe('New Title');
        expect(course.description).toBe('New Description');
        expect(course.maxStudents).toBe(10);
        expect(course.duration).toBe('4 weeks');

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            code: 200,
            message: 'Course updated successfully',
            data: { 
                title: 'New Title', 
                description: 'New Description',
                content: 'New Content',
                maxStudents: 10,
                category: 'valid_category_id',
                duration: '4 weeks'
            }
        });
    });

    it('should handle multimedia uploads', async () => {
        const course = {
            instructor: { equals: jest.fn().mockReturnValue(true) },
            multimedia: [],
            save: jest.fn().mockResolvedValueOnce({ multimedia: [{ url: 'http://example.com/image.jpg', type: 'image' }] })
        };

        Course.findById.mockResolvedValueOnce(course); // Mock existing course

        // Simulate file uploads
        req.files = [
            { path: 'path/to/image.jpg', mimetype: 'image/jpeg' }
        ];

        cloudinary.uploader.upload.mockResolvedValueOnce({ secure_url: 'http://example.com/image.jpg' });

        await updateCourse(req, res);

        expect(course.multimedia).toEqual([{ url: 'http://example.com/image.jpg', type: 'image' }]);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            code: 200,
            message: 'Course updated successfully',
            data: expect.objectContaining({
                multimedia: [{ url: 'http://example.com/image.jpg', type: 'image' }]
            })
        });
    });

    it('should return 500 if there is a server error', async () => {
        req.body = {
            title: 'Course Title',
            description: 'Course Description',
            category: 'valid_category_id',
            duration: '4 weeks'
        };
    
        // Simulate a server error for the Category model
        Category.findById.mockRejectedValueOnce(new Error('Database Error'));
    
        await createCourse(req, res);
    
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            code: 500,
            message: 'Error creating course',
            error: 'Database Error'
        });
    });
});
