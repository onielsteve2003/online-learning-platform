const courseRoute = require('../api/course.routes')
const authRoute = require('../api/auth.routes')
const categoryRoute = require('./category.routes.js')
const paymentRoute = require('./payment.routes.js')

// Middleware setup
module.exports = (app) => {
    app.use('/api/courses', courseRoute)
    app.use('/api/auth', authRoute)
    app.use('/api/category', categoryRoute)
    app.use('/api/payment', paymentRoute)
}