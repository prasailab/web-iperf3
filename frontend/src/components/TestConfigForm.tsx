import React from 'react';

interface TestConfigProps {
    protocol: 'tcp' | 'udp';
    setProtocol: (p: 'tcp' | 'udp') => void;
    direction: 'normal' | 'reverse' | 'bidirectional';
    setDirection: (d: 'normal' | 'reverse' | 'bidirectional') => void;
    duration: number;
    setDuration: (d: number) => void;
    streams: number;
    setStreams: (s: number) => void;
    bitrate: string;
    setBitrate: (b: string) => void;
    customArgs: string;
    setCustomArgs: (args: string) => void;
    onRunKey: () => void;
    isRunning: boolean;
}

const TestConfigForm: React.FC<TestConfigProps> = ({
    protocol,
    setProtocol,
    direction,
    setDirection,
    duration,
    setDuration,
    streams,
    setStreams,
    bitrate,
    setBitrate,
    customArgs,
    setCustomArgs,
    onRunKey,
    isRunning
}) => {
    return (
        <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-primary">Test Configuration</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Protocol */}
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Protocol</label>
                    <div className="flex space-x-2">
                        <button
                            className={`flex-1 py-1 rounded border border-gray-600 ${protocol === 'tcp' ? 'bg-primary border-primary' : 'bg-gray-800'}`}
                            onClick={() => setProtocol('tcp')}
                        >TCP</button>
                        <button
                            className={`flex-1 py-1 rounded border border-gray-600 ${protocol === 'udp' ? 'bg-primary border-primary' : 'bg-gray-800'}`}
                            onClick={() => setProtocol('udp')}
                        >UDP</button>
                    </div>
                </div>

                {/* Direction */}
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Direction</label>
                    <div className="flex flex-col space-y-2 mt-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="radio"
                                name="direction"
                                checked={direction === 'normal'}
                                onChange={() => setDirection('normal')}
                                className="form-radio text-primary"
                            />
                            <span>Upload (Client &rarr; Server)</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="radio"
                                name="direction"
                                checked={direction === 'reverse'}
                                onChange={() => setDirection('reverse')}
                                className="form-radio text-primary"
                            />
                            <span>Download (Server &rarr; Client)</span>
                        </label>
                    </div>
                </div>

                {/* Duration */}
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Duration (seconds)</label>
                    <input
                        type="number"
                        className="input-field"
                        min={1} max={60}
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                    />
                </div>

                {/* Streams (TCP ONLY) */}
                {protocol === 'tcp' && (
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Parallel Streams</label>
                        <input
                            type="number"
                            className="input-field"
                            min={1} max={10}
                            value={streams}
                            onChange={(e) => setStreams(parseInt(e.target.value))}
                        />
                    </div>
                )}

                {/* Bitrate (UDP ONLY) */}
                {protocol === 'udp' && (
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Target Bitrate (e.g. 10M, 1G)</label>
                        <input
                            type="text"
                            className="input-field"
                            value={bitrate}
                            onChange={(e) => setBitrate(e.target.value)}
                            placeholder="10M"
                        />
                    </div>
                )}
            </div>

            {/* Custom Args */}
            <div className="mt-4">
                <label className="block text-sm text-gray-400 mb-1">Extra Arguments (Caution)</label>
                <input
                    type="text"
                    className="input-field text-sm font-mono text-yellow-300"
                    value={customArgs}
                    onChange={(e) => setCustomArgs(e.target.value)}
                    placeholder="e.g. -V -d"
                />
                <p className="text-xs text-gray-500 mt-1">Appended to iperf3 command. Only safe flags allowed.</p>
            </div>

            <div className="mt-6">
                <button
                    className={`btn-primary w-full py-3 text-lg font-bold shadow-lg ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={onRunKey}
                    disabled={isRunning}
                >
                    {isRunning ? 'Running Test...' : 'Start iperf3 Test'}
                </button>
            </div>
        </div>
    );
};

export default TestConfigForm;
