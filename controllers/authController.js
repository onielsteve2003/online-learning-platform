const User = require('../models/user')
const jwt = require('jsonwebtoken')

// Register a new User
const registerUser = async(req, res) => {
    const { name, email, password, role } = req.body

    try {
        // Check if the user is already registered
        let user = await User.findOne({ email })
        if(user) {
            return res.status(400).json({
                code: 400,
                message: 'User already exists'
            })
        }

        // Create a new user
        user = new User({
            name,
            email,
            password,
            role
        })
        await user.save()

        res.status(200).json({
            code: 200,
            message: 'User registered successfully'
        })
    } catch (err) {
        return res.status(500).json({
            code: 500,
            message: 'Server Error',
            error: err.message
        })
    }
}

// Login a User
const loginUser = async(req, res) => {
    const { email, password } = req.body
    try {
        // Check if the user exists
        const user = await User.findOne({ email })
        if(!user) {
            return res.status(404).json({
                code: 404,
                message: 'Invalid email or password'
            })
        }

        // Check if password is correct
        const isMatch = await user.comparePassword(password)
        if(!isMatch) {
            return res.status(401).json({
                code: 401,
                message: 'Invalid email or password'
            })
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id, role: user.role}, process.env.JWT_SECRET, {
            expiresIn: '1h',
        })

        res.status(200).json({
            code: 200,
            message: 'User logged in successfully',
            data: {
                token
            },
            userId: user._id
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
    registerUser,
    loginUser
}