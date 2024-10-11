const mongoose = require('mongoose')

mongoose.set('strictQuery', true)

function db() {
    return mongoose.connect(process.env.MONGO_URI)
}

module.exports = db();