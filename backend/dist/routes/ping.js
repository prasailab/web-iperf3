"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pingRunner_1 = require("../services/pingRunner");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const pingSchema = zod_1.z.object({
    host: zod_1.z.string().min(1),
    ipVersion: zod_1.z.enum(['ipv4', 'ipv6']).optional(),
});
router.get('/ping', async (req, res) => {
    try {
        // GET request, data in query
        const host = req.query.host;
        const ipVersion = req.query.ipVersion || 'ipv4';
        if (!host) {
            return res.status(400).json({ error: 'Host is required' });
        }
        // Validate
        if (!/^[a-zA-Z0-9.-: ]+$/.test(host)) {
            return res.status(400).json({ error: 'Invalid host format' });
        }
        const result = await (0, pingRunner_1.runPing)(host, ipVersion);
        // Always return JSON, even if there was an error
        if (result.error) {
            return res.status(500).json({
                error: result.error,
                host: result.host,
                rttAvg: 0,
                packetLoss: result.packetLoss
            });
        }
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            error: error.message || 'Internal server error',
            rttAvg: 0,
            packetLoss: 100
        });
    }
});
exports.default = router;
