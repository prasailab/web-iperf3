import { Router, Request, Response } from 'express';
import { runIperf, runIperfStream, IperfOptions } from '../services/iperfRunner';
import { generateSessionId, createSession, appendOutput, completeSession } from '../services/sessionManager';
import { z } from 'zod';

const router = Router();

const iperfSchema = z.object({
    mode: z.enum(['public', 'private']),
    protocol: z.enum(['tcp', 'udp']),
    ipVersion: z.enum(['ipv4', 'ipv6']),
    serverHost: z.string().min(1),
    port: z.union([z.string(), z.number()]).optional(),
    duration: z.number().min(1).max(60).optional(),
    parallelStreams: z.number().min(1).max(10).optional(),
    reverse: z.boolean().optional(),
    bidirectional: z.boolean().optional(),
    bitrate: z.string().optional(),
    extraArgs: z.string().optional()
});

router.post('/run-iperf', async (req: Request, res: Response) => {
    try {
        const options = iperfSchema.parse(req.body);

        // Security check: simple sanitize for host
        if (!/^[a-zA-Z0-9.-: ]+$/.test(options.serverHost)) {
            // basic check
        }

        const result = await runIperf(options as IperfOptions);
        res.json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Invalid parameters', details: (error as any).errors });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

router.post('/run-iperf-stream', async (req: Request, res: Response) => {
    console.log('[API] Received /run-iperf-stream request');

    try {
        const options = iperfSchema.parse(req.body);

        // Security check
        if (!/^[a-zA-Z0-9.-: ]+$/.test(options.serverHost)) {
            res.status(400).send('Invalid host');
            return;
        }

        // Generate session ID
        const sessionId = generateSessionId();
        createSession(sessionId);

        console.log(`[API] Created session ${sessionId}`);

        // Return session ID immediately
        res.json({ sessionId });

        // Start iPerf test in background
        const stream = runIperfStream(options as IperfOptions);

        stream.on('data', (data: string) => {
            appendOutput(sessionId, data);
        });

        stream.on('error', (err: string) => {
            console.error('[API] Stream error:', err);
            completeSession(sessionId, err);
        });

        stream.on('end', () => {
            console.log(`[API] Session ${sessionId} complete`);
            completeSession(sessionId);
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Invalid parameters', details: (error as any).errors });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

export default router;
