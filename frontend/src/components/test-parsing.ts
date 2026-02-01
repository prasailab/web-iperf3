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
    const parseLine = (line: string): { duration: number, bytes: number, throughput: number, retransmissions: number } | null => {
        // Try Strict Regex first (standard iPerf3)
        const strictMatch = line.match(/(?:\[\s*\d+\]|\[SUM\])\s+(\d+\.\d+-\d+\.\d+)\s+sec\s+(\d+(?:\.\d+)?)\s+([KMG]?Bytes)\s+(\d+(?:\.\d+)?)\s+([KMG]?bits\/sec)(?:\s+(\d+))?\s+(sender|receiver)/i);

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

            const retransmissions = strictMatch[6] ? parseInt(strictMatch[6]) : 0;

            return { duration, bytes, throughput, retransmissions };
        }

        // Try Relaxed Regex
        const relaxedMatch = line.match(/(\d+\.\d+-\d+\.\d+).+?(\d+(?:\.\d+)?)\s+([KMG]?Bytes).+?(\d+(?:\.\d+)?)\s+([KMG]?bits\/sec)/i);
        if (relaxedMatch && (line.includes('sender') || line.includes('receiver'))) {
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

            const retrMatch = line.match(/(\d+)\s+(sender|receiver)/i);
            const retransmissions = retrMatch ? parseInt(retrMatch[1]) : 0;

            return { duration, bytes, throughput, retransmissions };
        }

        return null;
    };

    let senderLine = lines.find(l => l.includes('[SUM]') && l.includes('sender'));
    let receiverLine = lines.find(l => l.includes('[SUM]') && l.includes('receiver'));

    if (!senderLine) {
        const senderLines = lines.filter(l => l.match(/sender/i) && l.match(/0\.00-\d+/));
        if (senderLines.length > 0) senderLine = senderLines[senderLines.length - 1];
    }

    if (!receiverLine) {
        const receiverLines = lines.filter(l => l.match(/receiver/i) && l.match(/0\.00-\d+/));
        if (receiverLines.length > 0) receiverLine = receiverLines[receiverLines.length - 1];
    }

    if (senderLine) {
        const parsed = parseLine(senderLine);
        if (parsed) {
            metrics.senderThroughput = parsed.throughput;
            metrics.totalBytes = parsed.bytes;
            metrics.duration = parsed.duration;
            metrics.retransmissions = parsed.retransmissions;
        }
    }

    if (receiverLine) {
        const parsed = parseLine(receiverLine);
        if (parsed) {
            metrics.receiverThroughput = parsed.throughput;
        }
    } else {
        if (metrics.senderThroughput > 0) {
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

// Test Case 1: Single Stream Upload (Normal Mode)
const singleStreamUpload = `Connecting to host 217.161.120.178, port 5201
[  5] local 192.168.1.100 port 54321 connected to 217.161.120.178 port 5201
[ ID] Interval           Transfer     Bitrate         Retr  Cwnd
[  5]   0.00-1.00   sec  11.4 MBytes  95.7 Mbits/sec    0    256 KBytes       
[  5]   1.00-2.00   sec  11.2 MBytes  94.1 Mbits/sec    0    256 KBytes       
[  5]   2.00-3.00   sec  11.3 MBytes  94.8 Mbits/sec    0    256 KBytes       
[  5]   3.00-4.00   sec  11.4 MBytes  95.5 Mbits/sec    0    256 KBytes       
[  5]   4.00-5.00   sec  11.3 MBytes  94.9 Mbits/sec    0    256 KBytes       
[  5]   5.00-6.00   sec  11.4 MBytes  95.6 Mbits/sec    0    256 KBytes       
[  5]   6.00-7.00   sec  11.2 MBytes  94.0 Mbits/sec    0    256 KBytes       
[  5]   7.00-8.00   sec  11.4 MBytes  95.8 Mbits/sec    0    256 KBytes       
[  5]   8.00-9.00   sec  11.3 MBytes  94.7 Mbits/sec    0    256 KBytes       
[  5]   9.00-10.00  sec  11.4 MBytes  95.4 Mbits/sec    0    256 KBytes       
- - - - - - - - - - - - - - - - - - - - - - - - -
[  5]   0.00-10.01  sec   114 MBytes  95.7 Mbits/sec    0             sender
[  5]   0.00-10.01  sec   114 MBytes  95.5 Mbits/sec                  receiver`;

// Test Case 2: Parallel Streams (4 streams) with [SUM]
const parallelStreams4 = `Connecting to host 217.161.120.178, port 5201
[  5] local 192.168.1.100 port 54321 connected to 217.161.120.178 port 5201
[  7] local 192.168.1.100 port 54322 connected to 217.161.120.178 port 5201
[  9] local 192.168.1.100 port 54323 connected to 217.161.120.178 port 5201
[ 11] local 192.168.1.100 port 54324 connected to 217.161.120.178 port 5201
[ ID] Interval           Transfer     Bitrate         Retr  Cwnd
[  5]   0.00-1.00   sec  28.5 MBytes   239 Mbits/sec    0    512 KBytes       
[  7]   0.00-1.00   sec  28.3 MBytes   237 Mbits/sec    0    512 KBytes       
[  9]   0.00-1.00   sec  28.4 MBytes   238 Mbits/sec    0    512 KBytes       
[ 11]   0.00-1.00   sec  28.6 MBytes   240 Mbits/sec    0    512 KBytes       
[SUM]   0.00-1.00   sec   114 MBytes   954 Mbits/sec    0             
- - - - - - - - - - - - - - - - - - - - - - - - -
[  5]   0.00-10.00  sec   285 MBytes   239 Mbits/sec    2             sender
[  7]   0.00-10.00  sec   283 MBytes   237 Mbits/sec    1             sender
[  9]   0.00-10.00  sec   284 MBytes   238 Mbits/sec    0             sender
[ 11]   0.00-10.00  sec   286 MBytes   240 Mbits/sec    2             sender
[SUM]   0.00-10.00  sec  1138 MBytes   954 Mbits/sec    5             sender
[SUM]   0.00-10.00  sec  1136 MBytes   952 Mbits/sec                  receiver`;

// Test Case 3: Parallel Streams (64 streams) - Maximum
const parallelStreams64 = `Connecting to host 217.161.120.178, port 5201
[ ID] Interval           Transfer     Bitrate         Retr  Cwnd
[SUM]   0.00-1.00   sec  1.82 GBytes  15.6 Gbits/sec   45             
[SUM]   1.00-2.00   sec  1.81 GBytes  15.5 Gbits/sec   42             
[SUM]   2.00-3.00   sec  1.83 GBytes  15.7 Gbits/sec   38             
[SUM]   3.00-4.00   sec  1.82 GBytes  15.6 Gbits/sec   41             
[SUM]   4.00-5.00   sec  1.81 GBytes  15.5 Gbits/sec   44             
[SUM]   5.00-6.00   sec  1.83 GBytes  15.7 Gbits/sec   39             
[SUM]   6.00-7.00   sec  1.82 GBytes  15.6 Gbits/sec   43             
[SUM]   7.00-8.00   sec  1.81 GBytes  15.5 Gbits/sec   40             
[SUM]   8.00-9.00   sec  1.83 GBytes  15.7 Gbits/sec   37             
[SUM]   9.00-10.00  sec  1.82 GBytes  15.6 Gbits/sec   42             
- - - - - - - - - - - - - - - - - - - - - - - - -
[SUM]   0.00-10.00  sec  18.2 GBytes  15.6 Gbits/sec  411             sender
[SUM]   0.00-10.00  sec  18.1 GBytes  15.5 Gbits/sec                  receiver`;

// Test Case 4: Download Mode (Reverse -R)
const downloadMode = `Connecting to host 217.161.120.178, port 5201
Reverse mode, remote host 217.161.120.178 is sending
[  5] local 192.168.1.100 port 54321 connected to 217.161.120.178 port 5201
[ ID] Interval           Transfer     Bitrate
[  5]   0.00-1.00   sec  12.1 MBytes   102 Mbits/sec                  
[  5]   1.00-2.00   sec  12.0 MBytes   101 Mbits/sec                  
[  5]   2.00-3.00   sec  12.1 MBytes   102 Mbits/sec                  
[  5]   3.00-4.00   sec  12.0 MBytes   101 Mbits/sec                  
[  5]   4.00-5.00   sec  12.1 MBytes   102 Mbits/sec                  
[  5]   5.00-6.00   sec  12.0 MBytes   101 Mbits/sec                  
[  5]   6.00-7.00   sec  12.1 MBytes   102 Mbits/sec                  
[  5]   7.00-8.00   sec  12.0 MBytes   101 Mbits/sec                  
[  5]   8.00-9.00   sec  12.1 MBytes   102 Mbits/sec                  
[  5]   9.00-10.00  sec  12.0 MBytes   101 Mbits/sec                  
- - - - - - - - - - - - - - - - - - - - - - - - -
[  5]   0.00-10.00  sec   121 MBytes   101 Mbits/sec    3             sender
[  5]   0.00-10.00  sec   121 MBytes   101 Mbits/sec                  receiver
CPU Utilization: local/sender 3.8% (0.6%u/3.2%s), remote/receiver 0.7% (0.1%u/0.7%s)`;

// Test Case 5: Relaxed Regex (Missing 'sec' or extra spaces)
const output5 = `[  5] local 192.168.1.5 port 54321 connected to 217.161.120.178 port 5201
[ ID] Interval           Transfer     Bitrate         Retr
[  5]   0.00-10.00   110 MBytes   92.3 Mbits/sec    0             sender
[  5]   0.00-10.00   110 MBytes   92.3 Mbits/sec                  receiver`;

console.log("=== Test Case 5: Relaxed Regex (Missing 'sec' keyword) ===");
const result5 = parseIperfOutput(output5);
console.log("Sender Throughput:", result5.senderThroughput, "Mbps (Expected: 92.3)");
console.log("Receiver Throughput:", result5.receiverThroughput, "Mbps (Expected: 92.3)");
console.log("Retransmissions:", result5.retransmissions, "(Expected: 0)");

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

