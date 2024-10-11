require('dotenv').config();
const db = require('./config/db')
const express = require('express')
const http = require('http')
const app = express()
const morgan = require('morgan')
const session = require('express-session')
const passport = require('./config/passport')
require('./config/passport')

app.use(express.json())
app.use(express.urlencoded({ extended: false}))
app.use(morgan("dev"))
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Use HTTPS for production environment, set to true for development environment.  // Remember to set secure: true in production environment.  // Use secure: false for development environment.  // Secure cookies should only be used in production environment.  // If not set, Express will automatically set secure to false.  // If secure is set to true, HTTPS must be enabled.  // If secure is set to false, HTTP will be used.  // If secure is set to true, Express will automatically redirect to HTTPS if the connection is not secure.  // If secure is set to false, Express will not automatically redirect to HTTPS.  // If secure is set to true, Express will automatically redirect to HTTPS if the connection is not secure.  // If secure is set to false, Express will not automatically redirect to HTTPS.
}))

// Initialize Passport
app.use(passport.initialize())
app.use(passport.session())

// Route
require('./routes/api/index.routes')(app)

// Export the app for testing
module.exports = app;

const server = http.Server(app)
const port = process.env.PORT || 3000

db.then((response) => {
    console.log(`Database connected: ${response}`)
    server.listen(port, () => {
        console.log(`Server running on port ${port}`)
    })
}).catch((err) => console.log(`Database ${err}`))