require('dotenv').config();
const db = require('./config/db')
const express = require('express')
const http = require('http')
const app = express()
const morgan = require('morgan')
const passport = require('passport')
require('./config/passport')

app.use(express.json())
app.use(express.urlencoded({ extended: false}))
app.use(morgan("dev"))

// Initialize Passport
app.use(passport.initialize())

// Route
require('./routes/api/index.routes')(app)

const server = http.Server(app)
const port = process.env.PORT || 5000

db.then((response) => {
    console.log(`Database connected: ${response}`)
    server.listen(port, () => {
        console.log(`Server running on port ${port}`)
    })
}).catch((err) => console.log(`Database ${err}`))