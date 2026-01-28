import React, { useState } from 'react';
import ServerSelector from './components/ServerSelector';
import TestConfigForm from './components/TestConfigForm';
import ResultsPanel from './components/ResultsPanel';
import BDPCalculator from './components/BDPCalculator';

function App() {
  // Server State
  const [mode, setMode] = useState<'public' | 'private'>('public');
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [privateHost, setPrivateHost] = useState('');
  const [privatePort, setPrivatePort] = useState('');
  const [ipVersion, setIpVersion] = useState<'ipv4' | 'ipv6'>('ipv4');

  // Test Config State
  const [protocol, setProtocol] = useState<'tcp' | 'udp'>('tcp');
  const [direction, setDirection] = useState<'normal' | 'reverse' | 'bidirectional'>('normal');
  const [duration, setDuration] = useState(10);
  const [streams, setStreams] = useState(1);
  const [bitrate, setBitrate] = useState('10M');
  const [customArgs, setCustomArgs] = useState('');

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');
  const [rawOutput, setRawOutput] = useState('');

  const runTest = async () => {
    setIsRunning(true);
    setResults(null);
    setError('');
    setRawOutput('');

    const host = mode === 'public' ? selectedServer?.hostname : privateHost;
    if (!host) {
      setError('Please select a server or enter a hostname.');
      setIsRunning(false);
      return;
    }

    // Port logic
    let port: number | string | undefined;
    if (mode === 'private' && privatePort) {
      port = privatePort;
    } else if (mode === 'public' && selectedServer) {
      const portsStr = selectedServer.ports;
      if (portsStr.includes('-')) {
        const [start, end] = portsStr.split('-').map(Number);
        port = Math.floor(Math.random() * (end - start + 1)) + start;
      } else if (portsStr.includes(',')) {
        const list = portsStr.split(',').map((s: string) => s.trim());
        port = list[Math.floor(Math.random() * list.length)];
      } else {
        port = parseInt(portsStr);
      }
    }

    const payload = {
      mode,
      protocol,
      ipVersion: mode === 'public' && selectedServer?.ipVersion.includes('IPv6') && ipVersion === 'ipv6' ? 'ipv6' : 'ipv4',
      serverHost: host,
      port,
      duration,
      parallelStreams: protocol === 'tcp' ? streams : undefined,
      reverse: direction === 'reverse',
      bidirectional: direction === 'bidirectional',
      bitrate: protocol === 'udp' ? bitrate : undefined,
      extraArgs: customArgs
    };

    try {
      // Clear previous
      setRawOutput('Connecting to server...\n');
      setResults(null);

      // Bypass Vite proxy to rule out buffering issues
      const backendUrl = 'http://localhost:3000/api/run-iperf-stream';
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.body) {
        throw new Error('ReadableStream not supported in this browser.');
      }

      setRawOutput((prev) => prev + 'Connected. Starting stream...\n\n');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullOutput = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value || new Uint8Array(), { stream: !done });

        if (chunk) {
          setRawOutput((prev) => prev + chunk);
        }
        fullOutput += chunk;
      }

      // Parse Speedometer
      // buffer += chunk;
      // const lines = buffer.split('\n');
      // // Keep the last incomplete line in buffer
      // buffer = lines.pop() || '';

      // for (const line of lines) {
      //   // Regex for: [  5]   1.00-2.00   sec  10.0 MBytes  83.9 Mbits/sec
      //   // Matches Mbits/sec or Gbits/sec
      //   const match = line.match(/sec\s+[\d.]+\s+[KMG]Bytes\s+([\d.]+)\s+([KMG]bits\/sec)/);
      //   if (match) {
      //     const val = parseFloat(match[1]);
      //     const unit = match[2];
      //     // Normalize to Mbps
      //     let speedMbps = val;
      //     if (unit.startsWith('G')) speedMbps *= 1000;
      //     if (unit.startsWith('K')) speedMbps /= 1000;
      //     // Update transient state for speedometer (not created yet, need to add state)
      //     setCurrentSpeed(speedMbps);
      //   }
      // }

      // Parse final results from text for the panel (Legacy support for structured data)
      // Since we don't get JSON anymore, we must construct a dummy result object OR update ResultsPanel to parse text.
      // We'll leave results as null and act on rawOutput in ResultsPanel.

    } catch (e: any) {
      setError('Network error: ' + e.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 text-center flex flex-col items-center">
          <img
            src="/logo.jpg"
            alt="Praslab Logo"
            className="h-16 mb-4 rounded-full shadow-lg"
            style={{ maxHeight: '64px', width: 'auto', maxWidth: '100%' }}
          />
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-2">
            Web iPerf3 Tool
          </h1>
          <p className="text-gray-400">Measure network performance with TCP/UDP tests & BDP calculations</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <ServerSelector
              mode={mode} setMode={setMode}
              selectedServer={selectedServer} setSelectedServer={setSelectedServer}
              privateHost={privateHost} setPrivateHost={setPrivateHost}
              privatePort={privatePort} setPrivatePort={setPrivatePort}
              ipVersion={ipVersion} setIpVersion={setIpVersion}
            />

            <TestConfigForm
              protocol={protocol} setProtocol={setProtocol}
              direction={direction} setDirection={setDirection}
              duration={duration} setDuration={setDuration}
              streams={streams} setStreams={setStreams}
              bitrate={bitrate} setBitrate={setBitrate}
              customArgs={customArgs} setCustomArgs={setCustomArgs}
              onRunKey={runTest}
              isRunning={isRunning}
            />

            <ResultsPanel
              results={results}
              error={error}
              rawOutput={rawOutput}
              isRunning={isRunning}
            />
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <BDPCalculator currentHost={mode === 'public' ? selectedServer?.hostname : privateHost} />
            </div>
          </div>
        </div>

        <footer className="mt-12 text-center text-gray-600 text-sm">
          <p>&copy; {new Date().getFullYear()} Prasath Suthagar @Praslab.com. Open Source License.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
