import React, { useEffect, useState } from 'react';

// Define types locally or import
interface PublicServer {
    name: string;
    hostname: string;
    location: string;
    region: string;
    speed: string;
    tcpCongestion: string;
    ports: string;
    ipVersion: string;
}

interface ServerSelectorProps {
    mode: 'public' | 'private';
    setMode: (mode: 'public' | 'private') => void;
    selectedServer: PublicServer | null;
    setSelectedServer: (server: PublicServer | null) => void;
    privateHost: string;
    setPrivateHost: (host: string) => void;
    port: string;
    setPort: (port: string) => void;
    ipVersion: 'ipv4' | 'ipv6';
    setIpVersion: (version: 'ipv4' | 'ipv6') => void;
}

const ServerSelector: React.FC<ServerSelectorProps> = ({
    mode,
    setMode,
    selectedServer,
    setSelectedServer,
    privateHost,
    setPrivateHost,
    port,
    setPort,
    ipVersion,
    setIpVersion
}) => {
    const [servers, setServers] = useState<PublicServer[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (mode === 'public') {
            setLoading(true);
            fetch('/api/public-servers')
                .then(res => {
                    if (!res.ok) throw new Error(`API Error: ${res.status}`);
                    return res.json();
                })
                .then(data => {
                    setServers(data);
                    if (data.length > 0 && !selectedServer) {
                        setSelectedServer(data[0]);
                    }
                })
                .catch(err => {
                    console.error(err);
                    setError('Failed to load servers. Ensure backend is running.');
                })
                .finally(() => setLoading(false));
        }
    }, [mode]); // Load on mode switch or init

    return (
        <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-primary">Target Server</h2>

            {/* Mode Toggle */}
            <div className="flex space-x-4 mb-4">
                <button
                    className={`flex-1 py-2 rounded-md font-medium transition-colors ${mode === 'public' ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    onClick={() => setMode('public')}
                >
                    Public Server List
                </button>
                <button
                    className={`flex-1 py-2 rounded-md font-medium transition-colors ${mode === 'private' ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    onClick={() => setMode('private')}
                >
                    Private Server
                </button>
            </div>

            {mode === 'public' ? (
                <div>
                    {loading && <p className="text-gray-400">Loading servers...</p>}
                    {error && <p className="text-red-400">{error}</p>}
                    {!loading && !error && (
                        <div className="space-y-4">
                            <label className="block text-sm text-gray-400 mb-1">Select Server</label>
                            <select
                                className="input-field"
                                value={selectedServer?.hostname || ''}
                                onChange={(e) => {
                                    const s = servers.find(s => s.hostname === e.target.value);
                                    if (s) setSelectedServer(s);
                                }}
                            >
                                {servers.map((s) => (
                                    <option key={s.hostname} value={s.hostname}>
                                        {s.region} - {s.location} - {s.name} ({s.speed})
                                    </option>
                                ))}
                            </select>

                            {selectedServer && (
                                <div className="bg-gray-900 p-4 rounded-md">
                                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                        <div><span className="text-gray-500">Host:</span> {selectedServer.hostname}</div>
                                        <div><span className="text-gray-500">Ports Available:</span> {selectedServer.ports}</div>
                                        <div><span className="text-gray-500">Speed:</span> {selectedServer.speed}</div>
                                        <div><span className="text-gray-500">CC:</span> {selectedServer.tcpCongestion}</div>
                                    </div>

                                    {/* Editable Port for Public Server */}
                                    <div className="mt-3">
                                        <label className="block text-sm text-gray-400 mb-1">Target Port (Required)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="input-field flex-1"
                                                value={port}
                                                onChange={(e) => setPort(e.target.value)}
                                                placeholder="e.g. 5201"
                                            />
                                            <span className="text-xs text-gray-500 self-center">
                                                Manually select a port from availability
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end mt-2">
                                        <a href={`/api/ping?host=${selectedServer.hostname}`} target="_blank" rel="noreferrer"
                                            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-200"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                alert(`To ping, use the 'Measure RTT' button below in the BDP Calculator section, or just run the test.`);
                                            }}
                                        >
                                            Check RTT
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Hostname or IP</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="e.g. 192.168.1.5 or example.com"
                            value={privateHost}
                            onChange={(e) => setPrivateHost(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Port</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="5201"
                                value={port}
                                onChange={(e) => setPort(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">IP Version</label>
                            <select
                                className="input-field"
                                value={ipVersion}
                                onChange={(e) => setIpVersion(e.target.value as 'ipv4' | 'ipv6')}
                            >
                                <option value="ipv4">IPv4</option>
                                <option value="ipv6">IPv6</option>
                            </select>
                        </div>
                    </div>
                    <p className="text-xs text-yellow-500 mt-2">
                        Note: Ensure an iperf3 server is running on the target machine (<code>iperf3 -s</code>).
                    </p>
                </div>
            )}
        </div>
    );
};

export default ServerSelector;
