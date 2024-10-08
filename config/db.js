const mongoose = require('mongoose')

mongoose.set('strictQuery', true)

function db() {
    return mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
}

module.exports = db();