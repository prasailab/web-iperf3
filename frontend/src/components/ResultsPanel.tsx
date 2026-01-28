import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ResultsPanelProps {
    results: any;
    error: string;
    rawOutput: string;
    isRunning: boolean;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ results, error, rawOutput, isRunning }) => {
    // Only hide if absolutely nothing is happening
    if (!results && !error && !rawOutput && !isRunning) return null;

    // Helper to generate PDF
    const generatePDF = () => {
        try {
            const doc = new jsPDF();

            // Header
            doc.setFontSize(22);
            doc.setTextColor(40, 40, 40);
            doc.text("Praslab Network Test Report", 14, 20);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

            // Parse Metrics from Log
            let senderThroughput = "0 Mbps";
            let receiverThroughput = "0 Mbps";
            let retransmits = "0";

            if (rawOutput) {
                // Simple regex parse of final lines from iperf3 text output
                // Example: [  5]   0.00-10.00  sec  100 MBytes  83.9 Mbits/sec    0             sender
                const senderMatch = rawOutput.match(/sec\s+[\d.]+\s+[KMG]Bytes\s+([\d.]+)\s+([KMG]bits\/sec)\s+(\d+)\s+sender/);
                if (senderMatch) {
                    senderThroughput = `${senderMatch[1]} ${senderMatch[2]}`;
                    retransmits = senderMatch[3];
                } else {
                    // Fallback for non-sender lines or standard summary
                    const simpleMatch = rawOutput.match(/sec\s+[\d.]+\s+[KMG]Bytes\s+([\d.]+)\s+([KMG]bits\/sec)\s+(\d+)?/);
                    if (simpleMatch) {
                        senderThroughput = `${simpleMatch[1]} ${simpleMatch[2]}`;
                        if (simpleMatch[3]) retransmits = simpleMatch[3];
                    }
                }

                const receiverMatch = rawOutput.match(/sec\s+[\d.]+\s+[KMG]Bytes\s+([\d.]+)\s+([KMG]bits\/sec)\s+receiver/);
                if (receiverMatch) {
                    receiverThroughput = `${receiverMatch[1]} ${receiverMatch[2]}`;
                } else {
                    // Fallback if no specific receiver line found (e.g. UDP might be different)
                    receiverThroughput = senderThroughput; // Assume symmetric report if missing
                }
            }

            const metrics = [
                ["Metric", "Value", "Description"],
                ["Sender Throughput", senderThroughput, "Upload bandwidth"],
                ["Receiver Throughput", receiverThroughput, "Download bandwidth"],
                ["Retransmissions", retransmits, "Packets retransmitted (Network congestion indicator)"],
                ["Test Status", error ? "Error" : "Completed", isRunning ? "Running" : "Finished"],
            ];

            autoTable(doc, {
                head: [metrics[0]],
                body: metrics.slice(1),
                startY: 40,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], textColor: 255 },
                styles: { fontSize: 10 }
            });

            // Raw Log Section
            const finalY = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(12);
            doc.setTextColor(40, 40, 40);
            doc.text("Raw Execution Logs:", 14, finalY);

            if (rawOutput) {
                const lines = rawOutput.split('\n');
                doc.setFont("courier", "normal");
                doc.setFontSize(8);

                let y = finalY + 10;
                const pageHeight = doc.internal.pageSize.height;
                const margin = 14;
                const lineHeight = 4;

                lines.forEach(line => {
                    if (y > pageHeight - 20) {
                        doc.addPage();
                        y = 20;
                    }
                    // Filter out clear-screen codes or excessive whitespace if needed
                    const cleanLine = line.replace(/[^\x20-\x7E]/g, '');
                    doc.text(cleanLine, margin, y);
                    y += lineHeight;
                });
            }

            doc.save("praslab_iperf_report.pdf");
        } catch (err) {
            console.error("PDF generation failed", err);
            alert("Failed to generate PDF. Check logs.");
        }
    };

    return (
        <div className="card mb-6 border-t-4 border-t-secondary">
            <h2 className="text-xl font-semibold mb-4 text-secondary flex justify-between items-center">
                <span>Test Results</span>
                {/* Show Download button only if we have output and not running */}
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

            {/* Raw Output Terminal */}
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
