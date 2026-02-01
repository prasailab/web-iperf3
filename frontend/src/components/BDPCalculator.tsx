import React, { useState } from 'react';

// Use backend to calculate or local. Since user wants backend implementation we can fetch.

interface BDPCalculatorProps {
    currentHost?: string; // To prefill
}

const BDPCalculator: React.FC<BDPCalculatorProps> = ({ currentHost }) => {
    const [host, setHost] = useState(currentHost || '');

    // Sync logic to update host when prop changes
    React.useEffect(() => {
        if (currentHost) setHost(currentHost);
    }, [currentHost]);

    const [rtt, setRtt] = useState<number | ''>('');
    const [bw, setBw] = useState<number | ''>(''); // Mbps
    const [result, setResult] = useState<any>(null);
    const [loadingPing, setLoadingPing] = useState(false);
    const [loadingCalc, setLoadingCalc] = useState(false);
    const [pingError, setPingError] = useState('');

    const measureRTT = async () => {
        if (!host) {
            setPingError('Enter host first');
            return;
        }
        setLoadingPing(true);
        setPingError('');
        try {
            const res = await fetch(`/api/ping?host=${encodeURIComponent(host)}`);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response');
            }
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            if (data.rttAvg) setRtt(data.rttAvg);
            else throw new Error('No RTT returned');
        } catch (e: any) {
            setPingError(e.message || 'Ping failed');
        } finally {
            setLoadingPing(false);
        }
    };

    const calculate = async () => {
        if (!rtt || !bw) return;
        setLoadingCalc(true);
        try {
            const res = await fetch('/api/calculate-bdp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bandwidthMbps: Number(bw), rttMs: Number(rtt) })
            });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            const data = await res.json();
            if (data.error) {
                setPingError(data.error);
                return;
            }
            setResult(data);
        } catch (e: any) {
            setPingError(e.message || 'Calculation failed');
        } finally {
            setLoadingCalc(false);
        }
    };

    // Derived metric: Max throughput with standard 64KB window
    // Tput = Window / RTT
    const maxTput64k = rtt ? ((64 * 1024 * 8) / (Number(rtt) / 1000)) / 1000000 : 0;

    return (
        <div className="card border-l-4 border-l-accent">
            <h2 className="text-xl font-semibold mb-2 text-accent">BDP & TCP Throughput Calculator</h2>
            <p className="text-sm text-gray-400 mb-4">
                Calculate Bandwidth-Delay Product to tune TCP window sizes. Ref: <a href="https://www.rfc-editor.org/rfc/rfc6349.html" target="_blank" className="text-blue-400 hover:underline">RFC 6349</a>.
            </p>

            {/* Changed from grid to vertical stack for full width */}
            <div className="space-y-6">
                <div className="space-y-4">
                    {/* Host Input */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Target Host</label>
                        <input
                            type="text"
                            className="input-field"
                            value={host}
                            onChange={(e) => setHost(e.target.value)}
                            placeholder="hostname or IP"
                        />
                    </div>

                    {/* RTT Input */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Round Trip Time (ms)</label>
                        <div className="flex space-x-2">
                            <input
                                type="number"
                                className="input-field flex-1"
                                value={rtt}
                                onChange={(e) => setRtt(parseFloat(e.target.value))}
                                placeholder="e.g. 50"
                            />
                            <button
                                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm whitespace-nowrap"
                                onClick={measureRTT}
                                disabled={loadingPing}
                            >
                                {loadingPing ? 'Test...' : 'Measure RTT'}
                            </button>
                        </div>
                        {pingError ? (
                            <span className="text-xs text-red-500 block mt-1">{pingError}</span>
                        ) : (
                            !host ? <span className="text-xs text-gray-500 block mt-1">Select/Enter host above to measure.</span> :
                                <span className="text-xs text-gray-500 block mt-1">Ready to measure RTT to: {host}</span>
                        )}
                    </div>

                    {/* Bandwidth Input */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Bottleneck Bandwidth (Mbps)</label>
                        <input
                            type="number"
                            className="input-field"
                            value={bw}
                            onChange={(e) => setBw(parseFloat(e.target.value))}
                            placeholder="e.g. 1000"
                        />
                    </div>

                    <button
                        className="w-full py-2 bg-accent hover:bg-violet-600 text-white rounded font-medium"
                        onClick={calculate}
                        disabled={!rtt || !bw || loadingCalc}
                    >
                        Calculate
                    </button>
                </div>

                {/* Results Section - Full Width */}
                <div className="bg-gray-900 rounded p-4 flex flex-col justify-center">
                    {!result ? (
                        <div className="text-center text-gray-500 py-4">
                            Results will appear here
                        </div>
                    ) : (
                        <div className="space-y-4 text-sm">
                            <h3 className="font-semibold text-gray-300 border-b border-gray-700 pb-1">Calculation Results</h3>

                            {/* BDP */}
                            <div className="flex justify-between items-start">
                                <span className="text-gray-400">BDP</span>
                                <div className="text-right">
                                    <div className="font-mono text-white text-lg font-bold">
                                        {(result.bdpBits / 8 / 1024 / 1024).toFixed(2)} MByte
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {(result.bdpBits / 1000000).toFixed(2)} Mbits
                                    </div>
                                </div>
                            </div>

                            {/* Required Window */}
                            <div className="flex justify-between items-center border-t border-gray-800 pt-2">
                                <span className="text-gray-400">Required TCP Window</span>
                                <div className="text-right">
                                    <span className="font-mono text-secondary font-bold text-lg">
                                        {(result.rwndBytes / 1024).toFixed(1)} KByte
                                    </span>
                                </div>
                            </div>

                            {/* Standard Window Perf */}
                            <div className="flex justify-between items-center border-t border-gray-800 pt-2">
                                <span className="text-gray-400">Max tput with 64KB Window</span>
                                <div className="text-right">
                                    <span className="font-mono text-yellow-400 font-bold">
                                        {maxTput64k.toFixed(2)} Mbps
                                    </span>
                                </div>
                            </div>

                            {/* Theoretical Max */}
                            <div className="flex justify-between items-center border-t border-gray-800 pt-2">
                                <span className="text-gray-400">Theoretical Link Max</span>
                                <div className="text-right">
                                    <span className="font-mono text-primary font-bold">
                                        {result.theoreticalThroughputMbps} Mbps
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BDPCalculator;
