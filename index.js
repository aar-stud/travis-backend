const express = require('express');
const app = express();
const port = 5000;
const cors = require('cors');
const path = require('path');

// Docker injects env vars via env_file in docker-compose.yml.
// dotenv is only used for local dev (node index.js outside Docker).
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
}

const connectToMongo = require('./db');
const { log, error: logError, warn } = require('./utils/logger.js');

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

connectToMongo();

const allowedOrigins = [
    "https://mr-travis.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    process.env.NGROK_URL,          // set in root .env
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "auth-token", "ngrok-skip-browser-warning"],
    credentials: true,
}));

app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/query',     require('./routes/query'));
app.use('/api/customers', require('./routes/customer'));

app.get('/', (req, res) => {
    res.send("Riya ekkada?");
});

app.listen(port, '0.0.0.0', () => {
    log(`TRAVIS backend is listening on port ${port}`);
});