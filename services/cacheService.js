const redisClient = require("../utils/redis");
const { log, error: logError } = require("../utils/logger.js");

const cacheService = {
    // ─── GENERIC GET / SET / DELETE ───
    async get(key) {
        try {
            if (!redisClient.isReady) return null;
            const value = await redisClient.get(key);
            if (value) log(`[Cache] HIT: ${key}`);
            else log(`[Cache] MISS: ${key}`);
            return value;
        } catch (err) {
            logError(`[Cache] GET failed: ${key}`, err.message);
            return null;
        }
    },

    async set(key, value, ttl = 3600) {
        try {
            if (!redisClient.isReady) return false;
            const serialized = typeof value === "string" ? value : JSON.stringify(value);
            await redisClient.setEx(key, parseInt(ttl, 10), serialized);
            log(`[Cache] SET: ${key} TTL=${ttl}s`);
            return true;
        } catch (err) {
            logError(`[Cache] SET failed: ${key}`, err.message);
            return false;
        }
    },

    async del(key) {
        try {
            if (!redisClient.isReady) return false;
            await redisClient.del(key);
            log(`[Cache] DELETE: ${key}`);
            return true;
        } catch (err) {
            logError(`[Cache] DELETE failed: ${key}`, err.message);
            return false;
        }
    },

    isReady() {
        return redisClient.isReady;
    },

    // ─── DOMAIN-SPECIFIC: QUERY HISTORY ───
    async getRecentHistory(userId) {
        if (!redisClient.isReady) return null;
        try {
            const results = await redisClient.lRange(`history:${userId}`, 0, 2);
            return results.length ? results.map(item => JSON.parse(item)) : null;
        } catch (err) {
            logError("Redis LRANGE failed", err.message);
            return null;
        }
    },

    async addRecentHistory(userId, entry) {
        if (!redisClient.isReady) return;
        try {
            const key = `history:${userId}`;
            await redisClient.lPush(key, JSON.stringify(entry));
            await redisClient.lTrim(key, 0, 2); // O(1) space enforcement
        } catch (err) {
            logError("Redis History Update failed", err.message);
        }
    }
};

module.exports = cacheService;