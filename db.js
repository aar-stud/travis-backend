const { log, error } = require('./utils/logger.js');
const mongoose = require('mongoose');

const connectToMongo = async () => {
    try {
        const mongoURL = process.env.MONGO_URI;

        if (!mongoURL) {
            throw new Error("MONGO_URI environment variable is missing.");
        }

        await mongoose.connect(mongoURL);

        log("Connected to MongoDB successfully.");
    } catch (err) {
        error("MongoDB Connection Error", err.message);
        process.exit(1);
    }
};

module.exports = connectToMongo;