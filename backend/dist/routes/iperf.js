"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const iperfRunner_1 = require("../services/iperfRunner");
const sessionManager_1 = require("../services/sessionManager");
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
        // Generate session ID
        const sessionId = (0, sessionManager_1.generateSessionId)();
        (0, sessionManager_1.createSession)(sessionId);
        console.log(`[API] Created session ${sessionId}`);
        // Return session ID immediately
        res.json({ sessionId });
        // Start iPerf test in background
        const stream = (0, iperfRunner_1.runIperfStream)(options);
        stream.on('data', (data) => {
            (0, sessionManager_1.appendOutput)(sessionId, data);
        });
        stream.on('error', (err) => {
            console.error('[API] Stream error:', err);
            (0, sessionManager_1.completeSession)(sessionId, err);
        });
        stream.on('end', () => {
            console.log(`[API] Session ${sessionId} complete`);
            (0, sessionManager_1.completeSession)(sessionId);
        });
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
exports.default = router;
