const mongoose = require('mongoose');

const connectToMongo = async () => {
    try {
        const mongoURL = process.env.MONGO_URI;

        if (!mongoURL) {
            throw new Error("MONGO_URI environment variable is missing.");
        }

        await mongoose.connect(mongoURL);

        console.log("Connected to MongoDB successfully.");
    } catch (error) {
        console.error("MongoDB Connection Error:");
        console.error(error);

        process.exit(1);
    }
};

module.exports = connectToMongo;