const mongoose = require('mongoose');
const { Schema } = mongoose;

// Quiz Schema
const quizSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    questions: [{
        question: String,
        options: [String],
        correctAnswer: String
    }],
    duration: {
        type: Number, // Duration in minutes
        required: true
    }
});

// Lesson Schema with support for nested sub-lessons
const lessonSchema = new Schema({
    title: {
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
    subLessons: [this],
    quizzes: [quizSchema]
});

// Module Schema
const moduleSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    lessons: [lessonSchema],
    quizzes: [quizSchema]
});

// Course Schema
const courseSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    students: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        status: { type: String, enum: ['paid', 'pending'], default: 'pending' }
    }],
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
    modules: [moduleSchema],
    price: {
        type: Number,
        required: true,
        min: 0
    },
    // allowRefund: {
    //     type: Boolean,
    //     default: false
    // },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.models.Course || mongoose.model('Course', courseSchema);
