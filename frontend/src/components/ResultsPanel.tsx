import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ResultsPanelProps {
    results: any;
    error: string;
    rawOutput: string;
    isRunning: boolean;
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
    retransmitRate?: number;  // Retransmissions per second
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

    // Parse sender line: [  5]   0.00-10.00  sec  100 MBytes  83.9 Mbits/sec    0             sender
    const senderMatch = rawOutput.match(/sec\s+([\d.]+)\s+([KMG])Bytes\s+([\d.]+)\s+([KMG])bits\/sec\s+(\d+)\s+sender/);
    if (senderMatch) {
        let throughput = parseFloat(senderMatch[3]);
        const unit = senderMatch[4];
        if (unit === 'G') throughput *= 1000;
        if (unit === 'K') throughput /= 1000;
        metrics.senderThroughput = throughput;
        metrics.retransmissions = parseInt(senderMatch[5]);

        let bytes = parseFloat(senderMatch[1]);
        const byteUnit = senderMatch[2];
        if (byteUnit === 'G') bytes *= 1024 * 1024 * 1024;
        else if (byteUnit === 'M') bytes *= 1024 * 1024;
        else if (byteUnit === 'K') bytes *= 1024;
        metrics.totalBytes = bytes;
    }

    // Parse receiver line
    const receiverMatch = rawOutput.match(/sec\s+([\d.]+)\s+([KMG])Bytes\s+([\d.]+)\s+([KMG])bits\/sec\s+receiver/);
    if (receiverMatch) {
        let throughput = parseFloat(receiverMatch[3]);
        const unit = receiverMatch[4];
        if (unit === 'G') throughput *= 1000;
        if (unit === 'K') throughput /= 1000;
        metrics.receiverThroughput = throughput;
    } else {
        metrics.receiverThroughput = metrics.senderThroughput;
    }

    // Try to extract duration
    const durationMatch = rawOutput.match(/0\.00-([\d.]+)\s+sec/);
    if (durationMatch) {
        metrics.duration = parseFloat(durationMatch[1]);
    }

    // Extract MTU/MSS if present in output
    // iPerf3 may show: "local ... port ... connected to ... port ... (MSS=1460)"
    const mssMatch = rawOutput.match(/MSS=(\d+)/);
    if (mssMatch) {
        metrics.mss = parseInt(mssMatch[1]);
        // MTU = MSS + TCP header (20) + IP header (20)
        metrics.mtu = metrics.mss + 40;
    } else {
        // Default Ethernet MTU
        metrics.mtu = 1500;
        metrics.mss = 1460;
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
    const theoreticalMaxMbps = (actualWindowSize * 8) / rttSec / 1000000;
    const tcpEfficiency = (throughput / theoreticalMaxMbps) * 100;

    // Buffer delay
    const throughputBps = throughput * 1000000;
    const bufferDelay = throughputBps > 0 ? ((actualWindowSize * 8) / throughputBps * 1000) - estimatedRTT : 0;

    // Packet loss
    const estimatedPackets = parsed.totalBytes / 1460;  // Assume ~1460 byte packets
    const packetLoss = estimatedPackets > 0 ? (parsed.retransmissions / estimatedPackets) * 100 : 0;

    // Performance grade
    let grade = 'Poor';
    if (transferEfficiency >= 90 && packetLoss < 0.1 && tcpEfficiency >= 85) grade = 'Excellent';
    else if (transferEfficiency >= 75 && packetLoss < 1 && tcpEfficiency >= 70) grade = 'Good';
    else if (transferEfficiency >= 50 && packetLoss < 5) grade = 'Fair';

    // Recommendations
    const recommendations: string[] = [];
    if (actualWindowSize < idealWindowSize * 0.8) {
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
        actualWindowSize,
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

const ResultsPanel: React.FC<ResultsPanelProps> = ({ results, error, rawOutput, isRunning }) => {
    if (!results && !error && !rawOutput && !isRunning) return null;

    const generatePDF = () => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            let yPos = 20;

            // ========== HEADER ==========
            doc.setFontSize(20);
            doc.setTextColor(41, 128, 185);
            doc.text("RFC 6349 Network Performance Report", pageWidth / 2, yPos, { align: 'center' });

            yPos += 8;
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
            doc.text("Praslab Network Testing Platform", pageWidth / 2, yPos + 5, { align: 'center' });

            yPos += 15;

            // Parse metrics
            const parsed = parseIperfOutput(rawOutput);
            const rfc6349 = calculateRFC6349Metrics(parsed);

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
                ["Protocol", "TCP"],
                ["Direction", "Upload"],
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
                ["Metric", "Value", "Description"],
                ["Upload Throughput", `${parsed.senderThroughput.toFixed(2)} Mbps`, "Sender bandwidth"],
                ["Download Throughput", `${parsed.receiverThroughput.toFixed(2)} Mbps`, "Receiver bandwidth"],
                ["Path MTU", `${parsed.mtu || 1500} bytes`, "Maximum Transmission Unit"],
                ["MSS", `${parsed.mss || 1460} bytes`, "Maximum Segment Size"],
                ["Retransmissions", `${parsed.retransmissions}`, "Total packets retransmitted"],
                ["Retransmit Rate", `${(parsed.retransmitRate || 0).toFixed(2)}/sec`, "Retransmissions per second"],
                ["Round-Trip Time (Est.)", `${rfc6349.estimatedRTT} ms`, "Network latency"],
                ["Bottleneck Bandwidth (Est.)", `${rfc6349.estimatedBandwidth} Mbps`, "Available bandwidth"]
            ];

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
