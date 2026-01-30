"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPing = void 0;
const child_process_1 = require("child_process");
const os_1 = __importDefault(require("os"));
const runPing = (host, ipVersion = 'ipv4') => {
    return new Promise((resolve) => {
        // Detect OS to determine flags
        const isWin = os_1.default.platform() === 'win32';
        const countFlag = isWin ? '-n' : '-c';
        // Command
        // On Linux, 'ping' is usually IPv4. 'ping6' for IPv6.
        // However, modern iputils-ping (which we installed) supports 'ping -4' and 'ping -6' or auto-detects.
        // Windows 'ping' supports -4 / -6.
        // Let's rely on 'ping' binary and pass -4/-6 if possible.
        // BUT, on some minimal linux, ping6 is separate.
        // Bullseye-slim 'iputils-ping' provides 'ping'.
        const args = [countFlag, '5', host];
        if (ipVersion === 'ipv6') {
            if (isWin)
                args.push('-6');
            else
                args.push('-6'); // Linux usually supports -6 too if it's iputils-ping
        }
        else {
            if (isWin)
                args.push('-4');
            else
                args.push('-4');
        }
        const command = 'ping';
        // Note: on some systems we might need absolute path, but usually in PATH.
        console.log(`Running ping: ${command} ${args.join(' ')}`);
        const process = (0, child_process_1.spawn)(command, args);
        let stdout = '';
        let stderr = '';
        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        process.on('close', (code) => {
            // Parse output
            // Windows: "Average = 24ms", "Packets: Sent = 5, Received = 5, Lost = 0 (0% loss)"
            // Linux: "rtt min/avg/max/mdev = 20.1/24.2/30.3/..." , "5 packets transmitted, 5 received, 0% packet loss"
            const result = {
                host,
                rttAvg: 0,
                packetLoss: 0,
                rawOutput: stdout,
            };
            if (stdout) {
                // Parse Packet Loss
                const lossMatch = stdout.match(/(\d+)% (packet )?loss/);
                if (lossMatch) {
                    result.packetLoss = parseInt(lossMatch[1], 10);
                }
                // Parse RTT
                if (isWin) {
                    const avgMatch = stdout.match(/Average = (\d+)ms/);
                    if (avgMatch) {
                        result.rttAvg = parseInt(avgMatch[1], 10);
                    }
                }
                else {
                    // Linux: min/avg/max/mdev = ...
                    const rttMatch = stdout.match(/rtt min\/avg\/max\/mdev = [\d.]+\/([\d.]+)\//);
                    if (rttMatch) {
                        result.rttAvg = parseFloat(rttMatch[1]);
                    }
                }
            }
            if (code !== 0 && result.packetLoss === 0) {
                // If code != 0, arguably failed, but maybe just some packet loss?
                // If execution failed entirely (e.g. host not found), output might contain "Temporary failure in name resolution"
                result.error = stderr || (stdout.includes('could not find host') ? 'Host not found' : 'Ping failed');
            }
            resolve(result);
        });
        process.on('error', (err) => {
            resolve({ host, rttAvg: 0, packetLoss: 100, rawOutput: '', error: err.message });
        });
    });
};
exports.runPing = runPing;
