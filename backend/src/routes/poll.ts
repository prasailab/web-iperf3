import { Router, Request, Response } from 'express';
import { getOutput } from '../services/sessionManager';

const router = Router();

// Poll endpoint - get new output since last index
router.get('/iperf-poll/:sessionId', (req: Request, res: Response) => {
    const sessionId = req.params.sessionId as string;
    const fromIndexParam = req.query.fromIndex;
    let fromIndex = 0;
    if (typeof fromIndexParam === 'string') {
        fromIndex = parseInt(fromIndexParam) || 0;
    }

    const result = getOutput(sessionId, fromIndex);

    res.json({
        lines: result.lines,
        isComplete: result.isComplete,
        error: result.error,
        nextIndex: fromIndex + result.lines.length
    });
});

export default router;
