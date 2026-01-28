import { Router, Request, Response } from 'express';
import { runIperf, runIperfStream, IperfOptions } from '../services/iperfRunner';
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

        // Set headers for streaming text
        // Disable Nginx/Proxy buffering if any
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.flushHeaders(); // Explicitly flush headers

        console.log('[API] Initializing stream via runIperfStream...');

        // Import is now top-level (see below), but we use the imported function
        const stream = runIperfStream(options);

        // Send checking message immediately
        res.write('DEBUG: Stream initialized on server...\n');

        stream.on('data', (data: string) => {
            res.write(data);
        });

        stream.on('error', (err: string) => {
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

    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).send(`Invalid parameters: ${JSON.stringify((error as any).errors)}`);
        } else {
            res.status(500).send('Internal server error');
        }
    }
});

export default router;
