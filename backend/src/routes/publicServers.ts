import { Router, Request, Response } from 'express';
import { publicServers } from '../data/publicServers';

const router = Router();

router.get('/public-servers', (req: Request, res: Response) => {
    res.json(publicServers);
});

export default router;
