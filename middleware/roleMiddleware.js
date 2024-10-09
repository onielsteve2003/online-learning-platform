// Middleware to restrict routes based on user roles
const checkRole = (requiredRole) => {
    return (req, res, next) => {
        // Assuming user is already authenticated and req.user is set
        const user = req.user 

        if(!user) {
            return res.status(401).json({ message: 'Unauthorized' })
        }

        if(user.role !== requiredRole) {
            return res.status(403).json({ message: 'Access denied: No Permission' })
        }

        next()
    }
}

module.exports = checkRole