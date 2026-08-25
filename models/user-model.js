const mongoose = require('mongoose');

// Admin/user accounts for the CMS. Passwords are stored as bcrypt hashes only.
const userSchema = new mongoose.Schema({
    username:     { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 40 },
    passwordHash: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
