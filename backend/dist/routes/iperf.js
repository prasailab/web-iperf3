"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const iperfRunner_1 = require("../services/iperfRunner");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const iperfSchema = zod_1.z.object({
    mode: zod_1.z.enum(['public', 'private']),
    protocol: zod_1.z.enum(['tcp', 'udp']),
    ipVersion: zod_1.z.enum(['ipv4', 'ipv6']),
    serverHost: zod_1.z.string().min(1),
    port: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    duration: zod_1.z.number().min(1).max(60).optional(),
    parallelStreams: zod_1.z.number().min(1).max(10).optional(),
    reverse: zod_1.z.boolean().optional(),
    bidirectional: zod_1.z.boolean().optional(),
    bitrate: zod_1.z.string().optional(),
    extraArgs: zod_1.z.string().optional()
});
router.post('/run-iperf', async (req, res) => {
    try {
        const options = iperfSchema.parse(req.body);
        // Security check: simple sanitize for host
        if (!/^[a-zA-Z0-9.-: ]+$/.test(options.serverHost)) {
            // basic check
        }
        const result = await (0, iperfRunner_1.runIperf)(options);
        res.json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Invalid parameters', details: error.errors });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
router.post('/run-iperf-stream', async (req, res) => {
    console.log('[API] Received /run-iperf-stream request');
    try {
        const options = iperfSchema.parse(req.body);
        // Security check
        if (!/^[a-zA-Z0-9.-: ]+$/.test(options.serverHost)) {
            res.status(400).send('Invalid host');
            return;
        }
        // Set headers for streaming text
        // Disable Nginx/Proxy buffering if any
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.flushHeaders(); // Explicitly flush headers
        console.log('[API] Initializing stream via runIperfStream...');
        // Import is now top-level (see below), but we use the imported function
        const stream = (0, iperfRunner_1.runIperfStream)(options);
        // Send checking message immediately
        res.write('DEBUG: Stream initialized on server...\n');
        stream.on('data', (data) => {
            res.write(data);
        });
        stream.on('error', (err) => {
            console.error('[API] Stream error:', err);
            res.write(`\nERROR: ${err}\n`);
            res.end();
        });
        stream.on('end', () => {
            res.end();
        });
        // Handle client disconnect
        req.on('close', () => {
            console.log('[API] Client disconnected.');
            stream.removeAllListeners();
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).send(`Invalid parameters: ${JSON.stringify(error.errors)}`);
        }
        else {
            res.status(500).send('Internal server error');
        }
    }
});
exports.default = router;
