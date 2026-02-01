/**
 * Test suite for iPerf3 output parsing
 * Tests single stream, parallel streams, and various output formats
 */

interface ParsedMetrics {
    senderThroughput: number;
    receiverThroughput: number;
    retransmissions: number;
    totalBytes: number;
    duration: number;
    rtt?: number;
    cwnd?: number;
    mtu?: number;
    mss?: number;
    retransmitRate?: number;
    cpuUtilization?: {
        hostTotal: number;
        hostUser: number;
        hostSystem: number;
        remoteTotal: number;
        remoteUser: number;
        remoteSystem: number;
    };
}

function parseIperfOutput(rawOutput: string): ParsedMetrics {
    const metrics: ParsedMetrics = {
        senderThroughput: 0,
        receiverThroughput: 0,
        retransmissions: 0,
        totalBytes: 0,
        duration: 10
    };

    if (!rawOutput) return metrics;

    const lines = rawOutput.split('\n');

    // Helper to parse a line with flexible regex
    const parseLine = (line: string): { duration: number, bytes: number, throughput: number, retransmissions: number, type: 'sender' | 'receiver' | null } | null => {
        let type: 'sender' | 'receiver' | null = null;
        if (line.includes('sender') || line.includes('[TX-C]')) type = 'sender';
        else if (line.includes('receiver') || line.includes('[RX-C]')) type = 'receiver';

        if (!type) return null;

        // Try Strict Regex first (standard iPerf3)
        // [  5]   0.00-10.01  sec   114 MBytes  95.7 Mbits/sec    0             sender
        // [SUM]   0.00-10.00  sec  121 MBytes   101 Mbits/sec    3             sender
        // [  5][TX-C]   0.00-1.00   sec  15.9 MBytes   133 Mbits/sec
        const strictMatch = line.match(/(?:\[\s*\d+\]|\[SUM\])(?:\[(?:TX|RX)-C\])?\s+(\d+\.\d+-\d+\.\d+)\s+sec\s+(\d+(?:\.\d+)?)\s+([KMG]?Bytes)\s+(\d+(?:\.\d+)?)\s+([KMG]?bits\/sec)/i);

        if (strictMatch) {
            const interval = strictMatch[1];
            const duration = parseFloat(interval.split('-')[1]);

            let bytes = parseFloat(strictMatch[2]);
            const byteUnit = strictMatch[3];
            if (byteUnit.toUpperCase().startsWith('G')) bytes *= 1024 * 1024 * 1024;
            else if (byteUnit.toUpperCase().startsWith('M')) bytes *= 1024 * 1024;
            else if (byteUnit.toUpperCase().startsWith('K')) bytes *= 1024;

            let throughput = parseFloat(strictMatch[4]);
            const throughputUnit = strictMatch[5];
            if (throughputUnit.toUpperCase().startsWith('G')) throughput *= 1000;
            else if (throughputUnit.toUpperCase().startsWith('K')) throughput /= 1000;

            // Retransmissions logic:
            // 1. Look for number before 'sender' or 'receiver' at end of line (Standard)
            const standardRetr = line.match(/\s+(\d+)\s+(sender|receiver)/i);
            // 2. Look for number at very end of line (Fallback)
            const endRetr = line.match(/\s+(\d+)\s*$/);

            let retransmissions = 0;
            if (standardRetr) retransmissions = parseInt(standardRetr[1]);
            else if (endRetr) retransmissions = parseInt(endRetr[1]);

            return { duration, bytes, throughput, retransmissions, type };
        }

        // Try Relaxed Regex
        // Look for: numeric-numeric ... numeric unit ... numeric unit
        const relaxedMatch = line.match(/(\d+\.\d+-\d+\.\d+).+?(\d+(?:\.\d+)?)\s+([KMG]?Bytes).+?(\d+(?:\.\d+)?)\s+([KMG]?bits\/sec)/i);
        if (relaxedMatch) {
            const interval = relaxedMatch[1];
            const duration = parseFloat(interval.split('-')[1]);

            let bytes = parseFloat(relaxedMatch[2]);
            const byteUnit = relaxedMatch[3];
            if (byteUnit.toUpperCase().startsWith('G')) bytes *= 1024 * 1024 * 1024;
            else if (byteUnit.toUpperCase().startsWith('M')) bytes *= 1024 * 1024;
            else if (byteUnit.toUpperCase().startsWith('K')) bytes *= 1024;

            let throughput = parseFloat(relaxedMatch[4]);
            const throughputUnit = relaxedMatch[5];
            if (throughputUnit.toUpperCase().startsWith('G')) throughput *= 1000;
            else if (throughputUnit.toUpperCase().startsWith('K')) throughput /= 1000;

            // Retransmissions logic
            const standardRetr = line.match(/\s+(\d+)\s+(sender|receiver)/i);
            const endRetr = line.match(/\s+(\d+)\s*$/);

            let retransmissions = 0;
            if (standardRetr) retransmissions = parseInt(standardRetr[1]);
            else if (endRetr) retransmissions = parseInt(endRetr[1]);

            return { duration, bytes, throughput, retransmissions, type };
        }

        return null;
    };

    // Find summary lines
    // 1. Look for [SUM] ... sender OR [SUM][TX-C]
    // 2. Look for [SUM] ... receiver OR [SUM][RX-C]
    // 3. Fallback: Look for [ ID] ... sender OR [ ID][TX-C]

    let lastSenderLine: string | undefined;
    let lastReceiverLine: string | undefined;

    // First try [SUM] lines
    const sumSenderLines = lines.filter(l => l.includes('[SUM]') && (l.includes('sender') || l.includes('[TX-C]')));
    const sumReceiverLines = lines.filter(l => l.includes('[SUM]') && (l.includes('receiver') || l.includes('[RX-C]')));

    if (sumSenderLines.length > 0) lastSenderLine = sumSenderLines[sumSenderLines.length - 1];
    if (sumReceiverLines.length > 0) lastReceiverLine = sumReceiverLines[sumReceiverLines.length - 1];

    // If no SUM lines, look for stream lines (that look like summary/last interval)
    if (!lastSenderLine) {
        // Find all sender lines
        const allSenderLines = lines.filter(l => (l.includes('sender') || l.includes('[TX-C]')) && l.match(/\d+\.\d+-\d+\.\d+/));
        if (allSenderLines.length > 0) lastSenderLine = allSenderLines[allSenderLines.length - 1];
    }

    if (!lastReceiverLine) {
        // Find all receiver lines
        const allReceiverLines = lines.filter(l => (l.includes('receiver') || l.includes('[RX-C]')) && l.match(/\d+\.\d+-\d+\.\d+/));
        if (allReceiverLines.length > 0) lastReceiverLine = allReceiverLines[allReceiverLines.length - 1];
    }

    if (lastSenderLine) {
        const parsed = parseLine(lastSenderLine);
        if (parsed && parsed.type === 'sender') {
            metrics.senderThroughput = parsed.throughput;
            metrics.totalBytes = parsed.bytes;
            metrics.duration = parsed.duration;
            metrics.retransmissions = parsed.retransmissions;
        }
    }

    if (lastReceiverLine) {
        const parsed = parseLine(lastReceiverLine);
        if (parsed && parsed.type === 'receiver') {
            metrics.receiverThroughput = parsed.throughput;
        }
    } else {
        // If single stream upload (no receiver line usually in older iPerf or specific modes), use sender
        if (metrics.senderThroughput > 0 && !rawOutput.includes('Reverse mode') && !rawOutput.includes('--bidir')) {
            metrics.receiverThroughput = metrics.senderThroughput;
        }
    }

    // Parse MTU/MSS
    const mssMatch = rawOutput.match(/MSS[=\s]+(\d+)/i);
    if (mssMatch) {
        metrics.mss = parseInt(mssMatch[1]);
        metrics.mtu = metrics.mss + 40;
    } else {
        metrics.mtu = 1500;
        metrics.mss = 1460;
    }

    // Calculate retransmission rate
    if (metrics.duration > 0) {
        metrics.retransmitRate = metrics.retransmissions / metrics.duration;
    }

    // Parse CPU Utilization
    const cpuMatch = rawOutput.match(/CPU Utilization: local\/sender ([\d.]+)%.*remote\/receiver ([\d.]+)%/i);
    if (cpuMatch) {
        metrics.cpuUtilization = {
            hostTotal: parseFloat(cpuMatch[1]),
            hostUser: 0,
            hostSystem: 0,
            remoteTotal: parseFloat(cpuMatch[2]),
            remoteUser: 0,
            remoteSystem: 0
        };
    }

    return metrics;
}

// Test case data remains same as before...
// Test Case 1: Single Stream Upload (Normal Mode)
const singleStreamUpload = `Connecting to host 217.161.120.178, port 5201
[  5] local 192.168.1.100 port 54321 connected to 217.161.120.178 port 5201
[ ID] Interval           Transfer     Bitrate         Retr  Cwnd
[  5]   0.00-1.00   sec  11.4 MBytes  95.7 Mbits/sec    0    256 KBytes       
[  5]   9.00-10.00  sec  11.4 MBytes  95.4 Mbits/sec    0    256 KBytes       
- - - - - - - - - - - - - - - - - - - - - - - - -
[  5]   0.00-10.01  sec   114 MBytes  95.7 Mbits/sec    0             sender
[  5]   0.00-10.01  sec   114 MBytes  95.5 Mbits/sec                  receiver`;

// Test Case 2: Parallel Streams (4 streams) with [SUM]
const parallelStreams4 = `Connecting to host 217.161.120.178, port 5201
[  5] local 192.168.1.100 port 54321 connected to 217.161.120.178 port 5201
[SUM]   0.00-1.00   sec   114 MBytes   954 Mbits/sec    0             
- - - - - - - - - - - - - - - - - - - - - - - - -
[  5]   0.00-10.00  sec   285 MBytes   239 Mbits/sec    2             sender
[SUM]   0.00-10.00  sec  1138 MBytes   954 Mbits/sec    5             sender
[SUM]   0.00-10.00  sec  1136 MBytes   952 Mbits/sec                  receiver`;

// Test Case 3: Parallel Streams (64 streams) - Maximum
const parallelStreams64 = `Connecting to host 217.161.120.178, port 5201
[SUM]   9.00-10.00  sec  1.82 GBytes  15.6 Gbits/sec   42             
- - - - - - - - - - - - - - - - - - - - - - - - -
[SUM]   0.00-10.00  sec  18.2 GBytes  15.6 Gbits/sec  411             sender
[SUM]   0.00-10.00  sec  18.1 GBytes  15.5 Gbits/sec                  receiver`;

// Test Case 4: Download Mode (Reverse -R)
const downloadMode = `Connecting to host 217.161.120.178, port 5201
Reverse mode, remote host 217.161.120.178 is sending
- - - - - - - - - - - - - - - - - - - - - - - - -
[  5]   0.00-10.00  sec   121 MBytes   101 Mbits/sec    3             sender
[  5]   0.00-10.00  sec   121 MBytes   101 Mbits/sec                  receiver
CPU Utilization: local/sender 3.8% (0.6%u/3.2%s), remote/receiver 0.7% (0.1%u/0.7%s)`;

// Test Case 5: Relaxed Regex (Missing 'sec' or extra spaces)
const output5 = `[  5] local 192.168.1.5 port 54321 connected to 217.161.120.178 port 5201
[ ID] Interval           Transfer     Bitrate         Retr
[  5]   0.00-10.00   110 MBytes   92.3 Mbits/sec    0             sender
[  5]   0.00-10.00   110 MBytes   92.3 Mbits/sec                  receiver`;

// Test Case 6: Bidirectional (Crashed/Incomplete)
const output6 = `[  5] local 192.168.1.169 port 56561 connected to 195.89.107.62 port 5201
[  7] local 192.168.1.169 port 56562 connected to 195.89.107.62 port 5201
[ ID][Role] Interval           Transfer     Bitrate
[  5][TX-C]   7.00-8.00   sec  7.88 MBytes  66.0 Mbits/sec                  
[  7][RX-C]   7.00-8.00   sec  0.00 Bytes  0.00 bits/sec                  
[  5][TX-C]   8.00-9.00   sec  4.38 MBytes  36.7 Mbits/sec                  
[  7][RX-C]   8.00-9.00   sec  0.00 Bytes  0.00 bits/sec                  
warning: Failed to read JSON data size`;

console.log("=== Test Case 6: Bidirectional (Crashed/Incomplete) ===");
const result6 = parseIperfOutput(output6);
console.log("Sender Throughput:", result6.senderThroughput, "Mbps (Expected: 36.7)");
console.log("Receiver Throughput:", result6.receiverThroughput, "Mbps (Expected: 0.00)");
// Note: Duration might be 9.00 because that's the end of last interval
console.log("Duration:", result6.duration, "sec (Expected: ~9.00)");

// Run tests
console.log("=== Test Case 1: Single Stream Upload ===");
const result1 = parseIperfOutput(singleStreamUpload);
console.log("Sender Throughput:", result1.senderThroughput, "Mbps (Expected: 95.7)");
console.log("Receiver Throughput:", result1.receiverThroughput, "Mbps (Expected: 95.5)");
console.log("Total Bytes:", (result1.totalBytes / 1024 / 1024).toFixed(2), "MB (Expected: 114)");
console.log("Retransmissions:", result1.retransmissions, "(Expected: 0)");
console.log("Duration:", result1.duration, "sec (Expected: 10.01)");
console.log("");

console.log("=== Test Case 2: Parallel Streams (4) ===");
const result2 = parseIperfOutput(parallelStreams4);
console.log("Sender Throughput:", result2.senderThroughput, "Mbps (Expected: 954)");
console.log("Receiver Throughput:", result2.receiverThroughput, "Mbps (Expected: 952)");
console.log("Total Bytes:", (result2.totalBytes / 1024 / 1024).toFixed(2), "MB (Expected: 1138)");
console.log("Retransmissions:", result2.retransmissions, "(Expected: 5)");
console.log("Duration:", result2.duration, "sec (Expected: 10.00)");
console.log("");

console.log("=== Test Case 3: Parallel Streams (64) ===");
const result3 = parseIperfOutput(parallelStreams64);
console.log("Sender Throughput:", result3.senderThroughput, "Mbps (Expected: 15600)");
console.log("Receiver Throughput:", result3.receiverThroughput, "Mbps (Expected: 15500)");
console.log("Total Bytes:", (result3.totalBytes / 1024 / 1024 / 1024).toFixed(2), "GB (Expected: 18.2)");
console.log("Retransmissions:", result3.retransmissions, "(Expected: 411)");
console.log("Duration:", result3.duration, "sec (Expected: 10.00)");
console.log("");

console.log("=== Test Case 4: Download Mode (Reverse) ===");
const result4 = parseIperfOutput(downloadMode);
console.log("Sender Throughput:", result4.senderThroughput, "Mbps (Expected: 101)");
console.log("Receiver Throughput:", result4.receiverThroughput, "Mbps (Expected: 101)");
console.log("Total Bytes:", (result4.totalBytes / 1024 / 1024).toFixed(2), "MB (Expected: 121)");
console.log("Retransmissions:", result4.retransmissions, "(Expected: 3)");
console.log("Duration:", result4.duration, "sec (Expected: 10.00)");
if (result4.cpuUtilization) {
    console.log("CPU Sender:", result4.cpuUtilization.hostTotal, "% (Expected: 3.8)");
    console.log("CPU Receiver:", result4.cpuUtilization.remoteTotal, "% (Expected: 0.7)");
} else {
    console.log("CPU Utilization: Not found (FAILED)");
}


console.log("=== Test Case 5: Relaxed Regex (Missing 'sec' keyword) ===");
const result5 = parseIperfOutput(output5);
console.log("Sender Throughput:", result5.senderThroughput, "Mbps (Expected: 92.3)");
console.log("Receiver Throughput:", result5.receiverThroughput, "Mbps (Expected: 92.3)");
console.log("Retransmissions:", result5.retransmissions, "(Expected: 0)");
