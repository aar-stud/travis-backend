const axios = require("axios");
const { error: logError } = require("../../utils/logger.js");
const AI_BASE_URL = process.env.AI_BASE_URL || "http://127.0.0.1:5001";
const RAG_API_URL = `${AI_BASE_URL}/api/rag`;

/**
 * Call the Python RAG pipeline.
 * Returns { response, sources, chunks_used }
 */
async function processRAGQuery(query) {
    try {
        const pythonResponse = await axios.post(RAG_API_URL, { query });
        const { response, sources, chunks_used } = pythonResponse.data;
        return { response, sources, chunks_used };
    } catch (error) {
        if (error.code === "ECONNREFUSED") {
            logError("RAG service unreachable", `Could not connect to RAG API at ${RAG_API_URL}`);
            return {
                response: "The knowledge base service is currently unavailable. Please try again later or contact customer support.",
                sources: [],
                chunks_used: 0,
            };
        }
        const detail = error.response?.data?.detail || error.message;
        logError("RAG API error", detail);
        return {
            response: "Sorry, I could not retrieve an answer from the knowledge base right now.",
            sources: [],
            chunks_used: 0,
        };
    }
}

module.exports = { processRAGQuery };