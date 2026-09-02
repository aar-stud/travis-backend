const { processQuery } = require("./processors/queryProcessor");
const { processCategory } = require("./processors/categoryProcessor");
const { translateResponse: processTranslation } = require("./processors/translatorProcessor");
const { processRAGQuery } = require("./processors/ragProcessor");
const QueryHistory = require("../models/QueryHistory");
const cacheService = require("./cacheService");
const { log, error: logError } = require("../utils/logger.js");

// 1. Import Node's native crypto module
const crypto = require("crypto"); 

const CACHE_TTL = process.env.CACHE_TTL || 3600;

function resolveMode(raw) {
    if (raw === "account" || raw === false) return "account";
    if (raw === "knowledge") return "knowledge";
    return "neural"; 
}

const handleUserQuery = async (userId, query, rawMode) => {
    const mode = resolveMode(rawMode);
    
    // Note: If responses contain personal data, change this to include userId:
    // const cacheKey = `ai_response:${userId}:${mode}:${query.trim().toLowerCase()}`;
    const cacheKey = `ai_response:${mode}:${query.trim().toLowerCase()}`;
    
    let response = "";
    let category = "general";
    let ragSources = [];

    const cachedResult = await cacheService.get(cacheKey);

    if (cachedResult) {
        const parsedCache = typeof cachedResult === "string" ? JSON.parse(cachedResult) : cachedResult;
        response = parsedCache.response;
        category = parsedCache.category;
        ragSources = parsedCache.ragSources || [];
    } else {
        const { category: cat } = await processCategory(query);
        category = cat || "general";

        if (mode === "knowledge") {
            const ragResult = await processRAGQuery(query);
            response = ragResult.response;
            ragSources = ragResult.sources || [];
        } else if (mode === "neural") {
            const result = await processQuery(query);
            response = result.response || "Sorry, I could not generate a response.";
        } else {
            const result = await processQuery(query);
            response = result.response || "Please use a secure query with your account number for account details.";
        }

        const cacheData = { response, category, ragSources };
        await cacheService.set(cacheKey, cacheData, CACHE_TTL);
    }

    const entry = new QueryHistory({ userId, query, category, response });
    entry.save()
         // 2. Strip Mongoose metadata before caching to save Redis memory
         .then(savedEntry => cacheService.addRecentHistory(userId, savedEntry.toObject()))
         .catch(err => logError("History save failed", err.message));

    return { category, response, mode, historyId: entry._id, ragSources };
};

const handleUserTranslation = async (userId, response, historyId) => {
    // 3. Generate a fast MD5 hash of the response text
    const responseHash = crypto
        .createHash("md5")
        .update(response.trim().toLowerCase())
        .digest("hex");
        
    // 4. Use the hash as the cache key instead of the raw text
    const cacheKey = `ai_translation:${responseHash}`;
    
    let translation = await cacheService.get(cacheKey);

    if (!translation) {
        const result = await processTranslation(response);
        translation = result.translation;

        if (!translation || translation === "Sorry, I couldn't translate the response.") {
            throw new Error("Translation failed");
        }
        await cacheService.set(cacheKey, translation, CACHE_TTL);
    }

    if (historyId) {
        await QueryHistory.findOneAndUpdate({ _id: historyId, userId }, { translatedResponse: translation });
    }

    return translation;
};

const fetchHistory = async (userId, limit) => {
    if (limit === 3) {
        const cachedHistory = await cacheService.getRecentHistory(userId);
        if (cachedHistory) return cachedHistory;
    }

    let query = QueryHistory.find({ userId }).sort({ createdAt: -1 });
    if (limit > 0) query = query.limit(limit);
    
    return await query;
};

module.exports = {
    handleUserQuery,
    handleUserTranslation,
    fetchHistory,
    processCategory
};