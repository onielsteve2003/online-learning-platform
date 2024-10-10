const jwt = require('jsonwebtoken');
const User = require('../models/user')

// Protect routes
const protect = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ code: 401, message: 'Token not provided' });
    }

    try {
        // Verify Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user by decoded userId
        const userAcc = await User.findById(decoded.userId);
        if (!userAcc || userAcc.suspended || userAcc.deleted) {
            return res.status(401).json({ code: 401, message: 'Unauthorized user' });
        }

        // Attach user to request object
        req.user = userAcc;
        next();
    } catch (err) {
        console.error("JWT Verification Error:", err);
        return res.status(403).json({ code: 403, message: 'Invalid or expired token' });
    }
};

module.exports = protect;

