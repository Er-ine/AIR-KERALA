const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('CRITICAL ERROR: MONGODB_URI environment variable is not defined.');
  process.exit(1);
}

console.log('Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
  .then((conn) => {
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  })
  .catch((err) => {
    console.error(`MongoDB Connection Failed: ${err.message}`);
    process.exit(1);
  });

module.exports = mongoose;
