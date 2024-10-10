const mongoose = require('mongoose');
const { Schema } = mongoose;

const categorySchema = new Schema({
    name: {
        type: String,
        required: true,
        enum: [
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
        ],
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Category', categorySchema);
