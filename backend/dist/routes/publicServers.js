"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const publicServers_1 = require("../data/publicServers");
const router = (0, express_1.Router)();
router.get('/public-servers', (req, res) => {
    res.json(publicServers_1.publicServers);
});
exports.default = router;
