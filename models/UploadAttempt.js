const mongoose = require('mongoose');

const uploadAttemptSchema = new mongoose.Schema({
    ipAddress: String,
    userName: String, // Add user name field
    fileName: String, // Add file name field
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UploadAttempt', uploadAttemptSchema);
