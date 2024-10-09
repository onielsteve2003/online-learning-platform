const jwt = require('jsonwebtoken')

// Protect routes
const protect = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1]

    if(!token) {
        return res.status(401).json({ code: 401, message: 'Token not provided' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        next()
    } catch (error) {
        res.status(500).json({ code: 500, message: 'Not authorized, Invalid token' })
    }
}

module.exports = protect