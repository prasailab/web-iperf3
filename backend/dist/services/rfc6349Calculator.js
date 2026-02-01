"use strict";
/**
 * RFC 6349 Calculator Service
 * Calculates network performance metrics according to RFC 6349 framework
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBDP = calculateBDP;
exports.calculateIdealWindowSize = calculateIdealWindowSize;
exports.calculateTransferEfficiency = calculateTransferEfficiency;
exports.calculateTCPEfficiency = calculateTCPEfficiency;
exports.calculateBufferDelay = calculateBufferDelay;
exports.calculatePacketLoss = calculatePacketLoss;
exports.calculateAveragePacketSize = calculateAveragePacketSize;
exports.determinePerformanceGrade = determinePerformanceGrade;
exports.generateRecommendations = generateRecommendations;
exports.calculateRFC6349Metrics = calculateRFC6349Metrics;
/**
 * Calculate Bandwidth-Delay Product (BDP)
 * BDP (bits) = RTT (sec) × Bandwidth (bps)
 * BDP (bytes) = BDP (bits) / 8
 */
function calculateBDP(rtt, bandwidth) {
    // RTT in ms, Bandwidth in Mbps
    const rttSeconds = rtt / 1000;
    const bandwidthBps = bandwidth * 1000000;
    const bdpBits = rttSeconds * bandwidthBps;
    return bdpBits / 8; // Convert to bytes
}
/**
 * Calculate ideal TCP window size
 * Ideal Window Size = BDP
 */
function calculateIdealWindowSize(rtt, bandwidth) {
    return calculateBDP(rtt, bandwidth);
}
/**
 * Calculate Transfer Efficiency
 * Transfer Efficiency = (Actual Throughput / Bottleneck Bandwidth) × 100%
 */
function calculateTransferEfficiency(throughput, bandwidth) {
    if (bandwidth === 0)
        return 0;
    return (throughput / bandwidth) * 100;
}
/**
 * Calculate TCP Efficiency
 * TCP Efficiency = (Actual Throughput / Theoretical Max Throughput) × 100%
 * Theoretical Max = (Window Size × 8) / RTT
 */
function calculateTCPEfficiency(throughput, windowSize, rtt) {
    if (rtt === 0)
        return 0;
    const rttSeconds = rtt / 1000;
    const theoreticalMaxMbps = (windowSize * 8) / rttSeconds / 1000000;
    if (theoreticalMaxMbps === 0)
        return 0;
    return (throughput / theoreticalMaxMbps) * 100;
}
/**
 * Calculate Buffer Delay
 * Buffer Delay = (TCP Window Size / Throughput) - RTT
 */
function calculateBufferDelay(windowSize, throughput, rtt) {
    if (throughput === 0)
        return 0;
    const throughputBps = throughput * 1000000;
    const transmissionTime = (windowSize * 8) / throughputBps * 1000; // ms
    return Math.max(0, transmissionTime - rtt);
}
/**
 * Calculate packet loss percentage
 */
function calculatePacketLoss(retransmissions, totalPackets) {
    if (totalPackets === 0)
        return 0;
    return (retransmissions / totalPackets) * 100;
}
/**
 * Calculate average packet size
 */
function calculateAveragePacketSize(totalBytes, totalPackets) {
    if (totalPackets === 0)
        return 0;
    return totalBytes / totalPackets;
}
/**
 * Determine performance grade based on efficiency and packet loss
 */
function determinePerformanceGrade(transferEfficiency, packetLoss, tcpEfficiency) {
    // Excellent: >90% efficiency, <0.1% loss
    if (transferEfficiency >= 90 && packetLoss < 0.1 && tcpEfficiency >= 85) {
        return 'Excellent';
    }
    // Good: >75% efficiency, <1% loss
    if (transferEfficiency >= 75 && packetLoss < 1 && tcpEfficiency >= 70) {
        return 'Good';
    }
    // Fair: >50% efficiency, <5% loss
    if (transferEfficiency >= 50 && packetLoss < 5) {
        return 'Fair';
    }
    // Poor: everything else
    return 'Poor';
}
/**
 * Generate recommendations based on metrics
 */
function generateRecommendations(metrics) {
    const recommendations = [];
    // Window size recommendations
    if (metrics.actualWindowSize < metrics.idealWindowSize * 0.8) {
        const idealKB = Math.round(metrics.idealWindowSize / 1024);
        recommendations.push(`Increase TCP window size to at least ${idealKB} KB for optimal performance (current: ${Math.round(metrics.actualWindowSize / 1024)} KB)`);
    }
    // Packet loss recommendations
    if (metrics.packetLoss > 1) {
        recommendations.push(`High packet loss detected (${metrics.packetLoss.toFixed(2)}%). Investigate network congestion or link quality issues.`);
    }
    // Retransmission recommendations
    if (metrics.retransmissions > 100) {
        recommendations.push(`Excessive retransmissions (${metrics.retransmissions}). Check for network congestion, buffer overflow, or link errors.`);
    }
    // Transfer efficiency recommendations
    if (metrics.transferEfficiency < 75) {
        recommendations.push(`Low transfer efficiency (${metrics.transferEfficiency.toFixed(1)}%). Consider optimizing TCP parameters or investigating bottlenecks.`);
    }
    // Buffer delay recommendations
    if (metrics.bufferDelay > metrics.rtt) {
        recommendations.push(`High buffer delay detected (${metrics.bufferDelay.toFixed(1)} ms). Consider reducing buffer sizes or investigating queuing delays.`);
    }
    // RTT recommendations
    if (metrics.rtt > 100) {
        recommendations.push(`High round-trip time (${metrics.rtt.toFixed(1)} ms). Performance may be limited by latency. Consider using TCP optimization techniques.`);
    }
    if (recommendations.length === 0) {
        recommendations.push('Network performance is optimal. No immediate recommendations.');
    }
    return recommendations;
}
/**
 * Calculate comprehensive RFC 6349 metrics
 */
function calculateRFC6349Metrics(input) {
    // Use defaults if values not provided
    const rtt = input.rtt || 50; // Default 50ms
    const bandwidth = input.bandwidth || 100; // Default 100 Mbps
    const throughput = input.throughput || 0;
    const retransmissions = input.retransmissions || 0;
    const totalBytes = input.totalBytes || 0;
    const totalPackets = input.totalPackets || 0;
    const windowSize = input.windowSize || 65536; // Default 64KB
    // Calculate derived metrics
    const bdp = calculateBDP(rtt, bandwidth);
    const idealWindowSize = calculateIdealWindowSize(rtt, bandwidth);
    const transferEfficiency = calculateTransferEfficiency(throughput, bandwidth);
    const tcpEfficiency = calculateTCPEfficiency(throughput, windowSize, rtt);
    const bufferDelay = calculateBufferDelay(windowSize, throughput, rtt);
    const packetLoss = calculatePacketLoss(retransmissions, totalPackets);
    const averagePacketSize = calculateAveragePacketSize(totalBytes, totalPackets);
    // Determine grade
    const performanceGrade = determinePerformanceGrade(transferEfficiency, packetLoss, tcpEfficiency);
    // Build metrics object
    const metrics = {
        rtt,
        bandwidth,
        throughput,
        bdp,
        idealWindowSize,
        actualWindowSize: windowSize,
        transferEfficiency,
        tcpEfficiency,
        bufferDelay,
        retransmissions,
        packetLoss,
        averagePacketSize,
        totalBytes,
        totalPackets,
        performanceGrade,
        recommendations: []
    };
    // Generate recommendations
    metrics.recommendations = generateRecommendations(metrics);
    return metrics;
}
