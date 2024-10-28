const mongoose = require('mongoose');
const { Schema } = mongoose

const courseSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    content: {
        type: String,
        default: ''
    },
    multimedia: [{
        url: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['image', 'video', 'pdf'],
            required: true
        }
    }],
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    students: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    maxStudents: {
        type: Number,
        default: 100
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    duration: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('Course', courseSchema);