"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const body_parser_1 = __importDefault(require("body-parser"));
const publicServers_1 = __importDefault(require("./routes/publicServers"));
const iperf_1 = __importDefault(require("./routes/iperf"));
const ping_1 = __importDefault(require("./routes/ping"));
const bdpCalculator_1 = require("./services/bdpCalculator");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Disable CSP for now to allow inline scripts/styles if needed or Vite dev
}));
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
// Request Logging Middleware
app.use((req, res, next) => {
    console.log(`[SERVER] Received ${req.method} request for ${req.url}`);
    next();
});
// API Routes
app.use('/api', publicServers_1.default);
app.use('/api', iperf_1.default);
app.use('/api', ping_1.default);
// BDP Calculation Endpoint
app.post('/api/calculate-bdp', (req, res) => {
    const { bandwidthMbps, rttMs } = req.body;
    if (typeof bandwidthMbps !== 'number' || typeof rttMs !== 'number') {
        return res.status(400).json({ error: 'Invalid parameters. bandwidthMbps and rttMs must be numbers.' });
    }
    const result = (0, bdpCalculator_1.calculateBDP)(bandwidthMbps, rttMs);
    res.json(result);
});
// Serve Frontend (Production)
// In development, we use Vite dev server. In production (Docker), we serve static files.
if (process.env.NODE_ENV === 'production' || process.argv.includes('--production')) {
    const frontendPath = path_1.default.join(__dirname, '../../frontend/dist');
    app.use(express_1.default.static(frontendPath));
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(frontendPath, 'index.html'));
    });
}
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
