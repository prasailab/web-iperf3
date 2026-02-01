import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import publicServersRouter from './routes/publicServers';
import iperfRouter from './routes/iperf';
import pingRouter from './routes/ping';
import { calculateBDP } from './services/bdpCalculator';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for now to allow inline scripts/styles if needed or Vite dev
}));
app.use(cors());
app.use(bodyParser.json());

// Request Logging Middleware
app.use((req, res, next) => {
    console.log(`[SERVER] Received ${req.method} request for ${req.url}`);
    next();
});

// API Routes
app.use('/api', publicServersRouter);
app.use('/api', iperfRouter);
app.use('/api', pingRouter);

// BDP Calculation Endpoint
app.post('/api/calculate-bdp', (req, res) => {
    const { bandwidthMbps, rttMs } = req.body;
    if (typeof bandwidthMbps !== 'number' || typeof rttMs !== 'number') {
        return res.status(400).json({ error: 'Invalid parameters. bandwidthMbps and rttMs must be numbers.' });
    }
    const result = calculateBDP(bandwidthMbps, rttMs);
    res.json(result);
});

// Serve Frontend (Production)
// In development, we use Vite dev server. In production (Docker), we serve static files.
if (process.env.NODE_ENV === 'production' || process.argv.includes('--production')) {
    const frontendPath = path.join(__dirname, '../../frontend/dist');
    app.use(express.static(frontendPath));
    app.get(/(.*)/, (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
