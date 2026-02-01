import { useState } from 'react';
import ServerSelector from './components/ServerSelector';
import TestConfigForm from './components/TestConfigForm';
import ResultsPanel from './components/ResultsPanel';
import BDPCalculator from './components/BDPCalculator';

function App() {
  // Server State
  const [mode, setMode] = useState<'public' | 'private'>('public');
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [privateHost, setPrivateHost] = useState('');
  const [port, setPort] = useState('5201'); // Unified port state

  // Test Configuration State
  const [protocol, setProtocol] = useState<'tcp' | 'udp'>('tcp');
  const [ipVersion, setIpVersion] = useState<'ipv4' | 'ipv6'>('ipv4');
  const [duration, setDuration] = useState(10);
  const [parallelStreams, setParallelStreams] = useState(1);
  const [direction, setDirection] = useState<'normal' | 'reverse' | 'bidirectional'>('normal');
  const [bitrate, setBitrate] = useState('');
  const [customArgs, setCustomArgs] = useState('');

  // Results State
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');
  const [rawOutput, setRawOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [actualRTT, setActualRTT] = useState<number | undefined>(undefined);

  const runTest = async () => {
    setRunning(true);
    setError('');

    const serverHost = mode === 'public' && selectedServer
      ? selectedServer.hostname
      : privateHost;

    console.log('[Frontend] Test config:', { mode, selectedServer, privateHost, serverHost, port });

    if (!serverHost || serverHost.trim() === '') {
      setError('Please select or enter a server hostname');
      setRunning(false);
      return;
    }

    const payload = {
      mode,
      protocol,
      ipVersion,
      serverHost,
      port: parseInt(port) || 5201,
      duration,
      parallelStreams,
      reverse: direction === 'reverse',
      bidirectional: direction === 'bidirectional',
      bitrate: protocol === 'udp' ? bitrate : undefined,
      extraArgs: customArgs
    };

    try {
      // Clear previous
      setRawOutput('Connecting to server...\n');
      setResults(null);
      setActualRTT(undefined);

      // Step 1: Run Ping to get RTT
      let currentRtt = 50; // Default fallback
      if (mode === 'public' && selectedServer) {
        // Skip ping for public servers or implement if needed (CORS might be issue, but we use backend proxy)
        // For now, let's try to ping the hostname
        console.log('[Frontend] Pinging server:', serverHost);
        setRawOutput((prev) => prev + `Pinging ${serverHost}...\n`);
        try {
          const pingRes = await fetch(`http://localhost:3000/api/ping?host=${encodeURIComponent(serverHost)}`);
          const pingData = await pingRes.json();
          if (pingData.rttAvg) {
            currentRtt = pingData.rttAvg;
            setActualRTT(currentRtt);
            setRawOutput((prev) => prev + `Ping successful. RTT: ${currentRtt} ms\n\n`);
          } else {
            setRawOutput((prev) => prev + `Ping failed or no RTT. Using default.\n\n`);
          }
        } catch (e) {
          console.error('[Frontend] Ping error:', e);
          setRawOutput((prev) => prev + `Ping error. Using default.\n\n`);
        }
      } else if (mode === 'private') {
        console.log('[Frontend] Pinging server:', serverHost);
        setRawOutput((prev) => prev + `Pinging ${serverHost}...\n`);
        try {
          const pingRes = await fetch(`http://localhost:3000/api/ping?host=${encodeURIComponent(serverHost)}`);
          const pingData = await pingRes.json();
          if (pingData.rttAvg) {
            currentRtt = pingData.rttAvg;
            setActualRTT(currentRtt);
            setRawOutput((prev) => prev + `Ping successful. RTT: ${currentRtt} ms\n\n`);
          } else {
            setRawOutput((prev) => prev + `Ping failed or no RTT. Using default.\n\n`);
          }
        } catch (e) {
          console.error('[Frontend] Ping error:', e);
          setRawOutput((prev) => prev + `Ping error. Using default.\n\n`);
        }
      }

      // Start the test and get session ID
      const backendUrl = 'http://localhost:3000/api/run-iperf-stream';
      console.log('[Frontend] Starting test, requesting session ID');

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const { sessionId } = await response.json();
      console.log('[Frontend] Got session ID:', sessionId);

      setRawOutput((prev) => prev + 'Connected. Starting test...\n\n');

      // Poll for output
      let nextIndex = 0;
      let pollInterval: any;

      const poll = async () => {
        try {
          const pollUrl = `http://localhost:3000/api/iperf-poll/${sessionId}?fromIndex=${nextIndex}`;
          const pollResponse = await fetch(pollUrl);

          if (!pollResponse.ok) {
            console.error('[Frontend] Poll failed:', pollResponse.status);
            return;
          }

          const data = await pollResponse.json();
          console.log(`[Frontend] Poll returned ${data.lines.length} lines, complete: ${data.isComplete}`);

          // Append new lines
          if (data.lines.length > 0) {
            const newOutput = data.lines.join('\n') + '\n';
            setRawOutput((prev) => prev + newOutput);
            nextIndex = data.nextIndex;
          }

          // Check if complete
          if (data.isComplete) {
            clearInterval(pollInterval);
            console.log('[Frontend] Test complete');

            if (data.error) {
              // Check if it's a connection timeout error
              const isConnectionTimeout = data.error.includes('unable to connect') ||
                data.error.includes('Connection timed out') ||
                data.error.includes('Connection refused');

              // Check if it's a generic exit code error and we have logs
              // "Exited with code 1" isn't helpful to show in red if we have logs.
              // The logs usually contain the real error (e.g. "unable to receive results")
              const isExitCodeError = data.error.includes('Exited with code');
              const isKnownError = isExitCodeError || data.error.includes('unable to receive results');

              const isNonFatal = isKnownError && nextIndex > 5;

              if (isConnectionTimeout && mode === 'public' && selectedServer) {
                // Suggest alternative ports
                const availablePorts = selectedServer.ports || '5201-5209';
                setError(`Connection failed to ${serverHost}:${port}\n\n` +
                  `💡 Suggestions:\n` +
                  `• Try a different port from available: ${availablePorts}\n` +
                  `• Port ${port} might be busy or blocked by firewall\n` +
                  `• Try selecting a different public server\n\n` +
                  `Original error: ${data.error}`);
              } else if (isNonFatal) {
                console.warn('[Frontend] Suppressing non-fatal error:', data.error);
                setRawOutput(prev => prev + '\n\n[Warning] Test finished: ' + data.error);
              } else {
                setError(data.error);
              }
            }
            setRunning(false);
          }
        } catch (err) {
          console.error('[Frontend] Poll error:', err);
        }
      };

      // Poll every 100ms
      pollInterval = setInterval(poll, 100);

      // Initial poll
      await poll();

    } catch (error: any) {
      setError(error.message || 'Unknown error');
      console.error('[Frontend] Error:', error);
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="text-center py-8 flex flex-col items-center justify-center">
          {/* Logo */}
          <img
            src="/logo.jpg"
            alt="Praslab Logo"
            className="h-24 w-24 object-cover rounded-full mb-6 border-4 border-secondary shadow-lg hover:rotate-12 transition-transform duration-500"
          />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Praslab Network Test
          </h1>
          <p className="text-gray-400 mt-2">Professional iPerf3 Testing Platform</p>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Server + Config */}
          <div className="lg:col-span-2 space-y-6">
            <ServerSelector
              mode={mode}
              setMode={setMode}
              selectedServer={selectedServer}
              setSelectedServer={setSelectedServer}
              privateHost={privateHost}
              setPrivateHost={setPrivateHost}
              port={port}
              setPort={setPort}
              ipVersion={ipVersion}
              setIpVersion={setIpVersion}
            />

            <TestConfigForm
              protocol={protocol}
              setProtocol={setProtocol}
              duration={duration}
              setDuration={setDuration}
              streams={parallelStreams}
              setStreams={setParallelStreams}
              direction={direction}
              setDirection={setDirection}
              bitrate={bitrate}
              setBitrate={setBitrate}
              customArgs={customArgs}
              setCustomArgs={setCustomArgs}
              isRunning={running}
              onRunKey={runTest}
            />

            <ResultsPanel
              results={results}
              error={error}
              rawOutput={rawOutput}
              isRunning={running}
              actualRTT={actualRTT} // Passed from automated ping
              testConfig={{
                direction,
                customArgs,
                protocol,
                duration,
                streams: parallelStreams,
                mss: customArgs.match(/-M\s+(\d+)/)?.[1] // Extract MSS from args if present
              }}
            />
          </div>

          {/* Right Column: BDP Calculator */}
          <div>
            <BDPCalculator
              currentHost={mode === 'public' && selectedServer ? selectedServer.hostname : privateHost}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
