const courseRoute = require('../api/course.routes')
const authRoute = require('../api/auth.routes')

// Middleware setup
module.exports = (app) => {
    app.use('/api/course', courseRoute)
    app.use('/api/auth', authRoute)
}