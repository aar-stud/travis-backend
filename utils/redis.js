const redis = require("redis");
const { log, error: logError } = require("./logger");

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 2000) // Backoff strategy
    }
});

redisClient.on("error", (err) => logError("Redis Client Error", err.message));
redisClient.on("connect", () => log("[Redis] Connected"));
redisClient.on("ready", () => log("[Redis] Ready to accept commands"));
redisClient.on("end", () => log("[Redis] Connection closed"));

// Non-blocking connection attempt
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        logError("Redis Initial Connection Failed", err.message);
    }
})();

module.exports = redisClient;