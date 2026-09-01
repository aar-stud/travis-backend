const { processQuery }    = require("../services/processors/queryProcessor");
const { processCategory } = require("../services/processors/categoryProcessor");
const { translateResponse } = require("../services/processors/translatorProcessor");
const { processRAGQuery } = require("../services/processors/ragProcessor");
const QueryHistory = require("../models/QueryHistory");
const axios = require("axios");
const { log, error: logError } = require("../utils/logger.js");
const redisClient = require("../utils/redis"); // Required for caching

/**
 * Three query modes sent from the frontend:
 *
 *   "account"   — DB mode. Secure account lookups via customerService.
 *   "neural"    — AI mode. Custom seq2seq transformer (qa_routes.py).
 *   "knowledge" — RAG mode. Knowledge base retrieval pipeline.
 *
 * Legacy boolean transformerMode still accepted for backward compatibility:
 *   true  → "neural"
 *   false → "account"
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveMode(raw) {
    if (raw === "account")   return "account";
    if (raw === "knowledge") return "knowledge";
    if (raw === "neural")    return "neural";
    // Legacy boolean
    if (raw === true)        return "neural";
    if (raw === false)       return "account";
    return "neural"; // default
}

// ─── Controller: main query handler ─────────────────────────────────────────

const CACHE_TTL = process.env.CACHE_TTL || 3600;

const handleQuery = async (req, res) => {
    try {
        const { query, mode: rawMode } = req.body;
        const userId = req.user.id;

        if (!query) return res.status(400).json({ error: "Query is required" });

        const mode = resolveMode(rawMode);
        log(`[queryController] mode='${mode}' query='${query}'`);

        const cacheKey = `ai_response:${mode}:${query.trim().toLowerCase()}`;
        
        let response = "";
        let category = "general";
        let ragSources = [];
        let cachedResult = null;

        // 1. Safe Cache Fetch
        try {
            if (redisClient.isReady) {
                cachedResult = await redisClient.get(cacheKey);
            }
        } catch (cacheErr) {
            logError("Redis GET failed", cacheErr.message);
        }

        if (cachedResult) {
            // CACHE HIT
            const parsedCache = JSON.parse(cachedResult);
            response = parsedCache.response;
            category = parsedCache.category;
            ragSources = parsedCache.ragSources || [];
            log(`[queryController] Cache HIT for key='${cacheKey}'`);
        } else {
            // CACHE MISS
            log(`[queryController] Cache MISS for key='${cacheKey}'`);
            
            if (mode === "knowledge") {
                 // ── Knowledge (RAG) mode
                const { category: cat } = await processCategory(query);
                category = cat || "general";
                const ragResult = await processRAGQuery(query);
                response   = ragResult.response;
                ragSources = ragResult.sources || [];
            } else if (mode === "neural") {
                // ── Neural (transformer) mode
                const { category: cat } = await processCategory(query);
                category = cat || "general";
                const result = await processQuery(query);
                response = result.response || "Sorry, I could not generate a response.";
            } else {
                // ── Account (DB) mode — handled by customerService via /secureQuery
                // This branch is for non-sensitive queries in account mode
                const { category: cat } = await processCategory(query);
                category = cat || "general";
                const result = await processQuery(query);
                response = result.response || "Please use a secure query with your account number for account details.";
            }

            // 2. Safe Cache Save
            try {
                if (redisClient.isReady) {
                    const cacheData = JSON.stringify({ response, category, ragSources });
                    await redisClient.setEx(cacheKey, parseInt(CACHE_TTL, 10), cacheData);
                }
            } catch (cacheErr) {
                logError("Redis SET failed", cacheErr.message);
            }
        }

        // Save to history asynchronously (do not await to speed up response)
        const entry = new QueryHistory({ userId, query, category, response });
        entry.save().catch(err => logError("History save failed", err.message));

        return res.json({
            category,
            response,
            mode,
            historyId: entry._id,
            ...(ragSources.length > 0 && { sources: ragSources }),
        });

    } catch (error) {
        logError("Query processing failed", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// ─── Controller: category only ───────────────────────────────────────────────

const handleCategory = async (req, res) => {
    try {
        const { query } = req.body;
        const userId = req.user?.id;

        if (!query)  return res.status(400).json({ error: "Query is required" });
        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (typeof query !== "string" || !query.trim())
            return res.status(400).json({ error: "Query must be a non-empty string" });

        const { category } = await processCategory(query);
        if (!category) return res.status(500).json({ error: "Failed to determine category" });

        res.json({ category });
    } catch (error) {
        logError("Handle category failed", error.message);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
};

// ─── Controller: translate response ──────────────────────────────────────────

const handleTranslate = async (req, res) => {
    try {
        const { response, historyId } = req.body;
        const userId = req.user.id;

        if (!response) return res.status(400).json({ error: "Response is required" });

        // 1. Generate cache key based on the response text
        const cacheKey = `ai_translation:${response.trim().toLowerCase()}`;
        let translation = null;

        // 2. Safe Cache Fetch
        try {
            if (redisClient.isReady) {
                translation = await redisClient.get(cacheKey);
            }
        } catch (cacheErr) {
            logError("Redis GET failed for translation", cacheErr.message);
        }

        if (translation) {
            log(`[queryController] Translation Cache HIT for key='${cacheKey}'`);
        } else {
            log(`[queryController] Translation Cache MISS for key='${cacheKey}'`);
            
            const result = await translateResponse(response);
            translation = result.translation;

            if (!translation || translation === "Sorry, I couldn't translate the response.") {
                return res.status(500).json({ error: "Translation failed" });
            }

            // 3. Safe Cache Save (TTL set to 1 hour / 3600 seconds)
            try {
                if (redisClient.isReady) {
                    await redisClient.setEx(cacheKey, 3600, translation);
                }
            } catch (cacheErr) {
                logError("Redis SET failed for translation", cacheErr.message);
            }
        }

        if (historyId) {
            await QueryHistory.findOneAndUpdate(
                { _id: historyId, userId },
                { translatedResponse: translation }
            );
        }

        res.json({ translation });
    } catch (error) {
        logError("Response translation failed", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// ─── Controller: query history ────────────────────────────────────────────────

const getQueryHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const history = await QueryHistory.find({ userId }).sort({ createdAt: -1 });
        res.json(history);
    } catch (error) {
        logError("Fetching Query history failed", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// ─── Controller: Telugu TTS ───────────────────────────────────────────────────

const AI_BASE_URL = process.env.AI_BASE_URL || "http://127.0.0.1:5001";

const handleTelugu = async (req, res) => {
    try {
        const pyRes = await axios.post(
            `${AI_BASE_URL}/api/tts`,
            { text: req.body.text },
            { responseType: "stream" }
        );
        res.setHeader("Content-Type", "audio/mpeg");
        pyRes.data.pipe(res);
    } catch (err) {
        // Updated to use the correctly destructured logError
        logError("TTS failed", err.message);
        res.status(500).send("Error generating speech");
    }
};

module.exports = {
    handleQuery,
    handleTranslate,
    getQueryHistory,
    handleTelugu,
    handleCategory,
};