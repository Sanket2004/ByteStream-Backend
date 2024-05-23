const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    path: { type: String, required: true },
    originalName: { type: String, required: true },
    password: { type: String },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String }, // Assuming you have a User model
    downloads: { type: Number, default: 0 },
});

module.exports = mongoose.model('File', fileSchema);