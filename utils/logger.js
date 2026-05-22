// utils/logger.js
const isProd = process.env.NODE_ENV === "production";

const log = (...args) => !isProd && console.log(...args);
const error = (msg, data) => console.error(`[ERROR] ${msg}`, data ?? "");
const warn = (msg) => console.warn(`[WARN] ${msg}`);

module.exports = { log, error, warn };