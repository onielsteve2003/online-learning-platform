const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: function(){
            return !this.googleId && !this.facebookId
        }
    },
    role: {
        type: String,
        enum: ['student', 'instructor', 'admin'],
        default: 'student'
    },
    googleId: {
        type: String,
        default: null
    },
    facebookId: {
        type: String,
        default: null
    }
}, {timestamps: true})

// Password hashing middleware
userSchema.pre('save', async function (next) {
    if(!this.isModified('password')) return next()

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next()
})

// Check if the password is valid
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
}

module.exports = mongoose.model('User', userSchema);