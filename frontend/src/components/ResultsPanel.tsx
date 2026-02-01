import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ResultsPanelProps {
    results: any;
    error: string;
    rawOutput: string;

    isRunning: boolean;
    actualRTT?: number; // Passed from App.tsx
    testConfig?: {
        direction: 'normal' | 'reverse' | 'bidirectional';
        customArgs: string;
        protocol: string;
        duration: number;
        streams: number;
        mss?: string;
    };
}

// RFC 6349 Calculator Functions (client-side)
interface ParsedMetrics {
    senderThroughput: number;  // Mbps
    receiverThroughput: number;  // Mbps
    retransmissions: number;
    totalBytes: number;
    duration: number;
    rtt?: number;
    cwnd?: number;
    mtu?: number;  // Path MTU
    mss?: number;  // Maximum Segment Size
    windowSize?: number; // TCP Window Size in Bytes
    retransmitRate?: number;  // Retransmissions per second
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

    // For parallel streams (-P > 1), look for [SUM] lines
    // Example: [SUM]   0.00-10.00  sec   456 MBytes   383 Mbits/sec    5             sender
    const sumSenderMatch = rawOutput.match(/\[SUM\]\s+[\d.]+\s*-\s*([\d.]+)\s+sec\s+([\d.]+)\s+([KMG]?)Bytes\s+([\d.]+)\s+([KMG]?)bits\/sec\s+(\d+)\s+sender/i);
    const sumReceiverMatch = rawOutput.match(/\[SUM\]\s+[\d.]+\s*-\s*[\d.]+\s+sec\s+[\d.]+\s+[KMG]?Bytes\s+([\d.]+)\s+([KMG]?)bits\/sec\s+receiver/i);

    // For single stream, look for regular lines with stream ID
    // Example: [  5]   0.00-10.01  sec   114 MBytes  95.7 Mbits/sec    0             sender
    const singleSenderMatch = rawOutput.match(/\[\s*\d+\]\s+[\d.]+\s*-\s*([\d.]+)\s+sec\s+([\d.]+)\s+([KMG]?)Bytes\s+([\d.]+)\s+([KMG]?)bits\/sec\s+(\d+)\s+sender/i);
    const singleReceiverMatch = rawOutput.match(/\[\s*\d+\]\s+[\d.]+\s*-\s*[\d.]+\s+sec\s+[\d.]+\s+[KMG]?Bytes\s+([\d.]+)\s+([KMG]?)bits\/sec\s+receiver/i);

    // Prefer [SUM] if available (parallel streams), otherwise use single stream
    const senderMatch = sumSenderMatch || singleSenderMatch;
    const receiverMatch = sumReceiverMatch || singleReceiverMatch;

    if (senderMatch) {
        // Duration from interval
        metrics.duration = parseFloat(senderMatch[1]);

        // Total bytes
        let bytes = parseFloat(senderMatch[2]);
        const byteUnit = senderMatch[3];
        if (byteUnit === 'G') bytes *= 1024 * 1024 * 1024;
        else if (byteUnit === 'M') bytes *= 1024 * 1024;
        else if (byteUnit === 'K') bytes *= 1024;
        metrics.totalBytes = bytes;

        // Throughput
        let throughput = parseFloat(senderMatch[4]);
        const throughputUnit = senderMatch[5];
        if (throughputUnit === 'G') throughput *= 1000;
        else if (throughputUnit === 'K') throughput /= 1000;
        metrics.senderThroughput = throughput;

        // Retransmissions
        metrics.retransmissions = parseInt(senderMatch[6]);

        console.log('[PDF Parser] Sender parsed:', metrics.senderThroughput, 'Mbps');
    }

    if (receiverMatch) {
        let throughput = parseFloat(receiverMatch[1]);
        const unit = receiverMatch[2];
        if (unit === 'G') throughput *= 1000;
        else if (unit === 'K') throughput /= 1000;
        metrics.receiverThroughput = throughput;
        console.log('[PDF Parser] Receiver parsed:', throughput, 'Mbps');
    } else {
        metrics.receiverThroughput = metrics.senderThroughput;
    }

    // Extract MTU/MSS if present
    const mssMatch = rawOutput.match(/MSS[=\s]+(\d+)/i);
    if (mssMatch) {
        metrics.mss = parseInt(mssMatch[1]);
        metrics.mtu = metrics.mss + 40;
    } else {
        // Default Ethernet MTU
        metrics.mtu = 1500;
        metrics.mss = 1460;
    }

    // Parse CPU Utilization
    // Example: CPU Utilization: local/sender 3.8% (0.6%u/3.2%s), remote/receiver 0.7% (0.1%u/0.7%s)
    const cpuMatch = rawOutput.match(/CPU Utilization: local\/sender ([\d.]+)%.*remote\/receiver ([\d.]+)%/i);
    if (cpuMatch) {
        // Detailed parsing can be added if needed, extracting just totals for now
        // Or full parsing: 
        const fullCpuMatch = rawOutput.match(/CPU Utilization: local\/sender ([\d.]+)% \(([\d.]+)%u\/([\d.]+)%s\), remote\/receiver ([\d.]+)% \(([\d.]+)%u\/([\d.]+)%s\)/i);
        if (fullCpuMatch) {
            metrics.cpuUtilization = {
                hostTotal: parseFloat(fullCpuMatch[1]),
                hostUser: parseFloat(fullCpuMatch[2]),
                hostSystem: parseFloat(fullCpuMatch[3]),
                remoteTotal: parseFloat(fullCpuMatch[4]),
                remoteUser: parseFloat(fullCpuMatch[5]),
                remoteSystem: parseFloat(fullCpuMatch[6])
            };
        } else {
            // Fallback for simple percentage
            metrics.cpuUtilization = {
                hostTotal: parseFloat(cpuMatch[1]),
                hostUser: 0,
                hostSystem: 0,
                remoteTotal: parseFloat(cpuMatch[2]),
                remoteUser: 0,
                remoteSystem: 0
            };
        }
    }

    // Parse TCP Window Size (Output header)
    // Example: TCP window size: 85.3 KByte (default)
    const windowMatch = rawOutput.match(/TCP window size:\s+([\d.]+)\s+([KMG]?Byte)/i);
    if (windowMatch) {
        let size = parseFloat(windowMatch[1]);
        const unit = windowMatch[2];
        if (unit.toLowerCase().startsWith('g')) size *= 1024 * 1024 * 1024;
        else if (unit.toLowerCase().startsWith('m')) size *= 1024 * 1024;
        else if (unit.toLowerCase().startsWith('k')) size *= 1024;
        metrics.windowSize = size;
    }

    // Calculate retransmission rate
    if (metrics.duration > 0) {
        metrics.retransmitRate = metrics.retransmissions / metrics.duration;
    }

    return metrics;
}

function calculateRFC6349Metrics(parsed: ParsedMetrics, estimatedRTT: number = 50, estimatedBandwidth: number = 100) {
    const throughput = Math.max(parsed.senderThroughput, parsed.receiverThroughput);

    // BDP = RTT (sec) × Bandwidth (bps) / 8
    const rttSec = estimatedRTT / 1000;
    const bandwidthBps = estimatedBandwidth * 1000000;
    const bdp = (rttSec * bandwidthBps) / 8;

    // Ideal window size = BDP
    const idealWindowSize = bdp;

    // Assume default window size (can be extracted from iPerf if available)
    const actualWindowSize = 65536;  // 64 KB default

    // Transfer efficiency = (throughput / bandwidth) × 100
    const transferEfficiency = (throughput / estimatedBandwidth) * 100;

    // TCP efficiency = (throughput / theoretical max) × 100
    const theoreticalMaxMbps = (parsed.windowSize || actualWindowSize * 8) / rttSec / 1000000;
    const tcpEfficiency = (throughput / theoreticalMaxMbps) * 100;

    // Buffer delay
    const windowToUse = parsed.windowSize || actualWindowSize;
    const throughputBps = throughput * 1000000;
    const bufferDelay = throughputBps > 0 ? ((windowToUse * 8) / throughputBps * 1000) - estimatedRTT : 0;

    // Packet loss
    // Use MSS from parsed data if avail, else default 1460
    const mss = parsed.mss || 1460;
    const estimatedPackets = parsed.totalBytes / mss;
    const packetLoss = estimatedPackets > 0 ? (parsed.retransmissions / estimatedPackets) * 100 : 0;

    // Performance grade
    let grade = 'Poor';
    if (transferEfficiency >= 90 && packetLoss < 0.1 && tcpEfficiency >= 85) grade = 'Excellent';
    else if (transferEfficiency >= 75 && packetLoss < 1 && tcpEfficiency >= 70) grade = 'Good';
    else if (transferEfficiency >= 50 && packetLoss < 5) grade = 'Fair';

    // Recommendations
    const recommendations: string[] = [];
    if (windowToUse < idealWindowSize * 0.8) {
        recommendations.push(`Increase TCP window size to ${Math.round(idealWindowSize / 1024)} KB`);
    }
    if (packetLoss > 1) {
        recommendations.push(`High packet loss (${packetLoss.toFixed(2)}%). Check network quality.`);
    }
    if (parsed.retransmissions > 100) {
        recommendations.push(`Excessive retransmissions (${parsed.retransmissions}). Investigate congestion.`);
    }
    if (transferEfficiency < 75) {
        recommendations.push(`Low efficiency (${transferEfficiency.toFixed(1)}%). Optimize TCP parameters.`);
    }
    if (recommendations.length === 0) {
        recommendations.push('Network performance is optimal.');
    }

    return {
        bdp,
        idealWindowSize,
        actualWindowSize: windowToUse,
        transferEfficiency,
        tcpEfficiency,
        bufferDelay: Math.max(0, bufferDelay),
        packetLoss,
        grade,
        recommendations,
        estimatedRTT,
        estimatedBandwidth
    };
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ results, error, rawOutput, isRunning, actualRTT, testConfig }) => {
    if (!results && !error && !rawOutput && !isRunning) return null;

    const generatePDF = async () => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            let yPos = 20;

            // ========== LOGO ==========
            try {
                // Load logo from public folder
                const logoImg = new Image();
                logoImg.src = '/logo.jpg';
                await new Promise((resolve, reject) => {
                    logoImg.onload = resolve;
                    logoImg.onerror = reject;
                    // Timeout after 2 seconds
                    setTimeout(reject, 2000);
                });

                // Add logo to PDF (centered, 30x30)
                const logoWidth = 30;
                const logoHeight = 30;
                doc.addImage(logoImg, 'JPEG', (pageWidth - logoWidth) / 2, yPos - 5, logoWidth, logoHeight);
                yPos += 30;
            } catch (err) {
                console.log('Logo not loaded, continuing without it');
                // Continue without logo if it fails to load
            }

            // ========== HEADER ==========
            doc.setFontSize(20);
            doc.setTextColor(41, 128, 185);
            doc.text("RFC 6349 Network Performance Report", pageWidth / 2, yPos, { align: 'center' });

            yPos += 8;
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
            doc.text("Praslab Network Testing Platform", pageWidth / 2, yPos + 5, { align: 'center' });

            // Contact information
            doc.setFontSize(8);
            doc.setTextColor(41, 128, 185);
            doc.text("https://praslab.com | hello@praslab.com", pageWidth / 2, yPos + 10, { align: 'center' });

            yPos += 20;

            // Parse metrics
            const parsed = parseIperfOutput(rawOutput);

            // Override with config values if output parsing missed them but args existed
            if (testConfig?.mss && !parsed.mss) {
                parsed.mss = parseInt(testConfig.mss);
                parsed.mtu = parsed.mss + 40;
            }
            // Check for -w in custom args if window size wasn't in output
            if (!parsed.windowSize && testConfig?.customArgs) {
                const wMatch = testConfig.customArgs.match(/-w\s+(\d+)([KMG]?)/i);
                if (wMatch) {
                    let val = parseInt(wMatch[1]);
                    const unit = wMatch[2].toUpperCase();
                    if (unit === 'K') val *= 1024;
                    else if (unit === 'M') val *= 1024 * 1024;
                    else if (unit === 'G') val *= 1024 * 1024 * 1024;
                    parsed.windowSize = val;
                }
            }

            // Use actual RTT from ping if available, otherwise default to 50ms (or extracted if possible in future)
            const rttToUse = actualRTT || 50;
            const rfc6349 = calculateRFC6349Metrics(parsed, rttToUse);

            // ========== EXECUTIVE SUMMARY ==========
            doc.setFontSize(14);
            doc.setTextColor(40);
            doc.text("Executive Summary", 14, yPos);
            yPos += 8;

            // Performance grade box
            const gradeColors: Record<string, [number, number, number]> = {
                'Excellent': [46, 125, 50],
                'Good': [67, 160, 71],
                'Fair': [251, 140, 0],
                'Poor': [211, 47, 47]
            };
            const gradeColor = gradeColors[rfc6349.grade] || [100, 100, 100];

            doc.setFillColor(...gradeColor);
            doc.rect(14, yPos, 60, 10, 'F');
            doc.setTextColor(255);
            doc.setFontSize(12);
            doc.text(`Grade: ${rfc6349.grade}`, 44, yPos + 7, { align: 'center' });

            doc.setTextColor(40);
            doc.setFontSize(10);
            doc.text(`Throughput: ${parsed.senderThroughput.toFixed(2)} Mbps`, 80, yPos + 7);

            yPos += 15;

            // ========== TEST CONFIGURATION ==========
            doc.setFontSize(12);
            doc.setTextColor(40);
            doc.text("Test Configuration", 14, yPos);
            yPos += 5;

            const configData = [
                ["Parameter", "Value"],
                ["Test Duration", `${parsed.duration} seconds`],
                ["Protocol", testConfig?.protocol.toUpperCase() || "TCP"],
                ["Direction", testConfig?.direction ? testConfig.direction.charAt(0).toUpperCase() + testConfig.direction.slice(1) : "Upload"],
                ["Total Data Transferred", `${(parsed.totalBytes / 1024 / 1024).toFixed(2)} MB`]
            ];

            autoTable(doc, {
                head: [configData[0]],
                body: configData.slice(1),
                startY: yPos,
                theme: 'striped',
                headStyles: { fillColor: [52, 73, 94], textColor: 255 },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 14 }
            });

            yPos = (doc as any).lastAutoTable.finalY + 10;

            // ========== PRIMARY METRICS ==========
            doc.setFontSize(12);
            doc.setTextColor(40);
            doc.text("Primary Metrics", 14, yPos);
            yPos += 5;



            const primaryData = [
                ["Metric", "Value", "Description"]
            ];

            const direction = testConfig?.direction || 'normal';

            // Upload row
            if (direction !== 'reverse') {
                primaryData.push(["Upload Throughput", `${parsed.senderThroughput.toFixed(2)} Mbps`, "Sender bandwidth"]);
            } else {
                primaryData.push(["Upload Throughput", "N/A", "Skipped (Reverse Mode)"]);
            }

            // Download row
            if (direction === 'reverse' || direction === 'bidirectional') {
                primaryData.push(["Download Throughput", `${parsed.receiverThroughput.toFixed(2)} Mbps`, "Receiver bandwidth"]);
            } else {
                primaryData.push(["Download Throughput", "N/A", "Skipped (Upload only)"]);
            }

            primaryData.push(
                ["Path MTU", `${parsed.mtu || 1500} bytes`, "Maximum Transmission Unit"],
                ["MSS", `${parsed.mss || 1460} bytes`, "Maximum Segment Size"],
                ["Retransmissions", `${parsed.retransmissions}`, "Total packets retransmitted"],
                ["Retransmit Rate", `${(parsed.retransmitRate || 0).toFixed(2)}/sec`, "Retransmissions per second"],
                ["Round-Trip Time (Measured)", `${rfc6349.estimatedRTT} ms`, "Actual Network latency (Ping)"],
                ["Bottleneck Bandwidth (Est.)", `${rfc6349.estimatedBandwidth} Mbps`, "Available bandwidth"]
            );

            if (parsed.cpuUtilization) {
                primaryData.push(["CPU Util (Sender)", `${parsed.cpuUtilization.hostTotal.toFixed(1)}%`, "Local Host Usage"]);
                primaryData.push(["CPU Util (Receiver)", `${parsed.cpuUtilization.remoteTotal.toFixed(1)}%`, "Remote Server Usage"]);
            }

            autoTable(doc, {
                head: [primaryData[0]],
                body: primaryData.slice(1),
                startY: yPos,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], textColor: 255 },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 14 }
            });

            yPos = (doc as any).lastAutoTable.finalY + 10;

            // ========== RFC 6349 ANALYSIS ==========
            doc.setFontSize(12);
            doc.setTextColor(40);
            doc.text("RFC 6349 Analysis", 14, yPos);
            yPos += 5;

            const rfc6349Data = [
                ["Parameter", "Value", "Optimal"],
                ["Bandwidth-Delay Product (BDP)", `${(rfc6349.bdp / 1024).toFixed(2)} KB`, "Calculated"],
                ["Ideal TCP Window Size", `${(rfc6349.idealWindowSize / 1024).toFixed(2)} KB`, "For max throughput"],
                ["Actual TCP Window Size", `${(rfc6349.actualWindowSize / 1024).toFixed(2)} KB`, "Current setting"],
                ["Transfer Efficiency", `${rfc6349.transferEfficiency.toFixed(1)}%`, "≥ 90%"],
                ["TCP Efficiency", `${Math.min(rfc6349.tcpEfficiency, 100).toFixed(1)}%`, "≥ 85%"],
                ["Buffer Delay", `${rfc6349.bufferDelay.toFixed(1)} ms`, "< RTT"],
                ["Packet Loss", `${rfc6349.packetLoss.toFixed(3)}%`, "< 0.1%"]
            ];

            autoTable(doc, {
                head: [rfc6349Data[0]],
                body: rfc6349Data.slice(1),
                startY: yPos,
                theme: 'grid',
                headStyles: { fillColor: [46, 125, 50], textColor: 255 },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 14 }
            });

            yPos = (doc as any).lastAutoTable.finalY + 10;

            // ========== RECOMMENDATIONS ==========
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.setTextColor(40);
            doc.text("Performance Recommendations", 14, yPos);
            yPos += 7;

            doc.setFontSize(9);
            doc.setTextColor(60);
            rfc6349.recommendations.forEach((rec, idx) => {
                const lines = doc.splitTextToSize(`${idx + 1}. ${rec}`, pageWidth - 28);
                lines.forEach((line: string) => {
                    if (yPos > 280) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(line, 14, yPos);
                    yPos += 5;
                });
            });

            yPos += 5;

            // ========== RAW LOGS ==========
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.setTextColor(40);
            doc.text("Raw Execution Logs", 14, yPos);
            yPos += 7;

            if (rawOutput) {
                const lines = rawOutput.split('\n');
                doc.setFont("courier", "normal");
                doc.setFontSize(7);
                doc.setTextColor(60);

                lines.forEach(line => {
                    if (yPos > 280) {
                        doc.addPage();
                        yPos = 20;
                    }
                    const cleanLine = line.replace(/[^\x20-\x7E]/g, '').substring(0, 100);
                    doc.text(cleanLine, 14, yPos);
                    yPos += 3.5;
                });
            }

            // ========== FOOTER ON ALL PAGES ==========
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                const pageHeight = doc.internal.pageSize.height;

                // Footer line
                doc.setDrawColor(200);
                doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

                // Footer text
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text("Praslab Network Testing Platform", 14, pageHeight - 10);
                doc.text(`https://praslab.com | hello@praslab.com`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
            }

            doc.save("praslab_rfc6349_report.pdf");
        } catch (err) {
            console.error("PDF generation failed", err);
            alert("Failed to generate PDF. Check console for details.");
        }
    };

    return (
        <div className="card mb-6 border-t-4 border-t-secondary">
            <h2 className="text-xl font-semibold mb-4 text-secondary flex justify-between items-center">
                <span>Test Results</span>
                {rawOutput && !isRunning && (
                    <button
                        onClick={generatePDF}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow flex items-center gap-2 transition-all"
                    >
                        <span>Download PDF Report</span>
                    </button>
                )}
            </h2>

            {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-4">
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div className="bg-gray-950 rounded-lg p-4 border border-gray-800 font-mono text-xs shadow-inner">
                <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-2">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Live Execution Log</span>
                    {isRunning ? (
                        <span className="flex items-center text-green-400 gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            Running...
                        </span>
                    ) : (
                        <span className="text-gray-600">Idle</span>
                    )}
                </div>
                <div
                    className="overflow-auto max-h-96 whitespace-pre-wrap text-green-400 custom-scrollbar"
                    style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
                >
                    {rawOutput || <span className="text-gray-600 italic">Waiting for test to start...</span>}
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #1f2937;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #4b5563; 
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #6b7280; 
                }
            `}</style>
        </div>
    );
};

export default ResultsPanel;
