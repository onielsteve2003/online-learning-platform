// Middleware to restrict routes based on user roles
const checkRole = (...requiredRoles) => {
    return (req, res, next) => {
        const user = req.user;
        
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!requiredRoles.includes(user.role)) {
            return res.status(403).json({ message: 'Access denied: No Permission' });
        }

        next();
    };
};

module.exports = checkRole