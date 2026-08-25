require('dotenv').config();
const mongoose = require('mongoose');

async function connectDB() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is missing — copy .env.example to .env and fill it in.');
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log(`[db] connected to "${mongoose.connection.name}"`);
}

module.exports = { connectDB, mongoose };
