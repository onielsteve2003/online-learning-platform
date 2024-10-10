const Category = require('../models/Category')

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
const createCategory = async(req, res) => {
    try {
        const { name } = req.body

        if(!name) {
            return res.status(400).json({
                code: 400,
                message: 'Name is required'
            })
        }

        // Check if the name matches the allowed categories
        if(!allowedCategories.includes(name)) {
            return res.status(400).json({
                code: 400,
                message: 'Invalid category name'
            })
        }

        // Check if the category exists
        let existingCategory = await Category.findOne({ name })
        if(existingCategory) {
            return res.status(400).json({
                code: 400,
                message: 'Category already exists'
            })
        }

        // Create a new category
        const category = new Category({
            name
        })

        await category.save()

        res.status(201).json({
            code: 201,
            message: 'Category created successfully',
            category
        })
    } catch (err) {
        return res.status(500).json({
            code: 500,
            message: 'Server Error',
            error: err.message
        })
    }
}

module.exports = {
    createCategory
};