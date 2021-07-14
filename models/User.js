const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
    type: String,
    description: {
        type: String,
        required: true
    },
    duration: Number,                       // Minutes
    date: {
        type: Date,
        default: Date.now
    }
})

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    log: [recordSchema]
});



module.exports = mongoose.model('User', userSchema);