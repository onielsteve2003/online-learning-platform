const Category = require('../models/Category');

const allowedCategories = [
    'Web Development',
    'Data Science',
    'Mobile Development',
    'Cloud Computing',
    'Artificial Intelligence',
    'Cybersecurity',
    'Business and Entrepreneurship',
    'Graphic Design',
    'Digital Marketing',
    'Software Engineering'
];

// Create a category
const createCategory = async (req, res) => {
    try {
        const { name } = req.body;

        // Validate category name
        if (!name) {
            return res.status(400).json({
                code: 400,
                message: 'Name is required'
            });
        }

        // Check if name is part of allowed categories
        if (!allowedCategories.includes(name)) {
            return res.status(400).json({
                code: 400,
                message: `'${name}' is not an allowed category`
            });
        }

        // Check if the category already exists
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({
                code: 400,
                message: 'Category already exists'
            });
        }

        // Create a new category
        const category = await Category.create({ name });

        return res.status(201).json({
            code: 201,
            message: 'Category created successfully',
            category: {
                name: category.name
            }
        });
    } catch (err) {
        console.error('Error in createCategory controller:', err);
        return res.status(500).json({
            code: 500,
            message: 'Server Error',
            error: err.message
        });
    }
};

module.exports = {
    createCategory
};
