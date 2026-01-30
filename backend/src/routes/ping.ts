import { Router, Request, Response } from 'express';
import { runPing } from '../services/pingRunner';
import { z } from 'zod';

const router = Router();

const pingSchema = z.object({
    host: z.string().min(1),
    ipVersion: z.enum(['ipv4', 'ipv6']).optional(),
});

router.get('/ping', async (req: Request, res: Response) => {
    try {
        // GET request, data in query
        const host = req.query.host as string;
        const ipVersion = (req.query.ipVersion as 'ipv4' | 'ipv6') || 'ipv4';

        if (!host) {
            return res.status(400).json({ error: 'Host is required' });
        }

        // Validate
        if (!/^[a-zA-Z0-9.-: ]+$/.test(host)) {
            return res.status(400).json({ error: 'Invalid host format' });
        }

        const result = await runPing(host, ipVersion);

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
    } catch (error: any) {
        res.status(500).json({
            error: error.message || 'Internal server error',
            rttAvg: 0,
            packetLoss: 100
        });
    }
});

export default router;
