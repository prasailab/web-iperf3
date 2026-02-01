"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sessionManager_1 = require("../services/sessionManager");
const router = (0, express_1.Router)();
// Poll endpoint - get new output since last index
router.get('/iperf-poll/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    const fromIndexParam = req.query.fromIndex;
    let fromIndex = 0;
    if (typeof fromIndexParam === 'string') {
        fromIndex = parseInt(fromIndexParam) || 0;
    }
    const result = (0, sessionManager_1.getOutput)(sessionId, fromIndex);
    res.json({
        lines: result.lines,
        isComplete: result.isComplete,
        error: result.error,
        nextIndex: fromIndex + result.lines.length
    });
});
exports.default = router;
