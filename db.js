const mongoose = require('mongoose');

// Connects to MongoDB using MONGODB_URI from the environment.
// The URI is never logged or hardcoded.
async function connectDB() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error('MONGODB_URI is not set. Add it to your .env file.');
    }

    await mongoose.connect(uri);
    console.log('MongoDB connected');
}

module.exports = connectDB;