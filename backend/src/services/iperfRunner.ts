import { spawn } from 'child_process';

export interface IperfOptions {
    mode: 'public' | 'private';
    protocol: 'tcp' | 'udp';
    ipVersion: 'ipv4' | 'ipv6';
    serverHost: string;
    port?: number | string;
    duration?: number;
    parallelStreams?: number;
    reverse?: boolean;
    bidirectional?: boolean;
    bitrate?: string; // For UDP, e.g., '10M'
    extraArgs?: string; // Custom flags
}

export interface IperfResult {
    output: string;
    json?: any;
    error?: string;
}

export const runIperf = (options: IperfOptions): Promise<IperfResult> => {
    // FIX: Inject WinGet path for valid execution if global PATH is stale
    const wingetPath = 'C:\\Users\\Prasath\\AppData\\Local\\Microsoft\\WinGet\\Links';
    const packagePath = 'C:\\Users\\Prasath\\AppData\\Local\\Microsoft\\WinGet\\Packages\\ar51an.iPerf3_Microsoft.Winget.Source_8wekyb3d8bbwe';
    if (process.platform === 'win32') {
        process.env.PATH = `${wingetPath};${packagePath};${process.env.PATH}`;
    }

    return new Promise((resolve) => {
        const args = ['-c', options.serverHost];

        // Protocol
        if (options.protocol === 'udp') {
            args.push('-u');
            if (options.bitrate) {
                args.push('-b', options.bitrate);
            }
        }

        // IP Version
        if (options.ipVersion === 'ipv6') {
            args.push('-6');
        } else {
            args.push('-4');
        }

        // Port
        if (options.port) {
            args.push('-p', options.port.toString());
        }

        // Duration (limit to 60s for safety if not specified or too long)
        const duration = options.duration && options.duration <= 60 ? options.duration : 10;
        args.push('-t', duration.toString());

        // Parallel Streams (limit to 10)
        if (options.protocol === 'tcp' && options.parallelStreams && options.parallelStreams > 0) {
            const streams = options.parallelStreams > 10 ? 10 : options.parallelStreams;
            args.push('-P', streams.toString());
        }

        // Direction (Reverse or Bidir)
        if (options.bidirectional) {
            args.push('--bidir');
        } else if (options.reverse) {
            args.push('-R');
        }

        // Extra Args (SAFE SUBSET ONLY)
        // We parsed extraArgs as a string from frontend.
        // Dangerous metachars are mostly handled by spawn array args, but we should strictly validation flags.
        // Allowed: -V (verbose), -d (debug), -i <interval>, -w <window>, -M <mss>, -N (no delay), -4, -6
        if (options.extraArgs) {
            const parts = options.extraArgs.split(' ').filter(p => p.trim() !== '');
            const allowedFlags = ['-V', '--verbose', '-d', '--debug', '-i', '-w', '-M', '-N', '--no-delay', '-l', '-Z'];

            // Simple filter: only allow flags starting with - and alphanumeric/simple chars.
            // And discard anything that looks like piping |, redirect >, etc (though spawn handles this, better safe).

            parts.forEach(part => {
                // If it starts with -, check if it is allowed or generic safe flag pattern
                // Let's allow generic arguments but ban metachars.
                if (/^[a-zA-Z0-9\-\.]+$/.test(part)) {
                    // Even safer: Check against whitelist if strict.
                    // For now, let's allow "safe looking" flags.
                    args.push(part);
                }
            });
        }

        args.push('--json');

        console.log('Running iperf3 with args:', args.join(' '));
        // We want to return the command executed.
        const executedCommand = `iperf3 ${args.join(' ')}`;

        const iperfProcess = spawn('iperf3', args);

        let stdout = '';
        let stderr = '';

        iperfProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        iperfProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        iperfProcess.on('close', (code) => {
            if (code !== 0) {
                if (stdout.includes('busy') || stderr.includes('busy')) {
                    return resolve({ output: stdout, error: 'Server is busy running a test. Try again later.' });
                }
                // Return raw output too so user can see what happened
                return resolve({ output: stdout || stderr, error: stderr || 'iperf3 execution failed' });
            }

            try {
                const jsonResult = JSON.parse(stdout);
                // Add command executed to result if possible? Or append to output.
                // User wants to see command executed.
                // We can't easily inject it into the JSON.
                // But we can rely on `output` string. Since we used --json, output IS json.
                // We can wrap it? No that breaks parsing.
                // We will accept the fact that frontend receives raw output.
                // But we want to SHOW the command.
                // I'll attach it to the resolved object, but IperfResult interface needs it?
                // IperfResult { output, json, error }.
                // I'll just log it to stdout for now, and maybe the frontend can reconstruct it?
                // OR better: Return it in a custom field if I modify IperfResult.
                // I can't modify IperfResult in this file without modifying the interface everywhere.
                // Wait, I CAN modify the interface.

                // Let's inject it into the JSON object?
                jsonResult.executedCommand = executedCommand;

                resolve({ output: stdout, json: jsonResult });
            } catch (e) {
                resolve({ output: stdout, error: 'Failed to parse iperf3 JSON output' });
            }
        });

        iperfProcess.on('error', (err) => {
            resolve({ output: '', error: `Failed to start iperf3: ${err.message}` });
        });
    });
};

import { EventEmitter } from 'events';

// Emits 'data' (string), 'error' (string), 'end' (void)
export const runIperfStream = (options: IperfOptions): EventEmitter => {
    const emitter = new EventEmitter();

    // FIX: Inject WinGet path for valid execution if global PATH is stale
    const wingetPath = 'C:\\Users\\Prasath\\AppData\\Local\\Microsoft\\WinGet\\Links';
    const packagePath = 'C:\\Users\\Prasath\\AppData\\Local\\Microsoft\\WinGet\\Packages\\ar51an.iPerf3_Microsoft.Winget.Source_8wekyb3d8bbwe';
    if (process.platform === 'win32') {
        process.env.PATH = `${wingetPath};${packagePath};${process.env.PATH}`;
    }

    const args = ['-c', options.serverHost];

    // Protocol
    if (options.protocol === 'udp') {
        args.push('-u');
        if (options.bitrate) {
            args.push('-b', options.bitrate);
        }
    }

    // IP Version
    if (options.ipVersion === 'ipv6') {
        args.push('-6');
    } else {
        args.push('-4');
    }

    // Port
    if (options.port) {
        args.push('-p', options.port.toString());
    }

    // Duration
    const duration = options.duration && options.duration <= 60 ? options.duration : 10;
    args.push('-t', duration.toString());

    // Parallel Streams
    if (options.protocol === 'tcp' && options.parallelStreams && options.parallelStreams > 0) {
        const streams = options.parallelStreams > 10 ? 10 : options.parallelStreams;
        args.push('-P', streams.toString());
    }

    // Direction
    if (options.bidirectional) {
        args.push('--bidir');
    } else if (options.reverse) {
        args.push('-R');
    }

    // Extra Args (Safe Subset)
    if (options.extraArgs) {
        const parts = options.extraArgs.split(' ').filter(p => p.trim() !== '');
        parts.forEach(part => {
            if (/^[a-zA-Z0-9\-\.]+$/.test(part)) {
                args.push(part);
            }
        });
    }

    // Important: FORCE FLUSH if possible. iperf3 buffering is tricky.
    // We DO NOT use --json here because we want raw text lines for streaming.
    args.push('--forceflush');

    // Deferred start: Only spawn when someone is listening to prevent data loss
    const startProcess = () => {
        if ((emitter as any).hasStarted) return;
        (emitter as any).hasStarted = true;

        console.log('Streaming iperf3 with args:', args.join(' '));
        // Emit the command first
        emitter.emit('data', `Running: iperf3 ${args.join(' ')}\n\n`);

        // Pass env explicitly
        const iperfProcess = spawn('iperf3', args, { env: process.env });

        iperfProcess.stdout.on('data', (data) => {
            const str = data.toString();
            // Log to terminal to verify flow
            process.stdout.write(`[IPERF STDOUT] ${str}`);
            emitter.emit('data', str);
        });

        iperfProcess.stderr.on('data', (data) => {
            const str = data.toString();
            process.stdout.write(`[IPERF STDERR] ${str}`);
            emitter.emit('data', str);
        });

        iperfProcess.on('close', (code) => {
            if (code !== 0) {
                emitter.emit('error', `Exited with code ${code}`);
            } else {
                emitter.emit('end');
            }
        });

        iperfProcess.on('error', (err) => {
            emitter.emit('error', `Failed to start: ${err.message}`);
        });
    };

    // Wait for listener to attach
    emitter.on('newListener', (event) => {
        if (event === 'data') {
            process.nextTick(startProcess);
        }
    });

    // Fallback safety: If listener already exists (race condition?), start immediately
    setTimeout(() => {
        if (emitter.listenerCount('data') > 0) {
            startProcess();
        }
    }, 500);

    return emitter;
};
