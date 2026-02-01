/**
 * RFC 6349 Calculator Service
 * Calculates network performance metrics according to RFC 6349 framework
 */

export interface RFC6349Metrics {
    // Basic Measurements
    rtt: number;  // milliseconds
    bandwidth: number;  // Mbps
    throughput: number;  // Mbps

    // Calculated Values
    bdp: number;  // bytes (Bandwidth-Delay Product)
    idealWindowSize: number;  // bytes
    actualWindowSize: number;  // bytes
    transferEfficiency: number;  // percentage
    tcpEfficiency: number;  // percentage
    bufferDelay: number;  // milliseconds

    // Quality Indicators
    retransmissions: number;
    packetLoss: number;  // percentage
    averagePacketSize: number;  // bytes
    totalBytes: number;
    totalPackets: number;

    // Assessment
    performanceGrade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    recommendations: string[];
}

export interface NetworkMetrics {
    rtt?: number;  // ms
    bandwidth?: number;  // Mbps
    throughput?: number;  // Mbps
    retransmissions?: number;
    totalBytes?: number;
    totalPackets?: number;
    windowSize?: number;  // bytes
    duration?: number;  // seconds
}

/**
 * Calculate Bandwidth-Delay Product (BDP)
 * BDP (bits) = RTT (sec) × Bandwidth (bps)
 * BDP (bytes) = BDP (bits) / 8
 */
export function calculateBDP(rtt: number, bandwidth: number): number {
    // RTT in ms, Bandwidth in Mbps
    const rttSeconds = rtt / 1000;
    const bandwidthBps = bandwidth * 1000000;
    const bdpBits = rttSeconds * bandwidthBps;
    return bdpBits / 8;  // Convert to bytes
}

/**
 * Calculate ideal TCP window size
 * Ideal Window Size = BDP
 */
export function calculateIdealWindowSize(rtt: number, bandwidth: number): number {
    return calculateBDP(rtt, bandwidth);
}

/**
 * Calculate Transfer Efficiency
 * Transfer Efficiency = (Actual Throughput / Bottleneck Bandwidth) × 100%
 */
export function calculateTransferEfficiency(throughput: number, bandwidth: number): number {
    if (bandwidth === 0) return 0;
    return (throughput / bandwidth) * 100;
}

/**
 * Calculate TCP Efficiency
 * TCP Efficiency = (Actual Throughput / Theoretical Max Throughput) × 100%
 * Theoretical Max = (Window Size × 8) / RTT
 */
export function calculateTCPEfficiency(throughput: number, windowSize: number, rtt: number): number {
    if (rtt === 0) return 0;
    const rttSeconds = rtt / 1000;
    const theoreticalMaxMbps = (windowSize * 8) / rttSeconds / 1000000;
    if (theoreticalMaxMbps === 0) return 0;
    return (throughput / theoreticalMaxMbps) * 100;
}

/**
 * Calculate Buffer Delay
 * Buffer Delay = (TCP Window Size / Throughput) - RTT
 */
export function calculateBufferDelay(windowSize: number, throughput: number, rtt: number): number {
    if (throughput === 0) return 0;
    const throughputBps = throughput * 1000000;
    const transmissionTime = (windowSize * 8) / throughputBps * 1000;  // ms
    return Math.max(0, transmissionTime - rtt);
}

/**
 * Calculate packet loss percentage
 */
export function calculatePacketLoss(retransmissions: number, totalPackets: number): number {
    if (totalPackets === 0) return 0;
    return (retransmissions / totalPackets) * 100;
}

/**
 * Calculate average packet size
 */
export function calculateAveragePacketSize(totalBytes: number, totalPackets: number): number {
    if (totalPackets === 0) return 0;
    return totalBytes / totalPackets;
}

/**
 * Determine performance grade based on efficiency and packet loss
 */
export function determinePerformanceGrade(
    transferEfficiency: number,
    packetLoss: number,
    tcpEfficiency: number
): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
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
export function generateRecommendations(metrics: RFC6349Metrics): string[] {
    const recommendations: string[] = [];

    // Window size recommendations
    if (metrics.actualWindowSize < metrics.idealWindowSize * 0.8) {
        const idealKB = Math.round(metrics.idealWindowSize / 1024);
        recommendations.push(
            `Increase TCP window size to at least ${idealKB} KB for optimal performance (current: ${Math.round(metrics.actualWindowSize / 1024)} KB)`
        );
    }

    // Packet loss recommendations
    if (metrics.packetLoss > 1) {
        recommendations.push(
            `High packet loss detected (${metrics.packetLoss.toFixed(2)}%). Investigate network congestion or link quality issues.`
        );
    }

    // Retransmission recommendations
    if (metrics.retransmissions > 100) {
        recommendations.push(
            `Excessive retransmissions (${metrics.retransmissions}). Check for network congestion, buffer overflow, or link errors.`
        );
    }

    // Transfer efficiency recommendations
    if (metrics.transferEfficiency < 75) {
        recommendations.push(
            `Low transfer efficiency (${metrics.transferEfficiency.toFixed(1)}%). Consider optimizing TCP parameters or investigating bottlenecks.`
        );
    }

    // Buffer delay recommendations
    if (metrics.bufferDelay > metrics.rtt) {
        recommendations.push(
            `High buffer delay detected (${metrics.bufferDelay.toFixed(1)} ms). Consider reducing buffer sizes or investigating queuing delays.`
        );
    }

    // RTT recommendations
    if (metrics.rtt > 100) {
        recommendations.push(
            `High round-trip time (${metrics.rtt.toFixed(1)} ms). Performance may be limited by latency. Consider using TCP optimization techniques.`
        );
    }

    if (recommendations.length === 0) {
        recommendations.push('Network performance is optimal. No immediate recommendations.');
    }

    return recommendations;
}

/**
 * Calculate comprehensive RFC 6349 metrics
 */
export function calculateRFC6349Metrics(input: NetworkMetrics): RFC6349Metrics {
    // Use defaults if values not provided
    const rtt = input.rtt || 50;  // Default 50ms
    const bandwidth = input.bandwidth || 100;  // Default 100 Mbps
    const throughput = input.throughput || 0;
    const retransmissions = input.retransmissions || 0;
    const totalBytes = input.totalBytes || 0;
    const totalPackets = input.totalPackets || 0;
    const windowSize = input.windowSize || 65536;  // Default 64KB

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
    const metrics: RFC6349Metrics = {
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
