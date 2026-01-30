"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBDP = void 0;
const calculateBDP = (bandwidthMbps, rttMs) => {
    // Convert to base units
    const bandwidthBps = bandwidthMbps * 1000000;
    const rttSeconds = rttMs / 1000;
    // Calculate BDP in bits
    // BDP (bits) = Bandwidth (bps) * RTT (seconds)
    const bdpBits = bandwidthBps * rttSeconds;
    // Calculate RWND in Bytes
    // RWND (Bytes) = BDP (bits) / 8
    const rwndBytes = bdpBits / 8;
    // Theoretical Max Throughput
    // Throughput (bps) = RWND (Bytes) * 8 / RTT (seconds)
    // This just reverses the calculation, so theoretically it equals Bandwidth (bps)
    // UNLESS RWND is limited. 
    // But strictly following formula:
    const theoreticalThroughputBps = (rwndBytes * 8) / rttSeconds;
    return {
        bdpBits,
        bdpBytes: rwndBytes,
        rwndBytes: Math.ceil(rwndBytes),
        rwndMiB: parseFloat((rwndBytes / (1024 * 1024)).toFixed(2)),
        theoreticalThroughputMbps: parseFloat((theoreticalThroughputBps / 1000000).toFixed(2))
    };
};
exports.calculateBDP = calculateBDP;
