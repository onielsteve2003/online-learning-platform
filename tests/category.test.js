const { createCategory } = require('../controllers/category');
const Category = require('../models/Category');

// Mock the Category model
jest.mock('../models/Category');

describe('createCategory Controller', () => {
    let req, res;

    // Set up mock request and response objects before each test
    beforeEach(() => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    it('should return 400 if name is not provided', async () => {
        await createCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            code: 400,
            message: 'Name is required'
        });
    });

    it('should return 400 if category name is not allowed', async () => {
        req.body = { name: 'Unknown Category' }; // Invalid category

        await createCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            code: 400,
            message: "'Unknown Category' is not an allowed category"
        });
    });

    it('should return 400 if category already exists', async () => {
        req.body = { name: 'Web Development' }; // Allowed category
        Category.findOne.mockResolvedValueOnce({ name: 'Web Development' }); // Mock the category exists

        await createCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            code: 400,
            message: 'Category already exists'
        });
    });

    it('should create a new category if a valid name is provided and category does not exist', async () => {
        req.body = { name: 'Web Development' };
        Category.findOne.mockResolvedValueOnce(null);  // No category exists
        Category.create.mockResolvedValueOnce({ name: 'Web Development' });

        await createCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            code: 201,
            message: 'Category created successfully',
            category: { name: 'Web Development' }
        });
    });

    it('should return 500 if there is a server error', async () => {
        req.body = { name: 'Web Development' };
        Category.findOne.mockRejectedValueOnce(new Error('Database Error')); // Simulate a database error

        await createCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            code: 500,
            message: 'Server Error',
            error: 'Database Error'
        });
    });
});
