const express = require('express');
const app = express();
const port = 5000;
const cors = require('cors');
const connectToMongo = require('./db');
const { log, error: logError, warn } = require('./utils/logger.js');

// =========================================================
// Production log suppression
// Prevents Railway 500 logs/sec limit from being hit.
// Silences debug console.log; keeps console.error for real errors.
// =========================================================

// Production logging handled by logger module
if (process.env.NODE_ENV === 'production') {
    // Log suppression managed via logger
}

// =========================================================
// Axios global interceptor
// Logs only method + URL + status — never the full error object.
// =========================================================

const axios = require('axios');

axios.interceptors.response.use(
    (res) => res,
    (err) => {
        const method  = err.config?.method?.toUpperCase() ?? 'REQ';
        const url     = err.config?.url ?? 'unknown';
        const status  = err.response?.status ?? 'NO_RESPONSE';
        const detail  = err.response?.data ?? err.message;
        logError(`[axios] ${method} ${url} → ${status}`, detail);
        return Promise.reject(err);
    }
);

// =========================================================
// App setup
// =========================================================

connectToMongo();
app.use(cors({
    origin: "https://mr-travis.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "auth-token"]
}));
app.options('*', cors());
app.use(express.json());

// Health check endpoint — required for Docker healthcheck
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Available Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/query',     require('./routes/query'));
app.use('/api/customers', require('./routes/customer'));

app.get('/', (req, res) => {
    res.send("Riya ekkada?");
});

app.listen(port, '0.0.0.0', () => {
    log(`TRAVIS backend is listening on port ${port}`);
});