const queryService = require("../services/queryService");
const axios = require("axios");
const { error: logError } = require("../utils/logger.js");

const handleQuery = async (req, res) => {
    try {
        const { query, mode } = req.body;
        if (!query) return res.status(400).json({ error: "Query is required" });

        const result = await queryService.handleUserQuery(req.user.id, query, mode);

        return res.json({
            category: result.category,
            response: result.response,
            mode: result.mode,
            historyId: result.historyId,
            ...(result.ragSources.length > 0 && { sources: result.ragSources }),
        });
    } catch (error) {
        logError("Query processing failed", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const handleCategory = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query || typeof query !== "string" || !query.trim()) 
            return res.status(400).json({ error: "Query must be a non-empty string" });

        const { category } = await queryService.processCategory(query);
        if (!category) return res.status(500).json({ error: "Failed to determine category" });

        res.json({ category });
    } catch (error) {
        logError("Handle category failed", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const handleTranslate = async (req, res) => {
    try {
        const { response, historyId } = req.body;
        if (!response) return res.status(400).json({ error: "Response is required" });

        const translation = await queryService.handleUserTranslation(req.user.id, response, historyId);
        res.json({ translation });
    } catch (error) {
        logError("Response translation failed", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const getQueryHistory = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 0;
        const history = await queryService.fetchHistory(req.user.id, limit);
        res.json(history);
    } catch (error) {
        logError("Fetching Query history failed", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

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